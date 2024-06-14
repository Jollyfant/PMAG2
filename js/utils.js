let __DEBUG__ = false;
let __VERSION__ = "2.SOMETHING";
const __DOI__ = "10.5281/zenodo.6380888";
const RADIANS = Math.PI / 180;
const PROJECTION_TYPE = "AREA";
const DEGREE_SYMBOL = "\u00B0";

// Color definitions
const HIGHCHARTS_BLUE = "#7CB5EC";
const HIGHCHARTS_BLACK = "#434348";
const HIGHCHARTS_GREY = "#DDDDDD";
const HIGHCHARTS_GREEN = "#90ED7D";
const HIGHCHARTS_ORANGE = "#F7A35C";
const HIGHCHARTS_PURPLE = "#8085E9";
const HIGHCHARTS_CYAN = "#91E8E1";
const HIGHCHARTS_PINK = "#F15C80";
const HIGHCHARTS_YELLOW = "#E4D354";
const HIGHCHARTS_TURQUOISE = "#2B908F";
const HIGHCHARTS_RED = "#F45B5B";
const HIGHCHARTS_WHITE = "#FFFFFF";
const PLOTBAND_COLOR_BLUE = "rgba(119, 152, 191, 0.25)";
const PLOTBAND_COLOR_RED = "rgba(191, 119, 152, 0.25)";

const ENABLE_CREDITS = false;

// CSV delimiters
const ITEM_DELIMITER = ",";
const TAB_DELIMITER = "\t";
const LINE_DELIMITER = "\n";

// Regex for splitting lines taken from
// https://stackoverflow.com/questions/5034781/js-regex-to-split-by-line
//const LINE_REGEXP = new RegExp("(\r\n|[\n\v\f\r\x85\u2028\u2029])");
const LINE_REGEXP = new RegExp("\r?\n");

document.title = "Paleomagnetism.org " + __VERSION__;

if(document.getElementById("enable-sound")) {
  document.getElementById("enable-sound").checked = false;
}

window.addEventListener("online",  notify.bind(null, "success", "Your connection to the internet has been recovered."));
window.addEventListener("offline", notify.bind(null, "danger", "Your connection to the internet was dropped."));

var openedCollection;

function padLeft(nr, n){
  return Array(n - String(nr).length + 1).join("0") + nr;
} 

function isUtrechtIntensityBug(specimen) {
  var version = splitVersion(specimen.version);
  return specimen.format === "UTRECHT" && version.version === 2 && version.major === 0 && version.minor <= 1;
}

function splitVersion(version) {

  let parameters = version.split(".");
  let minor = parameters[2].split("-")[0];

  return {
    "minor": Number(minor),
    "major": Number(parameters[1]),
    "version": Number(parameters[0])
  }

}

function updateTextAreaCounter() {

  /*
   * Function updateTextAreaCounter
   * Adds numbers to text area
   */

  var size = 24;

  // Get the textarea element
  var element = document.getElementById("site-input-area");
  var fract = Math.ceil(element.scrollTop / size);

  // Clamp the size of the scroll
  element.scrollTop = size * fract;

  var numbers = new Array();

  for(var i = fract; i < fract + 10; i++) {
    numbers.push(padLeft(i, 4));
  }

  document.getElementById("numbers").innerHTML = numbers.join("<br>");

}

function getRotationMatrix(lambda, phi) {

  /*
   * Function getRotationMatrix
   * Returns the rotation matrix (parameters are poorly named)
   * but this function is re-used througouth the application. It may be azimuth, plunge
   * or co-latitude, longitude of Euler pole
   * Note: we use actual core dip: Tauxe A3.12 uses the plunge of the lab arrow which is x - 90
   * Rewritten some of the cos -> sin using trig. identities and replacing (x - 90) with x
   */

  return new Array(
    new Array(Math.cos(lambda) * Math.sin(phi), -Math.sin(lambda), Math.cos(phi) * Math.cos(lambda)),
    new Array(Math.sin(phi) * Math.sin(lambda), Math.cos(lambda), Math.sin(lambda) * Math.cos(phi)),
    new Array(-Math.cos(phi), 0, Math.sin(phi))
  );

}

function parseParameters(parameters) {

  /*
   * Function parseParameters
   * Parses input parameters from the site input window
   */

  // Must put at least two parameters
  if(parameters.length < 2) {
    throw("Input at least two parameters (dec, inc)");
  }

  // Extract information from each line
  switch(parameters.length) {
    case 2:
      return {
        "inc": Number(parameters.pop()),
        "dec": Number(parameters.pop()),
      }
    case 3:
      return {
        "name": parameters.pop(),
        "inc": Number(parameters.pop()),
        "dec": Number(parameters.pop())
      }
    case 4:
      return {
        "dip": Number(parameters.pop()),
        "strike": Number(parameters.pop()),
        "inc": Number(parameters.pop()),
        "dec": Number(parameters.pop())
      }
    case 5:
      return {
        "name": parameters.pop(),
        "dip": Number(parameters.pop()),
        "strike": Number(parameters.pop()),
        "inc": Number(parameters.pop()),
        "dec": Number(parameters.pop())
      }
  }

}

function addSiteWindow() {

  try {
    addSiteWindowWrapper();
  } catch(exception) {
    return notify("danger", exception);
  }

}

function NullNumber(value) {

  return (value === "" ? null : Number(value));

}

function addSiteWindowWrapper() {

  /*
   * Function addSiteWindowWrapper
   * Adds a new collection from the input window
   */

  // Get and check the collection name
  let collectionName = document.getElementById("site-input-name").value;

  if(collectionName === "") {
    return notify("danger", "Collection name cannot be empty.");
  }

  // Get the collection position
  let latitude = NullNumber(document.getElementById("site-input-latitude").value);
  let longitude = NullNumber(document.getElementById("site-input-longitude").value);

  // Get the collection age
  let age = NullNumber(document.getElementById("age-input").value);
  let ageMin = NullNumber(document.getElementById("age-min-input").value);
  let ageMax = NullNumber(document.getElementById("age-max-input").value);

  const textAreaContent = document.getElementById("site-input-area").value;

  let lines = textAreaContent.split(LINE_REGEXP);

  let components = lines.filter(Boolean).map(function(line, i) {

    let parameters = parseParameters(line.split(/[,\t]+/));

    // Negative declinations to positive
    if(parameters.dec < 0) {
      parameters.dec += 360;
    }

    if(parameters.dec < 0 || parameters.dec > 360 || parameters.inc < -90 || parameters.inc > 90) {
      throw(new Exception("Invalid component added on line " + i + "."));
    }

    let thing = new Object({
      "age": age,
      "ageMin": ageMin,
      "ageMax": ageMax,
      "beddingDip": parameters.dip || 0,
      "beddingStrike": parameters.strike || 90,
      "coreDip": 90,
      "coreAzimuth": 0,
      "coordinates": new Direction(parameters.dec, parameters.inc).toCartesian(),
      "latitude": latitude,
      "longitude": longitude,
      "level": null,
      "name": parameters.name || (collectionName + "-" + i),
      "rejected": false
    });

    return new Component(thing, thing.coordinates, null);

  });

  // Confirm the number of components exceeds 3
  if(components.length < 3) {
    throw("At least three components are required.");
  }

  // Add the collection
  collections.push({
    "color": null,
    "type": "collection",
    "name": collectionName,
    "doi": null,
    "components": components,
    "created": new Date().toISOString(),
    "index": collections.length
  });

  $("#input-modal").modal("hide");

  enable();
  saveLocalStorage();

  // Select the newly added collection
  $(".selectpicker").selectpicker("val", collections.length - 1 + "");

  notify("success", "Succesfully added collection <b>" + collectionName + "</b>.");

}

function saveLocalStorage(force) {

  /*
   * Function saveLocalStorage
   * Saves sample object to local storage
   */

  if(!force && (!document.getElementById("auto-save").checked || window.location.search)) {
    return;
  }

  // Attempt to set local storage
  try {
    localStorage.setItem("collections", JSON.stringify(collections));
  } catch(exception) {
    notify("danger", "Could not write to local storage. Export your data manually to save it.");
  }

}

function inputFileWrapper(event) {

  /*
   * Function inputFileWrapper
   * Defers input and loads either from file or input window
   */

  const format = document.getElementById("format-selection").value;

  // Input requested from file: open file selection window
  if(format !== "MODAL") {
    return document.getElementById("customFile").click();
  }

  return $("#input-modal").modal("show");

}

function determineLocationType(latitudes, longitudes, levels) {

  /*
   * Function determineLocationType
   * Attempts to logically deduce the type of this location
   */

  // Single location: it is an outcrop
  if(new Set(latitudes).size === 1 && new Set(longitudes).size === 1) {
    return "Outcrop";
  }

  // Multiple locations and more than single stratigraphic level: section
  if(new Set(levels).size > 1) {
    return "Stratigraphic Section";
  }

  // Only multiple locations: region  
  return "Region";

}

function getPublicationFromPID() {

  /*
   * Function getPublicationFromPID
   * Returns the resource that belogns to the PID
   */

  // Get the publication from the URL and strip the query indicator (?)
  var [publication, collection] = location.search.substring(1).split(".");

  // Request the persistent resource from disk
  HTTPRequest("https://api.paleomagnetism.org/" + publication, "GET", function(json) {

    if(json === null) {
      return notify("danger", "Data from this persistent identifier could not be found.");
    }

    // A collection identifier was passed
    if(collection !== undefined) {
      json.collections = [json.collections[collection]];
    }

    json.collections.forEach(addData);

    __unlock__();

  });

}

function extractNumbers(string) {

  /*
   * Function extractNumbers
   * Extracts number from a string (e.g. 100C, 100mT will become 100)
   */

  return Number(string.replace(/[^0-9.]/g, ""));

}

function getMime(id) {

  /*
   * Function getMime
   * Returns appropriate mime type
   */

  // Get the correct type
  switch(id.split("-").pop()) {
    case "svg":
      return "image/svg+xml";
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
  }

}

function getStatisticalParameters(components) {

  /*
   * Function getStatisticalParameters
   * Returns statistical parameters based on on a directional distribution
   */

  // Create a fake site at 0, 0 since we only look at the distritbuion of VGPs and not the actual positions
  var site = new Site(0, 0);

  // Get the directions and pole for each vector
  var directions = components.filter(x => !x.rejected).map(x => literalToCoordinates(x.coordinates).toVector(Direction));
  var poles = directions.map(x => site.poleFrom(x));

  var directionDistribution = new DirectionDistribution(directions);
  var poleDistribution = new PoleDistribution(poles);

  // Butler parameters are a function of A95, the inclination (paleolatitude)
  var butler = getButlerParameters(poleDistribution.confidence, directionDistribution.mean.inc);

  return {
    "dir": directionDistribution,
    "pole": poleDistribution,
    "butler": butler
  }

}

function getButlerParameters(confidence, inclination) {

  /*
   * Function getButlerParameters
   * Returns butler parameters for a distribution
   */

  // Convert to radians
  var A95 = confidence * RADIANS;
  var palat = paleolatitude(inclination) * RADIANS;
  var inc = inclination * RADIANS;

  // The errors are functions of paleolatitude
  var dDx = Math.asin(Math.sin(A95) / Math.cos(palat));
  var dIx = 2 * A95 / (1 + 3 * Math.pow(Math.sin(palat), 2));

  // Calculate the minimum and maximum Paleolatitude from the error on the inclination
  var palatMax = Math.atan(0.5 * Math.tan(inc + dIx));
  var palatMin = Math.atan(0.5 * Math.tan(inc - dIx));

  return new Object({
    "dDx": dDx / RADIANS,
    "dIx": dIx / RADIANS,
    "palatMin": palatMin / RADIANS,
    "palatMax": palatMax / RADIANS
  });

}

function paleolatitude(inc) {

  /*
   * Function paleolatitude
   * Calculates the paleolatitude from an inclination
   */

  return Math.atan(Math.tan(inc * RADIANS) / 2) / RADIANS;

}

function meanDirection(vectors) {

  /*
   * Function meanDirection
   * Calculates the mean vector from a set of directions
   */

  var sumVector = new Coordinates(0, 0, 0);

  vectors.forEach(function(coordinates) {
    sumVector = sumVector.add(coordinates);
  });

  return sumVector.toVector(Direction);

}

function nullMatrix() {
  
  /*
   * Function nullMatrix
   * Returns an empty 3D matrix
   */
  
  return new Array(nullVector(), nullVector(), nullVector());

}

function nullVector() {
  
  /*
   * Function nullVector
   * Returns an empty 1D vector
   */

  return new Array(0, 0, 0);

}

function TMatrix(data) {

  /*
   * Function TMatrix
   * Returns the orientation matrix for a set of directions
   */

  var T = nullMatrix();

  data.forEach(function(vector) {
    for(var k = 0; k < 3; k++) {
      for(var l = 0; l < 3; l++) {
        T[k][l] += vector[k] * vector[l]
      }
    }
  });

  return T;

}

function inReferenceCoordinates(reference, specimen, coordinates) {

  /*
   * Function inReferenceCoordinates
   * Gets the coordinates in the reference coordinates
   */

  if(reference === "specimen") {
    return coordinates;
  }

  // Do the geographic correction
  coordinates = coordinates.rotateTo(specimen.coreAzimuth, specimen.coreDip);

  if(reference === "geographic") {
    return coordinates;
  }

  // Do the tectonic correction
  // See Lisa Tauxe: 9.3 Changing coordinate systems; last paragraph
  return coordinates.correctBedding(specimen.beddingStrike, specimen.beddingDip);

}

function fromReferenceCoordinates(reference, specimen, coordinates) {

  /*
   * Function fromReferenceCoordinates
   * Rotates all the way back to specimen coordinates
   */

  // We are already in specimen coordinates
  if(reference === "specimen") {
    return coordinates; 
  }

  // In geographic: rotate backwards to specimen
  if(reference === "geographic") {
    return coordinates.rotateFrom(specimen.coreAzimuth, specimen.coreDip);
  }

  // In tectonic coordinates: inverse bedding correction
  // and geographic correctiono at the end
  var dipDirection = specimen.beddingStrike + 90;
  return coordinates.rotateTo(-dipDirection, 90).rotateFrom(0, 90 - specimen.beddingDip).rotateTo(dipDirection, 90).rotateFrom(specimen.coreAzimuth, specimen.coreDip);

}

function getRotationMatrixR(lambda, phi) {

  /*
   * Function getRotationMatrixR
   * Returns the reversed rotation matrix (transpose)
   */

  var matrix = getRotationMatrix(lambda, phi);

  // Return the transpose (inverse rotation)
  return new Array(
    new Array(matrix[0][0], matrix[1][0], matrix[2][0]),
    new Array(matrix[0][1], matrix[1][1], matrix[2][1]),
    new Array(matrix[0][2], matrix[1][2], matrix[2][2])
  );

}

Number.prototype.clamp = function(min, max) {

  /*
   * Function Number.clamp
   * Clamps a number between a minimum and a maximum
   */

   return Math.min(Math.max(this, min), max);

}

function getConfidenceEllipseDouble(dDx, dIx, N) {

  /*
   * Function getConfidenceEllipse
   * Returns confidence ellipse around up North
   */

  // Define the number of discrete points on an ellipse
  const NUMBER_OF_POINTS = N;

  dDx = dDx * RADIANS;
  dIx = dIx * RADIANS;

  var vectors = new Array();
  var iPoint = ((NUMBER_OF_POINTS - 1) / 2);

  // Create a circle around the pole with angle confidence
  for(var i = 0; i < NUMBER_OF_POINTS; i++) {

    var psi = i * Math.PI / iPoint;
    var x = Math.sin(dIx) * Math.cos(psi);
    var y = Math.sin(dDx) * Math.sin(psi);

    // Resulting coordinate
    var z = Math.sqrt(1 - Math.pow(x, 2) - Math.pow(y, 2));

    if(isNaN(z)) {
      z = 0;
    }

    vectors.push(new Coordinates(x, y, z).toVector(Direction));

  }

  // Handle the correct distribution type
  return vectors;

}

function getConfidenceEllipse(angle) {

  /*
   * Function getConfidenceEllipse
   * Returns confidence ellipse around up North
   */

  // Define the number of discrete points on an ellipse
  const NUMBER_OF_POINTS = 101;

  var vectors = new Array();

  // Create a circle around the pole with angle confidence
  for(var i = 0; i < NUMBER_OF_POINTS; i++) {
    vectors.push(new Direction((i * 360) / (NUMBER_OF_POINTS - 1), 90 - angle));
  }

  // Handle the correct distribution type
  return vectors;

}

function getSelectedComponents() {

  /*
   * Function getSelectedComponents
   * Gets all the components from all collections as if it was a single collection
   */

  var components = new Array();

  // Get the requested polarity
  var polarity = document.getElementById("polarity-selection").value || null;

  getSelectedCollections().forEach(function(collection) {

    // Get the components in the correct coordinate system
    var comp = collection.components.map(x => x.inReferenceCoordinates());

    // Nothing to do
    if(polarity === null) {
      return components = components.concat(comp);
    }

    // Nothing to do
    var sign = Math.sign(getStatisticalParameters(comp).dir.mean.inc);
    if(polariy !== "EQUATOR" && ((sign === 1 && polarity === "NORMAL") || (sign === -1 && polarity === "REVERSED"))) {
      return components = components.concat(comp);
    }

    // Reflect the coordinates
    comp.forEach(function(x) {
      components.push(new Component(x, x.coordinates.reflect(), x.MAD));
    });

  });

  return components;

}

function getSelectedCollections() {

  /*
   * Function getSelectedCollections
   * Returns a reference to the sites that were selected
   */

  function isSelected(option) {
    return option.selected; 
  }

  function mapIndexToSite(index) {
    collections[index].index = index;
    return collections[index];
  }

  function getIndex(option) {
    return Number(option.value);
  }

  return Array.from(document.getElementById("specimen-select").options).filter(isSelected).map(getIndex).map(mapIndexToSite);

}

function getPlaneData(direction, angle, angle2, N) {

  /*
   * Function getPlaneData
   * Returns plane data
   */

  function rotateEllipse(x) {

    /*
     * Function 	Data::rotateEllipse
     * Rotates each point on an ellipse (plane) to the correct direction
     */

    return x.toCartesian().rotateTo(direction.dec, direction.inc).toVector(Direction).highchartsData();

  }

  if(N === undefined) {
    N = 101;
  }

  // No angle is passed: assume a plane (angle = 90)
  if(angle === undefined) {
    angle = 90;
  }

  if(angle2 === undefined) {
    angle2 = angle;
  }

  var ellipse = getConfidenceEllipseDouble(angle, angle2, N).map(rotateEllipse);

  // Flip the ellipse when requested. Never flip great circles..
  if(angle !== 90 && document.getElementById("flip-ellipse") && document.getElementById("flip-ellipse").checked) {
    return flipEllipse(direction.inc, ellipse);
  }

  // Different series for positive, negative
  if(angle === 90) {
    return flipPlane(direction.inc, ellipse);
  }

  return ellipse;

}

function flipPlane(inclination, ellipse) {

  let negative = new Array();
  let positive = new Array();
  let sign = 0;

  // Go over all the points on the ellipse
  for(var i = 1; i < ellipse.length; i++) {

    let point = ellipse[i];
    let pointSign = Math.sign(point.inc);

    // Sign changed: add null to prevent Highcharts drawing a connection
    if(sign !== pointSign) {
      (pointSign < 0 ? positive : negative).push(ellipse[i - 1]);
      (pointSign < 0 ? negative : positive).push(null);
    }

    (point.inc < 0 ? positive : negative).push(point);

    // Sign for next iteration
    sign = pointSign;

  }

  return { negative, positive };

}

function flipEllipse(inclination, ellipse) {

  /*
   * Function flipEllipse
   * Flips an ellipse to the other side of the if it has a sign other than the mean value
   */

  let splitEllipse = new Array();
  let sign = 0;

  // Go over all the points on the ellipse
  for(var i = 0; i < ellipse.length; i++) {

    let point = ellipse[i];
    let pointSign = Math.sign(point.inc);

    // Sign changed: add null to prevent Highcharts drawing a connection
    if(sign !== pointSign) {
      splitEllipse.push(null);
    }

    // Do not rotate when negative & negative or positive & positive
    if(pointSign !== Math.sign(inclination)) {
      point.x = point.x + 180;
    }

    // Add the point again
    splitEllipse.push(point);

    // Sign for next iteration
    sign = pointSign;

  }

  return splitEllipse;

}

var shallowingRunning, foldtestRunning;

function switchCoordinateReference() {

  /*
   * Function switchCoordinateReference
   * Cycles through the available coordinate reference frames
   */

  const AVAILABLE_COORDINATES = new Array(
    "specimen",
    "geographic",
    "tectonic"
  );

  // Block when a module is running
  if(shallowingRunning || foldtestRunning) {
    return notify("danger", "Cannot change coordinate system while a module is running.");
  }

  // Increment the counter
  COORDINATES_COUNTER++;

  COORDINATES_COUNTER = COORDINATES_COUNTER % AVAILABLE_COORDINATES.length
  COORDINATES = AVAILABLE_COORDINATES[COORDINATES_COUNTER];

  notify("info", "Coordinate system changed to <b>" + COORDINATES + "</b> coordinates.");

  // Always redraw the interpretation charts after a reference switch
  redrawCharts();

}

function notify(type, text) {

  /*
   * Function notify
   * Sends notification to the user
   */

  const SOUND_WARNING = new Audio("../resources/sounds/error.mp3");
  const SOUND_NOTIFY = new Audio("../resources/sounds/notification.mp3");

  function formatError(text) {

    /*
     * Function notify::formatError
     * Formats an exception depending on the debug level
     */

    if(__DEBUG__) {
      return "<b>" + text.message + "</b><br>" + text.stack.replace(/\n/g, "<br>");
    } else {
      return text.message;
    }

  }

  // Parse an exception
  if(text instanceof Error) {
    text = formatError(text);
  }

  if(document.getElementById("enable-sound") && document.getElementById("enable-sound").checked) {

    if(type === "warning" || type === "danger") {
      SOUND_WARNING.play();
    } else if(type === "success") {
      SOUND_NOTIFY.play();
    }

  }

  // Update the notification tooltip
  document.getElementById("notification-container").innerHTML = [
    "<div class='alert alert-" + type + "' alert-dismissible fade show' role='alert'>",
      "<button type='button' class='close' data-dismiss='alert' aria-label='Close'>",
        "<span aria-hidden='true'>&times;</span>",
      "</button>",
      text,
    "</div>"
  ].join("\n");

  // Jump to the top
  if(type !== "info") {
    window.scrollTo(0, 0);
  }

}


function clearLocalStorage(item) {

  /*
   * Function clearLocalStorage
   * Clears the local storage of the webpage
   */

  const COLLECTION_STORAGE_ITEM = "collections";
  const SPECIMEN_STORAGE_ITEM = "specimens";

  function clearStorage(item) {

    /*
     * Function clearStorage
     * Clears a particular item or full storage
     */

    switch(item) {
      case "interpretation":
        return localStorage.removeItem(SPECIMEN_STORAGE_ITEM);
      case "statistics":
        return localStorage.removeItem(COLLECTION_STORAGE_ITEM);
      default:
        return localStorage.clear();
    }

  }

  // Ask for user confirmation
  if(!confirm("Are you sure you want to clear the local storage?")) {
    return;
  }

  // Clear the requested item
  clearStorage(item);

  // Reload the page
  window.location.reload();

}

function fEquals(one, two) {

  /*
   * Function fEquals
   * Test the equality of two floats to a given precision
   */

  const PRECISION = 10;

  return one.toPrecision(PRECISION) === two.toPrecision(PRECISION);

}

function downloadURIComponent(name, string) {

  /*
   * Function downloadURIComponent
   * Creates a temporary link component used for downloading
   */

  var downloadAnchorNode = document.createElement("a");

  // Set some attribtues
  downloadAnchorNode.setAttribute("href", string);
  downloadAnchorNode.setAttribute("download", name);

  // Add and trigger click event
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();

  // Clean up
  document.body.removeChild(downloadAnchorNode);

}

function downloadAsJSON(filename, json) {

  /*
   * Function downloadAsJSON
   * Downloads a particular GeoJSON object  as a BLOB
   */

  const MIME_TYPE = "data:application/json;charset=utf-8";

  downloadURIComponent(filename, MIME_TYPE + "," + encodeURIComponent(JSON.stringify(json)));

}

function editSelectedCollection() {

  var collections = getSelectedCollections();

  // Can only edit a single collection
  if(collections.length !== 1) {
    return notify("warning", "Select a single collection to copy.");
  }

  var text = ["#Name", "Declination", "Inclination", "Core Azimuth", "Core Dip", "Bedding Strike", "Bedding Dip", "Latitude", "Longitude", "Stratigraphic Level", "Age", "Minimum Age", "Maximum Age", "Coordinates"].join(",") + "\n";

  text += collections[0].components.map(function(component) {

    var direction = component.coordinates.toVector(Direction);

    return [
      component.name,
      direction.dec.toFixed(2),
      direction.inc.toFixed(2),
      component.coreAzimuth,
      component.coreDip,
      component.beddingStrike,
      component.beddingDip,
      component.latitude,
      component.longitude,
      component.level,
      component.age,
      component.ageMin,
      component.ageMax,
      "specimen"
    ].join(",");

  }).join("\n");

  clipboardCopy(text);

}

function clipboardCopy(text) {

  /*
   * Function clipboardCopy
   * Copies text to the clipboard
   */

  // Create a temporary area
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("Copy");
  textArea.remove();

  notify("info", "Collection information CSV copied to clipboard.");

}

document.addEventListener("mouseout", function() {
  document.body.classList.remove("blurry");
});

function dragOverHandler(ev) {

  // Prevent default behavior (Prevents file from being opened)
  ev.preventDefault();

  document.body.classList.add("blurry");

}

function dropHandler(ev) {

  document.body.classList.remove("blurry");

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

  if(!ev.dataTransfer.items) {
    return;
  }

  // Use DataTransferItemList interface to access the file(s)
  files = Array.from(ev.dataTransfer.items).map(function(item) {
    return item.getAsFile();
  });

  readMultipleFiles(files, loadCollectionFileCallback);

}

function downloadAsCSV(filename, csv) {

  /*
   * Function downloadAsCSV
   * Downloads a particular CSV string as a BLOB
   */

  const MIME_TYPE = "data:text/csv;charset=utf-8";

  downloadURIComponent(filename, MIME_TYPE + "," + encodeURIComponent(csv));

}


function memcpy(object) {

  /*
   * Function memcpy
   * Uses a JSON (de-)serialization to create a copy of an object in memory
   * This works for nested objects but is very slow
   */

  return JSON.parse(JSON.stringify(object));

}

function projectInclination(inc) {

  /*
   * Function projectInclination
   * Converts the inclination to a project inclination (equal area; equal angle)
   * used in the equal area projection plots
   */

  // Value can be treated as being absolute since the
  // lower & upper hemisphere are both being projected
  var inc = Math.abs(inc);

  switch(PROJECTION_TYPE) {
    case "AREA":
      return 90 - (Math.sqrt(2) * 90 * Math.sin(Math.PI * (90 - inc) / 360));
    case "ANGLE":
      return 90 - (90 * Math.tan(Math.PI * (90 - inc) / 360));
    default:
      throw(new Exception("Unknown projection type requested."));
  }

}

function HTTPRequest(url, type, callback, data) {

  /*
   * Function HTTPRequest
   * Makes an async XMLHTTPRequest to a remote resource
   */

  const HTTP_OK = 200;
  const HTTP_BAD_REQUEST = 400;

  var xhr = new XMLHttpRequest();

  // When the resource is ready
  xhr.onload = function() {

    console.debug(type + " HTTP Request to " + url + " returned with status code " + this.status);

    // Ignore HTTP errors
    if(this.status !== HTTP_OK && this.status !== HTTP_BAD_REQUEST && this.status !== 0) {
      return callback(null);
    }

    // Check the content type
    switch(this.getResponseHeader("Content-Type")) {
      case "text/plain":
        return callback(xhr.response, this.status);
      default:
        return callback(JSON.parse(xhr.response), this.status);
    }

  }

  // Ingore HTTP errors
  xhr.onerror = function(error) {
    callback(null);
  }

  // Open and finish the request
  xhr.open(type, url);

  if(data === undefined) {
    xhr.send();
  } else {
    xhr.send(data);
  }

}

function literalToCoordinates(coordinates) {

  /*
   * Function literalToCoordinates
   * Returns an object literal {x, y, z} to a Coordinate instance
   */

  return new Coordinates(coordinates.x, coordinates.y, coordinates.z);

}

function readMultipleFiles(files, callback) {

  /*
   * Function readMultipleFiles
   * Uses the HTML5 FileReader API to read mutliple fires and fire a callback with its contents
   */

  var readFile, file, reader
  var fileContents = new Array();

  // IIFE to read multiple files
  (readFile = function(file) {

    // All files were read
    if(!files.length) {
      return callback(fileContents);
    }

    // Next queued file: create a new filereader instance
    file = files.shift();
    reader = new FileReader();

    // XML should be readable as text
    reader.readAsText(file);

    // Callback when one file is read (this is async)
    reader.onload = function() {

      console.debug("FileReader read file " + file.name + " (" + file.size + " bytes)");

      // Append the result
      fileContents.push({
        "name": file.name,
        "data": reader.result,
        "size": file.size
      });

      // More files to read: continue
      readFile();

    }

  })();

}

function getSuccesfulLabel(bool) {

  /*
   * Function getSuccesfulLabel
   * Maps TRUE to success and FALSE to error label
   */

  return (bool ? "<i class='fas fa-check text-success'></i>" : "<i class='fas fa-times text-danger'></i>");

}

function getDemagnetizationTypeLabel(type) {

  /*
   * Function getDemagnetizationTypeLabel
   * Maps the demagnetization type to a neat symbol
   */

  switch(type) {
    case "thermal":
      return "<i class='fas fa-fire text-danger'></i>";
    case "alternating":
      return "<i class='fas fa-bolt text-warning'></i>";
    default:
      return "<i class='fas fa-question text-secondary'></i>";
  }

}

function numericSort(a, b) {

  /*
   * Function numericSort
   * Sort function to sort an array numerically
   */

  // No sorting if one is null
  if(a === null || b === null) {
    return 0;
  }

  return a > b ? 1 : a < b ? -1 : 0;

}

function addFooter() {

  /*
   * Function addFooter
   * Adds footer to all HTML pages
   */

  var isBetaVersion = window.location.href.includes("beta");

  if(isBetaVersion) {
    document.getElementsByClassName("navbar-brand")[0].innerHTML += " <span title='This is a preview version of the application for testing features and bug fixes. It is recommended to use the production application at https://www.paleomagnetism.org.'>BETA*</span>";
    // Modify the version
    __VERSION__ += "-beta";
  }

  document.getElementById("footer-container").innerHTML = new Array(
    "<hr>",
    "<b>Paleomagnetism<span class='text-danger'>.org</span>" + (isBetaVersion ? " BETA" : "" ) + "</b> &copy; " + new Date().getFullYear() + ". All Rights Reserved.",
    "<div style='float: right;' class='text-muted'><small>Version v" + __VERSION__ + " (<a href='https://doi.org/" + __DOI__ + "'>" + __DOI__ + "</a>)</small></div>",
    "&nbsp; <i class='fab fa-github'></i> <a href='https://github.com/Jollyfant/PMAG2'><b>Source Code</b></a>",
    "&nbsp; <i class='fas fa-balance-scale'></i> Licensed under <a href='https://opensource.org/licenses/MIT'><b>MIT</b>.</a>",
    "<br>",
    "<div id='version-modal' class='modal fade' tabindex='-1' role='dialog'>",
    "  <div class='modal-dialog' role='document'>",
    "    <div class='modal-content'>",
    "      <div class='modal-header'>",
    "        <h5 class='modal-title'><i class='fas fa-rocket'></i> A new version was released! </h5>",
    "        <button type='button' class='close' data-dismiss='modal' aria-label='Close'>",
    "          <span aria-hidden='true'>&times;</span>",
    "        </button>",
    "      </div>",
    "      <div class='modal-body'>",
    "        <h5>Paleomagnetism " + __VERSION__ + "</h5>",
    "        <p>A new version of Paleomagnetism.org was released. Consult the <a href='../changelog'>changelog</a> for more information.</p>",
    "        <div style='text-align: center;'><img src='../resources/images/pmag-logo.png'></div>",
    "        <hr>",
    "        <button style='float: right;' type='button' class='btn btn-sm btn-primary' data-dismiss='modal'><b>Got it!</b></button>",
    "      </div>",
    "    </div>",
    "  </div>",
    "</div>"
  ).join("\n");

  // Show versio modal
  if(window.localStorage && localStorage.getItem("__VERSION__") !== __VERSION__) {
    $("#version-modal").modal("show");
    localStorage.setItem("__VERSION__", __VERSION__);
  }

}

function createLink(href, text) {

  /*
   * Function createLink
   * Creates an HTML link element from a reference and text
   */

  return "<a href='" + href + "'>" + text + "</a>";

}

function addCollectionData(files, format) {

  /*
   * Function addCollectionData
   * Adds collections to statistics/geography portal depending on input format
   */

  switch(format) {
    case "DIR2":
      return files.forEach(addData);
    case "PMAG2":
      return files.map(x => x.data).forEach(importPMAG2);
    case "PMAG":
      return files.forEach(importPMAG);
    case "CSV":
      return files.forEach(importCSV);
    default:
      throw(new Exception("Unknown importing format requested."));
  }

}

function exportSelectedCollections() {

  /*
   * Function exportSelectedCollections
   * Exports selected collections by the user
   */

  var payload = {
    "hash": forge_sha256(JSON.stringify(getSelectedCollections())),
    "collections": getSelectedCollections(),
    "version": __VERSION__,
    "created": new Date().toISOString()
  }

  downloadAsJSON("export.pub", payload);
  
}

function removeOptions(selectbox) {

  /*
   * Function removeOptions
   * Removes options from a select box
   */

  Array.from(selectbox.options).forEach(x => selectbox.remove(x));

}

function updateSpecimenSelect() {

  /*
   * Function updateSpecimenSelect
   * Updates the specimenSelector with new samples
   */

  // Clear previous options and add the new ones
  removeOptions(document.getElementById("specimen-select"));

  collections.forEach(addPrototypeSelection);

  // Select the last option and refresh
  $(".selectpicker").selectpicker("val", collections.length - 1);
  $(".selectpicker").selectpicker("refresh");

}
function deleteSelectedCollections() {

  /*
   * Function deleteSelectedCollections
   * Deletes the collections selected by the user
   */

  let selectedCollections = getSelectedCollections();
 
  // Guard clauses
  if(selectedCollections.length === 0) {
    return;
  }
 
  if(!confirm("Are you sure you wish to delete " + selectedCollections.length + " selected collection(s)?")) {
    return;
  }

  // Keep a track of the indices to delete
  let indices = selectedCollections.map(x => x.index);
  
  // Filter out all indices at once
  collections = collections.filter(function(collection) {
    return !indices.includes(collection.index);
  });

  notify("success", "Succesfully deleted " + selectedCollections.length + " collection(s).");

  // Update the selector
  return updateSpecimenSelect();

}

function loadCollectionFileCallback(files) {

  const format = document.getElementById("format-selection").value;

  // Drop the existing collections if not appending
  if(!document.getElementById("append-input").checked) {
    collections = new Array();
  } 

  var nCollections = collections.length;

  // Try adding the demagnetization data
  try {
    addCollectionData(files, format);
  } catch(exception) {
    return notify("danger", exception);
  }

  enable();
  saveLocalStorage();

  notify("success", "Succesfully added <b>" + (collections.length - nCollections) + "</b> collection(s).");


}

function importCSV(file) {

  /*
   * Function importCSV
   * Imports from a default CSV format
   */

  function removeComments(line) {

    /*
     * Function importCSV::removeComments
     * Returns FALSE when line starts with comment sign #
     */

    return !line.startsWith("#");

  }

  function parseLine(line) {

    /*
     * Function importCSV::parseLine
     * Parses a single component line
     */

    // Extract all
    var [name, dec, inc, coreAzimuth, coreDip, beddingStrike, beddingDip, latitude, longitude, level, age, ageMin, ageMax, coordinates] = line.split(/[,;]/);

    if(latitude === "") {
      latitude = null;
    } 

    if(longitude === "") {
      longitude = null;
    }

    // Confirm the reference frame
    if(coordinates !== "specimen" && coordinates !== "geographic" && coordinates !== "tectonic") {
      return notify("danger", "The coordinate reference frame must be either: <b>specimen</b>, <b>geographic</b>, or <b>tectonic</b>.");
    }

    // Create specimen metadata object
    let object = {
      "name": name,
      "coreAzimuth": Number(coreAzimuth),
      "coreDip": Number(coreDip),
      "beddingStrike": Number(beddingStrike),
      "beddingDip": Number(beddingDip),
      "latitude": latitude,
      "longitude": longitude,
      "level": Number(level),
      "age": Number(age),
      "ageMin": Number(ageMin),
      "ageMax": Number(ageMax)
    }

    let direction = new Direction(Number(dec), Number(inc));

    // Return in the correct reference frame
    return new Component(object, direction.toCartesian(), null).fromReferenceCoordinates(coordinates);

  }

  // Extract all lines from the CSV
  var lines = file.data.split(/\r?\n/).filter(Boolean).filter(removeComments);

  collections.push({
    "color": null,
    "name": file.name,
    "reference": null,
    "components": lines.map(parseLine),
    "created": new Date().toISOString()
  });

}

function getCutoffAngle(type) {

  /*
   * Function getCutoffAngle
   * Returns the cut off angle based on the requested type
   */

  switch(type) {
    case "CUTOFF45":
      return 45;
    default:
      return 0;
  }

}

function sortCollections(type) {

  /*
   * Function sortSamples
   * Mutates the samples array in place sorted by a particular type
   */

  function getSortFunction(type) {

    /*
     * Function getSortFunction
     * Returns the sort fuction based on the requested type
     */

    function nameSorter(x, y) {
      return x.name < y.name ? -1 : x.name > y.name ? 1 : 0;
    }

    function randomSorter(x, y) {
      return Math.random() < 0.5;
    }

    switch(type) {
      case "name":
        return nameSorter;
      case "bogo":
        return randomSorter;
    }

  }

  // Sort the samples in place
  collections.sort(getSortFunction(type));

  notify("success", "Succesfully sorted specimens by <b>" + type + "</b>.");

  updateSpecimenSelect();

}

function addData(file) {

  /*
   * Function addData
   * Adds data from the Paleomagnetism 2.0.0 format to the application
   */

  // Could be a string or object (when loaded from PID)
  if(file.data instanceof Object) {
    var json = file.data;
  } else {
    var json = JSON.parse(file.data);
  }

  // Collect some metadata from the file
  var siteName = file.name;
  var reference = json.pid;
  var components = new Array();

  var groups = new Object();

  // Sort specimens by groups
  json.specimens.forEach(function(specimen) {

     specimen.interpretations.forEach(function(interpretation) {

       // Skip components that are great circles!
       // These can be fitted in the interpretation portal
       if(interpretation.type === "TAU3") {
         return;
       }

       if(!groups.hasOwnProperty(interpretation.group)) {
         groups[interpretation.group] = new Array();
       }

       groups[interpretation.group].push(new Component(specimen, interpretation.specimen.coordinates, interpretation.MAD));

     });

  });

  // Add each group to a different collection
  Object.keys(groups).forEach(function(group) {

    var components = groups[group];

    collections.push({
      "color": null,
      "name": siteName + " - " + group,
      "reference": reference,
      "components": components,
      "created": new Date().toISOString()
    });

  });

}

function importPMAG2(json) {

  /*
   * Function importPMAG2
   * Imports paleomagnetism database from the PMAG 2.0.0 format
   */

  JSON.parse(json).collections.forEach(function(collection) {

    // Convert all literal coordinates to a class instance
    collection.components = collection.components.map(toComponent);

    // Add to the application
    collections.push(collection);

  });

}

function importPMAG(file) {

  /*
   * Function importPMAG
   * Imports deprecated Paleomagnetism.org 1.0.0 format to the application
   */

  var json = JSON.parse(file.data);

  // Parse Paleomagnetism.org 2.0.0 files
  if(Number(json.version.split(".").shift()) === 2) {
    return importPMAG2(json.collections);
  }

  json.data.forEach(function(site) {

    var metadata = site.metaData;
    var components = site.data.map(function(x, i) {

      var dec = x[0];
      var inc = x[1];
      var coords = new Direction(dec, inc).toCartesian().toLiteral();

      if(x.length > 2) {
        var strike = x[2];
        var dip = x[3];
      } else {
        var strike = 0;
        var dip = 0;
      }

      if(x.length > 4) {
        var name = x[4];
      } else {
        var name = metadata.name + "." + i;
      }

      return new Component({
        "name": name,
        "latitude": metadata.latitude,
        "longitude": metadata.longitude,
        "age": Number(metadata.age),
        "ageMin": Number(metadata.minAge),
        "ageMax": Number(metadata.maxAge),
        "coreAzimuth": 0,
        "coreDip": 90,
        "beddingStrike": strike,
        "beddingDip": dip,
      }, coords, null);

    });

    // Add the site to the collection
    collections.push({
      "color": metadata.markerColor,
      "name": metadata.name,
      "reference": "specimen",
      "components": components,
      "created": json.dateExported
    });

  });

}

function doCutoff(directions) {

  /*
   * Function doCutoff
   * Does no, the Vandamme or 45-cutoff
   */

  // Get the cutoff type from the DOM
  var cutoffType = document.getElementById("cutoff-selection").value || null;

  // Create a fake site at 0, 0: we use this for getting the VGP distribution
  var site = new Site(0, 0);

  // Create a copy in memory
  var iterateDirections = memcpy(directions).map(toComponent);

  while(true) {

    var index;
    var deltaSum = 0;
    var cutoffValue = getCutoffAngle(cutoffType);

    // Calculate the poles & mean pole from the accepted group
    var poleDistribution = getStatisticalParameters(iterateDirections).pole;

    // Go over all all poles
    iterateDirections.forEach(function(component, i) {

      // Skip directions that were previously rejected
      if(component.rejected) {
        return;
      }

      var pole = site.poleFrom(literalToCoordinates(component.coordinates).toVector(Direction));

      // Find the angle between the mean VGP (mLon, mLat) and the particular VGP
      var angleToMean = poleDistribution.mean.toCartesian().angle(pole.toCartesian());

      // Capture the maximum angle from the mean and save its index
      if(angleToMean > cutoffValue) {
        cutoffValue = angleToMean;
        index = i;
      }

      // Add to the sum of angles
      deltaSum += Math.pow(angleToMean, 2);

    });

    // Calculate ASD (scatter) and optimum cutoff angle (A) (Vandamme, 1994)
    var ASD = Math.sqrt(deltaSum / (poleDistribution.N - 1));
    var A = 1.8 * ASD + 5;

    // No cutoff: accept everything
    if(cutoffType === null) {
      break;
    }

    // Vandamme cutoff
    if(cutoffType === "VANDAMME" && cutoffValue < A) {
      break;
    }

    // 45 Cutoff
    if(cutoffType === "CUTOFF45" && cutoffValue <= getCutoffAngle("CUTOFF45")) {
      break;
    }

    // Cutoff is decided pretty randomly
    if(cutoffType === "KRIJGSMAN" && Math.random() < 0.25) {
      break;
    }

    // Set this direction to rejected
    iterateDirections[index].rejected = true;

  }

  return {
    "components": iterateDirections,
    "cutoff": cutoffValue,
    "scatter": ASD,
    "optimum": A
  }

}

function getAverageLocation(site) {

  /*
   * Function getAverageLocation
   * Returns the average specimen location of a collection
   */

  // We can use declination attribute instead of poles.. doens't really matter (both are vectors)
  var locations = site.components.filter(x => x.latitude !== null && x.longitude !== null).map(function(x) {
    return new Direction(x.longitude, x.latitude).toCartesian();
  });

  // No location
  if(locations.length === 0) {
    return null;
  }

  var meanLocation = meanDirection(locations);

  // Keep longitude within [-180, 180]
  if(meanLocation.dec > 180) {
    meanLocation.dec -= 360;
  }

  return {
    "lng": meanLocation.dec,
    "lat": meanLocation.inc
  }

}

function toComponent(component) {

  /*
   * Function toComponent
   * Converts a literal component to a class component
   */

  return new Component(component, component.coordinates, component.MAD);

}

function createForkLink(pid) {

  /*
   * Function createForkLink
   * Creates link to view data from a PID in paleomagnetism.org data library
   */

  // Create links
  const INTERPRETATION = createLink("../interpretation/index.html?" + pid, "Interpretation Portal")
  const STATISTICS = createLink("../statistics/index.html?" + pid, "Statistics Portal");
  const GEOGRAPHIC = createLink("../geography/index.html?" + pid, "Geography Portal");

  // Determine options
  if(pid.split(".").length === 1) {
    var value = new Array(STATISTICS, GEOGRAPHIC).join(" or ");
  }

  if(pid.split(".").length === 2) {
    var value = new Array(INTERPRETATION, STATISTICS, GEOGRAPHIC).join(" or ");
  }

  if(pid.split(".").length === 3) {
    var value = INTERPRETATION;
  }
 
  return "<i class='fas fa-globe-americas'><small></i> Open in " + value + ".</small>";

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

function collectCitation() {

  /*
   * Function collectCitation
   * Collects a citation from Crossref based on a submitted DOI
   */

  const DOI_DISPOSE_TIMEOUT_MS = 3000;

  var submittedDOI = document.getElementById("citation-input").value;

  // Do nothing when empty
  if(submittedDOI === "") {
    return;
  }

  // Confirm that the DOI is valid
  if(!submittedDOI.startsWith("10") || !submittedDOI.includes("/")) {
    return notify("warning", new Exception("The submitted DOI is not valid."));
  }

  // Look up the DOI @ CrossRef
  doiLookup(submittedDOI, function(citation) {

    if(citation === null) {
      return;
    }

    // Parse the string to make a link out of the returned DOI
    var split = citation.split(" ");
    var link = split.pop();
    split.push(createLink(link, link))

    notify("success", "<i class='fas fa-book'></i><b> Found citation: </b>" + split.join(" "));

  });

}

function doiLookup(doi, callback) {

  /*
   * Function doiLookup
   * Looks up DOI from a registration and returns the citation
   */

  const DOI_REGISTRATION_URL = "https://crosscite.org/format?" + new Array(
    "doi=" + doi,
    "style=apa",
    "lang=en-US"
  ).join("&");

  HTTPRequest(DOI_REGISTRATION_URL, "GET", callback);

}

function generateColorPalette() {

  /*
   * Function generateColorPalette
   * Generates the color palette for site color picking
   */

  function createColorItem(color) {

    /*
     * Function generateColorPalette::createColorItem
     * Generates a div for a particular color that can be clicked
     */

    return "<div style='background-color: " + color + ";' class='color-item' onclick='changeColor(\"" + color + "\")'></div>";

  }

  // Choose from a nice saturated gradient
  const COLOR_PALETTE = new Array(
    // First row
    "#F55", "#FA5", "#FF5",
    "#AF5", "#5F5", "#5FA",
    "#5FF", "#5AF", "#55F",
    "#A5F", "#F5F", "#F5A",
    // Second row
    "#A00", "#A50", "#AA0",
    "#5A0", "#0A0", "#0A5",
    "#0AA", "#05A", "#00A",
    "#50A", "#A0A", "#A05",
    // Third row
    "#FFF", "#DDD", "#AAA",
    "#888", "#555", "#222",
    "#000"
  );

  // Create color bar
  return COLOR_PALETTE.map(createColorItem).join("");

}

// Add the footer to every page that includes the utils
addFooter();
