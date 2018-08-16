import DataFragmentShader from './AMIv2/shaders/shaders.slice.fragment';
import DataUniformShader from './AMIv2/shaders/shaders.slice.uniform';
import DataVertexShader from './AMIv2/shaders/shaders.slice.vertex';
import FusionShaderFrag from './AMIv2/shaders/shaders.layer.fragment';
import FusionShaderUni from './AMIv2/shaders/shaders.layer.uniform';
import LutHelper from './AMIv2/customLutHelper';
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
      overlay: null
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

    let measure = null;
    /**
     * World bouding box, use to "bestfit" the camera<br/>
     * Array : [xmin, xmax, ymin, ymax, zmin, zmax]
     * @type {Number[]}
     * @memberof SceneManager
     */
    this.worldBB = worldBB;
    /**
     * object having the Uniforms objects (DataUniformShader). <i>Constants sent with the shader. cf OpenGL</i>
     * @type {Object}
     * @property {DataUniformShader} [background] Uniform (AMI's Uniform or custom Uniform) object containing data to display main image
     * @property {DataUniformShader} [fusion] Uniform (AMI's Uniform or custom Uniform) object containing data to display fusion
     * @property {DataUniformShader} [overlay] Uniform (AMI's Uniform or custom Uniform) object containing data to display overlay
     * @property {DataUniformShader[]} struct Uniform (AMI's Uniform or custom Uniform) objects containing data to display each struct
     * @memberof SceneManager
     * @see DataUniformShader
     */
    this.uniforms = {
      struct: []
    };
    /**
     * Access to the StackHelper of the background
     * @memberof SceneManager
     */
    this.stackHelper;
    /**
     * object having the Stack objects (AMI.Stack or CustomStack).
     * @type {Object}
     * @property {CustomStack} [background] Stack (AMI's Stack or custom Stack) object
     * @property {CustomStack} [fusion] Stack (AMI's Stack or custom Stack) object
     * @property {CustomStack} [overlay] Stack (AMI's Stack or custom Stack) object
     * @property {CustomStack[]} struct Stack (AMI's Stack or custom Stack) objects
     * @memberof SceneManager
     * @see CustomStack
     */
    this.stacks = {};
    /**
     * object having the luts scales (CustomLutHelper) created
     * @type {Object}
     * @property {CustomLutHelper} background
     * @property {CustomLutHelper} fusion
     * @property {CustomLutHelper} overlay
     * @property {CustomLutHelper[]} struct
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

    this.target3D = new THREE.Vector3();

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
     * @param {AMI.StackHelper|CustomStackHelper} stackHelperI stackhelper containing the stack.
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
      _this.stacks["background"] = stackHelperI._stack;

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
     * @param  {AMI.Stack|CustomStack} stack
     * @param  {string} stackname the name of the stack (now it must be "fusion", "struct" or "overlay", otherwise the stack will not be added)
     */
    this.addLayerStack = function(stack, stackname) {
      if (stackname == "struct")
        this.addLayerROI(stack, stackname);
      if (!(stackname == "fusion" || stackname == "overlay"))
        return;

      _this.stacks[stackname] = stack;

      // Constructions
      let scene = new THREE.Scene();
      scenes[stackname] = scene;

      let lut;
      if (stackname == "overlay") {
        lut = new LutHelper('my-lut-canvases', 'default', 'linear', [
          [0, 0, 0, 0],
          [1, 1, 1, 1]
        ], [
          [0, 1],
          [1, 1]
        ]);
        lut.luts = LutHelper.presetLuts();
        luts[stackname] = lut;
        lut.lut = "default";
      } else {
        lut = new LutHelper('my-lut-canvases', 'default', 'linear', [
          [0, 0, 0, 0],
          [1, 1, 1, 1]
        ], [
          [0, 0.005],
          [1, 1]
        ]);
        lut.luts = LutHelper.presetLuts();
        luts[stackname] = lut;
        lut.lut = "spectrum";
      }

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

      // create material && mesh then add it to sceneLayers[i]
      let uniformsLayer = createDataUniforms(stack, lut);
      _this.uniforms[stackname] = uniformsLayer;

      // generate shaders on-demand!
      let fs = new DataFragmentShader(uniformsLayer);
      let vs = new DataVertexShader();
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
      updateActiveSlice(stack, uniformsLayer);
      // Update the whole scene BB
      updateWorldBB(stack.worldBoundingBox());

      updateMixShader();
    }

    function createDataUniforms(stack, lut) {
      let uniformsLayer = DataUniformShader.uniforms();
      uniformsLayer.uTextureSize.value = stack.textureSize;
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
      }
      uniformsLayer.uWindowCenterWidth["offset"] = offset;
      uniformsLayer.uWindowCenterWidth.value = [(stack.minMax[0] + stack.minMax[1]) / 2 + offset, stack.minMax[1] - stack.minMax[0]];
      uniformsLayer.uLowerUpperThreshold.value = [stack.minMax[0] + offset, stack.minMax[1] + offset];
      if (lut != null) {
        uniformsLayer.uLut.value = 1;
        uniformsLayer.uTextureLUT.value = lut.texture;
      }
      uniformsLayer.uTextureSlice.value = stack._textures[0];
      uniformsLayer.uOrientationSlice.value = 0;
      return uniformsLayer;
    }

    /**
     * Adds a new stack describing a ROI
     *
     * @param  {AMI.Stack|CustomStack} stack
     * @param  {string} stackname name of the stack (must be "struct", otherwise the stack will not be added)
     */
    this.addLayerROI = function(stack, stackname) {
      if (stackname !== "struct")
        return;


      if (_this.stacks["structs"] == null)
        _this.stacks["structs"] = [];
      _this.stacks["structs"].push(stack);

      // Constructions
      //
      let scene = new THREE.Scene();
      scenes.struct = [...scenes.struct, scene];

      let sceneTexture = new THREE.WebGLRenderTarget(canvas.clientWidth, canvas.clientHeight, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
      });
      sceneTexture.setSize(canvas.clientWidth, canvas.clientHeight);
      textureTargets.struct = [...textureTargets.struct, sceneTexture];

      // Stack preparation
      stack.prepare();
      stack.pack();

      // create material && mesh then add it to sceneLayers[i]
      let uniformsLayer = createDataUniforms(stack);
      _this.uniforms.struct = [..._this.uniforms.struct, uniformsLayer];

      // generate shaders on-demand!
      let fs = new DataFragmentShader(uniformsLayer);
      let vs = new DataVertexShader();
      let materialLayer = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: uniformsLayer,
        vertexShader: vs.compute(),
        fragmentShader: fs.compute(),
      });

      let meshLayer = new THREE.Mesh(_this.stackHelper.slice.geometry, materialLayer);
      meshes.struct = [...meshes.struct, meshLayer];
      // go the LPS space
      meshLayer.applyMatrix(_this.stackHelper.stack._ijk2LPS);
      scene.add(meshLayer);
      updateActiveSlice(stack, uniformsLayer);
      // Update the whole scene BB
      updateWorldBB(stack.worldBoundingBox());

      updateMixShader();
    }

    /**
     * this - Swap the order 2 consecutive struct : swaps their data and associated data so the new overlaying order is respected
     *
     * @param  {Number} indexToMove the index of the ROI to move (starting at 0)
     * @param  {boolean} isUpward    true = swap with next, false = swap with previous (first rendered will be the "deeper", last will be "over" others)
     */
    this.swapLayerROI = function(indexToMove, isUpward) {
      let i1 = indexToMove;
      let i2 = isUpward ? (i1 + 1) : (i1 - 1);
      // swap texture
      let temp1 = _this.uniformsMix.uStructTextures.value[i1];
      _this.uniformsMix.uStructTextures.value[i1] = _this.uniformsMix.uStructTextures.value[i2];
      _this.uniformsMix.uStructTextures.value[i2] = temp1;
      // swap color
      for (let i = 0; i < 4; i++) {
        let temp2 = _this.uniformsMix.uStructColors.value[i1 * 4 + i];
        _this.uniformsMix.uStructColors.value[i1 * 4 + i] = _this.uniformsMix.uStructColors.value[i2 * 4 + i];
        _this.uniformsMix.uStructColors.value[i2 * 4 + i] = temp2;
      }

      // swap fill
      let temp3 = _this.uniformsMix.uStructFilling.value[i1];
      _this.uniformsMix.uStructFilling.value[i1] = _this.uniformsMix.uStructFilling.value[i2];
      _this.uniformsMix.uStructFilling.value[i2] = temp3;

      _this.updateMixShaderSoft();
    }

    /**
     * Update the slicing of every stacks added to the sceneManager
     */
    this.reslice = function() {
      for (let prop in _this.stacks)
        if (_this.stacks.hasOwnProperty(prop))
          if (prop != "structs") {
            _this.stacks[prop].slicing(_this.stackHelper.orientation);
          } else {
            for (let i = 0; i < _this.stacks[prop].length; ++i) {
              _this.stacks[prop][i].slicing(_this.stackHelper.orientation);
            }
          }

      this.updateActiveSlices();
    }

    /**
     * Choose the slice to display for every stack added to the sceneManager except the "background" one.<br>
     * Slices are chosen to match the position of the active slice of the "background" stack.
     */
    this.updateActiveSlices = function() {
      if (_this.target3D != null) {
        for (let prop in _this.stacks) {
          if (_this.stacks.hasOwnProperty(prop) && prop != "image") {
            if (prop != "structs") {
              updateActiveSlice(_this.stacks[prop], _this.uniforms[prop]);
            } else {
              for (let i = 0; i < _this.stacks[prop].length; ++i) {
                updateActiveSlice(_this.stacks[prop][i], _this.uniforms["struct"][i]);
              }
            }
          }
        }
      }
    }

    this.updateMeasure = function(pointA, pointB) {
      if (!measure) {
        //create a blue LineBasicMaterial
        let material = new THREE.LineBasicMaterial({
          color: 0xff5555,
          linewidth: 2,
        });
        material.depthTest = false;
        let geometry = new THREE.Geometry();
        geometry.vertices.push(pointA);
        geometry.vertices.push(pointB);
        measure = new THREE.Line(geometry, material);
        measure.renderOrder = 1;
      } else {
        measure.geometry = new THREE.Geometry();
        measure.geometry.vertices.push(pointA);
        measure.geometry.vertices.push(pointB);
      }
      sceneMix.add(measure);
    }

    this.deleteMeasure = function() {
      if (measure)
        sceneMix.remove(measure);
    }
    /** update the active slice of one stack, making it match with the slice of the "background" stack */
    function updateActiveSlice(stack, uniform) {
      let localCoordinates = new THREE.Vector3()
        .copy(_this.target3D)
        .applyMatrix4(stack.lps2IJK)
        .addScalar(0.5)
        .floor();
      let index = 0;
      switch (_this.stackHelper.orientation) {
        case 1:
          if (localCoordinates.x >= 0 && localCoordinates.x < stack.dimensionsIJK.x) {
            index = localCoordinates.x;
          }
          break;
        case 2:
          if (localCoordinates.y >= 0 && localCoordinates.y < stack.dimensionsIJK.y) {
            index = localCoordinates.y;
          }
          break;
        default:
          if (localCoordinates.z >= 0 && localCoordinates.z < stack.dimensionsIJK.z) {
            index = localCoordinates.z;
          }
      }
      uniform.uTextureSize.value = stack.textureSize;
      uniform.uTextureSlice.value = stack._textures[index];
      uniform.uOrientationSlice.value = _this.stackHelper.orientation;
    }

    /** Create the mix layer */
    function setMixLayer() {
      sceneMix = new THREE.Scene();

      _this.uniformsMix = FusionShaderUni.uniforms();
      updateMixShader();
      let mesh = new THREE.Mesh(_this.stackHelper.slice.geometry, materialMix);
      mesheMix = mesh;
      // go the LPS space
      mesh.applyMatrix(_this.stackHelper.stack._ijk2LPS);
      sceneMix.add(mesh);
    }

    /** Undate the shader of the mix of all layers. And set default values. Must be called when adding a new stack for instance */
    function updateMixShader() {
      _this.uniformsMix.uBackgroundTexture.value = textureTargets["background"].texture;
      // fusion
      if (textureTargets["fusion"] !== null) {
        _this.uniformsMix.uFusionTexture.value = textureTargets["fusion"].texture;
        _this.uniformsMix.uFusionTexture.empty = false;
        _this.uniformsMix.uFusionOpacityMin.value = 0.1;
        _this.uniformsMix.uFusionOpacityMax.value = 0.8;
        _this.uniformsMix.uFusionThreshold.value = 0.01;
      }
      // overlay
      if (textureTargets["overlay"] !== null) {
        _this.uniformsMix.uOverlayTexture.value = textureTargets["overlay"].texture;
        _this.uniformsMix.uOverlayTexture.empty = false;
      }

      // ROI
      if (textureTargets["struct"].length > 0) {
        _this.uniformsMix.uStructBorderWidth.value = 1;
        _this.uniformsMix.uStructTextures.length = textureTargets["struct"].length;
        _this.uniformsMix.uStructFilling.length = textureTargets["struct"].length;
        _this.uniformsMix.uStructColors.length = textureTargets["struct"].length * 4;
        _this.uniformsMix.uStructTexturesCount.value = textureTargets["struct"].length;
        _this.uniformsMix.uStructTextures.value = [];
        _this.uniformsMix.uStructFilling.value = [];
        _this.uniformsMix.uStructColors.value = [];
        // complete the struct colors and repeat the default colors if needed.
        while (_this.uniformsMix.uStructColors.value.length < textureTargets["struct"].length * 4) {
          _this.uniformsMix.uStructColors.value = [
            ..._this.uniformsMix.uStructColors.value,
            ...config.structColors.slice(0, textureTargets["struct"].length * 4 - _this.uniformsMix.uStructColors.value.length)
          ];
        }
        for (let i = 0; i < textureTargets["struct"].length; i++) {
          _this.uniformsMix.uStructTextures.value = [..._this.uniformsMix.uStructTextures.value, textureTargets["struct"][i].texture];
          _this.uniformsMix.uStructFilling.value = [..._this.uniformsMix.uStructFilling.value, 0];
        }
      } else {
        //we must set those values to avoid intiate empty arrays (glsl error)
        _this.uniformsMix.uStructTextures.length = 1;
        _this.uniformsMix.uStructColors.length = 4;
        _this.uniformsMix.uStructTexturesCount.value = 0;
      }

      _this.uniformsMix.uCanvasWidth.value = canvas.clientWidth;
      _this.uniformsMix.uCanvasHeight.value = canvas.clientHeight;

      _this.updateMixShaderSoft();
    }

    /** update the shader without resetting the values. updateMixShader() must have been called at least once before. */
    this.updateMixShaderSoft = function() {
      // generate shaders on-demand!
      let fls = new FusionShaderFrag(_this.uniformsMix);
      let vls = new AMI.LayerVertexShader();
      let mat = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: _this.uniformsMix,
        vertexShader: vls.compute(),
        fragmentShader: fls.compute(),
        depthTest: false,
      });
      materialMix = mat;
      if (mesheMix != null) {
        mesheMix.material = materialMix;
        mesheMix.renderOrder = 2;
      }
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
        //  no lut for structs
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
