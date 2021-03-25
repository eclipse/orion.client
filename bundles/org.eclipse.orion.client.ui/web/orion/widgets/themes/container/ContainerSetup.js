/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: Casey Flynn - Google Inc - initial API and implementation
 *******************************************************************************/

/*eslint-env browser, amd*/
define([
	'orion/editor/textTheme',
	'orion/widgets/themes/container/ThemeSheetWriter',
], function(mTextTheme, ThemeSheetWriter) {

	var exports = {};
		
	function processTheme(themeClass, settings) {
		var sheetMaker = new ThemeSheetWriter.ThemeSheetWriter();
		var themeClass = "orionPage";
		var theme = new mTextTheme.TextTheme.getTheme(themeClass);
		theme.setThemeClass(themeClass, sheetMaker.getSheet(themeClass, settings ));
	}
	exports.processTheme = processTheme;
	
	return exports;
});
