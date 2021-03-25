/*******************************************************************************
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */

var express = require('express'),
	electron = require('electron'),
	autoUpdater = require('./autoUpdater.js'),
	prefs = require('./prefs'),
	os = require('os'),
	platform = os.platform(),
	arch = os.arch(),
	version = electron.app.getVersion(),
	log4js = require('log4js'),
	tasks = require('./tasks'),
	logger = log4js.getLogger("update"),
	responseTime = require('response-time');

module.exports = {};
module.exports.router = function(options) {
	var configParams = options.configParams;
	if (!configParams) { throw new Error('options.configParams is required'); }
	var feedURL = configParams.get("orion.autoUpdater.url");
	return express.Router()
	.use(responseTime({digits: 2, header: "X-Update-Response-Time", suffix: true}))
	.post('/downloadUpdates', function (req, res) {
		var allPrefs = prefs.readElectronPrefs();
		var updateChannel = (allPrefs.Properties && allPrefs.Properties["updateChannel/name"]) || configParams.get("orion.autoUpdater.defaultChannel");
		var task = new tasks.Task(res, false, true, 0, true);
		if (platform === "linux") {
			electron.shell.openExternal(feedURL + '/download/channel/' + updateChannel + '/linux');
		} else {
			logger.debug("setFeedURL = ",feedURL + '/update/channel/' + updateChannel + '/' + platform + '_' + arch + '/' + version);
			autoUpdater.setFeedURL(feedURL + '/update/channel/' + updateChannel + '/' + platform + '_' + arch + '/' + version);
			autoUpdater.checkForUpdates();
		}
		autoUpdater.on("update-downloaded", /* @callback */ function(event, releaseNotes, releaseName, releaseDate, updateURL) {
			task.done({
				HttpCode: 200,
				Code: 0,
				DetailedMessage: "OK",
				JsonData: {
					"note": releaseNotes
				},
				Message: "OK",
				Severity: "Ok"
			});
		});
		autoUpdater.on("update-error", function(error) {
			logger.error(error);
			task.done({
				HttpCode: 204,
				Code: 0,
				DetailedMessage: "update-error",
				Message: "OK",
				Severity: "Ok"
			});
		});
	})
	.get("/resolveNewVersion", function (req, res) {
		var task = new tasks.Task(res, false, true, 0, true);
		if (!feedURL) {
			 task.done({
			 	HttpCode: 200,
			 	Code: 0,
			 	DetailedMessage: "OK",
			 	Message: "OK",
			 	Severity: "Ok"
			 });
		}
		var resolveURL = feedURL + '/api/resolve?platform=' + platform + '&channel=' + req.query.updateChannel;
		autoUpdater.setResolveURL(resolveURL);
		autoUpdater.resolveNewVersion(true);
		autoUpdater.on("update-available-manual", function(newVersion) {
			task.done({
				HttpCode: 200,
				Code: 0,
				JsonData: {"newVersion":newVersion},
				DetailedMessage: "update-available-manual",
				Message: "OK",
				Severity: "Ok"
			});
		});
		autoUpdater.on("update-not-available", function() {
			task.done({
				HttpCode: 204,
				Code: 0,
				DetailedMessage: "update-not-available",
				Message: "OK",
				Severity: "Ok"
			});
		});
		autoUpdater.on("update-error", function(error) {
			logger.error(error);
			task.done({
				HttpCode: 204,
				Code: 0,
				DetailedMessage: "update-error",
				Message: "OK",
				Severity: "Ok"
			});
		});
	});	
};
