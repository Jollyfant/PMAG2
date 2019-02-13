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

    addCollectionsToMap(publications);

    var rows = publications.map(function(x) {
      return [
        "<tr>",
        "  <td>" + x.author + "</td>",
        "  <td>" + x.institution + "</td>",
        "  <td>" + x.description + "</td>",
        "  <td><code><a href='../collection/index.html?" + x.pid + "'>" + x.pid.slice(0, 16) + "…</a></code></td>",
        "  <td>" + new Date(x.created).toISOString().slice(0, 10) + "</td>",
        "</tr>"
      ].join("\n");
    });

    document.getElementById("publication-table").innerHTML = [
      "<head>",
      "  <tr>",
      "    <th>Author</th>",
      "    <th>Institution</th>",
      "    <th>Description</th>",
      "    <th>Persistent Identifier (PID)</th>",
      "    <th>Created</th>",
      "  </tr>",
      "</head>",
    ].concat(rows).join("\n");
  
  });

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
 
    references.forEach(map.removeLayer, map);

    var publication = publications[this.options.index];

    HTTPRequest("../resources/publications/" + publication.pid + ".pid", "GET", function(data) {
      references = data.specimens.map(function(specimen) {
        return new L.Marker(L.latLng(specimen.location.lat, specimen.location.lng)).addTo(map);
      });
    });
  }

  // Add all publications
  publications.forEach(function(publication, index) {
    new L.Marker(L.latLng(publication.location.latitude, publication.location.longitude), {"index": index}).on("click", expandPublicationMarker).addTo(map);
  });

}

function __init__() {

  addMap();

  // No search specified: show all digital objects
  if(!window.location.search) {
    return loadDigitalObjects();
  }

  // Attempt to resolve the persistent identifier
  resolvePID(window.location.search.slice(1));

}

__init__();
