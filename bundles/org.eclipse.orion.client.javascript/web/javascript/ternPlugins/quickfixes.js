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
	"javascript/finder",
	"tern/lib/tern"
], function(Finder, tern) {

	tern.registerPlugin("quickfixes", /* @callback */ function(server, options) { //$NON-NLS-1$
		return {
			//no pass hooks needed
		};
	});

	tern.defineQueryType("fixes", { //$NON-NLS-1$
		takesFile: true,
		/**
		 * @callback
		 */
		run: function(server, query, file) {
			return computeFixes(query, file);
		}
	});

	var availableFixes = {
		/**
		 * @description Fix for 'radix' problem
		 * @function
		 * @callback
		 */
		"radix": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot) {
				var node = Finder.findNode(annot.start, file.ast, {parents:true});
				if(node && node.type === 'Identifier') {
					node = node.parents[node.parents.length-1];
					if(node.type === 'CallExpression' && Array.isArray(node.arguments)) {
						var arg = node.arguments[node.arguments.length-1];
						return {text: ", 10", start: arg.range[1], end: arg.range[1]}; //$NON-NLS-1$
					}
				}
			});
		},
		/**
		 * @description Fix for 'curly' problem
		 * @function
		 * @callback
		 */
		"curly": function(annotation, annotations, file) {
			var tok = Finder.findToken(annotation.start, file.ast.tokens);
			if(tok) {
				tok = file.ast.tokens[tok.index-1];
				var idx = tok.range[1],
					start = tok.range[1],
					end = annotation.end,
					lineBreak = false;
				while(idx < annotation.start) {
					if(file.ast.sourceFile.text.charAt(idx) === '\n') {
						lineBreak = true;
						break;
					}
					idx++;
				}
				var text = ' {'+ file.ast.sourceFile.text.slice(start, end); //$NON-NLS-1$
				if(lineBreak) {
					var node = Finder.findNode(annotation.start, file.ast, {parents: true});
					if(node) {
						var p = node.parents[node.parents.length-1];
						var lineStart = getLineStart(file.ast.sourceFile.text, p.range[0]);
						var ctrl = getControlStatementParent(node);
						if(ctrl) {
							//compute the offset based on the control statement start if we can
							lineStart = getLineStart(file.ast.sourceFile.text, ctrl.range[0]);
						}
						//only preserve comments and whitespace at the end of the line
						//erroneous statements should not be enclosed
						var lineEnd = getLineEnd(file.ast.sourceFile.text, end);
						var preserved = '';
						var nodes = Finder.findNodesForRange(file.ast, end, lineEnd);
						if(lineEnd > end && nodes.length < 1) {
							preserved += file.ast.sourceFile.text.slice(end, lineEnd);
							end = lineEnd;
						}
						text += preserved+'\n'+computeIndent(file.ast.sourceFile.text, lineStart, 0)+'}'; //$NON-NLS-1$
					}
				} else {
					text += ' }'; //$NON-NLS-1$
				}
				return {text: text, start: start, end: end};
			}
		},
		/**
		 * @description Fix for 'no-new-wrappers' problem
		 * @function
		 * @callback
		 */
		"no-new-wrappers": function(annotation, annotations, file) {
			var node = Finder.findNode(annotation.start, file.ast, {parents:true});
			if(node) {
				var parent = node.parents[node.parents.length-1];
				if(parent.type === 'NewExpression') {
					var tok = Finder.findToken(parent.range[0], file.ast.tokens);
					if(tok && tok.type === 'Keyword' && tok.value === 'new') {
						var text = '';
						var end = tok.range[1],
							start = tok.range[0],
							prev = file.ast.tokens[tok.index-1];
						if(prev.range[1] < tok.range[0]) {
							end = node.range[0];
							start = prev.range[1]+1;
						} else if(node.range[0] - end > 1) {
							end += node.range[0] - end - 1;
						}
						if(parent.callee.name === 'Math' || parent.callee.name === 'JSON') {
							//also get rid of the params - these two have no functional equivilent
							end = parent.range[1];
							text = parent.callee.name;
						}
						return {text: text, start: start, end: end};
					}
				}
			}
		},
		/**
		 * @description Fix for 'no-new-wrappers-literal' problem
		 * @function
		 * @callback
		 */
		"no-new-wrappers-literal": function(annotation, annotations, file) {
			var node = Finder.findNode(annotation.start, file.ast, {parents:true});
			if(node) {
				var parent = node.parents[node.parents.length-1];
				if(parent.type === 'NewExpression') {
					switch(parent.callee.name) {
						case 'Math':
						case 'JSON': {
							return {text: parent.callee.name, start: parent.range[0], end: parent.range[1]};
						}
						case 'String': {
							var s = '';
							if(parent.arguments.length > 0) {
								var str = parent.arguments[0];
								if(str.type === 'Literal') {
									s = String(str.value);
								} else if(str.type === 'Identifier') {
									if(str.name === 'undefined') {
										s = String(undefined);
									} else if(str.name === 'NaN') {
										s = String(NaN);
									} else {
										s = String(str.name);
									}
								}
							} else {
								s = String();
							}
							return {text: '"'+s.toString()+'"', start: parent.range[0], end: parent.range[1]}; //$NON-NLS-1$ //$NON-NLS-2$
						}
						case 'Number': {
							var nu;
							if(parent.arguments.length > 0) {
								var num = parent.arguments[0];
								if(num.type === 'Literal') {
									nu = Number(num.value);
								} else if(num.type === 'Identifier') {
									if(num.name === 'undefined') {
										nu = Number(undefined);
									} else if(num.name === 'NaN') {
										nu = Number(NaN);
									} else {
										nu = Number(num.name);
									}
								} else {
									nu = Number(num);
								}
							} else {
								nu = Number();
							}
							return {text: nu.toString(), start: parent.range[0], end: parent.range[1]};
						}
						case 'Boolean': {
							var b;
							if(parent.arguments.length > 0) {
								var arg = parent.arguments[0];
								if(arg.type === 'ObjectExpression') {
									b = true;
								} else if(arg.type === 'Literal') {
									b = Boolean(arg.value);
								} else if(arg.type === 'Identifier') {
									if(arg.name === 'undefined') {
										b = Boolean(undefined);
									} else if(arg.name === 'NaN') {
										b = Boolean(NaN);
									} else {
										b = Boolean(arg.name);
									}
								} else if(arg.type === 'UnaryExpression' && arg.operator === '-' &&
									arg.argument.type === 'Literal' && typeof arg.argument.value === 'number') {
									b = false;
								}
							} else {
								b = false;
							}
							return {text: b.toString(), start: parent.range[0], end: parent.range[1]};
						}
					}
				}
			}
		},
		/**
		 * @description Fix for 'no-debugger' problem
		 * @function
		 * @callback
		 */
		"no-debugger" : function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot) {
				var end = annot.end;
				var tok = Finder.findToken(annot.end, file.ast.tokens);
				if(tok && tok.type === 'Punctuator' && tok.value === ';') {
					end = tok.range[1];
				}
				return {text: '', start: annot.start, end: end};
			});
		},
		/**
		 * @description Fix for 'eqeqeq' problem
		 * @function
		 * @callback
		 */
		"eqeqeq": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot){
				var expected = /^.*\'(\!==|===)\'/.exec(annot.title);
				return {text: expected[1], start: annot.start, end: annot.end};
			});
		},
		/**
		 * @description Fix for 'no-eq-null' problem
		 * @function
		 * @callback
		 */
		"no-eq-null": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot){
				var expected = /^.*\'(\!==|===)\'/.exec(annot.title);
				return {text: expected[1], start: annot.start, end: annot.end};
			});
		},
		/**
		 * @description Fix for 'no-undef-init' problem
		 * @function
		 * @callback
		 */
		"no-undef-init": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot){
				var node = Finder.findNode(annot.start, file.ast, {parents:true});
				if(node) {
					var p = node.parents[node.parents.length-1];
					if(p.type === 'VariableDeclarator') {
						return {text: '', start: p.id.range[1], end: p.range[1]};
					}
				}
			});
		},
		/**
		 * @description Fix for 'no-self-assign' problem
		 * @function
		 * @callback
		 */
		"no-self-assign": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot) {
				var node = Finder.findNode(annot.start, file.ast, {parents:true});
				if(node) {
					var p = node.parents[node.parents.length-1];
					switch(p.type) {
						case 'AssignmentExpression' : {
							var end = p.range[1];
							var tokens = file.ast.tokens;
							var tok = Finder.findToken(end, tokens);
							if(tok) {
								//we want the next one, ignoring whitespace
								if((tok.type !== 'Punctuator' || tok.value !== ';') && tokens.length > tok.index + 1) {
									tok = tokens[tok.index+1];
								}
								if(tok &&  tok.type === 'Punctuator' && tok.value === ';') {
									end = tok.range[1]; //clean up trailing semicolons
								}
							}
							return {text: '', start: p.range[0], end: end};
						}
						case 'VariableDeclarator' : {
							// init is the same name as the id
							var variableDeclarator = p;
							return {text: '', start: variableDeclarator.id.range[1], end: variableDeclarator.range[1]};
						}
					}
				}
			});
		},
		/**
		 * @description Fix for 'new-parens' problem
		 * @function
		 * @callback
		 */
		"new-parens": function(annotation, annotations, file) {
			var node = Finder.findNode(annotation.start, file.ast, {parents:true});
			if(node && node.type === 'Identifier') {
				return {text: '()', start: node.range[1], end: node.range[1]}; //$NON-NLS-1$
			}
		},
		/**
		 * @description fix for the missing-nls rule
		 * @function
		 * @callback
		 */
        "missing-nls": function(annotation, annotations, file){
			return applySingleFixToAll(annotations, function(annot) {
                if(annot.data && typeof annot.data.indexOnLine === 'number') {
	                // Insert the correct non nls comment
	                var end = getLineEnd(file.ast.sourceFile.text, annot.end);
	                // indexOnLine starts at 0, non-nls comments start at one
	                var comment = " //$NON-NLS-" + (annot.data.indexOnLine + 1) + "$"; //$NON-NLS-1$
	                return {text: comment,	start: end, end: end};
                }
            });
        },
		/**
		 * @description fix for the 'no-comma-dangle' rule
		 * @function
		 * @callback
		 */
		"no-comma-dangle": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot){
				var end = annot.end;
				if(annot.start+1 !== end) {
					end = annot.start+1;
				}
				return {text: '', start: annot.start, end: end};
			});
		},
		/**
		 * @description fix for the 'no-comma-dangle' rule
		 * @function
		 * @callback
		 */
		"no-empty-block": function(annotation, annotations, file) {
            var linestart = getLineStart(file.ast.sourceFile.text, annotation.start);
            var fix = '//TODO empty block'; //$NON-NLS-1$
            var indent = computeIndent(file.ast.sourceFile.text, linestart, true);
            fix = '\n' + indent + fix; //$NON-NLS-1$
            fix += computePostfix(file.ast.sourceFile.text, annotation);
            return {text: fix, start: annotation.start+1, end: annotation.start+1};
        },
		/**
		 * @description fix for the 'no-extra-parens' rule
		 * @function
		 * @callback
		 */
		"no-extra-parens": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot) {
				var tokens = file.ast.tokens;
				var token = Finder.findToken(annot.start, tokens);
				var openBracket = tokens[token.index-1];
				if (openBracket.value === '(') {
					var closeBracket = Finder.findToken(annot.end, tokens);
					if (closeBracket.value !== ')') {
						// try the next token if ')' is on the next line
						if (tokens.length > closeBracket.index + 1) {
							closeBracket = tokens[closeBracket.index + 1];
						}
					}
					if (closeBracket.value === ')') {
						var replacementText = "";
						if (token.index >= 2) {
							var previousToken = file.ast.tokens[token.index - 2];
							if (previousToken.range[1] === openBracket.range[0]
									&& (previousToken.type === "Identifier" || previousToken.type === "Keyword")) {
								// now we should also check if there is a space between the '(' and the next token
								if (token.range[0] === openBracket.range[1]) {
									replacementText = " "; //$NON-NLS-1$
								}
							}
						}
						return [
							{text: replacementText, start: openBracket.range[0], end: openBracket.range[1]},
							{text: '', start: closeBracket.range[0], end: closeBracket.range[1]}
						];
					}
				}
			});
		},
		/**
		 * @description fix for the 'no-extra-semi' rule
		 * @function
		 * @callback
		 */
		"no-extra-semi": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(currentAnnotation){
	           return {text: '', start: currentAnnotation.start, end: currentAnnotation.end};
            });
        },
        /**
		 * @description fix for the 'no-fallthrough' rule
		 * @function
		 * @callback
		 */
        "no-fallthrough": function(annotation, annotations, file) {
            var linestart = getLineStart(file.ast.sourceFile.text, annotation.start);
            var fix = '//$FALLTHROUGH$'; //$NON-NLS-1$
            var indent = computeIndent(file.ast.sourceFile.text, linestart);
            fix += computePostfix(file.ast.sourceFile.text, annotation, indent);
            return {text: fix, start: annotation.start, end: annotation.start};
        },
        /**
		 * @description fix for the 'no-fallthrough-break' rule
		 * @function
		 * @callback
		 */
        "no-fallthrough-break": function(annotation, annotations, file) {
            var linestart = getLineStart(file.ast.sourceFile.text, annotation.start);
            var fix = 'break;'; //$NON-NLS-1$
            var indent = computeIndent(file.ast.sourceFile.text, linestart);
            fix += computePostfix(file.ast.sourceFile.text, annotation, indent);
            return {text: fix, start: annotation.start, end: annotation.start};
        },
        /**
		 * @description fix for the 'no-new-array' rule
		 * @function
		 * @callback
		 */
        "no-new-array": function(annotation, annotations, file) {
			var node = Finder.findNode(annotation.start, file.ast, {parents:true});
			if(node && node.parents) {
				var p = node.parents[node.parents.length-1];
				if(p.type === 'CallExpression' || p.type === 'NewExpression') {
					var fix = '';
						if(p.arguments.length > 0) {
						var start = p.arguments[0].range[0], end = p.arguments[p.arguments.length-1].range[1];
						fix += '[' + file.ast.sourceFile.text.substring(start, end) + ']';
					} else {
						fix += '[]'; //$NON-NLS-1$
					}
					return {text: fix, start: p.start, end: p.end};
				}
			}
        },
        /**
		 * @description fix for the 'no-reserved-keys' rule
		 * @function
		 * @callback
		 */
		"no-reserved-keys": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot) {
				var node = Finder.findNode(annot.start, file.ast, {parents: true});
				if (node && node.type === 'Identifier') {
					var parent = node.parents.pop();
					if (parent && parent.type === 'MemberExpression') {
						return {
							text: '["' + node.name + '"]', //$NON-NLS-1$ //$NON-NLS-2$
							start: parent.object.range[1],
							end: node.range[1]
						};
					}
					return {
						text: '"' + node.name + '"', //$NON-NLS-1$ //$NON-NLS-2$
						start: node.range[0],
						end: node.range[1]
					};
				}
			});
		},
        /**
		 * @description fix for the 'no-throw-literal' rule
		 * @function
		 * @callback
		 */
        "no-throw-literal": function(annotation, annotations, file) {
            var node = Finder.findNode(annotation.start, file.ast, {parents:true});
            var source = node.raw || file.ast.sourceFile.text.slice(node.range[0], node.range[1]);
            return {text: 'new Error(' + source + ')', start: annotation.start, end: annotation.end}; //$NON-NLS-1$
        },
        /**
		 * @description fix for the 'no-undef-defined' rule
		 * @function
		 * @callback
		 */
        "no-undef-defined": function(annotation, annotations, file) {
            /**
             * @callback
             */
            function assignLike(node) {
                if(node && node.parents && node.parents.length > 0 && node.type === 'Identifier') {
                    var parent = node.parents.pop();
                    return parent && (parent.type === 'AssignmentExpression' || parent.type === 'UpdateExpression');
                }
                return false;
            }
            var name = annotation.data;
            if (name && typeof name === 'object'){
            	name = name.data;
            }
            if(name !== null && typeof name !== 'undefined') {
                var comment = null;
                var start = 0;
                var insert = name;
                var node = Finder.findNode(annotation.start, file.ast, {parents:true});
                if(assignLike(node)) {
                    insert += ':true'; //$NON-NLS-1$
                }
                comment = Finder.findDirective(file.ast, 'globals'); //$NON-NLS-1$
                if(comment) {
                    start = comment.range[0]+2;
                    return {text: updateDirective(comment.value, 'globals', insert), start: start, end: start+comment.value.length}; //$NON-NLS-1$
                }
                var point = getDirectiveInsertionPoint(file.ast);
				var linestart = getLineStart(file.ast.sourceFile.text, point);
				var indent = computeIndent(file.ast.sourceFile.text, linestart, false);
				var fix = '/*globals '+insert+' */\n' + indent; //$NON-NLS-1$ //$NON-NLS-2$
                return {text: fix, start: point, end: point};
            }
        },
        /**
		 * @description fix for the 'no-undef-defined-inenv' rule
		 * @function
		 * @callback
		 */
        "no-undef-defined-inenv": function(annotation, annotations, file) {
            var name = annotation.data;
            if (name && typeof name === 'object'){
            	name = name.data;
            }
            if(name) {
                var comment = null;
                var start = 0;
                /**
                 * @description resolves ambigous names based on environments in use
                 * @param {String} name The name to resolve
                 * @returns {String} The name of the environment
                 * @since 12.0
                 */
                function getEnv(name) {
					switch(name) {
						case 'require': {
							if(file.ast.environments) {
								if(file.ast.environments.node && !file.ast.environments.amd) {
									return 'node';
								}
								if(file.ast.environments.node && file.ast.environments.amd) {
									return 'amd';
								}
								if(file.ast.environments.amd) {
									return 'amd';
								}
							}
							break;
						}
						case 'console': {
							if(file.ast.environments) {
								if(file.ast.environments.node && !file.ast.environments.amd) {
									return 'node';
								}
								return 'browser';
							}
							break;
						}
					}
					return Finder.findESLintEnvForMember(name);
                }
                var env = getEnv(name);
                if(env) {
                    comment = Finder.findDirective(file.ast, 'eslint-env'); //$NON-NLS-1$
                    if(comment) {
                        start = getDocOffset(file.ast.sourceFile.text, comment.range[0]) + comment.range[0];
	                    return {text: updateDirective(comment.value, 'eslint-env', env, true), start: start, end: start+comment.value.length}; //$NON-NLS-1$
                    }
                    var point = getDirectiveInsertionPoint(file.ast);
					var linestart = getLineStart(file.ast.sourceFile.text, point);
					var indent = computeIndent(file.ast.sourceFile.text, linestart, false);
					var fix = '/*eslint-env '+env+' */\n' + indent; //$NON-NLS-1$ //$NON-NLS-2$
                    return {text: fix, start: point, end: point};
                }
            }
        },
        /**
         * @description Fix for the 'unknown-require-missing-env' rule
         * @function
         * @callback
         * @since 12.0
         */
        "unknown-require-missing-env": function(annotation, annotations, file) {
			var name = annotation.data;
			if (name && typeof name === 'object'){
            	name = name.data;
            }
			if(typeof name === 'string') {
				var start,
					comment = Finder.findDirective(file.ast, 'eslint-env'); //$NON-NLS-1$
                if(comment) {
                    start = getDocOffset(file.ast.sourceFile.text, comment.range[0]) + comment.range[0];
                    return {text: updateDirective(comment.value, 'eslint-env', name, true), start: start, end: start+comment.value.length}; //$NON-NLS-1$
                }
                var point = getDirectiveInsertionPoint(file.ast);
				var linestart = getLineStart(file.ast.sourceFile.text, point);
				var indent = computeIndent(file.ast.sourceFile.text, linestart, false);
				var fix = '/*eslint-env '+name+' */\n' + indent; //$NON-NLS-1$ //$NON-NLS-2$
                return {text: fix, start: point, end: point};
			}
        },
        /**
		 * @description fix for the 'no-unreachable' rule
		 * @function
		 * @callback
		 */
		"no-unreachable": function(annotation, annotations, file) {
            return {text: '', start: annotation.start, end: annotation.end};
        },
        /**
		 * @description fix for the 'no-unused-params' rule
		 * @function
		 * @callback
		 */
        "no-unused-params": function(annotation, annotations, file) {
			var analyzed = false;
	        	var analyzeResult = {};
	        	return applySingleFixToAll(annotations, function(annot){
	        		if (!analyzed){
	        			for (var i = annotations.length - 1; i >= 0; i--) {
	        				var element = annotations[i];
	        				var startNode = Finder.findNode(element.start, file.ast, {parents:true});
	        				var startParent = startNode.parents.pop();
	        				if (startParent){
	        					var startParentLocation = startParent.start.toString() + ":" + startParent.end.toString();
	        					if (analyzeResult[startParentLocation] || !(analyzeResult[startParentLocation] = 0)){
	        						analyzeResult[startParentLocation] += 1;
	        					}
	        				}
	        			}
	        			analyzed = true;
	        		}
	                var node = Finder.findNode(annot.start, file.ast, {parents:true});
	                if(node) {
	                    var changes = [];
	                    var parent = node.parents.pop();
	                    var parentLocation = parent.start.toString() + ":" + parent.end.toString();
	                    var paramindex = -1;
	                    var greedy = false;
	                    for(i = 0; i < parent.params.length; i++) {
	                        var p = parent.params[i];
	                        if(node.range[0] === p.range[0] && node.range[1] === p.range[1]) {
	                            paramindex = i;
	                            break;
	                        }
	                    }
	                    if (paramindex === 1 && analyzeResult[parentLocation] === parent.params.length - 1){
	                    	greedy = true;
	                    }
	                    var change = removeIndexedItemChange(parent.params, paramindex, greedy);
	                    if(change) {
	                        changes.push(change);
	                    }
	                    switch(parent.type) {
	                        case 'FunctionExpression': {
	                            var funcparent = node.parents.pop();
	                            if(funcparent.type === 'CallExpression' && (funcparent.callee.name === 'define' || funcparent.callee.name === 'require')) {
	                                var args = funcparent.arguments;
	                                for(i = 0; i < args.length; i++) {
	                                    var arg = args[i];
	                                    if(arg.type === 'ArrayExpression') {
	                                    	if (arg.elements.length === 1) {
	                                    		// we remove the last element in the array
	                                    		change = { "start" : arg.range[0], "end" : arg.range[1], "text" : "[]" };
	                                    	} else {
	                                        	change = removeIndexedItemChange(arg.elements, paramindex, false, arg);
	                                        }
	                                        if(change) {
	                                            changes.push(change);
	                                        }
	                                        break;
	                                    }
	                                }
	                            } else if(funcparent.type === 'Property' && funcparent.key.leadingComments && funcparent.key.leadingComments.length > 0) {
	                                change = updateDoc(funcparent.key, file.ast.sourceFile.text, parent.params[paramindex].name);
	                                if(change) {
	                                    changes.push(change);
	                                }
	                            } else if(funcparent.type === 'Property' && funcparent.leadingComments && funcparent.leadingComments.length > 0) {
	                                change = updateDoc(funcparent, file.ast.sourceFile.text, parent.params[paramindex].name);
	                                if(change) {
	                                    changes.push(change);
	                                }
	                            }
	                            break;
	                        }
	                        case 'FunctionDeclaration': {
	                           change = updateDoc(parent, file.ast.sourceFile.text, parent.params[paramindex].name);
	                           if(change) {
	                               changes.push(change);
	                           }
	                           break;
	                        }
	                    }
	                    return changes;
	                }
	            });
	        },
	        /**
			 * @description fix for the 'no-unused-params-expr' rule
			 * @function
			 * @callback
			 */
	        "no-unused-params-expr": function(annotation, annotations, file) {
		        	/**
		        	 * @callback
		        	 */
		        	function updateCallback(node, ast, comments) {
		                if(Array.isArray(comments)) {
		                    //attach it to the last one
		                    var comment = comments[comments.length-1];
		                    if(comment.type === 'Block') {
		                        var valueend = comment.range[0]+comment.value.length+getDocOffset(ast.sourceFile.text, comment.range[0]);
		                        var start = getLineStart(ast.sourceFile.text, valueend);
		                        var indent = computeIndent(ast.sourceFile.text, start);
		                        var fix = "* @callback\n"+indent; //$NON-NLS-1$
		                        /*if(comment.value.charAt(valueend) !== '\n') {
		                            fix = '\n' + fix;
		                        }*/
		                        return {text: fix, start: valueend-1, end: valueend-1};
		                    }
		                }
		                start = getLineStart(ast.sourceFile.text, node.range[0]);
		                indent = computeIndent(ast.sourceFile.text, start);
		                return {text: "/**\n"+indent+" * @callback\n"+indent+" */\n"+indent, start: node.range[0], end: node.range[0]}; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
		        	}
	                var node = Finder.findNode(annotation.start, file.ast, {parents:true});
	                if(node && node.parents && node.parents.length > 0) {
	                    var func = node.parents.pop();
	                    var p = node.parents.pop();
	                    var change;
	                    switch(p.type) {
	                    	case 'Property': {
	                    		if(!hasDocTag(['@callback', '@public'], p) && !hasDocTag(['@callback', '@public'], p.key)) { //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$
	                    			change = updateCallback(p, file.ast, p.leadingComments ? p.leadingComments : p.key.leadingComments);
	                			}
	                    		break;
	                    	}
	                    	case 'AssignmentExpression': {
	                    		var left = p.left;
	                    		var parent = null;
	                    		if (node.parents.length > 0) {
	                    			parent = node.parents.pop();
	                    		}
	                    		if (parent === null) {
	                    			parent = left;
	                    		}
	                    		if(left.type === 'MemberExpression' && !hasDocTag(['@callback', '@public'], parent)) { //$NON-NLS-1$ //$NON-NLS-2$
	                    			change = updateCallback(left, file.ast, parent.leadingComments);
					        	} else if(left.type === 'Identifier' && !hasDocTag(['@callback', '@public'], parent)) { //$NON-NLS-1$ //$NON-NLS-2$
					        		change = updateCallback(p.left, file.ast, parent.leadingComments);
					        	}
	                			break;
	                    	}
	                    	case 'VariableDeclarator': {
	                    		var oldp = p;
	                			p = node.parents.pop();
	                			if(p.declarations[0].range[0] === oldp.range[0] && p.declarations[0].range[1] === oldp.range[1]) {
	                				//insert at the var keyword level to not mess up the code
	             				var leadingComments = oldp.leadingComments;
		            				if (!leadingComments) {
		            					leadingComments = p.leadingComments;
		            				}
	               				change = updateCallback(p, file.ast, leadingComments);
	                			} else if(!hasDocTag(['@callback', '@public'], oldp.id)) { //$NON-NLS-1$ //$NON-NLS-2$
	                    			change = updateCallback(oldp, file.ast, oldp.leadingComments);
	                			}
	                    		break;
	                    	}
	                    }
	                    if(!change && !hasDocTag(['@callback', '@public'], func)) { //$NON-NLS-1$ //$NON-NLS-2$
	                        return {text: "/* @callback */ ", start: func.range[0], end: func.range[0]}; //$NON-NLS-1$
	                    }
	                }
	                return change;
		        },
		    /**
			 * @description fix for the 'no-unused-vars-unused' rule
			 * @function
			 * @callback
			 */
	        "no-unused-vars-unused": function(annotation, annotations, file) {
	            var node = Finder.findNode(annotation.start, file.ast, {parents:true});
	            if(node && node.parents && node.parents.length > 0) {
	                var declr = node.parents.pop();
	                if(declr.type === 'VariableDeclarator') {
	                    var decl = node.parents.pop();
	                    if(decl.type === 'VariableDeclaration') {
	                        if(decl.declarations.length === 1) {
	                            return {text: '', start: decl.range[0], end: decl.range[1]};
	                        }
	                        var idx = indexOf(decl.declarations, declr);
	                        if(idx > -1) {
	                        	var change = removeIndexedItemChange(decl.declarations, idx);
	                        	if(change) {
	                        		return {text: change.text, start: change.start, end: change.end};
	                        	}
	                        }
	                    }
	                } else if(declr.type === 'ClassDeclaration') {
	                	return {text: '', start: declr.range[0], end: declr.range[1]};
	                }
	            }
	        },
	        /**
			 * @description fix for the 'no-unused-vars-unread' rule
			 * @function
			 * @callback
			 */
	        "no-unused-vars-unread": function(annotation, annotations, file) {
	        	function getQuickfix(node, child, parents) {
	        		if (parents.length === 0) {
	        			return null;
	        		}
	                var idx, change, properties, propertyIndex;
	                switch(node.type) {
	                	case 'VariableDeclarator' : {
		                    return getQuickfix(parents.pop(), node, parents);
		                }
		                case 'VariableDeclaration' : {
	                        if(node.declarations.length === 1) {
	                            return {text: '', start: node.range[0], end: node.range[1]};
	                        }
	                        idx = indexOf(node.declarations, child);
	                        if(idx > -1) {
	                        	change = removeIndexedItemChange(node.declarations, idx);
	                        	if(change) {
	                        		return {text: change.text, start: change.start, end: change.end};
	                        	}
	                        }
	                		break;
	                	}
	                	case 'ArrayPattern' : {
	                		var elements = node.elements;
	                		if (elements.length === 1) {
	                			// only one element - remove the whole variable declarator
	                			return getQuickfix(parents.pop(), node, parents);
	                 		}
							// remove only the corresponding elements - might also need to remove elements on the right hand side
							// look for the index inside the elements array
							var index = indexOf(elements, child);
							if (index > -1) {
								var chosenElement = elements[index];
								if(chosenElement) {
									return {text: "", start: chosenElement.range[0], end: chosenElement.range[1]};
								}
							}
							break;
						}
						case 'Identifier' : {
							return getQuickfix(parents.pop(), node, parents);
						}
						case 'Property' : {
							return getQuickfix(parents.pop(), node, parents);
						}
						case 'ObjectPattern' : {
							properties = node.properties;
							if (properties.length === 1) {
								// only one property - we can remove the whole declarator
								return getQuickfix(parents.pop(), node, parents);
							}
							propertyIndex = indexOf(properties, child);
	                        if(propertyIndex > -1) {
								change = removeIndexedItemChange(properties, propertyIndex);
								if(change) {
									return {text: change.text, start: change.start, end: change.end};
								}
	                        }
							break;
						}
	                }
	                return null;
				}
	            var found = Finder.findNode(annotation.start, file.ast, {parents:true});
	            if(found && found.parents && found.parents.length > 0) {
	                var quickfix = getQuickfix(found, null, found.parents);
	                if (quickfix) { return quickfix; }
	            }
	        },
	        /**
			 * @description fix for the 'no-unused-vars-unused-funcdecl' rule
			 * @function
			 * @callback
			 */
	        "no-unused-vars-unused-funcdecl": function(annotation, annotations, file) {
	                var node = Finder.findNode(annotation.start, file.ast, {parents:true});
	                if(node && node.parents && node.parents.length > 0) {
	                    var decl = node.parents.pop();
	                    if(decl.type === 'FunctionDeclaration') {
	                        return {text: '', start: decl.range[0], end: decl.range[1]};
	                    }
	                }
	        },
	        /**
			 * @description fix for the 'use-isnan' rule
			 * @function
			 * @callback
			 */
	       "use-isnan": function(annotation, annotations, file) {
				return applySingleFixToAll(annotations, function(annot){
					var node = Finder.findNode(annot.start, file.ast, {parents:true});
	                if(node && node.parents && node.parents.length > 0) {
	                    var bin = node.parents.pop();
	                    if(bin.type === 'BinaryExpression') {
							var tomove;
							if(bin.left.type === 'Identifier' && bin.left.name === 'NaN') {
								tomove = bin.right;
							} else if(bin.right.type === 'Identifier' && bin.right.name === 'NaN') {
								tomove = bin.left;
							}
							if(tomove) {
								var src = file.ast.sourceFile.text.slice(tomove.range[0], tomove.range[1]);
								var pre = "";
								if(bin.operator.charAt(0) === '!') {
									pre = "!";
								}
								return {
									text: pre+'isNaN('+src+')', //$NON-NLS-1$
									start: bin.range[0],
									end: bin.range[1]
								};
							}
	                    }
	                }
				});
	       },
	        /**
			 * @description fix for the 'semi' rule
			 * @function
			 * @callback
			 */
			"semi": function(annotation, annotations, file) {
				return applySingleFixToAll(annotations, function(annot) {
					if (annot.data) {
						switch (annot.data.kind) {
							case 'missing':
								return {
									text: ';',
									start: annot.end,
									end: annot.end
								};
							case 'extra':
								return {
									text: '',
									start: annot.start,
									end: annot.end
								};
						}
					}
				});
			},
			/**
			 * @description fix for the 'unnecessary-nl' rule
			 * @function
			 * @callback
			 */
	        "unnecessary-nls": function(annotation, annotations, file){
				return applySingleFixToAll(annotations, function(annot){
					var comment = Finder.findComment(annot.start + 2, file.ast); // Adjust for leading //
					var nlsTag = annot.data.nlsComment; // We store the nls tag in the annotation
					if (comment && comment.type.toLowerCase() === 'line' && nlsTag){
						var index = comment.value.indexOf(nlsTag);
						// Check if we can delete the whole comment
						if (index > 0){
							var start = annot.start;
							while (file.ast.sourceFile.text.charAt(start-1) === ' ' || file.ast.sourceFile.text.charAt(start-1) === '\t'){
								start--;
							}
							return {
								text: '',
								start: start,
								end: annot.end
							};
						} else if (index === 0){
							var newComment = comment.value.substring(index+nlsTag.length);
							start = annot.start;
							var end = annot.end;
							if (!newComment.match(/^(\s*|\s*\/\/.*)$/)){
								start += 2; // Only remove leading // if additional comments start with another //
							} else {
								while (file.ast.sourceFile.text.charAt(start-1) === ' ' || file.ast.sourceFile.text.charAt(start-1) === '\t'){
									start--;
								}
							}
							if (newComment.match(/^\s*$/)){
								end = comment.range[1]; // If there is only whitespace left in the comment, delete it entirely
								while (file.ast.sourceFile.text.charAt(start-1) === ' ' || file.ast.sourceFile.text.charAt(start-1) === '\t'){
									start--;
								}
							}
							return {
								text: '',
								start: start,
								end: end
							};
						}
					}
				});
			},
			/**
			 * @callback
			 */
			"no-else-return": function(annotation, annotations, file) {
				return applySingleFixToAll(annotations, function(annot) {
					var node = Finder.findNode(annot.start, file.ast, {parents:true});
					// looking for the if statement
					while (node && node.type !== 'IfStatement') {
						node = node.parents.pop();
					}
					var thenNode = node.consequent;
					var elseNode = node.alternate;
					var parent = node.parent || {};
					// Replace else statement with newline.
					var replacement = '\n';
					if (parent.type === 'BlockStatement' || parent.type === 'IfStatement') {
						// Preserve whitespace if inside of a block.
						replacement = node.sourceFile.text.substring(parent.start + 1, parent.body[0].start);
						if (replacement.charAt(0) !== '\n') {
							replacement = '\n' + replacement;
						}
					}
					if (elseNode.type === 'BlockStatement') {
						// need to remove the else { and the closing brace }
						// check the first statement inside the block for trailing comment
						var firstStatement = elseNode.body[0];
						var start = firstStatement.start;
						if (firstStatement.leadingComments) {
							start = firstStatement.leadingComments[0].start;
						}
						var lastStatement = elseNode.body[elseNode.body.length - 1];
						var closingStart = lastStatement.end;
						var trailingComments = lastStatement.trailingComments;
						if (trailingComments) {
							closingStart = trailingComments[trailingComments.length - 1].end;
						}
						return [
							{ text: replacement, start: thenNode.end, end: start },
							{ text: '', start:  closingStart, end: elseNode.end },
						];
					}
					// need to remove the else keyword
					start = elseNode.start;
					if (elseNode.leadingComments) {
						start = elseNode.leadingComments[0].start;
					}
					return {
						text: replacement,
						start: thenNode.end + 1,
						end: start
					};
				});
			},
			/**
			 * @callback
			 */
			"no-cond-assign": function(annotation, annotations, file) {
				return applySingleFixToAll(annotations, function(annot) {
					var node = Finder.findNode(annot.start, file.ast, {parents:true});
					var assignmentExpression = node.parents.pop();
					if (assignmentExpression && assignmentExpression.type === 'AssignmentExpression') {
						var start = assignmentExpression.range[0];
						var end = assignmentExpression.range[1];
						return [
							{text: '(', start: start, end:  start},
							{text: ')', start: end, end:  end},
						];
					}
				});
			},
			/**
			 * @callback
			 */
			"no-extra-bind": function(annotation, annotations, file) {
				return applySingleFixToAll(annotations, function(annot) {
					var node = Finder.findNode(annot.start, file.ast, {parents:true});
					var memberExpression  = node.parents.pop();
					var callExpression = node.parents.pop();
					if (memberExpression && callExpression) {
						var object = memberExpression.object;
						if (object.type === 'ArrowFunctionExpression') {
							return [
								{text: '', start: callExpression.range[0], end: object.range[0]},
								{text: '', start: object.range[1], end: callExpression.range[1]},
							];
						}
						return {
							text: '',
							start: memberExpression.object.range[1],
							end: callExpression.range[1]
						};
					}
				});
			},
			"quotes" : function(annotation, annotations, file) {
				function convertQuotes(str, newQuote) {
					var oldQuote = str[0];
					if (newQuote === oldQuote) {
						return str;
					}
					return newQuote + str.slice(1, -1).replace(/\\(\${|\r\n?|\n|.)|["'`]|\${|(\r\n?|\n)/g, function(match, escaped, newline) {
						if (escaped === oldQuote || oldQuote === "`" && escaped === "${") {
							return escaped; // unescape
						}
						if (match === newQuote || newQuote === "`" && match === "${") {
							return "\\" + match; // escape
						}
						if (newline && oldQuote === "`") {
							return "\\n"; // escape newlines
						}
						return match;
					}) + newQuote;
				}
				return applySingleFixToAll(annotations, function(annot) {
					var node = Finder.findNode(annot.start, file.ast, {parents:true});
					if (node) {
						switch(node.type) {
							case 'Literal' :
								return {
									text: convertQuotes(node.raw, annotation.data.quote),
									start: node.range[0],
									end: node.range[1]
								};
							case 'TemplateLiteral' :
								return {
									text: convertQuotes('`' + node.quasis[0].value.raw + '`', annotation.data.quote),
									start: node.range[0],
									end: node.range[1]
								};
						}
					}
				});
			},
			/**
			 * @callback
			 */
			"no-unused-expressions": function(annotation, annotations, file) {
				return applySingleFixToAll(annotations, function(annot) {
					return {
						text: '',
						start: annot.start,
						end: annot.end
					};
				});
			},
			/**
			 * @callback
			 */
			"no-implicit-coercion" : function(annotation, annotations, file) {
				var INDEX_OF_PATTERN = /^(?:i|lastI)ndexOf$/;
				/**
				 * Checks whether or not a node is a double logical negating.
				 * @param {ASTNode} node - An UnaryExpression node to check.
				 * @returns {boolean} Whether or not the node is a double logical negating.
				 */
				function isDoubleLogicalNegating(node) {
					return node.operator === "!" &&
						node.argument.type === "UnaryExpression" &&
						node.argument.operator === "!";
				}
				/**
				 * Checks whether or not a node is a binary negating of `.indexOf()` method calling.
				 * @param {ASTNode} node - An UnaryExpression node to check.
				 * @returns {boolean} Whether or not the node is a binary negating of `.indexOf()` method calling.
				 */
				function isBinaryNegatingOfIndexOf(node) {
					return node.operator === "~" &&
						node.argument.type === "CallExpression" &&
						node.argument.callee.type === "MemberExpression" &&
						node.argument.callee.property.type === "Identifier" &&
						INDEX_OF_PATTERN.test(node.argument.callee.property.name);
				}

				/**
				 * Checks whether or not a node is a multiplying by one.
				 * @param {BinaryExpression} node - A BinaryExpression node to check.
				 * @returns {boolean} Whether or not the node is a multiplying by one.
				 */
				function isMultiplyByOne(node) {
					return node.operator === "*" && (
						node.left.type === "Literal" && node.left.value === 1 ||
						node.right.type === "Literal" && node.right.value === 1
					);
				}

				/**
				 * Checks whether the result of a node is numeric or not
				 * @param {ASTNode} node The node to test
				 * @returns {boolean} true if the node is a number literal or a `Number()`, `parseInt` or `parseFloat` call
				 */
				function isNumeric(node) {
					return node.type === "Literal"
						&& typeof node.value === "number"
						|| node.type === "CallExpression"
						&& (node.callee.name === "Number" ||
							node.callee.name === "parseInt" ||
							node.callee.name === "parseFloat");
				}

				/**
				 * Returns the first non-numeric operand in a BinaryExpression. Designed to be
				 * used from bottom to up since it walks up the BinaryExpression trees using
				 * node.parent to find the result.
				 * @param {BinaryExpression} node The BinaryExpression node to be walked up on
				 * @returns {ASTNode} The first non-numeric item in the BinaryExpression tree or
				 */
				function getNonNumericOperand(node) {
					var left = node.left,
						right = node.right;
					if (right.type !== "BinaryExpression" && !isNumeric(right)) {
						return right;
					}
					if (left.type !== "BinaryExpression" && !isNumeric(left)) {
						return left;
					}
				}

				/**
				 * Gets a node that is the left or right operand of a node, is not the specified literal.
				 * @param {ASTNode} node - A BinaryExpression node to get.
				 * @param {any} value - A literal value to check.
				 * @returns {ASTNode} A node that is the left or right operand of the node, is not the specified literal.
				 */
				function getOtherOperand(node, value) {
					if (node.left.type === "Literal" && node.left.value === value) {
						return node.right;
					}
					return node.left;
				}
				function getSource(text, node) {
					return text.slice(node.range[0], node.range[1]);
				}
				function checkBinaryExpression(node, text, annot) {
					if (isMultiplyByOne(node)) {
						var operandNode = getNonNumericOperand(node);
						if (operandNode) {
							return {
								text: 'Number(' + getSource(text, operandNode) + ')',
								start: annot.start,
								end: annot.end
							};
						}
					}
					// "" + foo
					return {
						text: 'String(' + getSource(text, getOtherOperand(node, "")) + ')',
						start: annot.start,
						end: annot.end
					};
				}
				function checkAssignmentExpression(node, text, annot) {
					var operandNode = getOtherOperand(node, "");
					var source = getSource(text, operandNode);
					return {
						text: source + ' = String(' + source + ')',
						start: annot.start,
						end: annot.end
					};
				}
				var text = file.ast.sourceFile.text;
				return applySingleFixToAll(annotations, function(annot) {
					var node = Finder.findNode(annot.start, file.ast, {parents:true});
					if (node) {
						switch(node.type) {
							case "UnaryExpression" : {
								if (isDoubleLogicalNegating(node)) {
									return {
										text: 'Boolean(' + getSource(text, node.argument.argument) + ')',
										start: annot.start,
										end: annot.end
									};
								} else if (isBinaryNegatingOfIndexOf(node)) {
									return {
										text: getSource(text, node.argument) + ' !== -1',
										start: annot.start,
										end: annot.end
									};
								}
								// +foo
								return {
									text: 'Number(' + getSource(text, node.argument) + ')',
									start: annot.start,
									end: annot.end
								};
							}
							case "Literal" : {
								// check the parent - should be a binary expression
								var parent = node.parents && node.parents.pop();
								if (parent) {
									return checkBinaryExpression(parent, text, annot);
								}
								return null;
							}
							case "BinaryExpression" : {
								return checkBinaryExpression(node, text, annot);
							}
							case "Identifier" : {
								parent = node.parents && node.parents.pop();
								if (parent) {
									return checkAssignmentExpression(parent, text, annot);
								}
								return null;
							}
							case "AssignmentExpression" : {
								return checkAssignmentExpression(node, text, annot);
							}
						}
					}
				});
			},
			/**
			 * @callback
			 */
			"remove-duplicate-case" :  function(annotation, annotations, file) {
				function getFallthroughComment(node) {
					var comments = node.leadingComments;
					if (comments) {
						var comment = comments[0];
						if (comment.type === 'Line' && comment.value === '$FALLTHROUGH$') {
							// if there is only one comment remove it
							return comment;
						}
					}
					return null;
				}
				return applySingleFixToAll(annotations, function(annot) {
					var node = Finder.findNode(annot.start, file.ast, {parents:true});
					if (node) {
						// get the switch case
						if (node.parents.length > 2) {
							var switchCase = node.parents.pop();
							// get the switch statement
							var statement = node.parents.pop();
							if (statement) {
								// get the index of the switch case
								var index = 0;
								loop: for (var i = 0, max = statement.cases.length; i < max; i++) {
									var currentCase = statement.cases[i];
									if (currentCase.range[0] === switchCase.range[0] && currentCase.range[1] === switchCase.range[1]) {
										index = i;
										break loop;
									}
								}
							}
							var start = switchCase.start;
							var end = switchCase.end;
							// check the next case
							var nextCase = statement.cases[index + 1];
							var comment;
							if (nextCase) {
								// check leading comments if it is a fallthrough comment
								comment = getFallthroughComment(nextCase);
								if (comment) {
									end = comment.end;
								}
							}
							if (index !== 0) {
								// check if there is a fallthrough comment for the current case statement we want to remove
								// if yes, we need to preserve it unless there is no other case statement after the one we remove
								comment = getFallthroughComment(switchCase);
								if (comment && nextCase) {
									start = comment.end;
								} else {
									start = statement.cases[index - 1].end;
								}
							}
							return {
								text: '',
								start: start,
								end: end
							};
						}
					}
				});
			},
			/**
			 * @callback
			 */
			"no-trailing-spaces" : function(annotation, annotations, file) {
				return applySingleFixToAll(annotations, function(annot) {
					return {
						text: '',
						start: annot.start,
						end: annot.end
					};
				});
			},
			/**
			 * @callback
			 */
			"ignore-in-file": function(annotation, annotations, file) {
	            var id = annotation.data ? annotation.data.ruleId : null;
	            if(id) {
	            	var result = [];
	                var disable = Finder.findDirective(file.ast, 'eslint-disable'); //$NON-NLS-1$
	                var programStart = getProgramStart(file.ast);
	                programStart = Math.min(annotation.start, programStart);
	                // If there is disable directive already there, add the rule to it
	                if (disable && disable.range[0] <= programStart){
	                    var start = getDocOffset(file.ast.sourceFile.text, disable.range[0]) + disable.range[0];
	                    result.push({text: updateDirective(disable.value, 'eslint-disable', id, true), start: start, end: start+disable.value.length}); //$NON-NLS-1$
	                } else {
	                	// Otherwise insert at first appropriate insertion point
	                	var insertion = getDirectiveInsertionPoint(file.ast);
	                	if (annotation.start < insertion){
	                		insertion = getCodeStart(file.ast);
	                	}
	                	var linestart = getLineStart(file.ast.sourceFile.text, insertion);
						var indent = computeIndent(file.ast.sourceFile.text, linestart, false);
						var fix = '/*eslint-disable '+id+' */\n' + indent; //$NON-NLS-1$ //$NON-NLS-2$
		                result.push({text: fix, start: insertion, end: insertion});
	                }
	                // If there is are enable directives, remove the rule from them
	                var enable = Finder.findDirectives(file.ast, 'eslint-enable'); //$NON-NLS-1$
	                for (var i = 0; i < enable.length; i++) {
	                	// TODO We do not handle there being a general eslint-enable statement in the file
	                	var removal = removeDirective(enable[i].value, 'eslint-enable', id);
	                	if (removal){
	                		if (removal.all){
	                			// TODO Remove trailing whitespace and newline from the removed comment
	                    		result.push({text: '', start: enable[i].range[0], end: enable[i].range[1]});
	                		} else {
	                			var enableStart = enable[i].range[0] + getDocOffset(file.ast.sourceFile.text, enable[i].range[0]) + removal.start;
	                			var enableEnd = enable[i].range[0] + getDocOffset(file.ast.sourceFile.text, enable[i].range[0]) + removal.end;
	                    		result.push({text: '', start: enableStart, end: enableEnd});
	                		}
	                	}
	                }
	                // Add a no-op edit to the annotation range so the selection/scroll remains on the annotation
	                result.push({text: file.ast.sourceFile.text.slice(annotation.start, annotation.end), start: annotation.start, end: annotation.end});
	                // Limitation of the editor, edits must be in order or they will stomp on each other
	                result = result.sort(function(a, b){
	                	return a.start - b.start;
	                });
					return result;
	            }
            },
		};

		/**
		 * @description Compute the fixes
		 * @param {Object} query The original Tern query object
		 * @param {Object} file The file object from Tern
		 */
		function computeFixes(query, file) {
			var func = availableFixes[query.problemId];
			if(typeof func === 'function') {
				var fixes = func.call(this, query.annotation, query.annotations, file);
				if(Array.isArray(fixes)) {
					return fixes;
				} else if(fixes) {
					return [fixes];
				}
			}
			return [];
		}

	   /**
	    * @description Finds the start of the line in the given text starting at the given offset
	    * @param {String} text The text
	    * @param {Number} offset The offset
	    * @returns {Number} The offset in the text of the new line
	    */
	   function getLineStart(text, offset) {
	       if(!text) {
	           return 0;
	       }
	       if(offset < 0) {
	           return 0;
	       }
	       var off = offset;
	       var char = text[off];
	       while(off > -1 && !/[\r\n]/.test(char)) {
	           char = text[--off];
	       }
	       return off+1; //last char inspected will be @ -1 or the new line char
		}

		/**
	    * @description Finds the end of the line in the given text starting at the given offset
	    * @param {String} text The text
	    * @param {Number} offset The offset
	    * @returns {Number} The offset in the text before the new line or end of file
	    */
	   function getLineEnd(text, offset) {
	       if(!text) {
	           return 0;
	       }
	       if(offset < 0) {
	           return 0;
	       }
	        var off = offset;
	       var char = text[off];
	       while(off < text.length && !/[\r\n]/.test(char)) {
	           char = text[++off];
	       }
	       return off;
		}

		/**
		 * @description Computes the indent to use in the editor
		 * @param {String} text The editor text
		 * @param {Number} linestart The start of the line
		 * @param {Boolean} extraIndent If we should add an extra indent
		 * @returns {String} The ammount of indent / formatting for the start of the string
		 */
		function computeIndent(text, linestart, extraIndent) {
		    if(!text || linestart < 0) {
		        return '';
		    }
		    var off = linestart;
		    var char = text[off];
		    var preamble = extraIndent ? '\t' : ''; //$NON-NLS-1$
		    //walk the proceeding whitespace so we will insert formatted at the same level
		    while(char === ' ' || char === '\t') {
		       preamble += char;
		       char = text[++off];
		    }
		    return preamble;
		}

	    /**
	     * @description Computes the formatting for the trailing part of the fix
	     * @param {String} text The editor text
	     * @param {Object} annotation The annotation object
	     * @param {String} indent Additional formatting to apply after the fix
	     * @returns {String} The formatting to apply after the fix
	     */
	    function computePostfix(text, annotation, indent) {
	        if(!text || !annotation) {
	            return '';
	        }
	        var off = annotation.start;
	        var char = text[off];
		    var val = '';
		    var newline = false;
		    //walk the trailing whitespace so we can see if we need axtra whitespace
		    while(off >= annotation.start && off <= annotation.end) {
			    if(char === '\n') {
			        newline = true;
			        break;
			    }
			    char = text[off++];
		    }
		    if(!newline) {
			    val += '\n'; //$NON-NLS-1$
		    }
		    if(typeof indent !== 'undefined') {
			    val += indent;
		    }
		    return val;
	    }

	    /**
	     * @description Computes the offset for the block comment. i.e. 2 if the block starts with /*, 3 if it starts with /**
	     * @param {String} text The file text
	     * @param {Number} offset The doc node offset
	     * @returns {Number} 2 or 3 depending on the start of the comment block
	     */
	    function getDocOffset(text, offset) {
	        if(text.charAt(offset+1) === '*') {
	            if(text.charAt(offset+2) === '*') {
	                return 3;
	            }
	            return 2;
	        }
	        return 0;
	    }

		/**
		 * @description Updates the eslint directive
		 * @param {String}] text The text of the comment
		 * @param {String} directive The directive name
		 * @param {String} name The name to add to the directive
		 * @param {Boolean} usecommas If we should separate the directive entries with commas or not
		 * @returns {String} The new directive text
		 */
		function updateDirective(text, directive, name, usecommas) {
	        if(usecommas) {
		        if(text.slice(directive.length).trim() !== '') {
		            return text.trim() + ', '+name; //$NON-NLS-1$
		        }
		        return text.trim() + ' '+name;  //$NON-NLS-1$
	        }
		    return text.trim() + ' '+name;  //$NON-NLS-1$
	    }
	    
	    /**
		 * @description Returns the offsets to delete to remove an entry from an eslint directive
		 * @param {String} text The text of the comment
		 * @param {String} directive The directive name
		 * @param {String} name The entry name to remove
		 * @returns {Object} Object with start and end properties for the offset to remove, will also have all: true if the directive can be removed
		 */
		function removeDirective(text, directive, name) {
			var offset = text.indexOf(name, directive.length);
			if (offset >= 0){
				var end = offset+name.length;
				if (text[end] === ','){
					end++;
				}
				if (text.slice(0,offset).trim() === directive && text.slice(end).trim() === ""){
					return {all:true, start: offset, end: end};
				}
				return {start: offset, end: end};
			}
			return null;
	    }

		/**
		 * @description Finds the index of the given item in the given list
		 * @param {Array.<Object>} list The array of AST nodes
		 * @param {Object} item The AST node
		 * @returns {Number} The index of the node in the list or -1
		 */
		function indexOf(list, item) {
		    if(list && list.length) {
	            for(var i = 0; i < list.length; i++) {
	                var p = list[i];
	                if(p && item.range[0] === p.range[0] && item.range[1] === p.range[1]) {
	                    return i;
	                }
	            }
	        }
	        return -1;
		}

		/**
		 * @description Remove the item from the list and return it as a change object
		 * @param {Array.<Object>} list The list of items to remove from
		 * @param {Number} index The index to remove
		 * @returns {Object} A change object containg the properties text, start and end
		 */
		function removeIndexedItemChange(list, index, greedy, parent) {
			if (index < 0 || index > list.length) {
				return;
			}
			var node = list[index];
			if (list.length === 1) {
				return {
					"start": node.range[0],
					"end": parent ? parent.range[1] - 1 : node.range[1],
					"text": ""
				};
			} else if (index === list.length - 1) {
				return {
					"start": list[index - 1].range[1],
					"end": parent ? parent.range[1] - 1 : node.range[1],
					"text": ""
				};
			} else if (node) {
				if (index === 0) {
					if (list.length === 1) {
						return {
							"start": node.range[0],
							"end": node.range[1],
							"text": ""
						};
					}
					return {
						"start": node.range[0],
						"end": list[index + 1].range[0],
						"text": ""
					};
				}
				return greedy ? {
					"start": list[index - 1].range[1],
					"end": list[index + 1].range[0],
					"text": ""
				} : {
					"start":  list[index - 1].range[1],
					"end": node.range[1],
					"text": ""
				};
			}
			return null;
		}
	    /**
	     * @description Updates the JSDoc attached to the given AST node
	     * @param {Object} node The AST node to update
	     * @param {String} source The AST source
	     * @param {String} name The name of the doc element to remove
	     * @returns {Object} The change object or null
	     */
	    function updateDoc(node, source, name) {
	        if(node.leadingComments && node.leadingComments.length > 0) {
	            for(var i = node.leadingComments.length-1; i > -1; i--) {
	                var comment = node.leadingComments[i];
	                var edit = new RegExp("(\\s*[*]+\\s*(?:@param)\\s*(?:\\{.*\\})?\\s*(?:"+name+")+.*)").exec(comment.value); //$NON-NLS-1$ //$NON-NLS-2$
	                if(edit) {
	                    var start = comment.range[0] + edit.index + getDocOffset(source, comment.range[0]);
	                    return {"start" : start, "end" :start+edit[1].length, "text" : ''};
	                }
	            }
	        }
	        return null;
	    }

		/**
		 * @description Returns if the JSDoc attached to the given node has any of the given tags
		 * @param {Array.<String>} tags The array of tags
		 * @param {Object} node The AST node
		 * @returns {Boolean} If the doc attached to the given node has one of the given tags
		 */
		function hasDocTag(tags, node) {
			// tags contains all tags that have to be checked
		    if(node.leadingComments) {
		        for(var i = 0; i < node.leadingComments.length; i++) {
		            var comment = node.leadingComments[i];
		            for (var j = 0, len = tags.length; j < len; j++) {
						var tag = tags[j];
			            if(comment.value.indexOf(tag) > -1) {
			                return true;
			            }
			        }
		        }
		    }
		    return false;
		}

		/**
		 * @description Computes where the eslint directive should be inserted relative to the given node
		 * @param {Object} node The AST node
		 * @returns {Number} The insertion point
		 */
		function getDirectiveInsertionPoint(node) {
		    if(node.type === 'Program' && node.body && node.body.length > 0) {
	            var n = node.body[0];
	            var val = -1;
	            switch(n.type) {
	                case 'FunctionDeclaration': {
	                    val = getCommentStart(n);
	                    if(val > -1) {
	                        return val;
	                    }
	                    //TODO see https://github.com/jquery/esprima/issues/1071
	                    val = getCommentStart(n.id);
	                    if(val > -1) {
	                        return val;
	                    }
	                    return n.range[0];
	                }
	                case 'ExpressionStatement': {
	                    if(n.expression && n.expression.right && n.expression.right.type === 'FunctionExpression') {
	                        val = getCommentStart(n);
	                        if(val > -1) {
	                            return val;
	                        }
	                        //TODO see https://github.com/jquery/esprima/issues/1071
	                        val = getCommentStart(n.expression.left);
	                        if(val > -1) {
	                            return val;
	                        }
	                        return n.range[0];
	                    }
	                    return n.range[0];
	                }
	            }
	            return n.range[0]; // Start of first node, as script blocks in HTML will have leading whitespace
		    }
		    return node.range[0];
		}
		
		/**
		 * @description Returns the start offset of the first body node
		 * @param {Object} ast The AST
		 * @returns {Number} The start offset of first node
		 */
		function getProgramStart(ast) {
		    if(ast.type === 'Program'){
		    	if (ast.body && ast.body.length > 0) {
	        		return ast.body[0].start;
        		}
        		return ast.end; // Don't use 0 in case this is inside an HTML script block
            }
            return 0;
		}
		
		/**
		 * @description Returns the start offset of the first body node or the first comment, whichever is first.
		 * @param {Object} ast The AST
		 * @returns {Number} The start offset of first code content
		 */
		function getCodeStart(ast) {
			var programStart = getProgramStart(ast);
			var commentStart = programStart;
			if (ast.comments && ast.comments.length > 0){
				commentStart = ast.comments[0].range[0];
			}
			return Math.min(programStart, commentStart);
		}

		/**
		 * @description Returns the offset to use when inserting a comment directive
		 * @param {Object} node The node to check for comments
		 * @returns {Number} The offset to insert the comment
		 */
		function getCommentStart(node) {
		    if(node.leadingComments && node.leadingComments.length > 0) {
	            var comment = node.leadingComments[node.leadingComments.length-1];
	            if(/(?:@param|@return|@returns|@type|@constructor|@name|@description)/ig.test(comment.value)) {
	                //if the immediate comment has any of the tags we use for inferencing, add the directive before it instead of after
	                return comment.range[0];
	            }
	        }
	        return -1;
		}

		var controlStatements = ['IfStatement', 'WhileStatement', 'ForStatement', 'ForInStatement', 'WithStatement', 'DoWhileStatement', 'ForOfStatement']; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$ //$NON-NLS-5$ //$NON-NLS-6$ //$NON-NLS-7$

		/**
		 * @description Walks the parents array and checks to see if there is a control statement as a direct parent
		 * @param {Object} node The AST node to check
		 * @returns {Object} The AST node that is a direct control statement parent of the given node, or null
		 */
		function getControlStatementParent(node) {
			if(node && node.parents) {
				var i = node.parents.length-1,
					p = node.parents[i];
				while(p && i > -1) {
					if(controlStatements.indexOf(p.type) > -1) {
						return p;
					}
					p = node.parents[--i];
				}
			}
			else {
				return null;
			}
		}

		/**
		 * Takes a quickfix implementation that can be applied to all fixes in a file and applies it to either all annotations (if multiple annotations provided) or
		 * just to the single annotation.  Handles applying all edits in a single UNDO step as well as setting the caret to the single selected annotation afterward.
		 * @param {Array.<Object>} annotations Array of annotations to apply the fix to
		 * @param {Function} createTextChange function to create a text edit object (text, start, end) for a given annotation
		 */
		function applySingleFixToAll(annotations, createTextChange) {
			var edits = [];
			annotations.forEach(function(current) {
				var change = createTextChange(current);
				if(change) {
					if(Array.isArray(change)) {
						change.forEach(function(fix) {
							edits.push(fix);
						});
					} else {
						edits.push(change);
					}
				}
			});
			// To use setText() with multiple selections they must be in range order
			edits = edits.sort(function(a, b){
				return a.start - b.start;
			});
			var mergedEdits = [];
			var intersectedRange = false;
			for (var i = 0; i < edits.length ; i++) {
			    if(i === edits.length - 1 && !intersectedRange){
			        mergedEdits.push(edits[i]);
			        break;
			    } else if (i === edits.length - 1) {
			        break;
			    }
			    var element = intersectedRange ? mergedEdits.pop() : edits[i];
			    var nextElement = edits[i+1];
			    if (element.end >= nextElement.start){
			        mergedEdits.push({
			            start: element.start,
			            end: nextElement.end,
			            text: element.text + nextElement.text
			        });
			        intersectedRange = true;
			    } else {
			        mergedEdits.push(element);
			        intersectedRange = false;
			    }
			}
			return mergedEdits;
		}
	});
