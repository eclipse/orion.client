/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd */
define("webtools/htmlFormatter", [
'orion/objects',
'orion/Deferred',
'beautifier/beautifier'
], function(Objects, Deferred, Beautifier) {
	var config = {
		defaults: {
			"indent_size": 1,
			"indent_char": "\t",
			"indent_inner_html" : false,
			"eol": "\n",
			"end_with_newline": false,
			"wrap_line_length" : 250,
			"brace_style" : "collapse",
			"indent_scripts" : "normal",
			"preserve_newlines" : true,
			"max_preserve_newlines" : 10,
			"indent_handlebars" : false,
			"extra_liners" : "head,body,html",
			"newline_between_rules" : true,
			"space_around_selector_separator" : false,
			"indent_level": 0,
			"space_after_anon_function": false,
			"keep_array_indentation": false,
			"keep_function_indentation": false,
			"space_before_conditional": true,
			"break_chained_methods": false,
			"eval_code": false,
			"unescape_strings": false,
			"wrap_attributes": "auto",
			"wrap_attributes_indent_size": 1,
		},
		
		setOption: function(ruleId, value, key) {
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
		},
		
		/**
		 * @description Resets the rules to their default values
		 * @function
		 */
		setDefaults: function setDefaults() {
			this.rules = Object.create(null);
			var keys = Object.keys(this.defaults);
			for(var i = 0; i < keys.length; i++) {
				var key = keys[i];
				this.rules[key] = this.defaults[key];
			}
		}
	};

	/**
	 * @name javascript.HtmlFormatter
	 * @description creates a new instance of the html formatter
	 * @constructor
	 * @public
	 */
	function HtmlFormatter() {
		config.setDefaults();
	}
	
	Objects.mixin(HtmlFormatter.prototype, /** @lends javascript.HtmlFormatter.prototype*/ {
		
		/**
		 * @description Callback from the editor to format the source code
		 * @function
		 * @public 
		 * @memberof javascript.HtmlFormatter.prototype
		 * @param {orion.edit.EditorContext} editorContext The current editor context
		 * @param {Object} context The current selection context
		 */
		format: function(editorContext, context) {
			return this._format(editorContext, config.rules);
		},
	
		/**
		 * @description Format the given editor
		 * @function
		 * @private
		 * @param {orion.edit.EditorContext} editorContext The given editor context
		 * @param {Object} configuration the given configuration
		 * @since 6.0
		 */
		_format: function(editorContext, configuration) {
			return editorContext.getSelection().then(function(selection) {
				var start = selection.start;
				var end = selection.end;
				if (end !== start) {
					return editorContext.getText(start, end).then(function(text) {
						var formatted = Beautifier.html_beautify(text, configuration);
						if (formatted) {
							return editorContext.setText(formatted, start, end);
						}
						return new Deferred().reject();
					});
				}
				return editorContext.getText().then(function(text) {
					var formatted = Beautifier.html_beautify(text, configuration);
					if (formatted) {
						return editorContext.setText(formatted);
					}
					return new Deferred().reject();
				});
			});
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
			var oldconfig = properties.pid === 'jsbeautify.config.css';
			var keys = Object.keys(properties);
			var i, key, ruleId, originalKey;
			for(i = 0; i < keys.length; i++) {
				key = keys[i];
				originalKey = key;
				/*
				 * Do the key mapping for common options between css, js and html formatters
				 */
				key = key.replace(/^css_/, "");
				ruleId = key;
				if(oldconfig && config.rules[key] !== config.defaults[key]) {
					//don't overwrite a new setting with an old one
					continue;
				}
				config.setOption(ruleId, properties[originalKey]);
			}
			
			oldconfig = properties.pid === 'jsbeautify.config.js';
			keys = Object.keys(properties);
			for(i = 0; i < keys.length; i++) {
				key = keys[i];
				originalKey = key;
				/*
				 * Do the key mapping for common options between css, js and html formatters
				 */
				key = key.replace(/^js_/, "");
				ruleId = key;
				if(oldconfig && config.rules[key] !== config.defaults[key]) {
					//don't overwrite a new setting with an old one
					continue;
				}
				config.setOption(ruleId, properties[originalKey]);
			}

			oldconfig = properties.pid === 'jsbeautify.config.html';
			keys = Object.keys(properties);
			for(i = 0; i < keys.length; i++) {
				key = keys[i];
				originalKey = key;
				/*
				 * Do the key mapping for common options between css, js and html formatters
				 */
				key = key.replace(/^html_/, "");
				ruleId = key;
				if(oldconfig && config.rules[key] !== config.defaults[key]) {
					//don't overwrite a new setting with an old one
					continue;
				}
				config.setOption(ruleId, properties[originalKey]);
			}
		},
	});
	
	return {
		HtmlFormatter: HtmlFormatter
	};
});
