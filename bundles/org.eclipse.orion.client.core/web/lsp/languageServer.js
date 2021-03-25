/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/* eslint-env amd, browser */
define([
	"orion/Deferred",
	"lsp/ipc",
	"lsp/utils",
	"orion/util"
], function(Deferred, IPC, Utils, util) {
	var
		LOG_ERRORS = util.readSetting('java.langserver.logmessage.error') === 'true',
		LOG_WARNINGS = util.readSetting('java.langserver.logmessage.warn') === 'true',
		LOG_INFO = util.readSetting('java.langserver.logmessage.error.info') === 'true';

	/**
	 * @name LanguageServer
	 * @description Creates a new instance of the language server placeholder. This object wraps the server impl, 
	 * options and identifying information in one place. The functions from the underlying IPC instance are wrapped in the promise-like
	 * function and set directly on this instance
	 * @class 
	 * @param {String} id The optional identifier for this language server
	 * @param {?} options The optional collection of options
	 * @param {serviceRegistry} the given service registry
	 * @returns {LanguageServer} Returns a new instance of LanguageServer
	 * @since 13.0
	 */
	function LanguageServer(lspServiceRef, id, serviceRegistry, markerServiceID) {
		this._id = id;
		this.started = false;
		this.serviceRef = lspServiceRef;
		var lspService = this.lspService = serviceRegistry.getService(lspServiceRef);
		this.ipc = new IPC(lspService, id, serviceRegistry);
		Object.keys(IPC.prototype).forEach(function(key) {
			//this mitigates having to check for own property
			if (typeof IPC.prototype[key] === 'function') {
				this[key] = _ipcCall(key, this.ipc);
			}
		}.bind(this), this);

		/**
		 * Default logging listener
		 */
		lspService.addEventListener(this.ipc.MESSAGE_TYPES.logMessage, function handleNotification(evt) {
			var data = evt.data;
			if (data !== null && typeof data === 'object') {
				if (data.params && (LOG_ERRORS && data.params.type === 1) || (LOG_WARNINGS && data.params.type === 2) || (LOG_INFO && data.params.type === 3)) {
					if (typeof data === 'object' && data !== null) {
						console.log(JSON.stringify(data));
					} else if (typeof data === 'string') {
						console.log(data);
					}
				}
			}
		});
		/**
		 * Listener to handle diagnostics notifications
		 */
		lspService.addEventListener(this.ipc.MESSAGE_TYPES.publishDiagnostics, function handleNotification(evt) {
			var data = evt.data;
			var markerService = serviceRegistry.getService(markerServiceID);
			if (markerService) {
				markerService._setProblems(Utils.toProblems(data.params.diagnostics), data.params.uri);
			}
			console.log(JSON.stringify(data));
		});
		/**
		 * Listener to handle status notifications
		 */
		lspService.addEventListener(this.ipc.MESSAGE_TYPES.status, function handleNotification(evt) {
			var data = evt.data;
			var statusService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-1$
			if (statusService) {
				if (data.params.type === "Started") {
					statusService.setProgressResult("Java " + data.params.type + " " + data.params.message);
				} else {
					statusService.setProgressMessage("Java " + data.params.type + " " + data.params.message);
				}
			}
		});
	}
	
	LanguageServer.prototype = {
		getProperty: function(key) {
			if (key === 'id') {
				return this._id;
			}
			return this.serviceRef.getProperty(key);
		},

		start: function() {
			if (this.started) return new Deferred(this.capabilities);
			this.started = true;
			return this.lspService.start().then(function(capabilities) {
				return this.capabilities = capabilities;
			}.bind(this));
		},

		getCapabilities: function() {
			return this.capabilities;
		},

		/**
		 * Retrieves the method in which the server wishes to have documents synchronized by.
		 * 
		 * @return {number} a TextDocumentSyncKind, may be None, Full, or Incremental
		 */
		getTextDocumentSync: function() {
			if (this.capabilities && this.capabilities.textDocumentSync) {
				var kind = this.capabilities.textDocumentSync;
				if (this.capabilities.textDocumentSync.change) {
					kind = this.capabilities.textDocumentSync.change;
				}
				switch (kind) {
					case this.ipc.TEXT_DOCUMENT_SYNC_KIND.None:
					case this.ipc.TEXT_DOCUMENT_SYNC_KIND.Incremental:
					case this.ipc.TEXT_DOCUMENT_SYNC_KIND.Full:
						return kind;
				}
			}
			return this.ipc.TEXT_DOCUMENT_SYNC_KIND.None;
		},

		/**
		 * Returns whether the content of the saved document should be included in a
		 * 'textDocument/didSave' notification to the server.
		 * 
		 * @return {boolean} true if the document's text content should be included
		 *                   with the 'textDocument/didSave' notification to the
		 *                   server, false otherwise
		 */
		includeTextOnSave: function() {
			if (this.capabilities && this.capabilities.textDocumentSync && this.capabilities.textDocumentSync.save) {
				return this.capabilities.textDocumentSync.save.includeText === true;
			}
			return false;
		},

		isDefinitionEnabled: function() {
			return this.capabilities && this.capabilities.definitionProvider;
		},

		isReferencesEnabled: function() {
			return this.capabilities && this.capabilities.referencesProvider;
		},
		
		isFormatDocumentEnabled: function() {
			return this.capabilities && this.capabilities.documentFormattingProvider;
		},
	
		isRangeFormatDocumentEnabled: function() {
			return this.capabilities && this.capabilities.documentRangeFormattingProvider;
		},
		
		isDocumentSymbolEnabled: function() {
			return this.capabilities && this.capabilities.documentSymbolProvider;
		},
		
		isDocumentHighlightEnabled: function() {
			return this.capabilities && this.capabilities.documentHighlightProvider;
		},
		
		isHoverEnabled: function() {
			return this.capabilities && this.capabilities.hoverProvider;
		}

	};

	/**
	 * @name _ipcCall
	 * @description Create a deferred-wrappped function call
	 * @private
	 * @param {String} method The name of the method to wrap
	 * @param {IPC} ls The protocol impl to call back to
	 * @returns {function} Returns a function wrapper for the named IPC function
	 */
	function _ipcCall(method, ls) {
		return function() {
			var d;
			try {
				var result = ls[method].apply(ls, Array.prototype.slice.call(arguments));
				if (result && typeof result.then === "function") {
					return result;
				}
				d = new Deferred();
				d.resolve(result);
			} catch (e) {
				d = new Deferred();
				d.reject(e);
			}
			return d.promise;
		};
	}

	return LanguageServer;
});
