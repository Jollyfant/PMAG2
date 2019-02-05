"use strict";

var Pole = function(longitude, latitude, length) {

  /*
   * Class Pole
   * Container class for pole locations
   */

  this.lng = longitude;
  this.lat = latitude;

  this.length = length || 1;

}

Pole.prototype.asArray = function() {

  /*
   * Function Pole.asArray
   * Returns the pole longitude, latitude as an array
   */

  return new Array(this.lng, this.lat);

}

Pole.prototype.toCartesian = function() {

  /*
   * Function Direction.toCartesian
   * Returns the direction in Cartesian coordinates
   */

  // Convert lng, lat to radians
  var lng = this.lng * RADIANS;
  var lat = this.lat * RADIANS;

  // Calculate Cartesian coordinates
  return new Coordinates(
    this.length * Math.cos(lng) * Math.cos(lat),
    this.length * Math.sin(lng) * Math.cos(lat),
    this.length * Math.sin(lat)
  );

}
