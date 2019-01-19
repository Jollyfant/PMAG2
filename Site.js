"use strict";

var Site = function(lng, lat) {

  /*
   * Class Site
   * Container class for site locations
   */

  this.lng = lng;
  this.lat = lat;

}

Site.prototype.poleFrom = function(direction) {

  /*
   * Function Site.poleFrom
   * Returns the pole for this site from a given direction
   */

  // Confirm we are translating a site to a pole
  if(!(direction instanceof Direction)) {
    throw(new Exception("The passed direction is not of class Direction."));
  }

  // Convert to radians
  var siteLatitude = this.lat * RADIANS;
  var siteLongitude = this.lng * RADIANS;
  var declination = direction.dec * RADIANS;
  var inclination = direction.inc * RADIANS;

  var p = 0.5 * Math.PI - Math.atan(0.5 * Math.tan(inclination));
  var poleLatitude = Math.asin(Math.sin(siteLatitude) * Math.cos(p) + Math.cos(siteLatitude) * Math.sin(p) * Math.cos(declination))
  var beta = Math.asin(Math.sin(p) * Math.sin(declination) / Math.cos(poleLatitude));

  if(Math.cos(p) - Math.sin(poleLatitude) * Math.sin(siteLatitude) < 0) {
    var poleLongitude = siteLongitude + Math.PI - beta;
  } else {
    var poleLongitude = siteLongitude + beta;
  }
	
  // Bind the plate longitude between [0, 360]
  if(poleLongitude < 0) {
    poleLongitude += 2 * Math.PI;
  }

  return new Pole(
    poleLongitude / RADIANS,
    poleLatitude / RADIANS
  );

}

Site.prototype.directionFrom = function(pole) {

  /*
   * Function Site.directionFrom
   * Returns the direction for this pole at a given site location
   */

  // Confirm that the constructor is a pole
  if(!(pole instanceof Pole)) {
    throw(new Exception("The passed pole is not of class Pole."));
  }

  // Convert to Radians
  var siteLat = this.lat * RADIANS;
  var siteLong = this.lng * RADIANS;
  var poleLat = pole.lat * RADIANS;
  var poleLong = pole.lng * RADIANS

  // Make sure siteLong and pole & site longitudes are in the same range
  if(siteLong < 0) {
    siteLong += 2 * Math.PI;
  }

  if(poleLong < 0) {
    poleLong += 2 * Math.PI;
  }

  var cosp = Math.sin(poleLat) * Math.sin(siteLat) + Math.cos(poleLat) * Math.cos(siteLat) * Math.cos(poleLong - siteLong);
  var sinp = Math.sqrt(1 - Math.pow(cosp, 2));

  // Clamp number between -1 and 1 (range of acos). Floating point errors may result in math.acos(1.0000000000000002) which turns in to NaN
  var declination = Math.acos(((Math.sin(poleLat) - Math.sin(siteLat) * cosp) / (Math.cos(siteLat) * sinp)).clamp(-1, 1));

  // Put in the right quadrant
  if(poleLong > siteLong && (poleLong - siteLong) > Math.PI) {
    declination = 2 * Math.PI - declination;
  }

  if(poleLong < siteLong && (siteLong - poleLong) < Math.PI) {
    declination = 2 * Math.PI - declination;
  }

  // Make sure that we are in the right quadrant
  var inclination = Math.atan2(2 * cosp, sinp);

  return new Direction(
    declination / RADIANS,
    inclination / RADIANS
  );

}
