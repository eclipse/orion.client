/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Casey Flynn - Google Inc - initial API and implementation
 ******************************************************************************/
 /*eslint-env browser,amd*/
define(['i18n!orion/settings/nls/messages'
], function (messages) {
	var defaultColor = "#ff80c0";
	return [
		{
			display: messages["editorTheme font size"],
			objPath: [
				"styles fontSize"
			],
			id: "editorThemeFontSize",
			value: ""
		}, {
			display: messages["editorTheme background"],
			objPath: [
				"styles backgroundColor"
			],
			id: "editorThemeBackground",
			value: defaultColor
		}, {
			display: messages["editorTheme font color"],
			objPath: [
				"styles color"
			],
			id: "editorThemeColor",
			value: defaultColor
		}, {
			display: messages["editorTheme ruler background"],
			objPath: [
				"styles ruler backgroundColor", 
				"styles ruler overview backgroundColor",
				"styles ruler annotations backgroundColor"
			],
			id: "editorThemeRulerBackground",
			value: defaultColor
		}, {
			display: messages["editorTheme ruler color"],
			objPath: [
				"styles rulerLines color",
				"styles rulerLines odd color",
				"styles rulerLines even color"
			],
			id: "editorThemeRulerColor",
			value: defaultColor
		}, {
			display: messages["editorTheme ruler border color"],
			objPath: [
				"styles textviewLeftRuler borderColor",
				"styles textviewRightRuler borderColor"
			], 
			id: "editorThemeRulerBorderColor",
			value: defaultColor
		}, {
			display: messages["editorTheme current line background"],
			objPath: [
				"styles annotationLine currentLine backgroundColor",
				"styles annotationOverview currentLine backgroundColor",
				"styles annotationOverview currentLine borderColor",
			], 
			id: "editorThemeColorCurrentLineBackground", 
			value: defaultColor
		}, {
			display: messages["editorTheme highlighted line background"],
			objPath: [
				"styles annotationLine highlightedLine backgroundImage"
			],
			id: "editorThemeColorHighlightedLineBackground",
			value: defaultColor
		}, {
			display: messages["editorTheme comment"],
			objPath: [
				"styles comment color",
				"styles comment block color",
				"styles comment line color"
			],
			id: "editorThemeCommentColor", 
			value: defaultColor
		}, {
			display: messages["editorTheme language variable"],
			objPath: [
				"styles variable language color"
			],
			id: "editorThemeLanguageVariableColor", 
			value: defaultColor
		}, {
			display: messages["editorTheme language constant"],
			objPath: [
				"styles constant color"
			],
			id: "editorThemeConstantColor", 
			value: defaultColor
		}, {
			display: messages["editorTheme number"],
			objPath: [
				"styles constant numeric color",
				"styles constant numeric hex color"
			],
			id: "editorThemeNumericConstantColor", 
			value: defaultColor
		}, {
			display: messages["editorTheme string"],
			objPath: [
				"styles string color",
				"styles string quoted double color",
				"styles string quoted single color"
			],
			id: "editorThemeStringColor", 
			value: defaultColor
		}, {
			display: messages["editorTheme entity"],
			objPath: [
				"styles entity name color",
				"styles entity name function color"
			],
			id: "editorThemeColorEntityColor", 
			value: defaultColor
		}, {
			display: messages["editorTheme keyword (control)"],
			objPath: [
				"styles keyword control color"
			],
			id: "editorThemeControlColor",
			value: defaultColor
		}, {
			display: messages["editorTheme keyword (operator)"],
			objPath: [
				"styles keyword operator color"
			],
			id: "editorThemeOperatorColor",
			value: defaultColor
		}, {
			display: messages["editorTheme function parameter"],
			objPath: [
				"styles variable parameter color"
			],
			id: "editorThemeFunctionParameterColor",
			value: defaultColor
		}, {
			display: messages["editorTheme comparison and logical operators"],
			objPath: [
				"styles punctuation operator color"
			],
			id: "editorThemeLogicalOperatorColor",
			value: defaultColor
		}, {
			display: messages["editorTheme write occurrence background"],
			objPath: [
				"styles annotationRange writeOccurrence backgroundColor"
			],
			id: "editorThemeWriteOccurrence",
			value: defaultColor
		}, {
			display: messages["editorTheme matching bracket background"],
			objPath: [
				"styles annotationRange matchingBracket backgroundColor",
				"styles annotationRange currentBracket backgroundColor"
			], 
			id: "editorThemeMatchingBracket",
			value: defaultColor
		}, {
			display: messages["editorTheme dark searchmatch box"],
			objPath: [
				"styles annotationRange matchingSearch outlineColor",
			],
			id: "editorThemeDarkSearchmatchBoxColor",
			value: defaultColor
		}, {
			display: messages["editorTheme matching search background"],
			objPath: [
				"styles annotationRange matchingSearch backgroundColor"
			],
			id: "editorThemeMatchingSearch",
			value: defaultColor
		}, {
			display: messages["editorTheme current search background"],
			objPath: [
				"styles annotationRange matchingSearch currentSearch backgroundColor"
			],
			id: "editorThemeCurrentSearch",
			value: defaultColor
		}, {
			display: messages["editorTheme search range background"],
			objPath: [
				"styles annotationLine searchRange backgroundColor"
			],
			id: "editorThemeSearchRange",
			value: defaultColor
		}, {
			display: messages["editorTheme documentation task color"],
			objPath: [
				"styles keyword other documentation task color"
			],
			id: "editorThemeDocumentationTask",
			value: defaultColor
		}, {
			display: messages["editorTheme keyword directive color"],
			objPath: [
				"styles keyword other directive color"
			],
			id: "editorThemeDirectiveTask",
			value: defaultColor
		}, {
			display: messages["editorTheme property name color"],
			objPath: [
				"styles support type propertyName color"
			],
			id: "editorThemePropertyName",
			value: defaultColor
		}, {
			display: messages["editorTheme tag"],
			objPath: [
				"styles meta tag color"
			],
			id: "editorThemeMetaTag",
			value: defaultColor
		}, {
			display: messages["editorTheme tag attribute"],
			objPath: [
				"styles meta tag attribute color"
			],
			id: "editorThemeMetaTagAttribute",
			value: defaultColor
		},{
			display: messages["editorTheme doc annotation attribute"],   
			objPath: [
				"styles meta documentation annotation color"
			],
			id: "editorThemeMetaDocAnnotaionAttribute",
			value: defaultColor
		},{
			display: messages["editorTheme doc tag attribute"],   
			objPath: [
				"styles meta documentation tag color"
			],
			id: "editorThemeMetaDocTagAttribute",
			value: defaultColor
		}, {
			display: messages["editorTheme selection background"],
			objPath: [
				"styles textviewContent ::selection backgroundColor",
				"styles textviewContent ::-moz-selection backgroundColor",
				"styles textviewSelection backgroundColor",
				"styles textviewSelectionUnfocused backgroundColor"
			],
			id: "editorSelection",
			value: defaultColor
		}, {
			display: messages["editorTheme info color"],
			objPath: [
				"styles annotationOverview info backgroundColor",
				"styles annotationOverview info borderColor",
				"styles annotationRange info backgroundImage"
			],
			id: "editorThemeWaveInfo",
			value: defaultColor
		}, {
			display: messages["editorTheme warning color"],
			objPath: [
				"styles annotationOverview warning backgroundColor",
				"styles annotationOverview warning borderColor",
				"styles annotationRange warning backgroundImage"
			],
			id: "editorThemeWaveWarning",
			value: defaultColor
		}, {
			display: messages["editorTheme error color"],
			objPath: [
				"styles annotationOverview error backgroundColor",
				"styles annotationOverview error borderColor",
				"styles annotationRange error backgroundImage"
			],
			id: "editorThemeWaveError",
			value: defaultColor
		}, {
			display: messages["editorTheme lines annotation diffDeleted"],
			objPath: [
				"styles annotationOverview diffDeleted color",
				"styles lines annotation diffDeleted backgroundImage",
				"styles annotation diffDeleted backgroundImage",
				"styles annotationHTML diffDeleted backgroundImage"
			],
			id: "editorThemeLinesAnnotationDDiffDeleted",
			value: defaultColor
		}, {
			display: messages["editorTheme lines annotation diffAdded"],
			objPath: [
				"styles lines annotation diffAdded backgroundColor",
				"styles annotationOverview diffAdded backgroundColor",
				"styles annotation diffAdded backgroundImage",
				"styles annotationHTML diffAdded backgroundImage"
			],
			id: "editorThemeLinesAnnotationAMDiffAdded",
			value: defaultColor
		}, {
			display: messages["editorTheme lines annotation diffModified"],
			objPath: [
				"styles lines annotation diffModified backgroundColor",
				"styles annotationOverview diffModified backgroundColor",
				"styles annotation diffModified backgroundImage",
				"styles annotationHTML diffModified backgroundImage"
			],
			id: "editorThemeLinesAnnotationAMDiffModifed",
			value: defaultColor
		}, {
			display: messages["editorTheme annotation blame"],
			objPath: [
				"styles lines annotation blame backgroundColor",
			],
			id: "editorThemeBlame",
			value: defaultColor
		}, {
			display: messages["editorTheme annotation currentBlame"],
			objPath: [
				"styles lines annotation currentBlame backgroundColor",
				"styles annotationOverview currentBlame backgroundColor",
			],
			id: "editorThemeCurrentBlame",
			value: defaultColor
		}
	];
});
