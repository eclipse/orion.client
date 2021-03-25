/*******************************************************************************
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node, express, js-yaml*/
var express = require("express");
var fs = require("fs");
var path = require("path");
var manifests = require("./manifests");
var xfer = require("../xfer");
var log4js = require('log4js');
var logger = log4js.getLogger("cf-planner");
var Promise = require("bluebird");
var bluebirdfs = Promise.promisifyAll(require("fs"));
var cfignore = require('./cfIgnore');
var api = require("../api"), writeError = api.writeError, writeResponse = api.writeResponse;

var deploymentPackager = {};

module.exports.router = function(options) {
	var fileRoot = options.fileRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }
	
	registerGenericDeploymentPackger();
	return express.Router()
	.get(fileRoot + "*", getplans);
	
function planJson(type, manifest, planner, wizard, required){
	return {
		"ApplicationType": type,
		"Manifest": manifest,
		"ManifestPath": "manifest.yml",
		"Planner": "org.eclipse.orion.server.cf." + planner,
		"Required": required || [],
		"Type": "Plan",
		"Wizard": "org.eclipse.orion.client.cf.wizard." + wizard
	};
}

function checkFileExists(path) {
	try {
		return fs.statSync(path).isFile();
	}
	catch (err) {
		return false;
	}
}
	
function getplans(req, res){
	var uri = req.originalUrl.substring(req.baseUrl.length + req.contextPath.length);
	req.user.checkRights(req.user.username, uri, req, res, function(){
		var filePath = manifests.retrieveProjectFilePath(req);
		fs.lstat(filePath, function(err, state){
			if(err && err.code !== 'ENOENT'){
				return writeError(404, res, err.message);
			}
			if(!state || state.isFile()){
				filePath = path.dirname(filePath);
			}
			return manifests.retrieveManifestFile(req, res)
			.then(function(manifest){
				var children = [];
				function generatePlansforManifest(){
					function generateGenericPlan(){
						return planJson("generic", manifest, "ds.GenericDeploymentPlanner", "generic");
					}
					function generateNodePlan(){
						if(checkFileExists(path.join(filePath, "package.json"))){
							var applicationKeys = Object.keys(manifest.applications[0]);
							var cloneManifest = { "applications": [{}] };
							var required = [];
							applicationKeys.forEach(function(key){
								cloneManifest.applications[0][key] = manifest.applications[0][key];
							});
							if (!cloneManifest.applications[0]["command"]) {
								// TODO "command" attribute checking by looking up Procfile
								// TODO "command" attribute checking by looking up package.json
								if (checkFileExists(path.join(filePath, "server.js"))) { // node.js application requires a start command
									cloneManifest.applications[0]["command"] = "node server.js";
								}
								else if (checkFileExists(path.join(filePath, "app.js"))) {
									cloneManifest.applications[0]["command"] = "node app.js";
								}
								else {
									required.push("command");
								}
							}
							return planJson("node.js", cloneManifest, "nodejs.NodeJSDeploymentPlanner", "nodejs", required);
						}
					}
					var genericPlan = generateGenericPlan();
					var nodePlan = generateNodePlan();
					children.push(genericPlan);
					if(nodePlan){
						children.push(nodePlan);
					}
				}
				generatePlansforManifest();
				var result =  {"Children": children};
				writeResponse(200, res, null, result);
			}).catch(function(err){
				return writeError(404, res, err.message);
			});
		});
	});
}
};
	/**
 * @name registerGenericDeploymentPackger
 * @description register Deployment Packager by following the work flow of try to find the closest war file and copy Or zip target file path
 * @param packagerName
 * @param additionalData, to stuff additional data to zip file, providing different value to register different deployment packager
 */
function registerGenericDeploymentPackger(){
	deploymentPackager["Generic"] = function (filePath, command){
		logger.debug("archive Target, trying to find war file in=" + filePath);
		return searchNearestWarFile(filePath, filePath)
		.then(function(){
			logger.debug("archive Target, no war file, try to zip");
			// If searchAndCopyNearestwarFile fulfill with 'false', it means no .war has been found. so Zip the folder.
			var cFIgnoreManager = new cfignore.CFIgnoreManager();
			return cFIgnoreManager.loadCfIgnoreFile(filePath)
			.then(function(){
				return xfer.zipPath(filePath, {filter:cFIgnoreManager.generateFilter()});
			});
		})
		.catch(function(result){
			if(result.message === "warFound") {
				logger.debug("archive Target, war file found, try to copy war file");
				return xfer.copyPath(result.filePath);
			}// Assert the .war filed has been copied over.
			return Promise.reject(result);  // keep escalating other rejections.
		})
		.then(function(zippedFilePath){
			return zippedFilePath;
		});
		
		function searchNearestWarFile (base, filePath) {
			return bluebirdfs.statAsync(filePath)
			.then(function(stats) {
				/*eslint consistent-return:0*/
				if (stats.isDirectory()) {
					if (filePath.substring(filePath.length-1) !== "/") filePath = filePath + "/";
					return bluebirdfs.readdirAsync(filePath)
					.then(function(directoryFiles) {
						var SUBDIR_SEARCH_CONCURRENCY = 1;
						return Promise.map(directoryFiles, function(entry) {
							return searchNearestWarFile(base, filePath + entry);
						},{ concurrency: SUBDIR_SEARCH_CONCURRENCY});
					});
				}
				if(path.extname(filePath) === ".war"){
					// Using this promise to reject the promise chain.
					var error = new Error("warFound");
					error.filePath = filePath;
					return Promise.reject(error);
				}
				return false; // false means no '.war' has been find
			});
		}
	};
}
function getDeploymentPackager(packagerName){
	return deploymentPackager[packagerName] || deploymentPackager["Generic"];
}
function addDeploymentPackager(packagerName, deploymentPackagerHandler){
	deploymentPackager[packagerName] = deploymentPackagerHandler;
}
module.exports.getDeploymentPackager = getDeploymentPackager;
module.exports.addDeploymentPackager = addDeploymentPackager;
