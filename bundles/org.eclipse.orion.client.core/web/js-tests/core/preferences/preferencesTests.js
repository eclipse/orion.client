/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 * 				 Google Inc. - Casey Flynn (caseyflynn@google.com)
 ******************************************************************************/
/*eslint-env browser, amd, mocha*/
define([
	"chai/chai",
	"orion/Deferred",
	"orion/preferences",
	"mocha/mocha"
], function(chai, Deferred, Preferences) {
	var assert = chai.assert;

	function saveStorage(storage) {
		var strage = storage || localStorage;
		var stash = [], i, len, key;
		for (i = 0, len = strage.length; i < len; i++) {
			key = strage.key(i);
			stash.push({key:key, value:strage.getItem(key)});
		}
		return stash;
	}

	function restoreStorage(stash, storage) {
		var i, len;
		var strage = storage || localStorage;
		for (i = 0, len = stash.length; i < len; i++) {
			strage.setItem(stash[i].key, stash[i].value);
		}
	}
	describe("preferences", function() {
		it("localStorage", function() {
			var stash = saveStorage();
			try {
				assert.equal(localStorage.getItem("test localStorage"), null);
				localStorage.setItem("test localStorage", true);
				assert.ok(localStorage.getItem("test localStorage"));
				assert.equal(localStorage.length, stash.length + 1);

//	These commented out tests are what I was using to figure out how null and undefined are handled
//	The answer... inconsistently so really truly use strings only.

//				storage.setItem("test localStorage", undefined);
//				assert.equal(localStorage.getItem("test localStorage"), "undefined");
//				localStorage.setItem("test localStorage", "undefined");
//				assert.equal(localStorage.getItem("test localStorage"), "undefined");
//				localStorage.setItem("test localStorage", null);
//				assert.equal(localStorage.getItem("test localStorage"), "null");
//				localStorage.setItem("test localStorage", "null");
//				assert.equal(localStorage.getItem("test localStorage"), "null");

				assert.equal(localStorage.length, stash.length + 1);
				localStorage.removeItem("test localStorage");

				assert.equal(localStorage.length, stash.length);

				localStorage.clear();
				assert.equal(localStorage.length, 0);
			} finally {
				restoreStorage(stash);
			}
		});

		describe.skip("DISABLING FOR NOW test storage eventing", function() {
			var d = new Deferred();
			function handleStorage(evnt) {
				var e = evnt || window.event;
				if (!e.key) {
					return;
				}
				console.log("key=" + e.key + ", oldValue=" + e.oldValue + ", newValue=" + e.newValue);
				if (e.newValue === null) {
					d.resolve(true);
				}
			}

			window.addEventListener("storage", handleStorage, false);

			top.localStorage.setItem("test", "test-value");
			top.localStorage.removeItem("test");
			return d;
		});
		describe("Cache", function(){
			var pageLocalStorage;

			var mockLocalStorage = (function() {
				var s = {};
				return {
					getItem: function (key) {
						return s.hasOwnProperty(key) ? s[key] : null;
					},
					setItem: function (key, value) {
						console.log("setting:" + key + " val:" + value);
						s[key] = value;
					},
					removeItem: function (key) {
						if (s.hasOwnProperty(key)) {
							delete s[key];
						}
					},
					storage : s
				};
			})();

			var setUp = function() {
				pageLocalStorage = window.localStorage;
				Object.defineProperty(window, "localStorage", {
				  value: mockLocalStorage
				});
			};

			var tearDown = function() {
				Object.defineProperty(window, "localStorage", {
				  value: pageLocalStorage
				});
			};

			beforeEach(setUp);
			afterEach(tearDown);

			it("Should successfully set a value", function(){
				var cache = new Preferences.Cache("test/", 60*60);
				var expectedValue = "value";
				var expectedJSON = JSON.stringify(expectedValue);
				cache.set("key", expectedValue);
				assert.equal(mockLocalStorage.storage["test/key"], expectedJSON);
			});

			it("Should successfully get a value", function(){
				var cache = new Preferences.Cache("test/", 60*60);
				var expectedValue = "value";
				mockLocalStorage.storage["test/key"] = JSON.stringify(expectedValue);
				var actualValue = cache.get("key", true);
				assert.equal(expectedValue, actualValue);
			});

			it("Should successfully delete a value", function(){
				var cache = new Preferences.Cache("test/", 60*60);
				var expectedValue = "value";
				mockLocalStorage.storage["test/key"] = JSON.stringify(expectedValue);
				assert.property(mockLocalStorage.storage, "test/key");
				cache.remove("key");
				assert.notProperty(mockLocalStorage.storage, "test/key");
			});

			it("Should return null for missing value", function() {
				var cache = new Preferences.Cache("test/", 60*60);
				var actual = cache.get("DoesNotExist", true);
				assert.isNull(actual);
			});

			it("Should return null due to zero cache time", function() {
				var cache = new Preferences.Cache("test/", 0);
				cache.set("key", "value");
				var actual = cache.get("key", false);
				assert.isNull(actual);
			});

			it("Should return null due to cache expire", function() {
				var cache = new Preferences.Cache("test/", 0.0001);
				cache.set("key", "value");
				var actual = cache.get("key", false);
				assert.isNull(actual);
			});

			it("Should return null due to JSON parse error", function() {
				var cache = new Preferences.Cache("test/", 60*60);
				mockLocalStorage.storage["test/key"] = "NotValidJSON";
				var actual = cache.get("key", true);
				assert.isNull(actual);
				assert.notProperty(mockLocalStorage.storage, "test/key");
			});
		});
	});
});
