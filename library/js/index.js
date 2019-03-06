var map;
const greenIcon = new L.Icon({
  iconUrl: "../resources/images/markers/green.png",
  shadowUrl: "../resources/images/markers/shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function loadDigitalObjects() {

  /*
   * Function loadDigitalObjects
   * Loads all digital objects from disk
   */

  // Load the information from a JSON
  HTTPRequest("../resources/publications.json", "GET", function(publications) {

    // Problem getting the publications
    if(publications === null) {
      return notify("danger", "Could not load publication list.");
    }

    // Update the map and table with the returned collections
    addCollectionsToMap(publications);
    addCollectionsToTable(publications);

  });

}

function addCollectionsToTable(publications) {

  /*
   * Function addCollectionsToTable
   * Adds the returned publications to a table
   */

  const TABLE_CONTAINER = "publication-table";

  var rows = publications.map(function(x) {
    return [
      "<tr>",
      "  <td>" + x.author + "</td>",
      "  <td>" + x.institution + "</td>",
      "  <td>" + x.description + "</td>",
      "  <td><code><a href='../publication/index.html?" + x.pid + "'>" + x.pid.slice(0, 16) + "…</a></code></td>",
      "  <td>" + new Date(x.created).toISOString().slice(0, 10) + "</td>",
      "</tr>"
    ].join("\n");
  });

  // Update the table container
  document.getElementById(TABLE_CONTAINER).innerHTML = [
    "<head>",
    "  <tr>",
    "    <th>Author</th>",
    "    <th>Institution</th>",
    "    <th>Description</th>",
    "    <th>Persistent Identifier</th>",
    "    <th>Created</th>",
    "  </tr>",
    "</head>",
  ].concat(rows).join("\n");

}

function addMap() {

  /*
   * Function addMap
   * Adds map to the application
   */

  const MAP_CONTAINER = "map";
  const TILE_LAYER = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const VIEWPORT = new L.latLng(35, 0);

  // Set map options (bounds)
  var mapOptions = {
    "minZoom": 1,
    "maxBounds": new L.latLngBounds(new L.latLng(-90, -180), new L.latLng(90, 180)),
    "maxBoundsViscosity": 0.5,
    "attributionControl": true
  }

  // Create the map and tile layer
  map = L.map(MAP_CONTAINER, mapOptions).setView(VIEWPORT, 1);
  L.tileLayer(TILE_LAYER).addTo(map);

  // Attach a click handler
  // map.on("click", mapClickHandler);

}

function addCollectionsToMap(publications) {

  /*
   * Function addCollectionsToMap
   * Adds collections from the library to the map
   */

  // Save references to the markers
  var references = new Array();

  function expandPublicationMarker() {
 
    map.removeLayer(references);

    var publication = publications[this.options.index];

/*
    const TRANSITION_DELAY_MS = 250;

    map.invalidateSize();

    setTimeout(function() {
      map.fitBounds(references.getBounds())
    }, TRANSITION_DELAY_MS);
*/

    references = new L.polygon(publication.convexHull.map(x => new L.LatLng(x.lat, x.lng)), {color: HIGHCHARTS_GREEN}).addTo(map);

  }

  // Add all publications
  publications.forEach(function(publication, index) {
    new L.Marker(L.latLng(publication.location), {"index": index}).on("mouseover", expandPublicationMarker).addTo(map);
  });

}

function __init__() {

  addMap();

  // Load all publications from JSON
  loadDigitalObjects();

}

document.getElementById("pid-lookup").addEventListener("blur", function() {

  var value = document.getElementById("pid-lookup").value;
  var [publication, collection, specimen] = value.split(".");

  // Confirm identifier before resolution
  if(publication !== "" && publication.length === 64) {
    if(collection !== undefined) {
      if(specimen !== undefined) {
        return window.location = "../specimen/index.html?" + value;
      }
      return window.location = "../collection/index.html?" + value;
    }
    return window.location = "../publication/index.html?" + value;
  }

  return notify("danger", "The submitted identifier is not valid and cannot be resolved.");

});
__init__();
