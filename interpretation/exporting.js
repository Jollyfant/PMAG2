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
  
    const MAGIC_TABLE_DELIMITER = ">>>>>>>>>>";
  
    return new Array(
      "tab delimited\t" + name,
      header.join("\t"),
      body.join("\n"),
      MAGIC_TABLE_DELIMITER
    );
    
  }

  // Table header definitions
  var contributionHeader = new Array(
    "version",
    "timestamp",
    "contributer",
    "data_model_version",
    "reference",
    "description"
  );

  var sampleHeader = new Array(
    "sample",
    "site",
    "method_codes",
    "azimuth",
    "dip",
    "lat",
    "lon"
  );
  
  var specimensHeader = new Array(
    "specimen",
    "sample",
    "method_codes",
    "meas_step_min",
    "meas_step_max",
    "meas_step_unit",
    "dir_n_measurements" 
  );
  
  var measurementHeader = new Array(
    "measurement",
    "specimen",
    "dir_dec",
    "dir_inc",
    "treat_ac_field",
    "treat_temp",
    "magn_volume"
  );

  var siteHeader = new Array(
    "site",
    "location",
    "specimens",
    "lat",
    "lon",
    "age",
    "age_low",
    "age_high"
  );

  var locationHeader = new Array("location");

  var magicContribution = [new Array("4", new Date().toISOString(), "Author", "3.0", "Unavailable", "MagIC Export Test").join("\t")];
  var magicSpecimens = new Array();
  var magicSites = new Array();
  var magicSamples = new Array();
  var magicMeasurements = new Array();
  var magicLocations = [new Array("location-1")];

  // Go over all specimens
  specimens.forEach(function(specimen) {

    var demagnetizationType;

    if(specimen.demagnetizationType === "thermal") {
      demagnetizationType = "LP-DIR-T";
    } else if(specimen.demagnetizationType === "alternating") {
      demagnetizationType = "LP-DIR-AF";
    } else {
      //throw(new Exception("Could not determine demagnetization type for specimen " + specimen.name));
    }

    // TODO handling of ages/locations
    magicSites.push([
      specimen.name,
      "location-1",
      1 || specimen.location.lat,
      1 || specimen.location.lon,
      1 || specimen.age.value,
      1 || specimen.age.max,
      1 || specimen.age.min
    ].join("\t"));

    magicSamples.push([
      specimen.name,
      specimen.name,
      demagnetizationType,
      specimen.coreAzimuth,
      specimen.coreDip,
      1 || specimen.location.lat,
      1 || specimen.location.lon
    ].join("\t"));

    magicSpecimens.push([
      specimen.name,
      specimen.name,
      demagnetizationType,
      specimen.steps[0].step,
      specimen.steps[specimen.steps.length - 1].step,
      specimen.steps.length
    ].join("\t"));

    // Add all measurement steps
    specimen.steps.forEach(function(step, i) {

      // Convert x, y, z in specimen coordinates to a direction
      var direction = new Coordinates(step.x, step.y, step.z).toVector(Direction);

      magicMeasurements.push([
        i,
        specimen.name,
        direction.dec,
        direction.inc,
        specimen.demagnetizationType === "alternating" ? step.step : 0,
        specimen.demagnetizationType === "thermal" ? step.step : 273,
        direction.length
      ].join("\t"));

    });

  });

  // Concatenate information of all tables
  var lines = new Array(
    createTable("contribution", contributionHeader, magicContribution).join("\n"),
    createTable("locations", locationHeader, magicLocations).join("\n"),
    createTable("locations", siteHeader, magicSites).join("\n"),
    createTable("samples", sampleHeader, magicSamples).join("\n"),
    createTable("specimens", specimensHeader, magicSpecimens).join("\n"),
    createTable("measurements", measurementHeader, magicMeasurements).join("\n")
  );

  console.log(lines.join("\n"));

}