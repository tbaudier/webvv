import FusionShaderFrag from './shaders/shaders.layer.fragment';
import FusionShaderUni from './shaders/shaders.layer.uniform';
import LutHelper from './customLutHelper';
// Viewer config file
const config = require('./viewer.config');

/**
 * This class manage 3D objects, textures, renders, image fusion...<br/>
 * You might want to change the structure of object attributes to use this class outside of YAMI project.
 * @class
 * @alias SceneManager
 */
export default class sceneManager {

  /**
   * Create a SceneManager, and prepare its renderer to a given DOM Element.
   * @constructor
   * @param  {Element} canvasElement DOM element to replace with the visualization
   */
  constructor(canvasElement) {
    /** World bouding box, use to "bestfit" the camera */
    let worldBB = [0, 0, 0, 0, 0, 0]; // xmin, xmax, ymin, ymax, zmin, zmax

    let _this = this;

    let canvas = canvasElement;
    /** object having the scenes (THREE.Scene) created */
    let scenes = {
      background: null,
      fusion: null,
      overlay: null,
      struct: [],
    };
    /** object having the luts scales (CustomLutHelper) created */
    let luts = {
      background: null,
      fusion: null,
      overlay: null,
      struct: [],
    }
    /** object having the texture where each scene is rendered. This texture will be mixed after that to do the final render */
    let textureTargets = {
      background: null,
      fusion: null,
      overlay: null,
      struct: [],
    }
    /** object having the 3D meshes. Background mesh is a AMI.StackHelper, other are THREE.Mesh */
    let meshes = {
      background: null,
      fusion: null,
      overlay: null,
      struct: [],
    }
    /**
     * World bouding box, use to "bestfit" the camera<br/>
     * Array : [xmin, xmax, ymin, ymax, zmin, zmax]
     * @memberof SceneManager
     */
    this.worldBB = worldBB;
    /**
     * object having the Uniforms object (AMI.DataUniformShader). <i>Constants sent with the shader. cf OpenGL</i>
     * @memberof SceneManager
     * @see AMI.DataUniformShader
     */
    this.uniforms = {};
    /**
     * Access to the StackHelper of the background
     * @memberof SceneManager
     */
    this.stackHelper;
    /**
     * object having the luts scales (CustomLutHelper) created
     * @memberof SceneManager
     * @see CustomLutHelper
     */
    this.luts = luts;
    /**
     * The Uniform object (FusionShaderUni) of the mix
     * @memberof SceneManager
     * @see FusionShaderUni
     */
    this.uniformsMix;

    let sceneMix;
    let materialMix;
    let mesheMix;

    initBG();

    /**
     * Call this method when the DOM element is resized.<br/>
     * Here we resize every texture target to keep them at the size of the DOM element.
     */
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

    /**
     * Render each scene to its texture target from the point of view of Camera and then mix them.
     *
     * @param  {THREE.WebGLRenderer} renderer The Renderer to use (settings, background...)
     * @param  {THREE.Camera} camera Camera to use (point of view)
     */
    this.render = function(renderer, camera) {
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

    /**
     * Adds a stack to the scene and defines it as the main stack (background)
     * @param {AMI.StackHelper} stackHelperI stackhelper containing the stack.
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
     * Adds a new stack (Different from the main stack where you should use setMainStackHelper).<br/>
     *
     * @param  {AMI.Stack} stack     description
     * @param  {string} stackname the name of the stack (now it must be "fusion", "ROI" or "overlay", otherwise the stack will not be added)
     */
    this.addLayerStack = function(stack, stackname) {
      if (!(stackname == "fusion" || stackname == "overlay" || stackname == "ROI"))
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
      console.log(translation);
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

    /**
     * Create the mix layer
     */
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


    /**
     * update    <br/>
     * Must be called before <i>this.render</i>
     */
    this.update = function() {
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

    /**
     * Update the world bouding box, having the current BB and the BB of a new object added to the scene
     * @param  {array} otherBB bouding box of the new object as [xmin, xmax, ymin, ymax, zmin, zmax]
     */
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
