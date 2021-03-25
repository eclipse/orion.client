/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 /*eslint-env amd */
define([
	'orion/objects',
	'estraverse/estraverse',
	'i18n!javascript/nls/problems',
	'orion/i18nUtil'
], /* @callback */ function(Objects, Estraverse, Messages, i18nUtil) {

	var astManager;
	
	/**
	 * @name TernProjectValidator
	 * @description description
	 * @param jsonAstManager
	 * @returns {TernProjectValidator} A new validator instance
	 * @since 15.0
	 */
	function TernProjectValidator(jsonAstManager) {
		astManager = jsonAstManager;
	}

	Objects.mixin(TernProjectValidator.prototype, {
		/**
		 * @description Callback to create problems from orion.edit.validator
		 * @function
		 * @public
		 * @param {orion.edit.EditorContext} editorContext The editor context
		 * @param {Object} context The in-editor context (selection, offset, etc)
		 * @returns {orion.Promise} A promise to compute the problems
		 * @callback
		 */
		computeProblems: function(editorContext , context, config) {
			return astManager.getWellFormedAST(editorContext, ".tern-project").then(function(ast) {
				if(ast) {
					var problems  = [],
						astRoot = true;
					//TODO add errors here once there are location infos in error objects
					//see https://github.com/Microsoft/node-jsonc-parser/issues/1
					Estraverse.traverse(ast, {
						enter: function enter(node) {
							if(node.type === 'ObjectExpression') {
								var props = node.properties, 
									seen = Object.create(null);
								props.forEach(function(property) {
									var key = property.key.value;
									if(Object.prototype.hasOwnProperty.call(seen, key)) {
										report(problems, Messages['noDupes'], property.key.range);
									} else {
										seen[key] = 1;
									}
									if(astRoot) {
										//we only want to check the root values
										switch(key) {
											case "ecmaVersion":
											case "dependencyBudget": {
												if(!property.value) {
													report(problems, i18nUtil.formatMessage(Messages['notNum'], key), property.range);
												} else if(typeof property.value.value !== 'number') {
													report(problems, i18nUtil.formatMessage(Messages['notNum'], key), property.value.range);
												}
												break;
											}
											case 'libs':
											case 'dontLoad':
											case 'loadEagerly': {
												var arr = property.value;
												if(!arr) {
													report(problems, i18nUtil.formatMessage(Messages['notArray'], key), property.range);
												} else if(arr.type !== 'ArrayExpression') {
													report(problems, i18nUtil.formatMessage(Messages['notArray'], key), arr.range);
												} else if(arr.elements) {
													if(arr.elements.length < 1 && key !== 'loadEagerly') {
														report(problems, i18nUtil.formatMessage(Messages['notEmpty'], key), arr.range);
													}
													arr.elements.forEach(function(entry) { 
														if(entry.type !== 'Literal' || entry.type === "Literal" && typeof entry.value !== 'string') {
															report(problems, i18nUtil.formatMessage(Messages['onlyStrings'], key), entry.range);
														}
													});
												}
												break;
											}
											case 'plugins': {
												var obj = property.value;
												if(!obj) {
													report(problems, i18nUtil.formatMessage(Messages['notObject'], key), property.range);
												} else if(obj.value === null || obj.type !== 'ObjectExpression') {
													report(problems, i18nUtil.formatMessage(Messages['notObject'], key), obj.range);
												} else if(obj.properties) {
													obj.properties.forEach(function(prop) {
														if(prop.value === null) {
															report(problems, i18nUtil.formatMessage(Messages['pluginNotObject'], prop.key.value), prop.range);
														} else if(!(prop.value.type === 'ObjectExpression' || (prop.value.type === 'Literal' && typeof prop.value.value === 'boolean'))) {
															report(problems, i18nUtil.formatMessage(Messages['pluginNotObject'], prop.key.value), prop.value.range);
														}
													});
												}
												break;
											}
										}
									}
								});
								astRoot = false;
							}
						}
					});
					return problems;
				}
				return null;
			});
		}
	});

	/**
	 * @description Takes the source - a JSON object - and runs some static checks on it
	 * @param {Object} json The JSON object to check
	 * @returns {Array.<String>} The problem array
	 * @since 11.0
	 */
	function validate(json) {
		if(json) {
			var problems = [];
			if(typeof json.ecmaVersion !== 'undefined' && typeof json.ecmaVersion !== 'number') {
				problems.push(i18nUtil.formatMessage(Messages['notNum'], "ecmaVersion")); //$NON-NLS-1$
			} 
			if(typeof json.dependencyBudget !== 'undefined' && typeof json.dependencyBudget !== 'number') {
				problems.push(i18nUtil.formatMessage(Messages['notNum'], "dependencyBudget")); //$NON-NLS-1$
			}
			if(typeof json.dontLoad !== 'undefined') {
				if(!Array.isArray(json.dontLoad)) {
					problems.push(i18nUtil.formatMessage(Messages['notArray'], "dontLoad")); //$NON-NLS-1$
				} else {
					if(json.dontLoad.length < 1) {
						problems.push(i18nUtil.formatMessage(Messages['notEmpty'], "dontLoad")); //$NON-NLS-1$
					} else {
						if(!json.dontLoad.every(function(entry) { return typeof entry === 'string';})) {
							problems.push(i18nUtil.formatMessage(Messages['onlyStrings'], "dontLoad")); //$NON-NLS-1$
						}
					}
				}
			}
			if(typeof json.libs !== 'undefined') {
				if(!Array.isArray(json.libs)) {
					problems.push(i18nUtil.formatMessage(Messages['notArray'], "libs")); //$NON-NLS-1$
				} else {
					if(json.libs.length < 1) {
						problems.push(i18nUtil.formatMessage(Messages['notEmpty'], "libs")); //$NON-NLS-1$
					} else {
						if(!json.libs.every(function(entry) { return typeof entry === 'string';})) {
							problems.push(i18nUtil.formatMessage(Messages['onlyStrings'], "libs")); //$NON-NLS-1$
						}
					}
				}
			}
			if(typeof json.plugins !== 'undefined') {
				if(json.plugins === null || Array.isArray(json.plugins) || typeof json.plugins !== 'object') {
					problems.push(i18nUtil.formatMessage(Messages['notObject'], "plugins")); //$NON-NLS-1$
				}
				var keys = Object.keys(json.plugins);
				for(var i = 0, len = keys.length; i < len; i++) {
					var p = json.plugins[keys[i]];
					if(p === null || !(typeof p === 'object' || typeof p === 'boolean')) {
						problems.push(i18nUtil.formatMessage(Messages['pluginNotObject'], keys[i]));
					}
				}
			}
			if(typeof json.loadEagerly !== 'undefined') {
				if(!Array.isArray(json.loadEagerly)) {
					problems.push(i18nUtil.formatMessage(Messages['notArray'], "loadEagerly")); //$NON-NLS-1$
				} else if(!json.loadEagerly.every(function(entry) { return typeof entry === 'string';})) {
					problems.push(i18nUtil.formatMessage(Messages['onlyStrings'], "loadEagerly")); //$NON-NLS-1$
				}
			}
		}
		return problems;
	}	

	/**
	 * @description Creates a new problem object and adds it to the given problems collector
	 * @private
	 * @param {Array.<Object>} problems The collector for the new problem
	 * @param {String} message The human-readable message for the problem
	 * @param {Array.<Number>} range The start / end range array
	 * @param {String} id The internal id for the problem
	 * @param {String} severity The severity of the problem
	 * @returns returns
	 */
	function report(problems, message, range, id, severity) {
		var pb = Object.create(null);
		pb.start = range[0];
		pb.end = range[1];
		pb.id = typeof id === 'string' && id.length > 0 ? id : 'tern-project-pb'; //$NON-NLS-1$
		pb.description = message;
		pb.severity = typeof severity === 'string' && severity.length > 0 ? severity : 'error'; //$NON-NLS-1$
		problems.push(pb);
	}

	return {
		validate: validate,
		TernProjectValidator: TernProjectValidator
	};
});
