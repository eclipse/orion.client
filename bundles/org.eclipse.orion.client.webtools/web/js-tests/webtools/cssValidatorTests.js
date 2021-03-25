/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2017 IBM Corporation and others.
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
	'orion/Deferred',
	'webtools/cssValidator',
	'webtools/cssResultManager',
	'mocha/mocha' // no exports
], function(chai, Deferred, CssValidator, ResultMgr) {
	/* eslint-disable missing-nls */
	var assert = chai.assert;

    var validator = null;
    var resultMgr = null;

	describe("CSS Validator Tests", function() {

		function setup(options) {
		    var buffer = options.buffer;
		    var contentType = options.contentType ? options.contentType : 'text/css';
		    resultMgr = new ResultMgr();
		    validator = new CssValidator(resultMgr);
		    resultMgr._restoreRules();
			var rule = options.rule;
			resultMgr._enableOnly(rule.id, rule.severity);
			var editorContext = {
				/*override*/
				getText: function() {
					return new Deferred().resolve(buffer);
				},

				getFileMetadata: function() {
    			    var o = Object.create(null);
    			    o.contentType = Object.create(null);
    			    o.contentType.id = contentType;
    			    o.location = 'css_validator_test_script.js';
    			    return new Deferred().resolve(o);
    			}
			};
			return {
			    validator: validator,
				editorContext: editorContext,
				contentType: contentType
			};
		}

		/**
    	 * @name assertProblems
    	 * @description Compares the computed problem set against the expected ones
    	 * @param {Array.<orion.Problem>} computed The computed set of problems
    	 * @param {Array.<Object>} expected The expected set of problems
    	 */
    	function assertProblems(computed, expected) {
    	    var problems = computed.problems;
    	    assert.equal(problems.length, expected.length, "The wrong number of problems was computed");
    	    for(var i = 0; i < problems.length; i++) {
    	        var pb = problems[i];
    	        var expb = expected[i];
    	        assert.equal(pb.start, expb.start, "Wrong problem start");
    	        assert.equal(pb.end, expb.end, "Wrong problem end");
    	        assert.equal(pb.line, expb.line, "Wrong problem line number");
    	        assert.equal(pb.description, expb.description, "Wrong problem message");
    	        assert.equal(pb.severity, expb.severity, "Wrong problem severity");
    	        if(pb.descriptionArgs) {
    	            assert(expb.descriptionArgs, "Missing expected description arguments");
    	            assert.equal(pb.descriptionArgs.nls, expb.descriptionArgs.nls, "Missing NLS description argument key");
    	        }
    	    }
	    }

		/**
		 * Test common csslint problems. Tests a bad property decl
		 */
		it("Test common csslint problems: unknown property", function(/*done*/) {
		    var val = setup({buffer: "abc{f: 22px}", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 5,
				     end: 6,
				     line: 1,
				     severity: 'info',
				     description: 'Unknown property \'f\'.'
				    }
				]);
			});
		});

		/**
		 * Test common csslint problems. Tests a duplicate property
		 */
		it("Test common csslint problems: duplicate property", function(/*done*/) {
			var val = setup({buffer: "abc{border: 0; border: 0;}", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 16,
				     end: 22,
				     line: 1,
				     severity: 'info',
				     description: 'Duplicate property \'border\' found.'
				    }
				]);
			});
		});

		/**
		 * Test common csslint problems. Tests an empty rule
		 */
		it("Test common csslint problems: empty rule", function(/*done*/) {
			var val = setup({buffer: "abc{}", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 1,
				     end: 4,
				     line: 1,
				     severity: 'info',
				     description: 'Rule is empty.'
				    }
				]);
			});
		});
		
		it("Test common csslint problems: !important", function(/*done*/) {
			var val = setup({buffer: "abc{\ncolor: blue !important;}", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 1,
				     end: 6,
				     line: 2,
				     severity: 'info',
				     description: 'Using !important leads to specificity issues.'
				    }
				]);
			});
		});
		it("Test common csslint problems: Too many !important", function(/*done*/) {
			var val = setup({buffer: "abc{\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\n}", rule: {id:'important', severity:2}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 1,
				     end: 6,
				     line: 2,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 3,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 4,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 5,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 6,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 7,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 8,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 9,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 10,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 11,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 12,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    // We disable the 'too many' warning as it is unhelpful and doesn't work with ignore quickfixes
//				    {start: 0,
//				     end: 3,
//				     severity: 'warning',
//				     description: 'Too many !important declarations (11), try to use less than 10 to avoid specificity issues.'
//				    }
				]);
			});
		});
		it("Test common csslint problems: Too many !important with leading comment", function(/*done*/) {
			var val = setup({buffer: "/* Comment */\n.abc.g{\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\ncolor: blue !important;\n}", rule: {id:'important', severity:2}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 1,
				     end: 6,
				     line: 3,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 4,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 5,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 6,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 7,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 8,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 9,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 10,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 11,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 12,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    {start: 1,
				     end: 6,
				     line: 13,
				     severity: 'error',
				     description: 'Using !important leads to specificity issues.'
				    },
				    // We disable the 'too many' warning as it is unhelpful and doesn't work with ignore quickfixes
//				    {start: 15,
//				     end: 18,
//				     severity: 'warning',
//				     description: 'Too many !important declarations (11), try to use less than 10 to avoid specificity issues.'
//				    }
				]);
			});
		});

		/**
		 * Test csslint parsing errors. Missing end of rule brace
		 */
		it("Test csslint parsing errors: Missing end of rule brace", function(/*done*/) {
			var val = setup({buffer: "abc{", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 1,
				     end: 5,
				     line: 1,
				     severity: 'error',
				     description: 'Expected RBRACE at line 1, col 5.'
				    },
				    {start: 1,
				     end: 5,
				     line: 1,
				     severity: 'error',
				     description: 'Expected RBRACE at line 1, col 5.'
				    }
				]);
			});
		});

		/**
		 * Test csslint parsing errors. Unexpected brace token
		 */
		it("Test csslint parsing errors: Unexpected brace token", function(/*done*/) {
			var val = setup({buffer: "abc{border: 0}}", rule: {id:null, severity:2}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 1,
				     end: 16,
				     line: 1,
				     severity: 'error',
				     description: 'Unexpected token \'}\' at line 1, col 15.'
				    }
				]);
			});
		});

		/**
		 * Test csslint parsing errors. Fatal error missing string
		 */
		it("Test csslint parsing errors: Fatal error missing string", function(/*done*/) {
			var val = setup({buffer: "@import ;", rule: {id:null, severity:2}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 1,
				     end: 10,
				     line: 1,
				     severity: 'error',
				     description: 'Fatal error, cannot continue: Expected STRING at line 1, col 9.'
				    }
				]);
			});
		});

		/**
		 * Test embedded rulset. False to ignore
		 */
		it("Test embedded ruleset: False to ignore", function(/*done*/) {
			var val = setup({buffer: "/*csslint empty-rules:false*/\nabc{}", rule: {id:null, severity:2}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, []);
			});
		});

		/**
		 * Test embedded rulset. True to error
		 */
		it("Test embedded ruleset: True to error", function(/*done*/) {
			var val = setup({buffer: "/*csslint empty-rules:true*/\nabc{}", rule: {id:null, severity:2}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 1,
				     end: 4,
				     line: 2,
				     severity: 'error',
				     description: 'Rule is empty.'
				    }
				]);
			});
		});

		/**
		 * Test embedded rulset. 0 to ignore
		 */
		it("Test embedded ruleset: 0 to ignore", function(/*done*/) {
			var val = setup({buffer: "/*csslint empty-rules:0*/\nabc{}", rule: {id:null, severity:1}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, []);
			});
		});

		/**
		 * Test embedded rulset. 1 to warn
		 */
		it("Test embedded ruleset: 1 to warn", function(/*done*/) {
			var val = setup({buffer: "/*csslint empty-rules:1*/\nabc{}", rule: {id:null, severity:1}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 1,
				     end: 4,
				     line: 2,
				     severity: 'warning',
				     description: 'Rule is empty.'
				    }
				]);
			});
		});

		/**
		 * Test embedded rulset. 2 to error
		 */
		it("Test embedded ruleset: 2 to error", function(/*done*/) {
			var val = setup({buffer: "/*csslint empty-rules:2*/\nabc{}", rule: {id:null, severity:1}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 1,
				     end: 4,
				     line: 2,
				     severity: 'error',
				     description: 'Rule is empty.'
				    }
				]);
			});
		});

		/**
		 * Test embedded rulset. Allow whitespace
		 */
		it("Test embedded ruleset: Allow whitespace", function(/*done*/) {
			var val = setup({buffer: "/*       csslint empty-rules:2      */\nabc{}", rule: {id:null, severity:1}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 1,
				     end: 4,
				     line: 2,
				     severity: 'error',
				     description: 'Rule is empty.'
				    }
				]);
			});
		});

		/**
		 * Test embedded rulset. Allow multiple rules
		 */
		it("Test embedded ruleset: Allow multiple rules", function(/*done*/) {
			var val = setup({buffer: "/*csslint empty-rules:2,duplicate-properties:true*/\nabc{}\nabd{border: 0; border: 0}", rule: {id:null, severity:1}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 1,
				     end: 4,
				     line: 2,
				     severity: 'error',
				     description: 'Rule is empty.'
				    },
				    {start: 16,
				     end: 22,
				     line: 3,
				     severity: 'error',
				     description: 'Duplicate property \'border\' found.'
				    }
				]);
			});
		});

		/**
		 * Test embedded rulset. Ignore multiple embedded rulesets
		 */
		it("Test embedded ruleset: Ignore multiple embedded rulesets", function(/*done*/) {
			var val = setup({buffer: "/*csslint empty-rules:2*/\n/*duplicate-properties:true*/\nabc{}\nabd{border: 0; border: 0}", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				    {start: 1,
				     end: 4,
				     line: 3,
				     severity: 'error',
				     description: 'Rule is empty.'
				    },
				    {start: 16,
				     end: 22,
				     line: 4,
				     severity: 'info',
				     description: 'Duplicate property \'border\' found.'
				    }
				]);
			});
		});
		
		it("Test SVG CSS properties: stop-color", function(/*done*/) {
		    var val = setup({buffer: "abc{stop-color: red}", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				]);
			});
		});
		it("Test SVG CSS properties: stroke", function(/*done*/) {
		    var val = setup({buffer: "abc{stroke: red}", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				]);
			});
		});
		it("Test SVG CSS properties: fill", function(/*done*/) {
		    var val = setup({buffer: "abc{fill: red}", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				]);
			});
		});
		
		it("Test csslint allow directive: unknown property", function(/*done*/) {
		    var val = setup({buffer: "abc{f: 22px} /* csslint allow: known-properties */", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				]);
			});
		});
		it("Test csslint allow directive: unknown property whitespace", function(/*done*/) {
		    var val = setup({buffer: "abc{f: 22px} /*  \t  csslint    \t   allow:     \t   known-properties,,,,, \t   */", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				]);
			});
		});
		it("Test csslint allow directive: unknown property broken whitespace", function(/*done*/) {
		    var val = setup({buffer: "abc{f: 22px} /* csslint allow : known-properties */", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
					{start: 5,
				     end: 6,
				     line: 1,
				     severity: 'info',
				     description: 'Unknown property \'f\'.'
				    }
				]);
			});
		});
		it("Test csslint allow directive: unknown property multiple entries 1", function(/*done*/) {
		    var val = setup({buffer: "abc{f: 22px} /* csslint allow: known-properties, zero-units */", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				]);
			});
		});
		it("Test csslint allow directive: unknown property multiple entries 2", function(/*done*/) {
		    var val = setup({buffer: "abc{f: 22px} /* csslint allow: zero-units, known-properties */", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
				]);
			});
		});
		it("Test csslint allow directive: unknown property no entries", function(/*done*/) {
		    var val = setup({buffer: "abc{f: 22px} /* csslint allow: */", rule: {id:null, severity:3}});
			return validator.computeProblems(val.editorContext).then(function(result) {
				assertProblems(result, [
					{start: 5,
				     end: 6,
				     line: 1,
				     severity: 'info',
				     description: 'Unknown property \'f\'.'
				    }
				]);
			});
		});
	});
});
