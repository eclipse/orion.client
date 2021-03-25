/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define(["orion/Deferred"
], function(Deferred) {
	function _merge2BundleEntries(serviceRegistry, config, perlanguageRefs, perBundleRefs) {
		var matchedRef;
		if(perlanguageRefs.length > 0) {
			var userLocale = config.locale || (typeof navigator !== "undefined" ? (navigator.language || navigator.userLanguage) : null);
			if(userLocale) {
				userLocale = userLocale.toLowerCase();
				var matchFunc = function(reference, completeMatch) {
					var localeName = reference.getProperty("locale");
					if(localeName) {
						localeName = localeName.toLowerCase();
					}
					var flag = completeMatch ? (userLocale === localeName) : (userLocale.indexOf(localeName) === 0);
					if (flag) {
						return reference;
					}
					return null;
				};
				var matched = perlanguageRefs.some(function(ref) {
					matchedRef = matchFunc(ref, true);
					if (matchedRef) {
						return true;
					}
					return false;
				});
				if(!matched) {
					matched = perlanguageRefs.some(function(ref) {
						matchedRef = matchFunc(ref);
						if (matchedRef) {
							return true;
						}
						return false;
					});								
				}
				if(matchedRef) {
					var serviceEntry = serviceRegistry.getService(matchedRef);
					if(serviceEntry.getBundleNames) {
						return serviceEntry.getBundleNames().then(function(bundleNames) {
							bundleNames.forEach(function(bName) {
								perBundleRefs.push({serviceRef: matchedRef, bundleName: bName});				
							});
							return new Deferred().resolve(perBundleRefs);
						});
					}
				}
			}
		}
		return new Deferred().resolve(perBundleRefs);
	}
	function _filterServices(serviceRegistry, config) {
		var nlsReferences = serviceRegistry.getServiceReferences("orion.i18n.message"); //$NON-NLS-0$
		var perlanguageRefs = [];
		var perBundleRefs = [];
		nlsReferences.forEach(function(reference) {
			if(reference.getProperty("locale")){
				perlanguageRefs.push(reference);
			} else {
				perBundleRefs.push({serviceRef: reference, bundleName: reference.getProperty("name")});				
			}
		});
		return _merge2BundleEntries(serviceRegistry, config, perlanguageRefs, perBundleRefs);
	}
	return {
		load: function(name, parentRequire, onLoad, config) {
			config = config || {};

			// as per requirejs i18n definition ignoring irrelevant matching groups
			// [0] is complete match
			// [1] is the message bundle prefix
			// [2] is the locale or suffix for the master bundle
			// [3] is the message file suffix or empty string for the master bundle
			var NLS_REG_EXP = /(^.*(?:^|\/)nls(?:\/|$))([^\/]*)\/?([^\/]*)/;
			var match = NLS_REG_EXP.exec(name);
			if (!match) {
				onLoad(null);
				return;
			}

			if (!parentRequire.defined || parentRequire.defined(name)) {
				try {
					onLoad(parentRequire(name));
					return;
				} catch (e) {
					// not defined so need to load it
				}
			}

			if (config.isBuild || config.isTest) {
				onLoad({});
				return;
			}
			
			if (parentRequire.specified && (!parentRequire.specified("orion/bootstrap") || parentRequire.specified("orion/plugin"))) {
				onLoad({});
				return;
			}

			var prefix = match[1],
				locale = match[3] ? match[2] : "",
				suffix = match[3] || match[2];
			parentRequire(['orion/bootstrap'], function(bootstrap) { //$NON-NLS-0$
				bootstrap.startup().then(function(core) {
					console.log(name);
					var serviceRegistry = core.serviceRegistry;
					_filterServices(serviceRegistry, config).then(function(nlsReferences) {
						if (!locale) {
							// create master language entries				
							var master = {};
							var masterReference;
							nlsReferences.forEach(function(reference) {
								var name =reference.bundleName;
								if ((match = NLS_REG_EXP.exec(name)) && prefix === match[1] && suffix === (match[3] || match[2])) {
									locale = match[3] ? match[2] : "";
									if (locale) {
										// see Bug 381042 - [Globalization] Messages are loaded even if their language is not used
										var userLocale = config.locale || (typeof navigator !== "undefined" ? (navigator.language || navigator.userLanguage) : null);
										if (!userLocale || userLocale.toLowerCase().indexOf(locale.toLowerCase()) !== 0) {
											return;
										}
										// end
										master[locale.toLowerCase()] = true;
										if (!parentRequire.specified || !parentRequire.specified(name)) {
											define(name, ['orion/i18n!' + name], function(bundle) { //$NON-NLS-0$
												return bundle;
											});
										}
									} else {
										masterReference = reference.serviceRef;
									}
								}
							});
							if (!parentRequire.specified || !parentRequire.specified(name)) {
								if (masterReference) {
									serviceRegistry.getService(masterReference).getMessageBundle(name).then(function(bundle) {
										Object.keys(master).forEach(function(key) {
											if (typeof bundle[key] === 'undefined') { //$NON-NLS-0$
												bundle[key] = master[key];
											}
										});
										define(name, [], bundle);
										onLoad(bundle);
									}, function() {
										define(name, [], master);
										onLoad(master);
									});
								} else {
									define(name, [], master);
									onLoad(master);
								}
							} else {
								onLoad(master);
							}
						} else {
							var found = nlsReferences.some(function(reference) {
								if (name === reference.bundleName) { //$NON-NLS-0$
									serviceRegistry.getService(reference.serviceRef).getMessageBundle(name).then(function(bundle) {
										onLoad(bundle);
									}, function() {
										onLoad({});
									});
									return true;
								}
								return false;
							});
							if (!found) {
								onLoad({});
							}
						}
					});//End of _filterServices
				});
			});
		}
	};
});
