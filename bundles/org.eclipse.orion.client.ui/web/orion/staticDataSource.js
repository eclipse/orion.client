/*******************************************************************************
 *
 * @license
 * Copyright (c) 2010, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/Deferred',
	"orion/editor/textStyler", 
	"orion/editor/stylers/application_javascript/syntax",
	"orion/editor/stylers/application_vnd.coffeescript/syntax",
	"orion/editor/stylers/application_x-jsp/syntax",
	"orion/editor/stylers/application_x-sh/syntax",
	"orion/editor/stylers/application_xquery/syntax",
	"orion/editor/stylers/application_sql/syntax",
	"orion/editor/stylers/text_css/syntax",
	"orion/editor/stylers/text_x-scss/syntax",
	"orion/editor/stylers/text_x-less/syntax",
	"orion/editor/stylers/text_html/syntax",
	"orion/editor/stylers/text_jsx/syntax",
	"orion/editor/stylers/application_json/syntax",
	"orion/editor/stylers/text_x-csrc/syntax",
	"orion/editor/stylers/text_x-csharp/syntax",
	"orion/editor/stylers/text_x-cshtml/syntax",
	"orion/editor/stylers/text_x-c__src/syntax",
	"orion/editor/stylers/text_x-dockerfile/syntax",
	"orion/editor/stylers/text_x-erlang/syntax",
	"orion/editor/stylers/text_x-haml/syntax",
	"orion/editor/stylers/text_x-java-source/syntax",
	"orion/editor/stylers/text_x-jade/syntax",
	"orion/editor/stylers/text_x-lua/syntax",
	"orion/editor/stylers/text_x-php/syntax",
	"orion/editor/stylers/text_x-python/syntax",
	"orion/editor/stylers/text_x-ruby/syntax",
	"orion/editor/stylers/text_x-go/syntax",
	"orion/editor/stylers/text_x-objective-c/syntax",
	"orion/editor/stylers/text_x-properties/syntax",
	"orion/editor/stylers/text_x-smarty/syntax",
	"orion/editor/stylers/text_x-swift/syntax",
	"orion/editor/stylers/text_x-typescript/syntax",
	"orion/editor/stylers/text_x-vb/syntax",
	"orion/editor/stylers/text_x-vbhtml/syntax",
	'orion/editor/stylers/application_x-ejs/syntax',
	'orion/editor/stylers/application_xml/syntax',
	'orion/editor/stylers/text_x-yaml/syntax',
], function(Deferred, mStyler, mJS, mCoffeescript, mJSP, mBash, mXQuery, mSQL, mCss, mScss, mLess, mHtml, mJSX, mJson, mC, mCS, mCSHTML, mCpp, mDockerfile, mErlang, mHaml, mJava, mJade, mLua, mPhp, mPython, mRuby, mGo, mObjectiveC, mProperties, mSmarty, mSwift, mTypescript, mVB, mVBHTML, mEJS, mXml, mYaml) {
	var ContentTypes = [
		{	id: "text/plain",
			name: "Text",
			extension: ["txt"],
			imageClass: "file-sprite-text modelDecorationSprite"
		},
		{	id: "application/javascript",
			"extends": "text/plain",
			name: "JavaScript",
			extension: ["js"],
			imageClass: "file-sprite-javascript modelDecorationSprite"
		},
		{	id: "application/vnd.coffeescript",
			"extends": "text/plain",
			name: "CoffeeScript",
			extension: ["coffee"]
		},
		{	id: "text/jsx",
			"extends": "text/plain",
			name: "JSX",
			extension: ["jsx"]
		},
		{	id: "text/html",
			"extends": "text/plain",
			name: "HTML",
			extension: ["html", "htm"],
			imageClass: "file-sprite-html modelDecorationSprite"
		},
		{	id: "text/css",
			"extends": "text/plain",
			name: "CSS",
			extension: ["css"],
			imageClass: "file-sprite-css modelDecorationSprite"
		},
		{	id: "text/x-scss",
			"extends": "text/plain",
			name: "SCSS",
			extension: ["scss", "sass"]
		},
		{	id: "text/x-less",
			"extends": "text/plain",
			name: "Less",
			extension: ["less"]
		},
		{	id: "application/json",
			"extends": "text/plain",
			name: "JSON",
			extension: ["json"],
			imageClass: "file-sprite-text modelDecorationSprite"
		},
		{	id: "application/sql",
			"extends": "text/plain",
			name: "SQL",
			extension: ["sql"]
		},
		{	id: "application/xml",
			"extends": "text/plain",
			name: "XML",
			extension: ["xml"],
			imageClass: "file-sprite-xml modelDecorationSprite"
		},
		{	id: "application/x-ejs",
			"extends": "text/plain",
			name: "Embedded Javascript",
			extension: ["ejs"],
			imageClass: "file-sprite-javascript modelDecorationSprite"
		},
		{	id: "text/x-java-source",
			"extends": "text/plain",
			name: "Java",
			extension: ["java"]
		},
		{	id: "application/x-jsp",
			"extends": "text/plain",
			name: "Java Server Page",
			extension: ["jsp"]
		},
		{	id: "application/x-sh",
			"extends": "text/plain",
			name: "Bash",
			extension: ["sh"]
		},
		{	id: "text/x-jade",
			"extends": "text/plain",
			name: "Jade",
			extension: ["jade"]
		},
		{	id: "text/x-python",
			"extends": "text/plain",
			name: "Python",
			extension: ["py", "rpy", "pyw", "cpy", "SConstruct", "Sconstruct", "sconstruct", "SConscript", "gyp", "gypi"]
		},
		{	id: "text/x-ruby",
			"extends": "text/plain",
			name: "Ruby",
			extension: ["rb", "rbx", "rjs", "Rakefile", "rake", "cgi", "fcgi", "gemspec", "irbrc", "capfile", "ru", "prawn", "Gemfile", "Guardfile", "Vagrantfile", "Appraisals", "Rantfile"]
		},
		{	id: "text/x-go",
			name: "Go",
			extension: ["go"],
			"extends": "text/plain"
		},
		{	id: "text/x-launch",
			"extends": "application/json",
			name: "Launch file",
			extension: ["launch"]
		},
		{	id: "text/x-objective-c",
			"extends": "text/plain",
			name: "Objective-C",
			extension: ["m", "mm", "h"]
		},
		{	id: "text/x-php",
			"extends": "text/plain",
			name: "PHP",
			extension: ["php", "php3", "php4", "php5", "phpt", "phtml", "aw", "ctp"]
		},
		{	id: "text/x-properties",
			"extends": "text/plain",
			name: "Properties",
			extension: ["properties"]
		},
		{	id: "text/x-smarty",
			"extends": "text/plain",
			name: "Smarty",
			extension: ["tpl"]
		},
		{	id: "text/x-swift",
			"extends": "text/plain",
			name: "Swift",
			extension: ["swift"]
		},
		{	id: "text/x-typescript",
			"extends": "text/plain",
			name: "Typescript",
			extension: ["ts"]
		},
		{	id: "text/x-markdown",
			"extends": "text/plain",
			name: "Markdown",
			extension: ["md"]
		},
		{	id: "text/x-yaml",
			"extends": "text/plain",
			name: "YAML",
			extension: ["yaml", "yml"]
		},
		{	id: "text/conf",
			"extends": "text/plain",
			name: "Conf",
			extension: ["conf"]
		},
		{	id: "application/browser-renderable",
			name: "browser-renderable"
		},
		{	id: "application/pdf",
			"extends": "application/browser-renderable",
			name: "PDF",
			extension: ["pdf"]
		},
		{	id: "application/octet-stream",
			name: "octet-stream",
			extension: ["exe", "bin", "doc", "ppt"]
		},
		{	id: "application/zip",
			"extends": "application/octet-stream",
			name: "ZIP",
			extension: ["war", "jar", "zip", "rar", "gz", "tar"]
		},
		{	id: "text/x-arduino",
			"extends": "text/x-csrc",
			name: "Arduino",
			extension: ["ino", "pde"]
		},
		{	id: "text/x-csrc",
			"extends": "text/plain",
			name: "C",
			extension: ["c", "h"]
		},
		{	id: "text/x-csharp",
			"extends": "text/plain",
			name: "C#",
			extension: ["cs"]
		},
		{	id: "text/x-cshtml",
			"extends": "text/plain",
			name: "cshtml",
			extension: ["cshtml"]
		},
		{	id: "text/x-c++src",
			"extends": "text/plain",
			name: "C++",
			extension: ["cpp", "hpp"]
		},
		{	id: "text/x-dockerfile",
			"extends": "text/plain",
			name: "dockerfile",
			filename: ["dockerfile"]
		},
		{	id: "text/x-erlang",
			"extends": "text/plain",
			name: "Erlang",
			extension: ["erl", "hrl"]
		},
		{	id: "text/x-haml",
			"extends": "text/plain",
			name: "Haml",
			extension: ["haml"]
		},
		{	id: "text/x-lua",
			"extends": "text/plain",
			name: "Lua",
			extension: ["lua"]
		},
		{	id: "application/xquery",
			"extends": "text/plain",
			name: "XQuery",
			extension:  ["xq", "xqy", "xquery"]
		},
		{	id: "text/x-vb",
			"extends": "text/plain",
			name: "VB.NET",
			extension: ["vb"]
		},
		{	id: "text/x-vbhtml",
			"extends": "text/plain",
			name: "vbhtml",
			extension: ["vbhtml"]
		},
		// Image types
		{	id: "image/gif",
			name: "GIF",
			extension: ["gif"],
			imageClass: "file-sprite-image modelDecorationSprite"
		},
		{	id: "image/jpeg",
			name: "JPG",
			extension: ["jpg", "jpeg", "jpe"],
			imageClass: "file-sprite-image modelDecorationSprite"
		},
		{	id: "image/ico",
			name: "ICO",
			extension: ["ico"],
			imageClass: "file-sprite-image modelDecorationSprite"
		},
		{	id: "image/png",
			name: "PNG",
			extension: ["png"],
			imageClass: "file-sprite-image modelDecorationSprite"
		},
		{	id: "image/tiff",
			name: "TIFF",
			extension: ["tif", "tiff"],
			imageClass: "file-sprite-image modelDecorationSprite"
		},
		{	id: "image/svg",
			name: "SVG",
			extension: ["svg"],
			imageClass: "file-sprite-image modelDecorationSprite"
		}
	];
	
	function SyntaxHighlighter() {
		this.styler = null;
	}
	
	SyntaxHighlighter.prototype = {
		setup: function(fileContentType, textView, annotationModel, fileName, allowAsync) {
			if (this.styler) {
				if (this.styler.destroy) {
					this.styler.destroy();
				}
				this.styler = null;
			}
			return this._highlight(fileContentType, textView, annotationModel);
		},
		highlight: function(fileName, contentType, editor) {
			var textView = editor.getTextView();
			var annotationModel = editor.getAnnotationModel();
			return this._highlight(contentType, textView, annotationModel);
		},
		_highlight: function(fileContentType, textView, annotationModel) {
			if (this.styler) {
				this.styler.destroy();
				this.styler = null;
			}
			var stylerAdapter = null;
			if (fileContentType) {
				switch(fileContentType.id) {
					case "application/javascript": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mJS.grammars, "orion.js", fileContentType.id); //$NON-NLS-0$
						break;
					case "application/vnd.coffeescript": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mCoffeescript.grammars, "orion.coffeescript", fileContentType.id); //$NON-NLS-0$
						break;
					case "application/x-ejs": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mEJS.grammars, "orion.ejs", fileContentType.id); //$NON-NLS-0$
						break;
					case "application/x-sh": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mBash.grammars, "orion.bash", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/css": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mCss.grammars, "orion.css", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-scss": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mScss.grammars, "orion.scss", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-less": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mLess.grammars, "orion.less", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/html": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mHtml.grammars, "orion.html", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/jsx": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mJSX.grammars, "orion.jsx", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-java-source": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mJava.grammars, "orion.java", fileContentType.id); //$NON-NLS-0$
						break;
					case "application/x-jsp": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mJSP.grammars, "orion.jsp", fileContentType.id); //$NON-NLS-0$
						break;
					case "application/json": //$NON-NLS-0$
					case "text/x-launch": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mJson.grammars, "orion.json", fileContentType.id); //$NON-NLS-0$
						break;
					case "application/sql": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mSQL.grammars, "orion.sql", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-jade": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mJade.grammars, "orion.jade", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-python": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mPython.grammars, "orion.python", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-ruby": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mRuby.grammars, "orion.ruby", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-go": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mGo.grammars, "orion.go", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-objective-c": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mObjectiveC.grammars, "orion.objectiveC", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-php": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mPhp.grammars, "orion.php", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-properties": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mProperties.grammars, "orion.properties", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-smarty": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mSmarty.grammars, "orion.smarty", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-swift": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mSwift.grammars, "orion.swift", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-typescript": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mTypescript.grammars, "orion.typescript", fileContentType.id); //$NON-NLS-0$
						break;
					case "application/xml": //$NON-NLS-0$
					case "application/xhtml+xml": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mXml.grammars, "orion.xml", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-yaml": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mYaml.grammars, "orion.yaml", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-arduino": //$NON-NLS-0$
					case "text/x-csrc": //$NON-NLS-0$
					case "text/x-c": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mC.grammars, "orion.c", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-csharp": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mCS.grammars, "orion.csharp", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-cshtml": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mCSHTML.grammars, "orion.cshtml", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-c++src": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mCpp.grammars, "orion.cpp", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-dockerfile": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mDockerfile.grammars, "orion.dockerfile", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-erlang": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mErlang.grammars, "orion.erlang", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-haml": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mHaml.grammars, "orion.haml", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-lua": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mLua.grammars, "orion.lua", fileContentType.id); //$NON-NLS-0$
						break;
					case "application/xquery": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mXQuery.grammars, "orion.xquery", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-vb": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mVB.grammars, "orion.vb", fileContentType.id); //$NON-NLS-0$
						break;
					case "text/x-vbhtml": //$NON-NLS-0$
						stylerAdapter = new mStyler.createPatternBasedAdapter(mVBHTML.grammars, "orion.vbhtml", fileContentType.id); //$NON-NLS-0$
						break;
				}
			}
			if (stylerAdapter) {
				this.styler = new mStyler.TextStyler(textView, annotationModel, stylerAdapter);
			}
			return new Deferred().resolve();
		},
		getStyler: function() {
			return this.styler;
		}
	};
	
	return {ContentTypes: ContentTypes,
			SyntaxHighlighter: SyntaxHighlighter};
});
