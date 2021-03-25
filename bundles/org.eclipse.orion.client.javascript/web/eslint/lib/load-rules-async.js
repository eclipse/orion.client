/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd, worker */
/**
 * Implements eslint's load-rules API for AMD. Our rules are loaded as AMD modules.
 */
define([
'./utils/util',
'javascript/finder',
'i18n!javascript/nls/problems',
'estraverse/estraverse',
'orion/editor/stylers/application_javascript/syntax',
'./rules/accessor-pairs',
'./rules/no-control-regex',
'./rules/no-duplicate-case',
'./rules/no-else-return',
'./rules/no-empty-character-class',
'./rules/no-empty-label',
'./rules/no-eq-null',
'./rules/no-extra-boolean-cast',
'./rules/no-extra-parens',
'./rules/no-invalid-regexp',
'./rules/no-negated-in-lhs',
'./rules/no-obj-calls',
'./rules/no-self-compare',
'./rules/no-irregular-whitespace',
'./rules/no-const-assign',
'./rules/no-implicit-coercion',
'./rules/no-extra-bind',
'./rules/no-extend-native',
'./rules/no-lone-blocks',
'./rules/quotes',
'./rules/yoda',
'./rules/no-param-reassign',
'./rules/no-native-reassign',
'./rules/no-unused-expressions',
'./rules/no-invalid-this',
'./rules/no-trailing-spaces'
], function(util, Finder, ProblemMessages, Estraverse, JsSyntax,
		accessorPairs, noControlRegex, noDuplicateCase, noElseReturn, noEmptyCharClasses, 
		noEmptyLabel, noEqNull, noExtraBoolCast, noExtraParens, noInvalidRegExp, noNegatedInLhs,
		noObjCalls, noSelfCompare, noIrregularWhitespace, noConstAssign, noImplicitCoercion,
		noExtraBind, noExtendNative, noLoneBlocks, quotes, yoda, noParamReassign, noNativeReassign,
		noUnusedExpressions, noInvalidThis, noTrailingSpaces) {
	
	var nodeModules = {
		"buffer": true,
		"child_process": true,
		"cluster": true, 
		"crypto": true, 
		"dns": true, 
		"domain": true, 
		"events": true, 
		"fs": true, 
		"http": true, 
		"https": true, 
		"net": true, 
		"os": true, 
		"path": true, 
		"punycode": true, 
		"readline": true, 
		"stream": true, 
		"string_decoder": true, 
		"tls":true, 
		"tty": true, 
		"dgram": true, 
		"url": true, 
		"util": true, 
		"v8": true, 
		"vm": true, 
		"zlib": true
	};
	
    var rules = {
    	/** @callback */
        "check-tern-plugin": function(context) {
        	function checkProject(node) {
        		function getEnvNode(envname) {
    				var comment = Finder.findDirective(node, "eslint-env"); //$NON-NLS-1$
    				if(comment) {
    					var idx = comment.value.indexOf(envname);
    					if(idx > -1) {
    						var start = comment.range[0]+idx+2, //add 2 because the spec says block value starts exclude /*
    							end = start+envname.length;
    						return {type: "EnvName", range: [start, end], loc: comment.loc}; //$NON-NLS-1$
    					}
    				}
        		}
        		// Don't report problems on HTML files that have no script blocks
        		if (node.end === 0){
        			return;
        		}
                if(context.env){
                	var envKeys = Object.keys(context.env);
                	if (envKeys.length > 0){
                		var tern = context.getTern();
                		if (tern){
       						envKeys.forEach(function(key) {
       							// CommonJS define statements have node env key, but are handled in requirejs plugin (see missing-requirejs)
       							if (key === "node" && node.environments && node.environments['simplifiedCommonJS']) {
       								return;
   								}
	   							var pluginName = tern.plugins[key] ? key : tern.optionalPlugins[key];
	   							if (pluginName && !tern.plugins[pluginName]) {
	   								var envnode = getEnvNode(key);
	   								if(envnode) {
	   									context.report(envnode, ProblemMessages['check-tern-plugin'], {0:key, 1:pluginName, data: pluginName});
	   								} else {
	       								context.report(node, ProblemMessages['check-tern-plugin'], {0:key, 1:pluginName, data: pluginName});
	   								}
	   							} else {
	   								var def = tern.getDef(key);
	   								if (!def && tern.optionalDefs[key]){
	   									envnode = getEnvNode(key);
		   								if(envnode) {
		   									context.report(envnode, ProblemMessages['check-tern-lib'], {0:key, 1:key, nls: 'check-tern-lib', data: key}); //$NON-NLS-1$
		   								} else {
		       								context.report(node, ProblemMessages['check-tern-lib'], {0:key, 1:key, nls: 'check-tern-lib', data: key}); //$NON-NLS-1$
		   								}
   									}
   								}
       						});
        				}
       				}
   				}
			}
			return {
				"Program": checkProject
			};
        },
    	/** @callback */
        "curly": function(context) {
	        		/**
	        		 * Checks the following AST element for a BlockStatement
	        		 */
	        		function checkBlock(node) {
        			    switch(node.type) {
        			        case 'IfStatement': {
            					if(node.consequent && node.consequent.type !== 'BlockStatement') {
            						//flag the first token of the statement that should be in the block
            						context.report(node.consequent, ProblemMessages['curly'], null /*, context.getTokens(node.consequent)[0]*/);
            					}
            					if(node.alternate && node.alternate.type !== 'BlockStatement' && node.alternate.type !== 'IfStatement') {
            						//flag the first token of the statement that should be in the block
            						context.report(node.alternate, ProblemMessages['curly'], null /*, context.getTokens(node.alternate)[0]*/);
            					}
            					break;
        				    }
        				    case 'DoWhileStatement':
        				    case 'WhileStatement':
        				    case 'WithStatement':
        				    case 'ForStatement':
                            case 'ForInStatement': 
                            case 'ForOfStatement': {
            					if(node.body && node.body.type !== 'BlockStatement') {
            						//flag the first token of the statement that should be in the block
            						context.report(node.body, ProblemMessages['curly'], null /*, context.getTokens(node.body)[0]*/);
            					}
            					break;
        					}
        				}
	        		}
	
	        		return {
	        			'IfStatement' : checkBlock,
	        			'WhileStatement' : checkBlock,
	        			'ForStatement' : checkBlock,
	        			'ForInStatement' : checkBlock,
	        			'ForOfStatement': checkBlock,
	        			'WithStatement': checkBlock,
	        			'DoWhileStatement': checkBlock
	        		};
        },
        /** @callback */
		"eqeqeq": function(context) {
			        /**
        			 * @description Find the token with the matching operator
        			 * @param {{}}} context The ESLint rule context
        			 * @param {Object} node The AST node
        			 * @returns {Object} The matching token or null
        			 */
        			function getOperatorToken(context, node) {
	            		var tokens = context.getTokens(node),
	            			len = tokens.length, 
	            			operator = node.operator;
	            		// node is a binary expression node so node.left exists
	            		var start = node.left.end; // we need to start to look for the operator at the end of the left node
	            		for (var i=0; i < len; i++) {
	            			var t = tokens[i];
	            			if (t.start >= start && t.value === operator) {
	            				return t;
	            			}
	            		}
	            		return null;
	            	}
	            	/**
	            	 * @description If the given node value is null or undefined
	            	 * @param {Object} node The AST node
	            	 * @returns {Boolean} if the node's value is null or undefined
	            	 */
	            	function isNullness(node) {
	            		if(node && node.type) {
	            			return node.type === 'Literal' && node.value === null || node.type === 'Identifier' && node.name === 'undefined';
	            		}
	            		return false;
	            	}
	        		return {
	        			/* @callback */
	        			"BinaryExpression": function(node) {
        					if(isNullness(node.left) || isNullness(node.right)) {
        						return;
        					}
        					var op = node.operator;
        					var expected = null;
        					if (op === "==") {
        					    expected = '===';
        						context.report(node, ProblemMessages['eqeqeq'], {0: expected, 1:op}, getOperatorToken(context, node));
        					} else if (op === "!=") {
        					    expected = '!==';
        						context.report(node, ProblemMessages['eqeqeq'], {0:expected, 1:op}, getOperatorToken(context, node));
        					}
	        			}
	        		};
        },
        /** @callback */
		"missing-doc": function(context) {
                /**
                 * @description If the comment is a block comment
                 * @param {Array.<Object>} comments The array of AST comment nodes
                 * @returns {Boolean} If the last comment is a block comment (this one that would be immediately preceeding the AST node)
                 */
                function validComment(comments) {
                    if(comments && comments.leading) {
                        var len = comments.leading.length;
                        return len > 0 && comments.leading[len-1].type === 'Block';
                    }
                    return false;
                }
        		/**
		         * @description Checks the attached comments on the node
		         * @param {Object} node The AST node
		         */
		        function checkDoc(node) {
    				var comments;
    				var name;
    				switch(node.type) {
    					case 'Property':
    						if(node.value && node.value.type === 'FunctionExpression') {
    							comments = context.getComments(node);
    							if(!comments || comments.leading.length < 1) {
    							    //TODO see https://github.com/jquery/esprima/issues/1071
							        comments = context.getComments(node.key);
    							}
    							if(!validComment(comments)) {
    								switch(node.key.type) {
    									case 'Identifier':
    										name = node.key.name;
    										break;
    									case 'Literal':
    										name = node.key.value;
    										break;
    								}
    								context.report(node.key, ProblemMessages['missing-doc'], {0:name}, { type: 'expr' }); //$NON-NLS-1$
    							}
    						}
    						break;
    					case 'FunctionDeclaration':
							comments = context.getComments(node);
							if(!comments || comments.leading.length < 1) {
							    //TODO see https://github.com/jquery/esprima/issues/1071
						        comments = context.getComments(node.id);
							}
							if(!validComment(comments) && node.parent && node.parent.type !== "ExportNamedDeclaration") {
								context.report(node.id, ProblemMessages['missing-doc'], {0:node.id.name}, { type: 'decl' });  //$NON-NLS-1$
							}
    						break;
    					case 'ExpressionStatement':
    						if(node.expression && node.expression.type === 'AssignmentExpression') {
    							var anode = node.expression;
    							if(anode.right && anode.right.type === 'FunctionExpression' && anode.left && anode.left.type === 'MemberExpression') {
    								//comments are attached to the enclosing expression statement
    								comments = context.getComments(node);
    								if(!comments || comments.leading.length < 1) {
        							    //TODO see https://github.com/jquery/esprima/issues/1071
    							        comments = context.getComments(anode.left);
        							}
    								if(!validComment(comments)) {
    									name = anode.left.computed === true ? anode.left.property.value : anode.left.property.name;
    									context.report(anode.left.property, ProblemMessages['missing-doc'], {0:name}, { type: 'expr' }); //$NON-NLS-1$
    								}
    							}
    						}
    						break;
    					case 'ExportNamedDeclaration' :
							comments = context.getComments(node);
							if(!validComment(comments) && node.declaration && node.declaration.type === "FunctionDeclaration") {
								context.report(node.declaration.id, ProblemMessages['missing-doc'], {0:node.declaration.id.name}, { type: 'decl' });  //$NON-NLS-1$
							}
					}
        		}

        		return {
        			"Property": checkDoc,
        			"FunctionDeclaration": checkDoc,
        			"ExpressionStatement": checkDoc,
        			"ExportNamedDeclaration": checkDoc
        		};
        },
        /** @callback */
		"new-parens": function(context) {
        		return {
        			/* @callback */
        			'NewExpression' : function(node) {
    					if(node.callee) {
    						var tokens = context.getTokens(node.callee, 0, 1);
    						if(tokens && tokens.length > 0) {
    							var last = tokens[tokens.length-1];
    							if(last.type !== 'Punctuator' || last.value !== '(') {
    								//if there s no opening parenthesis its safe to assume they are missing
    								context.report(node.callee, ProblemMessages['new-parens'], null, tokens[0]);
    							}
    						}
    					}
        			}
        		};
        },
        /** @callback */
        "no-caller": function(context) {
                return {
                	/* @callback */
                    "MemberExpression": function(node) {
                        var func = Finder.findParentFunction(node);
                        if(func) {
                            var object = node.object;
                            if (!object || object.name !== "arguments" || object.type !== "Identifier") {
                                return;
                            }
                            var prop = node.property;
                            var name = prop.name ? prop.name : prop.value;
                            if (name === "callee" || name === "caller") {
                                context.report(prop, ProblemMessages['no-caller'], {0: name});
                            }
                        }
                    }
                };
        },
        /** @callback */
        "no-comma-dangle": function(context) {
                return {
                	/* @callback */
                    'ObjectExpression': function(node) {
                        var token  = context.getLastToken(node, 1);
                        if(token && token.value === ',') {
                            context.report(node, ProblemMessages['no-comma-dangle'], null, token);
                        }
                    }
                };
        },
        /* @callback */
        "no-cond-assign": function(context) {

                var statements = {
                    'IfStatement': true,
                    'DoWhileStatement': true,
                    'WhileStatement': true,
                    'ForStatement': true
                };

                /**
                 * @description If the given node is surrounded by ()
                 * @param {Object} node The AST node
                 * @returns {Boolean} If the node is surrounded by ()
                 */
                function isParenthesised(node) {
                    var type = node.parent.type;
                    if(statements[type]) {
                        //if its direct parent is the control statement, check for double parenthesis
                        if(type !== 'ForStatement') {
                            return context.getTokenBefore(node, 1).value === '(';
                        }
                    }
                    return context.getTokenBefore(node).value === '(';
                }
                /**
                 * @description If we should skip the node
                 * @param {Object} node The AST node
                 * @returns {Boolean} if we should skip checking the given node
                 */
                function skip(node) {
                    switch(node.type) {
                        case 'FunctionExpression':
                        case 'ObjectExpression':
                        case 'CallExpression':
                        case 'ArrayExpression': {
                            return true;
                        }
                        default: return false;
                    }
                }
                /**
                 * @description Checks for assignment expressions
                 * @param {Object} node The AST node
                 */
                function checkForAssignment(node) {
                    var assigns = [];
                    if(node.test === null) {
                        return;
                    }
                    node.test.parent = node;
                    Estraverse.traverse(node.test, {
                    	/* @callback */
                        enter: function(n, parent) {
                            if(n.range[0] > node.test.range[1]) {
                                //once we've left the test object
                                return Estraverse.VisitorOption.Break;
                            }
                            if(skip(n)) {
                                return Estraverse.VisitorOption.Skip;
                            }
                            if(parent) {
                                n.parent = parent;
                            }
                            if(n && n.type === 'AssignmentExpression') {
                                assigns.push(n);
                            }
                        }
                    });
                    var len = assigns.length;
                    if(len > 0) {
                        for(var i = 0; i < len; i++) {
                            var assign = assigns[i];
                            if(!isParenthesised(assign)) {
                                assign.range[0] = assign.left.range[0]; //mark only from the start of first part
                                context.report(assign, ProblemMessages['no-cond-assign']);
                            }
                        }
                    }
                }

                return {
                  'IfStatement': checkForAssignment,
                  'WhileStatement': checkForAssignment,
                  'ForStatement': checkForAssignment,
                  'DoWhileStatement': checkForAssignment
                };
        },
        /** @callback */
        "no-console": function(context) {
                return {
                	/* @callback */
                    'MemberExpression': function(node) {
                        if(node.object.name === 'console') {
                            //are we using the browser env?
                            if(context.env && context.env['browser']) {
                                context.report(node.object, ProblemMessages['no-console']);
                            }
                        }
                    }
                };
        },
        /** @callback */
        "no-constant-condition": function(context) {
                /**
                 * @param {Object} node The AST node
                 * @returns {Boolean} If the given node has a 'truthy' constant value
                 */
                function isConst(node) {
                    switch(node.type) {
                        case 'Literal':
                        case 'ObjectExpression':
                        case 'FunctionExpression':
                        case 'ArrayExpression': {
                            return true;
                        }
                        case 'BinaryExpression':
                        case 'LogicalExpression': {
                            return isConst(node.left) && isConst(node.right);
                        }
                        case 'UnaryExpression': {
                            return isConst(node.argument);
                        }
                        default: return false;
                    }
                }
                /**
                 * @description Check if the condition is a constant
                 * @param {Object} node The AST node
                 */
                function checkCondition(node) {
                    if(node && node.test && isConst(node.test)) {
                        context.report(node.test, ProblemMessages['no-constant-condition']);
                    }
                }

                return {
                    'IfStatement': checkCondition,
                    'WhileStatement': checkCondition,
                    'DoWhileStatement': checkCondition,
                    'ForStatement': checkCondition,
                    'ConditionalExpression': checkCondition
                };
        },
        /** @callback */
		"no-debugger": function(context) {
        		return {
        			/* @callback */
        			"DebuggerStatement": function(node) {
        				context.report(node, ProblemMessages['no-debugger'], null, context.getTokens(node)[0]);
					}
        		};
        },
        /** @callback */
		"no-dupe-keys": function(context) {
        		return {
        			/* @callback */
        			"ObjectExpression": function(node) {
    					var props = node.properties;
    					if(props && props.length > 0) {
    						var len = props.length;
    						var seen = Object.create(null);
    						for(var i = 0; i < len; i++) {
    							var prop = props[i];
    							// Here we're concerned only with duplicate keys having kind == "init". Duplicates among other kinds (get, set)
    							// cause syntax errors, by spec, so don't need to be linted.
    							if(prop.kind !== "init") {
    								continue;
    							}
    							var name = prop.key.name ? prop.key.name : prop.key.value;
    							if(Object.prototype.hasOwnProperty.call(seen, name)) {
    								context.report(prop, ProblemMessages['no-dupe-keys'], {0:name}, context.getTokens(prop)[0]);
    							}
    							else {
    								seen[name] = 1;
    							}
    						}
    					}
        			}
        		};
        },
        /** @callback */
		'no-empty-block': function(context) {
        		var comments;

        		return {
        			/* @callback */
        		    'Program' : function(node) {
        		          comments = node.comments;
        		    },
        		    /* @callback */
        			'BlockStatement' : function(node) {
        			    if(node.body.length < 1) {
        			        for(var i = 0; i < comments.length; i++) {
        			            var range = comments[i].range;
        			            if(range[0] >= node.range[0] && range[1] <= node.range[1]) {
        			                //a commented empty block, ignore
        			                return;
        			            }
        			        }
        			        context.report(node, ProblemMessages['no-empty-block']);
        			    }
        			}
        		};
        },
        /** @callback */
		"no-eval": function(context) {
        		return {
        			/* @callback */
        			"CallExpression": function(node) {
     					var name = node.callee.name;
    					if(!name) {
    						return;
    					}
    					if('eval' === name) {
    						context.report(node.callee, ProblemMessages['no-eval'], {0:'\'eval\''}, context.getTokens(node.callee)[0]); //$NON-NLS-1$
    					}
        			}
        		};
        },
        /** @callback */
		"no-extra-semi": function(context) {
        		return {
        			/* @callback */
        			"EmptyStatement": function(node) {
    					var tokens = context.getTokens(node);
    					var t = tokens[tokens.length - 1];
    					if (t && t.type === "Punctuator" && t.value === ";") {
    						context.report(node, ProblemMessages['no-extra-semi'], null, t /* expose the bad token */);
    					}
        			}
        		};
        },
        /** @callback */
		'no-fallthrough': function(context) {
        		/**
		         * @description Check if the AST node falls through
		         * @param {Object} node The AST node
		         */
		        function fallsthrough(node) {
        		    // cases with no statements or only a single case are implicitly fall-through
        		    if(node.consequent) {
        		        var statements = node.consequent.slice(0);
        		        if(statements.length > 0 && statements[0].type === 'BlockStatement') {
        		            var stmts = statements.shift(); //take the block statement off the list, it is not returnable
        		            if(stmts.body.length > 0) {
        		                statements = [].concat(statements, stmts.body); //remove the block statement
        		            }
        		        }
        		        if(statements.length < 1) {
        					return false;
        				}
        		        var statement = null;
        		        for(var i = 0; i < statements.length; i++) {
        		            statement = statements[i];
        		            if(util.returnableStatement(statement)) {
        		                return false;
        		            }
        		        }
        		        return true;
        		    }
        		    return false;
        		}

        		return {
        			/* @callback */
        			'SwitchStatement' : function(node) {
        			    if(node.cases && node.cases.length > 1) {
        			        //single case is implicitly fallthrough
        			        var caselen  = node.cases.length;
        			       cases: for(var i = 0; i < caselen; i++) {
        			            if(i+1 === caselen) {
        			                //last node is implicitly fall-through
        			                break;
        			            }
        			            if(fallsthrough(node.cases[i])) {
        			                //corect the highlighting to match eclipse
        			                var reportednode = node.cases[i+1];
        			                if(reportednode.test) {
        			                    reportednode.range[1] = reportednode.test.range[1];
        			                } else {
        			                    //default case - tag the token
        			                    var tokens = context.getTokens(reportednode);
        			                    if(tokens && tokens.length > 0) {
        			                        reportednode.range[1] = tokens[0].range[1];
        			                    }
        			                }
        			                var comments = reportednode.leadingComments;
        			                if(!comments && reportednode.test) {
        			                    //TODO see https://github.com/jquery/esprima/issues/1071
        			                    comments = reportednode.test.leadingComments;
        			                }
        			                if(comments) {
                    		            var comment = null;
                    		            for(var c = 0; c < comments.length; c++) {
                    		                comment = comments[c];
                    		                if(/\$?falls?\s?through\$?/i.test(comment.value.toLowerCase())) {
                    		                    continue cases;
                    		                }
                    		            }
                    		        }
        			                context.report(reportednode, ProblemMessages['no-fallthrough']);
        			            }
        			        }
        			    }
        			 }
        		};
        },
        /** @callback */
        "no-implied-eval": function(context) {
        		return {
        			/* @callback */
        			"CallExpression": function(node) {
    					var name = node.callee.name;
    					if(!name) {
    						return;
    					}
    					if('setInterval' === name || 'setTimeout' === name) {
    						if(node.arguments.length > 0) {
    							var arg = node.arguments[0];
    							if(arg.type === 'Literal') {
    								context.report(node.callee, ProblemMessages['no-eval'], {0:'Implicit \'eval\''}, context.getTokens(node.callee)[0]); //$NON-NLS-1$
    							}
    							else if(arg.type === 'Identifier') {
    								//lets see if we can find it's definition
    								var scope = context.getScope();
    								var decl = util.getDeclaration(arg, scope);
    								if (decl && decl.defs && decl.defs.length) {
    									var def = decl.defs[0];
    									var dnode = def.node;
    									if(def.type === 'Variable' && dnode && dnode.type === 'VariableDeclarator' &&
    											dnode.init && dnode.init.type === 'Literal') {
    										context.report(node.callee, ProblemMessages['no-eval'], {0:'Implicit \'eval\''}, context.getTokens(node.callee)[0]); //$NON-NLS-1$
    									}
    								}
    							}
    						}
    					}
        			}
        		};
        },
        /** @callback */
        "no-iterator": function(context) {
                return {
                	/* @callback */
                    'MemberExpression': function(node) {
                        if(node.property !== null) {
                            if(node.computed) {
                                if(node.property.value === '__iterator__') {
                                    context.report(node.property, ProblemMessages['no-iterator']);
                                }
                            } else if(node.property.name === '__iterator__') {
                                context.report(node.property, ProblemMessages['no-iterator']);
                            }
                        }
                    }
                };
        },
        /** @callback */
        "no-proto": function(context) {
                return {
                	/* @callback */
                    'MemberExpression': function(node) {
                        if(node.property !== null) {
                            if(node.computed) {
                                if(node.property.value === '__proto__') {
                                    context.report(node.property, ProblemMessages['no-proto']);
                                }
                            } else if(node.property.name === '__proto__') {
                                context.report(node.property, ProblemMessages['no-proto']);
                            }
                        }
                    }
                };
        },
        /** @callback */
		'no-jslint': function(context) {
        		return {
        			/* @callback */
        			'Program' : function(node) {
        			    var comments = node.comments;
        			    var len;
        			    if(comments && (len = comments.length) && comments.length > 0) {
        			        for(var i = 0; i < len; i++) {
        			            var comment = comments[i];
        			            if(comment.type === 'Block') {
        			                var match = /^\s*(js[l|h]int)(\s+\w+:\w+)+/ig.exec(comment.value);
        			                if(match) {
        			                    var jslint = match[1];
        			                    if(jslint.length < 1) {
        			                        continue;
        			                    }
        			                    var start = 2 + comment.value.indexOf(jslint) + comment.range[0]; 
        			                    var end = start + jslint.length;
        			                    context.report({type:'BlockComment', range:[start, end], loc: comment.loc}, ProblemMessages['no-jslint'], {0:jslint}); //$NON-NLS-1$
        			                }
        			            }
        			        }
        			    }
        			 }
        		};
        },
        /** @callback */
		"no-new-array": function(context) {
		    	/**
	    		 * @description Check the given AST node for new Array(..) violations
	    		 * @param {Object} node The AST node
	    		 */
	    		function checkNode(node) {
		    		var callee = node.callee;
	    			if (callee && callee.name === 'Array') {
						var args = node.arguments;
						if(args.length > 1) {
							context.report(callee, ProblemMessages['no-new-array']);
						} else if(args.length === 1 && (args[0].type === 'Literal' && typeof args[0].value !== 'number')) {
							context.report(callee, ProblemMessages['no-new-array']);
						}
					}
		    	}
        		return {
        			'NewExpression': checkNode,
        			'CallExpression': checkNode
        		};
        },
        /** @callback */
		"no-new-func": function(context) {
        		return {
        			/* @callback */
        			'NewExpression': function(node) {
        				var callee = node.callee;
		    			if (callee && callee.name === 'Function') {
		    				context.report(callee, ProblemMessages['no-new-func']);
	    				}
        			}
        		};
        },
        /** @callback */
		"no-new-object": function(context) {
		   		return {
		   			/* @callback */
        			'NewExpression': function(node) {
        				var callee = node.callee;
		    			if (callee && callee.name === 'Object') {
		    				context.report(callee, ProblemMessages['no-new-object']);
	    				}
        			}
        		};
        },
        /** @callback */
		"no-new-wrappers": function(context) {
        		var wrappers = ["String", "Number", "Math", "Boolean", "JSON"]; //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$ //$NON-NLS-5$
				return {
					/* @callback */
        			'NewExpression': function(node) {
        				var callee = node.callee;
		    			if (callee && wrappers.indexOf(callee.name) > -1) {
		    				context.report(callee, ProblemMessages['no-new-wrappers'], [callee.name]);
	    				}
        			}
        		};
        },
        /** @callback */
        "no-with": function(context) {
        		return {
        			/* @callback */
        			'WithStatement': function(node) {
	        			context.report(node, ProblemMessages['no-with'], null, context.getFirstToken(node));
	        		}
        		};
        },
        /** @callback */
		"missing-nls": function(context){
        		/**
		         * @description Reports missing NLS on the given node and offset
		         * @param {Object} node The AST node
		         * @param {Number} index The NLS index to use
		         */
		        function reportMissingNLS(node, index){
        			var data = Object.create(null);
        			data.indexOnLine = index;
        			context.report(node, ProblemMessages['missing-nls'], {0:node.value, data: data});
        		}
        		
        		return {
        			/* @callback */
                    'Literal': function(node) {
                    	_collectLinesWithStringLiterals(node, context._linesWithStringLiterals);
                    },
                    /**
                     * @callback
                     */
                    'Program': function(node){
                    	context._linesWithStringLiterals = Object.create(null);
                    	context._isMissingNLSActive = true;
                    },
                    /**
                     * @callback
                     */
                    'Program:exit': function(node){
                    	context._isMissingNLSActive = false;
                    	// Read each line in the map and check if there are non-nls statements
                    	if (context._linesWithStringLiterals){
                    		
                    		var comments = node.comments;
	                    	var linesWithComments = {};
	                    	if (Array.isArray(comments)){
	                    		for (var f=0; f<comments.length; f++) {
	                    			var comment = comments[f];
	                    			if (comment.type.toLowerCase() === 'line'){
	                    				var lineNumber = comment.loc.end.line;
								        linesWithComments[lineNumber] = "//" + comment.value; // Add in leading // to simply regex //$NON-NLS-1$
	                    			}
	                    		}
	                    	}
                    		
                    		for (lineNumber in context._linesWithStringLiterals) {
                    			var nodes = context._linesWithStringLiterals[lineNumber];
							    if (nodes) {
							    	
							    	// 0 based line count
									comment = linesWithComments[lineNumber];
							        var nonNlsRegExp = /\/\/\$NON-NLS-([0-9])+\$/g;
							        var match;
							        comments = [];
							    	if (comment){
								        while ((match = nonNlsRegExp.exec(comment)) !== null){
								        	comments.push(match[1]);
								        }
							        }

							        for (var i=0; i<nodes.length; i++) {
							        	match = false;
							        	for (var j=0; j<comments.length; j++) {

							        		// NON-NLS comments start at 1
							        		if (comments[j] === String(i+1)){
							        			comments[j] = null;
							        			match = true;
							        			break;
							        		}
							        		// For now allow NON-NLS-0 comments
							        		if (i===0 && comments[j] === '0'){
							        			comments[j] = null;
							        			match = true;
							        			break;
							        		}
							        	}
							        	if (!match){
							        		reportMissingNLS(nodes[i], i);
							        	}
							        }
							    }
							}
                    	}
                    }
				};
        },
        /** @callback */
        "unnecessary-nls": function(context){
        		/**
		         * @name reportUnusedNLS
		         * @description Reports unnecessary NLS problem, you must set both the range (index array) and the loc {start/end line/col} on the location argument
		         * @param location
		         * @param value
		         * @param nlsCommentValue
		         */
		        function reportUnusedNLS(location, value, nlsCommentValue){
					context.report({range: location.range, loc: location.loc, value: value}, ProblemMessages['unnecessary-nls'], {data: {nlsComment: nlsCommentValue}});
        		}

        		return {
        			/* @callback */
                    'Literal': function(node) {
                    	if (!context._isMissingNLSActive){
                    		_collectLinesWithStringLiterals(node, context._linesWithStringLiterals);
                    	}
                    },
                    /**
                     * @callback
                     */
                    'Program': function(node){
                    	if (!context._isMissingNLSActive){
                    		context._linesWithStringLiterals = Object.create(null);
                		}
                    },
                    /**
                     * @callback
                     */
                    'Program:exit': function(node){
                    	var start, value, lineNumber, match, nlsComments;
                    	var comments = node.comments;
                    	var linesWithComments = {};
                    	if (Array.isArray(comments)){
                    		for (var f=0; f<comments.length; f++) {
                    			var comment = comments[f];
                    			if (comment.type.toLowerCase() === 'line'){
                    				lineNumber = comment.loc.end.line;
							        linesWithComments[lineNumber] = comment;
                    			}
                    		}
                    	}
                    	
                    	// NLS tag must start with // (or be start of line comment) and can be numbered 0 to 9
                    	var nonNlsRegExp = /(?:^|(\/\/))\$NON-NLS-([0-9])+\$/g;

                    	// Read each line in the map and check if there are non-nls statements
                    	if (context._linesWithStringLiterals){
                    		for (lineNumber in context._linesWithStringLiterals) {
                    			var nodes = context._linesWithStringLiterals[lineNumber];
							    if (nodes) {
							    	comment = linesWithComments[lineNumber];
							    	delete linesWithComments[lineNumber];
								    nlsComments = [];
							        if (comment) {
								        while ((match = nonNlsRegExp.exec(comment.value)) !== null){
								        	nlsComments.push(match);
								        }
						        	}
									for (var j=0; j<nlsComments.length; j++) {
										match = nlsComments[j];
							        	var hasMatch = false;
							        	for (var i=0; i<nodes.length; i++) {
							        		// NON-NLS comments start at 1
							        		if (match[2] === String(i+1)){
							        			hasMatch = true;
							        			break;
							        		}
							        		// For now allow NON-NLS-0 comments
							        		if (i===0 && match[2] === '0'){
							        			hasMatch = true;
							        			break;
							        		}
							        	}
							        	if (!hasMatch){
							        		value = match[1] ? match[0] : '//' + match[0]; //$NON-NLS-1$
											start = comment.range[0] + match.index;
											if (match[1]){
												start += 2; // Comment range doesn't include line comment prefix
											}
                    						reportUnusedNLS({range: [start, start+value.length], loc: comment.loc}, value, match[0]);	        		
							        	}
							        }
							    }
							}
                    	}
                    	
                    	// Find comments on lines with no string literals
                    	for (lineNumber in linesWithComments){
                    		comment = linesWithComments[lineNumber];
                    		if (comment){
                    			// See if there is any code on the line before the comment
                    			var index = comment.range[0]-1;
                    			var text = node.sourceFile.text;
                    			var isBlank = index < 0;  //If we happen to be at the start of the file treat as newline
                    			var prevChar;
                    			if (text){
	                    			while (index >= 0 && (prevChar = text.charAt(index)).match(/\s/)){
	                    				if (prevChar === '\n' || index === 0){
	                    					isBlank = true;
	                    					break;
	                    				}
	                    				index--;
	                    			}
                				}
                    			while ((match = nonNlsRegExp.exec(comment.value)) !== null){
                    				if (isBlank && match.index > 0){
                    					break; // We are on a commented out line of code, skip marking non-nls messages
                    				}
                    				value = match[1] ? match[0] : '//' + match[0]; //$NON-NLS-1$
									start = comment.range[0] + match.index;
									if (match[1]){
										start += 2; // Comment range doesn't include line comment prefix
									}
            						reportUnusedNLS({range: [start, start+value.length], loc: comment.loc}, value, match[0]);	
            					}
                			}
                    	}
                    }
				};
        },
        /** @callback */
		"no-redeclare": function(context) {
			var options = {
				builtinGlobals: Boolean(context.options[0] && context.options[0].builtinGlobals)
			};

			/**
			 * Find variables in a given scope and flag redeclared ones.
			 * @param {Scope} scope - An escope scope object.
			 * @returns {void}
			 * @private
			 */
			function findVariablesInScope(scope) {
				scope.variables.forEach(function(variable) {
					var hasBuiltin = options.builtinGlobals && "writeable" in variable;
					var count = (hasBuiltin ? 1 : 0) + variable.identifiers.length;

					if (count >= 2) {
						variable.identifiers.sort(function(a, b) {
							return a.range[1] - b.range[1];
						});

						for (var i = hasBuiltin ? 0 : 1, l = variable.identifiers.length; i < l; i++) {
							context.report(
								variable.identifiers[i],
								ProblemMessages['no-redeclare'], {0:variable.name});
						}
					}
				});

			}

			/**
			 * Find variables in the current scope.
			 * @param {ASTNode} node - The Program node.
			 * @returns {void}
			 * @private
			 */
			function checkForGlobal(node) {
				var scope = context.getScope(),
					parserOptions = context.parserOptions,
					ecmaFeatures = parserOptions.ecmaFeatures || {};

				// Nodejs env or modules has a special scope.
				if (ecmaFeatures.globalReturn || node.sourceType === "module") {
					findVariablesInScope(scope.childScopes[0]);
				} else {
					findVariablesInScope(scope);
				}
			}

			/**
			 * Find variables in the current scope.
			 * @returns {void}
			 * @private
			 */
			function checkForBlock() {
				findVariablesInScope(context.getScope());
			}

			if (context.parserOptions.ecmaVersion >= 6) {
				return {
					Program: checkForGlobal,
					BlockStatement: checkForBlock,
					SwitchStatement: checkForBlock
				};
			}
			return {
				Program: checkForGlobal,
				FunctionDeclaration: checkForBlock,
				FunctionExpression: checkForBlock,
				ArrowFunctionExpression: checkForBlock
			};
		},
        /** @callback */
        "no-regex-spaces": function(context) {
                /**
                 * @description Reports spaces used in the regex node
                 * @param {Object} node The AST node
                 */
                function reportSpaces(node) {
                    var regex = /( {2,})/g;
                    var val = null;
                    while((val = regex.exec(node.raw)) !== null) {
                        var start = node.range[0]+val.index;
                        var len = val[0].length;
                        context.report({type: 'Literal', range:[start, start+len], loc: node.loc}, //$NON-NLS-1$
                                        ProblemMessages['no-regex-spaces'], {0:len});
                    }
                }

                return {
                	/* @callback */
                    'Literal': function(node) {
                        if(node.parent && node.parent.type === 'NewExpression') {
                            if(node.parent.callee.name === 'RegExp') {
                                reportSpaces(node);
                            }
                        }
                        var tok = context.getFirstToken(node);
                        if(tok && tok.type === 'RegularExpression') {
                            reportSpaces(node);
                        }
                    }
                };
        },
        /** @callback */
        "no-reserved-keys": function(context) {
                return {
                	/* @callback */
                    'ObjectExpression': function(node) {
                        if(node.properties) {
                            for(var i = 0; i < node.properties.length; i++) {
                                var prop = node.properties[i];
                                if(prop.key.type === 'Identifier' && JsSyntax.keywords.indexOf(prop.key.name) > -1) {//$NON-NLS-1$
                                    context.report(prop.key, ProblemMessages['no-reserved-keys']);//$NON-NLS-1$
                                }
                            }
                        }
                    },
                    "MemberExpression" : function(node) {
                    	if (node.property) {
                            if(node.property.type === 'Identifier' && JsSyntax.keywords.indexOf(node.property.name) > -1) {//$NON-NLS-1$
                                context.report(node.property, ProblemMessages['no-reserved-keys']);//$NON-NLS-1$
                            }
                    	}
                    }
                };
        },
        /** @callback */
        "no-shadow": function(context) {
                /**
                 * @description Collect all vars from the given scope into the map
                 * @param {Object} map The collector map
                 * @param {Object} scope The backing EScope scope
                 */
                function addVariables(map, scope) {
                    scope.variables.forEach(function(variable) {
                        var name = variable.name;
                        if (!variable.defs.length) { // Ignore the synthetic 'arguments' variable
                            return;
                        } if (!Object.prototype.hasOwnProperty.call(map, name)) {
                            map[variable.name] = scope;
                        }
                    });
                }

                /**
                 * @returns {Object} A map of {String} -> {Scope}. Keys are symbol names, values are the
                 * uppermost scope that binds the name.
                 */
                function createSymbolMap(scope) {
                    var upper = scope.upper;
                    var symbols = Object.create(null);

                    // Hack to walk past upper scope lacking a _namedFunctions map. This happens because escope generates
                    // 2 scopes for a FunctionExpression. The first is never returned by context.getScope() as it is not
                    // the innermost, so this rule never visits it.
                    while (upper && !upper._symbols) { upper = upper.upper; }
                    if (upper) {
                        // Propagate upper scope's named functions to ours
                        util.mixin(symbols, upper._symbols);
                    }
                    addVariables(symbols, scope);
                    scope._symbols = symbols;
                    return symbols;
                }
                /**
                 * @description Check if any of the variable defs are of type Parameter
                 * @param {Object} variable The variable
                 * @returns {Boolean} if the any of the defs are of type Parameter
                 */
                function isParameter(variable) {
                    return variable.defs.some(function(def) {
                        return def.type === "Parameter";
                    });
                }
                /**
                 * @description Check the scope the encloses the given AST node
                 * @param {Object} node The AST node
                 */
                function checkScope(node) {
                    // Build map
                    var scope = context.getScope();
                    if (node.type === "FunctionExpression" && node.id && node.id.name) {
                        scope  = scope.upper;
                        if (scope.type === "global") {
                            return; // No shadowing can occur in the global (Program) scope
                        }
                    }
                    var symbolMap = createSymbolMap(scope);
                    scope.variables.forEach(function(variable) {
                        if (!variable.defs.length) {
                            return; // Skip 'arguments'
                        }
                        // If variable's name was first bound in an upper scope, and the variable is not a parameter,
                        // flag it.
                        var bindingSource;
                        if ((bindingSource = symbolMap[variable.name]) && bindingSource !== scope && !isParameter(variable)) {
                        	context.report(variable.defs[0].name, ProblemMessages['no-shadow'], {0: variable.name});
                        }
                    });
                }
                return {
                    "Program": checkScope,
                    "FunctionDeclaration": checkScope,
                    "FunctionExpression": checkScope,
                    "ArrowFunctionExpression": checkScope
                };
        },
        /** @callback */
        "no-shadow-global": function(context) {
        		function checkIdentifier(node, func) {
        			switch(node.type) {
        				case 'Identifier' :
        				    func(node);
		                    break;
		                case 'Property' :
		                   checkIdentifier(node.value, func);
		                   break;
                		case 'ArrayPattern' :
                			var elements = node.elements;
                			elements.forEach(function(element) {
                				if (element) checkIdentifier(element, func);
                			});
                			break;
                		case 'ObjectPattern' :
                			var properties = node.properties;
                			properties.forEach(function(property) {
                				if (property) checkIdentifier(property, func);
                			});
                			break;
        			}
        		}
                /**
                 * @description Check if the given node is a shadow
                 * @param {Object} node The AST node
                 */
                function checkShadow(node) {
                    var env = context.env ? context.env : {};
                    env.builtin = true;
                    var tern = context.getTern();
                    var isSimplifiedCommonJS = false;
                    if (tern.file.ast && tern.file.ast.environments && tern.file.ast.environments.simplifiedCommonJS){
                    	isSimplifiedCommonJS = true;
                	}
                    switch(node.type) {
                        case 'VariableDeclarator': {
                        	checkIdentifier(node.id, function(node) {
                        		var name = node.name;
								if(name && env[Finder.findESLintEnvForMember(name)]) {
		                        	context.report(node, ProblemMessages['no-shadow-global'], {0: name});
		                    	}
		                    });
                        	break;
                        }
                        case 'FunctionExpression':
                        case 'FunctionDeclaration':
                        case 'ArrowFunctionExpression': {
                            node.params.forEach(function(param) {
                            	if (isSimplifiedCommonJS && (param.name === 'require' || param.name === 'exports' || param.name === 'module')){
                            		return;
                            	}
                                if(param.type === 'Identifier' && env[Finder.findESLintEnvForMember(param.name)]) {
                                    context.report(param, ProblemMessages['no-shadow-global-param'], {0: param.name, nls:'no-shadow-global-param'}); //$NON-NLS-1$
                                }
                            });
                            break;
                        }
                    }
                }

                return {
                    'FunctionExpression': checkShadow,
                    'FunctionDeclaration': checkShadow,
                    'ArrowFunctionExpression': checkShadow,
                    'VariableDeclarator': checkShadow
                };
        },
        /** @callback */
		'no-sparse-arrays': function(context) {
        		return {
        			/* @callback */
        			'ArrayExpression' : function(node){
        			    if(node.elements.indexOf(null) > -1) {
        			        context.report(node, ProblemMessages['no-sparse-arrays']);
        			    }
        			}
        		};
        },
        /** @callback */
        "no-throw-literal": function(context) {
                return {
                	/* @callback */
                    "ThrowStatement": function(node) {
                        var argument = node.argument;
                        // We have no type analysis yet, so to avoid false positives, assume any expr that
                        // *could* generate an Error actually does.
                        switch (argument.type) {
                            case "Identifier":
                                if (argument.name !== "undefined") {
                                    return;
                                }
                            //$FALLTHROUGH$
                            case "Literal":
                            case "ObjectExpression":
                            case "ArrayExpression":
                                context.report(argument, ProblemMessages['no-throw-literal']);
                        }
                    }
                };
        },
        /** @callback */
		"no-undef": function(context) {
				/**
				 * @description Checks if the node is a recovered node
				 * @param {Object} node The AST node
				 * @returns {Boolean} If the node is recovered
				 */
				function isRecoveredNode(node) {
					return node.range && node.range[0] === node.range[1];
				}
                /**
                 * @description If any of the variables defs are ImplicitGlobalVariable
                 * @param {Object} variable The variable
                 * @returns {Boolean} if any of the variable defs are ImplicitGlobalVariable
                 */
                function isImplicitGlobal(variable) {
                    return variable.defs.every(function(def) {
                        return def.type === "ImplicitGlobalVariable";
                    });
                }
                /**
                 * @description description
                 * @param scope
                 * @param ref
                 * @returns returns
                 */
                function getDeclaredGlobalVariable(scope, ref) {
                    var declaredGlobal = null;
                    scope.variables.some(function(variable) {
                        if (variable.name === ref.identifier.name) {
                            // If it's an implicit global, it must have a `writeable` field (indicating it was declared)
                            if (!isImplicitGlobal(variable) || Object.hasOwnProperty.call(variable, "writeable")) {  //$NON-NLS-0$
                                declaredGlobal = variable;
                                return true;
                            }
                        }
                        return false;
                    });
                    return declaredGlobal;
                }

                return {
                	/* @callback */
                    "Program": function(node) {
        	            var globalScope = context.getScope();

        	            globalScope.through.forEach(function(ref) {
    	            	    if (isRecoveredNode(ref.identifier)) {
    	            	    	return;
    	            	    }
        	                var variable = getDeclaredGlobalVariable(globalScope, ref),
        	                    name = ref.identifier.name;
        	                if (!variable) {
        	                	// Check if Tern knows about a definition in another file
        	                	var env = Finder.findESLintEnvForMember(name);
        	                    var tern = context.getTern();
								var query = {end: ref.identifier.start};
								var foundType = null;
								var expr = tern.findQueryExpr(tern.file, query);
								if (!expr) {
									return;
								}
								var type = tern.findExprType(query, tern.file, expr);
								// The origin could be a primitive in the same file (a=1;) which we still want to mark
								if (type && (type.originNode || Array.isArray(type.types) && type.types.length > 0) && type.origin && type.origin !== tern.file.name){
									foundType = type;
								}
            	                if (!foundType){
            	                    var inenv = env ? '-inenv' : ''; //$NON-NLS-1$
            	                    var nls = 'no-undef-defined'; //$NON-NLS-1$
            	                    context.report(ref.identifier, ProblemMessages['no-undef-defined'], {0:name, nls: nls, pid: nls+inenv, data: name});
        	                    }
        	                }
        	            });
                    }
                };
        },
        /** @callback */
        'no-undef-expression': function(context){
			return {
				/* @callback */
				'MemberExpression': function(node){
					if (node.property && node.object && node.object.type !== 'ThisExpression'){
						if (node.parent && node.parent.type === 'CallExpression' && node.parent.callee && node.parent.callee === node){
							var propName = node.property.name ? node.property.name : node.property.value;
							if (!propName) {
								return;
							}
							var query = {start: node.property.start, end: node.property.end};
							var tern = context.getTern();
							var expr = tern.findQueryExpr(tern.file, query);
							if (!expr) {
								// no expression found. No need to look for the type
								return;
							}
							var type = tern.findExprType(query, tern.file, expr);
							if (type && type.propertyOf) {
								if(type.guess) {
									return;
								}
								if(type.propertyOf.props[propName]) {
									//if we found a type and its a direct property, quit
									return;
								}
								if(!type.propertyOf.proto) {
									//this is a stub type - i.e. from a JSDoc type that does not exist
									return;
								}
							}
							query.end = node.object.end;
	                		expr = tern.findQueryExpr(tern.file, query);
							if (!expr) {
								// no expression found so we cannot get the type
								return;
							}
	                		type = tern.findExprType(query, tern.file, expr);
							if (type && type.types && type.types.length > 0 && !type.guess) {
	                			for (var i = 0; i < type.types.length; i++) {
	                				if (type.types[i].props && type.types[i].props[propName]) {
	                					return;
	                				}
	                				if (type.types[i].proto && type.types[i].proto.name !== 'Object.prototype') {
	                					if(type.types[i].proto.props[propName]) {
	                						return;
	                					}
            						}
	                			}
            					var name = type.types[0].name;
            					if (!name && type.originNode){
            						name = type.originNode.name;
        						}
            					var origin = type.types[0].origin;
            					if (!origin && type.origin){
            						origin = type.origin;
            					}
                				if (type.types.length === 1 && name && origin){
                					if(name.indexOf("!known_modules.") === 0) { //$NON-NLS-1$
                						name = name.slice("!known_modules.".length);
                					}
                					if (/\./.test(origin)){
            							var originNode = type.types[0].originNode ? type.types[0].originNode : type.originNode;
            							if (originNode){
                							var index = origin.lastIndexOf('/');
                							if (index >= 0){
                								origin = origin.substring(index+1);
                							}
											context.report(node.property, ProblemMessages['no-undef-expression-defined-object'], {0:propName, 1: name, 2: origin, nls: 'no-undef-expression-defined-object', data: {file: originNode.sourceFile.name, start: originNode.start, end: originNode.end}}); //$NON-NLS-1$
										} else {
											context.report(node.property, ProblemMessages['no-undef-expression-defined'], {0:propName, nls: 'no-undef-expression-defined'}); //$NON-NLS-1$
										}
									} else {
										context.report(node.property, ProblemMessages['no-undef-expression-defined-index'], {0:propName, 1: name, 2: origin, nls: 'no-undef-expression-defined-index'}); //$NON-NLS-1$
									}
								} else {
									context.report(node.property, ProblemMessages['no-undef-expression-defined'], {0:propName, nls: 'no-undef-expression-defined'}); //$NON-NLS-1$
								}
	                		}
                		}
                	}
            	}
        	};
        },
        /* @callback */
        'no-undef-init': function(context) {
        		return {
        			/* @callback */
        			'VariableDeclarator': function(node) {
        				if(node.init && node.init.type === 'Identifier' && node.init.name === 'undefined') {
    						context.report(node.init, ProblemMessages['no-undef-init']);
        				}
        			}
        		};
        },
		/** @callback */
		'no-unreachable': function(context) {
			var currentCodePath = null;
			/**
			 * Checks whether or not a given variable declarator has the initializer.
			 * @param {ASTNode} node - A VariableDeclarator node to check.
			 * @returns {boolean} `true` if the node has the initializer.
			 */
			function isInitialized(node) {
				return Boolean(node.init);
			}

			/**
			 * Checks whether or not a given code path segment is unreachable.
			 * @param {CodePathSegment} segment - A CodePathSegment to check.
			 * @returns {boolean} `true` if the segment is unreachable.
			 */
			function isUnreachable(segment) {
				return !segment.reachable;
			}
			
			/**
			 * Reports a given node if it's unreachable.
			 * @param {ASTNode} node - A statement node to report.
			 * @returns {void}
			 */
			function reportIfUnreachable(node) {
				if (currentCodePath.currentSegments.every(isUnreachable)) {
					context.report(node, ProblemMessages['no-unreachable']);
				}
			}

			return {

				// Manages the current code path.
				onCodePathStart: function(codePath) {
					currentCodePath = codePath;
				},

				onCodePathEnd: function() {
					currentCodePath = currentCodePath.upper;
				},

				// Registers for all statement nodes (excludes FunctionDeclaration).
				BlockStatement: reportIfUnreachable,
				BreakStatement: reportIfUnreachable,
				ClassDeclaration: reportIfUnreachable,
				ContinueStatement: reportIfUnreachable,
				DebuggerStatement: reportIfUnreachable,
				DoWhileStatement: reportIfUnreachable,
				EmptyStatement: reportIfUnreachable,
				ExpressionStatement: reportIfUnreachable,
				ForInStatement: reportIfUnreachable,
				ForOfStatement: reportIfUnreachable,
				ForStatement: reportIfUnreachable,
				IfStatement: reportIfUnreachable,
				ImportDeclaration: reportIfUnreachable,
				LabeledStatement: reportIfUnreachable,
				ReturnStatement: reportIfUnreachable,
				SwitchStatement: reportIfUnreachable,
				ThrowStatement: reportIfUnreachable,
				TryStatement: reportIfUnreachable,

				VariableDeclaration: function(node) {
					if (node.kind !== "var" || node.declarations.some(isInitialized)) {
						// if it has an initialization, this means the variable is not hoisted.
						reportIfUnreachable(node);
					}
				},

				WhileStatement: reportIfUnreachable,
				WithStatement: reportIfUnreachable,
				ExportNamedDeclaration: reportIfUnreachable,
				ExportDefaultDeclaration: reportIfUnreachable,
				ExportAllDeclaration: reportIfUnreachable
			};
		},
		/** @callback */
		"no-unused-params" : function(context) {
                /**
                 * @description If the node has an @callback comment
                 * @param {Object} node The AST node
                 * @returns {Boolean} If the node has an @callback comment
                 */
                function hasCallbackComment(node) {
                    if(node && node.leadingComments) {
                        var len = node.leadingComments.length;
                        for(var i = 0; i < len; i++) {
                            var comment = node.leadingComments[i];
                            if (comment.type === 'Block' && /\s*(?:@(callback|public))\s+/.test(comment.value)) {
                                return true;
                            }
                        }
                    }
                    return false;
                }

        		/**
		         * @description Check the given AST node 
		         * @param {Object} node The AST node
		         */
		        function check(node) {
    				var scope = context.getScope();
    				var kids = scope.childScopes;
    				if(scope.functionExpressionScope && kids && kids.length) {
    					scope = kids[0];
    				}
    				scope.variables.forEach(function(variable) {
    					if (!variable.defs.length || variable.defs[0].type !== "Parameter") { // only care about parameters
    						return;
    					}
    					var defnode = variable.defs[0].name;
    					if (!variable.references.length) {
    					    var pid = 'no-unused-params'; //$NON-NLS-1$
    					    if(node.type === 'FunctionExpression') {
    					        pid += '-expr'; //$NON-NLS-1$
    					        if(hasCallbackComment(node) || node.params && node.params.length > 0 && hasCallbackComment(node.params[0])) {
    					            return;
    					        }
    					        var parent = node.parent;
    					        switch(parent.type) {
    					        	case 'Property': {
    					        		if(hasCallbackComment(parent) || hasCallbackComment(parent.key)) {
    					        			return;
    					        		}
    					        		break;
    					        	}
    					        	case 'MemberExpression': {
        					        	//https://bugs.eclipse.org/bugs/show_bug.cgi?id=457067
        					            // func epxrs part of call expressions, i.e. bind-like calls
        					            //Esprima tags the root containing expression with the doc, not the func expr
        					            parent = parent.parent;
        					            if(parent.type === 'CallExpression' && hasCallbackComment(parent)) {
        					               return;
        					            }
    					        		break;
    					        	}
    					        	case 'AssignmentExpression': {
    					        		var left = parent.left;
        					        	if(left.type === 'MemberExpression') {
        					        		if(hasCallbackComment(left)) {
        					        			return;
        					        		}
        					        	} else if(left.type === 'Identifier') {
        					        		if(hasCallbackComment(left)) {
        					        			return;
        					        		}
        					        	}
        					        	parent = parent.parent;
        					        	if (parent && parent.type === "ExpressionStatement") {
        					        		if (hasCallbackComment(parent)) {
        					        			return;
        					        		}
        					        	}
    					        		break;
    					        	}
    					        	case 'VariableDeclarator': {
    					        		if(hasCallbackComment(parent.id) || hasCallbackComment(parent)) {
    					        			return;
    					        		}
    					        		parent = parent.parent;
    					        		if (parent && parent.type === "VariableDeclaration") {
    					        			if(hasCallbackComment(parent)) {
    					        				return;
    					        			}
    					        		}
    					        		break;
    					        	}
    					        }
    					    } else if(node.type === 'ArrowFunctionExpression') {
    					    	pid += '-arrow'; //$NON-NLS-1$
    					    	/*
					        	//check the parent: () => {a => {}}
					        	//the comment is attached to the ExpressionStatement
					        	if(node.parent.type === 'ExpressionStatement' && hasCallbackComment(node.parent)) {
					        		return;
					        	}
    					        */
    					    }
    						context.report(defnode, ProblemMessages['no-unused-params'], {0:defnode.name, pid: pid}); //$NON-NLS-0
    					}
    				});
        		}

        		return {
        			"FunctionDeclaration": check,
        			"FunctionExpression": check,
        			"ArrowFunctionExpression": check
        		};
        },
        /** @callback */
		"no-unused-vars": function(context) {
			//ORION - this is the rule soure from eslint - but kept in place
	        var config = {
	            vars: "all",
	            args: "none",
	            caughtErrors: "none"
	        };
	        var firstOption = context.options[0];
	        if (firstOption) {
	            if (typeof firstOption === "string") {
	                config.vars = firstOption;
	            } else {
	                config.vars = firstOption.vars || config.vars;
	                config.args = firstOption.args || config.args;
	                config.caughtErrors = firstOption.caughtErrors || config.caughtErrors;
	
	                if (firstOption.varsIgnorePattern) {
	                    config.varsIgnorePattern = new RegExp(firstOption.varsIgnorePattern);
	                }
	
	                if (firstOption.argsIgnorePattern) {
	                    config.argsIgnorePattern = new RegExp(firstOption.argsIgnorePattern);
	                }
	
	                if (firstOption.caughtErrorsIgnorePattern) {
	                    config.caughtErrorsIgnorePattern = new RegExp(firstOption.caughtErrorsIgnorePattern);
	                }
	            }
	        }
	        var STATEMENT_TYPE = /(?:Statement|Declaration)$/;
	        /**
	         * Determines if a given variable is being exported from a module.
	         * @param {Variable} variable - EScope variable object.
	         * @returns {boolean} True if the variable is exported, false if not.
	         * @private
	         */
	        function isExported(variable) {
	            var definition = variable.defs[0];
	            if (definition) {
	                var node = definition.node;
	                if (node.type === "VariableDeclarator") {
	                    node = node.parent;
	                } else if (definition.type === "Parameter") {
	                    return false;
	                }
	                return node.parent.type.indexOf("Export") === 0;
	            }
	            return false;
	        }
	        /**
	         * Determine if an identifier is referencing an enclosing function name.
	         * @param {Reference} ref - The reference to check.
	         * @param {ASTNode[]} nodes - The candidate function nodes.
	         * @returns {boolean} True if it's a self-reference, false if not.
	         * @private
	         */
	        function isSelfReference(ref, nodes) {
	            var scope = ref.from;
	            while (scope) {
	                if (nodes.indexOf(scope.block) >= 0) {
	                    return true;
	                }
	                scope = scope.upper;
	            }
	            return false;
	        }
	
	        /**
	         * Checks the position of given nodes.
	         *
	         * @param {ASTNode} inner - A node which is expected as inside.
	         * @param {ASTNode} outer - A node which is expected as outside.
	         * @returns {boolean} `true` if the `inner` node exists in the `outer` node.
	         */
	        function isInside(inner, outer) {
	            return (
	                inner.range[0] >= outer.range[0] &&
	                inner.range[1] <= outer.range[1]
	            );
	        }
	        /**
	         * If a given reference is left-hand side of an assignment, this gets
	         * the right-hand side node of the assignment.
	         *
	         * @param {escope.Reference} ref - A reference to check.
	         * @param {ASTNode} prevRhsNode - The previous RHS node.
	         * @returns {ASTNode} The RHS node.
	         */
	        function getRhsNode(ref, prevRhsNode) {
	            var id = ref.identifier;
	            var prnt = id.parent;
	            var granpa = prnt.parent;
	            var refScope = ref.from.variableScope;
	            var varScope = ref.resolved.scope.variableScope;
	            var canBeUsedLater = refScope !== varScope;
	            /*
	             * Inherits the previous node if this reference is in the node.
	             * This is for `a = a + a`-like code.
	             */
	            if (prevRhsNode && isInside(id, prevRhsNode)) {
	                return prevRhsNode;
	            }
	
	            if (prnt.type === "AssignmentExpression" &&
	                granpa.type === "ExpressionStatement" &&
	                id === prnt.left &&
	                !canBeUsedLater
	            ) {
	                return prnt.right;
	            }
	            return null;
	        }
	
	        /**
	         * Checks whether a given function node is stored to somewhere or not.
	         * If the function node is stored, the function can be used later.
	         *
	         * @param {ASTNode} funcNode - A function node to check.
	         * @param {ASTNode} rhsNode - The RHS node of the previous assignment.
	         * @returns {boolean} `true` if under the following conditions:
	         *      - the funcNode is assigned to a variable.
	         *      - the funcNode is bound as an argument of a function call.
	         *      - the function is bound to a property and the object satisfies above conditions.
	         */
	        function isStorableFunction(funcNode, rhsNode) {
	            var node = funcNode;
	            var prnt = funcNode.parent;
	            while (prnt && isInside(prnt, rhsNode)) {
	                switch (prnt.type) {
	                    case "SequenceExpression":
	                        if (prnt.expressions[prnt.expressions.length - 1] !== node) {
	                            return false;
	                        }
	                        break;
	
	                    case "CallExpression":
	                    case "NewExpression":
	                        return prnt.callee !== node;
	
	                    case "AssignmentExpression":
	                    case "TaggedTemplateExpression":
	                    case "YieldExpression":
	                        return true;
	
	                    default:
	                        if (STATEMENT_TYPE.test(prnt.type)) {
	                            /*
	                             * If it encountered statements, this is a complex pattern.
	                             * Since analyzeing complex patterns is hard, this returns `true` to avoid false positive.
	                             */
	                            return true;
	                        }
	                }
	                node = prnt;
	                prnt = prnt.parent;
	            }
	            return false;
	        }
	
			function getUpperFunction(node) {
			    while (node) {
			        if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") {
			            return node;
			        }
			        node = node.parent;
			    }
			    return null;
			}
	
	        /**
	         * Checks whether a given Identifier node exists inside of a function node which can be used later.
	         *
	         * "can be used later" means:
	         * - the function is assigned to a variable.
	         * - the function is bound to a property and the object can be used later.
	         * - the function is bound as an argument of a function call.
	         *
	         * If a reference exists in a function which can be used later, the reference is read when the function is called.
	         *
	         * @param {ASTNode} id - An Identifier node to check.
	         * @param {ASTNode} rhsNode - The RHS node of the previous assignment.
	         * @returns {boolean} `true` if the `id` node exists inside of a function node which can be used later.
	         */
	        function isInsideOfStorableFunction(id, rhsNode) {
	            var funcNode = getUpperFunction(id);
	            return (
	                funcNode &&
	                isInside(funcNode, rhsNode) &&
	                isStorableFunction(funcNode, rhsNode)
	            );
	        }
	
	        /**
	         * Checks whether a given reference is a read to update itself or not.
	         *
	         * @param {escope.Reference} ref - A reference to check.
	         * @param {ASTNode} rhsNode - The RHS node of the previous assignment.
	         * @returns {boolean} The reference is a read to update itself.
	         */
	        function isReadForItself(ref, rhsNode) {
	            var id = ref.identifier;
	            var prnt = id.parent;
	            var granpa = prnt.parent;
	
	            return ref.isRead() && (
	                // self update. e.g. `a += 1`, `a++`
	                (
	                    prnt.type === "AssignmentExpression" &&
	                    granpa.type === "ExpressionStatement" &&
	                    prnt.left === id
	                ) ||
	                (
	                    prnt.type === "UpdateExpression" &&
	                    granpa.type === "ExpressionStatement"
	                ) ||
	                // in RHS of an assignment for itself. e.g. `a = a + 1`
	                (
	                    rhsNode &&
	                    isInside(id, rhsNode) &&
	                    !isInsideOfStorableFunction(id, rhsNode)
	                )
	            );
	        }
	
	        /**
	         * Determine if an identifier is used either in for-in loops.
	         *
	         * @param {Reference} ref - The reference to check.
	         * @returns {boolean} whether reference is used in the for-in loops
	         * @private
	         */
	        function isForInRef(ref) {
	            var target = ref.identifier.parent;
	            // "for (var ...) { return; }"
	            if (target.type === "VariableDeclarator") {
	                target = target.parent.parent;
	            }
	
	            if (target.type !== "ForInStatement") {
	                return false;
	            }
	
	            // "for (...) { return; }"
	            if (target.body.type === "BlockStatement") {
	                target = target.body.body[0];
	
	            // "for (...) return;"
	            } else {
	                target = target.body;
	            }
	
	            // For empty loop body
	            if (!target) {
	                return false;
	            }
	
	            return target.type === "ReturnStatement";
	        }
	
	        /**
	         * Determines if the variable is used.
	         * @param {Variable} variable - The variable to check.
	         * @returns {boolean} True if the variable is used
	         * @private
	         */
	        function isUsedVariable(variable) {
	            var functionNodes = variable.defs.filter(function(def) {
	                    return def.type === "FunctionName";
	                }).map(function(def) {
	                    return def.node;
	                }),
	                isFunctionDefinition = functionNodes.length > 0,
	                rhsNode = null;
	
	            return variable.references.some(function(ref) {
	                if (isForInRef(ref)) {
	                    return true;
	                }
	
	                var forItself = isReadForItself(ref, rhsNode);
	
	                rhsNode = getRhsNode(ref, rhsNode);
					variable.isread = variable.isread || ref.isRead();
	                return (
	                    ref.isRead() &&
	                    !forItself &&
	                    !(isFunctionDefinition && isSelfReference(ref, functionNodes))
	                ) || (ref.isRead() && forItself);
	            });
	        }
	
	        /**
	         * Gets an array of variables without read references.
	         * @param {Scope} scope - an escope Scope object.
	         * @param {Variable[]} unusedVars - an array that saving result.
	         * @returns {Variable[]} unused variables of the scope and descendant scopes.
	         * @private
	         */
	        function collectUnusedVariables(scope, unusedVars) {
	            var variables = scope.variables;
	            var childScopes = scope.childScopes;
	            var i, l;
	            if (scope.type !== "TDZ" && (scope.type !== "global" || config.vars === "all")) {
	                for (i = 0, l = variables.length; i < l; ++i) {
	                    var variable = variables[i];
	
	                    // skip a variable of class itself name in the class scope
	                    if (scope.type === "class" && scope.block.id === variable.identifiers[0]) {
	                        continue;
	                    }
	
	                    // skip function expression names and variables marked with markVariableAsUsed()
	                    if (scope.functionExpressionScope || variable.eslintUsed) {
	                        continue;
	                    }
	
	                    // skip implicit "arguments" variable
	                    if (scope.type === "function" && variable.name === "arguments" && variable.identifiers.length === 0) {
	                        continue;
	                    }
	
	                    // explicit global variables don't have definitions.
	                    var def = variable.defs[0];
	
	                    if (def) {
	                        var type = def.type;
	                        // skip catch variables
	                        if (type === "CatchClause") {
	                            if (config.caughtErrors === "none") {
	                                continue;
	                            }
	
	                            // skip ignored parameters
	                            if (config.caughtErrorsIgnorePattern && config.caughtErrorsIgnorePattern.test(def.name.name)) {
	                                continue;
	                            }
	                        }
	                        if (type === "Parameter") {
	                            // skip any setter argument
	                            if (def.node.parent.type === "Property" && def.node.parent.kind === "set") {
	                                continue;
	                            }
	
	                            // if "args" option is "none", skip any parameter
	                            if (config.args === "none") {
	                                continue;
	                            }
	
	                            // skip ignored parameters
	                            if (config.argsIgnorePattern && config.argsIgnorePattern.test(def.name.name)) {
	                                continue;
	                            }
	
	                            // if "args" option is "after-used", skip all but the last parameter
	                            if (config.args === "after-used" && def.index < def.node.params.length - 1) {
	                                continue;
	                            }
	                        } else {
	                            // skip ignored variables
	                            if (config.varsIgnorePattern && config.varsIgnorePattern.test(def.name.name)) {
	                                continue;
	                            }
	                        }
	                        if (def.node.type === 'VariableDeclarator') {
				        		// Variables can be marked as 'exported' in a comment if they are used as global variables
								var comments = def.parent.leadingComments;
								var report = true;
								if (Array.isArray(comments)) {
									for (var k = 0, len = comments.length; k < len; k++) {
										if (comments[k].type === "Block" && comments[k].value.toLowerCase().indexOf('exported') >= 0){ //$NON-NLS-1$
											report = false;
											break;
										}
									}
								}
								if (!report) {
									continue;
								}
							}
	                    }
	                    if (!isUsedVariable(variable) && !isExported(variable)) {
	                    	if(def) {
	                    		type = def.type;
	                    		variable.data = {
		                    		0: variable.identifiers[0].name,
		                    		nls: 'no-unused-vars-unused',
		                    		pid: 'no-unused-vars-unused'
		                    	};
		                    	if(type === "Parameter") {
		                    		continue;
		                    	}
		                    	if(type === "ImportBinding") {
		                    		variable.data.pid = 'no-unused-vars-import';
		                    	} else if(def.node.type === "FunctionDeclaration") {
		                    		var tern = context.getTern();
		                    		var refQuery = {
		                    			end: def.node.id.start
		                    		};
		                    		var filename = tern.file.name;
		                    		var refs = tern.findRefs(refQuery, tern.file);
		                    		var result = [];
		                    		if (refs && Array.isArray(refs.refs)) {
		                    			// filtering the refs from the current file - remove the one that matches the current node
		                    			refs.refs.forEach(function(match) {
		                    				if (match.file !== filename) {
		                    					// any match in a different file is a good match
		                    					result.push(match);
		                    				}
		                    			});
		                    		}
		                    		if (result.length > 0) {
		                    			continue;
		                    		}
		                    		variable.data.pid = variable.data.nls = 'no-unused-vars-unused-funcdecl';
		                    	} else if(typeof variable.isread === "boolean" && !variable.isread) {
		                    		variable.data.pid = variable.data.nls = 'no-unused-vars-unread';
		                    	}
	                    	}
	                        unusedVars.push(variable);
	                    }
	                }
	            }
	            for (i = 0, l = childScopes.length; i < l; ++i) {
	                collectUnusedVariables(childScopes[i], unusedVars);
	            }
	            return unusedVars;
	        }
	
	        return {
	            "Program:exit": function() {
	                var unusedVars = collectUnusedVariables(context.getScope(), []);
	
	                for (var i = 0, l = unusedVars.length; i < l; ++i) {
	                    var unusedVar = unusedVars[i];
						if (unusedVar.defs.length > 0) {
	                        context.report({
	                            node: unusedVar.identifiers[0],
	                            message: ProblemMessages[unusedVar.data.nls],
	                            data: unusedVar.data
	                        });
	                    }
	                }
	            }
	        };
        },
        /** @callback */
		"no-use-before-define": function(context) {
                /**
                 * @description Checks the option to make sure its a boolean, if not return the default
                 * @param {Boolean|Any} b The option to check
                 * @param {Boolean} defaultValue The default to return if the option is not of type boolean
                 * @returns {Boolean} The given option or the default, if the option is not a boolean
                 */
                function booleanOption(b, defaultValue) {
            		return typeof b === "boolean" ? b : defaultValue;
            	}

        		var options = context.options,
        		    flag_vars = booleanOption(options[0], true),   // by default, flag vars
        		    flag_funcs = booleanOption(options[1], false), // ... but not funcs
        		    flag_classes = booleanOption(options[2], true); // flag classes
        		
		        function checkScope(scope) {
    				scope.references.forEach(function(ref) {
    					var decl = util.getDeclaration(ref, scope), identifier = ref.identifier, name = identifier.name, defs;
    					if (decl && (defs = decl.defs).length && identifier.range[0] < defs[0].node.range[0]) {
    						var defType = defs[0].type;
    						if ((!flag_funcs && defType === "FunctionName") || (!flag_vars && defType === "Variable") || (!flag_classes && defType === "ClassName")) {
    							return;
    						}
    						context.report(identifier, ProblemMessages['no-use-before-define'], {0:name});
    					}
    				});
        		}
        		
        		/*
		         * @description Check the current scope for use
		         */
		        function check(node) {
    				var scope = context.getScope();
    				checkScope(scope);
    				// If using ES6 modules check the child 'module' scope
    				if (node.type === "Program" && node.sourceType === "module"){
    					checkScope(scope.childScopes[0]);
    				}
        		}
        		
        		if (context.parserOptions.ecmaVersion >= 6){
					return {
						"Program": check,
						"BlockStatement": check,
						"SwitchStatement": check,
						"ArrowFunctionExpression": function(node){
							if (node.body.type !== "BlockStatement") {
			                    check(node);
			                }	
						}
					};
				}
				// ECMA 5
				return {
					"Program": check,
					"FunctionExpression": check,
					"FunctionDeclaration": check,
					"ArrowFunctionExpression": check
				};

        },
        /** @callback */
        "radix": function(context) {
                return {
                	/* @callback */
                    "CallExpression": function(call) {
	                    var callee = call.callee;
	                    if (callee.name === "parseInt" && callee.type === "Identifier" && call.arguments.length < 2) {
	                        // Ensure callee actually resolves to the global `parseInt`
	                        var shadowed = false;
	                        for (var scope = context.getScope(); scope; scope = scope.upper) {
	                            shadowed = scope.variables.some(function(variable) {
	                                // Found a `parseInt` that is not the builtin
	                                return variable.name === "parseInt" && variable.defs.length;
	                            });
	                            if (shadowed) {
	                                break;
	                            }
	                        }
	                        if (!shadowed) {
	                            context.report(callee, ProblemMessages['radix'], null);
	                        }
	                    }
	                }
                };
        },
        /** @callback */
		"no-mixed-spaces-and-tabs": function(context) {
				var ignoredLocations = [];
				// we define a regular expression that matches any line that starts with spaces after tabs before any other character
				// any space after a tab \            (not a problem with smart-tabs)
				//                        after any number of tabs or space at the beginning of the line (^)
				// any tab after a space /
				var lineStart = /^(?=[\t ]* \t)/; // smart-tabs enabled
				//var lineStart = /^(?=[\t ]*( \t|\t ))/; // smart-tabs disabled
				//var lineStart = /^(?:<script>)*(?=[\t ]* \t)/; // include <script> at start of line
				/**
				 * @description Check the Program node in the AST (the whole AST)
				 * @param {Object} node The AST node
				 */
				function checkProgram(node) {
					var lines = context.getSourceLines();
					var allComments = context.getAllComments();
					
					// add all comments to the ignored elements
					allComments.forEach(function(node) {
						ignoredLocations.push(node.loc);
					});
					
					// now we check if the lines starts with a mix of tabs and spaces
					lines.forEach(function(line, index) {
						var match = lineStart.exec(line);
						if (match !== null) {
							// we got a match on the corresponding line
							// we need to see if the match is within an existing comment or a literal
							var currentLine = index + 1; // index is 0-based
							var currentColumn = match.index + 1; // column is 1-based
							if (searchInsideComments(ignoredLocations, { line: currentLine, column: currentColumn}) !== null) {
								// the position is inside a comment so we ignore it - move to the next one
								return;
							}
							context.report(node, { line: currentLine, column: currentColumn}, ProblemMessages['no-mixed-spaces-and-tabs']);
						}
					});
				}
				/**
				 * @description Look inside comment locations
				 * @param {Array.<Object>} locations The locations
				 * @param {Object} loc The location to check
				 * @returns {object} If a location was found
				 */
				function searchInsideComments(locations, loc) {
					var min = 0;
					var max = locations.length - 1;
					var guess;
				
					while (min <= max) {
						guess = Math.floor(min + (max - min) / 2);
				
						var currentLocation = locations[guess];
						if (isLocationInside(loc, currentLocation)) {
							return currentLocation;
						}
						else if (isBefore(loc, currentLocation)) {
							max = guess - 1;
						} else {
							min = guess + 1;
						}
					}
					return null;
				}
				/**
				 * @description If the given location is inside one of the locations
				 * @param {Object} givenLocation The location to check
				 * @param {Array.<Object>} locations The array of locations
				 * @returns {Boolean} If the given location is in one of the locations in the array
				 */
				function isLocationInside(givenLocation, locations) {
					/**
					 * Return true if the given location is inside the locations, false otherwise 
					 */
					var start = locations.start;
					var end = locations.end;
					var line = givenLocation.line;
					var column = givenLocation.column;
					
					if (start.line < line) {
						if (end.line > line) {
							return true;
						} else if (end.line === line) {
							return end.column > column;
						}
					} else if (start.line === line) {
						if (start.column < column) {
							if (end.line > line) {
								return true;
							} else if (end.line === line) {
								return end.column > column;
							}
						}
					}
					return false;
				}
				/**
				 * @description If the given location is before ny in the array
				 * @param {Object} givenLocation The location to check
				 * @param {Array.<Object>} locations The array of locations
				 * @returns {Boolean} If the given location is before any in the array
				 */
				function isBefore(givenLocation, locations) {
					/**
					 * Return true if the given location is before locations
					 */
					var start = locations.start;
					var line = givenLocation.line;
					var column = givenLocation.column;
					
					if (line < start.line) {
						return true;
					} else if (line === start.line) {
						return column < start.column;
					}
					return false;
				}

				return {
					"Program:exit": checkProgram
				};
		},
		/** @callback */
		"semi": function(context) {

			var OPT_OUT_PATTERN = /[\[\(\/\+\-]/; // One of [(/+-
			var options = context.options[1];
			var never = context.options[0] === "never",
				exceptOneLine = options && options.omitLastInOneLineBlock === true,
				sourceCode = context.getSourceCode();

			//--------------------------------------------------------------------------
			// Helpers
			//--------------------------------------------------------------------------

			/**
			 * Reports a semicolon error with appropriate location and message.
			 * @param {ASTNode} node The node with an extra or missing semicolon.
			 * @param {boolean} missing True if the semicolon is missing.
			 * @returns {void}
			 */
			function report(node, missing) {
				var message,
					lastToken = sourceCode.getLastToken(node),
					data = Object.create(null);

				if (!missing) {
					message = ProblemMessages["semi-missing"];
					data.kind = "missing"; //$NON-NLS-1$
				} else {
					message = ProblemMessages["semi-extra"];
					data.kind = "extra"; //$NON-NLS-1$
				}

				context.report(node, message, {data: data}, lastToken);
			}
			/**
			 * Checks whether a token is a semicolon punctuator.
			 * @param {Token} token The token.
			 * @returns {boolean} True if token is a semicolon punctuator.
			 */
			function isSemicolon(token) {
				return token.type === "Punctuator" && token.value === ";";
			}

			/**
			 * Check if a semicolon is unnecessary, only true if:
			 *   - next token is on a new line and is not one of the opt-out tokens
			 *   - next token is a valid statement divider
			 * @param {Token} lastToken last token of current node.
			 * @returns {boolean} whether the semicolon is unnecessary.
			 */
			function isUnnecessarySemicolon(lastToken) {
				var isDivider, isOptOutToken, lastTokenLine, nextToken, nextTokenLine;

				if (!isSemicolon(lastToken)) {
					return false;
				}

				nextToken = sourceCode.getTokenAfter(lastToken);

				if (!nextToken) {
					return true;
				}

				lastTokenLine = lastToken.loc.end.line;
				nextTokenLine = nextToken.loc.start.line;
				isOptOutToken = OPT_OUT_PATTERN.test(nextToken.value);
				isDivider = nextToken.value === "}" || nextToken.value === ";";

				return (lastTokenLine !== nextTokenLine && !isOptOutToken) || isDivider;
			}

			/**
			 * Checks a node to see if it's in a one-liner block statement.
			 * @param {ASTNode} node The node to check.
			 * @returns {boolean} whether the node is in a one-liner block statement.
			 */
			function isOneLinerBlock(node) {
				var nextToken = sourceCode.getTokenAfter(node);

				if (!nextToken || nextToken.value !== "}") {
					return false;
				}

				var parent = node.parent;

				return parent && parent.type === "BlockStatement" &&
					parent.loc.start.line === parent.loc.end.line;
			}

			/**
			 * Checks a node to see if it's followed by a semicolon.
			 * @param {ASTNode} node The node to check.
			 * @returns {void}
			 */
			function checkForSemicolon(node) {
				var lastToken = sourceCode.getLastToken(node);

				if (never) {
					if (isUnnecessarySemicolon(lastToken)) {
						report(node, true);
					}
				} else {
					if (!isSemicolon(lastToken)) {
						if (!exceptOneLine || !isOneLinerBlock(node)) {
							report(node);
						}
					} else {
						if (exceptOneLine && isOneLinerBlock(node)) {
							report(node, true);
						}
					}
				}
			}

			/**
			 * Checks to see if there's a semicolon after a variable declaration.
			 * @param {ASTNode} node The node to check.
			 * @returns {void}
			 */
			function checkForSemicolonForVariableDeclaration(node) {
				var ancestors = context.getAncestors(),
					parentIndex = ancestors.length - 1,
					parent = ancestors[parentIndex];

				if ((parent.type !== "ForStatement" || parent.init !== node) &&
					(!/^For(?:In|Of)Statement/.test(parent.type) || parent.left !== node)
				) {
					checkForSemicolon(node);
				}
			}

			//--------------------------------------------------------------------------
			// Public API
			//--------------------------------------------------------------------------

			return {
				VariableDeclaration: checkForSemicolonForVariableDeclaration,
				ExpressionStatement: checkForSemicolon,
				ReturnStatement: checkForSemicolon,
				ThrowStatement: checkForSemicolon,
				DoWhileStatement: checkForSemicolon,
				DebuggerStatement: checkForSemicolon,
				BreakStatement: checkForSemicolon,
				ContinueStatement: checkForSemicolon,
				ImportDeclaration: checkForSemicolon,
				ExportAllDeclaration: checkForSemicolon,
				ExportNamedDeclaration: function(node) {
					if (!node.declaration) {
						checkForSemicolon(node);
					}
				},
				ExportDefaultDeclaration: function(node) {
					if (!/(?:Class|Function)Declaration/.test(node.declaration.type)) {
						checkForSemicolon(node);
					}
				}
			};

		},
		/** @callback */
        "unknown-require": function(context) {
			function checkImportExport(node) {
				var tern = context.getTern();
				if(!tern.pluginRunning("es_modules")) { //$NON-NLS-1$
					// create a location object to flag only the 'import' keyword
					var token = context.getFirstToken(node);
					context.report(node, ProblemMessages['esmodules-not-running'], {pid: 'unknown-require-not-running', nls: 'esmodules-not-running', data: 'es_modules'}, token); //$NON-NLS-1$ //$NON-NLS-3$ //$NON-NLS-2$
				}
			}
        	return {
				"ImportDeclaration" : checkImportExport,
				"ExportAllDeclaration" : checkImportExport,
				"ExportDefaultDeclaration" : checkImportExport,
				"ExportNamedDeclaration" : checkImportExport,
				"CallExpression": function(node) {
      				if(node.callee.name === "require") {
        				var args = node.arguments;
        				if(args.length === 1) {
        					var lib = args[0];
        					if(lib.type === "Literal") { //we don't check relative libs
        						if(typeof lib.value !== 'string' || (typeof lib.value == 'string' && !lib.value.trim())) {
        							//don't mark empty strings or non-strings
        							return;
        						}
        						if(lib.value.charAt(0) !== '.') {
	        						var tern = context.getTern();
	        						if(tern.file.ast && tern.file.ast.environments) {
	        							var envs = tern.file.ast.environments;
	        							if(envs.node && !envs.simplifiedCommonJS) {
	        								if(!tern.pluginRunning('node') && !tern.pluginRunning('commonjs')) { //$NON-NLS-1$ //$NON-NLS-2$
	        									context.report(lib, ProblemMessages['unknown-require-not-running'], {0: 'node', pid: 'unknown-require-not-running', nls: 'unknown-require-not-running', data: 'node'}); //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$
	        									return;
	        								}
	        								if(!tern.pluginRunning('commonjs')) { //$NON-NLS-1$
	        									context.report(lib, ProblemMessages['unknown-require-not-running'], {0: 'commonjs', pid: 'unknown-require-not-running', nls: 'unknown-require-not-running', data: 'commonjs'}); //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$
	        									return;
	        								}
	        							}
	        						}
	        						if(tern.plugins[lib.value] || tern.getDef(lib.value) || tern.libKnown(lib.value)) {
	        							return;
	        						}
									//it might be a node built-in, this also confirms its in the running node def
									var nodejs = tern.getDef('node'); //$NON-NLS-1$
									if(nodejs && (nodejs[lib.value] || (nodejs['!define'] && nodejs['!define'][lib.value]))) {
										return;
									}
									//TODO check for the module having been loaded via the graph
									if(tern.optionalPlugins[lib.value]) {
										//we known about it
										context.report(lib, ProblemMessages['unknown-require-plugin'], {pid: 'unknown-require-plugin', nls: 'unknown-require-plugin', data: lib.value}); //$NON-NLS-2$ //$NON-NLS-1$
										return;
									}
									if(nodeModules[lib.value]) {
										context.report(lib, ProblemMessages['unknown-require-plugin'], {pid: 'unknown-require-plugin', nls: 'unknown-require-plugin', data: 'node'}); //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
										return;
									}
									var env = tern.getEnvFromDep(lib.value);
									if (env === 'commonjs' && envs.simplifiedCommonJS){
										context.report(lib, ProblemMessages['unknown-require'], {data: lib.value});
										return;
									}
									if(!tern.pluginRunning(env)) {
										context.report(lib, ProblemMessages['unknown-require-not-running'], {0: env, pid: 'unknown-require-not-running', nls: 'unknown-require-not-running', data: env}); //$NON-NLS-1$ //$NON-NLS-2$
									} else {
										context.report(lib, ProblemMessages['unknown-require'], {data: lib.value});
									}
	        					} else {
	        						//relative path, if Tern has it in the fileMap its known, otherwise mark it
	        						tern = context.getTern();
	        						if(!tern.hasFile(lib.value, tern.file)) {
	        							context.report(lib, ProblemMessages['unknown-require'], {data: lib.value});
	        						}
	        					}
	    					}
        				}
        			}
        		}
        	};
        },
        /** @callback */
		"use-isnan": function(context) {
        		return {
        			/* @callback */
        			'BinaryExpression' : function(node) {
        					if(node.left.type === 'Identifier' && node.left.name === 'NaN') {
        						context.report(node.left, ProblemMessages['use-isnan'], null, node.left);
        					} else if(node.right.type === 'Identifier' && node.right.name === 'NaN') {
        						context.report(node.right, ProblemMessages['use-isnan'], null, node.right);
        					}
        			}
        		};
        },
        /** @callback */
		'valid-typeof': function(context) {
        		//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof
        		var symbols = ['undefined', 'object', 'function', 'boolean', 'number', 'string', 'symbol']; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$ //$NON-NLS-5$ //$NON-NLS-6$ //$NON-NLS-7$
        		var ops = ['==', '===', '!=', '!=='];

        		return {
        			/* @callback */
        			'UnaryExpression' : function(node){
        			    if(node.operator === 'typeof') {
        			        var parent = node.parent;
        			        if(parent && parent.type === 'BinaryExpression' &&
        			            ops.indexOf(parent.operator) > -1) {
           			            var val = parent.left === node ? parent.right : parent.left;
        			            if (val.type !== 'Literal' || symbols.indexOf(val.value) < 0) {
        			                context.report(val, ProblemMessages['valid-typeof']);
        			            }
        			        }
        			    }
        			}
        		};
        },
        /**
         * @callback
         */
        'missing-requirejs': function(context) {
        	return {
        		'CallExpression': function(node) {
        			if(node.callee.name === "define") {
        				if(node.arguments.length === 1 && (node.arguments[0].type === 'FunctionExpression' || node.arguments[0].type === 'ObjectExpression')) {
        					if(!context.getTern().pluginRunning('requirejs')) { //$NON-NLS-1$
        						context.report(node.callee, ProblemMessages['missing-requirejs'], {data: 'requirejs'}); //$NON-NLS-1$
        					}
        				} else if(node.arguments.length === 3 && node.arguments[0].type === 'Literal' && typeof node.arguments[0].value === 'string' 
        							&& node.arguments[1] && node.arguments[1].type === 'ArrayExpression' && node.arguments[2].type === 'FunctionExpression') {
        					if(!context.getTern().pluginRunning('requirejs')) { //$NON-NLS-1$
        						context.report(node.callee, ProblemMessages['missing-requirejs'], {data: 'requirejs'}); //$NON-NLS-1$
        					}
        				} else if(node.arguments.length === 2 && node.arguments[0].type === 'ArrayExpression' && node.arguments[1] && node.arguments[1].type === 'FunctionExpression') {
        					if(!context.getTern().pluginRunning('requirejs')) { //$NON-NLS-1$
        						context.report(node.callee, ProblemMessages['missing-requirejs'], {data: 'requirejs'}); //$NON-NLS-1$
        					}
        				}
    				}
        		}
        	};	
        },
        // Rules consumed from ESLint 3rd party library
		'accessor-pairs': accessorPairs,
		'no-control-regex': noControlRegex,
		'no-duplicate-case': noDuplicateCase,
		'no-empty-character-class': noEmptyCharClasses,
		'no-extra-boolean-cast': noExtraBoolCast,
		'no-extra-parens': noExtraParens,
		'no-invalid-regexp': noInvalidRegExp,
		'no-negated-in-lhs': noNegatedInLhs,
		'no-obj-calls': noObjCalls,
		'no-eq-null' : noEqNull,
		'no-else-return': noElseReturn,
		'no-empty-label': noEmptyLabel,
		'no-self-compare': noSelfCompare,
		'no-irregular-whitespace': noIrregularWhitespace,
		'no-const-assign' : noConstAssign,
		/** @callback */
		'no-self-assign': function(context) {
				/**
				 * @description Check the variable declarator node for self-assignment
				 * @param {Object} variableDeclarator The AST node
				 */
				function checkVariableDeclarator(variableDeclarator) {
					var init = variableDeclarator.init;
					var id = variableDeclarator.id;
					if (init
							&& init.type === 'Identifier'
							&& id.type === 'Identifier'
							&& id.name === init.name) {
						context.report(variableDeclarator, ProblemMessages['no-self-assign'], {0: id.name, pid: 'no-self-assign', nls: 'no-self-assign'}); //$NON-NLS-1$ //$NON-NLS-2$
					}
				}
				/**
				 * @description Check the assingment expression node for self-assignment
				 * @param {Object} assignment The AST node
				 */
				function checkAssignmentExpression(assignment) {
					if (assignment.operator === '='){
						var left = assignment.left;
						var right = assignment.right;
						if (left.type === 'Identifier'
								&& right.type === 'Identifier'
								&& left.name === right.name) {
							context.report(assignment, ProblemMessages['no-self-assign'], {0: left.name, pid: 'no-self-assign', nls: 'no-self-assign'}); //$NON-NLS-1$ //$NON-NLS-2$
						}
					}
				}
				return {
					"AssignmentExpression" : checkAssignmentExpression,
					"VariableDeclarator" : checkVariableDeclarator
				};
			},
		/** @callback */
		'type-checked-consistent-return' : function(context) {
				var functions = [];
			
				//--------------------------------------------------------------------------
				// Helpers
				//--------------------------------------------------------------------------
			
				/**
				 * Marks entrance into a function by pushing a new object onto the functions
				 * stack.
				 * @returns {void}
				 * @private
				 */
				function enterFunction() {
					functions.push({});
				}
			
				/**
				 * Marks exit of a function by popping off the functions stack.
				 * @returns {void}
				 * @private
				 */
				function exitFunction() {
					functions.pop();
				}
				/**
				 * @description Try to fetch the backing type value from Tern
				 * @param {Object} node The AST node
				 * @returns {String} The name of the type of the value
				 */
				function getValue(node) {
					if (node.argument) {
						var tern = context.getTern();
						var query = {end: node.argument.start};
						var foundType = null;
						var expr = tern.findQueryExpr(tern.file, query);
						if (!expr) {
							return "undefined"; //$NON-NLS-1$
						}
						var type = tern.findExprType(query, tern.file, expr);
						if (type) {
							foundType = type;
						}
						if (foundType) {
							var typeString = foundType.toString();
							switch(typeString) {
								case "bool" :
									return "boolean"; //$NON-NLS-1$
								case "{}" :
									return "object"; //$NON-NLS-1$
								case "?" :
									return "null"; //$NON-NLS-1$
								default :
									return typeString;
							}
						}
						return "object"; //$NON-NLS-1$
					}
					return "undefined"; //$NON-NLS-1$
				}
			
				//--------------------------------------------------------------------------
				// Public
				//--------------------------------------------------------------------------
			
				return {
			
					"Program": enterFunction,
					"FunctionDeclaration": enterFunction,
					"FunctionExpression": enterFunction,
					"ArrowFunctionExpression": enterFunction,
			
					"Program:exit": exitFunction,
					"FunctionDeclaration:exit": exitFunction,
					"FunctionExpression:exit": exitFunction,
					"ArrowFunctionExpression:exit": exitFunction,
					/* @callback */
					"ReturnStatement": function(node) {
						var returnInfo = functions[functions.length - 1];
						var returnTypeDefined = "type" in returnInfo;
			
						if (returnTypeDefined) {
							var typeOfReturnStatement = getValue(node);
							var storeType = returnInfo.type;
							if (storeType !== typeOfReturnStatement) {
								// "null" and "object", "string" or String" are compatible
								switch(storeType) {
									case "null" :
										if (typeOfReturnStatement !== "object" && typeOfReturnStatement !== "String" && typeOfReturnStatement !== "string") {
											context.report(node, ProblemMessages['inconsistent-return'], {type1: storeType, type2: typeOfReturnStatement});
										}
										break;
									case "String" :
									case "string" :
										if (typeOfReturnStatement !== "null") {
											context.report(node, ProblemMessages['inconsistent-return'], {type1: storeType, type2: typeOfReturnStatement});
										}
										break;
									case "object" :
										if (typeOfReturnStatement !== "null") {
											context.report(node, ProblemMessages['inconsistent-return'], {type1: storeType, type2: typeOfReturnStatement});
										}
										break;
									default:
										context.report(node, ProblemMessages['inconsistent-return'], {type1: storeType, type2: typeOfReturnStatement});
								}
							}
						} else {
							returnInfo.type = getValue(node);
						}
					}
				};
			},
		'no-void': function(context) {
			return {
				"UnaryExpression": function(node) {
					if (node.operator === "void") {
						context.report(node, ProblemMessages['no-void']);
					}
				}
			};
		},
		'no-extra-bind': noExtraBind,
		'no-implicit-coercion': noImplicitCoercion,
		'no-extend-native': noExtendNative,
		'no-lone-blocks' : noLoneBlocks,
		'quotes' : quotes,
		'yoda' : yoda,
		'no-param-reassign' : noParamReassign,
		'no-native-reassign' : noNativeReassign,
		'no-unused-expressions' : noUnusedExpressions,
		'no-invalid-this' : noInvalidThis,
		'no-trailing-spaces' : noTrailingSpaces
	};

	/**
	 * @description Map all of the callees in the given array into the obj map
	 * @private
	 * @param {Array.<Object>} arr The array of callees
	 * @param {Object} obj The map
	 */
	function _mapCallees(arr, obj) {
		for(var i = 0; i < arr.length; i++) {
			obj[arr[i]] = true;
		}
	}

	var _callees = Object.create(null);
	_mapCallees(['require', 'requirejs', 'importScripts', 'define', 'Worker', 'SharedWorker', 'addEventListener', 'RegExp', //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$ //$NON-NLS-5$ //$NON-NLS-6$ //$NON-NLS-7$ //$NON-NLS-8$
	'removeEventListener'], _callees);  //$NON-NLS-1$
    var _documentCallees = Object.create(null);
    _mapCallees(['createElement'], _documentCallees); //$NON-NLS-1$
    
    /**
     * @description Collects all the string literals and their location infos into the line mapping
     * @private
     * @param {Object} node The AST node to check
     * @param {Object} lineMap The mapping of literals and line infos
     */
    function _collectLinesWithStringLiterals(node, lineMap){
    	
    	// Create a map of line numbers to a list of literal nodes
    	if (typeof node.value === 'string' && node.value.length > 0){
    		if (node.value.toLowerCase() === 'use strict'){
    			return;
    		}
    		if(/^(?:[\.,-\/#!$%\^&\*;:{}=\-_`~()@\+\?><\[\]])$/.test(node.value)) {
    			return; //don't nag about punctuation
    		} else if(/^(?:==|!=|===|!==|=>)$/.test(node.value)) {
    			return; //don't nag about operators
    		}
    		if (node.parent){
    			switch(node.parent.type) {
    				case 'ImportDeclaration':
    				case 'MemberExpression':
    				case 'SwitchCase':
        			case 'ExportAllDeclaration' :
    				case 'UnaryExpression': {
    					return;
    				}
    				case 'BinaryExpression': {
    					if(node.parent.operator !== '+') {
    						return;
    					}
    					break;
    				}
    				case 'Property': {
    					if(node.parent.key === node) {
    						return;
    					}
						var _p = node.parent.parent.parent;
						if(_p && _p.type === 'CallExpression' && _p.callee && _p.callee.name === 'define') {
							return;
						}
    					break;
    				}
    				case 'NewExpression':
    				case 'CallExpression': {
    					var callee = node.parent.callee;
    					if(callee) {
    						if(callee.type === 'MemberExpression' && callee.property) {
    							if(callee.object && callee.object.type === "Identifier" && callee.object.name === "document" && _documentCallees[callee.property.name]) {
    								return;
    							} else if(_callees[callee.property.name]) {
	    							return;
								}
    						} else if(_callees[callee.name]) {
    							return;
    						}
    					}
    					break;
    				}
    				case 'ArrayExpression': {
    					_p = node.parent.parent;
    					if(_p.type === 'CallExpression' && (_p.callee.name === 'define' || _p.callee.name === 'require' || _p.callee.name === 'requirejs')) {
    						return;
    					}
    					break;
    				}
    			}
    		}
    		var lineNum = node.loc.end.line;
    		if (!lineMap[lineNum]){
    			lineMap[lineNum] = [];
    		}
    		lineMap[lineNum].push(node);
    	}
    }

	return {
		rules: rules
	};
});
