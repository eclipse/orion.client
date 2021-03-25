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
/*eslint-env amd*/
define([
'orion/objects',
'orion/Deferred',
'orion/editor/textModel',
'javascript/finder',
'javascript/compilationUnit',
'orion/metrics',
'estraverse/estraverse'
], function(Objects, Deferred, TextModel, Finder, CU, Metrics, Estraverse) {
/* eslint-disable missing-doc */
	/**
	 * @description Creates a new JavaScript quick fix computer
	 * @param {javascript.ASTManager} astManager The AST manager
	 * @param {javascript.RenammeCommand} renameCommand The rename command
	 * @param {javascript.GenerateDocCommand} generateDocCommand The doc generation command 
	 * @returns {javascript.JavaScriptQuickfixes} The new quick fix computer instance
	 * @since 8.0
	 */
	function JavaScriptQuickfixes(astManager, renameCommand, generateDocCommand, jsProject, ternWorker) {
	   this.astManager = astManager;
	   this.renamecommand = renameCommand;
	   this.generatedoc = generateDocCommand;
	   this.jsProject = jsProject;
	   this.ternworker = ternWorker;
	}
	
	function translatePluginName(name) {
		switch(name) {
			case 'pg': return 'postgres';
			case 'amd': return 'requirejs';
			case 'mongo': return 'mongodb';
			default: return name;
		}
	}
	
	/**
	 * @description Checks the given name to see if it maps to another name ESLint knows about and returns the ESLint-known name
	 * @param {String} name The name to translate
	 * @returns {String} The name of the directive to use, or the original
	 * @since 12.0
	 */
	function translateDirectiveName(name) {
		switch(name) {
			case 'requirejs': return 'amd';
			default: return name;
		}	
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
	    }
	    return node.range[0];
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
	 * @description Updates the eslint directive
	 * @param {String}] text The text of the source file
	 * @param {String} directive The directive text
	 * @param {String} name The name to add
	 * @returns {String} The new directive text
	 */
	function updateDirective(ast, name) {
		var comment = Finder.findDirective(ast, 'eslint-env'); //$NON-NLS-1$
        if(comment) {
        	if(comment.value.indexOf(name) < 0) {
	            var start = getDocOffset(ast.sourceFile.text, comment.range[0]) + comment.range[0],
	            	newText;
	            if(comment.value.slice('eslint-env'.length).trim() !== '') {
		            newText = comment.value.trim() + ', '+name; //$NON-NLS-1$
		        } else {
			        newText = comment.value.trim() + ' '+name;  //$NON-NLS-1$
		        }
	            return {text: newText, start: start, end: start+comment.value.length}; //$NON-NLS-1$
	        }
        } else {
         	var point = getDirectiveInsertionPoint(ast);
        	var linestart = getLineStart(ast.sourceFile.text, point);
        	var indent = computeIndent(ast.sourceFile.text, linestart, false);
   			var fix = '/*eslint-env '+name+' */\n' + indent; //$NON-NLS-1$ //$NON-NLS-2$
			return {text: fix, start: point, end: point};
		}
    }
	
	Objects.mixin(JavaScriptQuickfixes.prototype, /** @lends javascript.JavaScriptQuickfixes.prototype*/ {
		/**
		 * @description Editor command callback
		 * @function
		 * @param {orion.edit.EditorContext} editorContext The editor context
		 * @param {Object} context The context params
		 */
		execute: function(editorContext, context) {
		    var id = context.annotation.fixid ? context.annotation.fixid : context.annotation.id;
		    delete context.annotation.fixid;
		    Metrics.logEvent('language tools', 'quickfix', id, 'application/javascript'); //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
		    var fixFunc = this.fixes[id];
		    var deferred = new Deferred();
		    return editorContext.getFileMetadata().then(function(meta) {
		    	if (fixFunc) {
	                if(meta.contentType.id === 'text/html') {
	                    return editorContext.getText().then(function(text) {
                           var blocks = Finder.findScriptBlocks(text);
                           if(blocks && blocks.length > 0) {
                               var cu = new CU(blocks, meta, editorContext);
                               return fixFunc.call(this, cu.getEditorContext(), context, this.astManager);
                           }
	                    }.bind(this));
	                }
					return fixFunc.call(this, editorContext, context, this.astManager);
	        	}
	        	var annotations = context.annotations;
	        	if(!Array.isArray(annotations)) {
	        		annotations = [context.annotation];
	        	}
	        	return editorContext.getText().then(function(text) {
		        	var files = [{type: 'full', name: meta.location, text: text}]; //$NON-NLS-1$
		        	var request = {request: 'fixes', args: {meta: {location: meta.location}, files: files, problemId: id, annotation: context.annotation, annotations: annotations}}; //$NON-NLS-1$
		        	this.ternworker.postMessage(	request, 
						function(fixes, err) {
							if(err) {
								deferred.reject();
							}
							if(Array.isArray(fixes.fixes) && fixes.fixes.length > 0) {
								var idx = 0;
								var hasNewline = false;
								var textEdits = [];
								var rangeEdits = [];
								fixes.fixes.forEach(function(fix, i) {
									textEdits.push(fix.text);
									rangeEdits.push({start: fix.start, end: fix.end});
									if (fix.start === context.annotation.start && fix.end === context.annotation.end){
										idx = i;
									}
								});
								// If we have a single insertion fix ending in a newline we need to scroll to reveal the previous line
								if (fixes.fixes.length === 1){
									var fix = fixes.fixes[0];
									hasNewline = fix.start === fix.end && fix.text.length > 0 && fix.text.charAt(fix.text.length-1) === '\n';
								}
						    	deferred.resolve(editorContext.setText({text: textEdits, selection: rangeEdits}).then(function() {
						    		return editorContext.getSelections().then(function(selections) {
						    			if (selections.length > 0){
						    				var selection = selections[selections.length > idx ? idx : 0];
						    				if (hasNewline){
						    					selection.start--;
						    					selection.end--;
						    				}
						    				return editorContext.setSelection(selection.start, selection.end, true);	
										}
						    		});
						    	}));
							} else {
								deferred.reject();
							}
						});
					return deferred;
				}.bind(this));
			}.bind(this));
		},
		fixes : {
			"no-dupe-keys": function(editorContext, context, astManager) {
				return astManager.getAST(editorContext).then(function(ast) {
					var node = Finder.findNode(context.annotation.end, ast, {parents:true});
					if(node && node.type === 'Identifier') {
						var parent = node.parents.pop();
						var linkModel = null;
						var start = node.range[0],
							groups = [{data: {}, positions: [{offset: start, length: node.range[1]-start}]}];
						if (parent && parent.type === 'Property') {
							var value = parent.value;
							if (value && value.type === 'FunctionExpression') {
								var valueId = value.id;
								// valueId is null if the function expression is an anonymous function
								if (valueId && valueId.type === 'Identifier' && valueId.name === node.name) {
									start = valueId.start;
									groups[0].positions.push({offset: start, length: valueId.range[1]-start});
								}
							}
						}
						linkModel = {groups: groups};
						return editorContext.exitLinkedMode().then(function() {
							return editorContext.enterLinkedMode(linkModel);
						});
					}
				});
			},
			"no-duplicate-case": function(editorContext, context) {
				var start = context.annotation.start,
					groups = [{data: {}, positions: [{offset: start, length: context.annotation.end-start}]}],
					linkModel = {groups: groups};
				return editorContext.exitLinkedMode().then(function() {
					return editorContext.enterLinkedMode(linkModel);
				});
			},
			"missing-doc": function(editorContext, context) {
				context.offset = context.annotation.start;
				return this.generatedoc.execute.call(this.generatedoc, editorContext, context);
			},
			"no-shadow": function(editorContext, context) {
				return this.renamecommand.execute.call(this.renamecommand, editorContext, context);
			},
			"no-shadow-global": function(editorContext, context) {
				return this.renamecommand.execute.call(this.renamecommand, editorContext, context);
			},
			"no-shadow-global-param": function(editorContext, context) {
				return this.renamecommand.execute.call(this.renamecommand, editorContext, context);
			},
			"no-self-assign-rename": function(editorContext, context, astManager) {
				return astManager.getAST(editorContext).then(function(ast) {
					var node = Finder.findNode(context.annotation.end, ast);
					if(node && node.type === 'Identifier') {
						var start = node.range[0],
							groups = [{data: {}, positions: [{offset: start, length: node.range[1]-start}]}],
							linkModel = {groups: groups};
						return editorContext.exitLinkedMode().then(function() {
							return editorContext.enterLinkedMode(linkModel);
						});
					}
				});
			},
	        /** 
	         * fix for the no-sparse-arrays linting rule
	         * @callback
	         */
	        "no-sparse-arrays": function(editorContext, context, astManager) {
	            return astManager.getAST(editorContext).then(function(ast) {
	                var node = Finder.findNode(context.annotation.start, ast, {parents:true});
	                if(node && node.type === 'ArrayExpression') {
	                    var model = new TextModel.TextModel(ast.sourceFile.text.slice(context.annotation.start, context.annotation.end));
	                    var len = node.elements.length;
	                    var idx = len-1;
	                    var item = node.elements[idx];
	                    if(item === null) {
	                        var end = Finder.findToken(node.range[1], ast.tokens);
	                        if(end.value !== ']') {
	                            //for a follow-on token we want the previous - i.e. a token immediately following the ']' that has no space
	                            end = ast.tokens[end.index-1];
	                        }
	                        //wipe all trailing entries first using the ']' token start as the end
	                        for(; idx > -1; idx--) {
	                            item = node.elements[idx];
	                            if(item !== null) {
	                                break;
	                            }
	                        }
	                        if(item === null) {
	                            //whole array is sparse - wipe it
	                            return editorContext.setText('', context.annotation.start+1, context.annotation.end-1);
	                        }
	                        model.setText('', item.range[1]-context.annotation.start, end.range[0]-context.annotation.start);
	                    }
	                    var prev = item;
	                    for(; idx > -1; idx--) {
	                        item = node.elements[idx];
	                        if(item === null || item.range[0] === prev.range[0]) {
	                            continue;
	                        }
	                        model.setText(', ', item.range[1]-context.annotation.start, prev.range[0]-context.annotation.start); //$NON-NLS-1$
	                        prev = item;
	                    }
	                    if(item === null && prev !== null) {
	                        //need to wipe the front of the array
	                        model.setText('', node.range[0]+1-context.annotation.start, prev.range[0]-context.annotation.start);
	                    }
	                    return editorContext.setText(model.getText(), context.annotation.start, context.annotation.end);
	                }
	                return null;
	            });
	        },
	        /** @callback fix the no-undef-expression rule */
	        "no-undef-expression-defined-object": function(editorContext, context, astManager){
	        	var data = context.annotation.data;
				return editorContext.openEditor(data.file, {start: data.start, end: data.end});
	        },
	        /** @callback fix the check-tern-plugin rule */
			"check-tern-plugin" : function(editorContext, context, astManager) {
				return astManager.getAST(editorContext).then(function(ast) {
					var name = context.annotation.data;
					if (name && typeof name === 'object'){
		            	name = name.data;
		            }
					var json = {plugins: Object.create(null)};
					json.plugins[translatePluginName(name)] = Object.create(null);
					return this.jsProject.updateFile(this.jsProject.TERN_PROJECT, true, json).then(function(/*file*/) {
						return editorContext.syntaxCheck(ast.sourceFile.name);
					});
				}.bind(this));
			},
			"check-tern-lib" : function(editorContext, context, astManager) {
				return astManager.getAST(editorContext).then(function(ast) {
					var newLib = context.annotation.data;
					if (newLib && typeof newLib === 'object'){
		            	newLib = newLib.data;
		            }
					var json = {libs: []};
					json.libs.push(newLib);
					return this.jsProject.updateFile(this.jsProject.TERN_PROJECT, true, json).then(function(/*file*/) {
						return editorContext.syntaxCheck(ast.sourceFile.name);
					});
				}.bind(this));
			},
			/** @callback fix the unknown-require-plugin problem */
			"unknown-require-plugin": function(editorContext, context, astManager) {
				return astManager.getAST(editorContext).then(function(ast) {
					var json = {plugins: Object.create(null)};
					var name = context.annotation.data;
					if (name && typeof name === 'object'){
		            	name = name.data;
		            }
					var newPlugin = translatePluginName(name);
					json.plugins[newPlugin] = Object.create(null);
					if (newPlugin === "commonjs") {
						// also add "node" see https://bugs.eclipse.org/bugs/show_bug.cgi?id=477377
						json.plugins["node"] = Object.create(null);
					}
					return this.jsProject.updateFile(this.jsProject.TERN_PROJECT, true, json).then(function(/*file*/) {
						var directiveName = context.annotation.data;
						if (directiveName && typeof directiveName === 'object'){
			            	directiveName = directiveName.data;
			            }
						var newDirective = updateDirective(ast, translateDirectiveName(directiveName));
						if(newDirective) {
							return editorContext.setText(newDirective.text, newDirective.start, newDirective.end).then(function() {
								return editorContext.syntaxCheck(ast.sourceFile.name);
							});
						} 
						return editorContext.syntaxCheck(ast.sourceFile.name);
					});
				}.bind(this));
			},
			"unknown-require-packagejson": function(editorContext, context, astManager) {
				return astManager.getAST(editorContext).then(function(ast) {
					var json = {dependencies: Object.create(null)};
					var dataName = context.annotation.data;
					if (dataName && typeof dataName === 'object') {
		            	dataName = dataName.data;
		            }
					var newPlugin = translatePluginName(dataName);
					json.dependencies[newPlugin] = "latest";
					return this.jsProject.updateFile(this.jsProject.PACKAGE_JSON, true, json).then(function(/*file*/) {
						return editorContext.syntaxCheck(ast.sourceFile.name);
					});
				}.bind(this));
			},
			/** @callback fix the forbiddenExportImport rule */
			"forbiddenExportImport": function(editorContext, context, astManager) {
				return astManager.getAST(editorContext).then(function(ast) {
					var json = {sourceType: "module", ecmaVersion: 6};
					return this.jsProject.updateFile(this.jsProject.TERN_PROJECT, true, json).then(function(/*file*/) {
						return editorContext.syntaxCheck(ast.sourceFile.name);
					});
				}.bind(this));
			},
			"no-redeclare": function(editorContext, context, astManager) {
				return astManager.getAST(editorContext).then(function(ast) {
					var node = Finder.findNode(context.annotation.end, ast, {parents:true});
					if(node && node.type === 'Identifier') {
						var variableName = node.name;
						var parents = node.parents;
						if (parents) {
							// find the parent of the variable declaration
							var parentNode = parents.pop();
							loop: while (parentNode) {
								switch(parentNode.type) {
									case 'VariableDeclaration' :
										break loop;
									case 'FunctionDeclaration' :
									case 'FunctionExpression' :
										break loop;
								}
								parentNode = parents.pop();
							}
							if (parentNode) {
								var groups = [{data: {}, positions: []}];
								var start;
								switch(parentNode.type) {
									case 'VariableDeclaration' :
										parentNode = parents.pop();
										if (!parentNode) {
											return;
										}
										var end = parentNode.range[1];
										start = node.range[0];
										Estraverse.traverse(parentNode, {
											/* @callback */
											enter: function(n, parent) {
												if(n.range[1] <= start) {
													return Estraverse.VisitorOption.Skip;
												}
												if(n.range[0] > end) {
													//once we've left the parentNode
													return Estraverse.VisitorOption.Break;
												}
												if (n.type === 'Identifier' && variableName === n.name && n.range[0] >= start && n.range[1] <= end) {
													// record this reference
													var identifierStart = n.range[0];
													var length = n.range[1] - identifierStart;
													groups[0].positions.push({offset: identifierStart, length: length});
												}
											}
										});
										break;
									case 'FunctionDeclaration' :
									case 'FunctionExpression' :
										// this is a duplicated arguments
										start = node.range[0];
										groups[0].positions.push({offset: start, length: node.range[1] - start});
										break;
								}
								var linkModel = {groups: groups};
								return editorContext.exitLinkedMode().then(function() {
									return editorContext.enterLinkedMode(linkModel);
								});
							}
						}
					}
				});
			},
		}
	});
	
	return {
		JavaScriptQuickfixes: JavaScriptQuickfixes
	};
});
