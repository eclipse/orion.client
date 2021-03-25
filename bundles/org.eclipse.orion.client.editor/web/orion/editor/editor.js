/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define("orion/editor/editor", [
	'i18n!orion/editor/nls/messages',
	'orion/editor/eventTarget',
	'orion/editor/tooltip',
	'orion/editor/annotations',
	'orion/objects',
	'orion/editor/util',
	'orion/util'
], function(messages, mEventTarget, mTooltip, mAnnotations, objects, textUtil, util) {
	
	var AT = mAnnotations.AnnotationType;

	var HIGHLIGHT_ERROR_ANNOTATION = "orion.annotation.highlightError"; //$NON-NLS-0$

	/**
	 * @name orion.editor.BaseEditor
	 * @class This is the base interface for text and visual editors based on a text buffer.
	 *
	 * @description Creates a new Base Editor with the given options.
	 * @param {Object} options Creation options for this editor.
	 * @param {Object} options.domNode
	 * @param {Object} options.statusReporter
	 *
	 * @borrows orion.editor.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.editor.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.editor.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function BaseEditor(options) {
		options = options || {};
		this._domNode = options.domNode;
		this._model = options.model;
		this._undoStack = options.undoStack;
		this._statusReporter = options.statusReporter;
		this._title = null;
		var that = this;
		this._listener = {
			onChanged: function(e) {
				that.onChanged(e);
			}
		};
		if (this._model) {
			this._model.addEventListener("Changed", this._listener.onChanged); //$NON-NLS-0$
		}
		this.checkDirty();
	}
	BaseEditor.prototype = /** @lends orion.editor.BaseEditor.prototype */ {
		/**
		 * Destroys the editor. Uninstall the editor view.
		 */
		destroy: function() {
			this.uninstall();
			this._statusReporter = this._domNode = null;
			if (this._model) {
				this._model.removeEventListener("Changed", this._listener.onChanged); //$NON-NLS-0$
			}
		},

		/** @private */
		checkDirty : function() {
			this.setDirty(this._undoStack && !this._undoStack.isClean());
		},
		/**
		 * Focus the the editor view. The default implementation does nothing.
		 */
		focus: function() {
		},
		/**
		 * Returns the text model of the editor.
		 *
		 * @returns {orion.editor.TextModel} the text model of the view.
		 */
		getModel: function() {
			return this._model;
		},
		/**
		 * Returns the text for the given range.
		 * <p>
		 * The text does not include the character at the end offset.
		 * </p>
		 *
		 * @param {Number} [start=0] the start offset of text range.
		 * @param {Number} [end=char count] the end offset of text range.
		 *
		 * @see orion.editor.TextView#setText
		 */
		getText: function(start, end) {
			return this.getModel().getText(start, end);
		},
		/**
		 * Returns the editor title.
		 *
		 * @returns {String} the editor title.
		 */
		getTitle: function() {
			return this._title;
		},
		/**
		 * Returns the editor undo stack.
		 *
		 * @returns {orion.editor.UndoStack} the editor undo stack.
		 */
		getUndoStack: function() {
			return this._undoStack;
		},
		/**
		 * Creates the DOM hierarchy of the editor and add it to the document.
		 */
		install: function() {
			this.installed = true;
		},
		/**
		 * Returns <code>true</code> if the editor is dirty; <code>false</code> otherwise.
		 * @returns {Boolean} whether the editor is dirty
		 */
		isDirty: function() {
			if (this._undoStack) return !this._undoStack.isClean();
			return this._dirty;
		},
		/**
		 * Marks the current state of the editor as clean. Meaning there are no unsaved modifications.
		 */
		markClean: function() {
			var previousState = this.getUndoStack().markClean();
			this.setDirty(false);
			return previousState;
		},
		/**
		 * Marks the current state of the editor as unclean. Usually called when saving changes failed.
		 */
		markUnclean: function(previousState) {
			this.getUndoStack().markUnclean(previousState);
			this.setDirty(true);
		},
		/**
		 * Called when the dirty state of the editor changes.
		 * @param {Event} dirtyChangedEvent
		 */
		onDirtyChanged: function(dirtyChangedEvent) {
			return this.dispatchEvent(dirtyChangedEvent);
		},
		/**
		 * Called when the editor's contents have been changed or saved.
		 * @param {Event} inputChangedEvent
		 */
		onInputChanged: function (inputChangedEvent) {
			return this.dispatchEvent(inputChangedEvent);
		},
		/**
		 * Called when the editor's text model has been changed.
		 * @param {Event} inputChangedEvent
		 * @callback
		 */
		onChanged: function (modelChangedEvent) {
			this.checkDirty();
		},
		/**
		 * Report the message to the user.
		 *
		 * @param {String} message the message to show
		 * @param {String} [type] the message type. Either normal or "progress" or "error";
		 * @param {Boolean} [isAccessible] If <code>true</code>, a screen reader will read this message.
		 * Otherwise defaults to the domNode default.
		 */
		reportStatus: function(message, type, isAccessible) {
			if (this._statusReporter) {
				this._statusReporter(message, type, isAccessible);
			}
		},
		/**
		 * Resizes the editor view. The default implementation does nothing.
		 */
		resize: function() {
		},
		/**
		 * Sets whether the editor is dirty.
		 *
		 * @param {Boolean} dirty
		 */
		setDirty: function(dirty) {
			this._setSyntaxCheckRequired(dirty);
			if (this._dirty === dirty) { return; }
			this._dirty = dirty;
			this.onDirtyChanged({type: "DirtyChanged"}); //$NON-NLS-0$
		},
		/**
		 * Sets a flag indicating whether the editor contents have been modified since
		 * the last syntax check (validation) operation.
		 * 
		 * @function
		 * @param required {Boolean} what to set the flag to, true indicates the editor is dirty and needs syntax checking
		 */
		_setSyntaxCheckRequired: function _setSyntaxCheckRequired(required){
			this._syntaxCheckRequired = required;
		},
		/**
		 * Returns the state of the syntax check required flag, indicating whether the editor contents have
		 * been modified since the last syntax check (validation) operation.
		 * 
		 * @function
		 * @returns returns {Boolean} whether the flag has been set indicating a syntax check (validation) operation is required
		 */
		_isSyntaxCheckRequired: function _isSyntaxCheckRequired() {
			return this._syntaxCheckRequired;
		},
		/**
		 * @private
		 */
		_setModelText: function(contents) {
			if (this._model) {
				this._model.setText(contents);
			}
		},
		/**
		 * Sets the editor's contents.
		 *
		 * @param {String} title the editor title
		 * @param {String} message an error message
		 * @param {String} contents the editor contents
		 * @param {Boolean} contentsSaved whether the editor contents was saved.
		 */
		setInput: function(title, message, contents, contentsSaved) {
			this._title = title;
			if (!contentsSaved) {
				if (message) {
					this.reportStatus(message, "error"); //$NON-NLS-0$
				} else {
					if (contents !== null && contents !== undefined) {
						if (typeof contents === "string") { //$NON-NLS-0$
							this._setModelText(contents);
						}
						if (this._undoStack) {
							this._undoStack.reset();
						}
					}
				}
			}
			this.checkDirty();
			this.onInputChanged({
				type: "InputChanged", //$NON-NLS-0$
				title: title,
				message: message,
				contents: contents,
				contentsSaved: contentsSaved
			});
		},
		/**
		 * Replaces the text in the given range with the given text.
		 * <p>
		 * The character at the end offset is not replaced.
		 * </p>
		 *
		 * @param {String} text the new text.
		 * @param {Number} [start=0] the start offset of text range.
		 * @param {Number} [end=char count] the end offset of text range.
		 */
		setText: function(text, start, end) {
			this.getModel().setText(text, start, end);
		},
		/**
		 * Removes the DOM hierarchy of the editor from the document.
		 */
		uninstall: function() {
			this.installed = false;
		}
	};
	mEventTarget.EventTarget.addMixin(BaseEditor.prototype);

	/**
	 * @name orion.editor.Editor
	 * @augments orion.editor.BaseEditor
	 * @class An <code>Editor</code> is a user interface for editing text that provides additional features over the basic {@link orion.editor.TextView}.
	 * Some of <code>Editor</code>'s features include:
	 * <ul>
	 * <li>Additional actions and key bindings for editing text</li>
	 * <li>Content assist</li>
	 * <li>Find and Incremental Find</li>
	 * <li>Rulers for displaying line numbers and annotations</li>
	 * <li>Status reporting</li>
	 * </ul>
	 *
	 * @description Creates a new Editor with the given options.
	 * @param {Object} options Options controlling the features of this Editor.
	 * @param {Object} options.annotationFactory
	 * @param {Object} options.contentAssistFactory
	 * @param {Object} options.domNode
	 * @param {Object} options.keyBindingFactory
	 * @param {Object} options.lineNumberRulerFactory
	 * @param {Object} options.zoomRulerFactory
	 * @param {Object} options.foldingRulerFactory
	 * @param {Object} options.statusReporter
	 * @param {Object} options.textViewFactory
	 * @param {Object} options.undoStackFactory
	 * @param {Object} options.textDNDFactory
	 * @param {Object} options.hoverFactory
	 */
	function Editor(options) {
		options = options || {};
		BaseEditor.call(this, options);
		this._textViewFactory = options.textViewFactory;
		this._undoStackFactory = options.undoStackFactory;
		this._textDNDFactory = options.textDNDFactory;
		this._annotationFactory = options.annotationFactory;
		this._zoomRulerFactory = options.zoomRulerFactory;
		this._foldingRulerFactory = options.foldingRulerFactory;
		this._lineNumberRulerFactory = options.lineNumberRulerFactory;
		this._contentAssistFactory = options.contentAssistFactory;
		this._keyBindingFactory = options.keyBindingFactory;
		this._hoverFactory = options.hoverFactory;
		this._syntaxHighlighter = options.syntaxHighlighter;
		this._annotationStyler = null;
		this._annotationModel = null;
		this._annotationRuler = null;
		this._lineNumberRuler = null;
		this._overviewRuler = null;
		this._zoomRuler = null;
		this._foldingRuler = null;
		this._contentAssist = null;
	}
	Editor.prototype = new BaseEditor();
	objects.mixin(Editor.prototype, /** @lends orion.editor.Editor.prototype */ {
		/**
		 * Destroys the editor.
		 */
		destroy: function() {
			BaseEditor.prototype.destroy.call(this);
			this._textViewFactory = this._undoStackFactory = this._textDNDFactory = 
			this._annotationFactory = this._foldingRulerFactory = this._lineNumberRulerFactory = 
			this._contentAssistFactory = this._keyBindingFactory = this._hoverFactory = this._zoomRulerFactory = null;
		},
		/**
		 * Returns the annotation model of the editor.
		 *
		 * @returns {orion.editor.AnnotationModel}
		 */
		getAnnotationModel: function() {
			return this._annotationModel;
		},
		/**
		 * Returns the annotation ruler of the editor.
		 *
		 * @returns {orion.editor.AnnotationRuler}
		 */
		getAnnotationRuler: function() {
			return this._annotationRuler;
		},
		/**
		 * Returns the whether annotation ruler of the editor is showning.
		 *
		 * @returns {Boolean}
		 * @since 12
		 */
		getAnnotationRulerVisible: function() {
			return this._annotationRulerVisible;
		},
		/**
		 * Returns the annotation styler of the editor.
		 *
		 * @returns {orion.editor.AnnotationStyler}
		 */
		getAnnotationStyler: function() {
			return this._annotationStyler;
		},
		/**
		 * Returns the content assist of the editor.
		 *
		 * @returns {orion.editor.LineNumberRuler}
		 */
		getContentAssist: function() {
			return this._contentAssist;
		},
		/**
		 * Returns the folding ruler of the editor.
		 *
		 * @returns {orion.editor.FoldingRuler}
		 */
		getFoldingRuler: function() {
			return this._foldingRuler;
		},
		/**
		 * Returns the whether folding ruler of the editor is showning.
		 *
		 * @returns {Boolean}
		 * @since 12
		 */
		getFoldingRulerVisible: function() {
			return this._foldingRulerVisible;
		},
		/**
		 * Creates and add a FoldingAnnotation to the editor.
		 *
		 * @param {Number} start The start offset of the annotation in the text model.
		 * @param {Number} end The end offset of the annotation in the text model.
		 * @returns {orion.editor.FoldingAnnotation} The FoldingAnnotation added to the editor.
		 */
		addFoldingAnnotation: function(start, end) {
			var annotationModel = this.getAnnotationModel();
			if(annotationModel) {
				var foldingAnnotation = new mAnnotations.FoldingAnnotation(start, end, this.getTextView().getModel());
				annotationModel.addAnnotation(foldingAnnotation);
				return foldingAnnotation;
			}
			return null;
		},
		/**
		 * Returns the line number ruler of the editor.
		 *
		 * @returns {orion.editor.LineNumberRuler}
		 */
		getLineNumberRuler: function() {
			return this._lineNumberRuler;
		},
		/**
		 * Returns the whether lines ruler of the editor is showning.
		 *
		 * @returns {Boolean}
		 * @since 12
		 */
		getLineNumberRulerVisible: function() {
			return this._lineNumberRulerVisible;
		},
		/**
		 * Returns the Tooltip instance for this editor
		 *
		 * @returns {orion.editor.Tooltip}
		*/
		getTooltip: function() {
			return mTooltip.Tooltip.getTooltip(this._textView, this);
		},
		/**
		 * Returns the zoom ruler of the editor.
		 *
		 * @returns {orion.editor.LineNumberRuler}
		 */
		getZoomRuler: function() {
			return this._zoomRuler;
		},
		/**
		 * Returns the whether zoom ruler of the editor is showning.
		 *
		 * @returns {Boolean}
		 * @since 12
		 */
		getZoomRulerVisible: function() {
			return this._zoomRulerVisible;
		},
		/**
		 * Returns the base text model of this editor.
		 *
		 * @returns {orion.editor.TextModel}
		 */
		getModel: function() {
			if (!this._textView) {
				return null;
			}
			var model = this._textView.getModel();
			if (model.getBaseModel) {
				model = model.getBaseModel();
			}
			return model;
		},
		/**
		 * Returns the overview ruler of the editor.
		 *
		 * @returns {orion.editor.OverviewRuler}
		 */
		getOverviewRuler: function() {
			return this._overviewRuler;
		},
		/**
		 * Returns the underlying <code>TextView</code> used by this editor.
		 * @returns {orion.editor.TextView} the editor text view.
		 */
		getTextView: function() {
			return this._textView;
		},
		/**
		 * Returns the editor's key modes.
		 *
		 * @returns {Array} the editor key modes.
		 */
		getKeyModes: function() {
			return this._textView.getKeyModes();
		},
		/**
		 * Returns the editor source code actions.
		 *
		 * @returns {orion.editor.sourceCodeActions}
		 */
		getSourceCodeActions: function() {
			return this._sourceCodeActions;
		},
		/**
		 * Returns the editor linked mode.
		 *
		 * @returns {orion.editor.LinkedMode}
		 */
		getLinkedMode: function() {
			return this._linkedMode;
		},
		/**
		 * Returns the editor text actions.
		 *
		 * @returns {orion.editor.textActions}
		 */
		getTextActions: function() {
			return this._textActions;
		},
		/**
		 * Gives focus to the text view.
		 */
		focus: function() {
			if (this._textView) {
				this._textView.focus();
			}
		},
		/**
		 * Resizes the text view.
		 */
		resize: function() {
			if (this._textView) {
				this._textView.resize();
			}
		},
		/**
		 * Sets whether the annotation ruler is visible.
		 *
		 * @param {Boolean} visible <code>true</code> to show ruler, <code>false</code> otherwise
		 */
		setAnnotationRulerVisible: function(visible, force) {
			if (this._annotationRulerVisible === visible && !force) { return; }
			this._annotationRulerVisible = visible;
			if (!this._annotationRuler) { return; }
			var textView = this._textView;
			if (visible) {
				textView.addRuler(this._annotationRuler, 0);
			} else {
				textView.removeRuler(this._annotationRuler);
			}
		},
		/**
		 * Sets whether the folding ruler is visible.
		 *
		 * @param {Boolean} visible <code>true</code> to show ruler, <code>false</code> otherwise
		 */
		setFoldingRulerVisible: function(visible, force) {
			if (this._foldingRulerVisible === visible && !force) { return; }
			if (!visible) {
				var textActions = this.getTextActions();
				if (textActions) {
					textActions.expandAnnotations(true);
				}
			}
			this._foldingRulerVisible = visible;
			if (!this._foldingRuler) { return; }
			var textView = this._textView;
			if (!textView.getModel().getBaseModel) { return; }
			if (visible) {
				textView.addRuler(this._foldingRuler);
			} else {
				textView.removeRuler(this._foldingRuler);
			}
		},
		/**
		 * Sets whether the line numbering ruler is visible.
		 *
		 * @param {Boolean} visible <code>true</code> to show ruler, <code>false</code> otherwise
		 */
		setLineNumberRulerVisible: function(visible, force) {
			if (this._lineNumberRulerVisible === visible && !force) { return; }
			this._lineNumberRulerVisible = visible;
			if (!this._lineNumberRuler) { return; }
			var textView = this._textView;
			if (visible) {
				textView.addRuler(this._lineNumberRuler, !this._annotationRulerVisible ? 0 : 1);
			} else {
				textView.removeRuler(this._lineNumberRuler);
			}
		},
		/**
		 * Sets whether the overview ruler is visible.
		 *
		 * @param {Boolean} visible <code>true</code> to show ruler, <code>false</code> otherwise
		 */
		setOverviewRulerVisible: function(visible, force) {
			if (this._overviewRulerVisible === visible && !force) { return; }
			this._overviewRulerVisible = visible;
			if (!this._overviewRuler) { return; }
			var textView = this._textView;
			if (visible) {
				textView.addRuler(this._overviewRuler);
			} else {
				textView.removeRuler(this._overviewRuler);
			}
		},
		/**
		 * Sets whether the zoom ruler is visible.
		 *
		 * @param {Boolean} visible <code>true</code> to show ruler, <code>false</code> otherwise
		 */
		setZoomRulerVisible: function(visible, force) {
			if (this._zoomRulerVisible === visible && !force) { return; }
			this._zoomRulerVisible = visible;
			if (!this._zoomRuler) { return; }
			var textView = this._textView;
			if (visible) {
				textView.addRuler(this._zoomRuler);
			} else {
				textView.removeRuler(this._zoomRuler);
			}
		},
		
		/**
		 * Sets which annotations types are shown in the annotation ruler.  Annotations are visible by default.
		 * 
		 * @param {Object} types a hash table mapping annotation type to visibility (i.e. AnnotationType.ANNOTATION_INFO -> true).
		 * @since 14.0
		 */
		setAnnotationTypesVisible: function(types) {
			if (textUtil.compare(this._annotationTypesVisible, types)) return;
			this._annotationTypesVisible = types;
			if (!this._annotationRuler || !this._textView || !this._annotationRulerVisible) { return; }
			this._annotationRuler.setAnnotationTypeVisible(types);
			this._textView.redrawLines(0, undefined, this._annotationRuler);
		},
		
		/**
		 * Sets which annotations types are shown in the overview ruler.  Annotations are visible by default.
		 * 
		 * @param {Object} types a hash table mapping annotation type to visibility (i.e. AnnotationType.ANNOTATION_INFO -> true).
		 * @since 14.0
		 */
		setOverviewAnnotationTypesVisible: function(types) {
			if (textUtil.compare(this._overviewAnnotationTypesVisible, types)) return;
			this._overviewAnnotationTypesVisible = types;
			if (!this._overviewRuler || !this._textView || !this._overviewRulerVisible) { return; }
			this._overviewRuler.setAnnotationTypeVisible(types);
			this._textView.redrawLines(0, undefined, this._overviewRuler);
		},
		
		/**
		 * Sets which annotations types are shown in the text.  Annotations are visible by default.
		 * 
		 * @param {Object} types a hash table mapping annotation type to visibility (i.e. AnnotationType.ANNOTATION_INFO -> true).
		 * @since 14.0
		 */
		setTextAnnotationTypesVisible: function(types) {
			if (textUtil.compare(this._textAnnotationTypesVisible, types)) return;
			this._textAnnotationTypesVisible = types;
			if (!this._annotationStyler || !this._textView) { return; }
			this._annotationStyler.setAnnotationTypeVisible(types);
			this._textView.redrawLines(0, undefined);
		},

		mapOffset: function(offset, _parent) {
			var textView = this._textView;
			var model = textView.getModel();
			if (model.getBaseModel) {
				offset = model.mapOffset(offset, _parent);
			}
			return offset;
		},
		/**
		 * @name getLineAtOffset
		 * @description Returns the line number corresponding to the given offset in the source
		 * @function
		 * @public
		 * @memberof orion.editor.Editor
		 * @param {Number} offset The offset into the source
		 * @returns {Number} The line number corresponding to the given offset or <code>-1</code> if out of range
		 * @since 5.0
		 */
		getLineAtOffset: function(offset) {
			return this.getModel().getLineAtOffset(this.mapOffset(offset));
		},
		/**
		 * @name getLineStart
		 * @description Compute the editor start offset of the given line number
		 * @function
		 * @public
		 * @memberof orion.editor.TextView
		 * @param {Number} line The line number in the editor
		 * @returns {Number} Returns the start offset of the given line number in the editor.
		 * @since 5.0
		 */
		getLineStart: function(line) {
			return this.getModel().getLineStart(line);
		},
		getCaretOffset: function() {
			return this.mapOffset(this._textView.getCaretOffset());
		},
		
		/**
		 * Returns the text view selection text.
		 * <p>
		 * If there are multiple selection ranges, the result is concatenated with the specified delimiter.
		 * </p>
		 * 
		 * @param {String} delimiter The offset into the editor
		 * @returns {String} the view selection text
		 * @since 10.0
		 * @see orion.editor.TextView#setSelection
		 */
		getSelectionText: function(delimiter) {
			var textView = this._textView;
			return textView.getSelectionText(delimiter);
		},
		
		getSelection: function() {
			var textView = this._textView;
			var selection = textView.getSelection();
			var model = textView.getModel();
			if (model.getBaseModel) {
				selection.start = model.mapOffset(selection.start);
				selection.end = model.mapOffset(selection.end);
			}
			return selection;
		},

		getSelections: function() {
			var textView = this._textView;
			var model = textView.getModel();
			var selections = textView.getSelections();
			selections.forEach(function(selection) {
				if (model.getBaseModel) {
					selection.start = model.mapOffset(selection.start);
					selection.end = model.mapOffset(selection.end);
				}
			});
			return selections;
		},

		getStyleAccessor: function() {
			var styleAccessor = null;
			if (this._syntaxHighlighter) {
				var styler = this._syntaxHighlighter.getStyler();
				if (styler && styler.getStyleAccessor) {
					styleAccessor = styler.getStyleAccessor();
				}
			}
			return styleAccessor;
		},

		_expandOffset: function(offset) {
			var model = this._textView.getModel();
			var annotationModel = this._annotationModel;
			if (!annotationModel || !model.getBaseModel) { return; }
			var annotations = annotationModel.getAnnotations(offset, offset + 1);
			while (annotations.hasNext()) {
				var annotation = annotations.next();
				if (annotation.type === AT.ANNOTATION_FOLDING) {
					if (annotation.expand) {
						annotation.expand();
					}
				}
			}
		},

		setCaretOffset: function(caretOffset, show, callback) {
			var textView = this._textView;
			var model = textView.getModel();
			if (model.getBaseModel) {
				this._expandOffset(caretOffset);
				caretOffset = model.mapOffset(caretOffset, true);
			}
			textView.setCaretOffset(caretOffset, show, callback);
		},

		setText: function(text, start, end, show, callback) {
			var textView = this._textView;
			var model = textView.getModel();
			if (model.getBaseModel) {
				if (start !== undefined) {
					this._expandOffset(start);
					start = model.mapOffset(start, true);
				}
				if (end !== undefined) {
					this._expandOffset(end);
					end = model.mapOffset(end, true);
				}
			}
			textView.setText(text, start, end, show, callback);
		},

		setSelection: function(start, end, show, callback) {
			var textView = this._textView;
			var model = textView.getModel();
			if (model.getBaseModel) {
				this._expandOffset(start);
				this._expandOffset(end);
				start = model.mapOffset(start, true);
				end = model.mapOffset(end, true);
			}
			textView.setSelection(start, end, show, callback);
		},
		setSelections: function(ranges, show, callback) {
			var that = this;
			var textView = this._textView;
			var model = textView.getModel();
			ranges.forEach(function(range) {
				var start = range.start;
				var end = range.end;
				if (model.getBaseModel) {
					that._expandOffset(start);
					that._expandOffset(end);
					start = model.mapOffset(start, true);
					end = model.mapOffset(end, true);
				}
				range.start = start;
				range.end = end;
			});
			textView.setSelections(ranges, show, callback);
		},

		/**
		 * @param {Number} start
		 * @param {Number} [end]
		 * @param {function} [callback] if callback is specified, scrolling to show the selection is animated and callback is called when the animation is done.
		 * @param {Boolean} [focused=true] whether the text view should be focused when the selection is done.
		 * @private
		 * @deprecated use #setSelection instead
		 */
		moveSelection: function(start, end, callback, focused) {
			end = end || start;
			var textView = this._textView;
			this.setSelection(start, end, 1 / 3, function() {
				if (focused === undefined || focused) {
					textView.focus();
				}
				if (callback) {
					callback();
				}
			});
		},

		/** @private */
		_getTooltipInfo: function(x, y, all) {
			var textView = this._textView;
			var annotationModel = this.getAnnotationModel();
			if (!annotationModel) { return null; }
			var annotationStyler = this._annotationStyler;
			if (!annotationStyler) { return null; }
			if (!textView.isValidTextPosition(x, y)) { return null; }
			var offset = textView.getOffsetAtLocation(x, y);
			if (offset === -1) { return null; }
			var allAnnotations;
			if (all) {
				var lineIndex = this.getLineAtOffset(offset);
				allAnnotations = this.getAnnotationRuler()._getAnnotationsAtLineIndex(lineIndex);
			} else {
				var annotations = annotationStyler.getAnnotationsByType(annotationModel, offset, offset + 1);
				allAnnotations = [];
				for (var i = 0; i < annotations.length; i++) {
					if (annotations[i].rangeStyle) {
						allAnnotations.push(annotations[i]);
					}
				}
			}
			var info = {
				contents: allAnnotations,
				position: "below", //$NON-NLS-0$
				context: {source: "editor", offset: offset} //$NON-NLS-0$
			};
			return info;
		},

		/** @private */
		_highlightCurrentLine: function(newSelections, oldSelections) {
			var annotationModel = this._annotationModel;
			if (!annotationModel) { return; }
			var textView = this._textView;
			if (textView.getOptions("singleMode")) { return; } //$NON-NLS-0$
			oldSelections = Array.isArray(oldSelections) ? oldSelections : [oldSelections];
			newSelections = Array.isArray(newSelections) ? newSelections : [newSelections];
			var model = textView.getModel();
			function getHighlightLines(selections) {
				var lines = {};
				if (selections && selections.some(function(selection) {
					if (selection && selection.isEmpty()) {
						lines[model.getLineAtOffset(selection.start).toString()] = true;
					} else {
						return true;
					}
					return false;
				})) return {};
				return lines;
			}
			var oldLines = getHighlightLines(oldSelections);
			var newLines = getHighlightLines(newSelections);
			function compare(o, n) {
				for (var p1 in o) {
					if (!n[p1]) {
						return true;
					}
				}
				return false;
			}
			if (!(compare(oldLines, newLines) || compare(newLines, oldLines))) return;
			var remove = this._currentLineAnnotations;
			var add = [];
			for (var p in newLines) {
				var lineIndex = p >> 0;
				var start = model.getLineStart(lineIndex);
				var end = model.getLineEnd(lineIndex);
				if (model.getBaseModel) {
					start = model.mapOffset(start);
					end = model.mapOffset(end);
				}
				var type = AT.ANNOTATION_CURRENT_LINE;
				var annotation = AT.createAnnotation(type, start, end);
				add.push(annotation);
			}
			this._currentLineAnnotations = add;
			annotationModel.replaceAnnotations(remove, add);
		},

		/**
		 * Creates the underlying TextView and installs the editor's features.
		 */
		installTextView: function() {
			this.install();
		},

		/**
		 * Highlight a line.
		 * @param {number} line
		 */
		highlightLine: function(line) {
			// Find any existing annotation
			var annotationModel = this.getAnnotationModel();
			var textModel = this.getModel();
			if (textModel.getBaseModel) {
				textModel = textModel.getBaseModel();
			}
			var type = AT.ANNOTATION_HIGHLIGHTED_LINE;
			var annotations = annotationModel.getAnnotations(0, textModel.getCharCount());
			var remove = null;
			while (annotations.hasNext()) {
				var annotation = annotations.next();
				if (annotation.type === type) {
					remove = annotation;
					break;
				}
			}
			var lineStart = textModel.getLineStart(line);
			var lineEnd = textModel.getLineEnd(line);
			var add = AT.createAnnotation(type, lineStart, lineEnd);
			// Replace to or add the new annotation
			if (remove) {
				annotationModel.replaceAnnotations([remove], [add]);
			} else {
				annotationModel.addAnnotation(add);
			}
		},

		/**
		 * Unhightlight the highlighted line
		 */
		unhighlightLine: function() {
			var annotationModel = this.getAnnotationModel();
			var textModel = this.getModel();
			if (textModel.getBaseModel) {
				textModel = textModel.getBaseModel();
			}
			var type = AT.ANNOTATION_HIGHLIGHTED_LINE;
			var annotations = annotationModel.getAnnotations(0, textModel.getCharCount());
			var remove = null;
			while (annotations.hasNext()) {
				var annotation = annotations.next();
				if (annotation.type === type) {
					remove = annotation;
					break;
				}
			}
			if (remove) {
				annotationModel.removeAnnotation(remove);
			}
		},

		install : function() {
			if (this._textView) { return; }

			// Create textView and install optional features
			this._textView = this._textViewFactory(this);
			if (this._undoStackFactory) {
				this._undoStack = this._undoStackFactory.createUndoStack(this);
				this._textView.setOptions({undoStack: this._undoStack});
				this.checkDirty();
			}
			if (this._textDNDFactory) {
				this._textDND = this._textDNDFactory.createTextDND(this, this._undoStack);
			}
			if (this._contentAssistFactory) {
				var contentAssistMode = this._contentAssistFactory.createContentAssistMode(this);
				this._contentAssist = contentAssistMode.getContentAssist();
			}

			var tooltip = mTooltip.Tooltip.getTooltip(this._textView, this);
			if (this._hoverFactory) {
				this._hover = this._hoverFactory.createHover(this);
				tooltip.hover = this._hover;
			}
			
			var editor = this, textView = this._textView;

			var that = this;
			this._listener = {
				onModelChanged: /* @callback */ function(e) {
					that.checkDirty();
				},
				onMouseOver: function(e) {
					that._listener.onMouseMove(e);
				},
				onMouseDown: /* @callback */ function(e) {
					that._listener.mouseDown = true;
				},
				onMouseUp: /* @callback */ function(e) {
					that._listener.mouseDown = false;
				},
				onMouseMove: function(e) {
					if (!tooltip || that._listener.mouseDown) { return; }

					// Prevent spurious mouse event (e.g. on a scroll)					
					if (e.event.clientX === that._listener.lastMouseX
						&& e.event.clientY === that._listener.lastMouseY) {
						return;
					}
					
					that._listener.lastMouseX = e.event.clientX;
					that._listener.lastMouseY = e.event.clientY;

					if (that._hoverTimeout) {
						window.clearTimeout(that._hoverTimeout);
						that._hoverTimeout = null;
					}
					that._hoverTimeout = window.setTimeout(function() {
						that._hoverTimeout = null;
						
						// Re-check incase editor closed...
						if (!that._listener){
							return;
						}
						
						tooltip.onHover({
							y: e.y,
							x: e.x,							
							getTooltipInfo: function() {
								return that._getTooltipInfo(this.x, this.y);
							}
						}, e.x, e.y);
					}, 175);
				},
				onMouseOut: /* @callback */ function(e) {
					// When mouse leaves the editor, ignore any pending onMouseMove events
					if (that._hoverTimeout) {
						window.clearTimeout(that._hoverTimeout);
						that._hoverTimeout = null;
					}
				},
				onSelection: function(e) {
					if (tooltip) { tooltip.hide(); }
					that._updateCursorStatus();
					that._highlightCurrentLine(e.newValue, e.oldValue);
				}
			};
			textView.addEventListener("ModelChanged", this._listener.onModelChanged); //$NON-NLS-0$
			textView.addEventListener("Selection", this._listener.onSelection); //$NON-NLS-0$
			textView.addEventListener("MouseOver", this._listener.onMouseOver); //$NON-NLS-0$
			textView.addEventListener("MouseOut", this._listener.onMouseOut); //$NON-NLS-0$
			textView.addEventListener("MouseDown", this._listener.onMouseDown); //$NON-NLS-0$
			textView.addEventListener("MouseUp", this._listener.onMouseUp); //$NON-NLS-0$
			textView.addEventListener("MouseMove", this._listener.onMouseMove); //$NON-NLS-0$

			// Set up keybindings
			if (this._keyBindingFactory) {
				var keyBindings;
				if (typeof this._keyBindingFactory === "function") { //$NON-NLS-0$
					keyBindings = this._keyBindingFactory(this, this.getKeyModes(), this._undoStack, this._contentAssist);
				} else {
					keyBindings = this._keyBindingFactory.createKeyBindings(editor, this._undoStack, this._contentAssist);
				}
				if (keyBindings) {
					this._textActions = keyBindings.textActions;
					this._linkedMode = keyBindings.linkedMode;
					this._sourceCodeActions = keyBindings.sourceCodeActions;
				}
			}

			var rulerOnDblClick = /* @callback */ function(lineIndex, e) {
				if (e.shiftKey) {
					addRemoveBookmark.call(this, lineIndex, e);
				} else if (e.altKey) {
					addRemoveConditionalBreakpoint.call(this, lineIndex, e);
				} else {
					addRemoveBreakpoint.call(this, lineIndex, e);
				}
			};

			var addRemoveBookmark = /* @callback */ function(lineIndex, e) {
				addRemoveAnnotation.call(this, lineIndex, e, AT.ANNOTATION_BOOKMARK);
			};

			var addRemoveBreakpoint = /* @callback */ function(lineIndex, e) {
				addRemoveAnnotation.call(this, lineIndex, e, AT.ANNOTATION_BREAKPOINT);
			};

			var addRemoveConditionalBreakpoint = /* @callback */ function(lineIndex, e) {
				addRemoveAnnotation.call(this, lineIndex, e, AT.ANNOTATION_CONDITIONAL_BREAKPOINT);
			};

			/** @callback */
			function addRemoveAnnotation(lineIndex, e, annotationType) {
				if (lineIndex === undefined) { return; }
				if (lineIndex === -1) { return; }
				var view = this.getView();
				var viewModel = view.getModel();
				var annotationModel = this.getAnnotationModel();
				var lineStart = editor.mapOffset(viewModel.getLineStart(lineIndex));
				var lineEnd = editor.mapOffset(viewModel.getLineEnd(lineIndex));
				var annotations = annotationModel.getAnnotations(lineStart, lineEnd);
				var bookmark = null;
				while (annotations.hasNext()) {
					var annotation = annotations.next();
					if (annotation.type === annotationType) {
						bookmark = annotation;
						break;
					}
				}
				if (bookmark) {
					editor.dispatchEvent({
						// This event will only be triggered by the user double clicking the side bar. (i.e. add/remove bookmark or breakpoint)
						type: 'UserAnnotationModified',
						added: [],
						removed: [bookmark]
					});
				} else {
					bookmark = AT.createAnnotation(annotationType, lineStart, lineEnd, editor.getText(lineStart, lineEnd));
					editor.dispatchEvent({
						type: 'UserAnnotationModified',
						added: [bookmark],
						removed: []
					});
				}
			};

			// Create rulers, annotation model and styler
			if (this._annotationFactory) {
				var textModel = textView.getModel();
				if (textModel.getBaseModel) { textModel = textModel.getBaseModel(); }
				this._annotationModel = this._annotationFactory.createAnnotationModel(textModel);
				if (this._annotationModel) {
					var styler = this._annotationStyler = this._annotationFactory.createAnnotationStyler(textView, this._annotationModel);
					if (styler) {
						styler.addAnnotationType(AT.ANNOTATION_CURRENT_SEARCH);
						styler.addAnnotationType(AT.ANNOTATION_MATCHING_SEARCH);
						styler.addAnnotationType(AT.ANNOTATION_SEARCH_RANGE);
						styler.addAnnotationType(AT.ANNOTATION_ERROR);
						styler.addAnnotationType(AT.ANNOTATION_WARNING);
						styler.addAnnotationType(AT.ANNOTATION_INFO);
						styler.addAnnotationType(AT.ANNOTATION_MATCHING_BRACKET);
						styler.addAnnotationType(AT.ANNOTATION_CURRENT_BRACKET);
						styler.addAnnotationType(AT.ANNOTATION_CURRENT_LINE);
						styler.addAnnotationType(AT.ANNOTATION_HIGHLIGHTED_LINE);
						styler.addAnnotationType(AT.ANNOTATION_READ_OCCURRENCE);
						styler.addAnnotationType(AT.ANNOTATION_WRITE_OCCURRENCE);
						styler.addAnnotationType(AT.ANNOTATION_SELECTED_LINKED_GROUP);
						styler.addAnnotationType(AT.ANNOTATION_CURRENT_LINKED_GROUP);
						styler.addAnnotationType(AT.ANNOTATION_LINKED_GROUP);
						styler.addAnnotationType(HIGHLIGHT_ERROR_ANNOTATION);

						styler.setAnnotationTypeVisible(this._textAnnotationTypesVisible);
					}
				}

				var rulers = this._annotationFactory.createAnnotationRulers(this._annotationModel);
				var ruler = this._annotationRuler = rulers.annotationRuler;
				if (ruler) {
					ruler.onDblClick = rulerOnDblClick;
					ruler.setMultiAnnotationOverlay({html: "<div class='annotationHTML overlay'></div>"}); //$NON-NLS-0$
					ruler.addAnnotationType(AT.ANNOTATION_ERROR);
					ruler.addAnnotationType(AT.ANNOTATION_WARNING);
					ruler.addAnnotationType(AT.ANNOTATION_INFO);
					ruler.addAnnotationType(AT.ANNOTATION_TASK);
					ruler.addAnnotationType(AT.ANNOTATION_BOOKMARK);
					ruler.addAnnotationType(AT.ANNOTATION_BREAKPOINT);
					ruler.addAnnotationType(AT.ANNOTATION_CONDITIONAL_BREAKPOINT);
					ruler.addAnnotationType(AT.ANNOTATION_DIFF_ADDED);
					ruler.addAnnotationType(AT.ANNOTATION_DIFF_DELETED);
					ruler.addAnnotationType(AT.ANNOTATION_DIFF_MODIFIED);
					
					ruler.setAnnotationTypeVisible(this._annotationTypesVisible);
				}
				this.setAnnotationRulerVisible(this._annotationRulerVisible || this._annotationRulerVisible === undefined, true);

				// Overview Ruler Annotation Type
				ruler = this._overviewRuler = rulers.overviewRuler;
				if (ruler) {
					ruler.addAnnotationType(AT.ANNOTATION_CURRENT_SEARCH);
					ruler.addAnnotationType(AT.ANNOTATION_MATCHING_SEARCH);
					ruler.addAnnotationType(AT.ANNOTATION_READ_OCCURRENCE);
					ruler.addAnnotationType(AT.ANNOTATION_WRITE_OCCURRENCE);
					ruler.addAnnotationType(AT.ANNOTATION_CURRENT_BLAME);
					ruler.addAnnotationType(AT.ANNOTATION_ERROR);
					ruler.addAnnotationType(AT.ANNOTATION_WARNING);
					ruler.addAnnotationType(AT.ANNOTATION_INFO);
					ruler.addAnnotationType(AT.ANNOTATION_TASK);
					ruler.addAnnotationType(AT.ANNOTATION_BOOKMARK);
					ruler.addAnnotationType(AT.ANNOTATION_BREAKPOINT);
					ruler.addAnnotationType(AT.ANNOTATION_CONDITIONAL_BREAKPOINT);
					ruler.addAnnotationType(AT.ANNOTATION_MATCHING_BRACKET);
					ruler.addAnnotationType(AT.ANNOTATION_CURRENT_BRACKET);
					ruler.addAnnotationType(AT.ANNOTATION_CURRENT_LINE);
					ruler.addAnnotationType(AT.ANNOTATION_DIFF_ADDED);
					ruler.addAnnotationType(AT.ANNOTATION_DIFF_DELETED);
					ruler.addAnnotationType(AT.ANNOTATION_DIFF_MODIFIED);
					
					ruler.setAnnotationTypeVisible(this._overviewAnnotationTypesVisible);
				}
				this.setOverviewRulerVisible(this._overviewRulerVisible || this._overviewRulerVisible === undefined, true);
			}

			if (this._zoomRulerFactory) {
				this._zoomRuler = this._zoomRulerFactory.createZoomRuler(this._annotationModel);
				this.setZoomRulerVisible(this._zoomRulerVisible, true);
			}

			if (this._lineNumberRulerFactory) {
				this._lineNumberRuler = this._lineNumberRulerFactory.createLineNumberRuler(this._annotationModel);
				this._lineNumberRuler.addAnnotationType(AT.ANNOTATION_CURRENT_BLAME);
				this._lineNumberRuler.addAnnotationType(AT.ANNOTATION_BLAME);
		        this._lineNumberRuler.addAnnotationType(AT.ANNOTATION_DIFF_ADDED);
		        this._lineNumberRuler.addAnnotationType(AT.ANNOTATION_DIFF_MODIFIED);
		        this._lineNumberRuler.addAnnotationType(AT.ANNOTATION_DIFF_DELETED);
				this._lineNumberRuler.onDblClick = rulerOnDblClick;
				this.setLineNumberRulerVisible(this._lineNumberRulerVisible || this._lineNumberRulerVisible === undefined, true);
			}

			if (this._foldingRulerFactory) {
				this._foldingRuler = this._foldingRulerFactory.createFoldingRuler(this._annotationModel);
				this._foldingRuler.addAnnotationType(AT.ANNOTATION_FOLDING);
				this.setFoldingRulerVisible(this._foldingRulerVisible || this._foldingRulerVisible === undefined, true);
			}

			var textViewInstalledEvent = {
				type: "TextViewInstalled", //$NON-NLS-0$
				textView: textView
			};
			this.dispatchEvent(textViewInstalledEvent);
			BaseEditor.prototype.install.call(this);
		},

		/**
		 * Destroys the underlying TextView.
		 */
		uninstallTextView: function() {
			this.uninstall();
		},

		uninstall: function() {
			var textView = this._textView;
			if (!textView) { return; }

			textView.destroy();

			if (this._annotationModel) {
				this._annotationModel.setTextModel(null);
			}
			this._textView = this._undoStack = this._textDND = this._contentAssist =
				this._listener = this._annotationModel = this._annotationStyler =
				this._annotationRuler = this._overviewRuler = this._zoomRuler = this._lineNumberRuler =
				this._foldingRuler = this._currentLineAnnotations = this._title = null;
			this._dirty = false;
			this._foldingRulerVisible = this._overviewRulerVisible = this._zoomRulerVisible =
				this._lineNumberRulerVisible = this._annotationRulerVisible = undefined;

			var textViewUninstalledEvent = {
				type: "TextViewUninstalled", //$NON-NLS-0$
				textView: textView
			};
			this.dispatchEvent(textViewUninstalledEvent);
			BaseEditor.prototype.uninstall.call(this);
		},

		_updateCursorStatus: function() {
			// If we are in a mode and it owns status reporting, we bail out from reporting the cursor position.
			var keyModes = this.getKeyModes();
			for (var i=0; i<keyModes.length; i++) {
				var mode = keyModes[i];
				if (mode.isActive() && mode.isStatusActive && mode.isStatusActive()) {
					return;
				}
			}
			var _status;
			var model = this.getModel();
			var selections = this.getSelections();
			if (selections.length > 1) {
				_status = util.formatMessage(messages.multiSelections, selections.length);
			} else {
				var caretOffset = selections[0].getCaret();
				var lineIndex = model.getLineAtOffset(caretOffset);
				var lineStart = model.getLineStart(lineIndex);
				var offsetInLine = caretOffset - lineStart;
				if (util.readSetting("languageTools")) {
					_status = util.formatMessage(messages.lineColumnOffset, lineIndex + 1, offsetInLine + 1, caretOffset);
				} else {
					_status = util.formatMessage(messages.lineColumn, lineIndex + 1, offsetInLine + 1);
				}
			}
			this.reportStatus(_status);
		},

		showAnnotations: function(annotations, types, createAnnotation, getType) {
			var annotationModel = this._annotationModel;
			if (!annotationModel) {
				return;
			}
			var remove = [], add = [];
			var model = annotationModel.getTextModel();
			var iter = annotationModel.getAnnotations(), annotation;
			while (iter.hasNext()) {
				annotation = iter.next();
				if (types.indexOf(annotation.type) !== -1) {
					if (annotation.creatorID === this) {
						remove.push(annotation);
					}
				}
			}
			if (annotations) {
				for (var i = 0; i < annotations.length; i++) {
					annotation = annotations[i];
					if (!annotation) { continue; }
					if (createAnnotation) {
						annotation = createAnnotation(annotation);
					} else {
						var start, end, lineIndex, lineStart;
						if (annotation.lineStart && annotation.lineEnd){
							start = model.getLineStart(annotation.lineStart);
							// If the closing line number of the modified range is on the last line,
							// get the line ending offset of the previous line
							end = model.getLineCount() === annotation.lineEnd
										? model.getLineEnd(annotation.lineEnd - 1)
										: model.getLineStart(annotation.lineEnd);
						}
						else if (typeof annotation.line === "number") { //$NON-NLS-0$
							// line/column
							lineIndex = annotation.line - 1;
							lineStart = model.getLineStart(lineIndex);
							start = lineStart + annotation.start - 1;
							end = lineStart + annotation.end - 1;
						} else if (annotation.range) {
							lineIndex = annotation.range.start.line;
							lineStart = model.getLineStart(lineIndex);
							start = lineStart + annotation.range.start.character;
							lineIndex = annotation.range.end.line;
							lineStart = model.getLineStart(lineIndex);
							end = lineStart + annotation.range.end.character;
 						} else {
							// document offsets
							start = annotation.start;
							end = annotation.end;
						}
						var type = getType(annotation);
						if (!type) { continue; }
						annotation = AT.createAnnotation(type, start, end, annotation.description);
					}
					annotation.id = annotations[i].id; //allow consumers to tag the annotation with their own identifier
					if(annotations[i].data) {
						annotation.data = annotations[i].data;
					}
					annotation.creatorID = this;
					add.push(annotation);

				}
			}
			annotationModel.replaceAnnotations(remove, add);
		},

		showProblems: function(problems) {
			this.showAnnotations(problems, [
				AT.ANNOTATION_ERROR,
				AT.ANNOTATION_WARNING,
				AT.ANNOTATION_TASK,
				AT.ANNOTATION_INFO
			], null, function(annotation) {
				switch (annotation.severity) {
					case "error": return AT.ANNOTATION_ERROR; //$NON-NLS-0$
					case "warning": return AT.ANNOTATION_WARNING; //$NON-NLS-0$
					case "task": return AT.ANNOTATION_TASK; //$NON-NLS-0$
					case "info": return AT.ANNOTATION_INFO;
				}
				return null;
			});
		},

		showOccurrences: function(occurrences) {
			this.showAnnotations(occurrences, [
				AT.ANNOTATION_READ_OCCURRENCE,
				AT.ANNOTATION_WRITE_OCCURRENCE
			], null, function(annotation) {
				return annotation.readAccess ? AT.ANNOTATION_READ_OCCURRENCE : AT.ANNOTATION_WRITE_OCCURRENCE;
			});
		},

		showBlame : function(blameMarkers) {
			var blameRGB = this._blameRGB;
			var doc = this.getTextView().getOptions("parent").ownerDocument; //$NON-NLS-0$
			if (!blameRGB) {
				var div = util.createElement(doc, "div"); //$NON-NLS-0$
				div.className = "annotation blame"; //$NON-NLS-0$
				doc.body.appendChild(div);
				var win = doc.defaultView || doc.parentWindow;
				var blameStyle = win.getComputedStyle(div);
				var color = blameStyle.getPropertyValue("background-color"); //$NON-NLS-0$
				div.parentNode.removeChild(div);
				var i1 = color.indexOf("("); //$NON-NLS-0$
				var i2 = color.indexOf(")"); //$NON-NLS-0$
				color = color.substring(i1 + 1, i2);
				this._blameRGB = blameRGB = color.split(",").slice(0,3); //$NON-NLS-0$
			}
			var createGroup = function() {
				var annotation = mAnnotations.AnnotationType.createAnnotation(this.groupType, this.start, this.end, this.title);
				annotation.style = objects.mixin({}, annotation.style);
				annotation.style.style = objects.mixin({}, annotation.style.style);
				annotation.style.style.backgroundColor = "";
				this.groupAnnotation = annotation;
				annotation.blame = this.blame;
				annotation.html = this.html;
				annotation.creatorID = this.creatorID;
				return annotation;
			};
			var title = function() {
				var titleDiv = util.createElement(doc, "div"); //$NON-NLS-0$
				titleDiv.className = "tooltipTitle"; //$NON-NLS-0$
				var index = this.blame.Message.indexOf("\n"); //$NON-NLS-0$
				if (index === -1) { index = this.blame.Message.length; }
				var commitLink = util.createElement(doc, "a"); //$NON-NLS-0$
				commitLink.href = this.blame.CommitLink;
				if(util.isElectron){
					commitLink.target = "_blank";
				}
				commitLink.appendChild(doc.createTextNode(this.blame.Message.substring(0, index)));
				titleDiv.appendChild(commitLink);
				titleDiv.appendChild(util.createElement(doc, "br")); //$NON-NLS-0$
				titleDiv.appendChild(doc.createTextNode(util.formatMessage(messages.committerOnTime, this.blame.AuthorName, this.blame.Time)));
				return titleDiv;
			};
			var model = this.getModel();
			this.showAnnotations(blameMarkers, [
				AT.ANNOTATION_BLAME,
				AT.ANNOTATION_CURRENT_BLAME
			], function (blameMarker) {
				var start = model.getLineStart(blameMarker.Start - 1);
				var end = model.getLineEnd(blameMarker.End - 1, true);
				var annotation = mAnnotations.AnnotationType.createAnnotation(AT.ANNOTATION_BLAME, start, end, title);
				var blameColor = blameRGB.slice(0);
				blameColor.push(blameMarker.Shade);
				annotation.style = objects.mixin({}, annotation.style);
				annotation.style.style = objects.mixin({}, annotation.style.style);
				annotation.style.style.backgroundColor = "rgba(" + blameColor.join() + ")"; //$NON-NLS-0$ //$NON-NLS-1$
				annotation.groupId = blameMarker.Name;
				annotation.groupType = AT.ANNOTATION_CURRENT_BLAME;
				annotation.createGroupAnnotation = createGroup;
				annotation.html = '<img class="annotationHTML blame" src="' + blameMarker.AuthorImage + '"/>'; //$NON-NLS-0$ //$NON-NLS-1$
				annotation.blame = blameMarker;
				return annotation;
			});
		},

		/**
		 * Display git diff annotation on the editor's annotation ruler and overview ruler.
		 *
		 * @param diffs [] with types "added", "modified", "deleted"
		 * 		Each property in diffs contains an array of objects { lineStart, lineEnd } that
		 * 		provides the starting and ending line index for the specified property.
		 */
		showDiffAnnotations: function(diffs) {
			this.showAnnotations(diffs, [
				AT.ANNOTATION_DIFF_ADDED,
				AT.ANNOTATION_DIFF_MODIFIED,
				AT.ANNOTATION_DIFF_DELETED
			], null, function(annotation) {
				if(annotation.type === "added")//$NON-NLS-0$
					return AT.ANNOTATION_DIFF_ADDED;
				else if (annotation.type === "modified")//$NON-NLS-0$
					return AT.ANNOTATION_DIFF_MODIFIED;
				return AT.ANNOTATION_DIFF_DELETED; // assume deleted if not added or modified
			});
		},

		/**
		 * Reveals and selects a portion of text.
		 * @param {Number} start
		 * @param {Number} end
		 * @param {Number} line
		 * @param {Number} offset
		 * @param {Number} length
		 */
		showSelection: function(start, end, line, offset, len) {
			// We use typeof because we need to distinguish the number 0 from an undefined or null parameter
			if (typeof(start) === "number") { //$NON-NLS-0$
				if (typeof(end) !== "number") { //$NON-NLS-0$
					end = start;
				}
				this.moveSelection(start, end);
				return true;
			} else if (typeof(line) === "number") { //$NON-NLS-0$
				var model = this.getModel();
				var pos = model.getLineStart(line-1);
				if (typeof(offset) === "number") { //$NON-NLS-0$
					pos = pos + offset;
				}
				if (typeof(len) !== "number") { //$NON-NLS-0$
					len = 0;
				}
				this.moveSelection(pos, pos+len);
				return true;
			}
			return false;
		},

		/**
		 * @private
		 */
		_setModelText: function(contents) {
			if (this._textView) {
				this._textView.setText(contents);
				this._textView.getModel().setLineDelimiter("auto"); //$NON-NLS-0$
				this._highlightCurrentLine(this._textView.getSelections());
			}
		},
		
		/**
		 * Sets the editor's noFocus flag.
		 *
		 * @param {Boolean} if true, does not set focus on the editor.
		 * @param {Boolean} noFocus
		 */
		setNoFocus: function(noFocus) {
			this._noFocus = noFocus;
		},
		/**
		 * Sets the editor's contents.
		 *
		 * @param {String} title
		 * @param {String} message
		 * @param {String} contents
		 * @param {Boolean} contentsSaved
		 * @param {Boolean} noFocus
		 */
		setInput: function(title, message, contents, contentsSaved, noFocus) {
			BaseEditor.prototype.setInput.call(this, title, message, contents, contentsSaved);
			if (this._textView && !contentsSaved && !noFocus && !this._noFocus) {
				this._textView.focus();
			}
		},
		/**
		 * Reveals a line in the editor, and optionally selects a portion of the line.
		 * @param {Number} line - document base line index
		 * @param {Number|String} column
		 * @param {Number} [end]
		 */
		onGotoLine: function(line, column, end, callback) {
			if (this._textView) {
				var model = this.getModel();
				line = Math.max(0, Math.min(line, model.getLineCount() - 1));
				var lineStart = model.getLineStart(line);
				var start = 0;
				if (end === undefined) {
					end = 0;
				}
				if (typeof column === "string") { //$NON-NLS-0$
					var index = model.getLine(line).indexOf(column);
					if (index !== -1) {
						start = index;
						end = start + column.length;
					}
				} else {
					start = column;
					var lineLength = model.getLineEnd(line) - lineStart;
					start = Math.min(start, lineLength);
					end = Math.min(end, lineLength);
				}
				this.moveSelection(lineStart + start, lineStart + end, callback);
			}
		}
	});

	return {
		BaseEditor: BaseEditor,
		Editor: Editor
	};
});
