const FusionShaderFrag = require('./shaders/shaders.layer.fragment');
const FusionShaderUni = require('./shaders/shaders.layer.uniform');
// Viewer config file
const config = require('./viewer.config');

export default class sceneManager {
  constructor(canvasElement) {
    let worldBB = [0, 0, 0, 0, 0, 0]; // xmin, xmax, ymin, ymax, zmin, zmax
    this.worldBB = worldBB;

    let canvas = canvasElement;

    let stackHelper;

    let sceneBG; // @type {THREE.Scene}
    let lutBG;
    let sceneTextureBG;

    let sceneLayers = []; // @type {THREE.Scene}
    let lutLayers = [];
    let meshesLayers = [];
    let translationLayers = [];
    let sceneTextureLayers = [];

    // mixing : sceneBG+sceneLayers[0] then scenesMix[i]+sceneLayers[i+1]
    // final mix is last element of scenesMix
    let scenesMix = [];
    let materialsMix = [];
    let meshesMix = [];

    initBG();

    this.resize = function() {

      for (let i = 0; i < sceneTextureLayers.length; i++)
        sceneTextureLayers[i].setSize(canvas.clientWidth, canvas.clientHeight);
      sceneTextureBG.setSize(canvas.clientWidth, canvas.clientHeight);

    }

    this.render = function(renderer, camera) {
      update(); // TODO ailleurs
      // render background
      renderer.render(sceneBG, camera, sceneTextureBG, true); // last param is forceClear, it was at true, now testing with false
      // render layers on texture and mix between previous layer and this one
      for (let i = 0; i < sceneLayers.length - 1; i++) {
        renderer.render(sceneLayers[i], camera, sceneTextureLayers[i], true);
        renderer.render(scenesMix[i], camera, sceneTextureLayers[i], true);
      }

      renderer.render(sceneLayers[sceneLayers.length - 1], camera, sceneTextureLayers[sceneTextureLayers.length - 1], true);
      renderer.render(scenesMix[sceneLayers.length - 1], camera);
    }

    /*
     * Adds a stack to the scene and defines it as the main stack
     * @param {AMI.StackHelper} Main stackhelper containing the stack.
     */
    this.setMainStackHelper = function(stackHelperI) {
      // keep the main stack in memory
      stackHelper = stackHelperI;

      // some settings on this stack
      stackHelper.slice.intensityAuto = config.autoIntensity;
      stackHelper.slice.interpolation = config.interpolation;
      stackHelper.slice.lut = lutBG;
      stackHelper.slice.lutTexture = lutBG.texture;
      // add it to its 3D scene
      sceneBG.add(stackHelper);
      // Update the whole scene BB
      updateWorldBB(stackHelper._stack.worldBoundingBox());
    }

    /**
     * Initializes the 3D scene for at least one image (the background), not knowing yet what this image is
     */
    function initBG() {
      // The 3D scene
      sceneBG = new THREE.Scene();
      // The LUT
      lutBG = new AMI.LutHelper('my-lut-canvases', 'default', 'linear', [
        [0, 0, 0, 0],
        [0, 1, 1, 1]
      ], [
        [0, 1],
        [1, 1]
      ]);
      lutBG.luts = AMI.LutHelper.presetLuts();
      lutBG.lut = "default";
      // Render to a (buffer) texture !
      sceneTextureBG = new THREE.WebGLRenderTarget(canvas.clientWidth, canvas.clientHeight, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
      });
      sceneTextureBG.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    /**
     *
     */
    this.addLayer = function(stack) {
      // Constructions
      let scene = new THREE.Scene();
      sceneLayers.push(scene);

      let lut = new AMI.LutHelper('my-lut-canvases', 'default', 'linear', [
        [0, 0, 0, 0],
        [1, 1, 1, 1]
      ], [
        [0, 0],
        [1, 1]
      ]);
      lut.luts = AMI.LutHelper.presetLuts();
      lutLayers.push(lut);
      lut.lut = "blue";

      let sceneTexture = new THREE.WebGLRenderTarget(canvas.clientWidth, canvas.clientHeight, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
      });
      sceneTexture.setSize(canvas.clientWidth, canvas.clientHeight);

      sceneTextureLayers.push(sceneTexture);

      // Stack preparation
      stack.prepare();
      stack.pack();

      let texture = [];
      for (let m = 0; m < stack._rawData.length; m++) {
        let tex = new THREE.DataTexture(
          stack.rawData[m],
          stack.textureSize,
          stack.textureSize,
          stack.textureType,
          THREE.UnsignedByteType,
          THREE.UVMapping,
          THREE.ClampToEdgeWrapping,
          THREE.ClampToEdgeWrapping,
          THREE.NearestFilter,
          THREE.NearestFilter);
        tex.needsUpdate = true;
        tex.flipY = true;
        texture.push(tex);
      }

      // create material && mesh then add it to sceneLayers[i]
      let uniformsLayer = AMI.DataUniformShader.uniforms();
      uniformsLayer.uTextureSize.value = stack.textureSize;
      uniformsLayer.uTextureContainer.value = texture;
      uniformsLayer.uWorldToData.value = stack.lps2IJK;
      uniformsLayer.uNumberOfChannels.value = stack.numberOfChannels;
      uniformsLayer.uBitsAllocated.value = stack.bitsAllocated;
      uniformsLayer.uPackedPerPixel.value = stack.packedPerPixel;
      uniformsLayer.uWindowCenterWidth.value = [stack.windowCenter, stack.windowWidth];
      uniformsLayer.uRescaleSlopeIntercept.value = [stack.rescaleSlope, stack.rescaleIntercept];
      uniformsLayer.uDataDimensions.value = [stack.dimensionsIJK.x,
        stack.dimensionsIJK.y,
        stack.dimensionsIJK.z
      ];
      uniformsLayer.uInterpolation.value = config.interpolation;
      uniformsLayer.uLowerUpperThreshold.value = [...stack.minMax];
      uniformsLayer.uLut.value = 1;
      uniformsLayer.uTextureLUT.value = lut.texture;


      // generate shaders on-demand!
      let fs = new AMI.DataFragmentShader(uniformsLayer);
      let vs = new AMI.DataVertexShader();
      let materialLayer = new THREE.ShaderMaterial({
        side: THREE.FrontSide,
        uniforms: uniformsLayer,
        vertexShader: vs.compute(),
        fragmentShader: fs.compute(),
      });

      let meshLayer = new THREE.Mesh(stackHelper.slice.geometry, materialLayer);
      meshesLayers.push(meshLayer);
      // go the LPS space
      meshLayer.applyMatrix(stackHelper.stack._ijk2LPS);
      // Correct translation

      let translation = stackHelper._stack.worldCenter().clone();
      translation.sub(stack.worldCenter());
      translationLayers.push(translation);
      meshLayer.translateX(translation.x);
      meshLayer.translateY(translation.y);
      meshLayer.translateZ(translation.z);

      scene.add(meshLayer);
      // Update the whole scene BB
      updateWorldBB(stack.worldBoundingBox());

      addMixLayer(stack, stackHelper);
    }

    function addMixLayer(stack) {
      scenesMix.push(new THREE.Scene());

      // Create the Mix layer
      let uni = FusionShaderUni.default.uniforms();
      let i = sceneTextureLayers.length - 1;
      if (i === 0) {

        uni.uTextureBackground.value = sceneTextureBG.texture;
        uni.uTextureFusion.value = sceneTextureLayers[i].texture;
      } else {
        uni.uTextureBackground.value = sceneTextureLayers[i - 1].texture;
        uni.uTextureFusion.value = sceneTextureLayers[i].texture;
      }
      uni.uOpacityMin.value = 0.1;
      uni.uOpacityMax.value = 0.8;
      uni.uThreshold.value = 0.01;


      // generate shaders on-demand!
      let fls = new FusionShaderFrag.default(uni);
      //let fls = new AMI.LayerFragmentShader(uni);
      let vls = new AMI.LayerVertexShader();
      let mat = new THREE.ShaderMaterial({
        side: THREE.FrontSide,
        uniforms: uni,
        vertexShader: vls.compute(),
        fragmentShader: fls.compute(),
        transparent: true,
      });
      materialsMix.push(mat);
      let mesh = new THREE.Mesh(stackHelper.slice.geometry, mat);
      meshesMix.push(mesh);
      // go the LPS space
      mesh.applyMatrix(stackHelper.stack._ijk2LPS);
      scenesMix[scenesMix.length - 1].add(mesh);
      update();
    }

    function update() {
      function updateLayers() {
        // update layers geometry...
        for (let i = 0; i < meshesLayers.length; i++) {
          meshesLayers[i].geometry.dispose();
          meshesLayers[i].geometry = stackHelper.slice.geometry;
          meshesLayers[i].geometry.verticesNeedUpdate = true;
        }
      }

      function updateLayerMix() {
        // update layer1 geometry...
        for (let i = 0; i < meshesMix.length; i++) {
          scenesMix[i].remove(meshesMix[i]);
          meshesMix[i].material.dispose();
          // meshLayerMix.material = null;
          meshesMix[i].geometry.dispose();
          // meshLayerMix.geometry = null;

          // add mesh in this scene with right shaders...
          meshesMix[i] =
            new THREE.Mesh(stackHelper.slice.geometry, materialsMix[i]);
          // go the LPS space
          meshesMix[i].applyMatrix(stackHelper.stack._ijk2LPS);

          scenesMix[i].add(meshesMix[i]);
        }
      }
      updateLayers();
      updateLayerMix();
    }

    function updateWorldBB(otherBB) {
      for (let i = 0; i < worldBB.length; i++) {
        if (i % 2 == 0) { // we are on a min
          if (otherBB[i] < worldBB[i]) {
            worldBB[i] = otherBB[i];
          }
        } else { // we are on a max
          if (otherBB[i] > worldBB[i]) {
            worldBB[i] = otherBB[i];
          }
        }
      }
    }
  }

}
