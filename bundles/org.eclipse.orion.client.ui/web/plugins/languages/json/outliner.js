/*******************************************************************************
 * @license
 * Copyright (c) 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
define([
"plugins/languages/json/visitor"
], function(Visitor) {
	
	var astManager,
		outline = [],
		scope = [];
		
	/**
	 * @name JSONOutliner
	 * @description Creates a new outliner instance
	 * @constructor
	 * @param {JSONAstManager} jsonAstManager
	 * @returns A new outliner
	 */
	function JSONOutliner(jsonAstManager) {
		astManager = jsonAstManager;	
	}
	
	/**
	 * @callback
	 */
	JSONOutliner.prototype.computeOutline = function(editorContext, options) {
		return astManager.getAST(editorContext).then(function(ast) {
			outline = [];
			scope = [];
			Visitor.visit(ast, {
				visitNode: function visitNode(node) {
					switch(node.type) {
						case 'object': 
						case 'property': 
						case 'array': {
							var obj = newEntry(node);
							scope.push(obj);
							break;
						}
						case 'string': 
						case 'number': 
						case 'boolean': {
							newEntry(node);
							break;
						}
					}
				},
				endVisitNode: function endVisitNode(node) {
					if(node.type === 'object' || node.type === 'property' || node.type === 'array') {
						scope.pop();
					}
				}
			});
			return outline;
		});
	};
	
	/**
	 * @description Adds a new entry to the outline
	 * @param {?} node The AST node
	 * @returns {?} The new node added
	 */
	function newEntry(node) {
		var sig = computeNodeMeta(node);
		var item = {
			label: sig.label,
			labelPost: sig.labelPost,
			start: node.offset,
			end: node.offset+node.length
		};
		if(scope.length < 1) {
			outline.push(item);
		}
		else {
			var parent = scope[scope.length-1];
			if(!parent.children) {
				parent.children = [];
			}
			parent.children.push(item);
		}
		return item;
	}
	
	/**
	 * @description Computes the node metadata to display
	 * @param {?} node The AST node
	 * @returns {?} The metadata object
	 */
	function computeNodeMeta(node) {
		var sig = {
			label: "Object",
			labelPost: "",
		};
		switch(node.type) {
			case "property": {
				sig.label = "Property";
				sig.labelPost = " - ("+node.children[0].value+")";
				break;
			}
			case "array": {
				sig.label = "Array";
				sig.labelPost = " - []";
				break;
			}
			case "string": 
			case "number": 
			case "boolean": {
				sig.label = String(node.value);
				sig.labelPost = " - ("+node.type+")";
				break;
			}
		}
		return sig;
	}
	
	return JSONOutliner;
});
