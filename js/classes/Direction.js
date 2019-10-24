"use strict";

var Direction = function(dec, inc, length) {

  /*
   * Class Direction
   * Wrapper for magnetic directions
   */

  this.dec = dec;
  this.inc = inc;

  // Implicitly assume unit weight
  this.length = length || 1;

}

Direction.prototype.unit = function() {

  /*
   * Function Direction.unit
   * Returns the unit vector representation of a direction
   */

  return new Direction(this.dec, this.inc);

}

Direction.prototype.angle = function(direction) {

  return this.toCartesian().angle(direction.toCartesian());

}

Direction.prototype.asArray = function() {

  /*
   * Function Pole.asArray
   * Returns the direction declination, inclination as an array
   */

  return new Array(this.dec, this.inc);

}

Direction.prototype.highchartsData = function() {

  return {
    "x": this.dec, 
    "y": projectInclination(this.inc),
    "inc": this.inc
  }

}

Direction.prototype.paleoLatitude = function() {

  /*
   * Function Direction.paleoLatitude
   * Returns the paleolatitude calculated from the inclination using the dipole formula
   */

  return Math.atan(Math.tan(this.inc * RADIANS) / 2) / RADIANS;

}

Direction.prototype.toCartesian = function() {

  /*
   * Function Direction.toCartesian
   * Returns the direction in Cartesian coordinates
   */

  // Convert dec, inc to radians
  var dec = this.dec * RADIANS;
  var inc = this.inc * RADIANS;

  // Calculate Cartesian coordinates
  return new Coordinates(
    this.length * Math.cos(dec) * Math.cos(inc),
    this.length * Math.sin(dec) * Math.cos(inc),
    this.length * Math.sin(inc)
  );

}
