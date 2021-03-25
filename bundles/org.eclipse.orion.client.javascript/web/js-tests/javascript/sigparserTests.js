/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, mocha*/
/* eslint-disable missing-nls */
define([
	'chai/chai',
	'javascript/contentAssist/sigparser',
	'orion/Deferred',
	'mocha/mocha', //must stay at the end, not a module
], function(chai, sigparser) {

	var assert = chai.assert;

	return /* @callback */ function(worker) {
		describe("Signature Parser Tests", function() {
		
			describe("Failure Tests", function() {
				it("Null signature", function() {
					var value = sigparser.parse(null);
					assert.equal(value, null, 'Null should be returned');
				});
				it("Undefined signature", function() {
					var value = sigparser.parse(undefined);
					assert.equal(value, null, 'Null should be returned');
				});
				it("Non-string signature", function() {
					var value = sigparser.parse(4);
					assert.equal(value, null, 'Null should be returned');
				});
				it("No signature at call", function() {
					var value = sigparser.parse();
					assert.equal(value, null, 'Null should be returned');
				});
				
			});
			describe("Function Signature Tests", function() {
				it("simple number return no params", function() {
					var value = sigparser.parse('fn() -> number');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 14, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return value was not parsed');
					assert.equal(ret.start, 8, 'The return value start was not correct');
					assert.equal(ret.end, 14, 'The return value end was not correct');
					assert.equal(ret.value, 'number', 'The type of the return value was not correct');
				});
				it("simple number return no params whitespace 1", function() {
					var value = sigparser.parse('fn()->number');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 12, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return value was not parsed');
					assert.equal(ret.start, 6, 'The return value start was not correct');
					assert.equal(ret.end, 12, 'The return value end was not correct');
					assert.equal(ret.value, 'number', 'The type of the return value was not correct');
				});
				it("simple number return no params whitespace 2", function() {
					var value = sigparser.parse('fn()  ->number');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 14, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return value was not parsed');
					assert.equal(ret.start, 8, 'The return value start was not correct');
					assert.equal(ret.end, 14, 'The return value end was not correct');
					assert.equal(ret.value, 'number', 'The type of the return value was not correct');
				});
				it("simple number return no params whitespace 3", function() {
					var value = sigparser.parse('fn()  ->  number  ');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 16, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return value was not parsed');
					assert.equal(ret.start, 10, 'The return value start was not correct');
					assert.equal(ret.end, 16, 'The return value end was not correct');
					assert.equal(ret.value, 'number', 'The type of the return value was not correct');
				});
				it("simple no explicit return", function() {
					var value = sigparser.parse('fn()');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 4, 'The signature end was not correct');
					var ret = value.ret;
					assert.equal(ret, null, 'The return value was not parsed');
				});
				it("simple object return", function() {
					var value = sigparser.parse('fn() -> {}');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 10, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return value was not parsed');
					assert.equal(ret.start, 8, 'The return value start was not correct');
					assert.equal(ret.end, 10, 'The return value end was not correct');
					assert.equal(ret.value, '{}', 'The type of the return value was not correct');
				});
				it("complex object return func expr", function() {
					var value = sigparser.parse('fn() -> fn()');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 12, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return value was not parsed');
					assert.equal(ret.start, 8, 'The return value start was not correct');
					assert.equal(ret.end, 12, 'The return value end was not correct');
					assert.equal(ret.params.length, 0, 'There should be no params on the return function type');
				});
				it("complex object return func expr return func expr", function() {
					var value = sigparser.parse('fn() -> fn() -> fn()');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 20, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return value was not parsed');
					assert.equal(ret.start, 8, 'The return value start was not correct');
					assert.equal(ret.end, 20, 'The return value end was not correct');
					assert.equal(ret.params.length, 0, 'There should be no params on the return function type');
				});
				it("complex func union object param 1", function() {
					var value = sigparser.parse('fn(a: {}|{}, f: fn())');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 21, 'The signature end was not correct');
					var ret = value.ret;
					assert.equal(ret, null, 'The return value was not parsed');
				});
				it("complex func union object param 2", function() {
					var value = sigparser.parse('fn(a: {a:3}|{c:3}, f: fn())');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 27, 'The signature end was not correct');
					var ret = value.ret;
					assert.equal(ret, null, 'The return value was not parsed');
				});
				it("complex object return one property", function() {
					var value = sigparser.parse('fn() -> {a: 4}');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 14, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return value was not parsed');
					assert.equal(ret.start, 8, 'The return value start was not correct');
					assert.equal(ret.end, 14, 'The return value end was not correct');
					assert.equal(ret.value, '{a: 4}', 'The type of the return value was not correct');
				});
				it("complex object return two properties 1", function() {
					var value = sigparser.parse('fn() -> {a: 4, b: "hello"}');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 26, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return value was not parsed');
					assert.equal(ret.start, 8, 'The return value start was not correct');
					assert.equal(ret.end, 26, 'The return value end was not correct');
					assert.equal(ret.value, '{a: 4, b: "hello"}', 'The type of the return value was not correct');
				});
				it("simple no explicit return, one any param", function() {
					var value = sigparser.parse('fn(one: ?)');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 10, 'The signature end was not correct');
					var ret = value.ret;
					assert.equal(ret, null, 'The return value was not parsed');
					var params = value.params;
					assert(Array.isArray(params), 'Should be a params array');
					assert.equal(params.length, 1, 'There should be one param');
					assert.equal(params[0].value, 'one', 'The param has the wrong name');
					assert.equal(params[0].start, 3, 'The param has the wrong start');
					assert.equal(params[0].end, 9, 'The param has the wrong end');
					assert.equal(params[0].type.value, '?', 'The param has the wrong type');
					assert.equal(params[0].type.start, 8, 'The param type has the wrong start');
					assert.equal(params[0].type.end, 9, 'The param type has the wrong end');
				});
				it("simple no explicit return, one number param", function() {
					var value = sigparser.parse('fn(one: number)');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 15, 'The signature end was not correct');
					var ret = value.ret;
					assert.equal(ret, null, 'The return value was not parsed');
					var params = value.params;
					assert(Array.isArray(params), 'Should be a params array');
					assert.equal(params.length, 1, 'There should be one param');
					assert.equal(params[0].value, 'one', 'The param has the wrong name');
					assert.equal(params[0].start, 3, 'The param has the wrong start');
					assert.equal(params[0].end, 14, 'The param has the wrong end');
					assert.equal(params[0].type.value, 'number', 'The param has the wrong type');
					assert.equal(params[0].type.start, 8, 'The param type has the wrong start');
					assert.equal(params[0].type.end, 14, 'The param type has the wrong end');
				});
				it("simple no explicit return, two params 1", function() {
					var value = sigparser.parse('fn(one: number, two: ?)');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 23, 'The signature end was not correct');
					var ret = value.ret;
					assert.equal(ret, null, 'The return value was not parsed');
					var params = value.params;
					assert(Array.isArray(params), 'Should be a params array');
					assert.equal(params.length, 2, 'There should be two params');
					assert.equal(params[0].value, 'one', 'The param has the wrong name');
					assert.equal(params[0].start, 3, 'The param has the wrong start');
					assert.equal(params[0].end, 14, 'The param has the wrong end');
					assert.equal(params[0].type.value, 'number', 'The param has the wrong type');
					assert.equal(params[0].type.start, 8, 'The param type has the wrong start');
					assert.equal(params[0].type.end, 14, 'The param type has the wrong end');
				});
				it("simple no explicit return, two params 1", function() {
					var value = sigparser.parse('fn(one: number, two: {})');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 24, 'The signature end was not correct');
					var ret = value.ret;
					assert.equal(ret, null, 'The return value was not parsed');
					var params = value.params;
					assert(Array.isArray(params), 'Should be a params array');
					assert.equal(params.length, 2, 'There should be two params');
					assert.equal(params[1].value, 'two', 'The param has the wrong name');
					assert.equal(params[1].start, 16, 'The param has the wrong start');
					assert.equal(params[1].end, 23, 'The param has the wrong end');
					assert.equal(params[1].type.value, '{}', 'The param has the wrong type');
					assert.equal(params[1].type.start, 21, 'The param type has the wrong start');
					assert.equal(params[1].type.end, 23, 'The param type has the wrong end');
				});
				/*
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=512136
				 * @since 14.0
				 */
				it("simple param contains dash or underscores", function() {
					var value = sigparser.parse('fn(one-with-dash: number, two_with_underscore: {})');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 50, 'The signature end was not correct');
					var ret = value.ret;
					assert.equal(ret, null, 'The return value was not parsed');
					var params = value.params;
					assert(Array.isArray(params), 'Should be a params array');
					assert.equal(params.length, 2, 'There should be two params');
					assert.equal(params[0].value, 'one-with-dash', 'The param has the wrong name');
					assert.equal(params[0].start, 3, 'The param has the wrong start');
					assert.equal(params[0].end, 24, 'The param has the wrong end');
					assert.equal(params[0].type.value, 'number', 'The param has the wrong type');
					assert.equal(params[0].type.start, 18, 'The param type has the wrong start');
					assert.equal(params[0].type.end, 24, 'The param type has the wrong end');
					assert.equal(params[1].value, 'two_with_underscore', 'The param has the wrong name');
					assert.equal(params[1].start, 26, 'The param has the wrong start');
					assert.equal(params[1].end, 49, 'The param has the wrong end');
					assert.equal(params[1].type.value, '{}', 'The param has the wrong type');
					assert.equal(params[1].type.start, 47, 'The param type has the wrong start');
					assert.equal(params[1].type.end, 49, 'The param type has the wrong end');
				});
			});
			describe("Array Parameter and Return Type Tests", function() {
				it("complex array return union type 1", function() {
					var value = sigparser.parse('fn() -> [fn()|{a: number}]');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 26, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return type cannot be null');
					assert.equal(ret.value, '[fn()|{a: number}]', 'return type signatures are not the same');
				});
				it("complex array return union type 2", function() {
					var value = sigparser.parse('fn() -> [fn()->?|{a: number}|Function]');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 38, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return type cannot be null');
					assert.equal(ret.value, '[fn()->?|{a: number}|Function]', 'return type signatures are not the same');
				});
				it("simple array return type 1", function() {
					var value = sigparser.parse('fn() -> [string]');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 16, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return type cannot be null');
					assert.equal(ret.value, '[string]', 'return type signatures are not the same');
				});
				it("simple array return type 2", function() {
					var value = sigparser.parse('fn() -> [?]');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 11, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return type cannot be null');
					assert.equal(ret.value, '[?]', 'return type signatures are not the same');
				});
				it("simple array return type 3", function() {
					var value = sigparser.parse('fn() -> [{}]');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 12, 'The signature end was not correct');
					var ret = value.ret;
					assert(ret, 'The return type cannot be null');
					assert.equal(ret.value, '[{}]', 'return type signatures are not the same');
				});
				it("simple array param type 1", function() {
					var value = sigparser.parse('fn(a: [?])');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 10, 'The signature end was not correct');
					assert.equal(value.value, 'fn(a: [?])', 'The function signatures are not equal');
					var ret = value.ret;
					assert.equal(ret, null, 'return type signatures are not the same');
				});
				it("simple array param type 2", function() {
					var value = sigparser.parse('fn(a: [string])');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 15, 'The signature end was not correct');
					assert.equal(value.value, 'fn(a: [string])', 'The function signatures are not equal');
					var ret = value.ret;
					assert.equal(ret, null, 'return type signatures are not the same');
				});
				it("simple array param type 3", function() {
					var value = sigparser.parse('fn(a: [{}])');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 11, 'The signature end was not correct');
					assert.equal(value.value, 'fn(a: [{}])', 'The function signatures are not equal');
					var ret = value.ret;
					assert.equal(ret, null, 'return type signatures are not the same');
				});
				it("complex array param type 1", function() {
					var value = sigparser.parse('fn(a: [string|Function])');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 24, 'The signature end was not correct');
					assert.equal(value.value, 'fn(a: [string|Function])', 'The function signatures are not equal');
					var ret = value.ret;
					assert.equal(ret, null, 'return type signatures are not the same');
				});
				it("complex array param type 2", function() {
					var value = sigparser.parse('fn(a: [string|Function], b: [fn()|string])');
					assert(value, 'parsing did not complete');
					assert.equal(value.start, 0, 'The signature start was not correct');
					assert.equal(value.end, 42, 'The signature end was not correct');
					assert.equal(value.value, 'fn(a: [string|Function], b: [fn()|string])', 'The function signatures are not equal');
					var ret = value.ret;
					assert.equal(ret, null, 'return type signatures are not the same');
				});
			});
		});
	};
});
