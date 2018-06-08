/**
 * Inspired by AMI.TrackballOrthoControl
 */
const config = require('./viewer.config');
//const Map = require("collections/map");

export default class customControls extends THREE.EventDispatcher {
  constructor(camera, stack, cross, domElement, chgPtr) {
    super();
    // a simple handler to access "this." attributes from functions not declared as "this."function (aka private)
    let _this = this;

    // a pointer to pass the "haschanged" value by reference { hasChanged: true };
    let changePtr = chgPtr;

    // enum of possible states
    let STATE = {
      NONE: 0,
      SETPROB: 1,
      PAN: 3,
      PANNING: 4,
      WINDOW: 5,
      WINDOWING: 6,
      ZOOM: 7,
      ZOOMING: 8,
      SLICE: 9,
      SLICING: 10,
    };
    // a map of booleans to know which key is down at the moment
    let pressedKeys = new Map();

    // state to determine what the present action is
    let _state = STATE.NONE;
    // state to determine what button was selected before doing this action
    // useful to remember the right state even if the user use a shortcut to do another action
    let _buttonState = STATE.NONE;

    // drag and drop helpers
    let oldMousePosition = new THREE.Vector2();
    let newMousePosition = new THREE.Vector2();

    // temp vector to be used for calculations
    let _temp = new THREE.Vector3();

    // Public attributes
    this.camera = camera; // as a THREE.js camera (or AMI camera)
    this.stack = stack; // as a StackHelper, only the main stack
    this.cross = cross; // cross cursor (dom element)
    this.domElement = (domElement !== undefined) ? domElement : document; // canvas
    this.crossTarget = new THREE.Vector3(); // 3D position of cross cursor (in World)

    this.noZoom = false; // possibility to disable zooming
    this.noPan = false; // possibility to disable panning

    this._raycaster = new THREE.Raycaster(); // three js raycaster, only initialized once
    this._mouse = new THREE.Vector2(); // mouse position retalive to canvas x and y in [-1;1]

    // Useless
    // without that AMI calls missing objects, but we don't need it in our workflow
    this.target = new THREE.Vector3();
    this.handleResize = function() {};
    this.update = function() {};
    // end of useless


    // Public methods
    this.setAsResetState = function() {
      // TODO
    };
    this.reset = function() {
      //TODO
      changePtr.hasChanged = true;
    };

    // Moves the camera corresponding to a mouse movement from p1 to p2
    this.pan = function(p1, p2) {
      if (this.noPan)
        return;

      let x = p2.x - p1.x;
      let y = p2.y - p1.y;
      // update graphical cross
      cross.vertical.style.left = (cross.vertical.getBoundingClientRect().left - domElement.getBoundingClientRect().left + x) + "px";
      cross.horizontal.style.top = (cross.horizontal.getBoundingClientRect().top - domElement.getBoundingClientRect().top + y) + "px";
      // update 3D cross
      updateCrossTarget();
      // relative movement [-1,1]
      x /= domElement.offsetWidth;
      y /= domElement.offsetHeight;

      // Scale 2D movement to keep 3D world
      let scale_x = (_this.camera.right - _this.camera.left) / _this.camera.zoom;
      let scale_y = (_this.camera.top - _this.camera.bottom) / _this.camera.zoom;
      x *= scale_x;
      y *= scale_y;

      let pan = new THREE.Vector3();
      // vertical component
      pan.copy(_this.camera.up).setLength(y);
      // horizontal component
      pan.add(_temp.copy(_this.camera._right).setLength(-x));
      _this.camera.position.add(pan);
      changePtr.hasChanged = true;
    }


    this.zoom = function(directionIn, mouseFactor) {
      if (this.noZoom)
        return;
      // get the speed from the config
      let speed = config.zoomSpeed;
      if (mouseFactor !== undefined)
        speed = mouseFactor + 1; // and correct the speed if it's a mouse zoom (drag and not wheel)
      // factor > 1 to zoom in, factor < 1 to zoom out
      // expl : 1.2 is a 120% zoom (zoom in),  0.8 is a 80% zoom (zoom out)
      let factor = (directionIn) ? 1 / speed : speed;

      if (factor > 0.0) {

        // cross position stuff
        let target1 = null;
        updateMousePosition();
        _this._raycaster.setFromCamera(_this._mouse, _this.camera);
        let intersectsTarget = this._raycaster.intersectObject(this.stack._slice.children[0]);
        if (intersectsTarget.length > 0) {
          target1 = new THREE.Vector3();
          target1.copy(intersectsTarget[0].point);
        }

        // actually zoom
        this.camera.zoom /= factor;
        this.camera.updateProjectionMatrix();
        updateCrossTarget();

        // and correct the position
        if (target1 !== null) {
          target1.sub(_this.crossTarget);
          _this.camera.position.add(target1);
        }

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

    this.changeWindow = function(deltaWidth, deltaCenter, factor) {
      // Window width on X
      _this.stack.slice.windowWidth += deltaWidth * factor;
      _this.stack.slice.windowWidth = Math.min(Math.max(_this.stack.slice.windowWidth, 1), _this.stack._stack.minMax[1] - _this.stack._stack.minMax[0]);
      // Window center on -Y
      _this.stack.slice.windowCenter -= deltaCenter * factor;
      _this.stack.slice.windowCenter = Math.min(Math.max(_this.stack.slice.windowCenter, _this.stack._stack.minMax[0]), _this.stack._stack.minMax[1]);

      changePtr.hasChanged = true;
    }

    this.prob = function(event) {
      let rect = domElement.getBoundingClientRect();
      let x = event.clientX - rect.left;
      let y = event.clientY - rect.top;
      cross.horizontal.style.top = y + "px";
      cross.vertical.style.left = x + "px";

      updateCrossTarget();

      //TODO read the value
    }

    // Update the 3D position of the cross from its 2D position on the screen
    function updateCrossTarget() {
      updateMousePosition();

      _this._raycaster.setFromCamera(_this._mouse, _this.camera);
      let intersectsTarget = _this._raycaster.intersectObject(_this.stack._slice.children[0]);
      if (intersectsTarget.length > 0) {
        _this.crossTarget.copy(intersectsTarget[0].point);
      }
    }
    // update the vector _mouse from the position of the mouse on the screen
    function updateMousePosition() {
      let rectCanvas = domElement.getBoundingClientRect();
      let rectX = cross.vertical.getBoundingClientRect();
      let rectY = cross.horizontal.getBoundingClientRect();

      _this._mouse.x = ((rectX.left - rectCanvas.left) / rectCanvas.width) * 2 - 1;
      _this._mouse.y = -((rectY.top - rectCanvas.top) / rectCanvas.height) * 2 + 1;
    }

    ///////////
    // Event handlers
    ///////////

    function zoomByDrag(pOld, pNew) {
      _this.zoom(pOld.y > pNew.y, 0.01 * Math.abs(pOld.y - pNew.y));
    }

    function sliceByDrag(pOld, pNew) {
      _this.scrollStack(pOld.y - pOld.x > pNew.y - pNew.x);
    }

    function windowByDrag(pOld, pNew) {
      _this.changeWindow(pNew.x - pOld.x, pNew.y - pOld.y, 10);
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
          _this._buttonState = _this._state;
          break;
        case config.stateZoom:
          _this._state = STATE.ZOOM;
          _this._buttonState = _this._state;
          break;
        case config.stateMove:
          _this._state = STATE.PAN;
          _this._buttonState = _this._state;
          break;
        case config.stateSlice:
          _this._state = STATE.SLICE;
          _this._buttonState = _this._state;
          break;
        case config.stateWindow:
          _this._state = STATE.WINDOW;
          _this._buttonState = _this._state;
          break;
        case config.stateProb:
          _this._state = STATE.SETPROB;
          _this._buttonState = _this._state;
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

        case 1:  // left click
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
            case STATE.WINDOW:
              _this._state = STATE.WINDOWING;
              break;
            default:
              _this.prob(event);
          }
          break;

        case 2: // middle click
          _this._state = STATE.PANNING;
          event.preventDefault();
          break;

        case 3:  //right click
          _this._state = STATE.WINDOWING;
          break;
      }
      oldMousePosition.x = event.clientX;
      oldMousePosition.y = event.clientY;

      document.addEventListener('mousemove', mousemove, false);
      updateDOM();
    }

    function mouseup(event) {
      _this._state = _this._buttonState;
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
        case STATE.WINDOWING:
          windowByDrag(oldMousePosition, newMousePosition);
          break;
        default:
          _this.prob(event);
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
        case STATE.SETPROB:
        default:
          document.getElementById('button-control-prob').setAttribute("disabled", "true");
          document.getElementById('label-control-prob').classList.remove("disabled");
          break;
      }
    }

    function setState(evt) {
      switch (evt.target.id) {
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
      _this._buttonState = _this._state;
      updateDOM();
      evt.preventDefault();
    }

    function addEvents() {
      // some event are better on the canvas, and others on the whole document.
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
    updateCrossTarget();

    this.handleResize();
    this.update();
    this.setAsResetState();
  }

}
