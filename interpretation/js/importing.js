function importMagic(file) {

  /*
   * Function importMagic
   * Imports demagnetization data from the MagIC format
   */

  function NaNTo(value, to) {

    /*
     * Function importMagic::NaNTo
     * Casts value to "to" when value is NaN
     */

    if(isNaN(value)) {
      return to;
    }

    return value;

  }

  function CSV2Object(header, x) {
  
    /*
     * Function importMagic::CSV2Object
     * Parses tab delimited table with a header to an object
     */
  
    var object = new Object();
    var parameters = x.split(/\t/);
  
    parameters.forEach(function(parameter, i) {
      object[header[i]] = parameters[i];
    });
  
    return object;
  
  }

  const MAGIC_TABLE_DELIMITER = ">>>>>>>>>>";
  const TABLES_REQUIRED = new Array("contribution", "sites", "samples", "specimens", "measurements");

  var tables = file.data.split(MAGIC_TABLE_DELIMITER);

  // Save references in a high scope to find table relationships
  var magicSpecimens = new Object();
  var magicSamples = new Object();
  var magicSites = new Object();

  // Get a list of the available tables
  var availableTables = tables.map(function(section) {
    return section.split(LINE_REGEXP).filter(Boolean).shift().split(/\t/).pop();
  });

  // Check if all required measurements are available
  TABLES_REQUIRED.forEach(function(name) {
    if(!availableTables.includes(name)) {
      throw(new Exception("MagIC file does not included table " + name + " and cannot be parsed."));
    }
  });

  // Go over each table
  tables.forEach(function(section) {

    var lines = section.split(LINE_REGEXP).filter(Boolean);
    var sectionHeader = lines[0].split(/\t/);
    var header = lines[1].split(/\t/);

    var tableName = sectionHeader[1]

    switch(tableName) {

      // Contribution header with some metadata
      case "contribution":
        return lines.slice(2).forEach(function(x) {

          var contribution = CSV2Object(header, x);

          // Check the data model version
          if(contribution["data_model_version"] !== "3.0") {
            throw(new Exception("MagIC data model is not 3.0 and unsupported.")); 
          }

        });  

      // We dont use the concept of locations
      case "locations":
        return;

      // We dont use the concept of sites but this field has important information
      case "sites":

        // Parse all site information
        return lines.slice(2).forEach(function(x) {

          // Add all sites to the hash map
          var object = CSV2Object(header, x);

          if(magicSites.hasOwnProperty(object.site)) {
            //throw(new Exception("Site " + object.site + " is defined multiple times."));
          }

          magicSites[object.site] = object;

        });

      // We do not use the concept of samples but this field has important information
      case "samples":

        return lines.slice(2).forEach(function(x) {
        
          var object = CSV2Object(header, x);

          if(magicSamples.hasOwnProperty(object.sample)) {
            //throw(new Exception("Sample " + object.sample + " is defined multiple times."));
          }

          magicSamples[object.sample] = object;

        });

      // We do have specimens
      case "specimens":

        return lines.slice(2).forEach(function(x) {
        
          var object = CSV2Object(header, x);
        
          // A specimen points to a sample
          if(!magicSamples.hasOwnProperty(object.sample)) {
            throw("Referenced sample " + object.sample + " does not exist.")
          }
      
          var sample = magicSamples[object.sample];

          // The sample points to a specific site
          if(!magicSites.hasOwnProperty(sample.site)) {
            throw("Referenced site " + sample.site + " does not exist.")
          }

          var site = magicSites[sample.site];

          // Map longitude & latitude between [-180, 180] and [-90, 90]
          var longitude = Number(site.lon);
          if(!isNaN(longitude) && longitude > 180) {
            longitude -= 360;
          }

          var latitude = Number(site.lat);
          if(!isNaN(latitude) && latitude > 90) {
            latitude -= 180;
          }

          latitude = NaNTo(latitude, null);
          longitude = NaNTo(longitude, null);

          // Sanitize ages
          var age = Number(site["age"]);
          var ageLow = Number(site["age_low"]);
          var ageHigh = Number(site["age_high"]);
          var sigma = Number(site["age_sigma"]);

          // Use sigma to calculate low and high
          if(isNaN(ageLow) && !isNaN(sigma)) {
            ageLow = age - sigma;
          }
          if(isNaN(ageHigh) && !isNaN(sigma)) {
            ageHigh = age + sigma;
          }

          age = NaNTo(age, null);
          ageLow = NaNTo(ageLow, null);
          ageHigh = NaNTo(ageHigh, null);

          var level = NaNTo(sample.level, null);
          var volume = NaNTo(object.volume, 1E-5);

          if(magicSpecimens.hasOwnProperty(object.specimen)) {
            //throw(new Exception("Specimen " + object.specimen + " is defined multiple times."));
          }

          var methods = object["method_codes"].split(":");

          // Create a new specimen
          magicSpecimens[object.specimen] = {
            "demagnetizationType": null,
            "coordinates": "specimen",
            "format": "MAGIC",
            "version": __VERSION__,
            // Extra
            "minStep": Number(object["meas_step_min"]),
            "maxStep": Number(object["meas_step_max"]),
            "anchored": methods.includes("DE-BFL-A"),
            "type": ((methods.includes("DE-BFP") || methods.includes("DE-BFP-G")) ? "TAU3" : "TAU1"),
            "unit": object["meas_step_unit"],
            //
            "created": new Date().toISOString(),
            "steps": new Array(),
            "level": level,
            "longitude": longitude,
            "latitude": latitude,
            "age": age,
            "sample": object.specimen,
            "ageMin": ageLow,
            "ageMax": ageHigh,
            "lithology": null,
            "name": object.specimen,
            "volume": 1E6 * volume,
            "beddingStrike": Number(sample["bed_dip_direction"]) - 90 || 0,
            "beddingDip": Number(sample["bed_dip"]) || 0,
            "coreAzimuth": Number(sample["azimuth"]) || 0,
            "coreDip": Number(sample["dip"]) || 0,
            "interpretations": new Array()
          }
        
        });

      // Individual demagnetization steps
      case "measurements":

        return lines.slice(2).forEach(function(x) {
        
          var object = CSV2Object(header, x);

          // The measurement points to a specific specimen
          if(!magicSpecimens.hasOwnProperty(object.specimen)) {
            throw("The referenced specimen " + object.specimen + " does not exist.");
          }

          var specimen = magicSpecimens[object.specimen];

          // Default to a sample volume of 10CC
          var intensity = 1E6 * object["magn_volume"] || (1E6 * object["magn_moment"] / (specimen.volume / 1E5));

          // Get the declination/inclination to x, y, z
          var coordinates = new Direction(object["dir_dec"], object["dir_inc"], intensity).toCartesian();

          var types = object["method_codes"].split(":");
          var step, demagnetizationType;

          // Determine the demagnetization type
          // And handle units
          if(types.includes("LP-DIR-AF")) {
            step = Number(object["treat_ac_field"]);
            if(specimen.unit === "T") {
              step *= 1000;
            }
            demagnetizationType = "alternating";
          } else if(types.includes("LP-DIR-T")) {
            step = Number(object["treat_temp"]);
            if(specimen.unit === "K") {
              step -= 273;
            }
            demagnetizationType = "thermal";
          } else {
            return;
          }
        
          // Add the demagnetization measurements
          specimen.steps.push(new Measurement(step.toString(), coordinates, 0));

          // Overwrite the demagnetization type
          specimen.demagnetizationType = demagnetizationType;
        
        });

    }

  });

  // Try adding the existing interpretations
  Object.values(magicSpecimens).forEach(function(specimen) {

    if(specimen.minStep === null || specimen.maxStep === null) {
      return;
    }

    // Make sure the step units are also in mT and C
    if(specimen.demagnetizationType === "alternating" && specimen.unit === "T") {
      specimen.minStep *= 1000;
      specimen.maxStep *= 1000;
    } else if(specimen.demagnetizationType === "thermal" && specimen.unit === "K") {
      specimen.minStep -= 273;
      specimen.maxStep -= 273;
    }

    // The interpretation includes a list of used steps
    specimen.steps.forEach(function(step) {

      // Was included: set to true for the coming PCA
      if(specimen.minStep <= step.step && step.step <= specimen.maxStep) {
        step.selected = true;
      } else {
        step.selected = false;
      }

    });


    // Re-do the interpretation
    makeInterpretation(specimen, {"type": specimen.type, "anchored": specimen.anchored, "refresh": false});

    // Remove unnecessary metadata
    delete specimen.minStep;
    delete specimen.maxStep;
    delete specimen.type;
    delete specimen.unit;
    delete specimen.anchored;

  });

  // Add all specimens read from the MagIC file to the application
  Object.values(magicSpecimens).forEach(function(specimen) {

    // Check if the specimen has demagnetizations steps
    if(specimen.steps.length === 0) {
      return;
    }

    specimens.push(specimen);

  });

}

function importPaleoMag(file) {

  var lines = file.data.split(LINE_REGEXP).filter(Boolean);
  var sampleName = lines[0].trim();
  var parameters = lines[1].split(/\s+/).slice(1);

  var level = Number(parameters[0]);

  // CIT Convention?
  // Not working!
  var coreAzimuth = ((Number(parameters[1]) + 270) % 360);
  var coreDip = 90 - Number(parameters[2]);
  var beddingStrike = (Number(parameters[3]))
  var beddingDip = Number(parameters[4]);
  var volume = Number(parameters[5]);

  var steps = lines.slice(2).map(function(line) {

    var stepType = line.slice(0, 2);
    var step = line.slice(2, 6).trim() || "0";

    // This is core plate or something!?!?
    var dec = Number(line.slice(46, 51));
    var inc = Number(line.slice(52, 57));

    // Intensity in emu/cm3 -> convert to micro A/m (1E9)
    var intensity = 1E9 * Number(line.slice(31, 39));
    var a95 = Number(line.slice(40, 45));
    var info = line.slice(85, 113).trim();

    var coordinates = new Direction(dec, inc, intensity).toCartesian();

    return new Measurement(step, coordinates, null);

  });

  // Add the data to the application
  specimens.push({
    "demagnetizationType": null,
    "coordinates": "specimen",
    "format": "UNKNOWN",
    "version": __VERSION__,
    "created": new Date().toISOString(),
    "steps": steps,
    "level": level,
    "longitude": null,
    "latitude": null,
    "age": null,
    "ageMin": null,
    "ageMax": null,
    "lithology": null,
    "sample": sampleName,
    "name": sampleName,
    "volume": volume,
    "beddingStrike": beddingStrike,
    "beddingDip": beddingDip,
    "coreAzimuth": coreAzimuth,
    "coreDip": coreDip, 
    "interpretations": new Array()
  });

}

function importUnknown(file) {

  /*
   * function importUnknown
   * Imports an unknown file format to the
   */

  function getDemagnetizationType(lines) {

    /*
     * function getDemagnetizationType
     * Determines which column has the "step" attribute: each demagnetization step
     * has an T, AFD, ARM, and IRM entry but one only "changes"
     * So we look for the one with the most change
     */

    var sets = new Array(
      new Set(),
      new Set(),
      new Set(),
      new Set()
    );

    // Go over the four columns (T, AFD, ARM, IRM)
    for(var i = 0; i < 4; i++) {

      var set = new Set();

      lines.forEach(function(line) {

        var parameters = line.split(/\s+/);
        sets[i].add(parameters[i + 1]);
        
      });

    }

    // Get the sizes from the map
    sizes = sets.map(x => x.size);

    // Return the index of the column
    return sizes.indexOf(Math.max.apply(null, sizes)) + 1;

  }

  var lines = file.data.split(LINE_REGEXP).slice(1).filter(Boolean);

  // Bedding parameters are given per line: check if the value is unique
  var beddingStrikes = new Set();
  var beddingDips = new Set();
  var coreAzimuths = new Set();
  var coreDips = new Set();

  // Determine the type of demagnetization
  var degmagnetizationTypeIndex = getDemagnetizationType(lines);

  var steps = lines.map(function(line) {

    var parameters = line.split(/\s+/);

    let coreAzimuth = Number(parameters[7]);
    // Hmm? Southern hemisphere difference? Core dips are probably flipped (and Hade!)
    let coreDip = 180 - (90 - Number(parameters[8]));
    let beddingStrike = Number(parameters[9]);
    let beddingDip = Number(parameters[10]);

    coreAzimuths.add(coreAzimuth);
    coreDips.add(coreDip);

    beddingStrikes.add(beddingStrike);
    beddingDips.add(beddingDip);

    var step = parameters[degmagnetizationTypeIndex];

    // Intensity is in Am2 (assumed) correct for 10CC sample volume
    var x = Number(parameters[21]) * 1E9;
    var y = Number(parameters[22]) * 1E9;
    var z = Number(parameters[23]) * 1E9;
    var coordinates = new Coordinates(x, y, z);

    // Geographic and tectonic directions are in the file
    // We can be defensive and check these values against what we calculate
    var GDec = Number(parameters[37]);
    var GInc = Number(parameters[38]);
    var GDirection = coordinates.rotateTo(coreAzimuth, coreDip).toVector(Direction);

    // Check and verify geographic coordinates
    if(GDec.toFixed(2) !== GDirection.dec.toFixed(2) || GInc.toFixed(2) !== GDirection.inc.toFixed(2)) {
      throw(new Exception("Inconsistency detected in geographic vector component."));
    }

    var TDec = Number(parameters[43]);
    var TInc = Number(parameters[44]);
    var TDirection = coordinates.rotateTo(coreAzimuth, coreDip).correctBedding(beddingStrike, beddingDip).toVector(Direction);

    // Check and verify tectonic coordinates
    if(TDec.toFixed(2) !== TDirection.dec.toFixed(2) || TInc.toFixed(2) !== TDirection.inc.toFixed(2)) {
      throw(new Exception("Inconsistency detected in tectonic vector component."));
    }

    // Intensity is in A/m
    return new Measurement(step, coordinates, null);

  });

  let sampleName = lines[0].split(/\s+/)[0];
  let volume = lines[0].split(/\s+/)[5];

  // Add the data to the application
  specimens.push({
    "demagnetizationType": (degmagnetizationTypeIndex === 1 ? "thermal" : "alternating"),
    "coordinates": "specimen",
    "format": "UNKNOWN",
    "version": __VERSION__,
    "created": new Date().toISOString(),
    "steps": steps,
    "level": null,
    "longitude": null,
    "latitude": null,
    "age": null,
    "ageMin": null,
    "ageMax": null,
    "lithology": null,
    "sample": sampleName,
    "name": sampleName,
    "volume": volume,
    "beddingStrike": beddingStrikes.values().next().value,
    "beddingDip": beddingDips.values().next().value,
    "coreAzimuth": coreAzimuths.values().next().value,
    "coreDip": coreDips.values().next().value,
    "interpretations": new Array()
  });

}

function importBlackMnt(file) {

  /*
   * Function importBlackMnt
   * Imports black mountain format to Paleomagnetism.org 2.0.0
   */

  var lines = file.data.split(LINE_REGEXP).slice(1).filter(Boolean);

  // Bedding parameters are given per line: check if the value is unique
  var beddingStrikes = new Set();
  var beddingDips = new Set();
  var coreAzimuths = new Set();
  var coreDips = new Set();

  var steps = lines.map(function(line) {

    var parameters = line.split(/\s+/);

    let coreAzimuth = Number(parameters[19]);
    // Hmm? Southern hemisphere difference? Core dips are probably flipped (and Hade!)
    let coreDip = 180 - (90 - Number(parameters[20]));
    let beddingStrike = Number(parameters[21]);
    let beddingDip = Number(parameters[22]);

    coreAzimuths.add(coreAzimuth);
    coreDips.add(coreDip);

    beddingStrikes.add(beddingStrike);
    beddingDips.add(beddingDip);

    var step = parameters[0];

    // Intensity is in A/m (assumed)
    var x = Number(parameters[1]) * 1E6;
    var y = Number(parameters[2]) * 1E6;
    var z = Number(parameters[3]) * 1E6;
    var coordinates = new Coordinates(x, y, z);

    // Geographic and tectonic directions are in the file
    // We can be defensive and check these values against what we calculate
    var GDec = Number(parameters[10]);
    var GInc = Number(parameters[11]);
    var GDirection = coordinates.rotateTo(coreAzimuth, coreDip).toVector(Direction);

    // Check and verify geographic coordinates
    if(GDec.toFixed(2) !== GDirection.dec.toFixed(2) || GInc.toFixed(2) !== GDirection.inc.toFixed(2)) {
      throw(new Exception("Inconsistency detected in geographic vector component."));
    }

    var TDec = Number(parameters[16]);
    var TInc = Number(parameters[17]);
    var TDirection = coordinates.rotateTo(coreAzimuth, coreDip).correctBedding(beddingStrike, beddingDip).toVector(Direction);

    // Check and verify tectonic coordinates
    if(TDec.toFixed(2) !== TDirection.dec.toFixed(2) || TInc.toFixed(2) !== TDirection.inc.toFixed(2)) {
      throw(new Exception("Inconsistency detected in tectonic vector component."));
    }

    // Intensity is in A/m
    return new Measurement(step, coordinates, null);

  });

  // Confirm that bedding is unique
  if(beddingStrikes.size > 1 || beddingDips.size > 1 || coreAzimuths.size > 1 || coreDips.size > 1) {
    throw(new Exception("Core or bedding parameters not unique in input file."));
  }

  let sampleName = file.name.split(".").shift();

  // Add the data to the application
  specimens.push({
    "demagnetizationType": null,
    "coordinates": "specimen",
    "format": "ANU",
    "version": __VERSION__,
    "created": new Date().toISOString(),
    "steps": steps,
    "level": null,
    "longitude": null,
    "latitude": null,
    "age": null,
    "ageMin": null,
    "ageMax": null,
    "lithology": null,
    "sample": sampleName,
    "name": sampleName,
    "volume": 10.0,
    "beddingStrike": beddingStrikes.values().next().value,
    "beddingDip": beddingDips.values().next().value,
    "coreAzimuth": coreAzimuths.values().next().value,
    "coreDip": coreDips.values().next().value,
    "interpretations": new Array()
  });

}

function importJR5(file) {

  var lines = file.data.split(LINE_REGEXP).filter(Boolean);
  var sampleName;
  var coreAzimuth;
  var coreDip;
  var beddingStrike;
  var beddingDip;

  steps = lines.map(function(line) {

    sampleName = line.slice(0, 10).trim();
    var step = line.slice(10, 18).trim();
    var x = Number(line.slice(18, 24));
    var y = Number(line.slice(24, 30));
    var z = Number(line.slice(30, 36));
    var exp = 1E6 * Math.pow(10, Number(line.slice(36, 40)));
    coreAzimuth = Number(line.slice(40, 44));
    coreDip = Number(line.slice(44, 48));
    beddingStrike = Number(line.slice(48, 52));
    beddingDip = Number(line.slice(56, 60));

    var coordinates = new Coordinates(x * exp, y * exp, z * exp);

    return new Measurement(step, coordinates, null);

  });

  specimens.push({
    "demagnetizationType": null,
    "coordinates": "specimen",
    "format": "JR5",
    "version": __VERSION__,
    "created": new Date().toISOString(),
    "steps": steps,
    "level": null,
    "longitude": null,
    "latitude": null,
    "age": null,
    "ageMin": null,
    "ageMax": null,
    "lithology": null,
    "sample": sampleName,
    "name": sampleName,
    "volume": 10.0,
    "beddingStrike": beddingStrike,
    "beddingDip": beddingDip,
    "coreAzimuth": coreAzimuth,
    "coreDip": coreDip,
    "interpretations": new Array()
  });

}

function importJR6(file) {

  var specimenSortObject = new Object();

  var lines = file.data.split(LINE_REGEXP).filter(Boolean);

  lines.forEach(function(line) {

    var sampleName = line.slice(0, 10).trim();
    var step = line.slice(10, 18).trim();
    var x = Number(line.slice(18, 24));
    var y = Number(line.slice(24, 30));
    var z = Number(line.slice(30, 36));
    var exp = 1E6 * Math.pow(10, Number(line.slice(36, 40)));
    var coreAzimuth = Number(line.slice(40, 44));
    var coreDip = Number(line.slice(44, 48));
    var beddingStrike = Number(line.slice(48, 52));
    var beddingDip = Number(line.slice(56, 60));
    var a95 = Number(line.slice(76, 80));
    var coordinates = new Coordinates(x * exp, y * exp, z * exp);

    var P1 = Number(line.slice(64, 67));
    var P2 = Number(line.slice(68, 71));
    var P3 = Number(line.slice(71, 74));
    var P4 = Number(line.slice(74, 77));

    // Support for these orientation parameters
    if(P1 !== 12 || P2 !== 0 || P3 !== 12) {
      throw(new Exception("The AGICO orientation format is not supported. Supported: {12, 0, 12, *}."));
    }

    // P4 0 means (dip direction / dip) notation is used
    // We use bedding strike so subtract 90
    if(P4 === 0) {
      beddingStrike -= 90;
    }

    if(!specimenSortObject.hasOwnProperty(sampleName)) {
      specimenSortObject[sampleName] = {
        "demagnetizationType": null,
        "coordinates": "specimen",
        "format": "JR6",
        "version": __VERSION__,
        "created": new Date().toISOString(),
        "steps": new Array(),
        "level": null,
        "longitude": null,
        "latitude": null,
        "age": null,
        "ageMin": null,
        "ageMax": null,
        "lithology": null,
        "sample": sampleName,
        "name": sampleName,
        "volume": 10.0,
        "beddingStrike": 0,
        "beddingDip": 0,
        "coreAzimuth": coreAzimuth,
        "coreDip": coreDip,
        "interpretations": new Array()
      }

    }

    specimenSortObject[sampleName].steps.push(
      new Measurement(step, coordinates, a95)
    );

  });

  Object.values(specimenSortObject).forEach(function(specimen) {
    specimens.push(specimen);
  });

}

function importRS3(file) {

  /*
   * Function importRS3
   * Import function for Univeristy of Oslo (RS3 file)
   */

  // Remove top header
  var lines = file.data.split(LINE_REGEXP).slice(1).filter(Boolean);

  var header = lines[0];

  // Sample name
  var sampleName = header.slice(0, 8).trim();

  // Try to determine the demagnetization type
  var demagnetizationText = lines[1].slice(4, 11);
  var demagnetizationType = demagnetizationText.includes("C") ? "thermal" : "alternating";

  // Extract latitude, longitude
  var latitude = Number(header.slice(21, 25).trim()) || null;
  var longitude = Number(header.slice(31, 35).trim()) || null;

  // Orientation parameters
  let P1 = Number(header.slice(110, 112));
  let P2 = Number(header.slice(113, 115));
  let P3 = Number(header.slice(116, 118));
  let P4 = Number(header.slice(119, 121));

  // P1 P2 P3 P4
  // 12 00 12 90 
  // P1 means arrow is measured point to inside core (is fine)
  // P2 Means dip of frontal side is measured (i.e. hade) (90 when horizontal)
  // P3 Means measured in field (is fine)
  // P4 90 means strike (RHR) and dip are measured.. same convention
  // Confirm AGICO format is supported
  if(P1 !== 12 || P2 !== 0 || P3 !== 12 || P4 !== 90) {
    throw(new Exception("The AGICO orientation format is not supported. Supported: {12, 0, 12, 90}."));
  }

  // Core parameters (dip = hade)
  var coreAzimuth = Number(header.slice(74, 77).trim())
  var coreDip = 90 - Number(header.slice(79, 82).trim());

  // Bedding parameters
  var beddingStrike = Number(header.slice(86, 90).trim());
  var beddingDip = Number(header.slice(92, 95).trim());

  // Go over each demagnetization step
  var steps = lines.slice(2).map(function(line) {

    var step = line.slice(3, 6).trim();

    // Intensity is in A/m
    var intensity = 1E6 * Number(line.slice(15, 27));
    var declination = Number(line.slice(29, 33));
    var inclination = Number(line.slice(34, 39));
    var a95 = Number(line.slice(77, 80))

    var coordinates = new Direction(declination, inclination, intensity).toCartesian();

    return new Measurement(step, coordinates, a95);

  });

  // Add the data to the application
  specimens.push({
    "demagnetizationType": demagnetizationType, 
    "coordinates": "specimen",
    "format": "RS3",
    "version": __VERSION__,
    "created": new Date().toISOString(),
    "steps": steps,
    "level": null,
    "longitude": latitude,
    "latitude": longitude,
    "age": null,
    "ageMin": null,
    "ageMax": null,
    "lithology": null,
    "sample": sampleName,
    "name": sampleName,
    "volume": 10.0,
    "beddingStrike": beddingStrike,
    "beddingDip": beddingDip,
    "coreAzimuth": coreAzimuth,
    "coreDip": coreDip,
    "interpretations": new Array()
  });

}

function importPaleoMac(file) {

  /*
   * Function importPaleoMac
   * Import parser for the PaleoMac format
   */

  // Get lines in the file
  var lines = file.data.split(LINE_REGEXP).slice(1).filter(Boolean).filter(x => x.length > 1);

  // The line container all the header information
  var header = lines[0];
  var sampleName = header.slice(0, 9).trim();

  var coreAzimuth = Number(header.slice(12, 17));
  var sampleVolume = Number(header.slice(52, 59));

  // core hade is measured, we use the plunge (90 - hade)
  var coreDip = 90 - Number(header.slice(22, 27));
  var beddingStrike = Number(header.slice(32, 37));
  var beddingDip = Number(header.slice(42, 47));

  // Skip first two and last line
  var steps = lines.slice(2).filter(function(line) {

    // Skip empty intensities..
    return Number(line.slice(36, 44)) !== 0;

  }).map(function(line) {

    // Get the measurement parameters
    var step = line.slice(0, 5).trim();
    var x = 1E6 * Number(line.slice(5, 14)) / sampleVolume;
    var y = 1E6 * Number(line.slice(15, 25)) / sampleVolume;
    var z = 1E6 * Number(line.slice(25, 34)) / sampleVolume;
    var a95 = Number(line.slice(69, 73));

    var coordinates = new Coordinates(x, y, z);

    return new Measurement(step, coordinates, a95);

  });

  // Add the data to the application
  specimens.push({
    "demagnetizationType": null,
    "coordinates": "specimen",
    "format": "PALEOMAC",
    "version": __VERSION__,
    "created": new Date().toISOString(),
    "steps": steps,
    "level": null,
    "longitude": null,
    "latitude": null,
    "age": null,
    "ageMin": null,
    "ageMax": null,
    "lithology": null,
    "sample": sampleName,
    "name": sampleName,
    "volume": 1E6 * sampleVolume,
    "beddingStrike": Number(beddingStrike),
    "beddingDip": Number(beddingDip),
    "coreAzimuth": Number(coreAzimuth),
    "coreDip": Number(coreDip),
    "interpretations": new Array()
  });

}


function importOxford(file) {

  /*
   * Function importOxford
   * Parses files from the Oxford format
   */

  var lines = file.data.split(LINE_REGEXP).filter(Boolean);
  var parsedData = new Array();
 
  // Get specimen metadata from the first second line
  var parameters = lines[2].split(/[\t]+/);

  var coreAzimuth = Number(parameters[13]);
  var coreDip = Number(parameters[14]);
  
  var beddingStrike = (Number(parameters[15]) + 270) % 360;
  var beddingDip = Number(parameters[16]);
  
  var sampleName = parameters[0];
  var sampleVolume = Math.abs(Number(parameters[18]));

  // Determine what column to use
  // Assume anything with 'Thermal' is TH, and 'Degauss' is AF.
  if(/Thermal/.test(parameters[2])) {
    var stepIndex = 4;
    var demagnetizationType = "thermal";
  } else if(/Degauss/.test(parameters[2])) {
    var stepIndex = 3;
    var demagnetizationType = "alternating";
  } else {
    throw(new Exception("Could not determine type of demagnetization."));
  }
  
  var steps = lines.slice(1).map(function(line) {
	
    // Oxford is delimted by tabs
    var parameters = line.split(/[\t]+/);
    
    var intensity = 1E6 * Number(parameters[6]) / sampleVolume;
    var dec = Number(parameters[11]);
    var inc = Number(parameters[12]);

    var coordinates = new Direction(dec, inc, intensity).toCartesian();

    return new Measurement(parameters[stepIndex], coordinates, null);

  });
 
  // Add the data to the application
  specimens.push({
    "demagnetizationType": demagnetizationType,
    "coordinates": "specimen",
    "format": "OXFORD",
    "version": __VERSION__,
    "created": new Date().toISOString(),
    "steps": steps,
    "level": null,
    "longitude": null,
    "latitude": null,
    "age": null,
    "ageMin": null,
    "ageMax": null,
    "lithology": null,
    "sample": sampleName,
    "name": sampleName,
    "volume": Number(sampleVolume),
    "beddingStrike": Number(beddingStrike),
    "beddingDip": Number(beddingDip),
    "coreAzimuth": Number(coreAzimuth),
    "coreDip": Number(coreDip),
    "interpretations": new Array()
  });
    
}


function importNGU(file) {

  /*
   * Function importNGU
   * Parser for the NGU format
   */

  var lines = file.data.split(LINE_REGEXP).filter(Boolean);
  var parsedData = new Array();

  for(var i = 0; i < lines.length; i++) {

    // Reduce empty lines
    var parameters = lines[i].split(/[,\s\t]+/);
    parameters = parameters.filter(function(x) {
      return x !== "";
    });

    // Get the header
    if(i === 0) {

      var sampleName = parameters[0];

      // Different convention for core orientation than Utrecht
      var coreAzimuth = Number(parameters[1]);
      var coreDip = 90 - Number(parameters[2]);

      // Bedding strike needs to be decreased by 90 for input convention
      var beddingStrike = (Number(parameters[3]) + 270) % 360;
      var beddingDip = Number(parameters[4]);
      var info = parameters[5];

    } else {

      // Get Cartesian coordinates for specimen coordinates (intensities in mA -> bring to μA)
      var intensity = 1E3 * Number(parameters[1]);
      var dec = Number(parameters[2]);
      var inc = Number(parameters[3]);

      var coordinates = new Direction(dec, inc, intensity).toCartesian();

      parsedData.push(new Measurement(parameters[0], coordinates, Number(parameters[4])));

    }
  }

  specimens.push({
    "demagnetizationType": null,
    "coordinates": "specimen",
    "format": "NGU",
    "version": __VERSION__,
    "created": new Date().toISOString(),
    "steps": parsedData,
    "name": sampleName,
    "longitude": null,
    "latitude": null,
    "age": null,
    "ageMin": null,
    "ageMax": null,
    "sample": sampleName,
    "lithology": null,
    "beddingStrike": Number(beddingStrike),
    "beddingDip": Number(beddingDip),
    "coreAzimuth": Number(coreAzimuth),
    "coreDip": Number(coreDip),
    "interpretations": new Array()
  });

}

function importCenieh(file) {

  /*
   * Function importCenieh
   * Imports files from the Cenieh format (no core, bedding parameters available)
   */
  
  // Cenieh samples need to be sorted
  var ceniehSpecimens = new Object();

  var lines = file.data.split(LINE_REGEXP).filter(Boolean);
 
  // Skip the header
  lines.slice(1).forEach(function(line) {

    var parameters = line.split(/\s+/);
    var level = parameters[13];

    // Add the level to the sample name
    var sampleName = parameters[0] + "." + level;

    // Add a sample to the has map
    if(!ceniehSpecimens.hasOwnProperty(sampleName)) {

      ceniehSpecimens[sampleName] = {
        "demagnetizationType": null,
        "coordinates": "specimen",
        "format": "CENIEH",
        "version": __VERSION__,
        "created": new Date().toISOString(),
        "steps": new Array(),
        "name": sampleName,
        "volume": 10.0,
        "longitude": null,
        "latitude": null,
        "age": null,
        "ageMin": null,
        "ageMax": null,
        "lithology": null,
        "sample": sampleName,
        "beddingStrike": 270,
        "beddingDip": 0,
        "coreAzimuth": 0,
        "coreDip": 90,
        "interpretations": new Array()
      }

    }

    // Extract the measurement parameters
    var step = parameters[1];
    var intensity = Number(parameters[2]);	
    var declination = Number(parameters[3]);
    var inclination = Number(parameters[4]);
	
    var cartesianCoordinates = new Direction(declination, inclination, intensity * 1E6).toCartesian();
	
    ceniehSpecimens[sampleName].steps.push(new Measurement(step, cartesianCoordinates, null));
	
  });

  // Add all specimens in the hashmap to the application
  ceniehSpecimens.forEach(function(specimen) {
    specimens.push(specimen);
  });

}

function importMunich(file) {

  /*
   * Function importMunich
   * Imports file to the Munich format
   */

  var lines = file.data.split(LINE_REGEXP).filter(Boolean);
  var parsedData = new Array();

  for(var i = 0; i < lines.length; i++) {
			
    // Reduce empty lines
    var parameters = lines[i].split(/[,\s\t]+/);
    parameters = parameters.filter(function(x) {
      return x !== "";
    });
			
    // Get the header
    if(i === 0) {
		
      var sampleName = parameters[0].trim();
				
      // Different convention for core orientation than Utrecht
      // Munich measures the hade angle
      var coreAzimuth = Number(parameters[1]);
      var coreDip = 90 - Number(parameters[2]);
				
      // Bedding strike needs to be decreased by 90 for input convention
      var beddingStrike = (Number(parameters[3]) + 270) % 360;

      var beddingDip = Number(parameters[4]);
      var info = parameters[5];

    } else {

      // Get Cartesian coordinates for specimen coordinates (intensities in mA -> bring to μA)
      var dec = Number(parameters[3]);
      var inc = Number(parameters[4]);
      var intensity = Number(parameters[1]) * 1E3;
      
      var coordinates = new Direction(dec, inc, intensity).toCartesian();

      parsedData.push(new Measurement(parameters[0], coordinates, Number(parameters[2])));

    }

  }

  var demagnetizationType = null;

  // Probably thermal
  if(Number(parsedData[parsedData.length - 1].step) > 300) {
    demagnetizationType = "thermal";    
  }

  // Probably AF (mT)
  if(Number(parsedData[parsedData.length - 1].step) < 200) {
    demagnetizationType = "alternating";
  }
	
  specimens.push({
    "demagnetizationType": demagnetizationType,
    "coordinates": "specimen",
    "format": "MUNICH",
    "version": __VERSION__,
    "created": new Date().toISOString(),
    "steps": parsedData,
    "name": sampleName,
    "volume": 10.0,
    "longitude": null,
    "latitude": null,
    "age": null,
    "ageMin": null,
    "ageMax": null,
    "lithology": null,
    "sample": sampleName,
    "beddingStrike": Number(beddingStrike),
    "beddingDip": Number(beddingDip),
    "coreAzimuth": Number(coreAzimuth),
    "coreDip": Number(coreDip),
    "interpretations": new Array()
  });

}

function importBCN2G(file) {

  /*
   * Function importBCN2G
   * Imports binary BCN2G format (Barcelona & PGL Beijing)
   */

  // Split by start/end characters
  var lines = file.data.split(/[\u0002\u0003]/).slice(1);

  // Read at byte positions
  var sampleName = lines[2].slice(5, 12).replace(/\0/g, "");
  var sampleVolume = Number(lines[2].slice(14, 16));

  // Core and bedding parameters
  var coreAzimuth = Number(lines[2].slice(101, 104).replace(/\0/g, ""));
  var coreDip = Number(lines[2].slice(106,108).replace(/\0/g, ""));
  var beddingStrike = (Number(lines[2].slice(110, 113).replace(/\0/g, "")) + 270) % 360;
  var beddingDip = Number(lines[2].slice(115, 117).replace(/\0/g, ""));

  // This value indicates the declination correction that needs to be applied
  var declinationCorrection = Number(lines[2].slice(132, 136).replace(/\0/, ""))

  // Add declination correction (magnetic) to the sample azimuth (confirm with Elizabeth)
  if(declinationCorrection) {
    coreAzimuth += declinationCorrection;
  }

  // Overturned bit flag is set: subtract 180 from the dip
  if(lines[2].charCodeAt(119) === 1) {
    beddingDip = beddingDip - 180;
  }

  // For each demagnetization step
  var steps = lines.slice(3).map(function(line) {

    // Each parameter is delimited by at least one NULL byte
    var parameters = line.split(/\u0000+/);

    // Intensity is in emu/cm^3 (1000 A/m)
    var step = parameters[3];
    var dec = Number(parameters[4]);
    var inc = Number(parameters[5]);
    var intensity = 1E9 * Number(parameters[11]);

    var coordinates = new Direction(dec, inc, intensity).toCartesian();

    return new Measurement(step, coordinates, null);

  });

  specimens.push({
    "demagnetizationType": null,
    "coordinates": "specimen",
    "format": "BCN2G",
    "version": __VERSION__,
    "created": new Date().toISOString(),
    "steps": steps,
    "longitude": null,
    "latitude": null,
    "age": null,
    "ageMin": null,
    "ageMax": null,
    "lithology": null,
    "sample": sampleName,
    "name": sampleName,
    "volume": Number(sampleVolume),
    "beddingStrike": Number(beddingStrike),
    "beddingDip": Number(beddingDip),
    "coreAzimuth": Number(coreAzimuth),
    "coreDip": Number(coreDip),
    "interpretations": new Array()
  });

}

function importCaltech(file) {

  /*
   * Function importCaltech
   * Parses for Caltech Institute of Technology format
   */

  var lines = file.data.split(LINE_REGEXP).filter(Boolean);

  // Sample name is specified at the top
  var sampleName = lines[0].trim();

  // First line has the core & bedding parameters
  var coreParameters = lines[1].split(/\s+/).filter(Boolean);

  // Correct core strike to azimuth and hade to plunge
  var coreAzimuth = (Number(coreParameters[0].trim()) + 270) % 360;
  var coreDip = 90 - Number(coreParameters[1].trim());
  var beddingStrike = Number(coreParameters[2].trim());
  var beddingDip = Number(coreParameters[3].trim());
  var sampleVolume = Number(coreParameters[4].trim());
 
  var line;
  var steps = new Array();

  for(var i = 2; i < lines.length; i++) {

    line = lines[i];

    var stepType = line.slice(0, 2);
    var step = line.slice(0, 6).trim() || "0";
    var dec = Number(line.slice(46, 51));
    var inc = Number(line.slice(52, 57));

    // Intensity in emu/cm3 -> convert to micro A/m (1E9)
    var intensity = 1E9 * Number(line.slice(31, 39));
    var a95 = Number(line.slice(40, 45));
    var info = line.slice(85, 113).trim();

    var coordinates = new Direction(dec, inc, intensity).toCartesian();

    steps.push(new Measurement(step, coordinates, a95));

  }

  specimens.push({
    "demanull,gnetizationType": null,
    "coordinates": "specimen",
    "format": "CALTECH",
    "version": __VERSION__,
    "created": new Date().toISOString(),
    "steps": steps,
    "level": null,
    "longitude": null,
    "latitude": null,
    "age": null,
    "ageMin": null,
    "ageMax": null,
    "lithology": null,
    "sample": sampleName,
    "name": sampleName,
    "volume": Number(sampleVolume),
    "beddingStrike": Number(beddingStrike),
    "beddingDip": Number(beddingDip),
    "coreAzimuth": Number(coreAzimuth),
    "coreDip": Number(coreDip),
    "interpretations": new Array()
  });


}

function importApplicationSaveOld(file) {

  /*
   * Function importApplicationSaveOld
   * Best effort backwards compatibility with old.paleomagnetism.org
   * Some information may be lost in the translation and files imported need to be reviewed
   */

  var json = JSON.parse(file.data);

  // Go over each sample
  json.forEach(function(specimen) {

    // Block this: it means the data is incompatible and needs to be patched
    if(specimen.patch !== 1.1) {
      throw(new Exception("This file contains incompatible specimens. Run this file through old.paleomagnetism.org."));
    }

    // Declination correction BCN2G was stored as property.. just add it to the core azimuth now
    if(specimen.declinationCorrection) {
      specimen.coreAzi += specimen.declinationCorrection;
    }

    // Get the steps from the specimen 
    var steps = specimen.data.map(function(step) {
      return new Measurement(step.step, new Coordinates(step.x, step.y, step.z), Number(step.a95));
    });

    // Create the sample object
    var sample = {
      "demagnetizationType": null,
      "coordinates": "specimen",
      "format": "PMAGORG",
      "version": __VERSION__,
      "created": specimen.exported,
      "steps": steps,
      "level": null,
      "longitude": null,
      "latitude": null,
      "age": null,
      "ageMin": null,
      "ageMax": null,
      "lithology": null,
      "sample": specimen.name,
      "name": specimen.name,
      "volume": 10.0,
      "beddingStrike": Number(specimen.bedStrike),
      "beddingDip": Number(specimen.bedDip),
      "coreAzimuth": Number(specimen.coreAzi),
      "coreDip": Number(specimen.coreDip),
      "interpretations": new Array()
    }

    // Try re-doing all the interpretations
    specimen.GEO.forEach(function(interpretation) {

      // Very old versions have no steps
      if(!Array.isArray(sample.steps)) {
        return;
      }

      // The interpretation includes a list of used steps
      sample.steps.forEach(function(step) {

        // Was included: set to true for the coming PCA
        if(interpretation.steps.includes(step.step)) {
          step.selected = true;
        } else {
          step.selected = false;
        }

      });

      // Map the interpretation type (dir === TAU1, gc === TAU3)
      var type;
      if(interpretation.type.toLowerCase() === "dir") {
        type = "TAU1";
      } else if(interpretation.type.toLowerCase() === "gc") {
        type = "TAU3";
      } else {
        throw(new Exception("Could not determine the type of the PCA."));
      }

      // Re-do the interpretation
      makeInterpretation(sample, {"type": type, "anchored": interpretation.forced, "refresh": false});

    });

    specimens.push(sample);

  });

}

function importApplicationSave(file) {

  /*
   * Function importApplicationSave
   * Imports a save from the application itself
   */

  var json = JSON.parse(file.data);

  // Confirm the file was not tampered with 
  if(document.getElementById("confirm-integrity").checked && json.hash !== forge_sha256(JSON.stringify(json.specimens))) {
    throw(new Exception("Could not verify the integrity of this specimen file."));
  }

  // Add all specimens
  json.specimens.forEach(function(specimen) {
    specimens.push(specimen);
  });

}

function importUtrecht(file) {

  /*
   * Function importUtrecht
   * Treats buffer as being Utrecht Format
   */

  function inferDemagnetizationType(filename) {

    /*
     * Function importUtrecht::inferDemagnetizationType
     * Attempts to cleverly infer the demagnetization type from the file extension
     */

    var extension = filename.split(".").pop().toUpperCase();

    switch(extension) {
      case "TH":
        return "thermal";
      case "AF":
        return "alternating";
      default:
        return null;
    }

  }

  // Split by 9999 (Utecht specimen delimiter)
  var blocks = file.data.split(/9999\r?\n/);

  if(blocks.length === 1 || blocks[blocks.length - 1].trim().replace(/"/g,"") !== "END") {
    throw(new Exception("Invalid Utrecht format."));
  }

  var demagnetizationType = inferDemagnetizationType(file.name);

  // We can skip the latest block
  blocks.slice(0, -1).forEach(function(specimen, i) {

    // Slice the file header information
    if(i === 0) { 
      var blockLines = specimen.split(LINE_REGEXP).slice(1);
    } else {
      var blockLines = specimen.split(LINE_REGEXP).slice(0);
    }

    var header = blockLines.shift();

    // Extract the header parameters
    var [sampleName, _, coreAzimuth, coreDip, sampleVolume, beddingStrike, beddingDip] = header.split(/,[\s]*/);

    var steps = new Array();

    // Get the actual demagnetization data
    blockLines.slice(0, -1).forEach(function(measurement) {

      var [step, a, b, c, error, _, _] = measurement.split(/,[\s]*/);

      var coordinates = new Coordinates(-b, c, -a);

      steps.push(new Measurement(step, coordinates, error));

    });

    specimens.push({
      "demagnetizationType": demagnetizationType,
      "coordinates": "specimen",
      "format": "UTRECHT",
      "version": __VERSION__,
      "created": new Date().toISOString(),
      "steps": steps,
      "level": null,
      "longitude": null,
      "latitude": null,
      "age": null,
      "ageMin": null,
      "ageMax": null,
      "lithology": null,
      "sample": sampleName,
      "name": sampleName,
      "volume": Number(sampleVolume),
      "beddingStrike": Number(beddingStrike),
      "beddingDip": Number(beddingDip),
      "coreAzimuth": Number(coreAzimuth),
      "coreDip": Number(coreDip),
      "interpretations": new Array()
    });

  });


}

function importHelsinki(file) {

  /*
   * Function importHelsinki
   * Imports demagnetization data in the Helsinki format (plain-text csv)
   */

  var lines = file.data.split(LINE_REGEXP).filter(Boolean);

  // Get some header metadata
  var sampleName = lines[5].split(";")[1]
  var coreAzimuth = Number(lines[5].split(";")[7])
  var coreDip = Number(lines[6].split(";")[7])
  var sampleVolume = Number(lines[7].split(";")[2]);
  var demagnetizationType = lines[7].split(";")[7];

  // Bedding is not included: always set to 0, 0
  var beddingStrike = 0;
  var beddingDip = 0;

  var steps = new Array();

  // Skip the header (12 lines)
  lines.slice(12).forEach(function(line) {

    var parameters = line.split(";");
    var step = parameters[1];

    // Take mA/m and set to microamps (multiply by 1E3)
    var x = Number(parameters[13]) * 1E3;
    var y = Number(parameters[14]) * 1E3;
    var z = Number(parameters[15]) * 1E3;

    var coordinates = new Coordinates(x, y, z);
    steps.push(new Measurement(step, coordinates, 0));

  });

  specimens.push({
    "demagnetizationType": demagnetizationType,
    "coordinates": "specimen",
    "format": "HELSINKI",
    "version": __VERSION__,
    "created": new Date().toISOString(),
    "steps": steps,
    "level": null,
    "longitude": null,
    "latitude": null,
    "age": null,
    "ageMin": null,
    "ageMax": null,
    "lithology": null,
    "sample": sampleName,
    "name": sampleName,
    "volume": Number(sampleVolume),
    "beddingStrike": Number(beddingStrike),
    "beddingDip": Number(beddingDip),
    "coreAzimuth": Number(coreAzimuth),
    "coreDip": Number(coreDip),
    "interpretations": new Array()
  });

}
