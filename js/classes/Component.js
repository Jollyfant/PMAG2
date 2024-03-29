var Component = function(specimen, coordinates, MAD) {

  /*
   * Class Component
   * Container for a single direction
   */

  this.name = specimen.name
  this.rejected = false;
  this.MAD = MAD;

  this.latitude = specimen.latitude;
  this.longitude = specimen.longitude;
  this.age = specimen.age;
  this.ageMin = specimen.ageMin;
  this.ageMax = specimen.ageMax;

  this.coreAzimuth = specimen.coreAzimuth;
  this.coreDip = specimen.coreDip;
  this.beddingStrike = specimen.beddingStrike;
  this.beddingDip = specimen.beddingDip;

  this.level = specimen.level;

  this.coordinates = literalToCoordinates(coordinates);

}

Component.prototype.inReferenceCoordinates = function(coordinates) {

  /*
   * Function Component.inReferenceCoordinates
   * Returns a component in the requested reference coordinates
   */

  if(coordinates === undefined) {
    coordinates = COORDINATES;
  }

  // Return a itself as a new component but in reference coordinates
  return new Component(this, inReferenceCoordinates(coordinates, this, this.coordinates), this.MAD);

}

Component.prototype.fromReferenceCoordinates = function(coordinates) {

  /*
   * Function Component.inReferenceCoordinates
   * Returns a component in the requested reference coordinates
   */

  if(coordinates === undefined) {
    throw(new Exception("Coordinates must be passed when returning from a reference frame."));
  }

  // Return a itself as a new component but in reference coordinates
  return new Component(this, fromReferenceCoordinates(coordinates, this, this.coordinates), this.MAD);

}
