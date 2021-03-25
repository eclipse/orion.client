/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser,amd*/
/*global URL confirm*/
define([
	'i18n!cfui/nls/messages',
	'orion/objects',
	'orion/Deferred',
	'cfui/cfUtil',
	'orion/URITemplate',
	'orion/PageLinks',
	'orion/i18nUtil'
], function(messages, objects, Deferred, mCfUtil, URITemplate, PageLinks, i18nUtil) {

	function CFDeployService(options) {
		options = options || {};
		this.serviceRegistry = options.serviceRegistry;
		this.projectClient = options.projectClient;
		this.fileClient = options.fileClient;
		this.cFService = options.cFService;
	}
	CFDeployService.prototype = {

		constructor: CFDeployService,

		_getTargets: function() {
			return mCfUtil.getTargets(this.serviceRegistry.getService("orion.core.preference")); //$NON-NLS-1$
		},

		getDeployProgressMessage: function(project, launchConf) {
			var message = messages["deployingApplicationToCloudFoundry:"];
			if (launchConf.ConfigurationName) {
				return message + " " + launchConf.ConfigurationName; //$NON-NLS-0$
			}
			var params = launchConf.Parameters || {};
			var appName = params.Name;
			if (!appName) {
				var manifestFolder = params.AppPath || "";
				manifestFolder = manifestFolder.substring(0, manifestFolder.lastIndexOf("/") + 1); //$NON-NLS-0$
				appName = messages["applicationFrom/"] + manifestFolder + "manifest.yml"; //$NON-NLS-0$
			}

			message += appName;

			if (params.Target) {
				message += messages["on"] + params.Target.Space + " / " + params.Target.Org; //$NON-NLS-0$
			}

			return message;
		},

		_getAdditionalLaunchConfigurations: function(launchConf, project, rawFile) {
			var projectClient = this.projectClient;
			var cFService = this.cFService;
			var fileClient = this.fileClient;
			return projectClient.getLaunchConfigurationsDir(project).then(function func(launchConfDir) {
				if (!launchConfDir) {
					return null;
				}
				
				if (launchConfDir.Children) {
					var sharedConfigurationName = projectClient.normalizeFileName(launchConf.ConfigurationName || launchConf.Name, ".yml");
					
					var launchConfigurationEntries = launchConfDir.Children;
					for (var i = 0; i < launchConfigurationEntries.length; ++i) {
						var lc = launchConfigurationEntries[i];

						if (lc.Name === sharedConfigurationName) {
							if (rawFile) {
								return lc;
							}
							return cFService.getManifestInfo(lc.Location, true).then(function(manifest) {
								return manifest.Contents;
							});
						}
					}
					return null;

				} else {
					return fileClient.fetchChildren(launchConfDir.ChildrenLocation).then(function(children) {
						launchConfDir.Children = children;
						return func(launchConfDir);
					});
				}

			});
		},

		_findManifest: function(location){
			
			location = location.replace("//", "/");
			
			var manifestFile = location.substring(location.lastIndexOf("/") + 1);
			var pathToFile = location.substring(0, location.lastIndexOf("/") + 1);
			
			if(manifestFile == ""){
				return this.fileClient.fetchChildren(location).then(function(children){
					var manifests = children.filter(function(child) {
						return child.Name === "manifest.yml"; //$NON-NLS-0$
					});

					if(manifests.length === 0)
						return null;
					else
						return manifests[0];
				});
			} else {
				return this.fileClient.fetchChildren(pathToFile).then(function(children){
					var manifests = children.filter(function(child) {
						return child.Name === manifestFile; //$NON-NLS-0$
					});

					if(manifests.length === 0)
						return null;
					else
						return manifests[0];
				});
			}
		},

		deploy: function(project, launchConf) {
			var that = this;
			var deferred = new Deferred();

			var params = launchConf.Parameters || {};
			var target = params.Target;
			if (!target && params.url) {
				target = {};
				target.Url = params.url;
			}

			if (params.user && params.password) {
				this.cFService.login(target.Url, params.user, params.password).then(

				function() {
					that._deploy(project, target, launchConf, deferred);
				}, function(error) {

					/* default cf error message decoration */
					error = mCfUtil.defaultDecorateError(error, target);
					deferred.reject(error);
				});
			} else {
				that._deploy(project, target, launchConf, deferred);
			}

			return deferred;
		},

		/* determines the deployment paths using the selected folder and project location. */
		_getDeploymentPaths: function(project, relativeFilePath, appPath){
			var deferred = new Deferred();
			var self = this;

			if(project.ContentLocation === relativeFilePath){
				/* use the project root as deployment path */
				deferred.resolve({
					path: relativeFilePath,
					appPath: appPath
				});

				return deferred;
			}

			/* use the project as deployment path */
			deferred.resolve({
				path: relativeFilePath,
				appPath: appPath || "" /* Note that the appPath has to be updated as well */
			});

			return deferred;
		},

		_deploy: function(project, target, launchConf, deferred) {
			var launchConfParams = launchConf.Parameters || {};
			var appName = launchConfParams.Name;
			var appPath = typeof launchConf.Path === 'string' ? launchConf.Path : 'manifest.yml';
			var launchConfName = launchConf.ConfigurationName;

			if (target && appName) {
				var errorHandler = function(error) {
					/* default cf error message decoration */
					error = mCfUtil.defaultDecorateError(error, target);
					if (error.HttpCode === 404) deferred.resolve(error);
					else deferred.reject(error);
				};

				var self = this;

				var getTargets = this._getTargets();
				getTargets.then(function(result){

					result.clouds.forEach(function(cloud){
						if(cloud.Url === target.Url && cloud.ManageUrl){
							target.ManageUrl = cloud.ManageUrl;
						}
					});

					self._getAdditionalLaunchConfigurations(launchConf, project).then(function performPush(manifest) {
						if (manifest === null) {
							/* could not find the launch configuration manifest, get the main manifest.yml if present */
							self._findManifest(project.ContentLocation + appPath).then(function(manifest) {

								if (manifest === null) {
									if (appName) {
										// a minimal manifest contains just the application name
										performPush({
											applications: [{
												"name": appName
											}]
										});
									} else {
										/* the deployment will not succeed anyway */								
										deferred.reject({
											State: "NOT_DEPLOYED", //$NON-NLS-0$
											Severity: "Error", //$NON-NLS-0$
											Message: messages["Could not find the launch configuration manifest"]
										});									
									}
									
								} else {
									self.cFService.getManifestInfo(manifest.Location, true).then(function(manifest) {
										performPush(manifest.Contents);
									}, deferred.reject);
								}
							}.bind(self), errorHandler);
						} else {
							var devMode = launchConfParams.DevMode;
							var appPackager;
							
							var instrumentation = launchConfParams.Instrumentation || {};
							var mergedInstrumentation = objects.clone(instrumentation);
							if (devMode && devMode.On) {
								appPackager = devMode.Packager;
								var devInstrumentation = devMode.Instrumentation;
								
								/* Manifest instrumentation contains only simple key, value entries */
								objects.mixin(mergedInstrumentation, devInstrumentation);
							}
	
							self.cFService.pushApp(target, appName, decodeURIComponent(project.ContentLocation + appPath), manifest, appPackager, mergedInstrumentation).then(function(result) {
								var expandedURL = new URITemplate("{+OrionHome}/edit/edit.html#{,ContentLocation}").expand({ //$NON-NLS-0$
									OrionHome: PageLinks.getOrionHome(),
									ContentLocation: project.ContentLocation,
								});
	
								var appName = result.App.name || result.App.entity.name;
								mCfUtil.prepareLaunchConfigurationContent(launchConfName, target, appName, appPath, instrumentation, devMode).then(
								deferred.resolve, deferred.reject);
							}, errorHandler);
						}
					}, errorHandler);
				}, errorHandler);

			} else {
				var serviceRegistry = this.serviceRegistry;
				var wizardReferences = serviceRegistry.getServiceReferences("orion.project.deploy.wizard"); //$NON-NLS-0$
				
				var feasibleDeployments = [];
				wizardReferences.forEach(function(wizard) {
					feasibleDeployments.push({
						wizard: serviceRegistry.getService(wizard)
					});
				});
				
				feasibleDeployments[0].wizard.getInitializationParameters().then(function(initParams) {
					deferred.resolve({
						UriTemplate: initParams.LocationTemplate + "#" + encodeURIComponent(JSON.stringify({ //$NON-NLS-0$
							ContentLocation: project.ContentLocation,
							AppPath: appPath,
							ConfParams: launchConfParams,
							ConfName: launchConfName
						})),
						Width: initParams.Width,
						Height: initParams.Height,
						UriTemplateId: "org.eclipse.orion.client.cf.deploy.uritemplate" //$NON-NLS-0$
					});
				});
			}
		},
		
		edit: function(project, launchConf) {
			var that = this;
			var deferred = new Deferred();

			var params = launchConf.Parameters || {};
			var target = params.Target;
			if (!target && params.url) {
				target = {};
				target.Url = params.url;
			}

			if (params.user && params.password) {
				this.cFService.login(target.Url, params.user, params.password).then(

				function() {
					that._edit(project, target, launchConf, deferred);
				}, function(error) {

					/* default cf error message decoration */
					error = mCfUtil.defaultDecorateError(error, target);
					deferred.reject(error);
				});
			} else {
				that._edit(project, target, launchConf, deferred);
			}

			return deferred;
		},
		
		_edit: function(project, target, launchConf, deferred) {
			var launchConfParams = launchConf.Parameters || {};
			var appName = launchConfParams.Name;
			var appPath = typeof launchConf.Path === 'string' ? launchConf.Path : 'manifest.yml';
			var launchConfName = launchConf.ConfigurationName;
			
			var serviceRegistry = this.serviceRegistry;
			var wizardReferences = serviceRegistry.getServiceReferences("orion.project.deploy.wizard"); //$NON-NLS-0$
			
			var feasibleDeployments = [];
			wizardReferences.forEach(function(wizard) {
				feasibleDeployments.push({
					wizard: serviceRegistry.getService(wizard)
				});
			});
			
			feasibleDeployments[0].wizard.getInitializationParameters().then(function(initParams) {
				deferred.resolve({
					UriTemplate: initParams.LocationTemplate + "#" + encodeURIComponent(JSON.stringify({ //$NON-NLS-0$
						ContentLocation: project.ContentLocation,
						AppPath: appPath,
						ConfParams: launchConfParams,
						ConfName: launchConfName
					})),
					Width: initParams.Width,
					Height: initParams.Height,
					UriTemplateId: "org.eclipse.orion.client.cf.deploy.uritemplate" //$NON-NLS-0$
				});
			});
		},

		_retryWithLogin: function(props, func) {
			if (props.user && props.password) {
				return this.cFService.login(props.Target.Url, props.user, props.password).then(function() {
					return func(props);
				}, function(error) {
					error.Retry = {
						parameters: [{
							id: "user", //$NON-NLS-0$
							type: "text", //$NON-NLS-0$
							name: messages["user:"]
						}, {
							id: "password", //$NON-NLS-0$
							type: "password", //$NON-NLS-0$
							name: messages["password:"]
						}]
					};
					throw error;
				});
			}
			return func(props);
		},

		getState: function(launchConf) {
			var params = launchConf.Params || launchConf.Parameters || {};
			return this._retryWithLogin(params, this._getStateCF.bind(this));
		},

		_getStateCF: function(params) {
			if (params.Target && params.Name) {
				return this.cFService.getApp(params.Target, params.Name).then(function(result) {
					var app = result;
					var appState = {
						Name: app.name,
						Guid: app.guid,
						State: (app.running_instances > 0 ? "STARTED" : "STOPPED"), //$NON-NLS-0$//$NON-NLS-1$
						Message: i18nUtil.formatMessage(messages["${0}of${1}instance(s)Running"], app.running_instances, app.instances),
						Environment: app.environment_json
					};
					var routes = app.routes;
					if (routes.length > 0) {							
						appState.Url = "https://" + routes[0].host + "." + routes[0].domain.name;
					}
					return appState;
				}, function(error) {
					if (error && error.HttpCode === 401) {
						error = mCfUtil.defaultDecorateError(error, params.Target);
						throw error;
					}
					return this._getTargets().then(function(result){
						if(result.clouds){
							result.clouds.forEach(function(data){
								if (params.Target.Url === data.Url){
									params.Target.meta = data;
								}
							});
						}
						/* default cf error message decoration */
						error = mCfUtil.defaultDecorateError(error, params.Target);
						if (error.HttpCode === 404) {
							return error;
						} else {
							throw error;
						}
					});
				}.bind(this));
			};
			return new Deferred().reject("missing target and/or name"); // do we need this or will cfService.startApp check this for us
		},

		start: function(launchConf) {
			var params = launchConf.Params || {};
			return this._retryWithLogin(params, this._startCF.bind(this));
		},

		_startCF: function(params) {
			if (params.Target && params.Name) {
				return this.cFService.startApp(params.Target, params.Name, undefined, params.Timeout).then(function(result) {
					return {
						CheckState: true
					};
				}, function(error) {

					/* default cf error message decoration */
					error = mCfUtil.defaultDecorateError(error, params.Target);
					if (error.HttpCode === 404) {
						return error;
					}
					throw error;
				});
			}
			return new Deferred().reject("missing target and/or name"); // do we need this or will cfService.startApp check this for us
		},

		stop: function(launchConf) {
			var params = launchConf.Params || {};
			return this._retryWithLogin(params, this._stopCF.bind(this));
		},

		_stopCF: function(params, deferred) {
			if (params.Target && params.Name) {
				return this.cFService.stopApp(params.Target, params.Name).then(function(result) {
					return {
						CheckState: true
					};
				}, function(error) {

					/* default cf error message decoration */
					error = mCfUtil.defaultDecorateError(error, params.Target);
					if (error.HttpCode === 404) {
						return error;
					} else {
						throw error;
					}
				});
			}
			return new Deferred().reject("missing target and/or name"); // do we need this or will cfService.stopApp check this for us
		},
		
		/**
		 * Delegates to @ref cFClient.js->getDeploymentPlans()
		 */
		getDeploymentPlans: function(projectContentLocation) {
			return this.cFService.getDeploymentPlans(projectContentLocation);
		}
	};

	return CFDeployService;
});
