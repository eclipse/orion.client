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
/* eslint-env amd */
define([
	"i18n!orion/jslint/nls/messages",
	"orion/i18nUtil",
	"plugins/languages/json/jslint" // exports into global scope, stays last
], function(Messages, i18nUtil, _) {
	
	var DEFAULT_VALIDATION_OPTIONS = {
			bitwise: false, eqeqeq: true, es5: true, immed: true, indent: 1, maxerr: 300, newcap: true, nomen: false,
			onevar: false, plusplus: false, regexp: true, strict: false, undef: true, white: false, mixed_spaces_tabs: false
	};
	
	var JSLINTRC = ".jslintrc";
	
	/**
	 * @name readConfigFile
	 * @description Reads the JSLint configuratio file from the "project"
	 * @param {?} meta The file metadata we are about to validate
	 * @returns {?} Returns the JSLint configuration options to use or null
	 * @since 16.0
	 */
	function readConfig(meta) {
		if(!this.project || (this.project && meta.location.indexOf(this.project.Location) !== 0)) {
			return this.getFileClient().getProject(meta.location, {names: [JSLINTRC]}).then(function(project) {
				this.project = project;
				return readFile.call(this, this.project.Location, JSLINTRC);
			}.bind(this));
		}
		return readFile.call(this, this.project.Location, JSLINTRC);
	}
	
	function readFile(projectPath, childName) {
		var _project = this.project ? this.project.Location : projectPath;
		if (_project.lastIndexOf('/') !== _project.length-1){
			_project += '/';
		}
		var filePath = _project+childName;
		return this.getFileClient().read(filePath, false, false, {readIfExists: true}).then(function(child) {
			if(typeof child === 'string') {
				try {
		            return JSON.parse(child);
	            } catch(e) {
	            	return null;
	            }
	        }
			return null;
		},
		function rejected() {
			return null;
		});
	}
	
	/**
	 * @name JsonValidator
	 * @description Creates a new JsonValidator instance
	 * @param {ServiceRegistry} serviceregistry The backing service registry 
	 * @returns {JsonValidator} A new instance
	 * @since 13.0
	 */
	function JsonValidator(serviceregistry) {
		this.registry = serviceregistry;
		this.project = null;
		this.fileClient = null;
	}
	
	/**
	 * @name JsonValidator.prototype.getFileClient
	 * @description Returns the file client to use
	 * @function
	 * @returns {orion.FileClient} The file client
	 */
	JsonValidator.prototype.getFileClient = function getFileClient() {
		if(!this.fileClient) {
			this.fileClient = this.registry.getService("orion.core.file.client"); //$NON-NLS-1$
		}
		return this.fileClient;
	};
	
	/**
	 * @name JsonValidator.prototype.computeProblems
	 * @description The API callback from the platform to compute editor problems
	 * @function
	 * @param {?} editorContext The backing editor context
	 * @param {?} context The state
	 * @returns {Array.<{?}>} The array of Orion problems
	 * @callback
	 */
	JsonValidator.prototype.computeProblems = function computeProblems(editorContext, context) {
		return editorContext.getFileMetadata().then(function(meta) {
			return readConfig.call(this, meta).then(function(config) {
				var cfg = config || DEFAULT_VALIDATION_OPTIONS;
				return editorContext.getText().then(function(text) {
					return _computeProblems(cfg, text);
				});
			});
		}.bind(this));
	};

	/* Runs JSLint on the given contents */
	function jslint(contents, options) {
		JSLINT(contents, options);
		return JSLINT.data();
	}

	/**
	 * @param {Object} options
	 * @param {String} contents Text of file.
	 */
	function _computeProblems(options, contents) {
		var result = jslint(contents, options);
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
					error = _cleanup(error);
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
	
	/* cleans up the JSLint problems to be usable in Orion */
	function _cleanup(error) {
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
	
	return JsonValidator;
});
