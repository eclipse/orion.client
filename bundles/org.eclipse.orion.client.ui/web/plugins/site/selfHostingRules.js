
/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
'i18n!orion/nls/messages'
], function(messages) {

	/*
	 * FILE: targetPattern represents a workspace path
	 * API: targetPattern represents a URL on this server
	 */
	var FILE = 0, API = 1;
	// This is kind of clumsy because API paths aren't followed by / but FILE paths are..
	var SELF_HOSTING_TEMPLATE = [
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.ui/web/index.html" }, //$NON-NLS-1$
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.ui/web" }, //$NON-NLS-1$
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.help/web" }, //$NON-NLS-1$
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.users/web" }, //$NON-NLS-1$
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.core/web" }, //$NON-NLS-1$
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.editor/web" }, //$NON-NLS-1$
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.cf/web" }, //$NON-NLS-1$
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.git/web" }, //$NON-NLS-1$
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.javascript/web" }, //$NON-NLS-1$
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.webtools/web" }, //$NON-NLS-1$
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.debug/web" }, //$NON-NLS-1$
		{ type: API, source: "/file", targetPattern: "${0}file" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/prefs", targetPattern: "${0}prefs" }, //$NON-NLS-2$ //$NON-NLS-1$
		{ type: API, source: "/workspace", targetPattern: "${0}workspace" }, //$NON-NLS-2$ //$NON-NLS-1$
		{ type: API, source: "/users", targetPattern: "${0}users" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/authenticationPlugin.html", targetPattern: "${0}authenticationPlugin.html" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/login", targetPattern: "${0}login" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/loginstatic", targetPattern: "${0}loginstatic" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/useremailconfirmation", targetPattern: "${0}useremailconfirmation" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/site", targetPattern: "${0}site" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/gitapi", targetPattern: "${0}gitapi" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/xfer", targetPattern: "${0}xfer" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/filesearch", targetPattern: "${0}filesearch" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/index.jsp", targetPattern: "${0}index.jsp" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/plugins/git", targetPattern: "${0}plugins/git" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/plugins/user", targetPattern: "${0}plugins/user" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/logout", targetPattern: "${0}logout" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/task", targetPattern: "${0}task" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/cfapi", targetPattern: "${0}cfapi" }, //$NON-NLS-1$ //$NON-NLS-2$
		{ type: API, source: "/metrics", targetPattern: "${0}metrics" }, //$NON-NLS-1$ //$NON-NLS-2$
	];

	return {
		Config: {
			folders: [
				{
					name: "org.eclipse.orion.client", //$NON-NLS-1$
					label: messages.orionClientLabel
				}
			]
		},
		Rules: SELF_HOSTING_TEMPLATE,
		Types: {
			File: FILE,
			API: API
		}
	};
});
