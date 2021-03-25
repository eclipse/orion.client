/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
/*global JSLINT*/
define([
	"orion/plugin",
	"orion/jslintworker",
	"orion/objects",
	"i18n!orion/jslint/nls/messages",
	"orion/i18nUtil"
], function(PluginProvider, _, objects, Messages, i18nUtil) {
	var DEFAULT_VALIDATION_OPTIONS = {
			bitwise: false, eqeqeq: true, es5: true, immed: true, indent: 1, maxerr: 300, newcap: true, nomen: false,
			onevar: false, plusplus: false, regexp: true, strict: false, undef: true, white: false
	};
	var validationOptions = DEFAULT_VALIDATION_OPTIONS;
	/* Runs JSLint on the given contents */
	function jslint(contents) {
		JSLINT(contents, validationOptions);
		return JSLINT.data();
	}
	/* cleans up the JSLint problems to be usable in Orion */
	function cleanup(error) {
	    var fixes = [
		  ["Expected '{'", "Statement body should be inside '{ }' braces."], //$NON-NLS-1$ //$NON-NLS-2$
			"Missing semicolon", //$NON-NLS-1$
			"Extra comma", //$NON-NLS-1$
			"Missing property name", //$NON-NLS-1$
			"Unmatched ", //$NON-NLS-1$
			" and instead saw", //$NON-NLS-1$
			" is not defined", //$NON-NLS-1$
			"Unclosed string", //$NON-NLS-1$
			"Stopping, unable to continue" //$NON-NLS-1$
		];
		var description = error.description;
		if(description.indexOf("Dangerous comment") === -1) { //$NON-NLS-1$
    		for (var i=0; i < fixes.length; i++) {
    			var fix = fixes[i],
    			    find = typeof fix === "string" ? fix : fix[0],
    			    replace = typeof fix === "string" ? null : fix[1];
    			if(description.indexOf(find) !== -1 && replace) {
    				error.description = replace;
    			}
    		}
    		//see https://bugs.eclipse.org/bugs/show_bug.cgi?id=488512
    		if(error.raw === 'Unexpected comma.') {
    			error.id = 'no-comma-dangle'; //$NON-NLS-1$
    		}
    		return error;
		}
		return null;
	}

	/**
	 * @description Returns a description message for a JSLint error. Looks at the raw data 
	 * from the error and uses the Orion NLS messages key if one is available
	 * @param error The JSLint error to get a description for
	 * @returns returns Error message either from error.reason or a translated string
	 */
	function _translateError(error){
		var raw = error.raw;
		if (raw){
			if (typeof Messages[raw] === 'string'){
				if (raw.match(/\{a\}|\{b\}|\{c\}|\{d\}/)){
					return i18nUtil.formatMessage(Messages[raw], error.a, error.b, error.c, error.d);
				}
				return Messages[raw];
			}
		} else {
			// If there is an error it may contain a % scanned that we have to translate without raw data
			var match = /(.*)\(([0-9]*)\%/.exec(error.reason);
			if (match){
				return i18nUtil.formatMessage(Messages[match[1].trim()], match[2]);
			} else if (Messages[error.reason.trim()]){
				return i18nUtil.formatMessage(Messages[error.reason.trim()], '100'); //$NON-NLS-1$
			}
		}
		return error.reason;
	}

	/**
	 * @param {Object} options
	 * @param {String} contents Text of file.
	 */
	function _computeProblems(options, contents) {
		var result = jslint(contents);
		var problems = [];
		var i;
		if (result.errors) {
			var errors = result.errors;
			for (i=0; i < errors.length; i++) {
				var error = errors[i];
				if (error) {
					var start = error.character - 1,
					    end = start + 1;
					if (error.evidence) {
						var index = error.evidence.substring(start).search(/.\b/);
						if (index > -1) {
							end += index;
						}
					}
					// Convert to format expected by validation service
					error.description = _translateError(error);
					error.start = error.character;
					error.end = end;
					error = cleanup(error);
					if (error) { problems.push(error); }
				}
			}
		}
		if (result.functions) {
			var functions = result.functions;
			var lines;
			for (i=0; i < functions.length; i++) {
				var func = functions[i];
				var unused = func.unused;
				if (!unused || unused.length === 0) {
					continue;
				}
				if (!lines) {
					lines = contents.split(/\r?\n/);
				}
				var nameGuessed = func.name[0] === '"';
				var funcname = nameGuessed ? func.name.substring(1, func.name.length - 1) : func.name;
				var line = lines[func.line - 1];
				for (var j=0; j < unused.length; j++) {
					// Find "function" token in line based on where fName appears.
					// nameGuessed implies "foo:function()" or "foo = function()", and !nameGuessed implies "function foo()"
					var nameIndex = line.indexOf(funcname);
					var funcIndex = nameGuessed ? line.indexOf("function", nameIndex) : line.lastIndexOf("function", nameIndex); //$NON-NLS-1$ //$NON-NLS-2$
					if (funcIndex !== -1) {
						problems.push({
							reason: "Function declares unused variable '" + unused[j] + "'.", //$NON-NLS-1$ //$NON-NLS-2$
							line: func.line,
							character: funcIndex + 1,
							end: funcIndex + "function".length,
							severity: "warning" //$NON-NLS-1$
						});
					}
				}
			}
		}
		return { problems: problems };
	}

	var validationService = {
		/* ManagedService */
		updated: function(properties) {
			if (properties) {
				if (typeof properties.options === "string") {
					var options = properties.options;
					if (!/^\s*$/.test(options)) {
						var userOptionsMap = {}, hasUserOption = false;
						options.split(/,/).forEach(function(option) {
							var match = /\s*(\w+)\s*:\s*(\w+)\s*/.exec(option); // name:value
							if (match === null) {
								console.log('JSLint ignoring bad option: ' + option); //$NON-NLS-1$
							} else {
								var name = match[1], value = match[2];
								userOptionsMap[name] = value;
								hasUserOption = true;
							}
						});
						validationOptions = {};
						objects.mixin(validationOptions, DEFAULT_VALIDATION_OPTIONS, userOptionsMap);
						if (hasUserOption) {
							console.log('JSLint using user-provided options: {' + Object.keys(userOptionsMap).map(function(k) { //$NON-NLS-1$
								return k + ':' + userOptionsMap[k];
							}).join(',') + "}");
						}
					}
				}
			}
		},
		/* orion.edit.validator */
		computeProblems: function(editorContext, context) {
			return editorContext.getText().then(_computeProblems.bind(null, context));
		}
	};
	/* plugin callback */
	function connect() {
		var headers = {
			name: "Orion JSLint Service", //$NON-NLS-1$
			version: "1.0", //$NON-NLS-1$
			description: "This plugin provides JSLint functionality for validating JSON." //$NON-NLS-1$
		};
		var pluginProvider = new PluginProvider(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}
	/* register all providers */
	function registerServiceProviders(provider) {
		provider.registerService(["orion.edit.validator"], validationService, { //$NON-NLS-1$
			contentType: ["application/json"], //$NON-NLS-1$
		});
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
