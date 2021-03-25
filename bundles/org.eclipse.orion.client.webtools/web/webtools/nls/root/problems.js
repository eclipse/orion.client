/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 ******************************************************************************/
/* eslint-env amd */
define({
	//CSS lint messages
	"adjoining-classes" : "Adjoining classes: ${0}.",
	"box-model-height" : "Using height with ${0} can make elements larger than you expect.",
	"box-model-width" : "Using width with ${0} can make elements larger than you expect.",
	"box-sizing" : "The box-sizing property isn't supported in IE6 and IE7.",
	"bulletproof-font-face" : "@font-face declaration doesn't follow the fontspring bulletproof syntax.",
	"compatible-vendor-prefixes" : "The property ${0} supports the vendor specific properties ${1}. They should be included as well.",
	"display-property-grouping" : "${0} can't be used with display: ${1}.",
	"duplicate-background-images" : "Background image '${0}' was used multiple times, first declared at line ${1}, col ${2}.",
	"duplicate-properties" : "Duplicate property '${0}' found.",
	"empty-rules" : "Rule is empty.",
	"fallback-colors" : "Fallback ${0} (hex or RGB) should precede ${1} ${2}.",
	"floats" : "Too many floats (${0}), you're probably using them for layout. Consider using a grid system instead.",
	"font-faces" : "Too many @font-face declarations (${0}). Potential performance problem.",
	"font-sizes" : "Too many font-size declarations (${0}). It is recommended to abstract font-sizes into separate CSS classes.",
	"gradients" : "Missing vendor-prefixed CSS gradients for ${0}.",
	"ids" : "Don't use IDs in selectors.",
	"ids-really" : "${0} IDs in the selector, really?",
	"import" : "@import prevents parallel downloads, use <link> instead.",
	"important" : "Using !important leads to specificity issues.",
	"important-count": "Too many !important declarations (${0}), try to use less than 10 to avoid specificity issues.",
	"order-alphabetical": "Rule does not have all its properties in alphabetical order.",
	//"known-properties" : this value is parser generated and not NLS-able
	"outline-none" : "Outlines shouldn't be hidden unless other visual changes are made.",
	"outline-none-focus" : "Outlines should only be modified using :focus.",
	"overqualified-elements" : "Element (${0}) is overqualified, just use ${1} without element name.",
	"qualified-headings" : "Heading (${0}) should not be qualified.",
	"regex-selectors" : "Attribute selectors with ${0} are slow!",
	//"rules-count": this rule only counts rules and does not display a message to the end user
	"selector-max-approaching" : "You have ${0} selectors. Internet Explorer supports a maximum of 4095 selectors per stylesheet. Consider refactoring.",
	"selector-max" : "You have ${0} selectors. Internet Explorer supports a maximum of 4095 selectors per stylesheet. Consider refactoring.",
	"selector-newline": "Newline character found in selector (forgot a comma?).",
	"shorthand" : "The properties ${0} can be replaced by shorthand ${1}.",
	"star-property-hack" : "Property with star prefix found.",
	"text-indent" : "Negative text-indent doesn't work well with RTL. If you use text-indent for image replacement explicitly set direction for that item to ltr.",
	"underscore-property-hack" : "Property with underscore prefix found.",
	"unique-headings" : "Heading (${0}) has already been defined.",
	"unique-headings-count": "You have ${0} defined in this stylesheet.",
	"universal-selector" : "The universal selector (*) is known to be slow.",
	"unqualified-attributes" : "Unqualified attribute selectors are known to be slow.",
	"vendor-prefix" : "Standard property '${0}' should come after vendor-prefixed property '${1}'.",
	"vendor-prefix-standard": "Missing standard property '${0}' to go along with '${1}'.",
	"zero-units" : "Values of 0 shouldn't have units specified.",
	"fatal-error": "Fatal error, cannot continue: ${0}",
	
	// HTML lint messages
	'attr-bans': 'The \'${0}\' attribute is not recommended.',
	'attr-no-dup': 'The \'${0}\' attribute is duplicated.',
	'tag-close': 'No matching closing tag for \'${0}\'.',
	'img-req-alt': 'The \'alt\' property must be set for image tags (for accessibility).',
	'fig-req-figcaption': '\'figure\' must have a \'figcaption\', \'figcaption\' must be in a \'figure\' (for accessibility).',
});
