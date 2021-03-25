/*******************************************************************************
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *		 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var api = require('../api');
var clone = require('./clone');

module.exports = {};
module.exports.GitFileDecorator = GitFileDecorator;

function GitFileDecorator(options) {
	this.options = options;
}
Object.assign(GitFileDecorator.prototype, {
	decorate: function(req, file, json) {
		var gitRoot = this.options.gitRoot;
		var contextPath = req.contextPath || "";
		var endpoint = req.originalUrl.substring(contextPath.length).split("/")[1];
		if (!"file" === endpoint && !"workspace" === endpoint) {//$NON-NLS-1$ //$NON-NLS-2$
			return; 
		}
		var isWorkspace = "workspace" === endpoint;	
		if (isWorkspace && req.method === "GET") {
			var children = json.Children;
			return Promise.all(children.map(function(child) {
				return addWorkSpaceGitLinks(gitRoot, child, {workspaceDir: file.workspaceDir, workspaceId: file.workspaceId, path: api.join(file.workspaceDir,child.Name), contextPath: contextPath});		
			}));
		}
		if (!isWorkspace && req.method === "GET") {
			var theRepo;
			return clone.getRepoByPath(file.path, file.workspaceDir)
			.then(function(repo) {
				theRepo = repo;
				return getBranch(theRepo);
			}).then(function(branchname){
				var fileDir = api.join(clone.getfileDir(theRepo, file), "/");
				addGitLinks(gitRoot, json, branchname, fileDir, contextPath);
				var fileChildren = json.Children;
				if(fileChildren){
					calcGitLinks(gitRoot, fileChildren, branchname, fileDir, contextPath);
				}
			})
			.catch(function(){
			})
			.then(function() {
				clone.freeRepo(theRepo);
			});
		}			
	}
});

function getBranch(repo) {
	return repo.getCurrentBranch().then(function(reference) {
		return reference.shorthand();
	});
}
	
function calcGitLinks(gitRoot, fileChildren, branchname, fileDir, contextPath) {
	if (fileChildren) {
		for (var j = 0; j < fileChildren.length; j++) {
			var fileChild = fileChildren[j];
			addGitLinks(gitRoot, fileChild, branchname, fileDir, contextPath);
			var childItems = fileChild.Children;
			if (childItems) {
				calcGitLinks(gitRoot, childItems, branchname, fileDir, contextPath);
			}
		}
	}
}	
	
function addWorkSpaceGitLinks(gitRoot, workspaceChild, file){
	var theRepo;
	return clone.getRepoByPath(file.path, file.workspaceDir)
	.then(function(repo) {
		theRepo = repo;
		return getBranch(theRepo);
	}).then(function(branchname){
		var workDir = api.join(clone.getfileDir(theRepo, file) , "/");
		addGitLinks(gitRoot, workspaceChild, branchname, workDir, file.contextPath);
	}).catch(function(){
	})
	.then(function() {
		clone.freeRepo(theRepo);
	});
}
	
function addGitLinks(gitRoot, json, branchname, fileDir, contextPath){
	var fileTarget = json.Location.substr(contextPath.length + fileDir.length);
	if(fileTarget === "/") fileTarget = "";
	json.Git = {
		"BlameLocation": gitRoot + "/blame/HEAD" + fileDir + fileTarget,
		"CloneLocation": gitRoot + "/clone" + fileDir,
		"CommitLocation": gitRoot + "/commit/" + api.encodeURIComponent(branchname) + fileDir + fileTarget,
		"ConfigLocation": gitRoot + "/config/clone" + fileDir + fileTarget,
		"DefaultRemoteBranchLocation": gitRoot + "/remote/origin/"+ api.encodeURIComponent(branchname) + fileDir,
		"DiffLocation": gitRoot + "/diff/Default" + fileDir + fileTarget,
		"HeadLocation": gitRoot + "/commit/HEAD" + fileDir + fileTarget,
		"IndexLocation": gitRoot + "/index" + fileDir + fileTarget,
		"RemoteLocation": gitRoot + "/remote" + fileDir + fileTarget,
		"StatusLocation": gitRoot + "/status" + fileDir + fileTarget,
		"TagLocation": gitRoot + "/tag" + fileDir + fileTarget,
		"TreeLocation": gitRoot + "/tree" + fileDir + "HEAD/" + fileTarget
	};
	if (!branchname) {
		delete json.Git.CommitLocation;
		delete json.Git.DefaultRemoteBranchLocation;
	}
}
	
