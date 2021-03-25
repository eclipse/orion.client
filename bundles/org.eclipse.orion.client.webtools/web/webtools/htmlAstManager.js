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
/*globals Tautologistics */
define([
	'orion/Deferred',
	'orion/objects',
	'javascript/lru',
	'htmlparser2/parser',
], function(Deferred, Objects, LRU, HtmlParser2) {

	var handler = {
		ast: null,
		tagstack: [],
		errors: [],
		attribstack: [],
		/** @callback */
		onopentag: function(name, attribs, range) {
			this.trailingTag = null;
			var node = Object.create(null);
			node.range = [0, 0];
			if (Array.isArray(range)) {
				node.range[0] = range[0];
				node.range[1] = range[1]; // Inline tags don't have separate onclosetag calls
				node.openrange = [range[0], range[1]];
			}
			node.name = name;
			node.type = 'tag'; //$NON-NLS-1$

			node.attributes = [];
			this.attribstack.forEach(function(attrib) {
				node.attributes.push(attrib);
			});
			node.children = [];
			var tag = this._getLastTag();
			if (tag) {
				tag.children.push(node);
			} else {
				this.ast.children.push(node);
			}
			this.attribstack = [];
			this.tagstack.push(node);
		},
		/** @callback */
		onclosetag: function(tagname, range, isSelfClosing) {
			var tag = this._getLastTag();
			if (tag && tag.name === tagname) {
				if (range) {
					tag.range[1] = range[1];
					tag.endrange = [range[0], range[1]];
				} else {
					// No matching closing tag or void element
					// TODO Need to add tests for this, can it have children as well as text?
					if (tag.openrange && tag.text) {
						tag.range[1] = tag.openrange[1] + tag.text.value.length;
						tag.endrange = [tag.openrange[1], tag.openrange[1]];
					}
				}
				// If the tag is self closing <span/>
				if (isSelfClosing){
					tag.selfClosing = true;
				}
				this.tagstack.pop();
			}
		},
		/** @callback */
		onopentagname: function(name, rangeStart) {
			this.trailingTag = {
				name: name,
				start: rangeStart
			};
		},
		/** @callback */
		onattribname: function(name, rangeStart) {
			this.trailingAttrib = {
				name: name,
				start: rangeStart
			};
		},
		/** @callback */
		onattribute: function(name, value, range) {
			this.trailingAttrib = null;
			var node = Object.create(null);
			node.value = value;
			if (Array.isArray(range)) {
				if (range.length === 3) {
					node.range = [range[0], range[2]];
					if ((range[2] - range[1]) <= 1) {
						// no actual value was specified
						node.value = null;
					} else {
						node.valueRange = [range[1], range[2]];
					}
				} else {
					node.range = [range[0], range[1]];
				}
			} else {
				node.range = [0, 0];
			}
			node.name = name;
			node.type = 'attr'; //$NON-NLS-1$
			this.attribstack.push(node);
		},
		/** @callback */
		/** @callback */
		onprocessinginstruction: function(name, data, range) {
			var node = Object.create(null);
			node.range = Array.isArray(range) ? [range[0], range[1]] : [0, 0];
			node.name = name;
			node.type = 'instr'; //$NON-NLS-1$
			node.value = data;
			var tag = this._getLastTag();
			if (tag) {
				tag.children.push(node);
			} else {
				this.ast.children.push(node);
			}
		},
		/** @callback */
		oncomment: function(data, range) {
			var node = Object.create(null);
			node.range = Array.isArray(range) ? [range[0], range[1]] : [0, 0];
			node.type = 'comment'; //$NON-NLS-1$
			node.data = data;

			var tag = this._getLastTag();
			if (tag) {
				tag.children.push(node);
			} else {
				this.ast.children.push(node);
			}
		},
		/** @callback */
		oncdatastart: function() {
			var node = Object.create(null);
			node.range = [0, 0];
			node.type = 'cdata'; //$NON-NLS-1$
		},
		/** @callback */
		ontext: function(text) {
			var node = Object.create(null);
			node.range = [0, 0];
			node.type = 'text'; //$NON-NLS-1$
			node.value = text;
			var tag = this._getLastTag();
			if (tag) {
				tag.text = node;
			}
		},
		/** @callback */
		onerror: function(error) {
			var err = Object.create(null);
			err.error = error;
			err.range = [0, 0];
			this.errors.push(err);
		},
		/** @callback */
		onend: function(range) {
			// The ordering is important here as trailing attributes need to be added to the tag
			if (this.trailingAttrib) {
				// TODO Recover trailing value
				this.onattribute(this.trailingAttrib.name, null, [this.trailingAttrib.start, range[1]]);
			}
			if (this.trailingTag) {
				this.onopentag(this.trailingTag.name, null, [this.trailingTag.start, range[1]]);
			}

			if (Array.isArray(range)) {
				this.ast.range[0] = this.ast.children.length > 0 ? this.ast.children[0].range[0] : 0;
				this.ast.range[1] = range[1];
			}
		},
		/** @callback */
		onreset: function() {
			this.ast = Object.create(null);
			this.ast.range = [0, 0];
			this.ast.children = [];
			this.tagstack = [];
			this.comments = [];
			this.errors = [];
			this.attribstack = [];
		},
		/** @callback */
		_getLastTag: function() {
			if (this.tagstack && this.tagstack.length > 0) {
				return this.tagstack[this.tagstack.length - 1];
			}
			return null;
		}
	};

	var registry;

	/**
	 * Provides a shared AST.
	 * @class Provides a shared parsed AST.
	 * @param {Object} serviceRegistry The platform service registry
	 * @since 8.0
	 */
	function HtmlAstManager(serviceRegistry) {
		this.cache = new LRU(10);
		registry = serviceRegistry;
	}

	/**
	 * @description Delegate to log timings to the metrics service
	 * @param {Number} end The end time
	 * @since 12.0
	 */
	function logTiming(end) {
		if (registry) {
			var metrics = registry.getService("orion.core.metrics.client"); //$NON-NLS-1$
			if (metrics) {
				metrics.logTiming('language tools', 'parse', end, 'text/html'); //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
			}
		}
	}

	Objects.mixin(HtmlAstManager.prototype, /** @lends webtools.HtmlAstManager.prototype */ {
		/**
		 * @param {orion.editor.EditorContext} editorContext
		 * @returns {orion.Promise} A promise resolving to the AST.
		 */
		getAST: function(editorContext) {
			var _self = this;
			return editorContext.getFileMetadata().then(function(metadata) {
				var m = metadata || {};
				var loc = _self._getKey(m);
				var ast = _self.cache.get(loc);
				if (ast) {
					return new Deferred().resolve(ast);
				}
				return editorContext.getText().then(function(text) {
					ast = _self.parse(text);
					_self.cache.put(loc, ast);
					if (m.location) {
						//only set this if the original metadata has a real location
						ast.fileLocation = m.location;
					}
					return ast;
				});
			});
		},
		/**
		 * Returns the key to use when caching
		 * @param {Object|String} metadata The file infos
		 */
		_getKey: function _getKey(metadata) {
			if (typeof metadata === 'string') {
				return metadata;
			}
			if (!metadata.location) {
				return 'unknown'; //$NON-NLS-1$
			}
			return metadata.location;
		},

		/**
		 * @private
		 * @param {String} text The code to parse.
		 * @returns {Object} The AST.
		 */
		parse: function(text) {
			var parser = new HtmlParser2(handler, {
				decodeEntities: true,
				recognizeSelfClosing: true
			});
			var start = Date.now();
			parser.reset();
			parser.write(text);
			parser.done();
			var end = Date.now() - start;
			if (handler.ast) {
				handler.ast.source = text;
				handler.ast.errors = handler.errors;
			}
			logTiming(end);
			return handler.ast;
		},

		/**
		 * Callback from the orion.edit.model service
		 * @param {Object} event An <tt>orion.edit.model</tt> event.
		 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#orion.edit.model
		 */
		onModelChanging: function(event) {
			if (this.inputChanged) {
				//TODO haxxor, eat the first model changing event which immediately follows
				//input changed
				this.inputChanged = null;
			} else {
				this.cache.remove(this._getKey(event.file));
			}
		},
		/**
		 * Callback from the orion.edit.model service
		 * @param {Object} event An <tt>orion.edit.model</tt> event.
		 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#orion.edit.model
		 */
		onInputChanged: function(event) {
			this.inputChanged = event;
		},
		/**
		 * Callback from the FileClient
		 * @param {Object} event a <tt>fileChanged</tt> event
		 */
		onFileChanged: function(event) {
			if (event && event.type === 'Changed' && Array.isArray(event.modified)) {
				event.modified.forEach(function(file) {
					if (typeof file === 'string') {
						this.cache.remove(this._getKey(file));
					}
				}.bind(this));
			}
		}
	});
	return {
		HtmlAstManager: HtmlAstManager
	};
});
