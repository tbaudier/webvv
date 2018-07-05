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
  structFunction() {
    let content = '';
    if (this._uniforms["uTexturesCount"].value > 0)
      /* local var reminder :
      vec2 texc
      vec4 baseColorBG
      vec4 baseColorFusion
      */
      content =
      `
    const int MAX_OVERLAYS = 100;
      for (int i = 0; i < MAX_OVERLAYS; i++) {
        if (i >= uTexturesCount) {
          break;
        }
        vec4 baseColorStruct = texture2D(uTexturesStruct[i], texc);
        if(uFillingStruct[i] == 0){
          float step_u = uWidthStruct * 1.0 / uCanvasWidth;
          float step_v = uWidthStruct * 1.0 / uCanvasHeight;

          vec4 rightPixel  = texture2D(uTexturesStruct[i], texc + vec2(step_u, 0.0));
          vec4 bottomPixel = texture2D(uTexturesStruct[i], texc + vec2(0.0, step_v));

          // now manually compute the derivatives
          float _dFdX = length(rightPixel.xyz - baseColorStruct.xyz) / step_u;
          float _dFdY = length(bottomPixel.xyz - baseColorStruct.xyz) / step_v;

          float maxDerivative = max(_dFdX, _dFdY);
          float clampedDerivative = clamp(maxDerivative, 0., 1.);
          baseColorStruct.r = clampedDerivative;
        }

        vec4 overlayColor = vec4(uColorsStruct[4*i],uColorsStruct[1+4*i],uColorsStruct[2+4*i],uColorsStruct[3+4*i]);
        float opacity = baseColorStruct.r * overlayColor.a; // red canal is enough to distinguish B&W
        gl_FragColor = mix(gl_FragColor, overlayColor, opacity);
      }
  `;

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
    gl_FragColor = mix( baseColorBG, baseColorFusion, uOpacityMin+(uOpacityMax-uOpacityMin)*baseColorFusion.w);
  }

  ${this.structFunction()}

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
