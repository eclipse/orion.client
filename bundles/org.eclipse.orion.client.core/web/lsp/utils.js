/*******************************************************************************
 * @license
 * Copyright (c) 2017, 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/Deferred'
], function(Deferred) {

	var severities = {
		1: 'error',
		2: 'warning',
		3: 'info'
	};

	/**
	 * @name getPosition
	 * @description Return a document position object for use with the protocol
	 * @param {?} editor The given editor
	 * @param {number} offset The Orion editor offset
	 * @returns {?} Return a position based on the given offset
	 */
	function getPosition(editor, offset) {
		var line = editor.getLineAtOffset(offset);
		var lineOffset = editor.getLineStart(line);
		return {
			line: line,
			character: offset - lineOffset
		};
	}

	function computeHoverInfo(lspProviderImpl, inputManager, editor, args) {
		if (args.proposal && args.proposal.kind === 'java') {
			return args.proposal.hover;
		}
		if (args.offset === undefined) {
			return "";
		}
		return lspProviderImpl.hover(inputManager.getFileMetadata().Location, getPosition(editor, args.offset)).then(function(result) {
				if (result) {
					var hover = {
						type: 'markdown'
					};
					if (Array.isArray(result.contents)) {
						if (result.contents.length === 0) {
							return new Deferred().resolve('');
						}
						var hoverContents = result.contents[0];
						if (typeof hoverContents === 'string' && hoverContents.length === 0) {
							return new Deferred().resolve('');
						}
						if (typeof result.contents[0] === 'object') {
							// this must be a MarkedString with { language: string, value: string }
							hover.content = result.contents[0].value;
						} else {
							hover.content = result.contents[0];
						}
					} else if (typeof result.contents === 'string') {
						if (result.contents.length === 0) {
							return new Deferred().resolve('');
						}
						hover.content = result.contents;
					} else if (result.contents !== null && typeof result.contents === 'object') {
						hover.content = result.contents.value;
					}
					return new Deferred().resolve(hover);
				}
				return new Deferred().resolve('');
			},
			/* @callback */
			function(err) {
				return new Deferred().resolve('');
			});
	}

	function computeOccurrences(lspProviderImpl, inputManager, editor, args) {
		var text = editor.getSelectionText();

		if (text.trim().length === 0) {
			return new Deferred().resolve([]);
		}
		return lspProviderImpl.documentHighlight(inputManager.getFileMetadata().Location, getPosition(editor, args.selection.start)).then(function(results) {
				if (results && Array.isArray(results) && results.length > 0) {
					return results.map(function(result) {
						var offset = editor.getLineStart(result.range.start.line);
						return {
							start: result.range.start.character + offset,
							end: result.range.end.character + offset,
							readAccess: result.kind === lspProviderImpl.ipc.DOCUMENT_HIGHLIGHT_KIND.Read
						};
					});
				}
				return new Deferred().resolve([]);
			},
			/* @callback */
			function(err) {
				return new Deferred().resolve([]);
			});
	}

	function _findContainerIndex(list, container) {
		var item = list[list.length - 1];
		if (item && item.label === container) {
			return list.length - 1;
		}
		for (var i = 0; i < list.length; i++) {
			if (list[i].label === container) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * @name resolveSymbolKind
	 * @description Converts the given symbol kind into its name
	 * @param {number} num The symbl kind
	 * @returns {String} The name of the symbol kind
	 */
	function resolveSymbolKind(num) {
		switch (num) {
			case 1:
				return 'File';
			case 2:
				return 'Module';
			case 3:
				return 'Namespace';
			case 4:
				return 'Package';
			case 5:
				return 'Class';
			case 6:
				return 'Method';
			case 7:
				return 'Property';
			case 8:
				return 'Field';
			case 9:
				return 'Constructor';
			case 10:
				return 'Enum';
			case 11:
				return 'Interface';
			case 12:
				return 'Function';
			case 13:
				return 'Variable';
			case 14:
				return 'Constant';
			case 15:
				return 'String';
			case 16:
				return 'Number';
			case 17:
				return 'Boolean';
			case 18:
				return 'Array';
			default:
				return 'Unknown';
		}
	}

	function documentSymbol(lspProviderImpl, inputManager) {
		return lspProviderImpl.documentSymbol(inputManager.getFileMetadata().Location).then(function(results) {
			if (Array.isArray(results) && results.length > 0) {
				var outline = [];
				results.forEach(function(result) {
					var offset = result.location.range.start.character;
					var node = {
						label: result.name,
						labelPost: ' (' + resolveSymbolKind(result.kind) + ')',
						line: result.location.range.start.line + 1,
						offset: offset,
						length: result.location.range.end.character - offset,
						children: []
					};
					if (!result.containerName) {
						outline.push(node);
					} else {
						var idx = _findContainerIndex(outline, result.containerName),
							_p;
						if (idx < 0) {
							_p = {
								label: result.containerName,
								children: []
							};
							outline.push(_p);
						} else {
							_p = outline[idx];
						}
						_p.children.push(node);
					}
				});
				return outline;
			}
			return new Deferred().resolve([]);
		});
	}

	function getRange(editor, offset, offset2) {
		return {
			start: getPosition(editor, offset),
			end: getPosition(editor, offset2)
		};
	}

	function convertRange(editor, range) {
		var startLineOffset = editor.getLineStart(range.start.line);
		var endLineOffset = editor.getLineStart(range.end.line);
		return {
			start: range.start.character + startLineOffset,
			end: range.end.character + endLineOffset,
		};
	}

	/**
	 * @name toProblems
	 * @description Convert the diagnostics data to Orion problems
	 * @param {?} info The diagnostics info
	 * @param {?} config The configuration to set severites with 
	 * @returns {[?]} The array of Orion problem objects
	 */
	function toProblems(info) {
		var problems = [];
		info.forEach(function(item) {
			var severity = getSeverity(item.severity);
			if (!severity) {
				return;
			}
			problems.push({
				description: item.message,
				id: item.code,
				severity: severity,
				range: item.range
			});
		});
		return problems;
	}

	/**
	 * @name getSeverity
	 * @description Returns the severity for the given problem id or null if there is no configuration entry for it
	 * @param {String} id The id of the problem
	 * @returns {String | null} The name of the severity or null if its 'ignore'
	 */
	function getSeverity(severity) {
		if (severities[severity] === 3) {
			return null;
		}
		return severities[severity];
	}

	/**
	 * @name getPosition
	 * @description Return a document position object for use with the protocol
	 * @param {?} editorContext The backing editor context
	 * @param {number} offset The Orion editor offset
	 * @returns {Deferred} Return a deferred that will resolve to a position object for the protocol textDocument requests
	 */
	function getEditorContextPosition(editorContext, offset) {
		return editorContext.getLineAtOffset(offset).then(function(line) {
			return editorContext.getLineStart(line).then(function(lineOffset) {
				return {
					line: line,
					character: offset - lineOffset
				};
			});
		});
	}

	function computeContentAssist(provider, editorContext, args) {
		return editorContext.getFileMetadata().then(function(meta) {
			return getEditorContextPosition(editorContext, args.selection.start).then(function(position) {
				return provider.completion(meta.location, position).then(function(results) {
						// textDocument/completion requests may return a CompletionItem[] or a CompletionList
						var items = results;
						if (results.items) {
							items = results.items;
						}
						if (Array.isArray(items) && items.length > 0) {
							return Deferred.all(resolveCompletionItems(provider, editorContext, items)).then(function(proposals) {
								return new Deferred().resolve(proposals);
							});
						}
						return new Deferred().resolve([]);
					},
					/* @callback */
					function(err) {
						return new Deferred().resolve([]);
					});
			});
		});
	}

	/**
	 * Converts the completion result kind into a human-readable string
	 */
	function resolveCompletionKind(num) {
		switch (num) {
			case 1:
				return 'Text';
			case 2:
				return 'Method';
			case 3:
				return 'Function';
			case 4:
				return 'Constructor';
			case 5:
				return 'Field';
			case 6:
				return 'Variable';
			case 7:
				return 'Class';
			case 8:
				return 'Interface';
			case 9:
				return 'Module';
			case 10:
				return 'Property';
			case 11:
				return 'Unit';
			case 12:
				return 'Value';
			case 13:
				return 'Enum';
			case 14:
				return 'Keyword';
			case 15:
				return 'Snippet';
			case 16:
				return 'Color';
			case 17:
				return 'File';
			case 18:
				return 'Reference';
			default:
				return 'Unknown';
		}
	}

	function resolveCompletionItems(provider, editorContext, items) {
		return items.map(function(completionItem) {
			return provider.completionItemResolve(completionItem).then(function(item) {
				var temp = {
					name: item.label,
					description: ' (' + resolveCompletionKind(item.kind) + ')',
					relevance: 100,
					style: 'emphasis', //$NON-NLS-1$
					overwrite: true,
					kind: 'java' //$NON-NLS-1$
				};
				if (item.textEdit) {
					temp.proposal = item.textEdit.newText;
				} else if (item.insertText) {
					temp.proposal = item.insertText;
				} else {
					temp.proposal = item.label;
				}
				if (temp.proposal) {
					var mod = temp.proposal;
					var index = mod.indexOf("${");
					temp.positions = [];
					if (index === -1) {
						temp.escapePosition = mod.length;
					} else {
						while (index !== -1) {
							mod = mod.substring(0, index) + mod.substring(index + 4);
							var endIndex = mod.indexOf("}");
							mod = mod.substring(0, endIndex) + mod.substring(endIndex + 1);
							temp.positions.push({
								offset: index,
								length: endIndex - index
							});
							index = mod.indexOf("${");
						}
						temp.proposal = mod;
						temp.escapePosition = mod.length;
					}
				}
				if (item.documentation) {
					temp.hover = {
						content: item.documentation,
						type: 'markdown'
					};
				}
				if (Array.isArray(item.additionalTextEdits) && item.additionalTextEdits.length !== 0) {
					var tempEdits = [];
					item.additionalTextEdits.forEach(function(additionalEdit) {
						var newEdit = Object.create(null);
						newEdit.text = additionalEdit.newText;
						newEdit.range = additionalEdit.range;
						tempEdits.push(newEdit);
					});
					temp.additionalEdits = tempEdits;
				}
				return convertEachProposal(editorContext, item, temp);
			});
		});
	}

	function convertEdit(editorContext, edit) {
		var range = edit.range;
		return editorContext.getLineStart(range.start.line).then(function(startLineOffset) {
			return editorContext.getLineStart(range.end.line).then(function(endLineOffset) {
				return {
					text: edit.newText,
					start: range.start.character + startLineOffset,
					end: range.end.character + endLineOffset,
				};
			});
		});
	}

	/**
	 * Converts the linked mode and escape positional offsets of this
	 * proposal to the full offset within the document.
	 * 
	 * @param {Deferred} deferred the promise for resolving the converted proposal
	 * @param editorContext the current context of the editor
	 * @param item the converted JSON item from the LSP
	 * @param proposal the proposal to have its linked mode and escape positions converted
	 */
	function convertPositions(deferred, editorContext, item, proposal) {
		editorContext.getLineStart(item.textEdit.range.start.line).then(function(startLineOffset) {
			var completionOffset = item.textEdit.range.start.character + startLineOffset;
			for (var i = 0; i < proposal.positions.length; i++) {
				proposal.positions[i].offset = completionOffset + proposal.positions[i].offset;
			}
			proposal.escapePosition = completionOffset + proposal.escapePosition;
			deferred.resolve(proposal);
		});
	}

	function convertEachProposal(editorContext, item, proposal) {
		var deferred = new Deferred();
		if (proposal.additionalEdits) {
			var additionalEditsLength = proposal.additionalEdits.length;
			proposal.additionalEdits.forEach(function(edit, index) {
				return convertEdit(editorContext, edit).then(function(newAdditionalEdit) {
					edit.offset = newAdditionalEdit.start;
					edit.length = newAdditionalEdit.end - edit.offset;
					delete edit.range;
					if (index === additionalEditsLength - 1) {
						if (item.textEdit) {
							convertPositions(deferred, editorContext, item, proposal);
						} else {
							deferred.resolve(proposal);
						}
					}
				});
			});
		} else if (item.textEdit) {
			convertPositions(deferred, editorContext, item, proposal);
		} else {
			// let Orion calculate it, see escapePosition() in actions.js
			delete proposal.escapePosition;
			deferred.resolve(proposal);
		}
		return deferred;
	}

	return {
		getPosition: getPosition,
		computeHoverInfo: computeHoverInfo,
		computeOccurrences: computeOccurrences,
		getRange: getRange,
		toProblems: toProblems,
		documentSymbol: documentSymbol,
		computeContentAssist: computeContentAssist,
		convertRange: convertRange
	};
});
