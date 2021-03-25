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
/* eslint-env amd */
define([
	'i18n!webtools/nls/messages'
], function(Messages) {
	/* eslint-disable missing-nls */
	// The following tags were marked as void elements using values in htmlparser-2
	var voidElements = ['area', 'base', 'basefont', 'br', 'col', 'command', 'embed', 'frame', 'hr', 'img',
						'input', 'isindex', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr',
						'path', 'circle', 'ellipse', 'line', 'rect', 'use', 'stop', 'polyline', 'polygon'];
	
	var tagTemplates = Object.create(null);
	tagTemplates = [
	/*
	 * The following data was scraped from https://developer.mozilla.org/en-US/docs/Web/HTML/Element
	 * These tags were missing from the scraped data and added manually:
	 * 		a, aside, blockquote, font, marquee, noframes
	 * These tags have been removed from the data as they will be removed in HTML 5.1
	 * 		dialog (Bug 501551)
	 */
		{
			name: "a",
			category: Messages.textContentCategory,
			doc: Messages.aTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a"
		},
		{
			name: "abbr",
			category: Messages.inlineTextCategory,
			doc: Messages.abbrTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/abbr"
		},
		{
			name: "acronym",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.acronymTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/acronym"
		},
		{
			name: "address",
			category: Messages.contentSectioningCategory,
			doc: Messages.addressTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/address"
		},
		{
			name: "applet",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.appletTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/applet"
		},
		{
			name: "area",
			category: Messages.imagesCategory,
			doc: Messages.areaTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area"
		},
		
		{
			name: "article",
			category: Messages.contentSectioningCategory,
			doc: Messages.articleTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article"
		},
		{
			name: "aside",
			category: Messages.textContentCategory,
			doc: Messages.asideTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/aside"
		},
		{
			name: "audio",
			category: Messages.imagesCategory,
			doc: Messages.audioTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio"
		},
		{
			name: "b",
			category: Messages.inlineTextCategory,
			doc: Messages.bTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/b"
		},
		{
			name: "base",
			category: Messages.documentMetadataCategory,
			doc: Messages.baseTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base"
		},
		{
			name: "basefont",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.basefontTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/basefont"
		},
		{
			name: "bdi",
			category: Messages.inlineTextCategory,
			doc: Messages.bdiTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/bdi"
		},
		{
			name: "bdo",
			category: Messages.inlineTextCategory,
			doc: Messages.bdoTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/bdo"
		},
		{
			name: "big",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.bigTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/big"
		},
		{
			name: "blink",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.blinkTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blink"
		},
		{
			name: "blockquote",
			category: Messages.textContentCategory,
			doc: Messages.bqTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote"
		},
		{
			name: "body",
			category: Messages.contentSectioningCategory,
			doc: Messages.bodyTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body"
		},
		{
			name: "br",
			category: Messages.inlineTextCategory,
			doc: Messages.brTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/br"
		},
		{
			name: "button",
			category: Messages.formsCategory,
			doc: Messages.buttonTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button"
		},
		{
			name: "canvas",
			category: Messages.scriptingCategory,
			doc: Messages.canvasTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas"
		},
		{
			name: "caption",
			category: Messages.tableContentCategory,
			doc: Messages.captionTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/caption"
		},
		{
			name: "center",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.centerTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/center"
		},
		{
			name: "cite",
			category: Messages.inlineTextCategory,
			doc: Messages.citeTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/cite"
		},
		{
			name: "code",
			category: Messages.inlineTextCategory,
			doc: Messages.codeTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/code"
		},
		{
			name: "col",
			category: Messages.tableContentCategory,
			doc: Messages.colTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/col"
		},
		{
			name: "colgroup",
			category: Messages.tableContentCategory,
			doc: Messages.colgrpTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/colgroup"
		},
		{
			name: "content",
			category: Messages.webComponentsCategory,
			doc: Messages.contentTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/content"
		},
		{
			name: "data",
			category: Messages.inlineTextCategory,
			doc: Messages.dataTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/data"
		},
		{
			name: "datalist",
			category: Messages.formsCategory,
			doc: Messages.datalistTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist"
		},
		{
			name: "dd",
			category: Messages.textContentCategory,
			doc: Messages.ddTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dd"
		},
		{
			name: "del",
			category: Messages.editsCategory,
			doc: Messages.delTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/del"
		},
		{
			name: "details",
			category: Messages.interactiveCategory,
			doc: Messages.detailsTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details"
		},
		{
			name: "dfn",
			category: Messages.inlineTextCategory,
			doc: Messages.dfnTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dfn"
		},
		{
			name: "dir",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.dirTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dir"
		},
		{
			name: "div",
			category: Messages.textContentCategory,
			doc: Messages.divTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div"
		},
		{
			name: "dl",
			category: Messages.textContentCategory,
			doc: Messages.dlTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl"
		},
		{
			name: "dt",
			category: Messages.textContentCategory,
			doc: Messages.dtTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dt"
		},
		{
			name: "element",
			category: Messages.decoratorCategory,
			doc: Messages.elementTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/element"
		},
		{
			name: "em",
			category: Messages.inlineTextCategory,
			doc: Messages.emTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/em"
		},
		{
			name: "embed",
			category: Messages.embeddedContentCategory,
			doc: Messages.embedTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/embed"
		},
		{
			name: "fieldset",
			category: Messages.formsCategory,
			doc: Messages.fieldsetTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset"
		},
		{
			name: "figcaption",
			category: Messages.textContentCategory,
			doc: Messages.figcaptionTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption"
		},
		{
			name: "figure",
			category: Messages.textContentCategory,
			doc: Messages.figureTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure"
		},
		{
			name: "font",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.fontTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/font"
		},
		{
			name: "footer",
			category: Messages.contentSectioningCategory,
			doc: Messages.footerTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/footer"
		},
		{
			name: "form",
			category: Messages.formsCategory,
			doc: Messages.formTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form"
		},
		{
			name: "frame",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.frameTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/frame"
		},
		{
			name: "frameset",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.framesetTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/frameset"
		},
		{
			name: "h1",
			category: Messages.contentSectioningCategory,
			doc: Messages.hTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/h1"
		},
		{
			name: "h2",
			category: Messages.contentSectioningCategory,
			doc: Messages.hTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/h2"
		},
		{
			name: "h3",
			category: Messages.contentSectioningCategory,
			doc: Messages.hTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/h3"
		},
		{
			name: "h4",
			category: Messages.contentSectioningCategory,
			doc: Messages.hTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/h4"
		},
		{
			name: "h5",
			category: Messages.contentSectioningCategory,
			doc: Messages.hTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/h5"
		},
		{
			name: "h6",
			category: Messages.contentSectioningCategory,
			doc: Messages.hTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/h6"
		},
		{
			name: "head",
			category: Messages.documentMetadataCategory,
			doc: Messages.headTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/head"
		},
		{
			name: "header",
			category: Messages.contentSectioningCategory,
			doc: Messages.headerTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/header"
		},
		{
			name: "hgroup",
			category: Messages.contentSectioningCategory,
			doc: Messages.hgroupTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hgroup"
		},
		{
			name: "hr",
			category: Messages.textContentCategory,
			doc: Messages.hrTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr"
		},
		{
			name: "html",
			category: Messages.basicCategory,
			doc: Messages.htmlTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html"
		},
		{
			name: "i",
			category: Messages.inlineTextCategory,
			doc: Messages.iTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/i"
		},
		{
			name: "iframe",
			category: Messages.embeddedContentCategory,
			doc: Messages.iframeTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe"
		},
		{
			name: "img",
			category: Messages.imagesCategory,
			doc: Messages.imgTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img"
		},
		{
			name: "input",
			category: Messages.formsCategory,
			doc: Messages.inputTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input"
		},
		{
			name: "ins",
			category: Messages.editsCategory,
			doc: Messages.insTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ins"
		},
		{
			name: "isindex",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.isindexTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/isindex"
		},
		{
			name: "kbd",
			category: Messages.inlineTextCategory,
			doc: Messages.kbdTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/kbd"
		},
		{
			name: "keygen",
			category: Messages.formsCategory,
			doc: Messages.keygenTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/keygen"
		},
		{
			name: "label",
			category: Messages.formsCategory,
			doc: Messages.labelTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label"
		},
		{
			name: "legend",
			category: Messages.formsCategory,
			doc: Messages.legendTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/legend"
		},
		{
			name: "li",
			category: Messages.textContentCategory,
			doc: Messages.liTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/li"
		},
		{
			name: "link",
			category: Messages.documentMetadataCategory,
			doc: Messages.linkTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link"
		},
		{
			name: "listing",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.listingTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/listing"
		},
		{
			name: "main",
			category: Messages.textContentCategory,
			doc: Messages.mainTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/main"
		},
		{
			name: "map",
			category: Messages.imagesCategory,
			doc: Messages.mapTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/map"
		},
		{
			name: "mark",
			category: Messages.inlineTextCategory,
			doc: Messages.markTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/mark"
		},
		{
			name: "marquee",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.marqueeTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/marquee"
		},
		{
			name: "menu",
			category: Messages.interactiveCategory,
			doc: Messages.menuTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/menu"
		},
		{
			name: "menuitem",
			category: Messages.interactiveCategory,
			doc: Messages.menuitemTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/menuitem"
		},
		{
			name: "meta",
			category: Messages.documentMetadataCategory,
			doc: Messages.metaTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta"
		},
		{
			name: "meter",
			category: Messages.formsCategory,
			doc: Messages.meterTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter"
		},
		{
			name: "nav",
			category: Messages.contentSectioningCategory,
			doc: Messages.navTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav"
		},
		{
			name: "noembed",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.noembedTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noembed"
		},
		{
			name: "noframes",
			category: Messages.embeddedContentCategory,
			doc: Messages.noframesTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noframes"
		},
		{
			name: "noscript",
			category: Messages.scriptingCategory,
			doc: Messages.noscriptTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript"
		},
		{
			name: "object",
			category: Messages.embeddedContentCategory,
			doc: Messages.objectTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object"
		},
		{
			name: "ol",
			category: Messages.textContentCategory,
			doc: Messages.olTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol"
		},
		{
			name: "optgroup",
			category: Messages.formsCategory,
			doc: Messages.optgroupTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/optgroup"
		},
		{
			name: "option",
			category: Messages.formsCategory,
			doc: Messages.optionsTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option"
		},
		{
			name: "output",
			category: Messages.formsCategory,
			doc: Messages.outputTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output"
		},
		{
			name: "p",
			category: Messages.textContentCategory,
			doc: Messages.pTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p"
		},
		{
			name: "param",
			category: Messages.embeddedContentCategory,
			doc: Messages.paramTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/param"
		},
		{
			name: "plaintext",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.plaintextTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/plaintext"
		},
		{
			name: "pre",
			category: Messages.textContentCategory,
			doc: Messages.preTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/pre"
		},
		{
			name: "progress",
			category: Messages.formsCategory,
			doc: Messages.progressTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress"
		},
		{
			name: "q",
			category: Messages.inlineTextCategory,
			doc: Messages.qTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/q"
		},
		{
			name: "rp",
			category: Messages.inlineTextCategory,
			doc: Messages.rpTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/rp"
		},
		{
			name: "rt",
			category: Messages.inlineTextCategory,
			doc: Messages.rtTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/rt"
		},
		{
			name: "rtc",
			category: Messages.inlineTextCategory,
			doc: Messages.rtcTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/rtc"
		},
		{
			name: "ruby",
			category: Messages.inlineTextCategory,
			doc: Messages.rubyTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ruby"
		},
		{
			name: "s",
			category: Messages.inlineTextCategory,
			doc: Messages.sTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/s"
		},
		{
			name: "samp",
			category: Messages.inlineTextCategory,
			doc: Messages.sampTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/samp"
		},
		{
			name: "script",
			category: Messages.scriptingCategory,
			doc: Messages.scriptTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script"
		},
		{
			name: "section",
			category: Messages.contentSectioningCategory,
			doc: Messages.sectionTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/section"
		},
		{
			name: "select",
			category: Messages.formsCategory,
			doc: Messages.selectTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select"
		},
		{
			name: "shadow",
			category: Messages.decoratorCategory,
			doc: Messages.shadowTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/shadow"
		},
		{
			name: "small",
			category: Messages.inlineTextCategory,
			doc: Messages.smallTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/small"
		},
		{
			name: "source",
			category: Messages.embeddedContentCategory,
			doc: Messages.sourceTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source"
		},
		{
			name: "spacer",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.spacerTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/spacer"
		},
		{
			name: "span",
			category: Messages.inlineTextCategory,
			doc: Messages.spanTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span"
		},
		{
			name: "strike",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.strikeTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/strike"
		},
		{
			name: "strong",
			category: Messages.inlineTextCategory,
			doc: Messages.strongTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/strong"
		},
		{
			name: "style",
			category: Messages.documentMetadataCategory,
			doc: Messages.styleTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style"
		},
		{
			name: "sub",
			category: Messages.inlineTextCategory,
			doc: Messages.subTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sub"
		},
		{
			name: "summary",
			category: Messages.interactiveCategory,
			doc: Messages.summaryTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary"
		},
		{
			name: "sup",
			category: Messages.inlineTextCategory,
			doc: Messages.supTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sup"
		},
		{
			name: "table",
			category: Messages.tableContentCategory,
			doc: Messages.tableTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table"
		},
		{
			name: "tbody",
			category: Messages.tableContentCategory,
			doc: Messages.tbodyTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tbody"
		},
		{
			name: "td",
			category: Messages.tableContentCategory,
			doc: Messages.tdTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/td"
		},
		{
			name: "template",
			category: Messages.decoratorCategory,
			doc: Messages.templateTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template"
		},
		{
			name: "textarea",
			category: Messages.formsCategory,
			doc: Messages.textareaTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea"
		},
		{
			name: "tfoot",
			category: Messages.tableContentCategory,
			doc: Messages.tfootTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tfoot"
		},
		{
			name: "th",
			category: Messages.tableContentCategory,
			doc: Messages.thTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th"
		},
		{
			name: "thead",
			category: Messages.tableContentCategory,
			doc: Messages.theadTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/thead"
		},
		{
			name: "time",
			category: Messages.inlineTextCategory,
			doc: Messages.timeTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time"
		},
		{
			name: "title",
			category: Messages.documentMetadataCategory,
			doc: Messages.titleTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title"
		},
		{
			name: "tr",
			category: Messages.tableContentCategory,
			doc: Messages.trTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tr"
		},
		{
			name: "track",
			category: Messages.imagesCategory,
			doc: Messages.trackTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track"
		},
		{
			name: "tt",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.ttTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tt"
		},
		{
			name: "u",
			category: Messages.inlineTextCategory,
			doc: Messages.uTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/u"
		},
		{
			name: "ul",
			category: Messages.textContentCategory,
			doc: Messages.ulTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ul"
		},
		{
			name: "var",
			category: Messages.inlineTextCategory,
			doc: Messages.varTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/var"
		},
		{
			name: "video",
			category: Messages.imagesCategory,
			doc: Messages.videoTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video"
		},
		{
			name: "wbr",
			category: Messages.inlineTextCategory,
			doc: Messages.wbrTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/wbr"
		},
		{
			name: "xmp",
			category: Messages.obsoleteTagCategory,
			obsolete: true,
			doc: Messages.xmpTagDoc,
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/xmp"
		}
	];
	
	return {
		tagTemplates: tagTemplates,
		voidElements: voidElements
	};
});
