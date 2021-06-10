/*******************************************************************************
 * Copyright (c) 2012, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var api = require('../api'), writeError = api.writeError, writeResponse = api.writeResponse,
	args = require('../args'),
	async = require('async'),
	git = require('nodegit'),
	tasks = require('../tasks'),
	clone = require('./clone'),
	express = require('express'),
	gitUtil = require('./util'),
	responseTime = require('response-time');

module.exports = {};

module.exports.router = function(options) {
	var fileRoot = options.fileRoot;
	var gitRoot = options.gitRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }
	if (!gitRoot) { throw new Error('options.gitRoot is required'); }

	var contextPath = options && options.configParams.get("orion.context.path") || "";
	fileRoot = fileRoot.substring(contextPath.length);

	module.exports.remoteBranchJSON = remoteBranchJSON;
	module.exports.remoteJSON = remoteJSON;
	
	function checkUserAccess(req, res, next){
		var uri = req.originalUrl.substring(req.baseUrl.length);
		var uriSegs = uri.split("/");
		if ("/" + uriSegs[2] === fileRoot){
			uriSegs.splice(1, 1);
			uri = uriSegs.join("/");
		}else if ("/" + uriSegs[3] === fileRoot){
			uriSegs.splice(1, 2);
			uri = uriSegs.join("/");
		}
		req.user.checkRights(req.user.username, uri, req, res, next);
	}

	return express.Router()
	.use(responseTime({digits: 2, header: "X-GitapiRemotes-Response-Time", suffix: true}))
	.use(checkUserAccess) // Use specified checkUserAceess implementation instead of the common one from options
	.get(fileRoot + '*', getRemotes)
	.get('/:remoteName'+ fileRoot + '*', getRemotes)
	.get('/:remoteName/:branchName'+ fileRoot + '*', getRemotes)
	.delete('/:remoteName'+ fileRoot + '*', deleteRemote)
	.post(fileRoot + '*', addRemote)
	.post('/:remoteName'+ fileRoot + '*', postRemote)
	.post('/:remoteName/:branchName'+ fileRoot + '*', postRemote);
	
function remoteBranchJSON(remoteBranch, commit, remote, fileDir, branch){
	var fullName, shortName, remoteURL;
	if (remoteBranch) {
		fullName = remoteBranch.name();
		shortName = remoteBranch.shorthand();
		var branchName = shortName.replace(remote.name() + "/", "");
		remoteURL = api.join(api.encodeURIComponent(remote.name()), api.encodeURIComponent(branchName));
	} else {// remote branch does not exists
		shortName = api.join(remote.name(), branch.Name);
		fullName = "refs/remotes/" + shortName;
		remoteURL = api.join(api.encodeURIComponent(remote.name()), api.encodeURIComponent(branch.Name));
	}
	return {
		"CloneLocation": gitRoot + "/clone" + fileDir,
		"CommitLocation": gitRoot + "/commit/" + api.encodeURIComponent(fullName) + fileDir,
		"DiffLocation": gitRoot + "/diff/" + api.encodeURIComponent(shortName) + fileDir,
		"FullName": fullName,
		"GitUrl": remote.url(),
		"HeadLocation": gitRoot + "/commit/HEAD" + fileDir,
		"Id": remoteBranch && commit ? commit.sha() : undefined,
		"IndexLocation": gitRoot + "/index" + fileDir,
		"Location": gitRoot + "/remote/" + remoteURL + fileDir,
		"Name": shortName,
		"TreeLocation": gitRoot + "/tree" + fileDir + "/" + api.encodeURIComponent(shortName),
		"Type": "RemoteTrackingBranch"
	};
}

function remoteJSON(remote, fileDir, branches) {
	var name = remote.name();
	return {
		"CloneLocation": gitRoot + "/clone" + fileDir,
		"IsGerrit": false, // should check 
		"GitUrl": remote.url(),
		"Name": name,
		"Location": gitRoot + "/remote/" + api.encodeURIComponent(name) + fileDir,
		"Type": "Remote",
		"Children": branches
	};
}

function getRemotes(req, res) {
	var remoteName = api.decodeURIComponent(req.params.remoteName || "");
	var branchName = api.decodeURIComponent(req.params.branchName || "");
	var filter = req.query.filter;

	var fileDir, theRepo, theRemote;
	if (!remoteName && !branchName) {
		var repo;

		return clone.getRepo(req)
		.then(function(r) {
			repo = r;
			fileDir = clone.getfileDir(repo,req); 
			return git.Remote.list(r);
		})
		.then(function(remotes){
			var r = [];
			async.each(remotes, function(remote, cb) {
				git.Remote.lookup(repo, remote)
				.then(function(remote){
					r.push(remoteJSON(remote, fileDir));
					cb();
				});
			}, function() {
				clone.freeRepo(repo);
				writeResponse(200, res, null, {
					"Children": r,
					"Type": "Remote"
				}, true);
			});
		});
	}

	if (remoteName && !branchName) {
		return clone.getRepo(req)
		.then(function(repo) {
			theRepo = repo;
			fileDir = clone.getfileDir(repo,req); 
			return repo.getRemote(remoteName);
		})
		.then(function(remote) {
			theRemote = remote;
			return git.Reference.list(theRepo);
		})
		.then(function(referenceList) {
			referenceList = referenceList.filter(function(ref) {
				if (ref.indexOf("refs/remotes/") === 0) {
					var shortname = ref.replace("refs/remotes/", "");
					if (shortname.indexOf(remoteName) === 0 && (!filter || shortname.indexOf(filter) !== -1)) {
						return true;
					}
				}
			});
			return Promise.all(referenceList.map(function(ref) {
				return git.Reference.lookup(theRepo, ref);
			}))
			.then(function(referenceList) {
				var branches = [];
				async.each(referenceList, function(ref, callback) {
					theRepo.getBranchCommit(ref)
					.then(function(commit) {
						branches.push(remoteBranchJSON(ref, commit, theRemote, fileDir));
						callback();
					}).catch(function(err) {
						callback(err);
					});
				}, function(err) {
					clone.freeRepo(repo);
					if (err) {
						return writeError(403, res);
					}
					writeResponse(200, res, null, remoteJSON(theRemote, fileDir, branches), true);
				});
			});
		});
	} 

	if (remoteName && branchName) {
		var theBranch;
		return clone.getRepo(req)
		.then(function(repo) {
			theRepo = repo;
			fileDir = clone.getfileDir(repo,req); 
			return repo.getRemote(remoteName);
		})
		.then(function(remote) {
			theRemote = remote;
			return theRepo.getReference("refs/remotes/" + remoteName + "/" + branchName);
		})
		.then(function(branch) {
			theBranch = branch;
			return theRepo.getBranchCommit(branch);
		})
		.then(function(commit) {
			writeResponse(200, res, null, remoteBranchJSON(theBranch, commit, theRemote, fileDir), true);
		})
		.catch(function() {
			return writeError(403, res);
		})
		.finally(function() {
			clone.freeRepo(theRepo);
		});
	}
	return writeError(404, res);
}

function addRemote(req, res) {
	var fileDir, repo;
	
	if (!req.body.Remote || !req.body.RemoteURI) {
		return writeError(500, res);
	}

	return clone.getRepo(req)
	.then(function(_repo) {
		repo = _repo;
		fileDir = clone.getfileDir(repo,req); 
		return git.Remote.create(repo, req.body.Remote, req.body.RemoteURI);
	})
	.then(function(remote) {
		var remoteName = remote ? remote.name() : req.body.Remote;
		var configFile = api.join(repo.path(), "config");
		function done () {
			writeResponse(201, res, null, {
				"Location": gitRoot + "/remote/" + api.encodeURIComponent(remoteName) + fileDir
			}, true);
		}
		args.readConfigFile(configFile, function(err, config) {
			if (err) {
				return done();
			}
			var remoteConfig = config.remote[remoteName] || (config.remote[remoteName] = {});
			if (!remoteConfig.url) {
				remoteConfig.url = req.body.RemoteURI;
			}
			if (!remoteConfig.fetch) remoteConfig.fetch = [];
			if (!Array.isArray(remoteConfig.fetch)) remoteConfig.fetch = [remoteConfig.fetch];
			if (req.body.IsGerrit) {
				remoteConfig.fetch.push("+refs/heads/*:refs/remotes/%s/for/*".replace(/%s/g, remoteName));
				remoteConfig.fetch.push("+refs/changes/*:refs/remotes/%s/*".replace(/%s/g, remoteName));
			} else {
				if (req.body.FetchRefSpec) {
					remoteConfig.fetch.push(req.body.FetchRefSpec);
				}
			}
			if (req.body.PushURI) {
				remoteConfig.pushurl = req.body.PushURI;
			}
			if (!remoteConfig.push) remoteConfig.push = [];
			if (!Array.isArray(remoteConfig.push)) remoteConfig.push = [remoteConfig.push];
			if (req.body.PushRefSpec) {
				remoteConfig.push.push(req.body.PushRefSpec);
			}
			gitUtil.verifyConfigRemoteUrl(config);
			args.writeConfigFile(configFile, config, function(err) {
				if (err) {
					// ignore errors
				}
				done();
			});
		});
	})
	.catch(function(err) {
		writeError(403, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(repo);
	});
}

function postRemote(req, res) {
	if (req.body.Fetch === "true") {
		fetchRemote(req, res, api.decodeURIComponent(req.params.remoteName), api.decodeURIComponent(req.params.branchName || ""), req.body.Force);
	} else if (typeof req.body.PushSrcRef === "string") {
		pushRemote(req, res, api.decodeURIComponent(req.params.remoteName), api.decodeURIComponent(req.params.branchName || ""), req.body.PushSrcRef, req.body.PushTags, req.body.Force);
	} else {
		writeError(400, res);
	}
}

function fetchRemote(req, res, remote, branch, force) {
	var remoteObj;
	var task = new tasks.Task(res, false, true, 0, true);
	var repo;
	return clone.getRepo(req)
	.then(function(r) {
		repo = r;
		return git.Remote.lookup(repo, remote);
	})
	.then(function(r) {
		remoteObj = r;
		var refSpec = null;
		if (branch) {
			var remoteBranch = branch;
			if (branch.indexOf("for/") === 0) {
				remoteBranch = branch.substr(4);
			}
			refSpec = "refs/heads/" + remoteBranch + ":refs/remotes/" + remoteObj.name() + "/" + branch;
			if (force) refSpec = "+" + refSpec;
		}
		
		return remoteObj.fetch(
			refSpec ? [refSpec] : null,
			{
				callbacks: clone.getRemoteCallbacks(req.body, req.user.username, task),
				downloadTags: 3     // 3 = C.GIT_REMOTE_DOWNLOAD_TAGS_ALL (libgit2 const) 
			},
			"fetch"
		);
	})
	.then(function(err) {
		if (!err) {
			task.done({
				HttpCode: 200,
				Code: 0,
				DetailedMessage: "OK",
				Message: "OK",
				Severity: "Ok"
			});
		} else {
			throw err;
		}
	})
	.catch(function(err) {
		if (err.message && ["unexpected", "404"].some(function(s) { return err.message.indexOf(s) !== -1; })) {
			err.message = "Error fetching git remote";
			err.code = 404;
		}
		clone.handleRemoteError(task, err, remoteObj ? remoteObj.url() : undefined);
	})
	.finally(function() {
		clone.freeRepo(repo);
	});
}

function pushRemote(req, res, remote, branch, pushSrcRef, tags, force) {
	var repo;
	var remoteObj;
	var credsCopy = Object.assign({}, req.body);
	var task = new tasks.Task(res, false, true, 0 ,true);
	var updates = {};
	return clone.getRepo(req)
	.then(function(r) {
		repo = r;
		var work = [git.Remote.lookup(repo, remote)];
		if (tags) work.push(git.Reference.list(repo));
		return Promise.all(work);
	})
	.then(function(r) {
		remoteObj = r[0];
		var pushToGerrit = branch.indexOf("for/") === 0;
		var refSpec = pushSrcRef + ":" + (pushToGerrit ? "refs/" : "refs/heads/") + branch;
		if (force) refSpec = "+" + refSpec;
		var refSpecs = [];
		refSpecs.push(refSpec);
		if(tags){
			return repo.getRemote(remote)
			.then(function(remote){
				return Promise.all([remote,remote.connect(git.Enums.DIRECTION.FETCH, clone.getRemoteCallbacks(req.body, req.user.username, task))]);			
			})
			.then(function(results){
				var remote = results[0];
				return Promise.all([remote, remote.referenceList()]);
			}).then(function(results){
				var headNames = results[1].map(function(remoteHead){
					return remoteHead.name();
				});
				return headNames;
			})
			.then(function(headNames){
				r[1].forEach(function(ref){
					if(ref.indexOf("refs/tags/") === 0 && headNames.indexOf(ref) === -1){
						refSpecs.push(ref + ":" + ref);
					}
				});
				return refSpecs;
			});
		}
		return refSpecs;
	})
	.then(function(refSpecs){
		return remoteObj.push(
			refSpecs, {callbacks: clone.getRemoteCallbacks(credsCopy, req.user.username, task, updates)}
		);
	})
	.then(function(err) {
		if (!err) {
			var error = false;
			var message = "";
			var updateRefs = []
			Object.keys(updates).forEach(function(k) {
				if ("refs/heads/" + branch == k /*|| k.startsWith("refs/tags/") || k.startsWith("refs/for/")*/) {
					if (typeof updates[k] === "string" && updates[k]) {
						error = true;
						message = updates[k];
					}
					updateRefs.push({
						LocalName: req.body.PushSrcRef,
						RemoteName: remote + "/" + branch,
						Message: updates[k]
					})
				}
			});
			task.done({
				HttpCode: 200,
				Code: 0,
				DetailedMessage: message || "OK",
				Message: message || "OK",
				JsonData: {
					Message: message || "OK",
					Severity: error ? "Error" : "Ok",
					Updates: updateRefs
				},
				Severity: error ? "Error" : "Ok"
			});
		} else {
			throw new Error("Push failed.");
		}
	})
	.catch(function(err) {
		clone.handleRemoteError(task, err, remoteObj ? remoteObj.url() : undefined);
	})
	.finally(function() {
		clone.freeRepo(repo);
	});
}

function deleteRemote(req, res) {
	var theRepo;
	var remoteName = api.decodeURIComponent(req.params.remoteName);
	clone.getRepo(req)
	.then(function(repo) {
		theRepo = repo;
		var configFile = api.join(repo.path(), "config");
		args.readConfigFile(configFile, function(err, config) {
			if (err) {
				return writeError(403, res, err.message);
			}
			if (config.remote && config.remote[remoteName]) {
				delete config.remote[remoteName];
				args.writeConfigFile(configFile, config, function(err) {
					if (err) {
						return writeError(403, res, err.message);
					}
					writeResponse(200, res);
				});
			}
		});
	})
	.catch(function(err) {
		return writeError(400, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(theRepo);
	});
}
};
