/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 * 				 Casey Flynn - Google Inc - Refactor for new styles.
 ******************************************************************************/
/*eslint-env browser, amd*/

define([],
	function() {
		function writeStyleString(themeClass, settings) {
			if (!settings || !settings.styles) {
				return "";
			}
			
			var parseStyles = function(object, ancestors, className, result) {
				if (!ancestors) {
					if (className) {
						parseStyles(object, "." + className, className, result);
					} 
					return;
				}
				var localResult = [];
				var keys = Object.keys(object);
				keys.forEach(function(key) {
					var value = object[key];
					if (typeof value === "string") {
						localResult.push("\t" + key + ": " + value + ";"); 
					} else {
						parseStyles(
							value,
							className === key ? ancestors : ancestors + " " +  key,
							className,
							result);
					}
				});
				if (localResult.length) {
					result.push(ancestors +  " {");
					result.push.apply(result, localResult);
					result.push("}");
				}
			};

			var result = [""];
			parseStyles(settings.styles, "", themeClass, result);
			return result.join("\n");
		}
		
		function ThemeSheetWriter(){}
		
		function getSheet(themeClass, settings ){
			var sheet = writeStyleString(themeClass, settings);
			return sheet;
		}
		
		ThemeSheetWriter.prototype.getSheet = getSheet;

		return{
			ThemeSheetWriter:ThemeSheetWriter
		};

	}
);
