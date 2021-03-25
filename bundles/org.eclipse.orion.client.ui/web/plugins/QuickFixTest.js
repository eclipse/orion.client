/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(["orion/plugin", 'orion/editor/textModel'], function(PluginProvider, TextModel) {
	var headers = { name: "QuickFix Test Plugin", version: "1.0", description: "My first Orion plugin." };
	var provider = new PluginProvider(headers);

	var fixEmptyImpl = {
	        execute: function(editorContext, context) {
				if (!context.annotation)
					return null;
		
				return editorContext.getText().then(function(text) {
					var textModel = new TextModel.TextModel(text);
					var lineIndex = textModel.getLineAtOffset(context.annotation.start);
					var lineStart = textModel.getLineStart(lineIndex);
					
					// Find the closing '}'
					var curIndex = lineStart;
					while (textModel.getText(curIndex, curIndex+1) !== '}') {
						curIndex++;
					}

					var endIndex = textModel.getLineAtOffset(curIndex);
					var end = textModel.getLineEnd(endIndex, true);
					
					editorContext.setText("", lineStart, end);
				});
	        }
	};
	var fixEmptyProperties = {
		id: "orion.css.quickfix.empty",
		image: "../images/gear.png",
		scopeId: "orion.edit.quickfix",
		tooltip: "Remove Empty Rule",
		key: ["e", true, true], // Ctrl+Shift+e
		contentType: ["text/css"],
		validationProperties: [
			{source: "annotation:title", match: "Rule is empty."} //$NON-NLS-1$ //$NON-NLS-0$
		]
	};

	var fixZeroQualifierImpl = {
	        execute: function(editorContext, context) {
				if (!context.annotation)
					return null;
		
				return editorContext.getText().then(function(text) {
					var textModel = new TextModel.TextModel(text);
					var lineIndex = textModel.getLineAtOffset(context.annotation.start);
					var lineStart = textModel.getLineStart(lineIndex);
					var lineEnd = textModel.getLineEnd(lineIndex, false);
					
					// Find the trailing ';'
					var curIndex = lineEnd;
					while (curIndex >= lineStart && textModel.getText(curIndex, curIndex+1) !== ';') {
						curIndex--;
					}
					
					if (curIndex > lineStart) {
						var semiIndex = curIndex;
						
						// Now find the '0'
						while (curIndex >= lineStart && textModel.getText(curIndex, curIndex+1) !== '0') {
							curIndex--;
						}
						if (curIndex > lineStart) {
							var zeroIndex = curIndex;
							editorContext.setText("", zeroIndex+1, semiIndex);
						}
					}
				});
	        }
	};
	var fixZeroQualifierProperties = {
		id: "orion.css.quickfix.zeroQualifier",
		image: "../images/compare-addition.gif",
		scopeId: "orion.edit.quickfix",
		name: "Remove Zero Qualifiers",
		key: ["e", true, true], // Ctrl+Shift+e
		contentType: ["text/css"],
		tooltip: "quick Fix",
		validationProperties: [
			{source: "annotation:title", match: "Values of 0 shouldn't have units specified."} //$NON-NLS-1$ //$NON-NLS-0$
		]
	};
	
	provider.registerService("orion.edit.command", fixEmptyImpl, fixEmptyProperties);
	provider.registerService("orion.edit.command", fixZeroQualifierImpl, fixZeroQualifierProperties);
	provider.connect();
});
