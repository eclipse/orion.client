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
define([
	'javascript/util',
], function(Util) {
	
	function OrionAcorn() {
		this.dependencies = {};
		this.environments = {};
		this.comments = [];
		this.tokens = [];
		this.leadingCommentsIndex = 0;
		this.trailingCommentsIndex = 0;
		this.errors = [];
		this.needReset = true;
		this.currentOptions = {};
	}

	OrionAcorn.prototype.reset = function reset() {
		this.comments = [];
		this.tokens = [];
		this.leadingCommentsIndex = 0;
		this.trailingCommentsIndex = 0;
	};
	
	OrionAcorn.prototype.initialize = function initialize() {
		this.dependencies = {};
		this.environments = {};
		this.reset();
		this.errors = [];
		this.needReset = true;
		this.currentOptions = {};
	};

	/**
	 * @name onToken
	 * @description Function called when recording a token
	 * @param token the given token to record
	 */
	OrionAcorn.prototype.onToken = function onToken(token) {
		var type = "Punctuator"; //$NON-NLS-1$
		var label = token.type.label;
		var eof = false;
		var value = token.value;
		switch(label) {
			case "num" :
				//num: new TokenType("num", startsExpr),
				type = "Numeric"; //$NON-NLS-1$
				break;
			case "regexp" :
				//regexp: new TokenType("regexp", startsExpr),
				type = "RegularExpression"; //$NON-NLS-1$
				token.value = "/" + value.pattern + "/" + (value.flags ? value.flags : "");
				break;
			case "string" :
				//string: new TokenType("string", startsExpr),
				type = "String"; //$NON-NLS-1$
				break;
			case "name" :
				// name: new TokenType("name", startsExpr),
				type = "Identifier"; //$NON-NLS-1$
				break;
			case "eof" :
				//eof: new TokenType("eof)
				eof = true;
				break;
			default:
				var keyword = token.type.keyword;
				if (keyword) {
					switch(keyword) {
						case "null" :
							type = "Null"; //$NON-NLS-1$
							break;
						case "true" :
						case "false" :
							type = "Boolean"; //$NON-NLS-1$
							break;
						default: 
							type = "Keyword"; //$NON-NLS-1$
					}
				}
		}
		if (!eof) {
			var start = token.start;
			var end = token.end;
			if (start >= end) return; // handle recovered tokens
			var result = Object.create(null);
			result.type = type;
			result.index = this.tokens.length;
			if (token.range) {
				result.range = token.range;
			}
			if (token.loc) {
				result.loc = token.loc;
			}
			result.start = start;
			result.end = end;
			if (typeof value === "undefined") {
				result.value = label;
			} else {
				result.value = token.value;
			}
			this.tokens.push(result);
		}
	};
	
	/**
	 * @name onComment
	 * @description function called when a comment is recorded
	 * @param block a boolean to indicate if this is a block comment (true) or a line comment (false)
	 * @param text the given comment contents
	 * @param start the given start position
	 * @param end the given end position
	 * @param startLoc the given start location
	 * @param endLoc the given end location
	 */
	OrionAcorn.prototype.onComment = function onComment(block, text, start, end, startLoc, endLoc) {
		var comment = {
			type: block ? 'Block' : 'Line', //$NON-NLS-1$ //$NON-NLS-2$
			value: text,
			start: start,
			end: end
		};
		if (this.currentOptions.locations) {
			comment.loc = {
				start: startLoc,
				end: endLoc
			};
		}
		if (this.currentOptions.ranges) {
			comment.range = [start, end];
		}
		this.comments.push(comment);
	};

	/**
	 * @description Collects the dependencies from call expressions and new expressions
	 * @param {Node} callee The named callee node 
	 * @param {Array.<Node>} args The list of arguments for the expression
	 * @param {Object} envs	The environemnts
	 * @param {Array.<Object>} deps The dependencies
	 */
	function collectDeps(callee, args, envs, deps) {
		var len = args.length;
		if (len === 0) return;
		if(callee.name === 'importScripts') {
			addArrayDeps(args, deps, "browser"); //importScripts('foo', 'bar'...) //$NON-NLS-1$
		} else if(callee.name === 'Worker') {
			addDep(args[0], deps, "browser"); //$NON-NLS-1$
		} else if(callee.name === 'require') {
			var _a = args[0];
			if(_a.type === 'ObjectExpression') {
				envs.amd = true;
			}
			if(_a.type === "ArrayExpression") {
				envs.amd = true;
				addArrayDeps(_a.elements, deps, "amd"); //require([foo]) //$NON-NLS-1$
			} else if(_a.type === "Literal") {
				envs.node = true;
				addDep(_a, deps, "node"); // require('foo') //$NON-NLS-1$
			}
			if(len > 1) {
				_a = args[1];
				if(_a.type === "ArrayExpression") {
					envs.node = true;
					addArrayDeps(_a.elements, deps, "node"); //$NON-NLS-1$
				}
			}
		} else if(callee.name === 'requirejs') {
			_a = args[0];
			if(_a.type === "ArrayExpression") {
				envs.amd = true;
				addArrayDeps(_a.elements, deps, "amd"); //requirejs([foo]) //$NON-NLS-1$
			}
		} else if(callee.name === 'define' && len > 0) {
			_a = args[0];
			if(_a.type === "Literal" && len > 1) {
				_a = args[1];
			}
			if(_a.type === "ArrayExpression") {
				envs.amd = true;
				addArrayDeps(_a.elements, deps, "amd"); //$NON-NLS-1$
			} else if(_a.type === "FunctionExpression"){
				envs.amd = true;
				if (_a.params && _a.params.length > 0 && _a.params[0].name === 'require'){
					envs.simplifiedCommonJS = true;
				}
			} else if (_a.type === 'ObjectExpression') {
				envs.amd = true;
			}
		}
	}
	
	/**
	 * @description Adds a dependency if it has not already been added
	 * @param {Object} node The AST node
	 * @param {Object} deps	The map for dependencies
	 * @param {String} env The environmentn kind the dep came from
	 */
	function addDep(node, deps, env) {
		if(node && node.type === "Literal") {
			if (!deps[node.value]) {
				deps[node.value] = {value: node.value, env: env};
			}
		}
	}
	
	/**
	 * @description Adds all of the entries from the array of deps to the global state
	 * @param {Array} array The array of deps to add
	 */
	function addArrayDeps(array, deps, env) {
		var len = array.length;
		for(var i = 0; i < len; i++) {
			addDep(array[i], deps, env);
		}
	}
	/**
	 * Define an acorn plugin to record the comments even if there are syntax errors (incomplete block comments),
	 * it linked comments and nodes (leadingComments and trailingComments) and it records environments and dependencies
	 */
	OrionAcorn.prototype.acornPlugin = function acornPlugin(instance, opts) {
		if (!opts) {
			return;
		}
		var that = this;
		/**
		 * Returns a deep copy of the given obj
		 */
		function deepCopy(obj) {
			var ret = {}, key, val;
			for (key in obj) {
				if (obj.hasOwnProperty(key)) {
					val = obj[key];
					if (typeof val === 'object' && val !== null) {
						ret[key] = deepCopy(val);
					} else {
						ret[key] = val;
					}
				}
			}
			return ret;
		}

		instance.extend("raise", function(nextMethod) { //$NON-NLS-1$
			function recordError(errors, error) {
				var len = errors.length;
				for (var e = 0; e < len; e++) {
					var existing = errors[e];
					if (existing.index === error.index && existing.message === error.message) {
						return; // do not add duplicate
					}
				}
				errors.push(error);
			}
			return function (pos, message) {
				try {
					return nextMethod.call(this, pos, message);
				} catch(err) {
					if (err instanceof SyntaxError) {
						if (that.needReset) {
							// we only reset tokens once. We don't want to reset them again when the syntax error is thrown during acorn_loose parsing
							that.reset();
							that.needReset = false;
						}
					}
					err.index = pos;
					err.start = pos;
					err.end = this.input.length >= pos + 1 ? pos + 1 : this.input.length;
					recordError(that.errors, err);
					throw err;
				}
			};
		});
		instance.extend("startNode", function(nextMethod) { //$NON-NLS-1$
			return function () {
				var node = nextMethod.call(this);
				// attach leading comments
				var max = that.comments.length;
				if (max !== that.leadingCommentsIndex) {
					// we got new comments since the last node
					var i = that.leadingCommentsIndex;
					loop: for (; i< max; i++) {
						var comment = that.comments[i];
						if (node.range[0] >= comment.range[1]) {
							// attach the comment to the node
							if (!node.leadingComments) {
								node.leadingComments = [];
							}
							node.leadingComments.push(deepCopy(that.comments[i]));
						} else {
							break loop;
						}
					}
					that.leadingCommentsIndex = i;
				}
				return node;
			};
		});
		instance.extend("finishNode", function(nextMethod) { //$NON-NLS-1$
			return function(node, type) {
				if (type === "CallExpression" || type === "NewExpression") {
					collectDeps(node.callee, node.arguments, that.environments, that.dependencies);
				} else if (type === 'ImportDeclaration'){
					addDep(node.source, that.dependencies, 'es_modules'); //$NON-NLS-1$
					that.environments.es_modules = true;
				} else if (type === 'ExportNamedDeclaration' || type === 'ExportDefaultDeclaration' || type === 'ExportAllDeclaration'){
					that.environments.es_modules = true;
				} else if(type === "MemberExpression") {
					if(node.property.name === "exports" && node.object.name === "module") {
						that.environments.node = true;
					}
				}
				var result = nextMethod.call(this, node, type);
				// attach trailing comments
				var max = that.comments.length;
				if (max !== that.trailingCommentsIndex) {
					// we got new comments since the last node
					var i = that.trailingCommentsIndex;
					loop: for (; i< max; i++) {
						var comment = that.comments[i];
						if (result.range[1] <= comment.range[0]) {
							// attach the comment to the node
							if (!result.trailingComments) {
								result.trailingComments = [];
							}
							result.trailingComments.push(deepCopy(that.comments[i]));
						} else {
							continue loop;
						}
					}
					that.trailingCommentsIndex = i;
				}
				result.sourceFile = that.sourceFile;
				if (result.end > that.sourceFile.text.length) {
					var actualEnd = that.sourceFile.text.length;
					result.end = actualEnd;
					if (result.range) {
						result.range[1] = actualEnd;
					}
				}
				return result;
			};
		});
		instance.extend("skipBlockComment", function(nextMethod) { //$NON-NLS-1$
			return function() {
				var lineBreak = /\r\n?|\n|\u2028|\u2029/;
				var lineBreakG = new RegExp(lineBreak.source, "g");

				var startLoc = this.curPosition();
				var start = this.pos, end = this.input.indexOf("*/", this.pos += 2); //$NON-NLS-1$
				if (end !== -1) {
					this.pos -= 2;
					return nextMethod.call(this);
				}
				this.pos += 2;
				// error recovery: the block comment is not complete
				if (this.options.locations) {
					lineBreakG.lastIndex = start;
					var match;
					while ((match = lineBreakG.exec(this.input)) && match.index < this.pos) {
						++this.curLine;
						this.lineStart = match.index + match[0].length;
					}
				}
				if (this.options.onComment) {
					var current = this.input.length;
					this.pos = current;
					this.options.onComment(true, this.input.slice(start + 2, current), start, current, startLoc, this.curPosition());
				}
				this.pos = start;
				// call the acorn function to report unterminated block comment
				return nextMethod.call(this);
			};
		});
	};

	/**
	 * @description setup all the given options to set up the acorn parsing
	 * @param {String} text The given source code
	 * @param {Object} options The given options
	 * @param {Object} acorn The acorn object
	 * @param {Object} acornloose The acorn loose object
	 * @param {Object} file the given file
	 */
	OrionAcorn.prototype.preParse = function preParse(text, options, acorn, acornloose, file) {
		this.initialize();
		if (!acorn.plugins) {
			acorn.plugins = Object.create(null); 
		}
		acorn.plugins.acornPlugin = this.acornPlugin.bind(this);
		// enabled plugins
		options.plugins = {
			"acornPlugin" : true
		};

		if (!acornloose.pluginsLoose) {
			acornloose.pluginsLoose = Object.create(null);
		}
		acornloose.pluginsLoose.acornPlugin = this.acornPlugin.bind(this);

		// enabled plugins
		options.pluginsLoose = {
			"acornPlugin" : true
		};
		options.onToken = this.onToken.bind(this);
		options.onComment = this.onComment.bind(this);
		options.locations = true;
		options.ranges = true;
		options.sourceFile = false;
		options.allowImportExportEverywhere = false;
		if (!options.sourceType) {
			// set a default value
			options.sourceType = "script"; //$NON-NLS-1$
		}
		options.allowHashBang = true;
		if(typeof options.ecmaVersion !== 'number' || (options.ecmaVersion < 3 || options.ecmaVersion > 9)) {
			options.ecmaVersion = 7; //don't stomp on the value set in Tern
		}
		if (!options.directSourceFile && file) {
			options.directSourceFile = {
				name: file,
				text: text
			};
		}
		this.sourceFile = options.directSourceFile;
		this.currentOptions = {
			locations : options.locations,
			sourceFile : options.sourceFile,
			ranges : options.ranges
		};
	};

	/**
	 * @description set all the values in the postParse phase
	 * @param {Object} the given ast tree
	 * @param {String} text The given source code
	 * @callback
	 */
	OrionAcorn.prototype.postParse = function postParse(ast, text) {
		if (Array.isArray(this.errors) && this.errors.length !== 0) {
			if (ast.errors) {
				ast.errors.concat(this.errors);
			} else {
				ast.errors = this.errors;
			}
		}
		ast.comments = this.comments;
		ast.tokens = this.tokens;
		if (!ast.dependencies) {
			ast.dependencies = [];
		}
		Object.keys(this.dependencies).forEach(function(dep) {
			var _d = this.dependencies[dep];
			if(this.environments.amd && _d.env === 'node' || this.environments.node && _d.env === 'amd') {
				_d.env = 'commonjs'; //$NON-NLS-1$
			}
			ast.dependencies.push(_d);
		}.bind(this));
		ast.environments = this.environments;
		ast.errors = Util.serializeAstErrors(ast);
	};

	return OrionAcorn;
});
