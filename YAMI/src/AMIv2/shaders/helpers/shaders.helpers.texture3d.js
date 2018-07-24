import ShadersBase from '../shaders.base';

class Texture3d extends ShadersBase {
  constructor() {
    super();
    this.name = 'texture3d';

    // default properties names
    this._dataCoordinates = 'dataCoordinates';
    this._dataValue = 'dataValue';
    this._offset = 'offset';
  }

    api(baseFragment = this._base, dataCoordinates = this._dataCoordinates, dataValue = this._dataValue, offset = this._offset) {
    this._base = baseFragment;
    return this.compute(dataCoordinates, dataValue, offset);
  }

  compute(dataCoordinates, dataValue, offset) {
    this.computeDefinition();
    this._base._functions[this._name] = this._definition;
    return `${this._name}(${dataCoordinates}, ${dataValue}, ${offset});`;
  }


  computeDefinition() {
    this._definition = `
void ${this._name}(in ivec3 dataCoordinates, out vec4 dataValue, out int offset){

  int index = (uOrientationSlice == 1 ? dataCoordinates.y + dataCoordinates.z * uDataDimensions.y :
                (uOrientationSlice == 2 ? dataCoordinates.x + dataCoordinates.z * uDataDimensions.x :
                  dataCoordinates.x + dataCoordinates.y * uDataDimensions.x
                ));
  int indexP = int(index/uPackedPerPixel);
  offset = index - int(uPackedPerPixel)*indexP;

  // Get row and column in the texture
  int colIndex = int(mod(float(indexP), float(uTextureSize)));
  int rowIndex = int(floor(float(indexP)/float(uTextureSize)));

  // Map row and column to uv
  vec2 uv = vec2(0,0);
  uv.x = (0.5 + float(colIndex)) / float(uTextureSize);
  uv.y = 1. - (0.5 + float(rowIndex)) / float(uTextureSize);

  // get rid of if statements
  dataValue = texture2D(uTextureSlice, uv);

}
    `;
  }
}

export default new Texture3d();
