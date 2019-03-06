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
