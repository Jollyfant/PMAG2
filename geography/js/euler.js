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

function getEulerPole(R) {

  /*
   * Function getEulerPole
   * Converts a rotation matrix to an Euler pole
   * Routine implemented after Bram Vaes @ UU (some changes to fit with Paleomagnetism,org functions)
   * https://en.wikipedia.org/wiki/Rotation_matrix#Axis_and_angle
   */

  // Qzy - Qyz, Qxz - Qzx, Qyx - Qxy (x, y, z)
  var coordinates = new Coordinates(R[1][2] - R[2][1], R[2][0] - R[0][2], R[0][1] - R[1][0]);

  // Check that coordinates are OK
  if(coordinates.isNull()) {
    return new EulerPole(0, 0, 0);
  }

  // Trace of rotation matrix to get the angle
  var trace = R[0][0] + R[1][1] + R[2][2];

  // Calculate the angle
  var angle = Math.atan2(coordinates.length, trace - 1);

  // Convert Coordinates to a pole and add the angle to create an Euler pole
  var pole = coordinates.toVector(Pole);

  return new EulerPole(
    pole.lng,
    pole.lat,
    angle / RADIANS
  );

}

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

function getRotatedPole(eulerPole, pole) {

  /*
   * Function getRotatedPole
   * Rotates a given pole around a given euler pole with rotation omega
   * 
   * Modified after supplementary information Paleolatitude.org
   * @ https://doi.org/10.1371/journal.pone.0126946.s005
   * 
   */

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

  // No pole to rotate: return the rotation matrix
  if(pole === undefined) {
    return B;
  }

  // Rotate the pole using the rotation matrix.
  // Always return a new Pole instance
  return pole.toCartesian().rotate(B).toVector(Pole);

}

function convolvePoles(poleOne, poleTwo) {

  /*
   * Function convolvePoles
   * Converts two Euler poles to rotation matrices that are multiplied
   * to get the combined Euler rotation
   */

  // Rotated poles have different signs
  var R1 = getRotatedPole(poleOne);
  var R2 = getRotatedPole(poleTwo);

  var M = nullMatrix();

  // Multiple [R1] by [R2]
  for(var i = 0; i < 3; i++) {
    for(var j = 0; j < 3; j++) {
      for(var k = 0; k < 3; k++) {
        M[i][j] += R1[i][k] * R2[k][j];
      }
    }
  }

  return getEulerPole(M);

}

function getStagePole(poleOld, poleNew) {

  /*
   * Function getStagePole
   * Returns the stage pole from two poles
   */

  var stagePole = new EulerPole(poleOld.lng, poleOld.lat, -poleOld.angle);

  return convolvePoles(stagePole, poleNew);

}

function getInterPole(totalPole, stagePole, ageMax, age, inc) {

  /*
   * Function getInterPole
   * Interpolates stage pole to a certain age fraction
   */

  var ageFraction = (ageMax - inc) / (ageMax - age);
  var agePole = new EulerPole(stagePole.lng, stagePole.lat, stagePole.angle * ageFraction);

  return convolvePoles(totalPole, agePole);

}
