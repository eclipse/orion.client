/******************************************************************************* 
 * @license
 * Copyright (c) 2011, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/

/*globals confirm */

define([
	'i18n!git/nls/gitmessages',
	'orion/i18nUtil',
	'orion/commandRegistry',
	'orion/git/gitPreferenceStorage',
	'orion/git/logic/gitCommon',
	'orion/Deferred',
	'orion/objects',
	'orion/urlModifier'
], function(messages,i18nUtil,mCommandRegistry,GitPreferenceStorage, mGitCommon, Deferred, objects, urlModifier) {
	
	var handleGitServiceResponse = mGitCommon.handleGitServiceResponse;
	var gatherSshCredentials = mGitCommon.gatherSshCredentials;
	
	/**
	 * Acts as a factory for push related functions.
	 * @param dependencies All required objects and values to perform the command
	 */
	return function(dependencies) {
		
		var serviceRegistry = dependencies.serviceRegistry;
		var commandService = dependencies.commandService;
		var tags = dependencies.tags;
		var force = dependencies.force;

		//Callbacks
		var sshCredentialsCallback = dependencies.sshCredentialsDialogCloseCallback;
		var sshSlideoutCallback = dependencies.sshSlideoutCloseCallback;
		
		var perform = function(data) {
			var d = new Deferred();
				
			var sshCredentialsDialogCallback = function () {
				if (typeof(sshCredentialsCallback) === "function") sshCredentialsCallback(); //$NON-NLS-0$
				d.reject();
			};
				
			var sshSlideoutCloseCallback = function () {
				if (typeof(sshSlideoutCallback) === "function") sshSlideoutCallback(); //$NON-NLS-0$
				d.reject();
			};
				
			function command(data) {
				//previously saved target branch
				var itemTargetBranch = data.targetBranch;
				
				var confirmedWarnings = data.confirmedWarnings;
				var doCommandWork = function(){
					var item = data.items;
					if (item.Remote) {
						itemTargetBranch = item.Remote;
					}
					if (item.LocalBranch) {
						item = item.LocalBranch;
					}
					if (item.toRef) {
						item = item.toRef;
					}
					var commandInvocation = data;
					if (!commandInvocation.command) {
						commandInvocation.command = {};
						commandInvocation.command.callback = command;
					}
	
					var handleResponse = function(jsonData, commandInvocation){
						if (jsonData.JsonData.HostKey){
							commandInvocation.parameters = null;
							commandInvocation.errorData = jsonData.JsonData;
							commandInvocation.errorData.failedOperation = jsonData.failedOperation;
							commandService.collectParameters(commandInvocation,sshSlideoutCloseCallback);
						} else if (!commandInvocation.optionsRequested){
							var gitPreferenceStorage = new GitPreferenceStorage(serviceRegistry);
							gitPreferenceStorage.isEnabled().then(
								function(isStorageEnabled) {
									var parameters = [];
									if (!jsonData.JsonData.User) {
										parameters.push(new mCommandRegistry.CommandParameter("sshuser", "text", messages['User Name:'])); //$NON-NLS-1$ //$NON-NLS-0$
									}
									parameters.push(new mCommandRegistry.CommandParameter("sshpassword", "password", messages['Password:'])); //$NON-NLS-1$ //$NON-NLS-0$
									if (jsonData.JsonData.GitHubAuth) {
										var listener;
										(function(authUrl) {
											listener = new mCommandRegistry.CommandEventListener("click", function(event, commandInvocation) { //$NON-NLS-0$
												window.location = urlModifier(authUrl);
											});
										})(jsonData.JsonData.GitHubAuth + "?ref=" + encodeURIComponent(window.location.href)); //$NON-NLS-0$
										parameters.push(new mCommandRegistry.CommandParameter("gitAuth", "button", null, "Authorize with GitHub", null, listener)); //$NON-NLS-1$ //$NON-NLS-0$
									}
									if (isStorageEnabled) {
										parameters.push(new mCommandRegistry.CommandParameter("saveCredentials", "boolean", messages["Don't prompt me again:"])); //$NON-NLS-1$ //$NON-NLS-0$
									}
									commandInvocation.parameters = new mCommandRegistry.ParametersDescription(parameters, {hasOptionalParameters: true});
									commandInvocation.errorData = jsonData.JsonData;
									commandInvocation.errorData.failedOperation = jsonData.failedOperation;
									commandService.collectParameters(commandInvocation, sshSlideoutCloseCallback);
								}
							);
						} else {
							commandInvocation.errorData = jsonData.JsonData;
							commandInvocation.errorData.failedOperation = jsonData.failedOperation;
							commandService.collectParameters(commandInvocation,sshSlideoutCloseCallback);
						}
					};
					
					if (commandInvocation.parameters && commandInvocation.parameters.optionsRequested){
						commandInvocation.parameters = null;
						commandInvocation.optionsRequested = true;
						commandService.collectParameters(commandInvocation,sshSlideoutCloseCallback);
						return;
					}
					var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					
					if(commandInvocation.errorData && commandInvocation.errorData.failedOperation){
						progress.removeOperation(commandInvocation.errorData.failedOperation);
					}
					
					var handlePush = function(options, location, ref, name, force){
						var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
						var deferred = progress.progress(gitService.doPush(location, ref, tags, force, //$NON-NLS-0$
								options.gitSshUsername, options.gitSshPassword, options.knownHosts,
								options.gitPrivateKey, options.gitPassphrase), messages['Pushing remote: '] + name);
						progressService.createProgressMonitor(deferred, messages['Pushing remote: '] + name);
						deferred.then(
							function(jsonData){
								handleGitServiceResponse(jsonData, serviceRegistry, 
									function() {
										if (!jsonData.HttpCode) {
											var display = {};
											display.HTML = true;
											display.Severity = jsonData.Severity || "Error"; //$NON-NLS-0$
											if (display.Severity !== "Ok") {
												var result = jsonData.Updates.length ? "<b>" +  messages["PushResult"] + "</b>\n" : ""; //$NON-NLS-0$ //$NON-NLS-1$
												result += "<table class=\"gitPushUpdates\">"; //$NON-NLS-0$
												jsonData.Updates.forEach(function (update) {
													var message = update.Message || messages["Push_" + update.Result] || "";
													result += "<tr>"; //$NON-NLS-0$
													result += "<td><b>" + update.LocalName + " => " + update.RemoteName + "</b></td><td>" + message + "</td>"; //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$
													result += "</tr>"; //$NON-NLS-0$
												});
												result += "</table>"; //$NON-NLS-0$
												if (jsonData.Message) {
													result +=  "<pre class=\"gitPushMessage\">" + jsonData.Message + "</pre>"|| ""; //$NON-NLS-0$ //$NON-NLS-1$
												}
												display.Message = "<span class=\"gitPushResult\">" + result + "</span>"; //$NON-NLS-0$ //$NON-NLS-1$
											} else {
												display.HTML = false;
												display.Message = i18nUtil.formatMessage(messages["PushingRemoteSucceeded"], name); //$NON-NLS-0$ 
												var isGerrit = name.split('/')[1];
												if (isGerrit === "for") {
													var idx = jsonData.Message.indexOf("New Changes:");
													if (idx>0) {
														var subMsg = jsonData.Message.slice(idx);
														var changeURLs = subMsg.match(/http[s]?:\/\/.*[\n\t ]/g);
														if (changeURLs) {
															display.Message = i18nUtil.formatMessage(messages["PushingGerritChangeSucceeded"], //$NON-NLS-0$ 
																name, changeURLs[0]);
														}
													}
												}
											}
											serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
										}
										if (itemTargetBranch && !itemTargetBranch.Id) {
											gitService.getGitBranch(itemTargetBranch.Location).then(function(remote) {
												objects.mixin(itemTargetBranch, remote);
												d.resolve();
											}, d.resolve);
										} else {
											d.resolve();
										}
									}, function (jsonData) {
										handleResponse(jsonData, commandInvocation);
									}
								);
							}, function(jsonData) {
								handleGitServiceResponse(jsonData, serviceRegistry, 
									function() {
										d.resolve();
									}, function (jsonData) {
										handleResponse(jsonData, commandInvocation);
									}
								);
							}
						);
					};
	
					gatherSshCredentials(serviceRegistry, commandInvocation,null,sshCredentialsDialogCallback).then(
						function(options) {
							if(itemTargetBranch){
								handlePush(options, itemTargetBranch.Location, "HEAD", itemTargetBranch.Name, force); //$NON-NLS-0$
								return;
							} else {
								d.reject();
							}
						}
					);
				};
				if(force && !confirmedWarnings){
					commandService.confirm(data.domNode, messages["OverrideContentOfRemoteBr"]+"\n\n"+messages['Are you sure?'], messages["OK"], messages["Cancel"], false, function(result){
						if(result){
							doCommandWork();
						}else{
							d.reject();
						}
					});
				}else{
					doCommandWork();
				}
			} 
			command(data);
			return d;
		};
		return {
			perform:perform,
		};
	};
});
