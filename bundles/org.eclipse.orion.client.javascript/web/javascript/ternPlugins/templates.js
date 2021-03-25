/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (https://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (https://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - Allow original requirejs plugin to find files in Orion workspace
 *******************************************************************************/
/* eslint-disable missing-nls */
/*eslint-env node, amd*/
/*globals tern tern */
define([
	"tern/lib/tern",
	"javascript/finder",
	"i18n!javascript/nls/messages"
], function(tern, Finder, Messages) {
	
	var typeofValues = {
		type: "link", //$NON-NLS-1$
		values: [
			"boolean", //$NON-NLS-1$
			"function", //$NON-NLS-1$
			"number", //$NON-NLS-1$
			"object", //$NON-NLS-1$
			"string", //$NON-NLS-1$
			"symbol", //$NON-NLS-1$
			"undefined" //$NON-NLS-1$
		],
		title: Messages['typeofOptions'],
		style: 'emphasis' //$NON-NLS-1$
	};
	
	/**
	 * @description Array of template metadata objects. These get converted into
	 * {orion.editor.Template} objects lazily as they are asked for
	 * @private 
	 */
	var templates = [
		{
			prefix: "async", //$NON-NLS-1$
			name: "async function",  //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "async function ${name}(${param}) {\n"+
   					  "    ${cursor}\n"+
					  "}",
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function", 
			doc: Messages.asyncFunction,
			ecma: 9
		},
		{
			prefix: "async", //$NON-NLS-1$
			name: "async function expression",  //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "var ${name} = async function ${name}(${param}) {\n"+
   					  "    ${cursor}\n"+
					  "};",
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/async_function", 
			doc: Messages.asyncFunctionExpression,
			ecma: 9
		},
		{
			prefix: "await", //$NON-NLS-1$
			name: "await statement",  //$NON-NLS-1$
			nodes: {top:true, assign: true, async:true, member:false, prop:false},
			template: "await ${statement};", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await", 
			doc: Messages.awaitExpression,
			ecma: 9
		},
		{
			prefix: "await", //$NON-NLS-1$
			name: "await return statement",  //$NON-NLS-1$
			nodes: {top:false, async:true, member:false, prop:false},
			template: "return await ${statement};", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await", 
			doc: Messages.awaitExpression,
			ecma: 9
		},
		{
			prefix: "await", //$NON-NLS-1$
			name: "await variable statement",  //$NON-NLS-1$
			nodes: {top:true, async:true, member:false, prop:false},
			template: "var ${variable} = await ${statement};", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await", 
			doc: Messages.awaitExpression,
			ecma: 9
		},
		{
			prefix: "if", //$NON-NLS-1$
			name: "if statement",  //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "if (${condition}) {\n\t${cursor}\n}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Statements/if...else", 
			doc: Messages['ifSimple'],
			ecma: 5
		},
		{
			prefix: "if", //$NON-NLS-1$
			name: "if..else statement", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "if (${condition}) {\n\t${cursor}\n} else {\n\t\n}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Statements/if...else", 
			doc: Messages['ifElseSimple'],
			ecma: 5
		},
		{
			prefix: "for", //$NON-NLS-1$
			name: "for statement", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "for (var ${i} = 0; ${i} < ${array}.length; ${i}++) {\n\t${cursor}\n}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for", 
			doc: Messages['forArray'],
			ecma: 5
		},
		{
			prefix: "for", //$NON-NLS-1$
			name: "for statement (with loop variable)", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "for (var ${i} = 0; ${i} < ${array}.length; ${i}++) {\n\tvar ${value} = ${array}[${i}];\n\t${cursor}\n}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for", 
			doc: Messages['forArrayVar'],
			ecma: 5
		},
		{
			prefix: "for", //$NON-NLS-1$
			name: "for..in statement", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "for (var ${property} in ${object}) {\n\tif (${object}.hasOwnProperty(${property})) {\n\t\t${cursor}\n\t}\n}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in", 
			doc: Messages['forInSimple'],
			ecma: 5
		},
		{
			prefix: "while", //$NON-NLS-1$
			name: "while statement", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "while (${condition}) {\n\t${cursor}\n}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/while", 
			doc: Messages['whileSimple'],
			ecma: 5
		},
		{
			prefix: "do", //$NON-NLS-1$
			name: "do..while statement", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "do {\n\t${cursor}\n} while (${condition});", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/do...while", 
			doc: Messages['doSimple'],
			ecma: 5
		},
		{
		    prefix: "eslint", //$NON-NLS-1$
			name: "eslint", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false, doc:false, jsdoc:false},
			template: "/* eslint ${rule-id}:${0/1}*/", //$NON-NLS-1$
			url: "https://eslint.org/docs/user-guide/configuring.html#configuring-rules", //$NON-NLS-1$
			doc: Messages['eslintRuleEnableDisable'],
			ecma: 5
		},
		{
		    prefix: "eslint-env", //$NON-NLS-1$
			name: "eslint-env", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false, doc:false, jsdoc:false},
			template: "/* eslint-env ${library}*/", //$NON-NLS-1$
			url: "https://eslint.org/docs/user-guide/configuring.html#specifying-environments", //$NON-NLS-1$
			doc: Messages['eslintEnvDirective'],
			ecma: 5
		},
		{
		    prefix: "eslint-enable", //$NON-NLS-1$
			name: "eslint-enable", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false, doc:false, jsdoc:false},
			template: "/* eslint-enable ${rule-id} */", //$NON-NLS-1$
			url: "https://eslint.org/docs/user-guide/configuring.html#configuring-rule", //$NON-NLS-1$
			doc: Messages['eslintRuleEnable'],
			ecma: 5
		},
		{
		    prefix: "eslint-disable", //$NON-NLS-1$
			name: "eslint-disable", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false, doc:false, jsdoc:false},
			template: "/* eslint-disable ${rule-id} */", //$NON-NLS-1$
			url: "https://eslint.org/docs/user-guide/configuring.html#configuring-rules", //$NON-NLS-1$
			doc: Messages['eslintRuleDisable'],
			ecma: 5
		},
		{
			prefix: "switch", //$NON-NLS-1$
			name: "switch statement", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "switch (${expression}) {\n\tcase ${value1}:\n\t\t${cursor}\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/switch", 
			doc: Messages['switchSimple'],
			ecma: 5
		},
		{
			prefix: "case", //$NON-NLS-1$
			name: "case statement", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false, swtch: true},
			template: "case ${value}:\n\t${cursor}\n\tbreak;", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/switch", 
			doc: Messages['caseSimple'],
			ecma: 5
		},
		{
			prefix: "try", //$NON-NLS-1$
			name: "try..catch statement", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "try {\n\t${cursor}\n} catch (${err}) {\n}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch", 
			doc: Messages['tryCatch'],
			ecma: 5
		},
		{
			prefix: "try", //$NON-NLS-1$
			name: "try..catch..finally statement", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "try {\n\t${cursor}\n} catch (${err}) {\n} \n finally {\n}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch", 
			doc: Messages['tryCatchFinally'],
			ecma: 5
		},
		{
			prefix: "typeof", //$NON-NLS-1$
			name: "typeof expression", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "typeof ${object} === \"${type:" + JSON.stringify(typeofValues).replace("}", "\\}") + "}\"", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof", 
			doc: Messages['typeofSimple'],
			ecma: 5
		},
		{
			prefix: "instanceof", //$NON-NLS-1$
			name: "instanceof expresion", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "${object} instanceof ${type}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof", 
			doc: Messages['instanceofSimple'],
			ecma: 5
		},
		{
			prefix: "with", //$NON-NLS-1$
			name: "with statement", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "with (${object}) {\n\t${cursor}\n}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/with", 
			doc: Messages['withSimple'],
			ecma: 5
		},
		{
			prefix: "function", //$NON-NLS-1$
			name: "function declaration", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "/**\n"+  //$NON-NLS-1$
					  " * @param ${parameter}\n"+  //$NON-NLS-1$
					  " */\n"+  //$NON-NLS-1$
					  "function ${name} (${parameter}) {\n\t${cursor}\n}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function", 
			doc: Messages['functionSimple'],
			ecma: 5
		},
		{
			prefix: "function", //$NON-NLS-1$
			name: "function expression (as object property)", //$NON-NLS-1$
			nodes: {top:false, member:false, prop:false, obj:true},
			template: "/**\n"+  //$NON-NLS-1$
					  " * @name ${name}\n"+  //$NON-NLS-1$
					  " * @function\n"+  //$NON-NLS-1$
					  " * @param ${parameter}\n"+  //$NON-NLS-1$
					  " */\n"+  //$NON-NLS-1$
					  "${name}: function(${parameter}) {\n\t${cursor}\n}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/function", 
			doc: Messages['functionProp'],
			ecma: 5
		},
		{
			prefix: "function", //$NON-NLS-0$
			name: "function expression (as property value)", //$NON-NLS-0$
			nodes: {top:false, member:false, prop:true, obj:false},
			template: "function(${parameter}) {\n\t${cursor}\n}", //$NON-NLS-0$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/function", 
			doc: Messages['functionProp'],
			ecma: 5
		},
		{
			prefix: "define", //$NON-NLS-1$
			name: "define function call", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "/* eslint-env amd */\n"+ //$NON-NLS-1$
					  "define('${name}', [\n"+  //$NON-NLS-1$
					  "'${import}'\n"+  //$NON-NLS-1$
					  "], function(${importname}) {\n"+  //$NON-NLS-1$
					  "\t${cursor}\n"+  //$NON-NLS-1$
					  "});", //$NON-NLS-1$
			url: "https://requirejs.org/docs/api.html#deffunc", 
			doc: Messages['defineSimple'],
			ecma: 5
		},
		{
			prefix: "nls", //$NON-NLS-1$
			name: "nls comment", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "${cursor} //$NON-NLS-${0}$", //$NON-NLS-1$
			doc: Messages['nlsSimple'],
			ecma: 5
		},
		{
			prefix: "log", //$NON-NLS-1$
			name: "log function call", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "console.log(${object});", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en/docs/Web/API/Console/log", 
			doc: Messages['logSimple'],
			ecma: 5
		},
		{
		    prefix: "require", //$NON-NLS-1$
			name: "require function call", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false, doc:false, jsdoc:false},
			template: "var lib = require('${cursor}');", //$NON-NLS-1$
			url: "https://nodejs.org/api/modules.html#modules_modules", 
			doc: Messages['requireSimple'],
			ecma: 5
		},
		{
			prefix: "arrow", //$NON-NLS-1$
			name: "arrow expression",  //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "${param} => {${cursor}}", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions", //$NON-NLS-1$
			doc: Messages['arrowFunc'],
			ecma: 6
		},
		{
			prefix: "arrow", //$NON-NLS-1$
			name: "arrow expression with object",  //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "var ${name} = () => ({ ${prop}: ${val}${cursor} });", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions", //$NON-NLS-1$
			doc: Messages['arrowFuncObj'],
			ecma: 6
		},
		{
			prefix: "class", //$NON-NLS-1$
			name: "class definition", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "class ${name} extends ${superClass}; {\n"+
						"\tconstructor() {\n"+
						"\t\t${cursor}\n"+
						"\t}\n"+
						"}\n",
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes", //$NON-NLS-1$
			doc: Messages['classSimple'],
			ecma: 6
		},
		{
			prefix: "class", //$NON-NLS-1$
			name: "class expression", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "var ${name} = class ${className} extends ${superClass}; {\n"+
						"\tconstructor() {\n"+
						"\t\t${cursor}\n"+
						"\t}\n"+
						"}\n",
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/class", //$NON-NLS-1$
			doc: Messages['classExpr'],
			ecma: 6
		},
		{
			prefix: "const", //$NON-NLS-1$
			name: "const expression", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "const ${name} = ${value};", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const", //$NON-NLS-1$
			doc: Messages['constSimple'],
			ecma: 6
		},
		{
			prefix: "export", //$NON-NLS-1$
			name: "export statement", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "export ${value};", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export", //$NON-NLS-1$
			doc: Messages['exportSimple'],
			ecma: 6
		},
		{
			prefix: "export", //$NON-NLS-1$
			name: "export statement (as default)", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "export default ${value};", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export", //$NON-NLS-1$
			doc: Messages['exportDefault'],
			ecma: 6
		},
		{
			prefix: "for", //$NON-NLS-1$
			name: "for..of statement", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "for (${variable} of ${iterable}) {\n"+ //$NON-NLS-1$
  					  "    ${cursor}\n"+ //$NON-NLS-1$
					  "}",
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of", //$NON-NLS-1$
			doc: Messages['forOf'],
			ecma: 6
		},
		{
			prefix: "function*", //$NON-NLS-1$
			name: "function declaration (generator)", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "function* ${name}(${param}) {\n"+ //$NON-NLS-1$
   					  "    ${cursor}\n"+ //$NON-NLS-1$
					  "}",
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*", //$NON-NLS-1$
			doc: Messages['funcGenerator'],
			ecma: 6
		},
		{
			prefix: "import", //$NON-NLS-1$
			name: "import statement (default member)",  //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "import ${member} from \"${module}\";", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import", //$NON-NLS-1$
			doc: Messages['importSimpleDefault'],
			ecma: 6
		},
		{
			prefix: "import", //$NON-NLS-1$
			name: "import statement (all as star)",  //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "import * as ${name} from \"${module}\";", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import", //$NON-NLS-1$
			doc: Messages['importStarAs'],
			ecma: 6
		},
		{
			prefix: "import", //$NON-NLS-1$
			name: "import statement (multiple members)",  //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "import { ${member1} , ${member2} } from \"${module}\";", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import", //$NON-NLS-1$
			doc: Messages['importMultiMember'],
			ecma: 6
		},
		{
			prefix: "import", //$NON-NLS-1$
			name: "import statement (module only)",  //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "import \"${module}\"", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import", //$NON-NLS-1$
			doc: Messages['importSideEffects'],
			ecma: 6
		},
		{
			prefix: "let", //$NON-NLS-1$
			name: "let expression", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "let ${name} = ${value};", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let", //$NON-NLS-1$
			doc: Messages['letSimple'],
			ecma: 6
		},
		{
			prefix: "yield", //$NON-NLS-1$
			name: "yield expression", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "yield ${expression};", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield", //$NON-NLS-1$
			doc: Messages['yieldSimple'],
			ecma: 6
		},
		{
			prefix: "yield", //$NON-NLS-1$
			name: "yield expression with return", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "${value} = yield ${expression};", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield", //$NON-NLS-1$
			doc: Messages['yieldSimpleReturn'],
			ecma: 6
		},
		{
			prefix: "yield*", //$NON-NLS-1$
			name: "yield expression delegate", //$NON-NLS-1$
			nodes: {top:true, member:false, prop:false},
			template: "yield* ${gennerator};", //$NON-NLS-1$
			url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield*", //$NON-NLS-1$
			doc: Messages['yieldDelegate'],
			ecma: 6
		}
	];

	var cachedQuery;
	
	tern.registerPlugin("templates", /* @callback */ function(server, options) {
		return {
     		passes: {
     			/**
     			 * @callback
     			 */
     			completion: function(file, query) {
     				cachedQuery = query;
     			},
		      	/**
		      	 * @callback
		      	 */
		      	variableCompletion: function(file, start, end, gather) {
		      		if(cachedQuery.includeTemplates || cachedQuery.includeTemplates === undefined) {
			      		var kind = Finder.findCompletionKind(file.ast, end);
			      		if(kind && kind.kind) {
				      		var tmpls = Finder.findTemplatesForKind(templates, kind.kind, cachedQuery.ecma ? cachedQuery.ecma : 6);
				      		tmpls.forEach(function(template) {
				      			if(!kind.isasync && template.nodes.async === true) {
				      				return;
				      			}
								gather(template.name, null, 0, function(c) {
									c.template = template.template;
									c.doc = template.doc;
									c.url = template.url;
									c.type = 'template'; //$NON-NLS-1$
									c.ecma = template.ecma;
									c.overwrite = true;
								});
							});
				      	}
			      	}
		      	}
      		}
    	};
	});
});
