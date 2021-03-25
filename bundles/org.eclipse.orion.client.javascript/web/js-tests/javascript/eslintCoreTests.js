/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env node, mocha, amd*/
/* eslint-disable missing-nls */
define([
	'eslint/lib/events',
	'eslint/lib/utils/util',
	'eslint/lib/eslint',
	'chai/chai',
	'mocha/mocha' //not a module, leave at the end
], function(events, util, eslint, chai) {
	var assert = chai.assert;
	
	return /* @callback */ function(worker) {
		describe("ESLint Core Tests", function() {
	    	describe("util tests", function() {
	    		var topic = function() {
	    			var a = {}, b = { foo: "f", bar: 1 };
	    			util.mixin(a, b);
	    			return [a, b];
	    		};
	    
	    		it("should add properties to target object", function() {
	    			var a = topic()[0];
	    			assert.equal(Object.keys(a).length, 2);
	    			assert.equal(a.foo, "f");
	    			assert.equal(a.bar, 1);
	    		});
	    
	    		it("should not change the source object", function() {
	    			var b = topic()[1];
	    			assert.equal(Object.keys(b).length, 2);
	    			assert.equal(b.foo, "f");
	    			assert.equal(b.bar, 1);
	    		});
	    	});
	    	
	    	describe("scope tests", function() {
	    		var topic = "function f() {} \n var g = function() {}";
	    
	    		it("should return global scope when called from Program", function() {
	    			var config = { rules: {} };
	    
	    			eslint.reset();
	    			eslint.on("Program", function(node) {
	    				var scope = eslint.getScope();
	    				assert.equal(scope.type, "global");
	    				assert.equal(scope.block, node);
	    			});
	    
	    			eslint.verify(topic, config, true /* do not reset */);
	    		});
	    		it("should return function scope when called from FunctionDeclaration", function() {
	    			var config = { rules: {} };
	    
	    			eslint.reset();
	    			eslint.on("FunctionDeclaration", function(node) {
	    				var scope = eslint.getScope();
	    				assert.equal(scope.type, "function");
	    				assert.equal(scope.block, node);
	    			});
	    
	    			eslint.verify(topic, config, true);
	    		});
	    		it("should return function scope when called from FunctionExpression", function() {
	    			var config = { rules: {} };
	    
	    			eslint.reset();
	    			eslint.on("FunctionExpression", function(node) {
	    				var scope = eslint.getScope();
	    				assert.equal(scope.type, "function");
	    				assert.equal(scope.block, node);
	    			});
	    
	    			eslint.verify(topic, config, true);
	    		});
	    	});
	    	
	    	describe('event tests', function() {
	    		var EventEmitter = events.EventEmitter;
	    	
	    		/**
	    		 * Executes the given function with `console` replaced by a fake.
	    		 * @param {Function} onConsoleMessage Callback for console.{log,error,warning,etc}
	    		 * @param {Function} func Function to be executed with a fake window.console
	    		 */
	    		function withMockConsole(onConsoleMessage, func) {
	    			try {
	    				var savedConsole = console;
	    				console = {
	    					error: onConsoleMessage,
	    					log: onConsoleMessage,
	    					warning: onConsoleMessage,
	    					dir: onConsoleMessage
	    				};
	    				func();
	    			} finally {
	    				console = savedConsole;
	    			}
	    		}
	    	
	    		it('test_addListener', function() {
	    			var e = new EventEmitter(), called = false;
	    			e.addListener("foo", function(v) {
	    				called = true;
	    				assert.equal(v, "hi");
	    			});
	    			e.emit("foo", "hi");
	    			assert.equal(called, true);
	    		});
	    		it('test_on', function() {
	    			var e = new EventEmitter(), called = false;
	    			e.addListener("foo", function(v) {
	    				called = true;
	    				assert.equal(v, "hi");
	    			});
	    			e.emit("foo", "hi");
	    			assert.ok(called, "listener was called");
	    		});
	    		it('test_once', function() {
	    			var e = new EventEmitter(), callCount = 0;
	    			e.once("foo", function(/*v*/) {
	    				callCount++;
	    			});
	    			e.emit("foo", "wow");
	    			e.emit("foo", "such");
	    			e.emit("foo", "emit");
	    			assert.equal(callCount, 1, "listener was called exactly once");
	    		});
	    		it('test_removeListener', function() {
	    			var e = new EventEmitter();
	    			var listener = function(/*v*/) {
	    				assert.fail("should not be called");
	    			};
	    			e.addListener("foo", listener);
	    			e.removeListener("foo", listener);
	    			e.emit("foo", 1);
	    		});
	    		it('test_removeAllListeners_allEventTypes', function() {
	    			var e = new EventEmitter();
	    			e.addListener("foo", function() {
	    				assert.fail("should not be called");
	    			});
	    			e.addListener("bar", function() {
	    				assert.fail("should not be called");
	    			});
	    			e.removeAllListeners();
	    			e.emit("foo", 1);
	    			e.emit("bar", 1);
	    		});
	    		it('test_removeAllListeners_singleEventType', function() {
	    			var e = new EventEmitter(), barCalled = false;
	    			e.addListener("foo", function() {
	    				assert.fail("should not be called");
	    			});
	    			e.addListener("bar", function() {
	    				barCalled = true;
	    			});
	    			e.removeAllListeners("foo");
	    			e.emit("bar", 1);
	    			assert.ok(barCalled, "bar listener was called");
	    		});
	    		it('test_setMaxListeners_zero', function() {
	    			var e = new EventEmitter(), warned = false;
	    			e.setMaxListeners(0);
	    			withMockConsole(function(msg) {
	    					warned = /leak/i.test(msg);
	    				}, function() {
	    					for (var i=0; i < 11; i++) {
	    						e.on("foo", function() {});
	    					}
	    				});
	    			assert.equal(warned, false, "we were not warned");
	    		});
	    		it('test_setMaxListeners_N', function() {
	    			var e = new EventEmitter(), warned = false;
	    			e.setMaxListeners(2);
	    			withMockConsole(function(msg) {
	    					warned = /leak/i.test(msg);
	    				}, function() {
	    					e.on("foo", function() {});
	    					e.on("foo", function() {});
	    					assert.equal(warned, false);
	    					e.on("foo", function() {});
	    				});
	    			assert.equal(warned, true, "we were warned about leaks");
	    		});
	    		it('test_setMaxListeners_default', function() {
	    			var e = new EventEmitter(), warned = false;
	    			// Default number of max listeners is 10
	    			withMockConsole(function(msg) {
	    					warned = /leak/i.test(msg);
	    				}, function() {
	    					for (var i=0; i < 11; i++) {
	    						e.on("foo", function() {});
	    					}
	    				});
	    			assert.equal(warned, true, "we were warned about leaks");
	    		});
	    		it('test_listeners', function() {
	    			var e = new EventEmitter();
	    			var l1 = function() {}, l2 = function() {};
	    			e.on('foo', l1);
	    			e.on('foo', l2);
	    			assert.deepEqual(e.listeners('foo'), [l1, l2]);
	    		});
	    		it('test_emit', function() {
	    			var e = new EventEmitter(), called = false;
	    			e.on('foo', function(arg1, arg2) {
	    				called = true;
	    				assert.equal(arg1, 'a');
	    				assert.equal(arg2, 'b');
	    			});
	    			e.emit('foo', 'a', 'b');
	    			assert.equal(called, true);
	    		});
	    		it('test_listenerCount', function() {
	    			var e = new EventEmitter();
	    			assert.equal(EventEmitter.listenerCount(e, 'foo'), 0);
	    			e.on('foo', function() {});
	    			assert.equal(EventEmitter.listenerCount(e, 'foo'), 1);
	    			e.on('foo', function() {});
	    			assert.equal(EventEmitter.listenerCount(e, 'foo'), 2);
	    			e.removeAllListeners('foo');
	    			assert.equal(EventEmitter.listenerCount(e, 'foo'), 0);
	    		});
	    		it('test_event_newListener', function() {
	    			var e = new EventEmitter(),
	    			    listeners = [ function() {}, function() {} ],
	    			    callCount = 0;
	    			e.on('newListener', function(listener) {
	    				assert.equal(listener, listeners[callCount], "Got the expected listener");
	    				callCount++;
	    			});
	    			e.on('foo', listeners[0]);
	    			assert.equal(callCount, 1);
	    			e.on('bar', listeners[1]);
	    			assert.equal(callCount, 2);
	    		});
	    		it('test_event_removeListener', function() {
	    			var e = new EventEmitter(),
	    			    listeners = [ function() {}, function() {} ],
	    			    callCount = 0;
	    			e.on('removeListener', function(listener) {
	    				assert.equal(listener, listeners[callCount], "Got the expected listener");
	    				callCount++;
	    			});
	    			e.on('foo', listeners[0]);
	    			e.on('bar', listeners[1]);
	    	
	    			e.removeListener('foo', listeners[0]);
	    			assert.equal(callCount, 1);
	    			e.removeListener('bar', listeners[1]);
	    			assert.equal(callCount, 2);
	    		});
	    		// These methods return the emitter to allow chaining: addListener, on, once, removeListener, removeAllListeners
	    		it('test_chaining', function() {
	    			var e = new EventEmitter(), numCalls = 0, l = function() { numCalls++; };
	    			var returnVal = e.addListener('foo', l);
	    			returnVal.on('foo', l);
	    			returnVal.once('bar', l);
	    	
	    			returnVal.emit('bar');
	    			assert.equal(numCalls, 1);
	    			returnVal.emit('foo');
	    			assert.equal(numCalls, 3); // there are 2 listeners for foo
	    	
	    			returnVal = returnVal.removeListener('bar', l);
	    			returnVal.emit('bar');
	    			assert.equal(numCalls, 3);
	    	
	    			returnVal = returnVal.removeAllListeners();
	    			returnVal.emit('foo');
	    			assert.equal(numCalls, 3);
	    		});
	    	});
		});
	};
});
