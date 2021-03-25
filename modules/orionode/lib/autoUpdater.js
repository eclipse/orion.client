/*******************************************************************************
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */

var electron = require('electron'),
	semver = require('semver'),
	os = require ('os'),
	request = require('request'),
	EventEmitter = require('events').EventEmitter;

var AutoUpdater = electron.autoUpdater;

AutoUpdater.setResolveURL = function(resolveURL) {
	this.resolveURL = resolveURL;
}

// Check if a new version exists before downloading updates
AutoUpdater.resolveNewVersion = function (isManualCheck) {
	var that = this;
	var resolveURL = this.resolveURL;
	try {
		request(resolveURL, function (err, resp, body) {
		if (err) {
			that.emit('update-error', err);
			return;
		}
		if (resp.statusCode < 200 || resp.statusCode >= 300) {
			that.emit('update-not-available', err);
			return;
		}
		body = JSON.parse(body);
		var newVersion = body.tag,
			currentVersion = electron.app.getVersion(),
			newVersionExists = semver.gt(newVersion, currentVersion);
		if (newVersionExists) {
			if (isManualCheck) {
				that.emit('update-available-manual', newVersion);
			}
			else {
				that.emit('update-available-automatic', newVersion);
			}
		} else {
			that.emit('update-not-available');
		}
	});
	} catch (e) {
		console.log(e);
	}

}

// Remove listeners on checkForUpdates() since we moved them to resolveNewVersion
AutoUpdater.removeListener('update-available', AutoUpdater.checkForUpdates);
AutoUpdater.removeListener('update-not-available', AutoUpdater.checkForUpdates);

module.exports = AutoUpdater;
