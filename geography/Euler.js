var EulerPole = function(longitude, latitude, angle) {

  /*
   * Class EulerPole
   * Wrapper for Euler poles that inherit from Pole
   */

  Pole.call(this, longitude, latitude);

  this.angle = angle;

}

EulerPole.prototype = Object.create(Pole.prototype);
EulerPole.prototype.constructor = EulerPole;

function getRotationMatrix(phi, lambda) {

  /*
   * Function getRotationMatrix
   * Returns the rotation matrix
   */

  return new Array(
    new Array(Math.sin(lambda) * Math.cos(phi), -Math.sin(phi), Math.cos(lambda) * Math.cos(phi)),
    new Array(Math.sin(lambda) * Math.sin(phi), Math.cos(phi), Math.sin(phi) * Math.cos(lambda)),
    new Array(-Math.cos(lambda), 0, Math.sin(lambda))
  );

}

function getRotatedPole(eulerPole, pole) {

  /*
   * Function getRotatedPole
   * Rotates a given pole around a given euler pole with rotation omega
   * 
   * Modified after supplementary information Paleolatitude.org
   * @ https://doi.org/10.1371/journal.pone.0126946.s005
   * 
   */

  function nullMatrix() {

    /*
     * Function nullMatrix
     * Returns an empty 2D matrix
     */

    return new Array(
      nullVector(),
      nullVector(),
      nullVector()
    );

  }

  function nullVector() {

    /*
     * Function nullVector
     * Returns an empty 1D vector
     */

    return new Array(0, 0, 0);

  }

  // Convert to radians
  var phiEuler = eulerPole.lng * RADIANS;
  var thetaEuler = eulerPole.lat * RADIANS;
  var rotationAngle = eulerPole.angle * RADIANS;
 
  // Construct transformation matrix L
  var L = getRotationMatrix(phiEuler, thetaEuler);
  
  // Construct rotation matrix
  var R = new Array(
    new Array(Math.cos(rotationAngle), Math.sin(rotationAngle), 0),
    new Array(-Math.sin(rotationAngle), Math.cos(rotationAngle), 0),
    new Array(0, 0, 1)
  );

  var M = nullMatrix();
  var B = nullMatrix();

  /*
   * [L] [R] [Lt] <P>
   * Where L is the transformation Matrix (t - transpose) [3x3]
   * R rotation matrix [3x3]
   * P is the vector containing Cartesian coordinates of the reference pole [1x3]
   */
  
  //Multiply [L] with [R] to [M]
  for(var i = 0; i < 3; i++) {
    for(var j = 0; j < 3; j++) {
      for(var k = 0; k < 3; k++) {
        M[i][j] += L[i][k] * R[k][j];
      }
    }
  }
  
  //Multiply [M] with [Lt] to [B]
  for(var i = 0; i < 3; i++) {
    for(var j = 0; j < 3; j++) {
      for(var k = 0; k < 3; k++) {
        B[i][j] += M[i][k] * L[j][k];
      }
    }
  }

  // Rotate the pole using the rotation matrix.
  // Always return a new Pole instance
  return pole.toCartesian().rotate(B).toVector(Pole);

}
