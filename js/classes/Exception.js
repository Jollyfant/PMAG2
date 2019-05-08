var Exception = function(error) {

  /*
   * Class Exception
   * Extended wrapper for JavaScript Errors
   */

  if(__DEBUG__) {
    console.trace();
  }

  return new Error(error);

}
