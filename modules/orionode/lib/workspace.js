/*******************************************************************************
 * Copyright (c) 2012, 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
var express = require('express'),
	log4js = require('log4js'),
	logger = log4js.getLogger('workspace'),
	api = require('./api'),
	fileUtil = require('./fileUtil'),
	metaUtil = require('./metastore/util/metaUtil'),
	responseTime = require('response-time');

var writeError = api.writeError, 
	writeResponse = api.writeResponse;

module.exports.router = function router(options) {
	var fileRoot = options.fileRoot;
	var workspaceRoot = options.workspaceRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }
	if (!workspaceRoot) { throw new Error('options.workspaceRoot is required'); }
	
	var singleUser = options.configParams.get("orion.single.user");
	
	var router = express.Router({mergeParams: true});
	router.use(responseTime({digits: 2, header: "X-Workspace-Response-Time", suffix: true}))
	router.get('*', getWorkspace);
	router.post('*', postWorkspace);
	router.put('*', putWorkspace);
	router.delete('*', deleteWorkspace);
	return router;

	function getWorkspaceJson(req, workspace) {
		var workspaceJson;
		var workspaceLocation = api.join(workspaceRoot, workspace.id);
		var parentFileLocation = api.join(fileRoot, workspace.id);
		var store = fileUtil.getMetastore(req);
		var workspaceDir = store.getWorkspaceDir(workspace.id);
		return fileUtil.getChildren(store, parentFileLocation, workspaceLocation, workspaceDir, workspaceDir, 1)
		.then(function(children) {
			children.forEach(function(child) {
				child.Id = child.Name;
			});
			var projects = [];
			children.forEach(function(c) {
				if (!c.Directory) return;
				projects.push({
					Id: c.Name,
					Location:  c.Location,
				});
			});
			workspaceJson = {
				Directory: true,
				Id: workspace.id,
				Name: workspace.name,
				Location: workspaceLocation,
				ChildrenLocation: workspaceLocation,
				ContentLocation: parentFileLocation + "/" ,
				Children: children,
				Projects: projects
			};
			return Promise.all(fileUtil.getDecorators().map(function(decorator) {
				return decorator.decorate(req, {workspaceDir: workspaceDir, workspaceId: workspace.id, path: ""}, workspaceJson);
			}));
		}).then(function() {
			return workspaceJson;
		});
	}

	function getWorkspace(req, res) {
		var rest = req.params["0"].substring(1);
		var store = fileUtil.getMetastore(req);
		if (rest === '') {
			var userId = req.user.username;
			api.logAccess(logger, userId);
			var workspaceJson = {
				Id: userId,
				Name: userId,
				UserName: req.user.fullname || userId
			};
			return metaUtil.getWorkspaceMeta(req.user.workspaces, store, workspaceRoot)
				.then(function(workspaceInfos) {
					workspaceJson.Workspaces = Array.isArray(workspaceInfos) ? workspaceInfos : [];
					return api.writeResponse(null, res, null, workspaceJson, true);
				}, function reject(err) {
					return api.writeError(err.code || 500, res, err.message);
				});
		}
		var workspaceId = rest;
		store.getWorkspace(workspaceId, function(err, workspace) {
			if (err) {
				return writeError(err.code || 400, res, err);
			}
			if (!workspace) {
				return writeError(404, res, "Workspace not found: " + rest);
			}
			getWorkspaceJson(req, workspace).then(function(workspaceJson){
				api.writeResponse(null, res, null, workspaceJson, true);
			});
		});
		
	}

	function postWorkspace(req, res) {
		var rest = req.params["0"].substring(1);
		var store = fileUtil.getMetastore(req), workspaceId;
		if (rest === '') {
			var userId = req.user.username;
			api.logAccess(logger, userId);
			var workspaceName = req.body && req.body.Name || fileUtil.decodeSlug(req.headers.slug);
			if(typeof workspaceName !== 'string') {
				return writeError(400, res, "No Name or Slug provided");
			}
			workspaceId = req.body && req.body.Id;
			store.createWorkspace(userId, {name: workspaceName, id: workspaceId}, function(err, workspace) {
				if (err) {
					return writeError(singleUser ? 403 : 400, res, err);
				}
				getWorkspaceJson(req, workspace).then(function(workspaceJson) {
					return api.writeResponse(201, res, null, workspaceJson, true);
				}).catch(function(err) {
					api.writeResponse(400, res, null, err);
				});
			});
		} else {
			var projectName = fileUtil.decodeSlug(req.headers.slug) || req.body && req.body.Name;
			if (!projectName) {
				var err = {Message: 'Missing "Slug" header or "Name" parameter'};
				api.writeResponse(400, res, null, err);
				return;
			} else if (!api.isValidProjectName(projectName)) {
				return api.writeError(400, res, null, {Message: "'"+projectName+"' is not a valid name for a project"});
			}
			workspaceId = rest;
			store.getWorkspace(workspaceId, function(err, workspace) {
				if (err) {
					return writeError(400, res, err);
				}
				if (!workspace) {
					return writeError(404, res, "Workspace not found: " + rest);
				}
				// Create/Move/Rename a project
				var projectLocation = api.join(fileRoot, workspace.id, projectName);
				var file = fileUtil.getFile(req, api.join(workspace.id, projectName));
				return fileUtil.handleFilePOST(workspaceRoot, fileRoot, req, res, file, {
					Id: projectName,
					ContentLocation: projectLocation,
					Location: projectLocation
				});
			});
		}
	}

	function putWorkspace(req, res) {
		if (req.body.Location && singleUser) {
			var originalLocation = options.workspaceDir;
			options.workspaceDir = req.body.Location;
			api.getOrionEE().emit("workspace-changed",[req.body.Location,originalLocation]);
			return writeResponse(200, res);
		}
		return writeError(403, res);
	}

	function deleteWorkspace(req, res) {
		var rest = req.params["0"].substring(1);
		var file = fileUtil.getFile(req, rest);
		var store = fileUtil.getMetastore(req);
		store.deleteWorkspace(file.workspaceId, function(err) {
			if (err) {
				return writeError(singleUser ? 403 : 400, res, err);
			}
			fileUtil.rumRuff(file.workspaceDir, function(err) {
				if (err) {
					return writeError(400, res, err);
				}
				return writeResponse(204, res);
			});
		});
	}
};
