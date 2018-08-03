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
  let information;
  let roiDOMs = [];
  let stackHelper;
  let sceneManager;
  let stackFolder;
  let structGUIStatus = [];

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
  function buildGUI(scene, camera, changes, domElement, info) {
    sceneManager = scene;
    stackHelper = scene.stackHelper;
    let stack = scene.stackHelper._stack;
    let fusionUni = scene.uniforms.fusion;
    let overlayUni = scene.uniforms.overlay;
    information = info;
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

    stackFolder.add(stackHelper.slice, 'windowWidth', 1, stack.minMax[1] - stack.minMax[0])
      .listen()
      .onChange((value) => {
        windowPreset.window = 'Custom';
        changes.hasChanged = true;
      });

    stackFolder.add(stackHelper.slice, 'windowCenter', stack.minMax[0], stack.minMax[1])
      .listen().onChange(_ => {
        windowPreset.window = 'Custom';
        changes.hasChanged = true;
      });

    stackFolder.add(stackHelper.slice, 'invert')
      .onChange(_ => {
        changes.hasChanged = true;
      });
    //stackFolder.add(stackHelper.slice, 'interpolation', { No:0, Yes:1}).listen();
    //stackFolder.add(stackHelper.slice, 'interpolation', 0, 1).step(1).listen();
    stackFolder.add(windowPreset, 'window', lutWindowManager.listPresets())
      .listen()
      .onChange(function(value) {
        if (value === "Custom") return;
        let preset = lutWindowManager.getPresetValue(windowPreset.window);
        stackHelper.slice.windowWidth = preset[0];
        stackHelper.slice.windowCenter = preset[1];
        changes.hasChanged = true;
      });

    stackFolder.add(stackHelper.slice.lut, 'lut', stackHelper.slice.lut.lutsAvailable())
      .name("Lut Color")
      .onChange(function(value) {
        stackHelper.slice.lutTexture = stackHelper.slice.lut.texture;
        changes.hasChanged = true;
      });

    indexDOM = stackFolder.add(stackHelper, 'index', 0, stackHelper.orientationMaxIndex - 1)
      .step(1)
      .listen()
      .onChange(_ => {
        sceneManager.updateActiveSlices();
        changes.hasChanged = true;
      });
    stackFolder.open();

    buildFusionGUI(fusionUni);

    buildOverlayGUI(overlayUni);

    // camera
    let cameraFolder = gui.addFolder('Camera');
    cameraFolder.add(camUtils, 'invertRows')
      .onChange(function() {
        camera.invertRows();
        updateLabels(camera.directionsLabel, stack.modality);
        changes.hasChanged = true;
      });

    cameraFolder.add(camUtils, 'invertColumns')
      .onChange(function() {
        camera.invertColumns();
        updateLabels(camera.directionsLabel, stack.modality);
        changes.hasChanged = true;
      });

    cameraFolder.add(camera, 'angle', 0, 360)
      .step(1)
      .listen()
      .onChange(function() {
        updateLabels(camera.directionsLabel, stack.modality);
        changes.hasChanged = true;
      });

    buildStructGUI();
  }

  function buildFusionGUI(fusionUni) {
    // Fusion
    if (fusionUni) {
      document.getElementById("panel-register").removeAttribute("hidden");

      let fusionFolder = gui.addFolder('Fusion');

      fusionFolder.add(sceneManager.uniformsMix.uFusionUse, 'value')
        .name("show fusion")
        .onChange(_ => {
          changePtr.hasChanged = true;
        });

      fusionFolder.add(fusionUni.uWindowCenterWidth.value, 1, 1, fusionUni.uLowerUpperThreshold.value[1] - fusionUni.uLowerUpperThreshold.value[0])
        .name("Window width")
        .listen()
        .onChange((value) => {
          changePtr.hasChanged = true;
        });

      fusionFolder.add(fusionUni.uWindowCenterWidth.value, 0, fusionUni.uLowerUpperThreshold.value[0], fusionUni.uLowerUpperThreshold.value[1])
        .name("Window center")
        .listen()
        .onChange(_ => {
          changePtr.hasChanged = true;
        });

      fusionFolder.add(sceneManager.luts.fusion, 'lut', sceneManager.luts.fusion.lutsAvailable())
        .onChange(function(value) {
          fusionUni.uTextureLUT.value = sceneManager.luts.fusion.texture;
          changePtr.hasChanged = true;
        });
      fusionFolder.add(sceneManager.uniformsMix.uFusionThreshold, 'value', 0, 1)
        .name("Threshold")
        .onChange(function(value) {
          changePtr.hasChanged = true;
        });
      fusionFolder.add(sceneManager.uniformsMix.uFusionOpacityMin, 'value', 0, 1)
        .name("Opacity min")
        .onChange(function(value) {
          changePtr.hasChanged = true;
        });
      fusionFolder.add(sceneManager.uniformsMix.uFusionOpacityMax, 'value', 0, 1)
        .name("Opacity max")
        .onChange(function(value) {
          changePtr.hasChanged = true;
        });
      fusionFolder.open();

    }
  }

  function buildOverlayGUI(overlayUni) {
    // Overlay
    if (overlayUni) {
      document.getElementById("panel-register").removeAttribute("hidden");

      let overlayFolder = gui.addFolder('Overlay');
      let windowHelper = {
        center: overlayUni.uWindowCenterWidth.value[0] - overlayUni.uWindowCenterWidth.offset,
        offset: overlayUni.uWindowCenterWidth.offset,
        hue: 120,
      };

      overlayFolder.add(sceneManager.uniformsMix.uOverlayUse, 'value')
        .name("Show overlay")
        .onChange(_ => {
          changePtr.hasChanged = true;
        });

      overlayFolder.add(sceneManager.uniformsMix.uOverlayCrossMode, 'value')
        .name("Alternative display ")
        .onChange((value) => {
          if (value)
            hue.domElement.setAttribute('hidden', 'hidden');
          else
            hue.domElement.removeAttribute('hidden');
          changePtr.hasChanged = true;
        });

      let hue = overlayFolder.add(windowHelper, 'hue', 0, 359)
        .name("Hue")
        .onChange((value) => {
          sceneManager.uniformsMix.uOverlayHue.value = windowHelper.hue / 360;
          changePtr.hasChanged = true;
        });
      if (sceneManager.uniformsMix.uOverlayCrossMode.value)
        hue.domElement.setAttribute('hidden', 'hidden');
      else
        hue.domElement.removeAttribute('hidden');

      let windowW = overlayFolder.add(overlayUni.uWindowCenterWidth.value, 1, 1, overlayUni.uLowerUpperThreshold.value[1] - overlayUni.uLowerUpperThreshold.value[0])
        .name("Window width")
        .onChange((value) => {
          changePtr.hasChanged = true;
        });

      let windowC = overlayFolder.add(windowHelper, 'center', overlayUni.uLowerUpperThreshold.value[0] - windowHelper.offset, overlayUni.uLowerUpperThreshold.value[1] - windowHelper.offset)
        .name("Window center")
        .onChange(_ => {
          overlayUni.uWindowCenterWidth.value[0] = windowHelper.center + windowHelper.offset;
          changePtr.hasChanged = true;
        });

      let btn = {
        CopyWindow: function() {
          overlayUni.uWindowCenterWidth.value[1] = stackHelper.slice.windowWidth;
          windowHelper.center = stackHelper.slice.windowCenter;
          overlayUni.uWindowCenterWidth.value[0] = windowHelper.center + windowHelper.offset;
          windowW.updateDisplay();
          windowC.updateDisplay();
          changePtr.hasChanged = true;
        }
      };
      overlayFolder.add(btn, 'CopyWindow').name("Copy from");

      overlayFolder.open();

    }
  }

  function buildStructGUI() {

    for (let i = sceneManager.uniformsMix.uStructTexturesCount.value - 1, j = 0; i >= 0; --i, ++j) {
      let temp;
      if (structGUIStatus.length > j) {
        temp = structGUIStatus[j];
      } else {
        temp = {
          closed: true,
          drawn: true,
          filled: false,
          color: sceneManager.uniformsMix.uStructColors.value.slice(4 * i, 4 * i + 3).map((x) => {
            return 255 * x;
          }),
        };
        structGUIStatus[j] = temp;
      }
      let structFolder = gui.addFolder("ROI : " + information["struct"]["names"][i]);

      structFolder.add(temp, 'drawn')
        .name("Display")
        .listen()
        .onChange(_ => {
          sceneManager.uniformsMix.uStructFilling.value[i] = temp.drawn ? (temp.filled ? 1 : 0) : -1;
          sceneManager.updateMixShaderSoft();
          changePtr.hasChanged = true;
        });
      structFolder.add(temp, 'filled')
        .name("Filled")
        .onChange(_ => {
          sceneManager.uniformsMix.uStructFilling.value[i] = temp.filled ? 1 : 0;
          temp.drawn = true;
          sceneManager.updateMixShaderSoft();
          changePtr.hasChanged = true;
        });
      structFolder.addColor(temp, 'color')
        .name("Color")
        .onChange(_ => {
          sceneManager.uniformsMix.uStructColors.value[4 * i] = temp.color[0] / 255.;
          sceneManager.uniformsMix.uStructColors.value[4 * i + 1] = temp.color[1] / 255.;
          sceneManager.uniformsMix.uStructColors.value[4 * i + 2] = temp.color[2] / 255.;
          changePtr.hasChanged = true;
        });
      structFolder.add(sceneManager.uniformsMix.uStructColors.value, 4 * i + 3, 0, 1)
        .name("Opacity")
        .onChange(_ => {
          changePtr.hasChanged = true;
        });
      let btn = {
        Forward: function() {
          sceneManager.swapLayerROI(i, true);
          saveClosedStructs();
          swapInfoROI(i, j, true);
          changePtr.hasChanged = true;
          updateStruct()
        },
        Backward: function() {
          sceneManager.swapLayerROI(i, false);
          saveClosedStructs();
          swapInfoROI(i, j, false);
          changePtr.hasChanged = true;
          updateStruct()
        }
      };
      if (i != sceneManager.uniformsMix.uStructTexturesCount.value - 1)
        structFolder.add(btn, 'Forward').name("Forward ↑");
      if (i != 0)
        structFolder.add(btn, 'Backward').name("Backward ↓");;
      roiDOMs[j] = structFolder;
      if (!temp.closed)
        structFolder.open();
    }
  }

  function swapInfoROI(indexToMove, invertedIndex, isUpward) {
    let i1 = indexToMove;
    let i2 = isUpward ? (i1 + 1) : (i1 - 1);
    let ii1 = invertedIndex;
    let ii2 = isUpward ? (ii1 - 1) : (ii1 + 1);

    let temp = information["struct"]["names"][i1];
    information["struct"]["names"][i1] = information["struct"]["names"][i2];
    information["struct"]["names"][i2] = temp;

    let temp2 = structGUIStatus[ii1];
    structGUIStatus[ii1] = structGUIStatus[ii2];
    structGUIStatus[ii2] = temp2;
  }

  function saveClosedStructs() {
    for (let i = 0; i < roiDOMs.length; i++) {
      structGUIStatus[i].closed = roiDOMs[i].closed;
    }
  }

  function updateStruct() {
    for (let i = 0; i < roiDOMs.length; i++) {
      gui.removeFolder(roiDOMs[i]);
    }
    buildStructGUI();
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
   * @memberof module:GUIManager
   */
  function updateProb(values) {
    let text = "";
    if (values.positionMM != null)
      text += round(values.positionMM.x) + " / " + round(values.positionMM.y) + " / " + round(values.positionMM.z) + " mm<br/>";
    if (values.positionPX != null)
      text += round(values.positionPX.x) + " / " + round(values.positionPX.y) + " / " + round(values.positionPX.z) + " px<br/>";
    text += "<br/>";
    for (let prop in values.data) {
      text += prop + " : " + roundSci(values.data[prop]) + " " + information[prop].unit + " <br/>";
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
      sceneManager.updateActiveSlices();
      changePtr.hasChanged = true;
    });
  }

  function updateRegistration(translation) {
    document.getElementById("register_x").value = translation.x;
    document.getElementById("register_y").value = translation.y;
    document.getElementById("register_z").value = translation.z;
  }

  function round(x) {
    return Math.round(x * 100) / 100;
  }

  function roundSci(x) {
    if ((x < 9999 && x > 0.1) || x == 0 || (x > -9999 && x < -0.1))
      return Math.round(x * 1000) / 1000;
    else
      return x.toExponential(3);
  }

  return {
    buildGUI: buildGUI,
    updateLabels: updateLabels,
    updateProb: updateProb,
    updateCross: updateCross,
    updateIndex: updateIndex,
    updateStruct: updateStruct,
    updateRegistration: updateRegistration
  }
}

module.exports = f();
