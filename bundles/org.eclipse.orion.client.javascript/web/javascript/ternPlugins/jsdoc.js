/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (https://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (https://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - Allow original requirejs plugin to find files in Orion workspace
 *******************************************************************************/
/* eslint-disable missing-nls */
/*eslint-env node, amd*/
/*globals tern tern */
define([
	"tern/lib/tern",
	"orion/objects",
	"javascript/finder",
	"javascript/signatures",
	"javascript/util",
	"javascript/ruleData",
	"eslint/conf/environments",
	"i18n!javascript/nls/messages"
], function(tern, objects, Finder, Signatures, Util, Rules, ESLintEnvs, Messages) {
	
	var allEnvs = {};
	var envNames = {
		browser: Messages['browser'],
		node: Messages['node'],
		commonjs: Messages['commonjs'],
		worker: Messages['worker'],
		amd: Messages['amd'],
		mocha: Messages['mocha'],
		jasmine: Messages['jasmine'],
		jest: Messages['jest'],
		phantomjs: Messages['phantomjs'],
		protractor: Messages['protractor'],
		qunit: Messages['qunit'],
		jquery: Messages['jquery'],
		prototypejs: Messages['prototypejs'],
		shelljs: Messages['shelljs'],
		meteor: Messages['meteor'],
		mongo: Messages['mongo'],
		applescript: Messages['applescript'],
		nashorn: Messages['nashorn'],
		serviceworker: Messages['serviceworker'],
		embertest: Messages['embertest'],
		webextensions: Messages['webextension'],
		es6: Messages['es6']
	};
	
	tern.registerPlugin("jsdoc", /* @callback */ function(server, options) {
		return {
     		passes: {
		      	/**
		      	 * @callback
		      	 */
		      	completion: function(file, options, expr, type) {
		      		var comment = Finder.findComment(options.end, file.ast);
		      		if(comment) {
		      			objects.mixin(allEnvs, ESLintEnvs);
		      			fetchPluginEnvs(server);
		      			if(comment.type === 'Line') {
		      				return findLineCompletions(comment, options, file);
		      			}
		      			return findBlockCompletions(comment, options, file);
		      		}
		      		return null;
		      	}
      		}
    	};
	});
	
	function fetchPluginEnvs(server) {
		if(server.options && server.options.plugins) {
			var keys = Object.keys(server.options.plugins);
			for(var i = 0, len = keys.length; i < len; i++) {
				var env = server.options.plugins[keys[i]].env;
				if(env) {
					allEnvs[env] = true;
				}			
			}
		}
	}
	
	/**
	 * @description Finds completions for line comments: //-prefixed
	 * @param {Object} comment The comment AST node
	 * @param {Object} options The options object
	 * @param {File} file The Tern file object
	 * @returns {Array.<Object>} The array of completion objects
	 * @since 11.0
	 */
	function findLineCompletions(comment, options, file) {
		var proposals = [];
		var prefix = getPrefix(options.end, file.text), char = file.text.charAt(options.end-prefix.length-1);
		if(char === '{') {
			proposals = computeTypeCompletions(prefix, comment, file);
		}
		return {completions: proposals};

	}
	
	/**
	 * @description Finds the completions for block comments: /**- or /*-prefixed 
	 * @param {Object} comment The comment AST node
	 * @param {Object} options The options object
	 * @param {File} file The Tern file object
	 * @returns {Array.<Object>} The array of completion objects
	 * @since 11.0
	 */
	function findBlockCompletions(comment, options, file) {
		var proposals = [];
		var prefix = getPrefix(options.end, file.text), char = file.text.charAt(options.end-prefix.length-1);
		if(char === '{') {
			// TODO When to use @link vs {}
			proposals = computeTypeCompletions(prefix, comment, file);
		} else if(char === '.') {
			proposals = computeMemberCompletions(prefix, comment, options);
		} else if(char === '*' || char === ' ') {
			proposals = computeBlockCompletions(prefix, comment, options, file);
		}
		return {completions: proposals};
	}
	
	/**
     * @description Get the prefix to use for the proposal, handles @-based prefixes
     * @param {Number} pos The activation context
     * @param {String} buffer The text
     * @returns {String} The prefix to use
     */
    function getPrefix(pos, buffer) {
        var index = pos-1;
        var word = '', char = buffer.charAt(index);
        if('{*,'.indexOf(char) > -1) {
            return word;
        }
        if(char === '@') {
            return char;
        } else if(char === '/' && buffer.charAt(index-1) === '/') {
        	return word;
    	}
        while(index >= 0 && /\S/.test(char)) {
            word = char+word;
            if(char === '@' || char === '*' || char === '{') {
                //we want the prefix to include the '@'
	            return word;
	        } else if(char === '/' && buffer.charAt(index-1) === '/') {
	        	return word;
	        }
            index--;
            char = buffer.charAt(index);
            if('{*,'.indexOf(char) > -1) {
                // we don't want the prefix to include the '*'
                return word;
            }
        }
        return word;
    }
	/**
	 * @description Computes the reachable type names from the given scope
	 * @param {String} prefix The prefix
	 * @returns {Array.<Object>} The array of completion objects
	 */
	function computeTypeCompletions(prefix, comment, file) {
		var theType, proposal, key;
		var proposals = [];
		
		var defaultEnvs = {ecma5: true, ecma6: true, ecma7: true};
		if (isHTML(file.name)){
			defaultEnvs.browser = true;
		}
		var envs = getActiveEnvironments(file.ast, defaultEnvs);
		var existingCompletions = Object.create(null); // Tern separates proto and non-proto props into two entries, we only want to see one

		var node = Finder.findNodeAfterComment(comment, file.ast);
		var scope = file.scope;
		if (node){
			if (node.scope){
				scope = node.scope;
			} else if (node.parents) {
				for (var i=node.parents.length-1; i>=0; i--) {
					if (node.parents[i] && node.parents[i].scope){
						scope = node.parents[i].scope;
						break;
					}
				}
			}
		}
		while (scope){
			for (key in scope.props){
				theType = scope.props[key];
				// TODO How to handle union types?
				if (theType && theType.types && theType.types.length > 0){
					proposal = getProposalForType(theType.types[0], envs, existingCompletions, prefix);
					if (proposal){
						proposals.push(proposal);
					}
				}
	
			}
			scope = scope.prev;
		}
		
		// Add in additional types that Tern can understand
		var _p = createProposal('{}', Messages['jsDocEmptyObjDesc'], prefix);
		_p.origin = "ecma5";
		_p.doc = Messages['jsDocEmptyObjDoc'];
		proposals.push(_p);
		_p = createProposal('{prop: propType}', Messages['jsDocObjPropDesc'], prefix);
		_p.origin = "ecma5";
		_p.doc = Messages['jsDocObjPropDoc'];
		proposals.push(_p);
		_p = createProposal('?', Messages['jsDocAnyTypeDesc'], prefix);
		_p.origin = "ecma5";
		_p.doc = Messages['jsDocAnyTypeDoc'];
		proposals.push(_p);
		
		return proposals;
	}
	
	/**
	 * Return whether the given file name is an html file
	 * @param name file name to look at
	 * @returns returns whether the file name is html
	 */
	function isHTML(name) {
		return /(?:html|htm|xhtml)$/g.test(name);
	}
	
	/**
	 * @name getProposalForType
	 * @description Returns a completion proposal for the given type object or <code>null<code> if no proposal should be added
	 * @param theType {Object} type to make a proposal for
	 * @param envs {Object} list of active environments
	 * @param existingCompletions {Object} list of existing completion names
	 * @param prefix {String} preceding characters to the completion
	 * @returns returns a proposal or null
	 */
	function getProposalForType(theType, envs, existingCompletions, prefix){
		if (theType && typeof theType === 'object' && theType.name && theType.origin){
			if (envs[theType.origin] || theType.origin.indexOf('/') >= 0){
				var name = theType.name;
				
				// Top level scope can't be a return type in Browser or Node
				if (name === '<top>'){
					return null;
				}
				// We only want type completions not functions returning primitives, but include the actual primitive types
				var prims = ['bool', 'boolean', 'string', 'number', 'regexp'];
				if (theType.retval && prims.indexOf(theType.retval.name) >= 0 && prims.indexOf(theType.name.toLowerCase()) < 0){
					return null;
				}
				// Different scopes may have same properties
				if (existingCompletions[name]){
					return null;
				}
				
				existingCompletions[name] = true;
				var _p = createProposal(name, '', prefix);
				_p.origin = theType.origin;
				_p.doc = theType.doc;
				_p.url = theType.url;
				return _p;
			}
		}
		return null;
	}
	
	/**
	 * @name getActiveEnvironments
	 * @description Return an {Object} containing all active environments in the given ast based on eslint env and global settings
	 * @param ast File AST to get environments for
	 * @param defenvs {Object} containing environments that should be included in the active list by default
	 * @returns returns {Object} will all active environments set to <code>true</code>
	 */
	function getActiveEnvironments(ast, defenvs) {
		var env = Object.create(null);
		objects.mixin(env, defenvs);
		if(ast.comments) {
			for(var i = 0; i < ast.comments.length; i++) {
				var comment = ast.comments[i];
				if (comment.type === "Block") {
		            var value = comment.value.trim();
		            var match = /^(eslint-\w+|eslint|globals?)(\s|$)/.exec(value);
					if (match) {
		                value = value.substring(match.index + match[1].length);
		                if(match[1] === 'eslint-env') {
		                	// Collapse whitespace around ,
						    var string = value.replace(/\s*,\s*/g, ",");
						    string.split(/,+/).forEach(function(_name) {
						        _name = _name.trim();
						        if (!_name) {
						            return;
						        }
						        env[_name] = true;
						    });
		                }
		            }
		        }
			}
		}
	    return env;
	}
	
	/**
	 * @description Computes the reachable type member names for completions
	 * @param {String} prefix The prefix
	 * @returns {Array.<Object>} The array of completion objects
	 */
	function computeMemberCompletions(prefix) {
		//TODO
		return [];
	}
	/**
	 * @description Computes the proposals for the block
	 * @param {String} prefix The prefix
	 * @param {Object} comment The AST node for the comment
	 * @param {Object} options The activation options
	 * @param {File} file The mapped file from Tern
	 * @returns {Array.<Object>} The array of completion objects
	 */
	function computeBlockCompletions(prefix, comment, options, file) {
		var proposals = [];
		var keys, val, _p;
		var line = getLine(options.end, file);
		var preamble = line.line.slice(0, options.end-line.start-prefix.length-1);
		
		if(/^\/\*$/.test(preamble.trim())) {
			// Provide a eslint-env template with set list of environments for the user to choose from
			if (Util.looselyMatches(prefix, "eslint-env")){
				var envsListTemplate = getEnvsListForTemplate();
				var template = "eslint-env ${library:" + envsListTemplate +"}";
				_p = createProposal("eslint-env", "", prefix, template);
				_p.doc = Messages['eslintEnvDirective'];
				_p.url = "https://eslint.org/docs/user-guide/configuring.html#specifying-environments";
				proposals.push(_p);
			}
			keys = Object.keys(block);
			for(var len = keys.length, i = 0; i < len; i++) {
				var tag = block[keys[i]];
				if(Util.looselyMatches(prefix, tag.name)) {
					_p = createProposal(tag.name, '', prefix, tag.template);
					_p.url = tag.url;
					_p.doc = tag.desc;
					proposals.push(_p);
				}
			}
		} else if((val = /\s*\*\s*\@name\s*(\w*)/ig.exec(line.line)) !== null) {
			if(val[1] === prefix) {
				var node = Finder.findNodeAfterComment(comment, file.ast);
				var _name = getFunctionName(node);
				if(_name) {
					proposals.push(createProposal(_name, Messages['funcProposalDescription'], prefix));
				}
			}
		} else if((val = /\s*\*\s*\@param\s*(?:\{.*\})?\s*(\w*)/ig.exec(line.line)) !== null) {
			if(val[1] === prefix) {
				node = Finder.findNodeAfterComment(comment, file.ast);
				if(node) {
					var prms = getFunctionParams(node);
					if(Array.isArray(prms)) {
						for(i = 0; i < prms.length; i++) {
							_name = prms[i].name;
							if(Util.looselyMatches(prefix, _name)) {
								proposals.push(createProposal(_name, Messages['funcParamProposalDescription'], prefix));
							}
						}
					}
				}
			}
		} else if(/^\s*(?:\/\*)?\s*eslint(?:-enable|-disable)?\s+/gi.test(line.line)) {
			//eslint eslint-enable eslint-disable
			var rules = Rules.metadata;
			var rulekeys = Object.keys(rules).sort();
			for(i = 0; i < rulekeys.length; i++) {
				var rulekey = rulekeys[i];
				if(Util.looselyMatches(prefix, rulekey)) {
					var rule = rules[rulekey];
					_p = createProposal(rulekey, '', prefix);
					_p.doc = rule.description ? rule.description : Messages['eslintRuleProposalDescripton'];
					if(rule.url) {
						_p.url = rule.url;
					}
					proposals.push(_p);
				}
			}
		} else if(/^\s*(?:\/\*)?\s*eslint-env\s+/gi.test(line.line)) {
			//eslint-env (comma-separated list)
			keys = Object.keys(allEnvs).sort();
			for(i = 0; i < keys.length; i++) {
				var key = keys[i];
				if(key !== 'builtin' && Util.looselyMatches(prefix, key)) {
					_p = createProposal(key, "", prefix);
					_p.doc = envNames[key];
					if(!_p.doc) {
						_p.doc = Messages['eslintEnvProposalDescription'];
					}
					_p.url = "https://eslint.org/docs/user-guide/configuring.html#specifying-environments";
					proposals.push(_p);
				}
			}
		} else {
				keys = Object.keys(tags);
				for(len = keys.length, i = 0; i < len; i++) {
					tag = tags[keys[i]];
					if(Util.looselyMatches(prefix, tag.name)) {
						if(tag.template) {
							_p = createProposal(tag.name, "", prefix, tag.template);
						} else {
							_p = createProposal(tag.name, "", prefix);
						}
						_p.url = tag.url;
						_p.doc = tag.desc;
						proposals.push(_p);
					}
				}
		}
		return proposals;
	}
	
	/**
	 * @description Finds the line of text the completion is happening on - this mimics 
	 * an option we used to get from the client
	 * @param {Number} offset The offset in text the completion is happening at
	 * @param {File} file The file obejct from Tern
	 * @returns {String} The line of text
	 * @since 11.0
	 */
	function getLine(offset, file) {
		var line = '', idx = offset;
		if(idx > 0 && idx <= file.text.length) {
			var c = file.text.charAt(idx);
			if(c === '\n') {
				//started at the end, walk back to the next end
				idx--;
				c = file.text.charAt(idx);
			}
			while(c !== '\n' && idx > -1) {
				line = c+line;
				idx--;
				c = file.text.charAt(idx);
			}
		}
		return {line: line, start: idx};
	}
	
	/**
	 * @description Returns the function name from the given node if it relates to a function in some way
	 * @param {Object} node The AST node
	 * @returns {String} The name of he related function or null
	 * @since 10.0
	 */
	function getFunctionName(node) {
		switch(node.type) {
			case 'FunctionDeclaration': {
				return node.id.name;
			}
			case 'Property': {
				if(node.value.type === 'FunctionExpression') {
					return node.value.id ? node.value.id.name : node.key.name;
				}
				break;
			}
			case 'ExpressionStatement': {
				var _n = node.expression;
				if(_n && _n.type === 'AssignmentExpression' && _n.right.type === 'FunctionExpression') {
					if(_n.right.id) {
						return _n.right.id.name;
					}
					if(_n.left.type === 'Identifier') {
						return _n.left.name;
					}
					if(_n.left.type === 'MemberExpression') {
						return Signatures.expandMemberExpression(_n.left, '');
					}
				}
				break;
			}
			case 'VariableDeclaration': {
				if(node.declarations.length > 0) {
					//always pick the first one to attach the comment to
					var decl = node.declarations[0];
					if(decl.init && decl.init.type === 'FunctionExpression') {
						if(decl.init.id) {
							return decl.init.id.name;
						}
						return decl.id.name;
					}
				}
				break;
			}
		}
		return null;
	}

	/**
	 * @description Returns the parameters from the related function
	 * @param {Object} node The AST node
	 * @returns {Array.<Object>} The parameters from the related function or an empty array
	 * @since 10.0
	 */
	function getFunctionParams(node) {
		switch(node.type) {
			case 'FunctionDeclaration': {
				return node.params;
			}
			case 'Property': {
				if(node.value.type === 'FunctionExpression') {
					return node.value.params;
				}
				break;
			}
			case 'ExpressionStatement': {
				var _n = node.expression;
				if(_n && _n.type === 'AssignmentExpression' && _n.right.type === 'FunctionExpression') {
					return _n.right.params;
				}
				break;
			}
			case 'VariableDeclaration': {
				if(node.declarations.length > 0) {
					//always pick the first one to attach the comment to
					var decl = node.declarations[0];
					if(decl.init && decl.init.type === 'FunctionExpression') {
						return decl.init.params;
					}
				}
				break;
			}
		}
		return [];
	}
	
	/**
	 * Takes the allEnvs object, extracts the envs list and formats it into a JSON string that the template
	 * computer will accept.
	 * @returns {String} A string list of eslint environment directives that the template computer will accept
	 */
	function getEnvsListForTemplate(){
		var envsList = [];
		var keys = Object.keys(allEnvs).sort();
		for(var j = 0; j < keys.length; j++) {
			var key = keys[j];
			if(key !== 'builtin'){
				envsList.push(key);
			}
		}
		var templateList = {
			type: "link", //$NON-NLS-0$
			values: envsList,
			title: 'ESLint Environments',
			style: 'no_emphasis' //$NON-NLS-1$
		};
		return JSON.stringify(templateList).replace("}", "\\}");
	}
	
	/**
	 * @description Helper function to create a new proposal object
	 * @param {String} name The name of the proposal
	 * @param {String} description The description
	 * @param {String} prefix The optional prefix to pass along
	 * @param {String} template The optional code template for the proposal
	 * @returns {Object} A new proposal object
	 */
	function createProposal(name, description, prefix, template) {
		var p = Object.create(null);
		if(typeof template === 'string') {
			p.type = 'jsdoc_template';
			p.template = template;
		} else {
			p.type = 'doc';
		}
		p.name = name;
		p.proposal = name.slice(prefix.length);
		p.description = description;
		p.overwrite = true;
		if(typeof prefix === 'string') {
			p.prefix = prefix;
		}
		return p;
	}
	
	/**
	 * These are templates / entries that apply to blocks starting with /* vs. /**
	 */
	var block = {
		"eslint": {
			name: "eslint",  //$NON-NLS-0$
			desc: Messages['eslintRuleEnableDisable'],
			template: "eslint ${rule-id}:${0/1} ${cursor}", //$NON-NLS-0$  
			url: "https://eslint.org/docs/user-guide/configuring.html#configuring-rules"
	    },
	    "eslint-enable": {
			name: "eslint-enable",  //$NON-NLS-0$
			desc: Messages['eslintRuleEnable'],
			template: "eslint-enable ${rule-id} ${cursor}", //$NON-NLS-0$  
			url: "https://eslint.org/docs/user-guide/configuring.html#configuring-rules"
	    },
	    "eslint-disable": {
			name: "eslint-disable",  //$NON-NLS-0$
			desc: Messages['eslintRuleDisable'],
			template: "eslint-disable ${rule-id} ${cursor}", //$NON-NLS-0$
			url: "https://eslint.org/docs/user-guide/configuring.html#configuring-rules"
	    }
	};
	
	var tags = {
		"abstract": {
			"name": "@abstract",
			"url": "https://usejsdoc.org/tags-abstract.html",
			"desc": "This member must be implemented (or overridden) by the inheritor."
		},
		"access": {
			"name": "@access",
			"url": "https://usejsdoc.org/tags-access.html",
			"desc": "Specify the access level of this member (private, public, or protected)."
		},
		"alias": {
			"name": "@alias",
			"url": "https://usejsdoc.org/tags-alias.html",
			"desc": "Treat a member as if it had a different name."
		},
		"augments": {
			"name": "@augments",
			"url": "https://usejsdoc.org/tags-augments.html",
			"desc": "Indicate that a symbol inherits from, ands adds to, a parent symbol."
		},
		"author": {
			"name": "@author",
			"url": "https://usejsdoc.org/tags-author.html",
			"desc": "Identify the author of an item.",
			"template": "@author ${cursor}"
		},
		"borrows": {
			"name": "@borrows",
			"url": "https://usejsdoc.org/tags-borrows.html",
			"desc": "This object uses something from another object."
		},
		"callback": {
			"name": "@callback",
			"url": "https://usejsdoc.org/tags-callback.html",
			"desc": "Document a callback function.",
			"template": "@callback ${cursor}"
		},
		"class": {
			"name": "@class",
			"url": "https://usejsdoc.org/tags-class.html",
			"desc": "This function is intended to be called with the \"new\" keyword.",
			"template": "@class ${cursor}"
		},
		"classdesc": {
			"name": "@classdesc",
			"url": "https://usejsdoc.org/tags-classdesc.html",
			"desc": "Use the following text to describe the entire class."
		},
		"constant": {
			"name": "@constant",
			"url": "https://usejsdoc.org/tags-constant.html",
			"desc": "Document an object as a constant."
		},
		"constructs": {
			"name": "@constructs",
			"url": "https://usejsdoc.org/tags-constructs.html",
			"desc": "This function member will be the constructor for the previous class."
		},
		"copyright": {
			"name": "@copyright",
			"url": "https://usejsdoc.org/tags-copyright.html",
			"desc": "Document some copyright information."
		},
		"default": {
			"name": "@default",
			"url": "https://usejsdoc.org/tags-default.html",
			"desc": "Document the default value."
		},
		"deprecated": {
			"name": "@deprecated",
			"url": "https://usejsdoc.org/tags-deprecated.html",
			"desc": "Document that this is no longer the preferred way.",
			"template": "@deprecated ${cursor}"
		},
		"description": {
			"name": "@description",
			"url": "https://usejsdoc.org/tags-description.html",
			"desc": "Describe a symbol.",
			"template": "@description ${cursor}"
		},
		"enum": {
			"name": "@enum",
			"url": "https://usejsdoc.org/tags-enum.html",
			"desc": "Document a collection of related properties."
		},
		"event": {
			"name": "@event",
			"url": "https://usejsdoc.org/tags-event.html",
			"desc": "Document an event."
		},
		"example": {
			"name": "@example",
			"url": "https://usejsdoc.org/tags-example.html",
			"desc": "Provide an example of how to use a documented item."
		},
		"exports": {
			"name": "@exports",
			"url": "https://usejsdoc.org/tags-exports.html",
			"desc": "Identify the member that is exported by a JavaScript module."
		},
		"external": {
			"name": "@external",
			"url": "https://usejsdoc.org/tags-external.html",
			"desc": "Identifies an external class, namespace, or module."
		},
		"file": {
			"name": "@file",
			"url": "https://usejsdoc.org/tags-file.html",
			"desc": "Describe a file."
		},
		"fires": {
			"name": "@fires",
			"url": "https://usejsdoc.org/tags-fires.html",
			"desc": "Describe the events this method may fire."
		},
		"function": {
			"name": "@function",
			"url": "https://usejsdoc.org/tags-function.html",
			"desc": "Describe a function or method.",
			"template": "@function ${cursor}"
		},
		"global": {
			"name": "@global",
			"url": "https://usejsdoc.org/tags-global.html",
			"desc": "Document a global object."
		},
		"ignore": {
			"name": "@ignore",
			"url": "https://usejsdoc.org/tags-ignore.html",
			"desc": "Omit a symbol from the documentation."
		},
		"implements": {
			"name": "@implements",
			"url": "https://usejsdoc.org/tags-implements.html",
			"desc": "This symbol implements an interface."
		},
		"inheritdoc": {
			"name": "@inheritdoc",
			"url": "https://usejsdoc.org/tags-inheritdoc.html",
			"desc": "Indicate that a symbol should inherit its parent's documentation."
		},
		"inner": {
			"name": "@inner",
			"url": "https://usejsdoc.org/tags-inner.html",
			"desc": "Document an inner object."
		},
		"instance": {
			"name": "@instance",
			"url": "https://usejsdoc.org/tags-instance.html",
			"desc": "Document an instance member."
		},
		"interface": {
			"name": "@interface",
			"url": "https://usejsdoc.org/tags-interface.html",
			"desc": "This symbol is an interface that others can implement."
		},
		"kind": {
			"name": "@kind",
			"url": "https://usejsdoc.org/tags-kind.html",
			"desc": "What kind of symbol is this?"
		},
		"lends": {
			"name": "@lends",
			"url": "https://usejsdoc.org/tags-lends.html",
			"desc": "Document properties on an object literal as if they belonged to a symbol with a given name.",
			"template": "@lends ${cursor}"
		},
		"license": {
			"name": "@license",
			"url": "https://usejsdoc.org/tags-license.html",
			"desc": "Identify the license that applies to this code.",
			"template": "@license ${cursor}"
		},
		"listens": {
			"name": "@listens",
			"url": "https://usejsdoc.org/tags-listens.html",
			"desc": "List the events that a symbol listens for."
		},
		"member": {
			"name": "@member",
			"url": "https://usejsdoc.org/tags-member.html",
			"desc": "Document a member."
		},
		"memberof": {
			"name": "@memberof",
			"url": "https://usejsdoc.org/tags-memberof.html",
			"desc": "This symbol belongs to a parent symbol."
		},
		"mixes": {
			"name": "@mixes",
			"url": "https://usejsdoc.org/tags-mixes.html",
			"desc": "This object mixes in all the members from another object."
		},
		"mixin": {
			"name": "@mixin",
			"url": "https://usejsdoc.org/tags-mixin.html",
			"desc": "Document a mixin object."
		},
		"module": {
			"name": "@module",
			"url": "https://usejsdoc.org/tags-module.html",
			"desc": "Document a JavaScript module."
		},
		"name": {
			"name": "@name",
			"url": "https://usejsdoc.org/tags-name.html",
			"desc": "Document the name of an object.",
			"template": "@name ${cursor}"
		},
		"namespace": {
			"name": "@namespace",
			"url": "https://usejsdoc.org/tags-namespace.html",
			"desc": "Document a namespace object."
		},
		"override": {
			"name": "@override",
			"url": "https://usejsdoc.org/tags-override.html",
			"desc": "Indicate that a symbol overrides its parent."
		},
		"param": {
			"name": "@param",
			"url": "https://usejsdoc.org/tags-param.html",
			"desc": "Document the parameter to a function.",
			"template": "@param {${type}} ${cursor}"
		},
		"private": {
			"name": "@private",
			"url": "https://usejsdoc.org/tags-private.html",
			"desc": "This symbol is meant to be private.",
			"template": "@private ${cursor}"
		},
		"property": {
			"name": "@property",
			"url": "https://usejsdoc.org/tags-property.html",
			"desc": "Document a property of an object."
		},
		"protected": {
			"name": "@protected",
			"url": "https://usejsdoc.org/tags-protected.html",
			"desc": "This symbol is meant to be protected."
		},
		"public": {
			"name": "@public",
			"url": "https://usejsdoc.org/tags-public.html",
			"desc": "This symbol is meant to be public.",
			"template": "@public ${cursor}"
		},
		"readonly": {
			"name": "@readonly",
			"url": "https://usejsdoc.org/tags-readonly.html",
			"desc": "This symbol is meant to be read-only."
		},
		"requires": {
			"name": "@requires",
			"url": "https://usejsdoc.org/tags-requires.html",
			"desc": "This file requires a JavaScript module."
		},
		"returns": {
			"name": "@returns",
			"url": "https://usejsdoc.org/tags-returns.html",
			"desc": "Document the return value of a function.",
			"template": "@returns {${type}} ${cursor}"
		},
		"see": {
			"name": "@see",
			"url": "https://usejsdoc.org/tags-see.html",
			"desc": "Refer to some other documentation for more information.",
			"template": "@see ${cursor}"
		},
		"since": {
			"name": "@since",
			"url": "https://usejsdoc.org/tags-since.html",
			"desc": "When was this feature added?",
			"template": "@since ${cursor}"
		},
		"static": {
			"name": "@static",
			"url": "https://usejsdoc.org/tags-static.html",
			"desc": "Document a static member."
		},
		"summary": {
			"name": "@summary",
			"url": "https://usejsdoc.org/tags-summary.html",
			"desc": "A shorter version of the full description."
		},
		"this": {
			"name": "@this",
			"url": "https://usejsdoc.org/tags-this.html",
			"desc": "What does the 'this' keyword refer to here?"
		},
		"throws": {
			"name": "@throws",
			"url": "https://usejsdoc.org/tags-throws.html",
			"desc": "Describe what errors could be thrown.",
			"template": "@throws {${type}} ${cursor}"
		},
		"todo": {
			"name": "@todo",
			"url": "https://usejsdoc.org/tags-todo.html",
			"desc": "Document tasks to be completed."
		},
		"tutorial": {
			"name": "@tutorial",
			"url": "https://usejsdoc.org/tags-tutorial.html",
			"desc": "Insert a link to an included tutorial file."
		},
		"type": {
			"name": "@type",
			"url": "https://usejsdoc.org/tags-type.html",
			"desc": "Document the type of an object."
		},
		"typedef": {
			"name": "@typedef",
			"url": "https://usejsdoc.org/tags-typedef.html",
			"desc": "Document a custom type."
		},
		"variation": {
			"name": "@variation",
			"url": "https://usejsdoc.org/tags-variation.html",
			"desc": "Distinguish different objects with the same name."
		},
		"version": {
			"name": "@version",
			"url": "https://usejsdoc.org/tags-version.html",
			"desc": "Documents the version number of an item."
		},
		"link": {
			"name": "{@link}",
			"url": "https://usejsdoc.org/tags-inline-link.html",
			"desc": "Link to another item in the documentation."
		},
		"inline-tutorial": {
			"name": "{@tutorial}",
			"url": "https://usejsdoc.org/tags-inline-tutorial.html",
			"desc": "Link to a tutorial."
		}
	};
	
});
