"use strict";

var Distribution = function(vectors) {

  /*
   * Class Distribution
   * Wrapper for a Fisherian distribution
   */

  // Save the passed vectors (Pole or Direction)
  this.vectors = vectors;

  this.mean = this.meanDirection();

  // Fisher parameters
  this.R = this.mean.length;
  this.N = vectors.length;
  this.dispersion = this.getDispersion(this.N, this.R);
  this.confidence = this.confidenceInterval(this.N, this.R);

}

var fisherianDistribution = function(DistributionClass, n, k) {

  /*
   * Class fisherianDistribution
   * Wrapper for sampling Fisherian distributions of a certain class:
   * DirectionDistribution or PoleDistribution
   */

  function pseudoVector(vectorType, k) {

    /*
     * Function fisherianDistribution::pseudoVector
     * Returns a pseudo-random vector (Pole or Direction) from a distribution with dispersion k
     */

    // Get a random declination (0 inclusive; 1 exclusive)
    var x = 2 * Math.PI * Math.random();
	  
    // Get a random inclination
    var L = Math.exp(-2 * k);
    var a = Math.random() * (1 - L) + L;
    var fac = 2 * Math.asin(Math.sqrt(-Math.log(a) / (2 * k)));

    var y = 0.5 * Math.PI - fac;
    
    // Return the appropriate vector class (Pole or Direction)
    return new vectorType(
      x / RADIANS,
      y / RADIANS
    );

  }

  var vectors = new Array();

  // Draw N pseudo-random samples
  for(var i = 0; i < n; i++) { 
    vectors.push(pseudoVector(DistributionClass.prototype.vectorType, k));
  }

  return new DistributionClass(vectors);

}

var PoleDistribution = function(poles) {

  /*
   * Class PoleDistribution
   * Wrapper for pole distributions, inherits from Distribution
   */

  Distribution.call(this, poles);

  // Pole distributions have a minimum & maximum expected scatter
  // (see: Deenen et al., 2011)
  this.confidenceMin = 12 * Math.pow(this.N, -0.40);
  this.confidenceMax = 82 * Math.pow(this.N, -0.63);

}

PoleDistribution.prototype = Object.create(Distribution.prototype);
PoleDistribution.prototype.vectorType = Pole;
PoleDistribution.prototype.constructor = PoleDistribution;

var DirectionDistribution = function(directions) {

  /*
   * Class DirectionDistribution
   * Wrapper for directional distributions, inherits from Distribution
   */

  Distribution.call(this, directions);

  this.lambda = this.mean.paleoLatitude();

  // Conversion between dispersion (Cox 1970) & (Creer 1962) of directions & VGPs
  // For comparison purposes only
  this.cox = this.transformCox();
  this.creer = this.transformCreer();

}

DirectionDistribution.prototype = Object.create(Distribution.prototype);
DirectionDistribution.prototype.vectorType = Direction;
DirectionDistribution.prototype.constructor = DirectionDistribution;

DirectionDistribution.prototype.transformCox = function() {

  /*
   * Class DirectionDistribution::transformCox
   * Transform small dispersion (k) to (K) following Cox 1970
   */

  var lambda = this.lambda * RADIANS;

  return 0.5 * this.dispersion * (5 + 3 * Math.pow(Math.sin(lambda), 2)) / Math.pow(1 + 3 * Math.pow(Math.sin(lambda), 2), 2);

}

DirectionDistribution.prototype.transformCreer = function() {

  /*
   * Class DirectionDistribution::transformCreer
   * Transform small dispersion (k) to (K) following Creer 1962
   */

  var lambda = this.lambda * RADIANS;

  return 0.5 * this.dispersion * (5 - 3 * Math.pow(Math.sin(lambda), 2)) / 1 + 3 * Math.pow(Math.sin(lambda), 2);

}

Distribution.prototype.getConfidenceEllipseDeenen = function() {

  /*
   * Function Distribution.getConfidenceEllipseDeenen
   * Returns the A95Max, A95Min confidence ellipses
   */

  return {
    "minimum": this.getConfidenceEllipse(this.confidenceMin),
    "maximum": this.getConfidenceEllipse(this.confidenceMax)
  }

}

Distribution.prototype.getConfidenceEllipse = function(angle) {

  /*
   * Function Distribution.getConfidenceEllipse
   * Returns confidence ellipse around up North
   */

  // Define the number of discrete points on an ellipse
  const NUMBER_OF_POINTS = 51;

  if(angle === undefined) {
    angle = this.confidence;
  }

  var vectors = new Array();

  // Create a circle around the pole with angle confidence
  for(var i = 0; i < NUMBER_OF_POINTS; i++) {
    vectors.push(new this.vectorType((i * 360) / (NUMBER_OF_POINTS - 1), 90 - angle));
  }

  // Handle the correct distribution type
  return new PoleDistribution(vectors).rotateTo(...this.mean.asArray()).vectors;

}

PoleDistribution.prototype.toDirections = function(site) {

  /*
   * Function Distribution.toDirections
   * Converts a distribution to poles for a given site
   */

  if(!(site instanceof Site)) {
    throw(new Exception("Input is not of class Site."));
  }

  // Return a new Direction distribution
  return new DirectionDistribution(this.vectors.map(site.directionFrom, site));

}

DirectionDistribution.prototype.toPoles = function(site) {

  /*
   * Function Distribution.toPoles
   * Converts a distribution to poles for a given site
   */

  if(!(site instanceof Site)) {
    throw(new Exception("Input is not of class Site."));
  }

  // Return a new Pole distribution
  return new PoleDistribution(this.vectors.map(site.poleFrom, site));

}

Distribution.prototype.rotateTo = function(azimuth, plunge) {

  /*
   * Function Distribution.rotateTo
   * Rotates a distribution to a specific azimuth, plunge and returns a new distribution
   */

  function rotateVector(vector) {

    /*
     * Function Distribution.rotateTo::rotateVector
     * Rotates a single vector to given azimuth/plunge
     */

    return vector.toCartesian().rotateTo(azimuth, plunge).toVector(vector.constructor);

  }

  // Create a new instance of the constructor (i.e. PoleDistribution or DirectionDistribution)
  return new this.constructor(this.vectors.map(rotateVector));

}

Distribution.prototype.getDispersion = function(N, R) {

  /*
   * Function Distribution.confidenceInterval
   * Returns the getDispersion parameter of a distribution
   */

  return (N - 1) / (N - R);

}

Distribution.prototype.confidenceInterval = function(N, R, confidence) {

  /*
   * Function Distribution.confidenceInterval
   * Returns the confidence value of a distribution
   */

  // Default to 95% confidence
  if(confidence === undefined) {
    var confidence = 95;
  }

  // Set the probability
  var probability = 0.01 * (100 - confidence);

  return Math.acos(1 - (Math.pow((1 / probability), (1 / (N - 1))) - 1) * (N - R) / R) / RADIANS;

}

Distribution.prototype.meanDirection = function() {

  /*
   * Function Distribution.meanDirection
   * Calculates the mean vector from a set of directions
   */

  var xSum = 0;
  var ySum = 0
  var zSum = 0;

  this.vectors.map(vector => vector.toCartesian()).forEach(function(coordinates) {

    xSum += coordinates.x;
    ySum += coordinates.y;
    zSum += coordinates.z;

  });

  return new Coordinates(xSum, ySum, zSum).toVector(this.vectorType);

}
