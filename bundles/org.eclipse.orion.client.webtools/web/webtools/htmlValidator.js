/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd*/
define("webtools/htmlValidator", [
	'orion/objects',
	'htmlparser2/visitor',
	'webtools/htmlValidatorRules',
], function(Objects, Visitor, Rules) {

	/**
	 * @description Creates a new validator
	 * @constructor
	 * @public
	 * @param {Object} cssResultManager The back result manager
	 * @since 6.0
	 */
	function HtmlValidator(htmlAstManager) {
		this.htmlAstManager = htmlAstManager;
	}

	var options = {
		'attr-bans': 0,
		'attr-bans-config': [
			'align', //$NON-NLS-1$
			'background', //$NON-NLS-1$
			'bgcolor', //$NON-NLS-1$
			'border', //$NON-NLS-1$
			'frameborder', //$NON-NLS-1$
			'longdesc', //$NON-NLS-1$
			'marginwidth', //$NON-NLS-1$
			'marginheight', //$NON-NLS-1$
			'scrolling', //$NON-NLS-1$
			'style', //$NON-NLS-1$
			'width' //$NON-NLS-1$
		],
		'attr-no-dup': 3,
		'fig-req-figcaption': 3,
		'img-req-alt': 3,
		'tag-close': 3
	};

	Objects.mixin(HtmlValidator.prototype, /** @lends webtools.CssValidator.prototype*/ {

		/**
		 * @description Callback to create problems from orion.edit.validator
		 * @function
		 * @public
		 * @param {orion.edit.EditorContext} editorContext The editor context
		 * @param {Object} context The in-editor context (selection, offset, etc)
		 * @returns {orion.Promise} A promise to compute some problems
		 * @callback
		 */
		computeProblems: function(editorContext, context) {
			var that = this;
			return that.htmlAstManager.getAST(editorContext).then(function(ast) {
				return that._computeProblems(ast, context);
			});
		},

		/**
		 * @description Create the problems
		 * @function
		 * @private
		 * @param {String} contents The file contents
		 * @returns {Array} The problem array
		 * @callback
		 */
		_computeProblems: function(ast, context) {
			if (!ast) {
				return null;
			}

			var problems = [];

			function addProblems(newProblems) {
				if (newProblems) {
					if (Array.isArray(newProblems)) {
						problems = problems.concat(newProblems);
					} else {
						problems.push(newProblems);
					}
				}
			}
			var ruleMap = Rules.ruleMap(options);
			var dom = ast;
			if (!Array.isArray(ast) && ast.children) {
				dom = ast.children;
			}
			if (Array.isArray(ast.errors) && ast.errors.length > 0) {
				ast.errors.forEach(function(error) {
					if (error.error) {
						var e = error.error;
						problems.push({
							id: "htmlParseFailure",
							description: e.message,
							start: error.range[0],
							end: error.range[1],
							severity: 'error' //$NON-NLS-1$
						});
					}

				});
			}
			Visitor.visit(dom, {
				visitNode: function(node) {
					if (node.type === 'tag') {
						var rules = ruleMap['tag'];
						if (rules) {
							for (var i = 0; i < rules.length; i++) {
								addProblems(rules[i](node));
							}
						}
						if (node.name) {
							rules = ruleMap[node.name.toLowerCase()];
							if (rules) {
								for (i = 0; i < rules.length; i++) {
									addProblems(rules[i](node));
								}
							}
						}
					}
				},
				/**
				 * @callback
				 */
				endVisitNode: function(node) {

				}
			});
			return {
				problems: problems
			};
		},

		/**
		 * @description Callback from orion.cm.managedservice
		 * @function
		 * @public
		 * @param {Object} properties The properties that have been changed
		 */
		updated: function updated(properties) {
			if (!properties) {
				return;
			}

			function setOption(rule, value) {
				if (typeof value === 'number' && value >= 0 && value < 4) {
					options[rule] = value;
				}
			}
			setOption('attr-bans', properties.validate_attr_bans); //$NON-NLS-1$
			setOption('attr-no-dup', properties.validate_attr_no_dup); //$NON-NLS-1$
			setOption('fig-req-figcaption', properties.validate_fig_req_figcaption); //$NON-NLS-1$
			setOption('img-req-alt', properties.validate_img_req_alt); //$NON-NLS-1$
			setOption('tag-close', properties.validate_tag_close); //$NON-NLS-1$
		}
	});

	return HtmlValidator;
});
