/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others. All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License 2.0 (http://www.eclipse.org/legal/epl-v10.html),
 * and the Eclipse Distribution License v1.0
 * (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/commandRegistry',
	'orion/keyAssist',
	'orion/fileClient',
	'orion/contentTypes',
	'orion/editorCommands',
	'embeddedEditor/helper/bootstrap',
	'embeddedEditor/helper/editorSetup',
	'embeddedEditor/helper/memoryFileSysConst',
	'orion/serviceregistry',
	'orion/Deferred',
	'orion/commonPreferences',
	'orion/defaultEditorPreferences',
	'orion/objects'
], function(
	mCommandRegistry,
	mKeyAssist,
	mFileClient,
	mContentTypes,
	mEditorCommands,
	mBootstrap,
	mEditorSetup,
	memoryFileSysConst,
	mServiceRegistry, 
	Deferred,
	mCommonPreferences,
	mDefaultEditorPreferences,
	objects
) {
	function CodeEdit(options) {
		this.serviceRegistry = new mServiceRegistry.ServiceRegistry();
		this.contentTypeRegistry = new mContentTypes.ContentTypeRegistry(this.serviceRegistry);
		this._startupOptions = options;
		this._toolbarId = options && options.toolbarId ? options.toolbarId : "__code__edit__hidden__toolbar";
		this.Deferred = Deferred;
	}
	var once;
	objects.mixin(CodeEdit.prototype, {
		_init: function(core) {
			if(once) {
				return once;
			}
			if(!(this._startupOptions && this._startupOptions.toolbarId)) {
				//TODO: We should create this hidden div somewhere else
				//The hidden DIV that allows some commands for editorCommnads to be rendered. We only want to use keybinding of them though.
				var orionHiddenDiv = document.createElement("div");
				orionHiddenDiv.id = this._toolbarId;
				document.body.appendChild(orionHiddenDiv);
				orionHiddenDiv.style.display = "none";
			}
			//once = new Deferred();
			this._commandRegistry = new mCommandRegistry.CommandRegistry({});			
			this._fileClient = new mFileClient.FileClient(this.serviceRegistry);
			this._editorCommands = new mEditorCommands.EditorCommandFactory({
				serviceRegistry: this.serviceRegistry,
				commandRegistry: this._commandRegistry,
				fileClient: this._fileClient,
				toolbarId: this._toolbarId,
				navToolbarId: this._toolbarId
			});

			// Key assist
			var keyAssist = new mKeyAssist.KeyAssistPanel({
				commandRegistry: this._commandRegistry
			});
			mKeyAssist.createCommand(keyAssist, "__toolbar__", this._commandRegistry);			
			keyAssist.addProvider(this._editorCommands);
			
			this._editorConfig = this._startupOptions && this._startupOptions.editorConfig ? this._startupOptions.editorConfig : {};
			mCommonPreferences.mergeSettings(mDefaultEditorPreferences.defaults, this._editorConfig);
			this._progressService = {
				progress: function(deferred/*, operationName, progressMonitor*/){
					return deferred;
				},
				showWhile: function(deferred/*, message, avoidDisplayError*/){
					return deferred;
				}
			};			
			this.serviceRegistry.registerService("orion.page.progress", this._progressService);
			once = this._editorCommands.createCommands().then(function() {
				this._editorCommands.registerCommands();
				return new Deferred().resolve();
			}.bind(this));
			//once.resolve();
			return once;
		},
		
		/**
		 * @class This object describes the options for <code>create</code>.
		 * @name orion.editor.EditOptions
		 *
		 * @property {String|DOMElement} parent the parent element for the view, it can be either a DOM element or an ID for a DOM element.
		 * @property {String} [contents=""] the editor contents.
		 * @property {String} [contentType] the type of the content (eg.- application/javascript, text/html, etc.)
		 */
		/**
		 * If options is defined, creates an editorview instance configured with the given options. Otherwise load all the plugins nad initialize the widegt.
		 * 
		 * @param {orion.editor.EditOptions} options the editor options.
		 */
		startup: function(options) {
			return mBootstrap.startup(this.serviceRegistry, this.contentTypeRegistry, this._startupOptions).then(function(core) {
				var serviceRegistry = core.serviceRegistry;
				var pluginRegistry = core.pluginRegistry;
				return this._init(core).then( function () {
					if(!options) {
						return new Deferred().resolve(core);
					}
					var editorHelper = new mEditorSetup.EditorSetupHelper({
						serviceRegistry: serviceRegistry,
						pluginRegistry: pluginRegistry,
						commandRegistry: this._commandRegistry,
						fileClient: this._fileClient,
						contentTypeRegistry: this.contentTypeRegistry,
						editorCommands: this._editorCommands,
						editorConfig: this._editorConfig,
						progressService: this._progressService,
						toolbarId: this._toolbarId
					});
					return editorHelper.createEditor(options);
		 		}.bind(this));

			}.bind(this));
		},
		/**
		 * @class This object describes the options for <code>create</code>.
		 * @name orion.editor.EditOptions
		 *
		 * @property {String|DOMElement} parent the parent element for the view, it can be either a DOM element or an ID for a DOM element.
		 * @property {String} [contents=""] the editor contents.
		 * @property {String} [contentType] the type of the content (eg.- application/javascript, text/html, etc.)
		 */
		/**
		 * Creates an editorview instance configured with the given options.
		 * 
		 * @param {orion.editor.EditOptions} options the editor options.
		 */
		create: function(options) {
			return this.startup(options);
		},
		importFiles: function(files2import) {
			var fileClient = this.serviceRegistry.getService("orion.core.file.client");
			var promises = [];
			if(fileClient) {
				files2import.forEach(function(file) {
					var promise = fileClient.createFile(file.parentLocation ? file.parentLocation : memoryFileSysConst.MEMORY_FILE_PROJECT_PATTERN, file.name).then(function(result){
						return fileClient.write(result.Location, file.contents);
					});
					promises.push(promise);			
				});
			}
			return Deferred.all(promises);
		},
		exportFiles: function(files2export) {
			var fileClient = this.serviceRegistry.getService("orion.core.file.client");
			var promises = [];
			if(fileClient) {
				files2export.forEach(function(file) {
					var promise;
					if(file.name || file.location) {
						var readLocation = file.location ? file.location : memoryFileSysConst.MEMORY_FILE_PROJECT_PATTERN + file.name;
						promise = fileClient.read(readLocation);
					} else {
						promise = new Deferred().resolve("");
					}
					promises.push(promise);			
				});
			}
			return Deferred.all(promises);
		}
	});
	
	return CodeEdit;
});
