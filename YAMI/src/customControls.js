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
      NONE: 0,
      SETPROB: 1,
      PAN: 2,
      WINDOW: 3
    };
    let pressedKeys = new Map();

    let _state = STATE.NONE;
    //let _prevState = STATE.NONE;


    let EPS = 0.000001;
    //let _changed = true;

    let oldMousePosition = new THREE.Vector2();
    let newMousePosition = new THREE.Vector2();

    let _eye = new THREE.Vector3();
    let _temp = new THREE.Vector3();

    // Public attributes
    this.camera = camera;
    this.stack = stack;
    this.domElement = (domElement !== undefined) ? domElement : document;
    this.target = new THREE.Vector3();

    this.noZoom = false;
    this.noPan = false;
    this.noRotate = true; //not implemented yet

    // Public methods
    this.handleResize = function() {};
    this.update = function() {
      if (_this._changed)
        _this.camera.updateProjectionMatrix();
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

    this.pan = function(p1, p2) {
      _eye.subVectors(_this.camera.position, _this.target);

      if (this.noPan)
        return;
      let x = p2.x - p1.x;
      let y = p2.y - p1.y;
      // relative movment [-1,1]
      x /= domElement.offsetWidth;
      y /= domElement.offsetHeight;

      // Scale movement to keep clicked/dragged position under cursor
      let scale_x = (_this.camera.right - _this.camera.left) / _this.camera.zoom;
      let scale_y = (_this.camera.top - _this.camera.bottom) / _this.camera.zoom;
      x *= scale_x;
      y *= scale_y;
      
      let pan = new THREE.Vector3();
      // vertical component
      pan.copy(_this.camera.up).setLength(y);
      // horizontal component
      pan.add(_temp.copy(_eye).cross(_this.camera.up).setLength(x));

      _this.camera.position.add(pan);
      _this.target.add(pan);
      _this._changed = true;
    }


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
        case 'Escape':
          _this._state = STATE.NONE;
          break;

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

    function mousedown(event) {
      switch (event.which) { // which button of the mouse is pressed

        case config.mouseClickProbe:
          _this._state = STATE.SETPROB;
          break;

        case config.mouseClickPan:
          _this._state = STATE.PAN;
          break;

        case config.mouseClickWindow:
          _this._state = STATE.WINDOW;
          break;
      }
      oldMousePosition.x = event.x;
      oldMousePosition.y = event.y;

      document.addEventListener('mousemove', mousemove, false);
    }

    function mouseup(event) {
      _this._state = STATE.NONE;
      document.removeEventListener('mousemove', mousemove, false);
    }

    function mousemove(event) {
      newMousePosition.x = event.x;
      newMousePosition.y = event.y;

      switch (_this._state) {
        case STATE.PAN:
          _this.pan(oldMousePosition, newMousePosition);
          break;
        case STATE.SETPROB:
          //TODO
          break;
        case STATE.WINDOW:
          // TODO
          break;
      }

      oldMousePosition = newMousePosition;
      newMousePosition = new THREE.Vector2();
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
      document.addEventListener('mousedown', mousedown, false);
      document.addEventListener('mouseup', mouseup, false);
      document.addEventListener('wheel', mousewheel, false);
      document.addEventListener('contextmenu', contextMenu, false); // Right click
      document.addEventListener('keypress', keypressed, false); // Keys
      document.addEventListener('keyup', keyup, false); // Keys
      document.addEventListener('keydown', keydown, false); // Keys
    }

    function clearEvents() {
      document.removeEventListener('mousedown', mousedown, false);
      document.removeEventListener('mouseup', mouseup, false);
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
