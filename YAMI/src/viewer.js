/* globals Stats, dat, AMI, THREE */

// Viewer config file
const config = require('./viewer.config');
// Managment of JSON request, and parsing
const requestManager = require('./requestManager');
// FPS managment
const animationManager = require('./animator');
// GUI managment
const guiManager = require('./guiManager');
// Controls
import CustomControls from './customControls';
// Scene Managment
import SceneManager from './sceneManager';

// standard global variables
let renderer; // @type {THREE.WebGLRenderer}
let canvas; // HTML container
let stats; // @type {Stats}

let sceneManager; // @type {sceneManager}

let changePtr = { // a pointer to pass the "haschanged" value by reference
  hasChanged: true
};

let camera; // @type {THREE.OrthographicCamera}
let controls; // @type {AMI.TrackballOrthoControl};

let cross = {
  vertical: null,
  horizontal: null
};

function init() {
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

window.onload = function() {
  // init threeJS and the scene
  init();

  // instantiate the loader
  // it loads and parses the images
  let loader = new AMI.VolumeLoader(canvas);
  // Reads the GET params, reads the JSON and load the files
  requestManager.readMultipleFiles(loader, handleSeries);

  /**
   * Visualize incoming data
   */
  function handleSeries(seriesContainer, information) {
    // cleanup the loader and its progress bar
    loader.free();
    loader = null;
    // write information on the page
    writeInformation(information);
    // prepare for slice visualization
    // first stack of first series
    let stack = seriesContainer["image"][0].mergeSeries(seriesContainer["image"])[0].stack[0];
    let stackFusion;
    // we add the "unit" attribute to the stacks
    stack.unit = information["image"].unit;
    // we create the main stackHelper (easy manipulation of stacks)
    let stackHelper = new AMI.StackHelper(stack);
    stackHelper.bbox.visible = false;
    stackHelper.border.visible = false;

    // and add the stacks we have loaded to the 3D scene
    sceneManager.setMainStackHelper(stackHelper);
    // and add the stacks we have loaded to the 3D scene
    if (seriesContainer["fusion"]) {
      stackFusion = seriesContainer["fusion"][0].mergeSeries(seriesContainer["fusion"])[0].stack[0];
      stackFusion.unit = information["fusion"].unit;
      sceneManager.addLayerStack(stackFusion, "fusion");
    }

    // Cleaning the imported (now useless) raw data
    stack._rawData = null;
    stackFusion._rawData = null;
    stack._frame = null;
    stackFusion._frame = null;

    createCross();

    // setup controls and shortcuts
    controls = new CustomControls(camera, stackHelper, cross, canvas, changePtr);
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
    camera.update();
    camera.fitBox(2); // here 2 means 'best of width & height' (0 'width', 1 'height')

    guiManager.updateLabels(camera.directionsLabel, stack.modality);
    guiManager.buildGUI(sceneManager, camera, changePtr);

    //Set the "Resize" listener
    window.addEventListener('resize', onWindowResize, false);
    onWindowResize();

    // And start animating
    animationManager.startAnimating(config.fps,
      function() {
        controls.update();
        if (changePtr.hasChanged) {
          sceneManager.render(renderer, camera);
          changePtr.hasChanged = false;
        }
        stats.update();
      });
  }
  /**
   * Handle window resize
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
   * Handle general information
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
