function parseGPlatesRotationFile(files) {

  /*
   * Function parseGPlatesRotationFile
   * Parses and loads a selected GPlates rotation file
   */

  function parseLine(line) {

    /*
     * Function eulerSelectionHandler::parseLine
     * Parses a single line of the file
     */

    var values = line.split(/\s+/);

    if(values.length < 6) {
      throw(new Exception("Invalid GPlates rotation file."));
    }

    return {
      "id": values[0],
      "age": Number(values[1]),
      "lat": Number(values[2]),
      "lng": Number(values[3]),
      "rot": Number(values[4]),
      "rel": values[5]
    }

  }


  // Create a hashmap for the plate ID
  files.pop().data.split(/\r?\n/).slice(1, -1).map(parseLine).forEach(function(x) {

    if(!eulerData.hasOwnProperty(x.id)) {
      eulerData[x.id] = new Array();
    }

    eulerData[x.id].push(x);

  });

  function byName(a, b) {

    /*
     * Function parseGPlatesRotationFile::byName
     * Sorting function by plate name
     */

    if((a.name || a.id) < (b.name || b.id)) return -1;
    if((a.name || a.id) > (b.name || b.id)) return 1;
    return 0;

  }

  var optionGroup = document.createElement("optgroup");
  optionGroup.label = "Custom Rotations";

  // Add Euler poles to plates
  Object.keys(eulerData).map(mapPlate).sort(byName).forEach(function(plate) {

    // Skip unconstrained plate
    if(plate.id === "1001") {
      return;
    }

    optionGroup.appendChild(createOption(plate.name || plate.id, plate.id));

  })

  document.getElementById("plate-select").add(optionGroup);

  $("#plate-select").selectpicker("refresh");

  notify("success", "Succesfully added rotation information for <b>" + Object.keys(eulerData).length + "</b> plates.");

}

function getStagePoleAge(ID, age) {

  // Create an empty total reconstruction pole
  var totalPole = new EulerPole(0, 0, 0);

  // Uh.. nothing
  if(age === 0) {
    return totalPole;
  }

  // Continue when we are referencing the fixed plate ID
  while(ID !== "000") {

    var plateData = eulerData[ID];

    // Search input for matching plateID & age
    for(var i = 0; i < plateData.length; i++) {
     
      if(plateData[i].age < age) {
  
        // Last age checked: return the total pole
        if(i === plateData.length - 1) {
          return null;
        }  

        continue;

      }
  
      // Get the previous pole
      var poleYoung = new EulerPole(plateData[i - 1].lng, plateData[i - 1].lat, plateData[i - 1].rot);
      var poleOld = new EulerPole(plateData[i].lng, plateData[i].lat, plateData[i].rot);

      // Calculate the stage pole
      var stagePole = getStagePole(poleOld, poleYoung);
      
      // Interpolate the stage pole to a given age
      var interPole = getInterPole(poleOld, stagePole, plateData[i].age, plateData[i - 1].age, age);
    
      // Add the interpolated pole to the total reconstruction pole
      totalPole = convolvePoles(totalPole, interPole);

      // Update the relative plate identifier and move up the GPlates tree
      ID = plateData[i].rel;
      break;

    }

  }

  return totalPole;

}
