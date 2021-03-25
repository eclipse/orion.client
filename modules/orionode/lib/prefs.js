/*******************************************************************************
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
'use strict';
var api = require('./api'),
	fileUtil = require('./fileUtil'),
 	writeResponse = api.writeResponse,
 	writeError = api.writeError,
    express = require('express'),
    nodePath = require('path'),
    nodeUrl = require('url'),
    fs = require('fs'),
    os = require('os'),
    Long_Key_Prefs = require('./model/long_key_pref'),
    Preference = require('./model/pref'),
    Promise = require('bluebird'),
    responseTime = require('response-time');

module.exports = {};

module.exports.readElectronPrefs = readElectronPrefs;
module.exports.writeElectronPrefs = writeElectronPrefs;
module.exports.readPrefNode = readPrefNode;

var NOT_EXIST;
var MODEL;
var PREF_FILENAME = PREF_FILENAME='user.json';

module.exports.router = function(options) {
	options.configParams = options.configParams || require("nconf");
	if (!options.configParams.get("orion.single.user") && options.configParams.get("orion.metastore.useMongo") !== false) {
		MODEL = Preference;
	} else {
		MODEL = Long_Key_Prefs;
	}

	NOT_EXIST = MODEL.NOT_EXIST;

	return express.Router()
	.use(responseTime({digits: 2, header: "X-Prefs-Response-Time", suffix: true}))
	.get('*', handleGet)
	.put('*', handlePut)
	.delete('*',handleDelete);
	
function handleGet(req, res){
	return new Promise(function(fulfill, reject) {
		read(req, res, function(err, scope, prefs){
			if (err) {
				return reject(err);
			}
			if (scope === "user") {
				fulfill(new MODEL(prefs || null));
			}
			// TODO wrap workspace preference
		});
	}).then(function(prefs){
		var urlObj = req._parsedUrl || nodeUrl.parse(req.url),
			prefPath = urlObj.pathname.split("/").slice(2).join("/");
		var node = prefs.get(prefPath);
		var key = req.query.key;
		if (typeof key !== 'string') {
			// No key param - a whole node was requested
			if (node === NOT_EXIST) {
				return writeResponse(200, res, null, {});
			}
			return writeResponse(200, res, null, node);
		}
		// Sending a single property
		var value = node[key];
		if (typeof value === 'undefined' || value === null) {
			return api.sendStatus(404, res);
		}
		var result = {};
		result[key] = value;
		writeResponse(200, res, null, result);
	});
}
function handlePut(req, res){
	if (!(req.is('json') || req.is('urlencoded'))) {
		return api.sendStatus(400, res);// unknown content type
	}
	update(req, function(metadata) {
		var prefs = new MODEL(metadata.properties || null);
		var urlObj = req._parsedUrl || nodeUrl.parse(req.url),
			prefPath = urlObj.pathname.split("/").slice(2).join("/"),
			prefNode = prefs.get(prefPath);
		var body = req.body;
		if(prefPath !== "operations"){
			prefs.delete(prefPath);
		}
		if (req.is('json')) {
			// Replace entire pref node
			prefs.set(prefPath, body);
		} else if (req.is('urlencoded')) {
			// Replace a single property
			var key = body.key, value = body.value;
			if (typeof key === 'undefined') {
				return api.sendStatus(400, res);
			}
	
			var node = prefNode === NOT_EXIST ? {} : prefNode;
			if (typeof value === 'undefined') {
				delete node[key];
			} else {
				node[key] = value; // FIXME watch out for __proto__ hacks
			}
			prefs.set(prefPath, node);
		}
		metadata.properties = prefs.getJson();
		return metadata;
	}, function(err) {
		if (err) {
			return writeError(err.code || 500, res, err);
		}
		api.sendStatus(204, res);
	});
}
function handleDelete(req, res){
	update(req, function(metadata) {
		var prefs = new MODEL(metadata.properties);
		var urlObj = req._parsedUrl || nodeUrl.parse(req.url),
			prefPath = urlObj.pathname.split("/").slice(2).join("/"),
			node = prefs.get(prefPath);
		if (node === NOT_EXIST) {
			// Deleting a nonexistent node (or some key therein), noop
			return null;
		}
		var key = req.params.key;
		if (typeof key === 'string') {
			// Delete a single key
			delete node[key];
			prefs.set(prefPath, node);
		} else {
			// Delete entire node
			prefs.delete(prefPath);
		}
		metadata.properties = prefs.getJson();
		return metadata;
	}, function(err) {
		if (err) {
			return writeError(err.code || 500, res, err);
		}
		api.sendStatus(204, res);
	});
}
	
function read(req, res, callback){
	var scopeSegs = req.url.split("/");
	if (scopeSegs.length < 3) {
		return writeResponse(405, res);
	}
	var scope = scopeSegs[1];
	var store = fileUtil.getMetastore(req);
	// ensure that there is at least one additional segment following the /user, /workspace or /project segment
	if (scope === "user"){
		store.getUser(req.user.username, function(err, data) {
			callback(err, scope, data ? data.properties : null);
		});
	} else if (scope === "workspace") {
		store.getWorkspace(req.user.workspaceId, function(err, data) {
			callback(err, scope, data ? data.properties : null);
		});
	} else if (scope === "project") {
		// TODO implement read project prefs
		return writeResponse(500, res, "Not implemented");
	} else {
		return writeResponse(405, res);
	}
}
	
function update(req, changeCallback, doneCallback) {
	var segments = req.url.split("/");
	var scope = segments[1];
	var store = fileUtil.getMetastore(req);
	if (scope === "user" && segments.length > 2) {
		store.updateUser(req.user.username, changeCallback, doneCallback);
	} else if(scope === "workspace" && segments.length > 2) {
		store.updateWorkspace(req.user.workspaceId, changeCallback, doneCallback);
	} else if(scope === "project" && segments.length > 2) {
		doneCallback(new Error("Not implemented"));
	} else {
		var error = new Error("Method not allowed");
		error.code = 405;
		return doneCallback(error);
	}
}
};

function getElectronPrefsFileName(){
	return nodePath.join(os.homedir(), '.orion', PREF_FILENAME);
}
function readPrefNode(options, path, properties) {
	options.configParams = options.configParams || require("nconf");
	if (!options.configParams.get("orion.single.user") && options.configParams.get("orion.metastore.useMongo") !== false) {
		MODEL = Preference;
	} else {
		MODEL = Long_Key_Prefs;
	}
	var prefsModel = new MODEL(properties);
	return prefsModel.get(path);
}

function readElectronPrefs(){
	try {
		var content = fs.readFileSync(getElectronPrefsFileName(),'utf8');
		return JSON.parse(content);
	} catch (e) {}
	return {};
}

function writeElectronPrefs(contents){
//	fs.writeFileSync(getElectronPrefsFileName(), JSON.stringify(contents, null, 2), 'utf8');
}
