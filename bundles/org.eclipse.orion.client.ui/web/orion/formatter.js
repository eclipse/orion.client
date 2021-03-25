/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/

define ([
	'orion/Deferred',
	'lsp/utils'
], function(Deferred, Utils) {
	
	function Formatter(serviceRegistry, inputManager, editor, languageServerRegistry) {
		this.serviceRegistry = serviceRegistry;
		this.inputManager = inputManager;
		this.editor = editor;
		this.languageServerRegistry = languageServerRegistry;
	}
	
	Formatter.prototype = {
		getFormatter: function() {
			var inputManagerContentType = this.inputManager.getContentType();
			var formatters = this.serviceRegistry.getServiceReferences("orion.edit.format"); //$NON-NLS-0$
			for (var i=0; i < formatters.length; i++) {
				var serviceReference = formatters[i];
				var contentTypes = serviceReference.getProperty("contentType"); //$NON-NLS-0$
				if (inputManagerContentType && inputManagerContentType.id) {
					var inputContentType = inputManagerContentType.id;
					if (Array.isArray(contentTypes)) {
						for (var j = 0, max = contentTypes.length; j < max; j++) {
							if (contentTypes[j] === inputContentType) {
								return this.serviceRegistry.getService(serviceReference);
							}
						}
					} else if (inputContentType === contentTypes) {
						return this.serviceRegistry.getService(serviceReference);
					}
				}
			}
			return null;
		},
		getLspFormatter : function() {
			// check lsp extensions
			var inputManagerContentType = this.inputManager.getContentType();
			return this.languageServerRegistry.getServerByContentType(inputManagerContentType);
		},
		isVisible: function() {
			if (!!this.getFormatter()) {
				return true;
			}
			var languageServer = this.getLspFormatter();
			if (languageServer) {
				return languageServer.isFormatDocumentEnabled() || languageServer.isRangeFormatDocumentEnabled();
			}
			return false;
		},
		
		doFormat: function() {
			var selection = this.editor.getSelection();
			var service = this.getFormatter();
			if (service) {
				var context = {start: selection.start, end: selection.end};
				return service.format(this.editor.getEditorContext(), context);
			}
			// check lsp formatters
			var lspFormatter = this.getLspFormatter();
			if (lspFormatter) {
				var textView = this.editor.getTextView();
				var options = {
					tabSize: textView.getOptions("tabSize"),
					insertSpaces: textView.getOptions("expandTab")
				};
				if (selection.start !== selection.end) {
					// we want to format the selected text only
					var start = Utils.getPosition(this.editor, selection.start);
					var end = Utils.getPosition(this.editor, selection.end);
					return lspFormatter.rangeFormatting(this.inputManager.getFileMetadata().Location, start, end, options).then(
						function(edits) {
							if (Array.isArray(edits) && edits.length !== 0) {
								this.editor.setText({
									text: edits.map(function(e) {
										return e.newText;
									}),
									selection: edits.map(function(edit) {
										var range = edit.range;
										return {
											start: this.editor.getLineStart(range.start.line) + range.start.character,
											end: this.editor.getLineStart(range.end.line) + range.end.character
										};
									}.bind(this)),
									preserveSelection: true
								});
							}
						}.bind(this));
				}
				return lspFormatter.formatDocument(this.inputManager.getFileMetadata().Location, options).then(
					function(edits) {
						if (Array.isArray(edits) && edits.length !== 0) {
							this.editor.setText({
								text: edits.map(function(e) {
									return e.newText;
								}),
								selection: edits.map(function(edit) {
									var range = edit.range;
									return {
										start: this.editor.getLineStart(range.start.line) + range.start.character,
										end: this.editor.getLineStart(range.end.line) + range.end.character
									};
								}.bind(this)),
								preserveSelection: true
							});
						}
					}.bind(this));
			}
			return new Deferred().resolve();
		}
	};
	return {Formatter: Formatter}; 
});


