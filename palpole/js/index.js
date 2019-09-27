"use strict"

document.getElementById("convert-vgp").addEventListener("click", initializeVGP); 
document.getElementById("convert-dir").addEventListener("click", initializeDir); 

function parseInput(textArea, Class) {

  var content = document.getElementById(textArea).value;

  if(content === "") {
    return notify("danger", "The input is empty.");
  }

  var lines = content.split("\n").filter(Boolean);

  var vectors = new Array();

  for(var i = 0; i < lines.length; i++) {

    var parameters = lines[i].split(",").map(x => Number(x.trim()));

    if(parameters.length !== 2) {
      return notify("danger", "Invalid input at line " + i);
    }

    if(parameters.includes(Number.NaN)) {
      return notify("danger", "Invalid input at line " + i);
    }

    vectors.push(new Class(parameters[0], parameters[1]));

  }

  return vectors;

}

function getSite() {

  var latitude = Number(document.getElementById("latitude").value);
  var longitude = Number(document.getElementById("longitude").value);

  return new Site(latitude, longitude);

}

function initializeDir() {

  var input = parseInput("exampleFormControlTextarea1", Direction);
  var site = getSite();

  var poles = input.map(function(direction) {
    return site.poleFrom(direction);
  });

  document.getElementById("exampleFormControlTextarea2").value = poles.map(function(x) {
    return x.lng.toFixed(2) + ", " + x.lat.toFixed(2);
  }).join("\n");

  notify("success", "Converted <b>" + poles.length + "</b> virtual geomagnetic poles to directions at site <b>" + site.lat + "°N " + site.lng + "°E</b>.");

}

function initializeVGP() {

  var input = parseInput("exampleFormControlTextarea2", Pole);
  var site = getSite();

  var directions = input.map(function(pole) {
    return site.directionFrom(pole);
  });

  document.getElementById("exampleFormControlTextarea1").value = directions.map(function(x) {
    return x.dec.toFixed(2) + ", " + x.inc.toFixed(2);
  }).join("\n");

  notify("success", "Converted <b>" + directions.length + "</b> directions to virtual geomagnetic poles at <b>site " + site.lat + "°N " + site.lng + "°E</b>.");

}
