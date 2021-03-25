/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define([
	'require', 
	'orion/Deferred', 
	'orion/EventTarget', 
	'orion/xhr',
	'orion/util'], 
function(require, Deferred, _EventTarget, xhr, util) {
	
	function _mixin(target/*, source..*/) {
		var hasOwn = Object.prototype.hasOwnProperty;
		for (var j = 1, len = arguments.length; j < len; j++) {
			var source = arguments[j];
			for (var key in source) {
				if (hasOwn.call(source, key)) {
					target[key] = source[key];
				}
			}
		}
		return target;
	}

	function Cache(prefix, expiresSeconds) {
		return {
			get: function(namespace, ignoreExpires) {
				if (expiresSeconds === 0) {
					return null;
				}
				
				var item = util.readSetting(prefix + namespace);
				if (item === null) {
					return null;
				}
				
				try {
					var cached = JSON.parse(item);
					if (ignoreExpires || expiresSeconds === -1 || (cached._expires && cached._expires > Date.now())) {
						delete cached._expires;
						return cached;
					}
				} catch (e) {
					//invalid value; remove from cache.
					util.deleteSetting(prefix + namespace);
				}
				
				return null;
			},
			set: function(namespace, data) {
				if (expiresSeconds === 0) {
					return;
				}
				
				if (expiresSeconds !== -1) {
					data._expires = Date.now() + 1000 * expiresSeconds;
				}
				if (Object.keys(data).length === 0) {
					util.deleteSetting(prefix + namespace);
				} else {
					var jsonData = JSON.stringify(data);
					util.saveSetting(prefix + namespace, jsonData);
					delete data._expires;
				}
			},
			remove: function(namespace) {
				util.deleteSetting(prefix + namespace);
			}
		};
	}

	function UserPreferencesProvider(serviceRegistry) {
		this._currentPromises = {};
		this._cache = new Cache("/orion/preferences/user", 60*60); //$NON-NLS-0$
		
		this._service = null;
		this.available = function() {
			if (!this._service) {
				var references = serviceRegistry.getServiceReferences("orion.core.preference.provider"); //$NON-NLS-0$
				if (references.length > 0) {
					this._service = serviceRegistry.getService(references[0]);
				}
			}
			return !!this._service;
		};
	}

	UserPreferencesProvider.prototype = {
		get: function(namespace, optForce) {
			if (this._currentPromises[namespace]) {
				return this._currentPromises[namespace];
			}
			var d = new Deferred();
			var cached = null;
			if (optForce) {
				this._cache.remove(namespace);
			} else {
				cached = this._cache.get(namespace);
			}
			if (cached !== null) {
				d.resolve(cached);
			} else {
				this._currentPromises[namespace] = d;
				var that = this;
				this._service.get(namespace).then(function(data) {
					data = data || {};
					that._cache.set(namespace, data);
					delete that._currentPromises[namespace];
					d.resolve(data);
				}, function (error) {
					if (error.status === 404 || error.status === 410) {
						var data = {};
						that._cache.set(namespace, data);
						delete that._currentPromises[namespace];
						d.resolve(data);
					} else  {
						delete that._currentPromises[namespace];
						d.resolve(that._cache.get(namespace, true) || {});
					}
				});
			}
			return d;
		},
		
		put: function(namespace, data) {
			this._cache.set(namespace, data);
			return this._service.put(namespace, data);
		},
		
		remove: function(namespace, key){
			var cached = this._cache.get(namespace);
			delete cached[key];
			this._cache.set(namespace, cached);
			return this._service.remove(namespace, key);
		}
	};

	function DefaultPreferencesProvider(_location) {
		_location = _location || "defaults.pref"; //$NON-NLS-0$
		if (_location.indexOf("://") === -1) { //$NON-NLS-0$
			_location = require.toUrl ? require.toUrl(_location) : _location;
		}
		this._location = _location;
		this._currentPromise = null;
		this._cache = new Cache("/orion/preferences/default", 60*60); //$NON-NLS-0$
	}

	DefaultPreferencesProvider.prototype = {
		
		get: function(namespace, optForce) {
			var cached = null;
			var that = this;
			if (this._currentPromise) {
				return this._currentPromise.then(function() {
					cached = that._cache.get(namespace);
					if (cached === null) {
						cached = {};
						that._cache.set(namespace, cached);
					}
					return cached;
				});
			}
			var d = new Deferred();
			if (optForce) {
				this._cache.remove(namespace);
			} else {
				cached = this._cache.get(namespace);
			}
			if (cached !== null) {
				d.resolve(cached);
			} else {
				this._currentPromise = d;
				xhr("GET", this._location, { //$NON-NLS-0$
					headers: {
						"Orion-Version": "1" //$NON-NLS-0$
					},
					timeout: 15000
				}).then(function(result) {
					var data = JSON.parse(result.response);
					Object.keys(data).forEach(function(key) {
						that._cache.set(key, data[key] || {});
					});
					cached = data[namespace];
					if (!cached) {
						cached = {};
						that._cache.set(namespace, cached);
					}
					that._currentPromise = null;
					d.resolve(cached);
				}, function(error) {
					if (error.xhr.status === 401 || error.xhr.status === 491 || error.xhr.status === 404 ) {
						that._cache.set(namespace, {});
						that._currentPromise = null;
						d.resolve({});
					} else {
						that._currentPromise = null;
						var data = that._cache.get(namespace, true);
						if (data !== null) {
							d.resolve(data[namespace] || {});
						} else {
							d.resolve({});
						}
					}
				});
			}
			return d;
		},
		/**
		 * @callback
		 */
		put: function(namespace, data) {
			var d = new Deferred();
			d.resolve();
			return d;
		},
		remove: function(namespace, key){
			var cached = this._cache.get(namespace);
			delete cached[key];
			this.put(namespace, cached);
		}
	};
	
	function LocalPreferencesProvider() {
		this._cache = new Cache("/orion/preferences/local", -1); //$NON-NLS-0$
	}

	LocalPreferencesProvider.prototype = {
		get: function(namespace) {
			var d = new Deferred();
			var cached = this._cache.get(namespace);
			if (cached !== null) {
				d.resolve(cached);
			} else {
				d.resolve({});
			}
			return d;
		},
		put: function(namespace, data) {
			var d = new Deferred();
			this._cache.set(namespace, data);
			d.resolve();
			return d;
		},
		remove: function(namespace, key){
			var cached = this._cache.get(namespace);
			delete cached[key];
			this.put(namespace, cached);
		}
	};
	
	function PreferencesEvent(type, namespace, scope) {
		this.type = type;
		this.namespace = namespace;
		this.scope = scope;
	}

	/**
	 * Dispatched when a preferences node has been changed. The type of this event is <code>"changed"</code>.
	 * @name orion.PreferencesService#changed
	 * @event
	 */
	/**
	 * Constructs a new preference service. Clients should obtain a preference service
	 * by requesting the service <tt>orion.core.preference</tt> from the service registry.
	 * This service constructor is only intended to be used by page service registry
	 * initialization code.
	 * @class The preferences service manages a hierarchical set of preference
	 * nodes. Each node consists of preference key/value pairs. 
	 * @name orion.preferences.PreferencesService
	 * @see orion.preferences.Preferences
	 * @borrows orion.serviceregistry.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.serviceregistry.EventTarget#removeEventListener as #removeEventListener
	 */
	function PreferencesService(serviceRegistry, options) {
		options = options || {};
		this._changeListeners = [];
		this._userProvider = options.userProvider || new UserPreferencesProvider(serviceRegistry);
		this._localProvider = options.localProvider || new LocalPreferencesProvider();
		this._defaultsProvider = options.defaultsProvider || new DefaultPreferencesProvider(options.defaultPreferencesLocation);
		_EventTarget.attach(this);
		window.addEventListener("storage", function(evt) {
			var key = evt.key;
			var prefix = "/orion/preferences/"; //$NON-NLS-1$
			if (!key || key.indexOf(prefix) !== 0) return;
			var index = key.indexOf("/", prefix.length);
			var namespace = key.substring(index);
			var scope = {"default": PreferencesService.DEFAULT_SCOPE, local: PreferencesService.LOCAL_SCOPE, user: PreferencesService.USER_SCOPE}[key.substring(prefix.length, index)];
			this.dispatchEvent(new PreferencesEvent("changed", namespace, scope)); //$NON-NLS-1$
		}.bind(this), false);
		this._serviceRegistration = serviceRegistry.registerService("orion.core.preference", this); //$NON-NLS-0$
	}

	PreferencesService.DEFAULT_SCOPE = 1;
	PreferencesService.LOCAL_SCOPE = 2;
	PreferencesService.USER_SCOPE = 4;
	
	PreferencesService.prototype = /** @lends orion.preferences.PreferencesService.prototype */ {

		/**
		 * @private this is intended to be used by the metrics services
		 * @name addChangeListener
		 * @description description
		 * @function
		 * @param callback
		 * @returns returns
		 */
		addChangeListener: function(callback) {
			if (typeof(callback) === "function") { //$NON-NLS-0$
				this._changeListeners.push(callback);
			}
		},

		/**
		 * @name get
		 * @description Gets one or more preferences from the node specified by <code>namespace</code>.
		 * @function
		 * @param {String} namespace A slash-delimited path to the preference node to get
		 * @param {String|Array|Object} [key=undefined] the key, or array of keys, or an object specifying the default
		 *         values of the keys to get. An empty array or object will return an empty object. Pass in <code>null</code> or <code>undefined</code
		 *         to get all the preferences of the specified node.
		 * @param options the options object
		 * @returns A promise that will resolve when the preferences has been retrivied. The promise result is an object with key-value mappings.
		 */
		get: function(namespace, key, options) {
			options = options || {};
			var providers = this._getProviders(options.scope);
			var gets = [];
			providers.reverse().forEach(function(provider) {
				gets.push(provider.get(namespace, options.noCache));
			});
			return Deferred.all(gets).then(function(stores) {
				var result = {};
				if (key && typeof key !== "string" && !Array.isArray(key)) { result = _mixin(result, key); }
				stores.forEach(function(store) {
					if (!store) { return; }
					function addKey(key) {
						if (key in store) {
							if(typeof store[key] === 'object' && store[key] !== null) {
								if(typeof result[key] === 'undefined') {
									result[key] = store[key];
								} else {
									result[key] = _mixin(result[key], store[key]);
								}
							} else {
								result[key] = store[key];
							}
						}
					}
					if (!key) {
						Object.keys(store).forEach(addKey);
					} else if (typeof key === "string") {
						addKey(key);
					} else if (Array.isArray(key)) {
						key.forEach(addKey);
					} else {
						Object.keys(key).forEach(addKey);
					}
				});
				return result;
			});
		},

		/**
		 * @name put
		 * @description Sets multiple preferences in the node specified by <code>namespace</code>.
		 * @function
		 * @param {String} namespace A slash-delimited path to the preference node to update
		 * @param data An object with key-value pairs to update. Any other key/value pairs in the node will not be affected unless the
		 *        options <code>clear</code> is set.
		 * @param options the options object
		 * @returns A promise that will resolve when the preferences has been updated.
		 */
		put: function(namespace, data, options) {
			var that = this;
			options = options || {};
			var provider = this._getProviders(options.scope)[0];
			return provider.get(namespace).then(function(store) {
				var newStore = data;
				if (!options.clear) {
					newStore  = _mixin({}, store, newStore);
				}
				if (JSON.stringify(store) === JSON.stringify(newStore)) return;
				
				that._valueChanged(namespace, data, store);
				
				return provider.put(namespace, newStore);
			});
		},

		/**
		 * @name remove
		 * @description Removes one or more preferences in the node specified by <code>namespace</code>.
		 * @function
		 * @param {String} namespace A slash-delimited path to the preference node to update
		 * @param {String|Array|Object} [key=undefined] the key, or array of keys, or an object specifying the
		 *         the keys to remove. An empty array or object will remove nothing. Pass in <code>null</code> or <code>undefined</code>
		 *         to remove all the preferences of the specified node.
		 * @param options the options object
		 * @returns A promise that will resolve when the preferences has been updated.
		 */
		remove: function(namespace, key, options) {
			options = options || {};
			var provider = this._getProviders(options.scope)[0];
			return provider.get(namespace).then(function(store) {
				function deleteKey(key) {
					if (key in store) {
						delete store[key];
					}
				}
				if (!key) {
					Object.keys(store).forEach(deleteKey);
				} else if (typeof key === "string") {
					deleteKey(key);
				} else if (Array.isArray(key)) {
					key.forEach(deleteKey);
				} else {
					Object.keys(key).forEach(deleteKey);
				}
				return provider.put(namespace, store);
			});
		},
		
		/**
		 * @private
		 */
		_getProviders: function(optScope) {
			if (!optScope || typeof(optScope) !== "number" || optScope > 7 || optScope < 1) { //$NON-NLS-0$
				optScope = PreferencesService.DEFAULT_SCOPE;
				optScope |= this._userProvider.available() ? PreferencesService.USER_SCOPE : PreferencesService.LOCAL_SCOPE;
			}
			var providers = [];
			if ((PreferencesService.USER_SCOPE & optScope) && this._userProvider.available()) {
				providers.push(this._userProvider);
			}
			if (PreferencesService.LOCAL_SCOPE & optScope) {
				providers.push(this._localProvider);
			}
			if (PreferencesService.DEFAULT_SCOPE & optScope) {
				providers.push(this._defaultsProvider);
			}
			return providers;
		},

		/**
		 * @private
		 */
		_valueChanged: function(namespace, data, store) {
			if (!this._changeListeners.length) return;
			var that = this;
			function callChangeListener(key, value) {
				that._changeListeners.forEach(function(current) {
					current(key, value);
				});
			}
			for (var key in data) {
				var changeKey = namespace + "/" + key; //$NON-NLS-0$
				var value = data[key];
				if (typeof(value) === "string") { //$NON-NLS-0$
					callChangeListener(changeKey, value);
				} else {
					for (var current in value) {
						if (current !== "pid" && (!store || !store[key] || store[key][current] !== value[current])) { //$NON-NLS-0$
							var stringValue = String(value[current]);
							callChangeListener(changeKey + "/" + current, stringValue); //$NON-NLS-0$
						} 
					}
				}
			}
		},

		/**
		 * @private this is intended to be used by the metrics services
		 * @name removeChangeListener
		 * @description description
		 * @function
		 * @param callback
		 * @returns returns
		 */
		removeChangeListener: function(callback) {
			if (typeof(callback) === "function") { //$NON-NLS-0$
				for (var i = 0; i < this._changeListeners.length; i++) {
					if (this._changeListeners[i] === callback) {
						this._changeListeners.splice(i, 1);
						return;
					}
				}
			}
		}
	};
	return {
		PreferencesService: PreferencesService,
		Cache: Cache
	};
});
