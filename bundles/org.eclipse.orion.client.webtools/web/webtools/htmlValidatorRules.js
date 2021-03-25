/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd, worker */
/**
 * Implements eslint's load-rules API for AMD. Our rules are loaded as AMD modules.
 */
define([
	'webtools/tags',
	"i18n!webtools/nls/problems",
	"orion/i18nUtil"
], function(Tags, Messages, i18nUtil) {

	function ruleMap(opts) {
		var rules = {};

		function addRule(type, rule) {
			if (!rules[type]) {
				rules[type] = [rule];
			} else {
				rules[type].push(rule);
			}
		}
		// Banned attributes
		addRule('tag', function(element) { //$NON-NLS-1$
			if (!opts['attr-bans']) {
				return [];
			}

			var bannedAttrs = opts['attr-bans-config'];
			if (!bannedAttrs || !element.attributes) {
				return [];
			}

			var issues = [];

			var attrs = element.attributes;
			bannedAttrs.forEach(function(name) {
				if (attrs[name]) {
					issues.push(createProblem(attrs[name], 'attr-bans', i18nUtil.formatMessage(Messages['attr-bans'], name), opts['attr-bans'])); //$NON-NLS-1$
				}
			});
			return issues;
		});
		// Tag closed
		addRule('tag', function(element) { //$NON-NLS-1$
			if (!opts['tag-close']) {
				return [];
			}
			
			// Check whether the tag is considered optional in html5 spec https://www.w3.org/TR/html5/syntax.html#optional-tags
			// Tag following another tag is handled in the htmlparser2 code (see parser.js)
			function isOptionalClose(elementToCheck){
				var	closeOnNoContent = ["p", "li", "dd", "rb", "rt", "rtc", "rp", "optgroup", "option", "tbody", "tfoot"];
				if (closeOnNoContent.indexOf(elementToCheck.name) >= 0){
					var parent = elementToCheck.parent;
					if (!parent || !parent.children || parent.children.length === 0){
						return false;
					}
					if (parent.children[parent.children.length-1].range.start !== elementToCheck.range.start){
						return false;
					}
					if (elementToCheck.children && elementToCheck.children.length > 0){
						return false;
					}
					if (elementToCheck.name === "p" && parent.name === "a"){
						// p elements inside of a elements must have end tag
						return false;
					}
					return true;
				}
				switch (elementToCheck.name) {
					case "html": // If no comment
					case "body": // If no comment
					case "head": // If no whitespace or comment
					case "colgroup": // If no whitespace or comment
						// TODO We don't have source here so can't check for whitespace
						return !elementToCheck.children || elementToCheck.children.length === 0 || elementToCheck.children[0].type !== "comment";
				}
				return false;
			}

			if (element.name && element.openrange) {
				if (!element.endrange || (element.endrange[0] === element.openrange[1] && element.endrange[1] === element.openrange[1])) {
					if (!element.selfClosing){
						if (Tags.voidElements.indexOf(element.name) < 0) {
							if (!isOptionalClose(element)){
								return createProblem(element.openrange, 'tag-close', i18nUtil.formatMessage(Messages['tag-close'], element.name), opts['tag-close']); //$NON-NLS-1$
							}
						}
					}
				}
			}
		});
		// No duplicate attributes
		addRule('tag', function(element) { //$NON-NLS-1$
			if (!opts['attr-no-dup']) {
				return [];
			}

			var issues = [];
			if(Array.isArray(element.attributes)) {
				var seen = Object.create(null);
				element.attributes.forEach(function(attrib) {
					if(seen[attrib.name]) {
						issues.push(createProblem(attrib, 'attr-no-dup', i18nUtil.formatMessage(Messages['attr-no-dup'], attrib.name), opts['attr-no-dup']));
					}
					seen[attrib.name] = true;
				});
			}
			return issues;
		});
		// Require img alt
		addRule('img', function(element) { //$NON-NLS-1$
			if (!opts['img-req-alt']) {
				return [];
			}
			
			if(Array.isArray(element.attributes) && element.attributes.some(function(attrib) {
				return attrib.name === 'alt' && typeof attrib.value === 'string';
			})) {
				return [];
			}
			return createProblem(element.openrange, 'img-req-alt', Messages['img-req-alt'], opts['img-req-alt']); //$NON-NLS-1$
		});
		// Require figcaption
		function figReqFigCaption(ele) {
			if (!opts['fig-req-figcaption']) {
				return [];
			}

			if (ele.name === 'figure') {
				// get the children of this figure
				var children = ele.children;

				// check for a figcaption element
				for (var i = 0; i < children.length; i++) {
					if (children[i].name === 'figcaption') {
						return [];
					}
				}
			} else if (ele.name === 'figcaption') {
				if (ele.parent && ele.parent.name === 'figure') {
					return [];
				}
			}
			return createProblem(ele.openrange, 'fig-req-figcaption', Messages['fig-req-figcaption'], opts['fig-req-figcaption']); //$NON-NLS-1$

		}
		addRule('figure', figReqFigCaption); //$NON-NLS-1$
		addRule('figcaption', figReqFigCaption); //$NON-NLS-1$

		return rules;
	}

	function createProblem(nodeOrRange, id, message, severity) {
		var start, end = 0;
		if (Array.isArray(nodeOrRange)) {
			start = nodeOrRange[0];
			end = nodeOrRange[1];
		} else if (nodeOrRange.range) {
			start = nodeOrRange.range[0];
			end = nodeOrRange.range[1];
		}
		var stringSeverity = severity;
		if (typeof severity === 'number') {
			if(severity === 1) {
				stringSeverity = "error";
			} else if(severity === 2) {
				stringSeverity = "warning";
			} else {
				stringSeverity = "info";
			}
		}
		return {
			id: id,
			description: message,
			start: start,
			end: end,
			severity: stringSeverity ? stringSeverity : 'info' //$NON-NLS-1$
		};
	}

	return {
		ruleMap: ruleMap
	};
});
