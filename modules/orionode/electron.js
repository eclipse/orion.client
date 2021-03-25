/*******************************************************************************
 * Copyright (c) 2012, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node, express, compression*/
var fs = require('fs'),
	os = require('os'),
	api = require('./lib/api'),
	path = require('path'),
	prefs = require('./lib/prefs');

module.exports.start = function(startServer, configParams) {
	var electron = require('electron'),
		log4js = require('log4js'),
		logger = log4js.getLogger('electron'),
		autoUpdater = require('./lib/autoUpdater'),
		spawn = require('child_process').spawn,
		allPrefs = prefs.readElectronPrefs(),
		feedURL = configParams.get("orion.autoUpdater.url"),
		version = electron.app.getVersion(),
		name = electron.app.getName(),
		platform = os.platform(),
		arch = os.arch();

	configParams.set("isElectron", true);
	electron.app.buildId = configParams.get("orion.buildId");

	if (feedURL) {
		var updateChannel = allPrefs.user && allPrefs.user.updateChannel && allPrefs.user.updateChannel.name ? allPrefs.user.updateChannel.name : configParams.get("orion.autoUpdater.defaultChannel"),
			latestUpdateURL;
		if (platform === "linux") {
			latestUpdateURL = feedURL + '/download/channel/' + updateChannel + '/linux';
		} else {
			latestUpdateURL = feedURL + '/update/channel/' + updateChannel + '/' + platform + "_" + arch + '/' + version;
		}
		var resolveURL = feedURL + '/api/resolve?platform=' + platform + '&channel=' + updateChannel;
		
		logger.debug("resolveURL", resolveURL);
		logger.debug("latestUpdateURL", latestUpdateURL);
		autoUpdater.setResolveURL(resolveURL);
		autoUpdater.setFeedURL(latestUpdateURL);
	}

	var handleSquirrelEvent = function() {
		if (process.argv.length === 1 || os.platform() !== 'win32') { // No squirrel events to handle
			return false;
		}

		var	target = path.basename(process.execPath);

		function executeSquirrelCommand(args, done) {
			var updateDotExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
			var child = spawn(updateDotExe, args, { detached: true });
			child.on('close', function() {
				done();
			});
		}

		var squirrelEvent = process.argv[1];
		switch (squirrelEvent) {
			case '--squirrel-install':
			case '--squirrel-updated':
				// Install desktop and start menu shortcuts
				executeSquirrelCommand(["--createShortcut", target], electron.app.quit);
				setTimeout(electron.app.quit, 1000);
				return true;
			case '--squirrel-obsolete':
				// This is called on the outgoing version of the app before
				// we update to the new version - it's the opposite of
				// --squirrel-updated
				electron.app.quit();
				return true;
			case '--squirrel-uninstall':
				// Remove desktop and start menu shortcuts
				executeSquirrelCommand(["--removeShortcut", target], electron.app.quit);
				setTimeout(electron.app.quit, 1000);
				return true;
		}
		return false;
	};

	if (handleSquirrelEvent()) {
		// Squirrel event handled and app will exit in 1000ms
		return;
	}
	
	function updateWorkspacePrefs(workspace, _allPrefs){
		var allPrefs = _allPrefs ? _allPrefs : prefs.readElectronPrefs();
		if (!allPrefs.user.workspace) allPrefs.user.workspace = {};
		allPrefs.user.workspace.currentWorkspace = workspace;
		if(!allPrefs.user.workspace.recentWorkspaces){
			allPrefs.user.workspace.recentWorkspaces = [];
		}
		var recentWorkspaces = allPrefs.user && allPrefs.user.workspace && allPrefs.user.workspace.recentWorkspaces;
		var RECENT_ARRAY_LENGTH = 10;
		var oldIndex = recentWorkspaces.indexOf(workspace);
		if(oldIndex !== -1){
			allPrefs.user.workspace.recentWorkspaces.splice(oldIndex,1);
		}
		if(recentWorkspaces.length < RECENT_ARRAY_LENGTH){
			allPrefs.user.workspace.recentWorkspaces.unshift(workspace);
		}else if(recentWorkspaces.length === RECENT_ARRAY_LENGTH){
			allPrefs.user.workspace.recentWorkspaces.pop();
			allPrefs.user.workspace.recentWorkspaces.unshift(workspace);
		}
		prefs.writeElectronPrefs(allPrefs);
	}
	
	function updateLastOpendTabsPrefs(tabs, activeIndex, originalWorkspace){
		var allPrefs = prefs.readElectronPrefs();
		var openedTabs = allPrefs.user && allPrefs.user.workspace && allPrefs.user.workspace.openedTabs;
		if(!openedTabs){
			((allPrefs.user || (allPrefs.user = {})).workspace || (allPrefs.user.workspace = {})).openedTabs || (allPrefs.user.workspace.openedTabs={});
		}
		var currentWorkspace = (originalWorkspace ? originalWorkspace : allPrefs.user.workspace.currentWorkspace) || configParams.get("workspace");
		allPrefs.user.workspace.openedTabs[currentWorkspace] = {};
		allPrefs.user.workspace.openedTabs[currentWorkspace].tabs = tabs;
		allPrefs.user.workspace.openedTabs[currentWorkspace].activeIndex = activeIndex;
		prefs.writeElectronPrefs(allPrefs);
	}

	var readyToOpenDir, relativeFileUrl;
	electron.app.on('open-file', function(event, path) {
		readyToOpenDir = path;
	});
	electron.app.on('ready', function() {
		var updateDownloaded  = false,
			updateDialog = false,
			linuxDialog = false,
			prefsWorkspace = allPrefs.user && allPrefs.user.workspace && allPrefs.user.workspace.currentWorkspace,
			recentWorkspaces = allPrefs.user && allPrefs.user.workspace && allPrefs.user.workspace.recentWorkspaces,
			Menu = electron.Menu;
			
		if (prefsWorkspace) {
			configParams.set("workspace", prefsWorkspace);
		}
		if(readyToOpenDir){
			try{
				var stats = fs.statSync(readyToOpenDir);
				if(stats.isFile()){
					var parentDir = path.dirname(readyToOpenDir);
					var similarity = 0;
					configParams.set("workspace", parentDir);
					recentWorkspaces.forEach(function(eachRecent){
						if(parentDir.lastIndexOf(eachRecent,0) === 0 && eachRecent.length > similarity){
							similarity = eachRecent.length;
							return configParams.set("workspace", eachRecent);
						}
					});
					relativeFileUrl = api.toURLPath(readyToOpenDir.substring(configParams.get("workspace").length));
				}else if(stats.isDirectory()){
					configParams.set("workspace", readyToOpenDir);
				}
				// updateWorkspacePrefs(configParams.get("workspace"), allPrefs);
			}catch(e){}
		}
		if (process.platform === 'darwin') {
			if (!Menu.getApplicationMenu()) {
				var template = [{
					label: name,
					submenu: [
						{role: 'about'},
						{ type: "separator" },
						{role: 'hide'},
					    {role: 'hideothers'},
					    {role: 'unhide'},
					    {type: 'separator'},
					    {role: 'quit'}
					]}, {
					label: "Edit",
					submenu: [
						{role: 'undo'},
					    {role: 'redo'},
					    {type: 'separator'},
					    {role: 'cut'},
					    {role: 'copy'},
					    {role: 'paste'},
						{role: 'selectall'}
					]},  {
					    label: 'View',
					    submenu: [
					      {role: 'resetzoom'},
					      {role: 'zoomin'},
					      {role: 'zoomout'},
					      {type: 'separator'},
					      {role: 'togglefullscreen'}
					 ]}, {
					    role: 'window',
					    submenu: [
					      {role: 'minimize'},
					      {role: 'close'}
					    ]
					  },
					{label: "Debug",
					submenu: [
						{ label: "Toggle Developer Tools", accelerator: "Cmd+Option+I", click: function (item, focusedWindow) {
							//if windows, add F12 to also open dev tools - depending on electron / windows versions this might not be allowed to be rebound
							if (focusedWindow) focusedWindow.webContents.toggleDevTools();
						}}
					]}
				];
				Menu.setApplicationMenu(Menu.buildFromTemplate(template));
			}
		} else {
			//always add Ctrl+Shift+I for non-MacOS platforms - matches the browser devs tools shortcut
			var template = [makeDevToolMenuItem("Devtool","Ctrl+Shift+I")];
			Menu.setApplicationMenu(Menu.buildFromTemplate(template));
		}
		if(process.platform === "win32") {
			var menu = Menu.getApplicationMenu();
			//if windows, add F12 to also open dev tools - depending on electron / windows versions this might not be allowed to be rebound
			menu.append(new electron.MenuItem(makeDevToolMenuItem("DevtoolforWin32","F12")));
			Menu.setApplicationMenu(menu);
		}
		function makeDevToolMenuItem(label, accelerator){
			return {
				label: label,
				submenu: [
					{ label: "openDevTool", accelerator: accelerator, click: function (item, focusedWindow) {
			          if (focusedWindow) focusedWindow.webContents.toggleDevTools();
			        }}
				]
			}
		}
		autoUpdater.on("error", function(error) {
			logger.error(error);
		});
		autoUpdater.on("update-available-automatic", function(newVersion) {
			if (platform === "linux" && !linuxDialog) {
				electron.dialog.showMessageBox({
					type: 'question',
					message: 'Update version ' + newVersion + ' is available.',
					detail: 'Use your package manager to update, or click Download to get the new package.',
					buttons: ['Download', 'OK']
				}, function (response) {
					if (response === 0) {
						electron.shell.openExternal(latestUpdateURL);
					} else {
						linuxDialog = false;
					}
				});
				linuxDialog = true;
			} else {
				autoUpdater.checkForUpdates();
			}
			
		});
		autoUpdater.on("update-downloaded", /* @callback */ function(event, releaseNotes, releaseName, releaseDate, updateURL) {
			updateDownloaded = true;
			logger.debug("update-downloaded: ", releaseName);
			if (!updateDialog) {
				electron.dialog.showMessageBox({
					type: 'question',
					message: 'Update version ' + releaseName + ' of ' + name + ' has been downloaded.',
					detail: 'Would you like to restart the app and install the update? The update will be applied automatically upon closing.',
					buttons: ['Update', 'Later']
				}, function (response) {
					if (response === 0) {
						autoUpdater.quitAndInstall();
					}
				});
				updateDialog = true;
			}
		});

		function scheduleUpdateChecks () {
			var checkInterval = (configParams.get("orion.autoUpdater.checkInterval") >> 0 || 30) * 1000 * 60;
			var resolveNewVersion = function() {
				autoUpdater.resolveNewVersion(false);
			}.bind(this);
			setInterval(resolveNewVersion, checkInterval);
		}
		function createWindow(url){
			var Url = require("url");
			var windowOptions = allPrefs.windowBounds || {width: 1024, height: 800};
			windowOptions.title = "Orion";
			windowOptions.icon = "icon/256x256/orion.png";
			var nextWindow = new electron.BrowserWindow(windowOptions);
			var ipcMain  = electron.ipcMain;
			nextWindow.setMenuBarVisibility(false);	// This line only work for Window and Linux
			if (windowOptions.maximized) {
				nextWindow.maximize();
			}
			nextWindow.loadURL("file:///" + __dirname + "/lib/main.html#" + encodeURI(url));
			nextWindow.webContents.on("new-window", /* @callback */ function(event, url, frameName, disposition, options){
				event.preventDefault();
				if (false === undefined) {// Always open new tabs for now
					createWindow(url);
				} 
				else if (Url.parse(url).hostname !== "localhost") {
					electron.shell.openExternal(url);
				}
				else {
					nextWindow.webContents.executeJavaScript('createTab("' + url + '");');
				}
			});
			nextWindow.on("close", function(event) {
				function exit() {
					allPrefs = prefs.readElectronPrefs();
					allPrefs.windowBounds = nextWindow.getBounds();
					allPrefs.windowBounds.maximized = nextWindow.isMaximized();
					prefs.writeElectronPrefs(allPrefs);
					log4js.shutdown(function(){
						if (updateDownloaded) {
							nextWindow.webContents.session.clearCache(function() {
								nextWindow.destroy();
							});
						}else{
							nextWindow.destroy();
						}
					});
				}
				event.preventDefault();
				nextWindow.webContents.send('collect-tabs-info','closeorion');	
				ipcMain.on("collected-tabs-info-closeorion", function(event, args, activeIndex){
					updateLastOpendTabsPrefs(args, activeIndex);
					exit();
				});
			});
			nextWindow.on("focus", function(event) {
				nextWindow.webContents.executeJavaScript('bindfocus();');
			});
			nextWindow.webContents.once("did-frame-finish-load", function () {
				if (feedURL) {
					autoUpdater.resolveNewVersion(false);
					scheduleUpdateChecks();
				}
			});
			var newTargetWorkspace;
			var originalWorkspace;
			api.getOrionEE().on("workspace-changed",function(workspaces){
				newTargetWorkspace = workspaces[0];
				originalWorkspace = workspaces[1];
				// step1: update new pref's currentworkspace and recentworkspaces with newTargetWorkspace
				// updateWorkspacePrefs(newTargetWorkspace);
				// step2: collect tabs info
				nextWindow.webContents.send('collect-tabs-info','changeworkspace');
			});
			api.getOrionEE().on("open-tabs", function(){
				var allPrefs = prefs.readElectronPrefs();
				var openedTabs = allPrefs.user && allPrefs.user.workspace && allPrefs.user.workspace.openedTabs && allPrefs.user.workspace.openedTabs[newTargetWorkspace] && allPrefs.user.workspace.openedTabs[newTargetWorkspace]["tabs"] || [];
				var activeIndex = allPrefs.user && allPrefs.user.workspace && allPrefs.user.workspace.openedTabs && allPrefs.user.workspace.openedTabs[newTargetWorkspace] && allPrefs.user.workspace.openedTabs[newTargetWorkspace]["activeIndex"] || 0;
				var hostUrl = "http://localhost:" + configParams.get("port");
				// step4: open tabs of new current workspace if any saved before
				if(openedTabs.length > 0 && openedTabs[0] !== 'about:blank'){
					nextWindow.webContents.executeJavaScript('createTab("' + hostUrl + "/" + openedTabs[0] + '");');
					for(var i = 1; i < openedTabs.length; i++ ){
						if(openedTabs[i] !== 'about:blank'){
							nextWindow.webContents.executeJavaScript('window.open("' + hostUrl + "/" + openedTabs[i] + '");');
						}
					}
					nextWindow.webContents.executeJavaScript('setActiveIndex("' + activeIndex + '");');
				}else{ // if user open that workspace for the first time
					nextWindow.webContents.executeJavaScript('createTab("' + hostUrl + '");');
				}
			});
			ipcMain.on("collected-tabs-info-changeworkspace", function(event, args, activeIndex){
				updateLastOpendTabsPrefs(args, activeIndex, originalWorkspace);
				// step3: close all tabs of last workspace
				nextWindow.webContents.executeJavaScript('closeAllTabs();');
				api.getOrionEE().emit("open-tabs");
			});
			return nextWindow;
		}
		startServer(function() {
			var mainWindow,
			 	hostUrl = "http://localhost:" + configParams.get("port"),
			 	openedTabs = allPrefs.user && allPrefs.user.workspace && allPrefs.user.workspace.openedTabs && allPrefs.user.workspace.openedTabs[prefsWorkspace] && allPrefs.user.workspace.openedTabs[prefsWorkspace]["tabs"] || [],
				activeIndex = allPrefs.user && allPrefs.user.workspace && allPrefs.user.workspace.openedTabs && allPrefs.user.workspace.openedTabs[prefsWorkspace] && allPrefs.user.workspace.openedTabs[prefsWorkspace]["activeIndex"] || 0;
				
			if(relativeFileUrl){
				var fileUrl = hostUrl + "/edit/edit.html#/file" + relativeFileUrl;
				openedTabs.unshift("edit/edit.html#/file" + relativeFileUrl);
				activeIndex = 0;
			}
			if(readyToOpenDir && prefsWorkspace !== configParams.get("workspace")) {
				mainWindow = createWindow(fileUrl ? fileUrl : hostUrl);
			}else{
				if(openedTabs.length > 0 && openedTabs[0] !== 'about:blank'){
					mainWindow = createWindow(hostUrl + "/" + openedTabs[0]); 
					for(var i = 1; i < openedTabs.length; i++ ){
						if(openedTabs[i] !== 'about:blank'){
							mainWindow.webContents.executeJavaScript('window.open("' + hostUrl + "/" + openedTabs[i] + '");');
						}
					}
					mainWindow.webContents.executeJavaScript('setActiveIndex("' + activeIndex + '");');
				}else{ // if user open Orion for the first time
					mainWindow = createWindow(hostUrl);
				}
			}
			mainWindow.on('closed', function() {
				mainWindow = null;
			});
		});
	});
	electron.app.on('window-all-closed', function() {
		electron.app.quit();	
	});
	
};
