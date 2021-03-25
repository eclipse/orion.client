/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/

define([
		'orion/editor/textTheme',
		'orion/widgets/themes/ThemeVersion',
		'orion/Deferred',
		'orion/objects',

], function(mTextTheme, THEMES_VERSION, Deferred, objects) {

	// *******************************************************************************
	//
	// If you change any styles in this file, you must increment the version number
	// in ThemeVersion.js.
	//
	// *******************************************************************************

		/* Synchronizing colors and styles for HTML, CSS and JS files like this ...
	
			Using Prospecto as an example:
			
			-----------------------------------------------
							CSS         HTML        JS
			-----------------------------------------------
			ORANGE          Class       Tag         Keyword
			darkSlateGray   Text        Text        Text
			darkSeaGreen    Comments    Comments    Comments
			cornFlowerblue  String      String      String
			----------------------------------------------- */
		
		var defaultFont = '"Consolas", "Menlo", "Monaco", "Vera Mono", monospace'; //$NON-NLS-0$
		var defaultFontSize = '12px'; //$NON-NLS-0$
		var prospecto, darker;

		function ThemeData() {

			this.styles = [];
			
			prospecto = {
				"className": "prospecto",
				"name": "Prospecto",
				"styles": {
					"lines":{
						"isTopLevel": true,
						"annotation" : {
							"diffAdded" : {
								"backgroundColor": "rgba(159, 202, 86, 0.68)"
							},
							"diffModified": {
								"color": "#515151",
								"backgroundColor": "rgba(85, 181, 219, 0.67)"
							},
							"blame":{
								"color": "black",
								"backgroundColor": "rgb(255, 132, 44)"
							},
							"currentBlame":{
								"color": "#1B1B1B",
								"backgroundColor": "rgb(184, 103, 163)"
							}
						}
					},
					"annotationOverview":{
						"warning": {
							"backgroundColor": "#B27F21"
						},
						"info":{
							"backgroundColor": "#001DF5"
						},
						"error":{
							"backgroundColor": "#EC3324"
						},
						"diffDeleted":{
							"color": "#EC111D"
						}
					},
					"annotationLine": {
						"searchRange": {
							"backgroundColor": "#D3D3D3"
						},
						"currentLine": {
							"backgroundColor": "#EAF2FE"
						},
						"highlightedLine": {
							"backgroundImage": "linear-gradient(rgba(255, 255, 153, .5) 100%, rgba(255, 255, 153, .5))"
						}
					},
					"annotationRange": {
						"currentBracket": {
							"backgroundColor": "#ADFFAD"
						},
						"matchingBracket": {
							"backgroundColor": "#ADFFAD"
						},
						"matchingSearch": {
							"backgroundColor": "#C3E1FF",
							"outline": "1px solid",
							"outlineColor": "rgba(24, 159, 227, 0)",
							"currentSearch": {
								"backgroundColor": "#53D1FF"
							}
						},
						"writeOccurrence": {
							"backgroundColor": "#ECD099"
						},
						"readOccurrence": {
							"backgroundColor": "#CACACA"
						}
					},
					"backgroundColor": "#FFFFFF",
					"color": "#151515",
					"comment": {
						"color": "#157B07"
					},
					"constant": {
						"color": "#9932CC",
						"numeric": {
							"color": "#9932CC",
							"hex": {
								"color": "#9932CC"
							}
						}
					},
					"entity": {
						"name": {
							"color": "#7D7755",
							"function": {
								"color": "#007B78",
								"fontWeight": "bold"
							}
						},
						"other": {
							"attribute-name": {
								"color": "#5F9EA0"
							}
						}
					},
					"fontFamily": defaultFont,
					"fontSize": defaultFontSize,
					"keyword": {
						"control": {
							"color": "#C04600",
							"fontWeight": "bold"
						},
						"operator": {
							"color": "#9F4177",
							"fontWeight": "bold"
						},
						"other": {
							"documentation": {
								"color": "#37739F",
								"task": {
									"color": "#006DD4"
								}
							},
							"directive" : {
								"color": "#9F4177"
							}
						}
					},
					"markup": {
						"bold": {
							"fontWeight": "bold"
						},
						"heading": {
							"color": "#0000FF"
						},
						"italic": {
							"fontStyle": "italic"
						},
						"list": {
							"color": "#C04600"
						},
						"other": {
							"separator": {
								"color": "#00008F"
							},
							"strikethrough": {
								"textDecoration": "line-through"
							},
							"table": {
								"color": "#157B07"
							}
						},
						"quote": {
							"color": "#314DCE"
						},
						"raw": {
							"fontFamily": "monospace",
							"html": {
								"backgroundColor": "#E4F7EF"
							}
						},
						"underline": {
							"link": {
								"textDecoration": "underline"
							}
						}
					},
					"meta": {
						"documentation": {
							"annotation": {
								"color": "#37739F"
							},
							"tag": {
								"color": "#737396"
							}
						},
						"preprocessor": {
							"color": "#A4A4A4"
						},
						"tag": {
							"color": "#C04600",
							"attribute": {
								"color": "#58727E"
							}
						}
					},
					"punctuation": {
						"operator": {
							"color":"#CD2B65"
						}
					},
					"ruler": {
						"annotations": {
							"backgroundColor": "#FFFFFF"
						},
						"backgroundColor": "#FFFFFF",
						"overview": {
							"backgroundColor": "#FFFFFF"
						}
					},
					"rulerLines": {
						"color": "#767676"
					},
					"string": {
						"color": "#314DCE",
						"interpolated": {
							"color": "#151515"
						}
					},
					"support": {
						"type": {
							"propertyName": {
								"color": "#9F4177"
							}
						}
					},
					"textviewContent ::-moz-selection": {
						"backgroundColor": "rgba(180,213,255,0.99)"
					},
					"textviewContent ::selection": {
						"backgroundColor": "rgba(180,213,255,0.99)"
					},
					"textviewLeftRuler": {
						"borderColor": "#FFFFFF"
					},
					"textviewRightRuler": {
						"borderColor": "#FFFFFF"
					},
					"textviewSelection": {
						"backgroundColor": "rgba(180,213,255,0.99)"
					},
					"textviewSelectionUnfocused": {
						"backgroundColor": "rgba(180,213,255,0.99)"
					},
					"variable": {
						"language": {
							"color": "#7F0055",
							"fontWeight": "bold"
						},
						"other": {
							"color": "#DB0FA6"
						},
						"parameter": {
							"color": "#CD2B65"
						}
					}
				}
			};
			this.styles.push(prospecto);

			darker = {
				"className": "darker",
				"name": "Dark",
				"styles": {
					"fontFamily": defaultFont,
					"fontSize": defaultFontSize,
					"lines":{
						"isTopLevel": true,
						"annotation" : {
							"diffAdded" : {
								"color" : "rgb(36, 36, 36)",
								"backgroundColor": "rgb(116, 149, 73)"
							},
							"diffModified": {
								"color" : "rgb(19, 19, 19)",
								"backgroundColor": "rgb(66, 133, 162)"
							},
							"blame":{
								"color": "#EBEBEB",
								"backgroundColor": "rgb(177, 74, 0)"
							},
							"currentBlame":{
								"backgroundColor": "rgb(148, 53, 211)"
							}
						}
					},
					"annotationOverview":{
						"warning": {
							"backgroundColor": "#FFFF00"
						},
						"info":{
							"backgroundColor": "#65C8FF"
						},
						"error":{
							"backgroundColor": "#FF898C"
						},
						"diffDeleted":{
							"color": "#FF0000"
						}
					},
					"annotationLine": {
						"searchRange": {
							"backgroundColor": "#6C7279"
						},
						"currentLine": {
							"color": "#1bd2f7",
							"backgroundColor": "#3B4B53"
						},
						"highlightedLine": {
							"backgroundImage": "linear-gradient(rgba(255, 255, 153, .5) 100%, rgba(255, 255, 153, .5))"
						}
					},
					"annotationRange": {
						"currentBracket": {
							"color": "#94EAFB",
							"backgroundColor": "#006E00"
						},
						"currentSearch": {
							"backgroundColor": "#5d5d5d"
						},
						"matchingBracket": {
							"color": "#94EAFB",
							"backgroundColor": "#006E00"
						},
						"matchingSearch": {
							"backgroundColor": "#363636",
							"outline": "1px solid",
							"outlineColor": "rgba(24, 159, 227, 1)",
							"currentSearch": {
								"backgroundColor": "#465E47"
							}
						},
						"writeOccurrence": {
							"backgroundColor": "#093f59",
							"outline": "1px solid #BEA100"
						},
						"readOccurrence": {
							"backgroundColor": "#CACACA",
							"outline": "1px solid #BEA100"
						},
						"selectedLinkedGroup": {
							"backgroundColor": "rgb(16,106,91)",
							"outline": "1px solid #BEA100"
						},
						"currentLinkedGroup": {
							"backgroundColor": "rgba(16,106,91,0.8)",
							"outline": "1px solid #BEA100"
						},
						"warning":{
							"backgroundImage": "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAAC09K7GAAAAHUlEQVQYV2NkgIL//xn+MzIyMDKC+DAOmIZxYCoBNEkMAR1F6ZQAAAAASUVORK5CYII=)"
						},
						"info":{
							"backgroundImage": "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAAC09K7GAAAAH0lEQVQYV2NkgILUE///z7ZgZGQE8WEcEM0I48BUAgB9cA8vM5pJ1QAAAABJRU5ErkJggg==)"
						},
						"error":{
							"backgroundImage": "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAAC09K7GAAAAHUlEQVQYV2NkgIL/nT3/GctLGBlBfBgHTMM4MJUAe30PF+f8aegAAAAASUVORK5CYII=)"
						}
					},
					"backgroundColor": "#26343F",
					"color": "#07ADCF",
					"comment": {
						"color": "#ADB9C0",
					},
					"constant": {
						"color": "#F47D64",
						"numeric": {
							"color": "#D3AAFE"
						}
					},
					"entity": {
						"name": {
							"color": "#98937B",
							"function": {
								"color": "#7EC5C3",
								"fontWeight": "bold"
							}
						},
						"other": {
							"attribute-name": {
								"color": "#01B199"
							}
						}
					},
					"keyword": {
						"control": {
							"color": "#FCD600",
							"fontWeight": "bold"
						},
						"operator": {
							"color": "#FFFFFF",
							"fontWeight": "bold"
						},
						"other": {
							"documentation": {
								"color": "#7F9FBF",
								"task": {
									"color": "#8DB6F1"
								}
							},
							"directive" : {
								"color": "#DAA1C0"
							}
						}
					},
					"markup": {
						"bold": {
							"fontWeight": "bold"
						},
						"heading": {
							"color": "#91C23D"
						},
						"italic": {
							"fontStyle": "italic"
						},
						"list": {
							"color": "#CC4C07"
						},
						"other": {
							"separator": {
								"color": "#E8D075"
							},
							"strikethrough": {
								"textDecoration": "line-through"
							},
							"table": {
								"color": "#3C802C"
							}
						},
						"quote": {
							"color": "#446FBD"
						},
						"raw": {
							"fontFamily": "monospace",
							"html": {
								"backgroundColor": "#696969",
								"color": "white"
							}
						},
						"underline": {
							"link": {
								"textDecoration": "underline"
							}
						}
					},
					"meta": {
						"documentation": {
							"annotation": {
								"color": "#A1BAD5"
							},
							"tag": {
								"color": "#9898B2"
							}
						},
						"preprocessor": {
							"color": "#A4A4A4"
						},
						"tag": {
							"color": "#C0BDDC"
						}
					},
					"punctuation": {
						"operator": {
							"color":"#FFA83E"
						}
					},
					"ruler": {
						"backgroundColor": "#26343F"
					},
					"rulerLines": {
						"color": "#93A2AA",
					},
					"string": {
						"color": "#01D1B6",
						"interpolated": {
							"color": "#DADADA"
						}
					},
					"support": {
						"type": {
							"propertyName": {
								"color": "#FFFFFF"
							}
						}
					},
					"textviewContent ::-moz-selection": {
						"backgroundColor": "rgba(16,106,91,0.99)"
					},
					"textviewContent ::selection": {
						"backgroundColor": "rgba(16,106,91,0.99)"
					},
					"textviewLeftRuler": {
						"borderRight": "1px solid #424C53"
					},
					"textviewRightRuler": {
						"borderLeft": "1px solid #424C53"
					},
					"textviewSelection": {
						"backgroundColor": "rgba(16,106,91,0.99)"
					},
					"textviewSelectionUnfocused": {
						"backgroundColor": "rgba(16,106,91,0.99)"
					},
					"variable": {
						"language": {
							"color": "#9994CA",
							"fontWeight": "bold"
						},
						"other": {
							"color": "#E038AD"
						},
						"parameter": {
							"color": "#8CD211"
						}
					}
				}
			};
			this.styles.push(darker);
		}
		
		function getStyles(){
			var d = new Deferred();
			d.resolve(this.styles);
			return d;
		}
		
		ThemeData.prototype.styles = [];
		ThemeData.prototype.getStyles = getStyles;

		function getBaseTheme(options) {
			/* return a copy of the appropriate theme definition */
			return JSON.parse(JSON.stringify((options || {}).dark ? darker : prospecto));
		}
		ThemeData.prototype.getBaseTheme = getBaseTheme;
		
		function getDefaultTheme() {
			var d = new Deferred();
			var useLightTheme = document.body.classList.contains("lightPage");
			var defaultTheme = useLightTheme ? 'Prospecto' : 'Dark';
			d.resolve(defaultTheme);
			return d;
		}
		ThemeData.prototype.getDefaultTheme = getDefaultTheme;
		
		function getProtectedThemes() {
			var d = new Deferred();
			d.resolve(["Prospecto", "Dark"]);
			return d;
		}

		ThemeData.prototype.getProtectedThemes = getProtectedThemes;

		var fontSettable = true;
		
		ThemeData.prototype.fontSettable = fontSettable;
		
		function getThemeVersion() {
			var d = new Deferred();
			d.resolve(THEMES_VERSION);
			return d;
		}
		
		ThemeData.prototype.getThemeVersion = getThemeVersion;
		
		function getThemeStorageInfo(){	
			var useLightTheme = document.body.classList.contains("lightPage");
			return {
				storage: '/themes', //$NON-NLS-0$
				styleset: 'editorstyles', //$NON-NLS-0$
				selectedKey: 'editorSelected', //$NON-NLS-0$
			}; 
		}
		ThemeData.prototype.getThemeStorageInfo = getThemeStorageInfo;

		function processSettings(settings) {
			var themeClass = "editorTheme"; //$NON-NLS-0$
			var theme = mTextTheme.TextTheme.getTheme();
			theme.setThemeClass(themeClass, theme.buildStyleSheet(themeClass, settings));
		}
		ThemeData.prototype.processSettings = processSettings;

		return {
			ThemeData: ThemeData,
			getStyles: getStyles,
			getBaseTheme: getBaseTheme
		};
	}
);
