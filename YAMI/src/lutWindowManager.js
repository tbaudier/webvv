
/**
 * Create and manage the LUT (window presets)
 *
 * @module LutWindowManager
 */
function lutWindowManager() {
  let presets = {
    'Default': [400, 40],
    'Mediastinum': [500, 39],
    'Bone': [2500, 500],
    'Lung': [1324, -362],
    'Soft tissue': [400, 40],
    'Liver': [160, 40],
    'Brain': [80, 40],
    'Tumor': [220, 130],
  }

  /**
   * Get one preset data from its name
   *
   * @param  {type} preset the name of the desired preset
   * @return {number[]}       [windowWidth, windowCenter]
   * @memberof module:LutWindowManager
   */
  function getPresetValue(preset) {
    return presets[preset];
  }

  /**
   * get the list of existing presets as strings
   *
   * @return {string[]}  list of presets
   * @memberof module:LutWindowManager
   */
  function listPresets() {
    let presetsNames = [];
    presetsNames.push('Custom');
    for(let i in presets){
      presetsNames.push(i);
    }
    return presetsNames;
  }

  return {
    getPresetValue: getPresetValue,
    listPresets: listPresets
  }
}

module.exports = lutWindowManager();
