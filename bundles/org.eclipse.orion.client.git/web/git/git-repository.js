/******************************************************************************* 
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/

define([
	'orion/browserCompatibility',
	'i18n!git/nls/gitmessages',
	'orion/bootstrap',
	'orion/status',
	'orion/progress',
	'orion/PageUtil',
	'orion/commandRegistry',
	'orion/dialogs',
	'orion/selection',
	'orion/fileClient',
	'orion/operationsClient',
	'orion/searchClient',
	'orion/globalCommands',
	'orion/git/gitRepositoryExplorer',
	'orion/git/gitCommands',
	'orion/git/gitClient',
	'orion/ssh/sshTools',
	'orion/fileUtils',
	'orion/links'
], function(
	mBrowserCompatibility,
	messages,
	mBootstrap,
	mStatus,
	mProgress,
	PageUtil,
	mCommandRegistry,
	mDialogs,
	mSelection,
	mFileClient,
	mOperationsClient,
	mSearchClient,
	mGlobalCommands,
	mGitRepositoryExplorer,
	mGitCommands,
	mGitClient,
	mSshTools,
	mFileUtils,
	mLinks
) {

mBootstrap.startup().then(function(core) {
	var serviceRegistry = core.serviceRegistry;
	var preferences = core.preferences;
	
	var selection = new mSelection.Selection(serviceRegistry);
	var commandRegistry = new mCommandRegistry.CommandRegistry({selection: selection});
	new mDialogs.DialogService(serviceRegistry, commandRegistry);
	new mSshTools.SshService(serviceRegistry);
	var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
	var progress = new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);
	var statusService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	var linkService = new mLinks.TextLinkService({serviceRegistry: serviceRegistry});
	var gitClient = new mGitClient.GitService(serviceRegistry);
	var fileClient = new mFileClient.FileClient(serviceRegistry);
	var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
	
	var explorer = new mGitRepositoryExplorer.GitRepositoryExplorer({
		parentId: "artifacts", //$NON-NLS-0$
		registry: serviceRegistry,
		linkService: linkService,
		commandService: commandRegistry,
		fileClient: fileClient,
		gitClient: gitClient,
		progressService: progress,
		preferencesService: preferences,
		statusService: statusService,
		pageNavId: "pageNavigationActions", //$NON-NLS-0$
		actionScopeId: "itemLevelCommands"  //$NON-NLS-0$
	});
	
	mGlobalCommands.generateBanner("orion-repository", serviceRegistry, commandRegistry, preferences, searcher, explorer); //$NON-NLS-0$
	
	// define commands
	mGitCommands.createFileCommands(serviceRegistry, commandRegistry, explorer, "pageActions", "selectionTools"); //$NON-NLS-1$ //$NON-NLS-0$
	mGitCommands.createGitClonesCommands(serviceRegistry, commandRegistry, explorer, "pageActions", "selectionTools", fileClient); //$NON-NLS-1$ //$NON-NLS-0$
	mGitCommands.createGitStatusCommands(serviceRegistry, commandRegistry, explorer);
	mGitCommands.createSharedCommands(serviceRegistry, commandRegistry, explorer, "pageActions", "selectionTools", fileClient); //$NON-NLS-1$ //$NON-NLS-0$
	
	var params = PageUtil.matchResourceParameters();
	if (params["createProject.name"] === undefined) { //$NON-NLS-0$
		commandRegistry.processURL(window.location.href);
	}
	
	function loadWorkspace(resource) {
		return progress.progress(fileClient.getWorkspace(resource), messages["Loading default workspace"]); //$NON-NLS-0$
	}
	
	loadWorkspace(params.resource || params.workspace).then(function(workspace){
		explorer.setWorkspace(workspace);
		
		var projectDescription = {};
		for(var k in params){
			if (k.indexOf("createProject") !== -1){ //$NON-NLS-0$
				projectDescription[k.replace("createProject.", "")] = params[k]; //$NON-NLS-0$
			}
		}

		commandRegistry.runCommand("eclipse.createGitProject", {url: params["cloneGit"], projectDescription: projectDescription}, null, null); //$NON-NLS-1$ //$NON-NLS-0$
		
		if (params["createProject.name"] === undefined) { //$NON-NLS-0$
			explorer.redisplay();
		}
	});	
	
	// previously saved resource value
	var previousResourceValue = params.resource;

	/* For some reason, the page content scrolls to the left on IE11 even though overflow is set to hidden. */
	document.getElementById("pageContent").addEventListener("scroll", function(evt) { //$NON-NLS-1$ //$NON-NLS-0$
		evt.target.scrollLeft = evt.target.scrollTop = 0;
	});
	
	window.addEventListener("hashchange", function() { //$NON-NLS-0$
		// make sure to close all parameter collectors
		commandRegistry.closeParameterCollector();
		
		var resource = PageUtil.matchResourceParameters().resource;
		
		// do not redisplay if not necessary
		if(previousResourceValue !== resource){
			previousResourceValue = resource;
		
			loadWorkspace(resource || params.workspace).then(function(workspace){
				explorer.setWorkspace(workspace);
				explorer.redisplay();
			});
		}
	}, false);
});

//end of define
});
