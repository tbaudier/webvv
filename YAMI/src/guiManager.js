function f() {

  function buildGUI(stackHelper, camera, changes) {
    let stack = stackHelper._stack;

    let changePrt = changes;

    let gui = new dat.GUI({
      autoPlace: false,
    });

    // probe
    let camUtils = {
      invertRows: false,
      invertColumns: false,
      rotate: false,
      orientation: 'default',
      convention: 'radio',
    };

    let customContainer = document.getElementById('my-gui-container');
    customContainer.appendChild(gui.domElement);

    let stackFolder = gui.addFolder('Stack');
    stackFolder.add(
        stackHelper.slice, 'windowWidth', 1, stack.minMax[1] - stack.minMax[0])
      .step(1).listen().onChange(_ => {
        changes.hasChanged = true;
      });

    //stackHelper.slice.intensityAuto = false;
    stackFolder.add(
        stackHelper.slice, 'windowCenter', stack.minMax[0], stack.minMax[1])
      .step(1).listen().onChange(_ => {
        changes.hasChanged = true;
      });
    //stackFolder.add(stackHelper.slice, 'intensityAuto').listen();
    stackFolder.add(stackHelper.slice, 'invert').onChange(_ => {
      changes.hasChanged = true;
    });
    //stackFolder.add(stackHelper.slice, 'interpolation', { No:0, Yes:1}).listen();
    //stackFolder.add(stackHelper.slice, 'interpolation', 0, 1).step(1).listen();

    // CREATE LUT
    lut = new AMI.LutHelper(
      'my-lut-canvases',
      'default',
      'linear', [
        [0, 0, 0, 0],
        [1, 1, 1, 1]
      ], [
        [0, 1],
        [1, 1]
      ]);
    lut.luts = AMI.LutHelper.presetLuts();

    let lutUpdate = stackFolder.add(
      stackHelper.slice, 'lut', lut.lutsAvailable());
    lutUpdate.onChange(function(value) {
      lut.lut = value;
      stackHelper.slice.lutTexture = lut.texture;
      changes.hasChanged = true;
    });
    let lutDiscrete = stackFolder.add(lut, 'discrete', false);
    lutDiscrete.onChange(function(value) {
      lut.discrete = value;
      stackHelper.slice.lutTexture = lut.texture;
      changes.hasChanged = true;
    });

    let index = stackFolder.add(
      stackHelper, 'index', 0, stack.dimensionsIJK.z - 1).step(1).listen().onChange(_ => {
      changes.hasChanged = true;
    });
    stackFolder.open();

    // camera
    let cameraFolder = gui.addFolder('Camera');
    let invertRows = cameraFolder.add(camUtils, 'invertRows');
    invertRows.onChange(function() {
      camera.invertRows();
      updateLabels(camera.directionsLabel, stack.modality);
    });

    let invertColumns = cameraFolder.add(camUtils, 'invertColumns');
    invertColumns.onChange(function() {
      camera.invertColumns();
      updateLabels(camera.directionsLabel, stack.modality);
    });

    let angle = cameraFolder.add(camera, 'angle', 0, 360).step(1).listen();
    angle.onChange(function() {
      updateLabels(camera.directionsLabel, stack.modality);
      changes.hasChanged = true;
    });

    let rotate = cameraFolder.add(camUtils, 'rotate');
    rotate.onChange(function() {
      camera.rotate();
      updateLabels(camera.directionsLabel, stack.modality);
      changes.hasChanged = true;
    });

    let orientationUpdate = cameraFolder.add(
      camUtils, 'orientation', ['default', 'axial', 'coronal', 'sagittal']);
    orientationUpdate.onChange(function(value) {
      camera.orientation = value;
      camera.update();
      camera.fitBox(2);
      stackHelper.orientation = camera.stackOrientation;
      updateLabels(camera.directionsLabel, stack.modality);

      index.__max = stackHelper.orientationMaxIndex;
      stackHelper.index = Math.floor(index.__max / 2);
      changes.hasChanged = true;
    });

    let conventionUpdate = cameraFolder.add(
      camUtils, 'convention', ['radio', 'neuro']);
    conventionUpdate.onChange(function(value) {
      camera.convention = value;
      camera.update();
      camera.fitBox(2);
      updateLabels(camera.directionsLabel, stack.modality);
      changes.hasChanged = true;
    });
  }

  function updateLabels(labels, modality) {
    if (modality === 'CR' || modality === 'DX') return;

    let top = document.getElementById('top');
    top.innerHTML = labels[0];

    let bottom = document.getElementById('bottom');
    bottom.innerHTML = labels[1];

    let right = document.getElementById('right');
    right.innerHTML = labels[2];

    let left = document.getElementById('left');
    left.innerHTML = labels[3];
  }

  return {
    buildGUI: buildGUI,
    updateLabels: updateLabels
  }
}

module.exports = f();
