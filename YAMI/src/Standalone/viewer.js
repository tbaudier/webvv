/* globals dat, AMI, THREE */
/**
 * This  module is the coordination between YAMI classes and modules. <br/>
 * If you use YAMI on your own project, you should probably write your own module instead of this one.
 *
 * @module Viewer
 *
 */

// Viewer config file
const config = require('../viewer.config');
// Manager for request from local files
const requestManager = require('./localRequestManager');
// FPS managment
import animationManager from '../animator';
// GUI managment
const guiManager = require('../guiManager');
// Controls
import CustomControls from '../AMIv2/customControls';
// Scene Managment
import SceneManager from '../sceneManager';
// Customization of AMI for slicing
import ModelsStack from '../AMIv2/2DSlices/customStack';
// Customization of AMI for slicing
import StackHelper from '../AMIv2/2DSlices/customStackHelper';

// standard global variables

let renderer; // @type {THREE.WebGLRenderer}
let canvas; // HTML container

let sceneManager; // @type {sceneManager}
let animator;

let changePtr = { // a pointer to pass the 'haschanged' value by reference
  hasChanged: true
};

let camera; // @type {THREE.OrthographicCamera}
let controls; // @type {AMI.TrackballOrthoControl};

/**
 * Dom Elements of the cross
 * @private
 */
let cross = {
  vertical: null,
  horizontal: null
};

/**
 * init - Basic first part of initialization
 * @private
 */
function init() {
  let ua = window.navigator.userAgent;
  if (ua.indexOf('MSIE ') > 0 || ua.indexOf('Trident/') > 0 || ua.indexOf('Edge/') > 0) {
    alert('Notice : this website may encounter problems under Internet Explorer and Edge. If it doesn\'t load, try using another browser.');
  }

  animator = new animationManager();
  // canvas and THREE.js renderer
  canvas = document.getElementById('r3d');
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: (config.interpolation == 1)
  });
  // set up the renderer
  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
  renderer.setClearColor(config.bgColor, config.bgAlpha);
  renderer.setPixelRatio(window.devicePixelRatio);
  // add this renderer to the canvas
  canvas.appendChild(renderer.domElement);
  // empty scene
  sceneManager = new SceneManager(canvas);
  // camera
  camera = new AMI.OrthographicCamera(
    canvas.clientWidth / -2, canvas.clientWidth / 2,
    canvas.clientHeight / 2, canvas.clientHeight / -2,
    0.1, 10000);

  document.getElementById('validate-input-settings').addEventListener('click', validateInputSettings);
}

function validateInputSettings(evt) {
  let files = {};
  let information = {};
  let roi_count = document.getElementById('ROI_count').value;

  if (document.getElementById('bg-files').files.length > 0) {
    files['image'] = [];
    for (let i = 0; i < document.getElementById('bg-files').files.length; ++i)
      files['image'].push(document.getElementById('bg-files').files[i]);
    information['image'] = {
      unit: document.getElementById('bg-units').value
    };
  } else {
    alert('No background image has been found');
    return;
  }

  if (document.getElementById('fusion-files').files.length > 0) {
    files['fusion'] = [];
    for (let i = 0; i < document.getElementById('fusion-files').files.length; ++i)
      files['fusion'].push(document.getElementById('fusion-files').files[i]);
    information['fusion'] = {
      unit: document.getElementById('fusion-units').value
    };
  }

  if (document.getElementById('overlay-files').files.length > 0) {
    files['overlay'] = [];
    for (let i = 0; i < document.getElementById('overlay-files').files.length; ++i)
      files['overlay'].push(document.getElementById('overlay-files').files[i]);
    information['overlay'] = {
      unit: document.getElementById('overlay-units').value
    };
  }

  if (roi_count > 0) {
    files['struct'] = [];
    information['struct'] = {
      names: []
    };
    for (let i = 0; i < roi_count; ++i) {
      files['struct'].push([]);
      for (let j = 0; j < document.getElementById(`roi${i}-files`).files.length; ++j)
        files['struct'][i].push(document.getElementById(`roi${i}-files`).files[j]);
      information['struct']['names'][i] = document.getElementById(`roi${i}-name`).value;
    }
  }
  // call the new request manager
  load(files, information);

  // cleanup
  document.getElementById('validate-input-settings').removeEventListener('click', validateInputSettings);
  let form = document.getElementById('settings');
  form.parentNode.removeChild(form);
}

/** Our code begin on the 'onload' function. We instanciate each needed objects to make YAMI works. */
window.onload = function() {
  // init threeJS and the scene
  init();
}

function load(files, information) {
  if (information['struct'])
    changeIdenticalString(information['struct']['names']);
  // instantiate the loader
  // it loads and parses the images
  let loader = new AMI.VolumeLoader(canvas);
  // delete blue parsing bar
  delete loader._progressBar._modes.parse;
  loader._progressBar.free(); // and rebuild it
  loader._progressBar.init();
  // Reads the GET params, reads the JSON and load the files
  document.body.style.cursor = 'wait'; // display 'busy' cursor
  requestManager.readMultipleFiles(loader, files, handleSeries, handleError);

  /**
   * handleError - This function is called if requestManager encounters an error
   * @callback handleError
   * @global
   */
  function handleError() {
    canvas.innerHTML = 'An error has occured.<br/>Check the JS console for more info.';
    document.body.style.cursor = 'auto'; // restore classic cursor
  }

  /**
   * handleSeries - This function is called after requestManager succeed. Visualize incoming data.
   *
   * @callback handleSeries
   * @global
   * @param  {Object} seriesContainer   seriesContainer format : {image : [array of IMG], fusion : [array of IMG], ...}<br>Generated by the Request Manager
   * @param  {Stack[]} seriesContainer.image    array of created stack for background image (the array dimension is the time, not used here)
   * @param  {Stack[]} [seriesContainer.fusion] array of created stack for fusion image (the array dimension is the time, not used here). Optionnal
   * @param  {Stack[]} [seriesContainer.overlay]  array of created stack for overylay image (the array dimension is the time, not used here). Optionnal
   * @param  {Stack[][]} seriesContainer.struct   array of (array of created stacks) for struct image (the array dimension is the number of structs, the dimension of sub-arrays is the time, not used here).
   */
  function handleSeries(seriesContainer) {
    document.body.style.cursor = 'auto'; // restore classic cursor
    // cleanup the loader and its progress bar
    loader.free();
    loader = null;
    // prepare for slice visualization
    let stackList = {};

    // main image
    let stack = new ModelsStack();
    stack.copy_values(seriesContainer['image'][0].mergeSeries(seriesContainer['image'])[0].stack[0]);
    stackList['image'] = stack;
    // we add the 'unit' attribute to the stacks
    stack.unit = information['image'].unit;
    // we create the main stackHelper (easy manipulation of stacks)
    let stackHelper = new StackHelper(stack);
    stackHelper.bbox.visible = false;
    stackHelper.border.visible = false;
    // Cleaning the imported (now useless) raw data
    cleanStack(stack);

    // and add the stacks we have loaded to the 3D scene
    sceneManager.setMainStackHelper(stackHelper);
    // and add the stacks we have loaded to the 3D scene

    // fusion
    if (seriesContainer['fusion']) {
      let stackFusion = new ModelsStack();
      stackFusion.copy_values(seriesContainer['fusion'][0].mergeSeries(seriesContainer['fusion'])[0].stack[0]);
      stackFusion.unit = information['fusion'].unit;
      sceneManager.addLayerStack(stackFusion, 'fusion');
      stackList['fusion'] = stackFusion;
      // Cleaning the imported (now useless) raw data
      cleanStack(stackFusion);
    }

    // overlay
    if (seriesContainer['overlay']) {
      let stackOver = new ModelsStack();
      stackOver.copy_values(seriesContainer['overlay'][0].mergeSeries(seriesContainer['overlay'])[0].stack[0]);
      stackOver.unit = information['overlay'].unit;
      sceneManager.addLayerStack(stackOver, 'overlay');
      stackList['overlay'] = stackOver;
      // Cleaning the imported (now useless) raw data
      cleanStack(stackOver);
    }

    // struct
    for (let structNum in seriesContainer['struct']) {
      let stackStruct = new ModelsStack();
      stackStruct.copy_values(seriesContainer['struct'][structNum][0].mergeSeries(seriesContainer['struct'][structNum])[0].stack[0]);
      stackStruct.name = information["struct"]["names"][structNum];
      sceneManager.addLayerStack(stackStruct, 'struct');
      if (stackList['structs'] == null)
        stackList['structs'] = [];
      stackList['structs'].push(stackStruct);
      // Cleaning the imported (now useless) raw data
      cleanStack(stackStruct);
    }

    // create the DOM Element of the cross
    createCross();

    // setup controls and shortcuts
    controls = new CustomControls(camera, sceneManager, stackHelper, stackList, canvas, information, changePtr);
    camera.controls = controls;

    // setup camera
    let worldbb = sceneManager.worldBB;
    let lpsDims = new THREE.Vector3(
      (worldbb[1] - worldbb[0]) / 2,
      (worldbb[3] - worldbb[2]) / 2,
      (worldbb[5] - worldbb[4]) / 2
    );
    // box: {halfDimensions, center}
    let box = {
      center: stack.worldCenter().clone(),
      halfDimensions: new THREE.Vector3(lpsDims.x + 100, lpsDims.y + 100, lpsDims.z + 100),
    };
    // init and zoom
    let canvasConfig = {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    };
    camera.directions = [stack.xCosine, stack.yCosine, stack.zCosine];
    camera.box = box;
    camera.canvas = canvasConfig;
    camera.orientation = 'axial';
    camera.update();
    camera.fitBox(2); // here 2 means 'best of width & height' (0 'width', 1 'height')
    stackHelper.orientation = camera.stackOrientation;

    // set the camera and other status as default (go back to this when press R)
    controls.setAsResetState();

    guiManager.updateLabels(camera.directionsLabel, stack.modality);
    guiManager.buildGUI(sceneManager, camera, changePtr, canvas, information);

    //Set the 'Resize' listener
    window.addEventListener('resize', onWindowResize, false);
    onWindowResize();

    // And start animating
    animator.startAnimating(config.fps,
      function() {
        if (changePtr.hasChanged) {
          sceneManager.update();
          sceneManager.render(renderer, camera);
          controls.update();
          guiManager.updateCross(cross, controls._mouse);
          guiManager.updateProb(controls.values);
          changePtr.hasChanged = false;
        }
      });
  }

  /**
   * cleanStack - clean useless data in a stack, to avoid overused memory
   *
   * @param  {AMI.Stack} aStack stack to clean
   */
  function cleanStack(aStack) {
    aStack._rawData = null;

    // we cannot clean _frame for the moment... needed to read the prob value...
    //aStack._frame = null;
  }
  /** onWindowResize - Handle window resize */
  function onWindowResize() {
    camera.canvas = {
      width: canvas.offsetWidth,
      height: canvas.offsetHeight,
    };
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    sceneManager.resize();
    changePtr.hasChanged = true;
  }
  /** writeInformation - Takes the data information and writes it to the user
   *
   * @param  {Object} jsonData information as returned by SceneManager, check Global/handleSeries's documentation to see its format
   * {@link handleSeries}
   */

  /** createCross - Create the Dom Elements of the cross */
  function createCross() {
    cross.horizontal = document.createElement('div');
    cross.horizontal.style.borderTop = '1px solid';
    cross.horizontal.style.borderColor = config.crossColor;
    cross.horizontal.style.position = 'absolute';
    cross.horizontal.style.top = '50%';
    cross.horizontal.style.width = '100%';
    cross.horizontal.style.height = '0px';

    cross.vertical = document.createElement('div');
    cross.vertical.style.borderLeft = '1px solid';
    cross.vertical.style.borderColor = config.crossColor;
    cross.vertical.style.position = 'absolute';
    cross.vertical.style.left = '50%';
    cross.vertical.style.width = '0px';
    cross.vertical.style.height = '100%';

    canvas.appendChild(cross.horizontal);
    canvas.appendChild(cross.vertical);
  }

  function changeIdenticalString(arrayOfStrings) {
    for (let i = 0; i < arrayOfStrings.length; ++i) {
      for (let j = 0; j < i; j++) {
        while (arrayOfStrings[i] == arrayOfStrings[j])
          arrayOfStrings[i] += '_';
      }
    }
  }

};
