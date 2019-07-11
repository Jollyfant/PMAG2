let formElement = document.getElementById("form-submission")
formElement.addEventListener("submit", submitHandler);
document.getElementById("customFile").addEventListener("change", fileSelectionHandler);
  document.getElementById("download-magic-button").disabled = true;

function submitHandler(event) {

  /*
   * Function submitHandler
   * Callback function fired when the form is submitted
   */

  // Stop other actions
  event.preventDefault();

  // Make HTTP POST request with the form data
  HTTPRequest("https://api.paleomagnetism.org", "POST", function(json, code) {

    // Response based on status code
    switch(code) {
       case 200:
         return notify("success", "Your publication was succesfully received and was assigned identifier: <b><a href='../publication?" +  json.message  + "'>" + json.message + "</a></b>. <br> It will be reviewed and added to the data library soon.");
       case 400:
         return notify("danger", "Your publication was rejected with the following error: <br> " + json.message);
    }

  }, new FormData(formElement));

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
    files.forEach(function(file, i) {

      var data = JSON.parse(file.data);
      var exception = isComplete(data.specimens);
      var isOk = exception === true;

      // Validation error occurred
      if(exception instanceof Error) {
        mayDownload = false;
      }


      tables.push([
        "<div class='card card-sm'>",
        "  <div class='card-header' id='headingOne'>",
        "    <h5 class='mb-0'>",
        "      <button class='btn btn-link' data-toggle='collapse' data-target='#collapse" + i + "' aria-expanded='true' aria-controls='collapseOne'>",
        "       " + file.name.split(".").shift(),
        "      </button>",
        "    </h5>",
        "  </div>",
        "  <div id='collapse" + i +"' class='collapse show' aria-labelledby='headingOne' data-parent='#accordion'>",
        "    <div class='card-body'>",
        "      <table class='alert alert-" + (isOk ? "success" : "danger") + "' style='width: 100%;'>",
        "        <thead>",
        "        <tr>",
        "          <td><b>Collection</b></td>",
        "          <td><b>Complete</b></td>",
        "          <td><b>Number of Specimens</b></td>",
        "          <td><b>Validation</b></td>",
        "        </tr>",
        "        </thead>",
        "        <tbody>",
        "        <tr>",
        "          <td>" + file.name.split(".").shift() + "</td>",
        "          <td>" + getSuccesfulLabel(isOk) + "</td>",
        "          <td>" + data.specimens.length + "</td>",
        "          <td>" + (exception === true ? "Validated" : exception) + "</td>",
        "        </tr>",
        "        </tbody>",
        "      </table>",
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

        rows.push([
          "  <tr>",
          "    <td>" + specimen.name + "</td>",
          "    <td>" + getDemagnetizationTypeLabel(specimen.demagnetizationType) + "</td>",
          "    <td>" + specimen.longitude + "°E, " + specimen.latitude + "°N</td>",
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

      var tableFooter = "</table></small></div></div></div>";
      tables.push(tableHeader + rows.join("\n") + tableFooter);

    });

    if(mayDownload) {
      document.getElementById("download-magic-button").disabled = false;
    }

    document.getElementById("fitted-table-container").innerHTML = tables.join("<br>");

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

  } catch(exception) {
    throw(new Exception(specimen.name + " " + exception));
  }

}