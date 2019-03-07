var TIME_SCALE_AGES;

function addAges() {

  /*
   * Function addPrototypeSelection
   * Adds a prototype to the user prototype selection box
   */

  const INDENTATION_CHARACTER = "\xA0";

  HTTPRequest("db/ages.json", "GET", function(ages) {

    // Save reference
    TIME_SCALE_AGES = ages;

    Object.keys(TIME_SCALE_AGES).forEach(function(age) {

      var option = document.createElement("option");

      // Indent the name based on its level
      option.text = age === "null" ? "Unknown" : INDENTATION_CHARACTER.repeat(2 * ages[age].indentation) + age;
      option.value = age;

      document.getElementById("specimen-age-select").add(option);

    });

  });

}

function handleAgeSelection(event) {

  /*
   * Function handleAgeSelection
   * Handles event fired when an age is selected
   */

  var value = event.target.value;

  var min = TIME_SCALE_AGES[value].min;
  var max = TIME_SCALE_AGES[value].max;
  var average = 0.5 * (min + max) || "";

  // Set the input fields to the selected age
  document.getElementById("age-input").value = average;
  document.getElementById("age-min-input").value = min
  document.getElementById("age-max-input").value = max;

}

function setGeologicalTimescale(specimen) {

  /*
   * Function setGeologicalTimescale
   * Checks minimun maximum age and sets the appropriate geological timescale
   */

  Object.keys(TIME_SCALE_AGES).forEach(function(key) {

    var age = TIME_SCALE_AGES[key];

    if(specimen.ageMin === age.min && specimen.ageMax === age.max) {
      document.getElementById("specimen-age-select").value = key;
    }

  });

}

addAges();
