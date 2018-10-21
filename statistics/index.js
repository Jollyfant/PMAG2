var sites = new Array();

function __init__() {


  notify("success", "Welcome to the statistics portal. Add data below from the <b>Paleomagnetism.org 2.0.0</b> format to get started.");

  registerEventHandlers();

}

var COORDINATES_COUNTER = 0;
var COORDINATES = "specimen";

function keyboardHandler(event) {

  /*
   * Function keyboardHandler
   * Handles keypresses on keyboard
   */

  const CODES = {
    "KEYPAD_EIGHT": 56,
    "ESCAPE_KEY": 27
  }

  if(sites.length === 0) {
    return;
  }

  // Override the default handlers
  if(!Object.values(CODES).includes(event.keyCode)) {
    return;
  }

  event.preventDefault();

  // Delegate to the appropriate handler
  switch(event.keyCode) {
    case CODES.KEYPAD_EIGHT:
      return switchCoordinateReference();
    case CODES.ESCAPE_KEY:
      return document.getElementById("notification-container").innerHTML = "";
  }

}

function registerEventHandlers() {

  /*
   * Function getSelectedSites
   * Registers DOM event listeners and handler
   */

  // Simple listeners
  document.getElementById("customFile").addEventListener("change", fileSelectionHandler);
  document.getElementById("specimen-select").addEventListener("change", siteSelectionHandler);
  document.addEventListener("keydown", keyboardHandler);

}

function redrawCharts() {

  /*
   * Function redrawCharts
   * Functions that handles logic of which charts to redraw
   */

  eqAreaProjection();
  eqAreaProjectionMean();

}

function siteSelectionHandler() {

  /*
   * Function siteSelectionHandler
   * Handler fired when the collection selector changes
   */

  if(getSelectedSites().length === 0) {
    return notify("danger", "No collections selected.");
  }

  redrawCharts();

}

var Component = function(specimen, coordinates) {

  this.name = specimen.name
  this.rejected = false;

  this.coreAzimuth = specimen.coreAzimuth
  this.coreDip = specimen.coreDip
  this.beddingStrike = specimen.beddingStrike
  this.beddingDip = specimen.beddingDip

  this.coordinates = literalToCoordinates(coordinates);

}

Component.prototype.inReferenceCoordinates = function() {

  // Return a itself as a new component but in reference coordinates
  return new Component(this, inReferenceCoordinates(COORDINATES, this, this.coordinates));

}

function addData(files) {

  files.forEach(function(file) {

    var json = JSON.parse(file.data);

    var siteName = file.name;
    var reference = json.pid;
    var components = new Array();

    json.specimens.forEach(function(specimen) {

       specimen.interpretations.forEach(function(interpretation) {

         // Skip components that are great circles
         if(interpretation.type === "TAU3") {
           return;
         }

         components.push(new Component(specimen, interpretation.specimen.coordinates));

       });

    });

    // Do the cutoff and accept/reject direction
    sites.push({
      "name": siteName,
      "reference": reference,
      "components": components,
      "created": new Date().toISOString()
    });

  });

  updateSpecimenSelect();

}

function addPrototypeSelection(x, i) {

  /*
   * Function addPrototypeSelection
   * Adds a prototype to the user prototype selection box
   */

  var option = document.createElement("option");

  option.text = x.name;
  option.value = i;

  document.getElementById("specimen-select").add(option);

}

function updateSpecimenSelect() {

  /*
   * Function updateSpecimenSelect
   * Updates the specimenSelector with new samples
   */

  removeOptions(document.getElementById("specimen-select"));

  sites.forEach(addPrototypeSelection);

  $('.selectpicker').selectpicker('refresh');

}

function removeOptions(selectbox) {

  /*
   * Function removeOptions
   * Removes options from a select box
   */

  Array.from(selectbox.options).forEach(function(x) {
    selectbox.remove(x);
  });

}

function getCutoffAngle(type) {

  switch(type) {
    case "CUTOFF45":
      return 45;
    default:
      return 0;
  }

}

function getStatisticalParameters(directions) {

  var site = new Site({"lng": 0, "lat": 0});

  var poles = directions.filter(x => !x.rejected).map(x => site.poleFrom(literalToCoordinates(x.coordinates).toVector(Direction)));
  var dirs = directions.filter(x => !x.rejected).map(x => literalToCoordinates(x.coordinates).toVector(Direction));

  var p = new PoleDistribution(poles);
  var d = new DirectionDistribution(dirs);

  var butler = getButlerParameters(p.confidence, d.lambda, d.mean.inc);

  return {
    "dir": d,
    "pole": p,
    "butler": butler
  }

}

function getButlerParameters(confidence, lambda, inclination) {

  // Convert to radians
  var A95 = confidence * RADIANS;
  var palat = lambda * RADIANS;
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

$('.selectpicker').selectpicker('hide');

function doCutoff(directions) {

  /*
   * Function doCutoff
   * Does the Vandamme or 45-cutoff
   */

  // Get the cutoff type from the DOM
  var cutoffType = document.getElementById("cutoff-selection").value;

  // Create a fake site at 0, 0
  var site = new Site({"lng": 0, "lat": 0});

  // Create a copy in memory
  var iterateDirections = memcpy(directions);

  //  No cutoff: simply return
  if(cutoffType === "null") {
    return iterateDirections;
  }

  while(true) {

    var index;
    var deltaSum = 0;
    var cutoffValue = getCutoffAngle(cutoffType);

    // Calculate the poles & mean pole from the accepted group
    var poles = iterateDirections.filter(x => !x.rejected).map(x => site.poleFrom(literalToCoordinates(x.coordinates).toVector(Direction)));
    var poleDistribution = new PoleDistribution(poles);

    // Go over all all poles
    iterateDirections.forEach(function(component, i) {

      // Do not incude directions that were already rejected
      if(component.rejected) {
        return;
      }

      var pole = site.poleFrom(literalToCoordinates(component.coordinates).toVector(Direction));

      // Find the angle between the mean VGP (mLon, mLat) and the particular VGPj.
      var angleToMean = poleDistribution.mean.toCartesian().angle(pole.toCartesian());

      // Capture the maximum angle from the mean and save its index
      if(angleToMean > cutoffValue) {
        cutoffValue = angleToMean;
        index = i;
      }

      // Add to t he sum of angles
      deltaSum += Math.pow(angleToMean, 2);

    });

    // Calculate ASD (scatter) and optimum cutoff angle (A) (Vandamme, 1994)
    var ASD = Math.sqrt(deltaSum / (poles.length - 1));
    var A = 1.8 * ASD + 5;

    // Vandamme cutoff
    if(cutoffType === "VANDAMME") {
      if(cutoffValue < A) {
        break;
      }
    }

    // 45 Cutoff
    if(cutoffType === "CUTOFF45") {
       if(cutoffValue <= getCutoffAngle("CUTOFF45")) {
        break;
      }   
    }

    iterateDirections[index].rejected = true;

  }

  return {
    "components": iterateDirections,
    "cutoff": cutoffValue,
    "scatter": ASD
  }

}

function sortSamples(type) {

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
  sites.sort(getSortFunction(type));

  notify("success", "Succesfully sorted specimens by <b>" + type + "</b>.");

  updateSpecimenSelect();

}

function fileSelectionHandler(event) {

  /*
   * Function fileSelectionHandler
   * Callback fired when input files are selected
   */

  const cutoff = document.getElementById("cutoff-selection").value;

  readMultipleFiles(Array.from(event.target.files), function(files) {

    // Drop the samples if not appending
    if(!document.getElementById("append-input").checked) {
      sites = new Array();
    }

    var nSites = sites.length;

    // Try adding the demagnetization data
    try {
      addData(files);
    } catch(exception) {
      return notify("danger", exception);
    }

    $(".selectpicker").selectpicker("show");
    $(".selectpicker").selectpicker("val", "0");
    $("#nav-profile-tab").removeClass("disabled");
    $("#nav-fitting-tab").removeClass("disabled");
    $("#nav-ctmd-tab").removeClass("disabled");

    $("#nav-profile-tab").tab("show");

    notify("success", "Succesfully added <b>" + (sites.length - nSites) + "</b> specimen(s) (" + cutoff + ").");

  });

}


__init__();