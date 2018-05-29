const FusionShaderFrag = require('./shaders/shaders.layer.fragment');
const FusionShaderUni = require('./shaders/shaders.layer.uniform');
// Viewer config file
const config = require('./viewer.config');

export default class sceneManager {
  constructor(canvasElement) {
    let worldBB = [0, 0, 0, 0, 0, 0]; // xmin, xmax, ymin, ymax, zmin, zmax
    this.worldBB = worldBB;

    let canvas = canvasElement;

    let scenes = {
      background: null,
      fusion: null,
      overlay: null,
      struct: [],
    };

    let luts = {
      background: null,
      fusion: null,
      overlay: null,
      struct: [],
    }

    let textureTargets = {
      background: null,
      fusion: null,
      overlay: null,
      struct: [],
    }

    let meshes = {
      background: null,
      fusion: null,
      overlay: null,
      struct: [],
    }

    let translations = {
      background: null,
      fusion: null,
      overlay: null,
      struct: [],
    }

    let stackHelper;

    let uniformsMix;

    // mixing : sceneBG+sceneLayers[0] then scenesMix[i]+sceneLayers[i+1]
    // final mix is last element of scenesMix
    let sceneMix;
    let materialMix;
    let mesheMix;

    initBG();

    this.resize = function() {
      // background
      textureTargets["background"].setSize(canvas.clientWidth, canvas.clientHeight);
      // fusion
      if (textureTargets["fusion"] !== null)
        textureTargets["fusion"].setSize(canvas.clientWidth, canvas.clientHeight);
      // overlay
      if (textureTargets["overlay"] !== null)
        textureTargets["overlay"].setSize(canvas.clientWidth, canvas.clientHeight);
      // RT structs
      for (let text of textureTargets["struct"])
        text.setSize(canvas.clientWidth, canvas.clientHeight);

    }

    this.render = function(renderer, camera) {
      update(); // TODO ailleurs

      // background
      renderer.render(scenes["background"], camera, textureTargets["background"], true);
      // fusion
      if (textureTargets["fusion"] !== null)
        renderer.render(scenes["fusion"], camera, textureTargets["fusion"], true);
      // overlay
      if (textureTargets["overlay"] !== null)
        renderer.render(scenes["overlay"], camera, textureTargets["overlay"], true);
      // RT structs
      for (let i = 0; i < textureTargets["struct"].length; i++)
        renderer.render(scenes["struct"][i], camera, textureTargets["struct"][i], true);

      renderer.render(sceneMix, camera);
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
      stackHelper.slice.lut = luts["background"];
      stackHelper.slice.lutTexture = luts["background"].texture;
      // add it to its 3D scene
      scenes["background"].add(stackHelper);
      // Update the whole scene BB
      updateWorldBB(stackHelper._stack.worldBoundingBox());

      setMixLayer();
    }

    /**
     * Initializes the 3D scene for at least one image (the background), not knowing yet what this image is
     */
    function initBG() {
      // The 3D scene
      scenes["background"] = new THREE.Scene();
      // The LUT
      luts["background"] = new AMI.LutHelper('my-lut-canvases', 'default', 'linear', [
        [0, 0, 0, 0],
        [0, 1, 1, 1]
      ], [
        [0, 1],
        [1, 1]
      ]);
      luts["background"].luts = AMI.LutHelper.presetLuts();
      luts["background"].lut = "default";
      // Render to a (buffer) texture !
      textureTargets["background"] = new THREE.WebGLRenderTarget(canvas.clientWidth, canvas.clientHeight, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
      });
      textureTargets["background"].setSize(canvas.clientWidth, canvas.clientHeight);
    }

    /**
     *
     */
    this.addLayer = function(stack, stackname) {
      // Constructions
      let scene = new THREE.Scene();
      scenes[stackname] = scene;

      let lut = new AMI.LutHelper('my-lut-canvases', 'default', 'linear', [
        [0, 0, 0, 0],
        [1, 1, 1, 1]
      ], [
        [0, 0],
        [1, 1]
      ]);
      lut.luts = AMI.LutHelper.presetLuts();
      luts[stackname] = lut;
      lut.lut = "blue";

      let sceneTexture = new THREE.WebGLRenderTarget(canvas.clientWidth, canvas.clientHeight, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
      });
      sceneTexture.setSize(canvas.clientWidth, canvas.clientHeight);
      textureTargets[stackname] = sceneTexture;

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
      // we can only display positive values
      let offset = 0;
      if (stack._minMax[0] < 0) {
        offset -= stack._minMax[0];
      }
      uniformsLayer.uLowerUpperThreshold.value = [stack.minMax[0] + offset, stack.minMax[1] + offset];
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
      meshes[stackname] = meshLayer;
      // go the LPS space
      meshLayer.applyMatrix(stackHelper.stack._ijk2LPS);
      // Correct translation

      let translation = stackHelper._stack.worldCenter().clone();
      translation.sub(stack.worldCenter());
      meshLayer.translateX(translation.x);
      meshLayer.translateY(translation.y);
      meshLayer.translateZ(translation.z);
      translations[stackname] = translation;

      scene.add(meshLayer);
      // Update the whole scene BB
      updateWorldBB(stack.worldBoundingBox());

      updateMixUniforms();
    }

    function setMixLayer() {
      sceneMix = new THREE.Scene();

      uniformsMix = FusionShaderUni.default.uniforms();
      updateMixUniforms();
      // generate shaders on-demand!
      let fls = new FusionShaderFrag.default(uniformsMix);
      let vls = new AMI.LayerVertexShader();
      let mat = new THREE.ShaderMaterial({
        side: THREE.FrontSide,
        uniforms: uniformsMix,
        vertexShader: vls.compute(),
        fragmentShader: fls.compute(),
        transparent: true,
      });
      materialMix = mat;
      let mesh = new THREE.Mesh(stackHelper.slice.geometry, mat);
      mesheMix = mesh;
      // go the LPS space
      mesh.applyMatrix(stackHelper.stack._ijk2LPS);
      sceneMix.add(mesh);
      update();
    }

    function updateMixUniforms() {
      uniformsMix.uTextureBackground.value = textureTargets["background"].texture;
      // fusion
      if (textureTargets["fusion"] !== null)
        uniformsMix.uTextureFusion.value = textureTargets["fusion"].texture;
      // overlay
      if (textureTargets["overlay"] !== null)
        uniformsMix.uTextureOverlay.value = textureTargets["overlay"].texture;
      uniformsMix.uOpacityMin.value = 0.1;
      uniformsMix.uOpacityMax.value = 0.8;
      uniformsMix.uThreshold.value = 0.01;
    }

    function update() {
      function updateLayers() {
        // fusion
        if (textureTargets["fusion"] !== null) {
          meshes["fusion"].geometry.dispose();
          meshes["fusion"].geometry = stackHelper.slice.geometry;
          meshes["fusion"].geometry.verticesNeedUpdate = true;
        }
        // overlay
        if (textureTargets["overlay"] !== null) {
          meshes["overlay"].geometry.dispose();
          meshes["overlay"].geometry = stackHelper.slice.geometry;
          meshes["overlay"].geometry.verticesNeedUpdate = true;
        }
        // RT structs
        for (let mesh of meshes["struct"]) {
          mesh.geometry.dispose();
          mesh.geometry = stackHelper.slice.geometry;
          mesh.geometry.verticesNeedUpdate = true;
        }
      }

      function updateLayerMix() {
        sceneMix.remove(mesheMix);
        mesheMix.material.dispose();
        // meshLayerMix.material = null;
        mesheMix.geometry.dispose();
        // meshLayerMix.geometry = null;

        // add mesh in this scene with right shaders...
        mesheMix =
          new THREE.Mesh(stackHelper.slice.geometry, materialMix);
        // go the LPS space
        mesheMix.applyMatrix(stackHelper.stack._ijk2LPS);

        sceneMix.add(mesheMix);
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
