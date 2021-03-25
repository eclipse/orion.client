/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/serviceTracker'
], function(ServiceTracker) {
	var PROPERTY_CLASSES = 'classes', PROPERTY_DESIGNATES = 'designates'; //$NON-NLS-0$ //$NON-NLS-1$
	var METATYPE_SERVICE = 'orion.cm.metatype'; //$NON-NLS-0$
	var AttributeDefinitionImpl, ObjectClassDefinitionImpl;

	/**
	 * @name orion.metatype.MetaTypeRegistry
	 * @class Maintains a registry of metatype information.
	 * @description A MetaTypeRegistry provides access to metatype information from the service registry.
	 * @param {orion.serviceRegistry.ServiceRegistry} serviceRegistry The service registry to monitor.
	 */
	function MetaTypeRegistry(serviceRegistry) {
		function forEach(serviceRef, propertyName, func) {
			var array = serviceRef.getProperty(propertyName);
			if (Array.isArray(array))
				array.forEach(func);
		}
		var tracker = new ServiceTracker(serviceRegistry, METATYPE_SERVICE); //$NON-NLS-0$
		var ocdsMap = this.ocdsMap = {}; // OCD Id {String} -> {ObjectClassDefinition}
		var pidsMap = this.pidsMap = {}; // PID {String} -> {ObjectClassDefinition}
		tracker.addingService = function(serviceRef) {
			forEach(serviceRef, PROPERTY_CLASSES, function(ocd) {
				var ocdImpl = new ObjectClassDefinitionImpl(ocd);
				ocdsMap[ocdImpl.getId()] = ocdImpl;
			});
			forEach(serviceRef, PROPERTY_DESIGNATES, function(designate) {
				var pid = designate.pid, ocId = designate.classId;
				if (pid && ocId) {
					// Assume the ObjectClassDefinition has been defined already, either by this service or a service registered earlier.
					pidsMap[pid] = ocdsMap[ocId];
				}
			});
			return serviceRegistry.getService(serviceRef);
		};
		/**
		 * @callback
		 */
		tracker.removedService = function(serviceRef, service) {
			forEach(serviceRef, PROPERTY_CLASSES, function(ocd) {
				delete ocdsMap[ocd.id];
			});
			forEach(serviceRef, PROPERTY_DESIGNATES, function(designate) {
				delete pidsMap[designate.pid];
			});
		};
		tracker.open();
	}
	MetaTypeRegistry.prototype = /** @lends orion.metatype.MetaTypeRegistry.prototype */ {
		/**
		 * Returns the Object Class Definition for a given PID.
		 * @param {String} pid The PID to look up.
		 * @returns {orion.metatype.ObjectClassDefinition} The OCD, or <code>null</code> if no OCD
		 * has been designated for the given PID.
		 */
		getObjectClassDefinitionForPid: function(pid) {
			return this.pidsMap[pid] || null;
		},
		/**
		 * Returns the Object Class Definition with the given ID.
		 * @param {String} classId The Object Class Definition ID to look up.
		 * @returns {orion.metatype.ObjectClassDefinition} The OCD or <code>null</code> if no OCD
		 * with the given ID exists.
		 */
		getObjectClassDefinition: function(classId) {
			return this.ocdsMap[classId] || null;
		}
	};

	/**
	 * @name orion.metatype.impl.ObjectClassDefinitionImpl
	 * @private
	 */
	ObjectClassDefinitionImpl = /** @ignore */ function(ocdJson) {
		this.id = ocdJson.id;
		this.name = ocdJson.name || null;
		var props = ocdJson.properties;
		if (!this.id) {
			throw 'Missing "id" property: ' + JSON.stringify(ocdJson); //$NON-NLS-0$
		}
		if (!(props instanceof Array) || !props.length) {
			throw '"properties" property is missing or empty: ' + JSON.stringify(ocdJson); //$NON-NLS-0$
		}
		this.props = [];
		//cache dependents in declaration order to attach after
		var deps = Object.create(null);
		for (var i = 0, len = props.length; i < len; i++) {
			var attr = new AttributeDefinitionImpl(props[i]),
				dep = attr.getDependsOn();
			if(dep) {
				if(!Array.isArray(deps[dep])) {
					deps[dep] = [];
				}
				deps[dep].push(attr);
			} else {
				this.props.push(attr);
			}
		}
		//attach dependents
		for(i = 0, len = this.props.length; i < len; i++) {
			var children = deps[this.props[i].getId()];
			if(Array.isArray(children) && children.length > 0) {
				this.props[i].children = children;
			}
		}
	};
	ObjectClassDefinitionImpl.prototype = {
		getAttributeDefinitions: function() {
			return this.props;
		},
		getId: function() {
			return this.id;
		},
		getName: function() {
			return this.name;
		}
	};

	/**
	 * @name orion.metatype.impl.AttributeDefinitionImpl
	 * @private
	 */
	AttributeDefinitionImpl = /** @ignore */ function(attrJson) {
		function isType(t) {
			switch (t) {
				case 'boolean': //$NON-NLS-0$
				case 'number': //$NON-NLS-0$
				case 'string': //$NON-NLS-0$
					return true;
			}
		}
		this.id = attrJson.id;
		this.name = attrJson.name || null;
		this.options = attrJson.options || null;
		this.type = attrJson.type || 'string'; //$NON-NLS-0$
		this.defaultValue = typeof attrJson.defaultValue !== 'undefined' ? attrJson.defaultValue : null; //$NON-NLS-0$
		this.dependsOn = typeof attrJson.dependsOn !== 'undefined' ? attrJson.dependsOn : null; //$NON-NLS-0$
		this.children = [];
		if (!this.id) {
			throw 'Missing "id" property: ' + JSON.stringify(attrJson); //$NON-NLS-0$
		}
		if (!isType(this.type)) {
			throw 'Invalid "type": ' + this.type; //$NON-NLS-0$
		}
		if (this.options) {
			this.options.forEach(function(option) {
				if (typeof option.value === 'undefined') { //$NON-NLS-0$
					throw 'Missing option value: ' + JSON.stringify(option); //$NON-NLS-0$
				}
			});
		}
	};
	AttributeDefinitionImpl.prototype = {
		getId: function() {
			return this.id;
		},
		getName: function() {
			return this._nlsName || this.name;
		},
		getOptionLabels: function() {
			return this.options && this.options.map(function(o) {
				return o.label;
			});
		},
		getOptionValues: function() {
			return this.options && this.options.map(function(o) {
				return o.value;
			});
		},
		getType: function() {
			return this.type;
		},
		getDefaultValue: function() {
			return this.defaultValue;
		},
		/**
		 * @name getDependsOn
		 * @description Returns the preference attribute ```dependsOn```
		 * @function
		 * @returns {String} The id of the preference this one depends on
		 * @since 13.0
		 */
		getDependsOn: function getDependsOn() {
			return this.dependsOn;
		},
		/**
		 * @name getAttributeDefinitions
		 * @description Returns the list of dependent properties
		 * @function
		 * @returns {Array.<AttributeDefinitionImpl>} The id of the preference this one depends on
		 * @since 13.0
		 */
		getAttributeDefinitions: function getAttributeDefinitions() {
			return this.children;
		}
	};

	/**
	 * @name orion.metatype.ObjectClassDefinition
	 * @class Describes a kind of object.
	 * @description An <code>ObjectClassDefinition</code> describes a kind of object. <p>It typically serves to describe
	 * what properties may appear in a {@link orion.cm.ConfigurationProperties} dictionary.</p>
	 */
		/**
		 * @name orion.metatype.ObjectClassDefinition#getAttributeDefinitions
		 * @function
		 * @description Returns the attribute definitions.
		 * @returns {orion.metatype.AttributeDefinition[]} The attribute definitions of this Object Class Definition.
		 */
		/**
		 * @name orion.metatype.ObjectClassDefinition#getId
		 * @function
		 * @description Returns the id.
		 * @returns {String} The id of this Object Class Definition.
		 */
		/**
		 * @name orion.metatype.ObjectClassDefinition#getName
		 * @function
		 * @description Returns this Object Class Definition's name.
		 * @returns {String} The name. May be <code>null</code>.
		 */
	/**
	 * @name orion.metatype.AttributeDefinition
	 * @class Describes the data type of a property/attribute.
	 * @description An <code>AttributeDefinition</code> describes the data type of a property/attribute. <p>It typically serves to
	 * describe the type of an individual property that may appear in a {@link orion.cm.ConfigurationProperties} dictionary.</p>
	 */
		/**
		 * @name orion.metatype.AttributeDefinition#getId
		 * @function
		 * @description Returns the id.
		 * @returns {String} The id of this AttributeDefinition.
		 */
		/**
		 * @name orion.metatype.AttributeDefinition#getName
		 * @function
		 * @description Returns the name.
		 * @returns {String} The name, or <code>null</code>.
		 */
		/**
		 * @name orion.metatype.AttributeDefinition#getOptionValues
		 * @function
		 * @description Returns the option values that this attribute can take.
		 * @returns {Object[]|null} The option values. If there are no option values available, <code>null</code> is returned.
		 */
		/**
		 * @name orion.metatype.AttributeDefinition#getOptionLabels
		 * @function
		 * @description Returns a list of labels for option values.
		 * @returns {String[]|null} The option labels. The ordering of the returned array matches the ordering of the values
		 * array returned by {@link #getOptionValues}.
		 * <p>If there are no option labels available, <code>null</code> is returned.</p>
		 */
		/**
		 * @name orion.metatype.AttributeDefinition#getType
		 * @function
		 * @description Returns the type.
		 * @returns {String} The type. It is one of:
		 * <ul>
		 * <li><code>'boolean'</code></li>
		 * <li><code>'number'</code></li>
		 * <li><code>'string'</code></li>
		 * </ul>
		 */
		/**
		 * @name orion.metatype.AttributeDefinition#getDefaultValue
		 * @function
		 * @description Returns the default value.
		 * @returns {Object} The default value, or <code>null</code> if no default exists.
		 */
	return {
		MetaTypeRegistry: MetaTypeRegistry
	};
});
