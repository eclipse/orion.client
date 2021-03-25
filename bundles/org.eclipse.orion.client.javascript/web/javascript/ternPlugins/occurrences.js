/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2018 IBM Corporation and others.
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
	"javascript/finder"
], function(tern, Estraverse, Finder) {

	tern.registerPlugin("occurrences", /* @callback */ function(server, options) { //$NON-NLS-1$
		return {}; //no phases
	});
	
	tern.defineQueryType("occurrences", { //$NON-NLS-1$
		takesFile: true,
		/**
		 * @callback
		 */
		run: function(server, query, file) {
			if(file.ast) {
				var start = typeof query.start === 'number' ? query.start : query.end;
				var end = query.end;
				var token = _getToken(start, file.ast);
				if (token) {
					var node = Finder.findNode(start, file.ast, {parents: true});
					if(!_skip(node)) {
						if (token.range[0] >= node.range[0] && token.range[1] <= node.range[1]){
							if (node.type === Estraverse.Syntax.Literal){
								var amdNode = checkNodeDefineStatement(node, file.ast);
								if (amdNode){
									node = amdNode;
									start = node.range[0];
									end = node.range[1];
								} else {
									// No other literals can have occurrences so bail
									return [];
								}
							}
							reset({
								start: start,
								end: end,
								word: _nameFromNode(node),
								token: node
							});
							Estraverse.traverse(file.ast, visitor);
							return occurrences;
						}
					}
				}
			}
			return [];
		}
	});
	
	var occurrences = [],
		scopes = [],
		context = null,
		defscope = null,
		skipScope = null,
		thisCheck = false,
		objectPropCheck = false,
		labeledStatementCheck = false;
	
	var visitor = {
		
		/**
		 * @name enter
		 * @description Callback from estraverse when a node is starting to be visited
		 * @function
		 * @private
		 * @memberof javascript.Visitor.prototype
		 * @param {Object} node The AST node currently being visited
		 * @param {Object} parent The last node we visited
		 * @returns The status if we should continue visiting
		 */
		enter: function(node, parent) {
			var len, idx;
			node.parent = parent;
			switch(node.type) {
				case Estraverse.Syntax.Program:
					scopes.push({range: node.range, occurrences: [], kind:'p'}); //$NON-NLS-1$
					break;
				case Estraverse.Syntax.BlockStatement:
					var scope = scopes[scopes.length-1];
					if (scope.isLet)
					var blocks = scopes[scopes.length-1].blocks;
					if (!blocks){
						blocks = [];
					}
					blocks.push({range: node.range, occurrences: [], kind:'b'}); //$NON-NLS-1$
					scopes[scopes.length-1].blocks = blocks;
					break;
				case Estraverse.Syntax.FunctionDeclaration:
					checkId(node.id, node, true);
					_enterScope(node);
					if (skipScope){
						// If the function decl was a redefine, checkId may set skipScope and we can skip processing the contents
						return Estraverse.VisitorOption.Skip;
					}
					if (node.params) {
						len = node.params.length;
						for (idx = 0; idx < len; idx++) {
							var identifier = node.params[idx];
							if (identifier.type === Estraverse.Syntax.AssignmentPattern && identifier.left){
								identifier = identifier.left;
							}
							if(checkId(identifier, node, true)) {
								return Estraverse.VisitorOption.Skip;
							}
						}
					}
					break;
				case Estraverse.Syntax.FunctionExpression:
				case Estraverse.Syntax.ArrowFunctionExpression:
					if(_enterScope(node)) {
						return Estraverse.VisitorOption.Skip;
					}
					checkId(node.id, node, true); // Function expressions can be named expressions
					if (node.params) {
						len = node.params.length;
						for (idx = 0; idx < len; idx++) {
							identifier = node.params[idx];
							if (identifier.type === Estraverse.Syntax.AssignmentPattern && identifier.left){
								identifier = identifier.left;
							}
							if(identifier.type === Estraverse.Syntax.ObjectPattern) {
								identifier.properties.forEach(function(prop) {
									checkId(prop.key, node, true, false);
									checkId(prop.value, node);
								});
							} else
							if(checkId(identifier, node, true)) {
								return Estraverse.VisitorOption.Skip;
							}
						}
					}
					break;
				case Estraverse.Syntax.ClassDeclaration:
					checkId(node.id, node, true);
					checkId(node.superClass, node);
					if(_enterScope(node)) {
						return Estraverse.VisitorOption.Skip;
					}
					break;
				case Estraverse.Syntax.ClassExpression:
					if(_enterScope(node)) {
						return Estraverse.VisitorOption.Skip;
					}
					checkId(node.id, node, true);
					checkId(node.superClass, node);
					break;
				case Estraverse.Syntax.AssignmentExpression:
					if(node.left.type === Estraverse.Syntax.ArrayPattern) {
						//Destructuring assignment
						node.left.elements.forEach(function(element) {
							checkId(element, node.left);
						});
					} else if(node.left.type === Estraverse.Syntax.ObjectPattern) {
						//Destructuring object assignment
						node.left.properties.forEach(function(prop) {
							checkId(prop.key, node.left);
						});
					} else {
						//Basic identifier check
						checkId(node.left, node);
					}
					checkId(node.right, node);
					break;
				case Estraverse.Syntax.ExpressionStatement:
					checkId(node.expression, node);
					break;
				case Estraverse.Syntax.ArrayExpression: 
					if (node.elements) {
						len = node.elements.length;
						for (idx = 0; idx < len; idx++) {
							checkId(node.elements[idx], node);
						}
					}
					break;
				case Estraverse.Syntax.MemberExpression:
					checkId(node.object, node);
					if (node.computed) { //computed = true for [], false for . notation
						checkId(node.property, node);
					} else {
						checkId(node.property, node, false, true);
					}
					break;
				case Estraverse.Syntax.BinaryExpression:
					checkId(node.left, node);
					checkId(node.right, node);
					break;
				case Estraverse.Syntax.UnaryExpression:
					checkId(node.argument, node);
					break;
				case Estraverse.Syntax.SwitchStatement:
					checkId(node.discriminant, node);
					break;
				case Estraverse.Syntax.UpdateExpression:
					checkId(node.argument, node);
					break;
				case Estraverse.Syntax.ConditionalExpression:
					checkId(node.test, node);
					checkId(node.consequent, node);
					checkId(node.alternate, node);
					break;
				case Estraverse.Syntax.CallExpression:
					checkId(node.callee, node, false);
					if (node.arguments) {
						len = node.arguments.length;
						for (idx = 0; idx < len; idx++) {
							checkId(node.arguments[idx], node);
						}
					}
					break;
				case Estraverse.Syntax.ReturnStatement:
					checkId(node.argument, node);
					break;
				case Estraverse.Syntax.ObjectExpression:
					if(_enterScope(node)) {
						return Estraverse.VisitorOption.Skip;
					}
					if(node.properties) {
						len = node.properties.length;
						for (idx = 0; idx < len; idx++) {
							var prop = node.properties[idx];
							if (prop.value && prop.value.type === Estraverse.Syntax.FunctionExpression){
								if(thisCheck) {
									//tag it 
									prop.value.isprop = true;
								} else {
									checkId(prop.value.id, node, false, true);
								}
							}
							checkId(prop.key, node, true, true);
							checkId(prop.value, node);
						}
					}
					break;
				case Estraverse.Syntax.VariableDeclarator:
					if(node.id.type === Estraverse.Syntax.ArrayPattern) {
						//Destructuring array assignment
						node.id.elements.forEach(function(element) {
							if(element.type === Estraverse.Syntax.AssignmentPattern) {
								//Destructured default values
								checkId(element.left, element, true);
								checkId(element.right, element);
							} else {
								checkId(element, node.id, true);
							}
						});
					} else if(node.id.type === Estraverse.Syntax.ObjectPattern) {
						//Destructuring object assignment
						node.id.properties.forEach(function(prop) {
							checkId(prop.key, node.id, true, false);
							if(prop.key !== prop.value) {
								checkId(prop.value, node.id);
							}
						});
					} else {
						checkId(node.id, node, true);
					}
					checkId(node.init, node);
					break;
				case Estraverse.Syntax.NewExpression:
					checkId(node.callee, node, false);
					if(node.arguments) {
						len = node.arguments.length;
						for(idx = 0; idx < len; idx++) {
							checkId(node.arguments[idx], node);
						}
					}
					break;
				case Estraverse.Syntax.LogicalExpression:
					checkId(node.left, node);
					checkId(node.right, node);
					break;
				case Estraverse.Syntax.ThisExpression:
					if(thisCheck) {
						var scope = scopes[scopes.length-1];
						scope.occurrences.push({
							start: node.range[0],
							end: node.range[1]
						});
						// if this node is the selected this we are in the right scope
						if (node.range[0] === context.token.range[0]){
							defscope = scope;
						}
					}
					break;
				case Estraverse.Syntax.IfStatement:
				case Estraverse.Syntax.DoWhileStatement:
				case Estraverse.Syntax.WhileStatement:
					checkId(node.test, node);
					break;
				case Estraverse.Syntax.ForStatement:
					checkId(node.init, node);
					break;
				case Estraverse.Syntax.ForInStatement:
                    checkId(node.left, node);
                    checkId(node.right, node);
                    break;
                case Estraverse.Syntax.ForOfStatement: {
                	checkId(node.left, node);
                	checkId(node.right, node);
                	break;
                }
				case Estraverse.Syntax.WithStatement:
                    checkId(node.object, node);
                    break;
                case Estraverse.Syntax.ThrowStatement:
                    checkId(node.argument, node);
                    break;
                case Estraverse.Syntax.LabeledStatement:
               		_enterScope(node);
                    checkId(node.label, node, true, false, true);
                    break;
                case Estraverse.Syntax.ContinueStatement :
                    checkId(node.label, node, false, false, true);
                    break;
                case Estraverse.Syntax.BreakStatement:
                    checkId(node.label, node, false, false, true);
                    break;
                // ES6 constructs (Class expressions and declarations are done above)
                case Estraverse.Syntax.AssignmentPattern:
                	checkId(node.right, node);
                	break;   
                case Estraverse.Syntax.ExportDefaultDeclaration:
                	checkId(node.declaration, node);
                	break;   
                case Estraverse.Syntax.ExportSpecifier:
                	checkId(node.local, node);
                	break;
                case Estraverse.Syntax.ImportDefaultSpecifier:
                	checkId(node.local, node, true);
                	break;
                case Estraverse.Syntax.ImportNamespaceSpecifier:
                	checkId(node.local, node, true);
                	break;
                case Estraverse.Syntax.ImportSpecifier:
                	checkId(node.local, node, true);
                	break;
               	case Estraverse.Syntax.MethodDefinition:
               		checkId(node.key, node, true);
               		break;
               	case Estraverse.Syntax.YieldExpression:
               		checkId(node.argument, node);
               		break;
			}
		},
		
		/**
		 * @name leave
		 * @description Callback from estraverse when visitation of a node has completed
		 * @function
		 * @private
		 * @memberof javascript.Visitor.prototype
		 * @param {Object} node The AST node that ended its visitation
		 * @return The status if we should continue visiting
		 */
		leave: function(node) {
			if(thisCheck) {
				switch(node.type) {
					case Estraverse.Syntax.FunctionExpression:
						if(node.isprop) {
							delete node.isprop; //remove the tag
							break;
						}
					//$FALLTHROUGH$
					case Estraverse.Syntax.ObjectExpression:
					case Estraverse.Syntax.Program:
					case Estraverse.Syntax.ClassDeclaration:
					case Estraverse.Syntax.ClassExpression:
						if (!defscope){
							skipScope = scopes[scopes.length-1];
						}
						if(_popScope()) {
							//we left an object closure, end
							return Estraverse.VisitorOption.Break;
						}
						break;
				}
			} else if (objectPropCheck) {
				switch(node.type){
					case Estraverse.Syntax.ClassDeclaration:
					case Estraverse.Syntax.ClassExpression:
					case Estraverse.Syntax.ObjectExpression:
					case Estraverse.Syntax.Program:
						if(_popScope()) {
							return Estraverse.VisitorOption.Break;
						}
						break;
				}
			} else if (labeledStatementCheck) {
				switch(node.type){
					case Estraverse.Syntax.LabeledStatement:
						if(_popScope()) {
							return Estraverse.VisitorOption.Break;
						}
						break;
				}
			} else {
				switch(node.type) {
					case Estraverse.Syntax.FunctionExpression:
					case Estraverse.Syntax.FunctionDeclaration: 
					case Estraverse.Syntax.ArrowFunctionExpression:
					case Estraverse.Syntax.ClassDeclaration:
					case Estraverse.Syntax.ClassExpression:
					{
					    if(_popScope()) {
							return Estraverse.VisitorOption.Break;
						}
						break;
					}
					case Estraverse.Syntax.Program: {
					    _popScope(); // pop the last scope
						break;
					}
					case Estraverse.Syntax.BlockStatement:
						if (_popBlock()){
							return Estraverse.VisitorOption.Break;
						}
						break;
				}
			}
		}
	};

	/**
	 * @name checkId
	 * @description Checks if the given identifier matches the occurrence we are looking for
	 * @function
	 * @private
	 * @memberof javascript.JavaScriptOccurrences.prototype
	 * @param {Object} node The AST node we are inspecting
	 * @param {Object} parent The parent for the node we are currently going to visit 
	 * @param {Boolean} candefine If the given node can define the word we are looking for
	 * @param {Boolean} isObjectProp Whether the given node is only an occurrence if we are searching for object property occurrences
	 * @param {Boolean} isLabeledStatement Whether the given node is only an occurrence if we are searching for labeled statements
	 * @returns {Boolean} <code>true</code> if we should skip the next nodes, <code>false</code> otherwise
	 */
	function checkId(node, parent, candefine, isObjectProp, isLabeledStatement) {
		if (skipScope){
			return true;
		}
		if (thisCheck){
			return false;
		}
		if ((isObjectProp && !objectPropCheck) || (!isObjectProp && objectPropCheck)){
			return false;
		}
		if ((isLabeledStatement && !labeledStatementCheck) || (!isLabeledStatement && labeledStatementCheck)){
			return false;
		}
		if(node) {
			//have to tag the node here since we don't visit these nodes via the estraverse API
			node.parent = parent;
		}
		if (node && node.type === Estraverse.Syntax.Identifier) {
			if (node.name === context.word) {
				var scope = scopes[scopes.length-1]; // Always will have at least the program scope
				if (node.parent.type === Estraverse.Syntax.VariableDeclarator && node.parent.parent && node.parent.parent.type === Estraverse.Syntax.VariableDeclaration && (node.parent.parent.kind === 'let' || node.parent.parent.kind === 'const')){
					scope.isLet = true;
				}
				if (scope.isLet && scope.blocks && scope.blocks.length > 0){
					scope = scope.blocks[scope.blocks.length-1];
				}
				if(candefine) {
					// Check if we are redefining
					if(defscope) {
						if((scope.range[0] <= context.start) && (scope.range[1] >= context.end)) {
							// Selection inside this scope, use this scope as the defining scope
							occurrences = []; // Clear any occurrences in sibling scopes
							defscope = scope;
							scope.occurrences.push({
								start: node.range[0],
								end: node.range[1]
							});
							return false;
						} 
						// Selection belongs to an outside scope so use the outside definition
						scope.occurrences = []; // Clear any occurrences we have found in this scope
						skipScope = scope;  // Skip this scope and all inner scopes
						return true;  // Where possible we short circuit checking this scope
					}
					//does the scope enclose it?
					if((scope.range[0] <= context.start) && (scope.range[1] >= context.end)) {
						defscope = scope;
						
						// If identifier is an argument of a define statement, also mark the matching dependency
						_markDefineStatementOccurrences(node, scope.occurrences);
					} else {
						// Selection belongs to an outside scope so use the outside definition (Bug 447962)
						scope.occurrences = [];
						skipScope = scope;
						return true;
					}
				}
				scope.occurrences.push({
					start: node.range[0],
					end: node.range[1]
				});
			}
		}
		return false;
	}
	
	/**
	 * @description Checks if the given node is a parameter specifying an AMD define dependency.  If so, mark the matching dependency path.
	 * @function
	 * @private
	 * @param {ASTNode} node The AST node we are inspecting
	 * @param {Array} occurrencesList The array of occurrences to add the new occurrence to
	 */
	function _markDefineStatementOccurrences(node, occurrencesList){
		var parent = node.parent;
		if (parent && parent.type === Estraverse.Syntax.FunctionExpression) {
			var parent2 = parent.parent;
			if (parent2 && parent2.type === Estraverse.Syntax.CallExpression && parent2.callee && parent2.callee.name === "define"){
				var funcExpression = parent;
				for (var i=0; i<funcExpression.params.length; i++) {
					if (funcExpression.params[i] === node){
						if (parent2.arguments.length === 2 || parent2.arguments.length === 3){
							var pathsNode = parent2.arguments[parent2.arguments.length-2];
							if (pathsNode.elements && pathsNode.elements.length > i){
								occurrencesList.push({
									start: pathsNode.elements[i].range[0],
									end: pathsNode.elements[i].range[1]
								});
							}
						}
						break;
					}
				}
			}
		}
	}
	
	function reset(cntxt) {
		occurrences = [];
		scopes = [];
		context = cntxt;
		thisCheck = false;
		defscope = null;
		skipScope = null;
		objectPropCheck = false;
		labeledStatementCheck = false;
		if (context.token){
			var parent = context.token.parent ? context.token.parent : (context.token.parents && context.token.parents.length > 0 ? context.token.parents[context.token.parents.length-1] : null);
			
			// See if a 'this' keyword was selected
			thisCheck = context.token.type === Estraverse.Syntax.ThisExpression;
			
			// See if we are doing an object property check
			objectPropCheck = false;
			if (parent && parent.type === Estraverse.Syntax.Property){
				var grandparent = parent.parent;
				if(!grandparent) {
					grandparent = cntxt.token.parents && cntxt.token.parents.length > 1 ? cntxt.token.parents[cntxt.token.parents.length-2] : null;
				}
				if(grandparent) {
					if(grandparent.type !== Estraverse.Syntax.ObjectPattern) {
						// Object property key is selected
						objectPropCheck = context.token === parent.key;
					}
				} else {
					//no grand parent context, assume an object expression
					objectPropCheck = context.token === parent.key;
				}

			} else if (parent && (parent.type === Estraverse.Syntax.MemberExpression)){
				if (parent.object && parent.object.type === Estraverse.Syntax.ThisExpression && !parent.computed){
					// Usage of this within an object
					objectPropCheck = true;
				} else if (!parent.computed && parent.property && context.start >= parent.property.range[0] && context.end <= parent.property.range[1]){
				 	// Selecting the property key of a member expression that is not computed (foo.a vs foo[a])
					objectPropCheck = true;
				}
			} else if (parent && parent.type === Estraverse.Syntax.FunctionExpression && context.token.parents && context.token.parents.length > 1 && context.token.parents[context.token.parents.length-2].type === Estraverse.Syntax.Property){
				// Both the name and the params have the same parent
				if (parent.id && parent.id.range === context.token.range){
					// Named function expresison as the child of a property
					objectPropCheck = true;
				}
			}
			// See if a labeled statement is selected
			labeledStatementCheck = parent && (parent.type === Estraverse.Syntax.LabeledStatement || parent.type === Estraverse.Syntax.ContinueStatement || parent.type === Estraverse.Syntax.BreakStatement);
		}
	}
	
	function checkNodeDefineStatement(node, ast) {
		var parent = node.parent ? node.parent : (node.parents && node.parents.length > 0 ? node.parents[node.parents.length-1] : null);
		if (parent && parent.type === Estraverse.Syntax.ArrayExpression){
			var parent2 = parent.parent ? parent.parent : (node.parents && node.parents.length > 1 ? node.parents[node.parents.length-2] : null);
			if (parent2 && parent2.type === Estraverse.Syntax.CallExpression && parent2.callee && parent2.callee.name === "define"){
				var elements = parent.elements;
				for (var i=0; i<elements.length; i++) {
					if (elements[i] === node){
						var deps = parent2;
						if (deps && deps.arguments && (deps.arguments.length === 2 || deps.arguments.length === 3)){
							deps = deps.arguments[deps.arguments.length-1];
							if (deps.params && deps.params.length > i){
								return Finder.findNode(deps.params[i].range[0], ast, {parents: true});
							}
						}
						break;
					}
				}
			}
		}
		return null;
	}
	
	/**
	 * @description Gets the token from the given offset or the proceeding token if the found token 
	 * is a punctuator
	 * @function
	 * @private
	 * @param {Number} offset The offset into the source
	 * @param {Object} ast The AST
	 * @return {Object} The token for the given offset or null
	 */
	function _getToken(offset, ast) {
		if(ast.tokens && ast.tokens.length > 0) {
			var token = Finder.findToken(offset, ast.tokens);
			if(token) {
				if(token.type === 'Punctuator') {
					var index = token.index;
					//only check back if we are at the start of the punctuator i.e. here -> {
					if(offset === token.range[0] && index !== null && index > 0) {
						var prev = ast.tokens[index-1];
						if(prev.range[1] !== token.range[0]) {
							return null;
						}
						token = prev;
					}
				}
				if(token.type === 'Identifier' || token.type === "String" || (token.type === 'Keyword' && token.value === 'this')) {
					return token;
				}
			}
		}
		return null;
	}
	
	/**
	 * @description Enters and records the current scope onthe scope stack
	 * @function
	 * @private
	 * @param {Object} node The AST node
	 * @returns {Boolean} If we should skip visiting children of the scope node
	 */
	function _enterScope(node) {
		if(thisCheck) {
			switch(node.type) {
				case Estraverse.Syntax.ObjectExpression:
					scopes.push({range: node.range, occurrences: [], kind:'o'});  //$NON-NLS-0$
					if (defscope){
						return true;
					}
					break;
				case Estraverse.Syntax.FunctionExpression:
					if (!node.isprop){
						scopes.push({range: node.body.range, occurrences: [], kind:'fe'});  //$NON-NLS-0$
						// If the outer scope has the selected 'this' we can skip the inner scope
						if (defscope){
							return true;
						}
					}
					break;
				case Estraverse.Syntax.ClassDeclaration:
				case Estraverse.Syntax.ClassExpression:
					scopes.push({range: node.body.range, occurrences: [], kind:'c'});  //$NON-NLS-0$
					if (defscope){
						return true;
					}
					break;
			}
		} else if (objectPropCheck){
			switch(node.type) {
				case Estraverse.Syntax.ClassDeclaration:
				case Estraverse.Syntax.ClassExpression:
					scopes.push({range: node.range, occurrences: [], kind:'c'});  //$NON-NLS-0$
					break;
				case Estraverse.Syntax.ObjectExpression:
					scopes.push({range: node.range, occurrences: [], kind:'o'});  //$NON-NLS-0$
					break;
			}
		} else if (labeledStatementCheck){
			switch(node.type) {
				case Estraverse.Syntax.LabeledStatement:
					scopes.push({range: node.range, occurrences: [], kind:'ls'});  //$NON-NLS-0$
					// Skip labelled loops that don't contain the selection
					if(node.range[0] > context.start || node.range[1] < context.end) {
						return true;
					}						
			}
		} else {
			var kind;
			var rangeStart = node.range[0];
			if (node.body){
				rangeStart = node.body.range[0];
			}
			switch(node.type) {
				case Estraverse.Syntax.FunctionDeclaration:
					kind = 'fd';  //$NON-NLS-0$
					// Include the params and body in the scope, but not the identifier
					if (node.params && (node.params.length > 0)){
						rangeStart = node.params[0].range[0];
					}
					break;
				case Estraverse.Syntax.FunctionExpression:
				case Estraverse.Syntax.ArrowFunctionExpression:
					kind = 'fe';  //$NON-NLS-0$
					// Include the params, body and identifier (if available) See Bug 447413
					if (node.id) {
						rangeStart = node.id.range[0];
					} else if (node.params && (node.params.length > 0)){
						rangeStart = node.params[0].range[0];
					}
					break;
				case Estraverse.Syntax.ClassDeclaration:
					kind = 'c';  //$NON-NLS-0$
					break;
				case Estraverse.Syntax.ClassExpression:
					kind = 'c';  //$NON-NLS-0$
					// Include the body and identifier (if available) See Bug 447413
					if (node.id) {
						rangeStart = node.id.range[0];
					}
					break;
			}
			if (kind){
				scopes.push({range: [rangeStart,node.range[1]], occurrences: [], kind:kind});	
			}
		}
		return false;
	}
	
	/**
	 * @description Pops the tip of the block stack off, adds occurrences (if any) and returns if we should
	 * quit visiting
	 * @function
	 * @private
	 * @returns {Boolean} If we should quit visiting
	 */
	function _popBlock() {
		var scope = scopes[scopes.length-1];
		if (!scope.blocks || scope.blocks.length === 0){
			return false;
		}
		var block = scope.blocks.pop();
		if (skipScope){
			if (skipScope === block){
				skipScope = null;
			}
			return false;
		}
		if(scope.isLet && Array.isArray(block.occurrences)) {
			var i, j;
			var len = block.occurrences.length;
			if (defscope && defscope === block){
				for(i = 0; i < len; i++) {
					occurrences.push(block.occurrences[i]);
				}
				return true;
			}
			// We popped out of a scope but don't know where the define is, treat the occurrences like they belong to the outer scope (Bug 445410)
			if (scope.blocks.length > 0){
				for (j=0; j< len; j++) {
					scope.blocks[scope.blocks.length - 1].occurrences.push(block.occurrences[j]);
				}
			} else {
				for (j=0; j< len; j++) {
					scope.occurrences.push(block.occurrences[j]);
				}
			}
		}
		return false;
	}
	
	/**
	 * @description Pops the tip of the scope stack off, adds occurrences (if any) and returns if we should
	 * quit visiting
	 * @function
	 * @private
	 * @returns {Boolean} If we should quit visiting
	 */
	function _popScope() {
		var scope = scopes.pop();
		if (skipScope){
			if (skipScope === scope){
				skipScope = null;
			}
			return false;
		}
		var len = scope.occurrences.length;
		var i, j;
		// Move all occurrences into the defining scope in case an inner scope redefines (Bug 448535)
		if(defscope && defscope === scope) {
			for(i = 0; i < len; i++) {
				occurrences.push(scope.occurrences[i]);
			}
			if(defscope.range[0] === scope.range[0] && defscope.range[1] === scope.range[1] &&
				defscope.kind === scope.kind) {
				//we just popped out of the scope the node was defined in, we can quit
				return true;
			}
		} else {
			if (scopes.length > 0){
				// We popped out of a scope but don't know where the define is, treat the occurrences like they belong to the outer scope (Bug 445410)
				for (j=0; j< len; j++) {
					scopes[scopes.length - 1].occurrences.push(scope.occurrences[j]);
				}
			} else {
				// We are leaving the AST, add the occurrences if we never found a defining scope
				occurrences = [];
				for (j=0; j< len; j++) {
					occurrences.push(scope.occurrences[j]);
				}
			}
		}
		return false;
	}
	
	/**
	 * @description Computes the node name to use while searching
	 * @function
	 * @private
	 * @param {Object} node The AST token
	 * @returns {String} The node name to use while seraching
	 */
	function _nameFromNode(node) {
		switch(node.type) {
			case Estraverse.Syntax.Identifier: return node.name;
			case Estraverse.Syntax.ThisExpression: return 'this'; //$NON-NLS-0$
		}
	}
	
	/**
	 * @description If we should skip marking occurrences
	 * @function
	 * @private
	 * @param {Object} node The AST node
	 * @returns {Boolean} True if we shoud skip computing occurrences
	 */
	function _skip(node) {
		if(!node) {
			return true;
		}
		if(node.type === Estraverse.Syntax.ThisExpression) {
			return false;
		}
		
		if (node.type === Estraverse.Syntax.Literal){
			return false;
		}
		
		if (node.type === Estraverse.Syntax.Identifier){
			var parent = node.parent;
			if (!parent && node.parents) {
				parent = node.parents[node.parents.length-1];
			}
			if (parent){
				if (parent.type === Estraverse.Syntax.ImportSpecifier){
					return parent.imported === node;
				} else if (parent.type === Estraverse.Syntax.ExportSpecifier){
					return parent.exported === node;
				}
			}
		}
		
		return node.type !== Estraverse.Syntax.Identifier;
	}
});
