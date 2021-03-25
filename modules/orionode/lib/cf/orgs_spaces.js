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
/*eslint-env node */
var express = require("express");
var tasks = require("../tasks");
var target = require("./target");
var async = require("async");
var log4js = require('log4js');
var logger = log4js.getLogger("orgs");
var LRU = require("lru-cache-for-clusters-as-promised");

// Caching for already located targets
var orgsCache = new LRU({max: 1000, maxAge: 300000, namespace: "orgs_spaces"});

module.exports.router = function() {
	
	module.exports.getOrgsRequest = getOrgsRequest;

	return express.Router()
	.get("*", getOrgs);
		
function getOrgs(req, res){
	var task = new tasks.Task(res,false,false,0,false);
	var targetRequest = JSON.parse(req.query.Target);
	getOrgsRequest(req.user.username, target.fullTarget(req,targetRequest))
	.then(function(orgs){
		var result = [];
		orgs.forEach(function(org) {
			var o = resourceJson(org, "Org");
			o.Spaces = [];
			org.spaces.forEach(function(space) {
				o.Spaces.push(resourceJson(space));
			})
			result.push(o);
		});
		task.done({
			HttpCode: 200,
			Code: 0,
			DetailedMessage: "OK",
			JsonData: {
				"Orgs" : result
			},
			Message: "OK",
			Severity: "Ok"
		});
	}).catch(function(err){
		target.caughtErrorHandler(task, err);
	});
}

function getOrgsRequest(userId, targetRequest){
	var cacheKey = userId + targetRequest.Url;
	var time = Date.now();
	return orgsCache.get(cacheKey)
	.then(function(value) {
		logger.info("time to get orgs cache=" + (Date.now() - time));
		if (value) {
			return value;
		}
		return target.cfRequest("GET", userId, targetRequest.Url + "/v2/organizations", {"inline-relations-depth":"1"}, null, null, null, targetRequest)
		.then(function(result){
			var orgs = result.resources || [];
			return new Promise(function(fulfill,reject){
				async.each(orgs, function(org, cb) {
					return target.cfRequest("GET", userId, targetRequest.Url + org.entity.spaces_url, {"inline-relations-depth":"1"}, null, null, null, targetRequest)
					.then(function(result){	
						org.spaces = result && result.resources || [];
						cb();
					}).catch(function(err){
						cb(err);
					});
				}, function(err) {
					if(err){
						return reject(err);
					}
					time = Date.now();
					orgsCache.set(cacheKey, orgs)
					.then(function() {
						logger.info("time to set orgs cache=" + (Date.now() - time));
						fulfill(orgs);
					});
				});
			});
		});
	});
}

function resourceJson(resource, type){
	return {
		"Guid": resource.metadata.guid,
		"Name": resource.entity.name,
		"Type": type
	};
}
};
