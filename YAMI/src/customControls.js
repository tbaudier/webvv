/**
 * Inspired by AMI.TrackballOrthoControl
 */
const config = require('./viewer.config');
//const Map = require("collections/map");

export default class customControls extends THREE.EventDispatcher {
  constructor(camera, stack, domElement, chgPtr) {
    super();
    let _this = this;

    let changePtr = chgPtr;

    let STATE = {
      NONE: 0,
      SETPROB: 1,
      SETTINGPROB: 2,
      PAN: 3,
      PANNING: 4,
      WINDOW: 5,
      WINDOWING: 6,
      ZOOM: 7,
      ZOOMING: 8,
      SLICE: 9,
      SLICING: 10,
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
      changePtr.hasChanged = true;
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
      changePtr.hasChanged = true;
    }


    this.zoom = function(directionIn, mouseFactor) {
      if (this.noZoom)
        return;

      let speed = config.zoomSpeed;
      if (mouseFactor !== undefined)
        speed = mouseFactor + 1;

      let factor = (directionIn) ? 1 / speed : speed;

      if (Math.abs(factor - 1.0) > EPS && factor > 0.0) {
        this.camera.zoom /= factor;
        _this._changed = true;
        changePtr.hasChanged = true;
      }
    }
    this.scrollStack = function(directionTop) {
      if (directionTop) {
        if (stack.index >= stack._stack.dimensionsIJK.z - 1) {
          return false;
        }
        stack.index += 1;
      } else {
        if (stack.index <= 0) {
          return false;
        }
        stack.index -= 1;
      }
      changePtr.hasChanged = true;
    }

    this.prob = function(mousePosition) {
      //TODO
    }

    ///////////
    // Event handlers
    ///////////

    function zoomByDrag(pOld, pNew) {
      _this.zoom(pOld.y > pNew.y, 0.01 * Math.abs(pOld.y - pNew.y));
    }

    function sliceByDrag(pOld, pNew) {
      _this.scrollStack(-pOld.x + pOld.y > -pNew.x + pNew.y);
    }

    function windowByDrag(pOld, pNew) {
      // TODO
    }

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
        case config.stateZoom:
          _this._state = STATE.ZOOM;
          break;
        case config.stateMove:
          _this._state = STATE.PAN;
          break;
        case config.stateSlice:
          _this._state = STATE.SLICE;
          break;
        case config.stateWindow:
          _this._state = STATE.WINDOW;
          break;
        case config.stateProb:
          _this._state = STATE.SETPROB;
          break;

        case config.stackUp:
          _this.scrollStack(true);
          break;

        case config.stackDown:
          _this.scrollStack(false);
          break;
      }
      updateDOM();
    }

    function keyup(event) {
      //remove this key from the list of pressed keys
      pressedKeys.set(event.keyCode, false);
      updateDOM();
    }

    function isDown(keyCode) {
      return pressedKeys.has(keyCode) && pressedKeys.get(keyCode);
    }

    function mousedown(event) {
      switch (event.which) { // which button of the mouse is pressed

        case 1:
          switch (_this._state) {
            case STATE.PAN:
              _this._state = STATE.PANNING;
              break;
            case STATE.ZOOM:
              _this._state = STATE.ZOOMING;
              break;
            case STATE.SLICE:
              _this._state = STATE.SLICING;
              break;
            case STATE.SETPROB:
              _this._state = STATE.SETTINGPROB;
              break;
            case STATE.WINDOW:
              _this._state = STATE.WINDOWING;
              break;
          }
          break;

        case 2:
          _this._state = STATE.PANNING;
          event.preventDefault();
          break;

        case 3:
          _this._state = STATE.WINDOWING;
          break;
      }
      oldMousePosition.x = event.clientX;
      oldMousePosition.y = event.clientY;

      document.addEventListener('mousemove', mousemove, false);
      updateDOM();
    }

    function mouseup(event) {
      switch (_this._state) {
        case STATE.PANNING:
          if (event.which == 2) {
            _this._state = STATE.NONE;
          } else {
            _this._state = STATE.PAN;
          }
          break;
        case STATE.ZOOMING:
          _this._state = STATE.ZOOM;
          break;
        case STATE.SLICING:
          _this._state = STATE.SLICE;
          break;
        case STATE.SETTINGPROB:
          _this._state = STATE.SETPROB;
          break;
        case STATE.WINDOWING:
          if (event.which == 3) {
            _this._state = STATE.NONE;
          } else {
            _this._state = STATE.WINDOW;
          }
          break;
        default:
          _this._state = STATE.NONE;
      }
      document.removeEventListener('mousemove', mousemove, false);
      updateDOM();
    }

    function mousemove(event) {
      newMousePosition.x = event.clientX;
      newMousePosition.y = event.clientY;
      switch (_this._state) {
        case STATE.PANNING:
          _this.pan(oldMousePosition, newMousePosition);
          break;
        case STATE.ZOOMING:
          zoomByDrag(oldMousePosition, newMousePosition);
          break;
        case STATE.SLICING:
          sliceByDrag(oldMousePosition, newMousePosition);
          break;
        case STATE.SETTINGPROB:
          _this.prob(newMousePosition);
          break;
        case STATE.WINDOWING:
          windowByDrag(oldMousePosition, newMousePosition);
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
        _this.scrollStack((event.deltaY < 0) === config.stackTopIsWheelDown);
        event.preventDefault();
      }
    }

    function contextMenu(event) {
      if (!config.rightClickAllowed)
        event.preventDefault();
    }

    function updateDOM() {
      document.getElementById('button-control-pan').removeAttribute("disabled");
      document.getElementById('button-control-zoom').removeAttribute("disabled");
      document.getElementById('button-control-slice').removeAttribute("disabled");
      document.getElementById('button-control-window').removeAttribute("disabled");
      document.getElementById('button-control-prob').removeAttribute("disabled");

      document.getElementById('label-control-pan').classList.add("disabled");
      document.getElementById('label-control-zoom').classList.add("disabled");
      document.getElementById('label-control-slice').classList.add("disabled");
      document.getElementById('label-control-window').classList.add("disabled");
      document.getElementById('label-control-prob').classList.add("disabled");
      switch (_this._state) {
        case STATE.PAN:
        case STATE.PANNING:
          document.getElementById('button-control-pan').setAttribute("disabled", "true");
          document.getElementById('label-control-pan').classList.remove("disabled");
          break;
        case STATE.SETPROB:
        case STATE.SETTINGPROB:
          document.getElementById('button-control-prob').setAttribute("disabled", "true");
          document.getElementById('label-control-prob').classList.remove("disabled");
          break;
        case STATE.WINDOW:
        case STATE.WINDOWING:
          document.getElementById('button-control-window').setAttribute("disabled", "true");
          document.getElementById('label-control-window').classList.remove("disabled");
          break;
        case STATE.ZOOM:
        case STATE.ZOOMING:
          document.getElementById('button-control-zoom').setAttribute("disabled", "true");
          document.getElementById('label-control-zoom').classList.remove("disabled");
          break;
        case STATE.SLICE:
        case STATE.SLICING:
          document.getElementById('button-control-slice').setAttribute("disabled", "true");
          document.getElementById('label-control-slice').classList.remove("disabled");
          break;
      }
    }

    function setState(evt) {
      switch (evt.srcElement.id) {
        case 'button-control-pan':
          _this._state = STATE.PAN;
          break;
        case 'button-control-zoom':
          _this._state = STATE.ZOOM;
          break;
        case 'button-control-slice':
          _this._state = STATE.SLICE;
          break;
        case 'button-control-window':
          _this._state = STATE.WINDOW;
          break;
        case 'button-control-prob':
          _this._state = STATE.SETPROB;
          break;
      }
      updateDOM();
      evt.preventDefault();
    }

    function addEvents() {
      domElement.addEventListener('mousedown', mousedown, false);
      document.addEventListener('mouseup', mouseup, false);
      document.addEventListener('wheel', mousewheel, false);
      domElement.addEventListener('contextmenu', contextMenu, false); // Right click
      document.addEventListener('keypress', keypressed, false); // Keys
      document.addEventListener('keyup', keyup, false); // Keys
      document.addEventListener('keydown', keydown, false); // Keys

      document.getElementById('button-control-pan').addEventListener('click', setState);
      document.getElementById('button-control-zoom').addEventListener('click', setState);
      document.getElementById('button-control-slice').addEventListener('click', setState);
      document.getElementById('button-control-window').addEventListener('click', setState);
      document.getElementById('button-control-prob').addEventListener('click', setState);
    }

    function clearEvents() {
      domElement.removeEventListener('mousedown', mousedown, false);
      document.removeEventListener('mouseup', mouseup, false);
      document.removeEventListener('wheel', mousewheel, false);
      domElement.removeEventListener('contextmenu', contextMenu, false); // Right click
      document.removeEventListener('keypress', keypressed, false); // Keys
      document.removeEventListener('keyup', keyup, false); // Keys
      document.removeEventListener('keydown', keydown, false); // Keys
    }

    this.dispose = function() {
      clearEvents();
    };

    // /**
    //  * On mouse move callback
    //  */
    // function onMouseMove(event) {
    //   if (ctrlDown) {
    //     if (drag.start.x === null) {
    //       drag.start.x = event.clientX;
    //       drag.start.y = event.clientY;
    //     }
    //     let threshold = 15;
    //
    //     stackHelper.slice.intensityAuto = false;
    //
    //     let dynamicRange = stack.minMax[1] - stack.minMax[0];
    //     dynamicRange /= threeD.clientWidth;
    //
    //     if (Math.abs(event.clientX - drag.start.x) > threshold) {
    //       // window width
    //       stackHelper.slice.windowWidth +=
    //         dynamicRange * (event.clientX - drag.start.x);
    //       drag.start.x = event.clientX;
    //     }
    //
    //     if (Math.abs(event.clientY - drag.start.y) > threshold) {
    //       // window center
    //       stackHelper.slice.windowCenter -=
    //         dynamicRange * (event.clientY - drag.start.y);
    //       drag.start.y = event.clientY;
    //     }
    //   }
    // }
    // document.addEventListener('mousemove', onMouseMove);

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
