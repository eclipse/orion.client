/*******************************************************************************
 * Copyright (c) 2015, 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
var log4js = require('log4js');
var logger = log4js.getLogger("search-worker");

try {
	var Promise = require('bluebird');
	var path = require('path');
	var fs = Promise.promisifyAll(require('fs'));
	
	var SUBDIR_SEARCH_CONCURRENCY = 10;

	/**
	 * @description Converts the given path to be all forward-slashed for orionode
	 * @param {String} p The path to Converts
	 * @since 13.0
	 */
	function toURLPath(p) {
		return p.replace(/\\/g, "/");
	}

	function undoLuceneEscape(searchTerm){
		var specialChars = "+-&|!(){}[]^\"~:\\";
		for (var i = 0; i < specialChars.length; i++) {
			var character = specialChars.substring(i,i+1);
			var escaped = "\\" + character;
			searchTerm = searchTerm.replace(new RegExp(escaped,"g"), character);
		}
		return searchTerm;
	}
	
	function buildSearchPattern(searchOpts){
		var searchTerm = searchOpts.searchTerm;
		if (searchTerm) {
			if (!searchOpts.regEx) {
				if (searchTerm.indexOf("\"") === 0) {
					searchTerm = searchTerm.substring(1, searchTerm.length - 1);
				}
	
				searchTerm = undoLuceneEscape(searchTerm);
				if (searchTerm.indexOf("?") !== -1 || searchTerm.indexOf("*") !== -1) {
					if (searchTerm.indexOf("*") === 0) {
						searchTerm = searchTerm.substring(1);
					}
					if (searchTerm.indexOf("?") !== -1) {
						searchTerm = searchTerm.replace("?", ".");
					}
					if (searchTerm.indexOf("*") !== -1) {
						searchTerm = searchTerm.replace("*", ".*");
					}
				} else {
					searchTerm = searchTerm.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
				}
			}
			if (searchOpts.searchTermWholeWord){
				searchTerm = "\\b" + searchTerm + "\\b";
			}
			if (!searchOpts.searchTermCaseSensitive) {
				searchTerm = new RegExp(searchTerm, "im");
			} else {
				searchTerm = new RegExp(searchTerm, "m");
			}
		}
		return searchTerm;
	}
	
	function convertWildcardToRegex(filenamePattern){
		if (filenamePattern.indexOf("?") !== -1 || filenamePattern.indexOf("*") !== -1) {
			if (filenamePattern.indexOf("?") !== -1) {
				filenamePattern = filenamePattern.replace("?", ".");
			}
			if (filenamePattern.indexOf("*") !== -1) {
				filenamePattern = filenamePattern.replace("*", ".*");
			}
		}
		return filenamePattern;
	}
	
	function buildFilenamePattern(searchOpts){
		var filenamePatterns = searchOpts.filenamePattern;
		//Default File Pattern
		if(filenamePatterns === null){
			filenamePatterns = ".*";
		}
		return filenamePatterns.split("/").map(function(filenamePattern) {
			filenamePattern = convertWildcardToRegex(filenamePattern);
			if (!searchOpts.filenamePatternCaseSensitive) {
				return new RegExp("^"+filenamePattern, "i");
			}
			return new RegExp("^"+filenamePattern);
		});
	}
	
	function buildExcludeFilenamePattern(searchOpts){
		var excludeFilenamePatterns = searchOpts.excludeFilenamePatterns;
		//Default File Pattern
		if(!excludeFilenamePatterns || excludeFilenamePatterns.length === 0){
			return null;
		}
		return excludeFilenamePatterns.map(function(excludeFilenamePattern) {
			excludeFilenamePattern = excludeFilenamePattern.trim();
			excludeFilenamePattern = convertWildcardToRegex(excludeFilenamePattern);
			return new RegExp("^"+excludeFilenamePattern);
		});
	}


	// @returns promise that resolves once all hits have been added to the `results` object.
	// This is a basically a parallel reduce operation implemented by recursive calls to searchFile()
	// that push the search hits into the `results` array.
	//
	// Note that while this function creates and returns many promises, they fulfill to undefined,
	// and are used only for flow control.
	function searchFile(fileRoot, workspaceDir, dirLocation, filename, searchPattern, filenamePatterns, excludeFilenamePatterns, results) {
		if (excludeFilenamePatterns && excludeFilenamePatterns.some(function(excludeFilenamePattern) {
			return filename.match(excludeFilenamePattern);
		})) {
			return;
		}
		var filePath = dirLocation;
		if (filePath.substring(filePath.length - 1) !== path.sep) {
			filePath = filePath + path.sep;
		}
		filePath += filename;
		return fs.statAsync(filePath)
		.then(function(stats) {
			/*eslint consistent-return:0*/
			if (stats.isDirectory()) {
				if (filename === ".git") {
					// do not search .git no matter what
					return;
				}
				if (filePath.substring(filePath.length-1) !== path.sep) {
					filePath = filePath + path.sep;
				}
				return fs.readdirAsync(filePath)
				.then(function(directoryFiles) {
					return Promise.map(directoryFiles, function(entry) {
						return searchFile(fileRoot, workspaceDir, filePath, entry, searchPattern, filenamePatterns, excludeFilenamePatterns, results);
					}, { concurrency: SUBDIR_SEARCH_CONCURRENCY });
				});
			}
			// File case
			if (!filenamePatterns.some(function(filenamePattern) {
				return filename.match(filenamePattern);
			})){
				return;
			}
			function add () {
				// We found a hit
				var filePathFromWorkspace = filePath.substring(workspaceDir.length);
				results.push({
					"Directory": stats.isDirectory(),
					"LastModified": stats.mtime.getTime(),
					"Length": stats.size,
					"Location": toURLPath(fileRoot + filePathFromWorkspace),
					"Name": filename,
					"Path": toURLPath(filePathFromWorkspace.substring(1))
				});
			}
			if (!searchPattern) {
				return add();
			}
			return fs.readFileAsync(filePath, 'utf8')
			.then(function(file) {
				if (!file.match(searchPattern)) {
					return;
				}
				add();
			});
		}).catch(function() {
			// Probably an error reading some file or directory -- ignore
			return;
		});
	}
	
	function search(searchOpts) {

		var searchPattern, filenamePatterns, excludeFilenamePatterns;
		try {
			searchPattern = buildSearchPattern(searchOpts);
			filenamePatterns = buildFilenamePattern(searchOpts);
			excludeFilenamePatterns = buildExcludeFilenamePattern(searchOpts);
		} catch (err) {
			return Promise.reject(err);
		}

		var results = [];
		return Promise.map(searchOpts.searchScope, function(scope) {
			return fs.readdirAsync(scope.path)
			.then(function(children) {
				return Promise.map(children, function(child) {
					return searchFile(scope.fileRoot, scope.workspaceDir, scope.path, child, searchPattern, filenamePatterns, excludeFilenamePatterns, results);
				}, { concurrency: SUBDIR_SEARCH_CONCURRENCY });
			});
		}, { concurrency: SUBDIR_SEARCH_CONCURRENCY }).then(function() {
			return {
				"response": {
					"docs": results,
					"numFound": results.length,
					"start": 0
				},
				"responseHeader": {
					"params": {
						"fl": "Name,NameLower,Length,Directory,LastModified,Location,Path,RegEx,CaseSensitive",
						"fq": [
							"Location:"+ searchOpts.location,
							"UserName:anonymous"
						],
						"rows": "10000",
						"sort": "Path asc",
						"start": "0",
						"wt": "json"
					},
					"status": 0
				}
			};
		});
	}
	
	if (typeof module !== "undefined") {
		module.exports = search;
	}

	this.onmessage = function (evt) {
		search(evt.data).then(function(result) {
			this.postMessage({id: evt.data.id, result: result});
		}.bind(this)).catch(function(err){
			this.postMessage({id: evt.data.id, error: {message: err.message}});
		}.bind(this));
	}.bind(this);
} catch (err) {
	logger.error(err.message);
}
