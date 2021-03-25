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
var target = require("./target");
var tasks = require("../tasks");
var api = require("../api");

module.exports.router = function() {

	module.exports.getCFdomains = getCFdomains;

	return express.Router()
		.get("*", getDomain);

function getDomain(req, res) {
	var task = new tasks.Task(res, false, false, 0, false);
	var targetRequest = req.query.Target ? JSON.parse(req.query.Target) : null;
	var defaultDomainMode = req.query.Default;
	var domainName = req.query.Name;
	target.computeTarget(req.user.username, targetRequest)
	 .then(function(appTarget){
	 	return getCFdomains(appTarget, req.user.username, targetRequest.Url, domainName, defaultDomainMode)
		.then(function(domainArray) {
			var resp = {};
			if (!domainArray) {
				task.done({
					HttpCode: 404,
					Code: 0,
					DetailedMessage: "Domain can not be found",
					JsonData: resp,
					Message: "Domain can not be found",
					Severity: "Error"
				});
			} else {
				resp = {
					"Domains": domainArray
				};
				task.done({
					HttpCode: 200,
					Code: 0,
					DetailedMessage: "Ok",
					JsonData: resp,
					Message: "Ok",
					Severity: "Ok"
				});
			}
		});
	 })
	 .catch(function(err){
		 target.caughtErrorHandler(task, err);
	 });
}

// This method can not accept req, because the req something has a body instead of a query.
function getCFdomains(appTarget, UserId, targetUrl, domainName, defaultDomainMode) {
	var domainArray = [];
	var waitFor;
	if (!defaultDomainMode){
		waitFor = target.cfRequest("GET", UserId, targetUrl + appTarget.Org.entity.private_domains_url, 
				domainName ? {"q": "name:" + api.encodeURIComponent(domainName)}: null, null, null, null, appTarget);
	}else{
		waitFor = Promise.resolve();
	}
	return waitFor
	.then(function(result) {
		if (defaultDomainMode || !domainName || result.total_results < 1) {
			var qs = domainName ? {
				"q": "name:" + api.encodeURIComponent(domainName)
			} : {
				"page": "1",
				"results-per-page": "1"
			};
			return target.cfRequest("GET", UserId, targetUrl + "/v2/shared_domains", qs, null, null, null, appTarget)
			.then(function(result){
				return result;
			});
		}
		return result;
	}).then(function(result) {
		var domainResources = result.resources;
		for (var k = 0; k < domainResources.length; k++) {
			var domainJson = {
				"Guid": domainResources[k].metadata.guid,
				"DomainName": domainResources[k].entity.name,
				"Type": "Domain"
			};
			domainArray.push(domainJson);
		}
		return domainArray;
	});
}
};
