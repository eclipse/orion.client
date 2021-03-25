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
/*eslint-env amd, browser*/
define([], function() {

	/**
	 * The object of codes for the server to indicate how the host
	 * should synchronize document changes to the language server.
	 */
	IPC.prototype.TEXT_DOCUMENT_SYNC_KIND = Object.freeze({
		None: 0,
		Full: 1,
		Incremental: 2
	});

	/**
	 * The object of codes for a DocumentHighlight to indicate what
	 * what kind of highlighting it is.
	 */
	IPC.prototype.DOCUMENT_HIGHLIGHT_KIND = Object.freeze({
		None: 1,
		Read: 2,
		Write: 3
	});

	/**
	 * The object of error codes
	 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#response-message
	 */
	IPC.prototype.ERROR_CODES = Object.freeze({
		ParseError: -32700,
		InvalidRequest: -32600,
		MethodNotFound: -32601,
		InvalidParams: -32602,
		InternalError: -32603,
		ServerErrorStart: -32099,
		ServerErrorEnd: -32000,
		ServerNotInitialized: -32002,
		UnknownErrorCode: -32001
	});

	/**
	 * The map of error types
	 */
	IPC.prototype.ERROR_TYPES = Object.freeze({
		1: 'error',
		2: 'warn',
		3: 'info'
	});

	/**
	 * The collection of message types corresponding to the launguage server protocol
	 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md
	 */
	IPC.prototype.MESSAGE_TYPES = Object.freeze({
		/**
		 * @description The initialize request is sent as the first request from the client to the server.
		 * @kind request
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#initialize
		 */
		initialize: 'initialize',
		/**
		 * @description The initialized notification is sent from the client to the server after the client
		 * is fully initialized and is able to listen to arbritary requests and notifications sent from the server.
		 * @kind request
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#initialized
		 */
		initialized: 'initialized',
		/**
		 * @description The shutdown request is sent from the client to the server. 
		 * It asks the server to shut down, but to not exit (otherwise the response might not be delivered correctly to the client). 
		 * There is a separate exit notification that asks the server to exit.
		 * @kind request
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#shutdown
		 */
		shutdown: 'shutdown',
		/**
		 * @description The base protocol offers support for request cancellation.
		 * @kind request
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#cancelRequest
		 */
		cancelRequest: '$/cancelRequest',
		/**
		 * @kind notification
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#status-notification
		 */
		status: 'language/status',
		/**
		 * @kind notification
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#exit
		 */
		exit: 'exit',
		/**
		 * @kind notification
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#window_showMessage
		 */
		showMessage: 'window/showMessage',
		/**
		 * @description The show message request is sent from a server to a client to ask the client to display a particular message in the user interface. 
		 * In addition to the show message notification the request allows to pass actions and to wait for an answer from the client.
		 * @kind request
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#window_showMessageRequest
		 */
		showMessageRequest: 'window/showMessageRequest',
		/**
		 * @kind notification
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#window_logMessage
		 */
		logMessage: 'window/logMessage',
		/**
		 * @kind notification
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#telemetry_event
		 */
		telemetryEvent: 'telemetry/event',
		/**
		 * @description The client/registerCapability request is sent from the server to the client to register for a new capability on the client side.
		 * Not all clients need to support dynamic capability registration. A client opts in via the ClientCapabilities.dynamicRegistration property.
		 * @kind request
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#client_registerCapability
		 */
		registerCapability: 'client/registerCapability',
		/**
		 * @description The client/unregisterCapability request is sent from the server to the client to unregister a previously register capability.
		 * @kind request
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#client_unregisterCapability
		 */
		unregisterCapability: 'client/unregisterCapability',
		/**
		 * @kind notification
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#didchangeconfiguration-notification
		 */
		didChangeConfiguration: 'workspace/didChangeConfiguration',
		/**
		 * @kind notification
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#didchangewatchedfiles-notification
		 */
		didChangeWatchedFiles: 'workspace/didChangeWatchedFiles',
		/**
		 * @description The workspace symbol request is sent from the client to the server to list project-wide symbols matching the query string.
		 * @kind request
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#workspace-symbols
		 */
		workspaceSymbol: 'workspace/symbol',
		/**
		 * @description The workspace/executeCommand request is sent from the client to the server to trigger command execution on the server.
		 * In most cases the server creates a WorkspaceEdit structure and applies the changes to the workspace using the request workspace/applyEdit
		 * which is sent from the server to the client.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#workspace_executeCommand
		 */
		workspaceExecuteCommand: 'workspace/executeCommand',
		/**
		 * @description The workspace/applyEdit request is sent from the server to the client to modify resource on the client side.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#workspace_applyEdit
		 */
		workspaceApplyEdit: 'workspace/applyEdit',
		/**
		 * @description The code action request is sent from the client to the server to compute commands for a given text document and range. 
		 * The request is triggered when the user moves the cursor into a problem marker in the editor or presses the lightbulb associated with a marker.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_codeAction
		 */
		codeAction: 'textDocument/codeAction',
		/**
		 * @description The code lens request is sent from the client to the server to compute code lenses for a given text document.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_codeLens
		 */
		codeLens: 'textDocument/codeLens',
		/**
		 * @description The Completion request is sent from the client to the server to compute completion items at a given cursor position. 
		 * Completion items are presented in the IntelliSense user interface. If computing full completion items is expensive, 
		 * servers can additionally provide a handler for the completion item resolve request. This request is sent when a completion item is selected in the user interface.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_completion
		 */
		completion: 'textDocument/completion',
		/**
		 * @description The goto definition request is sent from the client to the server to resolve the definition location of a symbol at a given text document position.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_definition
		 */
		definition: 'textDocument/definition',
		/**
		 * @kind notification
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_didOpen
		 */
		didOpen: 'textDocument/didOpen',
		/**
		 * @kind notification
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_didChange
		 */
		didChange: 'textDocument/didChange',
		/**
		 * @kind notification
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_didClose
		 */
		didClose: 'textDocument/didClose',
		/**
		 * @kind notification
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_didSave
		 */
		didSave: 'textDocument/didSave',
		/**
		 * @description The document highlight request is sent from the client to the server to resolve a document highlights for a given text document position.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_documentHighlight
		 */
		documentHighlight: 'textDocument/documentHighlight',
		/**
		 * @description The document symbol request is sent from the client to the server to list all symbols found in a given text document.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_documentSymbol
		 */
		documentSymbol: 'textDocument/documentSymbol',
		/**
		 * @description The document formatting request is sent from the server to the client to format a whole document.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_formatting
		 */
		formatting: 'textDocument/formatting',
		/**
		 * @description The hover request is sent from the client to the server to request hover information at a given text document position.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_hover
		 */
		hover: 'textDocument/hover',
		/**
		 * @description The document on type formatting request is sent from the client to the server to format parts of the document during typing.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_onTypeFormatting
		 */
		onTypeFormatting: 'textDocument/onTypeFormatting',
		/**
		 * @kind notification
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_publishDiagnostics
		 */
		publishDiagnostics: 'textDocument/publishDiagnostics',
		/**
		 * @description The document range formatting request is sent from the client to the server to format a given range in a document.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_rangeFormatting
		 */
		rangeFormatting: 'textDocument/rangeFormatting',
		/**
		 * @description The references request is sent from the client to the server to resolve project-wide references for the symbol denoted by the given text document position.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_references
		 */
		references: 'textDocument/references',
		/**
		 * @description The rename request is sent from the client to the server to perform a workspace-wide rename of a symbol.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_rename
		 */
		rename: 'textDocument/rename',
		/**
		 * @description The signature help request is sent from the client to the server to request signature information at a given cursor position.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_signatureHelp
		 */
		signatureHelp: 'textDocument/signatureHelp',
		/**
		 * @description The request is sent from the client to the server to resolve additional information for a given completion item.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#completionItem_resolve
		 */
		completionItemResolve: 'completionItem/resolve',
		/**
		 * @description The code lens resolve request is sent from the client to the server to resolve the command for a given code lens item.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#codeLens_resolve
		 */
		codeLensResolve: 'codeLens/resolve',
		/**
		 * @description The document will save notification is sent from the client to the server before the document is actually saved.
		 * @kind notification
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_willSave
		 */
		willSave: 'textDocument/willSave',
		/**
		 * @description The document will save request is sent from the client to the server before the document is actually saved.
		 * The request can return an array of TextEdits which will be applied to the text document before it is saved.
		 * Please note that clients might drop results if computing the text edits took too long or if a server constantly fails on this request.
		 * This is done to keep the save fast and reliable.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_willSaveWaitUntil
		 */
		willSaveWaitUntil: 'textDocument/willSaveWaitUntil',
		/**
		 * @description The document links request is sent from the client to the server to request the location of links in a document.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#textDocument_documentLink
		 */
		documentLink: 'textDocument/documentLink',
		/**
		 * @description The document link resolve request is sent from the client to the server to resolve the target of a given document link.
		 * @kind request
		 * @see https://github.com/othomann/language-server-protocol/blob/master/protocol.md#documentLink_resolve
		 */
		documentLinkResolve: 'documentLink/resolve'
	});

	/**
	 * @name IPC
	 * @description Creates a new IPC class
	 * @param {String} channel The channel
	 * @param {String} language The id of the language 
	 * @returns {IPC} A new class
	 * @since 13.0
	 */
	function IPC(lspService, language, serviceRegistry) {
		this.lspService = lspService;
		this.languageId = language;
		this.serviceRegistry = serviceRegistry;
		this.id = 1;
	}

	IPC.prototype.sendMessage = function sendMessage(id, message, params) {
		return this.lspService.sendMessage(id, message, params);
	};

	/**
	 * @name IPC.prototype.didOpen
	 * @description The document open notification is sent from the client to the server to signal newly opened text documents. 
	 * The document's truth is now managed by the client and the server must not try to read the document's truth using the document's uri.
	 * @function
	 * @param {String} uri The URI of the file
	 * @param {String} languageId The content type of the source
	 * @param {String} text The optional current source code
	 */
	IPC.prototype.didOpen = function didOpen(uri, languageId, version, text) {
		return this.sendMessage(0, this.MESSAGE_TYPES.didOpen, {
			textDocument: {
				uri: uri,
				languageId: languageId,
				version: version,
				text: text
			}
		});
	};

	/**
	 * @name IPC.prototype.didClose
	 * @description The document close notification is sent from the client to the server when the document got closed in the client. 
	 * The document's truth now exists where the document's uri points to (e.g. if the document's uri is a file uri the truth now exists on disk).
	 * @function
	 * @param {String} uri The URI of the file
	 */
	IPC.prototype.didClose = function didClose(uri) {
		return this.sendMessage(0, this.MESSAGE_TYPES.didClose, {
			textDocument: {
				uri: uri,
			}
		});
	};

	/**
	 * @name IPC.prototype.didSave
	 * @description The document save notification is sent from the client to the server when the document was saved in the client.
	 * @function
	 * @param {String} uri The URI of the file
	 * @param {String} [text] the text content of the saved document
	 */
	IPC.prototype.didSave = function didSave(uri, text) {
		return this.sendMessage(0, this.MESSAGE_TYPES.didSave, {
			textDocument: {
				uri: uri,
			},
			text: text
		});
	};

	/**
	 * @name IPC.prototype.didChange
	 * @description The document change notification is sent from the client to the server to signal changes to a text document. 
	 * In 2.0 the shape of the params has changed to include proper version numbers and language ids.
	 * @function
	 * @param {String} uri The URI of the file
	 * @param {Number} version the version of the document
	 * @param Array<TextDocumentContentChangeEvent> changes the changes in the document
	 */
	IPC.prototype.didChange = function didChange(uri, version, changes) {
		return this.sendMessage(0, this.MESSAGE_TYPES.didChange, {
			textDocument: {
				uri: uri,
				version: version
			},
			contentChanges: changes
		});
	};

	/**
	 * @name IPC.prototype.documentHighlight
	 * @description The document highlight request is sent from the client to the server to resolve a document highlights for a given text document position.
	 * @function
	 * @param {String} uri The URI of the file
	 * @param {{line: number, character: number}} offset The offset into the file to compute the highlight for
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.documentHighlight = function documentHighlight(uri, position) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.documentHighlight, {
			position: position,
			textDocument: {
				uri: uri,
			}
		});
	};

	/**
	 * @name IPC.prototype.completion
	 * @description The Completion request is sent from the client to the server to compute completion items at a given cursor position. 
	 * Completion items are presented in the IntelliSense user interface. If computing full completion items is expensive, servers can additionally provide a handler for the completion item resolve request. 
	 * This request is sent when a completion item is selected in the user interface.
	 * @function
	 * @param {String} uri The URI of the file
	 * @param {{line: number, character: number}} offset The offset into the file to compute completions at
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.completion = function completion(uri, position) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.completion, {
			position: position,
			textDocument: {
				uri: uri,
			}
		});
	};

	/**
	 * @name IPC.prototype.hover
	 * @description The hover request is sent from the client to the server to request hover information at a given text document position.
	 * @function
	 * @param {String} uri The URI of the file
	 * @param {{line: number, character: number}} offset The offset into the file to hover at
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.hover = function hover(uri, position) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.hover, {
			position: position,
			textDocument: {
				uri: uri,
			}
		});
	};

	/**
	 * @name IPC.prototype.documentSymbol
	 * @description The document symbol request is sent from the client to the server to list all symbols found in a given text document.
	 * @function
	 * @param {String} uri The URI for the file to find symbols in
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.documentSymbol = function documentSymbol(uri) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.documentSymbol, {
			textDocument: {
				uri: uri,
			}
		});
	};

	/**
	 * @name IPC.prototype.formatDocument
	 * @description The document formatting request is sent from the server to the client to format a whole document.
	 * @function
	 * @param {String} uri The URI for the file to find symbols in
	 * @param {FormattingOptions} options the formatting options
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.formatDocument = function formatDocument(uri, options) {
		return this.sendMessage(
			this.id++,
			this.MESSAGE_TYPES.formatting,
			{
				textDocument: {
					uri: uri,
				},
				options: options
			});
	};

	/**
	 * @name IPC.prototype.codeLens
	 * @description The code lens request is sent from the client to the server to compute code lenses for a given text document.
	 * @function
	 * @param {String} uri The URI to request the lens within
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.codeLens = function codeLens(uri) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.codeLens, {
			textDocument: {
				uri: uri
			}
		});
	};

	/**
	 * @name IPC.prototype.references
	 * @description The references request is sent from the client to the server to resolve project-wide references for the symbol denoted by the given text document position.
	 * @function
	 * @param {String} uri The URI to request the references from
	 * @param {{line: number, character: number}} offset The offset into the file to compute references for
	 * @param context extra context info (i.e for the java server it is possible to specify whether to include declarations)
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.references = function references(uri, position, context) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.references, {
			position: position,
			context: context,
			textDocument: {
				uri: uri
			}
		});
	};

	/**
	 * @name IPC.prototype.definition
	 * @description The goto definition request is sent from the client to the server to resolve the definition location of a symbol at a given text document position.
	 * @function
	 * @param {String} uri The URI to request the definition from
	 * @param {{line: number, character: number}} offset The offset into the file to compute the definition for
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.definition = function definition(uri, position) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.definition, {
			position: position,
			textDocument: {
				uri: uri
			}
		});
	};

	/**
	 * @name IPC.prototype.shutdown
	 * @description The shutdown request is sent from the client to the server. It asks the server to shut down, but to not exit (otherwise the response might not be delivered correctly to the client). 
	 * There is a separate exit notification that asks the server to exit.
	 * @function
	 * @returns {Deferred} The deferred to return the results of the request. In this case the result is always 
.
	 */
	IPC.prototype.shutdown = function shutdown() {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.shutdown, {});
	};

	/**
	 * @name IPC.prototype.showMessageRequest
	 * @description The show message request is sent from a server to a client to ask the client to display a particular message in the user interface. 
	 * In addition to the show message notification the request allows to pass actions and to wait for an answer from the client.
	 * @function
	 * @param {number} type The type of the message {@see #messageTypes}
	 * @param {String} message The message to send
	 * @param {Array.<String>} actions Ant command actions to be processed
	 * @returns {Deferred} The deferred to return the results of the request. In this case the result is always 
.
	 */
	IPC.prototype.showMessageRequest = function showMessageRequest(type, message, actions) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.showMessageRequest, {
			type: type,
			message: message,
			actions: actions
		});
	};

	/**
	 * @name IPC.prototype.workspaceSymbol
	 * @description The workspace symbol request is sent from the client to the server to list project-wide symbols matching the query string.
	 * @function
	 * @param {String} query The string query
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.workspaceSymbol = function workspaceSymbol(query) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.workspaceSymbol, {
			query: query
		});
	};

	/**
	 * @name IPC.prototype.codeAction
	 * @description The code action request is sent from the client to the server to compute commands for a given text document and range. 
	 * The request is triggered when the user moves the cursor into a problem marker in the editor or presses the lightbulb associated with a marker.
	 * @function
	 * @param {String} uri The URI of the file
	 * @param {{line:number, character:number}} start The start position
	 * @param {{line:number, character:number}} end The end position
	 * @param {Array.<{}>} diagnostics The array of diagnostic objects
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.codeAction = function codeAction(uri, start, end, diagnostics) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.codeAction, {
			textDocument: {
				uri: uri
			},
			range: {
				start: start,
				end: end
			},
			context: {
				diagnostics: diagnostics
			}
		});
	};

	/**
	 * @name IPC.prototype.onTypeFormatting
	 * @description The document on type formatting request is sent from the client to the server to format parts of the document during typing.
	 * @function
	 * @param {String} uri The URI of the file
	 * @param {{line:number, character:number}} position The position of the edit
	 * @param {string} char The character typed
	 * @param {?} options The formatting options
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.onTypeFormatting = function onTypeFormatting(uri, position, char, options) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.onTypeFormatting, {
			textDocument: {
				uri: uri
			},
			position: position,
			char: char,
			options: options
		});
	};

	/**
	 * @name IPC.prototype.rangeFormatting
	 * @description The document range formatting request is sent from the client to the server to format a given range in a document.
	 * @function
	 * @param {String} uri The URI of the file
	 * @param {{line:number, character:number}} start The start position
	 * @param {{line:number, character:number}} end The end position
	 * @param {?} options The formatting options
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.rangeFormatting = function rangeFormatting(uri, start, end, options) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.rangeFormatting, {
			textDocument: {
				uri: uri
			},
			range: {
				start: start,
				end: end
			},
			options: options
		});
	};

	/**
	 * @name IPC.prototype.codeLensResolve
	 * @description the code lens resolve request is sent from the client to the server to resolve the command for a given code lens item.
	 * @function
	 * @param {?} codeLens The result from a codeLens request
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.codeLensResolve = function codeLensResolve(codeLens) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.codeLensResolve, {
			codeLens: codeLens
		});
	};

	/**
	 * @name IPC.prototype.rename
	 * @description The rename request is sent from the client to the server to perform a workspace-wide rename of a symbol.
	 * @function
	 * @param {String} uri The URI of the file
	 * @param {{line:number, character:number}} position The position in the editor to invoke the rename from
	 * @param {String} newName The new name to set
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.rename = function rename(uri, position, newName) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.rename, {
			textDocument: {
				uri: uri
			},
			position: position,
			newName: newName
		});
	};

	/**
	 * @name IPC.prototype.signatureHelp
	 * @description The signature help request is sent from the client to the server to request signature information at a given cursor position.
	 * @function
	 * @param {String} uri The URI of the file
	 * @param {{line:number, character:number}} position The position in the editor
	 * @param {Array.<String>} signatures
	 * @param {String} activeSignature
	 * @param {String} activeParameter
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.signatureHelp = function signatureHelp(uri, position, signatures, activeSignature, activeParameter) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.signatureHelp, {
			textDocument: {
				uri: uri,
				position: position
			},
			signatures: signatures,
			activeSignature: activeSignature,
			activeParameter: activeParameter
		});
	};

	/**
	 * @name IPC.prototype.completionItemResolve
	 * @description The request is sent from the client to the server to resolve additional information for a given completion item.
	 * @function
	 * @param {?} completionItem A completion item response from a completion request
	 * @returns {Deferred} The deferred to return the results of the request
	 */
	IPC.prototype.completionItemResolve = function completionItemResolve(completionItem) {
		return this.sendMessage(this.id++, this.MESSAGE_TYPES.completionItemResolve, completionItem);
	};
	return IPC;
});
