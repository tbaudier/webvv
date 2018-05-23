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
const CustomControls = require('./customControls');

// standard global variables
let renderer; // @type {THREE.WebGLRenderer}
let canvas; // HTML container
let stats; // @type {Stats}

let scene; // @type {THREE.Scene}

let sceneLayer0; // @type {THREE.Scene}
let meshLayer0;
let sceneLayer0TextureRender;

let sceneLayer1; // @type {THREE.Scene}
let meshLayer1;
let sceneLayerTextureRender;

let sceneMix; // @type {THREE.Scene}
let meshMix;
let uniformsMix;
let materialMix;

let layer0 = {
  opacity: 1.0,
  lut: null,
  interpolation: 0,
};
let layer1 = {
  opacity: 1.0,
  lut: null,
  interpolation: 0,
};

let layerMix = {
  opacity0: 1.0,
  opacity1: 1.0,
  type0: 0,
  type1: 1,
  trackMouse: true,
};

let stackHelper; // @type {AMI.StackHelper}
let camera; // @type {THREE.OrthographicCamera}
let controls; // @type {AMI.TrackballOrthoControl}e;

let luitLayer0;

function init() {
  // renderer
  canvas = document.getElementById('r3d');
  renderer = new THREE.WebGLRenderer({
    antialias: (config.interpolation == 1),
  });

  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
  renderer.setClearColor(config.bgColor, 1);
  renderer.setPixelRatio(window.devicePixelRatio);
  canvas.appendChild(renderer.domElement);

  // stats
  stats = new Stats();
  canvas.appendChild(stats.domElement);

  // scene
  scene = new THREE.Scene();

  sceneLayer0 = new THREE.Scene();
  sceneLayer1 = new THREE.Scene();
  sceneMix = new THREE.Scene();

  // Texture render targets
  scene0TextureRender = new THREE.WebGLRenderTarget(canvas.clientWidth, canvas.clientHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
  });
  scene1TextureRender = new THREE.WebGLRenderTarget(canvas.clientWidth, canvas.clientHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
  });

  // CREATE LUT
  lutLayer0 = new AMI.LutHelper(
    'my-lut-canvases',
    'default',
    'linear', [
      [0, 0, 0, 0],
      [0, 1, 1, 1]
    ], [
      [0, 1],
      [1, 1]
    ]);
  lutLayer0.luts = AMI.LutHelper.presetLuts();

  // camera
  camera = new AMI.OrthographicCamera(
    canvas.clientWidth / -2, canvas.clientWidth / 2,
    canvas.clientHeight / 2, canvas.clientHeight / -2,
    0.1, 10000);
}

window.onload = function() {
  // init threeJS...
  init();

  // instantiate the loader
  // it loads and parses the dicom image
  let loader = new AMI.VolumeLoader(canvas);

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

    stackHelper = new AMI.StackHelper(stack);
    stackHelper.bbox.visible = false;
    stackHelper.borderColor = '#2196F3';
    stackHelper.border.visible = false;
    scene.add(stackHelper);
    //sceneLayer0.add(stackHelper);

    // Controls
    controls = new CustomControls.default(camera, stackHelper, canvas);
    camera.controls = controls;

    // set camera
    let worldbb = stack.worldBoundingBox();
    let lpsDims = new THREE.Vector3(
      (worldbb[1] - worldbb[0]) / 2,
      (worldbb[3] - worldbb[2]) / 2,
      (worldbb[5] - worldbb[4]) / 2
    );

    // box: {halfDimensions, center}
    let box = {
      center: stack.worldCenter().clone(),
      halfDimensions: new THREE.Vector3(lpsDims.x + 10, lpsDims.y + 10, lpsDims.z + 10),
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

    stackHelper.slice.intensityAuto = config.autoIntensity;
    stackHelper.slice.interpolation = config.interpolation;
    stackHelper.slice.lutTexture = lutLayer0.texture;

    guiManager.updateLabels(camera.directionsLabel, stack.modality);
    guiManager.buildGUI(stackHelper, camera);
    hookCallbacks();
  }

  /**
   * Connect all callback event observesrs
   */
  function hookCallbacks() {
    // Animation
    animationManager.startAnimating(config.fps,
      function() {
        controls.update();
        renderer.render(scene, camera);
        //renderer.render(sceneLayer0, camera, sceneLayer0TextureRender, true);
        //renderer.render(sceneLayer1, camera, sceneLayer1TextureRender, true);
        //renderer.render(sceneMix, camera);
        stats.update();
      });

    function updateLayer1() {
      // update layer1 geometry...
      if (meshLayer1) {
        meshLayer1.geometry.dispose();
        meshLayer1.geometry = stackHelper.slice.geometry;
        meshLayer1.geometry.verticesNeedUpdate = true;
      }
    }

    function updateLayerMix() {
      // update layer1 geometry...
      if (meshMix) {
        sceneMix.remove(meshMix);
        meshMix.material.dispose();
        // meshLayerMix.material = null;
        meshMix.geometry.dispose();
        // meshLayerMix.geometry = null;

        // add mesh in this scene with right shaders...
        meshMix =
          new THREE.Mesh(stackHelper.slice.geometry, materiaMix);
        // go the LPS space
        meshMix.applyMatrix(stackHelper.stack._ijk2LPS);

        sceneMix.add(meshMix);
      }
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
    }
    window.addEventListener('resize', onWindowResize, false);
    onWindowResize();
  }
};
