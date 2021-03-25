/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd */
define([
	"requirejs/require",
	"tern/lib/tern",
	"orion/Deferred",
	"orion/objects",
	"i18n!javascript/nls/messages",
	"orion/i18nUtil",
	"javascript/plugins/ternDefaults"
], function(requirejs, Tern, Deferred, Objects, Messages, i18nUtil, defaultOptions) {
	
	var ternserver, 
		scriptresolver, 
		fileclient,
		jsProject;
	
	/**
	 * @name TernServer
	 * @description Creates a new TernServer
	 * @param {ScriptResolver} scriptResolver The resolver used to find scripts for getFile
	 * @param {JavaScriptProject} jsproject The backing Javascript project
	 * @returns {TernServer} A new TernServer instance
	 */
	function TernServer(scriptResolver, jsproject) {
		scriptresolver = scriptResolver;
		fileclient = scriptresolver.getFileClient();
		jsProject = jsproject;
	}
	
	/**
     * @description Add a file to the Tern server
     * @param {String} file The fully qualified name of the file
     * @param {String} text The optional text of the file 
     */
    TernServer.prototype.addFile = function addFile(file, text) {
    	if(ternserver) {
	    	ternserver.addFile(file, text);
		}
    };
    /**
     * @description Checks if the type reference at the given offset matches the given origin type
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the identifier to check
     * @param {Object} origin The original type information
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    TernServer.prototype.checkRef = function checkRef(file, offset, origin, files, callback) {
    	if(ternserver) {
    		ternserver.request({
	           query: {
		           type: "checkRef",  //$NON-NLS-1$
		           file: file,
		           end: offset,
		           origin: origin
	           },
	           files: Array.isArray(files) ? files : []},
	           function(error, type) {
					if(error) {
						callback(null, {error: typeof error === 'string' ? error : error.message, message: Messages['failedType']});
					} else {
						callback(type);
					}
	           });
		} else {
	       callback(null, {message: Messages['failedTypeNoServer']});
	   	}

    };
    /**
     * @description Computes content assist for the given options
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {Boolean} keywords If keywords should be returned as well
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    TernServer.prototype.completions = function completions(file, offset, keywords, files, callback) {
    	if(ternserver) {
	       ternserver.request({
	           query: {
	           type: "completions",  //$NON-NLS-1$
	           file: file,
	           types: true,
	           origins: true,
	           urls: true,
	           docs: true,
	           end: offset,
	           sort:true,
	           expandWordForward: false,
	           omitObjectPrototype: false,
	           includeKeywords: keywords,
	           caseInsensitive: true
	           },
	           files: Array.isArray(files) ? files : []},
	           function(error, completions) {
	               if(error) {
						callback(null, {error: error.message, message: Messages['failedToComputeProposals']});
	               } else if(completions && completions.completions) {
						callback(completions.completions);
	               } else {
						callback([]);
	               }
	           });

	   } else {
	       callback(null, {message: Messages['failedToComputeProposalsNoServer']});
	   }
    };
    /**
     * @description Computes the definition of the identifier at the given offset
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {Boolean} guess If we should take a guess at the definition if one cannot be computed
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    TernServer.prototype.definition = function definition(file, offset, guess, files, callback) {
    	if(ternserver) {
	       ternserver.request({
	           query: {
		           type: "definition",  //$NON-NLS-1$
		           file: file,
		           end: offset,
		           guess: guess
	           },
	           files: Array.isArray(files) ? files : []},
	           function(error, decl) {
	               if(error) {
	                  callback(null, {error: error.message, message: Messages['failedToComputeDecl']});
	               }
	               if(decl && typeof decl.start === 'number' && typeof decl.end === "number") {
						callback(decl);
					} else {
						callback(null);
					}
	           });
	   } else {
	       callback(null, {message: Messages['failedToComputeDeclNoServer']});
	   }
    },
    /**
     * @description Deletes the given file from the server. Does nothing if the file does not exist
     * @param {String] file The fully qualified name of the file to delete
     */
    TernServer.prototype.delFile = function delFile(file) {
    	if(ternserver) {
            ternserver.delFile(file);
        }
    };
    /**
     * @description Computes the documentation associated with the given offset in the file
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {String} docFormat The format of the doc. If not given 'full' is assumed
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    TernServer.prototype.documentation = function documentation(file, offset, docFormat, files, callback) {
    	if(ternserver) {
	       ternserver.request({
	           query: {
		           type: "documentation",  //$NON-NLS-1$
		           file: file,
		           end: offset,
		           docFormat: typeof docFormat === 'string' ? docFormat : 'full' //$NON-NLS-1$
	           },
	           files: Array.isArray(files) ? files : []},
	           function(error, doc) {
	               if(error) {
	                   callback(null, {error: error.message, message: Messages['failedToComputeDoc']});
	               } else if(doc && doc.doc) {
						callback(doc.doc);
	               } else {
						callback(null);
	               }
	           });
	   } else {
	       callback(null, {request: 'documentation', message: Messages['failedToComputeDocNoServer']}); //$NON-NLS-1$
	   }
    };
    /**
     * @description Returns the list of environments from plugins in Tern, if any
     * @param {Function} callback The callback which is called to return the results
     */
    TernServer.prototype.environments = function environments(callback) {
    	if(ternserver) {
	       ternserver.request({
	           query: {
		           type: 'environments' //$NON-NLS-1$
	           }}, 
	           function(error, envs) {
	               if(error) {
	                   callback(null, {error: error.message, message: Messages['failedGetEnvs']});
	               }
	               if(typeof envs === 'object') {
						callback(envs);
					} else {
						callback(null);
					}
	           });
	   } else {
	       callback(null, {message: Messages['failedGetEnvsNoServer']});
	   }
    };
    /**
     * @description Computes the implementation of the identifier at the given offset
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {Boolean} guess If we should take a guess at the definition if one cannot be computed
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    TernServer.prototype.implementation = function implementation(file, offset, guess, files, callback) {
    	if(ternserver) {
	       ternserver.request({
	           query: {
		           type: "implementation",  //$NON-NLS-1$
		           file: file,
		           end: offset,
		           guess: guess
	           },
	           files: Array.isArray(files) ? files : []},
	           function(error, impl) {
	               if(error) {
	                   callback(null, {error: error.message, message: Messages['failedToComputeImpl']});
	               } else  if(impl && impl.implementation && typeof impl.implementation.start === 'number' && typeof impl.implementation.end === "number") {
						callback(impl.implementation);
					} else {
						callback(null);
					}
	           });
	   } else {
	       callback(null, {message: Messages['failedToComputeImplNoServer']});
	   }
    };
    /**
     * @description Returns the list of plugins installed in Tern, if any
     * @param {Function} callback The callback which is called to return the results
     */
    TernServer.prototype.installedPlugins = function installedPlugins(callback) {
    	if(ternserver) {
	       ternserver.request({
	           query: {
		           type: 'installed_plugins' //$NON-NLS-1$
	           }}, 
	           function(error, plugins) {
	               if(error) {
						callback(null, {error: error.message, message: Messages['failedGetInstalledPlugins']});
	               }
	               if(plugins !== null && typeof plugins === 'object') {
						callback(plugins);
					} else {
						callback([]);
					}
	           });
	   } else {
	       callback(null, {message: Messages['failedGetInstalledPluginsNoServer']});
	   }
    };
    /**
     * @description Runs ESLint on the given file context
     * @param {String} file The fully qualified name of the file context
     * @param {Object} rules The map of ESLint rules
     * @param {Object} env The map of existing environment names
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    TernServer.prototype.lint = function lint(file, rules, env, files, callback) {
    	if(ternserver) {
			ternserver.request({
				query: {
					type: "lint",  //$NON-NLS-1$
					file: file,
					config: {
						rules: rules
					},
					env: env ? env : Object.create(null)
				},
				files: Array.isArray(files) ? files : []},
				function(error, problems) {
					if(error) {
						callback(null, {error: error.message, message: Messages['failedToComputeProblems']});
					} else if(problems && Array.isArray(problems)) {
						for (var i = 0; i < problems.length; i++) {
							if (typeof problems[i].lineNumber === 'number'){
								problems[i].line = problems[i].lineNumber;
							}
							if (typeof problems[i].description === 'string'){
								problems[i].message = problems[i].description;
							} else if (typeof problems[i].message === 'string' && problems[i].args){
								var message = i18nUtil.formatMessage(problems[i].message, problems[i].args);
								problems[i].message = message;
							}
						}
						callback(problems);
					} else {
						callback([]);
					}
				});
		} else {
	       callback(null, {message: Messages['failedToComputeProblemsNoServer']});
	   }
    };
    /**
     * @description Computes the occurrences for of the identifier at the given offset
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the cursor / selection
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     * @since 12.0
     */
    TernServer.prototype.occurrences = function occurrences(file, offset, files, callback) {
		if(ternserver) {
    		ternserver.request({
				query: {
					type: "occurrences", //$NON-NLS-1$
					file: file,
					end: offset
				},
				files: Array.isArray(files) ? files : []},
				function(error, occurrences) {
					if(error) {
						callback(null, {error: error.message, message: Messages['failedToComputeOccurrences']});
					} else if(Array.isArray(occurrences)) {
						callback({request: 'outline', occurrences: occurrences}); //$NON-NLS-1$
					} else {
						callback({request: 'outline', occurrences: []}); //$NON-NLS-1$
					}
				}
			);
		} else {
	       callback(null, {message: Messages['failedToComputeOccurrencesNoServer']});
	   }
	};
    /**
     * @description Computes an outline of the given file
     * @param {String} file The fully qualified name of the file context
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    TernServer.prototype.outline = function outline(file, files, callback) {
    	if(ternserver) {
    		ternserver.request({
				query: {
					type: "outline", //$NON-NLS-1$
					file: file
				},
				files: Array.isArray(files) ? files : []},
				function(error, outline) {
					if(error) {
						callback(null, {error: error.message, message: Messages['failedToComputeOutline']});
					} else if(outline && Array.isArray(outline)) {
						callback(outline);
					} else {
						callback([]);
					}
				}
			);
		} else {
	       callback(null, {message: Messages['failedToComputeOutlineNoServer']});
	   }
    };
    /**
     * @description Computes the quickfixes for the given annotation, and optionally the list of similar annotations
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {Object} annotation The annotation from the editor which has the minimum form: {start, end, id, fixid}
     * @param {Array.<Object>} annotations The optional array of similar annnotatons to the one the request is made to fix
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    TernServer.prototype.fixes = function fixes(file, annotation, annotations, files, callback) {
    	if(ternserver) {
    		var id = annotation.fixid ? annotation.fixid : annotation.id;
    		ternserver.request({
				query: {
					type: "fixes", //$NON-NLS-1$
					file: file,
					problemId: id,
					annotation: annotation,
					annotations: annotations
				},
				files: files
			},
			function(error, fixes) {
				if(error) {
					callback({request: 'fixes', error: error.message, message: Messages['failedToComputeFixes']}); //$NON-NLS-1$
				} else if(fixes && Array.isArray(fixes)) {
					callback({request: 'fixes', fixes: fixes}); //$NON-NLS-1$
				} else {
					callback({request: 'fixes', fixes: []}); //$NON-NLS-1$
				}
			}
		);
    	} else {
    		callback(null, {message: Messages['failedQuickfixesNoServer']});
    	}
    };
    /**
     * @description Computes a rename array for the identifier at the given offset
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {String} newname The new name to change to
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    TernServer.prototype.rename = function rename(file, offset, newname, files, callback) {
    	if(ternserver) {
	       ternserver.request({
	           query: {
		           type: "rename",  //$NON-NLS-1$
		           file: file,
		           end: offset,
		           newName: newname
	           },
	           files: Array.isArray(files) ? files : []},
	           function(error, changes) {
	               if(error) {
						callback(null, {error: error.message, message: Messages['failedRename']});
	               } else if(changes && Array.isArray(changes.changes)) {
						callback(changes.changes);
	               } else {
						callback([]);
	               }
	           });
	   } else {
	       callback(null, {message: Messages['failedRenameNoServer']});
	   }
    };
    
    function mergeArray(target, source) {
		if(Array.isArray(target) && Array.isArray(source)) {
			if(target.length < 1 ) {
				for(var i = 0, len = source.length; i < len; i++) {
					target.push(source[i]);
				}
			} else {
				for(i = 0, len = source.length; i < len; i++) {
					if(target.indexOf(source[i]) < 0) {
						target.push(source[i]);
					}
				}
			}
		}
	}
	
	function removeEntry(target, item) {
		if(Array.isArray(target)) {
			var idx = target.indexOf(item);
			if(idx > -1) {
				target.slice(idx, idx+1);
			}
		}
	}
	/**
	 * @description Start up the Tern server, send a message after trying
     * @param {Object} jsonOptions The optional map of JSON options to start the server with
     * @param {Function} callback The callback which is called to return the results
     */
    TernServer.prototype.startServer = function startServer(jsonOptions, callback) {
		if (ternserver){
			ternserver.reset();
			ternserver = null;
		}
        var options = {
            async: true,
            debug: false,
            projectDir: '/',
            getFile: doRead,
            plugins: defaultOptions.plugins.required,
            defs: defaultOptions.defs,
            ecmaVersion: 7
        };
        var pluginsDir = defaultOptions.pluginsDir;
    	var defNames = [], plugins, projectLoc;
        if (jsonOptions) {
			projectLoc = jsonOptions.projectLoc;
			plugins = jsonOptions.plugins;
			pluginsDir = jsonOptions.pluginsDir;
			mergeArray(defNames, jsonOptions.libs);
			mergeArray(defNames, jsonOptions.defs);
			if(Array.isArray(jsonOptions.loadEagerly) && jsonOptions.loadEagerly.length > 0) {
				options.loadEagerly = jsonOptions.loadEagerly;
			}
			if (typeof jsonOptions.ecmaVersion === 'number') {
				options.ecmaVersion = jsonOptions.ecmaVersion;
				if(options.ecmaVersion === 5) {
					mergeArray(defNames, ['ecma5']);
					removeEntry(defNames, 'ecma6');
					removeEntry(defNames, 'ecma7');
				} else if(options.ecmaVersion === 6) {
					mergeArray(defNames, ["ecma5", "ecma6"]);
					removeEntry(defNames, 'ecma7');
				} else if(options.ecmaVersion === 7) {
					mergeArray(defNames, ["ecma5", "ecma6", "ecma7"]);
				}
			}
			if (typeof jsonOptions.sourceType === 'string') {
				options.sourceType = jsonOptions.sourceType;
			}
			if (typeof jsonOptions.dependencyBudget === 'number') {
				options.dependencyBudget = jsonOptions.dependencyBudget;
			}
			if(Array.isArray(jsonOptions.dontLoad)) {
				var valid = true;
				for(var i = 0, len = jsonOptions.dontLoad.length; i < len; i++) {
					if(typeof jsonOptions.dontLoad[i] !== 'string') {
						valid = false;
						break;
					}
				}
				if(valid) {
					options.dontLoad = jsonOptions.dontLoad;
				}
			}
        }
        //plugins
        if(plugins && typeof plugins === 'object') {
	        Objects.mixin(options.plugins, plugins);
        }
        //definitions
        if(!Array.isArray(defNames) || defNames.length < 1) {
			defNames = [];
        } else {
        	defNames = defNames.sort();
        }
        /**
         * @description Start the server with the default options in the event a problem occurrs
         * @param {Error} err The error object from the failed deferred
         */
        function fallback(err) {
        	options = defaultOptions.serverOptions();
        	options.getFile = doRead;
			startAndMessage(options);
	        if(err) {
				callback(null, err);
	        }
        }
        /**
         * @description Starts the tern server wit the given options
         * @param {Object} options The options to start the server with
         */
        function startAndMessage(options) {
			ternserver = new Tern.Server(options);
			if(Array.isArray(options.loadEagerly) && options.loadEagerly.length > 0) {
				options.loadEagerly.forEach(function(file) {
					ternserver.addFile(file);
				});
			}
			callback({request: 'start_server', state: "server_ready"}); //$NON-NLS-1$ //$NON-NLS-2$
		}
		Deferred.all(loadPlugins(options.plugins, pluginsDir)).then(/* @callback */ function(plugins) {
			Deferred.all(loadDefs(defNames, projectLoc)).then(function(json) {
				options.defs = json;
				startAndMessage(options);
			}, fallback);
		}, fallback);
    };
    /**
     * @description Computes the type information at the given offset
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {Function} callback The callback which is called to return the results
     */
    TernServer.prototype.type = function type(file, offset, callback) {
    	if(ternserver) {
    		ternserver.request({
	           query: {
		           type: "type",  //$NON-NLS-1$
		           file: file,
		           end: offset
	           }},
	            function(error, type) {
	               if(error) {
	                   callback(null, {error: typeof error === 'string' ? error : error.message, message: Messages['failedType']});
	               } else {
						callback(type);
	               }
	            });
	 	} else {
	       callback(null, {message: Messages['failedTypeNoServer']});
	   }
    };
	
    /**
     * @description Loads the plugins listed in the given plugins object
     * @param {Object} plugins The object of plugins
     * @param {String} pluginsDir The base directory to load plugins from, if not defined, the default of 'tern/plugin/' is assumed
     * @returns {Promise} The promise to resolve all of the plugin loads
     * @since 11.0
     */
    function loadPlugins(plugins, pluginsDir) {
		var promises = [];
		//TODO disable for now, as it does not work 
//		if(plugins) {
//			Object.keys(plugins).forEach(function(key) {
//				if(plugins.required[key] || plugins.optional[key]) {
//					//default plugins are statically loaded
//					return;
//				}
//				var plugin = plugins[key];
//				if(!plugin || typeof plugin !== 'object') {
//					return;
//				}
//				var loc = plugin.location;
//				if(typeof loc !== 'string') {
//					if(typeof pluginsDir === 'string') {
//						loc = pluginsDir + key;
//					} else {
//						//assume it is in /tern/plugin/
//						loc = 'tern/plugin/' + key; //$NON-NLS-1$
//					}
//				}
//				var deferred = new Deferred();
//				try {
//					promises.push(deferred);    		
//					requirejs([loc], function(_) {
//						deferred.resolve(_);
//					},
//					function(err) {
//						deferred.reject(err);
//					});
//				}
//				catch(err) {
//					deferred.reject(err);
//				}
//			});
//		}
		return promises;
    }
    
    /**
     * @description Load any defs from the .tern-project file
     * @param {Array.<String>|Object} defs The definitions, either from an array of names or an object of names with additional metadata
     * @param {String} projectLoc The location of the project we are reading configs from
     * @returns {Promise} Returns a promise to resolve all def loads
     * @since 11.0
     */
    function loadDefs(defs, projectLoc) {
		var _defs = [];
		if(Array.isArray(defs)) {
			defs.forEach(function(_def) {
				if(/^\.definitions/.test(_def)) {
					if(typeof _def === 'string') {
						var deferred = _loadDef(_def, projectLoc);
						if(deferred) {
							_defs.push(deferred);
						}
					}
				} else {
					var idx = defaultOptions.defNames.indexOf(_def);
					if(idx > -1) {
						//a default def, get it
						_defs.push(new Deferred().resolve(defaultOptions.defs[idx]));
					} else {
						//TODO do we want to support loading defs from arbitrary locations?
					}
				}
			});
		}
		return _defs;
    }
    
    /**
     * @description Delegate to actually load a definition
     * @private
     * @param {String} def The name of the definition load try and load
     * @param {String} projectLoc The location of the project we are reading configs from
     * @since 11.0
     */
    function _loadDef(def, projectLoc) {
		var loc = def;
		if(projectLoc) {
			loc = projectLoc + loc;
		}
		if(!/$.json/i.test(def)) {
			loc = loc + '.json'; //$NON-NLS-1$
		}
		var deferred = new Deferred();
		doRead(loc, function(err, contents) {
			if(typeof contents === 'string') {
				var o = contents.length > 0 ? JSON.parse(contents) : Object.create(null);
				deferred.resolve(o);
			} else {
				deferred.reject(err);
			}
		});
		return deferred;
    }
    
    /**
	 * @description Handler for Tern read requests
	 * @param {Object|String}} file The file to read
	 * @param {Function} callback The finction to call back to
	 */
	function doRead(file, callback) {
		if(typeof file === 'object') {
			if(file.env === 'node') {
				if (!/^[\.]+/.test(file.logical)) {
					_nodeRead(callback, file.logical);
				} else {
					_readRelative(callback, file.logical);
				}
			} else {
				if (!/^[\.]+/.test(file.logical)) {
					scriptresolver.getWorkspaceFile(file.logical).then(function(files) {
						if(files && files.length > 0) {
							return _normalRead(callback, files[0].location);
						}
						_failedRead(callback, files[0].location, "File not found in workspace");
					},
					function(err) {
						_failedRead(callback, file.logical, err);
					});
				} else {
					_readRelative(callback, file.logical);
				}
			}
		} else {
			_normalRead(callback, file);
		}
	}
   
	/**
	 * @since 12.0
	 */
	function _nodeRead(callback, filePath) {
		var project = jsProject ? jsProject.getProjectPath() : null;
		if(project) {
			return fileclient.read(project+"node_modules/"+filePath+"/package.json", false, false, {readIfExists: true}).then(function(json) {
				if(json) {
					var val = JSON.parse(json);
					var mainPath = null;
					var main = val.main;
					if (main) {
						if (!/(\.js)$/.test(main)) {
							main += ".js";
						}
						mainPath = project + "node_modules/" + filePath + "/" + main;
					} else {
						main = "index.js";
						mainPath = project + "node_modules/" + filePath + "/index.js";
					}
					return fileclient.read(mainPath).then(function(contents) {
						callback(null, {contents: contents, file: mainPath, path: main, logical: filePath});
					},
					function(err) {
						_failedRead(callback, "node_modules", err);
					});
				}
				_failedRead(callback, filePath, "No contents");
			},
			function(err) {
				_failedRead(callback, filePath, err);
			});
		} 
		_failedRead(callback, filePath, "No project context");
	}
	/**
	 * @since 12.0
	 */
	function _normalRead(callback, filePath) {
		if(!/\.js|\.htm|\.htm|\.json$/ig.test(filePath)) {
			//no extension given, guess at js
			filePath += '.js'; //$NON-NLS-1$
		}
		return fileclient.read(filePath).then(function(contents) {
			callback(null, {file: filePath, contents: contents});
		},
		function(err) {
			_failedRead(callback, filePath, err);
		});
	}
		
	/**
	 * @since 12.0
	 */
	function _failedRead(callback, fileName, err) {
		var _e = {message: err.toString(), reason: i18nUtil.formatMessage(Messages['failedToReadFile'], fileName)};
		callback(_e, fileName);
	}
	/**
	 * @since 12.0
	 */
	function _readRelative(callback, logical, filePath) {
		scriptresolver.getWorkspaceFile(logical).then(function(files) {
			if(files && files.length > 0) {
				var rel = scriptresolver.resolveRelativeFiles(logical, files, {location: filePath, contentType: {name: 'JavaScript'}}); //$NON-NLS-1$
				if(rel && rel.length > 0) {
					return fileclient.read(rel[0].location).then(function(contents) {
						callback(null, {logical: logical, file: rel[0].location, contents: contents, path: rel[0].path});
					});
				}
				_failedRead(callback, logical, "No relative matches found");
			} else {
				_failedRead(callback, logical, "No workspace matches found");
			}
		},
		function(err) {
			_failedRead(callback, logical, err);
		});
	}
    
    return TernServer;
});
