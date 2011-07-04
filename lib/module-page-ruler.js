const {Hotkey} = require("hotkeys");
const
  data = require("self").data,
  pageMod = require("page-mod"),
  prefs = require("preferences-service"),
  tabs = require("tabs"),
  widgets = require("widget")
;

var
  myHotkey,
  myPageMod,
  myWidget,
  myWorkers = new Array(),
  myWorkersTabs = new Array(),
  debugMode = false
;

exports._status = false;

/**
 * Log into the console the given message only if the debugMode is set to true
 */
exports.log = function (s) {
  if (debugMode)
    console.log(s);
};

/**
 * Init the addon adding a widget and a hotkey to toggle the ruler
 */
exports.init = function () {

  this.log('Binding tabs "onActivate" event...');
  tabs.on('activate', function (tab) {
    var pr = require('module-page-ruler');
    pr.checkTabStatus(tab);
    // Disabled the ruler on about:blank page
    // if (!pr.checkTabStatus(tab)) {
    //   pr.enableTabMod(tab);
    // }
  });
  this.log('Binding tabs "onActivate" event... Done.');

  this.log('Binding tabs "onClose" event...');
  tabs.on('close', function (tab) {
    require('module-page-ruler').disableTabMod(tab);
  });
  this.log('Binding tabs "onClose" event... Done.');

  this.log('Loading the pageMod...');
  myPageMod = pageMod.PageMod({
    include: "*",
    contentScriptFile: [
      data.url("page-ruler.js")
    ],
    onAttach: function onAttach(worker) {
      var pr = require('module-page-ruler');
      pr.addWorker(worker);
      pr.checkTabStatus(worker.tab);
    }
  });
  this.log('Loading the pageMod... Done.');

  this.log('Loading the widget...');
  myWidget = widgets.Widget({
    id: "page-ruler",
    label: "Page ruler",
    contentURL: data.url("favicon.off.ico"),
    onClick: function() {
      require('module-page-ruler').enable('Widget clicked.');
    }
  });
  this.log('Loading the widget... Done.');

  this.log('Loading the hotkey...');
  myHotkey = Hotkey({
    combo: "control-m",
    onPress: function() {
      require("module-page-ruler").enable("Hotkey pressed.");
    }
  });
  this.log('Loading the hotkey... Done.');
};

/**
 * Replace the worker of a tab
 */
exports.addWorker = function (worker) {
  this.log('Adding a mod to the tab "' + worker.tab.title + '[' + worker.tab.url + ']"...');
  var i = this.getIndexOfWorker(worker.tab);
  if (i != -1) {
    myWorkers[i] = worker;
    myWorkersTabs[i] = worker.tab;
  }
  else {
    myWorkers.push(worker);
    myWorkersTabs.push(worker.tab);
  }
  this.log('Adding a mod to the tab "' + worker.tab.title + '[' + worker.tab.url + ']"... Done.');
};

/**
 * Remove the worker of a tab
 */
exports.removeWorker = function (worker) {
  var i = this.getIndexOfWorker(worker.tab);
  if (i != -1) {
  }
  else {
    myWorkers.splice(i, 1);
    myWorkersTabs.splice(i, 1);
  }
};

/**
 * Get the worker of the current tab
 */
exports.getWorker = function () {
  this.log('Retrieving the mod of the tab "' + tabs.activeTab.title + '[' + tabs.activeTab.url + ']"...');

  var i = this.getIndexOfWorker(tabs.activeTab);
  if (i != -1) {
    return myWorkers[i];
  }
  else {
    return -1;
  }
};

/**
 * Get the index of the worker from the tab
 */
exports.getIndexOfWorker = function (tab) {
  var
    i = -1,
    workerFound = false
  ;

  try {
    for (i = 0; i < myWorkers.length; i++) {
      if (myWorkersTabs[i] == tab) {
        this.log('Worker found : #' + i + '.');
        workerFound = true;
        break;
      }
    }

    if (workerFound === false) {
      i = -1;
      this.log('Worker not found.');
    }

    return i;
  }
  catch (e) {
    this.log('An error occured while checking mod (#' + i + ') : "' +  e + '".');

    return -1;
  }

};

/**
 * Check the status of a tab
 */
exports.checkTabStatus = function (tab) {
  this.log('Checking status of the tab "' + tab.title + '[' + tab.url + ']"...');

  var
    worker = this.getWorker(),
    status
  ;

  if (worker && worker != -1) {
    myWidget.contentURL = data.url("favicon.ico");
    status = 'ON';
  }
  else {
    myWidget.contentURL = data.url("favicon.off.ico");
    status = 'OFF';
  }

  this.log('Checking status of the tab "' + tab.title + '[' + tab.url + ']"... ' + status + '.');

  return (status == 'ON') ? true : false;
};

/**
 * Attach a worker to a tab
 */
exports.enableTabMod = function (tab) {
  this.log('Attaching the mod to the tab "' + tab.title + '[' + tab.url + ']"...');

  var worker = tab.attach({
    contentScriptFile: [
      data.url("page-ruler.js")
    ]
  });

  this.addWorker(worker);
  this.checkTabStatus(tab);
  this.listen(worker);

  this.log('Attaching the mod to the tab "' + tab.title + '[' + tab.url + ']"... Done.');
};

/**
 * Remove a worker of a tab
 */
exports.disableTabMod = function (tab) {
  this.log('Removing the mod of the tab "' + tab.title + '[' + tab.url + ']"...');
  this.removeWorker(tab);
  this.log('Removing the mod of the tab "' + tab.title + '[' + tab.url + ']"... Done.');
};

/**
 * Load the listeners
 */
exports.listen = function (worker) {
  worker.port.on('message', function onMessage(message) {
    require("module-page-ruler").log(message);
  });

  worker.port.on('status', function onMessage(message) {
    var pr = require("module-page-ruler");
    pr._status = message;
    pr.log('Set status response to "' + message + '".')
  });

  worker.port.on('disable', function onMessage(message) {
    require("module-page-ruler").disable(message);
  });
};

/**
 * Enable the ruler
 */
exports.enable = function (message) {
  var worker = this.getWorker();

  if (worker && worker != -1) {
    this.log('Contacting the content script with message "' + message + '"...');

    if (this._status === true)
      this.disable(message);

    worker.port.emit('enable', data.load('page-ruler.html'));

    this.log('Contacting the content script with message "' + message + '"... Done.');
  }
  else {
    this.log('Contact of the content script with message "' + message + '" cancelled.');
  }
};

/**
 * Disable the ruler
 */
exports.disable = function (message) {
  this.log('Disabling the mod with message "' + message + '"...');
  var worker = this.getWorker();

  if (worker && worker != -1)
    worker.port.emit('disable', 'Disable from the mod.');
  else
    this._status = false;

  this.log('Disabling the mod with message "' + message + '"... Done.');

  return true;
};