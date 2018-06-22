import FusionShaderFrag from './shaders/shaders.layer.fragment';
import FusionShaderUni from './shaders/shaders.layer.uniform';
import LutHelper from './customLutHelper';
// Viewer config file
const config = require('./viewer.config');

export default class sceneManager {
  constructor(canvasElement) {
    let worldBB = [0, 0, 0, 0, 0, 0]; // xmin, xmax, ymin, ymax, zmin, zmax

    let _this = this;

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

    this.worldBB = worldBB;
    this.uniforms = {};
    this.stackHelper;
    this.luts = luts;
    this.uniformsMix;


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
      _this.stackHelper = stackHelperI;

      // some settings on this stack
      stackHelperI.slice.intensityAuto = config.autoIntensity;
      stackHelperI.slice.interpolation = config.interpolation;
      stackHelperI.slice.lut = luts["background"];
      stackHelperI.slice.lutTexture = luts["background"].texture;
      stackHelperI.slice._uniforms.uWindowCenterWidth.unit = stackHelperI._stack.unit; // this is not in AMI class, used for display
      if (stackHelperI._stack._minMax[0] < 0) {
        stackHelperI.slice._uniforms.uWindowCenterWidth["offset"] = -stackHelperI._stack._minMax[0];
      }

      _this.uniforms["background"] = stackHelperI.slice._uniforms;

      meshes["background"] = stackHelperI;
      // add it to its 3D scene
      scenes["background"].add(stackHelperI);
      // Update the whole scene BB
      updateWorldBB(stackHelperI._stack.worldBoundingBox());

      setMixLayer();
    }

    /**
     * Initializes the 3D scene for at least one image (the background), not knowing yet what this image is
     */
    function initBG() {
      // The 3D scene
      scenes["background"] = new THREE.Scene();
      // The LUT
      luts["background"] = new LutHelper('my-lut-canvases', 'default', 'linear', [
        [0, 0, 0, 0],
        [0, 1, 1, 1]
      ], [
        [0, 1],
        [1, 1]
      ]);
      luts["background"].luts = LutHelper.presetLuts();
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
    this.addLayerStack = function(stack, stackname) {
      if (!(stackname == "fusion" || stackname == "overlay"))
        return;
      // Constructions
      let scene = new THREE.Scene();
      scenes[stackname] = scene;

      let lut = new LutHelper('my-lut-canvases', 'default', 'linear', [
        [0, 0, 0, 0],
        [1, 1, 1, 1]
      ], [
        [0, 0],
        [1, 1]
      ]);
      lut.luts = LutHelper.presetLuts();
      luts[stackname] = lut;
      lut.lut = "spectrum";

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

      let translation = _this.stackHelper._stack.worldCenter().clone();
      translation.sub(stack.worldCenter());
      stack.regMatrix = new THREE.Matrix4().makeTranslation(translation.x, translation.y, translation.z);
      stack.computeIJK2LPS();

      // create material && mesh then add it to sceneLayers[i]
      let uniformsLayer = AMI.DataUniformShader.uniforms();
      uniformsLayer.uTextureSize.value = stack.textureSize;
      uniformsLayer.uTextureContainer.value = texture;
      uniformsLayer.uWorldToData.value = stack.lps2IJK;
      uniformsLayer.uNumberOfChannels.value = stack.numberOfChannels;
      uniformsLayer.uBitsAllocated.value = stack.bitsAllocated;
      uniformsLayer.uPixelType.value = stack.pixelType;
      uniformsLayer.uPackedPerPixel.value = stack.packedPerPixel;
      uniformsLayer.uWindowCenterWidth.value = [stack.windowCenter, stack.windowWidth];
      uniformsLayer.uWindowCenterWidth.unit = stack.unit; // this is not in AMI class, used for display
      uniformsLayer.uRescaleSlopeIntercept.value = [stack.rescaleSlope, stack.rescaleIntercept];
      uniformsLayer.uDataDimensions.value = [stack.dimensionsIJK.x,
        stack.dimensionsIJK.y,
        stack.dimensionsIJK.z
      ];
      uniformsLayer.uInterpolation.value = config.interpolationNM;
      // we can only display positive values
      let offset = 0;
      if (stack._minMax[0] < 0) {
        offset = -stack._minMax[0];
        uniformsLayer.uWindowCenterWidth["offset"] = offset;
      }
      uniformsLayer.uLowerUpperThreshold.value = [stack.minMax[0] + offset, stack.minMax[1] + offset];
      uniformsLayer.uLut.value = 1;
      uniformsLayer.uTextureLUT.value = lut.texture;
      _this.uniforms[stackname] = uniformsLayer;

      // generate shaders on-demand!
      let fs = new AMI.DataFragmentShader(uniformsLayer);
      let vs = new AMI.DataVertexShader();
      let materialLayer = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: uniformsLayer,
        vertexShader: vs.compute(),
        fragmentShader: fs.compute(),
      });

      let meshLayer = new THREE.Mesh(_this.stackHelper.slice.geometry, materialLayer);
      meshes[stackname] = meshLayer;
      // go the LPS space
      meshLayer.applyMatrix(_this.stackHelper.stack._ijk2LPS);
      scene.add(meshLayer);
      // Update the whole scene BB
      updateWorldBB(stack.worldBoundingBox());

      updateMixUniforms();
    }

    function setMixLayer() {
      sceneMix = new THREE.Scene();

      _this.uniformsMix = FusionShaderUni.uniforms();
      updateMixUniforms();
      // generate shaders on-demand!
      let fls = new FusionShaderFrag(_this.uniformsMix);
      let vls = new AMI.LayerVertexShader();
      let mat = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: _this.uniformsMix,
        vertexShader: vls.compute(),
        fragmentShader: fls.compute(),
        transparent: true,
      });
      materialMix = mat;
      let mesh = new THREE.Mesh(_this.stackHelper.slice.geometry, mat);
      mesheMix = mesh;
      // go the LPS space
      mesh.applyMatrix(_this.stackHelper.stack._ijk2LPS);
      sceneMix.add(mesh);
      update();
    }

    function updateMixUniforms() {
      _this.uniformsMix.uTextureBackground.value = textureTargets["background"].texture;
      // fusion
      if (textureTargets["fusion"] !== null)
        _this.uniformsMix.uTextureFusion.value = textureTargets["fusion"].texture;
      // overlay
      if (textureTargets["overlay"] !== null)
        _this.uniformsMix.uTextureOverlay.value = textureTargets["overlay"].texture;
      _this.uniformsMix.uOpacityMin.value = 0.1;
      _this.uniformsMix.uOpacityMax.value = 0.8;
      _this.uniformsMix.uThreshold.value = 0.01;
    }


    function update() {
      function updateLuts() {
        luts["background"].updateLevels(_this.uniforms["background"].uWindowCenterWidth);
        // fusion
        if (luts["fusion"] !== null) {
          luts["fusion"].updateLevels(_this.uniforms["fusion"].uWindowCenterWidth);
        }
        // overlay
        if (luts["overlay"] !== null) {
          luts["overlay"].updateLevels(_this.uniforms["overlay"].uWindowCenterWidth);
        }
        // RT structs
        if (luts["struct"] !== null) {
          for (let i = 0; i < luts["struct"].length; i++) {
            luts["struct"][i].updateLevels(_this.uniforms["struct"][i].uWindowCenterWidth);
          }
        }
      }

      function updateLayers() {
        // fusion
        if (textureTargets["fusion"] !== null) {
          meshes["fusion"].geometry.dispose();
          meshes["fusion"].geometry = _this.stackHelper.slice.geometry;
          meshes["fusion"].geometry.verticesNeedUpdate = true;
        }
        // overlay
        if (textureTargets["overlay"] !== null) {
          meshes["overlay"].geometry.dispose();
          meshes["overlay"].geometry = _this.stackHelper.slice.geometry;
          meshes["overlay"].geometry.verticesNeedUpdate = true;
        }
        // RT structs
        for (let mesh of meshes["struct"]) {
          mesh.geometry.dispose();
          mesh.geometry = _this.stackHelper.slice.geometry;
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
          new THREE.Mesh(_this.stackHelper.slice.geometry, materialMix);
        // go the LPS space
        mesheMix.applyMatrix(_this.stackHelper.stack._ijk2LPS);

        sceneMix.add(mesheMix);
      }
      updateLayers();
      updateLayerMix();
      updateLuts();
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
