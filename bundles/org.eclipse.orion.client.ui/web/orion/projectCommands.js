/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['require', 'i18n!orion/navigate/nls/messages', 'orion/webui/littlelib', 'orion/commands', 'orion/Deferred', 'orion/webui/dialogs/DirectoryPrompterDialog',
 'orion/commandRegistry', 'orion/i18nUtil', 'orion/webui/dialogs/PromptDialog', 'orion/widgets/projects/ProjectOptionalParametersDialog',
 'orion/fileCommands', 'orion/editorCommands', 'orion/EventTarget',
 'orion/URITemplate', 'orion/PageLinks', 'orion/objects', 'orion/preferences', 'orion/metrics'],
	function(require, messages, lib, mCommands, Deferred, DirectoryPrompterDialog, mCommandRegistry, i18nUtil, PromptDialog, ProjectOptionalParametersDialog, FileCommands, mEditorCommands, EventTarget,
		URITemplate, PageLinks, objects, mPreferences, mMetrics){
		var projectCommandUtils = {};

		var progress;
		var preferences;
		var deployStore;


	function forceSingleItem(item) {
		if (!item) {
			return {};
		}
		if (Array.isArray(item)) {
			if (item.length === 1) {
				item = item[0];
			} else {
				item = {};
			}
		}
		return item;
	}

	function getCommandParameters(mainParams, options, hiddenParams){
		if(!mainParams){
			return null;
		}
		var paramDescps = [];
		for(var i=0; i<mainParams.length; i++){
			if(mainParams[i].hidden){
				if(hiddenParams) hiddenParams[mainParams[i].id] = mainParams[i].value;
			} else {
				paramDescps.push(new mCommandRegistry.CommandParameter(mainParams[i].id, mainParams[i].type, mainParams[i].name));
			}
		}
		return new mCommandRegistry.ParametersDescription(paramDescps, options);
	}

	function handleParamsInCommand(func, data, dialogTitle){
		if(data.parameters && data.parameters.optionsRequested){
			var dialog = new ProjectOptionalParametersDialog.ProjectOptionalParametersDialog({title: dialogTitle, data: data, func: function(){
				data.parameters.optionsRequested = false;
				func(data);
			}.bind(this)});
			dialog.show();
			return;
		}

		var params = data.oldParams || {};
		var param;
		if(data.parameters){
			for (param in data.parameters.parameterTable) {
				params[param] = data.parameters.valueFor(param);
			}
		}
		if(data.parameters && data.parameters._options.optionalParams)
		for(var i=0; i<data.parameters._options.optionalParams.length; i++){
			param = data.parameters._options.optionalParams[i];
			params[param.id] = param.value;
		}
		return params;
	}


	var sharedLaunchConfigurationDispatcher;

	projectCommandUtils.getLaunchConfigurationDispatcher = function(){
		if(!sharedLaunchConfigurationDispatcher){
			sharedLaunchConfigurationDispatcher = new EventTarget();
		}
		return sharedLaunchConfigurationDispatcher;
	};

	var fileDispatcher = FileCommands.getModelEventDispatcher();

	fileDispatcher.addEventListener("delete", function(event){
		if(sharedLaunchConfigurationDispatcher){
			if(event.parent && event.parent.Name === "launchConfigurations"){
				sharedLaunchConfigurationDispatcher.dispatchEvent({type: "delete", oldValue: {File: event.oldValue}});
			} else if(event.oldValue && event.oldValue.Name === "launchConfigurations"){
				sharedLaunchConfigurationDispatcher.dispatchEvent({type: "deleteAll"});
			}
		}
	});

	function localHandleStatus(status, allowHTML, context) {
		if (status) {
			if (!allowHTML && typeof status.HTML !== "undefined") { //$NON-NLS-0$
				delete status.HTML;
			}
	
			if(status.Retry && status.Retry.parameters){
				if(status.forceShowMessage){
					progress.setProgressResult(status);
				}
				
				var options = {
					hasOptionalParameters: !!status.Retry.optionalParameters, 
					optionalParams: status.Retry.optionalParameters
				};
				context.data.parameters = getCommandParameters(status.Retry.parameters, options, context.oldParams);
				context.data.oldParams = context.oldParams;
				context.commandService.collectParameters(context.data);
			} else {
				storeLastDeployment(context.project.Name, context.deployService, context.launchConfiguration);
				if ( ("Error" === status.Severity) || ("Warning" === status.Severity) ) { //$NON-NLS-1$ //$NON-NLS-0$
					progress.setProgressResult(status); //show errors and warnings
				}
			}
	
			if(status.ToSave){
				context.projectClient.saveProjectLaunchConfiguration(context.project, status.ToSave.ConfigurationName, context.deployService.id, status.ToSave.Parameters, status.ToSave.Url, status.ToSave.ManageUrl, status.ToSave.Path, status.ToSave.Type, status.AdditionalConfiguration).then(
					function(configuration){
						storeLastDeployment(context.project.Name, context.deployService, configuration);
						if(sharedLaunchConfigurationDispatcher){
							sharedLaunchConfigurationDispatcher.dispatchEvent({type: "create", newValue: configuration });
						}
						if(configuration.File.parent.parent){
							fileDispatcher.dispatchEvent({type: "create", parent: configuration.File.parent.parent, newValue: configuration.File.parent, ignoreRedirect: true});
						}
						fileDispatcher.dispatchEvent({type: "create", parent: configuration.File.parent, newValue: configuration.File, ignoreRedirect: true});
					}, context.errorHandler
				);
			}
		}
		if (context.data.handler && typeof context.data.handler.focus === "function") {
			context.data.handler.focus();
		}
	}

	function storeLastDeployment(projectName, deployService, launchConfiguration){
		var action;
		if(deployStore){
			if(launchConfiguration){
				action = "orion.launchConfiguration.deploy." + launchConfiguration.ServiceId + launchConfiguration.Name;
			} else {
				action = "orion.project.deploy." + deployService.id;
			}
			deployStore[projectName] = action;
			preferences.put('/deploy/project', deployStore);
		}
		if(sharedLaunchConfigurationDispatcher){
			sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changedDefault", newValue: action });
		}
	}

	projectCommandUtils.getDefaultLaunchCommand = function(projectName){
		if(deployStore){
			return deployStore[projectName];
		}
	};

	/**
	 * @param enhansedLaunchConf
	 * 			Params passed to deploy service
	 * @param context.project
	 * @param context.deployService
	 * @param context.data
	 * @param context.errorHandler
	 * @param context.projectClient
	 * @param context.commandService
	 */
	function runDeploy(enhansedLaunchConf, context){
		var liveEditWrapper = lib.$("#liveEditSwitchWrapper"); //$NON-NLS-0$
		if (liveEditWrapper) {
			var liveEditCheck = lib.$(".orionSwitch", liveEditWrapper); //$NON-NLS-0$
			var liveEdit = liveEditCheck && liveEditCheck.getAttribute("aria-pressed") === "true"; //$NON-NLS-0$ //$NON-NLS-1$
		}
		var startTime = Date.now();

		if(context.deployService.getDeployProgressMessage){
			context.projectClient.formPluginLaunchConfiguration(enhansedLaunchConf).then(function(pluginLaunchConf){
				context.deployService.getDeployProgressMessage(context.project, pluginLaunchConf).then(function(message){
					deploy(message);
				}.bind(this), function(){
					deploy(context.deployService.name + " in progress");
				}.bind(this));
			}.bind(this));
		} else {
			deploy(context.deployService.name + " in progress");
		}

		function deploy(progressMessage){
			if(sharedLaunchConfigurationDispatcher && context.launchConfiguration){
				context.launchConfiguration.status = {State: "PROGRESS", Message: progressMessage, ShortMessage: messages["deploying"], Info: "Deploying" }; //$NON-NLS-1$ //$NON-NLS-0$
				sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: context.launchConfiguration }); //$NON-NLS-0$
			}
			
			context.projectClient.formPluginLaunchConfiguration(enhansedLaunchConf).then(function(pluginLaunchConf){
				context.deployService.deploy(context.project, pluginLaunchConf).then(function(result){
					var interval = Date.now() - startTime;
					mMetrics.logTiming("deployment", "deploy", interval, pluginLaunchConf.Type + (liveEdit ? " (live edit on)" : ""));

					if(!result){
						return;
					}

					if (result.UriTemplate) {
					    var options = {};
						options.uriTemplate = result.UriTemplate;
						options.width = result.Width;
						options.height = result.Height;
						options.id = result.UriTemplateId || context.deployService.id;
						context.oldParams = enhansedLaunchConf.Params;
						options.cancelled = function(status){
							localHandleStatus(status, null, context);
						};
						options.done = function(status){
							localHandleStatus(status, null, context);
						};
						options.status = function(status){
							localHandleStatus(status, null, context);
						};
						mEditorCommands.createDelegatedUI(options);
						return;
					}

					if(context.launchConfiguration && (result.State || result.CheckState)){
						context.launchConfiguration.status = result;
						if(sharedLaunchConfigurationDispatcher){
							sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: context.launchConfiguration});
						}
					}

					if(result.ToSave){
						context.projectClient.saveProjectLaunchConfiguration(context.project, result.ToSave.ConfigurationName, context.deployService.id, result.ToSave.Parameters, result.ToSave.Url, result.ToSave.ManageUrl, result.ToSave.Path, result.ToSave.Type, result.AdditionalConfiguration).then(
							function(configuration){
								storeLastDeployment(context.project.Name, context.deployService, configuration);
								if(sharedLaunchConfigurationDispatcher){
									sharedLaunchConfigurationDispatcher.dispatchEvent({type: "create", newValue: configuration});
								}
								if(configuration.File.parent.parent){
									fileDispatcher.dispatchEvent({type: "create", parent: configuration.File.parent.parent, newValue: configuration.File.parent, ignoreRedirect: true});
								}
								fileDispatcher.dispatchEvent({type: "create", parent: configuration.File.parent, newValue: configuration.File, ignoreRedirect: true});
							}, context.errorHandler
						);
					} else {
						storeLastDeployment(context.project.Name, context.deployService, context.launchConfiguration);
					}

				}, function(error){
					var interval = Date.now() - startTime;
					mMetrics.logTiming("deployment", "deploy (error)", interval, pluginLaunchConf.Type + (liveEdit ? " (live edit on)" : ""));

					if(error.Retry && error.Retry.parameters){
						if(error.forceShowMessage){
							context.errorHandler(error);
						}
						context.data.oldParams = enhansedLaunchConf.Params;
						var options = {
							hasOptionalParameters: !!error.Retry.optionalParameters, 
							optionalParams: error.Retry.optionalParameters
						};
						context.data.parameters = getCommandParameters(error.Retry.parameters, options, context.data.oldParams);
						context.commandService.collectParameters(context.data);
					} else {
						context.errorHandler(error);
						storeLastDeployment(context.project.Name, context.deployService, context.launchConfiguration);
						if((error.State || error.CheckState)){
							context.launchConfiguration.status = error;
						} else {
							context.launchConfiguration.status = {error: error};
						}
						if(sharedLaunchConfigurationDispatcher){
							sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: context.launchConfiguration});
						}
					}
				});
			}.bind(this));
		}
	}
	
	function runEdit(enhansedLaunchConf, context){

//		if(sharedLaunchConfigurationDispatcher && context.launchConfiguration){
//			context.launchConfiguration.status = {State: "PROGRESS", Message: progressMessage, ShortMessage: messages["deploying"]}; //$NON-NLS-1$ //$NON-NLS-0$
//			sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: context.launchConfiguration }); //$NON-NLS-0$
//		}
		
		context.projectClient.formPluginLaunchConfiguration(enhansedLaunchConf).then(function(pluginLaunchConf){
			context.deployService.edit(context.project, pluginLaunchConf).then(function(result){
				if(!result){
					return;
				}

				if (result.UriTemplate) {
				    var options = {};
					options.uriTemplate = result.UriTemplate;
					options.width = result.Width;
					options.height = result.Height;
					options.id = result.UriTemplateId || context.deployService.id;
					context.oldParams = enhansedLaunchConf.Params;
					options.cancelled = function(status){
						localHandleStatus(status, null, context);
					};
					options.done = function(status){
						localHandleStatus(status, null, context);
					};
					options.status = function(status){
						localHandleStatus(status, null, context);
					};
					mEditorCommands.createDelegatedUI(options);
					return;
				}

				if(context.launchConfiguration && (result.State || result.CheckState)){
					context.launchConfiguration.status = result;
					if(sharedLaunchConfigurationDispatcher){
						sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: context.launchConfiguration});
					}
				}

				if(result.ToSave){
					context.projectClient.saveProjectLaunchConfiguration(context.project, result.ToSave.ConfigurationName, context.deployService.id, result.ToSave.Parameters, result.ToSave.Url, result.ToSave.ManageUrl, result.ToSave.Path, result.ToSave.Type, result.AdditionalConfiguration).then(
						function(configuration){
							storeLastDeployment(context.project.Name, context.deployService, configuration);
							if(sharedLaunchConfigurationDispatcher){
								sharedLaunchConfigurationDispatcher.dispatchEvent({type: "create", newValue: configuration});
							}
							if(configuration.File.parent.parent){
								fileDispatcher.dispatchEvent({type: "create", parent: configuration.File.parent.parent, newValue: configuration.File.parent, ignoreRedirect: true});
							}
							fileDispatcher.dispatchEvent({type: "create", parent: configuration.File.parent, newValue: configuration.File, ignoreRedirect: true});
						}, context.errorHandler
					);
				}

			}, function(error){
				if(error.Retry && error.Retry.parameters){
					if(error.forceShowMessage){
						context.errorHandler(error);
					}
					context.data.oldParams = enhansedLaunchConf.Params;
					var options = {
						hasOptionalParameters: !!error.Retry.optionalParameters, 
						optionalParams: error.Retry.optionalParameters
					};
					context.data.parameters = getCommandParameters(error.Retry.parameters, options, context.data.oldParams);
					context.commandService.collectParameters(context.data);
				} else {
					context.errorHandler(error);
					storeLastDeployment(context.project.Name, context.deployService, context.launchConfiguration);
					if((error.State || error.CheckState)){
						context.launchConfiguration.status = error;
					} else {
						delete context.launchConfiguration.status;
					}
					if(sharedLaunchConfigurationDispatcher){
						sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: context.launchConfiguration});
					}
				}
			});
		}.bind(this));
	}

	function runDeleteLaunchConfiguration(launchConf, context){
		var msg = i18nUtil.formatMessage(messages["confirmLaunchDelete"], launchConf.Name);
		context.commandService.confirm(null, msg, messages.OK, messages.Cancel, true, function(doit) {
			if (!doit) return;
			var deferreds = [];
			deferreds.push(context.projectClient.deleteProjectLaunchConfiguration(launchConf)); /* deletes the launch configuration file if present */
			
			progress.showWhile(Deferred.all(deferreds), messages["deletingLaunchConfiguration"], true).then(function(){
				fileDispatcher.dispatchEvent({
					type: "delete",
					oldValue: launchConf.File, /* TODO: Find out what happens when there's no File */
					parent: launchConf.File.parent
				});
			}, context.errorHandler);
		});
	}

	var sharedDependencyDispatcher;

	projectCommandUtils.getDependencyDispatcher = function(){
		if(!sharedDependencyDispatcher){
			sharedDependencyDispatcher = new EventTarget();
		}
		return sharedDependencyDispatcher;
	};

	function initDependency(projectClient, commandService, errorHandler, handler, dependency, project, data, params){
			var actionComment;
			if(handler.actionComment){
				if(params){
					actionComment = handler.actionComment.replace(/\$\{([^\}]+)\}/g, function(str, key) {
						return params[key];
					});
				} else {
					actionComment = handler.actionComment;
				}
			} else {
				actionComment = messages["gettingContentFrom"]	+ handler.type;
			}
			progress.showWhile(handler.initDependency(dependency, params, project), actionComment).then(function(dependency){
				projectClient.addProjectDependency(project, dependency).then(function(){
						if(sharedDependencyDispatcher){
							sharedDependencyDispatcher.dispatchEvent({type: "create", newValue: dependency, project: project });
						}
					}, errorHandler);
			}, function(error){
				if(error.Retry && error.Retry.addParameters){
					data.oldParams = params || {};
					var options = {
						hasOptionalParameters: !!error.Retry.optionalParameters, 
						optionalParams: error.Retry.optionalParameters
					};
					data.parameters = getCommandParameters(error.Retry.addParameters, options, data.oldParams);
					commandService.collectParameters(data);
				}
				errorHandler(error);
			});
	}

	projectCommandUtils.createDependencyCommands = function(serviceRegistry, commandService, fileClient, projectClient, dependencyTypes) {
		progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$

		var messageService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
		
		function errorHandler(error) {
			if (progress) {
				progress.setProgressResult(error);
			} else {
				window.console.log(error);
			}
		}

		var connectDependencyCommand = new mCommands.Command({
			name: messages["connect"],
			tooltip: messages["fetchContent"],
			id: "orion.project.dependency.connect", //$NON-NLS-0$
			callback: function func(data) {
				var item = forceSingleItem(data.items);

				var params = handleParamsInCommand(func, data, messages["fetchContentOf"] + item.Dependency.Name);
				if(!params){
					return;
				}
				var projectHandler = projectClient.getProjectHandler(item.Dependency.Type);
				if(projectHandler.then){
					projectHandler.then(function(projectHandler){
						initDependency(projectClient, commandService, errorHandler,projectHandler, item.Dependency, item.Project, data, params);
					});
				} else {
					initDependency(projectClient, commandService, errorHandler,projectHandler, item.Dependency, item.Project, data, params);
				}

			},
			visibleWhen: function(item) {
				if(!(item.Dependency && item.Project && item.disconnected)){
					return false;
				}
				if (dependencyTypes) {
					for(var i=0; i<dependencyTypes.length; i++){
						if(dependencyTypes[i]===item.Dependency.Type){
							return true;
						}
					}
				}
				return false;
			}
		});
		commandService.addCommand(connectDependencyCommand);


		var disconnectDependencyCommand = new mCommands.Command({
			name: messages["disconnectFromProject"],
			tooltip: messages["doNotTreatThisFolder"],
			imageClass: "core-sprite-delete", //$NON-NLS-0$
			id: "orion.project.dependency.disconnect", //$NON-NLS-0$
			callback: function(data) {
				var item = forceSingleItem(data.items);
				progress.progress(projectClient.removeProjectDependency(item.Project, item.Dependency),
					i18nUtil.formatMessage("Removing ${0} from project ${1}", item.Dependency.Name, item.Project.Name)).then(function(resp){
						if(sharedDependencyDispatcher){
							sharedDependencyDispatcher.dispatchEvent({type: "delete", oldValue: item.Dependency, project: item.Project });
						}
					});
			},
			visibleWhen: function(item) {
				if(!(item.Dependency && item.Project)){
					return false;
				}
				return true;
			}
		});
		commandService.addCommand(disconnectDependencyCommand);

		var checkStateCommand = new mCommands.Command({
			name: messages["checkStatus"],
			tooltip: messages["checkApplicationStatus"],
			id: "orion.launchConfiguration.checkStatus", //$NON-NLS-0$
			callback: function func(data) {
				var item = forceSingleItem(data.items);
				
				var errorMessage = i18nUtil.formatMessage(messages["missingCredentials"], item.Type, item.Url); //$NON-NLS-0$
				
				var commonRetryOptions = {
					getCancelName: function(){
						return messages.Cancel;
					},
					getSubmitName: function(){
						return messages.Ok;
					}
				};
				
				messageService.close();
				
				if(!data.parameters && item.parametersRequested){
					messageService.setProgressResult({
						Message: errorMessage,
						Severity: "Warning" //$NON-NLS-0$
					});
					
					var options = objects.mixin({}, commonRetryOptions, {
						hasOptionalParameters: !!item.optionalParameters, 
						optionalParams: item.optionalParameters
					});
					
					data.parameters = getCommandParameters(item.parametersRequested, options, item.Params);
					data.oldParams = item.Params;
					commandService.collectParameters(data);
					return;
				}

				var params = handleParamsInCommand(func, data, messages["checkApplicationState"]);
				if(!params){
					return;
				}
				
				var launchConfToPass = objects.clone(item);
				launchConfToPass.Params = params;

				projectClient.getProjectDeployService(item.ServiceId, item.Type).then(function(service){
					if(sharedLaunchConfigurationDispatcher){
						item.status = {State: "PROGRESS", ShortMessage: messages["checkingStateShortMessage"]}; //$NON-NLS-1$ //$NON-NLS-0$
						sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: item });
					}
					if(service && service.getState){
						service.getState(launchConfToPass).then(function(result){
							item.status = result;
							if(sharedLaunchConfigurationDispatcher){
								sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: item });
							}
							//try to refresh other launchConfigurations from this service,
							//because maybe adding properties to one changed the status of others
							if(item.project && item.project.children){
								item.project.children.forEach(function(otherLaunch){
									if(item.ServiceId && item.Name && item.parametersRequested){
										if(otherLaunch.ServiceId === item.ServiceId && otherLaunch.Name !== item.Name){
											if(sharedLaunchConfigurationDispatcher){
												otherLaunch.status = {CheckState: true};
												sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: otherLaunch });
											}
										}
									}
								});
							}

						}, function(error){
							if(error.Retry){
								var options = objects.mixin({}, commonRetryOptions, {
									hasOptionalParameters: !!error.Retry.optionalParameters, 
									optionalParams: error.Retry.optionalParameters
								});
								
								messageService.setProgressResult({
									Message: error.Message || errorMessage,
									Severity: error.Severity || "Error" //$NON-NLS-0$
								});
																
								data.parameters = getCommandParameters(error.Retry.parameters, options, params);
								data.oldParams = params;
								commandService.collectParameters(data);
							} else {
								errorHandler(error);
								item.status = {error: error};
								if(sharedLaunchConfigurationDispatcher){
									sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: item });
								}
							}
						});
					}
				});


			},
			visibleWhen: function(items) {
				var item = forceSingleItem(items);
				return item.ServiceId && item.Name;
			}
		});
		commandService.addCommand(checkStateCommand);

		function createStartStopCommand(start){
			var stopApplicationCommand = new mCommands.Command({
				name: start ? messages["start"] :messages["stop"],
				tooltip: start ? messages["startApplication"] : messages["stopApplication"],
				id: start ? "orion.launchConfiguration.startApp" : "orion.launchConfiguration.stopApp", //$NON-NLS-0$
				imageClass: start ? "core-sprite-play" : "core-sprite-stop",
				callback: function func(data) {
					var item = forceSingleItem(data.items);

					data.oldParams = item.Params;

					var params = handleParamsInCommand(func, data, start? messages["startApplication"] : messages["stopApplication"]);
					if(!params){
						return;
					}

					var launchConfToPass = objects.clone(item);
					launchConfToPass.Params = params;

					var startTime = Date.now();
					projectClient.getProjectDeployService(item.ServiceId, item.Type).then(function(service){
						var progressMessage = start ? messages["starting"] : messages["stopping"]; //$NON-NLS-1$ //$NON-NLS-0$
						if(service && (start ? service.start : service.stop)){
							if(sharedLaunchConfigurationDispatcher){
								item.status = {State: "PROGRESS", ShortMessage: progressMessage}; //$NON-NLS-0$
								sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: item });
							}
							(start ? service.start : service.stop)(launchConfToPass).then(function(result){
								var interval = Date.now() - startTime;
								mMetrics.logTiming("deployment", start ? "restart" : "stop", interval, launchConfToPass.Type);

								item.status = result;
								if(sharedLaunchConfigurationDispatcher){
									sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: item });
								}
								if(result.ToSave){
									projectClient.saveProjectLaunchConfiguration(item.project, result.ToSave.ConfigurationName, service.id, result.ToSave.Parameters, result.ToSave.Url, result.ToSave.ManageUrl, result.ToSave.Path, result.ToSave.Type, result.ToSave.AdditionalConfiguration).then(
										function(configuration){
											storeLastDeployment(item.project.Name, service, configuration);
											if(sharedLaunchConfigurationDispatcher){
												sharedLaunchConfigurationDispatcher.dispatchEvent({type: "create", newValue: configuration });
											}
											if(configuration.File.parent.parent){
												fileDispatcher.dispatchEvent({type: "create", parent: configuration.File.parent.parent, newValue: configuration.File.parent, ignoreRedirect: true});
											}
											fileDispatcher.dispatchEvent({type: "create", parent: configuration.File.parent, newValue: configuration.File, ignoreRedirect: true});
										}, errorHandler
									);
								}
							}, function(error){
								if(error.Retry){
									var options = {
										hasOptionalParameters: !!error.Retry.optionalParameters, 
										optionalParams: error.Retry.optionalParameters,
										getCancelName: function(){
											return messages.Cancel;
										},
										getSubmitName: function(){
											return messages.Ok;
										}
									};
									data.parameters = getCommandParameters(error.Retry.parameters, options, params);
									data.oldParams = params;
									commandService.collectParameters(data);
								} else {
									item.status = {CheckState: true};
									sharedLaunchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: item });
									errorHandler(error);
								}
							});
						}
					});
				},
				visibleWhen: function(items) {
					var item = forceSingleItem(items);
					return item.ServiceId && item.Name && item.status && (start ? true /*item.status.State==="STOPPED"*/ : (item.status.State === "STARTED" || item.status.State === "PAUSED"));
				}
			});
			commandService.addCommand(stopApplicationCommand);
		}

		createStartStopCommand(true);
		createStartStopCommand(false);

		var manageLaunchConfigurationCommand = new mCommands.Command({
			name: messages["manage"],
			tooltip: messages["manageThisApplicationOnRemote"],
			id: "orion.launchConfiguration.manage",
			hrefCallback: function(data) {
				var item = forceSingleItem(data.items);
				if(item.ManageUrl){
					var uriTemplate = new URITemplate(item.ManageUrl);
					var params = objects.clone(item.Params);
					params.OrionHome = PageLinks.getOrionHome();
					var uri = uriTemplate.expand(params);
					if(!uri.indexOf("://")){
						uri = "http://" + uri;
					}
					return uri;
				}
			},
			visibleWhen: function(items) {
				var item = forceSingleItem(items);
				return item.ManageUrl;
			}
		});
		commandService.addCommand(manageLaunchConfigurationCommand);

		var deployLaunchConfigurationCommands = new mCommands.Command({
			name: messages["deploy"],
			tooltip: messages["deployThisApplication"], //$NON-NLS-0$
			id: "orion.launchConfiguration.deploy",
			imageClass: "core-sprite-deploy",
			callback: function func(data) {
				var item = forceSingleItem(data.items);

				if(!data.oldParams){
					data.oldParams = item.Params;
				}

				var params = handleParamsInCommand(func, data, i18nUtil.formatMessage(messages["deployItem"], item.Name));
				if(!params){
					return;
				}
				var launchConfToPass = objects.clone(item);
				launchConfToPass.Params = params;

				projectClient.getProjectDeployService(item.ServiceId, item.Type).then(function(service){
					if(service && service.deploy){
						fileClient.getWorkspace(item.project.ContentLocation).then(function(){
							runDeploy(launchConfToPass, {project: item.project, deployService: service, data: data, errorHandler: errorHandler, projectClient: projectClient, commandService: commandService, launchConfiguration: item});
						});
					}
				});
			},
			visibleWhen: function(items) {
				var item = forceSingleItem(items);
				return item.ServiceId && item.Name;
			}
		});
		commandService.addCommand(deployLaunchConfigurationCommands);

		var deleteLaunchConfigurationCommand = new mCommands.Command({
			name: messages["deleteLaunchConfiguration"],
			tooltip: messages["deleteLaunchConfiguration"],
			id: "orion.launchConfiguration.delete",
			imageClass: "core-sprite-trashcan",
			callback: function(data) {
				var item = forceSingleItem(data.items);
				fileClient.getWorkspace(item.project.ContentLocation).then(function(){
					projectClient.getProjectDeployService(item.ServiceId, item.Type).then(function(service){
						if(service){
							runDeleteLaunchConfiguration(item, {
								project: item.project,
								deployService: service,
								errorHandler: errorHandler,
								projectClient: projectClient,
								commandService: commandService
							});
						}
					});
				});
			},
			visibleWhen: function(items) {
				var item = forceSingleItem(items);
				return item.ServiceId && item.Name && item.Params;
			}
		});
		commandService.addCommand(deleteLaunchConfigurationCommand);
		
		var editLaunchConfigurationCommand = new mCommands.Command({
			name: messages["editLaunchConfiguration"],
			tooltip: messages["editLaunchConfiguration"],
			id: "orion.launchConfiguration.edit",
			imageClass: "core-sprite-edit",
			callback: function func(data) {
				var item = forceSingleItem(data.items);

				if(!data.oldParams){
					data.oldParams = item.Params;
				}

				var params = handleParamsInCommand(func, data, i18nUtil.formatMessage(messages["deployItem"], item.Name));
				if(!params){
					return;
				}
				var launchConfToPass = objects.clone(item);
				launchConfToPass.Params = params;

				projectClient.getProjectDeployService(item.ServiceId, item.Type).then(function(service){
					if(service && service.deploy){
						fileClient.getWorkspace(item.project.ContentLocation).then(function(){
							runEdit(launchConfToPass, {project: item.project, deployService: service, data: data, errorHandler: errorHandler, projectClient: projectClient, commandService: commandService, launchConfiguration: item});
						});
					}
				});
			},
			visibleWhen: function(items) {
				var item = forceSingleItem(items);
				return item.ServiceId && item.Name;
			}
		});
		commandService.addCommand(editLaunchConfigurationCommand);
	};

	/**
	 * Gets any add project dependency commands in the given <code>commandRegistry</code>. If {@link #createProjectCommands}, has not been called,
	 * this returns an empty array.
	 * @name orion.projectCommands.getAddDependencyCommands
	 * @function
	 * @param {orion.commandregistry.CommandRegistry} commandRegistry The command registry to consult.
	 * @returns {orion.commands.Command[]} All the add project dependency commands added to the given <code>commandRegistry</code>.
	 */
	projectCommandUtils.getAddDependencyCommands = function(commandRegistry) {
		var commands = [];
		for (var commandId in commandRegistry._commandList) {
			var command = commandRegistry._commandList[commandId];
			if (command.isAddDependency) {
				commands.push(command);
			}
		}
		return commands;
	};

	/**
	 * Gets any create project commands in the given <code>commandRegistry</code>. If {@link #createProjectCommands}, has not been called,
	 * this returns an empty array.
	 * @name orion.projectCommands.getDeployProjectCommands
	 * @function
	 * @param {orion.commandregistry.CommandRegistry} commandRegistry The command registry to consult.
	 * @returns {orion.commands.Command[]} All the create project commands added to the given <code>commandRegistry</code>.
	 */
	projectCommandUtils.getCreateProjectCommands = function(commandRegistry) {
		var commands = [];
		for (var commandId in commandRegistry._commandList) {
			var command = commandRegistry._commandList[commandId];
			if (command.isCreateProject) {
				commands.push(command);
			}
		}
		return commands;
	};

	/**
	 * Gets any deploy project commands in the given <code>commandRegistry</code>. If {@link #createProjectCommands}, has not been called,
	 * this returns an empty array.
	 * @name orion.projectCommands.getDeployProjectCommands
	 * @function
	 * @param {orion.commandregistry.CommandRegistry} commandRegistry The command registry to consult.
	 * @returns {orion.commands.Command[]} All the deploy project commands added to the given <code>commandRegistry</code>.
	 */
	projectCommandUtils.getDeployProjectCommands = function(commandRegistry) {
		var commands = [];
		for (var commandId in commandRegistry._commandList) {
			var command = commandRegistry._commandList[commandId];
			if (command.isDeployProject) {
				commands.push(command);
			}
		}
		return commands;
	};

	/**
	 * Gets any launch project commands in the given <code>commandRegistry</code>. If {@link #createProjectCommands}, has not been called,
	 * this returns an empty array.
	 * @name orion.projectCommands.getLaunchProjectCommands
	 * @function
	 * @param {orion.commandregistry.CommandRegistry} commandRegistry The command registry to consult.
	 * @returns {orion.commands.Command[]} All the launch project commands added to the given <code>commandRegistry</code>.
	 */
	projectCommandUtils.getLaunchProjectCommands = function(commandRegistry) {
		var commands = [];
		for (var commandId in commandRegistry._commandList) {
			var command = commandRegistry._commandList[commandId];
			if (command.isLaunchProject) {
				commands.push(command);
			}
		}
		return commands;
	};
	
	var explorer;

	projectCommandUtils.setExplorer = function(theExplorer) {
		explorer = theExplorer;
	};
	
	projectCommandUtils.getExplorer = function() {
		return explorer;
	};
	
	
	/**
	 * Creates the commands related to file management.
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry The service registry to use when creating commands
	 * @param {orion.commandregistry.CommandRegistry} commandRegistry The command registry to get commands from
	 * @param {orion.fileClient.FileClient} fileClient The file system client that the commands should use
	 * @name orion.projectCommands#createFileCommands
	 * @function
	 */
	projectCommandUtils.createProjectCommands = function(serviceRegistry, commandService, fileClient, projectClient, dependencyTypes, deploymentTypes) {
		if(!deployStore){
			preferences = serviceRegistry.getService("orion.core.preference");
			preferences.get('/deploy/project').then(
				function(deploySettings){
					deployStore = deploySettings;
				}
			);
		}

		progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
		function errorHandler(error) {
			if (progress) {
				progress.setProgressResult(error);
			} else {
				window.console.log(error);
			}
		}


		function dispatchNewProject(workspace, project){
			var dispatcher = FileCommands.getModelEventDispatcher();
			if(project.ContentLocation){
				return fileClient.read(project.ContentLocation, true).then(function(folder){
					dispatcher.dispatchEvent( { type: "create", parent: workspace, newValue: folder});
					return folder;
				},
				function(){
					dispatcher.dispatchEvent( { type: "create", parent: workspace, newValue: null});
				});
			}
			dispatcher.dispatchEvent( { type: "create", parent: workspace, newValue: null});
		}

		dependencyTypes =  dependencyTypes || [];

		var addFolderCommand = new mCommands.Command({
			name: messages["associatedFolder"],
			tooltip: messages["associateAFolderFromThe"],
			id: "orion.project.addFolder", //$NON-NLS-0$
			callback: function(data) {
				var item = forceSingleItem(data.items).Project;

				var dialog = new DirectoryPrompterDialog.DirectoryPrompterDialog({ title : messages["Choose a Folder"],
					serviceRegistry : serviceRegistry,
					fileClient : fileClient,
					func : function(targetFolder) {
						fileClient.read(targetFolder.Location, true).then(function(fileMetadata){

							function addFileDependency(){
								var fileLocation = "";
								var name = fileMetadata.Name;
								if(fileMetadata.Parents && fileMetadata.Parents.length>0){
									for(var i=fileMetadata.Parents.length-1; i>=0; i--){
										fileLocation+=fileMetadata.Parents[i].Name;
										fileLocation+= "/";
									}
									name += " (" + fileMetadata.Parents[fileMetadata.Parents.length-1].Name + ")";
								}
								fileLocation+=fileMetadata.Name;
								var dependency = {Name: name, Type: "file", Location: fileLocation};
								projectClient.addProjectDependency(item, {Name: name, Type: "file", Location: fileLocation}).then(function(){
									if(sharedDependencyDispatcher){
										sharedDependencyDispatcher.dispatchEvent({type: "create", newValue: dependency , project: item});
									}
								}, errorHandler);
							}

							if(!fileMetadata.Parents || fileMetadata.Parents.length===0){
								var otherTypesDefs = [];
								var isOtherDependency = false;
								for(var i=0; i<dependencyTypes.length; i++){
									if(isOtherDependency) {
										return;
									}
									var def = projectClient.getProjectHandler(dependencyTypes[i]).then(function(projectHandler){
										return projectHandler.getDependencyDescription(fileMetadata);
									});
									otherTypesDefs.push(def);
									def.then(function(dependency){
										if(dependency){
											isOtherDependency = true;
											projectClient.addProjectDependency(item, dependency).then(function(){
												if(sharedDependencyDispatcher){
													sharedDependencyDispatcher.dispatchEvent({type: "create", newValue: dependency, project: item});
												}
											}, errorHandler);
										}
									});
								}
								Deferred.all(otherTypesDefs).then(function(){
									if(!isOtherDependency){
										addFileDependency();
									}
								});
								return;
							}
							addFileDependency();
						}, errorHandler);
					}
				});

				dialog.show();

			},
			visibleWhen: function(item) {
				if (!explorer || !explorer.isCommandsVisible()) {
					return false;
				}
				return item.type==="Project" || explorer.treeRoot.type==="Project";
			}
		});
		addFolderCommand.isAddDependency = true;
		commandService.addCommand(addFolderCommand);

		function createAddDependencyCommand(type){
			return projectClient.getProjectHandler(type).then(function(handler){
				if(!handler.initDependency){
					return;
				}

				var commandParams = {
					name: handler.addDependencyName,
					id: "orion.project.adddependency." + type,
					tooltip: handler.addDependencyTooltip,
					callback: function func(data){
						var item = forceSingleItem(data.items).Project;

						var params = handleParamsInCommand(func, data, handler.addDependencyTooltip);
						if(!params){
							return;
						}

						var searchLocallyDeferred = new Deferred();
						handler.paramsToDependencyDescription(params).then(function(dependency){
							if(dependency && dependency.Location){
								fileClient.loadWorkspace(item.WorkspaceLocation).then(function(workspace){
									var checkdefs = [];
									var found = false;
									for(var i=0; i<workspace.Children.length; i++){
										if(found===true){
											break;
										}
										var def = handler.getDependencyDescription(workspace.Children[i]);
										checkdefs.push(def);
										(function(def){
											def.then(function(matches){
												if(matches && matches.Location === dependency.Location){
													found = true;
													searchLocallyDeferred.resolve(matches);
												}
											});
										})(def);
									}
									Deferred.all(checkdefs).then(function(){
										if(!found){
											searchLocallyDeferred.resolve();
										}
									});
								}, searchLocallyDeferred.reject);
							} else {
								searchLocallyDeferred.resolve();
							}
						}, errorHandler);

						progress.showWhile(searchLocallyDeferred, "Searching your workspace for matching content").then(function(resp){
							if(resp) {
								projectClient.addProjectDependency(item, resp).then(function(){
									if(sharedDependencyDispatcher){
										sharedDependencyDispatcher.dispatchEvent({type: "create", newValue: resp, project: item });
									}
								}, errorHandler);
							} else {
								initDependency(projectClient, commandService, errorHandler,handler, {}, item, data, params);
							}
						});

					},
					visibleWhen: function(item) {
						if (!explorer || !explorer.isCommandsVisible()) {
							return false;
						}
						return item.type==="Project" || explorer.treeRoot.type==="Project";
					}
				};
				
				var options = {
					hasOptionalParameters: !!handler.optionalParameters, 
					optionalParams: handler.optionalParameters
				};
				commandParams.parameters = getCommandParameters(handler.addParameters, options);

				var command = new mCommands.Command(commandParams);
				command.isAddDependency = true;
				commandService.addCommand(command);
			});
		}


		function createInitProjectCommand(type){
			return projectClient.getProjectHandler(type).then(function(handler){
				if(!handler.initProject){
					return;
				}

				var commandParams = {
					name: handler.addProjectName,
					id: "orion.project.createproject." + type,
					tooltip: handler.addProjectTooltip,
					callback: function func(data){
						var item = forceSingleItem(data.items);

						var params = handleParamsInCommand(func, data, handler.addProjectTooltip);
						if(!params){
							return;
						}

						var actionComment;
						if(handler.actionComment){
							if(params){
								actionComment = handler.actionComment.replace(/\$\{([^\}]+)\}/g, function(str, key) {
									return params[key];
								});
							} else {
								actionComment = handler.actionComment;
							}
						} else {
							actionComment = messages["gettingContentFrom"]	+ handler.type;
						}
						progress.showWhile(handler.initProject(params, {WorkspaceLocation: item.Location}), actionComment).then(function(project){
							dispatchNewProject(item, project);
						}, function(error){
							if(error.Retry && error.Retry.addParameters){
								var options = {
									hasOptionalParameters: !!error.Retry.optionalParameters, 
									optionalParams: error.Retry.optionalParameters
								};
								data.parameters = getCommandParameters(error.Retry.addParameters, options, params);
								data.oldParams = params;
								commandService.collectParameters(data);
							}
							errorHandler(error);
						});

					},
					visibleWhen: function(item) {
						if (!explorer || !explorer.isCommandsVisible()) {
							return false;
						}
						item = forceSingleItem(item);
						return item.Location;
					}
				};

				var options = {
					hasOptionalParameters: !!handler.optionalParameters, 
					optionalParams: handler.optionalParameters
				};
				commandParams.parameters = getCommandParameters(handler.addParameters, options);

				var command = new mCommands.Command(commandParams);
				command.isCreateProject = true;
				commandService.addCommand(command);
			});
		}

		var allContributedCommandsDeferreds = [];

			for(var type_no=0; type_no<dependencyTypes.length; type_no++){
				var dependencyType = dependencyTypes[type_no];
				allContributedCommandsDeferreds.push(createAddDependencyCommand(dependencyType));
				allContributedCommandsDeferreds.push(createInitProjectCommand(dependencyType));
			}

		var readmeFilename = "README.md"; //$NON-NLS-0$
		var addReadmeCommand = new mCommands.Command({
			name: messages["readMeCommandName"], //$NON-NLS-0$
			tooltip: messages["readMeCommandTooltip"], //$NON-NLS-0$
			id: "orion.project.create.readme", //$NON-NLS-0$
			callback: function(data){
				var item = forceSingleItem(data.items);
				progress.progress(fileClient.createFile(item.Project.ContentLocation, readmeFilename), i18nUtil.formatMessage("Creating ${0}", readmeFilename)).then(function(readmeMeta){ //$NON-NLS-0$
					function dispatch() {
						var dispatcher = FileCommands.getModelEventDispatcher();
						dispatcher.dispatchEvent({ type: "create", parent: item.Project.fileMetadata, newValue: readmeMeta }); //$NON-NLS-0$
					}
					if(item.Project){
						progress.progress(fileClient.write(readmeMeta.Location, "# " + item.Project.Name), "Writing sample readme").then(function(){ //$NON-NLS-1$ //$NON-NLS-0$
							dispatch();
						});
					} else {
						dispatch();
					}
				}, errorHandler);
			},
			visibleWhen: function(item) {
				if (!explorer || !explorer.isCommandsVisible()) {
					return false;
				}
				item = forceSingleItem(item);
				if(!item.Project || !item.Project.fileMetadata || !item.Project.fileMetadata.children || !item.Project.ContentLocation){
					return false;
				}
				var children = item.Project.fileMetadata.children;
				var hasReadMe = children.some(function(child){
					if(child.Name && (child.Name.toLowerCase() === readmeFilename.toLowerCase()) ){
						return true;
					}
					return false;
				});

				return !hasReadMe;
			}
		});

		commandService.addCommand(addReadmeCommand);

		var createBasicProjectCommand = new mCommands.Command({
			name: messages["basic"],
			tooltip: messages["createAnEmptyProject."],
			id: "orion.project.create.basic",
			parameters : new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("name", "text", messages["Name:"])]),
			callback: function(data) {
				var name = data.parameters.valueFor("name");
				if(!name){
					return;
				}
				var item = forceSingleItem(data.items);
				fileClient.getWorkspace(item.Location).then(function(workspace) {
					progress.progress(projectClient.createProject(workspace.ChildrenLocation, {Name: name}),i18nUtil.formatMessage( messages["Creating project ${0}"], name)).then(function(project){
						dispatchNewProject(workspace, project);
					}, errorHandler);
				});
			},
			visibleWhen: function(item) {
					if (!explorer || !explorer.isCommandsVisible()) {
						return false;
					}
					item = forceSingleItem(item);
					return(!!item.Location);
				}
			}
			);
			createBasicProjectCommand.isCreateProject = true;
			commandService.addCommand(createBasicProjectCommand);

			var createZipProjectCommand = new mCommands.Command({
			name: messages["zipArchiveCommandName"], //$NON-NLS-0$
			tooltip: messages["zipArchiveCommandTooltip"], //$NON-NLS-0$
			id: "orion.project.create.fromfile", //$NON-NLS-0$
			callback: function(data){
					var item = forceSingleItem(data.items);

					var fileInput = lib.node("fileSelectorInput"); //$NON-NLS-0$
					var cloneInput = fileInput.cloneNode(); // clone file input before its value is changed

					var projectNameDialog = new PromptDialog.PromptDialog({
						title: messages["Create new project"], //$NON-NLS-0$
						promptMessage: messages["Enter project name:"] //$NON-NLS-0$
					});


					var handleOk = function(event) { //$NON-NLS-0$
						var projectName = event.value;
						fileClient.getWorkspace(item.Location).then(function(workspace) {
							progress.progress(projectClient.createProject(workspace.ChildrenLocation, {Name: projectName}),i18nUtil.formatMessage( messages["Creating project ${0}"], projectName)).then(function(project){
								dispatchNewProject(workspace, project).then(function(fileMetadata) {
									for (var i = 0; i < fileInput.files.length; i++) {
										explorer._uploadFile(fileMetadata, fileInput.files.item(i), false);
									}
								});
							}, function(error) {
								var response = JSON.parse(error.response);
								var projectNameDialogRetry = new PromptDialog.PromptDialog({
									title: response.Message,
									promptMessage: messages["Enter project name:"] //$NON-NLS-0$
								});
								projectNameDialogRetry.addEventListener("ok", handleOk);
								projectNameDialogRetry.show();
							});
						});
					};

					// add listener which uses project name entered by user to create a new project
					projectNameDialog.addEventListener("ok", handleOk);

					var changeListener = function(){
						if (fileInput.files && fileInput.files.length > 0) {
							var nonZipFiles = [];
							// Simple check if file is zip format
							var zipFileTypes = ['application/octet-stream', 'multipart/x-zip', 'application/zip', 'application/zip-compressed', 'application/x-zip-compressed'];
							for (var i = 0; i < fileInput.files.length; i++) {
								if(zipFileTypes.indexOf(fileInput.files[i].type) == -1) {
									nonZipFiles.push('\"' + fileInput.files[i].name + '\"');
								}
							}
							var message;
							if(nonZipFiles.length > 5) {
								message = messages["notZipMultiple"];
							} else if (nonZipFiles.length > 0) {
								message = i18nUtil.formatMessage(messages["notZip"], nonZipFiles.join(', '));
							}
							if(nonZipFiles.length == 0) {
								projectNameDialog.show();
								fileInput.removeEventListener("change", changeListener);
							}else{
								var dialog = this.serviceRegistry.getService("orion.page.dialog");								
								dialog.confirm(message, function(result){
									if(result){
										projectNameDialog.show(); // ask user for project name
									}
									fileInput.removeEventListener("change", changeListener);
								});	
							}
						}else{
							fileInput.removeEventListener("change", changeListener);
						}
					}.bind(this);
					fileInput.addEventListener("change", changeListener);

					// Launch file picker. Note that at the time when this code was written, web browser
					// restrictions made it so that fileInput.click() cannot be called asynchronously.
					// e.g. cannot be called from event handler after the user enters the project name
					fileInput.click();

					//replace original fileInput so that change event always fires
					fileInput.parentNode.replaceChild(cloneInput, fileInput);
				},
			visibleWhen: function(item) {
					if (!explorer || !explorer.isCommandsVisible()) {
						return false;
					}
					item = forceSingleItem(item);
					return(!!item.Location);
				}
			}
			);
			createZipProjectCommand.isCreateProject = true;
			commandService.addCommand(createZipProjectCommand);

			var createSftpProjectCommand = new mCommands.Command({
				name: messages["sFTP"],
				tooltip: messages["createAProjectFromAn"],
				id: "orion.project.create.sftp",
				parameters : new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('name', 'text', messages['Name:']),  //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		                                                               		new mCommandRegistry.CommandParameter('url', 'url', messages['Url:'])]), //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				callback: function(data){
						var name = data.parameters.valueFor("name");
						if(!name){
							return;
						}
						var url = data.parameters.valueFor("url");
						if(!url){
							return;
						}
						var item = forceSingleItem(data.items);
						fileClient.getWorkspace(item.Location).then(function(workspace) {
							progress.progress(projectClient.createProject(workspace.ChildrenLocation, {Name: name, ContentLocation: url}), i18nUtil.formatMessage( messages["Creating project ${0}"], name)).then(function(project){
								dispatchNewProject(workspace, project);
							});
						});
					},
				visibleWhen: function(item) {
						if (!explorer || !explorer.isCommandsVisible()) {
							return false;
						}
						item = forceSingleItem(item);
						return(!!item.Location);
					}
				}
				);
				createSftpProjectCommand.isCreateProject = true;
				commandService.addCommand(createSftpProjectCommand);

			projectCommandUtils.createDependencyCommands(serviceRegistry, commandService, fileClient, projectClient, dependencyTypes);

			function createDeployProjectCommand(deployService){
				var command;
				var commandParams = {
					name: deployService.name,
					tooltip: deployService.tooltip,
					id: "orion.project.deploy." + deployService.id,
					callback: function func(data){
						var project = data.items;

						var params = handleParamsInCommand(func, data, deployService.tooltip);
						if(!params){
							return;
						}

						runDeploy({Params: params, Path: ""}, {
							project: project,
							deployService: deployService,
							data: data,
							errorHandler: errorHandler,
							projectClient: projectClient,
							commandService: commandService
						});

					},
					visibleWhen: function(item) {
						if (!(command.showCommand == undefined || command.showCommand)) return false;
						return projectClient.matchesDeployService(item, deployService);
					}
				};

				var options = {
					hasOptionalParameters: !!deployService.optionalParameters, 
					optionalParams: deployService.optionalParameters
				};
				commandParams.parameters = getCommandParameters(deployService.parameters, options);

				command = new mCommands.Command(commandParams);
				command.isDeployProject = true;
				commandService.addCommand(command);
			}

			if(deploymentTypes){
				for(var i=0; i<deploymentTypes.length; i++){
					var type = deploymentTypes[i];
					var deferred = new Deferred();
					allContributedCommandsDeferreds.push(deferred);
					(function(deferred){
						projectClient.getProjectDeployService(type).then(function(deployService){
							createDeployProjectCommand(deployService);
							deferred.resolve();
						});
					})(deferred);
				}
			}


			return Deferred.all(allContributedCommandsDeferreds);
		};

		return projectCommandUtils;
});
