/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:  IBM Corporation - initial API and implementation
 *                Casey Flynn - Google Inc
 ******************************************************************************/
/*eslint-env browser, amd*/

define(['orion/Deferred'], function(Deferred) {

	function ThemePreferences(preferences, themeData) {
		this._preferences = preferences;
		this._themeData = themeData;
		var themeInfo = themeData.getThemeStorageInfo();
		var that = this;
		preferences.addEventListener("changed", function (e) {
			if (e.namespace === themeInfo.storage) {
				that.apply();
			}
		});
	}

	ThemePreferences.prototype = /** @lends orion.editor.ThemePreferences.prototype */ {
		_initialize: function(themeInfo, themeData, themeVersion, prefs) {
			var d = new Deferred();
			var styles, selected;
			var versionKey = themeInfo.styleset + "Version"; //$NON-NLS-0$
			var prefsVer = prefs[versionKey];
			var currentVer = 0;
			this._themeVersion = themeVersion;
			try {
				prefsVer = parseFloat(prefsVer);
				currentVer = parseFloat(themeVersion);
			} catch (e) {
			}
			
			if (prefsVer === currentVer || prefsVer > currentVer) {
				// Version matches (or ThemeData hasn't provided an expected version). Trust prefs
				styles = prefs[themeInfo.styleset];
				selected = prefs['selected']; //$NON-NLS-0$
				if (selected) {
					selected = this._parse(selected);
				}
				this._themeVersion = prefsVer;
			} else {
				// Stale theme prefs. Overwrite everything
				styles = null;
				selected = null;
			}

			if (!styles){
				themeData.getStyles().then(function(styles) {
					prefs[themeInfo.styleset] = styles;
					prefs[versionKey] = themeVersion;
					prefs['selected'] = {};
					d.resolve(styles);
				});
			} else {
				if (!selected || selected[themeInfo.selectedKey] === undefined) {
					selected = selected || {};
					prefs['selected'] = selected; //$NON-NLS-0$
				}
				// prefs have now been updated
				prefs[versionKey] = this._themeVersion;
				d.resolve(true);
			}
			return d;
		},
		_convertThemeStylesToHierarchicalFormat: function(styles) {
			return {
				name: styles.name,
				className: styles.name,
				styles: {
					/* top-level properties */
					backgroundColor: styles.background,
					color: styles.text,
					fontFamily: styles.fontFamily,
					fontSize: styles.fontSize,

					/* from textview.css */
					textviewRightRuler: {
						borderLeft: "1px solid " + styles.annotationRuler //$NON-NLS-0$
					},
					textviewLeftRuler: {
						borderRight: "1px solid " + styles.annotationRuler //$NON-NLS-0$
					},

					split: {
						background: styles.background
					},

					/* from rulers.css */
					ruler: {
						backgroundColor: styles.annotationRuler,
						overview: {
							backgroundColor: styles.overviewRuler
						}
					},
					rulerLines: {
						even: {
							color: styles.lineNumberEven
						},
						odd: {
							color: styles.lineNumberOdd
						}
					},

					/* from annotations.css */
					annotationLine: {
						currentLine: {
							backgroundColor: styles.currentLine
						}
					},

					/* from textstyler.css */
					comment: {
						color: styles.comment
					},
					constant: {
						color: "blue" //$NON-NLS-0$
					},
					entity: {
						name: {
							color: "#7D7755", //$NON-NLS-0$
							"function": { //$NON-NLS-0$
								fontWeight: "bold", //$NON-NLS-0$
								color: "#007b78" //$NON-NLS-0$
							}
						},
						other: {
							"attribute-name": { //$NON-NLS-0$
								color: styles.attribute
							}
						}
					},
					keyword: {
						control: {
							color: styles.keyword,
							fontWeight: "bold" //$NON-NLS-0$
						},
						operator: {
							color: styles.keyword,
							fontWeight: "bold" //$NON-NLS-0$
						},
						other: {
							documentation: {
								color: "#37739f" //$NON-NLS-0$
							}
						}
					},
					markup: {
						bold: {
							fontWeight: "bold" //$NON-NLS-0$
						},
						heading: {
							color: "blue" //$NON-NLS-0$
						},
						italic: {
							fontStyle: "italic" //$NON-NLS-0$
						},
						list: {
							color: "#c04600" //$NON-NLS-0$
						},
						other: {
							separator: {
								color: "#00008F" //$NON-NLS-0$
							},
							strikethrough: {
								textDecoration: "line-through" //$NON-NLS-0$
							},
							table: {
								color: "#157B07" //$NON-NLS-0$
							}
						},
						quote: {
							color: "#314dce" //$NON-NLS-0$
						},
						raw: {
							fontFamily: "monospace" //$NON-NLS-0$
						},
						underline: {
							link: {
								textDecoration: "underline" //$NON-NLS-0$
							}
						}
					},
					meta: {
						documentation: {
							annotation: {
								color: "#37739f" //$NON-NLS-0$
							},
							tag: {
								color: "#7F7F9F" //$NON-NLS-0$
							}
						},
						tag: {
							color: styles.tag
						}
					},
					string: {
						color: styles.string
					},
					support: {
						type: {
							propertyName: {
								color: "#7F0055" //$NON-NLS-0$
							}
						}
					},
					variable: {
						language: {
							color: "#7F0055", //$NON-NLS-0$
							fontWeight: "bold" //$NON-NLS-0$
						},
						other: {
							color: "#DB0FA6" //$NON-NLS-0$
						},
						parameter: {
							color: "#CD2B65" //$NON-NLS-0$
						}
					}
				}
			};
		},
		apply: function() {
			this.setTheme();
		},
		_findStyle: function(styles, name) {
			for (var i = 0; i < styles.length; i++) {
				if (styles[i].name === name) {
					return styles[i];
				}
			}
			return null;
		},
		_getCurrentStyle: function(styles, selectedName) {
			styles = styles || [];
			var themeData = this._themeData;
			var d = new Deferred();
			var style = this._findStyle(styles, selectedName);
			if (!style) {
				themeData.getDefaultTheme().then(function(defaultTheme) {
					style = this._findStyle(styles, defaultTheme) || styles[0];
					d.resolve(style);
				}.bind(this));
			} else {
				d.resolve(style);
			}
			return  d;
		},
		_parse: function(o) {
			return typeof(o) === "string" ? JSON.parse(o) : o; //$NON-NLS-0$
		},
		getTheme: function(callback) {
			var themeData = this._themeData;
			var themeInfo = themeData.getThemeStorageInfo();
			return themeData.getThemeVersion().then(function(themeVersion) {
				return this._preferences.get(themeInfo.storage).then(function(prefs) {
					return this._initialize(themeInfo, themeData, themeVersion, prefs).then(function() {
						var selected = this._parse(prefs['selected']); //$NON-NLS-0$
						var styles = this._parse(prefs[themeInfo.styleset]), style;
						if (styles) {
							/*
							 * Convert the read theme info into the new supported format if the
							 * old format is detected.
							 */
							if (styles.length && styles[0].keyword) { /* indicates old format */
								for (var i = 0; i < styles.length; i++) {
									styles[i] = this._convertThemeStylesToHierarchicalFormat(styles[i]);
								}
							}
						}
						return this._getCurrentStyle(styles, selected[themeInfo.selectedKey]).then(function (style) {
							callback({style: style, styles: styles});
						});
					}.bind(this));
				}.bind(this));
			}.bind(this));
		},
		getProtectedThemes: function(callback) {
			return this._themeData.getProtectedThemes().then(function(protectedThemes) {
				callback(protectedThemes);
			});
		},
		setTheme: function(name, styles) {
			var themeData = this._themeData;
			var themeInfo = themeData.getThemeStorageInfo();
			return themeData.getThemeVersion().then(function(themeVersion) {
				return this._preferences.get(themeInfo.storage).then(function(prefs) {
					return this._initialize(themeInfo, themeData, themeVersion, prefs).then(function() {
						var selected = this._parse(prefs['selected']); //$NON-NLS-0$
						if (!name) {
							name = selected[themeInfo.selectedKey];
						}
						selected[themeInfo.selectedKey] = name;
						prefs['selected'] = selected; //$NON-NLS-0$
						if (styles) {
							prefs[themeInfo.styleset] = styles;
						} else {
							styles = this._parse(prefs[themeInfo.styleset]);
						}
						return this._getCurrentStyle(styles, selected[themeInfo.selectedKey]).then(function(style) {
							themeData.processSettings(style);
							var versionKey = themeInfo.styleset + "Version"; //$NON-NLS-0$
							prefs[versionKey] = this._themeVersion;
							return this._preferences.put(themeInfo.storage, prefs);
						}.bind(this));
					}.bind(this));
				}.bind(this));
			}.bind(this));

		},
		setFontSize: function(size) {
			var themeData = this._themeData;
			var themeInfo = themeData.getThemeStorageInfo();

			return themeData.getThemeVersion().then(function(themeVersion) {
				return this._preferences.get(themeInfo.storage).then(function(prefs) {
					return this._initialize(themeInfo, themeData, themeVersion, prefs).then(function() {
						var selected = this._parse(prefs['selected']); //$NON-NLS-0$
						var styles = this._parse(prefs[themeInfo.styleset]), style;
						if (styles) {
							for( var s = 0; s < styles.length; s++ ){
								styles[s].styles.fontSize = size;
							}
						}
						return this._getCurrentStyle(styles, selected[themeInfo.selectedKey]).then(function(style) {
							prefs[themeInfo.styleset] = styles;
							themeData.processSettings(style);
							return this._preferences.put(themeInfo.storage, prefs);
						}.bind(this));
					}.bind(this));
				}.bind(this));
			}.bind(this));
		}
	};

	return{
		ThemePreferences: ThemePreferences
	};
});
