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

/*eslint-env browser, amd*/
define(['i18n!cfui/nls/messages', 'require', 'orion/xhr', 'orion/Deferred', 'orion/operation'], function(messages, require, xhr, Deferred, operation) {

	var eclipse = eclipse || {};

	eclipse.CFService = (function(){

		var contentType = "application/json; charset=UTF-8";

		/**
		 * Creates a new CF service.
		 *
		 * @class Provides operations for interacting with Cloud Foundry
		 * @name org.eclipse.orion.client.cf.CFService
		 */
		function CFService(serviceRegistry) {
			if (serviceRegistry) {
				this._serviceRegistry = serviceRegistry;
				this._serviceRegistration = serviceRegistry.registerService(
						"orion.cf.service", this);
			}
		}

		CFService.prototype = /** @lends org.eclipse.orion.client.cf.CFService.prototype */
		{
			_getServiceResponse : function(deferred, result) {
				var response = result.response ? JSON.parse(result.response) : null;

				if (result.xhr && result.xhr.status === 202) {
					var def = operation.handle(response.Location);
					def.then(function(data) {
						try {
							deferred.resolve(JSON.parse(data));
						} catch (e) {
							deferred.resolve(data);
						}
					}, function(data) {
						data.failedOperation = response.Location;
						deferred.reject(data);
					}, deferred.progress);
					deferred.then(null, function(error) {
						def.reject(error);
					});
					return;
				}
				deferred.resolve(response);
				return;
			},

			_handleServiceResponseError: function(deferred, error){
				deferred.reject(this._translateResponseToStatus(error));
			},

			_translateResponseToStatus: function(response) {
				var json;
				try {
					json = JSON.parse(response.responseText);
				} catch (e) {
					json = {
						Message : messages["problemWhilePerformingTheAction"]
					};
				}
				if (!json.HttpCode) {
					json.HttpCode = response.status;
				}
				return json;
			},

			_xhrV1 : function(method, url, data) {
				var self = this;
				var clientDeferred = new Deferred();

				xhr(method, url, { headers : { "CF-Version" : "1",
				"Content-Type" : contentType
				},
				timeout : 15000,
				data : JSON.stringify(data)
				}).then(function(result) {
					self._getServiceResponse(clientDeferred, result);
				}, function(error) {
					self._handleServiceResponseError(clientDeferred, error);
				});

				return clientDeferred;
			},

			// Target CF v2 operations

			setTarget: function(url, org, space) {
				var targetObject = {
					'Url': url
				};
				if (org) targetObject.Org = org;
				if (space) targetObject.Space = space;

				return this._xhrV1("POST", require.toUrl("cfapi/target"), targetObject);
			},

			login: function(url, username, password, org, space) {
				var loginData = {};

				if (url) loginData.Url = url;
				if (username) {
					loginData.Username = username;
					loginData.Password = password;
				}

				return this._xhrV1("POST", require.toUrl("cfapi/target"), loginData);
			},

			logout: function() {
				return this._xhrV1("DELETE", require.toUrl("cfapi/target"));
			},

			getLogs: function(target, applicationName, logFileName, instance){
				if(!applicationName){
					var deferred = new Deferred();
					deferred.reject(messages["applicationNameNotSet"]);
				}
				var location = require.toUrl("cfapi/logs/" + applicationName);
				if(logFileName){
					location+=("/" + logFileName);
				}
				if(instance){
					location+=("/" + instance);
				}
				if(target){
					location += ("?Target=" + encodeURIComponent(JSON.stringify(target)));
				}
				return this._xhrV1("GET", location);
			},

			getTarget: function() {
				return this._xhrV1("GET", require.toUrl("cfapi/target"));
			},

			getInfo: function() {
				return this._xhrV1("GET", require.toUrl("cfapi/info"));
			},

			// Apps CF v2 operations

			pushApp: function(target, name, contentLocation, manifest, packager, instrumentation) {
				var pushReq = {};

				if (name)
					pushReq.Name = name;

				if (contentLocation)
					pushReq.ContentLocation = contentLocation;

				if (target)
					pushReq.Target = target;

				if(manifest)
					pushReq.Manifest = manifest;

				if(packager)
					pushReq.Packager = packager;

				if(instrumentation)
					pushReq.Instrumentation = instrumentation;

				return this._xhrV1("PUT", require.toUrl("cfapi/apps"), pushReq);
			},

			getApp: function(target, name, contentLocation) {
				var url = require.toUrl("cfapi/apps");

				if (name) {
					url += "?Name=" + name;
				} else if (contentLocation) {
					url += "?ContentLocation=" + contentLocation;
				}

				if (target)
					url += "&Target=" + encodeURIComponent(JSON.stringify(target));

				return this._xhrV1("GET", url);
			},

			getApps: function(target) {
				var url = require.toUrl("cfapi/apps");

				if (target)
					url += "?Target=" + encodeURIComponent(JSON.stringify(target));

				return this._xhrV1("GET", url);
			},

			startApp: function(target, name, contentLocation, timeout) {
				var startReq = {
					Name: name,
					ContentLocation: contentLocation,
					Timeout: timeout,
					State: "Started"
				};

				if (target)
					startReq.Target = target;

				return this._xhrV1("PUT", require.toUrl("cfapi/apps"), startReq);
			},

			stopApp: function(target, name, contentLocation) {
				var stopReq = {
					Name: name,
					ContentLocation: contentLocation,
					State: "Stopped"
				};

				if (target)
					stopReq.Target = target;

				return this._xhrV1("PUT", require.toUrl("cfapi/apps"), stopReq);
			},

			getOrgs: function(target) {
				var url = require.toUrl("cfapi/orgs");

				if (target)
					url += "?Target=" + encodeURIComponent(JSON.stringify(target));

				return this._xhrV1("GET", url);
			},

			getRoutes: function(target) {
				var url = require.toUrl("cfapi/routes");

				if (target)
					url += "?Target=" + encodeURIComponent(JSON.stringify(target));

				return this._xhrV1("GET", url);
			},

			getRoute: function(target, domainName, hostName) {
				var routeObj = {
						DomainName: domainName,
						Host: hostName
				};

				var url = require.toUrl("cfapi/routes");
				url += "?Route=" + encodeURIComponent(JSON.stringify(routeObj));

				if (target)
					url += "&Target=" + encodeURIComponent(JSON.stringify(target));

				return this._xhrV1("GET", url);
			},

			checkRoute: function(target, domainName, hostName) {
				var routeObj = {
						DomainName: domainName,
						Host: hostName,
				};

				var url = require.toUrl("cfapi/routes");
				url += "?Route=" + encodeURIComponent(JSON.stringify(routeObj));

				url += "&GlobalCheck=true";

				if (target)
					url += "&Target=" + encodeURIComponent(JSON.stringify(target));

				return this._xhrV1("GET", url);
			},

			getDomains: function(target, defaultDomainMode) {
				var url = require.toUrl("cfapi/domains");

				if (target) {
					url += "?Target=" + encodeURIComponent(JSON.stringify(target));
				}
				if (defaultDomainMode) {
					if (target) {
						url += "&Default=true";
					} else {
						url += "?Default=true";
					}
				}
				
				return this._xhrV1("GET", url);
			},

			getServices: function(target) {
				var url = require.toUrl("cfapi/services");

				if (target)
					url += "?Target=" + encodeURIComponent(JSON.stringify(target));

				return this._xhrV1("GET", url);
			},

			createRoute: function(target, domainName, hostName) {
				var routeObj = {
					DomainName: domainName,
					Host: hostName
				};

				if (target)
					routeObj.Target = target;

				return this._xhrV1("PUT", require.toUrl("cfapi/routes"), routeObj);
			},

			deleteRoute: function(target, domainName, hostName) {
				var routeObj = {
					DomainName: domainName,
					Host: hostName
				};

				var url = require.toUrl("cfapi/routes");
				url += "?Route=" + encodeURIComponent(JSON.stringify(routeObj));

				if (target)
					url += "&Target=" + encodeURIComponent(JSON.stringify(target));

				return this._xhrV1("DELETE", url);
			},

			deleteRouteById: function(target, routeId) {
				var url = require.toUrl("cfapi/routes/" + routeId);

				if (target)
					url += "?Target=" + encodeURIComponent(JSON.stringify(target));

				return this._xhrV1("DELETE", url);
			},

			deleteOrphanedRoutes: function (target) {
				var url = require.toUrl("cfapi/routes");
				url += "?Orphaned=true";

				if (target)
					url += "&Target=" + encodeURIComponent(JSON.stringify(target));

				return this._xhrV1("DELETE", url);
			},

			mapRoute: function(target, appId, routeId) {
				var url = require.toUrl("cfapi/apps/" + appId + "/routes/" + routeId);
				if (target)
					url += "?Target=" + encodeURIComponent(JSON.stringify(target));

				return this._xhrV1("PUT", url);
			},

			unmapRoute: function(target, appId, routeId) {
				var url = require.toUrl("cfapi/apps/" + appId + "/routes/" + routeId);
				if (target)
					url += "?Target=" + encodeURIComponent(JSON.stringify(target));

				return this._xhrV1("DELETE", url);
			},

			getManifestInfo: function(relFilePath, strict){
				var url = require.toUrl("cfapi/manifests" + relFilePath);
				if (strict === true)
					url += "?Strict=true";

				return this._xhrV1("GET", url);
			},

			getDeploymentPlans: function(relFilePath){
				var url = require.toUrl("cfapi/plans" + relFilePath);
				return this._xhrV1("GET", url);
			},

			getLogz: function(target, appName, timestamp){
				if(!appName){
					var deferred = new Deferred();
					deferred.reject(messages["appNameIsMissing"]);
				}
				var url = require.toUrl("cfapi/logz/" + appName);
				if (target) {
					url += "?Target=" + encodeURIComponent(JSON.stringify(target));
				}
				if (timestamp) {
					if (target) {
						url += "&Timestamp=" + timestamp;
					} else {
						url += "?Timestamp=" + timestamp;
					}
				}
				
				return this._xhrV1("GET", url);
			},
		};

		return CFService;
	}());

	return eclipse;
});
