 const helpersMaterialMixin = (three = window.THREE) => {
  if (three === undefined || three.Object3D === undefined) {
    return null;
  }

   const Constructor = three.Object3D;
   return class extends Constructor {
    _createMaterial(extraOptions) {
      // generate shaders on-demand!
      let fs = new this._shadersFragment(this._uniforms);
      let vs = new this._shadersVertex();

      // material
      let globalOptions = {
        uniforms: this._uniforms,
        vertexShader: vs.compute(),
        fragmentShader: fs.compute(),
      };

      let options = Object.assign(extraOptions, globalOptions);
      this._material = new three.ShaderMaterial(options);
      this._material.needsUpdate = true;
    }

    _updateMaterial() {
      // generate shaders on-demand!
      let fs = new this._shadersFragment(this._uniforms);
      let vs = new this._shadersVertex();

      this._material.vertexShader = vs.compute();
      this._material.fragmentShader = fs.compute();

      this._material.needsUpdate = true;
    }
  };
};

export {helpersMaterialMixin};
export default helpersMaterialMixin();
