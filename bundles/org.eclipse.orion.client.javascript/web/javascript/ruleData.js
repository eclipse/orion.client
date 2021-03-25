/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (https://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (https://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/* eslint-env amd */
/* eslint-disable missing-nls */
define([
	"i18n!javascript/nls/problems"
], function(Messages) {

	var rules = {
		defaults: {
			"accessor-pairs" : 3,
			"check-tern-plugin" : 3,
			"curly" : 0,
			"eqeqeq": 3,
			"missing-doc" : 0,
			"missing-nls" : 0,
			"missing-requirejs": 3,
			"new-parens" : 1,
			"no-caller": 1,
			"no-comma-dangle" : 0,
			"no-cond-assign" : 1,
			"no-console" : 0,
			"no-const-assign" : 1,
			"no-constant-condition" : 1,
			"no-control-regex" : 1,
			"no-debugger" : 3,
			"no-dupe-keys" : 1,
			"no-duplicate-case": 1,
			"no-else-return" : 3,
			"no-empty-block" : 0,
			"no-empty-character-class" : 1,
			"no-empty-label" : 1,
			"no-eq-null" : 1,
			"no-eval" : 0,
			"no-extend-native": [1, {"exceptions" : ""}],
			"no-extra-bind" : 3,
			"no-extra-boolean-cast" : 1,
			"no-extra-parens" : [3, "all", {"conditionalAssign": false, "returnAssign": false, "nestedBinaryExpressions": false}],
			"no-extra-semi": 3,
			"no-fallthrough" : 1,
			"no-implicit-coercion" : [3, { "boolean": true, "number" : true, "string" : true }],
			"no-implied-eval" : 0,
			"no-invalid-regexp": [1, {"allowConstructorFlags" : ""}],
			"no-invalid-this" : 3,
			"no-irregular-whitespace" : [0, {"skipComments": false, "skipRegExps": false, "skipTemplates": false}],
			"no-iterator": 1,
			"no-jslint" : 3,
			"no-lone-blocks" : 0,
			"no-mixed-spaces-and-tabs" : 0,
			"no-native-reassign" : [1, {"exceptions" : ""}],
			"no-negated-in-lhs" : 1,
			"no-new-array": 3,
			"no-new-func" : 3,
			"no-new-object" : 3,
			"no-new-wrappers" : 3,
			"no-obj-calls" : 1,
			"no-param-reassign" : [3, {props: false}],
			"no-proto" : 1,
			"no-redeclare" : 3,
			"no-regex-spaces" : 1,
			"no-reserved-keys" : 0,
			"no-self-assign" : 1,
			"no-self-compare" : 1,
			"no-shadow" : 3,
			"no-shadow-global" : 0,
			"no-sparse-arrays" : 3,
			"no-throw-literal" : 3,
			"no-trailing-spaces" : [0, { "skipBlankLines": true }],
			"no-undef" : 1,
			"no-undef-expression": 3,
			"no-undef-init" : 3,
			"no-unreachable" : 3,
			"no-unused-expressions" : [0, {allowShortCircuit: false, allowTernary: false}],
			"no-unused-params" : 3,
			"no-unused-vars" : 3,
			"no-use-before-define" : 3,
			"no-void" : 0,
			"no-with" : 3,
			"quotes" : [0, "double", {avoidEscape: false, allowTemplateLiterals: false}],
			"radix" : 3,
			"semi" : [3, "always", {omitLastInOneLineBlock: false}],
			"type-checked-consistent-return" : 0,
			"unknown-require": 3,
			"unnecessary-nls" : 0,
			"use-isnan" : 1,
			"valid-typeof" : 1,
			"yoda" : [0, "never", {exceptRange: false, onlyEquality: false}]
		},

		metadata: {
			"accessor-pairs" : {
				description: Messages['accessor-pairs-description'],
				url: 'https://eslint.org/docs/rules/accessor-pairs'
			},
			"check-tern-plugin" : {
				description: Messages['check-tern-plugin-description']
			},
			"curly" : {
				description: Messages['curly-description'],
				url: 'https://eslint.org/docs/rules/curly'
			},
			"eqeqeq": {
				description: Messages['eqeqeq-description'],
				url: "https://eslint.org/docs/rules/eqeqeq"
			},
			"missing-doc" : {
				description: Messages['missing-doc-description'],
				url: 'https://eslint.org/docs/rules/valid-jsdoc'
			},
			"missing-nls" : {
				description: Messages['missing-nls-description']
			},
			"missing-requirejs" : {
				description: Messages['missing-requirejs-description']
			},
			"new-parens" : {
				description: Messages['new-parens-description'],
				url: 'https://eslint.org/docs/rules/new-parens'
			},
			"no-caller": {
				description: Messages['no-caller-description'],
				url: 'https://eslint.org/docs/rules/no-caller'
			},
			"no-comma-dangle" : {
				description: Messages['no-comma-dangle-description'],
				url: 'https://eslint.org/docs/rules/no-comma-dangle'
			},
			"no-cond-assign" : {
				description: Messages['no-cond-assign-description'],
				url: 'https://eslint.org/docs/rules/no-cond-assign'
			},
			"no-console" : {
				description: Messages['no-console-description'],
				url: 'https://eslint.org/docs/rules/no-console'
			},
			"no-constant-condition" : {
				description: Messages['no-constant-condition-description'],
				url: 'https://eslint.org/docs/rules/no-constant-condition'
			},
			"no-const-assign" : {
				description: Messages['no-const-assign-description'],
				url: 'https://eslint.org/docs/rules/no-const-assign'
			},
			"no-control-regex" : {
				description: Messages['no-control-regex-description'],
				url: 'https://eslint.org/docs/rules/no-control-regex'
			},
			"no-debugger" : {
				description: Messages['no-debugger-description'],
				url: 'https://eslint.org/docs/rules/no-debugger'
			},
			"no-dupe-keys" : {
				description: Messages['no-dupe-keys-description'],
				url: 'https://eslint.org/docs/rules/no-dupe-keys'
			},
			"no-duplicate-case": {
				description: Messages['no-duplicate-case-description'],
				url: 'https://eslint.org/docs/rules/no-duplicate-case'
			},
			"no-else-return" : {
				description: Messages['no-else-return-description'],
				url: 'https://eslint.org/docs/rules/no-else-return'
			},
			"no-empty-block" : {
				description: Messages['no-empty-block-description'],
				url: 'https://eslint.org/docs/rules/no-empty'
			},
			"no-empty-character-class" : {
				description: Messages['no-empty-character-class-description'],
				url: 'https://eslint.org/docs/rules/no-empty-character-class'
			},
			"no-empty-label" : {
				description: Messages['no-empty-label-description'],
				url: 'https://eslint.org/docs/rules/no-empty-label'
			},
			"no-eq-null" : {
				description: Messages['no-eq-null-description'],
				url: 'https://eslint.org/docs/rules/no-eq-null'
			},
			"no-eval" : {
				description: Messages['no-eval-description'],
				url: 'https://eslint.org/docs/rules/no-eval'
			},
			"no-extend-native" : {
				description: Messages['no-extend-native-description'],
				url: 'https://eslint.org/docs/rules/no-extend-native'
			},
			"no-extra-bind" : {
				description: Messages['no-extra-bind-description'],
				url: 'https://eslint.org/docs/rules/no-extra-bind'
			},
			"no-extra-boolean-cast" : {
				description: Messages['no-extra-boolean-cast-description'],
				url: 'https://eslint.org/docs/rules/no-extra-boolean-cast'
			},
			"no-extra-parens" : {
				description: Messages['no-extra-parens-description'],
				url: 'https://eslint.org/docs/rules/no-extra-parens'
			},
			"no-extra-semi": {
				description: Messages['no-extra-semi-description'],
				url: 'https://eslint.org/docs/rules/no-extra-semi'
			},
			"no-fallthrough" : {
				description: Messages['no-fallthrough-description'],
				url: 'https://eslint.org/docs/rules/no-fallthrough'
			},
			"no-implicit-coercion" : {
				description: Messages['no-implicit-coercion-description'],
				url: 'https://eslint.org/docs/rules/no-implicit-coercion'
			},
			"no-implied-eval" : {
				description: Messages['no-implied-eval-description'],
				url: 'https://eslint.org/docs/rules/no-implied-eval'
			},
			"no-invalid-regexp": {
				description: Messages['no-invalid-regexp-description'],
				url: 'https://eslint.org/docs/rules/no-invalid-regexp'
			},
			"no-invalid-this": {
				description: Messages['no-invalid-this-description'],
				url: 'https://eslint.org/docs/rules/no-invalid-this'
			},
			"no-irregular-whitespace" : {
				description: Messages['no-irregular-whitespace-description'],
				url: 'https://eslint.org/docs/rules/no-irregular-whitespace'
			},
			"no-iterator": {
				description: Messages['no-iterator-description'],
				url: 'https://eslint.org/docs/rules/no-iterator'
			},
			"no-jslint" : {
				description: Messages['no-jslint-description']
			},
			"no-native-reassign" : {
				description: Messages['no-native-reassign-description'],
				url: 'https://eslint.org/docs/rules/no-native-reassign'
			},
			"no-lone-blocks" : {
				description: Messages['no-lone-blocks-description'],
				url: 'https://eslint.org/docs/rules/no-lone-blocks'
			},
			"no-mixed-spaces-and-tabs" : {
				description: Messages['no-mixed-spaces-and-tabs-description'],
				url: 'https://eslint.org/docs/rules/no-mixed-spaces-and-tabs'
			},
			"no-negated-in-lhs" : {
				description: Messages['no-negated-in-lhs-description'],
				url: 'https://eslint.org/docs/rules/no-negated-in-lhs'
			},
			"no-new-array": {
				description: Messages['no-new-array-description'],
				url: 'https://eslint.org/docs/rules/no-array-constructor'
			},
			"no-new-func" : {
				description: Messages['no-new-func-description'],
				url: 'https://eslint.org/docs/rules/no-new-func'
			},
			"no-new-object" : {
				description: Messages['no-new-object-description'],
				url: 'https://eslint.org/docs/rules/no-new-object'
			},
			"no-new-wrappers" : {
				description: Messages['no-new-wrappers-description'],
				url: 'https://eslint.org/docs/rules/no-new-wrappers'
			},
			"no-obj-calls" : {
				description: Messages['no-obj-calls-description'],
				url: 'https://eslint.org/docs/rules/no-obj-calls'
			},
			"no-param-reassign" : {
				description: Messages['no-param-reassign-description'],
				url: 'https://eslint.org/docs/rules/no-param-reassign'
			},
			"no-proto" : {
				description: Messages['no-proto-description'],
				url: 'https://eslint.org/docs/rules/no-proto'
			},
			"no-redeclare" : {
				description: Messages['no-redeclare-description'],
				url: 'https://eslint.org/docs/rules/no-redeclare'
			},
			"no-regex-spaces" : {
				description: Messages['no-regex-spaces-description'],
				url: 'https://eslint.org/docs/rules/no-regex-spaces'
			},
			"no-reserved-keys" : {
				description: Messages['no-reserved-keys-description'],
				url: 'https://eslint.org/docs/rules/no-reserved-keys'
			},
			"no-self-compare" : {
				description: Messages['no-self-compare-description'],
				url: 'https://eslint.org/docs/rules/no-self-compare'
			},
			"no-self-assign" : {
				description: Messages['no-self-assign-description'],
				url: 'https://eslint.org/docs/rules/no-self-assign'
			},
			"no-shadow" : {
				description: Messages['no-shadow-description'],
				url: 'https://eslint.org/docs/rules/no-shadow'
			},
			"no-shadow-global" : {
				description: Messages['no-shadow-global-description']
			},
			"no-sparse-arrays" : {
				description: Messages['no-sparse-arrays-description'],
				url: 'https://eslint.org/docs/rules/no-sparse-arrays'
			},
			"no-throw-literal" : {
				description: Messages['no-throw-literal-description'],
				url: 'https://eslint.org/docs/rules/no-throw-literal'
			},
			"no-trailing-spaces" : {
				description: Messages['no-trailing-spaces-description'],
				url: 'https://eslint.org/docs/rules/no-trailing-spaces'
			},
			"no-undef" : {
				description: Messages['no-undef-description'],
				url: 'https://eslint.org/docs/rules/no-undef'
			},
			"no-undef-expression" : {
				description: Messages['no-undef-expression-description']
			},
			"no-undef-init" : {
				description: Messages['no-undef-init-description'],
				url: 'https://eslint.org/docs/rules/no-undef-init'
			},
			"no-unreachable" : {
				description: Messages['no-unreachable-description'],
				url: 'https://eslint.org/docs/rules/no-unreachable'
			},
			"no-unused-expressions" : {
				description: Messages['no-unused-expressions-description'],
				url: 'https://eslint.org/docs/rules/no-unused-expressions'
			},
			"no-unused-params" : {
				description: Messages['no-unused-params-description']
			},
			"no-unused-vars" : {
				description: Messages['no-unused-vars-description'],
				url: 'https://eslint.org/docs/rules/no-unused-vars'
			},
			"no-use-before-define" : {
				description: Messages['no-use-before-define-description'],
				url: 'https://eslint.org/docs/rules/no-use-before-define'
			},
			"no-void" : {
				description: Messages['no-void-description'],
				url: 'https://eslint.org/docs/rules/no-void'
			},
			"no-with" : {
				description: Messages['no-with-description'],
				url: 'https://eslint.org/docs/rules/no-with'
			},
			"quotes" : {
				description: Messages['quotes-description'],
				url: 'https://eslint.org/docs/rules/quotes'
			},
			"radix" : {
				description: Messages['radix-description'],
				url: 'https://eslint.org/docs/rules/radix'
			},
			"semi" : {
				description: Messages['semi-description'],
				url: 'https://eslint.org/docs/rules/semi'
			},
			"unknown-require" : {
				description: Messages['unknown-require-description']
			},
			"unnecessary-nls" : {
				description: Messages['unnecessary-nls-description']
			},
			"use-isnan" : {
				description: Messages['use-isnan-description'],
				url: 'https://eslint.org/docs/rules/use-isnan'
			},
			"valid-typeof" : {
				description: Messages['valid-typeof-description'],
				url: 'https://eslint.org/docs/rules/valid-typeof'
			},
			"type-checked-consistent-return" : {
				description: Messages['type-checked-consistent-return-description']
			},
			"yoda" : {
				description: Messages['yoda-description'],
				url: 'https://eslint.org/docs/rules/yoda'
			}
		}
	};
	return Object.freeze(rules);
});
