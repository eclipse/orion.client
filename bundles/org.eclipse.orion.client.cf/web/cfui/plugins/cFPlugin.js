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

define(['i18n!cfui/nls/messages', 'orion/xhr', 'orion/plugin', 'orion/cfui/cFClient', 'orion/cfui/manifestEditor', 'orion/serviceregistry', 'orion/i18nUtil', 'domReady!'],
		function(messages, xhr, PluginProvider, CFClient, mManifestEditor, ServiceRegistry, i18Util) {

	var temp = document.createElement('a');
	var login = temp.href;
	
	var headers = {
		name: "Cloud Foundry",
		version: "1.0",
		description: messages["thisPluginIntegratesWithCloud"]
	};

	var provider = new PluginProvider(headers);
	var cFService = new CFClient.CFService();

	// initialize service registry and EAS services
	var serviceRegistry = new ServiceRegistry.ServiceRegistry();
	
	temp.href = "../../prefs/user";
	var location = temp.href;
	
	function PreferencesProvider(location) {
		this.location = location;
	}

	PreferencesProvider.prototype = {
		get: function(name) {
			return xhr("GET", this.location + name, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: 15000,
				log: false
			}).then(function(result) {
				return result.response ? JSON.parse(result.response) : null;
			});
		},
		put: function(name, data) {
			return xhr("PUT", this.location + name, {
				data: JSON.stringify(data),
				headers: {
					"Orion-Version": "1"
				},
				contentType: "application/json;charset=UTF-8",
				timeout: 15000
			}).then(function(result) {
				return result.response ? JSON.parse(result.response) : null;
			});
		},
		remove: function(name, key){
			return xhr("DELETE", this.location + name +"?key=" + key, {
				headers: {
					"Orion-Version": "1"
				},
				contentType: "application/json;charset=UTF-8",
				timeout: 15000
			}).then(function(result) {
				return result.response ? JSON.parse(result.response) : null;
			});
		}
	};
	
	var service = new PreferencesProvider(location);
	serviceRegistry.registerService("orion.core.preference.provider", service, {});

	// cf settings
	var apiUrl = "";
	var manageUrl = "";
	provider.registerService("orion.core.setting", null, {
		settings: [{
			pid: "org.eclipse.orion.client.cf.settings",
			name: messages["URLs"],
			nls: "cfui/nls/messages",
			category: "cloud",
			categoryLabel: messages["Cloud Foundry"],
			properties: [{
				id: "targetUrl",
				name: messages["API URL"],
				type: "string",
				defaultValue: apiUrl
			}, {
				id: "manageUrl",
				name: messages["Manage URL"],
				type: "string",
				defaultValue: manageUrl
			}]
		}]
	});
	
	/////////////////////////////////////////////////////
	// add CF shell commands
	/////////////////////////////////////////////////////

	/** Register parent cf root command **/
	provider.registerServiceProvider(
		"orion.shell.command", null, {
		name: "cfo",
		description: messages["commandsForInteractingWithA"]
	});
	
	/** Add cf target command **/
	var targetImpl = {
		callback: function(args) {
			if (args.url) {
				return cFService.setTarget(args.url, args.org, args.space).then(function(result) {
					if (result) {
						return "target: " + result.Url;
					} else {
						return messages["targetNotSet"];
					}
				});
			} else {
				return cFService.getTarget().then(function(result) {
					return "target: " + result.Url;
				});
			}
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		targetImpl, {
			name: "cfo target",
			description: messages["setOrDisplayTheTarget"],
			parameters: [{
				name: "url",
				type: "string",
				description: messages["targetURLToSwitchTo"],
				defaultValue: null
			}, {
				name: "org",
				type: "string",
				description: messages["organization"],
				defaultValue: null
			}, {
				name: "space",
				type: "string",
				description: messages["space"],
				defaultValue: null
			}]
		}
	);
	
	/** Add cf info command **/
	var infoImpl = {
		callback: function(args) {
			return cFService.getInfo().then(function(result) {
				var value = result.description + 
					"\n" + messages["version:"] + result.version +
					"\n" + messages["support:"] + result.support;
				
				if (result.user) {
					value += "\n\n" + messages["user:"] + result.user;
				}
				
				return value;
			});
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		infoImpl, {
			name: "cfo info",
			description: messages["displayInformationOnTheCurrent"]
		}
	);
	
	/** Add cf orgs command **/
	function describeOrg(org) {
		var name = org.Name;
		var strResult = name;

		strResult += ": ";
		if (org.Spaces){
			org.Spaces.forEach(function(space, index){
				strResult += space.Name;
				if (index < org.Spaces.length - 1)
					strResult += ", ";
			});
		} else {
			strResult += messages["<none>"];
		}
		
		return strResult;
	}
	
	var orgsImpl = {
		callback: function(args) {
			return cFService.getOrgs().then(function(result) {
				result = result.Orgs;
				
				if (!result || result.length === 0) {
					return messages["noOrgs."];
				}
				var strResult = "";
				result.forEach(function(org) {
					strResult += describeOrg(org);
					strResult += "\n";
				});
				return strResult;
			});
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		orgsImpl, {
			name: "cfo orgs",
			description: messages["listAllOrgs"]
		}
	);
	
	/** Add cf login command **/
	var loginImpl = {
		callback: function(args) {
			return cFService.login(null, args.username, args.password,
				args.org, args.space).then(function(result) {
					return messages["loggedIn"];
				}
			);
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		loginImpl, {
			name: "cfo login",
			description: messages["logUserIn"],
			parameters: [{
				name: "username",
				type: "string",
				description: messages["username"],
				defaultValue: null
			}, {
				name: "password",
				type: "string",
				description: messages["password"],
				defaultValue: null
			}, {
				name: "org",
				type: "string",
				description: messages["organization"],
				defaultValue: null
			}, {
				name: "space",
				type: "string",
				description: messages["space"],
				defaultValue: null
			}]
		}
	);

	/** Add cf logout command **/
	var logoutImpl = {
		callback: function(args) {
			return cFService.logout().then(function(result) {
				return messages["loggedOut"];
			});
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		logoutImpl, {
			name: "cfo logout",
			description: messages["logUserOut"]
		}
	);
	
	/** Add cf apps command **/
	function describeApp(app) {
		var name = app.Name;
		var strResult = "\n" + name + "\t";
		return strResult;
	}
	
	var appsImpl = {
		callback: function(args) {
			return cFService.getApps().then(function(result) {
				result = result.Apps;
				
				if (!result || result.length === 0) {
					return messages["noApplications."];
				}
				var strResult = "\n"+messages["name"]+"\t"+messages["state"]+"\t"+messages["instances"]+"\t"+messages["memory"]+"\t"+messages["disk"]+"\t"+messages["urls"]+"\n";
				result.forEach(function(app) {
					strResult += describeApp(app);
				});
				return strResult;
			});
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		appsImpl, {
			name: "cfo apps",
			description: messages["listAllAppsInThe"]
		}
	);

	/** Add cf app command **/
	function describeAppVerbose(app) {
		var name = app.name;
		var strResult = "\n" + name + ": ";
		var runningInstances = app.running_instances;
		var instances = app.instances;
		if (!runningInstances) {
			runningInstances = 0;
		}
		var percentage = runningInstances / instances * 100;
		strResult += percentage + "%";
		strResult += "\n\t" + messages["usage:"] + app.memory + "M x ";
		strResult += i18Util.formatMessage(messages["${0}Instance(s)"], runningInstances);
		strResult += "\n\t" + messages["url:"];
		
		if (app.routes && app.routes.length > 0){
			var host = app.routes[0].host;
			var domain = app.routes[0].domain.name;
			var route = host + "." + domain;
			strResult += "[" + route + "](http://" + route + ")";
		}
		
		return strResult;
	}
	
	var appImpl = {
		callback: function(args, context) {
			return cFService.getApp(null, args.app, context.cwd).then(function(result) {
				if (!result) {
					return messages["applicationNotFound"];
				}
				return describeAppVerbose(result);
			});
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		appImpl, {
			name: "cfo app",
			description: messages["displayHealthAndStatusFor"],
			parameters: [{
				name: "app",
				type: "string",
				description: messages["applicationToShowInformationFor"],
				defaultValue: null
			}]
		}
	);
	
	/** Add cf push command **/
	var pushImpl = {
		callback: function(args, context) {
			return cFService.pushApp(null, args.app, decodeURIComponent(context.cwd)).then(
				function(result) {
					if (!result || !result.App) {
						return messages["applicationNotFound"];
					}
					
					return cFService.getApp(null, args.app, decodeURIComponent(context.cwd)).then(
						function(result) {
							if (!result) {
								return messages["applicationNotFound"];
							}
							return describeAppVerbose(result);
						}
					);
				}
			);
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		pushImpl, {
			name: "cfo push",
			description: messages["pushANewAppOr"],
			parameters: [{
				name: "app",
				type: "string",
				description: messages["applicationToPush"],
				defaultValue: null
			}]
		}
	);
	
	/** Add cf start command **/
	var startImpl = {
		callback: function(args, context) {
			return cFService.startApp(null, args.app, context.cwd).then(function(result) {
				if (!result || !result['0']) {
					return messages["applicationNotFound"];
				}
				
				var app = result['0'];
				if (app.state === "RUNNING"){
					return i18Util.formatMessage(messages["application${0}Started"], args.app);
				} else {
					return i18Util.formatMessage(messages["problemsWhileStartingApplication${0}"], args.app);
				}
			});
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		startImpl, {
			name: "cfo start",
			description: messages["startAnApplication"],
			parameters: [{
				name: "app",
				type: "string",
				description: messages["applicationToStart"],
				defaultValue: null
			}]
		}
	);

	/** Add cf stop command **/
	var stopImpl = {
		callback: function(args, context) {
			return cFService.stopApp(null, args.app, context.cwd).then(function(result) {
				if (!result || !result.entity) {
					return messages["applicationNotFound"];
				}
				var app = result.entity;
				if (app.state === "STOPPED"){
					return i18Util.formatMessage(messages["application${0}Stopped"], app.name);
				} else {
					return i18Util.formatMessage(messages["problemsWhileStoppingApplication${0}"], app.name);
				}
			});
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		stopImpl, {
			name: "cfo stop",
			description: messages["stopAnApplication"],
			parameters: [{
				name: "app",
				type: "string",
				description: messages["applicationToStop"],
				defaultValue: null
			}]
		}
	);
	
	/** Add cf routes command **/
	function describeRoute(route) {
		var host = route.Host;
		var domain = route.DomainName;
		var apps = route.Apps;
		var appsNum = route.Apps.length;

		var strResult = "\n" + host + "\t" + domain;

		if(appsNum != 0){
			strResult += "\t" + route.Apps[0].Name;
			if(appsNum > 1){
				for(var i = 1; i < appsNum; i++){
					strResult += ", " + route.Apps[i].Name;
				}
			}
		}
		return strResult;
	}
	
	var routesImpl = {
		callback: function(args) {
			return cFService.getRoutes().then(function(result) {
				if (!result || !result.Routes || result.Routes.length === 0) {
					return messages["noRoutes."];
				}
				var strResult = "\n" + messages["host"]+"\t\t\t\t"+messages["domain"]+"\t\t\t\t"+messages["apps"]+"\n";
				result.Routes.forEach(function(route) {
					strResult += describeRoute(route);
				});
				return strResult;
			});
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		routesImpl, {
			name: "cfo routes",
			description: messages["listAllRoutesInThe"]
		}
	);
	
	/** Add cf check-route command **/
	var checkRouteImpl = {
		callback: function(args, context){
			return cFService.checkRoute(null, args.domain, args.hostname).then(
				function(result){
					if(!result || !result.Route || result.Route.length === 0) {
						return i18Util.formatMessage(messages["Route${0}${1}DoesNotExist"], args.hostname, args.domain);
					} else {
						return i18Util.formatMessage(messages["Route${0}${1}DoesExist"], args.hostname, args.domain);
					}
				}
			);
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		checkRouteImpl, {
			name: "cfo check-route",
			description: messages["perfomSimpleCheckToDetermineWheterRouteExist"],
			parameters: [{
				name: "hostname",
				type: "string",
				description: messages["domain"]
			}, {
				name: "domain",
				type: "string",
				description: messages["hostname"]
			}]
		}
	);
	
	/** Add cf create-route command **/
	var createRouteImpl = {
		callback: function(args, context) {
			return cFService.createRoute(null, args.domain, args.hostname).then(function(result) {
				if (!result || result.Type !== "Route") {
					return messages["noRoutesFound"];
				}
				var strResult = "\n" + i18Util.formatMessage(messages["created${0}At${1}"], result.Host, args.domain);
				return strResult;
			});
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		createRouteImpl, {
			name: "cfo create-route",
			description: messages["createAUrlRouteIn"],
			parameters: [{
				name: "domain",
				type: "string",
				description: messages["domain"]
			}, {
				name: "hostname",
				type: "string",
				description: messages["hostname"]
			}]
		}
	);
	
	/** Add cf delete-route command **/
	var deleteRouteImpl = {
		callback: function(args, context) {
			return cFService.deleteRoute(null, args.domain, args.hostname).then(function(result) {
				if (!result || !result.Routes) {
					return messages["noRoutesFound"];
				}
				var strResult = "";
				result.Routes.forEach(function(item) {
					strResult += "\n" + i18Util.formatMessage(messages["deleted${0}At${1}"], item.Host, item.DomainName);
				});
				return strResult;
			});
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		deleteRouteImpl, {
			name: "cfo delete-route",
			description: messages["deleteARoute"],
			parameters: [{
				name: "domain",
				type: "string",
				description: messages["domain"]
			}, {
				name: "hostname",
				type: "string",
				description: messages["hostname"]
			}]
		}
	);
	
	/** Add cf delete-orphaned-routes command **/
	var deleteRouteImpl = {
		callback: function(args, context) {
			return cFService.deleteOrphanedRoutes(null).then(function(result) {
				if (!result || !result.Routes) {
					return messages["noOrphanedRoutes"];
				}
				var strResult = "";
				result.Routes.forEach(function(item) {
					strResult += "\n" + i18Util.formatMessage(messages["deleted${0}At${1}"], item.Host, item.DomainName);
				});
				return strResult;
			});
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		deleteRouteImpl, {
			name: "cfo delete-orphaned-routes",
			description: messages["deleteAllOrphanedRoutes(e.g.:"],
			parameters: []
		}
	);
	
	/** Add cf map-route command **/
	var mapRouteImpl = {
		callback: function(args, context) {
			return cFService.getApp(null, args.app, context.cwd).then(
				function(result){
					if (!result) {
						return messages["applicationNotFound"];
					}
					var appId = result.guid;
					return cFService.getRoute(null, args.domain, args.hostname).then(
						function(result) {
							var routeId;

							if (!result || !result.Routes || result.Routes.length === 0){
								return cFService.createRoute(null, args.domain, args.hostname).then(
									function(result) {
										if (!result || result.Type !== "Route") {
											return messages["noRoutesFound"];
										}
										routeId = result.Guid;
										return cFService.mapRoute(null, appId, routeId).then(
											function(result){
												return i18Util.formatMessage(messages["${0}SuccessfullyMappedTo${1}.${2}"], args.app, args.hostname, args.domain);
											}
										);
									}
								);
							} else {
								routeId = result.Routes[0].Guid;
								return cFService.mapRoute(null, appId, routeId).then(
									function(result){
										return i18Util.formatMessage(messages["${0}SuccessfullyMappedTo${1}.${2}"], args.app, args.hostname, args.domain);
									}
								);
							}
						}
					);
				}
			);
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		mapRouteImpl, {
			name: "cfo map-route",
			description: messages["addTheRouteToAn"],
			parameters: [{
				name: "app",
				type: "string",
				description: messages["applicationName:"]
			},{
				name: "domain",
				type: "string",
				description: messages["domain"]
			}, {
				name: "hostname",
				type: "string",
				description: messages["hostname"]
			}]
		}
	);

	/** Add cf unmap-route command **/
	var unmapRouteImpl = {
		callback: function(args, context) {
			return	cFService.getApp(null, args.app, context.cwd).then(
				function(result){
					if (!result) {
						return messages["applicationNotFound"];
					}
					var appId = result.guid;
					return cFService.getRoute(null, args.domain, args.hostname).then(
						function(result) {
							if (!result || !result.Routes || result.Routes.length === 0){
								return i18Util.formatMessage(messages["route${0}NotFound"], args.hostname + "." + args.domain);
							}
							var routeId = result.Routes[0].Guid;
							return cFService.unmapRoute(null, appId, routeId).then(
								function(result){
									return i18Util.formatMessage(messages["${0}SuccessfullyUnmappedFrom${1}.${2}"], args.app, args.hostname, args.domain);
								}
							);
						}	
					);
				}
			);
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		unmapRouteImpl, {
			name: "cfo unmap-route",
			description: messages["removeTheRouteFromAn"],
			parameters: [{
				name: "app",
				type: "string",
				description: messages["applicationName:"]
			},{
				name: "domain",
				type: "string",
				description: messages["domain"]
			}, {
				name: "hostname",
				type: "string",
				description: messages["hostname"]
			}]
		}
	);
	
	/** Add cf logs command **/
	var appLogsImpl = {
		callback: function(args, context) {
			return cFService.getLogz(null, args.app).then(function(result) {
				var logs = result.Messages;
				
				if (!logs || logs.length === 0) {
					return messages["noRecentLogs."];
				}
				var strResult = "";
				logs.forEach(function(log) {
					strResult += "\n" + log;
				});
				return strResult;
			});
		}
	};
	
	provider.registerServiceProvider(
		"orion.shell.command",
		appLogsImpl, {
			name: "cfo logs",
			description: messages["showRecentLogsForAn"],
			parameters: [{
				name: "app",
				type: "string",
				description: messages["applicationToShowLogsFor"],
				defaultValue: null
			}]
		}
	);
	
	/* Add a manifest editor content assist */
	provider.registerServiceProvider("orion.edit.contentAssist",
		mManifestEditor.contentAssistImpl, {
			name : messages["cloudFoundryManifestContentAssist"],
			contentType: ["text/x-yaml"]
		}
	);
	
	/* Add a manifest validator */
	provider.registerServiceProvider("orion.edit.validator",
		mManifestEditor.validatorImpl, {
			name : messages["cloudFoundryManifestValidator"],
			contentType: ["text/x-yaml"]
		}
	);
	
	provider.connect();
});
