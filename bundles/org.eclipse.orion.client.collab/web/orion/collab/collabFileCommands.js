/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd */
define(['orion/collab/shareProjectClient'], function(shareProjectClient) {

    'use strict';

    var mCommands;
    var mCommandRegistry;

    var CollabFileCommands = Object.create(null);

    CollabFileCommands.init = function(callback) {
        require(['orion/commands', 'orion/commandRegistry'], function(_mCommands, _mCommandRegistry) {
            mCommands = _mCommands;
            mCommandRegistry = _mCommandRegistry;
            callback();
        });
    };

    CollabFileCommands.createFileCommands = function(serviceRegistry, commandService, fileClient) {
		var shareProjectCommand = new mCommands.Command({
			name: "Share",
			tooltip: "Share project with a friend",
			description: "Add a user so that they can collaborate with you on the project.",
			imageClass: "core-sprite-link", //$NON-NLS-0$
			id: "orion.collab.shareProject", //$NON-NLS-0$
			parameters: new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('username', 'text', "Username:", "Enter username here")]), //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			callback: function(data) {
				var username = data.parameters.parameterTable.username.value;
				var project = encodeURIComponent(data.items[0].Location);
				shareProjectClient.addUser(username, project);
			},
			visibleWhen: function(item) {
				if (Array.isArray(item)) {
					if (item.length === 1) {
						return !item[0].Parents || !item[0].Parents.length;
					}
				}
				return false;
			}
		});
		commandService.addCommand(shareProjectCommand);

		var unshareProjectCommand = new mCommands.Command({
			name: "Unshare",
			tooltip: "Unshare a project",
			description: "Remove a user from the sharing list of this project.",
			imageClass: "core-sprite-link", //$NON-NLS-0$
			id: "orion.collab.unshareProject", //$NON-NLS-0$
			parameters: new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('username', 'text', "Username:", "Enter username here")]), //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			callback: function(data) {
				var username = data.parameters.parameterTable.username.value;
				var project = encodeURIComponent(data.items[0].Location);
				shareProjectClient.removeUser(username, project);
			},
			visibleWhen: function(item) {
				if (Array.isArray(item)) {
					if (item.length === 1) {
						return !item[0].Parents || !item[0].Parents.length;
					}
				}
				return false;
			}
		});
		commandService.addCommand(unshareProjectCommand);

    };

    return CollabFileCommands;
});
