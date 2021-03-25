/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['embeddedEditor/builder/embeddedEditor',
		'orion/Deferred'
],
function(mEmbeddedEditor,
Deferred) {
	var defaultPluginURLs = [
		"../../javascript/plugins/javascriptPlugin_embed_dev.html",
		"../../webtools/plugins/webToolsPlugin_embed_dev.html",
		"../../plugins/languages/json/jsonPlugin.html",
		"../../plugins/embeddedToolingPlugin.html"
	];
		var contents = 'import "somelib";//Hover on the error marker on "import" and click on the quick fix. The .tern-project file will be updated with new contents.\n' +
							 '//In the .tern-project file, select all text and press CTRL+X. The error marker on "import" comes back.\n' +
							 '//In the .tern-project file, press CTRL+V. The error marker on "import" goes away.\n' +
							 'var foo = "bar";\n' +
							 "var bar = foo;\n" + 
							 "/*\n" + 
							 " * test demo\n" + 
							 "*/\n" + 
							 "function test(){\n" + 
							 '	var foo1 = bar.lastIndexOf(char, from);;;;//change line 28 in .eslintrc file to "no-extra-semi": 2. The warning on on ";;;" becomes error.\n' + 
							 '//change line 28 in .eslintrc file to "no-extra-semi": 0. The error on ";;;" goes away.\n' +
							 "}\n" + 
							"//Keep editing in this demo and try the content assist, problem validations and hover service!\n" +
							 "var foo2 = foo."; 
	var codeEdit = new mEmbeddedEditor({
		_defaultPlugins: defaultPluginURLs,
		editorConfig: {showWhitespaces: false, zoomRuler: true}
	});
	var ruleData = {
		"rules": {
			"accessor-pairs" : 1,
			"check-tern-plugin" : 1,
			"curly" : 0,
			"eqeqeq": 1,
			"missing-doc" : 0, 
			"missing-nls" : 0,
			'missing-requirejs': 1,
			"new-parens" : 1,
			"no-caller": 1,
			"no-comma-dangle" : 0, 
			"no-cond-assign" : 2,
			"no-console" : 0, 
			"no-constant-condition" : 2,
			"no-control-regex" : 2,
			"no-debugger" : 1,
			"no-dupe-keys" : 2,
			"no-duplicate-case": 2,
			"no-else-return" : 1,
			"no-empty-block" : 0,
			"no-empty-character-class" : 2,
			"no-empty-label" : 2,
			"no-eq-null" : 1,
			"no-eval" : 0,
			"no-extra-boolean-cast" : 2,
			"no-extra-parens" : 1,
			"no-extra-semi": 1,
			"no-fallthrough" : 2, 
			"no-implied-eval" : 0,
			"no-invalid-regexp": 2,
			"no-irregular-whitespace" : 0,
			"no-iterator": 2, 
			"no-jslint" : 1, 
			"no-mixed-spaces-and-tabs" : 0,
			"no-negated-in-lhs" : 2,
			"no-new-array": 1,
			"no-new-func" : 1,
			"no-new-object" : 1,
			"no-new-wrappers" : 1,
			"no-obj-calls" : 2,
			"no-proto" : 2, 
			"no-redeclare" : 1,
			"no-regex-spaces" : 2,
			"no-reserved-keys" : 2,
			"no-self-compare" : 2,
			"no-self-assign" : 2,
			"no-shadow" : 1,
			"no-shadow-global" : 1,
			"no-sparse-arrays" : 1, 
			"no-throw-literal" : 1,
			"no-undef" : 2,
			"no-undef-expression": 1,
			"no-undef-init" : 1,
			"no-unreachable" : 1, 
			"no-unused-params" : 1,
			"no-unused-vars" : 1,
			"no-use-before-define" : 1,
			"no-with" : 1,
			"radix" : 1,
			"semi" : 1,
			"type-checked-consistent-return" : 0,
			"unnecessary-nls" : 0,
			"unknown-require": 1,
			"use-isnan" : 2,
			"valid-typeof" : 2
		}
	};
	var files2import = [
		{
			name: ".tern-project",
			contents:'{"sourceType": "module","ecmaVersion": 6,"loadEagerly": ["global.js"]}'
		},
		{
			name: ".eslintrc",
			contents:''
		},
		{
			name: "global.js",
			contents:'var tw = {};'
		}
	];
	var files2export = [
		{
			name: ".tern-project"
		},
		{
			name: ".eslintrc"
		}
	];
	
	var startup = function() {
		codeEdit.create({parent: "embeddedEditor"}).then(function(editorViewer) {
			editorViewer.setContents(contents, "application/javascript");
			var fileClient = codeEdit.serviceRegistry.getService("orion.core.file.client");
			if (fileClient) {
				//Listen to the .tern-project file changes.
				fileClient.addEventListener("Changed", function(evt) { //$NON-NLS-0$
					if(evt && evt.modified) {
						if(evt.modified.some(function(loc){
							return "/in_memory_fs/project/.tern-project" === loc || "/in_memory_fs/project/.eslintrc" === loc;
							})) {
								editorViewer.refreshSyntaxCheck();
							}
					}
				});
			}
		});
		codeEdit.create({parent: "embeddedEditor1"}).then(function(editorViewer) {
			editorViewer.inputManager.setInput("/in_memory_fs/project/.tern-project");
		});	
		codeEdit.create({parent: "embeddedEditor2"}).then(function(editorViewer) {
			editorViewer.inputManager.setInput("/in_memory_fs/project/.eslintrc");
		});	
	};
	codeEdit.startup().then(function() {
		document.getElementById("progressMessageDiv").textContent = "Plugins loaded!";
		files2import[1].contents = JSON.stringify(ruleData, undefined, 4);
		//files2import = [];
		codeEdit.importFiles(files2import).then(function(/*results*/) {
			startup();
			codeEdit.exportFiles(files2export).then(function(exportResults) {
				console.log(exportResults);				
			});
		});
	});
});
