/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
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
	"orion/editor/textTheme", 
	"orion/editor/edit",
	"orion/editor/annotations"
], function(mTextTheme, edit, mAnnotations) {

	var exports = {};
	var editor;
		
	function getFile(file) {
		try {
			var objXml = new XMLHttpRequest();
			objXml.open("GET",file,false); //$NON-NLS-0$
			objXml.send(null);
			return objXml.responseText;
		} catch (e) {
			return null;
		}
	}
	exports.getFile = getFile;
	
	function loadTheme(themeClass) {
		var theme = mTextTheme.TextTheme.getTheme();
		theme.setThemeClass(themeClass, {href: "orion/editor/themes/" + themeClass}); //$NON-NLS-0$
	}
	exports.loadTheme = loadTheme;
	
	function processTheme(themeClass, settings) {
		var theme = mTextTheme.TextTheme.getTheme();
		theme.setThemeClass(themeClass, theme.buildStyleSheet(themeClass, settings)); //$NON-NLS-0$
	}
	exports.processTheme = processTheme;
	
	function setupView(text, lang, options) {
		var editorDomNode = document.getElementById("editor");
		var status = "";
		var dirtyIndicator = "";
		var statusReporter = function(message, isError) {
			if (isError) {
				status =  "ERROR: " + message;
			} else {
				status = message;
			}
			// console.log( dirtyIndicator + status); //$NON-NLS-0$
		};
		
		editor = edit({
			parent: editorDomNode,
			lang: lang,
			readonly: true,
			noFocus: true,
			contents: text, //$NON-NLS-0$
			statusReporter: statusReporter
		});
		var AT = mAnnotations.AnnotationType;
		if(lang === "js"){
			var annotationModel = editor.getAnnotationModel();
	 		annotationModel.addAnnotation(AT.createAnnotation(AT.ANNOTATION_INFO, 228, 234, "Variable 'crypto' shadows a global member."));
	 		annotationModel.addAnnotation(AT.createAnnotation(AT.ANNOTATION_ERROR, 374, 406, "Unreachable code"));
	 		annotationModel.addAnnotation(AT.createAnnotation(AT.ANNOTATION_WARNING, 327, 340, "errorVariable' is undefined."));
	 		annotationModel.addAnnotation(AT.createAnnotation(AT.ANNOTATION_DIFF_MODIFIED, 160, 161));
	 		annotationModel.addAnnotation(AT.createAnnotation(AT.ANNOTATION_DIFF_ADDED, 130, 131));
	 		annotationModel.addAnnotation(AT.createAnnotation(AT.ANNOTATION_DIFF_DELETED, 70, 71));
	 		annotationModel.addAnnotation(AT.createAnnotation(AT.ANNOTATION_BLAME, 450, 451, "Theme editing feature commit 1"));
	 		annotationModel.addAnnotation(AT.createAnnotation(AT.ANNOTATION_BLAME, 480, 481, "Theme editing feature commit 2"));
	 		annotationModel.addAnnotation(AT.createAnnotation(AT.ANNOTATION_CURRENT_BLAME, 480, 481, ""));
		}else if(lang === "css"){
			var annotationModel = editor.getAnnotationModel();
			annotationModel.addAnnotation(AT.createAnnotation(AT.ANNOTATION_INFO, 225, 232, "Duplicate property 'display' found."));
	 		annotationModel.addAnnotation(AT.createAnnotation(AT.ANNOTATION_ERROR, 283, 305, "Expected COLON at line 17, col 8."));
	 		annotationModel.addAnnotation(AT.createAnnotation(AT.ANNOTATION_WARNING, 376, 382, "Unknown property 'text-a'."));
		}
	}
	exports.setupView = setupView;
	

	return exports;
});
