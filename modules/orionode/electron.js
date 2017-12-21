/*******************************************************************************
 * Copyright (c) 2012, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node, express, compression*/
/*eslint-disable no-shadow-global */
var fs = require('fs'),
	os = require('os'),
	api = require('./lib/api'),
	path = require('path'),
	metastoreFactory = require('./lib/metastore/fs/store'),
	MODEL = require('./lib/model/long_key_pref'),
	prefs = require('./lib/prefs'),
	metaUtil = require('./lib/metastore/util/metaUtil');

var electronUserName = "anonymous";
var UPDATE_CHANNEL_NAME_PREF_KEY = "updateChannel/name";
var WINDOWS_BOUNDS_PREF_KEY ="electron/windowBounds";


module.exports.start = function(startServer, configParams) {
	var electron = require('electron'),
		log4js = require('log4js'),
		logger = log4js.getLogger('electron'),
		autoUpdater = require('./lib/autoUpdater'),
		spawn = require('child_process').spawn,
		feedURL = configParams.get("orion.autoUpdater.url"),
		version = electron.app.getVersion(),
		name = electron.app.getName(),
		platform = os.platform(),
		arch = os.arch(),
		allPrefs, updateDownloaded;
		
	var store = metastoreFactory({configParams:configParams});
	configParams.set("isElectron", true);
	electron.app.buildId = configParams.get("orion.buildId");
	
	function handleSquirrelEvent(){
		if (process.argv.length === 1 || os.platform() !== 'win32') { // No squirrel events to handle
			return false;
		}
		var target = path.basename(process.execPath);
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
	}
	
	function executeSquirrelCommand(args, done) {
		var updateDotExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
		var child = spawn(updateDotExe, args, { detached: true });
		child.on('close', function() {
			done();
		});
	}
	
	function makeDevToolMenuItem(label, accelerator){
		return {
			label: label,
			submenu: [
				{ label: "openDevTool", accelerator: accelerator, click: function (item, focusedWindow) {
					if (focusedWindow) focusedWindow.webContents.toggleDevTools();
				}}
			]
		};
	}
	
	function scheduleUpdateChecks () {
		var checkInterval = (parseInt(configParams.get("orion.autoUpdater.checkInterval"), 10) || 30) * 1000 * 60;
		var resolveNewVersion = function() {
			autoUpdater.resolveNewVersion(false);
		};
		setInterval(resolveNewVersion, checkInterval);
	}
	
	function createWindow(url){
		var Url = require("url");
		var windowOptions = allPrefs.get(WINDOWS_BOUNDS_PREF_KEY);
		if(windowOptions === MODEL.NOT_EXIST){
			windowOptions = {width: 1024, height: 800};
		}
		windowOptions.title = "Orion";
		windowOptions.icon = "icon/256x256/orion.png";
		var nextWindow = new electron.BrowserWindow(windowOptions);
		nextWindow.setMenuBarVisibility(false);	// This line only work for Window and Linux
		if (windowOptions.maximized) {
			nextWindow.maximize();
		}
		nextWindow.loadURL("file:///" + __dirname + "/lib/main.html#" + encodeURI(url));
		nextWindow.webContents.on("new-window", /* @callback */ function(event, url){
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
			event.preventDefault();
			store.getUser(electronUserName,function(err, data){
				if(err){
					logger.error(err);
				}
				var prefs = new MODEL(data.properties || {});
				var windowBounds = nextWindow.getBounds();
				windowBounds.maximized = nextWindow.isMaximized();
				prefs.set(WINDOWS_BOUNDS_PREF_KEY, windowBounds);
				store.updateUser(electronUserName, {properties:prefs.getJson()}, function(err){
					if(err) {
						logger.error(err);
					}
					log4js.shutdown(function(){
						if (updateDownloaded) {
							nextWindow.webContents.session.clearCache(function() {
								nextWindow.destroy();
							});
						}else{
							nextWindow.destroy();
						}
					});
				});
				
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
		api.getOrionEE().on("workspace-changed", function(dataArray){
			var workspaceId = dataArray[0];
			var needToUpdateWorkspaceIdArray = dataArray[1];
			if(needToUpdateWorkspaceIdArray){
				// This is when user switch between workspace
				// Update workspaceID array order in user prefs
				store.getUser(electronUserName,function(err, data){
					if(err){
						logger.error(err);
					}
					data.workspaces.splice(data.workspaces.indexOf(workspaceId), 1);
					data.workspaces.unshift(workspaceId);
					store.updateUser(electronUserName, {workspaceIds:data.workspaces}, function(err){
						if(err) {
							logger.error(err);
						}
						nextWindow.webContents.executeJavaScript('closeNoneEditTabs();');
						var url = "http://localhost:" + configParams.get("port") + "/git/git-repository.html#,workspace=/workspace/" + workspaceId;
						nextWindow.webContents.executeJavaScript('createTab("' + url + '", true);');
					});
				});
			} else {
				// This is when user open a new folder ,so need to re-create edit page as well to refresh "swtich to" list
				nextWindow.webContents.executeJavaScript('closeAllTabs();');
				var hostUrl = "http://localhost:" + configParams.get("port");
				nextWindow.webContents.executeJavaScript('createTab("' + hostUrl + "/edit/edit.html#/workspace/" + workspaceId + '");');
				var giturl = hostUrl + "/git/git-repository.html#,workspace=/workspace/" + workspaceId;
				nextWindow.webContents.executeJavaScript('createTab("' + giturl + '", true);');
			}
		});
		return nextWindow;
	} // end of createWindow()
	
	function createWorkspaceForDir(workspaceLocation){
		var pathSegs = workspaceLocation.split(/[\\\/]/);
		var folderName = pathSegs[pathSegs.length - 1];
		var workspaceId = Date.now() + folderName;
		var workspaceData = {name: workspaceLocation, id: workspaceId, location: workspaceLocation};
		return new Promise(function(fulfill, reject){
			store.createWorkspace(electronUserName, workspaceData, function(err, workspace) {
				if (err) {
					logger.error(err);
					return reject();
				}
				return fulfill();
			});
		});
	}
	// End of functions declaration

	var userPrefs = prefs.readElectronPrefs();
	allPrefs = new MODEL(userPrefs.Properties || {});

	if (feedURL) {
		var updateChannel = allPrefs.get(UPDATE_CHANNEL_NAME_PREF_KEY), latestUpdateURL;
		if(updateChannel === MODEL.NOT_EXIST){
			updateChannel = configParams.get("orion.autoUpdater.defaultChannel");
		}
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

	if (handleSquirrelEvent()) {
		// Squirrel event handled and app will exit in 1000ms
		return;
	}

	var readyToOpenPath, relativeFileUrl;
	electron.app.on('open-file', function(event, path) {
		readyToOpenPath = path;
	});
	electron.app.on('ready', function() {
		var updateDialog = false,
			linuxDialog = false,
			mostRecentWorkspaceId = userPrefs.WorkspaceIds && userPrefs.WorkspaceIds[0],
			Menu = electron.Menu;
			
		updateDownloaded  = false;
			
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
		var waitFor;
		if (mostRecentWorkspaceId) {
			waitFor = new Promise(function(fulfill, reject){
				store.getWorkspace(mostRecentWorkspaceId, function(err,workspaceJson){
					if (err){
						return reject(err);
					}
					configParams.set("workspace", workspaceJson.location);
					return fulfill();
				});
			});
		}
		if(readyToOpenPath){
			try{
				var stats = fs.statSync(readyToOpenPath);
				if(stats.isFile()){
					var parentDir = path.dirname(readyToOpenPath);
					var similarity = 0;
					configParams.set("workspace", parentDir);
					waitFor = Promise.resolve(waitFor).then(function(){
						metaUtil.getWorkspaceMeta(userPrefs.WorkspaceIds, store)
						.then(function(workspaceInfos){
							workspaceInfos.forEach(function(each){
								var location = each.Name;
								if(parentDir.lastIndexOf(location,0) === 0 && location.length > similarity){
									similarity = location.length;
									// find the closest existing workspace path, and use that as the orion current workspace
									return configParams.set("workspace", location);
								}
							});
							relativeFileUrl = api.toURLPath(readyToOpenPath.substring(configParams.get("workspace").length));
							if(configParams.get("workspace") === parentDir){
								// The case where have to create a new workspace metadata
								return createWorkspaceForDir(configParams.get("workspace"));
							}
							return;
						});
					});
				}else if(stats.isDirectory()){
					configParams.set("workspace", readyToOpenPath);
					waitFor = Promise.resolve(waitFor).then(function(){
						return createWorkspaceForDir(configParams.get("workspace"));
					});
				}
			}catch(e){}
		}
		
		Promise.resolve(waitFor)
		.then(function(){
			startServer(function() {
				var mainWindow,
					hostUrl = "http://localhost:" + configParams.get("port"),
					toOpen, 
					activeIndex = 0;
				
				if(relativeFileUrl){
					var fileUrl = hostUrl + "/edit/edit.html#/file" + relativeFileUrl;
					toOpen = "edit/edit.html#/file" + relativeFileUrl;
				}
				if(readyToOpenPath && mostRecentWorkspaceId !== configParams.get("workspace")) {
					mainWindow = createWindow(fileUrl ? fileUrl : hostUrl);
				}else{
					if(toOpen){
						mainWindow = createWindow(hostUrl + "/" + toOpen); 
						mainWindow.webContents.executeJavaScript('setActiveIndex("' + activeIndex + '");');
					}else{ // if user open Orion for the first time
						mainWindow = createWindow(hostUrl);
						var giturl = hostUrl + "/git/git-repository.html";
						mainWindow.webContents.executeJavaScript('createTab("' + giturl + '", true);');
					}
				}
				mainWindow.on('closed', function() {
					mainWindow = null;
				});
			});
		})
	});
	electron.app.on('window-all-closed', function() {
		electron.app.quit();
	});
};
