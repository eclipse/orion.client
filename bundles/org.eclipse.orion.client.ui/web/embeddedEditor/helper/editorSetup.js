/******************************************************************************* 
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/editor/textModel',
	'orion/editor/undoStack',
	'orion/inputManager',
	'orion/editorView',
	'orion/Deferred',
	'orion/webui/littlelib',
	'orion/objects'
], function(
	mTextModel,
	mUndoStack,
	mInputManager,
	mEditorView,
	Deferred,
	lib,
	objects
) {
	var idCounter = 0;
	function EditorSetupHelper(options) {
		this._serviceRegistry = options.serviceRegistry;
		this._pluginRegistry = options.pluginRegistry;
		this._commandRegistry = options.commandRegistry;
		this._fileClient = options.fileClient;
		this._contentTypeRegistry = options.contentTypeRegistry;
		this._editorCommands = options.editorCommands;
		this._progressService = options.progressService;
		this._toolbarId = options.toolbarId;
		this._editorConfig = options.editorConfig;
	}
	
	objects.mixin(EditorSetupHelper.prototype, /** @lends orion.editor.EditorSetupHelper.prototype */ {
		destroy: function() {
		},
		createInputManager: function() {
			var inputManager = this._inputManager = new mInputManager.InputManager({
				serviceRegistry: this._serviceRegistry,
				fileClient: this._fileClient,
				progressService: this._progressService,
				//statusReporter: this.statusReporter.bind(this),
				selection: this.selection,
				contentTypeRegistry: this._contentTypeRegistry
			});
			inputManager.addEventListener("InputChanged", function(evt) { //$NON-NLS-0$
				evt.editor = this.editorView.editor;
				this.setActiveEditorView(this.editorView);
			}.bind(this));
			inputManager.addEventListener("InputChanging", function(e) { //$NON-NLS-0$
				e.editor = this.editorView.editor;
			}.bind(this));
		},
		
		
		defaultOptions: function(options) {
			var parentId = options.parent;
			var model = new mTextModel.TextModel();
			var id = idCounter.toString();
			var context = Object.create(null);
			context.openEditor = function(fileurl, options){this.editorView.editor.setSelection(options.start, options.end);}.bind(this);
			return {
				activateContext: context,
				id: id,
				parent: parentId,
				model: model,
				undoStack: new mUndoStack.UndoStack(model, 500),
				serviceRegistry: this._serviceRegistry,
				pluginRegistry: this._pluginRegistry,
				commandRegistry: this._commandRegistry,
				contentTypeRegistry: this._contentTypeRegistry,
				editorCommands: this._editorCommands,
				editorConfig: options.editorConfig ? options.editorConfig: this._editorConfig,
				statusReporter: options.statusReporter,
				singleMode: options.singleMode,
				progressService: this._progressService,
				inputManager: this._inputManager, // fake it
				fileService: this._fileClient, // fake it
				problemsServiceID: "orion.core.marker" + id, //$NON-NLS-0$
				editContextServiceID: "orion.edit.context" + id, //$NON-NLS-0$
				editModelContextServiceID: "orion.edit.model.context" + id, //$NON-NLS-0$
				readonly: false
			};
		},
		
		setActiveEditorView: function(eView) {
			this._editorCommands.updateCommands(eView);
			this._commandRegistry.destroy(this._toolbarId);
			this._commandRegistry.renderCommands(this._toolbarId, this._toolbarId, this._inputManager.getFileMetadata(), eView.editor, "tool"); //$NON-NLS-0$
		},
		
		createEditor: function(options, startupOptions) {
			this.createInputManager();
			this.editorView = new mEditorView.EditorView(this.defaultOptions(options));
			idCounter++;
			this.editorView.create();
			this._inputManager.editor = this.editorView.editor;
			
			var domNode = lib.node(options.parent);
			domNode.addEventListener("mousedown", function() { //$NON-NLS-0$
				this.setActiveEditorView(this.editorView);
			}.bind(this), true);
			domNode.addEventListener("keyup", function() { //$NON-NLS-0$
				this.setActiveEditorView(this.editorView);
			}.bind(this), true);
			
			if(options.contentType && typeof options.contents === "string") {
				this.editorView.setContents(options.contents, options.contentType, {noFocus: options.noFocus});
			}
			return new Deferred().resolve(this.editorView);
		}
	});
	
	return {
		EditorSetupHelper: EditorSetupHelper
	};
});
