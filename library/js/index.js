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
      "  <td><code><a href='../collection/index.html?" + x.pid + "'>" + x.pid.slice(0, 16) + "…</a></code></td>",
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
    "    <th>Persistent Identifier (PID)</th>",
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
 
    references.forEach(map.removeLayer, map);

    var publication = publications[this.options.index];
    var hulls = new Array();

    // Request specimens within this publication
    HTTPRequest("../resources/publications/" + publication.pid + ".pid", "GET", function(data) {

      references = data.specimens.map(function(specimen) {
        return new L.Marker(L.latLng(specimen.location.lat, specimen.location.lng), {"icon": greenIcon}).addTo(map);
      });

      const TRANSITION_DELAY_MS = 250;

      map.invalidateSize();

      setTimeout(function() {
        map.fitBounds(new L.featureGroup(references).getBounds());
      }, TRANSITION_DELAY_MS);

      new L.polygon(convexHull(references), {color: HIGHCHARTS_GREEN}).addTo(map);

    });

  }

  // Add all publications
  publications.forEach(function(publication, index) {
    new L.Marker(L.latLng(publication.location.latitude, publication.location.longitude), {"index": index}).on("click", expandPublicationMarker).addTo(map);
  });

}

function convexHull(markers) {

  /*
   * Function convexHull
   * Returns the convex hull of a set of Leaflet markers
   * https://en.wikibooks.org/wiki/Algorithm_Implementation/Geometry/Convex_hull/Monotone_chain#JavaScript
   */

  function cross(a, b, o) {

    /*
     * Function convexHull:cross
     * Cross product
     */

    return (a.lat - o.lat) * (b.lng - o.lng) - (a.lng - o.lng) * (b.lat - o.lat)

  }

  // Extract latitude, longitudes from the markers
  var points = markers.map(x => x.getLatLng());

  // Sort by latitude, longitude
  points.sort(function(a, b) {
    return a.lat - b.lat || a.lng - b.lng;
  });

  // Calculate the lower bounds
  var lower = new Array();
  for(var i = 0; i < points.length; i++) {
    while(lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
       lower.pop();
    }
    lower.push(points[i]);
  }

  // Calculate the upper bounds
  var upper = new Array();
  for(var i = points.length - 1; i >= 0; i--) {
    while(upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
       upper.pop();
    }
    upper.push(points[i]);
  }

  upper.pop();
  lower.pop();

  return lower.concat(upper).map(x => new L.latLng(x.lat, x.lng));

}

function __init__() {

  addMap();

  // Load all publications from JSON
  loadDigitalObjects();

}

__init__();
