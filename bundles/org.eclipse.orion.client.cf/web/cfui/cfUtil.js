/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser,amd*/
define(['i18n!cfui/nls/messages', 'orion/Deferred', 'orion/i18nUtil', 'orion/URITemplate', 'orion/PageLinks', 'orion/i18nUtil', 'cfui/manifestUtils'],
	function(messages, Deferred, i18nUtil, URITemplate, PageLinks, i18Util, mManifestUtils){

	function handleNoCloud(error) {
		error = error || {};
		var cloudSettingsPageUrl = new URITemplate("{+OrionHome}/settings/settings.html#,category=cloud").expand({ //$NON-NLS-0$
			OrionHome : PageLinks.getOrionHome()
		});
		error.Message = i18nUtil.formatMessage(messages["deploy.setUpYourCloud"], cloudSettingsPageUrl);
		error.Severity = "Warning"; //$NON-NLS-0$
		return new Deferred().reject(error);
	}

	return {

		getTargets : function(preferences) {
			return preferences.get('/cm/configurations').then(function(settings){ //$NON-NLS-0$
				var cloud = settings["org.eclipse.orion.client.cf.settings"]; //$NON-NLS-0$
				if (cloud && cloud.targetUrl){
					var Target = {};
					Target.clouds = [];
					var newTarget = {}
					newTarget.Url = cloud.targetUrl;
					newTarget.Name = cloud.targetUrl;
					if (cloud.manageUrl)
						newTarget.ManageUrl = cloud.manageUrl;
					
					Target.clouds.push(newTarget);
					return Target;
				}
				return handleNoCloud();
			}, handleNoCloud);
		},

		getDefaultTarget: function(/*resource*/){
			var clientDeferred = new Deferred();
			clientDeferred.resolve({});
			return clientDeferred;
		},

		getLoginMessage: function(/*manageUrl*/){
			return messages["deploy.enterCredentials"];
		},
		
		prepareLaunchConfigurationContent : function(configName, target, appName, appPath, instrumentation){
			var deferred = new Deferred();

			var launchConf = {
				CheckState: true,
				ToSave: {
					ConfigurationName: configName,
					Parameters: {
						Target: {
							Url: target.Url,
							Org: target.Org,
							Space: target.Space,
						},
						Name: appName
//						Timeout: resp.Timeout
					},
					Type: "Cloud Foundry", //$NON-NLS-0$
					Path: appPath
				}
			};

			/* additional configuration */
			if(instrumentation){
				launchConf.ToSave.Parameters.Instrumentation = instrumentation;
			}

			deferred.resolve(launchConf);
			return deferred;
		},
		
		/**
		 * Decorates the given error object.
		 */
		defaultDecorateError : function(error, target){
			error.Severity = "Error"; //$NON-NLS-0$

			if (error.Message && error.Message.indexOf("The host is taken") === 0) //$NON-NLS-0$
				error.Message = messages["theHostIsAlreadyIn"];

			if (error.HttpCode === 404){

				error = {
					State: "NOT_DEPLOYED", //$NON-NLS-0$
					Message: error.Message,
					Severity: "Error" //$NON-NLS-0$
				};

			} else if (error.JsonData && error.JsonData.error_code) {
				var err = error.JsonData;
				if (err.error_code === "CF-InvalidAuthToken" || err.error_code === "CF-NotAuthenticated"){ //$NON-NLS-0$ //$NON-NLS-1$

					error.Retry = {
						parameters: [{
							id: "user", //$NON-NLS-0$
							type: "text", //$NON-NLS-0$
							name: messages["iD:"]
						}, {
							id: "password", //$NON-NLS-0$
							type: "password", //$NON-NLS-0$
							name: messages["password:"]
						}, {
							id: "url", //$NON-NLS-0$
							hidden: true,
							value: target.Url
						}]
					};

					error.forceShowMessage = true;
					error.Severity = "Info"; //$NON-NLS-0$
					error.Message = this.getLoginMessage(target.ManageUrl);

				} else if (err.error_code === "CF-TargetNotSet"){ //$NON-NLS-0$
					var cloudSettingsPageUrl = new URITemplate("{+OrionHome}/settings/settings.html#,category=cloud").expand({OrionHome : PageLinks.getOrionHome()}); //$NON-NLS-0$
					error.Message = i18Util.formatMessage(messages["setUpYourCloud.Go"], cloudSettingsPageUrl);

				} else if (err.error_code === "ServiceNotFound"){
					if(target.ManageUrl){
						var redirectToDashboard = target.ManageUrl;
						var serviceName = err.metadata.service;
						error.Message = i18Util.formatMessage(messages["service${0}NotFoundsetUpYourService.Go${1}"], serviceName, redirectToDashboard);
					}
				}
			}

			return error;
		},

		/**
		 * Builds a default error handler which handles the given error
		 * in the wizard without communication with the parent window.
		 */
		buildDefaultErrorHandler : function(options){
			var cFService = options.cFService;

			var showMessage = options.showMessage;
			var hideMessage = options.hideMessage;
			var showError = options.showError;
			var render = options.render;

			var self = this;
			var handleError = function(error, target, retryFunc){
				error = self.defaultDecorateError(error, target);
				showError(error);

				if(error.Retry && error.Retry.parameters){

					var paramInputs = {};
					function submitParams(){

						var params = {};
						error.Retry.parameters.forEach(function(param){
							if(param.hidden)
								params[param.id] = param.value;
							else
								params[param.id] = paramInputs[param.id].value;
						});

						/* handle login errors */
						if(params.url && params.user && params.password){
							showMessage(i18Util.formatMessage(messages["loggingInTo${0}..."], params.url));
							cFService.login(params.url, params.user, params.password).then(function(result){

								hideMessage();
								if(retryFunc)
									retryFunc(result);

							}, function(newError){
								hideMessage();
								if(newError.HttpCode === 401)
									handleError(error, target, retryFunc);
								else
									handleError(newError, target, retryFunc);
							});
						}
					}

					var fields = document.createElement("div"); //$NON-NLS-0$
					fields.className = "retryFields"; //$NON-NLS-0$
					var firstField;

					error.Retry.parameters.forEach(function(param, i){
						if(!param.hidden){

							var div = document.createElement("div"); //$NON-NLS-0$
							var label = document.createElement("label"); //$NON-NLS-0$
							label.appendChild(document.createTextNode(param.name));

							var input = document.createElement("input"); //$NON-NLS-0$
							if(i===0)
								firstField = input;

							input.type = param.type;
							input.id = param.id;
							input.onkeydown = function(event){
								if(event.keyCode === 13)
									submitParams();
								else if(event.keyCode === 27)
									hideMessage();
							};

							paramInputs[param.id] = input;
							div.appendChild(label);
							div.appendChild(input);
							fields.appendChild(div);
						}
					});

					var submitButton = document.createElement("button"); //$NON-NLS-0$
					submitButton.appendChild(document.createTextNode(messages["submit"]));
					submitButton.onclick = submitParams;

					fields.appendChild(submitButton);
					render(fields);

					if(firstField)
						firstField.focus();
				}
			};

			return handleError;
		}
	};
});
