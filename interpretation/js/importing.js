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
    return section.split(/\r?\n/).filter(Boolean).shift().split(/\t/).pop();
  });

  // Check if all required measurements are available
  TABLES_REQUIRED.forEach(function(name) {
    if(!availableTables.includes(name)) {
      throw(new Exception("MagIC file does not included table " + name + " and cannot be parsed."));
    }
  });

  // Go over each table
  tables.forEach(function(section) {

    var lines = section.split(/\r?\n/).filter(Boolean);
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

function importPaleoMac(file) {

  /*
   * Function importPaleoMac
   * Import parser for the PaleoMac format
   */

  // Get lines in the file
  var lines = file.data.split(/\r?\n/).slice(1).filter(Boolean);

  // The line container all the header information
  var header = lines[0].split(/[,\s\t]+/);
  var sampleName = header[0];
	
  // Get header values
  // values will be [a, b, s, d, [v]]
  var parameters = lines[0].split("=");
  var values = new Array();

  for(var i = 1; i < parameters.length; i++) {
    var value = parameters[i].match(/[+-]?\d+(\.\d+)?/g);
    values.push(value);
  }

  // Get the sample volume from file or default to 10cc
  var sampleVolume = Math.abs(Number(values[4][0]) * Math.pow(10, Number(values[4][1])));

  // core hade is measured, we use the plunge (90 - hade)
  var coreAzimuth = Number(values[0]);	
  var coreDip = 90 - Number(values[1]);
  var beddingStrike = Number(values[2]);
  var beddingDip = Number(values[3]);

  // Skip first two and last line
  var steps = lines.slice(2, -1).map(function(line) {

    // Empty parameters as 0
    var parameters = line.split(/[,\s\t]+/);

    // Get the measurement parameters
    var step = parameters[0];
    var x = 1E6 * Number(parameters[1]) / sampleVolume;
    var y = 1E6 * Number(parameters[2]) / sampleVolume;
    var z = 1E6 * Number(parameters[3]) / sampleVolume;
    var a95 = Number(parameters[9]);

    var coordinates = new Coordinates(x, y, z);

    // Skip these (intensity = 0)
    if(Number(parameters[4]) === 0) {
      return null;
    }

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
    "level": level,
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

  var lines = file.data.split(/\r?\n/).filter(Boolean);
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
    "level": level,
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

  var lines = file.data.split(/\r?\n/).filter(Boolean);
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

  var lines = file.data.split(/\r?\n/).filter(Boolean);
 
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
        "volume": null,
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

  var lines = file.data.split(/\r?\n/).filter(Boolean);
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
    "volume": null,
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

    // Intensity is in emu/cm^3 (0.001 A/m)
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

  var lines = file.data.split(/\r?\n/).filter(Boolean);

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
    var step = line.slice(2, 6).trim() || "0";
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
    "demagnetizationType": null,
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
      "volume": null,
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

  if(blocks.length === 1 || blocks[blocks.length - 1].trim() !== "END") {
    throw(new Exception("Invalid Utrecht format."));
  }

  var demagnetizationType = inferDemagnetizationType(file.name);

  // We can skip the latest block
  blocks.slice(0, -1).forEach(function(specimen, i) {

    // Slice the file header information
    if(i === 0) { 
      var blockLines = specimen.split(/\r?\n/).slice(1);
    } else {
      var blockLines = specimen.split(/\r?\n/).slice(0);
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

  var lines = file.data.split(/\r?\n/).filter(Boolean);

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
