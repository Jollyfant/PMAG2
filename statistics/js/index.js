var collections = new Array();
var COORDINATES_COUNTER = 0;
var COORDINATES = "specimen";
var A95_CONFIDENCE = true;
var map;

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
  map.on("click", mapClickHandler);

  // Listeners 
  $("#input-modal").on("shown.bs.modal", modalOpenHandler);

}

function mapClickHandler(event) {

  /*
   * Function mapClickHandler
   * Handles mouse click event on the map
   */
 
  const LOCATION_PRECISION = 5;
 
  // Extract the latitude, longitude
  document.getElementById("site-input-longitude").value = event.latlng.lng.toPrecision(LOCATION_PRECISION);
  document.getElementById("site-input-latitude").value = event.latlng.lat.toPrecision(LOCATION_PRECISION);

}

function modalOpenHandler() {

  // Resize map to modal
  map.invalidateSize();

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

function __unlock__() {

  /*
   * Function __unlock__
   * Unlocks the application for usage
   */

  // Set the default selector to NULL
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
    "E_KEY": 69,
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
    case CODES.E_KEY:
      return editSelectedCollection();
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

  document.getElementById("modal-confirm-metadata").addEventListener("click", updateCollectionMetadata);
  document.getElementById("site-input-area").addEventListener("scroll", updateTextAreaCounter);
  document.getElementById("specimen-age-select").addEventListener("change", handleAgeSelection);

  document.getElementById("defer-input").addEventListener("click", inputFileWrapper); 
  document.getElementById("add-site-input").addEventListener("click", addSiteWindow);

  // Simple button listeners
  document.getElementById("customFile").addEventListener("change", fileSelectionHandler);
  document.getElementById("specimen-select").addEventListener("change", siteSelectionHandler);

  // Settings
  document.getElementById("cutoff-selection").addEventListener("change", redrawCharts);
  document.getElementById("enable-deenen").addEventListener("change", redrawCharts);

  // The keyboard handler
  document.addEventListener("keydown", keyboardHandler);
 
  // Flipping is off by default
  document.getElementById("flip-ellipse").checked = false;

  updateTextAreaCounter();

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

  readMultipleFiles(Array.from(event.target.files), loadCollectionFileCallback);

  // Reset value in case loading the same file
  this.value = null;

}

__init__();
