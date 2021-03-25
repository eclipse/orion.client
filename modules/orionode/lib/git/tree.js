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
	express = require('express'),
	fileUtil = require('../fileUtil'),
	mime = require('mime'),
	metaUtil = require('../metastore/util/metaUtil'),
	responseTime = require('response-time');

module.exports = {};

module.exports.router = function(options) {
	var fileRoot = options.fileRoot;
	var gitRoot = options.gitRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }
	if (!gitRoot) { throw new Error('options.gitRoot is required'); }
	
	var contextPath = options && options.configParams.get("orion.context.path") || "";
	fileRoot = fileRoot.substring(contextPath.length);
	
	return express.Router()
	.use(responseTime({digits: 2, header: "X-GitapiTree-Response-Time", suffix: true}))
	.get('/', getTree)
	.get(fileRoot + '*', getTree);
	
function treeJSON(location, name, timestamp, dir, length) {
	location = api.toURLPath(location);
	return {
		Name: name,
		LocalTimeStamp: timestamp,
		Directory: dir,
		Length: length,
		Location: gitRoot + "/tree" + location,
		ChildrenLocation: dir ? {pathname: gitRoot + "/tree" + location, query: {depth: 1}}: undefined,
		Attributes: {
			ReadOnly: true
		}
	};
}

function getTree(req, res) {
	var readIfExists = req.headers ? Boolean(req.headers['read-if-exists']).valueOf() : false;
	var repo;
	var store = fileUtil.getMetastore(req);
	if (!req.params[0]) {
		var workspaceRoot = gitRoot + "/tree" + fileRoot;
		
		var workspaceJson = {
			Id: req.user.username,
			Name: req.user.username,
			UserName: req.user.fullname || req.user.username
		};
		return metaUtil.getWorkspaceMeta(req.user.workspaces, store, workspaceRoot)
		.then(function(workspaceInfos){
			workspaceJson.Workspaces = workspaceInfos || [];
			return api.writeResponse(null, res, null, workspaceJson, true);
		});
	}
	
	var segmentCount = req.params["0"].split("/").length;
	if (segmentCount < 2) {
		writeError(409, res);
		return;
	}
	
	if (segmentCount === 2) {
		var file = fileUtil.getFile(req, req.params["0"]);
		store.getWorkspace(file.workspaceId, function(err, workspace) {
			if (err) {
				return writeError(400, res, err);
			}
			if (!workspace) {
				return writeError(404, res, "Workspace not found");
			}
			clone.getClones(req, res, function(repos) {
				var tree = treeJSON(api.join(fileRoot, workspace.id), workspace.name, 0, true, 0);
				tree.Id = workspace.id;
				var children = tree.Children = [];
				function add(repos) {
					repos.forEach(function(repo) {
						children.push(treeJSON(repo.ContentLocation.substring(contextPath.length), repo.Name, 0, true, 0));
						if (repo.Children) add(repo.Children);
					});
				}
				add(repos);
				writeResponse(200, res, null, tree, true);
			});
		});
		return;
	}
	
	var filePath;

	return clone.getRepo(req)
	.then(function(repoResult) {
		repo = repoResult;
		filePath = clone.getfileRelativePath(repo,req);
		return repo;
	})
	.then(function(repo) {
		function shortName(refName) {
			return refName.replace("refs/remotes/", "").replace("refs/heads/", "").replace("refs/tags/", "");
		}
		if (!filePath) {
			var location = fileRoot + (req.params["0"] || "");
			return git.Reference.list(repo)
			.then(function(refs) {
				return refs.map(function(ref) {
					return treeJSON(path.join(location, api.encodeURIComponent(ref)), shortName(ref), 0, true, 0);
				});
			})
			.then(function(children) {
				var tree = treeJSON(location, path.basename(req.params["0"] || ""), 0, true, 0);
				tree.Children = children;
				writeResponse(200, res, null, tree, true);
			});
		}
		var segments = filePath.split("/");
		var ref = api.decodeURIComponent(segments[0]);
		var p = segments.slice(1).join("/");
		return clone.getCommit(repo, ref)
		.then(function(commit) {
			return commit.getTree();
		}).then(function(tree) {
			var repoRoot =  clone.getfileDirPath(repo,req); 
			var refLocation = path.join(repoRoot, api.encodeURIComponent(ref));
			function createParents(data) {
				var parents = [], temp = data, l, end = gitRoot + "/tree" + repoRoot;
				while (temp.Location.length > end.length) {
					var treePath = gitRoot + "/tree";
					var searchTerm = "^" + treePath.replace(/\//g, "\/");
					var regex = new RegExp(searchTerm);
					l = path.dirname(temp.Location).replace(regex, "") + "/";
					var dir = treeJSON(l, shortName(api.decodeURIComponent(path.basename(l))), 0, true, 0);
					parents.push(dir);
					temp = dir;
				}
				data.Parents = parents;
			}
			function sendDir(tree) {
				var l = path.join(refLocation, p);
				var result = treeJSON(l, shortName(api.decodeURIComponent(path.basename(l))), 0, true, 0);
				result.Children = tree.entries().map(function(entry) {
					return treeJSON(path.join(refLocation, entry.path()), entry.name(), 0, entry.isDirectory(), 0);
				});
				createParents(result);
				return writeResponse(200, res, null, result, true);
			}
			if (p) {
				return tree.getEntry(p)
				.then(function(entry) {
					if (entry.isFile()) {
						if (req.query.parts === "meta") {
							var result = treeJSON(path.join(refLocation, entry.path()), entry.name(), 0, entry.isDirectory(), 0);
							result.ETag = entry.sha();
							createParents(result);
							return writeResponse(200, res, null, result, true);
						}
						return entry.getBlob()
						.then(function(blob) {
							if(blob.isBinary()){
								var buffer = blob.content();
								var contentType = mime.lookup(entry.path());
								res.setHeader('Content-Type', contentType);
								res.setHeader('Content-Length', buffer.length);
								api.addStrictTransportHeaders(res);
								api.setResponseNoCache(res);
                				res.status(200).end(buffer, 'binary');
							}else{
								var resp = blob.toString();
								writeResponse(200, res, {
									'Content-Type':'application/octect-stream',
									'Content-Length': resp.length,
									'ETag': '\"' + entry.sha() + '\"'}, resp, false, true);
							}
						});
					}
					return entry.getTree()
					.then(function(tree) {
						sendDir(tree);
					});
				});
			}
			sendDir(tree);
		});
	})
	.catch(function(err) {
		if (typeof readIfExists === 'boolean' && readIfExists) {
			api.sendStatus(204, res);
		}else{
			writeError(404, res, err.message);
		}
	})
	.finally(function() {
		clone.freeRepo(repo);
	});
}

};
