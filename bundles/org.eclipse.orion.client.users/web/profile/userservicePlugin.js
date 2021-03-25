/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
"require", 
"orion/plugin", 
"profile/UsersService", 
"domReady!"], function(require, PluginProvider, UsersService) {

	function connect() {
		var login = new URL(require.toUrl("mixloginstatic/LoginWindow.html"), self.location.href).href;
		var headers = {
			name: "Orion User Profile",
			version: "1.0",
			description: "This plugin supports access and modification of a user's profile information.",
			login: login
		};
		var pluginProvider = new PluginProvider(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	function registerServiceProviders(provider) {
		var usersService = new UsersService();

		usersService.info = function() {
			return {
				name: "User profile"
			};
		};


		usersService.getDivContent = function() {
			var content = {
				"actions": [{
					"id": "saveProfileButton",
					"name": "Save Profile",
					"tooltip": "Save Profile",
					"action": "saveProfile"
				}, {
					"id": "resetProfileButton",
					"name": "Reset",
					"tooltip": "Reset Profile Information",
					"action": "resetProfile"
				}, {
					"id": "deleteProfileButton",
					"name": "Delete Profile",
					"tooltip": "Delete Profile",
					"action": "deleteProfile"
				}],
				"sections": [{
					"id": "personalInformation",
					"name": "Personal Information",
					"data": [{
						"type": "TextBox",
						"props": {
							"id": "pi_username",
							"readOnly": false,
							"name": "UserName"
						},
						"label": "User Name:"
					}, {
						"type": "TextBox",
						"props": {
							"id": "pi_fullname",
							"readOnly": false,
							"name": "FullName"
						},
						"label": "Full Name:"
					}, {
						"type": "TextBox",
						"props": {
							"id": "pi_email",
							"readOnly": false,
							"name": "Email"
						},
						"label": "Email:"
					}, {
						"type": "CheckBox",
						"props": {
							"id": "pi_emailConfirmed",
							"readOnly": true,
							"name": "EmailConfirmed"
						},
						"label": "Email confirmed:"
					}, {
						"type": "DateLong",
						"props": {
							"id": "pi_lastLogin",
							"name": "LastLoginTimestamp"
						},
						"label": "Last login:	"
					}, {
						"type": "Text",
						"props": {
							"id": "pi_diskUsage",
							"name": "DiskUsage"
						},
						"label": "Disk Usage:	"
					}, {
						"type": "DateLong",
						"props": {
							"id": "pi_diskUsageTimestamp",
							"name": "DiskUsageTimestamp"
						},
						"label": "Disk Usage Last Calculated:	"
					}]
				}, {
					"id": "oauthids",
					"name": "Manage External Accounts",
					"type": "iframe",
					"data": {
						"src": new URL(require.toUrl("mixloginstatic/manageExternalIds.html"), self.location.href).href
					}
				}]
			};

			return content;
		};

		usersService.initProfile = function(userURI, pluginsEventName, dataEventName) {
			return this.getUserInfo(userURI, function(json) {
				usersService.dispatchEvent({
					type: pluginsEventName,
					"data": json
				});

				usersService.dispatchEvent({
					type: dataEventName,
					data: json
				});
			});
		};

		usersService.fire = function(action, url, jsonData) {
			switch (action) {
				case "saveProfile":
					return this.updateUserInfo(url, jsonData, function(url, jsonResp) {
						// these events are poorly named but I was afraid to change it.  Not sure what user profile has to do with required plugins.
						this.initProfile(url, "requiredPluginsChanged", "userInfoChanged");
						return jsonResp && jsonResp.Message ? jsonResp : {
							Message: "Profile saved!",
							status: 200
						};
					}.bind(this, url));
				case "resetProfile":
					return this.getUserInfo(url, "userInfoChanged");
				case "deleteProfile":
					var login = jsonData.login ? jsonData.login : url;
					if (confirm("Do you really want to delete user " + login + "?")) {
						return this.deleteUser(url, "userDeleted");
					}
					break;
				default:
					return this.updateUserInfo(url, jsonData, function(url, jsonResp) {
						this.initProfile(url, "requiredPluginsChanged", "userInfoChanged");
						return jsonResp && jsonResp.Message ? jsonResp : {
							Message: "Profile saved!",
							status: 200
						};
					}.bind(this, url));
			}
		};

		provider.registerService("orion.core.user", usersService);
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
