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
/*eslint-env amd, browser*/
define([
'orion/objects',
'orion/Deferred'
], function(Objects, Deferred) {
	var config = {
		defaults: {
			"indent_size": 1,
			"indent_char": "\t",
			"eol": "\n",
			"indent_level": 0,
			"indent_with_tabs": false,
			"preserve_newlines": true,
			"max_preserve_newlines": 10,
			"jslint_happy": false,
			"space_after_anon_function": false,
			"brace_style": "collapse",
			"keep_array_indentation": false,
			"keep_function_indentation": false,
			"space_before_conditional": true,
			"break_chained_methods": false,
			"eval_code": false,
			"unescape_strings": false,
			"wrap_line_length": 0,
			"wrap_attributes": "auto",
			"wrap_attributes_indent_size": 1,
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
	 * @name javascript.JavaScriptFormatter
	 * @description creates a new instance of the javascript formatter
	 * @constructor
	 * @public
	 * @param {Worker} ternWorker
	 */
	function JavaScriptFormatter(ternWorker, jsProject) {
		this.ternworker = ternWorker;
		this.project = jsProject;
		config.setDefaults();
	}
	
	Objects.mixin(JavaScriptFormatter.prototype, /** @lends javascript.JavaScriptFormatter.prototype*/ {
		
		/**
		 * @description Callback from the editor to format the source code
		 * @function
		 * @public 
		 * @memberof javascript.JavaScriptFormatter.prototype
		 * @param {orion.edit.EditorContext} editorContext The current editor context
		 * @param {Object} context The current selection context
		 */
		format: function(editorContext, context) {
			var deferred = new Deferred();
			if (this.project) {
				//TODO make sure we can get the options as set in the formatting preference page Right now only the indent character is customizable
				// We should expose all existing options - see defaults above
				this.project.getFormattingOptions().then(function(cfg) {
					this._format(editorContext, deferred, cfg && cfg.formatting && cfg.formatting.vals ? cfg : config.rules);
				}.bind(this));
			} else {
				this._format(editorContext, deferred, config.rules);
			}
			return deferred;
		},
	
		/**
		 * @description Format the given editor
		 * @function
		 * @private
		 * @param {orion.edit.EditorContext} editorContext The given editor context
		 * @param {Deferred} deferred the given deferred object
		 * @param {Object} configuration the given configuration
		 * @since 6.0
		 */
		_format: function(editorContext, deferred, configuration) {
			return editorContext.getFileMetadata().then(function(meta) {
				return editorContext.getSelection().then(function(selection) {
					var start = selection.start;
					var end = selection.end;
					var files, request;
					if (end !== start) {
						return editorContext.getText(start, end).then(function(text) {
							return editorContext.getLineAtOffset(start).then(function(lineNumber) {
								return editorContext.getLineStart(lineNumber).then(function(lineOffset) {
									// check the initial indentation level
									return editorContext.getText(lineOffset, start).then(function(lineStartText) {
										var textToFormat = text;
										var startOffset = start;
										if (/\s/.test(lineStartText)) {
											textToFormat = lineStartText + textToFormat;
											startOffset = lineOffset;
										}
										files = [{type: 'full', name: meta.location, text: textToFormat}]; //$NON-NLS-1$
										request = {request: 'beautify', args: {meta: {location: meta.location}, files: files, config: configuration, start: startOffset, end: end, contentType: meta.contentType.id}}; //$NON-NLS-1$
										this.ternworker.postMessage(
											request, 
											function(formatted, err) {
												if(err) {
													deferred.reject();
												}
												if(formatted && formatted.text) {
													deferred.resolve(editorContext.setText(formatted.text, startOffset, end));
												} else {
													deferred.reject();
												}
											});
										return deferred;
									}.bind(this));
								}.bind(this));
							}.bind(this));
						}.bind(this));
					}
					return editorContext.getText().then(function(text) {
						files = [{type: 'full', name: meta.location, text: text}]; //$NON-NLS-1$
						request = {request: 'beautify', args: {meta: {location: meta.location}, files: files, config: configuration, contentType: meta.contentType.id}}; //$NON-NLS-1$
						this.ternworker.postMessage(
							request, 
							function(formatted, err) {
								if(err) {
									deferred.reject();
								}
								if(formatted && formatted.text) {
									deferred.resolve(editorContext.setText(formatted.text));
								} else {
									deferred.reject();
								}
							});
						return deferred;
					}.bind(this));
				}.bind(this));
			}.bind(this));
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
			var oldconfig = properties.pid === 'jsbeautify.config.js';
			var keys = Object.keys(properties);
			for(var i = 0; i < keys.length; i++) {
				var key = keys[i];
				var originalKey = key;
				/*
				 * Do the key mapping for common options between css, js and html formatters
				 */
				key = key.replace(/^js_/, "");
				var ruleId = key;
				if(oldconfig && config.rules[key] !== config.defaults[key]) {
					//don't overwrite a new setting with an old one
					continue;
				}
				config.setOption(ruleId, properties[originalKey]);
			}
		},
	});
	
	return {
		JavaScriptFormatter: JavaScriptFormatter
	};
});
