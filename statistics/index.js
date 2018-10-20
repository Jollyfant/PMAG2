var sites = new Array();

function __init__() {


  notify("success", "Welcome to statistics!");

  registerEventHandlers();

}

function registerEventHandlers() {

  // Simple listeners
  document.getElementById("customFile").addEventListener("change", fileSelectionHandler);

}

function addData(files) {

  files.forEach(function(file) {

    var json = JSON.parse(file.data);

    var siteName = file.name;
    var reference = json.pid;
    var directions = new Array();

    json.specimens.forEach(function(specimen) {

       specimen.interpretations.forEach(function(interpretation) {

         if(interpretation.type === "TAU3") {
           return;
         }

         var direction = literalToCoordinates(interpretation.specimen.coordinates).toVector(Direction);
         var site = new Site(specimen.location);

         directions.push({
           "name": specimen.name,
           "coreAzimuth": specimen.coreAzimuth,
           "location": site,
           "coreDip": specimen.coreDip,
           "rejected": false,
           "beddingStrike": specimen.beddingStrike,
           "beddingDip": specimen.beddingDip,
           "direction": direction
         });

       });

    });

    // Do the cutoff and accept/reject direction
    values = doCutoff(directions);
    ee = getStatisticalParameters(values);

    sites.push({
      "name": siteName,
      "reference": reference,
      "components": values,
      "pole": ee.pole,
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

  // Calculate 
  var poles = directions.filter(x => !x.rejected).map(x => site.poleFrom(new Direction(x.direction.dec, x.direction.inc)));
  var dirs = directions.filter(x => !x.rejected).map(x => new Direction(x.direction.dec, x.direction.inc));

  var p = new PoleDistribution(poles);
  var d = new DirectionDistribution(dirs);

  var butler = getButlerParameters(p.confidence, d.lambda, d.mean.inc);

  return {
    "directions": directions,
    "pole": p
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

function doCutoff(directions) {

  /*
   * Function doCutoff
   * Does the Vandamme or 45-cutoff
   */

  var cutoffType = document.getElementById("cutoff-selection").value;

  // Create a fake site at 0, 0
  var site = new Site({"lng": 0, "lat": 0});

  // Create a copy in memory
  var iterateDirections = memcpy(directions);

  //  No cutoff
  if(cutoffType === "null") {
    return iterateDirections;
  }

  while(true) {

    var index;
    var deltaSum = 0;
    var cutoffValue = getCutoffAngle(cutoffType);

    // Calculate the poles & mean poles
    var poles = iterateDirections.filter(x => !x.rejected).map(x => site.poleFrom(new Direction(x.direction.dec, x.direction.inc)));
    var poleDistribution = new PoleDistribution(poles);

    // Go over all all poles
    poleDistribution.vectors.forEach(function(vector, i) {

      // Find the angle between the mean VGP (mLon, mLat) and the particular VGPj.
      var angleToMean = poleDistribution.mean.toCartesian().dot(vector.toCartesian());

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

  return iterateDirections;

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

    notify("success", "Succesfully added <b>" + (sites.length - nSites) + "</b> specimen(s) (" + cutoff + ").");

  });

}


__init__();