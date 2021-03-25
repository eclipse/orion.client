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
module.exports = Prefs;

// Sentinel value for nonexistent properties
var NOT_EXIST = Prefs.NOT_EXIST = function notExist() {};

// Represents a preferences tree
// @param {string?} s JSON string
function Prefs(s) {
	this.json = s || {};
	this.isModified = false;
}
/**
 * Use the path in whole as part of the key name, so the key is a long key
 * @param path - eg. /user/editor/settings
 * @returns The node, or NOT_EXIST if the path did not exist.
 */
Prefs.prototype.get = function(path) {
	var root = this.json;
	var segs = path.split('/');
	var key = path; // substr(1) to strip the leading slash
	var result;
	if (segs[0] === '') {
		result = root;
	} else {
		var rootKeys = Object.keys(root);
		rootKeys.forEach(function(rootKey){
			if(rootKey.startsWith(key) && !rootKey.startsWith("User")){
				if(typeof result === 'undefined') result = {};
				try{
					return result[rootKey.substr(key.length + 1)] = JSON.parse(root[rootKey]);
				}catch(err){
					return result[rootKey.substr(key.length + 1)] = root[rootKey];
				}
			}
		});
	}
	if (result === NOT_EXIST || typeof result === 'undefined'){
		return NOT_EXIST;
	}
	return naiveClone(result);
};
/**
 * Use the path in whole as part of the key name, so the key is a long key
 * Replaces the node at the given path. If node === NOT_EXIST then the node is removed.
 */
Prefs.prototype.set = function(path, node) {
	if (path === '') {
		this.json = node;
		return;
	}
	var obj = this.json;
	if (node === NOT_EXIST) {
		delete obj[path];
	} else {
		var keys = Object.keys(node);
		keys.forEach(function(key){
			obj[path + "/" + key] = typeof node[key] === "string" ? node[key] : JSON.stringify(node[key]);
		});
	}
	this.isModified = true;
};
Prefs.prototype.delete = function(path) {
	var keys = Object.keys(this.json);
	var obj = this.json;
	keys.forEach(function(key){
		if(key.startsWith(path)){
			delete obj[key];
		}
	});
	this.isModified = true;
};
Prefs.prototype.getJson = function() {
	return this.json;
};
Prefs.prototype.modified = function() {
	return this.isModified;
};

function naiveClone(o) {
	return JSON.parse(JSON.stringify(o));
}
