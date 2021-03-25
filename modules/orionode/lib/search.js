/*******************************************************************************
 * Copyright (c) 2015, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
var fileUtil = require('./fileUtil'),
	api = require('./api'),
	path = require('path'),
	url = require('url'),
	express = require('express'),
	Promise = require('bluebird'),
	responseTime = require('response-time');

var fieldList = "Name,NameLower,Length,Directory,LastModified,Location,Path,RegEx,WholeWord,CaseSensitive,Exclude".split(",");

function isSearchField(term) {
	for (var i = 0; i < fieldList.length; i++) {
		if (term.lastIndexOf(fieldList[i] + ":", 0) === 0) {
			return true;
		}
	}
	return false;
}

function SearchOptions(originalUrl, contextPath){
	this.originalUrl = originalUrl;
	this.contextPath = contextPath;
	this.defaultLocation = null;
	this.fileContentSearch = false;
	this.filenamePattern = null;
	this.filenamePatternCaseSensitive = false;
	this.location = null;
	this.regEx = false;
	this.rows = 10000;
	this.scopes = [];
	this.searchTerm;
	this.searchTermCaseSensitive = false;
	this.username = null;
	this.exclude = Object.create(null);
}

function buildSearchOptions(searchOpts) {
	function getEncodedParameter(param) {
		var query = url.parse(searchOpts.originalUrl).search.substring(1), result = "";
		query.split("&").some(function(p) {
			var pair = p.split("=");
			if (pair[0] === param) {
				result = pair[1];
				return true;
			}
		});
		return result;
	}
	var terms = getEncodedParameter("q").split(/[\s\+]+/);
	for (var i = 0; i < terms.length; i++) {
		var term = terms[i];
		if (isSearchField(term)) {
			if (term.lastIndexOf("NameLower:", 0) === 0) {
				searchOpts.filenamePatternCaseSensitive = false;
				searchOpts.filenamePattern = decodeURIComponent(term.substring(10));
			} else if (term.lastIndexOf("Location:", 0) === 0) {
				searchOpts.location = decodeURIComponent(term.substring(9 + (searchOpts.contextPath ? searchOpts.contextPath.length : 0)));
			} else if (term.lastIndexOf("Name:", 0) === 0) {
				searchOpts.filenamePatternCaseSensitive = true;
				searchOpts.filenamePattern = decodeURIComponent(term.substring(5));
			} else if (term.lastIndexOf("RegEx:", 0) === 0) {
				searchOpts.regEx = true;
			} else if (term.lastIndexOf("CaseSensitive:", 0) === 0) {
				searchOpts.searchTermCaseSensitive = true;
			} else if (term.lastIndexOf("WholeWord:", 0) === 0) {
				searchOpts.searchTermWholeWord = true;
			} else if(term.lastIndexOf("Exclude:", 0) === 0) {
				var items = term.substring(8).split(",");
				searchOpts.excludeFilenamePatterns = [];
				items.forEach(function(item) {
					searchOpts.excludeFilenamePatterns.push(decodeURIComponent(item));						
				});
			}
		} else if(term.indexOf(":") > -1) {
			//unknown search term
			continue;	
		} else {
			searchOpts.searchTerm = decodeURIComponent(term);
			searchOpts.fileContentSearch = true;
		}
	}
}

module.exports.router = function router(options) {
	var search;
	var USE_WORKERS = options.configParams.get("isElectron");
	if (USE_WORKERS) {
		var requests = {};
		var WORKER_COUNT = 1;
		var searchWorkers = [];
		var id = 0, lastWorker = 0;
		var TinyWorker = require("tiny-worker");
		for (var i = 0; i < WORKER_COUNT; i++) {
			var searchWorker = new TinyWorker(path.join(__dirname, "searchWorker.js"));
			searchWorker.onmessage = function (evt) {
				var promise = requests[evt.data.id];
				delete requests[evt.data.id];
				if (evt.data.err) {
					return promise.reject(evt.data.err);
				}
				promise.fullfil(evt.data.result);
			};
			searchWorkers.push(searchWorker);
		}
		search = function(options) {
			return new Promise(function(fullfil, reject) {
				id++;
				options.id = id;
				requests[id] = {fullfil: fullfil, reject: reject};
				var worker = searchWorkers[lastWorker++ % searchWorkers.length];
				worker.postMessage(options);
			});
		};
		api.getOrionEE().on("close-server", function(){
			searchWorkers.forEach(function(worker){
				worker.terminate();
			});
		});
	} else {
		search = require('./searchWorker');
	}
	return express.Router()
	.use(responseTime({digits: 2, header: "X-Filesearch-Response-Time", suffix: true}))
	.get('*', function(req, res) {
		var searchOpts = new SearchOptions(req.originalUrl, req.contextPath);
		buildSearchOptions(searchOpts);

		if(!searchOpts.location) {
			return api.writeError(400, res);
		}
		var loc = searchOpts.location;
		loc = loc.replace(/^\/file/, "");
		loc = loc.replace(/^\/workspace/, "");
		loc = loc.replace(/\*$/, "");
			
		var file = fileUtil.getFile(req, loc);
		
		if (file) {
			file.fileRoot = api.join(typeof req.contextPath === 'string' ? req.contextPath : '', "file", file.workspaceId);
			searchOpts.searchScope = [file];
		} else {
			var store = fileUtil.getMetastore(req);
			searchOpts.searchScope = req.user.workspaces.map(function(w) {
				var path = store.getWorkspaceDir(w);
				return {
					path: path,
					workspaceId: w,
					workspaceDir: path,
					fileRoot: api.join(typeof req.contextPath === 'string' ? req.contextPath : '', "file", w)
				};
			});
		}
		
		if (!searchOpts.searchScope || !searchOpts.searchScope.length) {
			api.writeError(400, res);
			return;
		}

		search(searchOpts).then(function(result) {
			return api.writeResponse(200, res, null, result);
		}).catch (function(err) {
			api.writeError(400, res, err);
		});
	});
};
