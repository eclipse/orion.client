/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2017 IBM Corporation and others.
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
	"javascript/finder",
], function(Finder) {

	var Signatures = {
		/**
		 * @name FUNCTION_IMAGE
		 * @description The CSS class name for the function icon
		 * @type String
		 * @since 14.0
		 */
		FUNCTION_IMAGE: "iconFunction",
		/**
		 * @name CLASS_IMAGE
		 * @description The CSS class name for the class icon
		 * @type String
		 * @since 14.0
		 */
		CLASS_IMAGE: "iconClass",
		/**
		 * @name OBJECT_IMAGE
		 * @description The CSS class name for the object icon
		 * @type String
		 * @since 14.0
		 */
		OBJECT_IMAGE: "iconObject",
	
		/**
		 * @name computeSignature
		 * @description Computes a signature object from the given AST node. The object holds two properties:
		 * <code>sig</code> - the human readable signature and <code>range</code> 
		 * @function
		 * @public
		 * @memberof javascript.Signatures.prototype
		 * @param {Object} astnode The AST node to parse and compute the signature from
		 * @returns {Object} The computed signature object or <code>null</code> if the computation fails
		 */
		computeSignature: function(astnode, kind) {
			if(astnode) {
				if(astnode.sig) {
					return astnode.sig;
				}
				var val = this.getNameFrom(astnode, kind);
				return {
					sig: val.name,
					details: val.details,
					range: this.getSignatureSourceRangeFrom(astnode)
				};
			}
			return null;
		},
		
		/**
		 * @name getCalleeSignature
		 * @description Returns a signature string describing the parent call expression of the given node. astnode must be
		 * a function expression or arrow expression.  astnode.parent must be available. Will return <code>null</code> otherwise.
		 * If call expression's first argument is a string under 30 chars, it will be included in the signature.
		 * @function
		 * @public
		 * @param {Object} astnode The AST node to parse and compute the signature from
		 * @returns {String} returns a signature string or <code>null</code>
		 */
		getCalleeSignature: function getCalleeSignature(astnode){
			if (astnode && astnode.type === 'FunctionExpression' || astnode.type === 'ArrowFunctionExpression'){
				var callExpr = astnode.parent;
				if (!callExpr){
					var foundNode = Finder.findNode(astnode.start, astnode.sourceFile.ast, {parents: true});
					if (foundNode){
						callExpr = foundNode.parents[foundNode.parents.length-1];
					}
				}
				if (callExpr && callExpr.type === 'CallExpression'){
					if (callExpr.callee && callExpr.callee.name){
						var sig = callExpr.callee.name;
						sig += this.getArgumentsFrom(callExpr);
						return sig;
					}
				}
			}
			return null;
		},
		
		/**
		 * @name getParamsFrom
		 * @description Retrieves the parameters from the given AST node iff it a function declaration. If there is an attached doc node
		 * it will be consulted to help compute the types of the parameters
		 * @function
		 * @public
		 * @memberof javascript.Signatures.prototype
		 * @param {Object} astnode The AST node to compute the parameters from
		 * @returns {Array} An array of parameter names suitable for display, in the order they are defined in source. If no parameters
		 * can be computed an empty array is returned, never <code>null</code>
		 */
		getParamsFrom: function(astnode) {
			if(astnode) {
				var params = astnode.params;
				//TODO with the attached doc node we can augment this infos
				if(params && params.length > 0) {
					var length = params.length;
					var value = '';
					for(var i = 0; i < length; i++) {
						if(params[i].name) {
							value += params[i].name;
						}
						else {
							value += 'Object';  //$NON-NLS-0$
						}
						if(i < length -1) {
							value += ', ';  //$NON-NLS-0$
						}
					}
					return value;
				} 
			}
		},
		
		/**
		 * @name getPropertyListFrom
		 * @description Retrieves the properties from the given AST node iff it is a object declaration.
		 * @function
		 * @public
		 * @memberof javascript.Signatures.prototype
		 * @param {Object} astnode The AST node to compute the parameters from
		 * @param {Integer} maxLength maximum length of string to return,  defaults to 50
		 * @returns {String} A list of named properties, comma separated in source defined order, surrounded by {}. 
		 * 			Ellipsis will be added if no properties are available or max length reached.
		 */
		getPropertyListFrom: function(astnode, maxLength) {
			if (!maxLength){
				maxLength = 50;
			}
			if (maxLength < 0){
				maxLength = 0;
			}
			if(astnode) {
				var props = astnode.properties;
				if(props && props.length > 0) {
					var length = props.length;
					var name;
					var value = '{';
					for(var i = 0; i < length; i++) {
						if(props[i].key && props[i].key.name) {
							name = props[i].key.name;
						} else {
							name = 'Object';  //$NON-NLS-0$
						}
						
						if ((value.length + name.length) > (maxLength+1)){
							value += '...';   //$NON-NLS-0$
							break;
						} else {
							value += name;
							if(i < length -1) {
								value += ', ';  //$NON-NLS-0$
							}
						}
					}
					value += '}';
					return value;
				}
			}
			return '{...}';  //$NON-NLS-0$
		},
		
		/**
		 * @name getPropertyListFrom
		 * @description Retrieves the arguments from the given astnode if it is a CallExpression.
		 * @function
		 * @public
		 * @memberof javascript.Signatures.prototype
		 * @param {Object} astnode The AST node to compute the arguments from
		 * @returns {String} A list of arguments, comma separated in source defined order, surrounded by () 
		 * 			Ellipsis will be added if no properties are available or max length reached.
		 */
		getArgumentsFrom: function(astnode) {
			var maxLength = 50;
			if(astnode) {
				var callArgs = astnode.arguments;
				if(callArgs && callArgs.length > 0) {
					var len = callArgs.length;
					var argName;
					var value = '(';
					for(var i = 0; i < len; i++) {
						var callArg = callArgs[i];
						if (callArg.type === 'ArrayExpression'){
							argName = '[]'; //$NON-NLS-1$
						} else if (callArg.type === 'ObjectExpression'){
							argName = '{}'; //$NON-NLS-1$
						} else if (callArg.type === 'Literal' && typeof callArg.raw === 'string'){
							argName = callArg.raw;
						} else if (callArg.type === 'FunctionExpression'){
							argName = 'function(){...}'; //$NON-NLS-1$
						} else if (callArg.type === 'ArrowFunctionExpression'){
							argName = '() => {...}'; //$NON-NLS-1$
						}
						if ((value.length + argName.length) > (maxLength+1)){
							value += '...';   //$NON-NLS-0$
							break;
						} else {
							value += argName;
							if(i < len -1) {
								value += ', ';  //$NON-NLS-0$
							}
						}
					}
					value += ')';
					return value;
				}
			}
			return '()';  //$NON-NLS-0$
		},
		
		/**
		 * @name getNameFrom
		 * @description Returns an object describing what to display for the given AST node. If there is an attached doc node it
		 * will be consulted to help compute the name to display
		 * @function
		 * @public
		 * @memberof javascript.Signatures.prototype
		 * @param {Object} astnode The AST node to compute the name from
		 * @returns {String} An object containing 'name', the computed name to display for the node or <code>null</code> if one could not be 
		 * 					computed and possibly 'details' if optional display information is computed
		 */
		getNameFrom: function(astnode, kind) {
			var name = "Anonymous " + astnode.type;  //$NON-NLS-0$
			var details;
			if(astnode) {
				switch(astnode.type) {
					case 'ClassDeclaration' :
						name = 'class ';
						if (astnode.id && astnode.id.start !== astnode.id.end) {
							name += astnode.id.name;
						} else {
							name += '<anonymous>';
						}
						break;
					case 'ClassExpression' :
						name = 'class ';
						if (astnode.id && astnode.id.start !== astnode.id.end) {
							name += astnode.id.name;
						} else {
							name += '<anonymous>';
						}
						break;
					case 'FunctionDeclaration' :
						//TODO with the attached doc node we can augment this infos
						if(astnode.id && astnode.id.name) {
							name = astnode.id.name+'(';
							var fdparams = this.getParamsFrom(astnode);
							if(fdparams) {
								name += fdparams;
							}
							name += ')';
						}
						break;
					case 'MethodDefinition' :
						if(astnode.key && astnode.key.name) {
							name = astnode.key.name+'(';
							var mdParams = this.getParamsFrom(astnode.value);
							if(mdParams) {
								name += mdParams;
							}
							name += ')';
						}
						break;
					case 'ArrowFunctionExpression' :
						name = 'arrow function(';  //$NON-NLS-0$
						var afeparams = this.getParamsFrom(astnode);
						if(afeparams) {
							name += afeparams;
						}
						name += ')';
						break;
					case 'FunctionExpression' :
						name = 'function(';  //$NON-NLS-0$
						// If the function has a non-empty label use that name
						if (astnode.id && astnode.id.type === 'Identifier' && astnode.id.name){
							name = astnode.id.name + '(';
						}
						var feparams = this.getParamsFrom(astnode);
						if(feparams) {
							name += feparams;
						}
						name += ')';
						break;
					case 'ObjectExpression' :
						name = 'closure ';  //$NON-NLS-0$
						details = this.getPropertyListFrom(astnode);
						break;
					case 'Property' :
						if(astnode.value) {
							if(astnode.value.type === 'FunctionExpression') {
								if(astnode.key) {
									if(astnode.key.name) {
										name = astnode.key.name + '(';
									}
									else if(astnode.key.value) {
										name = astnode.key.value + '(';
									}
								}
								else {
									name = 'function(';  //$NON-NLS-0$
								}
								var pparams = this.getParamsFrom(astnode.value);
								if(pparams) {
									name += pparams;
								}
								name += ')';
							}
							else if(astnode.value.type === 'ObjectExpression') {
								if(astnode.key) {
									if(astnode.key.name) {
										name = astnode.key.name + ' ';  //$NON-NLS-0$
									}
									else if(astnode.key.value) {
										name = astnode.key.value + ' ';  //$NON-NLS-0$
									}
									details = this.getPropertyListFrom(astnode.value);
								}
							}
							else if(astnode.key) {
								if(astnode.key.name) {
									name = astnode.key.name;
								}
								else if(astnode.key.value) {
									name = astnode.key.value;
								}
							}
						}
						break;
					case 'VariableDeclarator' :
						if(astnode.init) {
							if(astnode.init.type === 'ObjectExpression') {
								switch(kind) {
									case 'let' :
										name = 'let ';
										break;
									case 'const' :
										name = 'const ';
										break;
									default:
										name = 'var ';
								}
								if(astnode.id && astnode.id.name) {
									name += astnode.id.name+ ' = ';  //$NON-NLS-1$ //$NON-NLS-2$
									details = this.getPropertyListFrom(astnode.init);
								}
							}
							else if(astnode.init.type === 'FunctionExpression') {
								if(astnode.id && astnode.id.name) {
									name = astnode.id.name + '(';
									var vparams = this.getParamsFrom(astnode.init);
									if(vparams) {
										name += vparams;
									}
									name += ')';
								}
								else {
									name = this.getNameFrom(astnode.init);
								}
							}
						}
						break;
					case 'AssignmentExpression' :
						if(astnode.left && astnode.right) {
							var isobject = astnode.right.type === 'ObjectExpression';
							if(isobject || astnode.right.type === 'FunctionExpression') {
								if(astnode.left.name) {
									name = astnode.left.name;
								}
								else if(astnode.left.type === 'MemberExpression') {
									name = this.expandMemberExpression(astnode.left, '');
								}
								if(name) {
									//append the right stuff
									if(isobject) {
										name += ' ';  //$NON-NLS-0$
										details = this.getPropertyListFrom(astnode.right); 
									}
									else {
										name += '(';
										var aparams = this.getParamsFrom(astnode.right);
										if(aparams) {
											name += aparams;
										}
										name += ')';
									}
								}
								else {
									name = this.getNameFrom(astnode.right);
								}
							}
						}
						break;
					case 'ReturnStatement' :
						if(astnode.argument) {
							if(astnode.argument.type === 'ObjectExpression'
								|| astnode.argument.type === 'FunctionExpression'
								|| astnode.argument.type === 'ArrowFunctionExpression') {
									name = 'return ';  //$NON-NLS-0$
									details = this.getPropertyListFrom(astnode.argument);
							}
						}
						break;
				}
			}
			return {name: name, details: details};
		},
		
		/**
		 * @name expandMemberExpression
		 * @description Given a MemberExpression node this function will recursively compute the complete name from the node
		 * by visiting all of the child MemberExpressions, if any
		 * @function
		 * @private
		 * @memberof javascript.Signatures.prototype
		 * @param {Object} astnode The MemberExpression AST node
		 * @returns {String} The name to use for the node
		 */
		expandMemberExpression: function(astnode, name) {
			if(astnode.type === 'MemberExpression') {
				if(astnode.property) {
				    var propname = astnode.property.name;
				    if(astnode.property.type === 'Literal') {
				        propname = astnode.property.value;
				    }
				    if(propname) {
    					if(name && name.length > 0) {
    						name = propname+'.' + name;
    					}
    					else {
    						name = propname;
    					}
					}
				}
				if(astnode.object && astnode.object.name) {
					name = astnode.object.name +'.'+ name;
				}
				//TODO recursion
				return this.expandMemberExpression(astnode.object, name);
			}
			return name;
		},
		
		/**
		 * @name getSignatureSourceRangeFrom
		 * @description Computes the signature source range (start, end) for the given node 
		 * @function
		 * @ppublic
		 * @memberof javascript.Signatures.prototype
		 * @param {Object} astnode The AST node to compute the range from
		 * @returns {Array} The computed signature source range as an array [start, end] or <code>[-1, -1]</code> if it could not
		 * be computed
		 */
		getSignatureSourceRangeFrom: function(astnode) {
			var range = [0, 0];
			if(astnode) {
				if(astnode.type === 'AssignmentExpression') {
					if(astnode.left && astnode.left.range) {
						range = astnode.left.range;
					}
				}
				else if(astnode.type === 'Property') {
					if(astnode.key && astnode.key.range) {
						range = astnode.key.range;
					}
				}
				else if(astnode.type === 'ReturnStatement') {
					range[0] = astnode.range[0];
					range[1] = range[0] + 6;
				}
				else if(astnode.type === 'ArrowFunctionExpression') {
					range = astnode.range;
				}
				else if(astnode.type === 'ClassExpression'
							|| astnode.type === 'ClassDeclaration') {
					if(astnode.id && astnode.id.range) {
						range = astnode.id.range;
					} else {
						// just highlight 'class' for anynomous class
						range = astnode.range;
						range[1] = range[0] + 5;
					}
				}
				else if(astnode.id && astnode.id.range) {
					range = astnode.id.range;
				}
				else if(astnode.range) {
					range = astnode.range;
					if(astnode.type === 'FunctionExpression') {
						range[1] = range[0]+8;
					}
				}
			}
			return range;
		}
		
	};
	
	return Signatures;
});
