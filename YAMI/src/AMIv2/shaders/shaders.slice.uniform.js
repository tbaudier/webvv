/**
 * @module shaders/data
 */
export default class ShadersUniform {
  /**
   * Shaders data uniforms
   */
  static uniforms() {
    return {
      'uTextureSize': {
        type: 'i',
        value: 0,
        typeGLSL: 'int',
      },
      'uTextureSlice': {
        type: 'tv',
        value: null,
        typeGLSL: 'sampler2D',
      },
      'uOrientationSlice': {
        type: 'i',
        value: 0,
        typeGLSL: 'int',
      },
      'uDataDimensions': {
        type: 'iv',
        value: [0, 0, 0],
        typeGLSL: 'ivec3',
      },
      'uWorldToData': {
        type: 'm4',
        value: new THREE.Matrix4(),
        typeGLSL: 'mat4',
      },
      'uWindowCenterWidth': {
        type: 'fv1',
        value: [0.0, 0.0],
        typeGLSL: 'float',
        length: 2,
      },
      'uLowerUpperThreshold': {
        type: 'fv1',
        value: [0.0, 0.0],
        typeGLSL: 'float',
        length: 2,
      },
      'uRescaleSlopeIntercept': {
        type: 'fv1',
        value: [0.0, 0.0],
        typeGLSL: 'float',
        length: 2,
      },
      'uNumberOfChannels': {
        type: 'i',
        value: 1,
        typeGLSL: 'int',
      },
      'uBitsAllocated': {
        type: 'i',
        value: 8,
        typeGLSL: 'int',
      },
      'uInvert': {
        type: 'i',
        value: 0,
        typeGLSL: 'int',
      },
      'uLut': {
        type: 'i',
        value: 0,
        typeGLSL: 'int',
      },
      'uTextureLUT': {
        type: 't',
        value: [],
        typeGLSL: 'sampler2D',
      },
      'uLutSegmentation': {
        type: 'i',
        value: 0,
        typeGLSL: 'int',
      },
      'uTextureLUTSegmentation': {
        type: 't',
        value: [],
        typeGLSL: 'sampler2D',
      },
      'uPixelType': {
        type: 'i',
        value: 0,
        typeGLSL: 'int',
      },
      'uPackedPerPixel': {
        type: 'i',
        value: 1,
        typeGLSL: 'int',
      },
      'uInterpolation': { // not used anymore, but is kept for compatibilty with AMI's StackHelper object
        type: 'i',
        value: 1,
        typeGLSL: 'int',
      },
      'uCanvasWidth': {
        type: 'f',
        value: 0.,
        typeGLSL: 'float',
      },
      'uCanvasHeight': {
        type: 'f',
        value: 0.,
        typeGLSL: 'float',
      },
      'uBorderColor': { // not used anymore, but is kept for compatibilty with AMI's StackHelper object
        type: 'v3',
        value: [1.0, 0.0, 0.5],
        typeGLSL: 'vec3',
      },
      'uBorderWidth': { // not used anymore, but is kept for compatibilty with AMI's StackHelper object
        type: 'f',
        value: 2.,
        typeGLSL: 'float',
      },
      'uBorderMargin': { // not used anymore, but is kept for compatibilty with AMI's StackHelper object
        type: 'f',
        value: 2.,
        typeGLSL: 'float',
      },
      'uBorderDashLength': { // not used anymore, but is kept for compatibilty with AMI's StackHelper object
        type: 'f',
        value: 10.,
        typeGLSL: 'float',
      },
      'uOpacity': {
        type: 'f',
        value: 1.0,
        typeGLSL: 'float',
      },
      'uSpacing': { // not used anymore, but is kept for compatibilty with AMI's StackHelper object
        type: 'f',
        value: 0.,
        typeGLSL: 'float',
      },
      'uThickness': { // not used anymore, but is kept for compatibilty with AMI's StackHelper object
        type: 'f',
        value: 0.,
        typeGLSL: 'float',
      },
      'uThicknessMethod': { // not used anymore, but is kept for compatibilty with AMI's StackHelper object
        type: 'i',
        value: 0,
        typeGLSL: 'int',
      },
    };
  }
}
