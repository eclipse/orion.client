/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, mocha, node*/
/* eslint-disable missing-nls */
define([
	'chai/chai',
	'javascript/lru',
	'mocha/mocha', //must stay at the end, not a module
], function(chai, LRU) {
	
	return /* @callback */ function(worker) {
		var assert = chai.assert;
	
		describe('LRU map tests', function() {
	
			it("Test simple put", function() {
			    var lru = new LRU(1);
			    lru.put('one', 'val_one');
			    assert(lru.size(), 1, 'There should be one entry in the map');
			    var val = lru.get('one');
			    assert(val, 'Should be entry for one mapped');
			    assert.equal(val, 'val_one', 'mapped value should be val_one');
			});
	
			it("Test simple put bounded", function() {
				var lru = new LRU(1);
				lru.put('one', 'val_one');
				lru.put('two', 'val_two');
				assert.equal(lru.size(), 1, 'there should be one entry in the map');
				var val = lru.get('one');
				assert.equal(val, null, 'mapped entry one should have been pushed off the map');
				val = lru.get('two');
				assert(val, 'mapped entry two should be found');
				assert.equal(val, 'val_two', 'mapped value should be val_two');
			});
	
			it("Test simple put unbounded", function() {
				var lru = new LRU();
				lru.put('one', 'val_one');
				lru.put('two', 'val_two');
				assert.equal(lru.size(), 2, 'there should be two entries in the map');
				var val = lru.get('one');
				assert(val, 'mapped entry one should be found');
				assert.equal(val, 'val_one', 'mapped entry one should have been pushed off the map');
				val = lru.get('two');
				assert(val, 'mapped entry two should be found');
				assert.equal(val, 'val_two', 'mapped value should be val_two');
			});
	
			it("Test simple put unbounded 2", function() {
				var lru = new LRU(-1);
				lru.put('one', 'val_one');
				lru.put('two', 'val_two');
				assert.equal(lru.size(), 2, 'there should be two entries in the map');
				var val = lru.get('one');
				assert(val, 'mapped entry one should be found');
				assert.equal(val, 'val_one', 'mapped entry one should have been pushed off the map');
				val = lru.get('two');
				assert(val, 'mapped entry two should be found');
				assert.equal(val, 'val_two', 'mapped value should be val_two');
			});
	
			it("Test clear", function() {
				var lru = new LRU();
				lru.put('one', 'val_one');
				lru.put('two', 'val_two');
				assert.equal(lru.size(), 2, 'There should be 2 entries in the map');
				lru.clear();
				assert.equal(lru.size(), 0, 'There should be no entries in the map');
			});
	
	        it("Test keys", function() {
				var lru = new LRU();
				lru.put('one', 'val_one');
				lru.put('two', 'val_two');
				assert.equal(lru.size(), 2, 'there should be two entries in the map');
				var keys = lru.keys();
				assert(keys, 'should have got keys back');
				assert.equal(keys.length, 2, 'should be two keys');
				assert.equal(keys[0], 'one', 'second key should be one');
				assert.equal(keys[1], 'two', 'first key should be two');
			});
	
		});
	};
});
