/* globals Stats, dat, AMI*/

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

let stackHelper; // @type {AMI.StackHelper}
let camera; // @type {THREE.OrthographicCamera}
let controls; // @type {AMI.TrackballOrthoControl}e;
let camera2;

function init() {
  // canvas and THREE.js renderer
  canvas = document.getElementById('r3d');
  renderer = new THREE.WebGLRenderer({
    antialias: (config.interpolation == 1),
    alpha: true
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
/*
  camera2 =
    new THREE.PerspectiveCamera(
      90, canvas.offsetWidth / canvas.offsetHeight,
      1, 10000000);
  camera2.position.x = 0;
  camera2.position.y = 0;
  camera2.position.z = -405;
  camera2.lookAt( new THREE.Vector3(0,0,-400) );
  console.log(camera2.position.z);
  let controls2 = new THREE.OrbitControls(camera2, canvas);*/
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
  function handleSeries(seriesContainer) {
    // cleanup the loader and its progress bar
    loader.free();
    loader = null;
    // prepare for slice visualization
    // first stack of first series
    let stack = seriesContainer["image"][0].mergeSeries(seriesContainer["image"])[0].stack[0];
    let stack1 = seriesContainer["fusion"][0].mergeSeries(seriesContainer["fusion"])[0].stack[0];
    // we create the main stackHelper (easy manipulation of stacks)
    stackHelper = new AMI.StackHelper(stack);
    stackHelper.bbox.visible = false;
    stackHelper.border.visible = false;

    // and add the stacks we have loaded to the 3D scene
    sceneManager.setMainStackHelper(stackHelper);
    // and add the stacks we have loaded to the 3D scene
    sceneManager.addLayerStack(stack1, "fusion");
    // setup controls and shortcuts
    controls = new CustomControls(camera, stackHelper, canvas, changePtr);
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
    guiManager.buildGUI(stackHelper, camera, changePtr);

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
};
