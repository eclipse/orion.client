/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/serviceTracker'
], function(ServiceTracker) {
	var METATYPE_SERVICE = 'orion.cm.metatype', SETTING_SERVICE = 'orion.core.setting'; //$NON-NLS-0$ //$NON-NLS-1$
	var SETTINGS_PROP = 'settings'; //$NON-NLS-0$
	var DEFAULT_CATEGORY = 'unsorted'; //$NON-NLS-0$

	var hasOwnProperty = Object.prototype.hasOwnProperty;

	/**
	 * @param {String} type
	 * @param {Object} value
	 * @param {orion.metatype.AttributeDefinition} attributeDefinition
	 */
	function equals(type, value, defaultValue) {
		if (type === 'string') //$NON-NLS-0$
			return value === defaultValue || (value === '' && defaultValue === null);
		return value === defaultValue;
	}

	function getStringOrNull(obj, property) {
		return typeof obj[property] === 'string' ? obj[property] : null;
	}
	
	function checkAttributeDefinition(attributeDefinition, properties, defaultProperties) {
		var attributeId = attributeDefinition.getId();
		if (!hasOwnProperty.call(properties, attributeId)) {
			// check if the current attributeDefinition has children
			var children = attributeDefinition.children;
			if (Array.isArray(children) && children.length !== 0) {
				return children.every(function(attributeDefinition) {
					return checkAttributeDefinition(attributeDefinition, properties, defaultProperties);
				});
			}
			return true; // Attribute not set, so consider as equal to default
		}
		var value = properties[attributeId], defaultValue;
		if (hasOwnProperty.call(defaultProperties, attributeId)) {
			defaultValue = defaultProperties[attributeId];
		} else {
			defaultValue = attributeDefinition.getDefaultValue();
		}
		return equals(attributeDefinition.getType(), value, defaultValue);
	}

	/**
	 * @name orion.settings.Setting
	 * @class Represents the definition of a setting.
	 * @description Represents the definition of a setting.
	 */
		/**
		 * @name orion.settings.Setting#isDefaults
		 * @function
		 * @param {Object} properties A map of AttributeDefinition IDs to values.
		 * @param {Object} [defaultProperties] If provided, gives a map of effective default values to compare properties
		 * against. If not provided, the default values defined in the <tt>AttributeDefinition</tt>s are used.
		 * @description Returns whether a given properties map is equivalent to the default value of this setting.
		 * Default values are drawn either from <tt>defaultProperties</tt> if provided, otherwise from the <tt>AttributeDefinition</tt>.
		 * </ul>
		 * @returns {Boolean} <code>true</code> if the given <code>properties</code> map equals the defaults.
		 */
		/**
		 * @name orion.settings.Setting#getCategory
		 * @function
		 * @description Returns the category.
		 * @returns {String} The category. May be <code>null</code>.
		 */
		/**
		 * @name orion.settings.Setting#getCategoryLabel
		 * @function
		 * @description Returns the category label.
		 * @returns {String} The category label. May be <code>null</code>.
		 */
		/**
		 * @name orion.settings.Setting#getPid
		 * @function
		 * @returns {String}
		 */
		/**
		 * @name orion.settings.Setting#getObjectClassDefinitionId
		 * @function
		 * @returns {String}
		 */
		/**
		 * @name orion.settings.Setting#getName
		 * @function
		 * @description Returns the name.
		 * @returns {String} The name. May be <code>null</code>.
		 */
		/**
		 * @name orion.settings.Setting#getAttributeDefinitions
		 * @function
		 * @returns {orion.metatype.AttributeDefinition[]}
		 */
		/**
		 * @name orion.settings.Setting#getTags
		 * @function
		 * @returns {String[]}
		 */
	function SettingImpl(json) {
		this.pid = json.pid;
		this.isRef = getStringOrNull(json, 'classId'); //$NON-NLS-0$
		this.classId = this.isRef ? json.classId : this.pid + '.type'; //$NON-NLS-0$
		this.name = getStringOrNull(json, 'name'); //$NON-NLS-0$
		this.properties = null;
		this.category = json.category || null;
		this.categoryLabel = json.categoryLabel || null;
		this.tags = json.tags;
		this.order = typeof json.order === 'number' && json.order > -1 ? json.order : 0;
		if (!this.pid) { throw new Error('Missing "pid" property'); } //$NON-NLS-0$
	}
	SettingImpl.prototype = {
		getName: function() {
			return this._nlsName || this.name;
		},
		getPid: function() {
			return this.pid;
		},
		getObjectClassDefinitionId: function() {
			return this.classId;
		},
		getAttributeDefinitions: function() {
			return this.properties;
		},
		getCategory: function() {
			return this.category;
		},
		getCategoryLabel: function() {
			return this.categoryLabel;
		},
		getTags: function() {
			return this.tags || [];
		},
		/**
		 * Allow settings to declare thier relative ordering on the generated page
		 * @since 9.0
		 */
		getOrder: function getOrder() {
			return this.order;	
		},
		isDefaults: function(properties, defaultProperties) {
			defaultProperties = defaultProperties || {};
			return this.getAttributeDefinitions().every(function(attributeDefinition) {
				return checkAttributeDefinition(attributeDefinition, properties, defaultProperties);
			});
		}
	};

	/**
	 * Tracks dynamic registration/unregistration of settings and registers/unregisters the corresponding MetaType service.
	 */
	function SettingTracker(serviceRegistry, metaTypeRegistry, settingsMap, categoriesMap) {
		var serviceRegistrations = {};

		function _addSetting(settingJson) {
			var setting = new SettingImpl(settingJson);
			var classId = setting.getObjectClassDefinitionId();
			var serviceProperties = {
				designates: [{
					pid: setting.getPid(),
					classId: classId
				}]
			};
			if (!setting.isRef && !metaTypeRegistry.getObjectClassDefinition(classId)) {
				// The ObjectClassDefinition doesn't exist yet so we'll define it here
				serviceProperties.classes = [{
					id: classId,
					name: setting.getName(),
					properties: settingJson.properties
				}];
			}
			serviceRegistrations[setting.getPid()] = serviceRegistry.registerService(METATYPE_SERVICE, {}, serviceProperties);
			var ocd = metaTypeRegistry.getObjectClassDefinition(classId);
			setting.properties = ocd.getAttributeDefinitions();
			settingsMap[setting.getPid()] = setting;
			var category = setting.getCategory() || DEFAULT_CATEGORY;
			if (!hasOwnProperty.call(categoriesMap, category)) {
				categoriesMap[category] = [];
			}
			categoriesMap[category].push(setting.getPid());
		}

		function _deleteSetting(pid, category) {
			var serviceRegistration = serviceRegistrations[pid];
			serviceRegistration.unregister();
			delete serviceRegistrations[pid];
			delete settingsMap[pid];
			var pids = categoriesMap[category || DEFAULT_CATEGORY];
			pids.splice(pids.indexOf(pid), 1);
			if (!pids.length) {
				delete categoriesMap[category];
			}
		}

		ServiceTracker.call(this, serviceRegistry, SETTING_SERVICE);
		this.addingService = function(serviceRef) {
			var settings = serviceRef.getProperty(SETTINGS_PROP);
			if (!settings || !settings.length) {
				return null;
			}
			for (var i=0; i < settings.length; i++) {
				_addSetting(settings[i]);
			}
			return ServiceTracker.prototype.addingService.call(this, serviceRef);
		};
		this.removedService = function(serviceRef, service) {
			var settings = serviceRef.getProperty(SETTINGS_PROP);
			for (var i=0; i < settings.length; i++) {
				_deleteSetting(settings[i].pid, settings[i].category);
			}
		};
	}

	/**
	 * @name orion.settings.SettingsRegistry
	 * @class Maintains a registry of settings.
	 * @description A SettingsRegistry provides access to information about settings registered with the service registry.
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry The service registry to monitor.
	 * @param {orion.metatype.MetaTypeRegistry} metaTypeRegistry The metatype registry to look up Object Class Definitions in.
	 */
	function SettingsRegistry(serviceRegistry, metaTypeRegistry) {
		this.settingsMap = Object.create(null);    // PID -> Setting
		this.categories = Object.create(null);     // Category -> PID[]
		var tracker = new SettingTracker(serviceRegistry, metaTypeRegistry, this.settingsMap, this.categories);
		tracker.open();
	}
	SettingsRegistry.prototype = /** @lends orion.settings.SettingsRegistry.prototype */ {
		/**
		 * Returns settings.
		 * @param {String} [category] If passed, returns only the settings in the given category. Otherwise, returns all settings.
		 * @returns {orion.settings.Setting[]}
		 */
		getSettings: function(category) {
			var settingsMap = this.settingsMap;
			var pids = typeof category === 'string' ? this.categories[category] : Object.keys(settingsMap); //$NON-NLS-0$
			if (!pids) {
				return [];
			}
			return pids.map(function(pid) {
				return settingsMap[pid];
			});
		},
		/**
		 * Returns all setting categories.
		 * @returns {String[]} The categories.
		 */
		getCategories: function() {
			return Object.keys(this.categories);
		},
		/**
		 * Returns the localized label for a category.
		 * @returns {String} The category label, or <code>null</code> if no localized label is available.
		 */
		getCategoryLabel: function(category) {
			var settings  = this.getSettings(category);
			for (var i = 0; i < settings.length; i++){
				var label = settings[i].getCategoryLabel();
				if (label) {
					return label;
				}
			}
			return null;
		}
	};

	return SettingsRegistry;
});
