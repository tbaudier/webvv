// Remember this is applied only when Wepack is run

module.exports = {

  // User constants

  // Target Frame Per Secound count /!\ Performance related
  fps: 30,
  // /!\ Seems to only be antialasing ('1' = trilinear interpolation) & is a huge slow down /!\ Performance related
  interpolation: 0,
  // Reset the intensity to 'best' values after every change (including changing the slide index)
  autoIntensity: false,
  // Background Color (behind the image borders) ( in hexa as 0x46BFB0 )
  bgColor : 0x000000,


  // User controls

  // Let the user right-click our app ? (Menu : Copy Image, Save image as..)
  rightClickAllowed : false,
  zoomSpeed : 1.1, // factor of zooming, must be greater than 1.

  // Shortcuts KeyCodes

  zoomIn : '+',
  zoomIn2 : 'i',
  zoomOut : '-',
  zoomOut2 : 'o',
  zoomHold : 17, // 'Ctrl'

  resetCamera : 'r',
}
