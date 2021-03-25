/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd, mocha */
/*eslint no-unused-vars:0 */
/*global URL*/

/**
 * Tests the orion.edit.command extensions.
 */
define([
	"chai/chai",
	"js-tests/editor/mockEditor",
	"orion/commandRegistry",
	"orion/contentTypes",
	"orion/Deferred",
	"orion/editorCommands",
	"orion/inputManager",
	"orion/progress",
	"orion/serviceregistry",
	"orion/URL-shim", // no exports
], function(chai, MockEditor, mCommandRegistry, mContentTypes, Deferred, mEditorCommands, mInputManager, mProgress, mServiceRegistry) {
	var EDITOR_COMMAND = "orion.edit.command",
	    MESSAGE = "orion.page.message",
	    BOGUS_FRAME_URL = "/urlthatdoesntexistanywhere", // "http://example.org/foo";
	    assert = chai.assert;

	// Test variables
	var serviceRegistry, contentTypeRegistry, progress, commandRegistry, editorCommandFactory,
	     inputManager, editor, editorView, initialFrames;

	function setup() {
		serviceRegistry = new mServiceRegistry.ServiceRegistry();
		contentTypeRegistry = new mContentTypes.ContentTypeRegistry(serviceRegistry);
		progress = new mProgress.ProgressService(serviceRegistry);
		inputManager =  new mInputManager.InputManager({
			serviceRegistry: serviceRegistry,
		});
		commandRegistry = new mCommandRegistry.CommandRegistry();
		editorCommandFactory = new mEditorCommands.EditorCommandFactory({
			inputManager: inputManager,
			serviceRegistry: serviceRegistry,
			commandRegistry: commandRegistry
		});
		editor = new MockEditor({});
		editor.installTextView();
		initialFrames = Array.prototype.map.call(document.getElementsByTagName("iframe"), function(iframe) {
			return iframe.src;
		});
		editorView = {
			editor: editor,
			inputManager: inputManager
		};
		// Apparently editorCommands.js needs this function defined on the editor
		editor.getEditorContext = function() {
			return {};
		};
	}

	function teardown() {
		serviceRegistry = contentTypeRegistry = commandRegistry = editorCommandFactory = inputManager = editor = editorView = null;
		// Remove any iframes created during the test
		Array.prototype.forEach.call(document.getElementsByTagName("iframe"), function(iframe) {
			if (initialFrames.indexOf(iframe.src) === -1)
				iframe.parentNode.removeChild(iframe);
		});
	}

	function registerMessageService(impl) {
		if (!(serviceRegistry.getService(MESSAGE))) {
			impl = impl || {};
			impl.setProgressMessage = impl.setProgressMessage || Function.prototype; // noop
			impl.setProgressResult  = impl.setProgressResult  || Function.prototype; // noop
			impl.showWhile          = impl.showWhile || Function.prototype; // noop
			impl.createProgressMonitor = impl.createProgressMonitor || Function.prototype; // noop
			serviceRegistry.registerService(MESSAGE, impl);
		}
	}

	function registerEditorCommand(impl) {
		serviceRegistry.registerService(EDITOR_COMMAND, impl, {
			id: "example",
			name: "Example Command",
		});
	}

	function executeCommand() {
		// Due to the service dependency editorCommands -> orion.page.progress -> orion.page.message, a message
		// service must be registered before we invoke an editor command, else it will throw.
		registerMessageService();

		return editorCommandFactory._createEditCommands().then(function(commandObjects) {
			//editorCommandFactory.updateCommands(editorView);
			var found = commandObjects.some(function(obj) {
				if (obj.id === "example") {
					obj.callback.call(editorView); // Command's `this` must be the Editor View
					return true;
				}
			});
			if (!found)
				throw new Error("Could not obtain registered edit command");
		});
	}

	function assertFrameExists(url) {
		var found = Array.prototype.slice.call(document.getElementsByTagName("iframe")).some(function(frame) {
			return new URL(frame.src).pathname.indexOf(url) === 0;
		});
		assert.equal(found, true, "Found the iframe " + url + " in the page");
	}

	describe("orion.edit.command", function() {
		beforeEach(setup);
		afterEach(teardown);

		// Test the legacy orion.edit.command API
		describe("#run() (legacy)", function() {
			it("should open frame when command returns 'uriTemplate' field", function() {
				registerEditorCommand({
					run: function() {
						return { uriTemplate: BOGUS_FRAME_URL };
					}
				});
				var promise = new Deferred();
				executeCommand();
				setTimeout(function() {
					// Ensure the frame was opened
					assertFrameExists(BOGUS_FRAME_URL);
					promise.resolve();
				});
				return promise;
			});
			it("should set status when command returns 'status' field", function() {
				registerEditorCommand({
					run: function() {
						return { status: { Message: "blort" } };
					}
				});
				var promise = new Deferred();
				registerMessageService({
					setProgressResult: function(status) {
						assert.equal(status.Message, "blort");
						promise.resolve();
					}
				});
				executeCommand();
				return promise;
			});
			it("should set editor text when command returns 'text' field", function() {
				registerEditorCommand({
					run: function() {
						return { text: "weasel power" };
					}
				});
				var promise = new Deferred();
				executeCommand();
				setTimeout(function() {
					assert.equal(editor.getText(), "weasel power");
					promise.resolve();
				});
				return promise;
			});
			it("should set editor text when command returns a string", function() {
				registerEditorCommand({
					run: function() {
						return "ermine";
					}
				});
				var promise = new Deferred();
				executeCommand();
				setTimeout(function() {
					assert.equal(editor.getText(), "ermine");
					promise.resolve();
				});
				return promise;
			});
			it("should set editor selection when command returns 'selection' field", function() {
				registerEditorCommand({
					run: function() {
						return { selection: {start: 4, end: 9} };
					}
				});
				editor.setText("megastoat");
				var promise = new Deferred();
				executeCommand();
				setTimeout(function() {
					var selection = editor.getSelection();
					assert.equal(selection.start, 4);
					assert.equal(selection.end, 9);
					promise.resolve();
				});
				return promise;
			});
		});

		// Test the `editorContext` callbacks
		describe("#execute()", function() {
			it("#openDelegatedUI() should open iframe", function() {
				var promise = new Deferred();
				registerEditorCommand({
					execute: function(callbacks/*, options*/) {
						var c = callbacks.openDelegatedUI({
							id: "example.delegated",
							uriTemplate: BOGUS_FRAME_URL,
						});
						setTimeout(function() {
							assertFrameExists(BOGUS_FRAME_URL);
							promise.resolve();
						}, 0);
					}
				});
				return executeCommand().then(function() {
					return promise;
				});
			});
			it("iframe should be able to set status", function() {
				registerEditorCommand({
					execute: function(callbacks/*, options*/) {
						// Open an iframe that will post a status object back to Orion.
						callbacks.openDelegatedUI({
							id: "example",
							uriTemplate: "./editCommands/frame.html?source=example&action=status&message=howdy", // relative to uiTests.html
						});
					}
				});

				var promise = new Deferred();
				registerMessageService({
					setProgressResult: function(status) {
						// Ensure the message service was invoked with the status sent by the the frame
						assert.equal(status.Message, "howdy");
						promise.resolve();
					}
				});
				return executeCommand().then(function() {
					return promise;
				});
			});
		});
	});
});
