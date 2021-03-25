/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd, mocha*/
define([
	'chai/chai',
	'js-tests/editor/mockEditor',
	'orion/contentTypes',
	'orion/Deferred',
	'orion/edit/dispatcher',
	'orion/EventTarget',
	'orion/serviceregistry'
], function(chai, MockEditor, mContentTypes, Deferred, mDispatcher, EventTarget, mServiceRegistry) {
	var assert = chai.assert,
	    MIME_FOO = "text/foo",
	    MIME_BAR = "text/bar",
	    MIME_BAZ = "text/baz";
	
	var serviceRegistry, contentTypeRegistry, editor, inputManager, dispatcher;

	/**
	 * Creates the test dependencies. Registers some sample ContentTypes.
	 */
	function setup() {
		serviceRegistry = new mServiceRegistry.ServiceRegistry();
		editor = new MockEditor();
		inputManager = new MockInputManager();
		editor.install();
		serviceRegistry.registerService("orion.core.contenttype", {}, {
			contentTypes:[
				{ id: MIME_FOO },
				{ id: MIME_BAR }
			]
		});
		contentTypeRegistry = new mContentTypes.ContentTypeRegistry(serviceRegistry);
		dispatcher = new mDispatcher.Dispatcher(serviceRegistry, contentTypeRegistry, editor, inputManager);
	}

	function MockInputManager() {
		EventTarget.attach(this);
	}
	MockInputManager.prototype = Object.create(Object.prototype, {
		getContentType: {
			value: function() {
				return this.contentType;
			},
		},
		getFileMetadata: {
			value: function() {
				return this.metadata;
			}
		},
		_setInputContents: {
			/**
			 * Dispatches an InputChanged event, then sets the editor input to the new text.
			 * @see orion.editor.InputManager#_setInputContents
			 */
			value: function(newContentTypeId, contents) {
				this.contentType = contentTypeRegistry.getContentType(newContentTypeId);
				this.dispatchEvent({
					type: "InputChanged",
					contentType: this.contentType,
					contents: contents,
				});
				if (typeof contents === "string") {
					editor.setInput("fake title", null, contents);
				}
			}
		},
		_setFileMetadata: {
			value: function(value) {
				this.metadata = value;
			}
		},
	});

	function registerOrionEditModelService(impl, contentTypes) {
		serviceRegistry.registerService("orion.edit.model", impl, {
			contentType: Array.isArray(contentTypes) ? contentTypes : [contentTypes],
		});
	}

	describe("EditDispatcher Test", function() {
		beforeEach(setup);

		/**
		 * Tests that the initial text of the editor is supplied to the orion.edit.model service
		 * via an onModelChanging event.
		 */
		it("should call #onModelChanging() with initial text", function() {
			var d = new Deferred();
			registerOrionEditModelService({
				onModelChanging: function(event) {
					assert.equal(event.text, "hi");
					d.resolve();
				}
			}, MIME_FOO);
			inputManager._setInputContents(MIME_FOO, "hi");
			return d;
		});
		it("should update listeners after inputManager's InputChanged", function() {
			var fooCall = 0,
			    barCall = 0;
			registerOrionEditModelService({
				onModelChanging: function(/*event*/) {
					fooCall++;
				}
			}, MIME_FOO);
			registerOrionEditModelService({
				onModelChanging: function(/*event*/) {
					barCall++;
				}
			}, MIME_BAR);

			// Input Change -- should call foo's listener
			inputManager._setInputContents(MIME_FOO, "a");
			assert.equal(fooCall, 1, "foo listener called after InputChanged");
			assert.equal(barCall, 0, "bar listener not called yet");

			// InputChange -- should call bar's listener
			inputManager._setInputContents(MIME_BAR, "b");
			assert.equal(barCall, 1, "bar listener called after InputChanged");
		});
		// Test for Case 1 of https://bugs.eclipse.org/bugs/show_bug.cgi?id=445559
		it("should not call listener for the wrong content type", function() {
			var fooCall = 0,
			    barCall = 0;
			registerOrionEditModelService({
				onModelChanging: function(/*event*/) {
					fooCall++;
				}
			}, MIME_FOO);
			registerOrionEditModelService({
				onModelChanging: function(/*event*/) {
					barCall++;
				}
			}, MIME_BAR);

			inputManager._setInputContents(MIME_FOO, "a");
			inputManager._setInputContents(MIME_BAR, "b");
			inputManager._setInputContents(MIME_BAZ, "c");
			assert.equal(fooCall, 1, "foo listener called only once");
			assert.equal(barCall, 1, "bar listener called only once");
		});
		// Test for Case 2 of https://bugs.eclipse.org/bugs/show_bug.cgi?id=445559
		it("should not call listener for the wrong content type when switching files with _setInputContents", function() {
			// Open an unknown content type
			// Switch to text/foo via _setInputContents
			// foo listener should be called exactly once
			var fooCall = 0;
			registerOrionEditModelService({
				onModelChanging: function(/*event*/) {
					fooCall++;
				}
			}, MIME_FOO);

			inputManager._setInputContents("bogus/bogus", "a");
			assert.equal(fooCall, 0, "foo listener not called");
			inputManager._setInputContents(MIME_FOO, "b");
			assert.equal(fooCall, 1, "foo listener called exactly once");
		});
		it("should augment dispatched event with file metadata", function() {
			var metadata = { Location: "/foo/bar.js", Name: "bar.js" };
			var d1 = new Deferred(), d2 = new Deferred();
			registerOrionEditModelService({
				onModelChanging: function(event) {
					try {
						assert.equal(event.file.location, metadata.Location);
						assert.equal(event.file.name,     metadata.Name);
						d1.resolve();
					} catch (e) {
						d1.reject(e);
					}
				},
				onVerify: function(event) {
					try {
						assert.equal(event.file.location, metadata.Location);
						assert.equal(event.file.name,     metadata.Name);
						d2.resolve();
					} catch (e) {
						d2.reject(e);
					}
				},
			}, MIME_FOO);
			inputManager._setFileMetadata(metadata);
			inputManager._setInputContents(MIME_FOO, "");
			editor.setText("whatever"); // will cause a dispatch of Verify and InputChanged events
			return Deferred.all([d1, d2]);
		});
	});
});
