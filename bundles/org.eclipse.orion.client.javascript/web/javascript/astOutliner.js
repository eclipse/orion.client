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
define([], function() {
	
	/**
	 * @name javascript.JSOutliner
	 * @description creates a new instance of the outliner
	 * @param {ASTManager} astManager The backing AST manager 
	 * @constructor
	 * @public
	 * @since 13.0
	 */
	function JSOutliner(astManager) {
		//TODO for now use the AST manager
		this.astmanager = astManager;
	}
	
	/**
	 * @name computeOutline
	 * @description callback from the <code>orion.edit.outliner</code> service to create
	 * an outline
	 * @function
	 * @public
	 * @memberof javascript.JSOutliner.prototype
	 * @param {orion.edit.EditorContext} editorContext The editor context
	 * @param {Object} options The options
	 * @returns {orion.Promise} to compute the outline
	 * @callback 
	 */
	JSOutliner.prototype.computeOutline = function(editorContext, options) {
		return this.astmanager.getAST(editorContext).then(function(ast) {
			return _outline(ast);
		});
	};
	
	/**
	 * @name _outline
	 * @description walks the AST creating outline nodes
	 * @private
	 * @param {?} ast The AST to visit
	 * @returns Array.<{?}> The outline or an empty array, never null
	 */
	function _outline(ast) {
		var outline = [], onode; //items -> {label: str, labelPost: str, start: num, end: num, children: []}
		if(ast) {
			onode = {label: ast.type, start: ast.range[0], end: ast.range[1], children: []};
			outline.push(onode);
			outlineObject(ast, onode.children);
		}
		return outline;
	}
	
	/**
	 * @name outlineObject
	 * @description Turns an object into outline elements
	 * @param obj
	 * @param array
	 * @returns returns
	 */
	function outlineObject(obj, array) {
		Object.keys(obj).forEach(function(key) {
			if(key === 'sourceFile' && obj.type !== "Program") {
				return;
			}
			if(key === 'start' || key === 'end') {
				if(typeof obj[key] === 'number') {
					//filter out common start / end props - we have ranges and loc
					return;
				}
			}
			if(key === 'parents' || key === 'parent') {
				return;
			}
			var e = {label: key};
			array.push(e);
			var n = obj[key];
			if(Array.isArray(n)) {
				if(n.length < 1) {
					e.labelPost = ": []";
					return;
				}
				e.children = [];
				switch(key) {
					case 'tokens': {
						outlineTokens(obj, e.children);
						break;
					}
					case 'errors': {
						outlineErrors(obj, e.children);
						break;
					}
					case 'leadingComments': {
						outlineComments(obj, 'leadingComments', e.children);
						break;
					}
					case 'trailingComments': {
						outlineComments(obj, 'trailingComments', e.children);
						break;
					}
					case 'comments': {
						outlineComments(obj, 'comments', e.children);
						break;
					}
					case 'range': {
						outlineRange(e, n);
						break;
					}
					default: {
						n.forEach(function(entry) {
							if(entry.type) {
								//An AST node
								var _e = {label: entry.type, children: [], start: entry.range[0], end: entry.range[1]};
								e.children.push(_e);
								outlineObject(entry, _e.children);
							} else {
								outlineObject(entry, e.children);
							}
						});
					}
				}
			} else if(n && typeof n === 'object') {
				e.children = [];
				if(n.type) {
					//An AST node
					var _e = {label: n.type, children: [], start: n.range[0], end: n.range[1]};
					e.children.push(_e);
					outlineObject(n, _e.children);
				} else {
					if(Object.keys(n).length < 1) {
						e.labelPost = ": {}";
						delete e.children;
					} else {
						outlineObject(n, e.children);
					}
				}
			} else {
				e.labelPost = ": "+n;
			}
		});
	}
	
	/**
	 * @name outlineTokens
	 * @description Outlines the tokens array (if present)
	 * @param {?} ast The backing AST
	 * @param {Array.<{?}> array The array to record new outlined tokens into
	 */
	function outlineTokens(ast, array) {
		if(ast && Array.isArray(ast.tokens)) {
			ast.tokens.forEach(function(token) {
				var t = {label: token.type, start: token.start, end: token.end, children: []};
				array.push(t);
				addProps(token, t.children);
			});
		}
	}
	
	/**
	 * @name outlineErrors
	 * @description Outlines the errors array (if present)
	 * @param {?} ast The backing AST node
	 * @param {Array.<{?}>} array The array to record outlined errors into
	 */
	function outlineErrors(ast, array) {
		if(ast && Array.isArray(ast.errors)) {
			ast.errors.forEach(function(error) {
				var e = {label: error.message, start: error.start, end: error.end, children: []};
				array.push(e);
				addProps(error, e.children);
			});
		}
	}
	
	/**
	 * @name outlineComments
	 * @description Outlines the comment node from the given property name. One of 'comments', 'leadingComments' or 'trailngComments'
	 * @param {?} ast The backing AST node
	 * @param {string} prop The name of the comment property to outline
	 * @param {Array.<{?}>} array The array to record outlined comments into
	 */
	function outlineComments(ast, prop, array) {
		if(ast && Array.isArray(ast[prop])) {
			ast[prop].forEach(function(comment) {
				var c = {label: comment.type === 'Block' ? 'Block Comment' : 'Line Comment', start: comment.start, end: comment.end, children: []};
				array.push(c);
				addProps(comment, c.children);
			});
		}
	}
	
	/**
	 * @name outlineRange
	 * @description Outlines the standard rnage array
	 * @param {?} pnode The current outline parent node for the range
	 * @param {Array.<number>} range The actual values of the range array
	 */
	function outlineRange(pnode, range) {
		pnode.labelPost = ': ['+range[0]+', '+range[1]+']';
		pnode.start = range[0];
		pnode.end = range[1];
		delete pnode.children;
	}
	
	function addProps(obj, array) {
		Object.keys(obj).forEach(function(key) {
			var p = obj[key];
			var pnode = {label: key};
			array.push(pnode);
			if(Array.isArray(p)) {
				if(p.length < 1) {
					pnode.labelPost = ": []";
				} else if(key === 'range') {
					outlineRange(pnode, p);
				}
			} else if(p && typeof p === 'object') {
				pnode.children = [];
				outlineObject(p, pnode.children);
			} else {
				if(typeof p === 'string') {
					pnode.labelPost = ': "'+p+'"';
				} else {
					pnode.labelPost = ": "+p;
				}
			}
		});
	}
	
	return {
		JSOutliner: JSOutliner
		};
});
