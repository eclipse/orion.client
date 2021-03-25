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
	'orion/Deferred',
	'orion/objects',
	'javascript/lru',
	'plugins/languages/json/parser'
], function(Deferred, Objects, LRU, Parser) {
	var cache = new LRU(10),
		jsoncache = new LRU(10),
		escache = new LRU(10);

	/**
	 * Provides a shared AST.
	 * @name javascript.JsonAstManager
	 * @class Provides a shared AST for JSON files.
	 * @since 15.0
	 */
	function JsonAstManager() {}

	/**
	 * Returns the key to use when caching
	 * @param {Object|String} metadata The file infos
	 */
	function getKey(metadata) {
		if (typeof metadata === 'string') {
			return metadata;
		}
		if (!metadata || !metadata.location) {
			return 'unknown'; //$NON-NLS-1$
		}
		return metadata.location;
	}

	/**
	 * @description Computes the root for file look ups to use from the context of the parsed JSON file.
	 * This data allows us to avoid calling additional editor context promises later to get the same info again
	 * @param {?} metadata The metadata returned from the EditorContext#getFileMetadata()
	 * @returns {String} The root file location based on the parsed JSON file
	 */
	function computeRoot(metadata) {
		if (metadata && Array.isArray(metadata.parents) && metadata.parents.length > 0) {
			var p = metadata.parents[metadata.parents.length - 1];
			return p.Location || p.location;
		}
		return null;
	}

	/**
	 * @description Simple function to convert the parse errors to a human-readable form
	 * @param {?} err The error object
	 * @returns {?} The converted error
	 */
	function convertError(err) {
		var error = {};
		var message = Parser.getParseErrorMessage(err.error);
		if (typeof message === 'string') {
			error.message = message;
		}
		if (typeof err.offset === "number") {
			error.start = err.offset;
			if (typeof err.length === "number") {
				error.end = error.start + err.length;
			}
		}
		return error;
	}

	Objects.mixin(JsonAstManager.prototype, /** @lends javascript.JsonAstManager.prototype */ {
		/**
		 * @description Returns the AST representing the text from the backing editor context
		 * @param {orion.editor.EditorContext} editorContext
		 * @param {String} fileName The name of the file we want the AST for. This name is checked against the file metadata,
		 * and if the names to not match, return null
		 * @returns {orion.Promise} A promise resolving to the AST.
		 * @deprecated This function is provided only to be able to use the malformed AST that the parser provides out of the box. Callers should
		 * use the getWellFormedAST function that produces an ESTree-spec compliant AST
		 */
		getAST: function(editorContext, fileName) {
			return editorContext.getFileMetadata().then(function(metadata) {
				if (metadata.name === fileName) {
					var loc = getKey(metadata),
						ast = cache.get(loc);
					if (ast) {
						return new Deferred().resolve(ast);
					}
					return editorContext.getText().then(function(text) {
						var errors = [];
						try {
							ast = Parser.parseTree(text, errors, {});
						} catch (e) {
							//create 'dead' AST
							ast = Object.create(null);
						}
						if (ast) {
							ast.errors = errors.map(convertError);
							ast.root = computeRoot(metadata);
							cache.put(loc, ast);
						}
						return ast;
					});
				}
				return null;
			});
		},
		/**
		 * @description Returns an ESTree spec-compliant AST
		 * @function
		 * @param {EditorContext} editorContext The backing editor context
		 * @param {String} fileName The name of the file to get the AST for
		 * @returns {Deferred} A promise to return an AST
		 */
		getWellFormedAST: function getWellFormedAST(editorContext, fileName) {
			return editorContext.getFileMetadata().then(function(metadata) {
				if (metadata.name === fileName) {
					var loc = getKey(metadata),
						ast = escache.get(loc);
					if (ast) {
						return new Deferred().resolve(ast);
					}
					return editorContext.getText().then(function(text) {
						var errors = [],
							stack = [];
						ast = {type: "Program", root: computeRoot(metadata), range: [0, 0]};
						stack.push(ast);
						function closeProperty(node, end) {
							if (node.type === "Property") {
								//close the property if we are working on one
								var n = stack.pop();
								n.range[1] = end;
							}
						}
						try {
							Parser.visit(text, {
								onObjectBegin: function(offset) {
									var p = stack[stack.length - 1];
									var n = {type: 'ObjectExpression', properties: [], range: [offset, -1], parent: p};
									if (p.type === "Program") {
										p.body = n;
									} else if (p.type === "Property") {
										p.value = n;
									} else if(p.type === "ArrayExpression") {
										p.elements.push(n);
									}
									stack.push(n);
								},
								onObjectEnd: function(offset, lngth) {
									var p = stack.pop();
									p.range[1] = offset + lngth;
									closeProperty(p, offset + lngth);
								},
								onObjectProperty: function(propertyName, offset, lngth) {
									var p = stack[stack.length - 1];
									var n = {type: "Property", range: [offset, -1], key: null, value: null, parent: p};
									n.key = {type: 'Literal', value: propertyName, range: [offset, offset + lngth], parent: n};
									p.properties.push(n);
									stack.push(n);
								},
								/**
								 * @callback
								 */
								onArrayBegin: function(offset, lngth) {
									var p = stack[stack.length - 1];
									var n = {type: "ArrayExpression", elements: [], range: [offset, -1], parent: p};
									p.value = n;
									stack.push(n);
								},
								onArrayEnd: function(offset, lngth) {
									var p = stack.pop();
									p.range[1] = offset + lngth;
									closeProperty(stack[stack.length - 1], offset + lngth);
								},
								onLiteralValue: function(value, offset, lngth) {
									var p = stack[stack.length - 1];
									var n = {type: "Literal", value: value, range: [offset, offset + lngth], parent: p};
									if (p.type === "Property") {
										p.value = n;
									} else if (p.type === "ArrayExpression") {
										p.elements.push(n);
									}
									closeProperty(p, offset + lngth);
								},
								/**
								 * @callback
								 */
								onSeparator: function(sep, offset, lngth) {
									var p = stack[stack.length - 1];
									if(p.type === "Property" && sep === ",") {
										closeProperty(p, offset + lngth);
									}
								},
								onError: function(error, offset, lngth) {
									errors.push({error: error, offset: offset, length: lngth});
								}
							}, {});
						} catch (e) {
							//ignore, we create a new root
						}
						if (ast) {
							if(ast.body) {
								ast.range = [ast.body.range[0], ast.body.range[1]];
							} else {
								ast.range = [0, text.length];
							}
							ast.errors = errors.map(convertError);
							escache.put(loc, ast);
						}
						return ast;
					});
				}
				return null;
			});
		},
		/**
		 * @name getJSON
		 * @description Returns the JSON object of the backing text from the editor context
		 * @function
		 * @param {orion.editor.EditorContext} editorContext The backing editor context
		 * @param {String} fileName The name of the file to get the JSON for
		 * @returns {?} The JSON object or null
		 */
		getJSON: function getJSON(editorContext, fileName) {
			return editorContext.getFileMetadata().then(function(metadata) {
				if (metadata.name === fileName) {
					var loc = getKey(metadata),
						json = jsoncache.get(loc);
					if (json) {
						return new Deferred().resolve(json);
					}
					return editorContext.getText().then(function(text) {
						var errors = [];
						try {
							json = Parser.parse(text, errors, {});
						} catch (e) {
							//create 'dead' JSON object
							json = Object.create(null);
						}
						if (json) {
							json.errors = errors.map(convertError);
							json.root = computeRoot(metadata);
							jsoncache.put(loc, json);
						}
						return json;
					});
				}
				return null;
			});
		},

		/**
		 * Callback from the orion.edit.model service
		 * @param {Object} event An <tt>orion.edit.model</tt> event.
		 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#orion.edit.model
		 */
		onModelChanging: function(evnt) {
			if (this.inputChanged) {
				this.inputChanged = null;
			} else {
				cache.remove(getKey(evnt.file));
				jsoncache.remove(getKey(evnt.file));
				escache.remove(getKey(evnt.file));
			}
		},
		/**
		 * Callback from the orion.edit.model service
		 * @param {Object} event An <tt>orion.edit.model</tt> event.
		 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#orion.edit.model
		 */
		onInputChanged: function(evnt) {
			this.inputChanged = evnt;
		},
		/**
		 * Callback from the FileClient
		 * @param {Object} event a <tt>Changed</tt> event
		 */
		onFileChanged: function(evnt) {
			if (evnt && evnt.type === 'Changed' && Array.isArray(evnt.modified)) {
				evnt.modified.forEach(function(file) {
					if (typeof file === 'string') {
						cache.remove(getKey(file));
						jsoncache.remove(getKey(file));
						escache.remove(getKey(file));
					}
				});
			}
		}
	});
	return {
		JsonAstManager: JsonAstManager,
		findNodeAtLocation: Parser.findNodeAtLocation
	};
});
