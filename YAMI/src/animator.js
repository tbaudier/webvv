/**
 * This class manages the framerate
 * @class
 * @alias Animator
 */
export default function f() {
  // Animation managment
  let fpsInterval, startTime, then;
  let updateFunction;
  let _this = this;

  /**
   * startAnimating - initialize animation variables and start the animation
   *
   * @public
   * @memberof Animator
   * @param  {number} fps         the ideal framerate. Real framerate will be lower or equal.
   * @param  {function} updateFunct the Render function : the function to call at each rendered frame.
   */
  this.startAnimating = function(fps, updateFunct) {
    updateFunction = updateFunct;
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;
    animate();
  }

  /**
   * animate - this function is executed on each animation frame
   *
   * @private
   * @memberof Animator
   */
  let animate = function() {
    let now = Date.now();
    let elapsed = now - then;

    if (elapsed > fpsInterval) {
      then = now - (elapsed % fpsInterval);
      updateFunction();
    }
    requestAnimationFrame(animate);
  }
}
