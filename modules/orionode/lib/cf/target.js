/*******************************************************************************
 * Copyright (c) 2016, 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node, es6*/
var express = require("express");
var tasks = require("../tasks");
var request = require("request");
var orgs = require("./orgs_spaces");
var bearerTokenStore = require("./accessTokenStore");
var log4js = require('log4js');
var logger = log4js.getLogger("target");
var LRU = require("lru-cache-for-clusters-as-promised");

// Caching for already located targets
var targetCache = new LRU({max: 10000, maxAge: 1800000, namespace: "target"});
/**
 * UTILITY
 * @param {{?}} body The JSON body to parse
 */
function parsebody(body){
	var result;
	try {
		result = typeof body === "string" ? JSON.parse(body): body;
	} catch(err) {
		result = body;
	}
	return result;
}
module.exports.parsebody = parsebody;

module.exports.router = function(options) {
	
	module.exports.getAccessToken = getAccessToken;
	module.exports.computeTarget = computeTarget;
	module.exports.cfRequest = cfRequest;
	module.exports.caughtErrorHandler = caughtErrorHandler;
	module.exports.fullTarget = fullTarget;

	return express.Router()
	.get("*", getTarget)
	.post("*", postTarget);
	
function getTarget(req,res){
	// TODO this end point hasn't been used yet, since wasn't fully implemented yet.
	var task = new tasks.Task(res,false,false,0,false);
	var url = req.body.Url;
	var resp = {
		"Type": "Target",
		"Url": url
	};
	task.done({
		HttpCode: 200,
		Code: 0,
		JsonData: resp,
		Message: "OK",
		Severity: "Ok"
	});
}
function postTarget(req,res){
	var task = new tasks.Task(res,false,false,0,false);
	var url = req.body.Url;
	var Password = req.body.Password;
	var Username = req.body.Username;
	// Try to login here!!
	tryLogin(url,Username,Password,req.user.username)
	.then(function() {
		task.done({
			BundleId: "unknown",
			HttpCode: 200,
			Code: 0,
			JsonData: {"Type": "Target", "Url": url},
			Message: "OK",
			Severity: "Ok"
		});
	}).catch(function(err){
		caughtErrorHandler(task, err);
	});
}
function tryLogin(url, Username, Password, userId){
	var infoHeader = {
		url: url + "/v2/info",
		headers: {"Accept": "application/json",	"Content-Type": "application/json"}
	};
	return cfRequest(null, null, null, null, null, null, infoHeader, {Url: url})
	.then(function(response){
		var authorizationEndpoint = response.authorization_endpoint;
		return new Promise(function(fulfill, reject) {
			var authorizationHeader = {
				url: authorizationEndpoint + "/oauth/token",
				headers: {"Accept": "application/json",	"Content-Type": "application/x-www-form-urlencoded","Authorization":"Basic Y2Y6"},
				form: {"grant_type": "password", "password": Password, "username": Username, "scope": ""}
			};
			request.post(authorizationHeader, function (error, response, body) {
				var respondJson = parsebody(body);
				if(!error && response.statusCode === 200){
					var store = bearerTokenStore.getBearerTokenStore();
					store.setBearerToken && store.setBearerToken(userId, respondJson.access_token);		
					return fulfill();
				}
				if(error){
					error.code = 400;
					error.data = error;
					error.bundleid = "org.eclipse.orion.server.core"
					return reject(error);
				}
				var errorStatus = new Error();
				errorStatus.code = response.statusCode;
				errorStatus.data = respondJson;
				errorStatus.bundleid = "org.eclipse.orion.server.core"
				reject(errorStatus);
			});
		});
	});
}
function computeTarget(userId, targetRequest){
	if(targetRequest){
		var cached;
		if (userId && targetRequest.Url && targetRequest.Org && targetRequest.Space) {
			var getKey = userId + targetRequest.Url + targetRequest.Org + targetRequest.Space;
			cached = targetCache.get(getKey);
		} else {
			cached = Promise.resolve(null);
		}
		var time = Date.now();
		return cached
		.then(function(value) {
			logger.info("time to get target cache=" + (Date.now() - time));
			if (value) {
				return value;
			}
			return orgs.getOrgsRequest(userId, targetRequest)
			.then(function(orgs) {
				var org, space;
				if(!targetRequest.Org){
					org = orgs[0];
				} else {
					org = orgs.find(function(org){
						return org.entity.name === targetRequest.Org || org.metadata.guid === targetRequest.Org;
					});
				}
				if (!org) {
					return Promise.reject(new Error("Organization not found"));
				}
				if(!targetRequest.Space){
					space = org.spaces[0];
				} else {
					space = org.spaces.find(function(space){
						return space.entity.name === targetRequest.Space || space.metadata.guid === targetRequest.Space;
					});
				}
				if (!space) {
					return Promise.reject(new Error("Space not found"));
				}
				var target = {
					"Type": "Target",
					"Url": targetRequest.Url,
					"Org": org,
					"Space": space
				};
				var putKey = userId + targetRequest.Url + org.entity.name + space.entity.name;
				time = Date.now();
				return targetCache.set(putKey, target)
				.then(function() {
					logger.info("time to set target cache=" + (Date.now() - time));
					return  target;
				});
				
			});
		});
	}
	if(!targetRequest){
		var errorStatus = new Error("Target not set");
		errorStatus.code = 500;
		errorStatus.data = {
			"description": "Target not set",
			"error_code": "CF-TargetNotSet"
		};
		errorStatus.detailMessage = "Target not set";
		errorStatus.bundleid = "org.eclipse.orion.server.core"
		return Promise.reject(errorStatus);
	}
}
function getAccessToken(userId, target){
	var store = bearerTokenStore.getBearerTokenStore();
	return store.getBearerToken(userId, target);
}
function caughtErrorHandler(task, err){
	var errorResponse = {
		HttpCode: err.code || 400,
		Code: 0,
		DetailedMessage: err.detailMessage || err.message,
		JsonData: err.data || {},
		Message: err.message,
		Severity: err.severity || "Error"
	};
	//properly handle parse errors from the YAML parser
	if(err.name && err.name === 'YAMLException') {
		if(err.mark){
			errorResponse.JsonData = err.mark;
			errorResponse.JsonData.Line = err.mark.line + 1;
		}
		errorResponse.JsonData.Message = err.message;
	}
	if(err.bundleid){
		errorResponse.BundleId = err.bundleid;
	}
	task.done(errorResponse);
}

function cfRequest (method, userId, url, query, body, headers, requestHeader, target) {
	var waitFor;
	if(!requestHeader){
		waitFor = getAccessToken(userId, target);
	}
	return Promise.resolve(waitFor).then(function(cloudAccessToken){
		if(!requestHeader){
			if (!cloudAccessToken || cloudAccessToken instanceof Error) {
				var errorStatus = new Error("Not authenticated");
				errorStatus.code = 401;
				errorStatus.data = {
					"description": "Not authenticated",
					"error_code": "CF-NotAuthenticated"
				};
				errorStatus.data = Object.assign(errorStatus.data, cloudAccessToken);
				return Promise.reject(errorStatus);
			}
			headers = headers || {};
			headers.Authorization = cloudAccessToken;
			requestHeader = {};
			requestHeader.url = url;
			requestHeader.headers = headers;
			query && (requestHeader.qs = query);
			body && (requestHeader.body = body);
			requestHeader.method = method;
		}
		if (requestHeader.headers.Authorization) {
			requestHeader.headers.Authorization = "bearer " + requestHeader.headers.Authorization;
		}
		return new Promise(function(fullfill,reject){
			request(requestHeader, /* @callback */ function (error, response, body) {
				if (error) {
					return reject(error);
				}
				var code = response.statusCode;
				if (code === 204) {
					return fullfill();
				}
				if (body instanceof Uint8Array) {
					return fullfill(response);
				}
				var result = parsebody(body);
				var err;
				if (code !== 200 && code !== 201) {
					var description = result.description || result.message;
					if (!description) {
						var defaultDesc = "Could not connect to host. Error: " + code;
						description = result || defaultDesc;
						if (description.length > 1000) description = defaultDesc;
					}
					err = new Error(description);
					err.code = code;
					err.data = result;
					return reject(err);
				}
				if (result.error_code) {
					err = new Error(result.description);
					err.code = 500;
					err.data = result;
					return reject(err);
				}
				fullfill(result);
			});
		});
	});
}
function fullTarget(req, target){
	if(req.headers['accept-language'] && target) {
		target['accept-language'] = req.headers['accept-language'];
	}
	return target;
}
};
