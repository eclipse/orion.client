/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd*/
define([
	"orion/objects",
	"javascript/ruleData",
	"orion/i18nUtil",
	"i18n!javascript/nls/problems",
	'orion/Deferred'
], function(Objects, Rules, i18nUtil, messages, Deferred) {
	var config = {
		// 0:off, 1:warning, 2:error
		defaults: Rules.defaults,

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
				var length = ruleConfig.length;
				var lastIndex = length - 1;
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

	var registry;

	/**
	 * @description Creates a new ESLintValidator
	 * @constructor
	 * @public
	 * @param {Worker} ternWorker The backing worker
	 * @param {javascript.javascriptProject} jsProject The backing JS project context
	 * @param {Object} serviceRegistry The platform service registry
	 * @returns {ESLintValidator} Returns a new validator
	 */
	function ESLintValidator(ternWorker, jsProject, serviceRegistry) {
		this.ternWorker = ternWorker;
		this.project = jsProject;
		config.setDefaults();
		registry = serviceRegistry;
	}

	/**
	 * @description Log the given timing in the metrics service
	 * @param {Number} end The total time to log
	 * @since 12.0
	 */
	function logTiming(end) {
		if(registry) {
			var metrics = registry.getService("orion.core.metrics.client"); //$NON-NLS-1$
			if(metrics) {
				metrics.logTiming('language tools', 'validation', end, 'application/javascript'); //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
			}
		}
	}

	/**
	 * @description Converts the configuration rule value to an Orion problem severity string. One of 'warning', 'error'.
	 * @param {Object} prob The problem object
	 * @returns {String} the severity string
	 */
	function getSeverity(prob) {
		var val = prob.severity;
		var ruleConfig = config.rules[prob.ruleId];
		if(Array.isArray(ruleConfig)) {
			// Hack for missing-doc which overloads the prob.related object to expose which subrule
			// generated the problem
			var related = prob.related, ruleType = related && related.type;
			if (prob.ruleId === "missing-doc" && ruleConfig[1][ruleType] !== undefined) {
				val = ruleConfig[1][ruleType];
			}
		}
		switch (val) {
			case 1: return "warning"; //$NON-NLS-0$
			case 2: return "error"; //$NON-NLS-0$
			case 3: return "info";
		}
		return "error"; //$NON-NLS-0$
	}

	/**
	 * @description Computes the problem id to use in the framework from the ESLint problem object
	 * @param {Object} pb The original ESLint problem
	 * @returns {String} The problem id to pass into the framework
	 * @since 8.0
	 */
	function getProblemId(pb) {
	    if(pb.args) {
	        if(pb.args.pid) {
	            return pb.args.pid;
	        } else if(pb.args.nls) {
	            return pb.args.nls;
	        }
	    }
	    return pb.ruleId;
	}

	/**
	 * @description Converts an eslint / esprima problem object to an Orion problem object
	 * @public
	 * @param {eslint.Error|esprima.Error} e Either an eslint error or an esprima parse error.
	 * @returns {Object} Orion Problem object
	 */
	function toProblem(e) {
		var id = getProblemId(e);
		var start = e.start, end = e.end;
		var descriptionKey = e.args && e.args.nls ? e.args.nls : e.ruleId;
		var descriptionArgs = e.args || Object.create(null);
		var description = e.message;
		if (descriptionKey && messages[descriptionKey]) {
			description = i18nUtil.formatMessage.call(null, messages[descriptionKey], descriptionArgs);
		}
		var prob = {
			id: id,
			description: description,
			severity: getSeverity(e)
		};
		if (e.args && e.args.range) {
			prob.start = e.args.range.start;
			prob.end = e.args.range.end;
		} else if (e.node) {
			// Error produced by eslint
			start = e.node.range[0];
			end = e.node.range[1];
			if (e.related && e.related.range) {
				// Flagging the entire node is distracting. Just flag the bad token.
				var relatedToken = e.related;
				start = relatedToken.range[0];
				end = relatedToken.range[1];
			}
		}
		if (e.nodeType) {
			prob.nodeType = e.nodeType;
		}
		if(e.args && e.args.range) {
			// skip start/end settings
		} else if (e.node && e.nodeType === "Program" && typeof e.line !== 'undefined') {
			prob.line = e.line;
			prob.start = e.column;
		} else if(typeof start !== 'undefined') {
			prob.start = start;
			prob.end = end;
		} else if(typeof e.index === 'number') {
			prob.start = end;
			prob.end = e.index;
		} else if(typeof e.lineNumber !== 'undefined') {
			prob.line = e.lineNumber;
			prob.start = e.column;
		} else if (typeof e.line === 'number' && typeof e.column === 'number') {
			prob.line = e.line;
			prob.start = e.column;
		} else {
			prob.start = 0;
			prob.end = 0;
		}
		// Pass along any additional data to the problem annotation (Bug 464538)
		if (e.args && e.args.data){
			if (typeof e.args.data === 'object'){
				prob.data = e.args.data;
				prob.data.ruleId = e.ruleId;
			} else {
				prob.data = {data: e.args.data, ruleId: e.ruleId};
			}
		} else {
			prob.data = {ruleId: e.ruleId};
		}
		return prob;
	}

	/**
	 * @name configureCoreRules
	 * @description Ensures that core linting rules are not left out because of an eslintrc file being used
	 * @param {?} cfg The configuration map from the eslintrc file
	 * @since 14.0
	 */
	function configureRules(cfg, confg) {
		if(cfg && cfg.rules) {
			Object.keys(cfg.rules).forEach(function(key) {
				if(!Rules.defaults.hasOwnProperty(key)) {
					delete cfg.rules[key];
				}
			});
			if(!confg || (confg && !confg.skip)) { //test hook to disable these rules unless explicitly added
				cfg.rules["unknown-require"] = config.rules["unknown-require"];
				cfg.rules["check-tern-plugin"] = config.rules["check-tern-plugin"];
				cfg.rules["missing-requirejs"] = config.rules["missing-requirejs"];
			}
		}
		//test hooks
		if(confg) {
			if(!cfg) {
				return confg;
			}
			cfg.rules = confg.rules;
		}
		return cfg;
	}

	/**
	 * @name prepareConfig
	 * @description Copies all of the configuration entries from the given configuration object into the one that 
	 * will be passed to Tern
	 * @param {?} configuration The existing configuration object or null
	 * @param {?} env The existing environment map or null
	 * @returns {?} The configured options map
	 * @since 14.0
	 */
	function prepareConfig(configuration, env) {
		var c = {rules: config.rules};
		if(configuration) {
			Object.keys(configuration).forEach(function(key) {
				c[key] = configuration[key];
			});
		}
		if(env) {
			if(!c.env) {
				c.env = {};
			}
			Object.keys(env).forEach(function(key) {
				c.env[key] = env[key];
			});
		}
		return c;
	}

	Objects.mixin(ESLintValidator.prototype, {
		/**
		 * @description Callback from SyntaxChecker API to perform any load-time initialization
		 * @function
		 * @param {String} loc The optional location the checker is initializing from
		 * @callback
		 */
		initialize: function initialize(loc, contentType) {
			this.project.initFrom(loc);
		},
		/**
		 * @description Callback to create problems from orion.edit.validator
		 * @function
		 * @public
		 * @param {orion.edit.EditorContext} editorContext The editor context
		 * @param {Object} context The in-editor context (selection, offset, etc)
		 * @returns {orion.Promise} A promise to compute some problems
		 * @callback
		 */
		computeProblems: function(editorContext , context, config) {
			var deferred = new Deferred();
			editorContext.getFileMetadata().then(function(meta) {
				editorContext.getText().then(function(text) {
					var env = null;
					if(meta.contentType.id === 'text/html') {
						//auto-assume browser env - https://bugs.eclipse.org/bugs/show_bug.cgi?id=458676
						env = Object.create(null);
						env.browser = true;
					}
					if(this.project) {
						this.project.getComputedEnvironment().then(function(cenv) {
							env = !env ? Object.create(null) : env;
							if(cenv && cenv.envs) {
								Object.keys(cenv.envs).forEach(function(key) {
									env[key] = cenv.envs[key];
								});
							}
							var eslint = cenv.eslint ? cenv.eslint.vals : null;
							if(eslint && eslint.env) {
								Object.keys(eslint.env).forEach(function(key) {
									env[key] = eslint.env[key];
								});
							}
							this._validate(meta, text, env, deferred, configureRules(eslint, config));
						}.bind(this));
					} else {
						// need to extract all scripts from the html text
						this._validate(meta, text, env, deferred, config);
					}
				}.bind(this));
			}.bind(this));
			return deferred;
		},

		/**
		 * @description Validates the given AST
		 * @function
		 * @private
		 * @param {Object} text The given text
		 * @param {Object} env An environment object to set in the config
		 * @param {Boolean} htmlMode Set to <code>true</code> to ignore rules that are inaccurate for html script snippets
		 * @returns {Array|Object} The array of problem objects
		 * @since 6.0
		 */
		_validate: function(meta, text, env, deferred, configuration) {
			// When validating snippets in an html file ignore undefined rule because other scripts may add to the window object
			var files = [{type: 'full', name: meta.location, text: text}]; //$NON-NLS-1$
			var args =  {meta: {location: meta.location}, files: files, config: prepareConfig(configuration, env)};
			var request = {request: 'lint', args: args}; //$NON-NLS-1$
			var start = Date.now();
			this.ternWorker.postMessage(
				request,
				/* @callback */
				function(type, err) {
					var end = Date.now() - start;
					logTiming(end);
					var problems = [];
					if(err) {
						problems.push({
							start: 0,
							args: {0: type.error, nls: "eslintValidationFailure" }, //$NON-NLS-0$
							severity: "error" //$NON-NLS-0$
						});
					} else if (Array.isArray(type.problems)) {
						problems = type.problems;
					}
					deferred.resolve({ problems: problems.map(toProblem) });
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
			var oldconfig = properties.pid === 'eslint.config';
			var keys = Object.keys(properties);
			var seen = Object.create(null);
			for (var i = 0; i < keys.length; i++) {
				var key = keys[i];
				var index = key.indexOf(':');
				var subKey = null;
				var realKey = key;
				var tabIndex = 0;
				if (index !== -1) {
					realKey = key.substring(0, index);
					subKey = key.substring(index + 1);
				} else {
					// check !
					index = key.indexOf('!');
					if (index !== -1) {
						realKey = key.substring(0, index);
						tabIndex = key.substring(index + 1);
					}
				}
				var ruleId = realKey;
				if (oldconfig && config.rules[realKey] !== config.defaults[realKey]) {
					//don't overwrite a new setting with an old one
					continue;
				}
				var legacy = this._legacy[ruleId];
				if (typeof legacy === 'string') {
					ruleId = legacy;
					if (seen[ruleId]) {
						//don't overwrite a new pref name with a legacy one
						continue;
					}
				}
				seen[ruleId] = true;
				var value = properties[key];
				if (subKey) {
					if (typeof value === 'string') {
						// split into an array
						var arr = value.split(',');
						if (arr && Array.isArray(arr)) {
							value = [];
							arr.forEach(function(element) {
								value.push(element.trim());
							});
						}
						config.setOption(ruleId, value, subKey);
					} else {
						config.setOption(ruleId, value, subKey);
					}
				} else if (tabIndex) {
					config.setOption(ruleId, value, null, tabIndex);
				} else {
					config.setOption(ruleId, value);
				}
			}
		},

		/**
		 * @description Hook for the test suite to enable only the given rule
		 * @function
		 * @private
		 * @param {String} ruleid The id for the rule
		 * @param {Number} severity The desired severity or null
		 * @param {String} opts Option for a given rule, for example the missing-doc rule has 'decl' or 'expr'
		 * @since 8.0
		 */
		_enableOnly: function _enableOnly(ruleid, severity, opts) {
			var keys = Object.keys(config.rules);
			for (var i = 0; i < keys.length; i++) {
				if (keys[i] === ruleid) {
					config.setOption(ruleid, severity ? severity : 2);
					if (typeof opts === 'object') {
						// object for rules' options
						for (var prop in opts) {
							config.setOption(ruleid, opts[prop], prop);
						}
					}
				} else {
					config.setOption(keys[i], 0);
				}
			}
		},

		/**
		 * All new pref ids MUST be the id of the rule they are for, but to
		 * not break existing prefs this object translates the old pref name to its rule name
		 * @private
		 * @since 8.0
		 */
		_legacy: {
		    'throw-error': 'no-throw-literal', //$NON-NLS-1$
		    validate_no_cond_assign: 'no-cond-assign', //$NON-NLS-1$
		    validate_no_constant_condition: 'no-constant-condition', //$NON-NLS-1$
		    validate_no_caller: 'no-caller', //$NON-NLS-1$
		    validate_eqeqeq: 'eqeqeq', //$NON-NLS-1$
		    validate_no_console: 'no-console', //$NON-NLS-1$
		    validate_debugger: 'no-debugger', //$NON-NLS-1$
		    validate_eval: 'no-eval', //$NON-NLS-1$
		    validate_no_iterator:'no-iterator', //$NON-NLS-1$
		    validate_dupe_obj_keys: 'no-dupe-keys', //$NON-NLS-1$
		    validate_typeof: 'valid-typeof', //$NON-NLS-1$
		    validate_use_before_define: 'no-use-before-define', //$NON-NLS-1$
		    validate_new_parens: 'new-parens', //$NON-NLS-1$
		    validate_radix: 'radix', //$NON-NLS-1$
		    validate_missing_semi: 'semi', //$NON-NLS-1$
		    validate_no_regex_spaces: 'no-spaces-regex', //$NON-NLS-1$
		    validate_use_isnan: 'use-isnan', //$NON-NLS-1$
		    validate_throw_error: 'no-throw-literal', //$NON-NLS-1$
		    validate_no_reserved_keys: 'no-reserved-keys', //$NON-NLS-1$
		    validate_no_sparse_arrays: 'no-sparse-arrays', //$NON-NLS-1$
		    validate_curly: 'curly', //$NON-NLS-1$
		    validate_no_fallthrough: 'no-fallthrough', //$NON-NLS-1$
		    validate_no_comma_dangle: 'no-comma-dangle', //$NON-NLS-1$
		    validate_no_undef: 'no-undef', //$NON-NLS-1$
		    validate_no_empty_block: 'no-empty-block', //$NON-NLS-1$
		    validate_unnecessary_semi: 'no-extra-semi', //$NON-NLS-1$
		    validate_no_jslint: 'no-jslint', //$NON-NLS-1$
		    validate_unused_params: 'no-unused-params', //$NON-NLS-1$
		    validate_no_unused_vars: 'no-unused-vars', //$NON-NLS-1$
		    validate_no_unreachable: 'no-unreachable', //$NON-NLS-1$
		    validate_no_redeclare: 'no-redeclare', //$NON-NLS-1$
		    validate_no_shadow: 'no-shadow' //$NON-NLS-1$
		}

	});
	return ESLintValidator;
});
