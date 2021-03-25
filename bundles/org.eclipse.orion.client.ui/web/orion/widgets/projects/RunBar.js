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
define([
	'orion/objects',
	'i18n!orion/widgets/nls/messages',
	'text!orion/widgets/projects/RunBar.html',
	'orion/webui/littlelib',
	'orion/i18nUtil',
	'orion/webui/RichDropdown',
	'orion/webui/tooltip',
	'orion/metrics',
	'orion/webui/dialogs/ConfirmDialog',
	'orion/URITemplate',
	'orion/PageLinks',
	'orion/Deferred'
], function(objects, messages, RunBarTemplate, lib, i18nUtil, mRichDropdown, mTooltip, mMetrics, mConfirmDialog, URITemplate, PageLinks, Deferred) {
	
	var METRICS_LABEL_PREFIX = "RunBar"; //$NON-NLS-0$
	var REDEPLOY_RUNNING_APP_WITHOUT_CONFIRMING = "doNotConfirmRedeployRunningApp"; //$NON-NLS-0$
	var STATUS_POLL_INTERVAL_MS = 30000;
	
	/**
	 * Creates a new RunBar.
	 * @class RunBar
	 * @name orion.projects.RunBar
	 * @param options
	 * @param options.parentNode
	 * @param options.serviceRegistry
	 * @param options.commandRegistry
	 * @param options.fileClient
	 * @param options.progressService
	 * @param options.preferencesService
	 * @param options.statusService
	 * @param options.actionScopeId
	 * @param options.generalPreferences
	 */
	function RunBar(options) {
		this._project = null;
		this._parentNode = options.parentNode;
		this._serviceRegistry = options.serviceRegistry;
		this._commandRegistry = options.commandRegistry;
		this._fileClient = options.fileClient;
		this._progressService = options.progressService;
		this._preferencesService = options.preferencesService;
		this.statusService = options.statusService;
		this.actionScopeId = options.actionScopeId;
		this._projectCommands = options.projectCommands;
		this._projectClient = options.projectClient;
		this._preferences = options.preferences;
		this._editorInputManager = options.editorInputManager;
		this._generalPreferences = options.generalPreferences;
		
		this._initialize();
		this._setLaunchConfigurationsLabel(null);
		this._disableAllControls(); // start with controls disabled until a launch configuration is selected
	}
	
	objects.mixin(RunBar.prototype, /** @lends orion.projects.RunBar.prototype */ {
		_initialize: function() {
			this._domNode = lib.createNodes(RunBarTemplate);
			if (this._domNode) {
				this._parentNode.appendChild(this._domNode);
				
				this._undestroyedTooltips = []; // an array of all the tooltips that need to be destroyed when this widget is destroyed
								
				this._playButton = lib.$("button.playButton", this._domNode); //$NON-NLS-0$
				this._boundPlayButtonListener = this._runBarButtonListener.bind(this, this._playButtonCommand);
				this._playButton.addEventListener("click", this._boundPlayButtonListener); //$NON-NLS-0$ 
				
				this._stopButton = lib.$("button.stopButton", this._domNode); //$NON-NLS-0$
				this._boundStopButtonListener = this._runBarButtonListener.bind(this, "orion.launchConfiguration.stopApp"); //$NON-NLS-0$
				this._stopButton.addEventListener("click", this._boundStopButtonListener); //$NON-NLS-0$
				
				var playCommand = this._commandRegistry.findCommand("orion.launchConfiguration.deploy"); //$NON-NLS-0$
				if (playCommand.name) {
					this._setNodeName(this._playButton, playCommand.name);
				}
				if (playCommand.tooltip) {
					this._setNodeTooltip(this._playButton, playCommand.tooltip);
				}
				var stopCommand = this._commandRegistry.findCommand("orion.launchConfiguration.stopApp"); //$NON-NLS-0$
				if (stopCommand.name) {
					this._setNodeName(this._stopButton, stopCommand.name);
				}
				if (stopCommand.tooltip) {
					this._setNodeTooltip(this._stopButton, stopCommand.tooltip);
				}
				
				this._launchConfigurationDispatcher = this._projectCommands.getLaunchConfigurationDispatcher();
				this._launchConfigurationEventTypes = ["create", "delete", "changeState", "deleteAll"]; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-4$
				this._boundLaunchConfigurationListener = this._launchConfigurationListener.bind(this);
				this._launchConfigurationEventTypes.forEach(function(eventType) {
					this._launchConfigurationDispatcher.addEventListener(eventType, this._boundLaunchConfigurationListener);
				}, this);
				
				this._createLaunchConfigurationsDropdown();
				
				//app link
				this._boundLinkClickListener = this._linkClickListener.bind(this);

				this._appLink = lib.$(".appLink", this._domNode); //$NON-NLS-0$
				this._appLink.addEventListener("click", this._boundLinkClickListener); //$NON-NLS-0$
				this._setNodeName(this._appLink, messages["openApp"]); //$NON-NLS-0$
				this._setNodeTooltip(this._appLink, messages["openAppTooltip"]); //$NON-NLS-0$
				this._disableLink(this._appLink);
				
				this._logsLink = lib.$(".logsLink", this._domNode); //$NON-NLS-0$
				this._logsLink.addEventListener("click", this._boundLinkClickListener); //$NON-NLS-0$
				this._setNodeName(this._logsLink, messages["openLogs"]); //$NON-NLS-0$
				this._setNodeTooltip(this._logsLink, messages["openLogsTooltip"]); //$NON-NLS-0$
				this._disableLink(this._logsLink);

				this._editorInputManager.addEventListener("InputChanged", function(e) { //$NON-NLS-0$
					this._projectClient.getProject(e.metadata).then(function(project) {
						this.setProject (project);
					}.bind(this));
				}.bind(this));
				
				window.addEventListener("blur", function() {
					this._stopStatusPolling();
				}.bind(this));
				
				window.addEventListener("focus", function() {
					this._checkStatus();
				}.bind(this));
			} else {
				throw new Error("this._domNode is null"); //$NON-NLS-0$
			}
		},
		
		getProject: function () {
			return this._project;
		},
		
		setProject: function (project) {
			if (this._project === project) return;
			if (!this._project && !project) return;
			if (this._project && project) {
				if (this._project.Location === project.Location) return;
			}
			this.loadLaunchConfigurations(this._project = project);
		},
	
		_createLaunchConfigurationsDropdown: function() {
			this._launchConfigurationsWrapper = lib.$(".launchConfigurationsWrapper", this._domNode); //$NON-NLS-0$
			this._cachedLaunchConfigurations = {};
			
			var separator;
			
			// function which populates the launch configurations dropdown menu
			var populateFunction = function(paren) {
				if (this._menuItemsCache && this._menuItemsCache.length > 0) {
					this._menuItemsCache.forEach(function(menuItem){
						paren.appendChild(menuItem);
					});
				} else {
					this._menuItemsCache = []; // clear launch configurations menu items cache
					var dropdown = this._launchConfigurationsDropdown.getDropdown();
					var launchConfiguration, menuItem, domNodeWrapperList;
					
					var sortedHashes = Object.keys(this._cachedLaunchConfigurations);

					sortedHashes.sort(function(hash1, hash2) {
						return this._cachedLaunchConfigurations[hash1].Name
								.localeCompare(this._cachedLaunchConfigurations[hash2].Name);
					}.bind(this));

					sortedHashes.forEach( function(hash) {
						if (this._cachedLaunchConfigurations.hasOwnProperty(hash)) {
							launchConfiguration = this._cachedLaunchConfigurations[hash];
							menuItem = dropdown.appendMenuItem(this._getDisplayName(launchConfiguration));
							menuItem.classList.add("launchConfigurationMenuItem"); //$NON-NLS-0$
							menuItem.id = launchConfiguration.Name + "_RunBarMenuItem"; //$NON-NLS-0$

							if (launchConfiguration === this.getSelectedLaunchConfiguration()) {
								menuItem.classList.add("dropdownMenuItemActive"); //$NON-NLS-0$
							}

							menuItem.addEventListener("click", /* @callback */ function(currentHash, evnt){ //$NON-NLS-0$
								// Use currentHash to get cached launch config again because it will be updated 
								// by the listener as events occur. Using currentHash directly here to avoid 
								// unnecessarily keeping old copies of the launchConfiguration alive.
								var cachedConfig = this._cachedLaunchConfigurations[currentHash];
								var checkStatus = true;
								if (cachedConfig.status && ("PROGRESS" === cachedConfig.status.State) ) { //$NON-NLS-0$
									//do not check status if it is in PROGRESS
									checkStatus = false;
								}
								this.selectLaunchConfiguration(cachedConfig, checkStatus);
							}.bind(this, hash)); // passing in hash here because using it directly in function only creates a reference which ends up with the last value of hash
							
							this._commandRegistry.registerCommandContribution(menuItem.id, "orion.launchConfiguration.edit", 1); //$NON-NLS-0$
							this._commandRegistry.registerCommandContribution(menuItem.id, "orion.launchConfiguration.delete", 2); //$NON-NLS-0$
							domNodeWrapperList = [];
							this._commandRegistry.renderCommands(menuItem.id, menuItem.firstChild, launchConfiguration, this, "tool", null, domNodeWrapperList); //$NON-NLS-0$
							if (domNodeWrapperList.length > 0){
								domNodeWrapperList[0].domNode.classList.add("launchConfigurationEditButton"); //$NON-NLS-0$
								if (domNodeWrapperList.length > 1) {
									domNodeWrapperList[1].domNode.classList.remove("commandMargins"); //$NON-NLS-0$
									domNodeWrapperList[1].domNode.classList.add("launchConfigurationDeleteButton"); //$NON-NLS-0$
								}
							}
							
							this._menuItemsCache.push(menuItem);
							
							separator = dropdown.appendSeparator();
							this._menuItemsCache.push(separator);
						}
					}.bind(this));
					
					separator = dropdown.appendSeparator();
					this._menuItemsCache.push(separator);

					var createNewItem = dropdown.appendMenuItem(); //$NON-NLS-0$
					createNewItem.id = "CreateNew_RunBarMenuItem"; //$NON-NLS-0$
					this._menuItemsCache.push(createNewItem);
					
					var dropdownMenuItemSpan = lib.$(".dropdownMenuItem", createNewItem); //$NON-NLS-0$
					dropdownMenuItemSpan.classList.add("addNewMenuItem"); //$NON-NLS-0$
					
					var defaultDeployCommands = this._projectCommands.getDeployProjectCommands(this._commandRegistry);
					if (defaultDeployCommands) {
						domNodeWrapperList = [];
						if (defaultDeployCommands.length === 1) {
							this._commandRegistry.registerCommandContribution(createNewItem.id, defaultDeployCommands[0].id, 1);
							this._commandRegistry.renderCommands(createNewItem.id, dropdownMenuItemSpan, this._project, this, "button", null, domNodeWrapperList);
							domNodeWrapperList[0].domNode.textContent = "+";
							lib.setSafeAttribute(domNodeWrapperList[0].domNode, "aria-label", defaultDeployCommands[0].name);
							this._setNodeTooltip(domNodeWrapperList[0].domNode, defaultDeployCommands[0].tooltip);
						} else {
							this._commandRegistry.addCommandGroup(createNewItem.id, "orion.deployServiceGroup", 1000, "+", null, null, null, "+", null, true);
							for (var i = 0; i < defaultDeployCommands.length; i++) {
								this._commandRegistry.registerCommandContribution(createNewItem.id, defaultDeployCommands[i].id, 1100 + i * 100, "orion.deployServiceGroup");
							}
							var menuWrapper = document.createElement('div');
							menuWrapper.classList.add('dropdownSubMenu'); // Prevent auto dismiss
							dropdownMenuItemSpan.appendChild(menuWrapper);
							this._commandRegistry.renderCommands(createNewItem.id, menuWrapper, this._project, this, "tool", null, domNodeWrapperList);
						}
					}
				}
			}.bind(this);
			
			this._launchConfigurationsDropdown = new mRichDropdown.RichDropdown({
				parentNode: this._launchConfigurationsWrapper,
				id: "launchConfig",  //$NON-NLS-0$
				populateFunction: populateFunction
			});
			this._launchConfigurationsDropdownTriggerButton = this._launchConfigurationsDropdown.getDropdownTriggerButton();
			this._launchConfigurationsDropdownTriggerButton.classList.remove("dropdownDefaultButton"); //$NON-NLS-0$
			this._launchConfigurationsDropdownTriggerButton.classList.add("launchConfigurationsButton"); //$NON-NLS-0$
			lib.setSafeAttribute(this._launchConfigurationsDropdownTriggerButton, "aria-label", messages["launchConfiguration"]);
			lib.setSafeAttribute(this._launchConfigurationsDropdownTriggerButton, "aria-labelledby", "launchConfigButton launchConfigLabel");
			var dropdownNode = this._launchConfigurationsDropdown.getDropdownNode();
			lib.setSafeAttribute(dropdownNode, "aria-label", messages["launchConfigurations"]);
			
			this._disableLaunchConfigurationsDropdown(); // start with control greyed out until launch configs are set
			
			this._launchConfigurationsLabel = lib.$(".dropdownTriggerButtonLabel", this._launchConfigurationsWrapper); //$NON-NLS-0$
			this._appName = lib.$(".appName", this._launchConfigurationsLabel); //$NON-NLS-0$
			this._statusLight = lib.$(".statusLight", this._launchConfigurationsLabel); //$NON-NLS-0$
			this._appInfoSpan = lib.$(".appInfoSpan", this._launchConfigurationsLabel); //$NON-NLS-0$
			
			this._launchConfigurationsWrapper.removeChild(this._launchConfigurationsLabel);
			this._launchConfigurationsDropdown.setCustomTriggerButtonLabelNode(this._launchConfigurationsLabel);
			
			this._boundTriggerButtonEventListener = function(evnt){ 
				mMetrics.logEvent("ui", "invoke", METRICS_LABEL_PREFIX + ".launchConfigurationsDropdownTriggerButton.clicked", evnt.which); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$ //$NON-NLS-3$
			}.bind(this);
			this._launchConfigurationsDropdownTriggerButton.addEventListener("click", this._boundTriggerButtonEventListener); //$NON-NLS-0$
		},
		
		destroy: function() {
			this._stopStatusPolling();
			
			// remove node from DOM
			if (this._parentNode && this._domNode) {
				this._parentNode.removeChild(this._domNode);
				this._domNode = null;
				this._parentNode = null;
			}
			
			// destroy tooltips
			if (this._undestroyedTooltips) {
				this._undestroyedTooltips.forEach(function(tooltip){
					tooltip.destroy();
				}, this);
				this._undestroyedTooltips = null;
			}
			
			// remove event listeners
			if (this._launchConfigurationEventTypes) {
				this._launchConfigurationEventTypes.forEach(function(eventType) {
					this._launchConfigurationDispatcher.removeEventListener(eventType, this._boundLaunchConfigurationListener);
				}, this);
			}
			
			if (this._playButton) {
				this._playButton.removeEventListener("click", this._boundPlayButtonListener); //$NON-NLS-0$
				this._playButton = null;
			}
			
			if (this._stopButton) {
				this._stopButton.removeEventListener("click", this._boundStopButtonListener); //$NON-NLS-0$
				this._stopButton = null;
			}
			
			if (this._launchConfigurationsDropdown) {
				if (this._launchConfigurationsDropdownTriggerButton && this._boundTriggerButtonEventListener) {
					this._launchConfigurationsDropdownTriggerButton.removeEventListener("click", this._boundTriggerButtonEventListener); //$NON-NLS-0$
					this._launchConfigurationsDropdownTriggerButton = null;
				}
				this._launchConfigurationsDropdown.destroy();
				this._launchConfigurationsDropdown = null;
			}
			
			if (this._appLink) {
				this._appLink.removeEventListener("click", this._boundLinkClickListener); //$NON-NLS-0$
				this._appLink = null;
			}
			
			if (this._logsLink) {
				this._logsLink.removeEventListener("click", this._boundLinkClickListener); //$NON-NLS-0$
				this._logsLink = null;
			}
		},
		
		focus: function() {
			if (this._launchConfigurationsDropdownTriggerButton) {
				this._launchConfigurationsDropdownTriggerButton.focus();
			}
		},
		
		_launchConfigurationListener: function(evnt) {
			var newConfig = evnt.newValue;
			
			if((evnt.type === "changeState") && newConfig){ //$NON-NLS-0$
				this._logsLink.classList.remove('logStatusProgress');
				if (newConfig && newConfig.status){
					if (newConfig.status.State === "PROGRESS"){
						this._logsLink.classList.add('logStatusProgress');
					}
				}
				this._updateLaunchConfiguration(newConfig);
			} else {
				this._menuItemsCache = []; // clear launch configurations menu items cache
				
				if((evnt.type === "create") && newConfig){ //$NON-NLS-0$
					// cache and select new launch config
					this._putInLaunchConfigurationsCache(newConfig);					
					this.selectLaunchConfiguration(newConfig, true); //check the status of newly created configs
				} else if(evnt.type === "delete"){ //$NON-NLS-0$
					var deletedFile = evnt.oldValue.File;
					
					// iterate over cached launch configs, find and delete 
					// the one that matches the deleted file
					for (var hash in this._cachedLaunchConfigurations) {
						if (this._cachedLaunchConfigurations.hasOwnProperty(hash)) {
							var current = this._cachedLaunchConfigurations[hash];
							if (current.File.Location === deletedFile.Location) {
								if (current === this._selectedLaunchConfiguration) {
									this.selectLaunchConfiguration(null);
								}
								var element = document.getElementById(current.Name + '_RunBarMenuItem'); //$NON-NLS-1$
								if (element) {
									var paren = element.parentNode;
									var sep = element.previousSibling;
									if (sep && sep.className === "dropdownSeparator") {
										paren.removeChild(sep);
									}
									paren.removeChild(element);										
								}
								//TODO: this has left a menu iteme separator in the dom still 
								this._removeFromLaunchConfigurationsCache(current);
								break;
							}
						}
					}
				} else if(evnt.type === "deleteAll"){ //$NON-NLS-0$
					this._cacheLaunchConfigurations([]);
					this.selectLaunchConfiguration(null);
				}
			}
		},
	
		/**
		 * Selects the specified launch configuration
		 * 
		 * @param {Object} launchConfiguration The launch configuration to select
		 * @param {Boolean} checkStatus Specifies whether or not the status of the launchConfiguration should be checked
		 */
		selectLaunchConfiguration: function(launchConfiguration, checkStatus) {
			var errorHandler = function (error) {
				// stop the progress spinner in the launch config dropdown trigger
				this.setStatus({
					error: error || true //if no error was passed in we still want to ensure that the error state is recorded
				});
			}.bind(this);
			
			if (launchConfiguration) {
				this._selectedLaunchConfiguration = launchConfiguration;
				this._setLaunchConfigurationsLabel(launchConfiguration);
				
				if (checkStatus) {
					this._displayStatusCheck(launchConfiguration);
					var startTime = Date.now();
					this._checkLaunchConfigurationStatus(launchConfiguration).then(function(_status) {
						var interval = Date.now() - startTime;
						mMetrics.logTiming("deployment", "check status (launch config)", interval, launchConfiguration.Type); //$NON-NLS-1$ //$NON-NLS-2$

						launchConfiguration.status = _status;
						this._updateLaunchConfiguration(launchConfiguration);
					}.bind(this), errorHandler);
				} else {
					// do not check the status, only set it in the UI if it is already in the launchConfiguration
					if (launchConfiguration.status) {
						this.setStatus(launchConfiguration.status);
					}
				}
			} else {
				this._stopStatusPolling(); //stop before clearing selected config
				this._selectedLaunchConfiguration = null;
				this._setLaunchConfigurationsLabel(null);
				this.setStatus({});
			}
			this._menuItemsCache = [];
		},

		_displayStatusCheck: function(launchConfiguration) {
			var appName = this._getDisplayName(launchConfiguration);
			var progressMessage = i18nUtil.formatMessage(messages["checkingStateMessage"], appName); //$NON-NLS-0$
			
			// start progress spinner in launch config dropdown trigger and indicate that we are checking the status
			this.setStatus({
				State: "PROGRESS", //$NON-NLS-0$
				Message: progressMessage,
				ShortMessage: messages["checkingStateShortMessage"], //$NON-NLS-0$
				Url: (launchConfiguration.status && launchConfiguration.status.Url) ? launchConfiguration.status.Url : null
			});
		},
		
		_updateLaunchConfiguration: function(launchConfiguration) {
			var cachedHash = this._getHash(launchConfiguration);
			var selectedHash = this._getHash(this._selectedLaunchConfiguration);
			
			if (cachedHash === selectedHash) {
				// select launch configuration if it replaces the currently selected one
				var checkStatus = launchConfiguration.status && launchConfiguration.status.CheckState; // check status again if status.CheckState is set
				this.selectLaunchConfiguration(launchConfiguration, checkStatus);
			}
			
			// replace cached launch config
			this._putInLaunchConfigurationsCache(launchConfiguration);
		},
					
		_checkLaunchConfigurationStatus: function(launchConfiguration) {
			return this._projectClient.getProjectDeployService(launchConfiguration.ServiceId, launchConfiguration.Type).then(
				function(service){
					if(service && service.getState){
						return service.getState(launchConfiguration).then(function(_status){
								return _status;
							}.bind(this),
							function(error){
								launchConfiguration.status = {error: error};
								if (error.Retry) {
									// authentication error, gather required parameters and try again
									launchConfiguration.parametersRequested = launchConfiguration.status.error.Retry.parameters;
									launchConfiguration.optionalParameters = launchConfiguration.status.error.Retry.optionalParameters;
									
									// run command because it knows how to collect params first then check the status again
									this._commandRegistry.runCommand("orion.launchConfiguration.checkStatus", launchConfiguration, this, null, null, this._statusLight); //$NON-NLS-0$
								} else {
									if(error.Alert && error.Alert === true)
										this._progressService.setProgressResult(error);
									this._launchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: launchConfiguration}); //$NON-NLS-0$
								}
							}.bind(this)
						);
					}
				}.bind(this)
			);
		},
		
		setStatus: function(_status) {
			this._authenticationFailed = false;
			var longStatusText = null;
			var tooltipText = "";
			var uriTemplate = null;
			var uriParams = null;
			var logLocationTemplate = null;			
			var appName = this._getDisplayName(this._selectedLaunchConfiguration);
			var appInfoText = this._getAppInfoText(_status);

			
			// logLocationTemplate in status takes precendence because it comes from the 
			// service implementation's method rather than from the service properties
			logLocationTemplate = (_status && _status.logLocationTemplate) || (this._selectedLaunchConfiguration && this._selectedLaunchConfiguration.Params && this._selectedLaunchConfiguration.Params.LogLocationTemplate);
			
			// turn status light off
			this._statusLight.classList.remove("statusLightGreen"); //$NON-NLS-0$
			this._statusLight.classList.remove("statusLightRed"); //$NON-NLS-0$
			this._statusLight.classList.remove("statusLightProgress"); //$NON-NLS-0$
			
			this._setText(this._appInfoSpan, null);
			
			if(_status.Info && _status.Info === "Deploying"){
				this._disableControl(this._playButton);
				this._disableControl(this._stopButton);
			} else {
				this._disableAllControls(); // applicable controls will be re-enabled further below
			}
			
			if (_status) {
				if (_status.error) {
					this._enableControl(this._playButton);
					
					if (!_status.error.Retry) {
						// this is a real error
						if (_status.error.Message && !_status.error.HTML) {
							longStatusText = _status.error.Message;
						}
					}
				} else {
					switch (_status.State) {
						case "PROGRESS": //$NON-NLS-0$
							this._statusLight.classList.add("statusLightProgress"); //$NON-NLS-0$
							this._stopStatusPolling(); // do not poll while status is in a transitive state
							break;
						case "STARTED": //$NON-NLS-0$
							this._enableControl(this._playButton);
							this._enableControl(this._stopButton);
							this._statusLight.classList.add("statusLightGreen"); //$NON-NLS-0$
							break;
						case "STOPPED": //$NON-NLS-0$
							this._enableControl(this._playButton);
							this._statusLight.classList.add("statusLightRed"); //$NON-NLS-0$
							break;
						case "PAUSED": //$NON-NLS-0$
							this._enableControl(this._playButton);
							this._enableControl(this._stopButton);
							this._statusLight.classList.add("statusLightAmber"); //$NON-NLS-0$
							break;
						default:
							break;
					}
					longStatusText = _status.Message;
				}
				
				if (!_status.error && ("PROGRESS" !== _status.State)) {
					this._startStatusPolling();
				} else if (_status.error && _status.error.HttpCode === 401) {
					this._authenticationFailed = true;
					this._stopStatusPolling();
				}
			}
			
			if (appName) {
				tooltipText = appName;
				if (appInfoText) {
					tooltipText += " (" + appInfoText + ")"; //$NON-NLS-1$ //$NON-NLS-0$
				}
				if (appInfoText !== longStatusText) {
					if(longStatusText){
						tooltipText += " : " + longStatusText; //$NON-NLS-0$
					}					
				}
				
			}
			this._setNodeTooltip(this._launchConfigurationsDropdownTriggerButton, tooltipText);
			
			if (appInfoText) {
				this._setText(this._appInfoSpan, "(" + appInfoText + ")"); //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				this._setText(this._appInfoSpan, null);
			}
			
			if (this._project) {
				if (_status && _status.Url) {
					this._enableLink(this._appLink, _status.Url);
				}
				if (logLocationTemplate) {
					uriTemplate = new URITemplate(logLocationTemplate);
					uriParams = {
						OrionHome: PageLinks.getOrionHome(),
						Name: "",
						Target: {
							launchConfLocation: this._selectedLaunchConfiguration.File.Location
						}
					};
					this._enableLink(this._logsLink, uriTemplate.expand(uriParams));
				} else {
					var service = this._serviceRegistry.getService("orion.project.deploy"); //$NON-NLS-1$
					if (service && service.getLogLocationTemplate) {
						service.getLogLocationTemplate(this._selectedLaunchConfiguration).then(function(result){
							uriTemplate = new URITemplate(result);
							var config = this._selectedLaunchConfiguration ? this._selectedLaunchConfiguration.File.Location : '';
							uriParams = {
								OrionHome: PageLinks.getOrionHome(),
								Name: "",
								Target: {
									launchConfLocation: config
								}
							};
							this._enableLink(this._logsLink, uriTemplate.expand(uriParams));
						}.bind(this));
					}
				}
			}
		},
		
		_getAppInfoText: function(_status) {
			var appInfoText = ""; //$NON-NLS-0$
			
			if (_status) {
				if (_status.error) {
					if (_status.error.Retry) {
						appInfoText = _status.ShortMessage || messages["appInfoUnknown"]; //$NON-NLS-0$
					} else {
						appInfoText = _status.ShortMessage || _status.error.ShortMessage ||
							(!_status.error.HTML && _status.error.Message) || messages["appInfoError"]; //$NON-NLS-0$
					}
				} else {
					switch (_status.State) {
						case "PROGRESS": //$NON-NLS-0$
							if (_status.ShortMessage || _status.Message) {
								appInfoText = _status.ShortMessage || _status.Message;
							}
							break;
						case "STARTED": //$NON-NLS-0$
							appInfoText = messages["appInfoRunning"]; //$NON-NLS-0$
							break;
						case "STOPPED": //$NON-NLS-0$
							appInfoText = messages["appInfoStopped"]; //$NON-NLS-0$
							break;
					}
				}
			}
			
			return appInfoText;
		},
		
		/**
		 * Get launch configurations from the specified project and load them into this run bar.
		 * 
		 * @param[in] {Object} project The project from which to load the launch configurations
		 */
		loadLaunchConfigurations: function (project) {
			if (project) {
				this._projectClient.getProjectLaunchConfigurations(project).then(function(launchConfigurations){
					if (project !== this._project) return;
					this._setLaunchConfigurations(launchConfigurations);
				}.bind(this));
			} else {
				this._setLaunchConfigurations(null);
			}
		},
		
		/**
		 * Sets the list of launch configurations to be used by this run bar.
		 * This method may be called more than once. Any previously cached
		 * launch configurations will be replaced with the newly specified ones.
		 * 
		 * @param {Array} launchConfigurations An array of launch configurations
		 */
		_setLaunchConfigurations: function(launchConfigurations) {
			if (launchConfigurations) {
				this._enableLaunchConfigurationsDropdown();
				launchConfigurations.sort(function(launchConf1, launchConf2) {
					return launchConf1.Name.localeCompare(launchConf2.Name);
				});
			} else {
				this._disableLaunchConfigurationsDropdown();
			}
			
			this._cacheLaunchConfigurations(launchConfigurations);
			
			if (launchConfigurations && launchConfigurations[0]) {
				// select first launch configuration
				var hash = this._getHash(launchConfigurations[0]);
				var cachedConfig = this._cachedLaunchConfigurations[hash];
				this.selectLaunchConfiguration(cachedConfig, true);
			} else {
				this.selectLaunchConfiguration(null);
			}
		},
		
		_cacheLaunchConfigurations: function(launchConfigurations) {
			this._cachedLaunchConfigurations = {};
			if (launchConfigurations) {
				launchConfigurations.forEach(function(launchConfig){
					this._putInLaunchConfigurationsCache(launchConfig);
				}, this);
			}
		},
		
		_getHash: function(launchConfiguration) {
			var hash = null;
			if (launchConfiguration) {
				hash = launchConfiguration.Name + ":" + launchConfiguration.ServiceId; //$NON-NLS-0$
			}
			return hash;
		},
		
		_putInLaunchConfigurationsCache: function(launchConfiguration) {
			var hash = this._getHash(launchConfiguration);
			if (!launchConfiguration.project) {
				// TODO Find a better way to get this info
				launchConfiguration.project = this._project;
			}
			this._cachedLaunchConfigurations[hash] = launchConfiguration;
		},
		
		_removeFromLaunchConfigurationsCache: function(launchConfiguration) {
			var hash = this._getHash(launchConfiguration);
			delete this._cachedLaunchConfigurations[hash];
		},
		
		/**
		 * Implements a generic button listener which executes the specified
		 * command when it is invoked and collects metrics
		 * 
		 * @param[in] {String | Function} command A String containing the id of the command to run or a Function to call
		 * @param[in] {Event} event The event which triggered the listener
		 */
		_runBarButtonListener: function(command, evnt) {
			var buttonNode = evnt.target;
			var id = buttonNode.id;
			var isEnabled = this._isEnabled(buttonNode);
			var disabled = isEnabled ? "" : ".disabled"; //$NON-NLS-1$ //$NON-NLS-0$
			
			mMetrics.logEvent("ui", "invoke", METRICS_LABEL_PREFIX + "." + id +".clicked" + disabled, evnt.which); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			
			if (isEnabled) {
				if (typeof command === "function") { //$NON-NLS-0$
					command.call(this, buttonNode);
				} else {
					this._commandRegistry.runCommand(command, this._selectedLaunchConfiguration, this, null, null, buttonNode); //$NON-NLS-0$
				}
			}
		},
		
		getSelectedLaunchConfiguration: function() {
			return this._selectedLaunchConfiguration;
		},
		
		_disableAllControls: function() {
			this._disableControl(this._playButton);
			this._disableControl(this._stopButton);
			this._disableLink(this._appLink);
			this._disableLink(this._logsLink);
		},
		
		_enableControl: function(domNode) {
			domNode.classList.remove("disabled"); //$NON-NLS-0$
			domNode.removeAttribute("disabled"); //$NON-NLS-0$
			domNode.removeAttribute("aria-disabled"); //$NON-NLS-0$
		},
		
		_disableControl: function(domNode) {
			domNode.classList.add("disabled"); //$NON-NLS-0$
			lib.setSafeAttribute(domNode, "disabled", "true");
			lib.setSafeAttribute(domNode, "aria-disabled", "true");
		},
		
		_isEnabled: function(domNode) {
			return !domNode.classList.contains("disabled"); //$NON-NLS-0$
		},
		
		_disableSwitch: function(wrapperNode){
			this._disableControl(wrapperNode);
			
			var switchNode = lib.$("div.orionSwitch", wrapperNode); //$NON-NLS-0$
			if (switchNode) {
				switchNode.removeAttribute("tabindex"); //$NON-NLS-0$
			}
		},
		
		_enableSwitch: function(wrapperNode){
			this._enableControl(wrapperNode);
			
			var switchNode = lib.$("div.orionSwitch", wrapperNode); //$NON-NLS-0$
			if (switchNode) {
				lib.setSafeAttribute(switchNode, "tabindex", "0");
			}
		},
		
		_enableLink: function(linkNode, href) {
			linkNode.href = href;
			this._enableControl(linkNode);
		},
		
		_disableLink: function(linkNode) {
			linkNode.removeAttribute("href"); //$NON-NLS-0$
			this._disableControl(linkNode);
		},
		
		_isLinkDisabled: function(linkNode) {
			return !linkNode.hasAttribute("href") || !linkNode.href; //$NON-NLS-0$
		},
		
		_linkClickListener: function(evnt) {
			var domNode = evnt.target;
			var id = domNode.id;
			var disabled = this._isLinkDisabled(domNode) ? ".disabled" : ""; //$NON-NLS-1$ //$NON-NLS-0$
			
			mMetrics.logEvent("ui", "invoke", METRICS_LABEL_PREFIX + "." + id +".clicked" + disabled, evnt.which); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		},
		
		_setNodeName: function(domNode, text) {
			lib.setSafeAttribute(domNode, "aria-label", text);
		},
		
		_setNodeTooltip: function(domNode, text) {
			var index = -1;
			if (domNode.tooltip) {
				domNode.tooltip.destroy();
				index = this._undestroyedTooltips.indexOf(domNode.tooltip);
				if (-1 !== index) {
					this._undestroyedTooltips.splice(index, 1);
				}
			}
			if (text) {
				domNode.tooltip = new mTooltip.Tooltip({
					node: domNode,
					text: text,
					trigger: "mouseover", //$NON-NLS-0$
					position: ["above", "below", "right", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-4$
				});
				this._undestroyedTooltips.push(domNode.tooltip);
			}
		},
		
		_setText: function(domNode, text) {
			lib.empty(domNode);
			if (text) {
				var textNode = document.createTextNode(text);
				domNode.appendChild(textNode);
			}
		},
		
		_getDisplayName: function(launchConfiguration) {
			if (!launchConfiguration) {
				return null;
			}
			var displayName = launchConfiguration.Name;
			
			if (!displayName || "default" === displayName) { //$NON-NLS-0$
				displayName = launchConfiguration.Params.Name;
				
				if (launchConfiguration.Params.Target && launchConfiguration.Params.Target.Space) {
					displayName += messages["displayNameSeparator"] + launchConfiguration.Params.Target.Space; //$NON-NLS-0$
					
					if (launchConfiguration.Params.Target.Org) {
						displayName += " / " + launchConfiguration.Params.Target.Org; //$NON-NLS-0$
					}
				}
			}
			
			return displayName;
		},
		
		_setLaunchConfigurationsLabel: function(launchConfiguration) {
			if (launchConfiguration) {
				var displayName = this._getDisplayName(launchConfiguration); //$NON-NLS-0$
				
				lib.empty(this._launchConfigurationsLabel);
				
				this._setText(this._appName, displayName);
				this._setText(this._appInfoSpan, null);
				
				this._launchConfigurationsLabel.appendChild(this._statusLight);
				this._launchConfigurationsLabel.appendChild(this._appName);
				this._launchConfigurationsLabel.appendChild(this._appInfoSpan);
			} else {
				this._setText(this._launchConfigurationsLabel, messages["selectLaunchConfig"]); //$NON-NLS-0$
			}
		},
		
		_playButtonCommand: function(buttonNode) {
			var launchConfiguration = this._selectedLaunchConfiguration;
			
			var deployFunction = function() {
				this._commandRegistry.runCommand("orion.launchConfiguration.deploy", launchConfiguration, this, null, null, buttonNode); //$NON-NLS-0$
			}.bind(this);
			
			var cancelFunction = function() {
				this._updateLaunchConfiguration(launchConfiguration);
			}.bind(this);
			
			this._preferences.get("/RunBar").then(function(prefs) { //$NON-NLS-0$
				var redeployWithoutConfirming = prefs[REDEPLOY_RUNNING_APP_WITHOUT_CONFIRMING];
				if (redeployWithoutConfirming) {
					deployFunction(); //user does not want a confirmation dialog, just deploy again
				} else {
					// need to confirm with user before redeploying over a running app
					// get the latest app status
					this._displayStatusCheck(launchConfiguration);
					var startTime = Date.now();
					this._checkLaunchConfigurationStatus(launchConfiguration).then(function(_status) {
						var interval = Date.now() - startTime;
						mMetrics.logTiming("deployment", "check status (deploy)", interval, launchConfiguration.Type); //$NON-NLS-1$ //$NON-NLS-2$

						var dialogTitle = messages["redeployConfirmationDialogTitle"]; //$NON-NLS-0$
						var appName = this._getDisplayName(launchConfiguration);
						var confirmMessage = i18nUtil.formatMessage(messages["redeployConfirmationDialogMessage"], appName); //$NON-NLS-0$
						
						launchConfiguration.status = _status;
						
						if (_status && ("STARTED" === _status.State)) { //$NON-NLS-0$
							this._confirmBeforeRedeploy(dialogTitle, confirmMessage, REDEPLOY_RUNNING_APP_WITHOUT_CONFIRMING, deployFunction, cancelFunction);
						} else {
							// app is not running, just deploy again
							deployFunction();
						}
					}.bind(this), deployFunction);
				}
			}.bind(this));
		},
		
		_confirmBeforeRedeploy: function(dialogTitle, confirmMessage, preferenceName, deployFunction, cancelFunction){
			// app is running, confirm with user if they wish to stop it and redeploy
			var confirmDialog = new mConfirmDialog.ConfirmDialog({
				title: dialogTitle,
				confirmMessage: confirmMessage,
				checkboxMessage: messages["redeployConfirmationDialogCheckboxMessage"] //$NON-NLS-0$
			});
			
			var handleDismiss = function(evnt) {
				var confirmed = evnt.value;
				var doNotConfirmAnymore = evnt.checkboxValue;
				
				if (doNotConfirmAnymore) {
					// save user preference to no longer display confirmation dialog
					var data = {};
					data[preferenceName] = true;
					this._preferences.put("/RunBar", data); //$NON-NLS-1$
				}
				
				if (confirmed) {
					deployFunction();
				} else {
					cancelFunction();
				}
			}.bind(this);

			// add listener which uses project name entered by user to create a new project
			confirmDialog.addEventListener("dismiss", handleDismiss); //$NON-NLS-0$
			confirmDialog.show();
		},
		
		_enableLaunchConfigurationsDropdown: function() {
			this._enableControl(this._launchConfigurationsWrapper);
			this._launchConfigurationsDropdownTriggerButton.disabled = false;
		},
		
		_disableLaunchConfigurationsDropdown: function() {
			this._disableControl(this._launchConfigurationsWrapper);
			this._launchConfigurationsDropdownTriggerButton.disabled = true;
		},
		
		_checkStatus: function() {
			var launchConfiguration = this._selectedLaunchConfiguration;
			if (!launchConfiguration) {
				this._stopStatusPolling();
				return;
			}
			if (launchConfiguration.status && launchConfiguration.status.State === "PROGRESS") {
				return;
			}
			var startTime = Date.now();
			if (this._pendingCheckStatus) {
				return;
			}
			this._pendingCheckStatus = this._checkLaunchConfigurationStatus(launchConfiguration);
			this._pendingCheckStatus.then(function(_status) {
				this._pendingCheckStatus = null;
				var interval = Date.now() - startTime;
				mMetrics.logTiming("deployment", "check status (poll)", interval, launchConfiguration.Type); //$NON-NLS-1$ //$NON-NLS-2$

				if (_status) {
					launchConfiguration.status = _status;
				}
				this._updateLaunchConfiguration(launchConfiguration);
			}.bind(this), function() {
				this._pendingCheckStatus = null;
			}.bind(this));
		},
		
		_startStatusPolling: function() {
			if (!this._statusPollingIntervalID) {
				this._statusPollingIntervalID = window.setInterval(this._checkStatus.bind(this), STATUS_POLL_INTERVAL_MS);
			}
		},
		
		_stopStatusPolling: function() {
			if (this._statusPollingIntervalID) {
				window.clearInterval(this._statusPollingIntervalID);
				this._statusPollingIntervalID = null;
			}
		}
	});

	return {
		RunBar: RunBar,
		METRICS_LABEL_PREFIX: METRICS_LABEL_PREFIX
	};
});
