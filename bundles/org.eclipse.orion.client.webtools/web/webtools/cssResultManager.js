/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd*/
/*globals Tautologistics */
define([
	'orion/Deferred',
	'orion/objects',
	'javascript/lru',
	'csslint/csslint'
], function(Deferred, Objects, LRU, CSSLint) {

	var registry;
	
	var config = {
		// Define the default values for the rules
		// 0:off, 1:warning, 2:error 3:info
		rules: {
			"adjoining-classes" : 0, // Compat
			"box-model" : 0, // Style
			"box-sizing" : 0, // Compat
			"bulletproof-font-face" : 0, // Compat
			"compatible-vendor-prefixes" : 3, // Compat vendor
			"display-property-grouping" : 3, // Potential problem
			"duplicate-background-images" : 0, // Performance
			"duplicate-properties" : 3, // Potential problem
			"empty-rules" : 3, // Potential problem
			"fallback-colors" : 0, // Compat
			"floats" : 0, // Maintainability
			"font-faces" : 0, // Performance
			"font-sizes" : 0, // Maintainability
			"gradients" : 3, // Compat vendor
			"ids" : 0, // Maintainability
			"import" : 0, // Performance
			"important" : 0, // Maintainability
			"known-properties" : 1, // Potential problem
			"order-alphabetical" : 0, // Maintainability
			"outline-none" : 3, // Style accessibility
			"overqualified-elements" : 0, // Performance
			"qualified-headings" : 0, // OOCSS
			"regex-selectors" : 0, // Performance
			"rules-count" : 0, // Performance
			"selector-max-approaching" : 0, // Compat vendor
			"selector-max" : 3, // Compat vendor
			"shorthand" : 0, // Performance
			"star-property-hack" : 0, // Compat
			"text-indent" : 3, // Style accessibility
			"underscore-property-hack" : 0, // Compat
			"unique-headings" : 0, // OOCSS
			"universal-selector" : 0, // Performance
			"unqualified-attributes" : 0, // Performance
			"vendor-prefix" : 3, // Compat vendor
			"zero-units" : 0 // Performance
		},
		
		/**
		 * @name getRuleSet
		 * @description Returns an editable copy of the ruleset to pass into verify() based on values set in the config settings
		 * @function
		 * @returns {Object} An editable copy of the ruleset based on the config settings
		 */
		getRuleSet: function(){
			return JSON.parse( JSON.stringify( this.rules ) );
		},
		
		/**
		 * @description Sets the given rule to the given enabled value
		 * @function
		 * @private
		 * @param {String} ruleId The id of the rule to change
		 * @param {Number} value The value to set the rule to
		 * @param {Object} [key] Optional key to use for complex rule configuration.
		 */
		setOption: function(ruleId, value, key) {
			if (typeof value === "number") {
				if(Array.isArray(this.rules[ruleId])) {
					var ruleConfig = this.rules[ruleId];
					if (key) {
						ruleConfig[1] = ruleConfig[1] || {};
						ruleConfig[1][key] = value;
					} else {
						ruleConfig[0] = value;
					}
				}
				else {
					this.rules[ruleId] = value;
				}
			}
		}
	};
	
	/**
	 * Provides a shared AST.
	 * @class Provides a shared parsed AST.
	 * @param {Object} serviceRegistry The platform service registry 
	 * @since 8.0
	 */
	function CssResultManager(serviceRegistry) {
		this.cache = new LRU(10);
		registry = serviceRegistry;
	}

	/**
	 * @description Delegate to log timings to the metrics service
	 * @param {Number} end The end time
	 * @since 12.0
	 */
	function logTiming(end) {
		if(registry) {
			var metrics = registry.getService("orion.core.metrics.client"); //$NON-NLS-1$
			if(metrics) {
				metrics.logTiming('language tools', 'parse', end, 'text/css'); //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
			}
		}
	}

	Objects.mixin(CssResultManager.prototype, /** @lends webtools.CssResultManager.prototype */ {
		/**
		 * @param {orion.editor.EditorContext} editorContext
		 * @returns {orion.Promise} A promise resolving to the CSS parse / checking result or null if called
		 * with an incomplete config
		 */
		getResult: function(editorContext) {
			var _self = this;
			return editorContext.getFileMetadata().then(function(metadata) {
				metadata = metadata || {};
				var loc = _self._getKey(metadata);
				var result = _self.cache.get(loc);
				if (result) {
					return new Deferred().resolve(result);
				}
				return editorContext.getText().then(function(text) {
				    var start = Date.now();
					result = CSSLint.verify(text, config.getRuleSet());
					var end = Date.now() - start;
					logTiming(end);
					_self.cache.put(loc, result);
					if(metadata.location) {
					    //only set this if the original metadata has a real location
					    result.fileLocation = metadata.location;
					}
					return result;
				});
			});
		},
		/**
		 * Returns the key to use when caching
		 * @param {Object} metadata The file infos
		 */
		_getKey: function _getKey(metadata) {
		      if(!metadata.location) {
		          return 'unknown'; //$NON-NLS-1$
		      }
		      return metadata.location;
		},

		/**
		 * Callback from the orion.edit.model service
		 * @param {Object} event An <tt>orion.edit.model</tt> event.
		 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#orion.edit.model
		 */
		onModelChanging: function(evt) {
		    if(this.inputChanged) {
		        //TODO haxxor, eat the first model changing event which immediately follows
		        //input changed
		        this.inputChanged = null;
		    } else {
		        this.cache.remove(this._getKey(evt.file));
		    }
		},
		/**
		 * Callback from the orion.edit.model service
		 * @param {Object} event An <tt>orion.edit.model</tt> event.
		 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#orion.edit.model
		 * @callback
		 */
		onInputChanged: function(evt) {
		    this.inputChanged = event;
		    //TODO will add to mult-env
		},
		
		/**
		 * @description Callback from orion.cm.managedservice
		 * @function
		 * @public
		 * @param {Object} properties The properties that have been changed
		 */
		updated: function(properties) {
			if (!properties) {
				return;
			}
			// TODO these option -> setting mappings are becoming hard to manage
			// And they must be kept in sync with webToolsPlugin.js
			config.setOption("adjoining-classes", properties.validate_adjoining_classes); //$NON-NLS-0$
			config.setOption("box-model", properties.validate_box_model); //$NON-NLS-0$
			config.setOption("box-sizing", properties.validate_box_sizing); //$NON-NLS-0$
			config.setOption("compatible-vendor-prefixes", properties.validate_compatible_vendor_prefixes); //$NON-NLS-0$
			config.setOption("display-property-grouping", properties.validate_display_property_grouping); //$NON-NLS-0$
			config.setOption("duplicate-background-images", properties.validate_duplicate_background_images); //$NON-NLS-0$
			config.setOption("duplicate-properties", properties.validate_duplicate_properties); //$NON-NLS-0$
			config.setOption("empty-rules", properties.validate_empty_rules); //$NON-NLS-0$
			config.setOption("fallback-colors", properties.validate_fallback_colors); //$NON-NLS-0$
			config.setOption("floats", properties.validate_floats); //$NON-NLS-0$
			config.setOption("font-faces", properties.validate_font_faces); //$NON-NLS-0$
			config.setOption("font-sizes", properties.validate_font_sizes); //$NON-NLS-0$
			config.setOption("gradients", properties.validate_gradients); //$NON-NLS-0$
			config.setOption("ids", properties.validate_ids); //$NON-NLS-0$
			config.setOption("import", properties.validate_imports); //$NON-NLS-0$ // import is restricted key word
			config.setOption("important", properties.validate_important); //$NON-NLS-0$
			config.setOption("known-properties", properties.validate_known_properties); //$NON-NLS-0$
			config.setOption("order-alphabetical", properties.validate_order_alphabetical); //$NON-NLS-0$
			config.setOption("outline-none", properties.validate_outline_none); //$NON-NLS-0$
			config.setOption("overqualified-elements", properties.validate_overqualified_elements); //$NON-NLS-0$
			config.setOption("qualified-headings", properties.validate_qualified_headings); //$NON-NLS-0$
			config.setOption("regex-selectors", properties.validate_regex_selectors); //$NON-NLS-0$
			config.setOption("rules-count", properties.validate_rules_count); //$NON-NLS-0$
			config.setOption("selector-max-approaching", properties.validate_selector_max_approaching); //$NON-NLS-0$
			config.setOption("selector-max", properties.validate_selector_max); //$NON-NLS-0$
			config.setOption("shorthand", properties.validate_shorthand); //$NON-NLS-0$
			config.setOption("star-property-hack", properties.validate_star_property_hack); //$NON-NLS-0$
			config.setOption("text-indent", properties.validate_text_indent); //$NON-NLS-0$
			config.setOption("underscore-property-hack", properties.validate_underscore_property_hack); //$NON-NLS-0$
			config.setOption("unique-headings", properties.validate_unique_headings); //$NON-NLS-0$
			config.setOption("universal-selector", properties.validate_universal_selector); //$NON-NLS-0$
			config.setOption("unqualified-attributes", properties.validate_unqualified_attributes); //$NON-NLS-0$
			config.setOption("vendor-prefix", properties.validate_vendor_prefix); //$NON-NLS-0$
			config.setOption("zero-units", properties.validate_zero_units); //$NON-NLS-0$
		},
		
		/**
		 * @description Hook for the test suite to enable only the given rule, or set all rules to a certain severity
		 * @function
		 * @private
		 * @param {String} ruleid The id for the rule, if null all rules will be set to the given severity
		 * @param {Number} severity The desired severity or null
		 * @since 8.0
		 */
		_enableOnly: function _enableOnly(ruleid, severity) {
			config.archivedRules = {};
		    var keys = Object.keys(config.rules);
		    for(var i = 0; i < keys.length; i++) {
		    	if (!ruleid){
		    		config.archivedRules[keys[i]] = config.rules[ruleid];
			        config.setOption(keys[i], severity ? severity : 2);
		    	} else {
			        if(keys[i] === ruleid) {
			        	config.archivedRules[ruleid] = config.rules[ruleid];
			            config.setOption(ruleid, severity ? severity : 2);
			        } else {
			        	config.archivedRules[keys[i]] = config.rules[ruleid];
			            config.setOption(keys[i], 0);
			        }
		        }
		    }
		},
		
		/**
		 * @description Hook for the test suite to restore the rule settings after
		 * calling _enableOnly.  Does not support complex rules (csslint doesn't have any currently)
		 * @function
		 * @private
		 * @since 8.0
		 */
		_restoreRules: function _enableOnly() {
			if (config.archivedRules){
				config.rules = config.archivedRules;
				config.archivedRules = undefined;
			}
		},
	});
	return CssResultManager;
});
