const FusionShaderFrag = require('./shaders/shaders.layer.fragment');
const FusionShaderUni = require('./shaders/shaders.layer.uniform');
// Viewer config file
const config = require('./viewer.config');

export default class sceneManager {
  constructor(canvasElement) {
    let canvas = canvasElement;

    let stackHelper;

    let sceneBG; // @type {THREE.Scene}
    let lutBG;
    let sceneTextureBG;

    let sceneLayers = []; // @type {THREE.Scene}
    //let lutLayers = [];
    let sceneTextureLayers = [];

    // mixing : sceneBG+sceneLayers[0] then scenesMix[i]+sceneLayers[i+1]
    // final mix is last element of scenesMix
    let scenesMix = [];

    initBG();

    this.resize = function() {

      for (let i = 0; i < sceneTextureLayers.length; i++)
        sceneTextureLayers[i].setSize(canvas.clientWidth, canvas.clientHeight);
      sceneTextureBG.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    this.render = function(renderer, camera) {
      // render background
      renderer.render(sceneBG, camera, sceneTextureBG, true); // last param is forceClear, it was at true, now testing with false
      // render layers on texture and mix between previous layer and this one
      /*
      for (let i = 0; i < sceneLayers.length - 1; i++) {
        renderer.render(sceneLayers[i], camera, sceneTextureLayers[i], false);
        renderer.render(scenesMix[i], camera, sceneTextureLayers[i], false); //
      }
      */
      renderer.render(sceneLayers[sceneLayers.length - 1], camera, sceneTextureLayers[sceneTextureLayers.length - 1], true);
      renderer.render(scenesMix[sceneLayers.length - 1], camera);
    }

    this.setMainStackHelper = function(stackHelperI) {
      stackHelper = stackHelperI;

      stackHelper.slice.intensityAuto = config.autoIntensity;
      stackHelper.slice.interpolation = config.interpolation;
      stackHelper.slice.lut = lutBG;
      stackHelper.slice.lutTexture = lutBG.texture;
      sceneBG.add(stackHelper);
    }

    function initBG() {
      sceneBG = new THREE.Scene();
      lutBG = new AMI.LutHelper('my-lut-canvases', 'default', 'linear', [
        [0, 0, 0, 0],
        [0, 1, 1, 1]
      ], [
        [0, 1],
        [1, 1]
      ]);
      lutBG.luts = AMI.LutHelper.presetLuts();
      lutBG.lut = "blue";
      sceneTextureBG = new THREE.WebGLRenderTarget(canvas.clientWidth, canvas.clientHeight, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
      });
      sceneTextureBG.setSize(canvas.clientWidth, canvas.clientHeight);
    }

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
      //lutLayers.push(lut);
      lut.lut = "red";

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
        side: THREE.BackSide, // TODO pourquoi c'est backside et pas frontside ??
        uniforms: uniformsLayer,
        vertexShader: vs.compute(),
        fragmentShader: fs.compute(),
      });

      let meshLayer = new THREE.Mesh(stackHelper.slice.geometry, materialLayer);
      // go the LPS space
      meshLayer.applyMatrix(stackHelper.stack._ijk2LPS);
      scene.add(meshLayer);

      addMixLayer(stack, stackHelper);
    }

    function addMixLayer(stack) {
      scenesMix.push(new THREE.Scene());

      // Create the Mix layer
      let uni = FusionShaderUni.default.uniforms();
      let i = sceneTextureLayers.length - 1;
      if (i === 0) {

        uni.uTextureBackTest0.value = sceneTextureBG.texture;
        uni.uTextureBackTest1.value = sceneTextureLayers[i].texture;
      } else {
        uni.uTextureBackTest0.value = sceneTextureLayers[i - 1].texture;
        uni.uTextureBackTest1.value = sceneTextureLayers[i].texture;
      }
      uni.uOpacity.value = 0.5;

      // generate shaders on-demand!
      let fls = new FusionShaderFrag.default(uni);
      //let fls = new AMI.LayerFragmentShader(uni);
      let vls = new AMI.LayerVertexShader();
      let mat = new THREE.ShaderMaterial({
        side: THREE.DoubleSide, // TODO pourquoi c'est backside et pas frontside ??
        uniforms: uni,
        vertexShader: vls.compute(),
        fragmentShader: fls.compute(),
        transparent: true,
      });
      let mesh = new THREE.Mesh(stackHelper.slice.geometry, mat);
      // go the LPS space
      mesh.applyMatrix(stackHelper.stack._ijk2LPS);
      scenesMix[scenesMix.length - 1].add(mesh);
    }

    function update() {
      //geometry doesn't change, do we need to update ?
      /*
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
        */
    }
  }

}
