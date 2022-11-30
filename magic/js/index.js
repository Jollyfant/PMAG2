/*
 * File MagIC.js
 * Handler for magic exporting
 */

const DEMAGNETIZATION_THERMAL = "LP-DIR-T";
const DEMAGNETIZATION_ALTERNATING = "LP-DIR-AF";
const MAGIC_TABLE_DELIMITER = ">>>>>>>>>>";

var data = null;

function addEventHandlers() {

  /*
   * Function addEventHandlers
   * Adds event listeners afor keyboard events
   */

  document.getElementById("customFile").addEventListener("change", fileSelectionHandler);
  document.getElementById("download-magic-button").disabled = true;
  document.addEventListener("keydown", keyboardHandler);

}

function keyboardHandler(event) {

  /*
   * Function keyboardHandler
   * Handles keyboard events
   */

  const CODES = new Object({
    "ESCAPE_KEY": 27
  });

  // Override the default handlers
  if(!Object.values(CODES).includes(event.keyCode)) {
    return;
  }

  switch(event.keyCode) {
    case CODES.ESCAPE_KEY:
      return document.getElementById("notification-container").innerHTML = ""; 
  }

}


function fileSelectionHandler(event) {

  /*
   * Function fileSelectionHandler
   * Callback fired when input files are selected
   */

  document.getElementById("download-magic-button").disabled = true;

  readMultipleFiles(Array.from(event.target.files), function(files) {

    data = files;

    var tables = new Array();
    var mayDownload = true;

    // Go over each file (a single collection)
    files.forEach(function(file) {

      var data = JSON.parse(file.data);
      var exception = isComplete(data.specimens);
      var isOk = exception === true;

      // Validation error occurred
      if(exception instanceof Error) {
        mayDownload = false;
      }

      tables.push([
        "<table class='alert alert-" + (isOk ? "success" : "danger") + "' style='width: 100%;'>",
        "  <thead>",
        "  <tr>",
        "    <td><b>Collection</b></td>",
        "    <td><b>Complete</b></td>",
        "    <td><b>Number of Specimens</b></td>",
        "    <td><b>Validation</b></td>",
        "  </tr>",
        "  </thead>",
        "  <tbody>",
        "  <tr>",
        "    <td>" + file.name.split(".").shift() + "</td>",
        "    <td>" + getSuccesfulLabel(isOk) + "</td>",
        "    <td>" + data.specimens.length + "</td>",
        "    <td>" + (exception === true ? "Validated" : exception) + "</td>",
        "  </tr>",
        "  </tbody>",
        "</table>",
      ].join("\n"));

      var rows = new Array();
      var tableHeader = new Array(
        "<table style='width: 100%;'>",
        "  <caption>Available specimens in collection " + file.name + " </caption>",
        "  <thead>",
        "    <tr>",
        "      <td>Specimen</td>",
        "      <td>Method</td>",
        "      <td>Location</td>",
        "      <td>Geology</td>",
        "      <td>Lithology</td>",
        "      <td>Bed Strike</td>",
        "      <td>Bed Dip</td>",
        "      <td>Core Azimuth</td>",
        "      <td>Core Dip</td>",
        "      <td>Age (Ma)</td>",
        "      <td>Measurements</td>",
        "    </tr>",
        "  </thead>"
      ).join("\n");

      var data = JSON.parse(file.data);

      data.specimens.forEach(function(specimen) {

        let longitude = specimen.longitude;

        if(longitude < 0) {
          longitude += 360;
        }

        rows.push([
          "  <tr>",
          "    <td>" + specimen.name + "</td>",
          "    <td>" + getDemagnetizationTypeLabel(specimen.demagnetizationType) + "</td>",
          "    <td>" + longitude + "°E, " + specimen.latitude + "°N</td>",
          "    <td>" + specimen.geology + "</td>",
          "    <td>" + specimen.lithology + "</td>",
          "    <td>" + specimen.beddingStrike + "</td>",
          "    <td>" + specimen.beddingDip + "</td>",
          "    <td>" + specimen.coreAzimuth + "</td>",
          "    <td>" + specimen.coreDip + "</td>",
          "    <td>" + specimen.age + " (" + specimen.ageMin + " ~ " + specimen.ageMax + ")</td>",
          "    <td>" + specimen.steps.length + "</td>",
          "  </tr>"
        ].join("\n"));

      });

      var tableFooter = "</table></small>";
      tables.push(tableHeader + rows.join("\n") + tableFooter);

    });

    document.getElementById("fitted-table-container").innerHTML = tables.join("<br>");

    if(mayDownload) {
      document.getElementById("download-magic-button").disabled = false;
    }

  });

}

function isComplete(specimens) {

  /*
   * function isComplete
   * Checks if a list of specimens is complete
   */

  try {
    specimens.forEach(checkSpecimen);
  } catch(exception) {
    return exception;
  }

  return true;

}

function checkSpecimen(specimen) {

  /*
   * function checkSpecimen
   * Sanity check on individual specimen
   */

  try {
  
    // Check all the required metadata
    if(specimen.demagnetizationType === null) {
      throw("Demagnetization type is not set.");
    }

    if(specimen.age === null) {
      throw("Age is not set.");
    }

    if(specimen.ageMax === null) {
      throw("Maximum age is not set.");
    }

    if(specimen.ageMin === null) {
      throw("Minimum age is not set.");
    }

    if(specimen.latitude === null) {
      throw("Latitude is not set.");
    }

    if(specimen.longitude === null) {
      throw("Longitude is not set.");
    }

    if(specimen.lithology === null) {
      throw("Lithology is not set.");
    }

    if(specimen.lithology === null) {
      throw("Geology is not set.");
    }

    if(specimen.volume === null) {
      specimen.volume = 10.5;
      notify("warning", "Volume is not set: assuming a volume of 10.5cc.");
    }

  } catch(exception) {
    throw(new Exception(specimen.name + " " + exception));
  }

}

function downloadMagIC() {

  /*
   * function downloadMagIC
   * Takes data and puts it in MagIC format
   */

  const MAGIC_DATA_MODEL_VERSION = "3.0";

  // Block when no files loaded
  if(data === null) {
    return notify("danger", new Exception("No collections were loaded."));    
  }

  // Call to create a MagIC file
  exportMagIC();

}

function exportMagIC() {

  /*
   * Function exportMagIC
   * Exports Paleomagnetism.org specimens to MagIC format
   * This is a work in progress
   */

  function createTable(name, header, body) {
  
    /*
     * Function exportMagIC::createTable
     * Creates a single table from a table name, header and body
     */
  
    return new Array(
      "tab delimited\t" + name,
      header.join(TAB_DELIMITER),
      body.join(LINE_DELIMITER)
    );
    
  }

  // Table header definitions
  var contributionHeader = new Array(
    "version",
    "timestamp",
    "contributor",
    "data_model_version",
    "reference",
    "description"
  );

  var sampleHeader = new Array(
    // Names
    "sample",
    "site",
    // Result
    "result_type",
    "result_quality",
    "method_codes",
    "citations",
    // Orientation
    "azimuth",
    "dip",
    "bed_dip_direction",
    "bed_dip",
    // Geography
    "lat",
    "lon"
  );
  
  var specimensHeader = new Array(
    // Names
    "specimen",
    "sample",
    // Result
    "result_quality",
    "method_codes",
    "citations",
    // Measurement Parameters
    "meas_step_min",
    "meas_step_max",
    "meas_step_unit",
    // Orientation
    "azimuth",
    "dip"
  );
  
  var measurementHeader = new Array(
    // Names
    "measurement",
    "experiment",
    "specimen",
    "sequence",
    "standard",
    "quality",
    "method_codes",
    "citations",
    // Measurement Parameters
    "meas_field_ac",
    "meas_temp",
    // Raw Measurement
    "magn_x",
    "magn_y",
    "magn_z",
    // Measurements
    "dir_dec",
    "dir_inc",
    // Magnetization
    "magn_volume"
  );

  var siteHeader = new Array(
    // Names
    "site",
    "location",
    // Result
    "result_type",
    "result_quality",
    "method_codes",
    "citations",
    // Geology
    "geologic_classes",
    "geologic_types",
    "lithologies",
    // Geography
    "lat",
    "lon",
    // Age
    "age",
    "age_low",
    "age_high",
    "age_unit"
  );

  // Required fields in the MagIC 3.0 data model
  var locationHeader = new Array(
    // Names
    "location",
    "location_type",
    // Geology
    "geologic_classes",
    "lithologies",
    // Geography
    "lat_s",
    "lat_n",
    "lon_w",
    "lon_e",
    // Age
    "age_low",
    "age_high",
    "age_unit",
    "citations"
  );

  var magicSpecimens = new Array();
  var magicSites = new Array();
  var magicSamples = new Array();
  var magicMeasurements = new Array();
  var magicLocations = new Array();
  var experimentCounter = 0;

  data.forEach(function(file, i) {

    var specimens = JSON.parse(file.data).specimens;

    // Create a new set for the demagnetization codes
    var demagnetizationTypes = new Set();
    var lithologies = new Set();
    var geologies = new Set();

    var latitudes = new Array();
    var longitudes = new Array();
    var ages = new Array();
    var levels = new Array();

    // Go over all specimens
    specimens.forEach(function(specimen) {

      var demagnetizationType;

      if(specimen.demagnetizationType === "thermal") {
        demagnetizationType = DEMAGNETIZATION_THERMAL;
      } else if(specimen.demagnetizationType === "alternating") {
        demagnetizationType = DEMAGNETIZATION_ALTERNATING;
      } else {
        throw(new Exception("Could not determine demagnetization type for specimen " + specimen.name));
      }

      let longitude = specimen.longitude;

      if(longitude < 0) {
        longitude += 360;
      }

      latitudes.push(specimen.latitude);
      longitudes.push(longitude);
      levels.push(specimen.level);

      // Save the minimum and maximum ages
      ages.push(specimen.ageMin, specimen.ageMax);

      demagnetizationTypes.add(demagnetizationType);
      lithologies.add(specimen.lithology);
      geologies.add(specimen.geology);

      // TODO handling of ages/locations
      magicSites.push([
        specimen.name,
        "location-" + i,
        "i",
        "g",
        demagnetizationType,
        "This study",
        specimen.geology,
        "Not Specified",
        specimen.lithology,
        specimen.latitude,
        longitude,
        specimen.age,
        specimen.ageMin,
        specimen.ageMax,
        "Ma"
      ].join(TAB_DELIMITER));

      magicSamples.push([
        specimen.name,
        specimen.name,
        "s",
        "g",
        demagnetizationType,
        "This study",
        specimen.coreAzimuth,
        specimen.coreDip,
        specimen.beddingStrike + 90,
        specimen.beddingDip,
        specimen.latitude,
        longitude
      ].join(TAB_DELIMITER));

      // Determine minimum and maximum step in correct units
      var minimumStep = (demagnetizationType === DEMAGNETIZATION_ALTERNATING ? toTesla(specimen.steps[0].step) : toKelvin(specimen.steps[0].step));
      var maximumStep = (demagnetizationType === DEMAGNETIZATION_ALTERNATING ? toTesla(specimen.steps[specimen.steps.length - 1].step) : toKelvin(specimen.steps[specimen.steps.length - 1].step));

      magicSpecimens.push([
        specimen.name,
        specimen.name,
        "g",
        demagnetizationType,
        "This study",
        minimumStep,
        maximumStep,
        getStepUnit(demagnetizationType),
        specimen.coreAzimuth,
        specimen.coreDip
      ].join(TAB_DELIMITER));

      // Add all measurement steps
      specimen.steps.forEach(function(step, i) {

        // Convert x, y, z in specimen coordinates to a direction
        var direction = new Coordinates(step.x, step.y, step.z).toVector(Direction);

        // Intensities are in Am^2 in MagIC.
        // Our values are in μA/m so convert it: for Utrecht bug we already normalised to volume
        if(isUtrechtIntensityBug(specimen)) {
          var x = 1E-12 * step.x;
          var y = 1E-12 * step.y;
          var z = 1E-12 * step.z;
        } else {
          var x = 1E-12 * step.x * (specimen.volume || 10.5);
          var y = 1E-12 * step.y * (specimen.volume || 10.5);
          var z = 1E-12 * step.z * (specimen.volume || 10.5);
        }

        magicMeasurements.push([
          specimen.name + "_" + i,
          specimen.name + "_" + i + "_" + demagnetizationType,
          specimen.name,
          experimentCounter++,
          "u",
          "g",
          demagnetizationType,
          "This study",
          (demagnetizationType === DEMAGNETIZATION_ALTERNATING ? toTesla(step.step) : 0),
          (demagnetizationType === DEMAGNETIZATION_THERMAL ? toKelvin(step.step) : 293),
          x,
          y,
          z,
          direction.dec,
          direction.inc,
          // A/m
          1E-6 * direction.length
        ].join(TAB_DELIMITER));

      });

    });

    // Sort latitudes, longitudes & ages to find the minimum and maximum
    latitudes.sort(numericSort);
    longitudes.sort(numericSort);
    ages.sort(numericSort);

    magicLocations.push([
      "location-" + i,
      determineLocationType(latitudes, longitudes, levels),
      Array.from(geologies.values()).join(":"),
      Array.from(lithologies.values()).join(":"),
      latitudes[0],
      latitudes[latitudes.length - 1],
      longitudes[0],
      longitudes[longitudes.length - 1],
      ages[0],
      ages[ages.length - 1],
      "Ma",
      "This study"
    ].join(TAB_DELIMITER));

  });

  // Concatenate information of all the MagIC tables
  var lines = new Array(
    createTable("locations", locationHeader, magicLocations),
    createTable("sites", siteHeader, magicSites),
    createTable("samples", sampleHeader, magicSamples),
    createTable("specimens", specimensHeader, magicSpecimens),
    createTable("measurements", measurementHeader, magicMeasurements)
  ).map(table => table.join(LINE_DELIMITER)).join(LINE_DELIMITER + MAGIC_TABLE_DELIMITER + LINE_DELIMITER);

  downloadMagICTXT(lines);

}

function getStepUnit(demagnetizationType) {

  /*
   * Function getStepUnit
   * Returns the step unit based ont he demagnetization type (Tesla T or Kelvin K)
   */

  switch(demagnetizationType) {
    case DEMAGNETIZATION_ALTERNATING:
      return "T";
    case DEMAGNETIZATION_THERMAL:
      return "K";
  }

}

function toTesla(step) {

  /*
   * Function toTesla
   * Converts a step to a value in Tesla (assumes mT)
   */

  return 1E-3 * extractNumbers(step);

}

function toKelvin(step) {

  /*
   * Function toKelvin
   * Converts a step to a value in Kelvin (assumes C)
   */

  return 273 + extractNumbers(step);

}

function downloadMagICTXT(payload) {

  /*
   * Function downloadMagICTXT
   * Encodes MagIC formatted string and opens download window
   */

  const MIME_TYPE = "data:text/plain;charset=utf-8";
  const FILENAME = "MagIC.txt";

  downloadURIComponent(FILENAME, MIME_TYPE + "," + encodeURIComponent(payload));

}

addEventHandlers();
