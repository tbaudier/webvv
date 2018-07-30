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
    /* local var reminder :
    vec2 texc
    vec4 baseColorBG
    vec4 baseColorFusion
    */
    content +=
      `
        vec4 baseColorStruct;
        float step_u;
        float step_v;
        vec4 rightPixel;
        vec4 bottomPixel;
        float _dFdX;
        float _dFdY;
        float maxDerivative;
        float clampedDerivative;
        vec4 roiColor;
        float opacity;
      `;
    for (let i = 0; i < this._uniforms["uStructTexturesCount"].value; i++) {
      if (this._uniforms["uStructFilling"].value[i] === 0) {
        // draw only borders
        content +=
          `
            baseColorStruct = texture2D(uStructTextures[${i}], texc);

            step_u = uStructBorderWidth * 1.0 / uCanvasWidth;
            step_v = uStructBorderWidth * 1.0 / uCanvasHeight;

            rightPixel  = texture2D(uStructTextures[${i}], texc + vec2(step_u, 0.0));
            bottomPixel = texture2D(uStructTextures[${i}], texc + vec2(0.0, step_v));

            // now manually compute the derivatives
            _dFdX = length(rightPixel.xyz - baseColorStruct.xyz) / step_u;
            _dFdY = length(bottomPixel.xyz - baseColorStruct.xyz) / step_v;

            maxDerivative = max(_dFdX, _dFdY);
            clampedDerivative = clamp(maxDerivative, 0., 1.);
            baseColorStruct.r = clampedDerivative;

            roiColor = vec4(uStructColors[${4*i}],uStructColors[${1+4*i}],uStructColors[${2+4*i}],uStructColors[${3+4*i}]);
            opacity = baseColorStruct.r * roiColor.a; // red canal is enough to distinguish B&W
            gl_FragColor = mix(gl_FragColor, roiColor, opacity);
          `;
      } else if (this._uniforms["uStructFilling"].value[i] === 1) {
        // draw filled
        content +=
          `
              baseColorStruct = texture2D(uStructTextures[${i}], texc);

              roiColor = vec4(uStructColors[${4*i}],uStructColors[${1+4*i}],uStructColors[${2+4*i}],uStructColors[${3+4*i}]);
              opacity = baseColorStruct.r * roiColor.a; // red canal is enough to distinguish B&W
              gl_FragColor = mix(gl_FragColor, roiColor, opacity);
            `;
      }
    }

    return content;
  }

  fusionFunction() {
    if (this._uniforms["uFusionTexture"].empty)
      return ``;
    else
      return `
        vec4 baseColorFusion = texture2D(uFusionTexture, texc);

        if(uFusionUse && baseColorFusion.w >= uFusionThreshold) {
          gl_FragColor = mix( gl_FragColor, baseColorFusion, uFusionOpacityMin+(uFusionOpacityMax-uFusionOpacityMin)*baseColorFusion.w);
        }
        `;
  }

  // http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
  overlayFunction() {
    if (this._uniforms["uOverlayTexture"].empty)
      return ``;
    else {

      this._functions["rgb2hsv"] = `
      vec3 rgb2hsv(vec3 c)
      {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = c.g < c.b ? vec4(c.bg, K.wz) : vec4(c.gb, K.xy);
          vec4 q = c.r < p.x ? vec4(p.xyw, c.r) : vec4(c.r, p.yzx);

          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }`;
      this._functions["hsv2rgb"] = `
      vec3 hsv2rgb(vec3 c)
      {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }`;

      return `
        if(uOverlayUse)
        {
          vec4 fragColorOverlay = texture2D(uOverlayTexture, texc);

          float gray1 = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
          float gray2 = dot(fragColorOverlay.rgb, vec3(0.299, 0.587, 0.114));

          vec3 color1 = vec3(uOverlayHue, 1.0, gray1);
          vec3 color2 = vec3(mod(uOverlayHue + 0.5, 1.0), 1.0, gray2);

          // // No need to compute full HSV color
          // // go to hsv system;
          // vec3 color1 = rgb2hsv(gl_FragColor.rgb);
          // vec3 color2 = rgb2hsv(fragColorOverlay.rgb);
          //
          // // set hue
          // color1.x = uOverlayHue;
          // color2.x = mod(uOverlayHue + 0.5, 1.0);
          //
          // // set staturation
          // color1.y = 1.0;
          // color2.y = 1.0;

          //go back to rgb
          gl_FragColor.rgb = hsv2rgb(color1);
          gl_FragColor.rgb += hsv2rgb(color2);
        }
        `;
    }
  }

  main() {
    // need to pre-call main to fill up the functions list
    this._main = `
void main(void) {

  vec2 texc = vec2(((vProjectedCoords.x / vProjectedCoords.w) + 1.0 ) / 2.0,
                ((vProjectedCoords.y / vProjectedCoords.w) + 1.0 ) / 2.0 );

  gl_FragColor = texture2D(uBackgroundTexture, texc);

  ${this.overlayFunction()}

  ${this.fusionFunction()}

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
