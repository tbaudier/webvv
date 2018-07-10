/**
 * This module contains default constants. <br/>
 * In this file you can also edit default shortcuts.<br/>
 * Please edit this file (and recompilate with webpack or any other module manager) to change default values.<br/>
 * @module
 */
module.exports = {

  // User constants

  /** Target Frame Per Secound count. <i>Performance related</i> */
  fps: 30,
  /** <b>/!\</b> Seems to only be linear ('1' = trilinear interpolation) & is a big slow down for low perf computers. <i>Performance related</i> */
  interpolation: 0,
  interpolationNM: 0,
  /** Reset the intensity to 'best' values after every change (including changing the slide index) */
  autoIntensity: false,
  /** Background Color (behind the image borders) ( in hexa as 0x46BFB0 ) */
  bgColor: 0x00FF00,
  /** Background opacity */
  bgAlpha: 0,

  /** Color of the cross (prob) (in string hexa as '#RRGGBBAA') (with alpha or not) */
  crossColor: '#00FF0044',

  /** Colors of the default struct (after the end, it will loop) as Red-Green-Blue-Alpha in [0;1]*/
  structColors: [
    0, 0, 1, 0.5,
    0, 1, 0, 0.5,
    0, 1, 1, 1,
    1, 0, 0, 1,
    1, 0, 1, 1,
    0, 0.5, 1, 1,
    0.5, 0, 1, 1,
    0, 1, 0.5, 1,
    0.5, 1, 0, 1,
    1, 0, 0.5, 1,
    1, 0.5, 0, 1
  ],

  // User controls

  /** Let the user right-click our app ? (Menu : Copy Image, Save image as..) */
  rightClickAllowed: false,
  /** factor of zooming, must be greater than 1. */
  zoomSpeed: 1.1,
  /** direction of wheel zooming */
  zoomInIsWheelDown: true,
  /** direction of wheel stacking/changing index */
  stackTopIsWheelDown: true,
  /** A factor to control speed of Windowing changes */
  windowingSpeedFactor: 10,
  /** local windowing prob side will be (2 * size -1)/zoom (in Voxels) */
  localWindowingSize: 10,
  /** max size <i>(knowing values are read in a maxLocalWindowingSize^3 cube)</i> */
  maxLocalWindowingSize: 30,

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
