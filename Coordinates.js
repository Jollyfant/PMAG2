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
  return new Coordinates(...rotatedVector);

}

Coordinates.prototype.correctBedding = function(strike, plunge) {

  // We can subtract the dip direction from the declination because 
  // the inclination will not change (See Lisa Tauxe: 9.3 Changing coordinate systems; last paragraph)
  return this.rotateTo(-(strike + 90), 90).rotateTo(0, 90 - plunge).rotateTo(strike + 90, 90);

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


Coordinates.prototype.toArray = function() {

  /*
   * Function Coordinates.toArray
   * Returns x, y, z represented as a vector
   */

  return new Array(this.x, this.y, this.z);

}
