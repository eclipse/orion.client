/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2015 IBM Corporation and others.
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
	 * An additional parameter page builder. The page gathers additional
	 * parameters, such as command, instances, path, etc.
	 */
	
	var rendered = false;
	
	function AdditionalParamPageBuilder(options){
		options = options || {};
		this._init(options);
	}
	
	function isRendered(){
		return rendered;
	}
	
	function setRendered(state){
		rendered = state;
	}
	
	AdditionalParamPageBuilder.constructor = AdditionalParamPageBuilder;
	AdditionalParamPageBuilder.prototype = {
			
		_init : function(options){
			this._manifestApplication = options.ManifestApplication || {};
			this._manifestInstrumentation = options.ManifestInstrumentation || {};

			this._initManifestPath = options.InitManifestPath;
			this._getUserPath = options.getUserPath;
			this._getPlan = options.getPlan;
		},

		build : function(){
			
			var self = this;
			return new mWizard.WizardPage({
				
				template: '<table class="formTable" role="presentation">'+ //$NON-NLS-0$
					"<tr class=\"rowSeparator\">" +
						"<td colspan=\"2\"><div class=\"wiz-hr\"><span id=\"addlManifestSettings\"></span></div></td>" + //$NON-NLS-0$
					"</tr>" + //$NON-NLS-0$
					'<tr>'+ //$NON-NLS-0$
						'<td class="label"><label id="commandLabel"></label></td>'+ //$NON-NLS-0$
						'<td id="command" class="selectCell"></td>'+ //$NON-NLS-0$
					'</tr>'+ //$NON-NLS-0$
					'<tr>'+ //$NON-NLS-0$
						'<td class="label"><label id="pathLabel"></label></td>'+ //$NON-NLS-0$
						'<td id="path" class="selectCell"></td>'+ //$NON-NLS-0$
					'</tr>'+ //$NON-NLS-0$
					'<tr>'+ //$NON-NLS-0$
						'<td class="label"><label id="buildpackLabel"></label></td>'+ //$NON-NLS-0$
						'<td id="buildpack" class="selectCell"></td>'+ //$NON-NLS-0$
					'</tr>'+ //$NON-NLS-0$
					'<tr>'+ //$NON-NLS-0$
						'<td class="label"><label id="memoryLabel"></label></td>'+ //$NON-NLS-0$
						'<td id="memory" class="selectCell"></td>'+ //$NON-NLS-0$
					'</tr>'+ //$NON-NLS-0$
					'<tr>'+ //$NON-NLS-0$
						'<td class="label"><label id="instancesLabel"></label></td>'+ //$NON-NLS-0$
						'<td id="instances" class="selectCell"></td>'+ //$NON-NLS-0$
					'</tr>'+ //$NON-NLS-0$
					'<tr>'+ //$NON-NLS-0$
						'<td class="label"><label id="timeoutLabel"></label></td>'+ //$NON-NLS-0$
						'<td id="timeout" class="selectCell"></td>'+ //$NON-NLS-0$
					'</tr>'+ //$NON-NLS-0$
				'</table>' + //$NON-NLS-0$
				'<div class="manifestOverride">' + //$NON-NLS-0$
					'<div id="addlOverrideNote"></div>' + //$NON-NLS-0$
				'</div>', //$NON-NLS-0$
				
				render: function(){

					if(!isRendered()){
						function addListener(inputField, manifestValue){
							inputField.onkeyup = function(evt) {
					    		if (inputField.value === ""){
					    			inputField.value = manifestValue || "";
					    			inputField.classList.remove("modifiedCell");
					    		} else if (inputField.value === manifestValue){
					    			inputField.classList.remove("modifiedCell");
					    		} else {
					    			inputField.classList.add("modifiedCell");
					    		}
					    	}
						};

						document.getElementById("addlManifestSettings").textContent = messages["manifestSettings"]; //$NON-NLS-0$
						document.getElementById("addlOverrideNote").textContent = messages["manifestOverride"]; //$NON-NLS-1$ //$NON-NLS-0$

						/* command */
				    	var label = document.getElementById("commandLabel"); //$NON-NLS-0$
				    	label.appendChild(document.createTextNode(messages["command:"]));
				    	label.htmlFor = "commandField"; //$NON-NLS-0$
				    	self._command = document.createElement("input"); //$NON-NLS-0$
				    	self._command.id = "commandField"; //$NON-NLS-0$
				    	if (self._manifestInstrumentation.command) {
				    		self._command.value = self._manifestInstrumentation.command;
				    		self._command.classList.add("modifiedCell");
				    	} else if(self._manifestApplication.command){
				    		self._command.value = self._manifestApplication.command;
				    	}
				    	addListener(self._command, self._manifestApplication.command);
				    	
				    	document.getElementById("command").appendChild(self._command); //$NON-NLS-0$
				    	
				    	/* path */
				    	label = document.getElementById("pathLabel"); //$NON-NLS-0$
				    	label.appendChild(document.createTextNode(messages["path:"]));
				    	label.htmlFor = "pathField"; //$NON-NLS-0$
				    	self._path = document.createElement("input"); //$NON-NLS-0$
				    	self._path.id = "pathField"; //$NON-NLS-0$
				    	if (self._manifestInstrumentation.path) {
				    		self._path.value = self._manifestInstrumentation.path;
				    		self._path.classList.add("modifiedCell");
				    	} else if(self._manifestApplication.path){
				    		self._path.value = self._manifestApplication.path;
				    	}
				    	addListener(self._path, self._manifestApplication.path);
				    	
				    	document.getElementById("path").appendChild(self._path); //$NON-NLS-0$
				    	
				    	/* buildpack */
				    	label = document.getElementById("buildpackLabel"); //$NON-NLS-0$
				    	label.appendChild(document.createTextNode(messages["buildpackUrl:"]));
				    	label.htmlFor = "buildpackField"; //$NON-NLS-0$
				    	self._buildpack = document.createElement("input"); //$NON-NLS-0$
				    	self._buildpack.id = "buildpackField"; //$NON-NLS-0$
				    	if (self._manifestInstrumentation.buildpack) {
				    		self._buildpack.value = self._manifestInstrumentation.buildpack;
				    		self._buildpack.classList.add("modifiedCell");
				    	} else if(self._manifestApplication.buildpack){
				    		self._buildpack.value = self._manifestApplication.buildpack;
				    	}
				    	addListener(self._buildpack, self._manifestApplication.buildpack);
				    	
				    	document.getElementById("buildpack").appendChild(self._buildpack); //$NON-NLS-0$
				    	
				    	/* memory */
				    	label = document.getElementById("memoryLabel"); //$NON-NLS-0$
				    	label.appendChild(document.createTextNode(messages["memory:"]));
				    	label.htmlFor = "memoryField"; //$NON-NLS-0$
				    	self._memory = document.createElement("input"); //$NON-NLS-0$
				    	self._memory.id = "memoryField"; //$NON-NLS-0$
				    	if (self._manifestInstrumentation.memory) {
				    		self._memory.value = self._manifestInstrumentation.memory;
				    		self._memory.classList.add("modifiedCell");
				    	} else if(self._manifestApplication.memory){
				    		self._memory.value = self._manifestApplication.memory;
				    	}
				    	addListener(self._memory, self._manifestApplication.memory);

				    	document.getElementById("memory").appendChild(self._memory); //$NON-NLS-0$
				    	
				    	/* instances */
				    	label = document.getElementById("instancesLabel"); //$NON-NLS-0$
				    	label.appendChild(document.createTextNode(messages["instances:"]));
				    	label.htmlFor = "instancesField"; //$NON-NLS-0$
				    	self._instances = document.createElement("input"); //$NON-NLS-0$
				    	self._instances.id = "instancesField"; //$NON-NLS-0$
				    	self._instances.type = "number"; //$NON-NLS-0$
				    	self._instances.min = "0"; //$NON-NLS-0$
				    	if (self._manifestInstrumentation.instances) {
				    		self._instances.value = self._manifestInstrumentation.instances;
				    		self._instances.classList.add("modifiedCell");
				    	} else if(self._manifestApplication.memory){
				    		self._instances.value = self._manifestApplication.instances;
				    	}
				    	addListener(self._instances, self._manifestApplication.instances);
				    	
				    	document.getElementById("instances").appendChild(self._instances); //$NON-NLS-0$
				    	
				    	/* timeout */
				    	label = document.getElementById("timeoutLabel"); //$NON-NLS-0$
				    	label.appendChild(document.createTextNode(messages["timeout(sec):"]));
				    	label.htmlFor = "timeoutField"; //$NON-NLS-0$
				    	self._timeout = document.createElement("input"); //$NON-NLS-0$
				    	self._timeout.id = "timeoutField"; //$NON-NLS-0$
				    	self._timeout.type = "number"; //$NON-NLS-0$
				    	self._timeout.min = "0"; //$NON-NLS-0$
				    	if (self._manifestInstrumentation.timeout) {
				    		self._timeout.value = self._manifestInstrumentation.timeout;
				    		self._timeout.classList.add("modifiedCell");
				    	} else if(self._manifestApplication.memory){
				    		self._timeout.value = self._manifestApplication.timeout;
				    	}
				    	addListener(self._timeout, self._manifestApplication.timeout);
				    	
				    	document.getElementById("timeout").appendChild(self._timeout); //$NON-NLS-0$
				    	
				    	setRendered(true);
					}
					
					if(self._getUserPath() != self._initManifestPath){
						self._getPlan().then(function(result){
							self._manifestApplication = result.Manifest.applications[0];
							if(self._manifestApplication.command){
					    		self._command.value = self._manifestApplication.command;
					    	}
							if(self._manifestApplication.path){
					    		self._path.value = self._manifestApplication.path;
					    	}
							if(self._manifestApplication.buildpack){
					    		self._buildpack.value = self._manifestApplication.buildpack;
					    	}
							if(self._manifestApplication.memory){
					    		self._memory.value = self._manifestApplication.memory;
					    	}
							if(self._manifestApplication.instances){
					    		self._instances.value = self._manifestApplication.instances;
					    	}
							if(self._manifestApplication.timeout){
					    		self._timeout.value = self._manifestApplication.timeout;
					    	}
							self._initManifestPath = self._getUserPath();
						});
					}
				    self._command.focus();
			    },
			    
			    getResults: function(){
			    	
			    	var ret = {};
				    if(self._command)
				    	ret.command = self._command.value;
				    
				    if(self._buildpack)
						ret.buildpack = self._buildpack.value;
					
					if(self._memory)
						ret.memory = self._memory.value;
					
					if(self._instances)
						ret.instances = self._instances.value;
					
					if(self._timeout)
						ret.timeout = self._timeout.value;
					
					if(self._path)
						ret.path = self._path.value;
					
			    	return ret;
			    }
			});
		}
	};
	
	return {
		AdditionalParamPageBuilder : AdditionalParamPageBuilder
	};
});
