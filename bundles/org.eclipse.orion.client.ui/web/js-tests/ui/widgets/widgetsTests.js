/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Casey Flynn - Google Inc. - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd, mocha*/
define([
	'chai/chai',
	'orion/widgets/themes/container/ThemeSheetWriter',
	'orion/widgets/themes/container/ThemeData',
	'orion/widgets/themes/ThemeBuilder',
	'orion/widgets/settings/GeneralSettings',
	'orion/Deferred',
], function(chai, ThemeSheetWriter, ThemeData, ThemeBuilder, GeneralSettings, Deferred) {
	var assert = chai.assert;

	describe("Widgets", function() {
		describe("GeneralSettings", function() {
			var generalSettingsWidget;
			
			var preferences = {};
			var mockPrefs = {
				getPrefs: function() {
					var d = new Deferred();
					d.resolve(preferences);
					return d;
				},
				setPrefs: function(prefs) {
					preferences = prefs;
				}
			};

			var setUp = function() {
				generalSettingsWidget = new GeneralSettings({
					preferences: mockPrefs
				});
			};

			beforeEach(setUp);

			it("Should properly set preferences and preserve existing values", function() {
				var expected = "unchanged";
				var desktopSelectionPolicy = true;
				var filteredResources = ".git";
				
				//condition under test
				preferences.underTest = expected;
				
				// set mock functions to retrieve values for existing settings
				generalSettingsWidget.generalFields = [{
					isChecked: function() {return desktopSelectionPolicy;}
				},{
					getValue: function() {return filteredResources;}
				}];
				
				generalSettingsWidget.setPreferences().then(function() {
					assert.equal(preferences.desktopSelectionPolicy, desktopSelectionPolicy);
					assert.equal(preferences.filteredResources, filteredResources);
					assert.equal(preferences.underTest, expected);
				});
			});
		});
		describe("Themes", function() {
			describe("Container Theme Data Tests", function() {
				var themeData;
				var setUp = function() {
					themeData = new ThemeData.ThemeData();
				};
				var tearDown = function() {
					themeData = null;
				};

				beforeEach(setUp);
				afterEach(tearDown);

				it("Should return 2 default style strings", function() {
					var expected = 2;
					themeData.getStyles().then(function(actual) {
						assert.isArray(actual);
						assert.equal(actual.length, expected);						
					});
				});
				it("Should return protected themes", function() {
					var expected = 2;
					themeData.getProtectedThemes().then(function(actual) {
						assert.isArray(actual);
						assert.equal(actual.length, expected);
					});
				});
			}),
			describe("Theme Sheet Writer Tests", function() {
				
				var themeSheetWriter;

				var setUp = function() {
					themeSheetWriter = new ThemeSheetWriter.ThemeSheetWriter();
				},

				tearDown = function() {
					themeSheetWriter = null;
				};

				beforeEach(setUp);
				afterEach(tearDown);

				it("Should write a valid style string", function() {
					var settings = {
						"styles": {
							".selector" : {
								"attribute" : "value"
							}
						}
					};
					
					var expected = "\n"+
						".orionPage .selector {\n"+
						"\tattribute: value;\n"+
						"}";
					
					
					var actual = themeSheetWriter.getSheet("orionPage", settings);
					assert.equal(actual, expected);				
				});
				it("Should write a valid style string - 2", function() {
					var settings = {
						"styles": {
							".multi.selector" : {
								"attribute0" : "value0"
							},
							".selector" : {
								".nested.multi.selector" : {
									"attribute1" : "value1",
									"attribute2" : "value2"
								},
								"attribute3" : "value3"
							},
							"#idSelector" : {
								"attribute4" : "value4"
							}
						}
					};
					
					var expected = "\n"+
						".orionPage .multi.selector {\n"+
						"	attribute0: value0;\n"+
						"}\n"+
						".orionPage .selector .nested.multi.selector {\n"+
						"	attribute1: value1;\n"+
						"	attribute2: value2;\n"+
						"}\n"+
						".orionPage .selector {\n"+
						"	attribute3: value3;\n"+
						"}\n"+
						".orionPage #idSelector {\n"+
						"	attribute4: value4;\n"+
						"}";
					
					var actual = themeSheetWriter.getSheet("orionPage", settings);
					assert.equal(actual, expected);				
				});
				it("Should return an empty style if no className is specified", function() {
					var settings = {
						"styles": {
							".selector" : {
								"attribute" : "value"
							}
						}
					};
					
					var expected = "";
					var actual = themeSheetWriter.getSheet(null, settings);
					assert.equal(actual, expected);				
				});
				it ("Should return an empty style if style is invalid if bad parameters are passed", function() {
					var expected = "";
					var actual = themeSheetWriter.getSheet(null, null);
					assert.equal(expected, actual);
					actual = themeSheetWriter.getSheet(null, "");
					assert.equal(expected, actual);
					actual = themeSheetWriter.getSheet(null, []);
					assert.equal(expected, actual);
				});
			});
			
			describe("ThemeBuilder", function() {
							
				var themeBuilder;

				var setUp = function() {
					themeBuilder = new ThemeBuilder({
						themeData: {},
						toolbarId: {},
						serviceRegistry: {getService: function () {}},
						
					});
				},
	
				tearDown = function() {
					themeBuilder = null;
				};
	
				beforeEach(setUp);
				afterEach(tearDown);
				describe("updateValue", function() {
					it("should replace hex values", function() {
						var target, value, expected, actual;
						target = "#FFFFFF";
						value = "#000000";
						expected = "#000000";
						actual = themeBuilder.updateValue(target, value);
						assert.equal(expected, actual);
					});
					it("should replace rgb values", function() {
						var target, value, expected, actual;
						target = "rgb(5,4,3)";
						value = "#000000";
						expected = "rgb(0, 0, 0)";
						actual = themeBuilder.updateValue(target, value);
						assert.equal(expected, actual);
					});
					it("should replace rgba values", function() {
						var target, value, expected, actual;
						target = "rgba(1, 1, 1, .5)";
						value = "#000000";
						expected = "rgba(0, 0, 0, .5)";
						actual = themeBuilder.updateValue(target, value);
						assert.equal(expected, actual);
					});
					it("should retain !important flag", function() {
						var target, value, expected, actual;
						target = "rgba(1, 1, 1, 0.25) !important";
						value = "#000000";
						expected = "rgba(0, 0, 0, 0.25) !important";
						actual = themeBuilder.updateValue(target, value);
						assert.equal(expected, actual);
					});
					it("should retain information before the color value", function() {
						var target, value, expected, actual;
						target = "0 1px 2px 0 rgba(60, 113, 179, 0.25)";
						value = "#000000";
						expected = "0 1px 2px 0 rgba(0, 0, 0, 0.25)";
						actual = themeBuilder.updateValue(target, value);
						assert.equal(expected, actual);
					});
					it("should return value", function() {
						var target, value, expected, actual;
						target = "15px";
						value = "8px";
						expected = "8px";
						actual = themeBuilder.updateValue(target, value);
						assert.equal(expected, actual);
					});
				});
				describe("getValue", function() {
					it("should retrieve a 6 digit hex value", function() {
						var value, expected, actual;
						value = "#0A9B0C";
						expected = "#0A9B0C";
						actual = themeBuilder.getValue(value);
						assert.equal(expected, actual);
					});
					it("should retrieve a 3 digit hex value", function() {
						var value, expected, actual;
						value = "#AB9";
						expected = "#AB9";
						actual = themeBuilder.getValue(value);
						assert.equal(expected, actual);
					});
					it("should retrieve rgb value", function() {
						var value, expected, actual;
						value = "rgb(176, 160, 208)";
						expected = "#B0A0D0";
						actual = themeBuilder.getValue(value);
						assert.equal(expected, actual);
					});
					it("should retrieve rgba value", function() {
						var value, expected, actual;
						value = "rgba(84, 250, 104, 0.25)";
						expected = "#54FA68";
						actual = themeBuilder.getValue(value);
						assert.equal(expected, actual);
					});
					it("should retrieve value when string contains other information after value", function() {
						var value, expected, actual;
						value = "!important #099044 !important";
						expected = "#099044";
						actual = themeBuilder.getValue(value);
						assert.equal(expected, actual);
					});
					it("should retrieve value when string contains other information before value", function() {
						var value, expected, actual;
						value = "0 1px 2px 0 rgb(60, 113, 179)";
						expected = "#3C71B3";
						actual = themeBuilder.getValue(value);
						assert.equal(expected, actual);
					});
					it("should return value", function() {
						var value, expected, actual;
						value = "8px";
						expected = "8px";
						actual = themeBuilder.getValue(value);
						assert.equal(expected, actual);
					});
				});
				describe("hexToRGB", function() {
					it("should correctly parse 6 digit hex value", function() {
						var value, expected, actual;
						value = "#54FA68";
						expected = {"r": 84, "g": 250, b: 104};
						actual = themeBuilder.hexToRGB(value);
						assert.deepEqual(expected, actual);
					});
					it("should correctly parse 6 digit hex value", function() {
						var value, expected, actual;
						value = "#ABC";
						expected = {"r": 170, "g": 187, "b": 204};
						actual = themeBuilder.hexToRGB(value);
						assert.deepEqual(expected, actual);
					});
					it("should correctly throw error for invalid value", function() {
						var value;
						value = "INVALID";
						assert.throws(themeBuilder.hexToRGB, Error);
					});
				});
			});
		});
	});
});
