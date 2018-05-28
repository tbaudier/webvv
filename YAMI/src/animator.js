function f() {
  // Animation managment
  //let imgHasChanged = true;
  let fps, fpsInterval, startTime, now, then, elapsed;
  let updateFunction;

  // initialize animation variables and start the animation
  function startAnimating(fps, updateFunct) {
    updateFunction = updateFunct;
    imgHasChanged = true;
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;
    animate();
  }

  // this function is executed on each animation frame
  function animate() {
    now = Date.now();
    elapsed = now - then;

    if (elapsed > fpsInterval) {
      then = now - (elapsed % fpsInterval);
      updateFunction();
    }
    requestAnimationFrame(animate);
  }

  return {
    startAnimating: startAnimating
  };
}

module.exports = f();
