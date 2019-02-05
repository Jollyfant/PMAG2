var collections = new Array();
var COORDINATES_COUNTER = 0;
var COORDINATES = "specimen";
var A95_CONFIDENCE = true;

function getPublicationFromPID() {

  /*
   * Function getPublicationFromPID
   * Returns the resource that belogns to the PID
   */

  // Get the publication from the URL and strip the query indicator (?)
  var SHA256 = location.search.substring(1);

  HTTPRequest("../../resources/publications.json", "GET", function(PUBLICATIONS) {

    var pid = SHA256;
    var publication = PUBLICATIONS.filter(x => x.pid === pid);

    if(!publication.length) {
      return notify("danger", "Data from this persistent identifier could not be found.");
    }

    // Request the persistent resource from disk
    HTTPRequest("./publications/" + pid + ".pid", "GET", function(json) {
      addData([{"data": json, "name": publication[0].filename}]);
      __unlock__();
    });

  });

}

function __init__() {

  /*
   * Function __init__
   * Initializes the Paleomagnetism 2.0.0 statistics portal
   */

  // Check local storage
  if(!window.localStorage) {
    return notify("warning", "Local storage is not supported by your browser. Save your work manually by exporting your data.");
  }

  // A persistent identifier was passed in the URL
  if(location.search) {
    return getPublicationFromPID();
  }

  // Load the specimens from local storage
  var item = localStorage.getItem("collections");

  // Nothing returned from local storage
  if(item !== null) {

    // Convert the saved literals to components
    collections = JSON.parse(item).map(function(x) {
      x.components = x.components.map(function(y) {
        return new Component(y, y.coordinates);
      });
      return x;
    });

  }

  __unlock__();

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

function __unlock__() {

  /*
   * Function __unlock__
   * Unlocks the application for usage
   */

  if(collections.length) {
    notify("success", "Welcome back! Succesfully loaded <b>" + collections.length + "</b> collection(s).");
    enable();
  } else {
    notify("success", "Welcome to <b>Paleomagnetism.org</b>! Import data from the <b>Paleomagnetism 2.0.0</b> format below to get started.");
  }

  // Register all handlers
  registerEventHandlers();

}

function enable() {

  /*
   * Function enable
   * Enables the tabs
   */

  // Update with new collections
  updateSpecimenSelect();

  // Remove disabled classes
  $("#nav-profile-tab").removeClass("disabled");
  $("#nav-fitting-tab").removeClass("disabled");
  $("#nav-ctmd-tab").removeClass("disabled");
  $("#nav-foldtest-tab").removeClass("disabled");
  $("#nav-shallowing-tab").removeClass("disabled");

  // Auto-select the first collection
  $(".selectpicker").selectpicker("val", "0");
  $(".selectpicker").selectpicker("show");
  $("#nav-profile-tab").tab("show");

  // Draw initial charts
  redrawCharts();

}

function keyboardHandler(event) {

  /*
   * Function keyboardHandler
   * Handles keypresses on keyboard
   */

  const CODES = {
    "KEYPAD_FIVE": 53,
    "KEYPAD_EIGHT": 56,
    "ESCAPE_KEY": 27
  }

  if(collections.length === 0) {
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
    case CODES.KEYPAD_FIVE:
      A95_CONFIDENCE = !A95_CONFIDENCE;
      notify("info", "Switched to <b>" + (A95_CONFIDENCE ? "A95" : "α95") + "</b> confidence interval.");
      return redrawCharts();
  }

}

function registerEventHandlers() {

  /*
   * Function registerEventHandlers
   * Registers DOM event listeners and handler
   */

  // Simple button listeners
  document.getElementById("customFile").addEventListener("change", fileSelectionHandler);
  document.getElementById("specimen-select").addEventListener("change", siteSelectionHandler);

  // Settings
  document.getElementById("cutoff-selection").addEventListener("change", redrawCharts);
  document.getElementById("polarity-selection").addEventListener("change", redrawCharts);
  document.getElementById("enable-deenen").addEventListener("change", redrawCharts);

  // The keyboard handler
  document.addEventListener("keydown", keyboardHandler);

  // Set the default selector to NULL
  document.getElementById("polarity-selection").value = "";

}

function redrawCharts() {

  /*
   * Function redrawCharts
   * Functions that handles logic of which charts to redraw
   */

  // Save the scroll position: Highcharts (hijacks) the offset when a new chart is drawn
  var tempScrollTop = window.pageYOffset || document.scrollingElement.scrollTop || document.documentElement.scrollTop;

  // Redraw the hemisphere projections
  // Other modules are triggered with dedicated buttons
  eqAreaProjection();
  eqAreaProjectionMean();

  // Reset to the original position
  window.scrollTo(0, tempScrollTop);

}

function siteSelectionHandler() {

  /*
   * Function siteSelectionHandler
   * Handler fired when the collection selector changes
   */

  redrawCharts();

  if(getSelectedCollections().length === 0) {
    return notify("warning", "No collections selected.");
  }	

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

  // Clear previous options and add the new ones
  removeOptions(document.getElementById("specimen-select"));

  collections.forEach(addPrototypeSelection);

  // Select the last option and refresh
  $(".selectpicker").selectpicker("val", collections.length - 1);
  $(".selectpicker").selectpicker("refresh");

}

function removeOptions(selectbox) {

  /*
   * Function removeOptions
   * Removes options from a select box
   */

  Array.from(selectbox.options).forEach(x => selectbox.remove(x));

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
  collections.sort(getSortFunction(type));

  notify("success", "Succesfully sorted specimens by <b>" + type + "</b>.");

  updateSpecimenSelect();

}

function fileSelectionHandler(event) {

  /*
   * Function fileSelectionHandler
   * Callback fired when input files are selected
   */

  const format = document.getElementById("format-selection").value;

  readMultipleFiles(Array.from(event.target.files), function(files) {

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

  });

}

__init__();
