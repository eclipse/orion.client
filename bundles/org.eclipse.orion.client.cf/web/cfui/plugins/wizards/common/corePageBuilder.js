/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!cfui/nls/messages', 'orion/selection', 'orion/widgets/input/ComboTextInput', 'orion/webui/Wizard', 'orion/webui/littlelib', 'orion/Deferred', 'orion/webui/tooltip',], 
		function(messages, mSelection, ComboTextInput, mWizard, lib, Deferred, mTooltip){
	
	/**
	 * A core page builder. The page gathers the minimum necessary
	 * deployment parameters, i.e. target, application name & host.
	 *
	 */
	
	var rendered = false;
	var plan;
	
	function CorePageBuilder(options){
		options = options || {};
		this._init(options);
	}
	
	function isRendered(){
		return rendered;
	}
	
	function setRendered(state){
		rendered = state;
	}
	
	CorePageBuilder.constructor = CorePageBuilder;
	CorePageBuilder.prototype = {
			
		_init : function(options){
			this._confName = options.ConfName || null,
			this._clouds = options.Clouds || [];
			this._defaultTarget = options.DefaultTarget || {};
			this._filePath = options.FilePath;
			this._projectLocation = options.ProjectLocation;
			this._initManifestPath = options.InitManifestPath || ""; //$NON-NLS-0$
			this._manifestApplication = options.ManifestApplication;
			this._manifestInstrumentation = options.ManifestInstrumentation || {};
			this._serviceRegistry = options.serviceRegistry;
			this._cfService = options.CFService;
			this._fileClient = options.FileClient;
			
			this._showMessage = options.showMessage;
			this._hideMessage = options.hideMessage;
			this._handleError = options.handleError;
			this._postError = options.postError;		
			
			/* application list */
			this._appsList = [];
			this._appsDeferred;
			
			/* route list */
			this._routesList = [];
			this._routesDeferred;
		},
		
		_setSelection : function(){
			var self = this;
			
			if(!self._spacesDropdown.value){
				self._selection.setSelections();
				return;
			}
			
			var orgTargets = self._targets[self._orgsDropdown.value];
			if(!orgTargets){
				self._selection.setSelections();
				return;
			}
			
			for(var i=0; i<orgTargets.length; i++){
				if(orgTargets[i].Space == self._spacesDropdown.value){
					self._selection.setSelections(orgTargets[i]);
					self._defaultTarget.OrgId = null;
					self._defaultTarget.Org = orgTargets[i].Org;
					self._defaultTarget.SpaceId = null;
					self._defaultTarget.Space = orgTargets[i].Space;
					return;
				}
			}
		},
		
		_loadTargets : function(target){
			var self = this;
			
			self._showMessage(messages["loadingDeploymentSettings..."]);
			self._cfService.getOrgs(target).then(
				function(orgs){
					if(self._clouds.length == 1 || target.Name === self._cloudsDropdown.value){
						lib.empty(self._orgsDropdown);
						orgs.Orgs.forEach(
							function(org){
								var option = document.createElement("option"); //$NON-NLS-0$
								option.appendChild(document.createTextNode(org.Name));
								option.org = org;
								
								if (self._defaultTarget && (self._defaultTarget.OrgId === org.Guid
										|| self._defaultTarget.Org === org.Name)){
									option.selected = "selected"; //$NON-NLS-0$
									self._defaultTarget.Org = org.Name;
								}
								
								self._orgsDropdown.appendChild(option);
								self._targets[org.Name] = [];
								
								if (org.Spaces){
									org.Spaces.forEach(function(space){
										var newTarget = {};
										newTarget.Url = target.Url;
										if (target.ManageUrl)
											newTarget.ManageUrl = target.ManageUrl;
										
										newTarget.Org = org.Name;
										newTarget.Space = space.Name;
										newTarget.SpaceId = space.Guid;
										self._targets[org.Name].push(newTarget);
									});
								}
							}
						);
						self._loadSpaces(self._orgsDropdown.value);
					}
				}, function(error){
					self._handleError(error, target, function(){ self._loadTargets(target); });
				}
			);
		},
		
		_loadSpaces : function(org){
			var self = this;
			
			var targetsToDisplay = self._targets[org];
			lib.empty(self._spacesDropdown);
			
			targetsToDisplay.forEach(function(target){
				var option = document.createElement("option"); //$NON-NLS-0$
				option.appendChild(document.createTextNode(target.Space));
				option.target = target;
				
				if (self._defaultTarget && (self._defaultTarget.SpaceId === target.SpaceId
						|| self._defaultTarget.Space === target.Space)){
					option.selected = "selected"; //$NON-NLS-0$
					self._defaultTarget.Space = target.Space;
				}
				
				self._spacesDropdown.appendChild(option);
			});
			self._setSelection();
			self._selection.getSelection(function(selection){
				if (!selection) {
					self._hideMessage();
					return;
				}
				self._loadDomains(selection);
				self._loadApplications(selection);
				self._loadHosts(selection);
			});
		},
		
		_loadDomains : function(target){
			var self = this;

			self._domainsDeferred = self._cfService.getDomains(target);
			self._domainsDeferred.then(function(domains){
				
				self._setSelection();
				var selected = self._selection.getSelection();
				if(selected && target.Url === selected.Url && target.ManageUrl === selected.ManageUrl && target.Org === selected.Org && target.Space === selected.Space && target.SpaceId === selected.SpaceId){
					if(domains.Domains){
						lib.empty(self._domainsDropdown);
						domains.Domains.forEach(function(domain){
							var option = document.createElement("option"); //$NON-NLS-0$
							option.appendChild(document.createTextNode(domain.DomainName));
							
							if (domain.DomainName === (self._manifestInstrumentation.domain || self._manifestApplication.domain)){
								option.selected = "selected"; //$NON-NLS-0$
					    	}
							if (self._manifestInstrumentation.domain) {
								self._domainsDropdown.classList.add("modifiedCell");
							}
							
							self._domainsDropdown.appendChild(option);
						});
						
						self._domainsDropdown.onchange = function(evt) {
				    		if (self._domainsDropdown.value === self._manifestApplication.domain){
				    			self._domainsDropdown.classList.remove("modifiedCell");
				    		} else {
				    			self._domainsDropdown.classList.add("modifiedCell");
				    		}
				    	}
						self._setSelection();
						self._hideMessage();
					}
				}
			});
		},
		
		_loadApplications : function(target){
			var self = this;

			if(self._appsDropdown._recentEntryButton.disabled != true){
				self._appsDropdown._recentEntryButton.disabled = true;
			}

			self._appsDeferred = self._cfService.getApps(target);
			self._appsDeferred.then(function(apps){
				self._appsList = [];
				if(apps && apps.Apps){
					apps.Apps.forEach(function(app){
						self._appsList.push(app.Name);
					});
				}
				self._appsDropdown._recentEntryButton.disabled = false;
			});
		},
		
		_loadHosts : function(target){
			var self = this;

			if(self._hostDropdown._recentEntryButton.disabled != true){
				self._hostDropdown._recentEntryButton.disabled = true;
			}

			self._routesDeferred = self._cfService.getRoutes(target);
			self._routesDeferred.then(function(routes){
				self._routesList = [];
				if(routes && routes.Routes){
					routes.Routes.forEach(function(route){
						self._routesList.push(route.Host);
					});
				}
				self._hostDropdown._recentEntryButton.disabled = false;
			});							
		},
		
		getSelection : function(){
			return this._selection;
		},

		getManifestPath : function(){
			var path;

			path = this._manifestInput.value;
			return path;
		},
		
		validateManifestPath : function(){

			var manifestPath = this.getManifestPath();

			if(manifestPath.charAt(0) == "/")
				manifestPath = manifestPath.substring(1, manifestPath.length);

			if(manifestPath.charAt(manifestPath.length-1) != "/" && manifestPath.lastIndexOf(".yml") === -1)
				manifestPath = manifestPath + "/";

			var location = this._projectLocation + manifestPath;
			var manifestFile = location.substring(location.lastIndexOf("/") + 1);
			var pathToFile = location.substring(0, location.lastIndexOf("/") + 1);

			if(manifestFile == ""){
				return this._fileClient.fetchChildren(location).then(function(children){
					var manifests = children.filter(function(child) {
						return child.Name === "manifest.yml"; //$NON-NLS-0$
					});

					return manifests.length !== 0;
					
				}, function(error){return false;});
			} else {
				return this._fileClient.fetchChildren(pathToFile).then(function(children){
					var manifests = children.filter(function(child) {
						return child.Name === manifestFile; //$NON-NLS-0$
					});

					return manifests.length !== 0 && manifests[0].Directory === false;
					
				}, function(error){return false;});
			}
		},
		
		setManifestPathMessage : function(result){

			var self = this;
			var manifestPath = self.getManifestPath();

			if(result === true){

				if(manifestPath.charAt(manifestPath.length-1) != "/" && manifestPath.lastIndexOf(".yml") === -1)
					self._manifestInput.value = manifestPath + "/manifest.yml";

				if(manifestPath.charAt(manifestPath.length-1) === "/")
					self._manifestInput.value = manifestPath + "manifest.yml";

				if(self._manifestInputWrapper.classList.contains("wrongPath"))
					self._manifestInputWrapper.classList.remove("wrongPath");

				if(!self._manifestInputWrapper.classList.contains("correctPath")){
					self._manifestInputWrapper.classList.add("correctPath");
					self._manifestInput.removeAttribute("aria-invalid"); //$NON-NLS-0$
					self._manifestInput.removeAttribute("aria-errormessage"); //$NON-NLS-0$
					if (self._manifestInputWrapper.tooltip) {
						self._manifestInputWrapper.tooltip.destroy();
					}
				}
			}
			else if(result === false){
				if(self._manifestInputWrapper.classList.contains("correctPath"))
					self._manifestInputWrapper.classList.remove("correctPath");

				if(!self._manifestInputWrapper.classList.contains("wrongPath")){
					self._manifestInputWrapper.classList.add("wrongPath");
					self._manifestInputWrapper.tooltip = new mTooltip.Tooltip({
						node: self._manifestInputWrapper,
						text: messages["CouldNotFindManifestInProvidedPath"],
						trigger: "mouseover", //$NON-NLS-0$
						position: ["above"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					});
					var tipContainer = self._manifestInputWrapper.tooltip.contentContainer(); // force tooltip creation to get the id
					lib.setSafeAttribute(self._manifestInput, "aria-invalid", "true");
					lib.setSafeAttribute(self._manifestInput, "aria-errormessage", tipContainer.id);
				}
			}
		},
		
		getPlan : function(){
			var manifestPath = this.getManifestPath();

			if(manifestPath != this._initManifestPath){
				if(manifestPath.charAt(0) == "/")
					manifestPath = manifestPath.substring(1, manifestPath.length);

				var deferred = new Deferred();
				var relativeFilePath = this._filePath + manifestPath;
				this._cfService.getDeploymentPlans(relativeFilePath).then(function(resp) {
					var plans = resp.Children;
					var selectedPlan;
					plans.forEach(function(plan) {
						if (!selectedPlan && plan.ApplicationType != "generic")
							selectedPlan = plan;
					});
					plan = deferred.resolve(selectedPlan || plans[0]);
					return plan;
				});
				this._initManifestPath = manifestPath;
				return deferred;
			}
			return plan || new Deferred().resolve(null);
		},
		
		build : function(){
			
			var self = this;
			return new mWizard.WizardPage({
				
		    	template: "<table class=\"formTable\" role=\"presentation\">"+ //$NON-NLS-0$
					"<tr>"+ //$NON-NLS-0$
						"<td class=\"label\"><label id=\"launchConfLabel\"></label></td>"+ //$NON-NLS-0$
						"<td id=\"launchConf\" class=\"selectCell\"></td>"+ //$NON-NLS-0$
					"</tr>"+ //$NON-NLS-0$
					"<tr>"+ //$NON-NLS-0$
						"<td class=\"label\"><label id=\"cloudsLabel\"></label></td>"+ //$NON-NLS-0$
						"<td id=\"clouds\" class=\"selectCell\"></td>"+ //$NON-NLS-0$
					"</tr>"+ //$NON-NLS-0$
					"<tr>"+ //$NON-NLS-0$
						"<td class=\"label\"><label id=\"orgsLabel\"></label></td>"+ //$NON-NLS-0$
						"<td id=\"orgs\" class=\"selectCell\"></td>"+ //$NON-NLS-0$
					"</tr>"+ //$NON-NLS-0$
					"<tr>"+ //$NON-NLS-0$
						"<td class=\"label\"><label id=\"spacesLabel\"></label></td>"+ //$NON-NLS-0$
						"<td id=\"spaces\" class=\"selectCell\"></td>"+ //$NON-NLS-0$
					"</tr>"+ //$NON-NLS-0$
					"<tr>"+ //$NON-NLS-0$
						"<td class=\"label\"><label id=\"manifestLabel\"></label></td>"+ //$NON-NLS-0$
						"<td id=\"manifest\" class=\"selectCell\"></td>"+ //$NON-NLS-0$
					"</tr>"+ //$NON-NLS-0$
					"<tr class=\"rowSeparator\">" + //$NON-NLS-0$
						"<td colspan=\"2\"><div class=\"wiz-hr\"><span id=\"manifestSettings\"></span></div></td>" + //$NON-NLS-0$
					"</tr>" + //$NON-NLS-0$
					"<tr>"+ //$NON-NLS-0$
						"<td class=\"label\"><label id=\"nameLabel\"></label></td>"+ //$NON-NLS-0$
						"<td id=\"name\" class=\"selectCell\"></td>"+ //$NON-NLS-0$
					"</tr>"+ //$NON-NLS-0$
					"<tr>"+ //$NON-NLS-0$
						"<td class=\"label\"><label id=\"hostLabel\"></label></td>"+ //$NON-NLS-0$
						"<td id=\"host\" class=\"selectCell\"></td>"+ //$NON-NLS-0$
					"</tr>"+ //$NON-NLS-0$
					"<tr>"+ //$NON-NLS-0$
						"<td class=\"label\"><label id=\"domainsLabel\"></label></td>"+ //$NON-NLS-0$
						"<td id=\"domains\" class=\"selectCell\"></td>"+ //$NON-NLS-0$
					"</tr>"+ //$NON-NLS-0$
				"</table>" +  //$NON-NLS-0$
				'<div class="manifestOverride">' + //$NON-NLS-0$
					'<div id="overrideNote" style="white-space: pre-wrap;"></div>' + //$NON-NLS-0$
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
						
						this.wizard.validate();
						self._targets = {};
	
						// render the override note
						document.getElementById("overrideNote").textContent = messages["manifestOverride"] + "\n" + messages["requiredField"]; //$NON-NLS-1$ //$NON-NLS-0$
	
						// render the launch config field
						var label = document.getElementById("launchConfLabel"); //$NON-NLS-0$
						label.textContent = messages["launchConfLabel"];
						label.htmlFor = "launchConfField"; //$NON-NLS-0$
						
						self._launchConfInput = document.createElement("input"); //$NON-NLS-0$
						self._launchConfInput.id = "launchConfField"; //$NON-NLS-0$
						self._launchConfInput.required = true;
						self._launchConfInput.value = self._confName;
						document.getElementById("launchConf").appendChild(self._launchConfInput); //$NON-NLS-0$
						
						/* render the clouds field */
						if (self._clouds.length > 1){
							label = document.getElementById("cloudsLabel"); //$NON-NLS-0$
							label.appendChild(document.createTextNode(messages["target*:"]));
							label.htmlFor = "cloudsField"; //$NON-NLS-0$
							
							self._cloudsDropdown = document.createElement("select"); //$NON-NLS-0$
							self._cloudsDropdown.id = "cloudsField"; //$NON-NLS-0$
							self._cloudsDropdown.required = true;
							
							self._clouds.forEach(function(cloud){
								var option = document.createElement("option"); //$NON-NLS-0$
								option.appendChild(document.createTextNode(cloud.Name || cloud.Url));
								option.cloud = cloud;
								
								if (self._defaultTarget && self._defaultTarget.Url === cloud.Url)
									option.selected = "selected"; //$NON-NLS-0$
								
								self._cloudsDropdown.appendChild(option);
							});
							
							self._cloudsDropdown.onchange = function(event){
								lib.empty(self._orgsDropdown);
								lib.empty(self._spacesDropdown);
								lib.empty(self._domainsDropdown);
								self._setSelection();
								
								var selectedCloud = self._clouds[event.target.selectedIndex];
								self._loadTargets(selectedCloud);
							};
							
							document.getElementById("clouds").appendChild(self._cloudsDropdown); //$NON-NLS-0$
							
						} else {
							document.getElementById("cloudsLabel").appendChild(document.createTextNode(messages["target:"])); //$NON-NLS-0$
							var span = document.createElement("span"); //$NON-NLS-0$
							lib.setSafeAttribute(span, "aria-labelledby", "cloudsLabel");
							span.textContent = self._clouds[0].Name || self._clouds[0].Url;
							document.getElementById("clouds").appendChild(span); //$NON-NLS-0$
						}
		
						/* render the organizations field */
						label = document.getElementById("orgsLabel"); //$NON-NLS-0$
						label.appendChild(document.createTextNode(messages["organization*:"]));
						label.htmlFor = "orgsField"; //$NON-NLS-0$

						self._orgsDropdown = document.createElement("select"); //$NON-NLS-0$
						self._orgsDropdown.id = "orgsField"; //$NON-NLS-0$
						self._orgsDropdown.required = true;
						self._orgsDropdown.onchange = function(event){
							self._showMessage(messages["loadingDeploymentSettings..."]);
							lib.empty(self._domainsDropdown);
							self._setSelection();
							var selectedOrg = event.target.value;
							self._loadSpaces(selectedOrg);
	
						};
						
						document.getElementById("orgs").appendChild(self._orgsDropdown); //$NON-NLS-0$
						
						/* render the spaces field */
						self._selection = new mSelection.Selection(self._serviceRegistry, "orion.Spaces.selection"); //$NON-NLS-0$
						self._selection.addEventListener("selectionChanged", function(){this.validate();}.bind(this.wizard)); //$NON-NLS-0$
						
						label = document.getElementById("spacesLabel"); //$NON-NLS-0$
						label.appendChild(document.createTextNode(messages["space*:"]));
						label.htmlFor = "spacesField"; //$NON-NLS-0$

						self._spacesDropdown = document.createElement("select"); //$NON-NLS-0$
						self._spacesDropdown.id = "spacesField"; //$NON-NLS-0$
						self._spacesDropdown.required = true;
						self._spacesDropdown.onchange = function(/*event*/){
							self._showMessage(messages["loadingDeploymentSettings..."]);
							lib.empty(self._domainsDropdown);
							self._setSelection();
							var selection = self._selection.getSelection();
							self._loadDomains(selection);
							self._loadApplications(selection);
							self._loadHosts(selection);
						};
						
						document.getElementById("spaces").appendChild(self._spacesDropdown); //$NON-NLS-0$
						
						// render the manifest file
						label = document.getElementById("manifestLabel"); //$NON-NLS-0$
						label.textContent = messages["manifestLabel"];
						label.htmlFor = "manifestField"; //$NON-NLS-0$

						self._manifestInput = document.createElement("input"); //$NON-NLS-0$
						self._manifestInput.id = "manifestField"; //$NON-NLS-0$
						self._manifestInput.value = (self._initManifestPath == "") ? "manifest.yml" : self._initManifestPath;
						self._manifestInput.readOnly = false; // TODO should be editable
						lib.setSafeAttribute(self._manifestInput, "spellcheck", "false");
						self._manifestInputWrapper = document.getElementById("manifest"); //$NON-NLS-0$
						self._manifestInputWrapper.appendChild(self._manifestInput);
						
						self.validateManifestPath().then(self.setManifestPathMessage.bind(self));

						self._manifestInput.onfocus = function(){
							self._manifestCheck = setInterval(function(){
								if(self.getManifestPath() != self._initManifestPath){
									var check = self.validateManifestPath();
									check.then(function(result){
										if(result === true){
											self.setManifestPathMessage(true);
										}
										else{
											self.setManifestPathMessage(false);
										}
										
										var selection = self._selection.getSelection();
										self.getPlan().then(function(result){
											self._manifestApplication = result.Manifest.applications[0];
											self._appsInput.value = self._manifestApplication.name;
											self._hostInput.value = self._manifestApplication.host;
											self.validateHostInputValue();

											for(var i = 0; self._domainsDropdown.length > i; i++){
												if(self._domainsDropdown[i].value === (self._manifestApplication.domain || self._manifestInstrumentation.domain)){
													self._domainsDropdown[i].selected = "selected";
												}
											}
										});
									});
								}
								if(self.getManifestPath() == self._initManifestPath){
									self.validateManifestPath().then(self.setManifestPathMessage.bind(self));
								}
							},1500);
						},

						self._manifestInput.onblur = function(){
							clearInterval(self._manifestCheck);
						},

						// Manifest Settings section
						document.getElementById("manifestSettings").textContent = messages["manifestSettings"]; //$NON-NLS-0$
						
						/* render the domains field */
						label = document.getElementById("domainsLabel"); //$NON-NLS-0$
						label.appendChild(document.createTextNode(messages["domain*:"]));
						label.htmlFor = "domainsField"; //$NON-NLS-0$

						self._domainsDropdown = document.createElement("select"); //$NON-NLS-0$
						self._domainsDropdown.id = "domainsField"; //$NON-NLS-0$
						self._domainsDropdown.required = true;
						document.getElementById("domains").appendChild(self._domainsDropdown); //$NON-NLS-0$
						
						/* render the application name field */
						label = document.getElementById("nameLabel"); //$NON-NLS-0$
						label.appendChild(document.createTextNode(messages["applicationName*:"]));
						label.htmlFor = "nameField"; //$NON-NLS-0$

						self._appsDropdown = new ComboTextInput({
							id: "applicationNameTextInput", //$NON-NLS-0$
							parentNode: document.getElementById("name"), //$NON-NLS-0$
							insertBeforeNode: this._replaceWrapper,
							hasButton: false,
							hasInputCompletion: true,
							serviceRegistry: this._serviceRegistry,
							onRecentEntryDelete: null,
							defaultRecentEntryProposalProvider: function(onItem){

									var result = [];
									self._appsList.forEach(function(app){
										if(!app) return;
										result.push({
											type: "proposal", //$NON-NLS-0$
											label: app,
											value: app
										});
									});
									onItem(result);
							}
						});
						
						self._appsInput = self._appsDropdown.getTextInputNode();						
						self._appsInput.id = "nameField"; //$NON-NLS-0$
						self._appsInput.required = true;
						self._appsInput.onkeyup = function(){this.validate();}.bind(this.wizard);
						self._appsInput.addEventListener("focus",function(){this.validate();}.bind(this.wizard)); //$NON-NLS-0$

						self._appsDropdown._recentEntryButton.disabled = true;

	//					if(self._manifestApplication.name)
	//						self._appsInput.value = self._manifestApplication.name;
						
						if (self._manifestInstrumentation.name) {
				    		self._appsInput.value = self._manifestInstrumentation.name;
				    	} else if (self._manifestApplication.name){
				    		self._appsInput.value = self._manifestApplication.name;
				    	}
						
						/* render the application host field */
						label = document.getElementById("hostLabel"); //$NON-NLS-0$
						label.appendChild(document.createTextNode(messages["host:"]));
						label.htmlFor = "hostField"; //$NON-NLS-0$

						self._hostDropdown = new ComboTextInput({
							id: "applicationRouteTextInput", //$NON-NLS-0$
							parentNode: document.getElementById("host"), //$NON-NLS-0$
							insertBeforeNode: this._replaceWrapper,
							hasButton: false,
							hasInputCompletion: true,
							serviceRegistry: this._serviceRegistry,
							onRecentEntryDelete: null,
							defaultRecentEntryProposalProvider: function(onItem){

									var result = [];
									self._routesList.forEach(function(route){
										if(!route) return;
										result.push({
											type: "proposal", //$NON-NLS-0$
											label: route,
											value: route
										});
									});
									onItem(result);
							}
						});

						self._hostDropdown._recentEntryButton.disabled = true;

						self._hostInput = self._hostDropdown.getTextInputNode();
						self._hostInput.id = "hostField"; //$NON-NLS-0$
	//					self._hostInput.value = self._manifestApplication.host || self._manifestApplication.name || "";
						
						if (self._manifestInstrumentation.host) {
				    		self._hostInput.value = self._manifestInstrumentation.host;
				    		self._hostInput.classList.add("modifiedCell");
				    	} else if (self._manifestApplication.host){
				    		self._hostInput.value = self._manifestApplication.host;
				    	}
				    	addListener(self._hostInput, self._manifestApplication.host);

						var selectedCloud = self._clouds[self._clouds.length > 1 ? self._cloudsDropdown.selectedIndex : 0];
						self._loadTargets(selectedCloud);
						
						setRendered(true);
					}
					self._launchConfInput.focus();
			    },
			    
			    validate: function(setValid) {
					
			    	if(!self._selection){
						setValid(false);
						return;
					}
					
					if (!self._launchConfInput.value) {
						setValid(false);
						return;
					}
					
					if(!self._appsInput.value){
						setValid(false);
						return;
					}
					
					if(!self._domainsDropdown.value){
						setValid(false);
						return;
					}
					
					var selection = self._selection.getSelection();
					if(selection === null || selection.length === 0){
						setValid(false);
						return;
					}
					
					if(self._appsInput.value){ setValid(true); }
					else { setValid(false); }
				},
				
				getResults: function(){
					var res = {};
					if(self._appsInput && self._appsInput.value){
						res.name = self._appsInput.value;
					}
					
					if(self._hostInput && self._hostInput.value){
						res.host = self._hostInput.value;
					}
					
					res.domain = self._domainsDropdown.value;
					
					if (self._launchConfInput && self._launchConfInput.value) {
						res.ConfName = self._launchConfInput.value;
					}
					
					return res;
				}
			});
		}
	};
	
	return {
		CorePageBuilder : CorePageBuilder
	};
});
