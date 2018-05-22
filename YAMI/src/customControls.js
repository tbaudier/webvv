/**
 * Inspired by AMI.TrackballOrthoControl
 */
const config = require('./viewer.config');
//const Map = require("collections/map");

export default class customControls extends THREE.EventDispatcher {
  constructor(camera, stack, domElement) {
    super();
    let _this = this;

    let STATE = {
      NONE: 0
    };
    let pressedKeys = new Map();

    let _state = STATE.NONE;
    let _prevState = STATE.NONE;

    let _eye = new THREE.Vector3();

    let EPS = 0.000001;
    let _changed = true;

    // Public attributes
    this.camera = camera;
    this.stack = stack;
    this.domElement = (domElement !== undefined) ? domElement : document;
    this.target = new THREE.Vector3();
    this.screen = {
      left: 0,
      top: 0,
      width: 0,
      height: 0
    };

    this.noZoom = false;
    this.noPan = true; //not implemented yet
    this.noRotate = true; //not implemented yet

    // Public methods
    this.handleResize = function() {};
    this.update = function() {
      /*
            _eye.subVectors(_this.object.position, _this.target);

            if (!_this.noZoom) {
              this.zoomCamera();

              if (_changed) {
                this.object.updateProjectionMatrix();
              }
            }

            if (!this.noPan) {
              this.panCamera();
            }

            this.object.position.addVectors(_this.target, _eye);
      */

      if (_changed) {
        _this.camera.updateProjectionMatrix();
      }

      this.camera.lookAt(this.target);
    };

    this.setAsResetState = function() {
      //  this.save = camera.clone();
    };

    this.reset = function() {
      //TODO
      /*
      console.log(this.camera);
      console.log("reset try");
      this.camera = this.save.clone();
      */
    };

    this.zoom = function(directionIn) {
      if (this.noZoom)
        return;

      let factor = (directionIn) ? 1 / config.zoomSpeed : config.zoomSpeed;

      if (Math.abs(factor - 1.0) > EPS && factor > 0.0) {
        this.camera.zoom /= factor;
        //_changed = true;
      }
    }
    this.scrollStack = function(directionTop) {
      if (directionTop) {
        if (stack.index >= stack.orientationMaxIndex - 1) {
          return false;
        }
        stack.index += 1;
      } else {
        if (stack.index <= 0) {
          return false;
        }
        stack.index -= 1;
      }
    }
    /*
        this.handleEvent = function(event) {
          if (typeof this[event.type] == 'function') {
            this[event.type](event);
          }
        };*/

    // hook up callbacks

    ///////////
    // Event handlers
    ///////////

    function keypressed(event) {
      switch (event.key) {
        case config.zoomIn:
        case config.zoomIn2:
          _this.zoom(true);
          break;

        case config.zoomOut:
        case config.zoomOut2:
          _this.zoom(false);
          break;

        case config.resetCamera:
          _this.reset();
          break;
      }
    }

    function keydown(event) {
      //add this key to the list of pressed keys
      pressedKeys.set(event.keyCode, true);

      switch (event.key) {
        case config.stackUp:
          _this.scrollStack(true);
          break;
        case config.stackDown:
          _this.scrollStack(false);
          break;
      }
    }

    function keyup(event) {
      //remove this key from the list of pressed keys
      pressedKeys.set(event.keyCode, false);
    }

    function isDown(keyCode) {
      return pressedKeys.has(keyCode) && pressedKeys.get(keyCode);
    }

    function mousewheel(event) {
      if (isDown(config.zoomHold)) {
        _this.zoom((event.deltaY > 0) === config.zoomInIsWheelDown);
        event.preventDefault();
      } else {
        _this.scrollStack((event.deltaY > 0) === config.stackTopIsWheelDown);
        event.preventDefault();
      }
    }

    function contextMenu(event) {
      if (!config.rightClickAllowed)
        event.preventDefault();
    }

    function addEvents() {
      document.addEventListener('wheel', mousewheel, false);
      document.addEventListener('contextmenu', contextMenu, false); // Right click
      document.addEventListener('keypress', keypressed, false); // Keys
      document.addEventListener('keyup', keyup, false); // Keys
      document.addEventListener('keydown', keydown, false); // Keys
    }

    function clearEvents() {
      document.removeEventListener('wheel', mousewheel, false);
      document.removeEventListener('contextmenu', contextMenu, false); // Right click
      document.removeEventListener('keypress', keypressed, false); // Keys
      document.removeEventListener('keyup', keyup, false); // Keys
      document.removeEventListener('keydown', keydown, false); // Keys
    }

    this.dispose = function() {
      clearEvents();
    };


    //////////////
    // Code executed in constructor
    ///////////

    addEvents();

    this.camera.position.z = 1;
    this.handleResize();
    this.update();
    this.setAsResetState();
  }

}
