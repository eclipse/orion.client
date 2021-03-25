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
/*eslint-env amd*/
define([
	'orion/objects',
	'webtools/util'
], function(Objects, util) {
	
	/**
	 * @name webtools.HtmlOccurrences
	 * @description creates a new instance of the occurrence finder
	 * @constructor
	 * @public
	 * @param {javascript.ASTManager} astManager
	 */
	function HTMLOccurrences(astManager) {
		this.astManager = astManager;
	}
	
	Objects.mixin(HTMLOccurrences.prototype, /** @lends webtools.HtmlOccurrences.prototype*/ {
		
		/**
		 * @name computeOccurrences
		 * @description Callback from the editor to compute the occurrences
		 * @function
		 * @public 
		 * @memberof javascript.JavaScriptOccurrences.prototype
		 * @param {Object} editorContext The current editor context
		 * @param {Object} ctxt The current selection context
		 */
		computeOccurrences: function(editorContext, ctxt) {
	        return this.astManager.getAST(editorContext).then(function(ast) {
				return findOccurrences(ast, ctxt);
			});
		}
	});
	
	/**
	 * If the caret is on a tag, marks the matching end tag and vice versa
	 * @param ast
	 * @param ctxt
	 * @returns returns {[Object]} Array of occurrences to mark
	 */
	function findOccurrences(ast, ctxt) {
		if(ast && ctxt) {
			var start = ctxt.selection.start;
			var end = ctxt.selection.end;
			var source = ast.source;
			
			// If caret is beside a tag, mark it rather than the parent
			if (start === end){
				if ('<' === source[start]){
					start++;
					end++;
				} else if ('>' === source[start-1]){
					start--;
					end--;
				}
			}
			var node = util.findNodeAtOffset(ast, start);
			if(node) {
				var occurrences = [];
				if (node.type === 'attr'){
					var p = node.parent;
					if(p && Array.isArray(p.attributes)) {
						occurrences.push({start: node.range[0], end: node.range[0]+node.name.length, type: node.type});
						p.attributes.forEach(function(attr) {
							if(attr.name === node.name && node.range[0] !== attr.range[0]) {
								occurrences.push({start: attr.range[0], end: attr.range[0]+attr.name.length, type: node.type});
							}
						});
					}
					return occurrences;
				} else if(node.type === 'text') {
					node = node.parent ? node.parent : node;
				}
				if (node.type === 'tag'){
					var tagName = node.name;
					var openTagStart = node.range[0];
					openTagStart++; // after the open bracket <
					var openTagEnd = openTagStart+tagName.length;
					var closeTagEnd = node.range[1] - 1;
					var closeTagStart = closeTagEnd;
					
					// Since the parser does not handle incorrect HTML well, we do some sanity checking here
					if(tagName !== source.substring(openTagStart, openTagEnd)){
						return []; // Unexpected open tag, abort
					}
					
					var char = source[closeTagStart];
					var selfClose = false;
					if (char === '>'){
						closeTagStart--;
						// Check for inline tag format <body/>
						selfClose = '/' === source[closeTagStart];
						if (!selfClose){
							closeTagStart -= tagName.length;
							if ('/' + tagName !== source.substring(closeTagStart,closeTagEnd)){
								if (node.openrange && !node.endrange){
									// Void tag or some element with only an opening tag, only mark the open tag
									closeTagStart = closeTagEnd = -1;
								} else {
									return []; // Unexpected end tag, abort
								}
							}
						}
					} else {
						return []; // Unexpected character, abort
					}
					if (start >= node.range[0] && end <= node.range[1]){
						occurrences.push({start: openTagStart, end: openTagEnd, type: node.type});
						if (closeTagStart >= 0){
							occurrences.push({start: closeTagStart, end: closeTagEnd, closeTag: true, selfClose: selfClose, type: node.type});
						}
					}
					return occurrences;
				}
			}
		}
		return [];
	}
	return {
			HTMLOccurrences: HTMLOccurrences
		};
});
