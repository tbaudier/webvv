// Remember this is applied only when Wepack is run

module.exports = {

  // User constants

  // Target Frame Per Secound count /!\ Performance related
  fps: 30,
  // /!\ Seems to only be linear ('1' = trilinear interpolation) & is a huge slow down /!\ Performance related
  interpolation: 0,
  interpolationNM: 1,
  // Reset the intensity to 'best' values after every change (including changing the slide index)
  autoIntensity: false,
  // Background Color (behind the image borders) ( in hexa as 0x46BFB0 )
  bgColor: 0x00FF00,
  bgAlpha: 0,

  // Color of the cross (prob) (in string hexa as '#RRGGBBAA') (with alpha or not)
  crossColor : '#00FF0044',

  // User controls

  // Let the user right-click our app ? (Menu : Copy Image, Save image as..)
  rightClickAllowed: false,
  zoomSpeed: 1.1, // factor of zooming, must be greater than 1.
  zoomInIsWheelDown: true, // direction of wheel zooming
  stackTopIsWheelDown: true, // direction of wheel stacking/changing index
  windowingSpeedFactor: 10,
  // local windowing prob side will be 2 * size -1 (in dataCoordinates)
  localWindowingSize : 10,

  // Shortcuts KeyCodes
  // (holding input must be saved as KeyCode)

  // set state
  stateMove: 'm',
  stateZoom: 'z',
  stateWindow: 'w',
  stateProb: 'p',
  stateSlice: 's',

  localWindowing: 'l',

  zoomIn: '+',
  zoomIn2: 'i',
  zoomOut: '-',
  zoomOut2: 'o',
  zoomHold: 17, // 'Ctrl'

  stackUp: 'ArrowUp',
  stackDown: 'ArrowDown',

  resetCamera: 'r',
}
