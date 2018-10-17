document.getElementById("customFile").addEventListener("change", fileSelection);
document.getElementById("interpretation-table-container").addEventListener("click", interpretationTableClickHandler);
document.getElementById("specimen-select").addEventListener("change", resetSpecimenHandler);
document.getElementById("table-container").addEventListener("click", handleTableClick);
document.getElementById("save-location").addEventListener("click", handleLocation);

  var leafletMarker;
  var map;

function addMap() {

  /*
   * Function addMap
   * Adds map to the application
   */

  const MAP_CONTAINER = "map";
  const VIEWPORT = new L.latLng(35, 0);
  const TILE_LAYER = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

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
  $("#map-modal").on("shown.bs.modal", modalOpenHandler);

}

function modalOpenHandler() {

  /*
   * Function modalOpenHandler
   * Callback fired when the map modal is opened
   */

  var specimen = getSelectedSpecimen();

  // If this specimen is located, put on map
  if(leafletMarker && specimen.location) {
    leafletMarker.setLatLng(new L.LatLng(specimen.location.lat, specimen.location.lng));
  }

  // Resize map to modal
  map.invalidateSize();

}

function mapClickHandler(event) {

  /*
   * Function mapClickHandler
   * Handles mouse click event on the map
   */
  
  const LOCATION_PRECISION = 5;
  
  // Remove previous marker
  if(leafletMarker) {
    map.removeLayer(leafletMarker);
  }
  
  // Extract the latitude, longitude
  document.getElementById("specimen-longitude-input").value = event.latlng.lng.toPrecision(LOCATION_PRECISION);
  document.getElementById("specimen-latitude-input").value = event.latlng.lat.toPrecision(LOCATION_PRECISION);
  
  leafletMarker = new L.Marker(event.latlng).addTo(map);

}

var StepSelector = function() {

  /*
   * Class StepSelector
   * Manages the navigation, visibility, and selection of steps
   */

  // Initialize
  this.reset();

  this._container.addEventListener("click", function(event) {
    this.setActiveStep(Number(event.target.value));
  }.bind(this));

}

StepSelector.prototype.setActiveStep = function(index) {

  /*
   * Function StepSelector.setActiveStep
   * Sets the active step to a particular index
   */

  this._selectedStep = index;
  this.render(true);

}

StepSelector.prototype._container = document.getElementById("step-container");

StepSelector.prototype.reset = function() {

  /*
   * Function StepSelector.reset
   * Resets the step selector for a new specimen
   */

  this._selectedStep = 0;
  this.render(false);

}

StepSelector.prototype.clear = function() {

  /*
   * Function StepSelector.clear
   * Clears the HTML of the container
   */

  this._container.innerHTML = "";

}

StepSelector.prototype.render = function(hover) {

  /*
   * Function StepSelector.render
   * Renders the stepSelector component with the current steps and properties
   */

  const HIDDEN_STEP_SYMBOL = "…";

  this.clear();

  var specimen = getSelectedSpecimen();

  if(specimen === null) {
    return;
  }

  // Select the appropriate radio button for this demagnetization type
  if(specimen.demagnetizationType === "TH") {
    $("#option1").parent().button("toggle");
  } else if(specimen.demagnetizationType === "AF") {
    $("#option2").parent().button("toggle");
  } else {
    $("#option3").parent().button("toggle");
  }

  var listSteps = document.createElement("tbody");

  // Add each steps
  specimen.steps.forEach(function(step, i) {

      var listStep = document.createElement("tr");
      listStep.value = i;

      // Attach some extra classes
      if(step.selected) {
        listStep.className = "selected";
      }

      // Highlight the current step
      if(this._selectedStep === i) {
        listStep.className += " current";
      }

      // Steps may be hidden
      if(step.visible) {
        listStep.appendChild(document.createTextNode(step.step));
      } else {
        listStep.appendChild(document.createTextNode(HIDDEN_STEP_SYMBOL));
        listStep.className += " text-muted";
      }

      listSteps.appendChild(listStep);

  }, this);

  // Add to the DOM
  this._container.appendChild(listSteps);

  // Update the charts
  redrawCharts(hover);

}

function formatStepTable() {

  /*
   * Function StepSelector.formatStepTable
   * Formats parameter table at the top of the page
   */

  var step = stepSelector.getCurrentStep();
  var specimen = getSelectedSpecimen();

  var direction = inReferenceCoordinates(COORDINATES, specimen, new Coordinates(step.x, step.y, step.z)).toVector(Direction);

  var specimenLocation = specimen.location === null ? "<span style='pointer-events: none;' class='text-muted'>Unknown</span>" : (specimen.location.lng.toFixed(3) + ", " + specimen.location.lat.toFixed(3));

  document.getElementById("table-container").innerHTML = [
    "  <caption>Specimen and Demagnetization Details</caption>",
    "  <thead>",
    "    <tr>",
    "      <td>Step</td>",
    "      <td>Reference</td>",
    "      <td>Declination</td>",
    "      <td>Inclination</td>",
    "      <td>Intensity</td>",
    "      <td>Uncertainty</td>",
    "      <td>Core Azimuth</td>",
    "      <td>Core Dip</td>",
    "      <td>Bedding Strike</td>",
    "      <td>Bedding Dip</td>",
    "      <td>Level</td>",
    "      <td title='Specimen location'><i class='fas fa-map-marker-alt'></i></td>",
    "    </tr>",
    "  </thead>",
    "  <tbody>",
    "    <tr>",
    "      <td>" + step.step + "</td>",
    "      <td>" + COORDINATES + "</td>",
    "      <td>" + direction.dec.toFixed(2) + "</td>",
    "      <td>" + direction.inc.toFixed(2) + "</td>",
    "      <td>" + direction.length.toFixed(2) + "</td>",
    "      <td>" + step.error.toFixed(2) + "</td>",
    "      <td style='cursor: pointer;'>" + specimen.coreAzimuth + "</td>",
    "      <td style='cursor: pointer;'>" + specimen.coreDip + "</td>",
    "      <td style='cursor: pointer;'>" + specimen.beddingStrike + "</td>",
    "      <td style='cursor: pointer;'>" + specimen.beddingDip + "</td>",
    "      <td style='cursor: pointer;'>" + specimen.level + "</td>",
    "      <td style='cursor: pointer;'>" + specimenLocation + "</td>",
    "    </tr>",
    "  </tbody>"
  ].join("\n");

}

StepSelector.prototype.hideStep = function() {

  /*
   * Function StepSelector.hideStep
   * Hides the currently active step if not selected
   */

  var step = this.getCurrentStep();

  // Must not be selected
  if(!step.selected) {
    step.visible = !step.visible;
  }

  // Practical to move to the next step
  this.handleStepScroll(1);

  this.render(false);

  saveLocalStorage();

}

StepSelector.prototype.getCurrentStep = function() {

  /*
   * Function StepSelector.getCurrentStep
   * Returns the currently selected step from the step selector
   */

  return getSelectedSpecimen().steps[this._selectedStep];

}


StepSelector.prototype.selectStep = function() {

  /*
   * Function StepSelector.selectStep
   * Selects the currently active step if not hidden
   */

  var step = this.getCurrentStep();

  // Toggle select if the step is visible
  if(step.visible) {
    step.selected = !step.selected;
  }

  // Practical to move to the next step
  this.handleStepScroll(1);

  saveLocalStorage();

}

StepSelector.prototype.handleStepScroll = function(direction) {

  /*
   * Function StepSelector.handleStepScroll
   * Handles increment/decrement of the selected step
   */

  var steps = this._container.getElementsByTagName("tr");

  // There are no steps
  if(steps.length === 0) {
    return;
  }

  // Handle the scrolling logic
  this._selectedStep = this._selectedStep + direction;

  // Negative roll-over
  if(this._selectedStep === -1) {
    this._selectedStep = steps.length - 1;
  }

  // Positive roll-over
  this._selectedStep = this._selectedStep % steps.length;

  this.render(true);

  if(this._selectedStep > 15) {
    this._container.parentElement.scrollTop = (this._selectedStep - 15) * 24;
  } else {
    this._container.parentElement.scrollTop = 0;
  }

}

function getPublicationFromPID() {

  /*
   * Function getPublicationFromPID
   * Returns the resource that belogns to the PID
   */

  // Get the publication from the URL
  var SHA256 = location.search.substring(1);

  if(!PUBLICATIONS.hasOwnProperty(SHA256)) {
    notify("danger", "Data from this persistent identifier could not be found.");
  }

  // Request the persistent resource from disk
  HTTPRequest("./publications/" + SHA256 + ".pid", "GET", __unlock__);

}

function __init__() {

  // Check local storage
  if(!window.localStorage) {
    return notify("warning", "Local storage is not supported by your browser. Save your work manually by exporting your data.");
  }

  if(location.search) {
    return getPublicationFromPID();
  }

  // Load the specimens from local storage
  samples = localStorage.getItem("specimens");

  if(samples === null) {
    samples = new Array();
    return notify("warning", "Welcome to <b>Paleomagnetism.org</b>. No specimens are available. Add data to begin.");
  }

  addMap();

  __unlock__(samples);

}

// Components
var stepSelector = new StepSelector();

__init__();