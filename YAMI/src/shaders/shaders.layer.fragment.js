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
    if (this._uniforms["uStructTexturesCount"].value > 0)
      /* local var reminder :
      vec2 texc
      vec4 baseColorBG
      vec4 baseColorFusion
      */
      content =
      `
    const int MAX_ROI = 100;
      for (int i = 0; i < MAX_ROI; i++) {
        if (i >= uStructTexturesCount) {
          break;
        }

        else if(uStructFilling[i] != -1){
          vec4 baseColorStruct = texture2D(uStructTextures[i], texc);
          if(uStructFilling[i] == 0){
            float step_u = uStructBorderWidth * 1.0 / uCanvasWidth;
            float step_v = uStructBorderWidth * 1.0 / uCanvasHeight;

            vec4 rightPixel  = texture2D(uStructTextures[i], texc + vec2(step_u, 0.0));
            vec4 bottomPixel = texture2D(uStructTextures[i], texc + vec2(0.0, step_v));

            // now manually compute the derivatives
            float _dFdX = length(rightPixel.xyz - baseColorStruct.xyz) / step_u;
            float _dFdY = length(bottomPixel.xyz - baseColorStruct.xyz) / step_v;

            float maxDerivative = max(_dFdX, _dFdY);
            float clampedDerivative = clamp(maxDerivative, 0., 1.);
            baseColorStruct.r = clampedDerivative;
          }

          vec4 roiColor = vec4(uStructColors[4*i],uStructColors[1+4*i],uStructColors[2+4*i],uStructColors[3+4*i]);
          float opacity = baseColorStruct.r * roiColor.a; // red canal is enough to distinguish B&W
          gl_FragColor = mix(gl_FragColor, roiColor, opacity);
        }

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

  //The back position is the world space position stored in the texture.
  vec4 baseColorBG = texture2D(uBackgroundTexture, texc);
  vec4 baseColorFusion = texture2D(uFusionTexture, texc);

  if(!uFusionUse || baseColorFusion.w < uFusionThreshold){
    gl_FragColor = baseColorBG;
  }else{
    gl_FragColor = mix( baseColorBG, baseColorFusion, uFusionOpacityMin+(uFusionOpacityMax-uFusionOpacityMin)*baseColorFusion.w);
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
