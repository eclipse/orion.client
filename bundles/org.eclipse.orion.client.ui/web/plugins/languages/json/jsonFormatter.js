/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd */
define([
'orion/Deferred',
'plugins/languages/json/beautifier'
], function(Deferred, Beautifier) {
	var config = {
		defaults: {
			"indent_char": " ",
			"preserve_newlines" : true,
			"indent_level": 0,
			"indent_size": 4,
			"eol": '\n',
			"wrap_line_length": 0,
			"end_with_newline": false
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
	 * @name JsonFormatter
	 * @description Creates a new instance of the formatter
	 * @returns {JsonFormatter} A new instance
	 * @since 13.0
	 */
	function JsonFormatter() {
		config.setDefaults();
	}
	
	/**
	 * @description Callback from the editor to format the source code
	 * @function
	 * @public 
	 * @param {orion.edit.EditorContext} editorContext The current editor context
	 * @param {Object} context The current selection context
	 */
	JsonFormatter.prototype.format = function fomat(editorContext, context) {
		var deferred = new Deferred();
		_format(editorContext, deferred, config.rules);
		return deferred;
	};
	
	/**
	 * @description Callback from orion.cm.managedservice
	 * @function
	 * @public
	 * @param {Object} properties The properties that have been changed
	 */
	JsonFormatter.prototype.updated = function updated(properties) {
		if (!properties) {
			return;
		}
		var oldconfig = properties.pid === 'json.config.format';
		var keys = Object.keys(properties);
		var i, key, ruleId, originalKey;
		for(i = 0; i < keys.length; i++) {
			key = keys[i];
			originalKey = key;
			/*
			 * Do the key mapping for common options between css, js and html formatters
			 */
			key = key.replace(/^json_/, "");
			ruleId = key;
			if(oldconfig && config.rules[key] !== config.defaults[key]) {
				//don't overwrite a new setting with an old one
				continue;
			}
			config.setOption(ruleId, properties[originalKey]);
		}
	};
	
	/**
	 * @description Format the given editor
	 * @function
	 * @private
	 * @param {orion.edit.EditorContext} editorContext The given editor context
	 * @param {Deferred} deferred the given deferred object
	 * @param {Object} configuration the given configuration
	 * @since 6.0
	 */
	function _format(editorContext, deferred, configuration) {
		return editorContext.getSelection().then(function(selection) {
			var start = selection.start;
			var end = selection.end;
			if (end !== start) {
				return editorContext.getText(start, end).then(function(text) {
					var formatted = Beautifier.js_beautify(text, configuration);
					if (formatted) {
						deferred.resolve(editorContext.setText(formatted, start, end));
					} else {
						deferred.reject();
					}
					return deferred;
				});
			}
			return editorContext.getText().then(function(text) {
				var formatted = Beautifier.js_beautify(text, configuration);
				if (formatted) {
					deferred.resolve(editorContext.setText(formatted));
				} else {
					deferred.reject();
				}
				return deferred;
			});
		});
	}
		
	return JsonFormatter;
});
