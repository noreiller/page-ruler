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
  myWorker,
  myWorkers = new Array(),
  myWorkersTabs = new Array()
;

exports._debugMode = false;

/**
 * Log into the console the given message only if the debugMode is set to true
 */
exports.log = function (s, isError) {
  if (!isError)
    isError = false;

  if (this._debugMode)
    isError ? console.exception(s) : console.info(s);
};

/**
 * Init the addon adding a widget and a hotkey to toggle the ruler
 */
exports.init = function () {

  this.log('Binding tabs "onActivate" event...');
  tabs.on('activate', function (tab) {
    require('module-page-ruler').checkTabStatus(tab);
  });
  this.log('Binding tabs "onActivate" event... Done.');

  this.log('Loading the pageMod...');
  myPageMod = pageMod.PageMod({
    include: "*",
    contentScriptWhen: 'end',
    contentScriptFile: [
      data.url("page-ruler.js")
    ],
    onAttach: function onAttach(worker) {
      worker.port.emit('init', tabs.activeTab.url);
      worker.port.on('init', function (message) {
        if (message == 'true')
          require('module-page-ruler').addWorker(worker);
      });
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
      require('module-page-ruler').enable("Hotkey pressed.");
    }
  });
  this.log('Loading the hotkey... Done.');
};

/**
 * Check the status of a tab
 */
exports.checkTabStatus = function (tab, worker) {
  tab = tab ? tab : tabs.activeTab;
  worker = worker ? worker : this.getWorker();
  var status;

  this.log('Checking status of the tab "' + tab.title + '[' + tab.url + ']"...');


  if (worker && worker != -1) {
    tab.attach({
      contentScript: 'self.postMessage(document.body.tagName);',
      onMessage: function (message) {
        if (message != 'BODY')
          require('module-page-ruler').removeWorker(null, "Page can't be measured");
      }
    });
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
 * Enable the ruler
 */
exports.enable = function (message) {
  var worker = this.getWorker();

  if (worker && worker != -1) {
    this.log('Contacting the content script with message "' + message + '"...');
    worker.port.emit('enable', data.load('page-ruler.html'));
    this.log('Contacting the content script with message "' + message + '"... Done.');
  }
  else {
    this.log('Contact of the content script with message "' + message + '" cancelled.');
  }
};

/**
 * Replace the worker of a tab
 */
exports.addWorker = function (worker) {
  this.log('Adding a mod to the tab "' + worker.tab.title + '[' + worker.tab.url + ']"...');

  myWorkers.push(worker);
  myWorkersTabs.push(worker.tab);

  this.checkTabStatus(worker.tab, worker);

  worker.port.emit('debugMode', this._debugMode);

  worker.port.on('message', function (message) {
    require("module-page-ruler").log(message);
  });

  worker.port.on('disable', function (message) {
    require("module-page-ruler").log(message);
  });

  worker.on('detach', function () {
    require('module-page-ruler').removeWorker(this);
  });

  this.log('Adding a mod to the tab "' + worker.tab.title + '[' + worker.tab.url + ']"... Done.');
};

/**
 * Remove a worker
 */
exports.removeWorker = function (worker, message) {
  if (!worker)
    worker = this.getWorker();

  if (message)
    message = ' with message "' + message + '"';
  else
    message = '';

  this.log('Removing the worker' + message + '...');

  var index = myWorkers.indexOf(worker);
  if (index != -1) {
    myWorkersTabs.splice(index, 1);
    myWorkers.splice(index, 1);
  }
  myWidget.contentURL = data.url("favicon.off.ico");

  this.log('Removing the worker' + message + '... Done.');
};

/**
 * Get the worker of the current tab
 */
exports.getWorker = function (buildIfNotFound) {
  this.log('Retrieving the mod of the tab "' + tabs.activeTab.title + '[' + tabs.activeTab.url + ']"...');

  var i = this.getIndexOfWorkerFromTabs(buildIfNotFound);
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
exports.getIndexOfWorkerFromTabs = function (buildIfNotFound) {
  var
    tab = tabs.activeTab,
    i = -1,
    workerFound = false
  ;
  if (!buildIfNotFound)
    buildIfNotFound = false;

  this.log('Workers in the list : ' + myWorkers.length + '.');

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
    this.log('An error occured while checking mod (#' + i + ').');
    this.log(e, true);

    return -1;
  }

};