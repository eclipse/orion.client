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
/*eslint-env amd, mocha*/
define([
    'webtools/util',
    'chai/chai',
    'csslint/csslint',
    'webtools/htmlAstManager',
    'orion/Deferred',
    'mocha/mocha' //global, stays last
], function(Util, chai, CSSLint, HTMLAstManager, Deferred) {
    /* eslint-disable missing-nls */
    var assert = chai.assert;
    
    var htmlAstManager = new HTMLAstManager.HtmlAstManager();
    
    /**
     * Creates a new testing editorContext. Also clears the AST managers
     */
    function getEditorContext(buffer, file) {
    	var _file = file ? file : 'html_util_test_script.html';
    	htmlAstManager.onModelChanging({file: {location: _file}});
    	return {
    		getText: function() {
    			return new Deferred().resolve(buffer);
    		},
    		getFileMetadata: function() {
    			 var o = Object.create(null);
			    o.contentType = Object.create(null);
			    o.contentType.id = 'text/html';
			    o.location = _file;
			    return new Deferred().resolve(o);
    		}
    	};
    }
    
    describe("Util Tests", function() {
        
        /**
		 * Tests the support for finding style blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlock1', function() {
			var text = "<!DOCTYPE html><head><style>@charset 'UTF-8';</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text);
			assert.equal(blocks.length, 1, "Should have found one style block");
			assert.equal(blocks[0].offset, 28);
			assert.equal(blocks[0].text, '@charset \'UTF-8\';');
		});
		
		/**
		 * Tests the support for finding style blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlock2', function() {
			var text = "<!DOCTYPE html><head><styLe>@charset 'UTF-8';</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text);
			assert.equal(blocks.length, 1, "Should have found one style block");
			assert.equal(blocks[0].offset, 28);
			assert.equal(blocks[0].text, "@charset 'UTF-8';");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlock3', function() {
			var text = "<!DOCTYPE html><head><style>@charset 'UTF-8';</styLe></head><html></html>";
			var blocks = Util.findStyleBlocks(text);
			assert.equal(blocks.length, 1, "Should have found one style block");
			assert.equal(blocks[0].offset, 28);
			assert.equal(blocks[0].text, "@charset 'UTF-8';");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlock4', function() {
			var text = "<!DOCTYPE html><head><stYle>@charset 'UTF-8';</Style></head><html></html>";
			var blocks = Util.findStyleBlocks(text);
			assert.equal(blocks.length, 1, "Should have found one style block");
			assert.equal(blocks[0].offset, 28);
			assert.equal(blocks[0].text, "@charset 'UTF-8';");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlock5', function() {
			var text = "<!DOCTYPE html><head><style   >@charset 'UTF-8';</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text);
			assert.equal(blocks.length, 1, "Should have found one style block");
			assert.equal(blocks[0].offset, 31);
			assert.equal(blocks[0].text, "@charset 'UTF-8';");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlockMulti1', function() {
			var text = "<!DOCTYPE html><head><style>@charset 'UTF-8';</style><style>@import url('UTF-8');</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text);
			assert.equal(blocks.length, 2, "Should have found two style blocks");
			assert.equal(blocks[0].offset, 28);
			assert.equal(blocks[0].text, "@charset 'UTF-8';");
			assert.equal(blocks[1].offset, 60);
			assert.equal(blocks[1].text, "@import url('UTF-8');");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlockMulti2', function() {
			var text = "<!DOCTYPE html><head><stYle>@charset 'UTF-8';</style><stylE>@import url('UTF-8');</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text);
			assert.equal(blocks.length, 2, "Should have found two style blocks");
			assert.equal(blocks[0].offset, 28);
			assert.equal(blocks[0].text, "@charset 'UTF-8';");
			assert.equal(blocks[1].offset, 60);
			assert.equal(blocks[1].text, "@import url('UTF-8');");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlockMulti3', function() {
			var text = "<!DOCTYPE html><head><styLe>@charset 'UTF-8';</sTyle><sTyle>@import url('UTF-8');</Style></head><html></html>";
			var blocks = Util.findStyleBlocks(text);
			assert.equal(blocks.length, 2, "Should have found two style blocks");
			assert.equal(blocks[0].offset, 28);
			assert.equal(blocks[0].text, "@charset 'UTF-8';");
			assert.equal(blocks[1].offset, 60);
			assert.equal(blocks[1].text, "@import url('UTF-8');");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlockMulti4', function() {
			var text = "<!DOCTYPE html><head><style >@charset 'UTF-8';</style><style  >@import url('UTF-8');</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text);
			assert.equal(blocks.length, 2, "Should have found two style blocks");
			assert.equal(blocks[0].offset, 29);
			assert.equal(blocks[0].text, "@charset 'UTF-8';");
			assert.equal(blocks[1].offset, 63);
			assert.equal(blocks[1].text, "@import url('UTF-8');");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlockMultiWithOffset1', function() {
			var text = "<!DOCTYPE html><head><style >@charset 'UTF-8';</style><style  >@import url('UTF-8');</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text, 39);
			assert.equal(blocks.length, 1, "Should have found one style block");
			assert.equal(blocks[0].offset, 29);
			assert.equal(blocks[0].text, "@charset 'UTF-8';");
		});
		/**
		 * Tests the support for finding style blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlockMultiWithOffset2', function() {
			var text = "<!DOCTYPE html><head><style >@charset 'UTF-8';</style><style  >@import url('UTF-8');</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text, 71);
			assert.equal(blocks.length, 1, "Should have found one style block");
			assert.equal(blocks[0].offset, 63);
			assert.equal(blocks[0].text, "@import url('UTF-8');");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlockWithOffset1', function() {
			var text = "<!DOCTYPE html><head><style >@import url('UTF-8');</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text, 39);
			assert.equal(blocks.length, 1, "Should have found one style block");
			assert.equal(blocks[0].offset, 29);
			assert.equal(blocks[0].text, "@import url('UTF-8');");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML with postamble text
		 * https:https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlockWithSpacePostamble1', function() {
			var text = "<!DOCTYPE html><head><style type=\"text/css\">@import url('UTF-8');</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text, 48);
			assert.equal(blocks.length, 1, "Should have found one style block");
			assert.equal(blocks[0].offset, 44);
			assert.equal(blocks[0].text, "@import url('UTF-8');");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML with postamble text
		 * https:https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlockWithSpacePostamble2', function() {
			var text = "<!DOCTYPE html><head><style type=\"text/css\"  >@import url('UTF-8');</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text, 48);
			assert.equal(blocks.length, 1, "Should have found one style block");
			assert.equal(blocks[0].offset, 46);
			assert.equal(blocks[0].text, "@import url('UTF-8');");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML with postamble text
		 * https:https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlockWithSpacePostamble3', function() {
			var text = "<!DOCTYPE html><head><style type=\"text/css\" bar  >@import url('UTF-8');</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text, 51);
			assert.equal(blocks.length, 1, "Should have found one style block");
			assert.equal(blocks[0].offset, 50);
			assert.equal(blocks[0].text, "@import url('UTF-8');");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML with postamble text
		 * https:https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlockWithSpacePostamble4', function() {
			var text = "<!DOCTYPE html><head><style type=\"text/css\" bar  >@import url('UTF-8');</style type='text/css' ></head><html></html>";
			var blocks = Util.findStyleBlocks(text, 51);
			assert.equal(blocks.length, 1, "Should have found one style block");
			assert.equal(blocks[0].offset, 50);
			assert.equal(blocks[0].text, "@import url('UTF-8');");
		});
	
		/**
		 * Tests the support for finding style blocks with type tags
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findStyleBlockWithType1', function() {
			var text = "<!DOCTYPE html><head><style type=\"\">@import 'foo';</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text, 39);
			assert.equal(blocks.length, 1, "Should have found one style block");
			assert.equal(blocks[0].offset, 36);
			assert.equal(blocks[0].text, "@import 'foo';");
		});
		
		/**
		 * Tests the support for finding style blocks in HTML with postamble text
		 * https:https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findNostyleBlockWithSpacePostamble1', function() {
			var text = "<!DOCTYPE html><head><style type=\"text/css\" bar  > >@import 'foo';</style type= javas cript ></head><html></html>";
			var blocks = Util.findStyleBlocks(text, 39);
			assert.equal(blocks.length, 0, "Should not have found any style blocks");
		});
		
		/**
		 * Tests finding style blocks within comments
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findNoStyleBlockInHTMLComment1', function() {
			var text = "<!DOCTYPE html><head><!--<style>@import 'foo';</style>--></head><html></html>";
			var blocks = Util.findStyleBlocks(text, 33);
			assert.equal(blocks.length, 0, "Should not have found any style blocks");
		});
		/**
		 * Tests finding style blocks within comments
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findNoStyleBlockInHTMLComment2', function() {
			var text = "<!DOCTYPE html><head><!--<style>@import 'foo';</style>--><style>@import 'foo';</style><!--<style>@import 'foo';</style>--></head><html></html>";
			var blocks = Util.findStyleBlocks(text);
			assert.equal(blocks.length, 1, "Should have found one style block");
		});
		/**
		 * Tests finding style blocks within comments
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findNoStyleBlockInHTMLComment3', function() {
			var text = "<!DOCTYPE html><head><!--<style>@import 'foo';</style><style>function f() {}</style><style>@import 'foo';</style>--></head><html></html>";
			var blocks = Util.findStyleBlocks(text);
			assert.equal(blocks.length, 0, "Should have found no style blocks");
		});
		/**
		 * Tests finding style blocks within comments
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427821
		 */
		it('test_findNoStyleBlockInHTMLComment2', function() {
			var text = "<!DOCTYPE html><head><style>@import 'foo';</style><!--<style>@import 'foo';</style>--><style>@import 'foo';</style></head><html></html>";
			var blocks = Util.findStyleBlocks(text);
			assert.equal(blocks.length, 2, "Should have found two style blocks");
		});
		
		/**
		 * Tests finding tokens
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=459580
		 */
		it('test_findToken1', function() {
			var text = "@Namespace foo url('bar');";
			var results = CSSLint.verify(text);
			assert(results, 'CSSLint should have produced tokens and an AST');
			var token = Util.findToken(6, results.tokens);
			assert(token, "Should have found the first token in the stream");
			assert.equal(token.type, 'NAMESPACE_SYM', 'We should have found a namespace token');
		});
		
		/**
		 * Tests finding tokens
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=459580
		 */
		it('test_findToken2', function() {
			var text = "@Namespace foo url('bar');";
			var results = CSSLint.verify(text);
			assert(results, 'CSSLint should have produced tokens and an AST');
			var token = Util.findToken(26, results.tokens);
			assert(token, "Should have found the last token in the stream");
			assert(token.type === 'EOF', "The last token should not be EOF");
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 1 - tag', function() {
			var text = '<p>foo</p>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 1);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'tag', 'We should have found a tag node');
				assert.equal(node.name, 'p', 'We should have found a p node');
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 2 - tag', function() {
			var text = '<p>foo</p>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 7);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'tag', 'We should have found a tag node');
				assert.equal(node.name, 'p', 'We should have found a p node');
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 3 - tag', function() {
			var text = '<p>foo</p><h1>foobar</h1>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 12);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'tag', 'We should have found a tag node');
				assert.equal(node.name, 'h1', 'We should have found a h1 node');
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 4 -tag', function() {
			var text = '<p>foo</p><h1>foobar</h1>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 21);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'tag', 'We should have found a tag node');
				assert.equal(node.name, 'h1', 'We should have found a h1 node');
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 5 - text', function() {
			var text = '<p>foo</p><h1>foobar</h1>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 4);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'tag', 'We should have found a tag node');
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 6 - text', function() {
			var text = '<p>foo</p><h1>foobar</h1>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 15);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'tag', 'We should have found a tag node');
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 7 - attr', function() {
			var text = '<p id="a">foo</p><h1>foobar</h1>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 4);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'attr', 'We should have found a tag node');
				assert.equal(node.value, 'a', 'We should have found the attr value of a');
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 8 - attr', function() {
			var text = '<p id="a">foo</p><h1 id="b">foobar</h1>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 26);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'attr', 'We should have found a tag node');
				assert.equal(node.value, 'b', 'We should have found the attr value of b');
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 9 - nested p tag', function() {
			var text = '<h1><p>foo</p></h1>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 5);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'tag', 'We should have found a tag node');
				assert.equal(node.name, 'p', 'We should have found the start p tag');
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 10 - nested p tag', function() {
			var text = '<h1><p>foo</p></h1>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 12);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'tag', 'We should have found a tag node');
				assert.equal(node.name, 'p', 'We should have found the end p tag');
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 11 - nested span tag', function() {
			var text = '<h1><p><span>hello</span></p></h1>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 9);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'tag', 'We should have found a tag node');
				assert.equal(node.name, 'span', 'We should have found the start span tag');
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 12 - nested span tag', function() {
			var text = '<h1><p><span>hello</span></p></h1>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 20);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'tag', 'We should have found a tag node');
				assert.equal(node.name, 'span', 'We should have found the end span tag');
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 14 - multi nested p tag', function() {
			var text = '<h1><p><span>hello</span></p></h1><body><div><p>world</p></div></body>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 46);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'tag', 'We should have found a tag node');
				assert.equal(node.name, 'p', 'We should have found the start p tag');
			});
		});/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471479
		 * @since 10.0
		 */
		it('find node at offset 15 - multi nested p tag', function() {
			var text = '<h1><p><span>hello</span></p></h1><body><div><p>world</p></div></body>';
			return htmlAstManager.getAST(getEditorContext(text)).then(function(ast) {
				var node = Util.findNodeAtOffset(ast, 55);
				assert(node, 'we should have found a node');
				assert.equal(node.type, 'tag', 'We should have found a tag node');
				assert.equal(node.name, 'p', 'We should have found the end p tag');
			});
		});
    });
});
