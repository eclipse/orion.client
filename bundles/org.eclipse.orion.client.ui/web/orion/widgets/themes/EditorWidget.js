/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 * Contributors: Casey Flynn - Google Inc - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/

define(['i18n!orion/settings/nls/messages',
		'orion/webui/littlelib', 
		'orion/widgets/themes/editor/editorSetup',
		'text!examples/js-demo.js',
		'text!examples/html-demo.html',
		'text!examples/css-demo.css',
		'text!examples/java-demo.java'],
function(messages, lib, mSetup, jsExample, htmlExample, cssExample, javaExample) {
	
	var editorLanguage;
	var htmlExclusions = ["editorThemeColorEntityColor", "editorThemeFunctionParameterColor", "editorThemePropertyName", "editorThemeMetaTag", "editorThemeMetaTagAttribute","editorThemeDirectiveTask","editorThemeWaveWarning","editorThemeWaveInfo","editorThemeWaveError","editorThemeLinesAnnotationAMDiffAdded","editorThemeLinesAnnotationAMDiffModifed","editorThemeLinesAnnotationDDiffDeleted","editorThemeBlame","editorThemeCurrentBlame"];
	var jsExclusions = ["editorThemePropertyName", "editorThemeMetaTag", "editorThemeMetaTagAttribute","editorThemeDirectiveTask"];
	var javaExclusions = ["editorThemeColorEntityColor", "editorThemeFunctionParameterColor", "editorThemePropertyName", "editorThemeMetaTag", "editorThemeMetaTagAttribute","editorThemeDirectiveTask","editorThemeWaveWarning","editorThemeWaveInfo","editorThemeWaveError","editorThemeLinesAnnotationAMDiffAdded","editorThemeLinesAnnotationAMDiffModifed","editorThemeLinesAnnotationDDiffDeleted","editorThemeBlame","editorThemeCurrentBlame"];
	var cssExclusions = ["editorThemeColorEntityColor", "editorThemeControlColor", "editorThemeLanguageVariableColor", "editorThemeOperatorColor", "editorThemeFunctionParameterColor", "editorThemeLogicalOperatorColor", "editorThemeMetaTag", "editorThemeMetaTagAttribute","editorThemeLinesAnnotationAMDiffAdded","editorThemeLinesAnnotationAMDiffModifed","editorThemeLinesAnnotationDDiffDeleted","editorThemeBlame","editorThemeCurrentBlame"];
	
	//initializes the default html structure
	EditorWidget.prototype.template = "<div class='editorSection'>" +
											"<div class='editorSectionHeader'>" +
												"<label for='editorLanguage'>${Display Language: }</label>" + 
												"<select id='editorLanguage'>" + 
													"<option value='javascript' selected='selected'>javascript</option>" +
													"<option value='java'>java</option>" +
													"<option value='html'>HTML</option>" +
													"<option value='css'>CSS</option>" +
												"</select>" + 
											"</div>" +
											"<div id='editor' class='themeDisplayEditor'></div>" +
										"</div>";

	function EditorWidget(args) {
		this.scopeList = args.scopeList || [];
	}
	
	function renderData(editorNode) {
		lib.setSafeInnerHTML(editorNode, this.template);
		lib.processTextNodes(editorNode, messages);
		mSetup.setupView(jsExample, "js");
		editorLanguage = document.getElementById("editorLanguage");
		editorLanguage.onchange = this.changeLanguage.bind(this);
	}
	
	EditorWidget.prototype.renderData = renderData;

	function changeLanguage(){
		var language = editorLanguage.options[editorLanguage.selectedIndex].value;

		switch (language) {
			case "javascript":
				mSetup.setupView(jsExample, "js");
				this.updateLHS(jsExclusions);
				break;
			case "html":
				mSetup.setupView(htmlExample, "html");
				this.updateLHS(htmlExclusions);
				break;
			case "css":
				mSetup.setupView(cssExample, "css");
				this.updateLHS(cssExclusions);
				break;
			case "java":
				mSetup.setupView(javaExample, "java");
				this.updateLHS(javaExclusions);
				break;
		}

		return true;
	}
	
	EditorWidget.prototype.changeLanguage = changeLanguage;
	
	function getSelectedExclusions() {
		if (editorLanguage) {
			var language = editorLanguage.options[editorLanguage.selectedIndex].value;
			switch (language) {
				case "javascript":
					return jsExclusions;
				case "html":
					return htmlExclusions;
				case "css":
					return cssExclusions;
				case "java":
					return javaExclusions;
			}
		}
		return jsExclusions;
	}
	EditorWidget.prototype.getSelectedExclusions = getSelectedExclusions;
	
	function updateLHS(exclusions) {
		for (var i = this.scopeList .length - 1; i >= 0; i--) {
			document.getElementById(this.scopeList [i].id).parentNode.style.display = "";
		}

		if (exclusions && exclusions.length > 0) {
			for (i = exclusions.length - 1; i >= 0; i--) {
				document.getElementById(exclusions[i]).parentNode.style.display = "none";
			}
		}
	}
	EditorWidget.prototype.updateLHS = updateLHS;
	
	return EditorWidget;
});
