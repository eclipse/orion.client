/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2016 IBM Corporation and others.
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
'estraverse/estraverse',
'eslint/conf/environments'
], function(Estraverse, ESlintEnv) {
	
	var Finder = {
		
		visitor: null,
		
		punc: '\n\t\r (){}[]:;,.+=-*^&@!%~`\'\"\/\\',  //$NON-NLS-0$
		
		/**
		 * @name findWord
		 * @description Finds the word from the start position
		 * @function
		 * @public
		 * @memberof javascript.Finder
		 * @param {String} text The text of the source to find the word in
		 * @param {Number} start The current start position of the carat
		 * @returns {String} Returns the computed word from the given string and offset or <code>null</code>
		 */
		findWord: function(text, start) {
			if(text && start > -1) {
				var ispunc = this.punc.indexOf(text.charAt(start)) > -1;
				var pos = ispunc && start > 0 ? start-1 : start;
				while(pos >= 0) {
					if(this.punc.indexOf(text.charAt(pos)) > -1) {
						break;
					}
					pos--;
				}
				var s = pos;
				pos = start;
				while(pos <= text.length) {
					if(this.punc.indexOf(text.charAt(pos)) > -1) {
						break;
					}
					pos++;
				}
				if((s === start || (ispunc && (s === start-1))) && pos === start) {
					return null;
				}
				else if(s === start) {
					return text.substring(s, pos);
				}
				else {
					return text.substring(s+1, pos);
				}
			}
			return null;
		},
		
		/**
		 * @name findNode
		 * @description Finds the AST node for the given offset
		 * @function
		 * @public
		 * @memberof javascript.Finder
		 * @param {Number} offset The offset into the source file
		 * @param {Object} ast The AST to search
		 * @param {Object} options The optional options
		 * @returns The AST node at the given offset or <code>null</code> if it could not be computed.
		 */
		findNode: function(offset, ast, options) {
			var found = null;
			var parents = options && options.parents ? [] : null;
			var next = options && options.next ? options.next : false;
			if(typeof offset === 'number' && offset > -1 && ast) {
				Estraverse.traverse(ast, {
					/**
					 * start visiting an AST node
					 */
					enter: function(node) {
						//only check nodes that are typed, we don't care about any others
						if(node.type && node.range) {
							if(!next && node.type === Estraverse.Syntax.Program && offset < node.range[0]) {
								//https://bugs.eclipse.org/bugs/show_bug.cgi?id=447454
								return Estraverse.VisitorOption.Break;
							}
							// Class and method declarations count offsets including the curly braces {} Bug 494484
							// When offset is touching both identifier and body, we want finder to return the identifier
							var bracesIncluded = false;							
							if (node.range[0] === offset && found && found.range[1] === offset && node.type === 'ClassBody' || node.type === 'FunctionExpression' && found && found.type === 'Identifier'){
								bracesIncluded = true;
							}

							if((!bracesIncluded && node.range[0] <= offset) || (bracesIncluded && node.range[0] < offset) ){
								found = node;
								if(parents) {
									parents.push(node);
								}
							} else {
								if(next) {
									found = node;
									if(parents) {
										parents.push(node);
									}
								}
								if(found.type !== Estraverse.Syntax.Program) {
									//we don't want to find the next node as the program root
									//if program has no children it will be returned on the next pass
									//https://bugs.eclipse.org/bugs/show_bug.cgi?id=442411
									return Estraverse.VisitorOption.Break;
								}
							}
						}
					},
					/** override */
					leave: function(node) {
						if(parents && offset > node.range[1]) {
							parents.pop();
						}
					}
				});
			}
			if(found && parents && parents.length > 0) {
				var p = parents[parents.length-1];
				if(p.type !== 'Program' && p.range[0] === found.range[0] && p.range[1] === found.range[1]) {
					//a node can't be its own parent
					parents.pop();
				}
				found.parents = parents;
			}
			return found;
		},
		
		/**
		 * @description Finds the first non-comment AST node immediately following the given comment node
		 * @param {Object} comment The comment node
		 * @param {Object} ast The AST 
		 * @since 10.0
		 */
		findNodeAfterComment: function(comment, ast) {
			var found = null;
			var parents = [];
			if(Array.isArray(comment.range) && ast) {
				var offset = comment.range[1];
				Estraverse.traverse(ast, {
					/**
					 * start visiting an AST node
					 */
					enter: function(node, last) {
						if(node.type && node.range) {
							if(last) {
								parents.push(last);
							}
							if(offset > node.range[0]) {
								found = node;
							} else {
								found = node;
								if(node.type !== Estraverse.Syntax.Program) {
									return Estraverse.VisitorOption.Break;
								}

							}
						}
					}
				});
			}
			if(found) {
				found.parents = parents;
			}
			return found;
		},
		
		/**
		 * @description Finds all of the AST nodes that start within the given range
		 * @function
		 * @param {Object} ast The AST to inspect
		 * @param {Number} start The starting offset
		 * @param {Number} end The ending offset
		 * @returns {Array.<Object>} Returns the array of AST nodes that start within the given range
		 * @since 11.0
		 */
		findNodesForRange: function findeNodesForRange(ast, start, end) {
			var nodes = [];
			if(ast) {
				Estraverse.traverse(ast, {
					enter: function(node) {
						if(node.range[0] >= start && node.range[0] < end) {
							nodes.push(node);
						}
						if(node.range[0] >= end) {
							return Estraverse.VisitorOption.BREAK;
						}
					}
				});
			}
			return nodes;
		},
		
		/**
		 * @name findToken
		 * @description Finds the token in the given token stream for the given start offset
		 * @function
		 * @public
		 * @memberof javascript.Finder
		 * @param {Number} offset The offset intot the source
		 * @param {Array|Object} tokens The array of tokens to search
		 * @returns {Object} The AST token that starts at the given start offset
		 */
		findToken: function(offset, tokens) {
			if(typeof offset === 'number' && offset > -1 && tokens && tokens.length > 0) {
				var min = 0,
					max = tokens.length-1,
					token, 
					idx = 0;
					token = tokens[0];
				if(offset >= token.range[0] && offset < token.range[1]) {
					token.index = 0;
					return token;
				}
				token = tokens[max];
				if(offset >= token.range[0]) {
					token.index = max;
					return token;
				}
				token = null;
				while(min <= max) {
					idx = Math.floor((min + max) / 2);
					token = tokens[idx];
					if(offset < token.range[0]) {
						max = idx-1;
					}
					else if(offset > token.range[1]) {
						min = idx+1;
					}
					else if(offset === token.range[1]) {
						var next = tokens[idx+1];
						if(next.range[0] === token.range[1]) {
							min = idx+1;
						}
						else {
							token.index = idx;
							return token;
						}
					}
					else if(offset >= token.range[0] && offset < token.range[1]) {
						token.index = idx;
						return token;
					}
					if(min === max) {
						token = tokens[min];
						if(offset >= token.range[0] && offset <= token.range[1]) {
							token.index = min;
							return token;
						}
						return null;
					}
				}
			}
			return null;
		},
		
		/**
		 * @description Finds the doc comment at the given offset. Returns null if there
		 * is no comment at the given offset
		 * @function
		 * @public
		 * @param {Number} offset The offset into the source
		 * @param {Object} ast The AST to search
		 * @returns {Object} Returns the comment node for the given offset or null
		 */
		findComment: function(offset, ast) {
			if(ast.comments) {
				var comments = ast.comments;
				var len = comments.length;
				for(var i = 0; i < len; i++) {
					var comment = comments[i];
					if(comment.range[0] < offset && comment.range[1] >= offset) {
						return comment;
					} else if(offset === ast.range[1] && offset === comment.range[1]) {
					   return comment;
					} else if(offset > ast.range[1] && offset <= comment.range[1]) {
						return comment;
					} else if(comment.range[0] > offset) {
						//we've passed the node
						return null;
					}
				}
				return null;
			}
		},
		
		/**
		 * @description Finds the script blocks from an HTML file and returns the code and offset for found blocks. The returned array may not be sorted.
		 * @function
		 * @public
		 * @param {String} buffer The file contents
		 * @param {Number} offset The offset into the buffer to find the enclosing block for
		 * @returns {Object} An object of script block items {text, offset}
		 * @since 6.0
		 */
		findScriptBlocks: function(buffer, offset) {
			var blocks = [];
			var val = null;
			
			// Find script tags
			var regex = /<\s*script([^>]*)(?:\/>|>((?:.|\r?\n)*?)<\s*\/script[^<>]*>)/ig;
			var langRegex = /(type|language)\s*=\s*"([^"]*)"/i;
			var srcRegex = /src\s*=\s*"([^"]*)"/i;			
			var comments = this.findHtmlCommentBlocks(buffer, offset);
			loop: while((val = regex.exec(buffer)) !== null) {
				var attributes = val[1];
				var text = val[2];
				var deps = null;
				if (attributes){
					var lang = langRegex.exec(attributes);
					// No type/language attribute or empty values default to javascript
					if (lang && lang[2]){
						var type = lang[2];
						if (lang[1] === "language"){
							// Language attribute does not include 'text' prefix
							type = "text/" + type; //$NON-NLS-1$
						}
						if (!/^(application|text)\/(ecmascript|javascript(\d.\d)?|livescript|jscript|x\-ecmascript|x\-javascript)$/ig.test(type)) {
							continue;
						}
					}
					var src = srcRegex.exec(attributes);
					if (src){
						deps = src[1];
					}
				}
				if (!text && deps){
					blocks.push({text: "", offset: 0, dependencies: deps});
					continue;
				}
				if (text === undefined){
					// Inline script blocks with no dependents are not valid i.e. <script/>
					continue;
				}
				var index = val.index+val[0].indexOf('>')+1;
				if(typeof offset !== 'number' || (index <= offset && index+text.length >= offset)) {
					for(var i = 0; i < comments.length; i++) {
						if(comments[i].start <= index && comments[i].end >= index) {
							continue loop;
						}
					}
					blocks.push({
						text: text,
						offset: index,
						dependencies: deps
						
					});
				}
			}
			
			// Find onevent attribute values
			var eventAttributes = {'blur':true, 'change':true, 'click':true, 'dblclick':true, 'focus':true, 'keydown':true, 'keypress':true, 'keyup':true, 'load':true, 'mousedown':true, 'mousemove':true, 'mouseout':true, 'mouseover':true, 'mouseup':true, 'reset':true, 'select':true, 'submit':true, 'unload':true};
			var eventRegex = /(\s+)on(\w*)(\s*=\s*")([^"]*)"/ig;
			var count = 0;
			loop: while((val = eventRegex.exec(buffer)) !== null) {
				count++;
				var leadingWhitespace = val[1];
				var attribute = val[2];
				var assignment = val[3];
				text = val[4];
				if (attribute && attribute.toLowerCase() in eventAttributes){
					if(!text){
						text = "";
					}
					index = val.index + leadingWhitespace.length + 2 + attribute.length + assignment.length;
					if(typeof offset !== 'number' || (index <= offset && index+text.length >= offset)) {
						for(var j = 0; j < comments.length; j++) {
							if(comments[j].start <= index && comments[j].end >= index) {
								continue loop;
							}
						}
						blocks.push({
							text: text,
							offset: index,
							isWrappedFunctionCall: true
						});
					}
				}
			}
			return blocks;
		},
		
		/**
		 * @description Finds all of the block comments in an HTML file
		 * @function
		 * @public
		 * @param {String} buffer The file contents
		 * @param {Number} offset The optional offset to compute the block(s) for
		 * @return {Array} The array of block objects {text, start, end}
		 * @since 6.0
		 */
		findHtmlCommentBlocks: function(buffer, offset) {
			var blocks = [];
			var val = null, regex = /<!--((?:.|\r?\n)*?)-->/ig;
			while((val = regex.exec(buffer)) != null) {
				var text = val[1];
				if(text.length < 1) {
					continue;
				}
				if(typeof offset !== 'number' || (val.index <= offset && val.index+text.length >= val.index)) {
					blocks.push({
						text: text,
						start: val.index,
						end: val.index+text.length
					});
				}
			}
			return blocks;
		},
		
		/**
		 * @description Asks the ESLint environment description if it knows about the given member name and if so
		 * returns the index name it was found in
		 * @function
		 * @param {String} name The name of the member to look up
		 * @returns {String} The name of the ESLint environment it was found in or <code>null</code>
		 * @since 8.0
		 */
		findESLintEnvForMember: function findESLintEnvForMember(name) {
			var keys = Object.keys(ESlintEnv);
			if(keys) {
				var len = keys.length;
				for(var i = 0; i < len; i++) {
					var env = ESlintEnv[keys[i]];
					if(typeof env[name] !== 'undefined') {
						return keys[i];
					}
					var globals = env['globals'];
					if(globals && typeof globals[name] !== 'undefined') {
						return keys[i];
					}
				}
			}
			return null;
		},
		
		/**
		 * @description Find the directive comment with the given name in the given AST
		 * @function
		 * @param {Object} ast The AST to search
		 * @param {String} name The name of the directive to look for. e.g. eslint-env
		 * @returns {Object} The AST comment node or <code>null</code>
		 * @since 8.0
		 */
		findDirective: function findDirective(ast, name) {
			if(ast && typeof name !== 'undefined') {
				var len = ast.comments.length;
				for(var i = 0; i < len; i++) {
					var match = /^\s*(eslint-\w+|eslint|globals?)(\s|$)/.exec(ast.comments[i].value);
					if(match !== null && typeof match !== 'undefined' && match[1] === name) {
						return ast.comments[i];
					}
				}
			}
			return null;
		},
		
		/**
		 * @description Find all directive comments with the given name in the given AST
		 * @function
		 * @param {Object} ast The AST to search
		 * @param {String} name The name of the directive to look for. e.g. eslint-env
		 * @returns {Array} Array of AST comment nodes, possibly empty
		 * @since 14.0
		 */
		findDirectives: function findDirectives(ast, name) {
			var result = [];
			if(ast && typeof name !== 'undefined') {
				var len = ast.comments.length;
				for(var i = 0; i < len; i++) {
					var match = /^\s*(eslint-\w+|eslint|globals?)(\s|$)/.exec(ast.comments[i].value);
					if(match !== null && typeof match !== 'undefined' && match[1] === name) {
						result.push(ast.comments[i]);
					}
				}
			}
			return result;
		},
		
		/**
		 * @description Returns range of the first non-comment token in the body of the ast.
		 * @param {AST} ast The AST
		 * @returns {Array} The range array of first token
		 */
		findProgramStartRange: function findProgramStartNode(ast) {
			if (ast.tokens && ast.tokens.length > 0){
				return ast.tokens[0].range;
			}
			if (ast.comments && ast.comments.length > 0){
				return [ast.comments[0].range[0], ast.comments[0].range[0]+1];
			}
			if (typeof ast.end === "number"){
				return [ast.end, ast.end];
			}
			return [0, 0];
		},
		
		/**
		 * @description Tries to find the comment for the given node. If more than one is found in the array
		 * the last entry is considered 'attached' to the node
		 * @function
		 * @private
		 * @param {Object} node The AST node
		 * @returns {Object} The comment object from the AST or null
		 * @since 8.0
		 */
		findCommentForNode: function findCommentForNode(node) {
			var comments = node.leadingComments;
			var comment = null;
			if(comments && comments.length > 0) {
				//simple case: the node has an attaced comment, take the last comment in the leading array
				comment = comments[comments.length-1];
				if(comment.type === 'Block') {
					comment.node = node;
					return comment;
				}
			} else if(node.type === 'Property') { //TODO https://github.com/jquery/esprima/issues/1071
				comment = findCommentForNode(node.key);
				if(comment) {
					comment.node = node;
					return comment;
				}
			} else if(node.type === 'FunctionDeclaration') { //TODO https://github.com/jquery/esprima/issues/1071
				comment = findCommentForNode(node.id);
				if(comment) {
					comment.node = node;
					return comment;
				}
			}
			//we still want to show a hover for something with no doc
			comment = Object.create(null);
			comment.node = node;
			comment.value = '';
			return comment;
		},
		
		/**
		 * @description Finds the parent function for the given node if one exists
		 * @function
		 * @param {Object} node The AST node
		 * @returns {Object} The function node that directly encloses the given node or ```null```
		 * @since 9.0
		 */
		findParentFunction: function findParentFunction(node) {
			if(node) {
				if(node.parents) {
					//the node has been computed with the parents array from Finder#findNode
					var parents = node.parents;
					var parent = parents.pop();
					while(parent) {
						if(parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression') {
							return parent;
						}
						parent = parents.pop();
					}
				} else if(node.parent) {
					//eslint has tagged the AST with herarchy infos
					parent = node.parent;
					while(parent) {
						if(parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression') {
							return parent;
						}
						parent = parent.parent;
					}
				}
			}
			return null;
		},
		
		/**
		 * @description Returns if the given node is within an async function declaration or expression
		 * @param {?} node The AST node
		 * @since 16.0
		 * @returns {boolean} Returns true if the node or one of its direct parents is an async function. False otherwise
		 */
		inAsync: function inAsync(node) {
			if(node) {
				if(node.async) {
					return true;
				}
				if(Array.isArray(node.parents)) {
					for(var i = 0, len = node.parents.length; i < len; i++) {
						if(node.parents[i].async) {
							return true;
						}					
					}
				}
			}
			return false;
		},
		
		/**
		 * @description Computes the kind of context to complete in
		 * @param {Object} ast The backing AST to visit
		 * @param {Number} offset The offset into the source
		 * @return {Object} Returns the deferred node and the completion kind
		 * @since 12.0
		 */
		findCompletionKind: function findCompletionKind(ast, offset) {
	    	var node = this.findNode(offset, ast, {parents:true});
	    	if(node) {
	    		var isasync = this.inAsync(node);
	    		var k = {kind: 'top', isasync: isasync};
	    		if(node.type === 'Literal') {
	    			switch(typeof node.value) {
	    				case 'boolean':
	    				case 'number': {
	    					if(offset > node.range[0] && offset <= node.range[1]) {
		    					k.kind = 'unknown';
	    					}
	    					break;
	    				}
	    				case 'string': {
	    					if(offset > node.range[0] && offset < node.range[1]) {
	    						k.kind = 'string';
	    					}
	    					break;
	    				}
	    				case 'object': {
	    					if(node.regex && offset > node.range[0] && offset <= node.range[1]) {
	    						k.kind = 'regex';
							}
							break;
	    				}
	    			}
	    		}
	    		if(node.parents && node.parents.length > 0) {
		    		var prent = node.parents.pop();
		    		switch(prent.type) {
							case 'MemberExpression':
								k.kind = 'member';
								break;
							case 'Program':
							case 'BlockStatement':
								break;
							case 'VariableDeclarator':
								if(!prent.init || prent.init.name === '✖' || offset < prent.init.range[0]) {
									k.kind = 'assign';
								}
								break;
							case 'FunctionDeclaration':
							case 'FunctionExpression':
								if(offset < prent.body.range[0]) {
									k.kind = 'unknown';
								}
								break;
							case 'Property':
								k.kind = 'unknown';
								if(offset-1 >= prent.value.range[0] && offset-1 <= prent.value.range[1]) {
									k.kind = 'prop';
								}
								break;
							case 'SwitchStatement':
								k.kind = 'swtch';
						}
				}
	    	}
	    	node = Finder.findComment(offset, ast);
	    	if(node) {
	    		k.kind = 'doc';
	    		k.node = node;
	    	}
			return k;
		},
		/**
		 * @description Returns the templates that apply to the given completion kind
		 * @public
		 * @param {Array.<Object>} templates The array of template objects to search
		 * @param {String} kind The kind of the completion
		 * @returns {Array} The array of templates that apply to the given completion kind
		 * @since 12.0
		 */
		findTemplatesForKind: function findTemplatesForKind(templates, kind, ecma) {
			var tmplates = [];
			for(var i = 0, len = templates.length; i < len; i++) {
				var template = templates[i];
				if(template.nodes && template.nodes[kind] && (template.ecma <= ecma || template.ecma === undefined)) {
					tmplates.push(template);
				}
			}
			return tmplates;
		}
	};

	return Finder;
});
