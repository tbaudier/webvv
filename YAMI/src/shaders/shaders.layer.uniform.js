/**
 * @module shaders/data
 */
export default class ShadersUniform {
  static uniforms() {
    return {
      'uTextureBackground': {
        type: 't',
        value: [],
        typeGLSL: 'sampler2D',
      },
      // Fusion
      'uTextureFusion': {
        type: 't',
        value: [],
        typeGLSL: 'sampler2D',
      },
      'uOpacityMin': {
        type: 'f',
        value: 1.0,
        typeGLSL: 'float',
      },
      'uOpacityMax': {
        type: 'f',
        value: 1.0,
        typeGLSL: 'float',
      },
      'uThreshold': {
        type: 'f',
        value: 0.01,
        typeGLSL: 'float',
      },
      'uUseFusion': {
        type: 'b',
        value: true,
        typeGLSL: 'bool',
      },
      // Overlay
      'uTextureOverlay': {
        type: 't',
        value: [],
        typeGLSL: 'sampler2D',
      },
      'uUseOverlay': {
        type: 'b',
        value: true,
        typeGLSL: 'bool',
      },
      // Struct
      'uTexturesCount': { // n
        type: 'i',
        value: 0,
        typeGLSL: 'int',
      },
      'uTexturesStruct': { // array of n samplers
        type: 'tv',
        value: [],
        typeGLSL: 'sampler2D',
        length: 1,
      },
      'uColorsStruct': { // array of 4*n float each group of 4 is a color
        type: 'fv1',
        value: [],
        typeGLSL: 'float',
        length: 4,
      },
      'uFillingStruct': { // array of n int where 1 = filled, 0 not only borders
        type: 'iv1',
        value: [],
        typeGLSL: 'int',
        length: 1,
      },
      'uWidthStruct': { // array of 4*n float each group of 4 is a color
        type: 'f',
        value: 2,
        typeGLSL: 'float',
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

    };
  }
}
