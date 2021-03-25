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
/*eslint-env browser, amd*/
define("orion/editor/linkedMode", [
	'i18n!orion/editor/nls/messages',
	'orion/keyBinding',
	'orion/editor/keyModes',
	'orion/editor/annotations',
	'orion/objects',
	'orion/util'
], function(messages, mKeyBinding, mKeyModes, mAnnotations, objects) {

	/**
	 * @name LinkedContentAssist
	 * @description Creates a new LinkedContentAssist object which is used for linked data in templates
	 * @constructor 
	 * @param {Object} linkedData The linked data
	 * @returns A new LinkedContentAssist object
	 * @since 9.0
	 */
	function LinkedContentAssist(linkedData) {
		this._data = linkedData;
	}
	
	LinkedContentAssist.prototype = {
		/**
		 * @description Removes the prefix from the given string
		 * @function
		 * @param {String} prefix
		 * @param {String} string
		 * @returns {String} The substring after removing the prefix
		 */
		chop: function(prefix, string) {
			return string.substring(prefix.length);
		},
		
		/**
		 * @callback
		 */
		computeProposals: function(buffer, offset, context) {
			var prefix = context.prefix;
			var proposals = [];
			var linkedstyle = this._data.style ? this._data.style : null;
			linkedstyle = linkedstyle ? linkedstyle : 'emphasis'; //$NON-NLS-1$
			var values = this._data.values;
			for (var i = 0; i < values.length; i++) {
				var val = values[i];
				if(typeof val === 'string' && val.indexOf(prefix) === 0) {
					proposals.push({proposal: this.chop(prefix, val), 
						description: val,
						hover: val,
						style: linkedstyle
					});
				} else if(typeof val === 'object' && val.proposal) {
					proposals.push({proposal: this.chop(prefix, val.proposal), 
						description: val.description ? val.description : val.proposal,
						hover: val.hover ? val.hover : val.proposal,
						style: linkedstyle
					});
				}
			}
			var linkedtitle = this._data.title ? this._data.title : null;
			if (0 < proposals.length) {
				proposals.splice(0, 0,{
					proposal: '',
					description: linkedtitle ? linkedtitle : 'Options', //$NON-NLS-0$
					style: 'noemphasis_title', //$NON-NLS-0$
					unselectable: true
				});	
			}
			return proposals;
		}
	};

	/**
	 * @name LinkedMode
	 * @description Create a new LinkedMode
	 * @param {Editor} editor The backing editor
	 * @param {UndoStack} undoStack The undo stack
	 * @param contentAssist
	 * @returns returns
	 */
	function LinkedMode(editor, undoStack, contentAssist) {
		var textView = editor.getTextView();
		mKeyModes.KeyMode.call(this, textView);
		this.editor = editor;
		this.undoStack = undoStack;
		this.contentAssist = contentAssist;
		
		this.linkedModeModel = null;
		
		textView.setAction("linkedModeEnter", function() { //$NON-NLS-0$
			this.exitLinkedMode(true);
			return true;
		}.bind(this));
		textView.setAction("linkedModeCancel", function() { //$NON-NLS-0$
			this.exitLinkedMode(true);
			return true;
		}.bind(this));
		textView.setAction("linkedModeNextGroup", function() { //$NON-NLS-0$
			var model = this.linkedModeModel;
			this.selectLinkedGroup((model.selectedGroupIndex + 1) % model.groups.length);
			return true;
		}.bind(this));
		textView.setAction("linkedModePreviousGroup", function() { //$NON-NLS-0$
			var model = this.linkedModeModel;
			this.selectLinkedGroup(model.selectedGroupIndex > 0 ? model.selectedGroupIndex-1 : model.groups.length-1);
			return true;
		}.bind(this));
		
		/**
		 * Listener called when Linked Mode is active. Updates position's offsets and length
		 * on user change. Also escapes the Linked Mode if the text buffer was modified outside of the Linked Mode positions.
		 */
		this.linkedModeListener = {
		
			onActivating: /* @callback */ function(evnt) {
				if (this._groupContentAssistProvider) {
					this.contentAssist.setProviders([this._groupContentAssistProvider]);
					this.contentAssist.setProgress(null);
				}
			}.bind(this),
			
			onModelChanged: function(evnt) {
				if (this.ignoreVerify) { return; }

				// Get the position being modified
				var start = this.editor.mapOffset(evnt.start);
				var model = this.linkedModeModel, positionChanged, changed;
				while (model) {
					positionChanged = this._getPositionChanged(model, start, start + evnt.removedCharCount);
					changed = positionChanged.position;
					if (changed === undefined || changed.model !== model) {
						// The change has been done outside of the positions, exit the Linked Mode
						this.exitLinkedMode(false);
						model = this.linkedModeModel;
					} else {
						break;
					}
				}
				if (!model) { return; }

				// Update position offsets for this change. Group changes are done in #onVerify
				var deltaCount = 0;
				var changeCount = evnt.addedCharCount - evnt.removedCharCount;
				var sortedPositions = positionChanged.positions, position, pos;
				for (var i = 0; i < sortedPositions.length; ++i) {
					pos = sortedPositions[i];
					position = pos.position;
					var inside = position.offset <= start && start <= position.offset + position.length;
					if (inside && !pos.ansestor) {
						position.offset += deltaCount;
						position.length += changeCount;
						deltaCount += changeCount;
					} else {
						position.offset += deltaCount;
						if (pos.ansestor && inside) {
							position.length += changeCount;
						}
					}
					if (pos.escape) {
						pos.model.escapePosition = position.offset;
					}
				}
				this._updateAnnotations(sortedPositions);
			}.bind(this),

			onVerify: function(evnt) {
				if (this.ignoreVerify) { return; }

				// Get the position being modified
				var start = this.editor.mapOffset(evnt.start);
				var end = this.editor.mapOffset(evnt.end);
				var model = this.linkedModeModel, positionChanged, changed;
				while (model) {
					positionChanged = this._getPositionChanged(model, start, end);
					changed = positionChanged.position;
					if (changed === undefined || changed.model !== model) {
						// The change has been done outside of the positions, exit the Linked Mode
						this.exitLinkedMode(false);
						model = this.linkedModeModel;
					} else {
						break;
					}
				}
				if (!model) { return; }
				
				// Make sure changes in a same group are compound
				var undo = this._compoundChange;
				if (undo) {
					if (!(undo.owner.model === model && undo.owner.group === changed.group)) {
						this.endUndo();
						this.startUndo();
					}
				} else {
					this.startUndo();
				}

				model.selectedGroupIndex = changed.group;
				
				// Update position offsets taking into account all positions in the same changing group
				var deltaCount = 0;
				var changeCount = evnt.text.length - (end - start);
				var sortedPositions = positionChanged.positions, position, pos;
				var deltaStart = start - changed.position.offset, deltaEnd = end - changed.position.offset;
				for (var i = 0; i < sortedPositions.length; ++i) {
					pos = sortedPositions[i];
					position = pos.position;
					pos.oldOffset = position.offset;
					if (pos.model === model && pos.group === changed.group) {
						position.offset += deltaCount;
						position.length += changeCount;
						deltaCount += changeCount;
					} else {
						position.offset += deltaCount;
						if (pos.ansestor) {
							position.length += changed.count * changeCount;
						}
					}
					if (pos.escape) {
						pos.model.escapePosition = position.offset;
					}
				}
				
				// Cancel this modification and apply same modification to all positions in changing group
				this.ignoreVerify = true;
				var delta = 0;
				for (i = sortedPositions.length - 1; i >= 0; i--) {
					pos = sortedPositions[i];
					if (pos.model === model && pos.group === changed.group) {
						var text = evnt.text;
						if(Array.isArray(text)) {
							text = evnt.text[i];
						}
						this.editor.setText(text, pos.oldOffset + deltaStart , pos.oldOffset + deltaEnd, false);
						delta = pos.oldOffset <= evnt.start ? delta + changeCount : delta;
					}
				}
				this.ignoreVerify = false;
				this.editor.setCaretOffset(evnt.end + delta);
				evnt.text = null;
				this._updateAnnotations(sortedPositions);
			}.bind(this)
		};
	}
	LinkedMode.prototype = new mKeyModes.KeyMode();
	objects.mixin(LinkedMode.prototype, {
		/**
		 * @description Create the keybindings
		 * @function
		 * @returns {Array.<Object>} The keybindings
		 */
		createKeyBindings: function() {
			var KeyBinding = mKeyBinding.KeyBinding;
			var bindings = [];
			bindings.push({actionID: "linkedModeEnter", keyBinding: new KeyBinding(13)}); //$NON-NLS-0$
			bindings.push({actionID: "linkedModeCancel", keyBinding: new KeyBinding(27)}); //$NON-NLS-0$
			bindings.push({actionID: "linkedModeNextGroup", keyBinding: new KeyBinding(9)}); //$NON-NLS-0$
			bindings.push({actionID: "linkedModePreviousGroup", keyBinding: new KeyBinding(9, false, true)}); //$NON-NLS-0$
			return bindings;
		},
		/**
		 * Starts Linked Mode and registers the listeners.
		 * @param {Object} linkedModeModel An object describing the model to be used by linked mode.
		 * Contains one or more position groups. If a position in a group is edited, the other positions in
		 * the same group are edited the same way. The model structure is as follows:
		 * <pre>{
		 *		groups: [{
		 *			data: {},
		 *			positions: [{
		 *				offset: 10, // Relative to the text buffer
		 *				length: 3
		 *			}]
		 *		}],
		 *		escapePosition: 19, // Relative to the text buffer
		 * }</pre>
		 *
		 * Each group in the model has an optional <code>data</code> property which can be
		 * used to provide additional content assist for the group.  The <code>type</code> in
		 * data determines what kind of content assist is provided. These are the support
		 * structures for the <code>data</code> property.
		 * <pre>{
		 *		type: "link"
		 *		values: ["proposal0", "proposal1", ...]
		 * }</pre>
		 *
		 * The "link" data struture provides static content assist proposals stored in the
		 * <code>values</code> property.
		 *
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.Template}<br/>
		 * {@link orion.editor.TemplateContentAssist}<br/>
		 * </p>
		 */
		enterLinkedMode: function(linkedModeModel) {
			if (!this.linkedModeModel) {
				var textView = this.editor.getTextView();
				textView.addKeyMode(this);
				textView.addEventListener("Verify", this.linkedModeListener.onVerify);
				textView.addEventListener("ModelChanged", this.linkedModeListener.onModelChanged);
				var contentAssist = this.contentAssist;
				contentAssist.addEventListener("Activating", this.linkedModeListener.onActivating);
				this.editor.reportStatus(messages.linkedModeEntered, null, true);
			}
			this._sortedPositions = null;
			if (this.linkedModeModel) {
				linkedModeModel.previousModel = this.linkedModeModel;
				linkedModeModel.parentGroup = this.linkedModeModel.selectedGroupIndex;
				this.linkedModeModel.nextModel = linkedModeModel;
			}
			this.linkedModeModel = linkedModeModel;
			var select = true;
			var caretOffset = this.editor.getCaretOffset();
			linkedModeModel.groups[0].positions.some(function(p) {
				if (p.offset <= caretOffset && caretOffset <= p.offset + p.length) {
					select = false;
					return true;
				}
			});
			this.selectLinkedGroup(0, select);
		},
		/** 
		 * Exits Linked Mode. Optionally places the caret at linkedMode escapePosition. 
		 * @param {Boolean} [escapePosition=false] if true, place the caret at the  escape position.
		 */
		exitLinkedMode: function(escapePosition) {
			if (!this.isActive()) {
				return;
			}
			if (this._compoundChange) {
				this.endUndo();
				this._compoundChange = null;
			}
			this._sortedPositions = null;
			var model = this.linkedModeModel;
			this.linkedModeModel = model.previousModel;
			model.parentGroup = model.previousModel = undefined;
			if (this.linkedModeModel) {
				this.linkedModeModel.nextModel = undefined;
			}
			if (!this.linkedModeModel) {
				var editor = this.editor;
				var textView = editor.getTextView();
				textView.removeKeyMode(this);
				textView.removeEventListener("Verify", this.linkedModeListener.onVerify);
				textView.removeEventListener("ModelChanged", this.linkedModeListener.onModelChanged);
				var contentAssist = this.contentAssist;
				contentAssist.removeEventListener("Activating", this.linkedModeListener.onActivating);
				contentAssist.offset = undefined;
				this.editor.reportStatus(messages.linkedModeExited, null, true);
			}
			if (escapePosition && typeof model.escapePosition === "number") {
				editor.setCaretOffset(model.escapePosition, false);
			}
			this.selectLinkedGroup(0);
		},
		/**
		 * @description Start undoing
		 */
		startUndo: function() {
			if (this.undoStack) {
				var slf = this;
				var model = this.linkedModeModel;
				this._compoundChange = this.undoStack.startCompoundChange({
					model: model,
					group: model.selectedGroupIndex,
					/**
					 * @callback 
					 */
					end: function() {
						slf._compoundChange = null;
					}
				});
			}
		}, 
		/**
		 * @description Ends the undo
		 */
		endUndo: function() {
			if (this.undoStack) {
				this.undoStack.endCompoundChange();
			}
		},
		/**
		 * @description Returns if linked mode is active in the current editor
		 * @function
		 * @returns {Boolean} If linked mode is active
		 */
		isActive: function() {
			return Boolean(this.linkedModeModel);
		},
		/**
		 * @description Returns if linked mode status is active in the current editor
		 * @function
		 * @returns {Boolean} If linked mode status is active
		 */
		isStatusActive: function() {
			return Boolean(this.linkedModeModel);
		},
		/**
		 * @description Selects the group of the given index from the currently active model
		 * @param {Number} index The group index to select
		 * @param {Boolean} [selectText=true] whether the group text should be selected
		 */
		selectLinkedGroup: function(index, selectText) {
			var model = this.linkedModeModel;
			if (model) {
				model.selectedGroupIndex = index;
				var group = model.groups[index];
				var position = group.positions[0];
				var editor = this.editor;
				if (selectText === undefined || selectText) {
					editor.setSelection(position.offset, position.offset + position.length);
				}
				var contentAssist = this.contentAssist;
				if (contentAssist) {
					contentAssist.offset = undefined;
					if (group.data && group.data.type === "link" && group.data.values) {
						var provider = this._groupContentAssistProvider = new LinkedContentAssist(group.data);
						/**
						 * @callback 
						 */
						provider.getPrefix = function() {
							var selection = editor.getSelection();
							if (selection.start === selection.end) {
								var caretOffset = editor.getCaretOffset();
								if (position.offset <= caretOffset && caretOffset <= position.offset + position.length) {
									return editor.getText(position.offset, caretOffset);
								}
							}
							return "";
						};
						contentAssist.offset = position.offset;
						contentAssist.deactivate();
						contentAssist.activate();
					} else if (this._groupContentAssistProvider) {
						this._groupContentAssistProvider = null;
						contentAssist.deactivate();
					}
				}
			}
			this._updateAnnotations();
		},
		/**
		 * @description Collect all model positions into the <code>all</code> array
		 * @function
		 * @private
		 * @param {Array.<Object>} all The collector for the position objects
		 * @param {Object} model The linked model to collect all positions from
		 * @param {Object} delta The change in position
		 */
		_getModelPositions: function(all, model, delta) {
			var groups = model.groups;
			for (var i = 0; i < groups.length; i++) {
				var positions = groups[i].positions;
				for (var j = 0; j < positions.length; j++) {
					var position = positions[j];
					if (delta) {
						position = {offset: position.offset + delta, length: position.length};
					}
					var pos = {
						index: j,
						group: i,
						count: positions.length,
						model: model,
						position: position
					};
					all.push(pos);
					if (model.nextModel && model.nextModel.parentGroup === i) {
						pos.ansestor = true;
						this._getModelPositions(all, model.nextModel, (delta || 0) + positions[j].offset - positions[0].offset);
					}
				}
			}
		},
		/**
		 * @description Returns an array of all of the positions sorted 
		 * @function
		 * @private
		 * @param {Object} model The linked model to get and sort positions from
		 * @returns {Array.<Object>} The sorted array of positions from the given model
		 */
		_getSortedPositions: function(model) {
			var all = this._sortedPositions;
			if (!all) {
				all = [];
				// Get the root linked model
				while (model.previousModel) {
					model = model.previousModel;
				}
				// Get all positions under model expanding group positions of stacked linked modes
				this._getModelPositions(all, model);
				// Add escape position for all models
				while (model) {
					if (typeof model.escapePosition === "number") {
						all.push({
							escape: true,
							model: model,
							position: {offset: model.escapePosition, length: 0}
						});
					}
					model = model.nextModel;
				}
				all.sort(function(a, b) {
					return a.position.offset - b.position.offset;
				});
				this._sortedPositions = all;
			}
			return all;
		},
		/**
		 * @description Returns if the given start - end position has changed in the given model
		 * @function
		 * @private
		 * @param {Object} model The model to check
		 * @param {Number} start The start
		 * @param {Number} end The end
		 * @returns {Object} The changed position
		 */
		_getPositionChanged: function(model, start, end) {
			var changed;
			var sortedPositions = this._getSortedPositions(model);
			for (var i = sortedPositions.length - 1; i >= 0; i--) {
				if (sortedPositions[i].escape) {
					continue;
				}
				var position = sortedPositions[i].position;
				if (position.offset <= start && end <= position.offset + position.length) {
					changed = sortedPositions[i];
					break;
				}
			}
			return {position: changed, positions: sortedPositions};
		},
		/**
		 * @description Updates the editor annotations based on the given positions
		 * @function
		 * @private
		 * @param {Array.<Object>} positions The positions
		 */
		_updateAnnotations: function(positions) {
			var annotationModel = this.editor.getAnnotationModel();
			if (!annotationModel) { return; }
			var remove = [], add = [];
			var annotations = annotationModel.getAnnotations(), annotation;
			while (annotations.hasNext()) {
				annotation = annotations.next();
				switch (annotation.type) {
					case mAnnotations.AnnotationType.ANNOTATION_LINKED_GROUP:
					case mAnnotations.AnnotationType.ANNOTATION_CURRENT_LINKED_GROUP:
					case mAnnotations.AnnotationType.ANNOTATION_SELECTED_LINKED_GROUP:
						remove.push(annotation);
				}
			}
			var model = this.linkedModeModel;
			if (model) {
				positions = positions || this._getSortedPositions(model);
				for (var i = 0; i < positions.length; i++) {
					var position = positions[i];
					if (position.model !== model) { continue; }
					if (position.escape) { continue; }
					var type = mAnnotations.AnnotationType.ANNOTATION_LINKED_GROUP;
					if (position.group === model.selectedGroupIndex) {
						if (position.index === 0 && position.count > 1) {
							type = mAnnotations.AnnotationType.ANNOTATION_SELECTED_LINKED_GROUP;
						} else {
							type = mAnnotations.AnnotationType.ANNOTATION_CURRENT_LINKED_GROUP;
						}
					}
					position = position.position;
					annotation = mAnnotations.AnnotationType.createAnnotation(type, position.offset, position.offset + position.length, "");
					add.push(annotation);
				}
			}
			annotationModel.replaceAnnotations(remove, add);
		}
	});

	return {
		LinkedMode: LinkedMode
	};
});
