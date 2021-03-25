/******************************************************************************* 
 * @license
 * Copyright (c) 2013, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, browser*/
/*global URL confirm*/
define([
	"orion/plugin",
	"orion/xhr",
	"orion/serviceregistry",
	"orion/git/gitClient",
	"orion/ssh/sshTools",
	"orion/i18nUtil",
	"orion/Deferred",
	"orion/git/GitFileImpl",
	"orion/git/util",
	"i18n!git/nls/gitmessages",
	"orion/URL-shim", // no exports
], function(PluginProvider, xhr, mServiceregistry, mGitClient, mSshTools, i18nUtil, Deferred, GitFileImpl, mGitUtil, gitmessages) {
	var serviceRegistry = new mServiceregistry.ServiceRegistry();
	var gitClient = new mGitClient.GitService(serviceRegistry);
	var sshService = new mSshTools.SshService(serviceRegistry);
	var login = new URL("../../mixloginstatic/LoginWindow.html", window.location.href).href;
	var headers = {
		name: "Orion Git Support",
		version: "1.0",
		description: "This plug-in provides Git Support to the Orion File Service.",
		login: login
	};
	var GIT_TIMEOUT = 60000;

	var provider = new PluginProvider(headers);
	
	provider.registerService("orion.edit.blamer", {
		computeBlame: function(editorContext, context) {
			var wrappedResult = new Deferred();
			gitClient.getGitBlame(context.metadata.Git.BlameLocation).then(function(response) {
				var annotations = [];
				Deferred.all(annotations, function(error) {
					return {
						_error: error
					};
				}).then(function() {
					var commits = response.Children;
					commits.sort(function compare(a, b) {
						if (a.Time < b.Time) {
							return 1;
						}
						if (a.Time > b.Time) {
							return -1;
						}
						return 0;
					});
					for (var i = 0; i < commits.length; i++) {
						for (var j = 0; j < commits[i].Children.length; j++) {
							var range = commits[i].Children[j];
							var c = commits[i];
							range.AuthorName = c.AuthorName;
							range.AuthorEmail = c.AuthorEmail;
							range.CommitterName = c.CommitterName;
							range.CommitterEmail = c.CommitterEmail;
							range.Message = c.Message;
							range.AuthorImage = c.AuthorImage;
							range.Name = c.Name;
							range.Time = new Date(c.Time).toLocaleString();
							range.Shade = (1 / (commits.length + 1)) * (commits.length - i + 1);
							range.CommitLink = "{+OrionHome}/git/git-repository.html#" + c.CommitLocation + "?page=1"; //$NON-NLS-1$ //$NON-NLS-2$
							annotations.push(range);
						}
					}
					wrappedResult.resolve(annotations);
				});
			});
			return wrappedResult;
		}
	}, {
		name: "Git Blame",
		validationProperties: [
			{source: "Git", variableName: "Git"} //$NON-NLS-1$ //$NON-NLS-2$
		]
	});

	// Git category for contributed links

	provider.registerService("orion.edit.diff", {
		computeDiff: function(editorContext, context) {
			var diffTarget = new URL(context.metadata.Git.DiffLocation, window.location);
			diffTarget.query.set("parts", "diff");
			return xhr("GET", diffTarget.href, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: 10000
			}).then(function(result) {
				return result.responseText;
			});
		}
	}, {
		name: "Git Diff",
		validationProperties: [{
			source: "Git",
			variableName: "Git"
		} //$NON-NLS-1$ //$NON-NLS-0$
		]
	}); //$NON-NLS-0$

	provider.registerService("orion.page.link.category", null, {
		id: "git",
		name: gitmessages["Git"],
		nls: "git/nls/gitmessages",
		imageClass: "core-sprite-git-logo",
		order: 20
	});

	provider.registerService("orion.page.link", {}, {
		name: gitmessages["Repositories"],
		id: "orion.git.repositories",
		nls: "git/nls/gitmessages",
		category: "git",
		order: 1000, // low priority
		uriTemplate: "{+OrionHome}/git/git-repository.html#"
	});

	provider.registerService("orion.page.link.related", {}, {
		name: gitmessages["Repositories"],
		id: "orion.git.repositories2",
		nls: "git/nls/gitmessages",
		category: "git",
		order: 800, // low priority
		validationProperties: [
			{source: "WorkspaceLocation|Location", variableName: "GitWorkspaceLocation"}
		],
		uriTemplate: "{+OrionHome}/git/git-repository.html#,workspace={,GitWorkspaceLocation}"
	});
	
	provider.registerService("orion.navigate.command", {}, {
		name: gitmessages["Git Log"],
		id: "eclipse.git.log",
		tooltip: gitmessages["Go to Git Log"],
		nls: "git/nls/gitmessages",
		validationProperties: [
			{source: "Git:CommitLocation", variableName: "GitLogLocation"}
		],
		uriTemplate: "{+OrionHome}/git/git-repository.html#{,GitLogLocation}?page=1",
		forceSingleItem: true
	});
	
	
	// orion.navigate.command for Git Repository -- applies to File objects
	provider.registerService("orion.navigate.command", null, {
		id: "eclipse.git.repository",
		name: gitmessages["Git Repository"],
		tooltip: gitmessages["Go to the git repository"],
		nls: "git/nls/gitmessages",
		category: "git",
		validationProperties: [{
			source: "Git:CloneLocation",
			variableName: "GitRepoLocation"
		}],
		uriTemplate: "{+OrionHome}/git/git-repository.html#{,GitRepoLocation}"
	});

	provider.registerService("orion.core.content", null, {
		id: "orion.content.gitClone",
		nls: "git/nls/gitmessages",
		name: gitmessages["Clone Git Repository"],
		description: gitmessages["Go to the Orion repositories page to provide a git repository URL. Once the repository is created, it will appear in the Navigator."],
		uriTemplate: "{+OrionHome}/git/git-repository.html#,cloneGitRepository=URL"
	});

	provider.registerService("orion.page.link.related", null, {
		id: "eclipse.git.repository",
		category: "git",
		order: 10, // Git Repository should be first in the Git category
	});
	
	provider.registerService("orion.page.link.related", null, {
		id: "eclipse.git.log",
		category: "git"
	});
	/*
	provider.registerService("orion.page.link.related", null, {
		id: "eclipse.git.remote"
	});
	*/
	provider.registerService("orion.page.link.related", null, {
		name: gitmessages["Active Branch Log"],
		id: "eclipse.orion.git.switchToCurrentLocal",
		tooltip: gitmessages["Show the log for the active local branch"],
		nls: "git/nls/gitmessages",
		category: "git",
		validationProperties: [
			{source: "Clone:ActiveBranch", variableName: "GitBranchLocation"},
			{source: "toRef:Type", match: "RemoteTrackingBranch"}
		],
		uriTemplate: "{+OrionHome}/git/git-repository.html#{,GitBranchLocation}?page=1",
		forceSingleItem: true
	});
	
	provider.registerService("orion.page.link.related", null, {
		name: gitmessages["Remote Branch Log"],
		id: "eclipse.orion.git.switchToRemote2",
		tooltip: gitmessages["Show the log for the corresponding remote tracking branch"],
		nls: "git/nls/gitmessages",
		category: "git",
		validationProperties: [
			{source: "toRef:RemoteLocation:0:Children:0:CommitLocation", variableName: "GitRemoteLocation"}
		],
		uriTemplate: "{+OrionHome}/git/git-repository.html#{,GitRemoteLocation}?page=1",
		forceSingleItem: true
	});

	// Applies to Git commit objects
	provider.registerService("orion.page.link.related", null, {
		id: "eclipse.git.repository2",
		category: "git",
		order: 10,
		name: gitmessages["Git Repository"],
		tooltip: gitmessages["Go to the git repository"],
		nls: "git/nls/gitmessages",
		validationProperties: [
			{source: "CloneLocation", variableName: "GitCloneLocation"},
			{source: "Type", match: "Commit"}
		],
		uriTemplate: "{+OrionHome}/git/git-repository.html#{,GitCloneLocation}"
	});
	
	provider.registerService("orion.page.link.related", null, {
		id: "eclipse.git.repository3",
		category: "git",
		order: 10,
		name: gitmessages["Git Repository"],
		tooltip: gitmessages["Go to the git repository"],
		nls: "git/nls/gitmessages",
		validationProperties: [
			{source: "Location", variableName: "GitCloneLocation"},
			{source: "Type", match: "Clone"}
		],
		uriTemplate: "{+OrionHome}/git/git-repository.html#{,GitCloneLocation}"
	});
	
	// Applies to File objects
	provider.registerService("orion.page.link.related", null, {
		id: "eclipse.git.repository", // ref existing orion.navigate.command
		category: "git"
	});

	provider.registerService("orion.page.link.related", null, {
		id: "orion.git.gotoEclipseGit",
		name: gitmessages["Show Repository in eclipse.org"],
		tooltip: gitmessages["Show this repository in eclipse.org"],
		nls: "git/nls/gitmessages",
		category: "git",
		validationProperties: [{
			source: "GitUrl|Clone:GitUrl", 
			match: "git.eclipse.org/gitroot", 
			variableName: "EclipseGitLocation", 
			variableMatchPosition: "after"
		}],
		uriTemplate: "https://git.eclipse.org/c{+EclipseGitLocation}"
	});
	
	provider.registerService("orion.page.link.related", null, {
		id: "orion.git.gotoGithub",
		name: gitmessages["Show Repository in GitHub"],
		nls: "git/nls/gitmessages",
		tooltip: gitmessages["Show this repository in GitHub"],
		category: "git",
		validationProperties: [{
			source: "GitUrl|Clone:GitUrl", 
			match: "github\.com.*\.git", 
			variableName: "GitHubLocation", 
			variableMatchPosition: "only",
			replacements: [{pattern: ":", replacement: "/"}, {pattern: ".git$", replacement: ""}]
		}],
		uriTemplate: "https://{+GitHubLocation}"
	});
	
	provider.registerServiceProvider("orion.page.link.related", null, {
		id: "orion.git.gotoGithubCommit",
		name: gitmessages["Show Commit in GitHub"],
		nls: "git/nls/gitmessages",
		tooltip: gitmessages["Show this commit in GitHub"],
		category: "git",
		validationProperties: [{
			source: "GitUrl", 
			match: "github\.com.*\.git", 
			variableName: "GitHubLocation", 
			variableMatchPosition: "only",
			replacements: [{pattern: ":", replacement: "/"}, {pattern: ".git$", replacement: ""}]
		},
		{source: "Type", match: "Commit"},
		{source: "Name", variableName: "commitName"}
		],
		uriTemplate: "https://{+GitHubLocation}/commit/{+commitName}"
	});
	
	provider.registerServiceProvider("orion.page.link.related", null, {
		id: "orion.git.gotoEclipseGitCommit",
		name: gitmessages["Show Commit in eclipse.org"],
		nls: "git/nls/gitmessages",
		tooltip: gitmessages["Show this commit in eclipse.org"],
		category: "git",
		validationProperties: [{
			source: "GitUrl", 
			match: "git.eclipse.org/gitroot", 
			variableName: "EclipseGitLocation", 
			variableMatchPosition: "after"
		},
		{source: "Type", match: "Commit"},
		{source: "Name", variableName: "commitName"}
		],
		uriTemplate: "https://git.eclipse.org/c{+EclipseGitLocation}/commit/?id={+commitName}"
	});
	
	var tryParentRelative = true;
	function makeParentRelative(location) {
		if (tryParentRelative) {
			try {
				if (window.location.host === parent.location.host && window.location.protocol === parent.location.protocol) {
					return location.substring(parent.location.href.indexOf(parent.location.host) + parent.location.host.length);
				}
				tryParentRelative = false;
			} catch (e) {
				tryParentRelative = false;
			}
		}
		return location;
	}
	var queries = new URL(window.location.href).query;
	var gitFSPattern = queries.get("gitFSPattern");
	var gitBase = gitFSPattern ? gitFSPattern : makeParentRelative(new URL("../../gitapi", window.location.href).href);
	var service = new GitFileImpl(gitBase);

	provider.registerService("orion.core.file", service, {
		Name: gitmessages["GitFileSysName"],
		top: gitBase,
		pattern: gitBase
	});

	var gitDiffPattern = queries.get("gitDiffPattern");
	var base = gitDiffPattern ? gitDiffPattern : new URL("../../gitapi/diff/", window.location.href).href;
	provider.registerService("orion.core.diff", {
		getDiffContent: function(diffURI, options){	
			var url = new URL(diffURI, window.location);
			url.query.set("parts", "diff");
			if (options && typeof options === "object") {
				Object.keys(options).forEach(function(param) {
					url.query.set(param, options[param]);
				});
			}
			return xhr("GET", url.href, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: GIT_TIMEOUT
			}).then(function(xhrResult) {
				return xhrResult.responseText;
			});
		},			
		getDiffFileURI: function(diffURI){
			var url = new URL(diffURI, window.location);
			url.query.set("parts", "uris");
			return xhr("GET", url.href, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: GIT_TIMEOUT
			}).then(function(xhrResult) {
				return JSON.parse(xhrResult.responseText);
			});
		}
	}, {
		pattern: base
	});
	
	function parseGitUrl(gitUrl){
		var gitPath = gitUrl;
		var gitInfo = {};
		if(gitUrl.indexOf("://")>0){
			gitPath = gitUrl.substring(gitUrl.indexOf("://")+3);
		}
		var segments = gitPath.split("/");
		gitInfo.serverName = segments[0];
		if(gitInfo.serverName.indexOf("@")){
			gitInfo.serverName = gitInfo.serverName.substring(gitInfo.serverName.indexOf("@")+1);
		}
		gitInfo.repoName = segments[segments.length-1];
		if(gitInfo.repoName.indexOf(".git")>0){
			gitInfo.repoName = gitInfo.repoName.substring(0, gitInfo.repoName.lastIndexOf(".git"));
		}
		return gitInfo;
	}
	
	function removeUserInformation(gitUrl){
		if(gitUrl.indexOf("@")>0 && gitUrl.indexOf("ssh://")>=0){
			return gitUrl.substring(0, gitUrl.indexOf("ssh://") + 6) + gitUrl.substring(gitUrl.indexOf("@")+1);
		}
		return gitUrl;
	}
	
	provider.registerService("orion.project.handler", {
		paramsToDependencyDescription: function(params){
			return {Type: "git", Location: removeUserInformation(params.url)};
		},
		_cloneRepository: function(gitUrl, params, workspaceLocation, isProject){
			var self = this;
			var deferred = new Deferred();
			
			/* parse gitURL */
			var repositoryURL = mGitUtil.parseSshGitUrl(gitUrl);
			sshService.getKnownHostCredentials(repositoryURL.host, repositoryURL.port).then(function(knownHosts){
				gitClient.cloneGitRepository(null, gitUrl, null, workspaceLocation, params.sshuser, params.sshpassword, knownHosts, params.sshprivateKey, params.sshpassphrase, null, isProject).then(function(cloneResp){
					gitClient.getGitClone(cloneResp.Location).then(function(clone){
						if(clone.Children){
							clone = clone.Children[0];
						}
						var gitInfo = parseGitUrl(clone.GitUrl);
						if(isProject){
							deferred.resolve({ContentLocation: clone.ContentLocation});					
						} else {
							deferred.resolve({Type: "git", Location: removeUserInformation(clone.GitUrl), Name: (gitInfo.repoName || clone.Name) + " at " + gitInfo.serverName});					
						}
					}, deferred.reject, deferred.progress);
				}.bind(this), function(error){
					try{
						if (error && error.status !== undefined) {
							try {
								error = JSON.parse(error.responseText);
							} catch (e) {
								error = { 
									Message : "Problem while performing the action"
								};
							}
						}
					}catch(e){
						deferred.reject(error);
						return;
					}
					if(error.JsonData){
						if(error.JsonData.HostKey){
							if(confirm(i18nUtil.formatMessage('Would you like to add ${0} key for host ${1} to continue operation? Key fingerpt is ${2}.',
								error.JsonData.KeyType, error.JsonData.Host, error.JsonData.HostFingerprint))){
									
									var hostURL = mGitUtil.parseSshGitUrl(error.JsonData.Url);
									var hostCredentials = {
											host : error.JsonData.Host,
											keyType : error.JsonData.KeyType,
											hostKey : error.JsonData.HostKey,
											port : hostURL.port
										};
									
									sshService.addKnownHost(hostCredentials).then(function(){
										self._cloneRepository(gitUrl, params, workspaceLocation).then(deferred.resolve, deferred.reject, deferred.progress);
									});
									
							} else {
								deferred.reject(error);
							}
							return;
						} 
						if(error.JsonData.Host){
							error.Retry = {
								addParameters : [{id: "sshuser", type: "text", name:  gitmessages["User Name:"]}, {id: "sshpassword", type: "password", name:  gitmessages["Password:"]}],
								optionalParameters: [{id: "sshprivateKey", type: "textarea", name:  gitmessages["Ssh Private Key:"]}, {id: "sshpassphrase", type: "password", name:  gitmessages["Ssh Passphrase:"]}]
							};
							deferred.reject(error);
							return;
						}
					}
					deferred.reject(error);
				}.bind(this), deferred.progress);	
			});
			
			return deferred;
		},
		initDependency: function(dependency, params, projectMetadata){
			var gitUrl = removeUserInformation(dependency.Location || params.url);
			return this._cloneRepository(gitUrl, params, projectMetadata.WorkspaceLocation);
		},
		initProject: function(params, projectMetadata){
			var gitUrl = removeUserInformation(params.url);
			return this._cloneRepository(gitUrl, params, projectMetadata.WorkspaceLocation, true);
		},
		getDependencyDescription: function(item){
			if(!item.Git){
				return null;
			}
			var deferred = new Deferred();
			gitClient.getGitClone(item.Git.CloneLocation).then(
				function(clone){
					if(clone.Children){
						clone = clone.Children[0];
					}
					if(clone.GitUrl){
						var gitInfo = parseGitUrl(clone.GitUrl);
						deferred.resolve({Type: "git", Location: removeUserInformation(clone.GitUrl), Name: (gitInfo.repoName || clone.Name) + " at " + gitInfo.serverName});
					} else {
						deferred.reject();
					}
				},deferred.reject, deferred.progress
			);
			return deferred;
		},
		getAdditionalProjectProperties: function(item, projectMetadata){
			if(!item.Git){
				return null;
			}
			var deferred = new Deferred();
			gitClient.getGitClone(item.Git.CloneLocation).then(
			function(clone){
				if(clone.Children){
					clone = clone.Children[0];
				}
				deferred.resolve([
					{
						Name: "Git",
						Children: [
							{
								Name: "Git Url",
								Value: clone.GitUrl
							},
							{
								Name: "Git Repository",
								Value: "Git Repository",
								Href: "{+OrionHome}/git/git-repository.html#" + item.Git.CloneLocation
							}
						]
					}
				]);
			},deferred.reject, deferred.progress
			);
			return deferred;
		}
	}, {
		id: "orion.git.projecthandler",
		type: "git",
		addParameters: [{id: "url", type: "url", name: gitmessages["Url:"]}],
		optionalParameters: [{id: "sshuser", type: "text", name:  gitmessages["User Name:"]}, {id: "sshpassword", type: "password", name:  gitmessages["Password:"]},{id: "sshprivateKey", type: "textarea", name:  gitmessages["Ssh Private Key:"]}, {id: "sshpassphrase", type: "password", name:  gitmessages["Ssh Passphrase:"]}],
		nls: "git/nls/gitmessages",
		addDependencyName: gitmessages["addDependencyName"],
		addDependencyTooltip: gitmessages["addDependencyTooltip"],
		addProjectName: gitmessages["addProjectName"],
		addProjectTooltip: gitmessages["addProjectTooltip"],
		actionComment: "Cloning ${url}",
		validationProperties: [
			{source: "Git"} // alternate {soruce: "Children:[Name]", match: ".git"}
		]
	});
	
	provider.connect();
});
