/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
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
'webtools/htmlContentAssist',
'webtools/htmlAstManager',
'orion/Deferred',
'mocha/mocha' //global export, stays last
], function(chai, HTMLAssist, ASTManager, Deferred) {
    /* eslint-disable no-console, missing-nls */
    var assert = chai.assert;
    
    var astmanager = new ASTManager.HtmlAstManager();
    var assist = new HTMLAssist.HTMLContentAssistProvider(astmanager);
    var tagTemplates = assist.getTags("", "");
    var globalTagAttributes = assist.getAttributesForNode({name: "zzz", type: "tag"}, "", {offset: 0, prefix: ""});
    
    /**
     * Set up the test and return an object for the test context
     * @param {Object} options The map of options
     */
    function setup(options) {
    	var buffer = typeof(options.buffer) === "string" ? options.buffer : '';
    	var file = typeof(options.file) === "string" ? options.file : 'html_content_assist_test_source.html';
    	var editorContext = {
    		getText: function() {
				return new Deferred().resolve(buffer);
			},
			
			getFileMetadata: function() {
			    var o = Object.create(null);
			    o.contentType = Object.create(null);
			    o.contentType.id = 'text/html';
			    o.location = file;
			    return new Deferred().resolve(o);
			}
    	};
    	astmanager.onModelChanging({file: {location: file}});
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
    	assert.equal(computed.length, expected.length, 'The number of computed proposals does not match the expected count');
    	for(var i = 0; i < computed.length; i++) {
    		var c = computed[i];
    		var e = expected[i];
    		assert.equal(c.proposal, e.proposal, 'The proposals do not match');
    		assert.equal(c.prefix, e.prefix, 'The prefixes do not match');
    	}
    }
    
    function assertTagProposals(computed){
    	assert(computed.length === tagTemplates.length, "Incorrect number of proposals for tag templates. Proposal count: " + computed.length + " Expected count: " + tagTemplates.length);
    	assert(computed[0].name === "a", "First proposal wasn't the tag 'a'");
    }
    
    function assertGlobalTagAttributes(computed){
    	assert(computed.length === globalTagAttributes.length, "Incorrect number of proposals for tag attributes. Proposal count: " + computed.length + " Expected count: " + globalTagAttributes.length);
    	assert(computed[0].name === "accesskey", "First proposal wasn't the tag attribute 'accesskey'.");
    }
    
    describe('HTML Content Assist Tests', function() {
    	it('Check there are tag templates and attribute map', function() {
	    	assert(tagTemplates.length > 120, "Not enough tag templates. Template count: " + tagTemplates.length);
	    	assert(tagTemplates.length < 140, "Too many tag templates. Template count: " + tagTemplates.length);
	    	// aria added 16+"ARIA title"=17 to attribute count (currently 82)
	    	assert(globalTagAttributes.length > 80, "Not enough global tag attributes. Global attribute count: " + globalTagAttributes.length);
	    	assert(globalTagAttributes.length < 90, "Too many global tag attributes. Global attribute count: " + globalTagAttributes.length);
    	});
    	it('Empty file', function() {
    		var _o = setup({buffer: ''});
    		return assist.computeContentAssist(_o.editorContext, {offset: 0}).then(function(proposals) {
    			assert(Array.isArray(proposals), "There should have been an array of proposals returned");
    			assert.equal(proposals.length, 1, 'There should be a single proposal returned');
    			var _p = proposals[0];
    			assert.equal(_p.proposal.indexOf("<!DOCTYPE html>"), 0, 'Should have been the HTML file template');
    		});
    	});
    	it('No complete tags 1', function() {
    		var _o = setup({buffer: '   \t\n'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 0}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('No complete tags 2', function() {
    		var _o = setup({buffer: '   \t\n'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('No complete tags 3', function() {
    		var _o = setup({buffer: '   <'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 0}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('No complete tags 4', function() {
    		var _o = setup({buffer: '<'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 0}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});    	
    	it('No complete tags 5', function() {
    		var _o = setup({buffer: 'foo\n'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 4}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('meta template', function() {
    		var _o = setup({buffer: '<met'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 4, prefix: 'met'}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: 'meta></meta>', prefix: 'met'},
    				{proposal: 'meter></meter>', prefix: 'met'}
    			]);
    		});
    	});
    	it('param template', function() {
    		var _o = setup({buffer: '<par'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 4, prefix: 'par'}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: 'param></param>', prefix: 'par'}
    			]);
    		});
    	});
    	it('script template', function() {
    		var _o = setup({buffer: '<sc'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 3, prefix: 'sc'}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: 'script></script>', prefix: 'sc'}
    			]);
    		});
    	});
    	it('style template', function() {
    		var _o = setup({buffer: '<sty'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 4, prefix: 'sty'}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: 'style></style>', prefix: 'sty'}
    			]);
    		});
    	});
    	it('Close tag </ 1', function() {
    		var _o = setup({buffer: '<a></'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '</a>', prefix: '</'}
    			]);
    		});
    	});
    	it('Close tag </ 2', function() {
    		var _o = setup({buffer: '<a>     </'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 10}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '</a>', prefix: '</'}
    			]);
    		});
    	});
    	it('Close tag </ 3', function() {
    		var _o = setup({buffer: '<a>\tfoo\t</'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 10}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '</a>', prefix: '</'}
    			]);
    		});
    	});
    	it('Close tag </ 4', function() {
    		var _o = setup({buffer: '<a>foo\n\n</'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 10}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '</a>', prefix: '</'}
    			]);
    		});
    	});    	
    	// TODO This test should be made to pass but the parser ignores the <a> tag
    	it.skip('Close tag </ nested', function() {
    		var _o = setup({buffer: '<body><a>foo\n\n</</body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 16}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '</a>', prefix: '</'}
    			]);
    		});
    	});
    	it('Close tag </ whitespace after 1', function() {
    		var _o = setup({buffer: '<a></  '});
    		return assist.computeContentAssist(_o.editorContext, {offset: 7}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('Close tag </ whitespace after 2', function() {
    		var _o = setup({buffer: '<a></\t'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 6}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('Close tag </ whitespace after 3', function() {
    		var _o = setup({buffer: '<a></\n'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 6}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('Close tag / 1', function() {
    		var _o = setup({buffer: '<a>/'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '</a>', prefix: '/'}
    			]);
    		});
    	});
    	it('Close tag / 2', function() {
    		var _o = setup({buffer: '<a>     /'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 9}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '</a>', prefix: '/'}
    			]);
    		});
    	});
    	it('Close tag / 3', function() {
    		var _o = setup({buffer: '<a>\tfoo\t/'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 9}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '</a>', prefix: '/'}
    			]);
    		});
    	});
    	it('Close tag / 4', function() {
    		var _o = setup({buffer: '<a>foo\n\n/'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 9}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '</a>', prefix: '/'}
    			]);
    		});
    	});    	
    	it('Close tag / nested', function() {
    		var _o = setup({buffer: '<body><a>foo\n\n/</body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 15}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '</a>', prefix: '/'}
    			]);
    		});
    	});
    	it('Close tag / whitespace after 1', function() {
    		var _o = setup({buffer: '<a>/   '});
    		return assist.computeContentAssist(_o.editorContext, {offset: 7}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('Close tag / whitespace after 2', function() {
    		var _o = setup({buffer: '<a>/\t'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('Close tag / whitespace after 3', function() {
    		var _o = setup({buffer: '<a>/\n'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('Close tag </ with newline between', function() {
    		var _o = setup({buffer: '<a><\n/'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 6}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '</a>', prefix: '/'}
    			]);
    		});
    	});
    	it('Tag templates 1', function() {
    		var _o = setup({buffer: '<ar'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 3, prefix: 'ar'}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: 'area></area>', prefix: 'ar'},
    				{proposal: 'article></article>', prefix: 'ar'}
    			]);
    		});
    	});
    	it('Tag templates 2', function() {
    		var _o = setup({buffer: '<html>\n<body><ar</body>\n</html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 16, prefix: 'ar'}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: 'area></area>', prefix: 'ar'},
    				{proposal: 'article></article>', prefix: 'ar'}
    			]);
    		});
    	});
    	it('Tag templates 3', function() {
    		var _o = setup({buffer: '<html>\n<body><ar\n</body>\n</html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 17}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    		});
    	});
    	it('Tag attribute proposals 1', function() {
    		var _o = setup({buffer: '<zzz >'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    		});
    	});
    	it('Tag attribute proposals 2', function() {
    		var _o = setup({buffer: '<body>\n<zzz >\n</body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    		});
    	});
    	it('Tag attribute proposals 3', function() {
    		var _o = setup({buffer: '<a hr></a>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5, prefix: 'hr'}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: 'href=""', prefix: 'hr'},
    				{proposal: 'hreflang=""', prefix: 'hr'}
    			]);
    		});
    	});
    	it('Tag attribute proposals 4', function() {
    		var _o = setup({buffer: '<body><zzz xxxx="test" ></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 23}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    		});
    	});
		it('Tag attribute proposals 5', function() {
    		var _o = setup({buffer: '<body><zzz  xxxx="test"></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    		});
    	});
    	it('Tag attribute proposals 6', function() {
    		var _o = setup({buffer: '<a href></a>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 7, prefix: 'href'}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: 'href=""', prefix: 'href'},
    				{proposal: 'hreflang=""', prefix: 'href'}
    			]);
    		});
    	});
    	it('Tag attribute proposals unclosed tag 1', function() {
    		var _o = setup({buffer: '<zzz </zzz>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    		});
    	});
    	it('Tag attribute proposals unclosed tag 2', function() {
    		var _o = setup({buffer: '<zzz '});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    		});
    	});
    	it('Tag attribute proposals unclosed tag 3', function() {
    		var _o = setup({buffer: '<zzz >'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 6}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('Tag attribute proposals unclosed tag 4', function() {
    		var _o = setup({buffer: '<zzz <'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 6}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('Tag attribute proposals filter existing 1', function() {
    		var _o = setup({buffer: '<html><body ></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 3; // body tag attributes = globals + bgcolor + aria-expanded + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "bgcolor"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal bgcolor");
    			assert(knownProp.description.indexOf("Obsolete") >= 0, "bgcolor should be marked as obsolete");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-expanded");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
	   		});
    	});
    	it('Tag attribute proposals filter existing 2', function() {
    		var _o = setup({buffer: '<html><body bgcolor="blue"></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // body tag attributes = globals + [bgcolor] + aria-expanded + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "bgcolor"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "bgcolor was not filtered");
    		});
    	});
    	it('Tag attribute proposals filter existing 3', function() {
    		var _o = setup({buffer: '<html><body TESTTESTTEST="TEST" bgcolor="blue"></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // body tag attributes = globals + [bgcolor] + aria-expanded + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "bgcolor"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "bgcolor was not filtered");
    		});
    	});
    	it('Tag attribute proposals filter existing 4', function() {
    		var _o = setup({buffer: '<html><body  TESTTESTTEST="TEST" bgcolor="blue"></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // body tag attributes = globals + [bgcolor] + aria-expanded + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "bgcolor"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "bgcolor was not filtered");
    		});
    	});
    	it('Tag attribute proposals filter existing 5', function() {
    		var _o = setup({buffer: '<html><body  bgcolor="blue"></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // body tag attributes = globals + [bgcolor] + aria-expanded + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "bgcolor"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "bgcolor was not filtered");
    		});
    	});
    	it('Tag attribute proposals filter existing 6 (offset after existing)', function() {
    		var _o = setup({buffer: '<html><body bgcolor="blue" ></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 27}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // body tag attributes = globals + [bgcolor] + aria-expanded + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "bgcolor"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "bgcolor was not filtered");
    		});
    	});
    	it('Tag attribute proposals filter existing 7 (filter 2 attributes, offset after 2nd attribute)', function() {
    		var _o = setup({buffer: '<html><body bgcolor="blue" accesskey="x" ></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 41}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 1; // body tag attributes = globals + [bgcolor] + aria-expanded + role - accesskey
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "accesskey"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "accesskey was not filtered");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "bgcolor"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "bgcolor was not filtered");
    		});
    	});
    	it('Tag attribute proposals prefix 1', function() {
    		var _o = setup({buffer: '<zzz acc>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 8, prefix: 'acc'}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: 'accesskey=""', prefix: 'acc'},
    			]);
    		});
    	});
    	it('Tag attribute proposals prefix 2', function() {
    		var _o = setup({buffer: '<body><zzz acc></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 14, prefix: 'acc'}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: 'accesskey=""', prefix: 'acc'},
    			]);
    		});
    	});
    	it('Tag attribute proposals prefix 3', function() {
    		var _o = setup({buffer: '<body><zzz lang="test" acc></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 26, prefix: 'acc'}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: 'accesskey=""', prefix: 'acc'},
    			]);
    		});
    	});
    	it('Tag attribute proposals prefix 4', function() {
    		var _o = setup({buffer: '<body><zzz acc lang="test"></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 14, prefix: 'acc'}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: 'accesskey=""', prefix: 'acc'},
    			]);
    		});
    	});
    	it('Tag attribute proposals incomplete tag 1', function() {
    		var _o = setup({buffer: '<zzz '});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    		});
    	});
    	it('Tag attribute proposals incomplete tag 2', function() {
    		var _o = setup({buffer: '<body><zzz </body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 11}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    		});
    	});
		it('Tag attribute proposals script blocks 1', function() {
    		var _o = setup({buffer: '<body><script ></script></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 14}).then(function(proposals) {
    			assert(proposals.length === globalTagAttributes.length + 6, "Incorrect number of proposals for script tag attributes. Proposal count: " + proposals.length + " Expected count: " + globalTagAttributes.length + 6);
//				name: "async",
//				name: "charset",
//				name: "defer",
//				name: "language",
//				name: "src",
//				name: "type",
    		});
    	});
    	it('Tag attribute proposals script blocks 2', function() {
    		var _o = setup({buffer: '<body><script TESTTESTTEST="TEST"></script></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 14}).then(function(proposals) {
    			assert(proposals.length === globalTagAttributes.length + 6, "Incorrect number of proposals for script tag attributes. Proposal count: " + proposals.length + " Expected count: " + (globalTagAttributes.length + 6));
//				name: "async",
//				name: "charset",
//				name: "defer",
//				name: "language",
//				name: "src",
//				name: "type",
    		});
    	});
    	it('Tag attribute proposals script blocks 3', function() {
    		var _o = setup({buffer: '<body><script async="false"></script></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 14}).then(function(proposals) {
    			assert(proposals.length === globalTagAttributes.length + 5, "Incorrect number of proposals for script tag attributes. Proposal count: " + proposals.length + " Expected count: " + (globalTagAttributes.length + 5));
//				name: "async", ALREADY THERE
//				name: "charset",
//				name: "defer",
//				name: "language",
//				name: "src",
//				name: "type",
    		});
    	});
    	it('Tag attribute proposals script blocks 4', function() {
    		var _o = setup({buffer: '<body><script ></script></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 15}).then(function(proposals) {
    			assertProposals(proposals, []);
    		});
    	});
    	it('Tag attribute proposals style blocks 1', function() {
    		var _o = setup({buffer: '<body><style ></style></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 13}).then(function(proposals) {
    			assert(proposals.length === globalTagAttributes.length + 3, "Incorrect number of proposals for script tag attributes. Proposal count: " + proposals.length + " Expected count: " + globalTagAttributes.length + 3);
//				name: "media",
//				name: "scoped",
//				name: "type",
    		});
    	});
    	it('Tag attribute proposals style blocks 2', function() {
    		var _o = setup({buffer: '<body><style TESTTESTTEST="TEST"></style></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 14}).then(function(proposals) {
    			assert(proposals.length === globalTagAttributes.length + 3, "Incorrect number of proposals for script tag attributes. Proposal count: " + proposals.length + " Expected count: " + (globalTagAttributes.length + 3));
//				name: "media",
//				name: "scoped",
//				name: "type",
    		});
    	});
    	it('Tag attribute proposals style blocks 3', function() {
    		var _o = setup({buffer: '<body><style media="false"></style></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 14}).then(function(proposals) {
    			assert(proposals.length === globalTagAttributes.length + 2, "Incorrect number of proposals for script tag attributes. Proposal count: " + proposals.length + " Expected count: " + (globalTagAttributes.length + 2));
//				name: "media", // ALREADY THERE
//				name: "scoped",
//				name: "type",
    		});
    	});
    	it('Tag attribute proposals style blocks 4', function() {
    		var _o = setup({buffer: '<body><style ></style></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 15}).then(function(proposals) {
    			assertProposals(proposals, []);
    		});
    	});
    	it('Tag attribute proposals obsolete 1', function() {
    		var _o = setup({buffer: '<html><body ></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 3; // body tag attributes = globals + bgcolor + aria-expanded + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "bgcolor"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal bgcolor");
    			assert(knownProp.description.indexOf("Obsolete") >= 0, "bgcolor should be marked as obsolete");
    		});
    	});
    	it('Tag attribute proposals obsolete 2', function() {
    		var _o = setup({buffer: '<html><body TESTTESTTEST="TEST"></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 3; // body tag attributes = globals + bgcolor + aria-expanded + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "bgcolor"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal bgcolor");
    			assert(knownProp.description.indexOf("Obsolete") >= 0, "bgcolor should be marked as obsolete");
    		});
    	});
    	it('Tag attribute proposals obsolete 3', function() {
    		var _o = setup({buffer: '<html><body onclick="TEST"></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // body tag attributes = globals - onclick + bgcolor + aria-expanded + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "bgcolor"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal bgcolor");
    			assert(knownProp.description.indexOf("Obsolete") >= 0, "bgcolor should be marked as obsolete");
    		});
    	});
    	it('Attribute value proposals 1', function() {
    		var _o = setup({buffer: '<a href=""></a>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 9}).then(function(proposals) {
    			assertProposals(proposals, []);
    		});
    	});
    	it('Attribute value proposals 2', function() {
    		var _o = setup({buffer: '<body>\n<a href=""></a>\n</body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 16}).then(function(proposals) {
    			assertProposals(proposals, []);
    		});
    	});
    	it('Attribute value proposals 3', function() {
    		var _o = setup({buffer: '<a href=></a>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 8, prefix: 'href='}).then(function(proposals) {
    			assertProposals(proposals, [{proposal: 'href=""', prefix: 'href='},
    										{proposal: 'hreflang=""', prefix: 'href='}]);
    		});
    	});
    	it('Attribute value proposals incomplete tag 1', function() {
    		var _o = setup({buffer: '<a href=""'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 9}).then(function(proposals) {
    			assertProposals(proposals, []);
    		});
    	});
    	it('Attribute value proposals incomplete tag 2', function() {
    		var _o = setup({buffer: '<body>\n<a href=""\n</body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 16}).then(function(proposals) {
    			assertProposals(proposals, []);
    		});
    	});
    	it('Attribute value proposals for input type', function() {
    		var _o = setup({buffer: '<body><input type=""></input></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 19}).then(function(proposals) {
    			var expectedCount = 22;
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for input type attribute values. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    		});
    	});
    	it('Attribute value proposals for input type starting with t', function() {
    		var _o = setup({buffer: '<body><input type="t"></input></body>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 20, prefix: 't'}).then(function(proposals) {
    			var expectedCount = 3;
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for input type attribute values starting with t. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    		});
    	});
    	it('Offsets within tags proposals 1', function() {
    		var _o = setup({buffer: '<zzz href="" ></zzz>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 13}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    		});
    	});
    	it('Offsets within tags proposals 2', function() {
    		var _o = setup({buffer: '<zzz href="" ></zzz>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    		});
    	});
    	it('Offsets within tags proposals 3', function() {
    		var _o = setup({buffer: '<zzz href="" ></zzz>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 10}).then(function(proposals) {
    			assertProposals(proposals, []);
    		});
    	});
    	it('Offsets within tags proposals 4', function() {
    		var _o = setup({buffer: '<zzz href="" ></zzz>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 9, prefix: "href"}).then(function(proposals) {
    			assertProposals(proposals, []);
    		});
    	});
    	it('Offsets within tags proposals 5', function() {
    		var _o = setup({buffer: '<zzz href="" ></zzz>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    		});
    	});
    	it('Comment open proposals 1', function() {
    		var _o = setup({buffer: '<!'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 2}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '<!-- ', prefix: '<!'},
    			]);
    		});
    	});
    	it('Comment open proposals 2', function() {
    		var _o = setup({buffer: '<!-'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 3}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '<!-- ', prefix: '<!-'},
    			]);
    		});
    	});
    	it('Comment open proposals 3', function() {
    		var _o = setup({buffer: '<!--'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 4}).then(function(proposals) {
    			assertProposals(proposals, []);
    		});
    	});
    	it('Comment open proposals 4', function() {
    		var _o = setup({buffer: '<'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 1}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('Comment open proposals after tag 1', function() {
    		var _o = setup({buffer: '<a><!'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '<!-- ', prefix: '<!'},
    			]);
    		});
    	});
    	it('Comment open proposals after tag 2', function() {
    		var _o = setup({buffer: '<a><!-'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 6}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '<!-- ', prefix: '<!-'},
    			]);
    		});
    	});
    	it('Comment open proposals after tag 3', function() {
    		var _o = setup({buffer: '<a><!--'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 7}).then(function(proposals) {
    			assertProposals(proposals, []);
    		});
    	});
    	it('Comment open proposals after tag 4', function() {
    		var _o = setup({buffer: '<a><'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 4}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('Comment open proposals inside tag 1', function() {
    		var _o = setup({buffer: '<a<!'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 4}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '<!-- ', prefix: '<!'},
    			]);
    		});
    	});
    	it('Comment open proposals inside tag 2', function() {
    		var _o = setup({buffer: '<a<!-'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '<!-- ', prefix: '<!-'},
    			]);
    		});
    	});
    	it('Comment open proposals inside tag 3', function() {
    		var _o = setup({buffer: '<a<!--'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 6}).then(function(proposals) {
    			assertProposals(proposals, []);
    		});
    	});
    	it('Comment open proposals inside tag 4', function() {
    		var _o = setup({buffer: '<a<'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 3}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});    	
    	});
    	it('Comment open proposals nested tag 1', function() {
    		var _o = setup({buffer: '<a><!</a>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '<!-- ', prefix: '<!'},
    			]);
    		});
    	});
    	it('Comment open proposals nested tag 2', function() {
    		var _o = setup({buffer: '<a><!-</a>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 6}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '<!-- ', prefix: '<!-'},
    			]);
    		});
    	});
    	it('Comment open proposals nested tag 3', function() {
    		var _o = setup({buffer: '<a><!--</a>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 7}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '-->', prefix: ''},
    			]);
    		});
    	});
    	it('Comment open proposals nested tag 4', function() {
    		var _o = setup({buffer: '<a><</a>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 4}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
		it('Comment close proposals 1', function() {
    		var _o = setup({buffer: '<!-- '});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '-->', prefix: ''},
    			]);
    		});
    	});
    	it('Comment close proposals 2', function() {
    		var _o = setup({buffer: '<!-- -'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 6}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '-->', prefix: '-'},
    			]);
    		});
    	});
    	it('Comment close proposals 3', function() {
    		var _o = setup({buffer: '<!-- --'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 7}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '-->', prefix: '--'},
    			]);
    		});
    	});
    	it('Comment close proposals 4', function() {
    		var _o = setup({buffer: '<!-- -->'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 8}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('Comment close proposals 5', function() {
    		var _o = setup({buffer: '<!--'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 4}).then(function(proposals) {
    			assertProposals(proposals, []);
    		});
    	});
    	it('Comment close proposals in tag 1', function() {
    		var _o = setup({buffer: '<a><!-- </a>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 8}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '-->', prefix: ''},
    			]);
    		});
    	});
    	it('Comment close proposals in tag 2', function() {
    		var _o = setup({buffer: '<a><!-- -</a>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 9}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '-->', prefix: '-'},
    			]);
    		});
    	});
    	it('Comment close proposals in tag 3', function() {
    		var _o = setup({buffer: '<a><!-- --</a>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 10}).then(function(proposals) {
    			assertProposals(proposals, [
    				{proposal: '-->', prefix: '--'},
    			]);
    		});
    	});
    	it('Comment close proposals in tag 4', function() {
    		var _o = setup({buffer: '<a><!-- --></a>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 11}).then(function(proposals) {
    			assertTagProposals(proposals);
    		});
    	});
    	it('Comment close proposals in tag 5', function() {
    		var _o = setup({buffer: '<a><!--</a>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 7}).then(function(proposals) {
    			assertProposals(proposals, [{proposal: '-->', prefix: ''}]);
    		});
    	});
    	/*
    	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=483924
    	 */
    	it('Attribute completions ignore existing value entries 1', function() {
    		var _o = setup({buffer: '<html><a styl="blah"></a></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 13, prefix: 'styl'}).then(function(proposals) {
    			assertProposals(proposals, [
    			{proposal: 'style', prefix: 'styl'},
    			]);
    		});
    	});
    	/*
    	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=483924
    	 */
    	it('Attribute completions ignore existing value entries 2', function() {
    		var _o = setup({buffer: '<html><a styl=""></a></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 13, prefix: 'styl'}).then(function(proposals) {
    			assertProposals(proposals, [
    			{proposal: 'style', prefix: 'styl'},
    			]);
    		});
    	});
    	/*
    	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=483924
    	 */
    	it('Attribute completions ignore existing value entries 3', function() {
    		var _o = setup({buffer: '<html><a styl=blah></a></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 13, prefix: 'styl'}).then(function(proposals) {
    			assertProposals(proposals, [
    			{proposal: 'style', prefix: 'styl'},
    			]);
    		});
    	});
    	/*
    	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=483924
    	 */
    	it('Attribute completions ignore existing value entries 4', function() {
    		var _o = setup({buffer: '<html><a styl=></a></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 13, prefix: 'styl'}).then(function(proposals) {
    			assertProposals(proposals, [
    			{proposal: 'style=""', prefix: 'styl'},
    			]);
    		});
    	});
    	/*
    	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=483924
    	 */
    	it('Attribute completions ignore existing value entries 5', function() {
    		var _o = setup({buffer: '<html><a styl></a></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 13, prefix: 'styl'}).then(function(proposals) {
    			assertProposals(proposals, [
    			{proposal: 'style=""', prefix: 'styl'},
    			]);
    		});
    	});
    	/*
    	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=486676
    	 */
    	it('Inside script block - text, no children', function() {
    		var _o = setup({buffer: '<script>x</script>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 9, prefix: 'x'}).then(function(proposals) {
    			assertProposals(proposals, [	]);
    		});
    	});
    	/*
    	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=486676
    	 */
    	it('Inside script block - no text, children', function() {
    		var _o = setup({buffer: '<script><a></a></script>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 11}).then(function(proposals) {
    			assertProposals(proposals, [	]);
    		});
    	});
    	/*
    	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=486676
    	 */
    	it('Inside script block - no text, no children', function() {
    		var _o = setup({buffer: '<script></script>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 8}).then(function(proposals) {
    			assertProposals(proposals, [	]);
    		});
    	});
    	
    	/*
    	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=488254
    	 */
    	it('Complete tag name should have no proposals', function() {
    		var _o = setup({buffer: '<style>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 6, prefix: 'style'}).then(function(proposals) {
    			assertProposals(proposals, [	]);
    		});
    	});
    	/*
    	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=488726
    	 */
    	it('Complete tag name with matching end tag should no proposals', function() {
    		var _o = setup({buffer: '<style></style>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 6, prefix: 'style'}).then(function(proposals) {
    			assertProposals(proposals, [	]);
    		});
    	});
    	/*
    	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=488726
    	 */
    	it('Invalid tag name with matching end tag should no proposals', function() {
    		var _o = setup({buffer: '<sty></sty>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 6, prefix: 'style'}).then(function(proposals) {
    			assertProposals(proposals, [	]);
    		});
    	});
    });

	describe('ARIA Content Assist Tests', function() {
		// Global aria-* attributes: aria-atomic, aria-busy, aria-controls, aria-describedby, aria-disabled, aria-dropeffect, aria-flowto, aria-grabbed,
		//     aria-haspopup, aria-hidden, aria-invalid, aria-label, aria-labelledby, aria-live, aria-owns, aria-relevant
		it('Global aria-* attributes. No prefix. <zzz >', function() {
    		var _o = setup({buffer: '<zzz ></zzz>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 5}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for role found but not expected"); // role is not global
    		});
    	});
		it('Global aria-* attributes. Prefix ar. <zzz ar>', function() {
    		var _o = setup({buffer: '<zzz ar></zzz>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 7, prefix: 'ar'}).then(function(proposals) {
    			var expectedCount = 17; // zzz tag aria-* attributes = the 16 aria-* globals + 1 for "ARIA title"
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for picture tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    		});
    	});
		it('Global aria-* attributes. Prefix ar. <zzz aria->', function() {
    		var _o = setup({buffer: '<zzz aria-></zzz>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 10, prefix: 'aria-'}).then(function(proposals) {
    			var expectedCount = 17; // zzz tag aria-* attributes = the 16 aria-* globals + 1 for "ARIA title"
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for picture tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-label"); // aria-label is global
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for aria-expanded found but not expected"); // aria-expanded is not global
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for role found but not expected"); // role is not global (and it doesn't start with aria-)
    		});
    	});

		// The role attribute: frequently used with <div> and <span>
    	it('The role attribute with div. No prefix. <div >', function() {
    		var _o = setup({buffer: '<html><body><div ></div></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 17}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 1 + 19; // div tag attributes = globals + role + 19 role-specific aria-* attributes
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for div tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('The role attribute with div. Prefix ro. <div ro>', function() {
    		var _o = setup({buffer: '<html><body><div ro></div></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 19, prefix: 'ro'}).then(function(proposals) {
    			var expectedCount = 2; // "ARIA title" + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for div tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('The role attribute with div. Prefix role. <div role>', function() {
    		var _o = setup({buffer: '<html><body><div role></div></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 21, prefix: 'role'}).then(function(proposals) {
    			var expectedCount = 2; // "ARIA title" + role
				assert(proposals.length === expectedCount, "Incorrect number of proposals for div tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('Tags that support the attributes of all roles: div. Filter existing. <div role="dialog">', function() {
    		var _o = setup({buffer: '<html><body><div role="dialog"></div></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 30}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 19; // div tag attributes = globals + [role] + 19 role-specific aria-* attributes
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for div tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "role was not filtered");
    		});
    	});
    	it('The role attribute with span. No prefix. <span >', function() {
    		var _o = setup({buffer: '<html><body><span ></span></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 18}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 1 + 19; // span tag attributes = globals + role + 19 role-specific aria-* attributes
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for span tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('The role attribute with span. Prefix ro. <span ro>', function() {
    		var _o = setup({buffer: '<html><body><span ro></span></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 19, prefix: 'ro'}).then(function(proposals) {
    			var expectedCount = 2; // "ARIA title" + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for span tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('Tags that support the attributes of all roles: span. Filter existing. <span role="separator">', function() {
    		var _o = setup({buffer: '<html><body><span role="separator"></span></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 34}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 19; // span tag attributes = globals + [role] + 19 role-specific aria-* attributes
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for span tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "role was not filtered");
    		});
    	});
		
		// Tags with only ARIA globals (no role allowed):
		//     base, col, colgroup, head, html, keygen, label, map, meta, meter, noscript, optgroup, param, picture, script, source, style, template, title, track
		it('Tags with only ARIA globals (no role allowed). No prefix. <picture >', function() {
    		var _o = setup({buffer: '<html><body><picture ></picture></body></html>'}); // picture does not have any tag-specific attributes (html or aria)
    		return assist.computeContentAssist(_o.editorContext, {offset: 21}).then(function(proposals) {
    			assertGlobalTagAttributes(proposals);
    		});
    	});
		it('Tags with only ARIA globals (no role allowed). No prefix. <col >', function() {
    		var _o = setup({buffer: '<html><body><col ></col></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 17}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 3; // col tag attributes = globals + align + bgcolor + span (no tag-specific aria attributes)
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for col tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-label");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for aria-expanded found but not expected");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for role found but not expected");
    		});
    	});
		it('Tags with only ARIA globals (no role allowed). Prefix ari. <picture ari>', function() {
    		var _o = setup({buffer: '<html><body><picture ari></picture></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 24, prefix: 'ari'}).then(function(proposals) {
    			var expectedCount = 17; // picture tag aria-* attributes = the 16 aria-* globals + 1 for "ARIA title"
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for picture tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-label");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for aria-expanded found but not expected");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for role found but not expected");
    		});
    	});
		it('Tags with only ARIA globals (no role allowed). Prefix ari. <col ari>', function() {
    		var _o = setup({buffer: '<html><body><col ari></col></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 20, prefix: 'ari'}).then(function(proposals) {
    			var expectedCount = 17; // col tag aria-* attributes = the 16 aria-* globals + 1 for "ARIA title"
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for col tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-label");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for aria-expanded found but not expected");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for role found but not expected");
    		});
    	});
		it('Tags with only ARIA globals (no role allowed). Prefix ro. <picture ro>', function() {
    		var _o = setup({buffer: '<html><body><picture ro></picture></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 23, prefix: 'ro'}).then(function(proposals) {
    			var expectedCount = 0; // picture tag does not support role attribute
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for picture tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    		});
    	});
		it('Tags with only ARIA globals (no role allowed). Prefix ro. <col ro>', function() {
    		var _o = setup({buffer: '<html><body><col ro></col></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 19, prefix: 'ro'}).then(function(proposals) {
    			var expectedCount = 0; // col tag does not support role attribute
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for col tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    		});
    	});
    	it('Tags with only ARIA globals (no role allowed). Filter existing. <picture aria-label="x" >', function() {
    		var _o = setup({buffer: '<html><body><picture aria-label="x" ></picture></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 21}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length - 1; // picture tag attributes = globals - aria-label
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for picture tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for aria-label found but not expected");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-labelledby") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-labelledby");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for role found but not expected");
    		});
    	});
    	it('Tags with only ARIA globals (no role allowed). Filter existing 2. <picture aria-label="x" >', function() {
    		var _o = setup({buffer: '<html><body><picture aria-label="x" ></picture></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 36}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length - 1; // picture tag attributes = globals - aria-label
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for picture tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for aria-label found but not expected");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-labelledby") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-labelledby");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for role found but not expected");
    		});
    	});
    	it('Tags with only ARIA globals (no role allowed). Filter existing. <col aria-label="x" >', function() {
    		var _o = setup({buffer: '<html><body><col aria-label="x" ></col></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 17}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // col tag attributes = globals - aria-label + align + bgcolor + span
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for col tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for aria-label found but not expected");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-labelledby") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-labelledby");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for role found but not expected");
    		});
    	});
		it('Tags with only ARIA globals (no role allowed). Filter existing 2. <col aria-label="x" >', function() {
    		var _o = setup({buffer: '<html><body><col aria-label="x" ></col></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 32}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // col tag attributes = globals - aria-label + align + bgcolor + span
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for col tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for aria-label found but not expected");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-labelledby") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-labelledby");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for role found but not expected");
    		});
    	});

		// Tags that support the attributes of only one role:
		//     address (contentinfo), area (link), audio (application), datalist (listbox), link (link), menuitem (menuitem), progress (progressbar),
		//     summary (button), textarea (textbox), video (application)
    	it('Tags that support only one role. No prefix. <address >', function() {
    		var _o = setup({buffer: '<html><body><address ></address></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 21}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // address tag attributes = globals + role + [contentinfo role attributes=] aria-expanded
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for address tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-expanded");
    		});
    	});
    	it('Tags that support only one role. Prefix aria. <address aria>', function() {
    		var _o = setup({buffer: '<html><body><address aria></address></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 25, prefix: 'aria'}).then(function(proposals) {
    			var expectedCount = 18; // address tag aria* attributes = 16 global aria* attributes + "ARIA title" + [contentinfo role attributes=] aria-expanded
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for address tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-expanded");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-label");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-labelledby") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-labelledby");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for role found but not expected");
    		});
    	});
    	it('Tags that support only one role. Prefix aria-. <address aria->', function() {
    		var _o = setup({buffer: '<html><body><address aria-></address></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 26, prefix: 'aria-'}).then(function(proposals) {
    			var expectedCount = 18; // address tag aria-* attributes = 16 global aria-* attributes + "ARIA title" + [contentinfo role attributes=] aria-expanded
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for address tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-expanded");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-label");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-labelledby") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-labelledby");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for role found but not expected");
    		});
    	});
    	it('Tags that support only one role. Prefix ro. <address ro>', function() {
    		var _o = setup({buffer: '<html><body><address ro></address></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 23, prefix: 'ro'}).then(function(proposals) {
    			var expectedCount = 2; // address tag ro* attributes = role + "ARIA title"
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for address tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for aria-expanded found but not expected");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for aria-label found but not expected");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-labelledby") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for aria-labelledby found but not expected");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('Tags that support only one role. Prefix aria, and filter existing. <address aria-label="x" aria>', function() {
    		var _o = setup({buffer: '<html><body><address aria-label="x" aria></address></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 40, prefix: 'aria'}).then(function(proposals) {
    			var expectedCount = 17; // address tag aria* attributes = 16 global aria* attributes + "ARIA title" + [contentinfo role attributes=] aria-expanded - aria-label
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for address tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-expanded");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for aria-label found but not expected");
    			knownProp = null;
     			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-labelledby") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-labelledby");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role") {
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "Proposal for role found but not expected");
    		});
    	});
		
		// Tags that support the attributes of several (2 - 4) roles:
		//     2: body, fieldset, footer, header, hr, main, nav, select
		//     3: h1-h6
		//     4: article, aside, embed, iframe, object, option
    	it('Tags that support the attributes of several roles: body (2). No prefix. <body >', function() {
    		var _o = setup({buffer: '<html><body ></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 3; // body tag attributes = globals + bgcolor + aria-expanded + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    		});
    	});
    	it('Tags that support the attributes of several roles: body (2). Prefix aria-l. <body aria-l>', function() {
    		var _o = setup({buffer: '<html><body aria-l></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 18, prefix: 'aria-l'}).then(function(proposals) {
    			var expectedCount = 4; // "ARIA title" + aria-label + aria-labelledby + aria-live
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    		});
    	});
    	it('Tags that support the attributes of several roles: body (2). Filter existing. <body |aria-label="x" >', function() {
    		var _o = setup({buffer: '<html><body aria-label="x" ></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // body tag attributes = globals + bgcolor + aria-expanded + role - aria-label (global aria attribute)
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "aria-label was not filtered");
    		});
    	});
    	it('Tags that support the attributes of several roles: body (2). Filter existing. <body aria-label="x" |>', function() {
    		var _o = setup({buffer: '<html><body aria-label="x" ></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 27}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // body tag attributes = globals + bgcolor + aria-expanded + role - aria-label (global aria attribute)
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-label"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "aria-label was not filtered");
    		});
    	});
    	it('Tags that support the attributes of several roles: body (2). Filter existing. <body |aria-expanded=true >', function() {
    		var _o = setup({buffer: '<html><body aria-expanded=true ></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // body tag attributes = globals + bgcolor + [aria-expanded] + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "aria-expanded was not filtered");
    		});
    	});
    	it('Tags that support the attributes of several roles: body (2). Filter existing. <body aria-expanded=true |>', function() {
    		var _o = setup({buffer: '<html><body aria-expanded=true ></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 31}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // body tag attributes = globals + bgcolor + [aria-expanded] + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "aria-expanded was not filtered");
    		});
    	});
    	it('Tags that support the attributes of several roles: body (2). Filter existing. <body |role="application" >', function() {
    		var _o = setup({buffer: '<html><body role="application" ></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 12}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // body tag attributes = globals + bgcolor + aria-expanded + [role]
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "role was not filtered");
    		});
    	});
    	it('Tags that support the attributes of several roles: body (2). Filter existing. <body role="application" |>', function() {
    		var _o = setup({buffer: '<html><body role="application" ></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 31}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 2; // body tag attributes = globals + bgcolor + aria-expanded + [role]
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for body tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "role was not filtered");
    		});
    	});
		
		// Tags that support the attributes of many roles (13): input, section
    	it('Tags that support the attributes of many roles: input (13). No prefix. <input >', function() {
    		var _o = setup({buffer: '<html><body><input ></input></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 19}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 1 + 27 + 16; // input tag attributes = globals + role + 27 tag-specific html attributes + 16 role-specific aria-* attributes
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for input tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('Tags that support the attributes of many roles: input (13). Prefix r. <input r>', function() {
    		var _o = setup({buffer: '<html><body><input r></input></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 20, prefix: 'r'}).then(function(proposals) {
    			var expectedCount = 4; // "ARIA title" + role + readonly + required
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for input tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('Tags that support the attributes of many roles: input (13). Prefix ar. <input ar>', function() {
    		var _o = setup({buffer: '<html><body><input ar></input></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 21, prefix: 'ar'}).then(function(proposals) {
    			var expectedCount = 17 + 16; // "ARIA title" + 16 aria-* globals + 16 role-specific aria-* attributes
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for input tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-checked"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-checked");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-expanded");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-activedescendant"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-activedescendant");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-multiline"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-multiline");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-autocomplete"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-autocomplete");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-valuetext"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-valuetext");
    		});
    	});
    	it('Tags that support the attributes of many roles: input (13). Filter existing. <input role="menu">', function() {
    		var _o = setup({buffer: '<html><body><input role="menu"></input></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 19}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 27 + 16; // input tag attributes = globals + [role] + 27 tag-specific html attributes + 16 role-specific aria-* attributes
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for input tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "role was not filtered");
    		});
    	});
		
		// Tags that support the attributes of all roles that support aria-expanded: details
    	it('Tags that support the attributes of many roles: details (13). No prefix. <details >', function() {
    		var _o = setup({buffer: '<html><body><details ></details></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 21}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 1 + 1 + 13; // details tag attributes = globals + role + 1 tag-specific html attribute (open) + 13 role-specific aria-* attributes
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for details tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('Tags that support the attributes of many roles: details (13). Prefix r. <details r>', function() {
    		var _o = setup({buffer: '<html><body><details r></details></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 22, prefix: 'r'}).then(function(proposals) {
    			var expectedCount = 2; // "ARIA title" + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for details tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('Tags that support the attributes of many roles: details (13). Prefix role. <details r>', function() {
    		var _o = setup({buffer: '<html><body><details role></details></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 25, prefix: 'role'}).then(function(proposals) {
    			var expectedCount = 2; // "ARIA title" + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for details tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('Tags that support the attributes of many roles: details (13). Prefix empty. <details r>', function() {
    		var _o = setup({buffer: '<html><body><details role=></details></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 26, prefix: ''}).then(function(proposals) {
    			var expectedCount = 1; // "ARIA title" + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for details tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].proposal === "\"\""){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('Tags that support the attributes of many roles: details (13). Prefix ar. <details ar>', function() {
    		var _o = setup({buffer: '<html><body><details ar></details></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 21, prefix: 'ar'}).then(function(proposals) {
    			var expectedCount = 17 + 13; // "ARIA title" + 16 aria-* globals + 13 role-specific aria-* attributes
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for details tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-checked"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-checked");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-expanded");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-activedescendant"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-activedescendant");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-multiselectable"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-multiselectable");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-pressed"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-pressed");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-required"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-required");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-posinset"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-posinset");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-setsize"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-setsize");
    		});
    	});
    	it('Tags that support the attributes of many roles: details (13). Filter existing. <details role="dialog">', function() {
    		var _o = setup({buffer: '<html><body><details role="dialog"></details></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 34}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 1 + 13; // details tag attributes = globals + [role] + 1 tag-specific html attributes + 13 role-specific aria-* attributes
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for details tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "role was not filtered");
    		});
    	});
		
		// Tags that support the attributes of all roles: 
		//     abbr, b, bdi, bdo, blockquote, br, canvas, caption, cite, code, data, dd, del, dfn, div, dl, dt, em, figcaption, figure, form, i, img, ins,
		//     kbd, legend, mark, output, p, pre, q, rb, rp, rt, rtc, ruby, s, samp, small, span, strong, sub, table, tbody, td, tfoot, th, thead, time, tr, u, var, wbr
    	it('Tags that support the attributes of all roles: p. No prefix. <p >', function() {
    		var _o = setup({buffer: '<html><body><p ></p></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 15}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 1 + 19; // p tag attributes = globals + role + 19 role-specific aria-* attributes
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for p tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('Tags that support the attributes of all roles: p. Prefix r. <p r>', function() {
    		var _o = setup({buffer: '<html><body><p r></p></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 15, prefix: 'r'}).then(function(proposals) {
    			var expectedCount = 2; // "ARIA title" + role
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for p tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal role");
    		});
    	});
    	it('Tags that support the attributes of all roles: p. Prefix ar. <p ar>', function() {
    		var _o = setup({buffer: '<html><body><p ar></p></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 15, prefix: 'ar'}).then(function(proposals) {
    			var expectedCount = 17 + 19; // "ARIA title" + 16 aria-* globals + 19 role-specific aria-* attributes
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for p tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-checked"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-checked");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-expanded"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-expanded");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-activedescendant"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-activedescendant");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-multiselectable"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-multiselectable");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-pressed"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-pressed");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-required"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-required");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-posinset"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-posinset");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-setsize"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-setsize");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-multiline"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-multiline");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-autocomplete"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-autocomplete");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "aria-valuetext"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal aria-valuetext");
    		});
    	});
    	it('Tags that support the attributes of all roles: p. Filter existing. <p role="note">', function() {
    		var _o = setup({buffer: '<html><body><p role="note"></p></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 15}).then(function(proposals) {
    			var expectedCount = globalTagAttributes.length + 19; // p tag attributes = globals + [role] + 19 role-specific aria-* attributes
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for p tag attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "role"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(!knownProp, "role was not filtered");
    		});
    	});

		// ARIA attribute value proposals
    	it('ARIA attribute value proposals: role can have 61 different values. <div role="|">', function() {
    		var _o = setup({buffer: '<html><body><div role=""></div></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 23}).then(function(proposals) {
    			var expectedCount = 61; // ARIA role attribute can have 61 possible values
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for role attribute values. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "alert"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal alert");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "menubar"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal menubar");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "treeitem"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal treeitem");
    		});
    	});
    	it('ARIA attribute value proposals: role can have 10 different values that start with t. <div role="t|">', function() {
    		var _o = setup({buffer: '<html><body><div role="t"></div></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 24, prefix: 't'}).then(function(proposals) {
    			var expectedCount = 10; // ARIA role attribute can have 10 possible values that start with 't'
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for role attribute values that start with 't'. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "tree"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal tree");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "treeitem"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal treeitem");
    		});
    	});
    	it('ARIA attribute value proposals: aria-autocomplete can have 4 values: inline, list, both, none. <div aria-autocomplete="|">', function() {
    		var _o = setup({buffer: '<html><body><div aria-autocomplete=""></div></body></html>'});
    		return assist.computeContentAssist(_o.editorContext, {offset: 36}).then(function(proposals) {
    			var expectedCount = 4; // ARIA autocomplete attribute can have 4 possible values
    			assert(proposals.length === expectedCount, "Incorrect number of proposals for aria-autocomplete attribute values. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
    			var knownProp;
    			for (var i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "inline"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal inline");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "list"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal list");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "both"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal both");
    			knownProp = null;
    			for (i=0; i<proposals.length; i++) {
    				if (proposals[i].name === "none"){
    					knownProp = proposals[i];
    				}
    			}
    			assert(knownProp, "Could not find expected proposal none");
    		});
    	});

		// Tag-specific ARIA roles.
		// TODO: The following test should pass after we implement the cool allowed-role-for-tag feature (https://bugs.eclipse.org/bugs/show_bug.cgi?id=484255)
//    	it('Tag-specific ARIA roles: ul can have 11 possible role values. <ul role="|">', function() {
//    		var _o = setup({buffer: '<html><body><ul role=""></ul></body></html>'});
//    		return assist.computeContentAssist(_o.editorContext, {offset: 22}).then(function(proposals) {
//    			var expectedCount = 11; // <ul> roles: directory, group, list, listbox, menu, menubar, presentation, radiogroup, tablist, toolbar, tree
//    			assert(proposals.length === expectedCount, "Incorrect number of proposals for ul tag roles. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
//    			var knownProp;
//    			for (var i=0; i<proposals.length; i++) {
//    				if (proposals[i].name === "directory"){
//    					knownProp = proposals[i];
//    				}
//    			}
//    			assert(knownProp, "Could not find expected proposal directory");
//    			knownProp = null;
//    			for (i=0; i<proposals.length; i++) {
//    				if (proposals[i].name === "menu"){
//    					knownProp = proposals[i];
//    				}
//    			}
//    			assert(knownProp, "Could not find expected proposal menu");
//    			knownProp = null;
//    			for (i=0; i<proposals.length; i++) {
//    				if (proposals[i].name === "menubar"){
//    					knownProp = proposals[i];
//    				}
//    			}
//    			assert(knownProp, "Could not find expected proposal menubar");
//    			knownProp = null;
//    			for (i=0; i<proposals.length; i++) {
//    				if (proposals[i].name === "toolbar"){
//    					knownProp = proposals[i];
//    				}
//    			}
//    			assert(knownProp, "Could not find expected proposal toolbar");
//    			knownProp = null;
//    			for (i=0; i<proposals.length; i++) {
//    				if (proposals[i].name === "tree"){
//    					knownProp = proposals[i];
//    				}
//    			}
//    			assert(knownProp, "Could not find expected proposal tree");
//    		});
//    	});

		// Role-specific aria-* attributes: aria-activedescendant, aria-autocomplete, aria-checked, aria-expanded, aria-level, aria-multiline, aria-multiselectable, aria-orientation,
		//     aria-posinset, aria-pressed, aria-readonly, aria-required, aria-selected, aria-setsize, aria-sort, aria-valuemax, aria-valuemin, aria-valuenow, aria-valuetext
		// TODO: The following test should pass after we implement the cool allowed-attributes-for-role feature (https://bugs.eclipse.org/bugs/show_bug.cgi?id=484254)
//    	it('Role-specific aria-* attributes. Filter role. <span role="checkbox" >', function() {
//    		var _o = setup({buffer: '<html><body><span role="checkbox" ></span></body></html>'});
//    		return assist.computeContentAssist(_o.editorContext, {offset: 34}).then(function(proposals) {
//    			var expectedCount = globalTagAttributes.length + 1; // role="checkbox" attributes = globals + [role] + aria-checked
//    			assert(proposals.length === expectedCount, "Incorrect number of proposals for checkbox role attributes. Proposal count: " + proposals.length + " Expected count: " + expectedCount);
//    			var knownProp;
//    			for (var i=0; i<proposals.length; i++) {
//    				if (proposals[i].name === "role"){
//    					knownProp = proposals[i];
//    				}
//    			}
//    			assert(!knownProp, "role was not filtered");
//    			knownProp = null;
//    			for (i=0; i<proposals.length; i++) {
//    				if (proposals[i].name === "aria-checked"){
//    					knownProp = proposals[i];
//    				}
//    			}
//    			assert(knownProp, "Could not find expected proposal aria-checked");
//    		});
//    	});
		
     });
});
