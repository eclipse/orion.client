/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

/*eslint-env browser, amd*/
define([
	'i18n!orion/edit/nls/messages',
	'orion/explorers/navigatorRenderer',
	'orion/i18nUtil',
	'orion/Deferred',
	'orion/EventTarget',
	'orion/objects',
	'orion/PageUtil',
	'orion/editor/textModelFactory',
	'orion/formatter',
	'lsp/languageServerRegistry',
	'orion/metrics',
	'orion/util'
], function(messages, mNavigatorRenderer, i18nUtil, Deferred, EventTarget, objects, PageUtil, mTextModelFactory, mFormatter, mLanguageServerRegistry, mMetrics, util) {

	function Idle(options){
		this._document = options.document || document;
		this._timeout = options.timeout;
		//TODO: remove listeners if there are no clients
		//TODO: add support for multiple clients with different timeouts
		var events = ["mousedown", "keypress","keydown","keyup"]; //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$
		var reset = function () { this._resetTimer(); }.bind(this);
		for (var i = 0; i < events.length; i++) {
			var evt = events[i];
			this._document.addEventListener(evt, reset, true);
		}
		EventTarget.attach(this);
	}

	Idle.prototype = {
		_resetTimer: function() {
			var win = this._document.defaultView || this._document.parentWindow;
			if (this._timer) {
				win.clearTimeout(this._timer);
				this._timer = null;
			}
			if (this._timeout !== -1) {
				this._timer = win.setTimeout(function() {
					this.onIdle({type:"Idle"});	//$NON-NLS-0$
					this._timer = null;
					this._resetTimer();
				}.bind(this), this._timeout);
			}
		},
		onIdle: function (idleEvent) {
			return this.dispatchEvent(idleEvent);
		},
		setTimeout: function(timeout) {
			this._timeout = timeout;
			this._resetTimer();
		}
	};

	function _makeError(error) {
		var newError = {
			Severity: "Error" //$NON-NLS-0$
		};
		if (error.args && error.args.timeout) {
			/* write timeout in s, not ms */
			newError.Message = i18nUtil.formatMessage(messages.noResponseTimeout, error.args.timeout / 1000);
		} else {
			newError.Message = messages.noResponse;
		}

		if (error.name === "Cancel") {
			return {Severity: "Warning", Message: error.name, Cancel: true};
		} else if (error.status === 0) {
			newError.Cancel = true;
			return newError; // might do better here
		} else if (error.responseText) {
			var responseText = error.responseText;
			try {
				var parsedError = JSON.parse(responseText);
				newError.Severity = parsedError.Severity || newError.Severity;
				newError.Message = parsedError.Message || newError.Message;
			} catch (e) {
				if (responseText.length < 200) {
					newError.Message = responseText;
				}
			}
		} else {
			try {
				newError.Message = JSON.stringify(error);
			} catch (e) {
				// best effort - fallthrough
			}
		}
		return newError;
	}

	function handleError(statusService, error) {
		if (!statusService) {
			window.console.log(error);
			return;
		}
		if (!error.Severity) {
			error = _makeError(error);
		}
		statusService.setProgressResult(error);
		return error;
	}
	
	function decode(contents, charset, done, errorHandler) {
		if (window.TextDecoder) {
			done(new TextDecoder(charset).decode(contents));
		} else {
			var mimeType = 'text/plain; charset=' + charset; //$NON-NLS-0$
			var blob = new Blob([contents], { type: mimeType });
			var reader = new FileReader();
			reader.onload = function() {
				done(reader.result);
			}.bind(this);
			reader.onerror = errorHandler;
			reader.readAsText(blob, charset);
		}
	}
	
	var UTF8 = "UTF-8"; //$NON-NLS-0$
	function isUTF8(charset) {
		return !charset || charset === UTF8; //$NON-NLS-0$
	}

	/**
	 * @name orion.editor.InputManager
	 * @class
	 */
	function InputManager(options) {
		EventTarget.attach(this);
		this.serviceRegistry = options.serviceRegistry;
		this.statusService = options.statusService;
		this.fileClient = options.fileClient;
		this.progressService = options.progressService;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.selection = options.selection;
		this.reveal = options.reveal;
		this.isUnsavedWarningNeeed = options.isUnsavedWarningNeeed;
		this.confirm = options.confirm;
		this.generalPreferences = options.generalPreferences || {};
		this.isEditorTabsEnabled = options.isEditorTabsEnabled || false;
		this._input = this._title = "";
		this.languageServerRegistry = new mLanguageServerRegistry.LanguageServerRegistry(this.serviceRegistry, options.problemsServiceID || "orion.core.marker"); //$NON-NLS-0$
		if (this.fileClient) {
			this.fileClient.addEventListener("Changed", function(evt) { //$NON-NLS-0$
				if (this._fileMetadata && this._fileMetadata._saving) {
					return;
				}
				if(evt && evt.modified) {
					var metadata = this.getFileMetadata();
					if(metadata && metadata.Location) {
						if(evt.modified.some(function(loc){
							return metadata.Location === loc;
						})) {
							//We do not want to set focus on this editor. 
							//E.g., If a user works on editor A but quick fix could have modified editor B. We should update B's contents but user still want to work on A.
							this.load(null, true);
						}
					}
				}
			}.bind(this));
		}
		this.syncEnabled = true;
	}
	objects.mixin(InputManager.prototype, /** @lends orion.editor.InputManager.prototype */ {
		/**
		 * @returns {orion.Promise} Promise resolving to the new Location we should use
		 */
		_maybeLoadWorkspace: function(resource) {
			var fileClient = this.fileClient;
			// If it appears to be a workspaceRootURL we cannot load it directly, have to get the workspace first
			var root = resource;
			if (root.indexOf("?")) root = root.split("?")[0];
			if (root === fileClient.fileServiceRootURL(root)) {
				return fileClient.loadWorkspace(root).then(function(workspace) {
					return workspace.Location;
				});
			}
			return new Deferred().resolve(resource);
		},
		/**
		 * Wrapper for fileClient.read() that tolerates a filesystem root URL passed as location. If location is indeed
		 * a filesystem root URL, the original read() operation is instead performed on the workspace.
		 */
		_read: function(loc /**, readArgs*/) {
			var cachedMetadata = this.cachedMetadata || mNavigatorRenderer.getClickedItem();
			if (cachedMetadata && cachedMetadata.Location === loc &&
				cachedMetadata.Parents && cachedMetadata.Attributes &&
				cachedMetadata.ETag
			) {
				return new Deferred().resolve(cachedMetadata);
			}
			var fileClient = this.fileClient;
			var readArgs = Array.prototype.slice.call(arguments, 1);
			return this._maybeLoadWorkspace(loc).then(function(newLocation) {
				return fileClient.read.apply(fileClient, [newLocation].concat(readArgs));
			});
		},
		_isSameParent: function(loc) {
			if (this._lastMetadata && this._lastMetadata.Parents && this._lastMetadata.Parents.length > 0) {
				var parentLocation = loc.substring(0, loc.lastIndexOf("/", loc.length - (loc[loc.length - 1] === "/" ? 2 : 1)) + 1); 
				return this._lastMetadata.Parents[0].Location === parentLocation;
			}
			return false;
		},
		load: function(charset, nofocus) {
			var fileURI = this.getInput();
			if (!fileURI) { return; }
			var fileClient = this.fileClient;
			var resource = this._parsedLocation.resource;
			var progressService = this.progressService;
			var progress = function(deferred, msgKey, uri) {
				if (!progressService) { return deferred; }
				return progressService.progress(deferred, i18nUtil.formatMessage(msgKey, uri));
			};
			var editor = this.getEditor();
			if (this._fileMetadata) {
				//Reload if out of sync, unless we are already in the process of saving
				if (!this._fileMetadata._saving && !this._fileMetadata.Directory && !this.getReadOnly()) {
					progress(fileClient.read(resource, true), messages.ReadingMetadata, fileURI).then(function(data) {
						if (this._fileMetadata && !this._fileMetadata._saving && this._fileMetadata.Location === data.Location && this._fileMetadata.ETag !== data.ETag) {
							this._fileMetadata = objects.mixin(this._fileMetadata, data);
							var doSync = function(){
								progress(fileClient.read(resource), messages.Reading, fileURI).then(
									function(contents) {
										editor.setInput(fileURI, null, contents, null, nofocus);
										this._clearUnsavedChanges();
										mMetrics.logAudit("read", "orion-file", {id: util.computeAuditId(fileClient, resource), isData: true});
									}.bind(this),
									function(error) {
										mMetrics.logAudit("read", "orion-file", {id: util.computeAuditId(fileClient, resource), isData: true}, error);
									}
								);
							};
							if (this.syncEnabled && !editor.isDirty()){
								doSync();
							}else{
								var dialog = this.serviceRegistry.getService("orion.page.dialog");
								dialog.confirm(messages.loadOutOfSync,function(result){
									if(this.syncEnabled && result){
										doSync();
									}
								});
							}
						}
					}.bind(this));
				}
			} else {
				var progressTimeout = window.setTimeout(function() {
					progressTimeout = null;
					this.reportStatus(i18nUtil.formatMessage(messages.Fetching, fileURI));
				}.bind(this), 800);
				var clearProgressTimeout = function() {
					this.reportStatus("");
					if (progressTimeout) {
						window.clearTimeout(progressTimeout);
					}
				}.bind(this);
				// Read metadata
				var metadataURI = resource;
				var errorHandler = function(error) {
					clearProgressTimeout();
					var statusService = null;
					if(this.serviceRegistry) {
						statusService = this.serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
					} else if(this.statusService) {
						statusService = this.statusService;
					}
					handleError(statusService, error);
					this._setNoInput(metadataURI);
				}.bind(this);
				this._acceptPatch = null;
				if (!this._isSameParent(metadataURI)) {
					var uri = new URL(metadataURI);
					var treeType = util.readSetting("useCompressedTree")
					uri.query.set("tree", treeType ? "compressed" : "decorated"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$
					metadataURI = uri.href;
				}
				progress(this._read(metadataURI, true), messages.ReadingMetadata, resource).then(function(metadata) {
					if(!metadata) {
						errorHandler({responseText: i18nUtil.formatMessage(messages.ReadingMetadataError, resource)});
					} else if (metadata.Directory) {
						// Fetch children
						Deferred.when(metadata.Children || progress(fileClient.fetchChildren(metadata.ChildrenLocation), messages.Reading, fileURI), function(contents) {
							clearProgressTimeout();
							metadata.Children = contents;
							this._setInputContents(this._parsedLocation, fileURI, contents, metadata);
						}.bind(this), errorHandler);
					} else {
						charset = charset || this._charset;
						// Read contents if this is a text file and encoding is UTF-8
						var isText = this._isText(metadata);
						if (isUTF8(charset) && isText) {
							// Read text contents
							var defaultReadOptions, textModelFactory = new mTextModelFactory.TextModelFactory();
							//If textModelFactory support additional options for reading text contents, we need to use it.
							//An example is to support large file, whose contents is read by segments
							if(typeof textModelFactory.getDefaultReadOptions === "function") {
								defaultReadOptions = textModelFactory.getDefaultReadOptions();
							}
							progress(fileClient.read(resource, false, true, defaultReadOptions), messages.Reading, fileURI).then(
								function(contents) {
									clearProgressTimeout();
									if (typeof contents !== "string") { //$NON-NLS-0$
										this._acceptPatch = contents.acceptPatch;
										contents = contents.result;
									}
									this._setInputContents(this._parsedLocation, fileURI, contents, metadata);
									mMetrics.logAudit("read", "orion-file", {id: util.computeAuditId(fileClient, resource), isData: true});
								}.bind(this),
								function(error) {
									errorHandler(error);
									mMetrics.logAudit("read", "orion-file", {id: util.computeAuditId(fileClient, resource), isData: true}, error);
								}
							);
						} else {
							progress(fileClient._getService(resource).readBlob(resource), messages.Reading, fileURI).then(
								function(contents) {
									clearProgressTimeout();
									if (isText) {
										decode(contents, charset, function(result) {
											this._setInputContents(this._parsedLocation, fileURI, result, metadata);
										}.bind(this), errorHandler);
										return;
									}
									this._setInputContents(this._parsedLocation, fileURI, contents, metadata);
									mMetrics.logAudit("read", "orion-file", {id: util.computeAuditId(fileClient, resource), isData: true});
								}.bind(this),
								function(error) {
									errorHandler(error);
									mMetrics.logAudit("read", "orion-file", {id: util.computeAuditId(fileClient, resource), isData: true}, error);
								}
							);
						}
					}
				}.bind(this),
				function(error) {
					mMetrics.logAudit("read", "orion-file", {id: util.computeAuditId(fileClient, resource), isData: true}, error);
					errorHandler(error);
				});
			}
		},
		processParameters: function(input) {
			var editor = this.getEditor();
			if (editor && editor.processParameters) {
				return editor.processParameters(input);
			}
			return false;
		},
		getAutoLoadEnabled: function() {
			return this._autoLoadEnabled;
		},
		getAutoSaveEnabled: function() {
			return this._autoSaveEnabled;
		},
		getFormatOnSaveEnabled: function() {
			return this._formatOnSaveEnabled;
		},
		getEditor: function() {
			return this.editor;
		},
		getEncodingCharset: function() {
			return this._charset || UTF8;
		},
		getInput: function() {
			return this._input;
		},
		getLocation: function() {
			return this._location;
		},
		getTitle: function() {
			return this._title;
		},
		getFileMetadata: function() {
			return this._fileMetadata;
		},
		isSaveEnabled: function() {
			return !this.getReadOnly();
		},
		getReadOnly: function() {
			var data = this._fileMetadata;
			return this._readonly || !data || (data.Attributes && data.Attributes.ReadOnly) ? true: false;
		},
		getContentType: function() {
			return this._contentType;
		},
		onFocus: function() {
			// If there was an error while auto saving, auto save is temporarily disabled and
			// we retry saving every time the editor gets focus
			if (this._autoSaveEnabled && this._errorSaving && this.syncEnabled) {
				this.save();
				return;
			}
			if (this._autoLoadEnabled && this._fileMetadata && this.syncEnabled) {
				this.load();
			}
		},
		reportStatus: function(msg) {
			if (this.statusReporter) {
				this.statusReporter(msg);
			} else if (this.editor) {
				this.editor.reportStatus(msg);
			}
		},
		save: function(closing) {
			var metadata = this.getFileMetadata();
			if (!metadata) return new Deferred().reject();
			if (metadata._saving) { return metadata._savingDeferred; }
			metadata._savingDeferred = new Deferred();
			metadata._saving = true;
			function done(result) {
				var deferred = metadata._savingDeferred;
				deferred.resolve(result);
				metadata._savingDeferred = null;
				metadata._saving = false;
				return deferred;
			}
			var editor = this.getEditor();
			if (!this.syncEnabled || !editor || !editor.isDirty() || this.getReadOnly()) { return done(); }
			var failedSaving = this._errorSaving;
			var input = this.getInput();
			this.reportStatus(messages['Saving...']);

			this.dispatchEvent({ type: "Saving", inputManager: this}); //$NON-NLS-0$

			function _save(that) {
				var previousUndoState = editor.markClean();
				var contents = editor.getText();
				var data = contents;
				if (that._getSaveDiffsEnabled() && !that._errorSaving) {
					var changes = that._getUnsavedChanges();
					if (changes) {
						var len = 0;
						for (var i = 0; i < changes.length; i++) {
							len += changes[i].text.length;
						}
						if (contents.length > len) {
							data = {
								diff: changes
							};
						}
					}
				}
				that._clearUnsavedChanges();
				that._errorSaving = false;

				var etag = metadata.ETag;
				var args = { "ETag" : etag }; //$NON-NLS-0$
				var resource = that._parsedLocation.resource;
				var def = that.fileClient.write(resource, data, args);
				var progress = that.progressService;
				var statusService = null;
				if (that.serviceRegistry) {
					statusService = that.serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				}
				if (progress) {
					def = progress.progress(def, i18nUtil.formatMessage(messages.savingFile, input));
				}
				function successHandler(result) {
					if (input === that.getInput()) {
						metadata.ETag = result.ETag;
						editor.setInput(input, null, contents, true);
					}
					that.reportStatus("");
					if (failedSaving && statusService) {
						statusService.setProgressResult({Message:messages.Saved, Severity:"Normal"}); //$NON-NLS-0$
					}
					if (that.postSave) {
						that.postSave(closing);
					}
					// get the lsp service matching the current content type
					var lspLanguageServer = that.languageServerRegistry.getServerByContentType(that.getContentType());
					if (lspLanguageServer) {
						var text = lspLanguageServer.includeTextOnSave() ? that.getEditor().getText() : undefined;
						lspLanguageServer.didSave(that.getFileMetadata().Location, text);
					}

					if (!that._saveEventLogged) {
						that._logMetrics("save"); //$NON-NLS-0$
						mMetrics.logAudit("edit", "orion-file", {id: util.computeAuditId(that.fileClient, resource), isData: true});
						that._saveEventLogged = true;
					}

					return done(result);
				}
				function errorHandler(error) {
					that.reportStatus("");
					var errorMsg = handleError(statusService, error);
					mMetrics.logEvent("status", "exception", (that._autoSaveActive ? "Auto-save: " : "Save: ") + errorMsg.Message); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					mMetrics.logAudit("edit", "orion-file", {id: util.computeAuditId(that.fileClient, resource), isData: true}, error);
					editor.markUnclean(previousUndoState);
					that._errorSaving = true;
					return done();
				}
				def.then(successHandler, function(error) {
					// expected error - HTTP 412 Precondition Failed
					// occurs when file is out of sync with the server
					if (error.status === 412) {
						var dialog = that.serviceRegistry.getService("orion.page.dialog");	
						dialog.confirm(messages.saveOutOfSync,function(result){
							if(result){
								var redef = that.fileClient.write(resource, contents);
								if (progress) {
									redef = progress.progress(redef, i18nUtil.formatMessage(messages.savingFile, input));
								}
								redef.then(successHandler, errorHandler);
							}else{
								return done();
							}
						});
					} else {
						// unknown error
						errorHandler(error);
					}
				});
				return metadata._savingDeferred;
			}

			if (this.getFormatOnSaveEnabled()) {
				return this._formatter.doFormat().then(function() {
					return _save(this);
				}.bind(this));
			}
			return _save(this);
		},
		setAutoLoadEnabled: function(enabled) {
			this._autoLoadEnabled = enabled;
		},
		/**
		 * Set the autosave timeout. If the timeout is <code>-1</code>, autosave is
		 * disabled.
		 * @param {Number} timeout - the autosave timeout in milliseconds
		 */
		setAutoSaveTimeout: function(timeout) {
			this._autoSaveEnabled = timeout !== -1;
			this._autoSaveActive = false;
			if (!this._idle) {
				var options = {
					document: document,
					timeout: timeout
				};
				this._idle = new Idle(options);
				this._idle.addEventListener("Idle", function () { //$NON-NLS-0$
					if (!this._errorSaving && this.syncEnabled) {
						this._autoSaveActive = true;
						this.save().then(function() {
							this._autoSaveActive = false;
						});
					}
				}.bind(this));
			} else {
				this._idle.setTimeout(timeout);
			}
		},
		/**
		 * Set the auto syntax check timeout. Recommended this is only set when autosave is turned off
		 * because save operations will already run the syntax checker.
		 * 
		 * @param syntaxChecker {Function} Function that will execute the syntax check
		 * @param timeout {Number} How long to idle before syntax checking in milliseconds, -1 to disable
		 */
		setAutoSyntaxCheck: function(syntaxChecker, timeout) {
			var time = timeout;
			if (!syntaxChecker){
				time = -1;
			}
			this._autoSyntaxEnabled = time !== -1;
			this._autoSyntaxActive = false;
			if (!this._idle2) {
				var options = {
					document: document,
					timeout: time
				};
				this._idle2 = new Idle(options);
				this._idle2.addEventListener("Idle", function () { //$NON-NLS-0$
					if (this.editor){
						this._autoSyntaxActive = true;
						if (this.editor._isSyntaxCheckRequired()){
							syntaxChecker();
							this.editor._setSyntaxCheckRequired(false);
							this._autoSyntaxActive = false;
						}
					}
				}.bind(this));
			} else {
				this._idle2.setTimeout(time);
			}
		},
		setFormatOnSave: function(enabled) {
			this._formatOnSaveEnabled = enabled;
		},
		setContentType: function(contentType) {
			this._contentType = contentType;
		},
		setEncodingCharset: function(charset) {
			this._charset = charset;
		},
		setInput: function(loc, noFocus) {
			if (this._ignoreInput) { return; }
			if (!loc) {
				loc = PageUtil.hash();
			}
			if (typeof loc !== "string") { //$NON-NLS-0$
				return;
			}
			var editor = this.getEditor();
			if(editor && editor.setNoFocus) {
				editor.setNoFocus(noFocus);
			}
			if (loc && loc[0] !== "#") { //$NON-NLS-0$
				loc = "#" + loc; //$NON-NLS-0$
			}
			var input = PageUtil.matchResourceParameters(loc), oldInput = this._parsedLocation || {};
			var encodingChanged = oldInput.encoding !== input.encoding;
			var afterConfirm = function(){
				var editorChanged = editor && oldInput.editor !== input.editor;
				this._location = loc;
				this._parsedLocation = input;
				this._ignoreInput = true;
				if(this.selection) {
					this.selection.setSelections(loc);
				}
				this._ignoreInput = false;
				var evt = {
					type: "InputChanging", //$NON-NLS-0$
					input: input
				};
				this.dispatchEvent(evt);
				function saveSession() {
					if (evt.session) {
						evt.session.save();
					}
				}
				var fileURI = input.resource;
				if (evt.metadata) {
					saveSession();
					this.reportStatus("");
					this._input = fileURI;
					var metadata = evt.metadata;
					this._setInputContents(input, fileURI, null, metadata, false, true);
					return;
				}
				if (fileURI) {
					if (fileURI === this._input && !encodingChanged) {
						if (editorChanged) {
							this.reportStatus("");
							this._setInputContents(input, fileURI, null, this._fileMetadata, this._isText(this._fileMetadata));
						} else {
							if (!this.processParameters(input)) {
								if (evt.session) {
									evt.session.apply(true);
								}
							}
						}
					} else {
						saveSession();
						this._input = fileURI;
						this._readonly = false;
						this._lastMetadata = this._fileMetadata;
						this._fileMetadata = null;
						this.load(input.encoding);
					}
				} else {
					saveSession();
					this._setNoInput("");
				}
			}.bind(this);
			if (editor && editor.isDirty()) {
				var oldLocation = this._location;
				var oldResource = oldInput.resource;
				var newResource = input.resource;
				if (this._errorSaving && (oldResource !== newResource || encodingChanged)) {
					window.location.hash = oldLocation;
					this.reveal(this.getFileMetadata());
					return;
				}
				if (!this.isEditorTabsEnabled) {
					if (oldResource !== newResource || encodingChanged) {
						if (this._autoSaveEnabled) {
							this.save();
							afterConfirm();
						} else if(this.syncEnabled && this.isUnsavedWarningNeeed()) {
							var cancelCallback = function() {
								window.location.hash = oldLocation;
								this.reveal(this.getFileMetadata());
								return;
							}.bind(this);
							this.confirmUnsavedChanges(afterConfirm, cancelCallback);
						}else{
							afterConfirm();
						}
					}
				}
			}else{
				afterConfirm();
			}
		},
		confirmUnsavedChanges: function(afterConfirm, cancelCallback, targetNode) {
			this.confirm(messages.confirmUnsavedChanges,
				[{
					label:messages["Yes"],
					callback:function(){
						this.save();
						afterConfirm();
					}.bind(this),
					type:"ok"
				},{
					label:messages["No"],
					callback:function(){
						afterConfirm();
					},
					type:"ok"
				},{
					label:messages["Cancel"],
					callback: cancelCallback,
					type:"cancel"
				}],
				targetNode);
		},
		setTitle: function(title) {
			var indexOfSlash = title.lastIndexOf("/"); //$NON-NLS-0$
			var shortTitle = title;
			if (indexOfSlash !== -1) {
				shortTitle = shortTitle.substring(indexOfSlash + 1);
			}
			this._title = shortTitle;
		},
		setSaveDiffsEnabled: function(enabled) {
			this._saveDiffsEnabled = enabled;
			var editor = this.editor;
			if (editor && !editor.isDirty()) {
				this._clearUnsavedChanges();
			}
		},
		_getSaveDiffsEnabled: function() {
			return this._saveDiffsEnabled && this._acceptPatch && this._acceptPatch.indexOf("application/json-patch") !== -1; //$NON-NLS-0$
		},
		_logMetrics: function(type) {
			var label = "(none)"; //$NON-NLS-0$
			var contentType = this.getContentType();
			var metadata = this.getFileMetadata();
			if (contentType) {
				label = contentType.id;
			} else if (metadata) {
				var _name = metadata.Name;
				var index = _name.lastIndexOf("."); //$NON-NLS-0$
				if (index >= 0) {
					label = "unregistered: " + _name.substring(index); //$NON-NLS-0$
				} else {
					switch (_name) {
						case "AUTHORS": //$NON-NLS-0$
						case "config": //$NON-NLS-0$
						case "LICENSE": //$NON-NLS-0$
						case "make": //$NON-NLS-0$
						case "Makefile": { //$NON-NLS-0$ 
							label = "unregistered: " + _name; //$NON-NLS-0$
							break;
						}
					}
				}
			}
			mMetrics.logEvent("editor", type, label, null, {path: metadata.Location}); //$NON-NLS-0$
		},
		_unknownContentTypeAsText: function() {// Return true if we think unknown content type is text type
			return true;
		},
		_isText: function(metadata) {
			var contentType = this.contentTypeRegistry.getFileContentType(metadata);
			// Allow unkownn content types to be loaded as text files
			if (!contentType) { return this._unknownContentTypeAsText(); }
			var textPlain = this.contentTypeRegistry.getContentType("text/plain"); //$NON-NLS-0$
			return this.contentTypeRegistry.isExtensionOf(contentType, textPlain);
		},
		_setNoInput: function(resource) {
			this.fileClient.getWorkspace(resource).then(function(workspace) {
				this._input = workspace.ChildrenLocation;
				this._setInputContents(workspace.ChildrenLocation, null, workspace, workspace);
			}.bind(this));
		},
		_setInputContents: function(input, title, contents, metadata, noSetInput, isCachedContent) {
			var _name, isDir = false;
			if (metadata) {
				this._fileMetadata = metadata;
				this.setTitle(metadata.Location || String(metadata));
				this.setContentType(this.contentTypeRegistry.getFileContentType(metadata));
				_name = metadata.Name;
				isDir = metadata.Directory;
			} else {
				// No metadata
				this._fileMetadata = null;
				this.setTitle(title);
				this.setContentType(this.contentTypeRegistry.getFilenameContentType(this.getTitle()));
				_name = this.getTitle();
			}
			var editor = this.getEditor();
			if (this._focusListener) {
				if (editor && editor.getTextView && editor.getTextView()) {
					editor.getTextView().removeEventListener("Focus", this._focusListener); //$NON-NLS-0$
				}
				this._focusListener = null;
			}
			var evt = {
				type: "InputChanged", //$NON-NLS-0$
				input: input,
				name: _name,
				title: title,
				contentType: this.getContentType(),
				metadata: metadata,
				location: this._location,
				contents: contents
			};
			this._logMetrics("open"); //$NON-NLS-0$
			this.dispatchEvent(evt);
			this.editor = editor = evt.editor;
			this._formatter = new mFormatter.Formatter(this.serviceRegistry, this, editor, this.languageServerRegistry);
			if (!isDir) {
				if (!noSetInput) {
					editor.setInput(title, null, contents);
					if (isCachedContent) {
						// Check server for updated content.
						this.load();
					}

				}
				if (editor && editor.getTextView && editor.getTextView()) {
					var textView = editor.getTextView();
					textView.addEventListener("Focus", this._focusListener = this.onFocus.bind(this)); //$NON-NLS-0$
					if(editor.getModel() && typeof  editor.getModel().setModelData === "function") {
						editor.getModel().setModelData({	 metadata: metadata});
					}
				}
				if (!this.isEditorTabsEnabled) {
					this._clearUnsavedChanges();
				}
				if (!this.processParameters(input)) {
					if (evt.session) {
						evt.session.apply();
					}
				}
				evt = {};
				evt.type = 'InputContentsSet';
				this.editor.dispatchEvent(evt);
			}

			this._saveEventLogged = false;
			mMetrics.logPageLoadTiming("interactive", window.location.pathname); //$NON-NLS-0$
		},
		_getUnsavedChanges: function() {
			var editor = this.editor;
			if (editor && editor.getUndoStack && editor.getUndoStack()) {
				return editor.getUndoStack()._unsavedChanges;
			}
			return null;
		},
		_clearUnsavedChanges: function() {
			var editor = this.editor;
			if (editor && editor.getUndoStack && editor.getUndoStack()) {
				editor.getUndoStack()._unsavedChanges = this._getSaveDiffsEnabled() ? [] : null;
			}
		}
	});
	return {
		handleError: handleError,
		InputManager: InputManager
	};
});
