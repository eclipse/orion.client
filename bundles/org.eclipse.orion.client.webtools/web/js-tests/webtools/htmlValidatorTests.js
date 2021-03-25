/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2017 IBM Corporation and others.
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
	'webtools/htmlValidator',
	'webtools/htmlAstManager',
	'mocha/mocha' // no exports
], function(chai, Deferred, HtmlValidator, AstMgr) {
	/* eslint-disable missing-nls */
	var assert = chai.assert;

    var validator = null;
    var astMgr = null;

	describe("HTML Validator Tests", function() {

		function setup(options) {
		    var buffer = options.buffer;
		    var contentType = options.contentType ? options.contentType : 'text/html';
		    astMgr = new AstMgr.HtmlAstManager();
		    validator = new HtmlValidator(astMgr);
//		    validator._restoreRules();
//			var rule = options.rule;
//			validator._enableOnly(rule.id, rule.severity);
			var editorContext = {
				/*override*/
				getText: function() {
					return new Deferred().resolve(buffer);
				},

				getFileMetadata: function() {
    			    var o = Object.create(null);
    			    o.contentType = Object.create(null);
    			    o.contentType.id = contentType;
    			    o.location = 'html_validator_test_script.html';
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
    	    assert.equal(problems.length, expected.length, "The wrong number of problems was computed" + toStringProblems(problems, expected));
    	    for(var i = 0; i < problems.length; i++) {
    	        var pb = problems[i];
    	        var expb = expected[i];
    	        assert.equal(pb.start, expb.start, "Wrong problem start" + toStringProblems(problems, expected));
    	        assert.equal(pb.end, expb.end, "Wrong problem end" + toStringProblems(problems, expected));
    	        assert.equal(pb.description, expb.description, "Wrong problem message" + toStringProblems(problems, expected));
    	        assert.equal(pb.severity, expb.severity, "Wrong problem severity" + toStringProblems(problems, expected));
    	        if(pb.descriptionArgs) {
    	            assert(expb.descriptionArgs, "Missing expected description arguments");
    	            assert.equal(pb.descriptionArgs.nls, expb.descriptionArgs.nls, "Missing NLS description argument key");
    	        }
    	    }
	    }
	    
	    function toStringProblems(computed, expected){
	    	var result = "\nEXPECTED:\n";
	    	for (var i = 0; i < expected.length; i++) {
	    		var pb = expected[i];
	    		result += '{start: ' + pb.start + ', end: ' + pb.end + ', severity: "' + pb.severity + '", description: "' + pb.description + '"},\n';
	    	}
	    	result += "ACTUAL:\n";
	    	for (i = 0; i < computed.length; i++) {
	    		pb = computed[i];
	    		result += '{start: ' + pb.start + ', end: ' + pb.end + ', severity: "' + pb.severity + '", description: "' + pb.description + '"},\n';
	    	}
	    	return result;
	    }

		// TODO ATTR-BAN rule is disabled by default currently
		describe.skip('attr-ban', function(){
			it("attr-ban bgcolor", function() {
			    var val = setup({buffer: '<html><body bgcolor="red"></body></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 12,
					     end: 25,
					     severity: 'info',
					     description: "The 'bgcolor' attribute is banned."
					    }
					]);
				});
			});
			it("attr-ban bgcolor no value", function() {
			    var val = setup({buffer: '<html><body bgcolor></body></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 12,
					     end: 19,
					     severity: 'info',
					     description: "The 'bgcolor' attribute is banned."
					    }
					]);
				});
			});
			it("attr-ban valid attribute", function() {
			    var val = setup({buffer: '<html><body color="red"></body></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
		});
		describe('attr-no-dup', function(){
			it("attr-no-dup duplicate align in p", function() {
			    var val = setup({buffer: '<html><body><p align="left" align="right"></p></body></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 28,
					     end: 41,
					     severity: 'info',
					     description: "The 'align' attribute is duplicated."
					    }
					]);
				});
			});
			it("attr-no-dup duplicate lang in html different quote", function() {
			    var val = setup({buffer: '<html lang="en" lang=\'fr\' lang=jp></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 16, end: 25, severity: "info", description: "The 'lang' attribute is duplicated."},
						{start: 26, end: 33, severity: "info", description: "The 'lang' attribute is duplicated."}		
					]);
				});
			});
			it("attr-no-dup three duplicate align in p", function() {
			    var val = setup({buffer: '<html><body><p align="left" align="right" align="center"></p></body></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
						{start: 28, end: 41, severity: "info", description: "The 'align' attribute is duplicated."},
						{start: 42, end: 56, severity: "info", description: "The 'align' attribute is duplicated."}
					]);
				});
			});
			it("attr-no-dup no duplicates", function() {
			    var val = setup({buffer: '<html><body><p align="left" valign="top"></p></body></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
			it("attr-no-dup duplicates in different elements", function() {
			    var val = setup({buffer: '<html><body align="left"><p align="left"></p></body></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
		});
		describe('img-req-alt', function(){
			it("img-req-alt no attr", function() {
			    var val = setup({buffer: '<html><img></img></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 6,
					     end: 11,
					     severity: 'info',
					     description: "The 'alt' property must be set for image tags (for accessibility)."
					    }
					]);
				});
			});
			it("img-req-alt other attr", function() {
			    var val = setup({buffer: '<html><img height="100%"></img></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 6,
					     end: 25,
					     severity: 'info',
					     description: "The 'alt' property must be set for image tags (for accessibility)."
					    }
					]);
				});
			});
			it("img-req-alt no attr casing", function() {
			    var val = setup({buffer: '<HTML><IMG></IMG></HTML>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 6,
					     end: 11,
					     severity: 'info',
					     description: "The 'alt' property must be set for image tags (for accessibility)."
					    }
					]);
				});
			});
			it("img-req-alt no attr mixed casing", function() {
			    var val = setup({buffer: '<HtMl><Img></imG></HTML>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 6,
					     end: 11,
					     severity: 'info',
					     description: "The 'alt' property must be set for image tags (for accessibility)."
					    }
					]);
				});
			});
			it("img-req-alt correct", function() {
			    var val = setup({buffer: '<html><img alt="Text"></img></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
			it("img-req-alt correct casing", function() {
			    var val = setup({buffer: '<html><IMG ALT="Text"></img></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
			it("img-req-alt correct odd casing", function() {
			    var val = setup({buffer: '<html><ImG AlT="Text"></ImG></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
		});
		describe('tag-close', function(){
			it("tag-close missing innermost tag", function() {
			    var val = setup({buffer: '<html><a></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 6,
					     end: 9,
					     severity: 'info',
					     description: "No matching closing tag for 'a'."
					    }
					]);
				});
			});
			it("tag-close missing root tag no children", function() {
			    var val = setup({buffer: '<html> \n\n ', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
			it("tag-close missing root tag children", function() {
			    var val = setup({buffer: '<html><a></a>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
			it("tag-close missing nested tag", function() {
			    var val = setup({buffer: '<html><a><b></b></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 6,
					     end: 9,
					     severity: 'info',
					     description: "No matching closing tag for 'a'."
					    }
					]);
				});
			});
			it("tag-close nothing missing", function() {
			    var val = setup({buffer: '<html><a></a><b></b></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
			it("tag-close siblings missing 1", function() {
			    var val = setup({buffer: '<html><a><b></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 6,
					     end: 9,
					     severity: 'info',
					     description: "No matching closing tag for 'a'."
					    },
					    {start: 9,
					     end: 12,
					     severity: 'info',
					     description: "No matching closing tag for 'b'."
					    }
					]);
				});
			});
			it("tag-close siblings missing 2", function() {
			    var val = setup({buffer: '<html><a></a><b></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 13,
					     end: 16,
					     severity: 'info',
					     description: "No matching closing tag for 'b'."
					    }
					]);
				});
			});
			it("tag-close siblings missing 3", function() {
			    var val = setup({buffer: '<html><a><b></b></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 6,
					     end: 9,
					     severity: 'info',
					     description: "No matching closing tag for 'a'."
					    }
					]);
				});
			});
			it("tag-close void elements 1", function() {
			    var val = setup({buffer: '<html><meta></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
			it("tag-close void elements 2", function() {
			    var val = setup({buffer: '<html><meta><a></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 12,
					     end: 15,
					     severity: 'info',
					     description: "No matching closing tag for 'a'."
					    }
					]);
				});
			});
			it("tag-close void elements 3", function() {
			    var val = setup({buffer: '<html><meta/></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
			it("tag-close void elements 4", function() {
			    var val = setup({buffer: '<html><meta/><a></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 13,
					     end: 16,
					     severity: 'info',
					     description: "No matching closing tag for 'a'."
					    }
					]);
				});
			});
			it("tag-close mismatched tags 1", function() {
			    var val = setup({buffer: '<html><a></b></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 6,
					     end: 9,
					     severity: 'info',
					     description: "No matching closing tag for 'a'."
					    }
					]);
				});
			});
			it("tag-close mismatched tags 2", function() {
			    var val = setup({buffer: '<html><a></b><b></a></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 13,
					     end: 16,
					     severity: 'info',
					     description: "No matching closing tag for 'b'."
					    }
					]);
				});
			});
			it("tag-close mismatched tags 3", function() {
			    var val = setup({buffer: '<html><a></b><b></c></html>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					    {start: 6,
					     end: 9,
					     severity: 'info',
					     description: "No matching closing tag for 'a'."
					    },
					     {start: 13,
					     end: 16,
					     severity: 'info',
					     description: "No matching closing tag for 'b'."
					    }
					]);
				});
			});
			it("tag-close self closing tag 1", function() {
			    var val = setup({buffer: '<html/>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
			it("tag-close self closing tag 2", function() {
			    var val = setup({buffer: '<abc/>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
			it("tag-close non-self closing tag sanity check", function() {
			    var val = setup({buffer: '<abc>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
						{start: 0, end: 5, severity: "info", description: "No matching closing tag for 'abc'."},
					]);
				});
			});
			it("tag-close self closing tag 3", function() {
			    var val = setup({buffer: '<abc def="ghi"/>', rule: {id:null, severity:1}});
				return validator.computeProblems(val.editorContext).then(function(result) {
					assertProblems(result, [
					]);
				});
			});
			describe('tag-close HTML5 Optional', function(){
				describe('No content following, implemented in HTML Validator Rules', function(){
					it("tag-close optional html tag 1", function() {
					    var val = setup({buffer: '<html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
							]);
						});
					});
					it("tag-close optional html tag 2", function() {
					    var val = setup({buffer: '<html><!-- comment -->', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
								{start: 0,
							     end: 6,
							     severity: 'info',
							     description: "No matching closing tag for 'html'."
						    	}
							]);
						});
					});
					it("tag-close optional body tag 1", function() {
					    var val = setup({buffer: '<html><body></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
							]);
						});
					});
					it("tag-close optional body tag 2", function() {
					    var val = setup({buffer: '<html><body><!-- comment --></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
								{start: 6,
							     end: 12,
							     severity: 'info',
							     description: "No matching closing tag for 'body'."
						    	}
							]);
						});
					});
					it("tag-close optional head tag 1", function() {
					    var val = setup({buffer: '<html><head></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
							]);
						});
					});
					it("tag-close optional head tag 2", function() {
					    var val = setup({buffer: '<html><head><!-- comment --></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
								{start: 6,
							     end: 12,
							     severity: 'info',
							     description: "No matching closing tag for 'head'."
						    	}
							]);
						});
					});
					// TODO No checking for whitespace in validator
					it.skip("tag-close optional head tag 3", function() {
					    var val = setup({buffer: '<html><head> \nTest\n</html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
								{start: 6,
							     end: 12,
							     severity: 'info',
							     description: "No matching closing tag for 'head'."
						    	}
							]);
						});
					});
					it("tag-close optional colgroup tag 1", function() {
					    var val = setup({buffer: '<html><colgroup></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
							]);
						});
					});
					it("tag-close optional colgroup tag 2", function() {
					    var val = setup({buffer: '<html><colgroup><!-- comment --></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
								{start: 6,
							     end: 16,
							     severity: 'info',
							     description: "No matching closing tag for 'colgroup'."
						    	}
							]);
						});
					});
					// TODO No checking for whitespace in validator
					it.skip("tag-close optional colgroup tag 3", function() {
					    var val = setup({buffer: '<html><colgroup> \nTest\n</html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
								{start: 6,
							     end: 12,
							     severity: 'info',
							     description: "No matching closing tag for 'colgroup'."
						    	}
							]);
						});
					});
					it("tag-close optional li tag 1 (content after)", function() {
					    var val = setup({buffer: '<html><li><b>fefefe</b></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
								{start: 6,
								end: 10,
								severity: "info",
								description: "No matching closing tag for 'li'."},
							]);
						});
					});
					it("tag-close optional li tag 2 (content after)", function() {
					    var val = setup({buffer: '<html><li></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
							]);
						});
					});
					it("tag-close optional p tag 1 (content after)", function() {
					    var val = setup({buffer: '<html><p></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
							]);
						});
					});
					it("tag-close optional p tag 2 (content after)", function() {
					    var val = setup({buffer: '<html><p><b></b></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
								{start: 6,
								end: 9,
								severity: "info",
								description: "No matching closing tag for 'p'."},
							]);
						});
					});
					it("tag-close optional p tag 3 (content after)", function() {
					    var val = setup({buffer: '<html><a><p></a></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
								{start: 9,
								end: 12,
								severity: "info",
								description: "No matching closing tag for 'p'."},
							]);
						});
					});
					it("tag-close optional p tag 4 (content after)", function() {
					    var val = setup({buffer: '<html><a><p><b></b></a></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
								{start: 9,
								end: 12,
								severity: "info",
								description: "No matching closing tag for 'p'."},
							]);
						});
					});


				});
				describe('Specific tag following, implemented in htmlparser2', function(){
					it("tag-close optional li tag 1", function() {
					    var val = setup({buffer: '<html><li><li></li></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
							]);
						});
					});
					it("tag-close optional li tag 2", function() {
					    var val = setup({buffer: '<html><li><li><b></b></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
								{start: 10,
							     end: 14,
							     severity: 'info',
							     description: "No matching closing tag for 'li'."
						    	}
							]);
						});
					});
					it("tag-close optional dd tag", function() {
					    var val = setup({buffer: '<html><dd><dd></dd><dd><dt></dt></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
							]);
						});
					});
					it("tag-close optional dt tag", function() {
					    var val = setup({buffer: '<html><dt><dd></dd><dt><dt></dt></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
							]);
						});
					});
					it("tag-close optional p tag", function() {
					    var val = setup({buffer: '<html><p><address></address><p><div></div><p><h3></h3><p><main></main><p><table></table></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
							]);
						});
					});
					it("tag-close optional tr tag", function() {
					    var val = setup({buffer: '<html><tr><tr></tr></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
							]);
						});
					});
					it("tag-close optional td tag", function() {
					    var val = setup({buffer: '<html><td><tr></tr><td><td></td></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
							]);
						});
					});
					it("tag-close optional th tag", function() {
					    var val = setup({buffer: '<html><th><th></th><th><td></td><th><tr></tr></html>', rule: {id:null, severity:1}});
						return validator.computeProblems(val.editorContext).then(function(result) {
							assertProblems(result, [
							]);
						});
					});
				});

			});
		});
	});
});
