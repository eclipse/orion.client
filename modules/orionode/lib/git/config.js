/*******************************************************************************
 * Copyright (c) 2012, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
/*globals configs:true val:true*/
var api = require('../api'), writeError = api.writeError, writeResponse = api.writeResponse,
	args = require('../args'),
	clone = require('./clone'),
	express = require('express'),
	gitUtil = require('./util'),
	git = require('nodegit'),
	log4js = require('log4js'),
	logger = log4js.getLogger("git"),
	responseTime = require('response-time');

module.exports = {};

module.exports.router = function(options) {
	var fileRoot = options.fileRoot;
	var gitRoot = options.gitRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }
	if (!gitRoot) { throw new Error('options.gitRoot is required'); }
	
	var contextPath = options && options.configParams.get("orion.context.path") || "";
	fileRoot = fileRoot.substring(contextPath.length);
	
	function checkUserAccess(req, res, next){
		var uri = req.originalUrl.substring(req.baseUrl.length);
		var uriSegs = uri.split("/");
		if (uriSegs[1] === "clone" && "/" + uriSegs[2] === fileRoot){
			uriSegs.splice(1, 1);
			uri = uriSegs.join("/");
		}else if (uriSegs[2] === "clone" && "/" + uriSegs[3] === fileRoot){
			uriSegs.splice(1, 2);
			uri = uriSegs.join("/");
		}
		req.user.checkRights(req.user.username, uri, req, res, next);
	}
	
	return express.Router()
	.use(responseTime({digits: 2, header: "X-GitapiConfig-Response-Time", suffix: true}))
	.use(checkUserAccess) // Use specified checkUserAceess implementation instead of the common one from options
	.get('/clone'+ fileRoot + '*', getConfig)
	.get('/:key/clone'+ fileRoot + '*', getAConfig)
	.delete('/:key/clone'+ fileRoot + '*', deleteConfig)
	.put('/:key/clone'+ fileRoot + '*', putConfig)
	.post('/clone'+ fileRoot + '*', postConfig);

function configJSON(key, value, fileDir) {
	return {
		"Key": key,
		"CloneLocation": gitRoot + "/clone" + fileDir,
		"Location": gitRoot + "/config/" + api.encodeURIComponent(key) + "/clone" + fileDir,
		"Value": Array.isArray(value) ? value : [value]
	};
}

function getAConfig(req, res) {
	var theRepo;
	var key = api.decodeURIComponent(req.params.key);
	clone.getRepo(req)
	.then(function(repo) {
		theRepo = repo;
		var fileDir = clone.getfileDir(repo,req);
		var configFile = api.join(repo.path(), "config");
		args.readConfigFile(configFile, function(err, config) {
			if (err) {
				return writeError(400, res, err.message);
			}
			var segments = key.split(".");
			var section = segments[0];
			var name = segments[segments.length - 1];
			var value;
			if (segments.length > 2) {
				var subsection = segments.slice(1, segments.length - 1).join(".");
				value = config[section] && config[section][subsection] && config[section][subsection][name];
			} else {
				value = config[section] && config[section][name];
			}
			if (value !== undefined) {
				writeResponse(200, res, null, configJSON(key, value, fileDir), true);
			} else {
				writeError(404, res, "There is no config entry with key provided");
			}
		});
	})
	.catch(function(err) {
		writeError(404, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(theRepo);
	});
}

function getConfig(req, res) {
	var theRepo;
	var filter = req.query.filter;
	clone.getRepo(req)
	.then(function(repo) {
		theRepo = repo;
		var fileDir = clone.getfileDir(repo,req);
		var configFile = api.join(repo.path(), "config");
		args.readConfigFile(configFile, function(err, config) {
			if (err) {
				return writeError(400, res, err.message);
			}
			var needsWrite = false;
			var waitFor = Promise.resolve();
			if(options && options.configParams.get("orion.single.user")) {
				var user = config.user || (config.user = {});
				if(!user.name){
					waitFor = git.Config.openDefault().then(function(defaultConfig){
						var fillUserName = defaultConfig.getString("user.name").then(function(defaultConfigValue) {
							return defaultConfigValue && (user.name = defaultConfigValue);
						});
						var fillUserEmail = defaultConfig.getString("user.email").then(function(defaultConfigValue) {
							return defaultConfigValue && (user.email = defaultConfigValue);
						});
						return Promise.all([fillUserName,fillUserEmail]);
					}).then(function(){
						needsWrite = true;
					}).catch(function(){
						return Promise.resolve();
					});
				}
			}
			return waitFor.then(function(){
				configs = [];
				
				needsWrite |= gitUtil.verifyConfigRemoteUrl(config);
				if (needsWrite) {
					args.writeConfigFile(configFile, config, function() {});
				}
				
				getFullPath(config, "");
				
				writeResponse(200, res, null, {
					"Children": configs,
					"CloneLocation": gitRoot + "/clone" + fileDir,
					"Location": gitRoot + "/config/clone"+ fileDir,
					"Type": "Config"
				}, true);
				
				function getFullPath(config, prefix) {
					if (typeof config !== "object" || Array.isArray(config)) {
						if (!filter || prefix.indexOf(filter) !== -1) {
							configs.push(configJSON(prefix, config, fileDir));
						}
					} else {
						for (var property in config) {
							if (config.hasOwnProperty(property)) {
								getFullPath(config[property], prefix === "" ? property : prefix + "." + property);
							}
						}
					}
				}
			}).catch(function(err) {
				logger.error(err);
				writeError(404, res, err.message);
			});
		//TODO read user prefs if no username/email is specified -> git/config/userInfo (GitName && GitEmail)
		});
	})
	.catch(function(err) {
		writeError(404, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(theRepo);
	});
}
	
function updateConfig(req, res, key, value, callback) {
	var fileDir, theRepo;
	clone.getRepo(req)
	.then(function(repo) {
		theRepo = repo;
		fileDir = clone.getfileDir(repo,req);
		var configFile = api.join(repo.path(), "config");
		args.readConfigFile(configFile, function(err, config) {
			if (err) {
				return writeError(400, res, err.message);
			}
			var segments = key.split(".");
			var section = segments[0];
			var subsection;
			if (segments.length > 2) {
				subsection = segments.slice(1, segments.length - 1).join(".");
			}
			var name = segments[segments.length - 1];
			var result = callback(config, section, subsection, name, value);
			if (result.status === 200 || result.status === 201) {
				gitUtil.verifyConfigRemoteUrl(config);
				args.writeConfigFile(configFile, config, function(err) {
					if (err) {
						return writeError(400, res, err.message);
					}
					if (result.value) {
						var resp = configJSON(key, result.value, fileDir);
						writeResponse(result.status, res, {"Location":resp.Location}, resp, true);
					} else {
						writeResponse(result.status, res);
					}
				});
			} else {
				writeError(result.status, res);
			}
		});
	})
	.catch(function(err) {
		writeError(404, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(theRepo);
	});
}

function postConfig(req, res) {
	if (!req.body.Key) {
		return writeError(400, res, "Config entry key must be provided");
	}
	updateConfig(req, res, req.body.Key, req.body.Value, function(config, section, subsection, name, value) {
		var bucket;
		if (!config[section]) config[section] = {};
		if (subsection) {
			if (!config[section][subsection]) config[section][subsection] = {};
			bucket = config[section][subsection];
		} else {
			bucket = config[section];
		}
		var current = bucket[name];
		if (current) {
			if (!Array.isArray(current)) current = [current];
			current.push(value);
		} else {
			current = value;
		}
		bucket[name] = current;
		return {status: 201, value: current};
	});
}

function putConfig(req, res) {
	if (!req.params.key || !req.body.Value) {
		return writeError(400, res, "Config entry key and value must be provided");
	}
	updateConfig(req, res, req.params.key, req.body.Value, function(config, section, subsection, name, value) {
		var bucket;
		if (!config[section]) config[section] = {};
		if (subsection) {
			if (!config[section][subsection]) config[section][subsection] = {};
			bucket = config[section][subsection];
		} else {
			bucket = config[section];
		}
		bucket[name] = value;
		return {status: 200, value: value};
	});
}

function deleteConfig(req, res) {
	if (!req.params.key) {
		return writeError(400, res, "Config entry key must be provided");
	}
	updateConfig(req, res, req.params.key, null, function(config, section, subsection, name) {
		var bucket;
		if (config[section]) {
			if (subsection) {
				bucket = config[section][subsection];
			} else {
				bucket = config[section];
			}
		}
		if (bucket && bucket[name]) {
			if (req.query.index) {
				bucket[name].splice(Number(req.query.index), 1);
			} else {
				delete bucket[name];
			}
			return {status: 200};
		}
		return {status: 404};
	});
}

};
