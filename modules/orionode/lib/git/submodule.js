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
var git = require('nodegit'),
	api = require('../api'), writeError = api.writeError, writeResponse = api.writeResponse,
	args = require('../args'),
	express = require('express'),
	clone = require('./clone'),
	tasks = require('../tasks'),
	fileUtil = require('../fileUtil'),
	responseTime = require('response-time');

module.exports = {};

module.exports.router = function(options) {
	var fileRoot = options.fileRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }

	var contextPath = options && options.configParams.get("orion.context.path") || "";
	fileRoot = fileRoot.substring(contextPath.length);

	return express.Router()
	.use(responseTime({digits: 2, header: "X-GitapiSubmodule-Response-Time", suffix: true}))
	.use(options.checkUserAccess)
	.put(fileRoot + '*', putSubmodule)
	.post(fileRoot + '*', postSubmodule)
	.delete(fileRoot + '*', deleteSubmodule);

function putSubmodule(req, res) {
	var theRepo;
	return clone.getRepo(req)
	.then(function(repo) {
		theRepo = repo;
		return clone.foreachSubmodule(repo, req.body.Operation, false); // this foreachSubmodule doesn't need authentication, fix me if it's not right.
	})
	.then(function() {
		writeResponse(200, res);
	})
	.catch(function(err) {
		return writeError(400, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(theRepo);
	});
}
function postSubmodule(req, res) {
	var task = new tasks.Task(res, false, true, 0, true);
	var url = req.body.GitUrl;
	if (!url) {
		return writeError(400, res, "Invalid parameters");
	}
	var repo, submodule, subrepo, rest;
	return clone.getRepo(req)
	.then(function(_repo) {
		repo = _repo;
		var path = req.body.Name;
		if (!path) {
			if (req.body.Path) {
				var contextPathSegCount = req.contextPath.split("/").length - 1;
				rest = req.body.Path.split("/").slice(2 + contextPathSegCount).join("/");
				path = fileUtil.getFile(req, rest).path;
			} else if (req.body.Location) {
				path = clone.getUniqueFileName(req.file.path, url.substring(url.lastIndexOf("/") + 1).replace(".git", ""));
			}
			path = path.substring(repo.workdir().length);
		}
		return git.Submodule.addSetup(repo, url, path, 1)
		.then(function() {
			return git.Submodule.lookup(repo, path);
		})
		.then(function(_submodule) {
			submodule = _submodule;
			return submodule.open();
		})
		.then(function(_subrepo) {
			subrepo = _subrepo;
			return subrepo.fetchAll({callbacks: clone.getRemoteCallbacks(req.body, req.user.username, task)});
		})
		.then(function() {
			return subrepo.getReferenceCommit("origin/master");
		})
		.then(function(commit) {
			var branch = "master";
			return git.Branch.create(subrepo, branch, commit, 0).then(function() {
				return subrepo.checkoutBranch(branch, {});
			});
		})
		.then(function() {
			return submodule.addFinalize();
		})
		.then(function() {
			task.done({
				HttpCode: 200,
				Code: 0,
				DetailedMessage: "OK",
				Message: "OK",
				Severity: "Ok"
			});
		});
	}).catch(function(err) {
		return deleteSubmoduleFromRepo(subrepo, repo)
		.then(function(){
			clone.handleRemoteError(task, err, url);
		}).catch(function(){
			clone.handleRemoteError(task, err, url);
		});
	})
	.finally(function() {
		clone.freeRepo(repo);
	});
}

/**
 * @name deleteSubmoduleFromRepo
 * @description Helper method used to delete a subrepo from a repo
 * @param {Repository} subrepo object
 * @param {Repository} parent repo object
 * @returns returns Promise
 * @since 17.0
 */
function deleteSubmoduleFromRepo(subrepo, repo) {
	if (!subrepo) return;
	var submodulePath = subrepo.workdir().substring(repo.workdir().length).slice(0, -1);
	var configFile = api.join(repo.path(), "config");
	return new Promise(function(fulfill, reject) {
		args.readConfigFile(configFile, function(err, config) {
			if (err) return reject(err);
			delete config["submodule"][submodulePath];
			args.writeConfigFile(configFile, config, function(err) {
				if (err) return reject(err);
				configFile = api.join(repo.workdir(), ".gitmodules");
				args.readConfigFile(configFile, function(err, config) {
					if (err) return reject(err);
					delete config["submodule"][submodulePath];
					args.writeConfigFile(configFile, config, function(err) {
						if (err) return reject(err);
						fileUtil.rumRuff(subrepo.path(), function(err) {
							if (err) return reject(err);
							fileUtil.rumRuff(subrepo.workdir(), function(err) {
								if (err) return reject(err);
								var index;
								return repo.refreshIndex()
								.then(function(indexResult) {
									index = indexResult;
									var work = [];
									if (Object.keys(config).length) {
										work.push(index.addByPath(".gitmodules"));
									} else {
										work.push(index.removeByPath(".gitmodules"));
									}
									work.push(index.removeByPath(submodulePath));
									return Promise.all(work);
								})
								.then(function() {
									return index.write();
								})
								.then(function() {
									return index.writeTree();
								})
								.then(function() {
									fulfill();
								}).catch(function(err) {
									reject(err);
								});
							});
						});
						
					});
				});
			});
		});
	});
}
function deleteSubmodule(req, res) {
	var subrepo, theRepo;
	return clone.getRepo(req)
	.then(function(_subrepo) {
		subrepo = _subrepo;
		var file = fileUtil.getFile(req, req.params["0"].split("/").slice(0, -1).join("/"));
		return git.Repository.discover(file.path, 0, file.workspaceDir).then(function(buf) {
			return git.Repository.open(buf.toString());
		});
	})
	.then(function(repo) {
		theRepo = repo;
		return deleteSubmoduleFromRepo(subrepo, repo);
	})
	.then(function() {
		writeResponse(200, res);
	})
	.catch(function(err) {
		return writeError(400, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(subrepo);
		clone.freeRepo(theRepo);
	});
}
};
