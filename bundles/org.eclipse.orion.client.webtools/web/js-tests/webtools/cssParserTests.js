/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, browser, mocha*/
/* eslint-disable no-console, missing-nls*/
define([
'chai/chai',
'csslint/csslint',
'mocha/mocha' //global export, stays last
], function(chai, CSSLint) {
    
    var assert = chai.assert;

    /**
	 * @description Write out the 'tokens' and 'errors' arrays for a given AST.
	 * Add this code to the AST managers' getAST() function to produce the test data from a target workspace
	 * @param {Object} ast The AST
	 */
	function writeTestData(ast) {
		var i = 0;
		console.log('--- TEST OUTPUT ---');
		var expected = [];
		var s = 'tokens: ';
		expected = [];
		for(i = 0; i < ast.tokens.length; i++) {
			var n = {};
			var token = ast.tokens[i];
			n.type = token.type;
			n.range = token.range;
			n.value = token.value;
			expected.push(n);
		}
		s += JSON.stringify(expected);
		s += ',\n\t\t\t\tmessages: ';
		expected = [];
		for(i = 0; i < ast.messages.length; i++) {
			var message = ast.messages[i];
			expected.push({
				message: message.message,
				line: message.line,
				col: message.col,
				type: message.type
			});
		}
		s += JSON.stringify(expected);
		console.log(s);
	}
	
	function assertResults(results, expected) {
	    var e = expected.tokens;
	    var r = results.tokens;
	    assert(e, 'There must be tokens to test');
	    assert(r, 'The parser must have returned tokens');
	    assert.equal(e.length, r.length, 'The same number of tokens was not returned as expected');
	    for(var i = 0; i < e.length; i++) {
	        var et = e[i];
	        var rt = r[i];
	        assert.equal(rt.type, et.type, 'The token types do not match');
	        assert.equal(rt.value, et.value, 'the token values do not match');
	        assert.equal(rt.range[0], et.range[0], 'The start range of the tokens do not match');
	        assert.equal(rt.range[1], et.range[1], 'The end range of the tokens do not match');
	    }
	}
	
	function assertAstResults(results, expected) {
		function removeParents(node){
			if (node && typeof node === 'object'){
				var keys = Object.keys(node);
				for (var i = 0; i < keys.length; i++) {
					if (keys[i] === 'parent'){
						node.parent = undefined;
					} else {
						removeParents(node[keys[i]]);
					}
				}
			}
			return node;
		}
		
		assert(results, 'The snippet should have parsed');
        assert(results.ast, 'The AST should have been created');
        var r = removeParents(results.ast);
        r = JSON.stringify(r);
        assert.equal(r, expected, 'The ASTs do not match\nActual:\n' + r + '\nExpected:\n' +expected+ '\n');
	}
	
	describe("CSS Tokenizer Tests", function() {
		it("@import single literal", function() {
			var results = CSSLint.verify("@import 'foo.css';");
		    assertResults(results, {
		         tokens: [{"type":"IMPORT_SYM","range":[0,7],"value":"@import"},{"type":"STRING","range":[8,17],"value":"'foo.css'"},{"type":"SEMICOLON","range":[17,18],"value":";"},{"type":"EOF","range":[18,18],"value":null}],
		    });
		});
		
		it("@import single literal missing semi", function() {
			var results = CSSLint.verify("@import 'foo.css'");
		    assertResults(results, {
		         tokens: [{"type":"IMPORT_SYM","range":[0,7],"value":"@import"},{"type":"STRING","range":[8,17],"value":"'foo.css'"},{"type":"EOF","range":[17,17],"value":null}],
		    });
		});
		
		it("@import literals successive", function() {
			var results = CSSLint.verify("@import 'a.css';\n@import 'b.css';");
		    assertResults(results, {
		        tokens: [{"type":"IMPORT_SYM","range":[0,7],"value":"@import"},{"type":"STRING","range":[8,15],"value":"'a.css'"},{"type":"SEMICOLON","range":[15,16],"value":";"},{"type":"IMPORT_SYM","range":[17,24],"value":"@import"},{"type":"STRING","range":[25,32],"value":"'b.css'"},{"type":"SEMICOLON","range":[32,33],"value":";"},{"type":"EOF","range":[33,33],"value":null}]
		    });
		});
		
		it("@import literals successive windows line endings", function() {
			var results = CSSLint.verify("@import 'a.css';\r\n@import 'b.css';");
		    assertResults(results, {
		        tokens: [{"type":"IMPORT_SYM","range":[0,7],"value":"@import"},{"type":"STRING","range":[8,15],"value":"'a.css'"},{"type":"SEMICOLON","range":[15,16],"value":";"},{"type":"IMPORT_SYM","range":[18,25],"value":"@import"},{"type":"STRING","range":[26,33],"value":"'b.css'"},{"type":"SEMICOLON","range":[33,34],"value":";"},{"type":"EOF","range":[34,34],"value":null}]
		    });
		});
		
		it("@import literals successive with line breaks", function() {
			var results = CSSLint.verify("@import 'a.css';\n\n@import 'b.css';");
		    assertResults(results, {
		         tokens: [{"type":"IMPORT_SYM","range":[0,7],"value":"@import"},{"type":"STRING","range":[8,15],"value":"'a.css'"},{"type":"SEMICOLON","range":[15,16],"value":";"},{"type":"IMPORT_SYM","range":[18,25],"value":"@import"},{"type":"STRING","range":[26,33],"value":"'b.css'"},{"type":"SEMICOLON","range":[33,34],"value":";"},{"type":"EOF","range":[34,34],"value":null}]
		    });
		});
		
		it("@import literals successive with mixed line breaks", function() {
			var results = CSSLint.verify("@import 'a.css';\r\n\n@import 'b.css';");
		    assertResults(results, {
		         tokens: [{"type":"IMPORT_SYM","range":[0,7],"value":"@import"},{"type":"STRING","range":[8,15],"value":"'a.css'"},{"type":"SEMICOLON","range":[15,16],"value":";"},{"type":"IMPORT_SYM","range":[19,26],"value":"@import"},{"type":"STRING","range":[27,34],"value":"'b.css'"},{"type":"SEMICOLON","range":[34,35],"value":";"},{"type":"EOF","range":[35,35],"value":null}]
		    });
		});
	});
	
	describe("CSS AST Tests", function() {
	    it("Single rule - no prop", function() {
	        var ast = '{"type":"StyleSheet","range":[0,6],"body":[{"type":"Rule","range":[0,6],"selectorBody":{"type":"SelectorBody","range":[0,3],"selectors":[{"type":"Selector","range":[0,3],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[3,6],"declarations":[]}}]}';
	        var results = CSSLint.verify("abc{ }");
	        assertAstResults(results, ast);
	    });
	    it("Single rule - no prop with whitespace", function() {
	        var ast = '{"type":"StyleSheet","range":[0,18],"body":[{"type":"Rule","range":[4,17],"selectorBody":{"type":"SelectorBody","range":[4,11],"selectors":[{"type":"Selector","range":[4,7],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[11,17],"declarations":[]}}]}';
	        var results = CSSLint.verify(" \t\n abc \t\n { \t\n }\n");
	        assertAstResults(results, ast);
	    });
	    it("Single rule - one prop with whitespace", function() {
	        var ast = '{"type":"StyleSheet","range":[0,14],"body":[{"type":"Rule","range":[1,13],"selectorBody":{"type":"SelectorBody","range":[1,5],"selectors":[{"type":"Selector","range":[1,4],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[5,13],"declarations":[{"type":"Declaration","range":[7,11],"property":{"type":"Property","range":[7,8],"text":"a"},"propertyValue":{"type":"PropertyValue","range":[9,10],"text":"1"}}]}}]}';
	        var results = CSSLint.verify(" abc { a:1; } ");
	        assertAstResults(results, ast);
	    });
	    it("Multiple rule - no prop", function() {
	        var ast = '{"type":"StyleSheet","range":[0,10],"body":[{"type":"Rule","range":[0,5],"selectorBody":{"type":"SelectorBody","range":[0,3],"selectors":[{"type":"Selector","range":[0,3],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[3,5],"declarations":[]}},{"type":"Rule","range":[5,10],"selectorBody":{"type":"SelectorBody","range":[5,8],"selectors":[{"type":"Selector","range":[5,8],"text":"def"}]},"declarationBody":{"type":"DeclarationBody","range":[8,10],"declarations":[]}}]}';
	        var results = CSSLint.verify("abc{}def{}");
	        assertAstResults(results, ast);
	    });
	    it("Multiple rule - no prop with whitespace", function() {
	        var ast = '{"type":"StyleSheet","range":[0,22],"body":[{"type":"Rule","range":[4,9],"selectorBody":{"type":"SelectorBody","range":[4,7],"selectors":[{"type":"Selector","range":[4,7],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[7,9],"declarations":[]}},{"type":"Rule","range":[13,18],"selectorBody":{"type":"SelectorBody","range":[13,16],"selectors":[{"type":"Selector","range":[13,16],"text":"def"}]},"declarationBody":{"type":"DeclarationBody","range":[16,18],"declarations":[]}}]}';
	        var results = CSSLint.verify(" \t\n abc{} \t\n def{} \t\n ");
	        assertAstResults(results, ast);
	    });
	    it("Multiple rule - one prop with whitespace", function() {
	        var ast = '{"type":"StyleSheet","range":[0,18],"body":[{"type":"Rule","range":[0,9],"selectorBody":{"type":"SelectorBody","range":[0,3],"selectors":[{"type":"Selector","range":[0,3],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[3,9],"declarations":[{"type":"Declaration","range":[4,8],"property":{"type":"Property","range":[4,5],"text":"a"},"propertyValue":{"type":"PropertyValue","range":[6,7],"text":"1"}}]}},{"type":"Rule","range":[10,18],"selectorBody":{"type":"SelectorBody","range":[10,13],"selectors":[{"type":"Selector","range":[10,13],"text":"def"}]},"declarationBody":{"type":"DeclarationBody","range":[13,18],"declarations":[{"type":"Declaration","range":[14,17],"property":{"type":"Property","range":[14,15],"text":"a"},"propertyValue":{"type":"PropertyValue","range":[16,17],"text":"1"}}]}}]}';
	        var results = CSSLint.verify("abc{a:1;}\ndef{a:1}");
	        assertAstResults(results, ast);
	    });
	    
	    it("Selector test 1 - class", function() {
	        var ast = '{"type":"StyleSheet","range":[0,8],"body":[{"type":"Rule","range":[0,8],"selectorBody":{"type":"SelectorBody","range":[0,6],"selectors":[{"type":"Selector","range":[0,6],"text":".class"}]},"declarationBody":{"type":"DeclarationBody","range":[6,8],"declarations":[]}}]}';
	        var results = CSSLint.verify(".class{}");
	        assertAstResults(results, ast);
	    });
	    it("Selector test 2 - id", function() {
	        var ast = '{"type":"StyleSheet","range":[0,5],"body":[{"type":"Rule","range":[0,5],"selectorBody":{"type":"SelectorBody","range":[0,3],"selectors":[{"type":"Selector","range":[0,3],"text":"#id"}]},"declarationBody":{"type":"DeclarationBody","range":[3,5],"declarations":[]}}]}';
	        var results = CSSLint.verify("#id{}");
	        assertAstResults(results, ast);
	    });
	    it("Selector test 3 - *", function() {
	        var ast = '{"type":"StyleSheet","range":[0,3],"body":[{"type":"Rule","range":[0,3],"selectorBody":{"type":"SelectorBody","range":[0,1],"selectors":[{"type":"Selector","range":[0,1],"text":"*"}]},"declarationBody":{"type":"DeclarationBody","range":[1,3],"declarations":[]}}]}';
	        var results = CSSLint.verify("*{}");
	        assertAstResults(results, ast);
	    });
	    it("Selector test 4 - element", function() {
	        var ast = '{"type":"StyleSheet","range":[0,7],"body":[{"type":"Rule","range":[0,7],"selectorBody":{"type":"SelectorBody","range":[0,5],"selectors":[{"type":"Selector","range":[0,5],"text":"class"}]},"declarationBody":{"type":"DeclarationBody","range":[5,7],"declarations":[]}}]}';
	        var results = CSSLint.verify("class{}");
	        assertAstResults(results, ast);
	    });
	    it("Selector test 5 - concat elements", function() {
	        var ast = '{"type":"StyleSheet","range":[0,5],"body":[{"type":"Rule","range":[0,5],"selectorBody":{"type":"SelectorBody","range":[0,3],"selectors":[{"type":"Selector","range":[0,1],"text":"a"},{"type":"Selector","range":[2,3],"text":"b"}]},"declarationBody":{"type":"DeclarationBody","range":[3,5],"declarations":[]}}]}';
	        var results = CSSLint.verify("a,b{}");
	        assertAstResults(results, ast);
	    });
	    it("Selector test 6 - nested elements", function() {
	        var ast = '{"type":"StyleSheet","range":[0,5],"body":[{"type":"Rule","range":[0,5],"selectorBody":{"type":"SelectorBody","range":[0,3],"selectors":[{"type":"Selector","range":[0,3],"text":"a   b"}]},"declarationBody":{"type":"DeclarationBody","range":[3,5],"declarations":[]}}]}';
	        var results = CSSLint.verify("a b{}");
	        assertAstResults(results, ast);
	    });
	    it("Selector test 7 - parent elements", function() {
	        var ast = '{"type":"StyleSheet","range":[0,7],"body":[{"type":"Rule","range":[0,7],"selectorBody":{"type":"SelectorBody","range":[0,5],"selectors":[{"type":"Selector","range":[0,5],"text":"a > b"}]},"declarationBody":{"type":"DeclarationBody","range":[5,7],"declarations":[]}}]}';
	        var results = CSSLint.verify("a > b{}");
	        assertAstResults(results, ast);
	    });
	    it("Selector test 8 - attribute", function() {
	        var ast = '{"type":"StyleSheet","range":[0,8],"body":[{"type":"Rule","range":[0,8],"selectorBody":{"type":"SelectorBody","range":[0,6],"selectors":[{"type":"Selector","range":[0,6],"text":"[attr]"}]},"declarationBody":{"type":"DeclarationBody","range":[6,8],"declarations":[]}}]}';
	        var results = CSSLint.verify("[attr]{}");
	        assertAstResults(results, ast);
	    });
	    it("Selector test 9 - after", function() {
	        var ast = '{"type":"StyleSheet","range":[0,10],"body":[{"type":"Rule","range":[0,10],"selectorBody":{"type":"SelectorBody","range":[0,8],"selectors":[{"type":"Selector","range":[0,8],"text":"p::after"}]},"declarationBody":{"type":"DeclarationBody","range":[8,10],"declarations":[]}}]}';
	        var results = CSSLint.verify("p::after{}");
	        assertAstResults(results, ast);
	    });
	    it("Selector test 10 - disabled", function() {
	        var ast = '{"type":"StyleSheet","range":[0,12],"body":[{"type":"Rule","range":[0,12],"selectorBody":{"type":"SelectorBody","range":[0,10],"selectors":[{"type":"Selector","range":[0,10],"text":"p:disabled"}]},"declarationBody":{"type":"DeclarationBody","range":[10,12],"declarations":[]}}]}';
	        var results = CSSLint.verify("p:disabled{}");
	        assertAstResults(results, ast);
	    });
	    it("Selector test 11 - nth type", function() {
	        var ast = '{"type":"StyleSheet","range":[0,23],"body":[{"type":"Rule","range":[0,23],"selectorBody":{"type":"SelectorBody","range":[0,21],"selectors":[{"type":"Selector","range":[0,21],"text":"p:nth-of-type( 2n+1 )"}]},"declarationBody":{"type":"DeclarationBody","range":[21,23],"declarations":[]}}]}';
	        var results = CSSLint.verify("p:nth-of-type( 2n+1 ){}");
	        assertAstResults(results, ast);
	    });
	    
	    it("Declaration test 1 - prop", function() {
	        var ast = '{"type":"StyleSheet","range":[0,10],"body":[{"type":"Rule","range":[0,10],"selectorBody":{"type":"SelectorBody","range":[0,3],"selectors":[{"type":"Selector","range":[0,3],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[3,10],"declarations":[{"type":"Declaration","range":[4,9],"property":{"type":"Property","range":[4,5],"text":"a"},"propertyValue":{"type":"PropertyValue","range":[6,8],"text":"1"}}]}}]}';
	        var results = CSSLint.verify("abc{a: 1;}");
	        assertAstResults(results, ast);
	    });
	    it("Declaration test 2 - 2 props", function() {
	        var ast = '{"type":"StyleSheet","range":[0,13],"body":[{"type":"Rule","range":[0,13],"selectorBody":{"type":"SelectorBody","range":[0,3],"selectors":[{"type":"Selector","range":[0,3],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[3,13],"declarations":[{"type":"Declaration","range":[4,8],"property":{"type":"Property","range":[4,5],"text":"a"},"propertyValue":{"type":"PropertyValue","range":[6,7],"text":"1"}},{"type":"Declaration","range":[8,12],"property":{"type":"Property","range":[8,9],"text":"b"},"propertyValue":{"type":"PropertyValue","range":[10,11],"text":"2"}}]}}]}';
			var results = CSSLint.verify("abc{a:1;b:2;}");
	        assertAstResults(results, ast);
	    });
	    it("Declaration test 3 - 2 props with whitespace", function() {
	        var ast = '{"type":"StyleSheet","range":[0,53],"body":[{"type":"Rule","range":[4,49],"selectorBody":{"type":"SelectorBody","range":[4,11],"selectors":[{"type":"Selector","range":[4,7],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[11,49],"declarations":[{"type":"Declaration","range":[16,28],"property":{"type":"Property","range":[16,17],"text":"a"},"propertyValue":{"type":"PropertyValue","range":[18,27],"text":"1"}},{"type":"Declaration","range":[32,44],"property":{"type":"Property","range":[32,37],"text":"b"},"propertyValue":{"type":"PropertyValue","range":[38,43],"text":"2"}}]}}]}';
	        var results = CSSLint.verify(" \t\n abc \t\n { \t\n a: \t\n 1 \t\n ; \t\n b \t\n : \t\n 2; \t\n } \t\n ");
	        assertAstResults(results, ast);
	    });
	    it("Declaration test 4 - duplicated props", function() {
	        var ast = '{"type":"StyleSheet","range":[0,13],"body":[{"type":"Rule","range":[0,13],"selectorBody":{"type":"SelectorBody","range":[0,3],"selectors":[{"type":"Selector","range":[0,3],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[3,13],"declarations":[{"type":"Declaration","range":[4,8],"property":{"type":"Property","range":[4,5],"text":"a"},"propertyValue":{"type":"PropertyValue","range":[6,7],"text":"1"}},{"type":"Declaration","range":[8,12],"property":{"type":"Property","range":[8,9],"text":"a"},"propertyValue":{"type":"PropertyValue","range":[10,11],"text":"2"}}]}}]}';
	        var results = CSSLint.verify("abc{a:1;a:2;}");
	        assertAstResults(results, ast);
	    });
	    it("Declaration test 5 - multi part prop value", function() {
	        var ast = '{"type":"StyleSheet","range":[0,28],"body":[{"type":"Rule","range":[0,28],"selectorBody":{"type":"SelectorBody","range":[0,3],"selectors":[{"type":"Selector","range":[0,3],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[3,28],"declarations":[{"type":"Declaration","range":[4,27],"property":{"type":"Property","range":[4,5],"text":"a"},"propertyValue":{"type":"PropertyValue","range":[6,26],"text":"1px ease","important":true}}]}}]}';
	        var results = CSSLint.verify("abc{a: 1px ease !important;}");
	        assertAstResults(results, ast);
	    });
	    
	    // TODO Comments?
	    
	    it("@charset 1", function() {
	        var ast = '{"type":"StyleSheet","range":[0,17],"body":[{"type":"Charset","range":[0,17]}]}';
	        var results = CSSLint.verify("@charset \"UTF-8\";");
	        assertAstResults(results, ast);
	    });
	    it("@import 1 url string 1", function() {
	        var ast = '{"type":"StyleSheet","range":[0,18],"body":[{"type":"Import","range":[0,18],"uri":{"type":"Uri","range":[8,17]}}]}';
	        var results = CSSLint.verify("@import 'foo.css';");
	        assertAstResults(results, ast);
	    });
	    it("@import 2 url function", function() {
	        var ast = '{"type":"StyleSheet","range":[0,23],"body":[{"type":"Import","range":[0,23],"uri":{"type":"Uri","range":[8,22]}}]}';
	        var results = CSSLint.verify("@import url('foo.css');");
	        assertAstResults(results, ast);
	    });
	    it("@import 3 url string with follow up rule", function() {
	    	var ast = '{"type":"StyleSheet","range":[0,27],"body":[{"type":"Import","range":[0,18],"uri":{"type":"Uri","range":[8,17]}},{"type":"Rule","range":[20,27],"selectorBody":{"type":"SelectorBody","range":[20,24],"selectors":[{"type":"Selector","range":[20,23],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[24,27],"declarations":[]}}]}';
	    	var results = CSSLint.verify("@import 'foo.css';\n\nabc { }");
	        assertAstResults(results, ast);
		});
	    it("@namespace 1", function() {
	        var ast = '{"type":"StyleSheet","range":[0,22],"body":[{"type":"Namespace","range":[0,22],"uri":{"type":"Uri","range":[11,21]}}]}';
	        var results = CSSLint.verify("@namespace url(myURL);");
	        assertAstResults(results, ast);
	    });
	    it("@namespace 2", function() {
	        var ast = '{"type":"StyleSheet","range":[0,26],"body":[{"type":"Namespace","range":[0,26],"prefix":"prefix","uri":{"type":"Uri","range":[18,25]}}]}';
	        var results = CSSLint.verify("@namespace prefix \"myURL\";");
	        assertAstResults(results, ast);
	    });
	    it("@media 1 - complex", function() {
	        var ast = '{"type":"StyleSheet","range":[0,58],"body":[{"type":"Media","range":[0,58],"mediaList":{"type":"MediaList","range":[0,42]},"mediaBody":{"type":"MediaBody","range":[42,58],"body":[{"type":"Rule","range":[44,58],"selectorBody":{"type":"SelectorBody","range":[44,48],"selectors":[{"type":"Selector","range":[44,47],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[48,58],"declarations":[{"type":"Declaration","range":[50,54],"property":{"type":"Property","range":[50,51],"text":"a"},"propertyValue":{"type":"PropertyValue","range":[52,53],"text":"1"}}]}}]}}]}';
	        var results = CSSLint.verify("@media only screen and (max-width: 500px) {\nabc {\na:1;\n}\n}");
	        assertAstResults(results, ast);
	    });
	    it("@supports 1", function() {
	        var ast = '{"type":"StyleSheet","range":[0,62],"body":[{"type":"Rule","range":[0,11],"selectorBody":{"type":"SelectorBody","range":[0,3],"selectors":[{"type":"Selector","range":[0,3],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[3,11],"declarations":[{"type":"Declaration","range":[5,9],"property":{"type":"Property","range":[5,6],"text":"a"},"propertyValue":{"type":"PropertyValue","range":[7,8],"text":"1"}}]}},{"type":"Supports","range":[12,62],"supportsCondition":{"type":"SupportsCondition","range":[12,47],"declarations":{"type":"Declaration","range":[24,45],"property":{"type":"Property","range":[24,38],"text":"animation-name"},"propertyValue":{"type":"PropertyValue","range":[39,44],"text":"test"}}},"supportsBody":{"type":"SupportsBody","range":[46,62],"body":[{"type":"Rule","range":[48,62],"selectorBody":{"type":"SelectorBody","range":[48,52],"selectors":[{"type":"Selector","range":[48,51],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[52,62],"declarations":[{"type":"Declaration","range":[54,60],"property":{"type":"Property","range":[54,57],"text":"cue"},"propertyValue":{"type":"PropertyValue","range":[58,59],"text":"2"}}]}}]}}]}';
	        var results = CSSLint.verify("abc{ a:1; }\n@supports ( animation-name: test) { abc { cue:2; }");
	        assertAstResults(results, ast);
	    });
	    it("@document 1", function() {
	        var ast = '{"type":"StyleSheet","range":[0,76],"body":[{"type":"Document","range":[0,76],"body":[{"type":"Rule","range":[46,76],"selectorBody":{"type":"SelectorBody","range":[46,51],"selectors":[{"type":"Selector","range":[46,50],"text":"body"}]},"declarationBody":{"type":"DeclarationBody","range":[51,76],"declarations":[{"type":"Declaration","range":[57,70],"property":{"type":"Property","range":[57,62],"text":"color"},"propertyValue":{"type":"PropertyValue","range":[63,69],"text":"green"}}]}}]}]}';
	        var results = CSSLint.verify("@document url(myURL), domain(mozilla.org) {\n  body {\n    color: green;\n  }\n}");
	        assertAstResults(results, ast);
	    });
	    it("@page 1 - simple", function() {
	        var ast = '{"type":"StyleSheet","range":[0,8],"body":[{"type":"Page","range":[0,8],"declarationBody":{"type":"DeclarationBody","range":[6,8],"declarations":[]}}]}';
	        var results = CSSLint.verify("@page {}");
	        assertAstResults(results, ast);
	    });
	    it("@page 2 - declaration", function() {
	        var ast = '{"type":"StyleSheet","range":[0,23],"body":[{"type":"Page","range":[0,23],"declarationBody":{"type":"DeclarationBody","range":[6,23],"declarations":[{"type":"Declaration","range":[9,21],"property":{"type":"Property","range":[9,15],"text":"margin"},"propertyValue":{"type":"PropertyValue","range":[16,20],"text":"1in"}}]}}]}';
	        var results = CSSLint.verify("@page {\n\tmargin: 1in;\n}");
	        assertAstResults(results, ast);
	    });
	    it("@page 3 - identifier", function() {
	        var ast = '{"type":"StyleSheet","range":[0,11],"body":[{"type":"Page","range":[0,11],"declarationBody":{"type":"DeclarationBody","range":[9,11],"declarations":[]},"id":"h1"}]}';
	        var results = CSSLint.verify("@page h1 {}");
	        assertAstResults(results, ast);
	    });
	    it("@page 4 - declarations and identifier", function() {
	        var ast = '{"type":"StyleSheet","range":[0,44],"body":[{"type":"Page","range":[0,44],"declarationBody":{"type":"DeclarationBody","range":[9,44],"declarations":[{"type":"Declaration","range":[12,24],"property":{"type":"Property","range":[12,18],"text":"margin"},"propertyValue":{"type":"PropertyValue","range":[19,23],"text":"1in"}},{"type":"Declaration","range":[26,42],"property":{"type":"Property","range":[26,35],"text":"font-size"},"propertyValue":{"type":"PropertyValue","range":[36,41],"text":"20pt"}}]},"id":"h1"}]}';
	        var results = CSSLint.verify("@page h1 {\n\tmargin: 1in;\n\tfont-size: 20pt;\n}");
	        assertAstResults(results, ast);
	    });
	    it("@page 5 - rule and simple", function() {
	        var ast = '{"type":"StyleSheet","range":[0,18],"body":[{"type":"Rule","range":[0,6],"selectorBody":{"type":"SelectorBody","range":[0,4],"selectors":[{"type":"Selector","range":[0,3],"text":"abc"}]},"declarationBody":{"type":"DeclarationBody","range":[5,6],"declarations":[]}},{"type":"Page","range":[8,16],"declarationBody":{"type":"DeclarationBody","range":[14,16],"declarations":[]}}]}';
	        var results = CSSLint.verify("abc {}\n @page {}\n ");
	        assertAstResults(results, ast);
	    });
	    it("@font-face 1", function() {
	        var ast = '{"type":"StyleSheet","range":[0,79],"body":[{"type":"FontFace","range":[0,79],"declarations":[],"declarationBody":{"type":"DeclarationBody","range":[11,79],"declarations":[{"type":"Declaration","range":[15,40],"property":{"type":"Property","range":[15,26],"text":"font-family"},"propertyValue":{"type":"PropertyValue","range":[27,39],"text":"MyHelvetica"}},{"type":"Declaration","range":[43,77],"property":{"type":"Property","range":[43,46],"text":"src"},"propertyValue":{"type":"PropertyValue","range":[47,76],"text":"local(\\"Helvetica Neue Bold\\")"}}]}}]}';
	        var results = CSSLint.verify('@font-face {\n  font-family: MyHelvetica;\n  src: local("Helvetica Neue Bold");\n}');
	        assertAstResults(results, ast);
	    });
	    it("@keyframes 1 - simple", function() {
	        var ast = '{"type":"StyleSheet","range":[0,52],"body":[{"type":"Keyframes","range":[0,52],"declarations":[],"declarationBody":{"type":"DeclarationBody","range":[36,52],"declarations":[{"type":"Declaration","range":[38,48],"property":{"type":"Property","range":[38,41],"text":"top"},"propertyValue":{"type":"PropertyValue","range":[42,47],"text":"30px"}}]}}]}';
	        var results = CSSLint.verify("@keyframes abc { 0% { top: 0; } 50% { top: 30px; } }");
	        assertAstResults(results, ast);
	    });
	    it("@viewport 1 - simple", function() {
	        var ast = '{"type":"StyleSheet","range":[0,37],"body":[{"type":"Viewport","range":[0,37],"declarations":[],"declarationBody":{"type":"DeclarationBody","range":[10,37],"declarations":[{"type":"Declaration","range":[12,35],"property":{"type":"Property","range":[12,23],"text":"orientation"},"propertyValue":{"type":"PropertyValue","range":[24,34],"text":"landscape"}}]}}]}';
	        var results = CSSLint.verify("@viewport { orientation: landscape; }");
	        assertAstResults(results, ast);
	    });
	    
	    
	    
	});
	
	// TODO Make the AST parser more recoverable
	describe.skip("CSS Recoverable AST Tests", function() {
		
		// TODO Uncompleted value 'background: ;' results in node not being closed.
		
	    it("@import url string bad media expression 1", function() {
	        var ast = '{"type":"StyleSheet","range":[0,-1],"body":[{"type":"Import","range":[0,-1],"uri":{"type":"Uri","range":[8,17]},"mediaqueries":{"type":"MediaQueryList","range":[18,25],"queries":[{"type":"MediaQuery","range":[18,25],"expressions":[],"mediafeature":{"type":"MediaFeature","range":[18,23],"value":"print"}}]}}]}';
	        var results = CSSLint.verify("@import 'foo.css' print (font: Ariel);");
	        assertAstResults(results, ast);
	    });
	    it("Recovery - missing prop semi", function() {
	        var ast = '{"type":"StyleSheet","range":[0,18],"body":[{"type":"Rule","range":[4,18],"selectorBody":{"type":"SelectorBody","range":[4,11],"selectors":[{"type":"Selector","range":[4,7]}]},"declarationBody":{"type":"DeclarationBody","range":[11,18],"declarations":[]}}]}';
	        var results = CSSLint.verify("abc{a:1}");
	        assertAstResults(results, ast);
	    });
	    it("Recovery - missing prop semi 2", function() {
	        var ast = '{"type":"StyleSheet","range":[0,18],"body":[{"type":"Rule","range":[4,18],"selectorBody":{"type":"SelectorBody","range":[4,11],"selectors":[{"type":"Selector","range":[4,7]}]},"declarationBody":{"type":"DeclarationBody","range":[11,18],"declarations":[]}}]}';
	        var results = CSSLint.verify("abc{a:1\nb:2;}");
	        assertAstResults(results, ast);
	    });
	    it("Recovery - missing RBRACE", function() {
	        var ast = '{"type":"StyleSheet","range":[0,18],"body":[{"type":"Rule","range":[4,18],"selectorBody":{"type":"SelectorBody","range":[4,11],"selectors":[{"type":"Selector","range":[4,7]}]},"declarationBody":{"type":"DeclarationBody","range":[11,18],"declarations":[]}}]}';
	        var results = CSSLint.verify("abc{a:1");
	        assertAstResults(results, ast);
	    });
	    it("Recovery - missing RBRACE 2", function() {
	        var ast = '{"type":"StyleSheet","range":[0,18],"body":[{"type":"Rule","range":[4,18],"selectorBody":{"type":"SelectorBody","range":[4,11],"selectors":[{"type":"Selector","range":[4,7]}]},"declarationBody":{"type":"DeclarationBody","range":[11,18],"declarations":[]}}]}';
	        var results = CSSLint.verify("abc{a:1\ndef{b:2}");
	        assertAstResults(results, ast);
	    });
	});
});
