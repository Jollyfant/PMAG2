// Event handlers
function registerEventHandlers() {

  // Simple listeners
  document.getElementById("customFile").addEventListener("change", fileSelectionHandler);
  document.addEventListener("keydown", keyboardHandler);
  document.getElementById("interpretation-table-container").addEventListener("click", interpretationTableClickHandler);
  document.getElementById("specimen-select").addEventListener("change", resetSpecimenHandler);
  document.getElementById("table-container").addEventListener("click", handleTableClick);
  document.getElementById("fitting-container-table-tbody").addEventListener("click", handleTableClickComponents);
  document.getElementById("save-location").addEventListener("click", handleLocationSave);
  document.getElementById("specimen-age-select").addEventListener("change", handleAgeSelection);

  // Radio class listeners
  Array.from(document.getElementsByClassName("demagnetization-type-radio")).forEach(function(x) {
    x.addEventListener("click", function(event) {
      getSelectedSpecimen().demagnetizationType = $(event.target).attr("value");
    });
  });

  // Initialize controlled vocab
  addLithologyOptions();
  addGeologicalClassOptions();

}

var Measurement = function(step, coordinates, error) {

  /*
   * Class Measurement
   * Container for a single demagnetization step
   */

  this.step = step.trim();

  this.x = Number(coordinates.x);
  this.y = Number(coordinates.y);
  this.z = Number(coordinates.z);

  this.error = Number(error);

  this.visible = true;
  this.selected = false;

}


function addDegmagnetizationFiles(format, files) {

  /*
   * Function addDegmagnetizationFiles
   * Adds files loaded by the Filehandler API and delegates to the correct handler
   */

  switch(format) {
    case "UNKNOWN":
      return files.forEach(importUnknown);
    case "BLACKMNT":
      return files.forEach(importBlackMnt);
    case "UTRECHT":
      return files.forEach(importUtrecht);
    case "MUNICH":
      return files.forEach(importMunich);
    case "PMAGORG2":
      return files.forEach(importApplicationSave);
    case "PMAGORG":
      return files.forEach(importApplicationSaveOld);
    case "HELSINKI":
      return files.forEach(importHelsinki);
    case "CALTECH":
      return files.forEach(importCaltech);
    case "BCN2G":
      return files.forEach(importBCN2G);
    case "NGU":
      return files.forEach(importNGU);
    case "PALEOMAC":
      return files.forEach(importPaleoMac);
    case "OXFORD":
      return files.forEach(importOxford);
    case "RS3":
      return files.forEach(importRS3);
    case "BEIJING":
      return files.forEach(importBCN2G);
    case "CENIEH":
      return files.forEach(importCenieh);
    case "MAGIC":
      return files.forEach(importMagic);
    case "JR5":
      return files.forEach(importJR5);
    case "JR6":
      return files.forEach(importJR6);
    default:
      throw(new Exception("Unknown importing format requested."));
  }

}

function loadCollectionFileCallback(files) {

  const format = document.getElementById("format-selection").value;

  // Drop the samples if not appending
  if(!document.getElementById("append-input").checked) {
    specimens = new Array();
  }

  var nSamples = specimens.length;

  // Try adding the demagnetization data
  try {
    addDegmagnetizationFiles(format, files);
  } catch(exception) {
    return notify("danger", exception);
  }

  updateSpecimenSelect();

  if(specimens.length) {
    enableInterpretationTabs();
  }

  notify("success", "Succesfully added <b>" + (specimens.length - nSamples) + "</b> specimen(s) (" + format + ").");

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

function enableInterpretationTabs() {

  /*
   * Function enableInterpretationTabs
   * Removes disabled component from the interpretations tabs
   */

  $("#nav-profile-tab").removeClass("disabled");
  $("#nav-fitting-tab").removeClass("disabled");

  $("#nav-profile-tab").tab("show");

}

function updateInterpretationTable(specimen) {

  /*
   * Function updateInterpretationTable
   * Updates the table with information on interpreted components
   */

  const COMMENT_LENGTH = 15;
  const ERROR_NO_COMPONENTS = "<div class='text-muted text-center'>No Components Available</div>";
  const ChRM_COMMENT = "Click to add";

  var specimen = getSelectedSpecimen();

  // No interpretations to show
  if(specimen.interpretations.length === 0) {
    return document.getElementById("interpretation-table-container").innerHTML = ERROR_NO_COMPONENTS;
  }

  var tableHeader = new Array(
    "<table class='table text-center table-sm table-striped'>",
    "  <caption>Interpreted Components</caption>",
    "  <tr>",
    "    <td>Declination</td>",
    "    <td>Inclination</td>",
    "    <td>Intensity</td>",
    "    <td>MAD</td>",
    "    <td>Type</td>",
    "    <td>Anchored</td>",
    "    <td>Fitted</td>",
    "    <td>Steps</td>",
    "    <td>Group</td>",
    "    <td>Comment</td>",
    "    <td>Created</td>",
    "    <td><button onclick='deleteAllInterpretations()' class='btn btn-sm btn-link'><i class='far fa-trash-alt'></i> Clear All</button></td>",
    "  </tr>"
  ).join("\n");

  // Start adding all the specimens
  var rows = specimen.interpretations.map(function(interpretation, i) {

    // Get the interpretation in the right reference frame
    var component = interpretation[COORDINATES];

    var direction = literalToCoordinates(component.coordinates).toVector(Direction);

    // Handle comments on interpretations
    if(interpretation.comment === null) {
      comment = ChRM_COMMENT;
    } else {
      comment = interpretation.comment;
    }

    // Mad angle (if forced this is unreliable)
    var mad = interpretation.MAD.toFixed(2);
    if(interpretation.anchored) {
      mad = "<span class='text-danger' title='The MAD for anchored components is unreliable.'>" + mad + "</span>";
    }

    // Intensity (also unreliable when forced)
    var intensity = interpretation.intensity.toFixed(2);
    if(interpretation.anchored) {
      intensity = "<span class='text-danger' title='The intensity for anchored components is unreliable.'>" + intensity + "</span>";
    }

    return [
      "  </tr>",
      "    <td>" + direction.dec.toFixed(2) + "</td>",
      "    <td>" + direction.inc.toFixed(2) + "</td>",
      "    <td>" + intensity + "</td>",
      "    <td>" + mad + "</td>",
      "    <td>" + tauToMark(interpretation.type) + "</td>",
      "    <td>" + booleanToCheck(interpretation.anchored) + "</td>",
      "    <td>" + booleanToCheck(interpretation.fitted) + "</td>",
      "    <td>" + interpretation.steps.length + "</td>",
      "    <td style='cursor: pointer;' class='text-muted'><span style='pointer-events: none;' class='badge badge-light'>" + interpretation.group + "</span></td>",
      "    <td style='cursor: pointer;' title='" + comment + "'>" + ((comment.length < COMMENT_LENGTH) ? comment : comment.slice(0, COMMENT_LENGTH) + "…") + "</td>",
      "    <td>" + interpretation.created + "</td>",
      "    <td><button onclick='deleteAllInterpretations(" + i + ")' class='btn btn-sm btn-link'><i class='far fa-trash-alt'></i></button></td>",
      "  </tr>"
    ].join("\n");

  });

  var tableFooter = "</table>";

  document.getElementById("interpretation-table-container").innerHTML = tableHeader + rows.join("\n") + tableFooter;

}

function tauToMark(tau) {

  return tau === "TAU3" ? "τ3" : "τ1";

}

function booleanToCheck(bool) {

  return bool ? "Yes" : "No";

}

function switchGroup(name) {

  if(GROUP === name) {
    return;
  }

  // Update the global variable
  GROUP = name;
  notify("info", "Succesfully changed group to <b>" + GROUP + "</b>.");

  // Redraw the intepretation graph (hiding specimens not in group)
  redrawInterpretationGraph();

}

function mergeGroup(name) {

  /*
   * Function mergeGroup
   * Merges the components in one group to another group
   */

  var group = prompt("Enter the name of the group to merge to. All components in this group will be assigned to the new group.");

  if(group === null) {
    return;
  }

  // If empty we will reset the group to default
  if(group === "") {
    group = "ChRM";
  }

  specimens.forEach(function(sample, i) {
    sample.interpretations.forEach(function(interpretation, j) {

      if(interpretation.group !== name) {
        return;
      }

      interpretation.group = group;

    });
  });

  switchGroup(group);

}

function showIndividualGroups() {

  /*
   * Function showIndividualGroups
   * Shows individual clickable groups for switching @ interpreted components
   */

  var groups = new Object();

  specimens.forEach(function(sample, i) {
    sample.interpretations.forEach(function(interpretation, j) {

      if(!groups.hasOwnProperty(interpretation.group)) {
        groups[interpretation.group] = 0;
      }

      groups[interpretation.group]++;

    });
  });

  let groupNames = Object.keys(groups).sort();

  document.getElementById("group-show").innerHTML = groupNames.map(function(name) {
    return "<span title='Double click to merge with another group' style='cursor: pointer;' ondblclick='mergeGroup(" + "\"" + name + "\""  + ")' onclick='switchGroup(" + "\"" + name + "\""  + ")' class='badge badge-" + (name === GROUP ? "secondary" : "light") + "'>" + name + " (" + groups[name] + ")</span>";
  }).join(" ");

}

function redrawInterpretationGraph() {

  /*
   * Function redrawInterpretationGraph
   * Redraws the hemisphere projection with all interpreted TAU1, TAU3
   */

  var dataSeries = new Array();
  var dataSeriesPlaneNegative = new Array();
  var dataSeriesPlanePositive = new Array();
  var dataSeriesPlaneNegativeFitted = new Array();
  var dataSeriesPlanePositiveFitted = new Array();
  var dataSeriesFitted = new Array();
  var dataSeriesPlane2 = new Array();

  var meanVector = new Coordinates(0, 0, 0);
  var rVector = new Coordinates(0, 0, 0);
  var nCircles = 0;
  var nDirections = 0;

  // Show the available groups
  showIndividualGroups();

  specimens.forEach(function(sample, i) {

    sample.interpretations.forEach(function(interpretation, j) {

      // Skip anything that is not in the group
      if(interpretation.group !== GROUP) {
        return;
      }

      var coordinates = interpretation[COORDINATES].coordinates;
      var co = new Coordinates(coordinates.x, coordinates.y, coordinates.z);
      var direction = co.toVector(Direction);

      // TAU1 could be fitted component or true component
      if(interpretation.type === "TAU1") {

        meanVector = meanVector.add(co);

        if(interpretation.fitted) {
          nCircles++;
        } else {
          rVector = rVector.add(co);
          nDirections++;
        }

        // Add fitted components to another series
        if(interpretation.fitted) {

          dataSeriesFitted.push({
            "x": direction.dec,
            "y": projectInclination(direction.inc),
            "inc": direction.inc,
            "index": i, 
            "interpretation": j, 
            "sample": sample.name,
            "marker": {
              "fillColor": direction.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_RED,
              "lineWidth": 1
            }
          });

        } else {

          dataSeries.push({
            "x": direction.dec,
            "y": projectInclination(direction.inc),
            "inc": direction.inc,
            "index": i, 
            "interpretation": j,
            "sample": sample.name,
            "marker": {
              "fillColor": direction.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_ORANGE,
              "lineWidth": 1
            }
          });

        }

      }

      if(interpretation.type === "TAU3") {

        dataSeriesPlane2.push({
          "x": direction.dec,
          "inc": direction.inc,
          "sample": sample.name,
          "interpretation": j,
          "index": i, 
        });

        if(interpretation.fitted) {
          dataSeriesPlaneNegativeFitted = dataSeriesPlaneNegativeFitted.concat(getPlaneData(direction).negative, null);
          dataSeriesPlanePositiveFitted = dataSeriesPlanePositiveFitted.concat(getPlaneData(direction).positive, null);
        } else {
          dataSeriesPlaneNegative = dataSeriesPlaneNegative.concat(getPlaneData(direction).negative, null);
          dataSeriesPlanePositive = dataSeriesPlanePositive.concat(getPlaneData(direction).positive, null);
        }

      }

    });

  });

  // Update the mean table
  var mean = meanVector.toVector(Direction);
  var R = mean.length;

  // Modified Fisher statistics /McFadden and McElhinny (1988)
  var statistics = getFisherStatisticsFit(nDirections, nCircles, R);
  var a95ellipse = getPlaneData(mean, statistics.a95);

  // Update the table
  updateInterpretationMeanTable(mean, statistics);
  updateInterpretationDirectionTable(dataSeries, dataSeriesFitted, dataSeriesPlane2);

  var series = [{
    "name": "Directions",
    "type": "scatter",
    "data": dataSeries,
    "color": HIGHCHARTS_ORANGE,
    "marker": {
      "symbol": "circle",
      "lineColor": HIGHCHARTS_ORANGE
    }
  }, {
    "name": "Mean",
    "type": "scatter",
    "data": [{
      "sample": "Mean",
      "x": mean.dec,
      "y": projectInclination(mean.inc),
      "inc": mean.inc
    }],
    "color": HIGHCHARTS_GREEN,
    "marker": {
      "symbol": "circle",
      "radius": MARKER_RADIUS_SELECTED,
      "fillColor": (mean.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_GREEN),
      "lineWidth": 1,
      "lineColor": HIGHCHARTS_GREEN
    }
  }, {
    "name": "Confidence Ellipse",
    "linkedTo": ":previous",
    "type": "line",
    "color": HIGHCHARTS_RED,
    "data": getPlaneData(mean, statistics.a95),
    "enableMouseTracking": false,
    "marker": {
      "enabled": false
    }
  }];

  // Add t95 confidence ellipse
  if(dataSeriesPlaneNegativeFitted.length) {
    series.push({
      "name": "t95 Confidence Ellipse",
      "type": "line",
      "color": HIGHCHARTS_RED,
      "data": getPlaneData(mean, statistics.t95),
      "enableMouseTracking": false,
      "dashStyle": "ShortDash",
      "marker": {
        "enabled": false
      }
    });
  }

  if(dataSeriesPlaneNegativeFitted.length) {
    series.push({
      "name": "Great Circles",
      "type": "line",
      "turboThreshold": 0,
      "data": dataSeriesPlanePositiveFitted,
      "color": HIGHCHARTS_GREY,
      "lineWidth": 1,
      "enableMouseTracking": false,
      "marker": {
        "enabled": false
      }
    }, {
      "name": "Great Circles",
      "type": "line",
      "turboThreshold": 0,
      "data": dataSeriesPlaneNegativeFitted,
      "color": HIGHCHARTS_GREY,
      "dashStyle": "ShortDash",
      "lineWidth": 1,
      "linkedTo": ":previous",
      "enableMouseTracking": false,
      "marker": {
        "enabled": false
      }
    });
  }

  if(dataSeriesPlaneNegative.length) {
    series.push({
      "name": "Great Circles",
      "type": "line",
      "turboThreshold": 0,
      "data": dataSeriesPlanePositive,
      "color": HIGHCHARTS_ORANGE,
      "lineWidth": 1,
      "enableMouseTracking": false,
      "marker": {
        "enabled": false
      }
    }, {
      "name": "Great Circles",
      "type": "line",
      "turboThreshold": 0,
      "data": dataSeriesPlaneNegative,
      "color": HIGHCHARTS_ORANGE,
      "dashStyle": "ShortDash",
      "lineWidth": 1,
      "linkedTo": ":previous",
      "enableMouseTracking": false,
      "marker": {
        "enabled": false
      }
    });
  }

  if(dataSeriesFitted.length) {
    series.push({
      "name": "Fitted Directions",
      "type": "scatter",
      "data": dataSeriesFitted,
      "color": HIGHCHARTS_RED,
      "marker": {
        "symbol": "circle",
        "lineColor": HIGHCHARTS_RED
      }
    });
  }

  createHemisphereChart(series);

}

function swapTo(index) {

  updateSpecimenSelect(index);
  $("#nav-profile-tab").tab("show");

}

function updateInterpretationDirectionTable(seriesOne, seriesTwo, dataSeriesPlane2) {

  function createRow(x, value) {

    /*
     * Function createRow
     * Creates an entry in the table
     */

    return new Array(
      "<tr>",
      "  <td onclick='swapTo(" + x.index + ")'><a href='#'>" + x.sample + "</a></td>",
      "  <td>" + x.x.toFixed(1) + "</td>",
      "  <td>" +  x.inc.toFixed(1) + "</td>",
      "  <td>" + this + "</td>",
      "  <td index='" + x.index + "' interpretation='" + x.interpretation + "' class='text-center text-danger' style='cursor: pointer;'><i style='pointer-events: none;' class='fas fa-times'></i></td>",
      "</tr>"
    ).join("\n");

  }

  // Create a row for each series TAU1, TAU3 and TAU3 fitted to TAU1
  let rows = seriesOne.map(createRow.bind("τ1"));
  let rows2 = seriesTwo.map(createRow.bind("τ1 (τ3)"));
  let rows3 = dataSeriesPlane2.map(createRow.bind("τ3"));

  document.getElementById("fitting-container-table-tbody").innerHTML = rows.concat(rows2).concat(rows3).join("\n");
}

function getFisherStatisticsFit(nDirections, nCircles, R) {

  /*
   * function getFisherStatisticsFit
   * Gets fitted great circle fisher parameters (McFadden & McElhinny)
   */

  var nTotal = nDirections + nCircles;
  var nPrime = Math.max(1.1, nDirections + 0.5 * nCircles);
  
  // Other statistical parameters (McFadden & McElhinny, 1988)
  var k = (2 * nDirections + nCircles - 2) / (2 * (nDirections + nCircles - R));
  var t95 = Math.acos(1 - ((nPrime - 1)/k) * (Math.pow(20, (1 / (nPrime - 1))) - 1)) / RADIANS;
  
  // Standard Fisher parameters (k, a95);
  var k = (nTotal - 1) / (nTotal - R);
  var a95 = Math.acos(1 - ((nTotal - R) / R) * (Math.pow(20, (1 / (nTotal - 1))) - 1)) / RADIANS;

  return {
    "N": nTotal,
    "nCircles": nCircles,
    "nDirections": nDirections,
    "a95": a95,
    "t95": t95
  }

}

function handleLocationSave(event) {

  /*
   * Function handleLocationSave
   * Handler when the location and some additional metadata are saved
   */

  function setMetadata(specimen, i) {

    /*
     * Function handleLocationSave
     * Handler when the location and some additional metadata are saved
     */

    // Metadata parameters are within the function scope
    specimen.latitude = latitude;
    specimen.longitude = longitude;
    specimen.lithology = lithology;
    specimen.geology = geology;
    specimen.level = level;
    specimen.age = age;
    specimen.ageMin = ageMin;
    specimen.ageMax = ageMax;

    // Skip overwriting sample name when "apply all" is selected (e.g. forEach call)
    if(i === null) {
      specimen.sample = sample;
    }

  }

  function nullOrNumber(value) {
  
    /*
     * Function nullOrNumber
     * Returns null (if empty string) or a number from a value
     */

    return (value === "") ? null : Number(value);
  
  }

  var specimen = getSelectedSpecimen();

  var lithology = document.getElementById("specimen-lithology-input").value;
  if(lithology === "null") {
    lithology = null;
  }

  var geology = document.getElementById("specimen-geology-input").value;
  if(geology === "null") {
    geology = null;
  }

  var longitude = nullOrNumber(document.getElementById("specimen-longitude-input").value);
  var latitude = nullOrNumber(document.getElementById("specimen-latitude-input").value);
  var level = nullOrNumber(document.getElementById("specimen-level-input").value);
  var ageMin = nullOrNumber(document.getElementById("age-min-input").value);
  var ageMax = nullOrNumber(document.getElementById("age-max-input").value);
  var age = nullOrNumber(document.getElementById("age-input").value);

  var sample = document.getElementById("specimen-sample-input").value;

  // If apply all has been checked we apply to all specimens
  if(document.getElementById("location-apply-all").checked) {
    specimens.forEach(setMetadata);
  } else {
    setMetadata(specimen, null);
  }

  // Success
  notify("success", "Succesfully changed metadata for specimen <b>" + specimen.name + "</b>.");

  $("#map-modal").modal("hide");

  saveLocalStorage();
  formatStepTable();

}

function handleTableClickComponents(event) {

  /*
   * Function handleTableClickComponents
   * Handles click on delete for interpreted component table
   */

  let specimenIndex = event.target.getAttribute("index");
  let interpretationIndex = event.target.getAttribute("interpretation");

  if(event.target.cellIndex === 4) {
    specimens[specimenIndex].interpretations.splice(interpretationIndex - 1, 1);
  }

  saveLocalStorage();
  redrawCharts();

}


function handleTableClick(event) {

  /*
   * Function handleTableClick
   * Handles event when clicked on table
   */

  const CORE_AZIMUTH_COLUMN = 6;
  const CORE_DIP_COLUMN = 7;
  const BEDDING_STRIKE_COLUMN = 8;
  const BEDDING_DIP_COLUMN = 9;
  const INFO_COLUMN = 10;

  var specimen = getSelectedSpecimen();

  if(event.target.parentElement.rowIndex === 0) {
    return;
  }

  switch(event.target.cellIndex) {

    case CORE_AZIMUTH_COLUMN:
      var response = prompt("Enter a value for the core azimuth.");
      if(response === null) {
        return;
      }
      specimen.coreAzimuth = Number(response);
      break;

    case CORE_DIP_COLUMN:
      var response = prompt("Enter a value for the core dip.");
      if(response === null) {
        return;
      }
      specimen.coreDip = Number(response);
      break;

    case BEDDING_STRIKE_COLUMN:
      var response = prompt("Enter a value for the bedding strike.");
      if(response === null) {
        return;
      }
      specimen.beddingStrike = Number(response);
      break;

    case BEDDING_DIP_COLUMN:
      var response = prompt("Enter a value for the bedding dip.");
      if(response === null) {
        return;
      }
      specimen.beddingDip = Number(response);
      break;

    // Location change requested
    case INFO_COLUMN:
      return $("#map-modal").modal("show");

    default:
      return;
  }

  specimen.interpretations = new Array();

  notify("success", "Specimen parameters have been updated. All interpretations have been removed.");

  saveLocalStorage();
  redrawCharts();

}

function handleSpecimenScroll(direction) {

  /*
   * Function handleSpecimenScroll
   * Handles scrolling of the specimen selection box in both directions
   */

  const specimenSelectElement = document.getElementById("specimen-select");
  const options = specimenSelectElement.getElementsByTagName("option");

  // Zero or one sample: do nothing
  if(options.length < 2) {
    return;
  }

  // Get the currently selected index
  var selectedIndex = specimenSelectElement.selectedIndex;

  // Scrolling logic
  var newIndex = selectedIndex + direction;

  if(newIndex === -1) {
    newIndex = options.length - 1;
  }

  // Select the new index
  options[newIndex % options.length].selected = "selected";

  // Manually dispatch a change event
  specimenSelectElement.dispatchEvent(new Event("change"));

}

function getSelectedSpecimen() {

  /*
   * Function getSelectedSpecimen
   * Returns the currently selected specimen object
   */

  const specimenSelectElement = document.getElementById("specimen-select");

  var selectedIndex = specimenSelectElement.selectedIndex;

  if(selectedIndex === -1) {
    return null;
  }

  return specimens[selectedIndex];

}

function updateSpecimenSelect(index) {

  /*
   * Function updateSpecimenSelect
   * Updates the specimenSelector with new samples
   */

  removeOptions(document.getElementById("specimen-select"));

  specimens.forEach(addPrototypeSelection);
  document.getElementById("specimen-select").selectedIndex = index || 0;
  stepSelector.reset();
  saveLocalStorage();

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

function addGeologicalClassOptions() {

  /*
   * Function addGeologicalClassOptions
   * Semantic vocab for geological classes (may also be Not Specified)
   */

  const geologicalClasses = new Array(
    "Archeologic", "Extraterrestrial", "Extrusive",
    "Igneous", "Intrusive", "Lunar", "Martian",
    "Metamorphic", "Meteorite", "Sedimentary",
    "Subaerial", "Submarine", "Synthetic"
  );

  addOptions(geologicalClasses, "specimen-geology-input");

}

function addLithologyOptions() {

  /*
   * Function addLithologyOptions
   * Loads lithologies from MagIC controlled vocabularies
   */

  HTTPRequest("../db/lithologies.json", "GET", function(lithologies) {
    addOptions(lithologies, "specimen-lithology-input");
  });

}

function addOptions(options, element) {

  /*
   * Function addOptions
   * Adds a list of options to a specific option element
   */

  options.forEach(function(x) {

    var option = document.createElement("option");

    option.text = x;
    option.value = x;

    document.getElementById(element).add(option);

  });

}

function addPrototypeSelection(x, i) {

  /*
   * Function addPrototypeSelection
   * Adds a prototype to the user prototype selection box
   */

  var option = document.createElement("option");

  option.text = x.name;
  option.value = i;
  x.index = i;

  document.getElementById("specimen-select").add(option);

}

function getFittedGreatCircles() {

  /*
   * Function getFittedGreatCircles
   * Returns a new set of samples with TAU3 fitted to TAU1
   */

  function fitCircle(circleVector, meanVector) {
  
    /*
     * Function getFittedGreatCircles::fitCircle
     * Returns point on a great circle defined by circleVector closest to meanVector
     */
  
    var meanUnitVector = meanVector.unit();
  
    var tau = circleVector.dot(meanUnitVector);
    var rho = Math.sqrt(1 - tau * tau);
  	
    return new Coordinates(
      (meanUnitVector.x - tau * circleVector.x) / rho,
      (meanUnitVector.y - tau * circleVector.y) / rho,
      (meanUnitVector.z - tau * circleVector.z) / rho,
    );
  
  }

  const ANGLE_CUTOFF = 1E-2;
  const fixedCoordinates = COORDINATES;

  // Clear existing fitted great circles
  clearFitted();

  // Container for pointers to the sample / interpretation objects
  var interpretationPointers = new Array();
  var meanVector = new Coordinates(0, 0, 0);
  var nPoints = 0;

  // Prevent mutation and create a clone of all samples in memory
  copySamples = memcpy(specimens);

  copySamples.forEach(function(sample) {

    sample.interpretations.forEach(function(interpretation) {

      // Skip interpretations not in group
      if(interpretation.group !== GROUP) {
        return;
      }

      // Fit in the correct coordinate reference frame
      var reference = interpretation[fixedCoordinates].coordinates;
      var coordinates = new Coordinates(reference.x, reference.y, reference.z);

      // Add the set point to the mean vector
      if(interpretation.type === "TAU1") {

        // Skip fitted directions
        if(interpretation.fitted) {
          return;
        }

        nPoints++;
        return meanVector = meanVector.add(coordinates);

      }

      // Save the TAU3 component for fitting
      if(interpretation.type === "TAU3") {

        // Push memory references to the sample and interpretations for later
        interpretationPointers.push({
          "coordinates": coordinates,
          "sample": sample,
          "interpretation": interpretation
        });

      }
    
    });

  });

  if(nPoints === 0 && interpretationPointers.length === 0) {
    throw(new Exception("No interpretations available."));
  }

  if(interpretationPointers.length === 0) {
    throw(new Exception("No great circles available."));
  }

  // No reference points.. ask user for a reference
  if(meanVector.isNull()) {
    meanVector = new Direction(...prompt("No reference points for great circle fitting. Give suggestion: declination, inclination").split(",")).toCartesian();
  }

  // Confirm the mean vector is valid
  if(!meanVector.isValid()) {
    throw(new Exception("The suggested mean vector is invalid."));
  }

  var fittedCircleCoordinates = new Array();
  var fittedCoordinates;

  // Do the first G' fit on the vector mean
  interpretationPointers.forEach(function(circle) {

    // Fit the closest point on each great circle to the mean vector
    fittedCoordinates = fitCircle(circle.coordinates, meanVector);

    // Add this coordinate for the next fit
    meanVector = meanVector.add(fittedCoordinates);

    // Keep a reference of what was added
    fittedCircleCoordinates.push(fittedCoordinates);

  });

  var nIterations = 0;

  // Following the approach of McFadden & McElhinny (1988)
  // Converge fit points to the mean vector
  while(true) {

    var angles = new Array();

    // Go over all great circles
    interpretationPointers.forEach(function(circle, i) {

      // Previously fitted point
      var GPrime = fittedCircleCoordinates[i];

      // Remove this point, find the new closest point on the circle, and add this point
      meanVector = meanVector.subtract(GPrime);
      var GPrimeNew = fitCircle(circle.coordinates, meanVector);
      meanVector = meanVector.add(GPrimeNew);

      // Angles between G and G' (check for convergence)
      angles.push(Math.acos(Math.min(1, GPrimeNew.dot(GPrime))) / RADIANS);

      // Replace for next iteration
      fittedCircleCoordinates[i] = GPrimeNew;

    });

    nIterations++;

    // All angles directions are stable and below a certain threshold
    if(Math.max(...angles) < ANGLE_CUTOFF) {
      break;
    }
   
  }

  function convertInterpretation(fittedCoordinates, i) {

    /*
     * Function getFittedGreatCircles::convertInterpretation
     * Converts a fitted TAU3 to TAU1 component
     */

    // Follow the previously saved pointers
    var specimen = interpretationPointers[i].sample;
    var interpretation = interpretationPointers[i].interpretation;
	
    interpretation.fitted = true;

    var copy = memcpy(interpretation);

    // The interpretation type has now become TAU1
    copy.type = "TAU1";           
    copy.fitted = true;           

    // Great circles are fitted in a particular reference frame!
    // Backpropogate the direction back to specimen coordinates and update the rotated components
    var specimenCoordinates = fromReferenceCoordinates(fixedCoordinates, specimen, fittedCoordinates);

    // Rotate the TAU1 back to the appropriate reference frame
    copy.specimen.coordinates = specimenCoordinates;
    copy.geographic.coordinates = inReferenceCoordinates("geographic", specimen, specimenCoordinates);
    copy.tectonic.coordinates = inReferenceCoordinates("tectonic", specimen, specimenCoordinates);

    specimen.interpretations.push(copy);

    var coordinates = copy[fixedCoordinates].coordinates;

    // Confirm that the rotation to base specimen coordinates went OK
    if(!fEquals(fittedCoordinates.x, coordinates.x) || !fEquals(fittedCoordinates.y, coordinates.y) || !fEquals(fittedCoordinates.z, coordinates.z)) {
      throw("Assertion failed in rotation of fitted direction.");
    }

  }

  // Mutate the fitted TAU3 components to become TAU1
  fittedCircleCoordinates.forEach(convertInterpretation);

  notify("success", "Succesfully fitted <b>" + fittedCircleCoordinates.length + "</b> great circle(s) to <b>" + nPoints + "</b> directional component(s) in <b>" + nIterations + "</b> iteration(s) in <b>" + COORDINATES + "</b> coordinates.");

  // Return the new set of samples
  return copySamples;

}

function clearFittedRefresh() {

  clearFitted();
  redrawInterpretationGraph();

}

function clearFitted() {

  specimens.forEach(function(specimen) {
    specimen.interpretations = specimen.interpretations.filter(x => x.type !== "TAU1" || !x.fitted)
    specimen.interpretations.forEach(x => x.fitted = false);
  });

}

function updateInterpretationMeanTable(direction, parameters) {

  /*
   * Function updateInterpretationMeanTable
   * Updates the mean table for all components
   */

  var meanTable = new Array(
    "  <caption>Mean Component Statistics</caption>",
    "  <thead>",
    "    <tr>",
    "      <td>Components</td>",
    "      <td>Directions</td>",
    "      <td>Circles</td>",
    "      <td>Declination</td>",
    "      <td>Inclination</td>",
    "      <td>α95</td>",
    "      <td>t95</td>",
    "      <td>Reference</td>",
    "      <td>Fitted</td>",
    "    </tr>",
    "  </thead>",
    "  <tbody>",
    "    <tr>",
    "      <td>" + parameters.N + "</td>",
    "      <td>" + parameters.nDirections + "</td>",
    "      <td>" + parameters.nCircles + "</td>",
    "      <td>" + direction.dec.toFixed(2) + "</td>",
    "      <td>" + direction.inc.toFixed(2) + "</td>",
    "      <td>" + parameters.a95.toFixed(2) + "</td>",
    "      <td>" + parameters.t95.toFixed(2) + "</td>",
    "      <td>" + COORDINATES + "</td>",
    "      <td><button class='btn btn-sm btn-link' onclick='clearFittedRefresh()'><i class='far fa-trash-alt'></i> Clear</button></td>",
    "    </tr>",
    "  </tbody>"
  ).join("\n");

  document.getElementById("fitted-table-container").innerHTML = meanTable;

}

function redrawCharts(hover) {

  /*
   * Function redrawCharts
   * Redraws all the charts for the active specimen
   */

  // Save the current scroll position for later, otherwise the scroll position will
  // jump to the top when a Highcharts chart is drawn
  var tempScrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0

  var specimen = getSelectedSpecimen();

  plotZijderveldDiagram(hover);
  plotIntensityDiagram(hover);
  eqAreaProjection(hover);

  // Redraw without fitting
  redrawInterpretationGraph();

  updateInterpretationTable();
  formatStepTable();

  // Reset the scroll position
  window.scrollTo(0, tempScrollTop);

}

function deleteAllInterpretations(index) {
  
  /*
   * Function deleteAllInterpretations
   * Deletes all interpretations in a specimen
   */

  var specimen = getSelectedSpecimen();

  // Reset
  if(index === undefined) {
    if(!confirm("Are you sure you wish to clear all interpretations in this specimen?")) {
      return;
    }
    specimen.interpretations = new Array();
  } else {
    specimen.interpretations.splice(index, 1);
  } 

  redrawCharts();
  saveLocalStorage();

}

function interpretationTableClickHandler(event) {

  /*
   * Function interpretationTableClickHandler
   * Handlers a click on the interpreted component table
   */

  var specimen = getSelectedSpecimen();

  var columnIndex = event.target.cellIndex;
  var rowIndex = event.target.parentElement.rowIndex;

  // A specific component was referenced
  if(rowIndex > 0) {

    if(columnIndex === 8) {
      var comment = prompt("Enter the new group for this interpretation.", specimen.interpretations[rowIndex - 1].group);
      if(comment === null) return;
      if(comment === "") comment = "ChRM";
      specimen.interpretations[rowIndex - 1].group = comment;
    }

    if(columnIndex === 9) {
      var comment = prompt("Enter a comment for this interpretation.", specimen.interpretations[rowIndex - 1].comment);
      if(comment === null) return;
      if(comment === "") comment = null;
      specimen.interpretations[rowIndex - 1].comment = comment;
    }

  }

  redrawCharts();
  saveLocalStorage();

}

function persistFork() {

  /*
   * Function persistFork
   * Writes fork to local storage
   */

  // Force a save to local storage
  saveLocalStorage(true);

  // Reload without the persitent identifier
  window.location = window.location.pathname;

}

function __unlock__(json) {

  /*
   * Function __unlock__
   * Application has initialized and handlers can be registered
   */

  // Loaded from a publication: save the reference persistent identifier
  if(window.location.search) {
    json.forEach(function(sample, i) {
      sample.reference = window.location.search.slice(1) + "." + i;
    });
  }

  if(json.length) {

    if(window.location.search) {
      notify("success", "Succesfully forked <b>" + json.length + "</b> specimen(s). Changes to this session will not be saved (<a href='#' onclick='persistFork()'><i class='fas fa-code-branch'></i><b> Persist Fork</b></a>).");
    } else {
      notify("success", "Welcome back! Succesfully loaded <b>" + json.length + "</b> specimen(s).");
    }

    enableInterpretationTabs();

  } else {
    notify("success", "Welcome to <b>Paleomagnetism.org</b>! Add data below to get started with your analysis.");
  }

  specimens = json;

  registerEventHandlers();
  updateSpecimenSelect();
  stepSelector.reset();

  addMap();
  
} 

// Some globals
var leafletMarker;
var map;
var COORDINATES_COUNTER = 0;
var COORDINATES = "specimen";
var GROUP = "ChRM";
var UPWEST = true;
var specimens = new Array();

function keyboardHandler(event) {

  /*
   * Function keyboardHandler
   * Handles keypresses on keyboard
   */

  // No key events with map modal open
  if($("#map-modal").hasClass("show")) {
    return;
  }

  // Block all key commands if the interpretation tab is not open
  if(!interpretationTabOpen() && !fittingTabOpen()) {
    return;
  }

  const CODES = new Object({
    "ARROW_RIGHT": 39,
    "ARROW_LEFT": 37,
    "ARROW_UP": 38,
    "ARROW_DOWN": 40,
    "W_KEY": 87,
    "D_KEY": 68,
    "S_KEY": 83,
    "A_KEY": 65,
    "Z_KEY": 90,
    "X_KEY": 88,
    "G_KEY": 71,
    "I_KEY": 73,
    "Q_KEY": 81,
    "MINUS_KEY": 173,
    "MINUS_KEY_NUM": 109,
    "PLUS_KEY": 61,
    "PLUS_KEY_NUM": 107,
    "KEYPAD_ONE": 49,
    "KEYPAD_TWO": 50,
    "KEYPAD_THREE": 51,
    "KEYPAD_EIGHT": 56,
    "KEYPAD_NINE": 57,
    "ESCAPE_KEY": 27
  });

  // Block all key events when no specimens are loaded
  if(specimens.length === 0) {
    return;
  }

  // Override the default handlers
  if(!Object.values(CODES).includes(event.keyCode)) {
    return;
  }

  event.preventDefault();

  var specimen = getSelectedSpecimen();

  // Delegate to the appropriate handler
  switch(event.keyCode) {
    case CODES.ARROW_RIGHT:
    case CODES.D_KEY:
      return handleSpecimenScroll(1);
    case CODES.ARROW_LEFT:
    case CODES.A_KEY:
      return handleSpecimenScroll(-1);
    case CODES.ARROW_DOWN:
    case CODES.S_KEY:
      return stepSelector.handleStepScroll(1);
    case CODES.ARROW_UP:
    case CODES.W_KEY:
      return stepSelector.handleStepScroll(-1);
    case CODES.MINUS_KEY:
    case CODES.MINUS_KEY_NUM:
    case CODES.Z_KEY:
      return stepSelector.hideStep();
    case CODES.PLUS_KEY:
    case CODES.PLUS_KEY_NUM:
    case CODES.X_KEY:
      return stepSelector.selectStep();
    case CODES.G_KEY:
      return setActiveGroup();
    case CODES.I_KEY:
      return $("#map-modal").modal("show");
    case CODES.Q_KEY:
      return deleteCurrentSpecimen();
    case CODES.KEYPAD_ONE:
      if(event.ctrlKey) {
        return makeInterpretation(specimen, {"type": "TAU1", "anchored": true});
      } else {
        return makeInterpretation(specimen, {"type": "TAU1", "anchored": false});
      }
    case CODES.KEYPAD_TWO:
      if(event.ctrlKey) {
        return makeInterpretation(specimen, {"type": "TAU3", "anchored": true});
      } else {
        return makeInterpretation(specimen, {"type": "TAU3", "anchored": false});
      }
    case CODES.KEYPAD_THREE:
      return switchProjection();
    case CODES.KEYPAD_EIGHT:
      return switchCoordinateReference();
    case CODES.KEYPAD_NINE:

      try {
        specimens = getFittedGreatCircles();
        return redrawInterpretationGraph();
      } catch(exception) {
        return notify("danger", exception);
      }

    case CODES.ESCAPE_KEY:
      return document.getElementById("notification-container").innerHTML = "";
  }

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
    localStorage.setItem("specimens", JSON.stringify(specimens));
  } catch(exception) {
    notify("danger", "Could not write to local storage. Export your data manually to save it.");
  }

}

function deleteCurrentSpecimen() {

  /*
   * Function deleteCurrentSpecimen
   * Deletes the currently active specimen
   */

  const specimenSelectElement = document.getElementById("specimen-select");

  var selectedIndex = specimenSelectElement.selectedIndex;

  if(selectedIndex === -1) {
    return;
  }

  if(!confirm("Are you sure you wish to remove this specimen?")) {
    return;
  }

  notify("success", "Succesfully removed specimen <b>" + specimens[selectedIndex].name + "</b>.");

  // Remove from the array
  specimens.splice(selectedIndex, 1);
  
  updateSpecimenSelect();

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

  // Update title to show the specimen
  document.getElementById("exampleModalLabel").innerHTML = "<i class='fas fa-map-marker-alt'></i> &nbsp; Specimen metadata for " + specimen.name;

  // Clear cached form entries
  document.getElementById("specimen-age-select").value = null;
  document.getElementById("specimen-lithology-input").value = null;
  document.getElementById("specimen-geology-input").value = null;
  document.getElementById("age-input").value = "";
  document.getElementById("age-min-input").value = "";
  document.getElementById("age-max-input").value = "";
  document.getElementById("specimen-latitude-input").value = "";
  document.getElementById("specimen-longitude-input").value = "";
  document.getElementById("specimen-level-input").value = "";

  // If this specimen is located, put on map
  if(leafletMarker && specimen.latitude !== null && specimen.longitude !== null) {
    leafletMarker.setLatLng(new L.LatLng(specimen.latitude, specimen.longitude));
  }

  document.getElementById("specimen-name-input").value = specimen.name;
  document.getElementById("specimen-sample-input").value = specimen.sample;

  // Set current specimen location
  if(specimen.latitude !== null) {
    document.getElementById("specimen-latitude-input").value = specimen.latitude;
  }

  if(specimen.longitude !== null) {
    document.getElementById("specimen-longitude-input").value = specimen.longitude;
  }

  // Set the age
  if(specimen.age !== null) {
    document.getElementById("age-input").value = specimen.age;
  }
  if(specimen.ageMin !== null) {
    document.getElementById("age-min-input").value = specimen.ageMin;
  }
  if(specimen.ageMax !== null) {
    document.getElementById("age-max-input").value = specimen.ageMax;
  }

  // Set geologic timescale if required
  if(specimen.ageMin !== null && specimen.ageMax !== null) {
    setGeologicalTimescale(specimen);
  }

  // Set the existing lithology
  if(specimen.lithology !== null) {
    document.getElementById("specimen-lithology-input").value = specimen.lithology;
  }

  if(specimen.geology !== null) {
    document.getElementById("specimen-geology-input").value = specimen.geology;
  }

  if(specimen.level !== null) {
    document.getElementById("specimen-level-input").value = specimen.level;
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
    if(event.target.nodeName === "TR") {
      this.setActiveStep(Number(event.target.value));
    }
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
  if(specimen.demagnetizationType === "thermal") {
    $("#option1").parent().button("toggle");
  } else if(specimen.demagnetizationType === "alternating") {
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

  if(specimen.latitude === null || specimen.longitude === null || specimen.age === null && specimen.ageMin === null || specimen.ageMax === null || specimen.lithology === null || specimen.geology === null) {
    var specimenLocation = "<span style='pointer-events: none;' class='text-muted'>" + getSuccesfulLabel(false) + " Edit</span>";
  } else {
    var specimenLocation = "<span style='pointer-events: none;' class='text-muted'>" + getSuccesfulLabel(true) + " Edit</span>";
  }

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
    "      <td class='text-primary' title='Specimen location'><i class='fas fa-map-marker-alt'></i> Metadata</td>",
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

  // Get the publication, collection, and specimen identifier from the URL
  var [publication, collection, specimen] = location.search.substring(1).split(".");

  if(collection === undefined) {
    return notify("danger", "A persistent identifier related to a collection must be given.");
  }

  HTTPRequest("https://api.paleomagnetism.org/" + publication, "GET", function(json) {

    if(json === null) {
      return notify("danger", "Data from this persistent identifier could not be found.");
    }

    // A collection identifier was passed
    if(collection !== undefined) {
      json.collections = [json.collections[collection]];
    }

    // Get the specimens
    specimens = json.collections[0].data.specimens;

    // A specimen identifier was passed
    if(specimen !== undefined) {
      specimens = [specimens[specimen]];
    }

    __unlock__(specimens);

  });

}

function downloadInterpretationsCSV() {

  /*
   * Function downloadInterpretationsCSV
   * Downloads all interpreted components to a CSV
   */

  const FILENAME = "interpretations.csv";

  const CSV_HEADER = new Array(
    "name", "declination", "inclination",
    "reference", "core azimuth", "core dip",
    "bedding strike", "bedding dip", "level",
    "longitude", "latitude", "MAD",
    "anchored", "type", "comment",
    "created"
  );

  // No samples are loaded
  if(specimens.length === 0) {
    return notify("danger", new Exception("No interpretations available to export."));
  }

  var rows = new Array(CSV_HEADER.join(","));

  // Export the interpreted components as CSV
  specimens.forEach(function(specimen) {

    specimen.interpretations.forEach(function(interpretation) {

      // Get the samples in the right frame
      var direction = inReferenceCoordinates(COORDINATES, specimen, literalToCoordinates(interpretation.specimen.coordinates)).toVector(Direction)

      rows.push(new Array(
        specimen.name,
        direction.dec,
        direction.inc,
        COORDINATES,
        specimen.coreAzimuth,
        specimen.coreDip,
        specimen.beddingStrike,
        specimen.beddingDip,
        specimen.level,
        specimen.longitude,
        specimen.latitude,
        interpretation.MAD,
        interpretation.anchored,
        interpretation.type,
        interpretation.comment,
        interpretation.created
      ).join(ITEM_DELIMITER));

    });

  });

  // No interpretations (only header)
  if(rows.length === 1) {
    return notify("danger", new Exception("No interpretations available to export."));
  }

  downloadAsCSV(FILENAME, rows.join(LINE_DELIMITER));

}

var sortEigenvectors = function(eig) {

  /*
   * Function sortEigenvectors
   * sorts eigenvalues and corresponding eigenvectors from highest to lowest 
   */

  // Algorithm to sort eigenvalues and corresponding eigenvectors
  // as taken from the PmagPY library
  var t1 = 0;
  var t2 = 0;
  var t3 = 1;
  var ind1 = 0;
  var ind2 = 1;
  var ind3 = 2;

  // Normalize eigenvalues (impure)
  normalizeEigenValues(eig);

  //Determine what eigenvalues are largest and smallest
  eig.lambda.x.forEach(function(value, i) {

    // Find the largest eigenvalue
    if(value > t1) {
      t1 = value;
      ind1 = i;
    }

    // Find the smallest eigenvalue
    if(value < t3) {
      t3 = value;
      ind3 = i;
    }

  });

  // Middle eigenvector
  eig.lambda.x.forEach(function(value, i) {
    if(value !== t1 && value !== t3) {
      t2 = value;
      ind2 = i;
    }
  });

  // Sort eigenvectors
  return {
    "v1": new Array(eig.E.x[0][ind1], eig.E.x[1][ind1], eig.E.x[2][ind1]),
    "v2": new Array(eig.E.x[0][ind2], eig.E.x[1][ind2], eig.E.x[2][ind2]),
    "v3": new Array(eig.E.x[0][ind3], eig.E.x[1][ind3], eig.E.x[2][ind3]),
    "tau": new Array(t1, t2, t3)
  }

}

function normalizeEigenValues(eig) {

  /*
   * Function normalizeEigenValues
   * Modifies the eigen object in place and normalizes the eigenvalues to within [0, 1]
   */

  var trace = 0;

  // Get the trace of the matrix
  for(var i = 0; i < 3; i++) {
    trace += eig.lambda.x[i];
  }

  for(var i = 0; i < 3; i++) {
    eig.lambda.x[i] = eig.lambda.x[i] / trace;
  }

}

function makeInterpretations(options, selectedSteps, reference) {

  /*
   * Function makeInterpretation
   * Does a PCA interpretation on the selected steps
   */

  var anchored = options.anchored;
  var type = options.type;

  var specimen = getSelectedSpecimen();

  var centerMass = new Array(0, 0, 0);

  var vectors = selectedSteps.map(function(step) {
    return new Array(step.x, step.y, step.z);
  });

  // Vector of first & last step
  var firstVector = new Coordinates(...vectors[0]);

  // When anchoring we mirror the points and add them
  if(anchored) {
    vectors = vectors.concat(selectedSteps.map(function(step) {
      return new Array(-step.x, -step.y, -step.z);
    }));
  }

  var lastVector = new Coordinates(...vectors[vectors.length - 1]);

  // Transform to the center of mass (not needed when anchoring)
  if(!anchored) {

    for(var i = 0; i < vectors.length; i++) {
      for(var j = 0; j < 3; j++) {
        centerMass[j] += vectors[i][j] / selectedSteps.length;
      }
    }

    for(var i = 0; i < vectors.length; i++) {
      for(var j = 0; j < 3; j++) {
        vectors[i][j] = vectors[i][j] - centerMass[j];
      }
    }

  }

  // Library call (numeric.js) to get the eigenvector / eigenvalues
  try {
    var eig = sortEigenvectors(numeric.eig(TMatrix(vectors)));
  } catch(exception) {
    throw(new Exception("Could not calculate the eigenvectors."));
  }

  // Extract all the steps used in the interpretation
  var stepValues = selectedSteps.map(x => x.step)
  var centerMassCoordinates = new Coordinates(...centerMass);
  var directionVector = firstVector.subtract(lastVector);
  var intensity = directionVector.length;

  var vectorTAU1 = new Coordinates(...eig.v1);
  var vectorTAU3 = new Coordinates(...eig.v3);

  if(directionVector.dot(vectorTAU1) < 0) {
    vectorTAU1 = vectorTAU1.reflect();
  }

  // Determine what eigenvector to use (tau1 for directions; tau3 for planes)
  switch(type) {

    case "TAU1":

      // Calculation of maximum angle of deviation
      var s1 = Math.sqrt(eig.tau[0]);
      var MAD = Math.atan(Math.sqrt(eig.tau[1] + eig.tau[2]) / s1)  / RADIANS;

      // Get the dec/inc of the maximum eigenvector stored in v1
      var eigenVectorCoordinates = vectorTAU1;

      break;

    case "TAU3":

      // Calculation of maximum angle of deviation
      var s1 = Math.sqrt((eig.tau[2] / eig.tau[1]) + (eig.tau[2] / eig.tau[0]));
      var MAD = Math.atan(s1) / RADIANS;

      // Get the coordinates of the maximum eigenvector stored in v3
      var eigenVectorCoordinates = vectorTAU3;

      // Always take the negative pole by convention
      if(eigenVectorCoordinates.z > 0) {
        eigenVectorCoordinates = eigenVectorCoordinates.reflect();
      }

      break;

    default:
      throw(new Exception("Unknown interpretation type requested."));

  }

  if(isNaN(MAD)) {
    MAD = 0;
  }

  return {
    "component": {
      "coordinates": eigenVectorCoordinates,
      "centerMass": centerMassCoordinates
    },
    "intensity": intensity,
    "MAD": MAD
  }

}

function makeInterpretation(specimen, options) {

  /*
   * Function makeInterpretation
   * Does a PCA on the selected specimen (and its selected steps)
   */

  // Get the selected steps
  var selectedSteps = specimen.steps.filter(function(step) {
    return step.selected;
  });

  if(selectedSteps.length < 2) {
    return notify("danger", "A minimum of two selected steps is required.");
  }

  var stepValues = selectedSteps.map(x => x.step);

  // Check if the interpretation already exists
  var exists = Boolean(specimen.interpretations.filter(function(interpretation) {
    return interpretation.steps.join() === stepValues.join() && interpretation.type === options.type && interpretation.anchored === options.anchored;
  }).length);

  if(exists) {
    return notify("warning", "This component already exists.");
  }

  // Get the prinicple component
  var PCA = makeInterpretations(options, selectedSteps, "specimen");

  // Rotate component to geographic coordinates
  var geoCoordinates = inReferenceCoordinates("geographic", specimen, PCA.component.coordinates);
  var geoMass = inReferenceCoordinates("geographic", specimen, PCA.component.centerMass);

  // Rotate component to tectonic coordinates
  var tectCoordinates = inReferenceCoordinates("tectonic", specimen, PCA.component.coordinates);
  var tectMass = inReferenceCoordinates("tectonic", specimen, PCA.component.centerMass);

  var comment;

  if(document.getElementById("auto-comment").checked) {
    comment = prompt("Enter a comment for this interpretation.");
  } else {
    comment = null
  }

  // Attach the interpretation to the specimen
  specimen.interpretations.push({
    "steps": stepValues,
    "anchored": options.anchored,
    "type": options.type,
    "created": new Date().toISOString(),
    "group": GROUP,
    "MAD": PCA.MAD,
    "intensity": PCA.intensity,
    "comment": comment,
    "fitted": false,
    "specimen": PCA.component,
    "geographic": {"coordinates": geoCoordinates, "centerMass": geoMass},
    "tectonic": {"coordinates": tectCoordinates, "centerMass": tectMass},
    "version": __VERSION__,
  });

  if(options.refresh === undefined) {
    redrawCharts();
  }

  saveLocalStorage();

}

function switchProjection() {

  /*
   * Function switchProjection
   * Toggles the projection between Up/West and Up/North
   */

  // Toggle and redraw Zijderveld diagram
  UPWEST = !UPWEST;
  plotZijderveldDiagram();

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

    function lithologySorter(x, y) {
      return x.lithology < y.lithology ? -1 : x.lithology > y.lithology ? 1 : 0;
    }

    function nameSorter(x, y) {
      return x.name < y.name ? -1 : x.name > y.name ? 1 : 0;
    }

    function randomSorter(x, y) {
      return Math.random() < 0.5;
    }

    function ageSorter(x, y) {
      return numericSort(x.age, y.age);
    }

    function stratigraphySorter(x, y) {
      return numericSort(x.level, y.level);
    }

    switch(type) {
      case "name":
        return nameSorter;
      case "bogo":
        return randomSorter;
      case "stratigraphy":
        return stratigraphySorter;
      case "lithology":
        return lithologySorter;
      case "age":
        return ageSorter;
      default:
        notify("danger", "Could not sort samples.");
    }

  }

  // Sort the samples in place
  specimens.sort(getSortFunction(type));

  // Better information handling
  if(type === "bogo") {
    notify("success", "Succesfully sorted specimens <b>randomly</b>.");
  } else {
    notify("success", "Succesfully sorted specimens by <b>" + type + "</b>.");
  }

  updateSpecimenSelect();

}

function interpretationTabOpen() {

  return isTabOpen("nav-profile-tab");

}

function fittingTabOpen() {

  return isTabOpen("nav-fitting-tab");

}

function isTabOpen(tab) {

  /*
   * Function isTabOpen
   * returns TRUE when the tab with the passed identifier is open
   */

  return Array.from($("#nav-tab a.active")).pop().id === tab;

}

function resetSpecimenHandler(event) {

  /*
   * Function resetSpecimenHandler
   * Handler for when a new specimen is selected
   */

  var specimen = getSelectedSpecimen();

  if(specimen === null) {
    return;
  }

  // Create a new step selector
  stepSelector.reset();

}

function setActiveGroup() {

  /*
   * Function setActiveGroup
   * Sets an active group
   */

  var group = prompt("Enter a new group identifier! Leave empty for the default group.", GROUP);

  // Cancel was clicked: do nothing
  if(group === null) {
    return;
  }

  // If empty we will reset the group to default
  if(group === "") {
    return switchGroup("ChRM");
  } else {
    return switchGroup(group);
  }

}

function exportApplicationSave() {

  /*
   * Function exportApplicationSave
   * Generates JSON representation of station table
   */

  if(specimens.length === 0) {
    return notify("danger", new Exception("No specimens to export"));
  }

  // Create the payload with some additional metadata
  var payload = {
    "hash": forge_sha256(JSON.stringify(specimens)),
    "specimens": specimens,
    "version": __VERSION__,
    "created": new Date().toISOString()
  }

  downloadAsJSON("specimens.col", payload);

}

function __init__() {

  /*
   * Function __init__
   * Initializes the Paleomagnetism 2.0.0 interpretation portal
   */

  // Check local storage
  if(!window.localStorage) {
    return notify("warning", "Local storage is not supported by your browser. Save your work manually by exporting your data.");
  }

  if(location.search) {
    return getPublicationFromPID();
  }

  // Load the specimens from local storage
  specimens = JSON.parse(localStorage.getItem("specimens"));

  if(specimens === null) {
    specimens = new Array();
  }

  __unlock__(specimens);

}

// Components
var stepSelector = new StepSelector();

__init__();
