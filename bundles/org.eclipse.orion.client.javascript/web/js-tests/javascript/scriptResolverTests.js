/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2017 IBM Corporation and others.
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
	'javascript/scriptResolver',
	'orion/Deferred',
	'orion/serviceregistry',
	'mocha/mocha', //must stay at the end, not a module
], function(chai, Resolver, Deferred, mServiceRegistry) {

	var assert = chai.assert;

	return /* @callback */ function(worker) {
		var testFileClient = {
			createTestFiles: function(files) {
				assert(Array.isArray(files), 'Cannot create test files with no file names array');
				var _f = [];
				for (var i = 0; i < files.length; i++) {
					var _n = files[i];
					_f.push({
						Name: _n,
						name: _n,
						Path: this.fileServiceRootURL() + '/' + _n,
						path: this.fileServiceRootURL() + '/' + _n,
						Location: this.fileServiceRootURL() + '/' + _n,
						location: this.fileServiceRootURL() + '/' + _n,
						contentType: {
							name: 'JavaScript'
						}
					});
				}
				this.testfiles = _f;
				return _f;
			},
			fileServiceRootURL: function() {return 'TestingRoot';},
			/**
			 * @callback
			 */
			search: function(opts) {
				var files = this.testfiles;
				assert(Array.isArray(files), 'Failed to create test files during fileclient#search callback');
				var res = Object.create(null);
				res.response  = Object.create(null);
				res.response.numFound = files.length;
				res.response.docs = files;
				return new Deferred().resolve(res);
			}
		};
	
		var serviceRegistry = new mServiceRegistry.ServiceRegistry();
		serviceRegistry.registerService("orion.core.file.client", testFileClient);
		var resolver = new Resolver.ScriptResolver(serviceRegistry);
	
		describe('Script resolver tests', function() {
			it('Test getWorkspaceFile for json!-prefixed files', function() {
				testFileClient.createTestFiles(['ecma1.json', 'ecma2.json.js']);
				return resolver.getWorkspaceFile('json!ecma1.json').then(function(files) {
					assert(Array.isArray(files), 'There should have been a files array returned');
					assert.equal(files.length, 1, 'There should have been one file returned');
					assert.equal(files[0].location, testFileClient.fileServiceRootURL()+'/ecma1.json', 'Should have found file object with location TestingRoot/ecma1.json');
					assert.equal(files[0].name, 'ecma1.json', 'Should have found file object with name equal to ecma1.json');
				});
			});
			it('Test getWorkspaceFile 1', function() {
				testFileClient.createTestFiles(['foo.js', 'foobar.js']);
				return resolver.getWorkspaceFile('foo').then(function(files) {
					assert(Array.isArray(files), 'There should have been a files array returned');
					assert.equal(files.length, 1, 'There should have been one file returned');
					assert.equal(files[0].location, testFileClient.fileServiceRootURL()+'/foo.js', 'Should have found file object with location TestingRoot/foo.js');
					assert.equal(files[0].name, 'foo.js', 'Should have found file object with name equal to foo.js');
				});
			});
			
			it('Test getWorkspaceFile 2 - esprima & esprima/esprima', function() {
				testFileClient.createTestFiles(['esprima.js', 'esprima/esprima.js']);
				return resolver.getWorkspaceFile('esprima').then(function(files) {
					assert(Array.isArray(files), 'There should have been a files array returned');
					assert.equal(files.length, 2, 'There should have been two files returned');
				});
			});
			
			it('Test getWorkspaceFile 3 - multi-segment paths', function() {
				testFileClient.createTestFiles(['foo/bar/lib/esprima.js', 'foo/bar/test/esprima/esprima.js']);
				return resolver.getWorkspaceFile('esprima/esprima').then(function(files) {
					assert(Array.isArray(files), 'There should have been a files array returned');
					assert.equal(files.length, 1, 'There should have been one file returned');
					assert.equal(files[0].location, testFileClient.fileServiceRootURL()+'/foo/bar/test/esprima/esprima.js', 'Should have found file object with location TestingRoot/foo/bar/test/esprima/esprima.js');
					assert.equal(files[0].name, 'foo/bar/test/esprima/esprima.js', 'Should have found file object with name equal to esprima.js');
				});
	
			});
			
			it('Test getWorkspaceFile 4 - relative sibling paths', function() {
				testFileClient.createTestFiles(['foo/bar/lib/esprima.js', 'foo/bar/test/esprima/esprima.js', 'foo/bar/esprima/baz.js']);
				return resolver.getWorkspaceFile('./esprima').then(function(files) {
					assert(Array.isArray(files), 'There should have been a files array returned');
					assert.equal(files.length, 2, 'There should have been two files returned');
				});
	
			});
			
			it('Test getWorkspaceFile 5 - relative parent paths', function() {
				testFileClient.createTestFiles(['foo/bar/lib/esprima.js', 'foo/bar/test/esprima/esprima.js', 'foo/bar/esprima/baz.js']);
				return resolver.getWorkspaceFile('../esprima').then(function(files) {
					assert(Array.isArray(files), 'There should have been a files array returned');
					assert.equal(files.length, 2, 'There should have been two files returned');
				});
	
			});
			
			it('Test getWorkspaceFile 6 - nothing found simple', function() {
				testFileClient.createTestFiles(['foo/bar/lib/esprima.js', 'foo/bar/test/esprima/esprima.js']);
				return resolver.getWorkspaceFile('bar').then(function(files) {
					assert(files === null, 'There should have been no files array returned');
				});
	
			});
			
			it('Test getWorkspaceFile 7 - nothing found sibling', function() {
				testFileClient.createTestFiles(['foo/bar/lib/esprima.js', 'foo/bar/test/esprima/esprima.js']);
				return resolver.getWorkspaceFile('./bar').then(function(files) {
					assert(files === null, 'There should have been no files array returned');
				});
	
			});
			
			it('Test getWorkspaceFile 8 - nothing found parental', function() {
				testFileClient.createTestFiles(['foo/bar/lib/esprima.js', 'foo/bar/test/esprima/esprima.js']);
				return resolver.getWorkspaceFile('../bar').then(function(files) {
					assert(files === null, 'There should have been a files array returned');
				});
	
			});
			
			it('Test getWorkspaceFile 9 - parent paths', function() {
				testFileClient.createTestFiles(['foo/bar/esprima.js', 'foo/bar/esprima/esprima.js', 'foo/bar/esprima/baz.js']);
				return resolver.getWorkspaceFile('../esprima').then(function(files) {
					assert(Array.isArray(files), 'There should have been a files array returned');
					assert.equal(files.length, 2, 'There should have been two files returned');
				});
	
			});
			
			it('Test resolveRelativeFiles 1 - parent paths', function() {
				var files = testFileClient.createTestFiles(['foo/bar/esprima.js', 'foo/bar/esprima/esprima.js', 'foo/bar/esprima/baz.js']);
				var res = resolver.resolveRelativeFiles('../esprima', files, {location: 'TestingRoot/foo/bar/esprima/esprima.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo/bar/esprima.js', 'Should have found file object with location TestingRoot/foo/bar/esprima.js');
				assert.equal(res[0].name, 'foo/bar/esprima.js', 'Should have found file object with name equal to esprima.js');
	
			});
			
			it('Test resolveRelativeFiles 2 - multi parent paths', function() {
				var files = testFileClient.createTestFiles(['foo/esprima.js', 'foo/bar/esprima/esprima.js', 'foo/bar/esprima/baz.js']);
				var res = resolver.resolveRelativeFiles('../../esprima', files, {location: 'TestingRoot/foo/bar/esprima/esprima.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo/esprima.js', 'Should have found file object with location TestingRoot/foo/esprima.js');
				assert.equal(res[0].name, 'foo/esprima.js', 'Should have found file object with name equal to esprima.js');
	
			});
			it('Test resolveRelativeFiles 3 - sibing paths', function() {
				var files = testFileClient.createTestFiles(['foo/esprima.js', 'foo/bar/esprima/esprima.js', 'foo/bar/esprima/esprima.js']);
				var res = resolver.resolveRelativeFiles('./esprima', files, {location: 'TestingRoot/foo/baz.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo/esprima.js', 'Should have found file object with location TestingRoot/foo/esprima.js');
				assert.equal(res[0].name, 'foo/esprima.js', 'Should have found file object with name equal to esprima.js');
	
			});
			
			it('Test resolveRelativeFiles - nothing found 1', function() {
				var files = testFileClient.createTestFiles(['foo/esprima.js', 'foo/bar/esprima/esprima.js', 'foo/bar/esprima/esprima.js']);
				var res = resolver.resolveRelativeFiles('./bar', files, {location: 'TestingRoot/foo/baz.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 0, 'There should have been no files returned');
			});
			
			it('Test resolveRelativeFiles - nothing found 2', function() {
				var files = testFileClient.createTestFiles(['foo/esprima.js', 'foo/bar/esprima/esprima.js', 'foo/bar/esprima/esprima.js']);
				var res = resolver.resolveRelativeFiles('../esprima', files, {location: 'TestingRoot/baz.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 0, 'There should have been no files returned');
			});
			
			it('Test resolveRelativeFiles - nothing found 3', function() {
				var files = testFileClient.createTestFiles(['foo/esprima.js', 'foo/bar/esprima/esprima.js', 'foo/bar/esprima/esprima.js']);
				var res = resolver.resolveRelativeFiles('../../esprima', files, {location: 'TestingRoot/foo/baz.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 0, 'There should have been no files returned');
			});
			
			it('Test resolveRelativeFiles - multi path logical non-relative 1', function() {
				var files = testFileClient.createTestFiles(['foo/esprima.js', 'foo/bar/esprima/esprima.js', 'foo/bar/esprima/baz.js']);
				var res = resolver.resolveRelativeFiles('esprima/esprima', files, {location: 'TestingRoot/foo/esprima.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo/bar/esprima/esprima.js', 'Should have found file object with location TestingRoot/foo/esprima.js');
				assert.equal(res[0].name, 'foo/bar/esprima/esprima.js', 'Should have found file object with name equal to esprima.js');
	
			});
			
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=472639
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - i18n-style paths 1', function() {
				var files = testFileClient.createTestFiles(['foo/messages.js', 'foo/bar/messages.js', 'foo/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('i18n!foo/messages', files, {location: 'TestingRoot/foo/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo/messages.js', 'Should have found file object with location TestingRoot/foo/messages.js');
				assert.equal(res[0].name, 'foo/messages.js', 'Should have found file object with name equal to foo/messages.js');
	
			});
			
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473102
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - requirejs prefix paths 1', function() {
				var files = testFileClient.createTestFiles(['foo/messages.js', 'foo/bar/messages.js', 'foo/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('requirejs/json!foo/messages', files, {location: 'TestingRoot/foo/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo/messages.js', 'Should have found file object with location TestingRoot/foo/messages.js');
				assert.equal(res[0].name, 'foo/messages.js', 'Should have found file object with name equal to foo/messages.js');
	
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473102
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - requirejs prefix paths 2', function() {
				var files = testFileClient.createTestFiles(['foo/messages.js', 'foo/bar/messages.js', 'foo/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('../requirejs/json!foo/messages', files, {location: 'TestingRoot/foo/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo/messages.js', 'Should have found file object with location TestingRoot/foo/messages.js');
				assert.equal(res[0].name, 'foo/messages.js', 'Should have found file object with name equal to foo/messages.js');
	
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473102
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - requirejs prefix paths 3', function() {
				var files = testFileClient.createTestFiles(['foo/messages.js', 'foo/bar/messages.js', 'foo/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('../requirejs/json!foo/messages', files, {location: 'TestingRoot/foo/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo/messages.js', 'Should have found file object with location TestingRoot/foo/messages.js');
				assert.equal(res[0].name, 'foo/messages.js', 'Should have found file object with name equal to foo/messages.js');
	
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473102
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - hypenated paths 1', function() {
				var files = testFileClient.createTestFiles(['foo/messages-file.js', 'foo/bar/messages.js', 'foo/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('foo/messages-file', files, {location: 'TestingRoot/foo/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo/messages-file.js', 'Should have found file object with location TestingRoot/foo/messages.js');
				assert.equal(res[0].name, 'foo/messages-file.js', 'Should have found file object with name equal to foo/messages-file.js');
	
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473102
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - hypenated paths 2', function() {
				var files = testFileClient.createTestFiles(['foo/messages-file.js', 'foo/bar/messages.js', 'foo/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('json!foo/messages-file', files, {location: 'TestingRoot/foo/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo/messages-file.js', 'Should have found file object with location TestingRoot/foo/messages.js');
				assert.equal(res[0].name, 'foo/messages-file.js', 'Should have found file object with name equal to foo/messages-file.js');
	
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473102
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - hypenated paths 2', function() {
				var files = testFileClient.createTestFiles(['foo/messages-file.js', 'foo/bar/messages.js', 'foo/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('./requirejs/json!foo/messages-file', files, {location: 'TestingRoot/foo/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo/messages-file.js', 'Should have found file object with location TestingRoot/foo/messages.js');
				assert.equal(res[0].name, 'foo/messages-file.js', 'Should have found file object with name equal to foo/messages-file.js');
	
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476250
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - single relative dotted path', function() {
				var files = testFileClient.createTestFiles(['foo.bar.baz/messages-file.js', 'foo.bar.baz/bar/messages.js', 'foo.bar.baz/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('./requirejs/json!foo.bar.baz/messages-file', files, {location: 'TestingRoot/foo.bar.baz/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo.bar.baz/messages-file.js', 'Should have found file object with location TestingRoot/foo.bar.baz/messages.js');
				assert.equal(res[0].name, 'foo.bar.baz/messages-file.js', 'Should have found file object with name equal to foo.bar.baz/messages-file.js');
	
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476907
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - encoding 1', function() {
				var files = testFileClient.createTestFiles(['foo.bar | baz/messages-file.js', 'foo.bar | baz/bar/messages.js', 'foo.bar | baz/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('./requirejs/json!foo.bar | baz/messages-file', files, {location: 'TestingRoot/foo.bar | baz/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo.bar | baz/messages-file.js', 'Should have found file object with location TestingRoot/foo.bar | baz/messages.js');
				assert.equal(res[0].name, 'foo.bar | baz/messages-file.js', 'Should have found file object with name equal to foo.bar | baz/messages-file.js');
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476907
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - encoding 2', function() {
				var files = testFileClient.createTestFiles(['foo.bar | #baz/messages-file.js', 'foo.bar | #baz/bar/messages.js', 'foo.bar | #baz/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('./requirejs/json!foo.bar | #baz/messages-file', files, {location: 'TestingRoot/foo.bar | #baz/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo.bar | #baz/messages-file.js', 'Should have found file object with location TestingRoot/foo.bar | #baz/messages.js');
				assert.equal(res[0].name, 'foo.bar | #baz/messages-file.js', 'Should have found file object with name equal to foo.bar | #baz/messages-file.js');
	
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476907
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - encoding 3', function() {
				var files = testFileClient.createTestFiles(['foo.bar { $ baz/messages-file.js', 'foo.bar { $ baz/bar/messages.js', 'foo.bar { $ baz/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('./requirejs/json!foo.bar { $ baz/messages-file', files, {location: 'TestingRoot/foo.bar { $ baz/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo.bar { $ baz/messages-file.js', 'Should have found file object with location TestingRoot/foo.bar { $ baz/messages.js');
				assert.equal(res[0].name, 'foo.bar { $ baz/messages-file.js', 'Should have found file object with name equal to foo.bar { $ baz/messages-file.js');
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476907
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - encoding 4', function() {
				var files = testFileClient.createTestFiles(['foo.bar%20|%20baz/messages-file.js', 'foo.bar%20|%20baz/bar/messages.js', 'foo.bar%20|%20baz/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('./requirejs/json!foo.bar%20|%20baz/messages-file', files, {location: 'TestingRoot/foo.bar%20|%20baz/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo.bar%20|%20baz/messages-file.js', 'Should have found file object with location TestingRoot/foo.bar%20|%20baz/messages.js');
				assert.equal(res[0].name, 'foo.bar%20|%20baz/messages-file.js', 'Should have found file object with name equal to foo.bar%20|%20baz/messages-file.js');
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476907
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - encoding 5', function() {
				var files = testFileClient.createTestFiles(['foo.bar%20%7C%20baz/messages-file.js', 'foo.bar%20%7C%20baz/bar/messages.js', 'foo.bar%20%7C%20baz/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('./requirejs/json!foo.bar%20%7C%20baz/messages-file', files, {location: 'TestingRoot/foo.bar%20%7C%20baz/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo.bar%20%7C%20baz/messages-file.js', 'Should have found file object with location TestingRoot/foo.bar%20%7C%20baz/messages.js');
				assert.equal(res[0].name, 'foo.bar%20%7C%20baz/messages-file.js', 'Should have found file object with name equal to foo.bar%20%7C%20baz/messages-file.js');
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476907
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - encoding 6', function() {
				var files = testFileClient.createTestFiles(['foo.bar{}()*&^$baz/messages-file.js', 'foo.bar{}()*&^$baz/bar/messages.js', 'foo.bar{}()*&^$baz/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('./requirejs/json!foo.bar{}()*&^$baz/messages-file', files, {location: 'TestingRoot/foo.bar{}()*&^$baz/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo.bar{}()*&^$baz/messages-file.js', 'Should have found file object with location TestingRoot/foo.bar{}()*&^$baz/messages.js');
				assert.equal(res[0].name, 'foo.bar{}()*&^$baz/messages-file.js', 'Should have found file object with name equal to foo.bar{}()*&^$baz/messages-file.js');
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476907
			 * @since 10.0
			 */
			it('Test resolveRelativeFiles - encoding 7', function() {
				var files = testFileClient.createTestFiles(['foo.bar%7B%7D()*%26%5E%24baz/messages-file.js', 'foo.bar%7B%7D()*%26%5E%24baz/bar/messages.js', 'foo.bar%7B%7D()*%26%5E%24baz/bar/baz/messages.js']);
				var res = resolver.resolveRelativeFiles('./requirejs/json!foo.bar%7B%7D()*%26%5E%24baz/messages-file', files, {location: 'TestingRoot/foo.bar%7B%7D()*%26%5E%24baz/messages.js', contentType: {name: 'JavaScript'}});
				assert(Array.isArray(res), 'There should have been a files array returned');
				assert.equal(res.length, 1, 'There should have been one file returned');
				assert.equal(res[0].location, testFileClient.fileServiceRootURL()+'/foo.bar%7B%7D()*%26%5E%24baz/messages-file.js', 'Should have found file object with location TestingRoot/foo.bar%7B%7D()*%26%5E%24baz/messages.js');
				assert.equal(res[0].name, 'foo.bar%7B%7D()*%26%5E%24baz/messages-file.js', 'Should have found file object with name equal to foo.bar%7B%7D()*%26%5E%24baz/messages-file.js');
			});
		});
	};
});
