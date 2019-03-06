var map;
var markerGroup = new Array();

function addMap(publication) {

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
 
  // Add collections to map
  publication.collections.forEach(function(collection, i) {

    var averageLocation = averageGeolocation(collection.data.specimens.map(x => x.location));

    var markerInformation = [
      "<h5>Collection " + collection.name + "</h5>",
      "<b>Average Location: </b>" + averageLocation.lng + "°E, " + averageLocation.lat + "°N",
      "<b>Demagnetization Type: </b>" + getDemagnetizationTypeLabel(collection.demagnetizationType),
      "<b>Created: </b>" + collection.data.created,
      "<hr>",
      "<b><a href='../collection/index.html" + window.location.search + "." + i + "'>Collection Details</a>",
    ].join("<br>");

    markerGroup.push(new L.Marker(new L.LatLng(averageLocation.lat, averageLocation.lng)).addTo(map).bindPopup(markerInformation));

  });

  // Create the convex hull
  polygon = new L.polygon(publication.convexHull.map(x => new L.LatLng(x.lat, x.lng)), {color: HIGHCHARTS_GREEN}).addTo(map);

}

function mapTabFocusHandler() {

  /*
   * Function mapTabFocusHandler
   * Resize map to fit markers within bounds
   */

  const TRANSITION_DELAY_MS = 250;

  map.invalidateSize();

  setTimeout(function() {
    map.fitBounds(polygon.getBounds());
  }, TRANSITION_DELAY_MS);

}

function loadDigitalObjectMetadata(pid, callback) {

  /*
   * Fuction loadDigitalObjectMetadata
   * Get the parent metadata object that describes this collection
   */

  HTTPRequest("../resources/publications.json", "GET", function(json) {
    callback(json.filter(x => x.pid === pid));
  });

}

function resolvePID(pid) {

  /*
   * Function resolvePID
   * Attempts to make a HTTP request and resolve a persistent identifier
   */

  // Load publication identifiers
  loadDigitalObjectMetadata(pid, metadataContent);
  HTTPRequest("../resources/publications/" + pid + ".pid", "GET", formatCollectionTable);

}

function __init__() {

  /*
   * Function __init__
   * Entrypoint for JavaScript
   */

  // No PID search specified
  if(!window.location.search) {
    return;
  }

  // Attempt to resolve the persistent identifier
  resolvePID(window.location.search.slice(1));

}

function metadataContent(json) {

  /*
   * Function metadataContent
   * Fills upper table with metadata about the collection
   */

  // First element
  return new Array(
    "<caption>Metadata associated with this publication.</caption>",
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

function formatCollectionTable(publication) {

  /*
   * Function formatCollectionTable
   * Formats the table containing all collections from this collection
   */

  // Initialize the leaflet map
  addMap(publication);

  // Load the metadata for this collection
  document.getElementById("card-table").innerHTML = metadataContent(publication);
  document.getElementById("pid-box").innerHTML = publication.pid;
  document.getElementById("fork-link").innerHTML = createForkLink(publication.pid);

  // Add a row for each collection
  var rows = publication.collections.map(formatSampleRows);

  document.getElementById("publication-table").innerHTML = new Array(
    "<head>",
    "  <tr>",
    "    <th>Collection</th>",
    "    <th>Average Latitude</th>",
    "    <th>Average Longitude</th>",
    "    <th>Number of Specimens</th>",
    "    <th>Created</th>",
    "  </tr>",
    "</head>"
  ).concat(rows).join("\n");

}

function createForkLink(pid) {

  /*
   * Function createForkLink
   * Creates link to fork data from a PID in paleomagnetism.org
   */

  return " &nbsp; <small><a href='../statistics/index.html?" + pid +"'><b>View in Statistics Portal</b></a> or <a href='../geography/index.html?" + pid +"'><b>View in Geography Portal</b></a></small>"

}

function downloadTableAsJSON() {

  const MIME_TYPE = "data:application/json;charset=utf-8";
  const FILENAME = "collections.json";

  var pid = window.location.search.slice(1)

  // Make a HTTP request
  HTTPRequest("publications/" + pid + ".pid", "GET", function(json) {
    downloadURIComponent(FILENAME, MIME_TYPE + "," + JSON.stringify(json));
  });

}

function formatSampleRows(collection, i) {

  /*
   * Function formatSampleRows
   * Creates HTML for rows of the collection table
   */

  // Attempt to extract the location
  if(collection.location) {
    var longitude = collection.location.lng;
    var latitude = collection.location.lat;
  } else {
    var longitude = "";
    var latitude = "";
  }

  // If this collection was forked add a fork symbol and the reference
  var name = collection.name;
  var reference;
  if(collection.reference) {
    reference = "&nbsp; <a href='../collection/index.html?" + collection.reference + "'><i class='fas fa-code-branch'></i>";
  } else {
    reference = "";
  }

  // Format the row
  return "<tr>" + new Array(
    "<a href='../collection/index.html" + window.location.search + "." + i + "'>" + collection.name + "</a>" + reference,
    10,
    20,
    collection.data.specimens.length,
    collection.data.created.slice(0, 10),
  ).map(x => "<td>" + x + "</td>").join("\n") + "</tr>";

}

__init__();
