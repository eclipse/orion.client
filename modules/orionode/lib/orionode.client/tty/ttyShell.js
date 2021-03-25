/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/

define([
	"i18n!orion/shell/nls/messages",
	"orion/bootstrap",
	"orion/commandRegistry",
	"orion/fileClient",
	"orion/searchClient",
	"orion/globalCommands",
	'orion/webui/littlelib',
	"tty/shell"
], function(messages, mBootstrap, mCommandRegistry, mFileClient, mSearchClient, mGlobalCommands, lib, shell) {

	mBootstrap.startup().then(function(core) {
		var serviceRegistry = core.serviceRegistry;
		var preferences = core.preferences;

		var commandRegistry = new mCommandRegistry.CommandRegistry({});
		var fileClient = new mFileClient.FileClient(serviceRegistry);
		var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
		mGlobalCommands.generateBanner("orion-shellPage", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$
		mGlobalCommands.setPageTarget({task: messages.Shell, serviceRegistry: serviceRegistry, commandService: commandRegistry});
		
		shell.createCommands(serviceRegistry, commandRegistry, preferences);
		
		["pageActions", "pageNavigationActions", "settingsActions"].forEach(function(id) { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$ //$NON-NLS-3$
			var toolbar = lib.node(id);
			if (toolbar) {
				commandRegistry.destroy(toolbar);
				commandRegistry.renderCommands(toolbar.id, toolbar, this, this, "button"); //$NON-NLS-0$
			}
		});
	});
});
