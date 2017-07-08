/*******************************************************************************
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *		 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var api = require('../api'), writeError = api.writeError;
var path = require('path');
var express = require('express');
var sharedUtil = require('./sharedUtil');
var fileUtil = require('../fileUtil');
var fs = require('fs');
var sharedProjects = require('./db/sharedProjects');
var xfer = require('../xfer');
var bodyParser = require('body-parser');

module.exports = {};

module.exports.router = function(options) {
	var workspaceDir = options.options.workspaceDir;
	if (!workspaceDir) { throw new Error('options.options.workspaceDir required'); }
	var sharedWorkspaceFileRoot = options.sharedWorkspaceFileRoot;

	return express.Router()
	.use(bodyParser.json())
	.get('/file/:workspaceId*', getTree)
	.put('/file*', ensureAccess, putFile)
	.post('/file*', ensureAccess, postFile)
	.delete('/file*', ensureAccess, deleteFile)
	.get('/load/:hubId/:workspaceId*', loadFile)
	.put('/save/:hubId/*', saveFile)
	.get('/session/:hubId', checkSession)
	.get('/xfer/export*', getXfer)
	.post('/xfer/import*', postImportXfer)
	.get('/*', getSharedWorkspace);
	
	/**
	 * Get shared projects for the user.
	 */
	function getSharedWorkspace(req, res) {
		return sharedUtil.getSharedProjects(req, res, function(projects) {
				var workspaces = [];
				projects.forEach(function(project){
					var projectSegs = project.Location.split("/");
					var projectBelongingWorkspaceId = sharedUtil.getWorkspaceIdFromprojectLocation(project.Location);
					if(!workspaces.some(function(workspace){
						return workspace.Id === projectBelongingWorkspaceId;
					})){
						workspaces.push({
							Id: projectBelongingWorkspaceId,
							Location: api.join(sharedWorkspaceFileRoot, projectBelongingWorkspaceId),
							Name: projectSegs[3]
						});
					}
				});
				api.writeResponse(null, res, null, {
					Id: req.user.username,
					Name: req.user.username,
					UserName: req.user.fullname || req.user.username,
					Workspaces: workspaces
				}, true);
		});
	}

	function ensureAccess(req, res, next) {
		var project = sharedUtil.getRealLocation(req.params["0"]);
		var username = req.user.username;

		sharedProjects.getUsersInProject(project)
		.then(function(users) {
			if (!project || !users || !users.some(function(user) {return user === username;})) {
				res.writeHead(401, "Not authenticated");
				res.end();
			} else {
				next();
			}
		});
	}

	/**
	 * return files and folders below current folder or retrieve file contents.
	 */
	function getTree(req, res) {
		var projectName = req.params["0"];  // projectName = /test
		var workspaceId = req.params.workspaceId;  // workspaceId = sidney-OrionContent
		if(projectName){
			var tree, filePath;
			var fileRoot =path.join("/", workspaceId, req.params["0"]);  // fileRoot = /sidney-OrionContent/test
			var realfileRootPath = sharedUtil.getfileRoot(workspaceId); // = si/sidney/OrionContent
			filePath = path.join(workspaceDir,realfileRootPath, req.params["0"]);  // "/Users/xinyijiang/IBM/openSourceWorkspace/orion.client/modules/orionode/.workspace/si/sidney/OrionContent/test" 
			var readIfExists = req.headers ? Boolean(req.headers['read-if-exists']).valueOf() : false;
			fileUtil.withStatsAndETag(filePath, function(err, stats, etag) {
				if (err && err.code === 'ENOENT') {
					if(typeof readIfExists === 'boolean' && readIfExists) {
						res.sendStatus(204);
					} else {
						writeError(404, res, 'File not found: ' + filePath);
					}
				} else if (err) {
					writeError(500, res, err);
				} else if (stats.isDirectory()) {
					sharedUtil.getChildren(fileRoot, filePath, req.query.depth ? req.query.depth: 1)
					.then(function(children) {
						// TODO this is basically a File object with 1 more field. Should unify the JSON between workspace.js and file.js
						children.forEach(function(child) {
							child.Id = child.Name;
						});
						location = fileRoot;
						var name = path.win32.basename(filePath);
						tree = sharedUtil.treeJSON(name, location, 0, true, 0, false);
						tree["Children"] = children;
					})
					.then(function() {
						return sharedProjects.getHubID(filePath);
					})
					.then(function(hub){
						if (hub) {
							tree.Attributes = {};
							tree["Attributes"].hubID = hub;
						}
						return res.status(200).json(tree);
					})
					.catch(api.writeError.bind(null, 500, res));
				} else if (stats.isFile()) {
					if (req.query.parts === "meta") {
						var name = path.win32.basename(filePath);
						var result = sharedUtil.treeJSON(name, fileRoot, 0, false, 0, false);
						result.ETag = etag;
						sharedProjects.getHubID(filePath)
						.then(function(hub){
							if (hub) {
								result["Attributes"].hubID = hub;
							}
							return res.status(200).json(result);
						});
					} else {
						sharedUtil.getFile(res, filePath, stats, etag);
					}
				}
			});
		}else{
			return sharedUtil.getSharedProjects(req, res, function(projects) {
				var tree = sharedUtil.treeJSON(req.params.workspaceId, "/" + workspaceId, 0, true, 0, false);
				var children = tree.Children = [];
				function add(projects) {
					projects.forEach(function(project) {
						var projectSegs = project.Location.split("/");
						var projectBelongingWorkspaceId = sharedUtil.getWorkspaceIdFromprojectLocation(project.Location);
						if(projectBelongingWorkspaceId === workspaceId){
							children.push(sharedUtil.treeJSON(project.Name, path.join("/", projectBelongingWorkspaceId, projectSegs[4]), 0, true, 0, false));
							if (project.Children) add(project.Children);
						}
					});
				}
				add(projects, tree);
				tree["Projects"] = children.map(function(c) {
					return {
						Id: c.Name,
						Location:  c.Location,
					};
				});
				res.status(200).json(tree);
			});
		}

	}

	/**
	 * For file save.
	 */
	function putFile(req, res) {
		var rest = req.params["0"];
		var file = fileUtil.getFile(req, rest);
		var fileRoot = options.fileRoot;
		if (req.params['parts'] === 'meta') {
			// TODO implement put of file attributes
			res.sendStatus(501);
			return;
		}
		function write() {
			var ws = fs.createWriteStream(file.path);
			ws.on('finish', function() {
				fileUtil.withStatsAndETag(file.path, function(error, stats, etag) {
					if (error && error.code === 'ENOENT') {
						res.status(404).end();
						return;
					}
					writeFileMetadata(fileRoot, req, res, file.path, stats, etag);
				});
			});
			ws.on('error', function(err) {
				writeError(500, res, err);
			});
			req.pipe(ws);
		}
		var ifMatchHeader = req.headers['if-match'];
		fileUtil.withETag(file.path, function(error, etag) {
			if (error && error.code === 'ENOENT') {
				res.status(404).end();
			}
			else if (ifMatchHeader && ifMatchHeader !== etag) {
				res.status(412).end();
			}
			else {
				write();
			}
		});
	}

	/**
	 * For file create/move/copy.
	 */
	function postFile(req, res) {
		var rest = req.params["0"].substring(1);
		var diffPatch = req.headers['x-http-method-override'];
		if (diffPatch === "PATCH") {
			// This shouldn't happen in collaboration
			return;
		}
		var name = fileUtil.decodeSlug(req.headers.slug) || req.body && req.body.Name;
		if (!name) {
			writeError(400, res, new Error('Missing Slug header or Name property'));
			return;
		}
		
		req.user.workspaceDir = workspaceDir;
		var file = fileUtil.getFile(req, api.join(rest, name));
		fileUtil.handleFilePOST("/workspace", sharedWorkspaceFileRoot, req, res, file);
	}

	/**
	 * For file delete.
	 */
	function deleteFile(req, res) {
		var rest = req.params["0"];
		var file = fileUtil.getFile(req, rest);
		fileUtil.withStatsAndETag(file.path, function(error, stats, etag) {
			var callback = function(error) {
				if (error) {
					writeError(500, res, error);
					return;
				}
				res.sendStatus(204);
			};
			var ifMatchHeader = req.headers['if-match'];
			if (error && error.code === 'ENOENT') {
				return res.sendStatus(204);
			} else if (error) {
				writeError(500, res, error);
			} else if (ifMatchHeader && ifMatchHeader !== etag) {
				return res.sendStatus(412);
			} else if (stats.isDirectory()) {
				fileUtil.rumRuff(file.path, callback);
			} else {
				fs.unlink(file.path, callback);
			}
		});
	}

	function writeFileMetadata(fileRoot, req, res, filepath, stats, etag) {
		var result;
		return fileJSON(fileRoot, workspaceDir, filepath, stats)
		.then(function(originalJson){
			result = originalJson;
			if (etag) {
				result.ETag = etag;
				res.setHeader('ETag', etag);
			}
			res.setHeader("Cache-Control", "no-cache");
			api.writeResponse(null, res, null, result, true, true);
		})
		.catch(api.writeError.bind(null, 500, res));
	};

	function fileJSON(fileRoot, workspaceDir, filepath, stats) {
		var isDir = stats.isDirectory();
		if (!isDir) {
			var wwwpath = api.toURLPath(filepath.substring(workspaceDir.length + 1));
			var name = path.win32.basename(filepath);
			var timeStamp = stats.mtime.getTime(),
			result = sharedUtil.treeJSON(name, fileRoot, timeStamp, isDir, 0, false);
			result.ChildrenLocation = {pathname: result.Location, query: {depth:1}};
			result.ImportLocation = result.Location.replace(/\/sharedWorkspace\/tree\/file/, "/sharedWorkspace/tree/xfer/import").replace(/\/$/, "");
			result.ExportLocation = result.Location.replace(/\/sharedWorkspace\/tree\/file/, "/sharedWorkspace/tree/xfer/export").replace(/\/$/, "") + ".zip";
			return Promise.resolve(result);
		}
	}

	/**
	* Get request from websocket server to load a file. Requires project HUBID and relative file path.
	**/
	function loadFile(req, res) {
		if (req.user) {
			// User access is not allowed. This method is only for the collab server
			writeError(403, res, 'Forbidden');
			return;
		}
		var relativeFilePath = req.params['0'];
		var hubid = req.params['hubId'];

		return sharedProjects.getProjectPathFromHubID(hubid)
		.then(function(filepath) {
			if (!filepath) {
				writeError(404, res, 'Session not found: ' + hubid);
				return;
			}
			getTree(req, res);
		});
	}

	function saveFile(req, res) {
		if (req.user) {
			// User access is not allowed. This method is only for the collab server
			writeError(403, res, 'Forbidden');
			return;
		}
		// var relativeFilePath = req.params['0'];
		var hubid = req.params['hubId'];

		return sharedProjects.getProjectPathFromHubID(hubid)
		.then(function(filepath) {
			if (!filepath) {
				writeError(404, res, 'Session not found: ' + hubid);
				return;
			}
			//remove project name from path
			// filepath = filepath.substring(0, filepath.lastIndexOf(path.sep));
			// filepath = path.join(filepath, relativeFilePath);
			// req.params['0'] = filepath;
			putFile(req, res);
		});
	}

	function checkSession(req, res) {
		if (req.user) {
			// User access is not allowed. This method is only for the collab server
			writeError(403, res, 'Forbidden');
			return;
		}
		var hubid = req.params['hubId'];
		return sharedProjects.getProjectPathFromHubID(hubid)
		.then(function(filepath) {
			if (!filepath) {
				writeError(404, res, 'Session not found: ' + hubid);
				return;
			} 
			res.write('{}');
			res.end();
			return;
		});
	}

	/**
	 * Export
	 */
	function getXfer(req, res) {
		var rest = req.params["0"];
		var file = fileUtil.getFile(req, rest);
		
		if (path.extname(file.path) !== ".zip") {
			return writeError(400, res, "Export is not a zip");
		}
		
		xfer.getXferFrom(req, res, file);
	}

	/**
	 * Import
	 */
	function postImportXfer(req, res) {
		var rest = req.params["0"];
		var file = fileUtil.getFile(req, rest);
		xfer.postImportXferTo(req, res, file.path);
	}
};
