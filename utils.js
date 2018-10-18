const __DEBUG__ = true;
const __VERSION__ = "2.0.0";
const RADIANS = Math.PI / 180;
const PROJECTION_TYPE = "AREA";

const warning = new Audio("./sounds/error.mp3");
const notification = new Audio("./sounds/notification.mp3");

document.title = "Paleomagnetism.org " + __VERSION__;

function notify(type, text) {

  /*
   * Function notify
   * Sends notification to the user
   */

  // Jump to the top
  window.scrollTo(0, 0);

  // Play sound if enabled
  if(document.getElementById("enable-sound").checked) {

    if(type === "warning" || type === "danger") {
      warning.play();
    } else {
      notification.play();
    }

  }

  // Update the notification tooltip
  document.getElementById("notification-container").innerHTML = [
    "<div class='alert alert-" + type + "' alert-dismissible fade show' role='alert'>",
      "<button type='button' class='close' data-dismiss='alert' aria-label='Close'>",
        "<span aria-hidden='true'>&times;</span>",
      "</button>",
      "<i class='far fa-comment'></i>",
      text,
    "</div>"
  ].join("\n");

}


function clearLocalStorage() {

  /*
   * Function clearLocalStorage
   * Clears the local storage of the webpage
   */

  if(!confirm("Are you sure you want to clear the local storage?")) {
    return;
  }

  localStorage.clear();

  // Reload the page
  window.location.reload();

}

function saveLocalStorage() {

  /*
   * Function saveLocalStorage
   * Saves sample object to local storage
   */

  if(!document.getElementById("auto-save").checked) {
    return;
  }

  // Set local storage
  localStorage.setItem("specimens", JSON.stringify(samples));

}

function fEquals(one, two) {

  /*
   * Function fEquals
   * Test the equality of two floats to a given precision
   */

  const PRECISION = 10;

  return one.toPrecision(PRECISION) === two.toPrecision(PRECISION);

}

function downloadURIComponent(name, string) {

  /*
   * Function downloadURIComponent
   * Creates a temporary link component used for downloading
   */

  var downloadAnchorNode = document.createElement("a");

  // Set some attribtues
  downloadAnchorNode.setAttribute("href", string);
  downloadAnchorNode.setAttribute("download", name);

  // Add and trigger click event
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();

  // Clean up
  document.body.removeChild(downloadAnchorNode);

}

function downloadAsCSV(filename, csv) {

  /*
   * Function downloadAsCSV
   * Downloads a particular CSV string as a BLOB
   */

  const MIME_TYPE = "data:text/csv;charset=utf-8";

  downloadURIComponent(filename, MIME_TYPE + "," + encodeURIComponent(csv));

}

function HTTPRequest(url, type, callback) {

  /*
   * Function HTTPRequest
   * Makes an async XMLHTTPRequest to a remote resource
   */

  const HTTP_OK = 200;

  var xhr = new XMLHttpRequest();

  // When the resource is ready
  xhr.onload = function() {

    console.debug(type + " HTTP Request to " + url + " returned with status code " + this.status);

    // Ignore HTTP errors
    if(this.status !== HTTP_OK) {
      return callback(null);
    }

    // Check the content type
    switch(this.getResponseHeader("Content-Type")) {
      case "application/json":
      case "application/vnd.schemaorg.ld+json":
        return callback(JSON.parse(xhr.response));
      default:
        return callback(xhr.response);
    }

  }

  xhr.onerror = function(error) {
    callback(null);
  }

  // Open and finish the request
  xhr.open(type, url);
  xhr.send();

}

function addFooter() {

  /*
   * Function addFooter
   * Adds footer to all HTML pages
   */

  document.getElementById("footer-container").innerHTML = new Array(
    "<b>Paleomagnetism<span class='text-danger'>.org</span></b> &copy; " + new Date().getFullYear() + ". All Rights Reserved.",
    "<div style='float: right;' class='text-muted'><small>Version v" + __VERSION__ + "</small></div>",
    "&nbsp; <i class='fab fa-github'></i> <a href='https://github.com/Jollyfant'><b>Source Code</b></a>",
    "&nbsp; <i class='fas fa-balance-scale'></i> Licensed under <a href='https://github.com/Jollyfant'><b>MIT</b>.</a>",
  ).join("\n");

}

addFooter();
