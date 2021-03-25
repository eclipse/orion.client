/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2017 IBM Corporation and others.
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
	"tern/lib/tern", 
	"estraverse/estraverse",
	"javascript/signatures"
], function(tern, Estraverse, Signatures) {

	tern.registerPlugin("outliner", /* @callback */ function(server, options) { //$NON-NLS-1$
		return {}; //no phases
	});
	
	tern.defineQueryType("outline", { //$NON-NLS-1$
		takesFile: true,
		/**
		 * @callback
		 */
		run: function(server, query, file) {
			if(file.ast) {
				var outline = [], scope = [];
				/**
				 * @description Appends the given signature object to the running outline
				 * @function
				 * @private
				 * @param {?} sig The signature object
				 * @param {String} classPre The name of the CSS class to tag the item with
				 */
				function addElement(sig, classPre) {
					if(sig) {
						var item = {
							label: sig.sig,
							labelPost: sig.details,
							start: sig.range[0],
							end: sig.range[1]
						};
						if(classPre) {
							item.classNamePre = classPre;
						}
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
				}
				function _isOutlinedExpression(node) {
					return node.type === Estraverse.Syntax.FunctionExpression
						|| node.type === Estraverse.Syntax.ObjectExpression
						|| node.type === Estraverse.Syntax.ClassExpression
						|| node.type === Estraverse.Syntax.ArrowFunctionExpression;
				}
				Estraverse.traverse(file.ast, {
					/**
					 * @description Callback from estraverse when a node is starting to be visited
					 * @function
					 * @private
					 * @param {Object} node The AST node currently being visited
					 */
					enter: function(node) {
						var item;
						switch(node.type) {
							case Estraverse.Syntax.ClassDeclaration : {
								item = addElement(Signatures.computeSignature(node), Signatures.CLASS_IMAGE);
								if(item) {
									scope.push(item);
								}
								delete node.sig;
								break;
							}
							case Estraverse.Syntax.ClassExpression : {
								item = addElement(Signatures.computeSignature(node), Signatures.CLASS_IMAGE);
								if(item) {
									scope.push(item);
								}
								delete node.sig;
								break;
							}
							case Estraverse.Syntax.MethodDefinition: {
								item = addElement(Signatures.computeSignature(node), Signatures.FUNCTION_IMAGE);
								if(item) {
									scope.push(item);
								}
								node.value.md = true; //tag the function expression to know to skip
								delete node.sig;
								break;
							}
							case Estraverse.Syntax.FunctionDeclaration: {
								item = addElement(Signatures.computeSignature(node), Signatures.FUNCTION_IMAGE);
								if(item) {
									scope.push(item);
								}
								break;
							}
							case Estraverse.Syntax.FunctionExpression: {
								if(node.md) {
									delete node.sig;
									break;
								}
								var sig = Signatures.computeSignature(node);
								var details = Signatures.getCalleeSignature(node);
								if (details){
									sig.details = ' - ' + details;
								}
								item = addElement(sig, Signatures.FUNCTION_IMAGE);
								if(item) {
									scope.push(item);
								}
								delete node.sig;
								break;
							}
							case Estraverse.Syntax.ArrowFunctionExpression : {
								sig = Signatures.computeSignature(node);
								details = Signatures.getCalleeSignature(node);
								if (details){
									sig.details = ' - ' + details;
								}
								item = addElement(sig, Signatures.FUNCTION_IMAGE);
								if (item) {
									scope.push(item);
								}
								delete node.sig;
								break;
							}
							case Estraverse.Syntax.ObjectExpression: {
								item = addElement(Signatures.computeSignature(node), Signatures.OBJECT_IMAGE);
								if(item) {
									scope.push(item);
								}
								delete node.sig;
								if(node.properties) {
									node.properties.forEach(function(property) {
										if(property.value) {
											if(_isOutlinedExpression(property.value)) {
												property.value.sig = Signatures.computeSignature(property);
											}
											else {
												addElement(Signatures.computeSignature(property));
											}
										}
									});
								}
								break;
							}
							case Estraverse.Syntax.VariableDeclaration: {
								if(node.declarations) {
									node.declarations.forEach(function(declaration) {
										if(declaration.init) {
											if(declaration.init.type === Estraverse.Syntax.ObjectExpression) {
												declaration.init.sig = Signatures.computeSignature(declaration, node.kind);
											}
										}
									});
								}
								break;
							}
							case Estraverse.Syntax.AssignmentExpression: {
								if(node.left && node.right) {
									if(_isOutlinedExpression(node.right)) {
										node.right.sig = Signatures.computeSignature(node);
									}
								}
								break;
							}
							case Estraverse.Syntax.ReturnStatement: {
								if(node.argument) {
									if(_isOutlinedExpression(node.argument)) {
										node.argument.sig = Signatures.computeSignature(node);
									}
								}
								break;
							}
						}
					},
					
					/**
					 * @description Callback from estraverse when visitation of a node has completed
					 * @function
					 * @private
					 * @param {Object} node The AST node that ended its visitation
					 */
					leave: function(node) {
						switch(node.type) {
							case Estraverse.Syntax.ObjectExpression :
							case Estraverse.Syntax.FunctionDeclaration :
							case Estraverse.Syntax.ClassDeclaration :
							case Estraverse.Syntax.ClassExpression :
							case Estraverse.Syntax.MethodDefinition :
							case Estraverse.Syntax.ArrowFunctionExpression : {
								scope.pop();
								break;
							}
							case Estraverse.Syntax.FunctionExpression : {
								if(node.md) {
									delete node.md;
									break;
								}
								scope.pop();
								break;
							}
						}
					}
				});
			}
			return outline;
		}
	});
});
