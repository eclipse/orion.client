/*******************************************************************************
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node, express, body-parser*/
var express = require("express");
var bodyParser = require("body-parser");
var api = require("../api"), writeError = api.writeError;
var fs = require("fs");
var path = require("path");
var yaml = require("js-yaml");
var yamlAstParser = require("yaml-ast-parser");
var tasks = require("../tasks");

module.exports.router = function() {
	
	module.exports.retrieveManifestFile = retrieveManifestFile;
	module.exports.retrieveProjectFilePath = retrieveProjectFilePath;

	return express.Router()
	.use(bodyParser.json())
	.get("/file*", getManifests)
	.get("*", getManifests);
	
function getManifests(req, res){
	Promise.resolve(retrieveManifestFile(req,res))
	.then(function(manifest){
		var respond = {
			"Contents": manifest,
			"Type": "Manifest"
		};
		res.status(200).json(respond);			
	});
}

function retrieveManifestFile(req, res, manifestAbsuluteLocation){
	return new Promise(function(fulfill) {
		var filePath = manifestAbsuluteLocation ? manifestAbsuluteLocation : retrieveProjectFilePath(req);
		if(filePath.indexOf("manifest.yml") === -1){
			filePath += "manifest.yml";
		}
		fs.readFile(filePath, "utf8", function(err, fileContent){
			if(err){
				writeError(404, res, err.message);
			}
			fulfill(fileContent);
		});
	}).then(function(fileContent){
		var manifest = yaml.safeLoad(fileContent);
		var manifestAST = yamlAstParser.load(fileContent);
		transformManifest(manifest);
		// TODO when meet the case where need to do symbolResolver (as in JAVA) then implement.
		analizeManifest(manifest, res, manifestAST, fileContent);
		return manifest;
	})
}

function transformManifest(manifest){
	if(!manifest.applications){
		return;  // Do nothing
	}
	var globals = [];
	var APPLICATION_PROPERTIES = ["name", "memory", "host", "buildpack", "command", //   //$NON-NLS-1$//$NON-NLS-2$ //$NON-NLS-3$//$NON-NLS-4$ //$NON-NLS-5$
			"domain", "instances", "path", "timeout", "no-route", "services"]; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$ //$NON-NLS-5$ //$NON-NLS-6$
	Object.keys(manifest).forEach(function(key){
		if(APPLICATION_PROPERTIES.indexOf(key) !== -1){
			globals.push(key);
		}
	});
	if(!globals){
		return; // nothing to do
	}
	manifest.applications.forEach(function(application){
		for( var k = 0; k < globals.length ; k++){
			if(!application.hasOwnProperty(globals[k])){
				application[globals[k]] = manifest[globals[k]];
			}
		}
	});
}
function analizeManifest(manifest, res, manifestAST, fileContent){
	if(!manifest.applications){
		return; // Do nothing
	}
	var fileContentArray = fileContent.split("\r\n")	;
	var lineNumbers = [];
	var valueWithParent = [];
	var currentLineFirstCharAt = 0;
	for(var i = 0; i < fileContentArray.length ; i++){
		var lineLength = fileContentArray[i].length;
		lineNumbers.push([currentLineFirstCharAt, currentLineFirstCharAt + lineLength ]);
		currentLineFirstCharAt = currentLineFirstCharAt + lineLength + 2;
	}
	nullCheckOfManifest(manifestAST);
	// Each Property Check
	specificFieldCheck(valueWithParent);
	
	function nullCheckOfManifest(manifestAST){
		if(!manifestAST){
			sendInvalidResult("Empty Node", -1, res);	
		}
		if(manifestAST.hasOwnProperty("mappings")){
			manifestAST.mappings.forEach(function(each){
				nullCheckOfManifest(each);		
			});
		}else if(manifestAST.hasOwnProperty("items")){
			manifestAST.items.forEach(function(each){
				nullCheckOfManifest(each);		
			});
		}else if(manifestAST.hasOwnProperty("value")){
			if(!manifestAST.value){   // null case
				// find null
				sendInvalidResult("Empty Propety",getLineNumber(manifestAST.startPosition, manifestAST.endPosition, lineNumbers),res);	
			}
			if(typeof manifestAST.value === "string"){
				// record the node with real yaml values here. to save from another after null check. aka, do both together.
				valueWithParent.push(manifestAST);
			}
			nullCheckOfManifest(manifestAST.value);
		}
	}
	function specificFieldCheck(valueWithParent){
		for(var m = 0; m < valueWithParent.length; m++){
			var realParentNode = {nodeKey : "", node:{}};
			findclosestKeyName(valueWithParent[m], realParentNode);
			switch(realParentNode.nodeKey){
				case "services":
					if(isStringProperty(realParentNode.node)){
						sendInvalidResult("Invalid services declaration. Expected a list of service names.", getLineNumber(realParentNode.node.startPosition, realParentNode.node.endPosition, lineNumbers), res);	
					}
				break;
				case "buildpack":
					if(!isStringProperty(realParentNode.node)){
						sendInvalidResult("Invalid \"buildpack\" value. Expected a string literal.", getLineNumber(realParentNode.node.startPosition, realParentNode.node.endPosition, lineNumbers), res);	
					}
				break;
				case "memory":
					if(!isValidMemoryProperty(valueWithParent[m].value)){
						sendInvalidResult("Invalid \"memory\" limit; Supported measurement units are M/MB, G/GB.", getLineNumber(valueWithParent[m].startPosition, valueWithParent[m].endPosition, lineNumbers), res);	
					}
				break;
				case "instances":
					if(!isValidNonNegativeProperty(valueWithParent[m].value)){
						sendInvalidResult("Invalid \"instances\" value. Expected a non-negative integer value.", getLineNumber(valueWithParent[m].startPosition, valueWithParent[m].endPosition, lineNumbers), res);	
					}
				break;
				case "timeout":
					if(!isValidNonNegativeProperty(valueWithParent[m].value)){
						sendInvalidResult("Invalid \"timeout\" value. Expected a non-negative integer value.", getLineNumber(valueWithParent[m].startPosition, valueWithParent[m].endPosition, lineNumbers), res);	
					}
				break;
				case "no-route":
					if(valueWithParent[m].value !== "true"){
						sendInvalidResult("Invalid \"no-route\" value. Expected a string literal \"true\".", getLineNumber(valueWithParent[m].startPosition, valueWithParent[m].endPosition, lineNumbers), res);	
					}
				break;
			}
		}
	}
	function isStringProperty(parentNode){
		// check isList
	}
	function isValidNonNegativeProperty(value){
		
	}
	function isValidMemoryProperty(value){
		
	}
	function findclosestKeyName(valueNode, realParentNode){
		if(valueNode.hasOwnProperty("key")){
			realParentNode.nodeKey =  valueNode.key.value;
			realParentNode.node =  valueNode;
			return;
		}
		findclosestKeyName(valueNode.parent, realParentNode);
	}
	function getLineNumber(start, end, lineNumberArray){
		if(start && end){
			for(var j = 0; j < lineNumberArray.length ; j++){
				if(start >= lineNumberArray[j][0] && end <= lineNumberArray[j][1]){
					return j + 1;
				}
			}
		}
		return -1;
	}
	function sendInvalidResult(message, lineNumber, res){
		var task = new tasks.Task(res, false, false, 0, false);
		var resultJson = {
			"Severity":"Warning",
			"Message": message
		};
		if(lineNumber !== -1){
			resultJson.Line = lineNumber;
		}
		task.done({
			HttpCode: 400,
			Code: 0,
			DetailedMessage: message,
			JsonData: resultJson,
			Message: message,
			Severity: "Error"
		});
	}
}
function retrieveProjectFilePath(req){
	var projectPath = req.params[0];
	return path.join(req.user.workspaceDir, projectPath);
}
};