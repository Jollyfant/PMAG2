"use strict";

var Location = function(site, distribution) {

  /*
   * Class Location
   * Wrapper for a distribution at a given site
   */

  // Save the site
  this.site = site;

  // Take one distribution (pole / direction) and create the other
  if(distribution.constructor === PoleDistribution) {
    this.poles = distribution;
    this.directions = distribution.toDirections(site);
  } else if(distribution.constructor === DirectionDistribution) {
    this.directions = distribution;
    this.poles = distribution.toPoles(site);
  } else {
    throw(new Exception("Got unexpected constructor."));
  }

  // Calculate the butler parameters for this location
  this.butler = this.getButler();

}

Location.prototype.getButler = function() {

  /*
   * Function Location.butler
   * Calculates the butler parameters for a location
   */

  // Convert to radians
  var A95 = this.poles.dispersion * RADIANS;
  var palat = this.directions.lambda * RADIANS;
  var inc = this.directions.mean.inc * RADIANS;

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

