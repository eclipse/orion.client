/*******************************************************************************
 * Copyright (c) 2012, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var api = require('../api'), 
	writeError = api.writeError, 
	writeResponse = api.writeResponse,
	git = require('nodegit'),
	async = require('async'),
	mRemotes = require('./remotes'),
	clone = require('./clone'),
	express = require('express'),
	args = require('../args'),
	responseTime = require('response-time');

module.exports = {};

module.exports.router = function(options) {
	var fileRoot = options.fileRoot;
	var gitRoot = options.gitRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }
	if (!gitRoot) { throw new Error('options.gitRoot is required'); }
	
	var contextPath = options && options.configParams.get("orion.context.path") || "";
	fileRoot = fileRoot.substring(contextPath.length);
	
	module.exports.branchJSON = branchJSON;
	module.exports.getBranchCommit = getBranchCommit;
	module.exports.getBranchRemotes = getBranchRemotes;
	
	return express.Router()
	.use(responseTime({digits: 2, header: "X-GitapiBranches-Response-Time", suffix: true}))
	.use(options.checkUserAccess)
	.get(fileRoot + '*', getBranches)
	.get('/:branchName*', getBranches)
	.delete('/:branchName*', deleteBranch)
	.post('*', createBranch);

	function branchJSON(repo, ref, fileDir) {
		var fullName = ref.name();
		var shortName = ref.shorthand();
		var branchURL = api.encodeURIComponent(fullName);
		var current = !!ref.isHead() || repo.headDetached() && ref.name() === "HEAD";
		return {
			"CloneLocation": gitRoot + "/clone"+ fileDir,
			"CommitLocation": gitRoot + "/commit/" + branchURL + fileDir,
			"Current": current,
			"Detached": current && !!repo.headDetached(),
			"DiffLocation": gitRoot + "/diff/" + api.encodeURIComponent(shortName) + fileDir,
			"FullName": fullName,
			"HeadLocation": gitRoot + "/commit/HEAD" + fileDir,
			"Location": gitRoot + "/branch/" + api.encodeURIComponent(shortName) + fileDir,
			"Name": shortName,
			"RemoteLocation": [],
			"TreeLocation": gitRoot + "/tree" + fileDir + "/" + branchURL,
			"Type": "Branch"
		};
	}
	
	function getBranchCommit(repo, branches) {
		return new Promise(function (fulfill, reject){
			async.each(branches, function(branch, cb) {
				return repo.getReferenceCommit(branch.FullName)
				.then(function(commit) {
					branch["LocalTimeStamp"] = commit.timeMs();
					branch["HeadSHA"] = commit.sha();
					cb();
				})
				.catch(function(err) {
					cb(err);
				});
			}, function(err) {
				if(err){
					return reject(err);
				}
				fulfill();
			});
		});
	}
	
	function getBranchRemotes(repo, branches, fileDir) {
		return git.Remote.list(repo)
		.then(function(remotes) {
			var configFile = api.join(repo.path(), "config");
			return new Promise(function(fulfill, reject) {
				args.readConfigFile(configFile, function(err, config) {
					if (err) {
						return reject(err);
					}
					config = config || {};
					async.each(remotes, function(remote, cb) {
						git.Remote.lookup(repo, remote)
						.then(function(remote) {
							return Promise.all(branches.map(function(branch) {
								return git.Branch.lookup(repo, api.join(remote.name(), branch.Name), git.Branch.BRANCH.REMOTE).then(function(remoteBranch) {
									return repo.getBranchCommit(remoteBranch).then(function(commit) {
										var rJson = mRemotes.remoteJSON(remote, fileDir, [mRemotes.remoteBranchJSON(remoteBranch, commit, remote, fileDir)]);
										var trackingRemote = config.branch && config.branch[branch.Name] && config.branch[branch.Name].remote;
										if (trackingRemote === remote.name() || !trackingRemote) {
											branch["RemoteLocation"].splice(0, 0, rJson);
										} else {
											branch["RemoteLocation"].push(rJson);
										}
									});
								}).catch(function() {
									//No remote tracking branch
									branch["RemoteLocation"].push(mRemotes.remoteJSON(remote, fileDir, [mRemotes.remoteBranchJSON(null, null, remote, fileDir, branch)]));
								});
							}));
						})
						.then(function() {
							cb();
						})
						.catch(function(err) {
							cb(err);
						});
					}, function(err) {
						if (err) return reject(err);
						fulfill();
					});
				});
			});
		});
	}
	
	function getBranches(req, res) {
		var branchName = api.decodeURIComponent(req.params.branchName || "");
		var fileDir;
		
		var theRepo;
		if (branchName) {
			var theBranch;
			clone.getRepo(req)
			.then(function(repo) {
				theRepo = repo;
				fileDir = clone.getfileDir(repo,req);
				return git.Branch.lookup(repo, branchName, git.Branch.BRANCH.LOCAL);
			})
			.then(function(ref) {
				theBranch = ref;
				var branch = branchJSON(theRepo, theBranch, fileDir);
				return getBranchCommit(theRepo, [branch])
				.then(function(){
					return getBranchRemotes(theRepo, [branch], fileDir);
				})
				.then(function(){
					writeResponse(200, res, null, branch, true);
				});
			})
			.catch(function(err) {
				writeError(500, res, err.message);
			})
			.finally(function() {
				clone.freeRepo(theRepo);
			});
			return;
		}
		
		var filter = req.query.filter;
	
		clone.getRepo(req)
		.then(function(repo) {
			theRepo = repo;
			fileDir = clone.getfileDir(repo,req);
			return git.Reference.list(theRepo);
		})
		.then(function(referenceList) {
			if (theRepo.headDetached()) {
				referenceList.unshift("HEAD");
			}
			referenceList = referenceList.filter(function(ref) {
				if (ref === "HEAD" || ref.indexOf("refs/heads/") === 0) {
					if (!filter || ref.replace("refs/heads/", "").indexOf(filter) !== -1) {
						return true;
					}
				}
			});
			return Promise.all(referenceList.map(function(ref) {
				return git.Reference.lookup(theRepo, ref);
			}))
			.then(function(branches) {
				branches = branches.map(function(ref) {
					return branchJSON(theRepo, ref, fileDir);
				});
				
				branches.sort(function(a, b) {
					if (a.Current) return -1;
					if (b.Current) return 1;
					return a.LocalTimeStamp < b.LocalTimeStamp ? 1 : a.LocalTimeStamp > b.LocalTimeStamp ? -1 : b.Name.localeCompare(a.Name);
				});
		
				return getBranchCommit(theRepo, branches)
				.then(function(){
					return getBranchRemotes(theRepo, branches, fileDir);
				})
				.then(function(){
					writeResponse(200, res, null, {
							"Children": branches,
							"Type": "Branch"
					}, true);
				});
			});
		})
		.catch(function(err) {
			writeError(500, res, err.message);
		})
		.finally(function() {
			clone.freeRepo(theRepo);
		});
	}
	
	function createBranch(req, res) {
		var branchName = req.body.Name;
		var startPoint = req.body.Branch;
		var theRepo, theRef, fileDir;
	
		if (!branchName) {
			if (!startPoint) {
				return writeError(400, res, "Branch name must be provided.");
			}
		}
		clone.getRepo(req)
		.then(function(repo) {
			theRepo = repo;
			fileDir = clone.getfileDir(repo,req);
			return startPoint ? git.Reference.lookup(repo, "refs/remotes/" + startPoint) : repo.getCurrentBranch();
		})
		.then(function(reference) {
			theRef = reference;
			return theRepo.getReferenceCommit(reference);
		})
		.then(function(commit) {
			if (!branchName) {
				branchName = theRef.shorthand().split("/").slice(1).join("/");
			}
			return git.Branch.create(theRepo, branchName, commit, 0);
		})
		.then(function(ref) {
			var branch = branchJSON(theRepo, ref, fileDir);
			return getBranchRemotes(theRepo, [branch], fileDir)
			.then(function(){
				writeResponse(201, res, null, branch, true);
			});
		})
		.catch(function(err) {
			writeError(500, res, err.message);
		})
		.finally(function() {
			clone.freeRepo(theRepo);
		});
	}
	
	function deleteBranch(req, res) {
		var theRepo;
		var branchName = api.decodeURIComponent(req.params.branchName);
		clone.getRepo(req)
		.then(function(repo) {
			theRepo = repo;
			return git.Branch.lookup(repo, branchName, git.Branch.BRANCH.LOCAL);
		})
		.then(function(ref) {
			if (git.Branch.delete(ref) === 0) {
				writeResponse(200, res);
			} else {
				writeError(403, res);
			}
		})
		.catch(function(err) {
			writeError(403, res, err.message);
		})
		.finally(function() {
			clone.freeRepo(theRepo);
		});
	}
};
