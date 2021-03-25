/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 /*eslint-env amd, browser*/
 define([], function() {
	
	/**
	 * @name RuleConfig
	 * @constructs
	 * @description Creates a new RuleConfig instance
	 * @param {?} rules An optional pre-existing collection of rules to initialize this config with
	 * @returns {RuleConfig} A new RuleConfig instance
	 * @since 17.0
	 */
	function RuleConfig(rules) {
		if(rules && typeof rules === 'object') {
			Object.keys(rules).forEach(function(key) {
				this.setOption(key, rules[key] /*, key?, index*/);
			}.bind(this));
		}
	}
	
	RuleConfig.prototype = {
		// 0:off, 1:warning, 2:error
		defaults: Object.freeze({
			//TODO put rule defaults in here
		}),
		/**
		 * @description Sets the given rule to the given enabled value
		 * @function
		 * @private
		 * @param {String} ruleId The id of the rule to change
		 * @param {Number} value The value to set the rule to
		 * @param {Object} [key] Optional key to use for complex rule configuration.
		 */
		setOption: function(ruleId, value, key, index) {
			if(Array.isArray(this.rules[ruleId])) {
				var ruleConfig = this.rules[ruleId];
				var lastIndex = ruleConfig.length - 1;
				if (index) {
					ruleConfig[index] = value;
				} else if (key) {
					ruleConfig[lastIndex] = ruleConfig[lastIndex] || {};
					ruleConfig[lastIndex][key] = value;
				} else {
					ruleConfig[0] = value;
				}
			} else {
				this.rules[ruleId] = value;
			}
		},
		
		/**
		 * @description Resets the rules to their default values
		 * @function
		 */
		setDefaults: function setDefaults() {
			this.rules = Object.create(null);
			var keys = Object.keys(this.defaults);
			for (var i = 0; i < keys.length; i++) {
				var key = keys[i];
				var defaultValue = this.defaults[key];
				if (Array.isArray(defaultValue)) {
					var value = [];
					defaultValue.forEach(function(element) {
						if (typeof element === 'object') {
							var newElement= Object.create(null);
							Object.keys(element).forEach(function (key) {
								newElement[key] = element[key];
							});
							value.push(newElement);
						} else {
							value.push(element);
						}
					});
					this.rules[key] = value;
				} else {
					this.rules[key] = this.defaults[key];
				}
			}
		}
	};
	
	return RuleConfig;
});
