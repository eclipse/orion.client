/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * Copyright (c) 2012 VMware, Inc.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: 
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser,amd*/

define([
	"orion/editor/edit",
	"orion/keyBinding",
	"webtools/cssContentAssist",
	"webtools/htmlContentAssist",
],
function(edit, mKeyBinding, mCSSContentAssist, mHTMLContentAssist) {
	
	var editorDomNode = document.getElementById("editor"); //$NON-NLS-0$

	function save(editor) {
		editor.setInput(null, null, null, true);
		setTimeout(function() {
			window.alert("Save hook.");
		}, 0);
	}

	var status = "";
	var dirtyIndicator = "";
	var statusReporter = function(message, isError) {
		if (isError) {
			status =  "ERROR: " + message;
		} else {
			status = message;
		}
		document.getElementById("status").textContent = dirtyIndicator + status; //$NON-NLS-0$
	};

	var html = "text/html";
	var editor = edit({
		parent: editorDomNode,
		lang: html, //$NON-NLS-0$
		contents: "<!DOCTYPE html>\n<html>\n\t<head></head>\n<body>\n" //$NON-NLS-0$
				+ "This is an HTML document. Press Ctrl+Space to show content assist.\n" //$NON-NLS-0$
				+ "<style>\n/*Pro tip: content assist is context sensitive. Try it inside this style tag.*/\n"
				+ "div {\n\tcolor: red\n}\n"
				+ "</style>\n" //$NON-NLS-0$
				+ "</body>\n</html>", //$NON-NLS-0$
		statusReporter: statusReporter
	});
	var contentAssist = editor.getContentAssist();

	// Set up an editor context provider.
	var editorContext = {
		getText: editor.getText.bind(editor),
		getFileMetadata: function() {
			return {
				contentType: { id: html }
			};
		}
	};
	contentAssist.setEditorContextProvider({
		getOptions: function() {
			return [];
		},
		getEditorContext: function() {
			return editorContext;
		}
	});

	// Register the HTML content assist provider
	var htmlContentAssistProvider = new mHTMLContentAssist.HTMLContentAssistProvider(),
	    cssContentAssistProvider = new mCSSContentAssist.CssContentAssistProvider();
	contentAssist.addEventListener("Activating", function() { //$NON-NLS-0$
		contentAssist.setProviders([cssContentAssistProvider, htmlContentAssistProvider]);
	});

	// save binding
	editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("s", true), "save"); //$NON-NLS-1$ //$NON-NLS-0$
	editor.getTextView().setAction("save", function(){ //$NON-NLS-0$
			save(editor);
			return true;
	});
	document.getElementById("save").onclick = function() {save(editor);}; //$NON-NLS-0$
		
	editor.addEventListener("DirtyChanged", function(/*evt*/) { //$NON-NLS-0$
		if (editor.isDirty()) {
			dirtyIndicator = "*"; //$NON-NLS-0$
		} else {
			dirtyIndicator = "";
		}
		statusReporter(dirtyIndicator + status);
	});
	
	window.onbeforeunload = function() {
		if (editor.isDirty()) {
			 return "There are unsaved changes.";
		}
	};
});
