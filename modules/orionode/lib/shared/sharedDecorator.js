/*******************************************************************************
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *		 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var sharedProjects = require('./db/sharedProjects');

module.exports = {};
module.exports.SharedFileDecorator = SharedFileDecorator;

function SharedFileDecorator(options) {
	this.options = options;
}
Object.assign(SharedFileDecorator.prototype, {
	decorate: function(req, file, json) {
		var contextPath = req.contextPath || "";
		var endpoint = req.originalUrl.substring(contextPath.length).split("/")[1];
		if (!"file" === endpoint && !"workspace" === endpoint) {//$NON-NLS-1$ //$NON-NLS-2$
			return; 
		}
		var isWorkspace = "workspace" === endpoint;	
		if (isWorkspace) {
	        return;
		}
		if (!isWorkspace && req.method === "GET") {
			return Promise.resolve(sharedProjects.getHubID(file.path))
			.then(function(hubID) {
				if(hubID){
	                return addHubMetadata(json, hubID);
				}
			})
			.catch(function(){
				return;
			});
		}			
	}
});
function addHubMetadata(comingJson,hub){
    comingJson["Attributes"].hubID = hub;
    return comingJson;
}
