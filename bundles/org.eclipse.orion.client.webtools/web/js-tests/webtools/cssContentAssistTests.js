/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, mocha*/
define([
	'chai/chai',
	'webtools/cssContentAssist',
	'orion/serviceregistry',
	'webtools/cssResultManager',
	'orion/Deferred',
	'mocha/mocha' //global export, stays last
], function(chai, CssContentAssist, mServiceRegistry, cssResultManager, Deferred) {
	/* eslint-disable no-console, missing-nls */
	var assert = chai.assert;

	var serviceRegistry = new mServiceRegistry.ServiceRegistry();
	var cssResultMgr = new cssResultManager(serviceRegistry);
	var assist = new CssContentAssist.CssContentAssistProvider(cssResultMgr);

	function runTest(options, prefix, offset, expected){
		var config = setup(options);
		var contxt =  {
			delimiter: '\n',
			indentation: '',
			tab: '	',
			offset: offset,
			prefix: prefix
		};
		return assist.computeContentAssist(config.editorContext, contxt).then(function(proposals){
			assertProposals(proposals, expected);
		});
	}
	
	/**
	 * Set up the test and return an object for the test context
	 * @param {Object} options The map of options
	 */
	function setup(options) {
		var buffer = typeof options.buffer === "string" ? options.buffer : '';
		var file = typeof options.file === "string" ? options.file : 'css_content_assist_test_source.css';
		var editorContext = {
			getText: function() {
				return new Deferred().resolve(buffer);
			},

			getFileMetadata: function() {
				var o = Object.create(null);
				o.contentType = Object.create(null);
				o.contentType.id = 'text/css';
				o.location = file;
				return new Deferred().resolve(o);
			}
		};
		cssResultMgr.onModelChanging({
			file: {
				location: file
			}
		});
		return {
			editorContext: editorContext
		};
	}

	/**
	 * Compares the two arrays of proposals
	 * @param {Array.<Object>} computed The computed proposal array
	 * @param {Array.<Object>} expected The expected array of proposals  
	 */
	function assertProposals(computed, expected) {
		assert(Array.isArray(computed), 'There must have been a computed array of proposals');
		assert(Array.isArray(expected), 'There must be an expected array of proposals');
		assert.equal(computed.length, expected.length, 'The number of computed proposals does not match the expected count. Actual: ' + stringify(computed));
		for (var i = 0; i < computed.length; i++) {
			var c = computed[i];
			var e = expected[i];
			if (e.proposal){
				assert.equal(c.proposal, e.proposal, 'The proposals do not match. Actual: ' + stringify(computed));
			}
			if (e.description){
				assert.equal(c.description, e.description, 'The proposal descriptions do not match. Actual: ' + stringify(computed));
			}
			if (e.name){
				assert.equal(c.name, e.name, 'The proposal names do not match. Actual: ' + stringify(computed));
			}
		}
	}
	
	function stringify(proposals){
		var result = "\n";
		for (var i = 0; i < proposals.length; i++) {
			result += '{ ';
			if (proposals[i].name){
				result += "name: '" + proposals[i].name + "', ";
			} else if (proposals[i].description){
				result += "description: '" + proposals[i].description + "', ";
			}
			if (proposals[i].proposal){
				var propText = proposals[i].proposal.replace(/(?:\r\n|\r|\n)/g, '\\n');
				propText = propText.replace(/\t/g, '\\t');
				result += "proposal: '" + propText + "'";
			}
			result += "},\n";
		}
		return result;
	}
	
	describe('CSS Content Assist Tests', function() {
		it('General - empty file', function() {
			var expected = [
				{ description: 'element { }', proposal: 'element {\n\t\n}'},
				{ description: '#id { }', proposal: '#id {\n\t\n}'},
				{ description: '.class { }', proposal: '.class {\n\t\n}'},
				{ description: '[attribute] { }', proposal: '[attribute] {\n\t\n}'},
				{ description: '* { }', proposal: '* {\n\t\n}'},
				{ description: ':pseudo-class { }', proposal: ':pseudoclass {\n\t\n}'},
				{ description: '::pseudo-element { }', proposal: '::pseudoelement {\n\t\n}'},
				{ description: '@charset', proposal: '@charset "charset";'},
				{ description: '@import', proposal: '@import "url";'},
				{ description: '@namespace', proposal: '@namespace "url";'},
				{ description: '@media', proposal: '@media media-query-list {\n\t\n}'},
				{ description: '@supports', proposal: '@supports (condition) {\n\t\n}'},
				{ description: '@page', proposal: '@page page-selector-list {\n\t\n}'},
				{ description: '@font-face', proposal: '@font-face {\n\tfont-family: "family-name";\n\tsrc: "url";\n}'},
				{ description: '@keyframes', proposal: '@keyframes name {\n\t\n}'},
			];
			return runTest({buffer: ""}, '', 0, expected);
		});
		it('General - after rule close', function() {
			var expected = [
				{ description: 'element { }', proposal: 'element {\n\t\n}'},
				{ description: '#id { }', proposal: '#id {\n\t\n}'},
				{ description: '.class { }', proposal: '.class {\n\t\n}'},
				{ description: '[attribute] { }', proposal: '[attribute] {\n\t\n}'},
				{ description: '* { }', proposal: '* {\n\t\n}'},
				{ description: ':pseudo-class { }', proposal: ':pseudoclass {\n\t\n}'},
				{ description: '::pseudo-element { }', proposal: '::pseudoelement {\n\t\n}'},
				{ description: '@charset', proposal: '@charset "charset";'},
				{ description: '@import', proposal: '@import "url";'},
				{ description: '@namespace', proposal: '@namespace "url";'},
				{ description: '@media', proposal: '@media media-query-list {\n\t\n}'},
				{ description: '@supports', proposal: '@supports (condition) {\n\t\n}'},
				{ description: '@page', proposal: '@page page-selector-list {\n\t\n}'},
				{ description: '@font-face', proposal: '@font-face {\n\tfont-family: "family-name";\n\tsrc: "url";\n}'},
				{ description: '@keyframes', proposal: '@keyframes name {\n\t\n}'},
			];
			return runTest({buffer: "abc { a: 1; } "}, '', 14, expected);
		});
		it('General - after @import', function() {
			var expected = [
				{ description: 'element { }', proposal: 'element {\n\t\n}'},
				{ description: '#id { }', proposal: '#id {\n\t\n}'},
				{ description: '.class { }', proposal: '.class {\n\t\n}'},
				{ description: '[attribute] { }', proposal: '[attribute] {\n\t\n}'},
				{ description: '* { }', proposal: '* {\n\t\n}'},
				{ description: ':pseudo-class { }', proposal: ':pseudoclass {\n\t\n}'},
				{ description: '::pseudo-element { }', proposal: '::pseudoelement {\n\t\n}'},
				{ description: '@charset', proposal: '@charset "charset";'},
				{ description: '@import', proposal: '@import "url";'},
				{ description: '@namespace', proposal: '@namespace "url";'},
				{ description: '@media', proposal: '@media media-query-list {\n\t\n}'},
				{ description: '@supports', proposal: '@supports (condition) {\n\t\n}'},
				{ description: '@page', proposal: '@page page-selector-list {\n\t\n}'},
				{ description: '@font-face', proposal: '@font-face {\n\tfont-family: "family-name";\n\tsrc: "url";\n}'},
				{ description: '@keyframes', proposal: '@keyframes name {\n\t\n}'},
			];
			return runTest({buffer: "@import \"foo\";\n"}, '', 15, expected);
		});	
		it('Selector id - #', function() {
			var expected = [
				{ description: '#id { }', proposal: '#id {\n\t\n}'},
			];
			return runTest({buffer: "#"}, '#', 1, expected);
		});
		it('Selector class - .', function() {
			var expected = [
				{ description: '.class { }', proposal: '.class {\n\t\n}'},
			];
			return runTest({buffer: "."}, '.', 1, expected);
		});
		it('Selector attribute - [', function() {
			var expected = [
				{ description: '[attribute] { }', proposal: '[attribute] {\n\t\n}'},
			];
			return runTest({buffer: "["}, '[', 1, expected);
		});
		it('Selector attribute - []', function() {
			var expected = [
				{ description: '[attribute] { }', proposal: '[attribute] {\n\t\n}'},
			];
			return runTest({buffer: "[]"}, '[', 1, expected);
		});
		it('Selector universal - *', function() {
			var expected = [
				{ description: '* { }', proposal: '* {\n\t\n}'},
			];
			// need .other because if * is the only character in the file, the ast calls it DeclarationBody
			return runTest({buffer: "*\n.other{ }"}, '*', 1, expected);
		});
		it('Selector list of all pseudo-classes starting with : (also proposes :: pseudo-elements)', function() {
			var expected = [
				{ description: ':pseudo-class { }', proposal: ':pseudoclass {\n\t\n}'},
				{ description: '::pseudo-element { }', proposal: '::pseudoelement {\n\t\n}'},
				{ name: ':active', proposal: ':active {\n\t\n}\n'},
				{ name: ':checked', proposal: ':checked {\n\t\n}\n'},
				{ name: ':default', proposal: ':default {\n\t\n}\n'},
				{ name: ':disabled', proposal: ':disabled {\n\t\n}\n'},
				{ name: ':empty', proposal: ':empty {\n\t\n}\n'},
				{ name: ':enabled', proposal: ':enabled {\n\t\n}\n'},
				{ name: ':first-child', proposal: ':first-child {\n\t\n}\n'},
				{ name: ':first-of-type', proposal: ':first-of-type {\n\t\n}\n'},
				{ name: ':focus', proposal: ':focus {\n\t\n}\n'},
				{ name: ':hover', proposal: ':hover {\n\t\n}\n'},
				{ name: ':indeterminate', proposal: ':indeterminate {\n\t\n}\n'},
				{ name: ':lang(lang)', proposal: ':lang(lang) {\n\t\n}\n'},
				{ name: ':last-child', proposal: ':last-child {\n\t\n}\n'},
				{ name: ':last-of-type', proposal: ':last-of-type {\n\t\n}\n'},
				{ name: ':link', proposal: ':link {\n\t\n}\n'},
				{ name: ':not(selector)', proposal: ':not(selector) {\n\t\n}\n'},
				{ name: ':nth-child(n)', proposal: ':nth-child(n) {\n\t\n}\n'},
				{ name: ':nth-last-child(n)', proposal: ':nth-last-child(n) {\n\t\n}\n'},
				{ name: ':nth-last-of-type(n)', proposal: ':nth-last-of-type(n) {\n\t\n}\n'},
				{ name: ':nth-of-type(n)', proposal: ':nth-of-type(n) {\n\t\n}\n'},
				{ name: ':only-child', proposal: ':only-child {\n\t\n}\n'},
				{ name: ':only-of-type', proposal: ':only-of-type {\n\t\n}\n'},
				{ name: ':optional', proposal: ':optional {\n\t\n}\n'},
				{ name: ':required', proposal: ':required {\n\t\n}\n'},
				{ name: ':root', proposal: ':root {\n\t\n}\n'},
				{ name: ':target', proposal: ':target {\n\t\n}\n'},
				{ name: ':valid', proposal: ':valid {\n\t\n}\n'},
				{ name: ':visited', proposal: ':visited {\n\t\n}\n'},
				{ name: '::after', proposal: '::after {\n\t\n}\n'},
				{ name: '::before', proposal: '::before {\n\t\n}\n'},
				{ name: '::first-letter', proposal: '::first-letter {\n\t\n}\n'},
				{ name: '::first-line', proposal: '::first-line {\n\t\n}\n'},
			];
			return runTest({buffer: ":"}, ':', 1, expected);
		});
		it('Selector list of all pseudo-elements starting with ::', function() {
			var expected = [
				{ description: '::pseudo-element { }', proposal: '::pseudoelement {\n\t\n}'},
				{ name: '::after', proposal: '::after {\n\t\n}\n'},
				{ name: '::before', proposal: '::before {\n\t\n}\n'},
				{ name: '::first-letter', proposal: '::first-letter {\n\t\n}\n'},
				{ name: '::first-line', proposal: '::first-line {\n\t\n}\n'},
			];
			return runTest({buffer: "::"}, '::', 2, expected);
		});
		it('Selector specific pseudo-class starting with :a -> :active', function() {
			var expected = [
				{ name: ':active', proposal: ':active {\n\t\n}\n'},
			];
			// need .other because if :a is the only text in the file, the ast calls it DeclarationBody
			return runTest({buffer: ":a\n.other{ }"}, ':a', 2, expected);
		});
		it('Selector list of pseudo-classes starting with :f', function() {
			var expected = [
				{ name: ':first-child', proposal: ':first-child {\n\t\n}\n'},
				{ name: ':first-of-type', proposal: ':first-of-type {\n\t\n}\n'},
				{ name: ':focus', proposal: ':focus {\n\t\n}\n'},
			];
			// need .other because if :f is the only text in the file, the ast calls it DeclarationBody
			return runTest({buffer: ":f\n.other{ }"}, ':f', 2, expected);
		});
		it('Selector list of pseudo-classes starting with :nt', function() {
			var expected = [
				{ name: ':nth-child(n)', proposal: ':nth-child(n) {\n\t\n}\n'},
				{ name: ':nth-last-child(n)', proposal: ':nth-last-child(n) {\n\t\n}\n'},
				{ name: ':nth-last-of-type(n)', proposal: ':nth-last-of-type(n) {\n\t\n}\n'},
				{ name: ':nth-of-type(n)', proposal: ':nth-of-type(n) {\n\t\n}\n'},
			];
			// need .other because if :nt is the only text in the file, the ast calls it DeclarationBody
			return runTest({buffer: ":nt\n.other{ }"}, ':nt', 3, expected);
		});
		it('Selector list of pseudo-classes starting with .myclass: (also proposes :: pseudo-elements)', function() {
			var expected = [
				{ description: ':pseudo-class { }', proposal: ':pseudoclass {\n\t\n}'},
				{ description: '::pseudo-element { }', proposal: '::pseudoelement {\n\t\n}'},
				{ name: ':active', proposal: ':active {\n\t\n}\n'},
				{ name: ':checked', proposal: ':checked {\n\t\n}\n'},
				{ name: ':default', proposal: ':default {\n\t\n}\n'},
				{ name: ':disabled', proposal: ':disabled {\n\t\n}\n'},
				{ name: ':empty', proposal: ':empty {\n\t\n}\n'},
				{ name: ':enabled', proposal: ':enabled {\n\t\n}\n'},
				{ name: ':first-child', proposal: ':first-child {\n\t\n}\n'},
				{ name: ':first-of-type', proposal: ':first-of-type {\n\t\n}\n'},
				{ name: ':focus', proposal: ':focus {\n\t\n}\n'},
				{ name: ':hover', proposal: ':hover {\n\t\n}\n'},
				{ name: ':indeterminate', proposal: ':indeterminate {\n\t\n}\n'},
				{ name: ':lang(lang)', proposal: ':lang(lang) {\n\t\n}\n'},
				{ name: ':last-child', proposal: ':last-child {\n\t\n}\n'},
				{ name: ':last-of-type', proposal: ':last-of-type {\n\t\n}\n'},
				{ name: ':link', proposal: ':link {\n\t\n}\n'},
				{ name: ':not(selector)', proposal: ':not(selector) {\n\t\n}\n'},
				{ name: ':nth-child(n)', proposal: ':nth-child(n) {\n\t\n}\n'},
				{ name: ':nth-last-child(n)', proposal: ':nth-last-child(n) {\n\t\n}\n'},
				{ name: ':nth-last-of-type(n)', proposal: ':nth-last-of-type(n) {\n\t\n}\n'},
				{ name: ':nth-of-type(n)', proposal: ':nth-of-type(n) {\n\t\n}\n'},
				{ name: ':only-child', proposal: ':only-child {\n\t\n}\n'},
				{ name: ':only-of-type', proposal: ':only-of-type {\n\t\n}\n'},
				{ name: ':optional', proposal: ':optional {\n\t\n}\n'},
				{ name: ':required', proposal: ':required {\n\t\n}\n'},
				{ name: ':root', proposal: ':root {\n\t\n}\n'},
				{ name: ':target', proposal: ':target {\n\t\n}\n'},
				{ name: ':valid', proposal: ':valid {\n\t\n}\n'},
				{ name: ':visited', proposal: ':visited {\n\t\n}\n'},
				{ name: '::after', proposal: '::after {\n\t\n}\n'},
				{ name: '::before', proposal: '::before {\n\t\n}\n'},
				{ name: '::first-letter', proposal: '::first-letter {\n\t\n}\n'},
				{ name: '::first-line', proposal: '::first-line {\n\t\n}\n'},
			];
			return runTest({buffer: ".myclass:"}, ':', 9, expected);
		});
		it('Selector specific pseudo-class starting with a:vi -> :visited', function() {
			var expected = [
				{ name: ':visited', proposal: ':visited {\n\t\n}\n'},
			];
			// need .other because if a:vi is the only text in the file, the ast calls it DeclarationBody
			return runTest({buffer: "a:vi\n.other{ }"}, ':vi', 4, expected);
		});
		it('Selector specific pseudo-element starting with ::a -> :after', function() {
			var expected = [
				{ name: '::after', proposal: '::after {\n\t\n}\n'},
			];
			// need .other because if ::a is the only text in the file, the ast calls it DeclarationBody
			return runTest({buffer: "::a\n.other{ }"}, '::a', 3, expected);
		});
		it('Selector list of pseudo-elements starting with ::f', function() {
			var expected = [
				{ name: '::first-letter', proposal: '::first-letter {\n\t\n}\n'},
				{ name: '::first-line', proposal: '::first-line {\n\t\n}\n'},
			];
			// need .other because if ::f is the only text in the file, the ast calls it DeclarationBody
			return runTest({buffer: "::f\n.other{ }"}, '::f', 3, expected);
		});
		it('Selector list of pseudo-elements starting with .myclass::', function() {
			var expected = [
				{ description: '::pseudo-element { }', proposal: '::pseudoelement {\n\t\n}'},
				{ name: '::after', proposal: '::after {\n\t\n}\n'},
				{ name: '::before', proposal: '::before {\n\t\n}\n'},
				{ name: '::first-letter', proposal: '::first-letter {\n\t\n}\n'},
				{ name: '::first-line', proposal: '::first-line {\n\t\n}\n'},
			];
			return runTest({buffer: ".myclass::"}, '::', 10, expected);
		});
		it('Selector specific pseudo-element starting with span::b', function() {
			var expected = [
				{ name: '::before', proposal: '::before {\n\t\n}\n'},
			];
			// need .other because if span::b is the only text in the file, the ast calls it DeclarationBody
			return runTest({buffer: "span::b\n.other{ }"}, '::b', 7, expected);
		});
		
		it('Property - cue', function() {
			var expected = [
				{ name: 'cue', proposal: 'cue: ;'},
				{ name: 'cue-after', proposal: 'cue-after: ;'},
				{ name: 'cue-before', proposal: 'cue-before: ;'},
			];
			return runTest({buffer: "abc{ cue"}, 'cue', 8, expected);
		});
		it('Property - border', function() {
			var expected = [
				{ name: 'border', proposal: 'border: ;'},
				{ name: 'border-bottom', proposal: 'border-bottom: ;'},
				{ name: 'border-bottom-color', proposal: 'border-bottom-color: ;'},
				{ name: 'border-bottom-left-radius', proposal: 'border-bottom-left-radius: ;'},
				{ name: 'border-bottom-right-radius', proposal: 'border-bottom-right-radius: ;'},
				{ name: 'border-bottom-style', proposal: 'border-bottom-style: ;'},
				{ name: 'border-bottom-width', proposal: 'border-bottom-width: ;'},
				{ name: 'border-collapse', proposal: 'border-collapse: ;'},
				{ name: 'border-color', proposal: 'border-color: ;'},
				{ name: 'border-image', proposal: 'border-image: ;'},
				{ name: 'border-image-outset', proposal: 'border-image-outset: ;'},
				{ name: 'border-image-repeat', proposal: 'border-image-repeat: ;'},
				{ name: 'border-image-slice', proposal: 'border-image-slice: ;'},
				{ name: 'border-image-source', proposal: 'border-image-source: ;'},
				{ name: 'border-image-width', proposal: 'border-image-width: ;'},
				{ name: 'border-left', proposal: 'border-left: ;'},
				{ name: 'border-left-color', proposal: 'border-left-color: ;'},
				{ name: 'border-left-style', proposal: 'border-left-style: ;'},
				{ name: 'border-left-width', proposal: 'border-left-width: ;'},
				{ name: 'border-radius', proposal: 'border-radius: ;'},
				{ name: 'border-right', proposal: 'border-right: ;'},
				{ name: 'border-right-color', proposal: 'border-right-color: ;'},
				{ name: 'border-right-style', proposal: 'border-right-style: ;'},
				{ name: 'border-right-width', proposal: 'border-right-width: ;'},
				{ name: 'border-spacing', proposal: 'border-spacing: ;'},
				{ name: 'border-style', proposal: 'border-style: ;'},
				{ name: 'border-top', proposal: 'border-top: ;'},
				{ name: 'border-top-color', proposal: 'border-top-color: ;'},
				{ name: 'border-top-left-radius', proposal: 'border-top-left-radius: ;'},
				{ name: 'border-top-right-radius', proposal: 'border-top-right-radius: ;'},
				{ name: 'border-top-style', proposal: 'border-top-style: ;'},
				{ name: 'border-top-width', proposal: 'border-top-width: ;'},
				{ name: 'border-width', proposal: 'border-width: ;'},
			];
			return runTest({buffer: "abc{ border"}, 'border', 11, expected);
		});
		
		it('Property value - cue 1 (csslint prop = <cue-before> | <cue-after>', function() {
			var expected = [
				{ name: 'cue-after', proposal: 'cue-after'},
				{ name: 'cue-before', proposal: 'cue-before'},
			];
			return runTest({buffer: "abc{ cue: "}, '', 9, expected);
		});
		it('Property value - cue 2', function() {
			var expected = [
				{ name: 'cue-after', proposal: 'cue-after'},
				{ name: 'cue-before', proposal: 'cue-before'},
			];
			return runTest({buffer: "abc{ cue: "}, '', 10, expected);
		});
		it('Property value - cue 3', function() {
			var expected = [
				{ name: 'cue-after', proposal: 'cue-after'},
				{ name: 'cue-before', proposal: 'cue-before'},
			];
			return runTest({buffer: "abc{ cue: ;}"}, '', 10, expected);
		});
		it('Property value - cue-before (csslint prop = 1)', function() {
			var expected = [
			];
			return runTest({buffer: "abc{ cue-before: "}, '', 16, expected);
		});
		it('Property value - complex type with Matcher object, text-decoration-line', function() {
			var expected = [
				{ name: 'none', proposal: 'none'},
				{ name: 'underline', proposal: 'underline'},
				{ name: 'overline', proposal: 'overline'},
				{ name: 'line-through', proposal: 'line-through'},
				{ name: 'blink', proposal: 'blink'},
			];
			return runTest({buffer: "abc{ text-decoration-line: "}, '', 27, expected);
		});
		it('Property value - complex type with Matcher object, text-decoration, do prefix', function() {
			var expected = [
				{ name: 'double', proposal: 'double'},
				{ name: 'dotted', proposal: 'dotted'},
				{ name: 'dodgerblue', proposal: 'dodgerblue'},
			];
			return runTest({buffer: "abc{ text-decoration: do"}, 'do', 24, expected);
		});
		
		it('Conditional at rules media 1', function() {
			var expected = [
			];
			return runTest({buffer: "abc{ a:1; } @media  some and ( width:5px) {  abc { cue:2; } } "}, '@me', 15, expected);
		});
		it('Conditional at rules media 2', function() {
			var expected = [
			];
			return runTest({buffer: "abc{ a:1; } @media  some and ( width:5px) {  abc { cue:2; } } "}, '', 19, expected);
		});
		it('Conditional at rules media 3', function() {
			var expected = [
			];
			return runTest({buffer: "abc{ a:1; } @media  some and ( width:5px) {  abc { cue:2; } } "}, '', 30, expected);
		});
		it('Conditional at rules media 4', function() {
			var expected = [
				{ description: 'element { }', proposal: 'element {\n\t\n}'},
				{ description: '#id { }', proposal: '#id {\n\t\n}'},
				{ description: '.class { }', proposal: '.class {\n\t\n}'},
				{ description: '[attribute] { }', proposal: '[attribute] {\n\t\n}'},
				{ description: '* { }', proposal: '* {\n\t\n}'},
				{ description: ':pseudo-class { }', proposal: ':pseudoclass {\n\t\n}'},
				{ description: '::pseudo-element { }', proposal: '::pseudoelement {\n\t\n}'},
				{ description: '@media', proposal: '@media media-query-list {\n\t\n}'},
				{ description: '@supports', proposal: '@supports (condition) {\n\t\n}'},
				{ description: '@page', proposal: '@page page-selector-list {\n\t\n}'},
				{ description: '@font-face', proposal: '@font-face {\n\tfont-family: "family-name";\n\tsrc: "url";\n}'},
				{ description: '@keyframes', proposal: '@keyframes name {\n\t\n}'},
			];
			return runTest({buffer: "abc{ a:1; } @media  some and ( width:5px) {  abc { cue:2; } } "}, '', 44, expected);
		});
		it('Conditional at rules media 5', function() {
			var expected = [
				{ name: 'cue', proposal: 'cue: ;'},
				{ name: 'cue-after', proposal: 'cue-after: ;'},
				{ name: 'cue-before', proposal: 'cue-before: ;'},
			];
			return runTest({buffer: "abc{ a:1; } @media  some and ( width:5px) {  abc { cue:2; } } "}, 'cue', 54, expected);
		});
		it('Conditional at rules supports 1', function() {
			var expected = [
			];
			return runTest({buffer: "abc{ a:1; }\n@supports  ( animation-name: test) {  abc { cue:2; } } "}, '@su', 15, expected);
		});
		it('Conditional at rules supports 2', function() {
			var expected = [
			];
			return runTest({buffer: "abc{ a:1; }\n@supports  ( animation-name: test) {  abc { cue:2; } } "}, '', 22, expected);
		});
		it('Conditional at rules supports 3', function() {
			var expected = [
			];
			return runTest({buffer: "abc{ a:1; }\n@supports  ( animation-name: test) {  abc { cue:2; } } "}, '', 24, expected);
		});
		it('Conditional at rules supports 4', function() {
			var expected = [
				{ description: 'element { }', proposal: 'element {\n\t\n}'},
				{ description: '#id { }', proposal: '#id {\n\t\n}'},
				{ description: '.class { }', proposal: '.class {\n\t\n}'},
				{ description: '[attribute] { }', proposal: '[attribute] {\n\t\n}'},
				{ description: '* { }', proposal: '* {\n\t\n}'},
				{ description: ':pseudo-class { }', proposal: ':pseudoclass {\n\t\n}'},
				{ description: '::pseudo-element { }', proposal: '::pseudoelement {\n\t\n}'},
				{ description: '@media', proposal: '@media media-query-list {\n\t\n}'},
				{ description: '@supports', proposal: '@supports (condition) {\n\t\n}'},
				{ description: '@page', proposal: '@page page-selector-list {\n\t\n}'},
				{ description: '@font-face', proposal: '@font-face {\n\tfont-family: "family-name";\n\tsrc: "url";\n}'},
				{ description: '@keyframes', proposal: '@keyframes name {\n\t\n}'},
			];
			return runTest({buffer: "abc{ a:1; }\n@supports  ( animation-name: test) {  abc { cue:2; } } "}, '', 49, expected);
		});
		it('Conditional at rules supports 5', function() {
			var expected = [
				{ name: 'cue', proposal: 'cue: ;'},
				{ name: 'cue-after', proposal: 'cue-after: ;'},
				{ name: 'cue-before', proposal: 'cue-before: ;'},
			];
			return runTest({buffer: "abc{ a:1; }\n@supports  ( animation-name: test) {  abc { cue:2; } } "}, 'cue', 59, expected);
		});
	});
});
