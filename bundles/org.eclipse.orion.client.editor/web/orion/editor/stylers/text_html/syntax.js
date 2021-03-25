/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define("orion/editor/stylers/text_html/syntax", ["orion/editor/stylers/application_javascript/syntax", "orion/editor/stylers/text_css/syntax", "orion/editor/stylers/application_xml/syntax"],
	/* eslint-disable missing-nls */
	function(mJS, mCSS, mXML) {
	var attributes = [
		"accept-charset", "accept", "accesskey", "action", "align", "alt",  
		"async", "autocomplete", "autoplay", "autosave",
		"bgcolor", "border", "buffered", 
		"challenge", "charset", "checked", "cite", "class", "codebase", "code", "color",
		"colspan", "cols", "contenteditable", "content", "contextmenu", "controls", "coords",
		"data-[A-Za-z_:][\\w.:-]*", "data", "datetime", "default", "defer", "dirname", "dir",
		"disabled", "download", "draggable", "dropzone",
		"enctype",
		"formaction", "form", "for", 
		"headers", "height", "hidden", "high", "hreflang", "href", "http-equiv",
		"icon", "id", "ismap", "itemprop",
		"keytype", "kind", 
		"label", "language", "lang", "list", "loop", "low",  
		"manifest", "maxlength", "max", "media", "method", "min", "multiple",
		"name", "novalidate", 
		"open", "optimum", 
		"pattern", "ping", "placeholder", "poster", "preload", "pubdate",  
		"radiogroup", "readonly", "rel", "required", "reversed", "rowspan", "rows",
		"sandbox", "scoped", "scope", "seamless", "selected", "shape", "sizes", "size", "span", "spellcheck",
		"srcdoc", "srclang","srcset", "src", "start", "step", "style", "summary",
		"tabindex", "target", "title", "type",
		"usemap",
		"value",
		"width", "wrap" 
	];

	var ariaAttributes = [
		"activedescendant", "atomic", "autocomplete", 
		"busy", 
		"checked", "controls", 
		"describedby", "disabled", "dropeffect", 
		"expanded", 
		"flowto", 
		"grabbed", 
		"haspopup", "hidden", 
		"invalid", 
		"labelledby", "label", "level", "live", 
		"multiline", "multiselectable", 
		"orientation", "owns", 
		"posinset", "pressed", 
		"readonly", "relevant", "required", 
		"selected", "setsize", "sort", 
		"valuemax", "valuemin", "valuenow", "valuetext"
	];

	var grammars = [];
	grammars.push.apply(grammars, mJS.grammars);
	grammars.push.apply(grammars, mCSS.grammars);
	grammars.push.apply(grammars, mXML.grammars);
	grammars.push({
		id: "orion.html",
		contentTypes: ["text/html"],
		patterns: [
			{
				begin: "(?i)(<style)([^>]*)(>)",
				end: "(?i)(</style>)",
				captures: {
					1: {name: "meta.tag.html"},
					3: {name: "meta.tag.html"}
				},
				contentName: "source.css.embedded.html",
				patterns: [
					{include: "orion.css"}
				]
			}, {
				begin: "(?i)<script\\s*>|<script\\s.*?(?:language\\s*=\\s*(['\"])javascript\\1|type\\s*=\\s*(['\"])(?:text|application)/(?:javascript|ecmascript)\\2).*?>",
				end: "(?i)</script>",
				captures: {
					0: {name: "meta.tag.html"}
				},
				contentName: "source.js.embedded.html",
				patterns: [
					{include: "orion.js"}
				]
			}, {
				begin: "</?[A-Za-z0-9]+",
				end: "/?>",
				captures: {
					0: {name: "meta.tag.html"}
				},
				patterns: [
					{include: "orion.xml#comment"},
					{include: "orion.lib#string_doubleQuote"},
					{include: "orion.lib#string_singleQuote"},
					{include: "#attribute"}
				]
			},
			{include: "orion.xml#comment"},
			{include: "orion.xml#doctype"},
			{include: "orion.xml#ampersandEscape"}
		],
		repository: {
			attribute:{
				match: "\\b(?:" + attributes.join("|") + "|role|aria-(" + ariaAttributes.join("|") + "))\\b",  
				name: "meta.tag.attribute.html"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: [],
		attributes: attributes
	};
});
