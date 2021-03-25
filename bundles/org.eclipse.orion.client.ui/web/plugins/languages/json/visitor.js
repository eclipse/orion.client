/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
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
], function() {

	var Visitor = {
        
        BREAK: 1,
        SKIP: 2,
        
        /**
         * Visit the given AST top-down node -> attributes -> value -> end visit
         * @param {?} ast	The AST to visit
         * @param {?} callback The visitor callback 
         */
        visit: function visit(ast, callback) {
            if(ast && callback && typeof callback.visitNode === 'function') {
                var ret = visitNode(callback, ast, null);
                endVisitNode(callback, ast);
                if(ret === this.BREAK) {
                    return;
                }
            }
        },
        
        /**
         * @name findNodeAtOffset
         * @description Finds a node at a given offset
         * @function
         * @param {?} ast The AST to search
         * @param {number} offset The offset of the node location to find
         * @returns {?|null} Returns the node at the given location or null if there is no node at the given offset
         */
        findNodeAtOffset: function findNodeAtOffset(ast, offset) {
        	if(!ast) {
        		return null;
        	}
			var _n;
			this.visit(ast, {
				visitNode: function(node) {
					if(offset > node.offset && offset <= node.offset+node.length) {
						_n = node;
					} 
					if(offset < node.offset) {
						return Visitor.BREAK;
					}
				}
			});
			return _n;
		}
    };

	/**
	 * Visits a given node with a given callback function. if the function does not implement #visitNode this function does nothing
	 * @param {?} callback The visitor callback. Can optionally implement #visitNode
	 * @param {?} node The current node being visited
	 * @param {?} last the last node that was visited
	 * @returns {Number} Returns #Break or #SKIP or nothing   
	 */
    function visitNode(callback, node, last) {
    	if(typeof callback.visitNode === 'function') {
	        node.parent = last;
	        var ret = callback.visitNode(node);
	        if(ret === Visitor.BREAK || ret === Visitor.SKIP) {
	            return ret;
	        } 
	        if(node.children) {
	            for(var i = 0; i < node.children.length; i++) {
	                ret = visitNode(callback, node.children[i], node);
	                if(typeof callback.endVisitNode === 'function') {
			    		callback.endVisitNode(node.children[i]);
			    	}
	                if(ret === Visitor.BREAK) {
	                    return ret;
	                } else if(ret === Visitor.SKIP) {
	                    continue;
	                }
	            }
	        }
        }
    }
    
    /**
     * Ends the visit on the given node with the given callback. Allows for post-processing when we are going to leave a node. If the callback does not implement
     * #endVisitNode this function does nothing
     * @param {?} callback The visitor callback. Can optionally implement #endVisitNode
     * @param {?} node The node we are ending the visit for
     */
    function endVisitNode(callback, node) {
    	if(typeof callback.endVisitNode === 'function') {
    		callback.endVisitNode(node);
    	}
    }

    return Visitor;    
});
