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
/*global URL*/
define(["orion/xhr", "orion/URL-shim"], function(xhr) {
	var contextPath = location.pathname.substr(0, location.pathname.lastIndexOf('/edit/edit.html'));
	return {
		shareProjectUrl: contextPath + "/sharedWorkspace/project/",
		unshareProjectUrl: contextPath + "/sharedWorskpace/project/",
		addUserUrl: contextPath + "/sharedWorkspace/user/",
		removeUserUrl: contextPath + "/sharedWorkspace/user/",
		shareProject: function(project) {
			return xhr("POST", this.shareProjectUrl + project, {
				headers: {
					"Orion-Version": "1",
					"X-Create-Options" : "no-overwrite",
					"Content-Type": "application/json;charset=UTF-8"
				}
			});
		},
		unshareProject: function(project) {
			return xhr("DELETE", this.unshareProjectUrl + project, {
				headers: {
					"Orion-Version": "1",
					"X-Create-Options" : "no-overwrite",
					"Content-Type": "application/json;charset=UTF-8"
				}
			});
		},
		addUser: function(username, project) {
			return xhr("POST", this.addUserUrl + project + '/' + username, {
				headers: {
					"Orion-Version": "1",
					"X-Create-Options" : "no-overwrite",
					"Content-Type": "application/json;charset=UTF-8"
				}
			}).then(function() {
				window.location.reload();
			});
		},
		removeUser: function(username, project) {
			return xhr("DELETE", this.removeUserUrl + project + '/' + username, {
				headers: {
					"Orion-Version": "1",
					"X-Create-Options" : "no-overwrite",
					"Content-Type": "application/json;charset=UTF-8"
				}
			}).then(function() {
				window.location.reload();
			});
		}
	}
});
