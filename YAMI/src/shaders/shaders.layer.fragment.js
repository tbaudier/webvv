export default class ShadersFragment {
  // pass uniforms object
  constructor(uniforms) {
    this._uniforms = uniforms;
    this._functions = {};
    this._main = '';
  }

  functions() {
    if (this._main === '') {
      // if main is empty, functions can not have been computed
      this.main();
    }

    let content = '';
    for (let property in this._functions) {
      content += this._functions[property] + '\n';
    }

    return content;
  }

  uniforms() {
    let content = '';
    for (let property in this._uniforms) {
      let uniform = this._uniforms[property];
      content += `uniform ${uniform.typeGLSL} ${property}`;

      if (uniform && uniform.length) {
        content += `[${uniform.length}]`;
      }

      content += ';\n';
    }

    return content;
  }

  main() {
    // need to pre-call main to fill up the functions list
    this._main = `
void main(void) {

  vec2 texc = vec2(((vProjectedCoords.x / vProjectedCoords.w) + 1.0 ) / 2.0,
                ((vProjectedCoords.y / vProjectedCoords.w) + 1.0 ) / 2.0 );

  // just silence warning for
  // vec4 dummy = vPos;

  //The back position is the world space position stored in the texture.
  vec4 baseColorBG = texture2D(uTextureBackground, texc);
  vec4 baseColorFusion = texture2D(uTextureFusion, texc);

  if(!uUseFusion || baseColorFusion.w < uThreshold){
    gl_FragColor = baseColorBG;
  }else{
    gl_FragColor = mix( baseColorBG, baseColorFusion, uOpacityMin+uOpacityMax*baseColorFusion.w);
  }
  return;
}
   `;
  }

  compute() {
    let shaderInterpolation = '';
    // shaderInterpolation.inline(args) //true/false
    // shaderInterpolation.functions(args)

    return `
// uniforms
${this.uniforms()}

// varying (should fetch it from vertex directly)
// varying vec4      vPos;
varying vec4      vProjectedCoords;

// tailored functions
${this.functions()}

// main loop
${this._main}
      `;
  }
}
