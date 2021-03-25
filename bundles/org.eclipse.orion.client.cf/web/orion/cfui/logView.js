/*******************************************************************************
 * Copyright (c) 2013, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define(['i18n!cfui/nls/messages', 
	'orion/editor/textModel',
	'orion/editorView',
	'orion/inputManager',
	'orion/objects',
	'orion/Deferred',
	'orion/globalCommands',
	'orion/i18nUtil',
	'orion/URL-shim'
], function(messages, mTextModel, mEditorView, mInputManager, objects, Deferred, mGlobalCommands, i18Util) {

	function handleError(statusService, error) {
		if (!statusService) {
			window.console.log(error);
			return;
		}
		if (error.status === 0) {
			error = {
				Severity: "Error", //$NON-NLS-0$
				Message: "No response"
			};
		} else {
			var responseText = error.responseText;
			if (responseText) {
				try {
					error = JSON.parse(responseText);
				} catch(e) {
					error = {
						//HTML: true,
						Severity: "Error", //$NON-NLS-0$
						Message: responseText
					};
				}
			}
		}
		statusService.setProgressResult(error);
	}

	function LogInputManager(options){
		mInputManager.InputManager.apply(this, [options]);
		this.cFClient = options.cFClient;
		this.commandRegistry = options.commandRegistry;
	}

	LogInputManager.prototype = new mInputManager.InputManager({});
	
	objects.mixin(LogInputManager.prototype, {
		setApplicationInfo: function(appInfo){
			this.applicationInfo = appInfo;
		},
		getApplicationInfo: function(){
			return this.applicationInfo;	
		},
		_scrollLock: false,
		setScrollLock: function (lock) {
			this._scrollLock = lock;
		},
		load: function(){
			var logName = this.getInput();
			this._acceptPatch = null;
			
			var fullLog = "";
			if (this.applicationInfo){
				this.applicationInfo.logs.forEach(function(line){
					fullLog += line + "\n"; //$NON-NLS-1$
				});
			}

			var selections, vScroll, hScroll;
			if (this._scrollLock) {
				selections = this.editor.getSelections();
				vScroll = this.editor.getTextView().getTopPixel();
				hScroll = this.editor.getTextView().getHorizontalPixel();
			}
			this._setInputContents(this._parsedLocation, logName, fullLog, {Name: logName});
			if (this._scrollLock) {
				this.editor.setSelections(selections, false);
				this.editor.getTextView().setTopPixel(vScroll);
				this.editor.getTextView().setHorizontalPixel(hScroll);
			} else {
				this.editor.setSelection(fullLog.length, fullLog.length);
			}
		},
		constructor: LogInputManager
	});

	function LogEditorView(options) {
		this.options = options;
		this._parent = options.parent;
		this.serviceRegistry = options.serviceRegistry;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.commandRegistry = options.commandRegistry;
		this.progress = options.progressService;
		this.undoStack = options.undoStack;
		this._createInputManager();
	}
	LogEditorView.prototype = {
		_createInputManager: function(){
			this.inputManager = new LogInputManager(this.options);
			var defaultOptions = {
				parent: this._parent,
				model: new mTextModel.TextModel(),
				undoStack: this.options.undoStack,
				serviceRegistry: this.options.serviceRegistry,
				pluginRegistry: this.options.pluginRegistry,
				commandRegistry: this.options.commandRegistry,
				contentTypeRegistry: this.options.contentTypeRegistry,
				inputManager: this.inputManager,
				readonly: true,
				editorCommands: this.options.editorCommands,
				preferences: this.options.preferences,
				searcher: this.options.searcher,
				selection: this.options.selection,
				fileService: this.options.fileClient,
				fileClient:this.options.fileClient,
				statusReporter: this.options.statusReporter,
				statusService: this.options.statusService,
				progressService: this.options.progressService
			};
			this.editorView = new mEditorView.EditorView(defaultOptions);
		},
		create: function() {
			if(!this.editorCreated){
				this.editorView.create();
				this.editorCreated = true;
				
				this.inputListener = function(evt) {
					evt.editor = this.editorView.editor;
				}.bind(this);
				
				this.inputManager.addEventListener("InputChanged", this.inputListener);
				this.inputManager.lastLogLoaded = null;
				this.inputManager.lastLogInstance = null;
			}

		},
		destroy: function() {
			if (this.editorCreated) {
				this.editorView.destroy();
				if(this.inputListener){
					this.inputManager.removeEventListener("InputChanged", this.inputListener);
				}
			}
			this.editorCreated = false;
		}
	};
	
	return {
		LogEditorView: LogEditorView
	};
});
