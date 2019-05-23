let formElement = document.getElementById("form-submission")
formElement.addEventListener("submit", submitHandler);

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