/*******************************************************************************
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
var fs = require('fs');
var nodePath = require('path');
var Promise = require('bluebird');
var mkdirp = require('mkdirp');
var mkdirpAsync = Promise.promisify(mkdirp);

/**
 * @param {Array} argv
 * @returns {Object}
 */
exports.parseArgs = function(argv) {
	argv = argv.slice(2); // skip 'node', 'index.js'
	var args = {}, match;
	for (var i=0; i < argv.length; i++) {
		if ((match = /-(\w+)/.exec(argv[i]))) {
			var name = match[1], value = argv[i+1];
			args[name] = value;
		}
	}
	return args;
};

/**
 * @param {Array} Directories to be created. They're created serially to allow subdirs of an earlier entry to appear later in the list.
 */
exports.createDirs = function(dirs, callback) {
	var path = nodePath.join.apply(null, dirs);
	return mkdirpAsync(path, {}).asCallback(callback);
};

/**
 * Reads the password in the given password file
 */
exports.readPasswordFile = function(passwordFile) {
	if (passwordFile) {
		try {
			var lines = fs.readFileSync(passwordFile,'utf8')
				.split('\n').filter(Boolean);
			return lines.length>0?lines[0]:null;
		} catch (e) {}
	}
	return null;
};

function parseConfig(err, content) {
	if (err) {
		return null;
	}
	var lines = content.toString().split(/\r?\n/);
	var result = {}, current = result;
	lines.forEach(function(line) {
		var first = line.trim().charAt(0);
		if (first === '#' || first === ";") {
			return;
		}
		var parsed = /^\[([^\]]*)\]|([^=]*)(=?)(.*)/.exec(line);
		if (parsed[1]) {
			var sectionKey = parsed[1].trim();
			var subsection = /([^\s;#]+)\s*"(.*)"/.exec(sectionKey);
			if (subsection) {
				sectionKey = subsection[1].trim();
				var subsectionKey = subsection[2].trim();
				var section = result[sectionKey] = result[sectionKey] || {};
				current = section[subsectionKey] = section[subsectionKey] || {};
			} else {
				current = result[sectionKey] = result[sectionKey] || {};
			}
		} else {
			var name = (parsed[2] || "").trim();
			var value = (parsed[4] || "").trim();
			if (name !== "") {
				if (value.charAt(0) === '"') {
					value = value.substring(1);
					if (value.charAt(value.length - 1) === '"') value = value.substring(0, value.length - 1);
				}
				if (value === "true") value = true;
				if (value === "false") value = false;
				if (current[name]) {
					if (!Array.isArray(current[name])) current[name] = [current[name]];
					current[name].push(value);
				} else {
					current[name] = value;
				}
			}
		}
	});
	return result;
}


/**
 * @param {Function} callback Invoked as function(err, configObject), the err param is not null if the file couldn't be read.
 */
exports.readConfigFile = function(configFile, callback) {
	if (!configFile) {
		return callback(new Error());
	}

	fs.readFile(configFile, function(err, content) {
		callback(null, parseConfig(err, content));
	});
};

/**
 * @param {Function} callback Invoked as function(err, configObject), the err param is not null if the file couldn't be read.
 */
exports.readConfigFileSync = function(configFile) {
	if (!configFile) {
		return null;
	}
	return parseConfig(null, fs.readFileSync(configFile, "utf8"));
};

exports.writeConfigFile = function(configFile, contents, callback) {
	var lines = [];
	function writeSection(sectionKey, contents) {
		var sections = [];
		var sectionLines = [];
		var indentation = sectionKey ? "        " : "";
		Object.keys(contents).forEach(function(key) {
			if (!key) return;
			if (Array.isArray(contents[key])) {
				contents[key].forEach(function(k) {
					sectionLines.push(indentation + key + " = " + k);
				});
			} else if (typeof contents[key] !== "object") {
				sectionLines.push(indentation + key + " = " + contents[key]);
			} else {
				sections.push(key);
			}
		});
		if (sectionLines.length) {
			if (sectionKey) {
				lines.push("[" + sectionKey + "]");
			}
			sectionLines.forEach(function(l) {
				lines.push(l);
			});
		}
		sections.forEach(function(key) {
			var title = key;
			if (sectionKey) {
				title = sectionKey + ' "' + title + '"';
			}
			writeSection(title, contents[key]);
		});
	}
	writeSection("", contents);
	fs.writeFile(configFile, lines.join("\n"), callback);
};


