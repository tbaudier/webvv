/**
 * @module shaders/data
 */
export default class ShadersUniform {
  static uniforms() {
    return {
    'uTextureBackTest0': {
        type: 't',
        value: [],
        typeGLSL: 'sampler2D',
      },
      'uTextureBackTest1': {
        type: 't',
        value: [],
        typeGLSL: 'sampler2D',
      },
      'uOpacity': {
        type: 'f',
        value: 1.0,
        typeGLSL: 'float',
      },
      'uThreshold': {
        type: 'f',
        value: 0.00,
        typeGLSL: 'float',
      },
    };
  }
}
