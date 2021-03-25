/*******************************************************************************
/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2015 IBM Corporation and others.
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
'webtools/cssVisitor',
'htmlparser2/visitor'
], function(CssVisitor, Visitor) {

	var Util = {
		
		punc: '\n\t\r (){}[]:;,.+=-*^&@!%~`\'\"\/\\',  //$NON-NLS-0$
		
		/**
		 * Returns the ast node at the given offset or the parent node enclosing it
		 * @param {Object} ast The AST to inspect
		 * @param {Number} offset The offset into the source 
		 * @returns {Object} The AST node at the given offset or null 
		 * @since 10.0
		 */
		findNodeAtOffset: function(ast, offset) {
			var found = null;
			var dom = ast;
			var missingTagClose = false;
			if (!Array.isArray(ast) && ast.children){
				dom = ast.children;
			}
			 Visitor.visit(dom, {
	            visitNode: function(node) {
					if(node.range[0] <= offset) {
						found = node;
					} else {
					    return Visitor.BREAK;
					}      
	            },
	            endVisitNode: function(node) {
	            	if(found && !missingTagClose && offset >= found.range[1] && offset > node.range[0]) {
	            		found = node;
	            		// If at the boundary of a tag range and there is a missing end tag, return the innermost tag  <a><b></a>
	            		if (offset === found.range[1] && found.endrange && found.openrange && found.endrange[1] === found.openrange[1]){
	            			missingTagClose = true;
	            		}
	            	}
	            }
	        });
	        return found;
		},
		
		/**
		 * Returns the ast node at the given offset or the parent node enclosing it for a CSS ast
		 * @param {Object} ast The AST to inspect
		 * @param {Number} offset The offset into the source 
		 * @returns {Object} The AST node at the given offset or null 
		 * @since 10.0
		 */
		findCssNodeAtOffset: function(ast, offset) {
			var found = null;
			 CssVisitor.visit(ast, {
	            visitNode: function(node) {
					if(node.range[0] <= offset) {
						if (node.range[1] === -1 || node.range[1] >= offset) {
							found = node;
						} else {
							return Visitor.SKIP;
						}
					} else {
					    return Visitor.BREAK;
					}      
	            },
	            endVisitNode: function(node) {
	            }
	        });
	        return found;
		},
		
		/**
		 * @description Finds the word from the start position
		 * @function
		 * @public
		 * @memberof webtools.Util
		 * @param {String} text The text of the source to find the word in
		 * @param {Number} start The current start position of the carat
		 * @returns {String} Returns the computed word from the given string and offset or <code>null</code>
		 */
		findWord: function(text, start) {
			if(text && start) {
				var ispunc = this.punc.indexOf(text.charAt(start)) > -1;
				var pos = ispunc ? start-1 : start;
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
				} else if(s === start) {
					return text.substring(s, pos);
				}
				return text.substring(s+1, pos);
			}
			return null;
		},
		
		/**
		 * @description Finds the token in the given token stream for the given start offset
		 * @function
		 * @public
		 * @memberof webtools.Util
		 * @param {Number} offset The offset intot the source
		 * @param {Array|Object} tokens The array of tokens to search
		 * @returns {Object} The token that starts at the given start offset
		 */
		findToken: function(offset, tokens) {
			if(offset !== null && offset > -1 && tokens && tokens.length > 0) {
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
		 * @description Finds the style blocks from an HTML file and returns the code and offset for found blocks
		 * @function
		 * @public
		 * @param {String} buffer The file contents
		 * @param {Number} offset The offset into the buffer to find the enclosing block for
		 * @returns {Object} An object of script block items {text, offset}
		 * @since 8.0
		 */
		findStyleBlocks: function(buffer, offset) {
			var blocks = [];
			var val = null, regex = /<\s*style(?:type\s*=\s*"([^"]*)"|[^>]|\n)*>((?:.|\r?\n)*?)<\s*\/style(?:[^>]|\n)*>/ig;
			var comments = this.findHtmlCommentBlocks(buffer, offset);
			loop: while((val = regex.exec(buffer)) !== null) {
				var text = val[2];
				if(text.length < 1) {
					continue;
				}
				var index = val.index+val[0].indexOf('>')+1;  //$NON-NLS-0$
				if(typeof offset !== 'number' || (index <= offset && index+text.length >= offset)) {
					for(var i = 0; i < comments.length; i++) {
						if(comments[i].start <= index && comments[i].end >= index) {
							continue loop;
						}
					}
					blocks.push({
						text: text,
						offset: index
					});
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
		 * @since 8.0
		 */
		findHtmlCommentBlocks: function(buffer, offset) {
			var blocks = [];
			var val = null, regex = /<!--((?:.|\r?\n)*?)-->/ig;
			while((val = regex.exec(buffer)) !== null) {
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
		}
	};

	return Util;
});
