/* globals Stats, dat, AMI, THREE */
/**
 * This  module is the coordination between YAMI classes and modules. <br/>
 * If you use YAMI on your own project, you should probably write your own module instead of this one.
 *
 * @module Viewer
 *
 */

// Viewer config file
const config = require('./viewer.config');
// Managment of JSON request, and parsing
const requestManager = require('./requestManager');
// FPS managment
import animationManager from './animator';
// GUI managment
const guiManager = require('./guiManager');
// Controls
import CustomControls from './AMIv2/customControls';
// Scene Managment
import SceneManager from './sceneManager';
// Customization of AMI for slicing
import ModelsStack from './AMIv2/2DSlices/customStack';
// Customization of AMI for slicing
import StackHelper from './AMIv2/2DSlices/customStackHelper';

// standard global variables

let renderer; // @type {THREE.WebGLRenderer}
let canvas; // HTML container
let stats; // @type {Stats}

let sceneManager; // @type {sceneManager}
let animator;
      document.body.style.cursor = "wait";

let changePtr = { // a pointer to pass the "haschanged" value by reference
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
  animator = new animationManager();
  // canvas and THREE.js renderer
  canvas = document.getElementById('r3d');
  renderer = new THREE.WebGLRenderer({
    antialias: (config.interpolation == 1)
  });
  // set up the renderer
  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
  renderer.setClearColor(config.bgColor, config.bgAlpha);
  renderer.setPixelRatio(window.devicePixelRatio);
  // add this renderer to the canvas
  canvas.appendChild(renderer.domElement);
  // stats, fps, ...
  stats = new Stats();
  canvas.parentNode.insertBefore(stats.domElement, canvas);
  // empty scene
  sceneManager = new SceneManager(canvas);
  // camera
  camera = new AMI.OrthographicCamera(
    canvas.clientWidth / -2, canvas.clientWidth / 2,
    canvas.clientHeight / 2, canvas.clientHeight / -2,
    0.1, 10000);
}


/**
 * Our code begin on the "onload" function. We instanciate each needed objects to make YAMI works.
 */
window.onload = function() {
  // init threeJS and the scene
  init();

  // instantiate the loader
  // it loads and parses the images
  let loader = new AMI.VolumeLoader(canvas);
  // Reads the GET params, reads the JSON and load the files
  document.body.style.cursor = "wait";
  requestManager.readMultipleFiles(loader, handleSeries, handleError);


  /**
   * handleError - This function is called if requestManager encounters an error
   * @callback handleError
   * @global
   */
  function handleError() {
    canvas.innerHTML = "An error has occured.<br/>Check the JS console for more info.";
    document.body.style.cursor = "auto";
  }

  /**
   * handleSeries - This function is called after requestManager succeed. Visualize incoming data.
   *
   * @callback handleSeries
   * @global
   * @param  {Object} seriesContainer seriesContainer format : {image : [array of IMG], fusion : [array of IMG], ...}
   * @param  {Object} information     object containing other information contained in the input json.
   */
  function handleSeries(seriesContainer, information) {
  document.body.style.cursor = "auto";
    // cleanup the loader and its progress bar
    loader.free();
    loader = null;
    // write information on the page
    writeInformation(information);
    // prepare for slice visualization
    let stackList = {};

    // main image
    let stack = new ModelsStack();
    stack.copy_values(seriesContainer["image"][0].mergeSeries(seriesContainer["image"])[0].stack[0]);
    stackList["image"] = stack;
    // we add the "unit" attribute to the stacks
    stack.unit = information["image"].unit;
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
    if (seriesContainer["fusion"]) {
      let stackFusion = new ModelsStack();
      stackFusion.copy_values(seriesContainer["fusion"][0].mergeSeries(seriesContainer["fusion"])[0].stack[0]);
      stackFusion.unit = information["fusion"].unit;
      sceneManager.addLayerStack(stackFusion, "fusion");
      stackList["fusion"] = stackFusion;
      // Cleaning the imported (now useless) raw data
      cleanStack(stackFusion);
    }

    // struct
    for (let structNum in seriesContainer["struct"]) {
      let stackStruct = new ModelsStack();
      stackStruct.copy_values(seriesContainer["struct"][structNum][0].mergeSeries(seriesContainer["struct"][structNum])[0].stack[0]);
      // stackStruct.unit = information["struct"].unit;
      sceneManager.addLayerStack(stackStruct, "struct");
      if(stackList["structs"] == null)
        stackList["structs"] = [];
      stackList["structs"].push(stackStruct);
      // Cleaning the imported (now useless) raw data
      cleanStack(stackStruct);
    }

    // create the DOM Element of the cross
    createCross();

    // setup controls and shortcuts
    controls = new CustomControls(camera, sceneManager, stackHelper, stackList, canvas, changePtr);
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

    //Set the "Resize" listener
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
        stats.update();
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
  /**
   * onWindowResize - Handle window resize
   */
  function onWindowResize() {
    camera.canvas = {
      width: canvas.offsetWidth,
      height: canvas.offsetHeight,
    };
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    sceneManager.resize();
    changePtr.hasChanged = true;
  }
  /**
   * writeInformation - Handle general information
   */
  function writeInformation(jsonData) {
    document.getElementById("sub-title").innerHTML = "[" + jsonData.data.study + "] " + jsonData.data.patient;
    // iterate on sub properties
    for (let prop in jsonData.data) {
      if (jsonData.data.hasOwnProperty(prop)) { // check if it's a direct property as we expect
        let div = document.createElement('div');
        div.innerHTML = "<span class='data-label'>" + prop + "</span> : <span class='data-content'>" +
          jsonData.data[prop] + "</span>";
        document.getElementById("general-info-panel").appendChild(div);
      }
    }
  }

  /**
   * createCross - Create the Dom Elements of the cross
   */
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

};
