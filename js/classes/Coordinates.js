var Coordinates = function(x, y, z) {

  /*
   * Class Coordinates
   * Wrapper for Cartesian coordinates (x, y, z)
   */

  this.x = x;
  this.y = y;
  this.z = z;

  this.length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);

}

Coordinates.prototype.toLiteral = function() {

  return {
    "x": this.x,
    "y": this.y,
    "z": this.z
  }

}

Coordinates.prototype.isNull = function() {
  return this.x === 0 && this.y === 0 && this.z === 0;
}

Coordinates.prototype.add = function(coordinates) {

  return new Coordinates(this.x + coordinates.x, this.y + coordinates.y, this.z + coordinates.z);

}

Coordinates.prototype.subtract = function(coordinates) {

  return new Coordinates(this.x - coordinates.x, this.y - coordinates.y, this.z - coordinates.z);

}

Coordinates.prototype.angle = function(coordinates) {

  return Math.acos(this.unit().dot(coordinates.unit())) / RADIANS;

}

Coordinates.prototype.dot = function(coordinates) {

  return this.x * coordinates.x + this.y * coordinates.y + this.z * coordinates.z;

}

Coordinates.prototype.unit = function() {

  /*
   * Function Coordinates.unit
   * Reflects the Coordinates as a unit vector
   */

  return new Coordinates(this.x / this.length, this.y / this.length, this.z / this.length);

}

Coordinates.prototype.isValid = function() {

  /*
   * Function Coordinates.isValid
   * Returns true if the vector is valid
   */

  return !isNaN(this.x) && !isNaN(this.y) && !isNaN(this.z);

}

Coordinates.prototype.reflect = function() {

  /*
   * Function Coordinates.reflection
   * Reflects the Coordinates in space
   */

  return new Coordinates(-this.x, -this.y, -this.z);

}

Coordinates.prototype.toVector = function(vectorType) {

  /*
   * Function Coordinates.toDirection
   * Returns Cartesian coordinates represented as a direction
   */

  var x = Math.atan2(this.y, this.x);
  var y = Math.asin(this.z / this.length);

  // Keep the vector (declination or longitude) between [0, 360]
  if(x < 0) {
    x = x + (2 * Math.PI);
  }

  // Return a new Pole or Direction
  return new vectorType(
    x / RADIANS,
    y / RADIANS,
    this.length
  );

}

Coordinates.prototype.rotate = function(rotationMatrix) {

  /*
   * Function Coordinates.rotate
   * Rotates itself against the rotation matrix
   */

  var vector = this.toArray();
  var rotatedVector = new Array(0, 0, 0);

  // Do the matrix multiplication
  for(var i = 0; i < 3; i++) {
    for(var j = 0; j < 3; j++) {
      rotatedVector[i] += rotationMatrix[i][j] * vector[j];
    }
  }

  // Return the rotated coordinates
  return new Coordinates(rotatedVector[0], rotatedVector[1], rotatedVector[2]);

}

Coordinates.prototype.correctBedding = function(strike, plunge) {

  var dipDirection = strike + 90;

  // We can subtract the dip direction from the declination because 
  // the inclination will not change (See Lisa Tauxe: 9.3 Changing coordinate systems; last paragraph)
  return this.rotateTo(-dipDirection, 90).rotateTo(0, 90 - plunge).rotateTo(dipDirection, 90);

}

Coordinates.prototype.rotateTo = function(azimuth, plunge) {

  /*
   * Function Coordinates.rotateTo
   * Rotates a direction to azimuth, plunge
   */

  // Convert to radians
  var azimuth = azimuth * RADIANS;
  var plunge = plunge * RADIANS;

  // Create the rotation matrix
  var rotationMatrix = getRotationMatrix(azimuth, plunge);

  return this.rotate(rotationMatrix);

}

Coordinates.prototype.rotateFrom = function(azimuth, plunge) {

  /*
   * Function Coordinates.rotateFrom
   * Rotates a direction to azimuth, plunge
   */

  // Convert to radians
  var azimuth = azimuth * RADIANS;
  var plunge = plunge * RADIANS;

  // Create the rotation matrix
  var rotationMatrix = getRotationMatrixR(azimuth, plunge);

  return this.rotate(rotationMatrix);

}


Coordinates.prototype.toArray = function() {

  /*
   * Function Coordinates.toArray
   * Returns x, y, z represented as a vector
   */

  return new Array(this.x, this.y, this.z);

}
