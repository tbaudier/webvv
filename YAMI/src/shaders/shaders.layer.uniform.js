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
      'uUseFusion':{
        type:'b',
        value:true,
        typeGLSL:'bool',
      },
      //
      'uTextureOverlay': {
        type: 't',
        value: [],
        typeGLSL: 'sampler2D',
      },
      'uUseOverlay': {
        type:'b',
        value:true,
        typeGLSL:'bool',
      }
    };
  }
}
