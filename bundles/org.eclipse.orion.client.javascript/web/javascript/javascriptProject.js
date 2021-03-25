/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2018 IBM Corporation and others.
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
	"orion/Deferred",
	"js-yaml/js-yaml",
	"orion/util"
], function(Deferred, JsYaml, Util) {

	var eslintHandler = {
		_update: function _update(project, fileName) {
			if(project.lintFiles.indexOf(fileName) > -1) {
				delete project.map.eslint;
			} else if (fileName === project.JSBEAUTIFYRC) {
				delete project.map.formatting;
			}
		},
		/**
		 * @callback
		 */
		onModified: function onModified(project, qualifiedName, fileName) {
			this._update(project, fileName);
		},
		/**
		 * @callback
		 */
		onDeleted: function onDeleted(project, qualifiedName, fileName) {
			this._update(project, fileName);
		},
		/**
		 * @callback
		 */
		onCreated: function onCreated(project, qualifiedName, fileName) {
			this._update(project, fileName);
		},
		/**
		 * @callback
		 */
		onMoved: function onMoved(project, qualifiedName, fileName, toQualified, toName) {
			this._update(project, fileName);
		},
		/**
		 * @callback
		 */
		onProjectChanged: function onProjectChanged(project, evnt, projectName) {
			delete project.map.eslint;
			delete project.map.formatting;
		}
	};

	/**
	 * @description This handler updates the 'env' map.
	 * @type {?}
	 * @since 14.0
	 */
	var envHandler = {
		/**
		 * @callback
		 */
		onCreated: function onCreated(project, qualifiedName, fileName) {
			this.setUpdateRequired(project, qualifiedName, fileName);
		},
		/**
		 * @callback
		 */
		onDeleted: function onDeleted(project, qualifiedName, fileName) {
			this.setUpdateRequired(project, qualifiedName, fileName);
		},
		/**
		 * @callback
		 */
		onModified: function onModified(project, qualifiedName, fileName) {
			this.setUpdateRequired(project, qualifiedName, fileName);
		},
		/**
		 * @name setUpdateRequired
		 * @description Sets the state of the computed environemnt to needing an update
		 * @function
		 * @param {JavaScriptProject.prototype} project The backing project making the callback
		 * @param {string} qualifiedName The fully qualified name of the file that has changed
		 * @param {string} fileName The file name
		 * @since 16.0
		 */
		setUpdateRequired: function setUpdateRequired(project, qualifiedName, fileName) {
			var important = project.importantChange(qualifiedName, fileName);	
			if(important) {
				project.updateNeeded = true;
			}
		}
	};
	
	var initialized = false;

	/**
	 * @description Creates a new JavaScript project
	 * @constructor
	 * @public
	 * @param {ServiceRegistry} serviceRegistry The service registry
	 * @since 12.0
	 */
	function JavaScriptProject(serviceRegistry) {
		this.projectMeta = null;
		this.map = Object.create(null);
		this.registry = serviceRegistry;
		this.fileClient = null;
		this.handlers = [eslintHandler, envHandler];
        this.lintFiles = [this.ESLINTRC_JS, this.ESLINTRC_JSON, this.ESLINTRC, this.ESLINTRC_YAML, this.ESLINTRC_YML, this.PACKAGE_JSON];
		this.projectFiles = [this.PACKAGE_JSON, this.TERN_PROJECT].concat(this.lintFiles);
	}
	/**
	 * The .tern-project file name
	 */
	JavaScriptProject.prototype.TERN_PROJECT = '.tern-project';
	/**
	 * The .eslintrc file name
	 * @see http://eslint.org/docs/user-guide/configuring#configuration-file-formats
	 */
	JavaScriptProject.prototype.ESLINTRC = '.eslintrc';
	/**
	 * The .eslintrc.js file name
	 * @see http://eslint.org/docs/user-guide/configuring#configuration-file-formats
	 */
	JavaScriptProject.prototype.ESLINTRC_JS = '.eslintrc.js';
	/**
	 * The .eslintrc.yaml file name
	 * @see http://eslint.org/docs/user-guide/configuring#configuration-file-formats
	 */
	JavaScriptProject.prototype.ESLINTRC_YAML = '.eslintrc.yaml';
	/**
	 * The .eslintrc.yml file name
	 * @see http://eslint.org/docs/user-guide/configuring#configuration-file-formats
	 */
	JavaScriptProject.prototype.ESLINTRC_YML = '.eslintrc.yml';
	/**
	 * The .eslintrc.json file name
	 * @see http://eslint.org/docs/user-guide/configuring#configuration-file-formats
	 */
	JavaScriptProject.prototype.ESLINTRC_JSON = '.eslintrc.json';
	/**
	 * The project.json file name
	 */
	JavaScriptProject.prototype.PROJECT_JSON = 'project.json';
	/**
	 * The package.json file name
	 */
	JavaScriptProject.prototype.PACKAGE_JSON = 'package.json';
	/**
	 * The jsconfig.json file name
	 */
	JavaScriptProject.prototype.JSCONFIG_JSON = 'jsconfig.json';
	/**
	 * The node_modules folder name
	 */
	JavaScriptProject.prototype.NODE_MODULES = 'node_modules';
	/**
	 * The .jsbeautifyrc file name
	 * @see https://github.com/beautify-web/js-beautify/blob/master/README.md
	 */
	JavaScriptProject.prototype.JSBEAUTIFYRC = '.jsbeautifyrc';
	/**
	 * The .definitions folder name
	 * @since 14.0
	 */
	JavaScriptProject.prototype.DEFINITIONS = '.definitions';
	/**
	 * @description Adds a handler for the given file name to the mapping of handlers
	 * @function
	 * @param {Object} functions The object map of functions
	 */
	JavaScriptProject.prototype.addHandler = function addHandler(functions) {
		this.handlers.push(functions);
	};

	/**
	 * @description Returns the current project path
	 * @function
	 * @returns {String} The current project path or null if there is no project context
	 */
	JavaScriptProject.prototype.getProjectPath = function getProjectPath() {
		if(this.projectMeta) {
			return this.projectMeta.Location;
		}
		return null;
	};

	/**
	 * @description Fetch the named child of the current project context
	 * @function
	 * @param {String} childName The short name of the project child to get
	 * @param {String} projectPath The optional project path to fetch from
	 * @returns {Deferred} A deferred that will resolve to the requested child metadata or null
	 */
	JavaScriptProject.prototype.getFile = function getFile(childName, projectPath) {
		if(!this.projectMeta && !projectPath) {
			return new Deferred().resolve(null);
		}
		var _project = this.projectMeta ? this.projectMeta.Location : projectPath;
		if (_project.lastIndexOf('/') !== _project.length-1){
			_project += '/';
		}
		var filePath = _project+childName;
		if(this.map[filePath]) {
			return new Deferred().resolve(this.map[filePath]);
		}
		return this.getFileClient().read(filePath, false, false, {readIfExists: true}).then(function(child) {
			if(child !== null) {
	            this.map[filePath] = {name: filePath, contents: child, project: _project};
	            return this.map[filePath];
	        }
			return null;
		}.bind(this),
		function rejected() {
			return null;
		});
	};
	 
	/** 
	 * @description Fetch the children of the named child folder of the current project context
	 * @function
	 * @param {String} childName The short name of the project child to get
	 * @param {String} projectPath The optional project path to fetch from
	 * @returns {Deferred} A deferred that will resolve to the requested child metadata or null
	 * @since 14.0
	 */
	JavaScriptProject.prototype.getFolder = function getFolder(childName, projectPath) {
		if(!this.projectMeta && !projectPath) {
			return new Deferred().resolve(null);
		}
		var _project = this.projectMeta ? this.projectMeta.Location : projectPath;
		if (_project.lastIndexOf('/') !== _project.length-1){
			_project += '/';
		}
		var folderPath = _project+childName;
		return this.getFileClient().fetchChildren(folderPath, {readIfExists: true}).then(function(children) {
            return children;
		},
		function rejected() {
			return [];
		});
	};

	/**
	 * @name JavaScriptProject.prototype.initFrom
	 * @description Callback used to start the tooling from a non-plugin context - for example running the 'Show Problems'
	 * command on a folder prior to opening a JS file
	 * @function
	 * @param {String} path The file path that the tooling started from
	 * @returns {Deferred} A deferred to resolve once loading has completed
	 */
	JavaScriptProject.prototype.initFrom = function initFrom(path) {
		var refresh = false;
		if(this.projectMeta && path.indexOf(this.projectMeta.Location) < 0) {
			refresh = true;
		}
		if(!initialized || refresh) {
			initialized = true;
			return this.getFileClient().read(path, true, false, {readIfExists: true}).then(function(child) {
				if(child) {
					this.onInputChanged({file: child});
				}
			}.bind(this));
		}
		return new Deferred().resolve();
	};

	/**
	 * @description Update the contents of the given file name, and optionally create the file if it does not exist.
	 * NOTE: this function does not check for existig values or duplicate entries, those checks must be done prior to calling
	 * this function with the JSON values to merge
	 * @function
	 * @param {String} childName The short name of the project child to get
	 * @param {Boolean} create If the file should be created if it does not exist
	 * @param {Object} values The object of values to mix-in to the current values for a file.
	 */
	JavaScriptProject.prototype.updateFile = function updateFile(childName, create, values) {
		if(this.projectMeta) {
			return this.getFile(childName).then(function(child) {
				var contents = child ? child.contents : null;
				if(typeof contents === 'string') {
					var json;
					if (contents.length) {
						json = JSON.parse(contents);
						_merge(values, json);
					} else {
						json = values;
					}
					return this.getFileClient().write(this.projectMeta.Location+childName, JSON.stringify(json, null, '\t'));
				} else if(create) {
					return this.getFileClient().createFile(this.projectMeta.Location, childName).then(function(file) {
						json = _defaultsFor(childName);
						if(json) {
							_merge(json, values);
						}
						return this.getFileClient().write(file.Location, JSON.stringify(values, null, '\t'));
					}.bind(this));
				}
			}.bind(this));
		}
	};

	/**
	 * @description Get the defaults used when creating a new tracked file
	 * @private
	 * @param {String} filename The name of tracked file to create
	 * @returns {{}|null} An object of default values or null
	 * @since 13.0
	 */
	function _defaultsFor(filename) {
		switch(filename) {
			case JavaScriptProject.prototype.TERN_PROJECT: {
				var json = Object.create(null);
				json.ecmaVersion = 7;
				json.libs = ['ecma5', 'ecma6', 'ecma7'];
				json.plugins = Object.create(null);
				json.loadEagerly = [];
				return json;
			}
			default:
				return null;
		}
	}

	/**
	 * @name _merge
	 * @description Merges the source and the destination
	 * @private
	 * @param {Array.<?>} source The source array
	 * @param {Array.<?>} dest The destination to merge to
	 */
	function _merge(source, dest) {
		Object.keys(source).forEach(function(key) {
			if(Array.isArray(dest[key]) && Array.isArray(source[key])) {
				dest[key] = [].concat(dest[key], source[key]);
			} else if(typeof dest[key] === 'object' && dest[key] !== null) {
				source[key] = source[key] || Object.create(null);
				_merge(source[key], dest[key]);
			} else {
				dest[key] = source[key];
			}
		});
	}

	/**
	 * @name JavaScriptProject.prototype.getFileClient
	 * @description Returns the file client to use
	 * @function
	 * @returns {orion.FileClient} The file client
	 */
	JavaScriptProject.prototype.getFileClient = function getFileClient() {
		if(!this.fileClient) {
			this.fileClient = this.registry.getService("orion.core.file.client"); //$NON-NLS-1$
		}
		return this.fileClient;
	};

	/**
	 * @name JavaScriptProject.prototype.getESlintOptions
	 * @description Returns project-specific eslint options (if any)
	 * @function
	 * @returns {Deferred} A deferred that will resolve to the project-specific eslint options or null
	 * @see http://eslint.org/docs/user-guide/configuring
	 */
	JavaScriptProject.prototype.getESlintOptions = function getESlintOptions() {
		if(this.map.eslint) {
			return new Deferred().resolve(this.map.eslint);
		}
        return this.getFile(this.ESLINTRC_JS).then(function(file) {
        	if(file && file.contents) {
        		return readAndMap(this.map, file, "eslint", this);
        	}
        	return this.getFile(this.ESLINTRC_JSON).then(function(file) {
        		if(file && file.contents) {
	        		return readAndMap(this.map, file, "eslint", this);
	        	}
	        	return this.getFile(this.ESLINTRC).then(function(file) {
	        		if(file && file.contents) {
		        		return readAndMap(this.map, file, "eslint", this);
		        	}
		        	return this.getFile(this.ESLINTRC_YAML).then(function(file) {
		        		if(file && file.contents) {
			        		return readAndMap(this.map, file, "eslint", this);
			        	}
			        	return this.getFile(this.ESLINTRC_YML).then(function(file) {
			        		if(file && file.contents) {
				        		return readAndMap(this.map, file, "eslint", this);
				        	}
				        	return null;
			        	}.bind(this));
		        	}.bind(this)); 
	        	}.bind(this));
	    	}.bind(this));
        }.bind(this));
	};

	/**
	 * @name JavaScriptProject.prototype.getFormattingOptions
	 * @description Returns project-specific formatting options (if any)
	 * @function
	 * @returns {Deferred} A deferred that will resolve to the project-specific formatting options or null
	 * @see https://github.com/beautify-web/js-beautify
	 */
	JavaScriptProject.prototype.getFormattingOptions = function getFormattingOptions() {
		if(this.map.formatting) {
			return new Deferred().resolve(this.map.formatting);
		}
		return this.getFile(this.JSBEAUTIFYRC).then(function(file) {
			if(file && file.contents) {
				return readAndMap(this.map, file, "formatting", this);
			}
			return null;
		}.bind(this));
	};
	
	/**
	 * @name JavaScriptProject.prototype.importantChange
	 * @description Returns if the file changed was an important change requiring a Tern restart
	 * @function
	 * @param {String} qualifiedName The fully qualified name of the changed file
	 * @param {String} filename The name of the changed file
	 * @returns {Boolean} True if an important project configuration file has changed
	 * @since 14.0
	 */
	JavaScriptProject.prototype.importantChange = function importantChange(qualifiedName, filename) {
		if(this.projectFiles.indexOf(filename) > -1) {
			return true;
		}
		if(this.NODE_MODULES === filename) {
			return true;
		}
		var folderPath = this.getProjectPath()+this.DEFINITIONS;
		//check for valid names from events
		//see https://bugs.eclipse.org/bugs/show_bug.cgi?id=525696
		return qualifiedName === folderPath || (qualifiedName && qualifiedName.indexOf(folderPath) === 0);
	};

	/**
	 * @name JavaScriptProject.prototype.getComputedEnvironment
	 * @description Computes the environment that has been computed based on what config files are in the project
	 * @function
	 * @returns {Deferred} A deferred that will resolve to an object listing the computed environments to use in the tools
	 * @since 14.0
	 */
	JavaScriptProject.prototype.getComputedEnvironment = function getComputedEnvironment() {
		if(!this.projectPromise) {
			return new Deferred().reject("The project has not been initialized");
		}
		return this.projectPromise.then(function() {
			if(this.updateNeeded) {
				this.projectPromise = new Deferred();
				this.updateNeeded = false;
				return computeEnvironment(this, true).then(function() {
					this.projectPromise.resolve();
					return this.map.env;
				}.bind(this));
			}
			return this.map.env;
		}.bind(this));
	};
	
	/**
	 * @description Computes the environment for a given project context
	 * @param {JavaScriptProject} project The project to compute the environment for
	 * @since 14.0
	 */
	function computeEnvironment(project, update) {
		if(!update) {
			return new Deferred().resolve(project.map.env);
		}
		project.map.env = {};
		project.map.env.envs = {browser: true, node: true}; //always start assuming browser
		return project.getFile(project.TERN_PROJECT).then(function(file) {
			processTernProject(project, file);
			if(typeof project.map.env.sourceType !== 'string'){
				project.map.env.sourceType = 'script';
			}
			return project.getESlintOptions().then(function(options) {
				processEslintOptions(project, options);
				if(typeof project.map.env.ecmaVersion !== 'number') {
					project.map.env.ecmaVersion = 7;
				}
				return project.getFile(project.NODE_MODULES).then(function(file) {
					if(file && typeof file.contents === "string") {
						project.map.env._node_modules = true;
					}
					return project.getFile(project.PACKAGE_JSON).then(function(file) {
						processPackageJson(project, file);
						return project.getFolder(project.DEFINITIONS).then(function(children) {
							if(children.length > 0) {
								project.map.env.defs = [];
								children.forEach(function(def) {
									project.map.env.defs.push(project.DEFINITIONS+'/'+def.Name);
								});
							}
							if(project.map.env.ternproject && project.map.env.ternproject.vals && project.map.env.ternproject.vals.ecmaVersion > project.map.env.ecmaVersion) {
								project.map.env.ecmaVersion = project.map.env.ternproject.vals.ecmaVersion;
							}
							return project.map.env;
						}, function rejected() {
							return project.map.env;
						});
					});
				});
			});
		});
	}
	
	/**
	 * @description Translate the ecmaVersion from its year-form to simple number form
	 * @param {number} ev The ecmaVersion to translate
	 * @returns {number} The simple number to use for the ECMA version
	 * @since 16.0
	 */
	function translateEcma(ev) {
		var r = 7;
		if(typeof ev === 'number') {
			r = ev;
			if(ev > 2014) {
				r = ev - 2009;
			} else if(r < 4) {
				r = 7;
			}
		}
		return r;
	}
	
	/**
	 * @description Examine the .tern-project file to configure the tools
	 * @param {JavaScriptProject} project The backing project to configure
	 * @param {?} file The .tern-project file contents
	 * @since 14.0
	 */
	function processTernProject(project, file) {
		if(file && typeof file.contents === "string") {
			project.map.env.ternproject = {file: file, vals: null};
			//wipe the defaults, since we found content.
			//see https://bugs.eclipse.org/bugs/show_bug.cgi?id=512964
			delete project.map.env.envs.node;
			delete project.map.env.envs.browser;
			try {
				var vals = JSON.parse(file.contents);
				project.map.env.ternproject.vals = vals;
				if(Array.isArray(vals.libs)) {
					if(vals.libs.indexOf("browser") > -1) {
						project.map.env.envs.browser = true;
					} else if(vals.libs.indexOf("ecma6") > -1) {
						project.map.env.envs.es6 = true;
					} 
				}
				if(Array.isArray(vals.defs)) {
					if(vals.defs.indexOf("browser") > -1) {
						project.map.env.envs.browser = true;
					} else if(vals.defs.indexOf("ecma6") > -1) {
						project.map.env.envs.es6 = true;
					} 
				}
				if(vals.plugins && typeof vals.plugins === 'object') {
					if(vals.plugins.node) {
						project.map.env.envs.node = true;
					} else if(Object.keys(vals.plugins).length > 0) {
						//remove node as a default if there are other plugins specified
						//We will re-add it later when we look for other cues, like package.json
						delete project.map.env.envs.node;
					}
					if(vals.plugins.requirejs || vals.plugins.commonjs) {
						project.map.env.envs.amd = true;
						project.map.env.envs.browser = true;
					}
					if(vals.plugins.es6_modules) {
						project.map.env.envs.es6 = true;
						project.map.env.envs.browser = true;
						project.map.env.envs.node = true;
					}
				} 
				if(typeof vals.ecmaVersion === 'number') {
					var ecma = translateEcma(vals.ecmaVersion);
					if(ecma > 4 && ecma <= 9) {
						project.map.env.envs.es6 = ecma >= 6;
						project.map.env.envs.es7 = ecma >= 7;
						project.map.env.envs.es8 = ecma >= 8;
						project.map.env.ecmaVersion = ecma;
					} else {
						project.map.env.ecmaVersion = 7;
						project.map.env.envs.es6 = true;
						project.map.env.envs.es7 = true;
					}
				} 
				if(vals.sourceType === 'modules') {
					project.map.env.envs.es6 = true;
					project.map.env.envs.browser = true;
					project.map.env.envs.node = true;
				}
			} catch (e) {
				// ignore, bad JSON
			}
		}
	}
	
	/**
	 * @description Look into the found ESLint options to pre-configure the language tools
	 * @param {JavaScriptProject} project The back project to configure
	 * @param {?} options The computed ESLint option map
	 * @since 14.0
	 */
	function processEslintOptions(project, options) {
		if(options && options.vals) {
			project.map.env.eslint = options;
			if(options.vals.env) {
				Object.keys(options.vals.env).forEach(function(key) {
					project.map.env.envs[key] = options.vals.env[key];
				});
			}
			if(options.vals.ecmaVersion) {
				project.map.env.ecmaVersion = translateEcma(options.vals.ecmaVersion);
			}
		}
	}
	
	/**
	 * @description Look into the package.json contents to pre-configure the tools
	 * @param {JavaScriptProject} project The backing project to configure
	 * @param {?} file The package.json file
	 * @since 14.0
	 */
	function processPackageJson(project, file) {
		if(file && typeof file.contents === "string") {
			project.map.env.packagejson = {file: file};
			try {
				var vals = project.map.env.packagejson.vals = JSON.parse(file.contents);
				if(vals) {
					if(vals.dependencies) {
						Object.keys(vals.dependencies).forEach(function(key) {
							project.map.env.envs[key] = true;
						});
					}
					if(vals.devDependencies) {
						Object.keys(vals.devDependencies).forEach(function(key) {
							project.map.env.envs[key] = true;
						});
					}
					if(vals.optionalDependencies) {
						Object.keys(vals.optionalDependencies).forEach(function(key) {
							project.map.env.envs[key] = true;
						});
					}
					if(vals.engines) {
						Object.keys(vals.engines).forEach(function(key) {
							project.map.env.envs[key] = true;
						});
					}
					if(vals.eslintConfig) {
						if(!project.map.env.eslint) {
							project.map.env.eslint = {file: file, vals: vals.eslintConfig};
						}
						if(typeof vals.eslintConfig.ecmaVersion === "number") {
							var val = translateEcma(vals.eslintConfig.ecmaVersion);
							//what to do here is ecmaVersion is set via someone else? package.json will torch it
							project.map.env.ecmaVersion = val;
						}
					}
				}
			} catch(e) {
				//ignore
			}
			project.map.env.envs.node = true;
		}
	}

	/**
	 * @description Attempts to read the given file contents, parse it based on its type and cache it using the given key
	 * @param {?} map The project cache
	 * @param {?} file The file object from the file client
	 * @param {String} key The key to map to
	 * @param {JavaScriptProject} project The project context
	 * @returns {?} The parsed cache value
	 */
	function readAndMap(map, file, key, project) {
		map[key] = {file: file, vals: null};
		switch(file.name.slice(file.name.lastIndexOf('/')+1)) {
			case project.ESLINTRC:
			case project.ESLINTRC_JSON: {
				try {
					map[key].vals = JSON.parse(file.contents);
				} catch(err) {
					//ignore, bad JSON
				}
				break;
			}
			case project.PACKAGE_JSON: {
				try {
					var v = JSON.parse(file.contents);
					if(v && v.eslintConfig && typeof v.eslintConfig === "object") {
						map[key].vals = v.eslintConfig;
					}
				} catch(err) {
					//ignore, bad JSON
				}
				break;
			}
			case project.ESLINTRC_YAML:
			case project.ESLINTRC_YML: {
				try {
					map[key].vals = JsYaml.safeLoad(file.contents);
				} catch (e) {
					// ignore, bad YAML/YML
				}
				break;
			}
			case project.ESLINTRC_JS: {
				//TODO how should we load JS from an arbitrary file?
				//we can't eval them and we can't require them
				break;
			}
		}
		if (map[key].vals) {
			return map[key];
		}
		return null;
	}

	/**
	 * @name JavaScriptProject.prototype.hasNodeModules
	 * @description Returns if the current project context has a node_modules folder in it or not
	 * @function
	 * @returns {bool} If the project context has a node_modules folder
	 * @since 14.0
	 */
	JavaScriptProject.prototype.hasNodeModules = function hasNodeModules() {
		if(this.map.env) {
			return Boolean(this.map.env._node_modules);
		}
		return false;
	};

	/**
	 * Callback from the orion.edit.model service
	 * @param {Object} evnt An <tt>orion.edit.model</tt> event.
	 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#orion.edit.model
	 */
	JavaScriptProject.prototype.onInputChanged = function onInputChanged(evnt) {
		initialized = true;
		var file = evnt.file;
		return resolveProject.call(this, file).then(function(project) {
			if (project) {
				if(!this.projectMeta || project.Location !== this.projectMeta.Location) {
					this.projectMeta = project;
					delete this.map[this.TERN_PROJECT];
					return computeEnvironment(this, true).then(/* @callback */ function(env) {
							_handle.call(this, "onProjectChanged", this, evnt, project.Location);
							this.projectPromise.resolve(project);
						}.bind(this),
						/* @callback */ function(err) {
							_handle.call(this, "onProjectChanged", this, evnt, project.Location);
							this.projectPromise.resolve(project);
						}.bind(this));
				} if(file.location.indexOf(project.Location) === -1) {
					this.projectPromise.resolve(project);
				}
				return this.projectPromise.then(function() {
					_handle.call(this, "onInputChanged", this, evnt, project.Location);
				}.bind(this)); 
			}
			_handle.call(this, "onProjectChanged", this, evnt, null);
			this.projectPromise.resolve(null);
		}.bind(this));
	};

	/**
	 * @name resolveProject
	 * @description Tries to find the project context based on where we are in the source tree
	 * @param {?} file The file object from the resource navigator
	 * @returns {?} The project context or null
	 * @since 14.0
	 */
	function resolveProject(file) {
		var deferred = new Deferred();
		if(file) {
            var floc = file.Location ? file.Location : file.location; 
			if(this.projectMeta && floc && floc.startsWith(this.projectMeta.Location)) {
				return deferred.resolve(this.projectMeta);
			}
			this.projectPromise = new Deferred();
			this.getFileClient().getProject(floc, {names: [this.PACKAGE_JSON, this.TERN_PROJECT]}).then(function(project) {
				if(project) {
					return deferred.resolve({Location: project.Location});
				}
				fallbackProjectResolve.call(this, deferred, file);
			}.bind(this), /* @callback */ function reject(err) {
				fallbackProjectResolve.call(this, deferred, file);
			}.bind(this));
		} else {
			return deferred.resolve(null);
		}
		return deferred;
	}
	
	/**
	 * @description Fallabck function to try and find the project context if the file client call fails
	 * @param {Deferred} deferred The deferred to resolve
	 * @param {Array.<?>} parents The array of parents to look in  
	 * @since 14.0
	 */
	function fallbackProjectResolve(deferred, file) {
		var parents = file.parents ? file.parents : file.Parents;
		if(Util.isElectron) {
			//TODO call out the server for #getProject
			var promises = [],
				prnt = parents[parents.length-1];
			this.projectFiles.forEach(function(_f) {
				promises.push(this.getFile(_f, prnt.Location));
				promises.push(this.getFile(_f, "/file/"));
			}.bind(this));
			promises.reduce(function(prev, item, index, array) {
                return prev.then(function(_file) {
                    if(_file && _file.contents) {
                        deferred.resolve({Location: _file.project});
                        return item.reject("done");
                    }
                    if(index === array.length-1) {
                        //nothing was found, assume /file/
                        deferred.resolve({Location: "/file/"});
                    }
                    return item;
                });
			}, new Deferred().resolve());
		} else if(parents && parents.length > 0) {
			deferred.resolve(parents[parents.length-1]);
		} else {
			if(file.Directory) {
				deferred.resolve({Location: file.Location ? file.Location : file.location});
			} else {
				deferred.resolve({Location: "/file/"});
			}
		}
	}

	/**
	 * Callback from the fileClient event listener
	 * @param {Object} evnt A file client Changed event.
	 */
	JavaScriptProject.prototype.onFileChanged = function onFileChanged(evnt) {
		if(evnt && evnt.type === 'Changed') {
			_updateMap.call(this, evnt.modified, "onModified");
			_updateMap.call(this, evnt.deleted, "onDeleted");
			_updateMap.call(this, evnt.created, "onCreated");
			_updateMap.call(this, evnt.moved, "onMoved");
		}
	};
	/**
	 * Update the backing map
	 * @param {Array.<String>} arr The array to walk
	 * @param {String} state The state, one of: onModified, onDeleted, onCreated
	 */
	function _updateMap(arr, state) {
		if(Array.isArray(arr)) {
			arr.forEach(function(file) {
				var f, toQ, toN, n;
				switch(state) {
					case 'onCreated': {
						n = file.result ? file.result.Name : undefined;
						f = file.result ? file.result.Location : undefined;
						break;
					}
					case 'onDeleted': {
						f = file.deleteLocation;
						n = _shortName(file.deleteLocation);
						break;
					}
					case 'onModified': {
						n = _shortName(file);
						f = file;
						break;
					}
					case 'onMoved': {
						toQ = file.result ? file.result.Location : undefined;
						toN = file.result ? file.result.Name : undefined;
						n = _shortName(file.source);
						f = file.source;
						break;
					}
				}
				delete this.map[f];
				_handle.call(this, state, this, f, n, toQ, toN);
			}.bind(this));
		}
	}
	/**
	 * @description Returns the shortname of the file
	 * @param {String} fileName The fully qualified path of the file
	 * @returns {String} The last segment of the path (short name)
	 */
	function _shortName(fileName) {
		var i = fileName.lastIndexOf('/');
		if(i > -1) {
			return fileName.substr(i+1);
		}
		return fileName;
	}

	/**
	 * @description Delegates to a handler for the given handler name (file type), with the given function name
	 * @param {String} funcName The name of the function to call on the handler iff it exists
	 */
	function _handle(funcName) {
		if(Array.isArray(this.handlers)) {
			var args = Array.prototype.slice.call(arguments);
			this.handlers.forEach(function(handler) {
				var f = handler[funcName];
				if(typeof f === 'function') {
					f.apply(handler, args.slice(1));
				}
			});
		}
	}

	return JavaScriptProject;
});
