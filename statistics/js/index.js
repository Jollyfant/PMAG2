var collections = new Array();
var COORDINATES_COUNTER = 0;
var COORDINATES = "specimen";
var A95_CONFIDENCE = true;

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

  // Set the default selector to NULL
  document.getElementById("polarity-selection").value = "";

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
    "ESCAPE_KEY": 27,
    "Q_KEY": 81,
    "S_KEY": 83
  }

  if(collections.length === 0) {
    return;
  }

  // An input element is being focused: stop key events
  if(document.activeElement.nodeName === "INPUT" || document.activeElement.nodeName === "TEXTAREA") {
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
    case CODES.S_KEY:
      return exportSelectedCollections();
    case CODES.Q_KEY:
      return deleteSelectedCollections();
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

  document.getElementById("defer-input").addEventListener("click", function(event) {

    const format = document.getElementById("format-selection").value;

    if(format === "MODAL") {
      return $("#input-modal").modal("show");
    }

    document.getElementById("customFile").click()

  });

  document.getElementById("add-site-input").addEventListener("click", addSiteWindow);

  // Simple button listeners
  document.getElementById("customFile").addEventListener("change", fileSelectionHandler);
  document.getElementById("specimen-select").addEventListener("change", siteSelectionHandler);

  // Settings
  document.getElementById("cutoff-selection").addEventListener("change", redrawCharts);
  document.getElementById("polarity-selection").addEventListener("change", redrawCharts);
  document.getElementById("enable-deenen").addEventListener("change", redrawCharts);

  // The keyboard handler
  document.addEventListener("keydown", keyboardHandler);

}

function parseParameters(parameters) {

  if(parameters.length < 2) {
    throw("Input at least two parameters (dec, inc)");
  }

  switch(parameters.length) {
    case 2:
      return {
        "dec": Number(parameters.pop()),
        "inc": Number(parameters.pop())
      }
    case 3:
      return {
        "dec": Number(parameters.pop()),
        "inc": Number(parameters.pop()),
        "name": parameters.pop()
      }
    case 4:
      return {
        "dec": Number(parameters.pop()),
        "inc": Number(parameters.pop()),
        "strike": Number(parameters.pop()),
        "dip": Number(parameters.pop())
      }
    case 5:
      return { 
        "dec": Number(parameters.pop()),
        "inc": Number(parameters.pop()),
        "strike": Number(parameters.pop()),
        "dip": Number(parameters.pop()),
        "name": parameters.pop()
      }
  }

}

function addSiteWindow() {

  try {
    addSiteWindowWrapper();
  } catch(exception) {
    notify("danger", exception);
  }

}

function addSiteWindowWrapper() {

  /*
   * Function addSiteWindowWrapper
   * Wraps site adding function in try / catch block
   */

  const textAreaContent = document.getElementById("site-input-area").value;

  let lines = textAreaContent.split(LINE_REGEXP);
  let collectionName = document.getElementById("site-input-name").value;

  if(collectionName === "") {
    return notify("danger", "Collection name cannot be empty.");
  }

  let latitude = Number(document.getElementById("site-input-latitude").value);
  let longitude = Number(document.getElementById("site-input-latitude").value);

  let components = lines.filter(Boolean).map(function(line, i) {

    let parameters = parseParameters(line.split(/[,\t]+/));

    let thing = {
      "age": 0,
      "ageMin": 0,
      "ageMax": 0,
      "beddingDip": parameters.dip || 0,
      "beddingStrike": parameters.strike || 90,
      "coreDip": 0,
      "coreAzimuth": 0,
      "coordinates": new Direction(parameters.dec, parameters.inc).toCartesian(),
      "latitude": latitude,
      "longitude": longitude,
      "level": 0,
      "name": parameters.name || (collectionName + "-" + i),
      "rejected": false
    }

    return new Component(thing, thing.coordinates);

  });

  collections.push({
    "color": null,
    "name": collectionName,
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
