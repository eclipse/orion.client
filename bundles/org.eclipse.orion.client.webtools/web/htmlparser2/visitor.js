/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2017 IBM Corporation and others.
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
         * @param {Object} dom	The AST to visit
         * @param {Function} callback The visitor callback 
         */
        visit: function visit(dom, callback) {
            if(Array.isArray(dom) && callback && typeof callback.visitNode === 'function') {
                for(var i = 0; i < dom.length; i++) {
                    var ret = visitNode(callback, dom[i], null);
                    endVisitNode(callback, dom[i]);
                    if(ret === this.BREAK) {
                        return;
                    }
                }    
            }
        }
    };

	/**
	 * Visits a given node with a given callback function. if the function does not implement #visitNode this function does nothing
	 * @param {Function} callback The visitor callback. Can optionally implement #visitNode
	 * @param {Object} node The current node being visited
	 * @param {Object} last the last node that was visited
	 * @returns {Number} Returns #Break or #SKIP or nothing   
	 */
    function visitNode(callback, node, last) {
    	if(typeof callback.visitNode === 'function') {
	        node.parent = last;
	        var ret = callback.visitNode(node);
	        if(ret === Visitor.BREAK || ret === Visitor.SKIP) {
	            return ret;
	        } 
	        if(Array.isArray(node.attributes)) {
	            var attr;
	            for(var i = 0, len = node.attributes.length; i < len; i++) {
	                attr = node.attributes[i];
	                attr.parent = node;
	                ret = callback.visitNode(attr);
	                if(typeof callback.endVisitNode === 'function') {
			    		callback.endVisitNode(attr);
			    	}
	                if(ret === Visitor.SKIP) {
	                    break;
	                } else if(ret === Visitor.BREAK) {
	                    return ret;
	                }
	            }
	        }
	        var kids = node.children;
	        if(kids) {
	            for(i = 0; i < kids.length; i++) {
	                ret = visitNode(callback, kids[i], node);
	                if(typeof callback.endVisitNode === 'function') {
			    		callback.endVisitNode(kids[i]);
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
     * @param {Function} callback The visitor callback. Can optionally implement #endVisitNode
     * @param {Object} node The node we are ending the visit for
     * @since 10.0
     */
    function endVisitNode(callback, node) {
    	if(typeof callback.endVisitNode === 'function') {
    		callback.endVisitNode(node);
    	}
    }

    return Visitor;    
});
