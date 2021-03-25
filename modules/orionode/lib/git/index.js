/*******************************************************************************
 * Copyright (c) 2012, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *		 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var api = require('../api'), writeError = api.writeError, writeResponse = api.writeResponse,
	git = require('nodegit'),
	clone = require('./clone'),
	path = require('path'),
	async = require('async'),
	Promise = require('bluebird'),
	fs = Promise.promisifyAll(require('fs')),
	express = require('express'),
	responseTime = require('response-time');

module.exports = {};

module.exports.router = function(options) {
	var fileRoot = options.fileRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }
	
	var contextPath = options && options.configParams.get("orion.context.path") || "";
	fileRoot = fileRoot.substring(contextPath.length);
	
	return express.Router()
	.use(responseTime({digits: 2, header: "X-GitapiIndex-Response-Time", suffix: true}))
	.use(options.checkUserAccess)
	.get(fileRoot + '*', getIndex)
	.put(fileRoot + '*', putIndex)
	.post(fileRoot + '*', postIndex);

function getIndex(req, res) {
	var repo;
	var index;
	var filePath;

	return clone.getRepo(req)
	.then(function(repoResult) {
		repo = repoResult;
		filePath = clone.getfileRelativePath(repo,req);
		return repo;
	})
	.then(function(repo) {
		return repo.refreshIndex();
	})
	.then(function(indexResult) {
		index = indexResult;
		var indexEntry = index.getByPath(filePath);
		if (!indexEntry) {
			// new untracked file that's not in the index
			var readIfExists = req.headers ? Boolean(req.headers['read-if-exists']).valueOf() : false;
			if (typeof readIfExists === 'boolean' && readIfExists) {
				return 204;
			}
			return 404;
		}
		return git.Blob.lookup(repo, indexEntry.id);
	})
	.then(function(blob) {
		if (typeof blob === 'number') {
			if (blob === 204) {
				api.sendStatus(204, res);
			} else {
				writeError(404, res, filePath + " not found in index");
			}
		} else {
			writeResponse(200, res, {"Content-Type":"application/octect-stream"}, blob.toString(), false, true);
		}
	})
	.catch(function(err) {
		writeError(404, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(repo);
	});
}

function putIndex(req, res) {
	var index, repo;
	var filePath; 

	return clone.getRepo(req)
	.then(function(_repo) {
		repo = _repo;
		filePath = clone.getfileRelativePath(repo,req);
		return repo.refreshIndex();
	})
	.then(function(indexResult) {
		index = indexResult;
		var files = req.body.Path || [filePath];
		return new Promise(function(fulfill, reject) {
			async.series(files.map(function(p) {
				return function(cb) {
					return fs.statAsync(path.join(repo.workdir(), p))
					.catchReturn({ code: 'ENOENT' }, null)
					.then(function(exists) {
						if (exists) {
							return index.addByPath(p);
						}
						return index.removeByPath(p);
					})
					.then(function() {
						return cb();
					})
					.catch(function(err) {
						return cb(err);
					});
				};
			}), function(err) {
				if (err) {
					reject(err);
				} else {
					fulfill();
				}
			});
		});
	})
	.then(function() {
		// this will write both files to the index
		return index.write();
	})
	.then(function() {
		writeResponse(200, res);
	}).catch(function(err) {
		writeError(404, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(repo);
	});
}

function postIndex(req, res) {
	var repo;
	var resetType = req.body.Reset;
	var filePath = clone.getfileAbsolutePath(req); 
	
	return clone.getRepo(req)
	.then(function(_repo) {
		repo = _repo;
		return git.AnnotatedCommit.fromRevspec(repo, req.body.Commit || "HEAD");
	})
	.then(function(commit) {
		return repo.getCommit(commit.id());
	})
	.then(function(commit) {
		if (req.body.Path) {
			var paths = req.body.Path;
			if (typeof paths === "string") {
				paths = [paths];
			}
			return git.Reset.default(repo, commit, paths);
		} else if (resetType) {
			var reset_type = git.Reset.TYPE.HARD;
			switch (resetType) {
				case "HARD":
					reset_type = git.Reset.TYPE.HARD;
					break;
				case "MIXED":
					reset_type = git.Reset.TYPE.MIXED;
					break;
				case "SOFT":
					reset_type = git.Reset.TYPE.SOFT;
					break;
			}
			return git.Reset.reset(repo, commit, reset_type, {});
		} 
			
		return git.Reset.default(repo, commit, [filePath]);
	})
	.then(function() {
		writeResponse(200, res);
	}).catch(function(err) {
		writeError(404, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(repo);
	});
}
};
