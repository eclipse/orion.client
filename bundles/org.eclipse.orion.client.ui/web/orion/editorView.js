/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2018 IBM Corporation and others.
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
	'orion/i18nUtil',
	'orion/editor/editor',
	'orion/editor/annotations',
	'orion/editor/eventTarget',
	'orion/editor/textView',
	'orion/editor/textModelFactory',
	'orion/editor/editorFeatures',
	'orion/hover',
	'orion/editor/contentAssist',
	'orion/editor/emacs',
	'orion/editor/vi',
	'orion/editorPreferences',
	'orion/widgets/themes/ThemePreferences',
	'orion/widgets/themes/editor/ThemeData',
	'orion/widgets/settings/EditorSettings',
	'orion/searchAndReplace/textSearcher',
	'orion/editorCommands',
	'orion/globalCommands',
	'orion/edit/dispatcher',
	'orion/edit/editorContext',
	'orion/highlight',
	'orion/markOccurrences',
	'orion/syntaxchecker',
	'orion/liveEditSession',
	'orion/problems',
	'orion/blamer',
	'orion/differ',
	'orion/keyBinding',
	'orion/util',
	'orion/Deferred',
	'orion/webui/contextmenu',
	'orion/metrics',
	'orion/commonPreferences',
	'embeddedEditor/helper/memoryFileSysConst',
	'orion/objects',
	'orion/formatter',
	'orion/references',
	'orion/openDeclaration',
	'orion/webui/littlelib',
	'lsp/languageServerRegistry',
	'lsp/utils'
], function(
	messages, i18nUtil,
	mEditor, mAnnotations, mEventTarget, mTextView, mTextModelFactory, mEditorFeatures, mHoverFactory, mContentAssist,
	mEmacs, mVI, mEditorPreferences, mThemePreferences, mThemeData, EditorSettings,
	mSearcher, mEditorCommands, mGlobalCommands,
	mDispatcher, EditorContext, Highlight,
	mMarkOccurrences, mSyntaxchecker, LiveEditSession,
	mProblems, mBlamer, mDiffer,
	mKeyBinding, util, Deferred, mContextMenu, mMetrics, mCommonPreferences, memoryFileSysConst, objects, mFormatter, mReferences,
	mOpenDecl, lib, mLanguageServerRegistry, lspUtils
) {
	var inMemoryFilePattern = memoryFileSysConst.MEMORY_FILE_PATTERN;
	var Dispatcher = mDispatcher.Dispatcher;
	var AT = mAnnotations.AnnotationType;

	function parseNumericParams(input, params) {
		for (var i = 0; i < params.length; i++) {
			var param = params[i];
			if (input[param]) {
				input[param] = parseInt(input[param], 10);
			}
		}
	}

	/**
	 * Constructs a new EditorView object.
	 *
	 * @class
	 * @name orion.EditorView
	 * @borrows orion.editor.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.editor.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.editor.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function EditorView(options) {
		this._parent = options.parent;
		if(typeof this._parent === "string") {
			this._parent = document.getElementById(options.parent);
		}
		this.id = options.id || "";
		this.viewerID = options.viewerID;
		this.activateContext = options.activateContext;
		this.renderToolbars = options.renderToolbars;
		this.serviceRegistry = options.serviceRegistry;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.commandRegistry = options.commandRegistry;
		this.progress = options.progress;
		this.statusService = options.statusService;
		this.editorCommands = options.editorCommands;
		this.fileClient = options.fileService;
		this.inputManager = options.inputManager;
		this.preferences = options.preferences;
		this.readonly = options.readonly;
		this.singleMode = options.singleMode;
		this.searcher = options.searcher;
		this.statusReporter = options.statusReporter;
		this.model = options.model;
		this.undoStack = options.undoStack;
		this.problemsServiceID = options.problemsServiceID || "orion.core.marker"; //$NON-NLS-0$
		this.editContextServiceID = options.editContextServiceID || "orion.edit.context"; //$NON-NLS-0$
		this.syntaxHighlighter = new Highlight.SyntaxHighlighter(this.serviceRegistry);
		var keyAssist = mGlobalCommands.getKeyAssist ? mGlobalCommands.getKeyAssist() : null;
		if(keyAssist) {
			keyAssist.addProvider(this.editorCommands);
		}
		var mainSplitter = mGlobalCommands.getMainSplitter ? mGlobalCommands.getMainSplitter() : null;
		if(mainSplitter) {
			mainSplitter.splitter.addEventListener("resize", function (evt) {
				if (this.editor && evt.node === mainSplitter.main) {
					this.editor.resize();
				}
			}.bind(this));
		}
		if(mGlobalCommands.getGlobalEventTarget) {
			mGlobalCommands.getGlobalEventTarget().addEventListener("toggleTrim", function() {
				if (this.editor) {
					this.editor.resize();
				}
			}.bind(this));
		}
		this.settings = {};
		this._editorConfig = options.editorConfig;
		this._init();
	}
	EditorView.prototype = /** @lends orion.EditorView.prototype */ {
		updateKeyMode: function(prefs, textView) {
			if (this.emacs) {
				textView.removeKeyMode(this.emacs);
			}
			if (this.vi) {
				textView.removeKeyMode(this.vi);
			}
			if (prefs.keyBindings === "Emacs") {
				if (!this.emacs) {
					this.emacs = new mEmacs.EmacsMode(textView);
				}
				textView.addKeyMode(this.emacs);
			} else if (prefs.keyBindings === "vi") {
				if (!this.vi) {
					this.vi = new mVI.VIMode(textView, this.statusReporter);
				}
				textView.addKeyMode(this.vi);
			}
		},
		setContents: function(contents, contentType, options) {
			var cType = this.contentTypeRegistry.getContentType(contentType);
			var fileExt = "txt"; //$NON-NLS-1$
			if(cType && cType.extension && cType.extension.length > 0) {
				fileExt = cType.extension[0];
			}
			var fileName = options && options.fileName || "foo";
			var currentLocation = inMemoryFilePattern + this.id + "/" + fileName + "." + fileExt; //$NON-NLS-1$
			var def;
			var sameFile = currentLocation === this.lastFileLocation;
			if(sameFile || !this.lastFileLocation) {
				def = new Deferred().resolve();
			} else {
				def = this.fileClient.deleteFile(this.lastFileLocation);
			}
			return def.then(function() {
				return this.fileClient.write(currentLocation, contents).then(function(){
					this.lastFileLocation = currentLocation;
					var noFocus = options && options.noFocus ? true: undefined;
					if (sameFile) {
						this.inputManager.load(undefined, noFocus);
					} else {
						this.inputManager.setInput(currentLocation, noFocus);
					}
				}.bind(this));
			}.bind(this));
		},
		getParent: function() {
			return this._parent;
		},
		getSettings: function() {
			return this.settings;
		},
		setParent: function(p) {
			this._parent = p;
		},
		updateSourceCodeActions: function(prefs, sourceCodeActions) {
			if (sourceCodeActions) {
				sourceCodeActions.setAutoPairParentheses(prefs.autoPairParentheses);
				sourceCodeActions.setAutoPairBraces(prefs.autoPairBraces);
				sourceCodeActions.setAutoPairSquareBrackets(prefs.autoPairSquareBrackets);
				sourceCodeActions.setAutoPairAngleBrackets(prefs.autoPairAngleBrackets);
				sourceCodeActions.setAutoPairQuotations(prefs.autoPairQuotations);
				sourceCodeActions.setAutoCompleteComments(prefs.autoCompleteComments);
				sourceCodeActions.setSmartIndentation(prefs.smartIndentation);
			}
		},
		updateViewOptions: function(prefs) {
			var marginOffset = 0;
			if (prefs.showMargin) {
				marginOffset = prefs.marginOffset;
				if (typeof marginOffset !== "number") {
					marginOffset = prefs.marginOffset = parseInt(marginOffset, 10);
				}
			}
			var wrapOffset = 0;
			if (prefs.wordWrap) {
				wrapOffset = marginOffset;
			}
			var labelMessage = messages.fileContents;
			if (this.viewerID && this.viewerID === "1") {
				labelMessage = messages.fileContentsSplit;
			}
			var metaData = this.inputManager.getFileMetadata();
			return {
				label: i18nUtil.formatMessage(labelMessage, metaData ? metaData.Name : ""),
				readonly: this.readonly || this.inputManager.getReadOnly(),
				singleMode: this.singleMode,
				tabSize: prefs.tabSize || 4,
				expandTab: prefs.expandTab,
				wrapMode: prefs.wordWrap,
				wrapOffset: wrapOffset,
				marginOffset: marginOffset,
				scrollAnimation: prefs.scrollAnimation ? prefs.scrollAnimationTimeout : 0
			};
		},
		updateSettings: function(prefs) {
			this.settings = prefs;
			var editor = this.editor;
			var inputManager = this.inputManager;
			inputManager.setAutoLoadEnabled(prefs.autoLoad);
			inputManager.setAutoSaveTimeout(prefs.autoSave ? prefs.autoSaveTimeout : -1);
			inputManager.setAutoSyntaxCheck(this.refreshSyntaxCheck, prefs.autoSave ? -1 : 250); // Only auto check syntax when autosave is off
			inputManager.setFormatOnSave(prefs.formatOnSave ? prefs.formatOnSave : false);
			if(this.differ) {
				inputManager.setSaveDiffsEnabled(prefs.saveDiffs);
				this.differ.setEnabled(this.settings.diffService);
			}
			this.updateStyler(prefs);
			var textView = editor.getTextView();
			if (textView) {
				this.updateKeyMode(prefs, textView);
				textView.setOptions(this.updateViewOptions(prefs));
			}
			this.updateSourceCodeActions(prefs, editor.getSourceCodeActions());
			editor.setAnnotationRulerVisible(prefs.annotationRuler);
			editor.setLineNumberRulerVisible(prefs.lineNumberRuler);
			editor.setFoldingRulerVisible(prefs.foldingRuler);
			editor.setOverviewRulerVisible(prefs.overviewRuler);
			editor.setZoomRulerVisible(prefs.zoomRuler);
			function getTypesVisible(str) {
				var typesVisible = {};
				typesVisible[AT.ANNOTATION_CURRENT_SEARCH] = prefs["show" + str + "CurrentSearchAnnotation"];
				typesVisible[AT.ANNOTATION_MATCHING_SEARCH] = prefs["show" + str + "MatchingSearchAnnotation"];
				typesVisible[AT.ANNOTATION_READ_OCCURRENCE] = prefs["show" + str + "ReadOccurrenceAnnotation"];
				typesVisible[AT.ANNOTATION_WRITE_OCCURRENCE] = prefs["show" + str + "WriteOcurrenceAnnotation"];
				typesVisible[AT.ANNOTATION_ERROR] = prefs["show" + str + "ErrorAnnotation"];
				typesVisible[AT.ANNOTATION_WARNING] = prefs["show" + str + "WarningAnnotation"];
				typesVisible[AT.ANNOTATION_INFO] = prefs["show" + str + "InfoAnnotation"];
				typesVisible[AT.ANNOTATION_TASK] = prefs["show" + str + "TaskAnnotation"];
				typesVisible[AT.ANNOTATION_BOOKMARK] = prefs["show" + str + "BookmarkAnnotation"];
				typesVisible[AT.ANNOTATION_MATCHING_BRACKET] = prefs["show" + str + "MatchingBracketAnnotation"];
				typesVisible[AT.ANNOTATION_CURRENT_BRACKET] = prefs["show" + str + "CurrentBracketAnnotation"];
				typesVisible[AT.ANNOTATION_CURRENT_LINE] = prefs["show" + str + "CurrentLineAnnotation"];
				return typesVisible;
			}
			editor.setAnnotationTypesVisible(getTypesVisible(""));
			editor.setOverviewAnnotationTypesVisible(getTypesVisible("Overview"));
			editor.setTextAnnotationTypesVisible(getTypesVisible("Text"));
			if (this.renderToolbars) {
				this.renderToolbars(inputManager.getFileMetadata());
			}
			this.markOccurrences.setOccurrencesVisible(prefs.showOccurrences);
			if (editor.getContentAssist()) {
				editor.getContentAssist().setAutoTriggerEnabled(prefs.contentAssistAutoTrigger);
			}

			this.dispatchEvent({
				type: "Settings", //$NON-NLS-0$
				newSettings: this.settings
			});
		},
		updateStyler: function(prefs) {
			var styler = this.syntaxHighlighter.getStyler();
			if (styler) {
				if (styler.setWhitespacesVisible) {
					styler.setWhitespacesVisible(prefs.showWhitespaces, true);
				}
			}
		},
		createSession: function(evt) {
			var editor = this.editor;
			var textView = editor.getTextView();
			var inputManager = this.inputManager;
			if (textView && inputManager) {
				var metadata = inputManager.getFileMetadata();
				var storage = util.isElectron ? localStorage : sessionStorage;
				if (metadata) {
					evt.session = {
						get: function() {
							return storage.editorViewSection ? JSON.parse(storage.editorViewSection) : {}; 
						},
						apply: function(animate) {
							if (!metadata.Location) return;
							var session = this.get();
							var locationSession = session[metadata.Location];
							if (locationSession && locationSession.ETag === metadata.ETag) {
								editor.setSelections(locationSession.selections);
								textView.setTopIndex(locationSession.topIndex, animate ? function() {} : undefined);
							}else if(util.isElectron){
								delete session[metadata.Location];
								storage.editorViewSection = JSON.stringify(session);
							}
						},
						save: function() {
							if (!metadata.Location) return;
							var session = this.get();
							session[metadata.Location] = {
								ETag: metadata.ETag,
								topIndex: textView.getTopIndex(),
								selections: editor.getSelections().map(function(s) { return s.getOrientedSelection(); })
							};
							storage.editorViewSection = JSON.stringify(session);
						}
					};
				}
			}
		},
		_init: function() {
			if (this.preferences) {
				// There should be only one editor preferences
				this.editorCommands.editorPreferences = this.editorPreferences = this.editorCommands.editorPreferences || new mEditorPreferences.EditorPreferences(this.preferences);
				this.editorPreferences.addEventListener("Changed", function (evt) {
					var prefs = evt.preferences;
					if (!prefs) {
						this.editorPreferences.getPrefs(this.updateSettings.bind(this));
					} else {
						this.updateSettings(prefs);
					}
				}.bind(this));
				// There should be only one theme preferences
				this.editorCommands.themePreferences = this.themePreferences = this.editorCommands.themePreferences || new mThemePreferences.ThemePreferences(this.preferences, new mThemeData.ThemeData());
				this.themePreferences.apply();
			}

			var that = this;

			var readonly = this.readonly;
			var commandRegistry = this.commandRegistry;
			var serviceRegistry = this.serviceRegistry;
			var activateContext = this.activateContext;
			var inputManager = this.inputManager;
			var progress = this.progress;
			var contentTypeRegistry = this.contentTypeRegistry;
			var editorCommands = this.editorCommands;
			var languageServerRegistry = new mLanguageServerRegistry.LanguageServerRegistry(serviceRegistry, this.problemsServiceID);

			var openedDocument;
			function openDocument(evnt, languageServer) {
				if (openedDocument) {
					languageServer.didClose(openedDocument.location);
				}
				var metaData = inputManager.getFileMetadata();
				openedDocument = {
					location: metaData.Location,
					version:  1
				};
				languageServer.didOpen(metaData.Location, inputManager.getContentType().id, openedDocument.version, evnt.text);
			}
			
			var textViewFactory = function() {
				var options = that.updateViewOptions(that.settings);
				objects.mixin(options, {
					parent: that._parent,
					model: new mTextModelFactory.TextModelFactory().createProjectionTextModel(that.model, {serviceRegistry: that.serviceRegistry}),
					wrappable: true
				});
				var textView = new mTextView.TextView(options);
				textView.addEventListener("ModelChanging", function(evnt) {
					var languageServer = languageServerRegistry.getServerByContentType(inputManager.getContentType());
					if (!languageServer) {
						return;
					}
					if (that.inputChanged) {
						delete that.inputChanged;
						openDocument(evnt, languageServer);
						return;
					}

					var textDocumentSync = languageServer.getTextDocumentSync();
					if (textDocumentSync) {
						if (textDocumentSync === languageServer.ipc.TEXT_DOCUMENT_SYNC_KIND.Full) {
							// TextDocumentSyncKind.Full, send the entire document
							// get the text before it was modified
							var text = textView.getText();
							// get the substrings then insert the text in between
							text = text.substring(0, evnt.start) + evnt.text + text.substring(evnt.start + evnt.removedCharCount);
							languageServer.didChange(inputManager.getFileMetadata().Location, 
									openedDocument.version++, 
									[{
										text: text
									}]);
						} else if (textDocumentSync === languageServer.ipc.TEXT_DOCUMENT_SYNC_KIND.Incremental) {
							// TextDocumentSyncKind.Incremental, only send what changed
							languageServer.didChange(inputManager.getFileMetadata().Location, 
									openedDocument.version++, 
									[{
										range: lspUtils.getRange(editor, evnt.start, evnt.start + evnt.removedCharCount),
										rangeLength: evnt.removedCharCount,
										text: evnt.text
									}]);
						}
					}
				});
				return textView;
			};

			/**
			 * @callback
			 */
			var keyBindingFactory = function(editor, keyModeStack, undoStack, contentAssist) {

				//Allow extended TextModelFactory to pass default find options
				var defaultFindOptions, factory = new mTextModelFactory.TextModelFactory();
				if(typeof factory.getDefaultFindOptions === "function") {
					defaultFindOptions = factory.getDefaultFindOptions();
				}
				var localSearcher = that.textSearcher = mSearcher.TextSearcher ? new mSearcher.TextSearcher(editor, serviceRegistry, commandRegistry, undoStack, defaultFindOptions) : null;

				var keyBindings = new mEditorFeatures.KeyBindingsFactory().createKeyBindings(editor, undoStack, contentAssist, localSearcher);
				that.updateSourceCodeActions(that.settings, keyBindings.sourceCodeActions);

				var textView = editor.getTextView();
				textView.setAction("toggleWrapMode", function() { //$NON-NLS-0$
					textView.invokeAction("toggleWrapMode", true); //$NON-NLS-0$
					var wordWrap = textView.getOptions("wrapMode"); //$NON-NLS-0$
					that.settings.wordWrap = wordWrap;
					if (that.editorPreferences) {
						that.editorPreferences.setPrefs(that.settings);
					}
					return true;
				});

				textView.setKeyBinding(new mKeyBinding.KeyStroke('z', true, false, true), "toggleZoomRuler"); //$NON-NLS-1$ //$NON-NLS-2$
				textView.setAction("toggleZoomRuler", function() { //$NON-NLS-0$
					if (!that.settings.zoomRulerVisible) return false;
					that.settings.zoomRuler = !that.settings.zoomRuler;
					if (that.editorPreferences) {
						that.editorPreferences.setPrefs(that.settings);
					}
					return true;
				}, {name: messages.toggleZoomRuler});

				that.vi = that.emacs = null;
				that.updateKeyMode(that.settings, textView);

				editorCommands.overwriteKeyBindings(editor);

				return keyBindings;
			};

			// Content Assist
			var setContentAssistProviders = function(editor, contentAssist, evnt) {
				// Content assist is about to be activated; set its providers.
				var fileContentType = inputManager.getContentType();
				var fileName = editor.getTitle();
				var serviceRefs = serviceRegistry.getServiceReferences("orion.edit.contentAssist").concat(serviceRegistry.getServiceReferences("orion.edit.contentassist")); //$NON-NLS-1$ //$NON-NLS-2$
				var providerInfoArray = evnt && evnt.providers;
				if (!providerInfoArray) {
					providerInfoArray = serviceRefs.map(function(serviceRef) {
						var contentTypeIds = serviceRef.getProperty("contentType"), //$NON-NLS-0$
						    pattern = serviceRef.getProperty("pattern"); // backwards compatibility //$NON-NLS-0$
						if ((contentTypeIds && contentTypeRegistry.isSomeExtensionOf(fileContentType, contentTypeIds)) ||
								(pattern && new RegExp(pattern).test(fileName))) {
							var service = serviceRegistry.getService(serviceRef);
							var id = serviceRef.getProperty("service.id").toString();  //$NON-NLS-0$
							var charTriggers = serviceRef.getProperty("charTriggers"); //$NON-NLS-0$
							var excludedStyles = serviceRef.getProperty("excludedStyles");  //$NON-NLS-0$
							var autoApply = serviceRef.getProperty("autoApply");
							if (charTriggers) {
								charTriggers = new RegExp(charTriggers);
							}

							if (excludedStyles) {
								excludedStyles = new RegExp(excludedStyles);
							}

							return {provider: service, id: id, charTriggers: charTriggers, excludedStyles: excludedStyles, autoApply: autoApply};
						}
						return null;
					}).filter(function(providerInfo) {
						return !!providerInfo;
					});
				}
				// check lsp implementation for the current content type
					var lspServer = languageServerRegistry.getServerByContentType(fileContentType);
				if (lspServer) {
					providerInfoArray.push({provider: lspServer, id: lspServer._id, lspServer: true, excludedStyles: new RegExp("(string.*)")});					
				}
				// Produce a bound EditorContext that contentAssist can invoke with no knowledge of ServiceRegistry.
				var boundEditorContext = {};
				Object.keys(EditorContext).forEach(function(key) {
					if (typeof EditorContext[key] === "function") {
						boundEditorContext[key] = EditorContext[key].bind(null, serviceRegistry, that.editContextServiceID);
					}
				});
				contentAssist.setEditorContextProvider(boundEditorContext);
				contentAssist.setProviders(providerInfoArray);
				contentAssist.setAutoTriggerEnabled(that.settings.contentAssistAutoTrigger);
				contentAssist.setProgress(progress);
				contentAssist.setStyleAccessor(that.getStyleAccessor());
			};

			var contentAssistFactory = readonly ? null : {
				createContentAssistMode: function(editor) {
					var contentAssist = new mContentAssist.ContentAssist(editor.getTextView(), serviceRegistry);

					contentAssist.addEventListener("Activating", setContentAssistProviders.bind(null, editor, contentAssist));
					var widget = new mContentAssist.ContentAssistWidget(contentAssist, "contentassist"); //$NON-NLS-0$
					var result = new mContentAssist.ContentAssistMode(contentAssist, widget);
					contentAssist.setMode(result);

					// preload content assist plugins to reduce the delay
					// that happens when a user first triggers content assist
					setContentAssistProviders(editor, contentAssist);
					contentAssist.initialize();
					return result;
				}
			};

			var editor = this.editor = new mEditor.Editor({
				textViewFactory: textViewFactory,
				undoStackFactory: that.undoStack ? {createUndoStack: function(editor) {
					that.undoStack.setView(editor.getTextView());
					return that.undoStack;
				}}: new mEditorFeatures.UndoFactory(),
				textDNDFactory: new mEditorFeatures.TextDNDFactory(),
				annotationFactory: new mEditorFeatures.AnnotationFactory(),
				foldingRulerFactory: new mEditorFeatures.FoldingRulerFactory(),
				zoomRulerFactory: new mEditorFeatures.ZoomRulerFactory(),
				lineNumberRulerFactory: new mEditorFeatures.LineNumberRulerFactory(),
				hoverFactory: new mHoverFactory.HoverFactory(serviceRegistry, inputManager, commandRegistry, languageServerRegistry),
				contentAssistFactory: contentAssistFactory,
				keyBindingFactory: keyBindingFactory,
				statusReporter: this.statusReporter,
				domNode: this._parent,
				syntaxHighlighter: this.syntaxHighlighter
			});
			if(this.preferences) {
				this.preferences.get("/plugins").then(function(plugins) {
					if (plugins["collab/plugins/collabPlugin.html"]) {
						require(['orion/collab/collabClient'], function(mCollabClient){
							mCollabClient.init(function() {
								var collab = new mCollabClient.CollabClient(editor, that.inputManager, that.fileClient, that.serviceRegistry, that.commandRegistry, that.preferences);
							})
						});
					}
				});
			}
			editor.id = "orion.editor"; //$NON-NLS-0$
			editor.processParameters = function(params) {
				parseNumericParams(params, ["start", "end", "line", "offset", "length"]); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-5$
				return this.showSelection(params.start, params.end, params.line, params.offset, params.length);
			};
			editor.getEditorContext = function() {
				return EditorContext.getEditorContext(serviceRegistry, that.editContextServiceID);
			};

			this.dispatcher = new Dispatcher(this.serviceRegistry, this.contentTypeRegistry, editor, inputManager);
			if(this.themePreferences && this.editorPreferences){
				this.localSettings = EditorSettings ? new EditorSettings({local: true, editor: editor, themePreferences: this.themePreferences, preferences: this.editorPreferences}) : null;
			}
			var liveEditSession = new LiveEditSession(serviceRegistry, editor);
			inputManager.addEventListener("InputChanging", function(evt) {
				that.createSession(evt);
			});
			window.addEventListener("beforeunload", function(evt) {
				that.createSession(evt);
				if (evt.session) {
					evt.session.save();
				}
			});
			inputManager.addEventListener("InputChanged", function(evnt) {
				that.createSession(evnt);
				that.inputChanged = true;
				var textView = editor.getTextView();
				if (textView) {
					var contentType = inputManager.getContentType();
					var languageServer = languageServerRegistry.getServerByContentType(contentType);
					if (languageServer) {
						languageServer.start().then(function() {
							if (this.renderToolbars) {
								this.renderToolbars(inputManager.getFileMetadata());
							}
						}.bind(this));
					}
					liveEditSession.start(inputManager.getContentType(), evnt.title);
					textView.setOptions(this.updateViewOptions(this.settings));
					this.markOccurrences.setOccurrencesVisible(this.settings.showOccurrences);
					this.syntaxHighlighter.setup(evnt.contentType, editor.getTextView(), editor.getAnnotationModel(), evnt.title, true).then(function() {
						this.updateStyler(this.settings);
						if (editor.getContentAssist()) {
							// the file changed, we need to figure out the correct auto triggers to use
							setContentAssistProviders(editor, editor.getContentAssist());
						}
					}.bind(this));
					if(textView.onInputChanged) {
						textView.onInputChanged({type:evnt.type});
					}
				} else {
					liveEditSession.start();
				}
			}.bind(this));
			inputManager.addEventListener("Saving", function(evnt) {
				if (that.settings.trimTrailingWhiteSpace) {
					editor.getTextView().invokeAction("trimTrailingWhitespaces"); //$NON-NLS-0$
				}
				var textView = editor.getTextView();
				if(textView && textView.onSaving) {
					textView.onSaving({type:evnt.type});
				}
			});

			this.blamer = new mBlamer.Blamer(serviceRegistry, inputManager, editor);
			this.differ = new mDiffer.Differ(serviceRegistry, inputManager, editor);
			this.formatter = new mFormatter.Formatter(serviceRegistry, inputManager, editor, languageServerRegistry);
			this.references = new mReferences.References(serviceRegistry, inputManager, editor);
			this.openDecl = new mOpenDecl.OpenDeclaration(serviceRegistry, inputManager, editor);
			
			this.problemService = new mProblems.ProblemService(serviceRegistry, this.problemsServiceID);
			var markerService = serviceRegistry.getService(this.problemsServiceID);
			if(markerService) {
				markerService.addEventListener("problemsChanged", function(evt) {
					if (evt.uri) {
						var metaData = inputManager.getFileMetadata();
						if (metaData && metaData.Location === evt.uri) {
							if (Array.isArray(evt.problems)) {
								editor.showProblems(evt.problems);
							}
						}
					} else if (Array.isArray(evt.problems)) {
						editor.showProblems(evt.problems);
					}
				});
			}

			var markOccurrences = this.markOccurrences = new mMarkOccurrences.MarkOccurrences(serviceRegistry, inputManager, editor, languageServerRegistry);
			markOccurrences.setOccurrencesVisible(this.settings.showOccurrences);
			markOccurrences.findOccurrences();
			
			var syntaxChecker = new mSyntaxchecker.SyntaxChecker(serviceRegistry, editor.getModel());

			function syntaxCheck(title, message, contents) {
				syntaxChecker.setTextModel(editor.getModel());
				var input = inputManager.getInput();
				syntaxChecker.checkSyntax(inputManager.getContentType(), title, message, contents, editor.getEditorContext()).then(function(problems) {
					if (input === inputManager.getInput() && problems) {
						serviceRegistry.getService(that.problemsServiceID)._setProblems(problems);
					}
				});
				if (inputManager.getReadOnly()) {
					editor.reportStatus(messages.readonly, "error"); //$NON-NLS-0$
				}
			}
			this.refreshSyntaxCheck = function() {
				syntaxCheck(inputManager.getInput());
			};
			editor.addEventListener("InputChanged", function(evt) {
				syntaxCheck(evt.title, evt.message, evt.contents);
			});
			var serviceListener = function(evnt) {
				var textView = editor.getTextView();
				if (textView) {
					var contentAssist = new mContentAssist.ContentAssist(textView, serviceRegistry);
					setContentAssistProviders(editor, contentAssist, evnt);
				}
			};
			serviceRegistry.addEventListener("registered", serviceListener);
			serviceRegistry.addEventListener("unregistering", serviceListener);
			var contextImpl = Object.create(null);
			[
				"getCaretOffset", "setCaretOffset", //$NON-NLS-1$ //$NON-NLS-2$
				"getSelection", "getSelectionText", "setSelection", //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
				"getSelections", "setSelections", //$NON-NLS-1$ //$NON-NLS-2$
				"getText", "setText", //$NON-NLS-1$ //$NON-NLS-2$
				"getLineAtOffset", //$NON-NLS-0$
				"getLineStart", //$NON-NLS-0$
				"isDirty", //$NON-NLS-0$.
				"markClean", //$NON-NLS-0$.
			].forEach(function(method) {
				contextImpl[method] = editor[method].bind(editor);
			});
			contextImpl.showMarkers = function(markers) {
				serviceRegistry.getService(that.problemsServiceID)._setProblems(markers);
			};
			contextImpl.enterLinkedMode = function(linkedModeModel) {
				editor.getLinkedMode().enterLinkedMode(linkedModeModel);
			};
			contextImpl.exitLinkedMode = function(escapePosition) {
				editor.getLinkedMode().exitLinkedMode(escapePosition);
			};
			contextImpl.syntaxCheck = function(title, message, contents) {
				syntaxCheck(title, message, contents);
			};
			/**
			 * @description Opens the given location
			 * @function
			 * @param {String} fileurl The URL to open
			 * @param {Object} options The map of options. 
			 * 
			 * Current set of understood options include:
			 *   start - (number) The start range to select when opening an editor
			 *   end - (number) The end range to select when opening an editor
			 *   newwindow - (boolean) If we should open the URL in a new tab
			 * 
			 * @since 9.0
			 */
			contextImpl.openEditor = function(fileurl, options) {
				return activateContext.openEditor(fileurl, options);
			};
			
			/**
			 * @since 7.0
			 */
			contextImpl.getFileMetadata = function() {
				return that.dispatcher.getServiceFileObject();
			};
			// Forward status from plugin to orion.page.message
			contextImpl.setStatus = mEditorCommands.handleStatusMessage.bind(null, serviceRegistry);
			serviceRegistry.registerService(this.editContextServiceID, contextImpl, null);
		},
		create: function() {
			this.editor.install();
			if(this.editorPreferences) {
				this.editorPreferences.getPrefs(this.updateSettings.bind(this));
			} else if(this._editorConfig) {
				var prefs = mCommonPreferences.mergeSettings(this._editorConfig, {});
				this.updateSettings(prefs);
			}
			
			// Create a context menu...
			this._createContextMenu();
		},
		destroy: function() {
			if(this.lastFileLocation) {
				this.fileClient.deleteFile(this.lastFileLocation);
			}
			this.editor.uninstall();
		},
		getStyleAccessor: function() {
			var styleAccessor = null;
			var styler = this.syntaxHighlighter.getStyler();
			if (styler && styler.getStyleAccessor) {
				styleAccessor = styler.getStyleAccessor();
			}
			return styleAccessor;
		},
		_createContextMenu: function() {			
			// Create the context menu element (TBD: re0use a single Node for all context Menus ??)
			this._editorContextMenuNode = document.createElement("ul"); //$NON-NLS-0$
			this._editorContextMenuNode.className = "dropdownMenu"; //$NON-NLS-0$
			lib.setSafeAttribute(this._editorContextMenuNode, "role", "menu");
			this._parent.parentNode.appendChild(this._editorContextMenuNode);
			
			// Hook the context menu to the textView's content node
			var tv = this.editor.getTextView();
			var contextMenu = new mContextMenu.ContextMenu({
				dropdown: this._editorContextMenuNode,
				triggerNode: tv._clientDiv
			});
						
			//function called when the context menu is triggered to set the nav selection properly
			var contextMenuTriggered = function(wrapper) {
				var re = wrapper.event;
				if (re.target) {
					this.commandRegistry.destroy(this._editorContextMenuNode); // remove previous content
					this.commandRegistry.renderCommands("editorContextMenuActions", this._editorContextMenuNode, null, this, "menu"); //$NON-NLS-1$ //$NON-NLS-2$
					mMetrics.logEvent("contextMenu", "opened", "editor"); //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
				}
			}.bind(this);
			contextMenu.addEventListener("triggered", contextMenuTriggered);
		}
	};
	mEventTarget.EventTarget.addMixin(EditorView.prototype);

	return {EditorView: EditorView};
});
