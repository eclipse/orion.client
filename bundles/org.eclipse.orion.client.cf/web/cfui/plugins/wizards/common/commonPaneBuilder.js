/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!cfui/nls/messages', 'orion/webui/Wizard'], function(messages, mWizard){
	
	/**
	 * A common pane builder.
	 * 
	 * @param options.AppPath {String} [options.AppPath=""] Application deployment path
	 */
	
	/*****************************************************************/
	// THIS CLASS IS DEPRECATED AND ALL REFERENCES HAS BEEN REMOVED //
	/****************************************************************/
	function CommonPaneBuilder(options){
		options = options || {};
		this._init(options);
	}
	
	CommonPaneBuilder.constructor = CommonPaneBuilder;
	CommonPaneBuilder.prototype = {
			
		_init : function(options){
			this._appPath = options.AppPath || "";
		},
			
		build : function(){
			
			var self = this;
			return new mWizard.WizardPage({
		    	template: '<div class="manifest formTable" id="manifest"></div>', //$NON-NLS-0$
		    	render: function(){
		    		
		    		var manifestElement = document.getElementById("manifest"); //$NON-NLS-0$
		    		var saveManifestCheckbox = document.createElement("input"); //$NON-NLS-0$
		    		
		    		saveManifestCheckbox.type = "checkbox"; //$NON-NLS-0$
		    		saveManifestCheckbox.id = "saveManifest";//$NON-NLS-0$
		    		saveManifestCheckbox.checked = undefined;  // unchecked by default
		    		
					manifestElement.appendChild(saveManifestCheckbox);
					self._saveManifestCheckbox = saveManifestCheckbox;
					
					var label = document.createElement("label"); //$NON-NLS-0$
					label.className = "manifestLabel"; //$NON-NLS-0$
					label.appendChild(document.createTextNode(messages["saveToManifestFile:"]));
					
					var manifestFolder = self._appPath;
					manifestFolder = manifestFolder.substring(0, manifestFolder.lastIndexOf("/") + 1); //$NON-NLS-0$
					label.appendChild(document.createTextNode("/" + manifestFolder + "manifest.yml")); //$NON-NLS-0$ //$NON-NLS-1$
					manifestElement.appendChild(label);
		    	},
		    	
		    	getResults: function(){
		    		return {
		    			saveManifest : self._saveManifestCheckbox.checked
		    		};
		    	}
		    });
		}
	};
	
	return {
		CommonPaneBuilder : CommonPaneBuilder
	};
});
