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
var api = require('../api'), writeError = api.writeError, writeResponse = api.writeResponse,
	git = require('nodegit'),
	clone = require('./clone'),
	express = require('express'),
	tasks = require('../tasks'),
	responseTime = require('response-time');

function router(options) {
	var fileRoot = options.fileRoot;
	var gitRoot = options.gitRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }
	if (!gitRoot) { throw new Error('options.gitRoot is required'); }
	
	var contextPath = options && options.configParams.get("orion.context.path") || "";
	fileRoot = fileRoot.substring(contextPath.length);

	return express.Router()
	.use(responseTime({digits: 2, header: "X-GitapiStatus-Response-Time", suffix: true}))
	.use(options.checkUserAccess)
	.get('*', getStatus);
	
	function getStatus(req, res) {
		var task = new tasks.Task(res,false,false,0,false);
		var theRepo;
		return clone.getRepo(req)
		.then(function(repo) {
			theRepo = repo;
			var fileDir = clone.getfileDir(repo,req);
			return repo.getStatusExt({
				flags: 
					git.Status.OPT.INCLUDE_UNTRACKED | 
					git.Status.OPT.RECURSE_UNTRACKED_DIRS
			}).then(function(statuses) {
	
				var added = [],
					changed = [],
					conflicting = [],
					missing = [],
					modified = [],
					removed = [], 
					untracked = [];
		
				function returnContent(file, diffType) {
					diffType = diffType || "Default";
					var orionFilePath = api.join(fileDir, file.path());
					return {
						"Git": {
							"CommitLocation": gitRoot + "/commit/HEAD" + orionFilePath,
							"DiffLocation": gitRoot + "/diff/" + diffType + orionFilePath,
							"IndexLocation": gitRoot + "/index" + orionFilePath
						},
						"Location": contextPath + orionFilePath,
						"Name": file.path(),
						"Path": file.path()
					};
				}
			
				statuses.forEach(function(file) {
					var bit = file.statusBit();
					
					if (bit & git.Status.STATUS.CONFLICTED) {
						conflicting.push(returnContent(file));
					}
					
					if (bit & git.Status.STATUS.WT_MODIFIED) {
						modified.push(returnContent(file));
					}
					
					if (bit & git.Status.STATUS.WT_DELETED) {
						missing.push(returnContent(file));
					}
					
					if (bit & git.Status.STATUS.WT_NEW) {
						untracked.push(returnContent(file));
					}
					
					if (bit & git.Status.STATUS.INDEX_NEW) {
						added.push(returnContent(file, "Cached"));
					}
					
					if (bit & git.Status.STATUS.INDEX_MODIFIED) {
						changed.push(returnContent(file, "Cached"));
					}
					
					if (bit & git.Status.STATUS.INDEX_DELETED) {
						removed.push(returnContent(file, "Cached"));
					}
					
				});
			
				var repoState = "SAFE";
				
				if (repo.isRebasing()) {
					repoState = "REBASING";
				} 
				else if (repo.isReverting()) {
					repoState = "REVERTING";
				}
				else if (repo.isMerging()) {
					repoState = "MERGING";
				}
				else if (repo.isCherrypicking()){
					repoState = "CHERRY_PICKING";
				}
				
				var result = {
					"Added": added,
					"Changed": changed,
					"CloneLocation": gitRoot + "/clone" + fileDir,
					"CommitLocation": gitRoot + "/commit/HEAD" + fileDir,
					"Conflicting": conflicting,
					"IndexLocation": gitRoot + "/index" + fileDir,
					"Location": gitRoot + "/status" + fileRoot + fileDir,
					"Missing": missing,
					"Modified": modified,
					"Removed": removed,
					"RepositoryState": repoState,
					"Type": "Status",
					"Untracked": untracked   
				};
				task.done({
					HttpCode: 200,
					Code: 0,
					DetailedMessage: "OK",
					Message: "OK",
					Severity: "Ok",
					JsonData: result
				});
			});
		})
		.catch(function(err) {
			err.code = 400;
			clone.handleRemoteError(task, err);
		})
		.finally(function() {
			clone.freeRepo(theRepo);
		});
	}
}

module.exports = {
	router: router
};
