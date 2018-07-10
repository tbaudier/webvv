/**
 * @module shaders/data
 */
export default class ShadersUniform {
  static uniforms() {
    return {
      'uBackgroundTexture': {
        type: 't',
        value: [],
        typeGLSL: 'sampler2D',
      },
      // Fusion
      'uFusionTexture': {
        type: 't',
        value: [],
        typeGLSL: 'sampler2D',
      },
      'uFusionOpacityMin': {
        type: 'f',
        value: 1.0,
        typeGLSL: 'float',
      },
      'uFusionOpacityMax': {
        type: 'f',
        value: 1.0,
        typeGLSL: 'float',
      },
      'uFusionThreshold': {
        type: 'f',
        value: 0.01,
        typeGLSL: 'float',
      },
      'uFusionUse': {
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
      'uOverlayUse': {
        type: 'b',
        value: true,
        typeGLSL: 'bool',
      },
      // Struct
      'uStructTexturesCount': { // n
        type: 'i',
        value: 0,
        typeGLSL: 'int',
      },
      'uStructTextures': { // array of n samplers
        type: 'tv',
        value: [],
        typeGLSL: 'sampler2D',
        length: 1,
      },
      'uStructColors': { // array of 4*n float each group of 4 is a color
        type: 'fv1',
        value: [],
        typeGLSL: 'float',
        length: 4,
      },
      'uStructFilling': { // array of n int where 1 = filled, 0 not only borders
        type: 'iv1',
        value: [],
        typeGLSL: 'int',
        length: 1,
      },
      'uStructBorderWidth': { // with of the border if any
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
