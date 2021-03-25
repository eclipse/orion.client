/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
 
 define(['orion/Deferred', 'orion/util'], function(Deferred, util){
 
	/**
	 * Support class for using the orion preferences as a local
	 * git credentials storage.
	 *
	 * @param serviceRegistry [required] Service registry
	 */
	function PreferenceStorage(serviceRegistry){
		this._prefix = "/git/credentials";
		this._preferenceService = serviceRegistry.getService("orion.core.preference");
		if(util.isElectron) this.enable();
	}
	
	PreferenceStorage.prototype = {
		/**
		 * Saves the given git credentials for the given repository.
		 *
		 * @param repository [required] unique repository URL
		 * @param userCredentials.gitSshUsername [optional] git ssh username
		 * @param userCredentials.gitSshPassword [optional] git ssh password
		 * @param userCredentials.gitPrivateKey [optional] git private key
		 * @param userCredentials.gitPassphrase [optional] git passphrase
		 */
		put : function(repository, userCredentials){
			var credentials = {
				gitSshUsername : "",
				gitSshPassword : "",
				gitPrivateKey : "",
				gitPassphrase : ""
			};
			
			if(userCredentials !== undefined){
				if(userCredentials.gitSshUsername !== undefined && userCredentials.gitSshUsername !== null) { credentials.gitSshUsername = userCredentials.gitSshUsername; }
				if(userCredentials.gitSshPassword !== undefined && userCredentials.gitSshPassword !== null) { credentials.gitSshPassword = userCredentials.gitSshPassword; }
				if(userCredentials.gitPrivateKey !== undefined && userCredentials.gitPrivateKey !== null) { credentials.gitPrivateKey = userCredentials.gitPrivateKey; }
				if(userCredentials.gitPassphrase !== undefined && userCredentials.gitPassphrase !== null) { credentials.gitPassphrase = userCredentials.gitPassphrase; }
			}
			
			var d = new Deferred();
			this._preferenceService.get(this._prefix, undefined, {scope: 2}).then(
				function(pref){
					var settings = pref["settings"];
					if(settings === undefined){
						d.reject();
						return;
					}
				
					if(settings.enabled){
						var data = {};
						data[repository] = credentials;
						this._preferenceService.put(this._prefix, data, {scope: 2}).then(d.resolve, d.reject);
					} else { d.reject(); }
				}.bind(this)
			);
			
			return d;
		},
		
		/**
		 * Retrieves git credentials for the given repository.
		 * Some credentials fields may be in form of empty strings if not present in the storage.
		 *
		 * @param repository [required] unique repository URL
		 */
		get : function(repository){
			var credentials = {
				gitSshUsername : "",
				gitSshPassword : "",
				gitPrivateKey : "",
				gitPassphrase : ""
			};
			
			var d = new Deferred();
			this._preferenceService.get(this._prefix, undefined, {scope: 2}).then(
				function(pref){
					var settings = pref["settings"];
					if(settings === undefined){
						d.reject();
						return;
					}
				
					if(settings.enabled){
						var userCredentials = pref[repository];
						if(userCredentials !== undefined) { d.resolve(userCredentials); }
						else { d.resolve(credentials); }
					} else { d.reject(); }
				}
			);
			
			return d;
		},
		
		/**
		 * Determines whether the storage is enabled by the user or not.
		 */
		isEnabled : function(){
			var d = new Deferred();
			this._preferenceService.get(this._prefix, undefined, {scope: 2}).then(
				function(pref){
					var settings = pref["settings"];
					if(settings === undefined){
						d.resolve(false);
						return;
					}
					
					d.resolve(settings.enabled);
				}
			);
			
			return d;
		},
		
		/**
		 * Enables the storage for futher use.
		 */
		enable : function(){
			return this._preferenceService.put(this._prefix, {settings: { enabled : true }}, {scope: 2});
		},
		
		/**
		 * Disables the storage.
		 * Please note no credentials are erased.
		 */
		disable : function(){
			return this._preferenceService.put(this._prefix, {settings: { enabled : false }}, {scope: 2});
		},
		
		/**
		 * Removes all credentials for the given repository.
		 *
		 * @param repository [required] unique repository URL
		 */
		remove : function(repository){
			return this._preferenceService.remove(this._prefix, repository, {scope: 2});
		},
		
		/**
		 * Returns all repository URLs, which have stored
		 * credentials in the storage.
		 */
		getRepositories : function(){
			var d = new Deferred();
			this._preferenceService.get(this._prefix, undefined, {scope: 2}).then(
				function(pref){
					var result = [];
					var repositories = Object.keys(pref);
					
					for(var i=0; i<repositories.length; ++i){
						if(repositories[i] !== "settings"){
							result.push(repositories[i]);
						}
					}
					
					d.resolve(result);
				}
			);
			
			return d;
		}
	};
	
	PreferenceStorage.prototype.constructor = PreferenceStorage;
	return PreferenceStorage;
 });
