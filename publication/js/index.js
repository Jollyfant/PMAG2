var map;
var markerGroup = new Array();

function addMap(publication) {

  /*
   * Function addMap
   * Adds map to the application
   */

  function createTooltip(publication, collection, i) {

    /*
     * Function addCollectionsToMap::addPublication::createTooltip
     * Creates a tooltip for the marker
     */

    return new Array(
      "<b>" + collection.name + "</b>",
      "<i>" + publication.description + "</i>",
      "",
      "Collections contains " + publication.nSpecimens + " specimens",
      "",
      "<b>Author</b>: " + publication.author,
      "<b>Published</b>: " + publication.created,
      "",
      "<a href='../collection/index.html?" + publication.pid + "." + i + "'><b>View Collection</b></a>"
    ).join("<br>");

  }

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

    var averageLocation = averageGeolocation(collection.data.specimens.map(function(x) {
      return {"lat": x.latitude, "lng": x.longitude}
    }));

    var markerInformation = createTooltip(publication, collection, i);

    markerGroup.push(new L.Marker(new L.LatLng(averageLocation.lat, averageLocation.lng)).addTo(map).bindPopup(markerInformation));

  });

  // Create the convex hull
  polygon = new L.polygon(publication.convexHull.map(x => new L.LatLng(x.lat, x.lng)), {color: HIGHCHARTS_GREEN}).addTo(map);

}

function resolvePID(pid) {

  /*
   * Function resolvePID
   * Attempts to make a HTTP request and resolve a persistent identifier
   */

  // Load publication identifiers
  HTTPRequest("https://api.paleomagnetism.org/" + pid, "GET", formatCollectionTable);

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
    "    <th>Name</th>",
    "    <th>Author</th>",
    "    <th>Description</th>",
    "    <th>Collections</th>",
    "    <th>DOI</th>",
    "    <th>Created</th>",
    "  </tr>",
    "</thead>", 
    "<tbody>",
    "  <tr>",
    "    <td>" + json.name + "</td>",
    "    <td>" + json.author + "</td>",
    "    <td>" + json.description + "</td>",
    "    <td>" + json.nCollections + "</td>",
    "    <td>" + (json.doi || "N/A") + "</td>",
    "    <td>" + json.created.slice(0, 10) + "</td>",
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

  if(!publication.accepted) {
    notify("warning", "This publication is pending review and has not yet been accepted.");
  }

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
    "    <th>Type</th>",
    "    <th>Number of Specimens</th>",
    "    <th>SHA2</th>",
    "    <th>Version</th>",
    "    <th>Created</th>",
    "  </tr>",
    "</head>"
  ).concat(rows).join("\n");

}

function formatSampleRows(collection, i) {

  /*
   * Function formatSampleRows
   * Creates HTML for rows of the collection table
   */

  // Attempt to extract the location
  var latitudes = collection.data.specimens.map(x => x.latitude);
  var longitudes = collection.data.specimens.map(x => x.longitude);
  var levels = collection.data.specimens.map(x => x.longitude);

  var locationType = determineLocationType(latitudes, longitudes, levels);

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
    locationType,
    collection.data.specimens.length,
    collection.data.hash.slice(0, 16) + "…",
    collection.data.version,
    collection.data.created.slice(0, 10),
  ).map(x => "<td>" + x + "</td>").join("\n") + "</tr>";

}

__init__();
