// Window presets managment
const lutWindowManager = require('./lutWindowManager');
// Viewer config file
const config = require('./viewer.config');

/**
 * Create and manager the Graphic User Interface elements <br/>
 * Such has menus, green cross, labels...
 *
 * @module GUIManager
 */
function f() {
  let canvas;
  let gui;
  let indexDOM;
  let stackHelper;
  let sceneManager;
  let stackFolder;

  var changePtr;

  /**
   * Build the first elments of the GUI.
   *
   * @param {SceneManager} scene  the scene manager
   * @param {AMI.Camera} camera   the camera
   * @param {Object} changes    pointer to changes as <i>changes.hasChanged = true</i>
   * @param {boolean} changes.hasChanged
   * @param {Element} domElement DOM Element
   * @memberof module:GUIManager
   */
  function buildGUI(scene, camera, changes, domElement) {
    sceneManager = scene;
    stackHelper = scene.stackHelper;
    let stack = scene.stackHelper._stack;
    let fusionUni = scene.uniforms.fusion;
    canvas = domElement;

    changePtr = changes;

    gui = new dat.GUI({
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

    stackFolder = gui.addFolder('Main image');
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
    let lutUpdate = stackFolder.add(
      stackHelper.slice.lut, 'lut', stackHelper.slice.lut.lutsAvailable()).name("Lut Color");
    lutUpdate.onChange(function(value) {
      stackHelper.slice.lutTexture = stackHelper.slice.lut.texture;
      changes.hasChanged = true;
    });
    /*    let lutDiscrete = stackFolder.add(stackHelper.slice.lut, 'discrete', false);
        lutDiscrete.onChange(function(value) {
          stackHelper.slice.lutTexture = stackHelper.slice.lut.texture;
          changes.hasChanged = true;
        });*/

    indexDOM = stackFolder.add(
      stackHelper, 'index', 0, stackHelper.orientationMaxIndex - 1).step(1).listen().onChange(_ => {
      changes.hasChanged = true;
    });
    stackFolder.open();

    buildFusionGUI(fusionUni);

    buildStructGUI();

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
    /*
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
        });*/
  }

  function buildFusionGUI(fusionUni) {
    // Fusion
    if (fusionUni) {
      let fusionFolder = gui.addFolder('Fusion');
      fusionFolder.add(sceneManager.uniformsMix.uFusionUse, 'value').name("show fusion").onChange(_ => {
        changePtr.hasChanged = true;
      });
      let lutUpdateFusion = fusionFolder.add(
        sceneManager.luts.fusion, 'lut', sceneManager.luts.fusion.lutsAvailable());
      lutUpdateFusion.onChange(function(value) {
        fusionUni.uTextureLUT.value = sceneManager.luts.fusion.texture;
        changePtr.hasChanged = true;
      });
      let thresholdFusion = fusionFolder.add(sceneManager.uniformsMix.uFusionThreshold, 'value', 0, 1).name("Threshold");
      thresholdFusion.onChange(function(value) {
        changePtr.hasChanged = true;
      });
      let opacityMinFusion = fusionFolder.add(sceneManager.uniformsMix.uFusionOpacityMin, 'value', 0, 1).name("Opacity min");
      opacityMinFusion.onChange(function(value) {
        changePtr.hasChanged = true;
      });
      let opacityMaxFusion = fusionFolder.add(sceneManager.uniformsMix.uFusionOpacityMax, 'value', 0, 1).name("Opacity max");
      opacityMaxFusion.onChange(function(value) {
        changePtr.hasChanged = true;
      });
      fusionFolder.open();

    }
  }


  function buildStructGUI() {

    for (let i = 0; i < sceneManager.uniformsMix.uStructTexturesCount.value; i++) {
      let temp = {
        drawn: true,
        filled: false,
        color: sceneManager.uniformsMix.uStructColors.value.slice(4 * i, 4 * i + 3).map((x) => { return 255*x;})
      };
      let structFolder = gui.addFolder('ROI ' + i);
      structFolder.add(temp, 'drawn').name("Display").listen().onChange(_ => {
        sceneManager.uniformsMix.uStructFilling.value[i] = temp.drawn ? (temp.filled ? 1 : 0) : -1;
        changePtr.hasChanged = true;
      });
      structFolder.add(temp, 'filled').name("Filled").onChange(_ => {
        sceneManager.uniformsMix.uStructFilling.value[i] = temp.filled ? 1 : 0;
        temp.drawn = true;
        changePtr.hasChanged = true;
      });
      structFolder.addColor(temp, 'color').name("Color").onChange(_ => {
        sceneManager.uniformsMix.uStructColors.value[4 * i] = temp.color[0] / 255.;
        sceneManager.uniformsMix.uStructColors.value[4 * i + 1] = temp.color[1] / 255.;
        sceneManager.uniformsMix.uStructColors.value[4 * i + 2] = temp.color[2] / 255. ;
        changePtr.hasChanged = true;
      });
      structFolder.add(sceneManager.uniformsMix.uStructColors.value, 4 * i + 3, 0, 1).name("Opacity").onChange(_ => {
        changePtr.hasChanged = true;
      });
    }
  }

  /**
   * Update the labels of each side, from the camera modality
   *
   * @param  {string[]} labels   a 1*6 array for existing directions
   * @param  {string} modality modality of the stack
   * @see AMI.Camera
   * @see AMI.Stack
   * @memberof module:GUIManager
   */
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

  /**
   * Update the displayed value of the prob, with the new values given
   *
   * @param  {Object} values object as <pre>
   *    {
   *       positionMM:[x,y,z],
   *       positionPX:[x,y,z],
   *       data:{
   *         background : value of the BG,
   *         fusion : value of the fusion...
   *        },
   *      }
   * </pre>
   * @param {Number[]} values.positionMM array of x,y,z cross' position in millimeters
   * @param {Number[]} values.positionPX array of x,y,z cross' position in pixels
   * @param {Object} values.data dictionnay of layers and their value under the cross
   * @param {Number} values.data.background the cross' value in the "background" layer", same goes with other layers
   * @param  {Object} info dictionnay of layers having the stacks information, including data units.
   * @param {String} info.background.unit the unit to associate with the value read in values.data.background, same goes with other layers
   * @memberof module:GUIManager
   */
  function updateProb(values, info) {
    let text = "";
    if (values.positionMM != null)
      text += round(values.positionMM.x) + " / " + round(values.positionMM.y) + " / " + round(values.positionMM.z) + " mm<br/>";
    if (values.positionPX != null)
      text += round(values.positionPX.x) + " / " + round(values.positionPX.y) + " / " + round(values.positionPX.z) + " px<br/>";
    text += "<br/>";
    for (let prop in values.data) {
      text += prop + " : " + round(values.data[prop]) + " " + info[prop].unit + " <br/>";
    }
    document.getElementById("data-prob").innerHTML = text;
  }

  /**
   * Move the green cross to a new position
   *
   * @param  {Object} cross  Object containing the DOM Elements of the cross
   * @param  {Element} cross.horizontal DOM element of the horizontal bar of the cross
   * @param  {Element} cross.vertical DOM element of the vertical bar of the cross
   * @param  {THREE.Vector2} coords mouse position relative to the DOM Element (in px)
   * @memberof module:GUIManager
   */
  function updateCross(cross, coords) {
    // update graphical cross
    cross.horizontal.style.top = coords.y + "px";
    cross.vertical.style.left = coords.x + "px";
  }

  /**
   * update the min-max index when changing the orientation
   * @memberof module:GUIManager
   */
  function updateIndex() {
    stackFolder.remove(indexDOM);
    indexDOM = stackFolder.add(
      stackHelper, 'index', 0, stackHelper.orientationMaxIndex - 1).step(1).listen().onChange(_ => {
      changePtr.hasChanged = true;
    });
  }

  function round(x) {
    return Math.round(x * 100) / 100;
  }

  return {
    buildGUI: buildGUI,
    updateLabels: updateLabels,
    updateProb: updateProb,
    updateCross: updateCross,
    updateIndex: updateIndex
  }
}

module.exports = f();
