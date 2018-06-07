// Window presets managment
const lutWindowManager = require('./lutWindowManager');

function f() {

  function buildGUI(scene, camera, changes) {
    let sceneManager = scene;
    let stackHelper = scene.stackHelper;
    let stack = scene.stackHelper._stack;
    let fusionUni = scene.uniforms.fusion;

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
    let windowPreset = {
      window: 'Custom'
    };

    let customContainer = document.getElementById('my-gui-container');
    customContainer.appendChild(gui.domElement);

    let stackFolder = gui.addFolder('Main image');
    stackFolder.add(
      stackHelper.slice, 'windowWidth', 0, stack.minMax[1] - stack.minMax[0]).listen().onChange((value) => {
      windowPreset.window = 'Custom';
      changes.hasChanged = true;
    });
    stackFolder.add(
      stackHelper.slice, 'windowCenter', stack.minMax[0], stack.minMax[1]).listen().onChange(_ => {
      windowPreset.window = 'Custom';
      changes.hasChanged = true;
    });
    //stackFolder.add(stackHelper.slice, 'intensityAuto').listen();
    stackFolder.add(stackHelper.slice, 'invert').onChange(_ => {
      changes.hasChanged = true;
    });
    //stackFolder.add(stackHelper.slice, 'interpolation', { No:0, Yes:1}).listen();
    //stackFolder.add(stackHelper.slice, 'interpolation', 0, 1).step(1).listen();
    let lutWindowUpdate = stackFolder.add(
      windowPreset, 'window', lutWindowManager.listPresets()).listen();
    lutWindowUpdate.onChange(function(value) {
      if (value === "Custom") return;
      let preset = lutWindowManager.getPresetValue(windowPreset.window);
      stackHelper.slice.windowWidth = preset[0];
      stackHelper.slice.windowCenter = preset[1];
      changes.hasChanged = true;
    });
    /*
        let lutUpdate = stackFolder.add(
          stackHelper.slice.lut, 'lut', stackHelper.slice.lut.lutsAvailable());
        lutUpdate.onChange(function(value) {
          stackHelper.slice.lutTexture = stackHelper.slice.lut.texture;
          changes.hasChanged = true;
        });
        let lutDiscrete = stackFolder.add(stackHelper.slice.lut, 'discrete', false);
        lutDiscrete.onChange(function(value) {
          stackHelper.slice.lutTexture = stackHelper.slice.lut.texture;
          changes.hasChanged = true;
        });*/

    let index = stackFolder.add(
      stackHelper, 'index', 0, stack.dimensionsIJK.z - 1).step(1).listen().onChange(_ => {
      changes.hasChanged = true;
    });
    stackFolder.open();

    // Fusion
    if (fusionUni) {
      let fusionFolder = gui.addFolder('Fusion');
      let lutUpdateFusion = fusionFolder.add(
        sceneManager.luts.fusion, 'lut', sceneManager.luts.fusion.lutsAvailable());
      lutUpdateFusion.onChange(function(value) {
        fusionUni.uTextureLUT.value = sceneManager.luts.fusion.texture;
        changes.hasChanged = true;
      });
      let thresholdFusion = fusionFolder.add(sceneManager.uniformsMix.uThreshold, 'value', 0, 1).name("Threshold");
      thresholdFusion.onChange(function(value) {
        changes.hasChanged = true;
      });
      let opacityMinFusion = fusionFolder.add(sceneManager.uniformsMix.uOpacityMin, 'value', 0, 1).name("Opacity min");
      opacityMinFusion.onChange(function(value) {
        changes.hasChanged = true;
      });
      let opacityMaxFusion = fusionFolder.add(sceneManager.uniformsMix.uOpacityMax, 'value', 0, 1).name("Opacity max");
      opacityMaxFusion.onChange(function(value) {
        changes.hasChanged = true;
      });
      fusionFolder.open();

    }
    // camera
    let cameraFolder = gui.addFolder('Camera');
    let invertRows = cameraFolder.add(camUtils, 'invertRows');
    invertRows.onChange(function() {
      camera.invertRows();
      updateLabels(camera.directionsLabel, stack.modality);
      changes.hasChanged = true;
    });

    let invertColumns = cameraFolder.add(camUtils, 'invertColumns');
    invertColumns.onChange(function() {
      camera.invertColumns();
      updateLabels(camera.directionsLabel, stack.modality);
      changes.hasChanged = true;
    });

    let angle = cameraFolder.add(camera, 'angle', 0, 360).step(1).listen();
    angle.onChange(function() {
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
