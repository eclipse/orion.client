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
/*globals Tautologistics */
define([
'webtools/htmlAstManager',
'chai/chai',
'mocha/mocha' //global export, stays last
], function(HtmlAstManager, chai) {
    /* eslint-disable no-console, missing-nls */
    var assert = chai.assert;
    var astManager = new HtmlAstManager.HtmlAstManager();
	
	function assertResults(results, expected) {
		assert(results, 'No results array found - Parser may not have returned an AST');
		var resultString = JSON.stringify(results);
		var expectedString = JSON.stringify(expected);
		assert.equal(expected.length, results.length, 'Different number of nodes. \nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
		for (var i=0; i<results.length; i++) {
			var eString = JSON.stringify(expected[i]);
			var rString = JSON.stringify(results[i]);
			if (expected[i].name || expected[i].name === ''){
				assert.equal(expected[i].name, results[i].name, 'Different node name. \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
			}
			if (expected[i].type || expected[i].type === ''){
				assert.equal(expected[i].type, results[i].type, 'Different node type. \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
			}
			if (expected[i].value || expected[i].value === ''){
				assert.equal(expected[i].value, results[i].value, 'Different node value. \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
			}
			if (expected[i].data || expected[i].data === ''){
				assert.equal(expected[i].data, results[i].data, 'Different node data. \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
			}
			if (expected[i].selfClosing){
				assert.equal(expected[i].selfClosing, results[i].selfClosing, 'Expected a self closing tag to be marked as such.  \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
			}
			if (expected[i].range){
				assert(results[i].range, 'Missing node range. \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
				assert.equal(expected[i].range[0], results[i].range[0], 'Different node range. \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
				assert.equal(expected[i].range[1], results[i].range[1], 'Different node range. \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
			}
			if (expected[i].openrange){
				assert(results[i].openrange, 'Missing node openrange. \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
				assert.equal(expected[i].openrange[0], results[i].openrange[0], 'Different node openrange. \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
				assert.equal(expected[i].openrange[1], results[i].openrange[1], 'Different node openrange. \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
			}
			if (expected[i].endrange){
				assert(results[i].endrange, 'Missing node endrange. \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
				assert.equal(expected[i].endrange[0], results[i].endrange[0], 'Different node endrange. \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
				assert.equal(expected[i].endrange[1], results[i].endrange[1], 'Different node endrange. \nResult node:\n' + rString + '\nExpected node:\n' + eString + '\nResult:\n' + resultString + '\nExpected:\n' + expectedString + '\n');
			}
			if (expected[i].attributes){
				var rAttributes = [];
				for (var attrib in results[i].attributes) {
					rAttributes.push(results[i].attributes[attrib]);
				}
				assertResults(rAttributes, expected[i].attributes);
			} else if (results[i].attributes && results[i].attributes.length > 0){
				assert(false, 'Node has attributes when no attributes expected. \nResult node:\n' + rString + '\nExpected node:\n' + eString);
			}

			if (expected[i].children){
				assertResults(results[i].children, expected[i].children);
			} else if (results[i].children && results[i].children.length > 0){
				assert(false, 'Node has children when no children expected. \nResult node:\n' + rString + '\nExpected node:\n' + eString);
			}
		}
	}
	
	function parse(text) {
		return astManager.parse(text);
	}

	describe("HTML parser tests", function() {
		it("Parse code point", function() {
			var results = parse('<p>&#9660;</p>');
		    assertResults(results.children, [
	    		{
	    			name: 'p',
	    			type: 'tag',
	    			range: [0,14],
	    			openrange: [0,3],
	    			endrange: [9,14]
	    		}
		    ]);
		});
		// Tags
		it("Parse tags - simple", function() {
			var results = parse('<html></html>');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,13],
	    			openrange: [0,6],
	    			endrange: [6,13]
	    		}
		    ]);
		});
		it("Parse tags - mismatched case", function() {
			var results = parse('<hTmL></HtMl>');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,13],
	    			openrange: [0,6],
	    			endrange: [6,13]
	    		}
		    ]);
		});
		it("Parse tags - upper case", function() {
			var results = parse('<HTML></HTML>');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,13],
	    			openrange: [0,6],
	    			endrange: [6,13]
	    		}
		    ]);
		});
		it("Parse tags - empty contents", function() {
			var results = parse('<html> \n\t </html>');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,17],
	    			openrange: [0,6],
	    			endrange: [10,17]
	    		}
		    ]);
		});
		it("Parse tags - text contents", function() {
			var results = parse('<html>html</html>');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,17],
	    			openrange: [0,6],
	    			endrange: [10,17]
	    		}
		    ]);
		});
		it("Parse tags - missing end tag", function() {
			var results = parse('<html>');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,6],
	    			openrange: [0,6]
	    		}
		    ]);
		});
		it("Parse tags - missing end tag with text", function() {
			var results = parse('<html> /html ');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,13],
	    			openrange: [0,6]
	    		}
		    ]);
		});
		it("Parse tags - only close tag", function() {
			var results = parse('</html>');
		    assertResults(results.children, [
	        ]);
		});
		it("Parse tags - mismatched tags", function() {
			var results = parse('<html></nothtml>');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,6],
	    			openrange: [0,6]
	    		}
		    ]);
		});
		it("Parse tags - multiple tags", function() {
			var results = parse('<html></html><a></a>');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,13],
	    			openrange: [0,6],
	    			endrange: [6,13]
	    		},
	    		{
	    			name: 'a',
	    			type: 'tag',
	    			range: [13,20],
	    			openrange: [13,16],
	    			endrange: [16,20]
	    		}
		    ]);
		});
		it("Parse tags - multiple tags with text", function() {
			var results = parse('<html> html </html> foo <a> a </a>');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,19],
	    			openrange: [0,6],
	    			endrange: [12,19]
	    		},
	    		{
	    			name: 'a',
	    			type: 'tag',
	    			range: [24,34],
	    			openrange: [24,27],
	    			endrange: [30,34]
	    		}
		    ]);
		});
		it("Parse tags - nested", function() {
			var results = parse('<html><a></a></html>');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,20],
	    			openrange: [0,6],
	    			endrange: [13,20],
	    			children: [
	    				{
			    			name: 'a',
			    			type: 'tag',
			    			range: [6,13],
			    			openrange: [6,9],
			    			endrange: [9,13]
	    				}
	    			]
	    		}
		    ]);
		});
		it("Parse tags - nested two deep", function() {
			var results = parse('<html><a><p></p></a></html>');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,27],
	    			openrange: [0,6],
	    			endrange: [20,27],
	    			children: [
	    				{
			    			name: 'a',
			    			type: 'tag',
			    			range: [6,20],
			    			openrange: [6,9],
			    			endrange: [16,20],
			    			children: [
			    				{
			    					name: 'p',
					    			type: 'tag',
					    			range: [9,16],
					    			openrange: [9,12],
					    			endrange: [12,16]
			    				}
			    			]
	    				}
	    			]
	    		}
		    ]);
		});
		
		it("Parse tags - inline", function() {
			var results = parse('<html/>');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			selfclosing: true,
	    			range: [0,7],
	    			openrange: [0,7]
	    		}
		    ]);
		});
		
		it("Parse tags - void tag", function() {
			var results = parse('<img>');
		    assertResults(results.children, [
	    		{
	    			name: 'img',
	    			type: 'tag',
	    			range: [0,5],
	    			openrange: [0,5]
	    		}
		    ]);
		});
		it("Parse tags - void tag with unnecessary self closed tag", function() {
			var results = parse('<img/>');
		    assertResults(results.children, [
	    		{
	    			name: 'img',
	    			type: 'tag',
	    			selfclosing: true,
	    			range: [0,6],
	    			openrange: [0,6]
	    		}
		    ]);
		});
		it("Parse tags - void tag with unnecessary closing tag", function() {
			var results = parse('<img></img>');
		    assertResults(results.children, [
	    		{
	    			name: 'img',
	    			type: 'tag',
	    			range: [0,5],
	    			openrange: [0,5]
	    		}
		    ]);
		});
		
		it("Parse tags - svg tag", function() {
			var results = parse('<svg>\n<defs>\n<linearGradient>\n<stop offset="0"/>\n</linearGradient>\n</defs>\n</svg>');
		    assertResults(results.children, [{
	    		"range":[0,81],
	    		"openrange":[0,5],
	    		"name":"svg",
	    		"type":"tag",
	    		"children":[{
	    			"range":[6,74],
	    			"openrange":[6,12],
	    			"name":"defs",
	    			"type":"tag",
	    			"children":[{
	    				"range":[13,66],
	    				"openrange":[13,29],
	    				"name":"lineargradient",
	    				"type":"tag",
	    				"children":[{
	    					"range":[30,48],
	    					"openrange":[30,48],
	    					"name":"stop",
	    					selfclosing: true,
	    					"type":"tag",
	    					"attributes":[{
	    						"offset":{
	    							"value":"0",
	    							"range":[36,46],
	    							"valueRange":[43,46],
	    							"name":"offset",
	    							"type":"attr"
	    						}
	    					}],
	    				}],
	    				"text":{"range":[0,0],"type":"text","value":"\n"},
	    				"endrange":[49,66]
	    			}],
	    			"text":{"range":[0,0],"type":"text","value":"\n"},
	    			"endrange":[67,74]
	    		}],
	    		"text":{"range":[0,0],"type":"text","value":"\n"},
	    		"endrange":[75,81]
	    	}]);
		});
		it("Parse tags - self closed non-void tag", function() {
			var results = parse('<span/>');
		    assertResults(results.children, [
	    		{
	    			name: 'span',
	    			type: 'tag',
	    			selfclosing: true,
	    			range: [0,7],
	    			openrange: [0,7]
	    		}
		    ]);
		});
		
		// Attributes
		it("Parse attributes - simple", function() {
			var results = parse('<a src="test"></a>');
		    assertResults(results.children, [
		    	{
		    		type: 'tag',
		    		name: 'a',
		    		attributes: [
		    			{
    						name: 'src',
    						value: 'test',
    						range: [3,13]
						}
    				]
	    		}
		    ]);
		});
		it("Parse attributes - multiple", function() {
			var results = parse('<a src="test" width="test2"></a>');
		    assertResults(results.children, [
		    	{
		    		type: 'tag',
		    		name: 'a',
		    		attributes: [
		    			{
    						name: 'src',
    						value: 'test',
    						range: [3,13]
						},
						{
    						name: 'width',
    						value: 'test2',
    						range: [14,27]
						}
    				]
	    		}
		    ]);
		});
		it("Parse attributes - duplicate", function() {
			var results = parse('<a src="test" src="test2"></a>');
		    assertResults(results.children, [
		    	{
		    		type: 'tag',
		    		name: 'a',
		    		attributes: [
		    			{
    						name: 'src',
    						value: 'test',
    						range: [3,13]
						},
		    			{
    						name: 'src',
    						value: 'test2',
    						range: [14,25]
						}
    				]
	    		}
		    ]);
		});
		/*
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=486134
		 */
		it("Parse attributes - duplicates in two different tags", function() {
			var results = parse('<html width="100%"><body width="100%"></body></html>');
		    assertResults(results.children, [
		    	{
		    		type: 'tag',
		    		name: 'html',
		    		range: [0,52],
		    		openrange: [0,19],
		    		endrange: [45,52],
		    		attributes: [
		    			{
    						name: 'width',
    						value: '100%',
    						range: [6,18]
						}
    				],
    				children: [
    					{
	    					type: 'tag',
				    		name: 'body',
				    		range: [19,45],
				    		openrange: [19,38],
				    		endrange: [38,45],
				    		attributes: [
				    			{
		    						name: 'width',
		    						value: '100%',
		    						range: [25,37]
								}
		    				]
	    				}
    				]
	    		}
		    ]);
		});
		// TODO Duplicate attributes only show up once in the AST, this works fine for our current tooling
		it("Parse attributes - single quotes", function() {
			var results = parse('<a src=\'test\'></a>');
		    assertResults(results.children, [
		    	{
		    		type: 'tag',
		    		name: 'a',
		    		attributes: [
		    			{
    						name: 'src',
    						value: 'test',
    						range: [3,13]
						}
    				]
	    		}
		    ]);
		});
		it("Parse attributes - no quotes", function() {
			var results = parse('<a src=test></a>');
		    assertResults(results.children, [
		    	{
		    		type: 'tag',
		    		name: 'a',
		    		attributes: [
		    			{
    						name: 'src',
    						value: 'test',
    						range: [3,11]
    						
						}
    				]
	    		}
		    ]);
		});
		it("Parse attributes - whitespace", function() {
			var results = parse('<a \t\n src \t\n= \t\n"test" \t\n></a>');
		    assertResults(results.children, [
		    	{
		    		type: 'tag',
		    		name: 'a',
		    		attributes: [
		    			{
    						name: 'src',
    						value: 'test',
    						range: [6,22]
						}
    				]
	    		}
		    ]);
		});
		it("Parse attributes - no value", function() {
			var results = parse('<a src></a>');
		    assertResults(results.children, [
		    	{
		    		type: 'tag',
		    		name: 'a',
		    		attributes: [
		    			{
    						name: 'src',
    						range: [3,6]
						}
    				]
	    		}
		    ]);
		});
		it("Parse attributes - no value 2", function() {
			var results = parse('<a src=></a>');
		    assertResults(results.children, [
		    	{
		    		type: 'tag',
		    		name: 'a',
		    		attributes: [
		    			{
    						name: 'src',
    						value: null,
    						range: [3,7]
						}
    				]
	    		}
		    ]);
		});
		it("Parse attributes - no value 3", function() {
			var results = parse('<a src=""></a>');
		    assertResults(results.children, [
		    	{
		    		type: 'tag',
		    		name: 'a',
		    		attributes: [
		    			{
    						name: 'src',
    						value: '',
    						range: [3,9]
						}
    				]
	    		}
		    ]);
		});
		it("Parse attributes - unclosed value, unclosed tag", function() {
			var results = parse('<a src="</a>');
			assertResults(results.children, [
				{
					type: 'tag',
					name: 'a',
					range: [0,12],
					attributes: [
						{
							name: 'src',
							value: null,
							range: [3,8]
						}
					]
				}
			]);
		});
		it("Parse attributes - unclosed value, closed tag", function() {
			var results = parse('<a src="></a>');
			assertResults(results.children, [
				{
					type: 'tag',
					name: 'a',
					range: [0,13],
					attributes: [
						{
							name: 'src',
							value: ">",
							range: [3,9]
						}
					]
				}
			]);
		});
		it("Parse attributes - unclosed value, unclosed tag", function() {
			var results = parse("<a src='</a>");
			assertResults(results.children, [
				{
					type: 'tag',
					name: 'a',
					range: [0,12],
					attributes: [
						{
							name: 'src',
							value: null,
							range: [3,8]
						}
					]
				}
			]);
		});
		it("Parse attributes - unclosed value, closed tag", function() {
			var results = parse("<a src='></a>");
			assertResults(results.children, [
				{
					type: 'tag',
					name: 'a',
					range: [0,13],
					attributes: [
						{
							name: 'src',
							value: ">",
							range: [3,9]
						}
					]
				}
			]);
		});
		// Instructions
		it("Parse !doctype instruction", function() {
			var results = parse('<!doctype html><html></html>');
		    assertResults(results.children, [
		    	{
		    		name: '!doctype',
		    		type: 'instr',
		    		value: '!doctype html',
		    		range: [0, 14]
	    		},
	    		{
	    			name: 'html',
	    			type: 'tag'
	    		}
		    ]);
		});
		it("Parse !doctype instruction 2", function() {
			var results = parse('<!doctype PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd><html></html>');
		    assertResults(results.children, [
		    	{
		    		name: '!doctype',
		    		type: 'instr',
		    		value: '!doctype PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd',
		    		range: [0, 83]
	    		},
	    		{
	    			name: 'html',
	    			type: 'tag'
	    		}
		    ]);
		});
		it("Parse !doctype instruction 3 - mixed case gets lower cased", function() {
			var results = parse('<!doCtypE PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd><html></html>');
		    assertResults(results.children, [
		    	{
		    		name: '!doctype',
		    		type: 'instr',
		    		value: '!doCtypE PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd',
		    		range: [0, 83]
	    		},
	    		{
	    			name: 'html',
	    			type: 'tag'
	    		}
		    ]);
		});
		it("Parse !doctype instruction 4 - upper case gets lower cased", function() {
			var results = parse('<!DOCTYPE PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd><html></html>');
		    assertResults(results.children, [
		    	{
		    		name: '!doctype',
		    		type: 'instr',
		    		value: '!DOCTYPE PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd',
		    		range: [0, 83]
	    		},
	    		{
	    			name: 'html',
	    			type: 'tag'
	    		}
		    ]);
		});
		
		// Comments
		it("Parse comment - simple", function() {
			var results = parse('<!-- comment -->');
		    assertResults(results.children, [
		    	{
		    		type: 'comment',
		    		range: [0, 15]
	    		}
		    ]);
		});
		it("Parse comment - commented out tag", function() {
			var results = parse('<!-- <a></a> -->');
		    assertResults(results.children, [
		    	{
		    		type: 'comment',
		    		range: [0, 15]
	    		}
		    ]);
		});
		
		// Text
		it("Parse text - empty", function() {
			var results = parse('');
		    assertResults(results.children, [
		    ]);
		});
		it("Parse text - text", function() {
			var results = parse('This is a test html file');
		    assertResults(results.children, [
		    ]);
		});
		it("Parse text - whitespace", function() {
			var results = parse('  \t\t\n\n');
		    assertResults(results.children, [
		    ]);
		});

	});
	
	describe("HTML Recoverable Parsing Tests", function() {
		it("Parse tolerant - open tag with attribute 1", function() {
			var results = parse('<html width="10');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,15],
	    			openrange: [0,15],
	    			attributes: [
	    				{
	    					name: 'width',
//	    					value: '10', // TODO No value recovery yet
	    					range: [6,15]
	    				}
	    			]
	    		}
		    ]);
		});
		it("Parse tolerant - open tag with attribute 2", function() {
			var results = parse('<html width="100%"');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,18],
	    			openrange: [0,18],
	    			attributes: [
	    				{
	    					name: 'width',
	    					value: '100%',
	    					range: [6,18]
	    				}
	    			]
	    		}
		    ]);
		});
		it("Parse tolerant - open tag with attribute 3", function() {
			var results = parse('<html width="100%" ');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,19],
	    			openrange: [0,19],
	    			attributes: [
	    				{
	    					name: 'width',
	    					value: '100%',
	    					range: [6,18]
	    				}
	    			]
	    		}
		    ]);
		});
		it("Parse tolerant - open tag with attribute 4", function() {
			var results = parse('<html width="100%" height=');
		    assertResults(results.children, [
	    		{
	    			name: 'html',
	    			type: 'tag',
	    			range: [0,26],
	    			openrange: [0,26],
	    			attributes: [
	    				{
	    					name: 'width',
	    					value: '100%',
	    					range: [6,18]
	    				},
	    				{
	    					name: 'height',
	    					range: [19,26]
	    				}
	    			]
	    		}
		    ]);
		});
			
//		it("Parse tolerant - open tag", function() {
//			var results = parse('<html');
//		    assertResults(results.children, [
//	    		{
//	    			name: 'html',
//	    			type: 'tag',
//	    			range: [0,5],
//	    			openrange: [0,5]
//	    		}
//		    ]);
//		});
		
//		<html><ar</html>
//		<html><ar </html>
//		<ar<a/>
//		<html><ar<a></a></html>
//		<!-- comment
//		<html></html
	});
});
