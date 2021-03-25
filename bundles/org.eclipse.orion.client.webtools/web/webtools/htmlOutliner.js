/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global Tautologistics*/
/*eslint-env amd */
define("webtools/htmlOutliner", [
	'orion/objects',
], function(Objects) {

	/**
	 * @description Creates a new validator
	 * @constructor
	 * @public
	 * @param {?} htmlAstManager The back AST manager to provide shared HTML DOMs 
	 * @since 6.0
	 */
	function HtmlOutliner(htmlAstManager) {
	    this.htmlAstManager = htmlAstManager;
	}

	Objects.mixin(HtmlOutliner.prototype, /** @lends webtools.HtmlOutliner.prototype*/ {
		
		/**
		 * @callback
		 */
		computeOutline: function(editorContext, options) {
		    return this.htmlAstManager.getAST(editorContext).then(function(ast){
    			var out = this.domToOutline(ast.children);
    			if(!Array.isArray(out)) {
    				return [];
    			}
    			return out;
		    }.bind(this));
		},
	
		/**
		 * Converts an HTML dom element into a label
		 * @param {Object} element The HTML element
		 * @return {String} A human readable label
		 */
	
		domToLabel: function(node) {
			var label = node.name;
			//include id if present
			var match = /id=['"]\S*["']/.exec(node.raw); //$NON-NLS-0$
			if (match) {
				label = label + " " + match[0]; //$NON-NLS-0$
			}
			//include class if present
			match = /class=['"]\S*["']/.exec(node.raw); //$NON-NLS-0$
			if (match) {
				label = label + " " + match[0]; //$NON-NLS-0$
			}
			return label;
		},
	
		/**
		 * Converts an HTML DOM node into an outline element
		 * @param {Object} An HTML DOM node as returned by the Tautologistics HTML parser
		 * @return {Object} A node in the outline tree
		 */
	
		domToOutline: function(dom) {
			//end recursion
			if (!dom) {
				return null;
			}
			var outline = [];
			for (var i = 0; i < dom.length; i++) {
				var node = dom[i];
				if(this.skip(node)) {
				    continue;
				}
				var element = {
					label: this.domToLabel(node),
					children: this.domToOutline(node.children),
					start: node.range[0],
					end: node.range[1]
				};
				outline.push(element);
			}
			if(outline.length > 0) {
				return outline;
			}
			return null;
		},
	
	   /**
		 * Returns whether this HTML node should be omitted from the outline.
		 * @function 
		 * @private 
		 * @param {Object} node The HTML element
		 * @return {Boolean} true if the element should be skipped, and false otherwise
		 */
	
		skip: function(node) {
			//skip nodes with no name
			if (!node.name) {
				return true;
			}
	
			//skip formatting elements
			if (node.name === "b" || node.name === "i" || node.name === "em") { //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$
				return true;
			}
	
			//skip paragraphs and other blocks of formatted text
			if (node.name === "tt" || node.name === "code" || node.name === "blockquote") { //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
				return true;
			}
			//include the element if we have no reason to skip it
			return false;
		},
	
		/**
		 * Returns the DOM node corresponding to the HTML body, 
		 * or null if no such node could be found.
		 */
		findBody: function(dom) {
			//recursively walk the dom looking for a body element
			for (var i = 0; i < dom.length; i++) {
				if (dom[i].name === "body") { //$NON-NLS-0$
					return dom[i].children;
				}
				if (dom[i].children) {
					var result = this.findBody(dom[i].children);
					if (result) {
						return result;
					}
				}
			}
			return null;
		}
	});
	
	return {
		HtmlOutliner : HtmlOutliner
	};
});
