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
  specimens.forEach(function(specimen) {

    if(!specimen.location) {
      return;
    }

    var markerInformation = [
      "<b>Specimen " + specimen.name + "</b>",
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

function updateCardContent(pid) {

  /*
   * Function updateCardContent
   * Updates the card content showing the type of the digital object
   */

  //pid !== undefined ? "<a href='./pid.html?" + pid + "'><i class='fas fa-code-branch'></i></a> Specimen" : "Specimen" +"</b></p>"

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

function createForkLink(pid) {

  /*
   * Function createForkLink
   * Creates link to fork data from a PID in paleomagnetism.org
   */

  return " &nbsp; <small><a href='../interpretation/index.html?" + pid +"'><b><i class='fas fa-code-branch'></i> Fork on paleomagnetism.org</b></a>"

}

function updateCardTable(specimen) {

  /*
   * Function updateCardTable
   * Updates the upper table
   */

  if(specimen.reference) {
    document.getElementById("reference-link").innerHTML = "<a href='../specimen/index.html?" + specimen.reference + "'><i class='fas fa-code-branch'></i></a>";
  }

  return new Array(
    "<caption> Metadata associated with this specimen.</caption>",
    "<thead>",
    "  <tr>",
    "    <th>Sample</th>",
    "    <th>Longitude</th>",
    "    <th>Latitude</th>",
    "    <th>Type</th>",
    "    <th>Interpretations</th>",
    "    <th>Steps</th>",
    "    <th>Created</th>",
    "  </tr>",
    "</thead>",
    "<tbody>",
    "  <tr>",
    "    <td>" + specimen.name + " </td>",
    "    <td>" + (specimen.location ? specimen.location.lng : '') + " </td>",
    "    <td>" + (specimen.location ? specimen.location.lat : '') + " </td>",
    "    <td>" + getDemagnetizationTypeLabel(specimen.demagnetizationType) + "</td>",
    "    <td>" + specimen.interpretations.length + "</td>",
    "    <td>" + specimen.steps.length + "</td>",
    "    <td>" + new Date(specimen.created).toISOString().slice(0, 10) + "</td>",
    "  </tr>",
    "</tbody>"
  ).join("\n");
  
}

function formatSpecimenTable(pid, specimen) {

  /*
   * Function formatSpecimenTable
   * Formats the table containing all the specimens referenced by a particular PID
   */

  addMap(new Array(specimen));

  document.getElementById("fork-link").innerHTML = createForkLink(pid);
  document.getElementById("card-table").innerHTML = updateCardTable(specimen);
  document.getElementById("back-link").innerHTML = "<i class='fas fa-backward text-secondary'></i>&nbsp; <a href='../collection/index.html?" + pid.split(".").slice(0,2).join(".") + "'>Return to Collection</a>"

  document.getElementById("pid-box").innerHTML = pid;

  if(specimen.interpretations.length === 0) {
    return document.getElementById("publication-table").innerHTML = [
      "<caption>No interpretations available."
    ].join("\n");
  }

  document.getElementById("publication-table").innerHTML = new Array(
    "<caption>Components associated with this persistent identifier.",
    "<head>",
    "  <tr>",
    "    <th colspan='2'>Specimen</th>",
    "    <th colspan='2'>Geographic</th>",
    "    <th colspan='2'>Tectonic</th>",
    "    <th>MAD</th>",
    "    <th>Type</th>",
    "    <th>Steps</th>",
    "    <th>Anchored</th>",
    "    <th>Comment</th>",
    "    <th>Created</th>",
    "  </tr>",
    "</head>"
  ).concat(specimen.interpretations.map(formatInterpretationRows)).join("\n");

}

function formatInterpretationRows(sample, i) {

  /*
   * Function formatInterpretationRows
   * Creates HTML for the component table
   */

  const PRECISION = 2;

  // Convert x,y,z to coordinates
  var specimen = literalToCoordinates(sample.specimen.coordinates).toVector(Direction);
  var geographic = literalToCoordinates(sample.geographic.coordinates).toVector(Direction);
  var tectonic = literalToCoordinates(sample.tectonic.coordinates).toVector(Direction);

  return "<tr>" + new Array(
    specimen.dec.toFixed(PRECISION),
    specimen.inc.toFixed(PRECISION),
    geographic.dec.toFixed(PRECISION),
    geographic.inc.toFixed(PRECISION),
    tectonic.dec.toFixed(PRECISION),
    tectonic.inc.toFixed(PRECISION),
    sample.MAD.toFixed(PRECISION),
    sample.type,
    "<small>" + sample.steps.join(", ") + "</small>",
    sample.anchored,
    sample.comment,
    new Date(sample.created).toISOString().slice(0, 10)
  ).map(x => "<td>" + x + "</td>").join("\n") + "</tr>";

}

function resolvePID(pids) {

  /*
   * Function resolvePID
   * Resolves the persistent identifier
   */

  var [pid, collection, sample] = pids.split(".");

  HTTPRequest("../resources/publications/" + pid + ".pid", "GET", function(json) {

    return formatSpecimenTable(pids, json.collections[Number(collection)].data.specimens[Number(sample)]);

  });

}
