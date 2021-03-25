/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
/*global alert*/
define(["orion/Deferred", "orion/xhr", 'orion/EventTarget', 'orion/form'], function(Deferred, xhr, EventTarget, form) {

	function getJSON(data) {
		return data === "" ? null : JSON.parse(data);
	}

	function getError(xhrResult) {
		return new Error("Error loading " + xhrResult.args.url + " status: " + xhrResult.status);
	}
	
	function qualify(url) {
		return new URL(url, self.location.href).href;
	}
	function unqualify(url) {
		url = qualify(url);
		try {
			if (typeof window === "undefined") {
				return url.substring(self.location.href.indexOf(self.location.host) + self.location.host.length);
			}
			if (window.location.host === parent.location.host && window.location.protocol === parent.location.protocol) {
				return url.substring(parent.location.href.indexOf(parent.location.host) + parent.location.host.length);
			}
		} catch (e) {}
		return url;
	}

	/**
	 * @class Provides operations on users and users groups.
	 * @name eclipse.UsersService
	 */
	function UsersService(serviceRegistry) {
		EventTarget.attach(this);
		this.api = unqualify(require.toUrl('users'));
		if(serviceRegistry){
			this._serviceRegistry = serviceRegistry;
			this._serviceRegistration = serviceRegistry.registerService(
					"orion.core.user", this); //$NON-NLS-0$
		}
	}

	UsersService.prototype = /** @lends eclipse.FileService.prototype */
	{
		getUsersListSubset : function(start, rows, onLoad) {
			var ret = new Deferred();
			var service = this;
			var uri = this.api + "?start=" + start + "&rows=" + rows;
			xhr("GET", uri, { //$NON-NLS-1$ 
				headers : {
					"Orion-Version" : "1" //$NON-NLS-1$ //$NON-NLS-0$
				},
				timeout: 15000
			}).then(function(result) {
				var jsonData = getJSON(result.response);
				if (onLoad){
					if(typeof onLoad === "function") //$NON-NLS-0$
						onLoad(jsonData);
					else
						service.dispatchEvent({type: onLoad, data: jsonData});
				}
				ret.resolve(jsonData);
			}, function(error) {
				ret.reject(error.response || error);
			});
			return ret;
		},
		getUsersList : function(onLoad) {
			var ret = new Deferred();
			var service = this;
			xhr("GET", this.api, { //$NON-NLS-1$ //$NON-NLS-0$
				headers : {
					"Orion-Version" : "1" //$NON-NLS-1$ //$NON-NLS-0$
				},
				timeout: 15000
			}).then(function(result) {
				var jsonData = getJSON(result.response);
				if (onLoad){
					if(typeof onLoad === "function") //$NON-NLS-0$
						onLoad(jsonData);
					else
						service.dispatchEvent({type: onLoad, data: jsonData});
				}
				ret.resolve(jsonData.Users);
			}, function(error) {
				ret.reject(error.response || error);
			});
			return ret;
		},
		deleteUser : function(userURI, onLoad) {
			var ret = new Deferred();
			var service = this;
			xhr("DELETE", userURI, { //$NON-NLS-0$
				headers : {
					"Orion-Version" : "1" //$NON-NLS-1$ //$NON-NLS-0$
				},
				timeout: 15000
			}).then(function(result) {
				var jsonData = getJSON(result.response);
				if (onLoad){
					if(typeof onLoad === "function") //$NON-NLS-0$
						onLoad(jsonData);
					else
						service.dispatchEvent({type: onLoad, data: jsonData});
				}
				ret.resolve(jsonData);
			}, function(result) {
				var error = result;
				try {
					error = getJSON(result.response || result.error);
				} catch (e) {}
				ret.reject(error);
			});
			return ret;
		},
		createUser : function(userInfo, onLoad, onError) {
			userInfo = userInfo || {};
			var formData = {
				UserName : userInfo.UserName,
				Password : userInfo.Password,
				Email: userInfo.Email
			};
			return xhr("POST", this.api, { //$NON-NLS-1$ //$NON-NLS-0$
				headers : {
					"Content-Type": "application/json", //$NON-NLS-1$ //$NON-NLS-0$
					"Orion-Version" : "1" //$NON-NLS-1$ //$NON-NLS-0$
				},
				timeout: 15000,
				data: JSON.stringify(formData)
			}).then(function(result) {
				return new Deferred().resolve(getJSON(result.response));
			}, function(result) {
				var error = result;
				try {
					error = getJSON(result.response || result.error);
				} catch (e) {}
				return new Deferred().reject(error);
			});
		},
		getUserInfo: function(userURI, onLoad){
			var ret = new Deferred();
			var service = this;
			xhr("GET", userURI, { //$NON-NLS-0$
				headers : {
					"Orion-Version" : "1" //$NON-NLS-1$ //$NON-NLS-0$
				},
				timeout: 15000
			}).then(function(result) {
				var jsonData = getJSON(result.response);
				if (onLoad){
					if(typeof onLoad === "function") //$NON-NLS-0$
						onLoad(jsonData);
					else
						service.dispatchEvent({type: onLoad, data: jsonData});
				}
				ret.resolve(jsonData);
			}, function(error) {
				ret.reject(error.response || error);
			});
			return ret;
		},
		updateUserInfo: function(userUri, data, onLoad){
			var ret = new Deferred();
			var service = this;
			var uri = userUri;
			

			if(data.Password!==data.passwordRetype){
				ret.reject({message: "Passwords do not match!"});
				return ret;
			}

			xhr("PUT", uri, { //$NON-NLS-0$
				headers : {
					"Content-Type": "application/json; charset=UTF-8", //$NON-NLS-1$ //$NON-NLS-0$
					"Orion-Version" : "1" //$NON-NLS-1$ //$NON-NLS-0$
				},
				timeout : 15000,
				data: JSON.stringify(data)
			}).then(function(result) {
				var jsonData = getJSON(result.response);
				if (onLoad){
					if(typeof onLoad === "function") //$NON-NLS-0$
						onLoad(jsonData);
					else
						service.dispatchEvent({type: onLoad, data: jsonData});
				}
				ret.resolve(jsonData);
			}, function(error) {
				if (error.status === 409) {
					var jsonData = getJSON(error.response);
					var errorMessage = jsonData.Message;
					alert(errorMessage);
				}
				ret.reject(error.response || error);
			});
			
			return ret;
		},
		resetUserPassword: function(username, password, onLoad){
			var service = this;
			var formData = {
				Password : password,
				Reset: true
			};
			return xhr("POST", this.api + username, { //$NON-NLS-1$ //$NON-NLS-0$
				headers : {
					"Content-Type": "application/json; charset=UTF-8", //$NON-NLS-1$ //$NON-NLS-0$
					"Orion-Version" : "1" //$NON-NLS-1$ //$NON-NLS-0$
				},
				timeout : 15000,
				data: JSON.stringify(formData)
			}).then(function(result) {
				var jsonData = getJSON(result.response);
				if (onLoad){
					if(typeof onLoad === "function") //$NON-NLS-0$
						onLoad(jsonData);
					else
						service.dispatchEvent({type: onLoad, data: jsonData});
				}
				return new Deferred().resolve(jsonData);
			}, function(result) {
				var error = result;
				try {
					error = getJSON(result.response || result.error);
				} catch (e) {}
				return new Deferred().reject(error);
			});
		}
	};
	return UsersService;
});
