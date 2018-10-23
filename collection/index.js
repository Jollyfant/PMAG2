var map;
var markerGroup = new Array();

function addMap(specimens) {

  /*
   * Function addMap
   * Adds map to the application
   */

  const MAP_CONTAINER = "map";
  const TILE_LAYER = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const VIEWPORT = new L.latLng(35, 0);

  $("#nav-profile-tab").on("shown.bs.tab", mapTabFocusHandler);

  // Set map options (bounds)
  var mapOptions = {
    "minZoom": 1,
    "maxZoom": 13,
    "maxBounds": new L.latLngBounds(new L.latLng(-90, -180), new L.latLng(90, 180)),
    "maxBoundsViscosity": 0.5,
    "attributionControl": true
  }

  // Create the map and tile layer
  map = L.map(MAP_CONTAINER, mapOptions).setView(VIEWPORT, 10);
  L.tileLayer(TILE_LAYER).addTo(map);
 
  // Add specimens to map
  specimens.forEach(function(specimen, i) {

    if(!specimen.location) {
      return;
    }

    var markerInformation = [
      "<h5>Specimen " + specimen.name + "</h5>",
      "<b>Location: </b>" + specimen.location.lng + "°E, " + specimen.location.lat + "°N",
      "<b>Demagnetization Type: </b>" + getDemagnetizationTypeLabel(specimen.demagnetizationType),
      "<b>Created: </b>" + specimen.created,
      "<hr>",
      "<b><a href='../specimen/index.html" + window.location.search + "." + i + "'>Specimen Details</a>",
    ].join("<br>");

    markerGroup.push(new L.Marker(new L.LatLng(specimen.location.lat, specimen.location.lng)).addTo(map).bindPopup(markerInformation));

  });

}

function mapTabFocusHandler() {

  /*
   * Function mapTabFocusHandler
   * Resize map to fit markers within bounds
   */

  const TRANSITION_DELAY_MS = 250;

  map.invalidateSize();

  setTimeout(function() {
    map.fitBounds(new L.featureGroup(markerGroup).getBounds());
  }, TRANSITION_DELAY_MS);

}

function loadDigitalObjectMetadata(pid, callback) {

  /*
   * Fuction loadDigitalObjectMetadata
   * Get the parent metadata object that describes this collection
   */

  HTTPRequest("./publications.json", "GET", function(json) {
    callback(json.filter(x => pid === x.pid));
  });

}

function resolvePID(pid) {

  /*
   * Function resolvePID
   * Attempts to make a HTTP request and resolve a persistent identifier
   */

  HTTPRequest("publications/" + pid + ".pid", "GET", formatPublicationTable);

}

function __init__() {

  /*
   * Function __init__
   * Entrypoint for JavaScript
   */

  // No search specified: show all digital objects
  if(!window.location.search) {
    return;
  }

  // Attempt to resolve the persistent identifier
  resolvePID(window.location.search.slice(1));

}

__init__();

function metadataContent(json) {

  /*
   * Function metadataContent
   * Fills upper table with metadata about the collection
   */

  // First element
  json = json.pop();

  return new Array(
    "<caption>Metadata associated with this collection.</caption>",
    "<thead>",
    "  <tr>",
    "    <th>Author</th>",
    "    <th>Description</th>",
    "    <th>Created</th>",
    "  </tr>",
    "</thead>", 
    "<tbody>",
    "  <tr>",
    "    <td>" + json.author + "</td>",
    "    <td>" + json.description + "</td>",
    "    <td>" + json.created + "</td>",
    "  </tr>",
    "</tbody>"
  ).join("\n");

}

function createForkLink(pid) {

  /*
   * Function createForkLink
   * Creates link to fork data from a PID in paleomagnetism.org
   */

  return " &nbsp; <small><a href='../interpretation/index.html?" + pid +"'><b><i class='fas fa-code-branch'></i> Fork in Interpretation Portal</b></a> or <a href='../statistics/index.html?" + pid +"'><b>View in Statistics Portal</b></a> or <a href='../geography/index.html?" + pid +"'><b>View in Geography Portal</b></a></small>"

}

function formatPublicationTable(collection) {

  /*
   * Function formatPublicationTable
   * Formats the table containing all specimens from this collection
   */

  // Initialize the leaflet map
  addMap(collection.specimens);

  // Load the metadata for this collection
  loadDigitalObjectMetadata(collection.pid, function(json) {
    document.getElementById("card-table").innerHTML = metadataContent(json);
  });

  document.getElementById("fork-link").innerHTML = createForkLink(collection.pid);
  document.getElementById("pid-box").innerHTML = collection.pid;

  // Add a row for each specimen
  var rows = collection.specimens.map(formatSampleRows);

  document.getElementById("publication-table").innerHTML = new Array(
    "<head>",
    "  <tr>",
    "    <th>Sample</th>",
    "    <th>Core Azimuth</th>",
    "    <th>Core Dip</th>",
    "    <th>Bedding Strike</th>",
    "    <th>Bedding Dip</th>",
    "    <th>Longitude</th>",
    "    <th>Latitude</th>",
    "    <th>Type</th>",
    "    <th>Components</th>",
    "    <th>Steps</th>",
    "    <th>Created</th>",
    "  </tr>",
    "</head>"
  ).concat(rows).join("\n");

}

function downloadTableAsCSV() {

  const MIME_TYPE = "data:application/json;charset=utf-8";
  const FILENAME = "specimens.dir";

  var pid = window.location.search.slice(1)

  HTTPRequest("publications/" + pid + ".pid", "GET", function(json) {
    downloadURIComponent(FILENAME, MIME_TYPE + "," + JSON.stringify(json));
  });

}

function formatSampleRows(sample, i) {

  /*
   * Function formatSampleRows
   * Creates HTML for rows of the sample table
   */

  // Attempt to extract the location
  if(sample.location) {
    var longitude = sample.location.lng;
    var latitude = sample.location.lat;
  } else {
    var longitude = "";
    var latitude = "";
  }

  // If this sample was forked add a fork symbol and the reference
  var name = sample.name;
  var reference;
  if(sample.reference) {
    reference = "&nbsp; <a href='../specimen/index.html?" + sample.reference + "'><i class='fas fa-code-branch'></i>";
  } else {
    reference = "";
  }

  // Format the row
  return "<tr>" + new Array(
    "<a href='../specimen/index.html" + window.location.search + "." + i + "'>" + sample.name + "</a>" + reference,
    sample.coreAzimuth,
    sample.coreDip,
    sample.beddingStrike,
    sample.beddingDip,
    longitude,
    latitude,
    getDemagnetizationTypeLabel(sample.demagnetizationType),
    sample.interpretations.length,
    sample.steps.length,
    new Date(sample.created).toISOString().slice(0, 10),
  ).map(x => "<td>" + x + "</td>").join("\n") + "</tr>";

}
