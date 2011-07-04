var pageRuler = {

  _status : false,
  coords : new Array(),
  isArea : false,
  isMouseDown : false,
  isMovingArea : false,

  init : function() {
    this.listen();
  },

  listen : function () {
    self.port.on('enable', function (message) {
      if (document.getElementById('addon-page-ruler'))
        pageRuler.disableRuler();

      pageRuler.enableRuler(message)
        && pageRuler.loadEvents();
    });

    self.port.on('disable', function () {
      pageRuler.disableRuler();
    });

    self.port.on('check', function () {
      self.port.emit('status', this._status);
    });

    self.port.on('message', function (message) {
      self.port.emit('message', message);
    });
  },

  enableRuler : function (html) {
    self.port.emit('message', 'page-ruler.js : enable ruler !');
    self.postMessage('Creating the areaNode');
    var div = document.createElement("div");
    div.id = "addon-page-ruler"
    div.innerHTML = html;
    document.body.appendChild(div);
    div.style.width = document.documentElement.offsetWidth + 'px';
    div.style.height = document.documentElement.offsetHeight + 'px';
    div.focus();

    this._status = true
    self.port.emit('status', true);

    return true;
  },

  disableRuler : function () {
    this.unloadEvents();
    if (document.getElementById('addon-page-ruler'))
      document.getElementById('addon-page-ruler')
        .parentNode.removeChild(document.getElementById('addon-page-ruler'));

    this.isArea = false;
    this.isClicked = false;
    this._status = false;

    self.port.emit('status', false);

    return true;
  },

  loadEvents : function () {
    document.addEventListener('mousedown', this.onMouseDownEvent, false);
    document.addEventListener('mousemove', this.onMouseMoveEvent, false);
    document.addEventListener('mouseup', this.onMouseUpEvent, false);
    document.addEventListener('keydown', this.onKeyDownEvent, false);
    document.getElementById('addon-page-ruler').addEventListener('DOMNodeRemoved', this.onDOMNodeRemovedEvent, false);

    self.port.emit('message', 'Events loaded.');
  },

  unloadEvents : function () {
    document.removeEventListener('mousedown', this.onMouseDownEvent, false);
    document.removeEventListener('mousemove', this.onMouseMoveEvent, false);
    document.removeEventListener('mouseup', this.onMouseUpEvent, false);
    document.removeEventListener('keydown', this.onKeyDownEvent, false);
    if (document.getElementById('addon-page-ruler'))
      document.getElementById('addon-page-ruler')
        .removeEventListener('DOMNodeRemoved', this.onDOMNodeRemovedEvent, false);
    this.coords.splice(0);

    self.port.emit('message', 'Events unloaded.');
  },

  onMouseDownEvent : function(e) {
    if (e.target.id == 'addon-page-ruler-close') {
      pageRuler.disableRuler()
        && self.port.emit('disable', 'Close button clicked.');
    }
    else {
      if (pageRuler.isArea == false && pageRuler.isMouseDown == false) {
        self.port.emit('message', 'Mouse down triggered on overlay...');

        document.getElementById('addon-page-ruler-area').style.height = 0;
        document.getElementById('addon-page-ruler-area').style.width = 0;

        if (pageRuler.coords.length > 0)
          pageRuler.coords.splice(0);

        pageRuler.coords.push(e.pageX);
        pageRuler.coords.push(e.pageY);

        document.getElementById('addon-page-ruler-area').style.left = e.pageX + "px";
        document.getElementById('addon-page-ruler-area').style.top = e.pageY + "px";

        pageRuler.isArea = false;
        pageRuler.isMouseDown = true;

        self.port.emit('message', 'page-ruler.js : area started to '
          + e.pageX
          + 'x'
          + e.pageY
          + ' !');
      }
      else if (pageRuler.isArea == true) {
        var
          xL = document.getElementById('addon-page-ruler-area').offsetLeft,
          xW = xL + document.getElementById('addon-page-ruler-area').offsetWidth,
          yT = document.getElementById('addon-page-ruler-area').offsetTop,
          yH = yT + document.getElementById('addon-page-ruler-area').offsetHeight
        ;
        if (
          e.target.id == 'addon-page-ruler-resize'
          || (
            (e.pageX >= xW - 20) && (e.pageX <= xW)
            && (e.pageY >= yH - 20) && (e.pageY <= yH)
          )
        ) {
          if (pageRuler.coords.length > 0)
            pageRuler.coords.splice(0);

          pageRuler.coords.push(xL);
          pageRuler.coords.push(yT);

          pageRuler.isArea = false;
          pageRuler.isMouseDown = true;

          self.port.emit('message', 'page-ruler.js : area resized from '
            + xW
            + 'x'
            + yH
            + ' !');
        }
        else if (
          e.target.id != 'addon-page-ruler-legend'
          && (e.pageX >= xL) && (e.pageX <= xW)
          && (e.pageY >= yT) && (e.pageY <= yH)
        ) {
          self.port.emit('message', 'Mouse down triggered on area...');

          if (pageRuler.coords.length > 0)
            pageRuler.coords.splice(0);

          pageRuler.coords.push(xL - e.pageX);
          pageRuler.coords.push(yT - e.pageY);

          pageRuler.isMovingArea = true;

          self.port.emit('message', 'page-ruler.js : area is currently set to '
            + document.getElementById('addon-page-ruler-area').offsetLeft
            + 'x'
            + document.getElementById('addon-page-ruler-area').offsetTop
            + ' !');
        }
      }
    }
  },

  onMouseMoveEvent : function(e) {
    if (pageRuler.isArea == false && pageRuler.isMouseDown == true) {
      self.port.emit('message', 'Mouse move triggered on mask...');

      document.getElementById('addon-page-ruler-area').style.width =
        (e.pageX - pageRuler.coords[0]) + "px";

      document.getElementById('addon-page-ruler-area').style.height =
        (e.pageY - pageRuler.coords[1]) + "px";

      var legend =
        document.getElementById('addon-page-ruler-area').offsetWidth
        + 'x'
        + document.getElementById('addon-page-ruler-area').offsetHeight
      ;

      document.getElementById('addon-page-ruler-legend').innerHTML = legend;

      self.port.emit('message', 'page-ruler.js : area adjusted to '
        + legend
        +  ' !');
    }
    else if (pageRuler.isMovingArea == true) {
      self.port.emit('message', 'Mouse move triggered on area...');

      document.getElementById('addon-page-ruler-area').style.left =
        (e.pageX + pageRuler.coords[0]) + "px";

      document.getElementById('addon-page-ruler-area').style.top =
        (e.pageY + pageRuler.coords[1]) + "px";

      self.port.emit('message', 'page-ruler.js : area moved to '
        + document.getElementById('addon-page-ruler-area').offsetLeft
        + 'x'
        + document.getElementById('addon-page-ruler-area').offsetTop
        +  ' !');
    }
  },

  onMouseUpEvent : function(e) {
    if (pageRuler.coords.length > 0 && pageRuler.isArea == false) {
      self.port.emit('message', 'Mouse up triggered...');

      pageRuler.coords.push(e.pageX);
      pageRuler.coords.push(e.pageY);

      document.getElementById('addon-page-ruler-area').style.cursor = 'move';

      pageRuler.isArea = true;
      pageRuler.isMouseDown = false;

      self.port.emit('message', 'page-ruler.js : area ended to '
        + e.pageX
        + 'x'
        + e.pageY
        + ' !');
    }
    else if (pageRuler.isMovingArea == true) {
      self.port.emit('message', 'Mouse up triggered on area...');
      pageRuler.isMovingArea = false;

      pageRuler.coords.push(e.pageX - document.getElementById('addon-page-ruler-area').offsetLeft);
      pageRuler.coords.push(e.pageY - document.getElementById('addon-page-ruler-area').offsetTop);

      self.port.emit('message', 'page-ruler.js : area is now set to '
        + document.getElementById('addon-page-ruler-area').offsetLeft
        + 'x'
        + document.getElementById('addon-page-ruler-area').offsetTop
        + ' !');
    }
  },

  onResizeEvent : function() {
    document.getElementById('addon-page-ruler-legend').innerHTML =
      document.getElementById('addon-page-ruler-area').offsetWidth
      + 'x'
      + document.getElementById('addon-page-ruler-area').offsetHeight
    ;
  },

  onKeyDownEvent : function(e) {
    if (e.which == 27)
      pageRuler.disableRuler()
        && self.port.emit('disable', 'Key ESC pressed.');
  },

  onDOMNodeRemovedEvent : function (e) {
    if (e.target == 'addon-page-ruler')
      pageRuler.disableRuler()
        && self.port.emit('disable', 'DOM removed.');
  }

};

pageRuler.init();
