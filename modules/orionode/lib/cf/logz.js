/*******************************************************************************
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node, express, worker*/
var express = require("express");
var target = require("./target");
var apps = require("./apps");
var tasks = require("../tasks");
var logspb = require("./logs_pb");

module.exports.router = function() {

	return express.Router()
	.get("*", getLogz);
	
	function getLogz(req, res) {
		var task = new tasks.Task(res, false, false, 0, false);
		var appName = req._parsedUrl.pathname.slice(1);
		var targetRequest = req.query.Target ? JSON.parse(req.query.Target) : null;
		var timestamp = req.query.Timestamp && req.query.Timestamp !== "-1" ? req.query.Timestamp : -1;
		var appGuid, loggingEndpoint;

		target.computeTarget(req.user.username, target.fullTarget(req, targetRequest))
		.then(function(appTarget){
			return apps._getAppwithAppName(req.user.username, appName, appTarget);
		}).then(function(appResult){
			appGuid = appResult.app.appMetadata.guid;
			var infoURL = targetRequest.Url + "/v2/info";
			var infoHeader = {
				"Accept": "application/json",
				"Content-Type": "application/json"
			};
			return target.cfRequest(null, req.user.username, infoURL, null, null, infoHeader, null, targetRequest);
		}).then(function(infoData) {
			return target.getAccessToken(req.user.username, targetRequest)
			.then(function(cloudAccessToken){
				loggingEndpoint = infoData.logging_endpoint;

				if (loggingEndpoint.startsWith("wss://"))
					loggingEndpoint = loggingEndpoint.replace("wss://", "https://");
				else if (loggingEndpoint.startsWith("ws://"))
					loggingEndpoint = loggingEndpoint.replace("ws://", "http://");
				
				var logzHeader = {
					url: loggingEndpoint + "/recent?app=" + appGuid,
					headers: {
						"Content-Type": "mutlipart/form-data",
						"Authorization": cloudAccessToken
					},
					encoding: null
				};
				return target.cfRequest(null, null, null, null, null, null, logzHeader, targetRequest);
			});
		}).then(function(response) {
			var body = response.body;
			var boundaryIndex = response.headers["content-type"].indexOf("boundary=");
			
			if (boundaryIndex !== -1) {
				var boundary = response.headers["content-type"].slice(boundaryIndex+"boundary=".length);
			}
			if (!boundary || boundary === "") {
				var errorStatus = new Error("An error occured when performing operation Get App Log. Boundary in response header not found.");
				return Promise.reject(errorStatus);
			}

			var CR = 13;
			var LF = 10;
			var bodyIndex = 0;
			var currentPart = null;
			var messageSeparator = "\r\n--"+boundary;
			var messageSeparatorBytes = [];
			var logs = [];
			var log, i;
			var JSONData = {
				messages: [],
				timestamp: ""
			};

			for (i = 0; i < messageSeparator.length; i++) {
				messageSeparatorBytes.push(messageSeparator.charCodeAt(i));
			}
			while (readNextPart()) {
				log = logspb.LogMessage.deserializeBinary(currentPart);
				logs.push(log.array);
			}
			logs.sort(function(log1, log2) {
				if (log1[2] < log2[2]) return -1;// index 2 is timestamp
				else if (log1[2] > log2[2]) return 1;
				return 0;
			});
			logs.forEach(function(log) {
				if (timestamp === -1 || log[2] > timestamp) {
					JSONData.messages.push(log[0]); // index 0 is the log message
				}
			});
			JSONData.timestamp = logs[logs.length-1] ? logs[logs.length-1][2] : timestamp;
			return JSONData;

			function readNextPart() {
				if (bodyIndex >= body.length) {
					return false;
				}
				var partStartPos = findPartStartPosition(bodyIndex);
				if (partStartPos === -1) {
					bodyIndex = body.length;
					return false;
				}
				var partEndPos = findPartEndPosition(partStartPos);
				if (partEndPos === -1) {
					bodyIndex = body.length;
					return false;
				}
				if (setCurrentPart(partStartPos, partEndPos - partStartPos)) {
					bodyIndex = partEndPos;
					return true;
				} 
				bodyIndex = body.length;
				return false;
			}
			function findPartStartPosition(startPos) {
				var pos = findNextBoundaryStartPosition(startPos);
				if (pos !== -1) {
					if (pos + messageSeparatorBytes.length + 2 < body.length) {
						if (body[pos] === CR && body[pos + 1] === LF) {
							return discardPartHeader(pos + messageSeparatorBytes.length + 2);
						}
					}
				}
				return -1;
			}
			function findPartEndPosition(startPos) {
				return findNextBoundaryStartPosition(startPos);
			}
			function discardPartHeader(pos) {
				while (pos < body.length) {
					if (body[pos] === CR && body[pos + 1] === LF) {
						pos += 2;
					} else {
						return pos;
					}
				}
				return -1;
			}
			function findNextBoundaryStartPosition(startPos) {
				var endPos = 0;
				var cmpBufLen = messageSeparatorBytes.length;
				while (startPos + endPos < body.length) {
					if (body[startPos + endPos] === messageSeparatorBytes[endPos]) {
						if (endPos + 1 === cmpBufLen) { // Found "\r\n--<boundary>"
							return startPos; // index of \r or \? before the boundary
						} // a match, but not ready with whole comparison
						endPos++;
					} else { // Restart the search
						startPos += endPos + 1;
						endPos = 0;
					}
				}
				return -1;
			}
			function setCurrentPart(startPos, size) {
				if (body === null || startPos < 0 || size <= 0 || startPos + size >= body.length) {
					return false;
				}
				currentPart = [];
				for (i = 0; i < size; i++) {
					currentPart[i] = body[startPos + i];
				}
				return true;
			}	
		}).then(function(JSONData) {
			task.done({
				BundleId: "org.eclipse.orion.server.core",
				Code: 0,
				HttpCode: 200,
				JsonData: {
					"Messages": JSONData.messages,
					"Timestamp": JSONData.timestamp
				},
				Message: "",
				Severity: "Ok"
			});
		}).catch(function(err) {
			task.done({
				BundleId: "org.eclipse.orion.server.core",
				Code: 0,
				HttpCode: 500,
				JsonData: {},
				Message: err.message,
				Stack: err.stack,
				Severity: "Ok"
			});			
		});		
	}
};
