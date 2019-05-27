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

    if(specimen.latitude === null || specimens.longitude === null) {
      return;
    }

    var markerInformation = [
      "<h5>Specimen " + specimen.name + "</h5>",
      "<b>Location: </b>" + specimen.longitude + "°E, " + specimen.latitude + "°N",
      "<b>Demagnetization Type: </b>" + getDemagnetizationTypeLabel(specimen.demagnetizationType),
      "<b>Created: </b>" + specimen.created,
      "<hr>",
      "<b><a href='../specimen/index.html" + window.location.search + "." + i + "'>Specimen Details</a>",
    ].join("<br>");

    markerGroup.push(new L.Marker(new L.LatLng(specimen.latitude, specimen.longitude)).addTo(map).bindPopup(markerInformation));

  });

}

function resolvePID(pid) {

  /*
   * Function resolvePID
   * Attempts to make a HTTP request and resolve a persistent identifier
   */

  if(pid.split(".").length !== 2) {
    return notify("danger", "A collection with this persistent identifier could not be found.");
  }

  // Extract the publication and collection identifier
  var [publication, collection] = pid.split(".");

  // The link to go back to the parent publication
  document.getElementById("back-href").href = "../publication/index.html?" + publication;
  document.getElementById("fork-link").innerHTML = createForkLink(pid);
  document.getElementById("pid-box").innerHTML = pid;

  // Look up the persistent identifier on disk
  HTTPRequest("https://api.paleomagnetism.org/" + publication, "GET", function(json) {

    // 404
    if(json === null) {
      return notify("danger", "A collection with this persistent identifier could not be found.");
    }

    // Collection does not exist within the publication
    if(Number(collection) >= json.collections.length) {
      return notify("danger", "A collection with this persistent identifier could not be found.");
    }

    var collectionObject = json.collections[Number(collection)];

    formatPublicationTable(json.accepted, collectionObject);

    document.getElementById("card-table").innerHTML = metadataContent(json, collectionObject);

  });

}

function __init__() {

  /*
   * Function __init__
   * Entrypoint for JavaScript
   */

  // No search specified: abort
  if(!window.location.search) {
    return;
  }

  // Attempt to resolve the persistent identifier
  resolvePID(window.location.search.slice(1));

}

function metadataContent(publication, collection) {

  /*
   * Function metadataContent
   * Fills upper table with metadata about the collection
   */

  // Determine the location type for the heck of it
  var latitudes = collection.data.specimens.map(x => x.latitude);
  var longitudes = collection.data.specimens.map(x => x.longitude);
  var levels = collection.data.specimens.map(x => x.longitude);

  var locationType = determineLocationType(latitudes, longitudes, levels);

  return new Array(
    "<caption>Metadata associated with this collection.</caption>",
    "<thead>",
    "  <tr>",
    "    <th>Name</th>",
    "    <th>Type</th>",
    "    <th>Author</th>",
    "    <th>Description</th>",
    "    <th>Created</th>",
    "  </tr>",
    "</thead>", 
    "<tbody>",
    "  <tr>",
    "    <td>" + collection.name + "</td>",
    "    <td>" + locationType + "</td>",
    "    <td>" + publication.author + "</td>",
    "    <td>" + publication.description + "</td>",
    "    <td>" + collection.data.created.slice(0, 10) + "</td>",
    "  </tr>",
    "</tbody>"
  ).join("\n");

}

function formatPublicationTable(accepted, collection) {

  /*
   * Function formatPublicationTable
   * Formats the table containing all specimens from this collection
   */

  // Initialize the leaflet map
  addMap(collection.data.specimens);

  if(!accepted) {
    notify("warning", "This collection is pending review and has not yet been accepted.");
  }

  // Add a row for each specimen
  document.getElementById("publication-table").innerHTML = new Array(
    "<head>",
    "  <tr>",
    "    <th>Specimen</th>",
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
  ).concat(collection.data.specimens.map(formatSampleRows)).join("\n");

}

function formatSampleRows(sample, i) {

  /*
   * Function formatSampleRows
   * Creates HTML for rows of the sample table
   */

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
    sample.longitude,
    sample.latitude,
    getDemagnetizationTypeLabel(sample.demagnetizationType),
    sample.interpretations.length,
    sample.steps.length,
    new Date(sample.created).toISOString().slice(0, 10),
  ).map(x => "<td>" + x + "</td>").join("\n") + "</tr>";

}

__init__();
