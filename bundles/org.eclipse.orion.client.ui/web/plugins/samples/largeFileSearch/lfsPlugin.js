/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(["orion/plugin", "i18n!myMessageBundle/nls/cmdMessages"], function(PluginProvider, messages) {
	var provider = new PluginProvider({
		name: "3rd party special search plugin", //$NON-NLS-0$
		description: "3rd party special search plugin" //$NON-NLS-0$
	});
	function doSearch(mode, editorContext, options) {
		var searchParams = {
			keyword: "", 
			resource: "", 
			fileNamePatterns: ["*.js", "*.html", "*.htm"],
			regEx: false,
			caseSensitive: true, 
			wholeWord: true 
		};
		return editorContext.getFileMetadata().then(function(metadata) {
			return editorContext.getSelectionText().then(function(sText) {
				if(metadata && Array.isArray(metadata.parents) && metadata.parents.length > 0) {
					if(sText) {
						searchParams.keyword = sText;
					}
					if(mode === "parentFolder") {
						searchParams.resource = metadata.parents[0].Location;
					} else {
						searchParams.resource = metadata.parents[metadata.parents.length - 1].Location;
					}
				}
				return {searchParams: searchParams};
			});
		});
	}
	provider.registerServiceProvider("orion.edit.command.category", {}, { //$NON-NLS-1$
		  id : "search.special", //$NON-NLS-1$
          name: messages['SpecialSearchCatName'],
          tooltip : messages['SpecialSearchCatNameTooltip']
	});
	provider.registerServiceProvider("orion.edit.command",  //$NON-NLS-1$
			{
				/** @callback */
				execute: function(editorContext, options) {
					return doSearch("parentFolder", editorContext, options);
				}
			},
			{
	    		name: messages["SpecialSearchOnParentFolder"],
	    		tooltip : messages['SpecialSearchOnParentFolderTooltip'],
	    		parentPath: "search.special", //$NON-NLS-1$
	    		id : "search.special.fromParent",  //$NON-NLS-1$
	    		key : [ "u", true, true, false, false]  //$NON-NLS-1$
	    		//contentType: ['application/javascript', 'text/html']  //$NON-NLS-1$ //$NON-NLS-2$
	    	}
	);
	provider.registerServiceProvider("orion.edit.command",  //$NON-NLS-1$
			{
				/** @callback */
				execute: function(editorContext, options) {
					return doSearch("project", editorContext, options);
				}
			},
			{
	    		name: messages["SpecialSearchOnProject"],
	    		tooltip : messages['SpecialSearchOnProjectTooltip'],
	    		parentPath: "search.special", //$NON-NLS-1$
	    		id : "search.special.fromProject",  //$NON-NLS-1$
	    		//key : [ "g", true, true, false, false],
	    		//contentType: ['application/javascript', 'text/html']  //$NON-NLS-1$ //$NON-NLS-2$
			}
	);
	provider.connect();
});
