var pageRuler = {

  _debug : false,
  coords : new Array(),
  isArea : false,
  isMouseDown : false,
  isMovingArea : false,
  paddingBottom: 20,

  init : function() {
    this.listen();
  },

  call : function (messageType, message) {
    if (this._debugMode) {
      self.port.emit(messageType, message);
    }
  },

  listen : function () {
    self.port.on('enable', function (message) {
      if (document.getElementById('addon-page-ruler'))
        pageRuler.disableRuler();

      var pr = pageRuler.enableRuler(message);
      if (pr === true)
        pageRuler.loadEvents();
      else {
        self.port.emit('disable', 'Script cancelled.');
         pageRuler.disableRuler();
      }
    });

    self.port.on('disable', function () {
      pageRuler.call('message', 'Disabling the script.');
      pageRuler.disableRuler();
      pageRuler.call('message', 'Disabling the script. Done.');
    });

    self.port.on('debugMode', function (debugMode) {
      // This one should'nt be displayed since debugMode is set false by defaut.
      pageRuler.call('message', 'Setting debug mode on : ' + debugMode + '.');
      pageRuler._debugMode = debugMode;
      pageRuler.call('message', 'Setting debug mode on : ' + debugMode + '. Done');
    });
  },

  enableRuler : function (html) {
    this.call('message', 'Body real tag is "' + document.body.tagName + '".');
    if (document.body.tagName == 'BODY') {
      this.call('message', 'Enable ruler !');
      this.call('message', 'Creating the areaNode');
      var div = document.createElement("div");
      div.id = "addon-page-ruler";
      div.innerHTML = html;
      document.body.appendChild(div);
      div.style.cursor = 'nwse-resize';
      div.style.height = this.getMaxDocumentHeight() + 'px';
      div.style.width = this.getMaxDocumentWidth() + 'px';
      this.call('message', 'Overlay size is '
        + div.style.width
        + ' x '
        + div.style.height
        + '.'
      );
      div.focus();

      this.adjustOverlay();

      return true;
    }
    else {
      return 'Page can\'t be measured.';
    }
  },

  disableRuler : function (message) {
    if (message)
      this.call('disable', message);

    this.unloadEvents();
    if (document.getElementById('addon-page-ruler'))
      document.getElementById('addon-page-ruler')
        .parentNode.removeChild(document.getElementById('addon-page-ruler'));

    this.isArea = false;
    this.isClicked = false;
    this._status = false;

    this.call('status', false);

    return true;
  },

  getMaxDocumentWidth : function () {
    var
      w = document.body.clientWidth,
      DW = document.documentElement.clientWidth,
      sDW = document.documentElement.scrollWidth
    ;
    if (!isNaN(DW) && DW > w)
      w = DW;
    if (!isNaN(sDW) && sDW > w)
      w = sDW;

    return w;
  },

  getMaxDocumentHeight : function () {
    var
      h = document.body.clientHeight,
      DH = document.documentElement.clientHeight,
      sDH = document.documentElement.scrollHeight
    ;
    if (!isNaN(DH) && DH > h)
      h = DH;
    if (!isNaN(sDH) && sDH > h)
      h = sDH;

    return h;
  },

  adjustOverlay : function () {
    var
      bW = this.getMaxDocumentWidth(),
      bH = this.getMaxDocumentHeight(),
      oW = document.getElementById('addon-page-ruler').offsetWidth,
      oH = document.getElementById('addon-page-ruler').offsetHeight,
      aW = document.getElementById('addon-page-ruler-area').offsetWidth,
      aH = document.getElementById('addon-page-ruler-area').offsetHeight,
      aL = document.getElementById('addon-page-ruler-area').offsetLeft,
      aT = document.getElementById('addon-page-ruler-area').offsetTop
    ;

    if (bH < (aT + aH))
      oH = (aT + aH);
    else
      oH = bH;

    if (bW < (aL + aW))
      oW = (aL + aW);
    else
      oW = bW;

    document.getElementById('addon-page-ruler').style.height = oH + 'px';
    document.getElementById('addon-page-ruler').style.width = oW + 'px';

    pageRuler.call('message', 'Overlay adjusted to '
      + oW
      + ' x '
      + oH
      + ' !');
  },

  loadEvents : function () {
    window.addEventListener('resize', this.onWindowResize, false);
    window.addEventListener('unload', this.onWindowUnload, false);
    document.addEventListener('mousedown', this.onMouseDownEvent, false);
    document.addEventListener('mousemove', this.onMouseMoveEvent, false);
    document.addEventListener('mouseup', this.onMouseUpEvent, false);
    document.addEventListener('keydown', this.onKeyDownEvent, false);
    document.getElementById('addon-page-ruler').addEventListener('DOMNodeRemoved', this.onDOMNodeRemovedEvent, false);
    document.getElementById('addon-page-ruler').addEventListener('dragstart', function (e) {e.preventDefault();}, false);

    this.call('message', 'Events loaded.');
  },

  unloadEvents : function () {
    window.removeEventListener('resize', this.onWindowResize, false);
    window.removeEventListener('unload', this.onWindowUnload, false);
    document.removeEventListener('mousedown', this.onMouseDownEvent, false);
    document.removeEventListener('mousemove', this.onMouseMoveEvent, false);
    document.removeEventListener('mouseup', this.onMouseUpEvent, false);
    document.removeEventListener('keydown', this.onKeyDownEvent, false);
    if (document.getElementById('addon-page-ruler'))
      document.getElementById('addon-page-ruler')
        .removeEventListener('DOMNodeRemoved', this.onDOMNodeRemovedEvent, false);
    this.coords.splice(0);

    this.call('message', 'Events unloaded.');
  },

  onWindowUnload : function () {
    pageRuler.disableRuler('Window unload event triggered.');
  },

  onWindowResize : function() {
    pageRuler.adjustOverlay();
  },

  onMouseDownEvent : function(e) {
    if (e.target.id == 'addon-page-ruler-close') {
      pageRuler.disableRuler('Close button clicked.');
    }
    else {
      if (e.target.id == 'addon-page-ruler' && pageRuler.isArea == false && pageRuler.isMouseDown == false) {
        pageRuler.call('message', 'Mouse down triggered on overlay...');

        document.getElementById('addon-page-ruler-legend').style.display = 'block';
        document.getElementById('addon-page-ruler-resize').style.display = 'block';
        document.getElementById('addon-page-ruler-close').style.display = 'block';

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

        pageRuler.call('message', 'Area started to '
          + e.pageX
          + ' x '
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
        if (e.target.id == 'addon-page-ruler-resize') {
          if (pageRuler.coords.length > 0)
            pageRuler.coords.splice(0);

          pageRuler.coords.push(xL);
          pageRuler.coords.push(yT);

          pageRuler.isArea = false;
          pageRuler.isMouseDown = true;

          pageRuler.call('message', 'Area resized from '
            + xW
            + ' x '
            + yH
            + ' !');
        }
        else if (
          e.target.id == 'addon-page-ruler-inner'
          && (e.pageX >= xL) && (e.pageX <= xW)
          && (e.pageY >= yT) && (e.pageY <= yH)
        ) {
          pageRuler.call('message', 'Mouse down triggered on area...');

          if (pageRuler.coords.length > 0)
            pageRuler.coords.splice(0);

          pageRuler.coords.push(xL - e.pageX);
          pageRuler.coords.push(yT - e.pageY);

          pageRuler.isMovingArea = true;

          pageRuler.call('message', 'Area is currently set to '
            + document.getElementById('addon-page-ruler-area').offsetLeft
            + ' x '
            + document.getElementById('addon-page-ruler-area').offsetTop
            + ' !');
        }
      }
    }
  },

  onMouseMoveEvent : function(e) {
    if (pageRuler.isArea == false && pageRuler.isMouseDown == true) {
      pageRuler.call('message', 'Mouse move triggered on mask...');

      document.getElementById('addon-page-ruler').style.cursor = 'default';
      document.getElementById('addon-page-ruler-area').style.width =
        (e.pageX - pageRuler.coords[0]) + "px";

      document.getElementById('addon-page-ruler-area').style.height =
        (e.pageY - pageRuler.coords[1]) + "px";

      var legend =
        document.getElementById('addon-page-ruler-inner').offsetWidth
        + ' x '
        + document.getElementById('addon-page-ruler-inner').offsetHeight
      ;

      document.getElementById('addon-page-ruler-legend').innerHTML = legend;

      pageRuler.adjustOverlay();

      pageRuler.call('message', 'Area adjusted to '
        + legend
        +  ' !');
    }
    else if (pageRuler.isMovingArea == true) {
      pageRuler.call('message', 'Mouse move triggered on area...');

      document.getElementById('addon-page-ruler-area').style.left =
        (e.pageX + pageRuler.coords[0]) + "px";

      document.getElementById('addon-page-ruler-area').style.top =
        (e.pageY + pageRuler.coords[1]) + "px";

      pageRuler.adjustOverlay();

      pageRuler.call('message', 'Area moved to '
        + document.getElementById('addon-page-ruler-area').offsetLeft
        + ' x '
        + document.getElementById('addon-page-ruler-area').offsetTop
        +  ' !');
    }
  },

  onMouseUpEvent : function(e) {
    if (pageRuler.coords.length > 0 && pageRuler.isArea == false) {
      pageRuler.call('message', 'Mouse up triggered...');

      pageRuler.coords.push(e.pageX);
      pageRuler.coords.push(e.pageY);

      document.getElementById('addon-page-ruler-inner').style.cursor = 'move';

      pageRuler.isArea = true;
      pageRuler.isMouseDown = false;

      pageRuler.adjustOverlay();

      pageRuler.call('message', 'Area ended to '
        + e.pageX
        + ' x '
        + e.pageY
        + ' !');
    }
    else if (pageRuler.isMovingArea == true) {
      pageRuler.call('message', 'Mouse up triggered on area...');
      pageRuler.isMovingArea = false;

      pageRuler.coords.push(e.pageX - document.getElementById('addon-page-ruler-area').offsetLeft);
      pageRuler.coords.push(e.pageY - document.getElementById('addon-page-ruler-area').offsetTop);

      pageRuler.adjustOverlay();

      pageRuler.call('message', 'Area is now set to '
        + document.getElementById('addon-page-ruler-area').offsetLeft
        + ' x '
        + document.getElementById('addon-page-ruler-area').offsetTop
        + ' !');
    }
  },

  onResizeEvent : function() {
    document.getElementById('addon-page-ruler-legend').innerHTML =
      document.getElementById('addon-page-ruler-inner').offsetWidth
      + ' x '
      + document.getElementById('addon-page-ruler-inner').offsetHeight
    ;
  },

  onKeyDownEvent : function(e) {
    if (e.which == 27)
      pageRuler.disableRuler('Key ESC pressed.');
  },

  onDOMNodeRemovedEvent : function (e) {
    if (e.target == 'addon-page-ruler')
      pageRuler.disableRuler('DOM removed.');
  }

};

pageRuler.init();
