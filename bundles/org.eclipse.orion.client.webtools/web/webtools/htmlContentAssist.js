/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2017 IBM Corporation and others.
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
	'orion/editor/templates',
	'orion/objects',
	'webtools/util',
	'javascript/util',
	'webtools/attributes',
	'webtools/deprecatedAttributes',
	'webtools/tags',
	'i18n!webtools/nls/messages',
	'orion/i18nUtil'
], function(mTemplates, Objects, util, jsUtil, Attributes, Deprecated, Tags, Messages, i18nUtil) {

	var simpleDocTemplate = new mTemplates.Template("", Messages['simpleDocDescription'],
		"<!DOCTYPE html>\n" + //$NON-NLS-0$
		"<html lang=\"en\">\n" + //$NON-NLS-0$
		"<head>\n" + //$NON-NLS-0$
		"\t<meta charset=\"utf-8\">\n" + //$NON-NLS-0$
		"\t<title>${title}</title>\n" + //$NON-NLS-0$
		"</head>\n" + //$NON-NLS-0$
		"<body>\n" + //$NON-NLS-0$
		"\t<main>\n" + //$NON-NLS-0$
		"\t\t<h1>${heading}</h1>\n" + //$NON-NLS-0$
		"\t\t<p>\n" + //$NON-NLS-0$
		"\t\t\t${cursor}\n" + //$NON-NLS-0$
		"\t\t</p>\n" + //$NON-NLS-0$
		"\t</main>\n" + //$NON-NLS-0$
		"</body>\n" + //$NON-NLS-0$
		"</html>"); //$NON-NLS-0$
		
//	var templates = [
//		{
//			tag: 'img',
//			prefix: "<img",
//			name: "<img>",
//			description: Messages['imageElementDescription'],
//			template: "<img src=\"${URI}\" alt=\"${Image}\"/>",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img"
//		},
//		{
//			tag: 'a',
//			prefix: "<a",
//			name: "<a>",
//			description: Messages['anchorElementDescription'],
//			template: "<a href=\"${cursor}\"></a>",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a"
//		},
//		{
//			tag: 'ul',
//			prefix: "<ul",
//			name: "<ul>",
//			description: Messages['ulElementDescription'],
//			template: "<ul>\n\t<li>${cursor}</li>\n</ul>",
//			url: 'https://developer.mozilla.org/en/docs/Web/HTML/Element/ul'
//		},
//		{
//			tag: 'ol',
//			prefix: "<ol",
//			name: "<ol>",
//			description: Messages['olElementDescription'],
//			template: "<ol>\n\t<li>${cursor}</li>\n</ol>",
//			url: 'https://developer.mozilla.org/en/docs/Web/HTML/Element/ol'
//		},
//		{
//			tag: 'dl',
//			prefix: "<dl",
//			name: "<dl>",
//			description: Messages['dlElementDescription'],
//			template: "<dl>\n\t<dt>${cursor}</dt>\n\t<dd></dd>\n</dl>",
//			url: 'https://developer.mozilla.org/en/docs/Web/HTML/Element/dl'
//		},
//		{
//			tag: 'table',
//			prefix: "<table",
//			name: "<table>",
//			description: Messages['basicTableDescription'],
//			template: "<table>\n\t<tr>\n\t\t<td>${cursor}</td>\n\t</tr>\n</table>",
//			url: 'https://developer.mozilla.org/en/docs/Web/HTML/Element/table'
//		},
//	];
//
//	//elements that are typically placed on a single line (e.g., <b>, <h1>, etc)
//	var element, template, description, i;
//	var singleLineElements = [
//		"abbr","b","button","canvas","cite",
//		"command","dd","del","dfn","dt",
//		"em","embed","font","h1","h2",
//		"h3","h4","h5","h6","i",
//		"ins","kbd","label","li","mark",
//		"meter","object","option","output","progress",
//		"q","rp","rt","samp","small",
//		"strong","sub","sup","td","time",
//		"title","tt","u","var"
//	];
//	for (i = 0; i < singleLineElements.length; i++) {
//		element = singleLineElements[i];
//		description = "<" + element + "></" + element + ">";
//		template = "<" + element + ">${cursor}</" + element + ">";
//		templates.push({prefix: "<" + element, description: description, template: template});
//	}
//
//	//elements that typically start a block spanning multiple lines (e.g., <p>, <div>, etc)
//	var multiLineElements = [
//		"address","article","aside","audio","bdo",
//		"blockquote","body","caption","code","colgroup",
//		"datalist","details","div","fieldset","figure",
//		"footer","form","head","header","hgroup",
//		"iframe","legend","map","menu","nav",
//		"noframes","noscript","optgroup","p","pre",
//		"ruby","script","section","select","span",
//		"style","tbody","textarea","tfoot","th",
//		"thead","tr","video"
//	];
//	for (i = 0; i < multiLineElements.length; i++) {
//		element = multiLineElements[i];
//		description = "<" + element + "></" + element + ">";
//		template = "<" + element + ">\n\t${cursor}\n</" + element + ">";
//		templates.push({prefix: "<" + element, description: description, template: template});
//	}
//
//	//elements with no closing element (e.g., <hr>, <br>, etc)
//	var emptyElements = [
//		"area","base","br","col",
//		"hr","input","link","meta",
//		"param","keygen","source"
//	];
//	for (i = 0; i < emptyElements.length; i++) {
//		element = emptyElements[i];
//		template = description = "<" + element + "/>";
//		templates.push({prefix: "<" + element, description: description, template: template});
//	}

	/**
	 * @name orion.editor.HTMLContentAssistProvider
	 * @description Creates a new HTML content assist provider
	 * @class Provides content assist for HTML.
	 * @param {HtmlAstManager} htmlAstManager The backing AST manager
	 */
	function HTMLContentAssistProvider(htmlAstManager) {
		this.astmanager = htmlAstManager;
	}
	
	HTMLContentAssistProvider.prototype = new mTemplates.TemplateContentAssist([], []);
	
	Objects.mixin(HTMLContentAssistProvider.prototype, {
		/**
		 * @private
		 */
		_getPrefixStart: function(text, offset) {
			var index = offset;
			while (index > 0) {
				var char = text.substring(index - 1, index);
				if (/[A-Za-z0-9_\-]/.test(char)) {
					index--;
				} else {
					break;
				}
			}
			return index;
		},
		/**
		 * @callback 
		 */
		computePrefix: function(editorContext, offset) {
			return editorContext.getText().then(function (text) {
				return text.substring(this._getPrefixStart(text, offset), offset);
			}.bind(this));
		},
		/**
		 * @callback 
		 */
		computeContentAssist: function(editorContext, params) {
			var that = this;
			return this.astmanager.getAST(editorContext).then(function(ast) {
				// template - simple html document
				if (ast.source.length === 0) {
					return [simpleDocTemplate.getProposal("", params.offset, params)];
				}
				var proposals = that.computeProposalsFromAst(ast, params);
				if(proposals.length > 0 && proposals[0].unselectable) {
					//already sorted, only templates. hack until we break out template computation
					return proposals;
				}
				return proposals;
			});
		},
		/**
		 * Computes the completions from the given AST and parameter context
		 * @param {Object} ast The AST to inspect
		 * @param {Object} params The paramter context
		 * @returns {Array.<Object>} The array of proposal objects or an empty array, never null
		 * @since 10.0 
		 */
		computeProposalsFromAst: function(ast, params) {
			var node = util.findNodeAtOffset(ast, params.offset);
			if(node) {
				if(this.inScriptOrStyle(node, params.offset, ast.source) || this.inClosingTag(node, params.offset, ast.source)) {
					return [];
				}
				if (this.isCompletingCommentClose(node, params.offset)){
					return this.getComment(node, params.offset, ast.source, false);
				} else if (this.isCompletingAttributeValue(node, ast.source, params)) {
					return this.getValuesForAttribute(node, ast.source, params);
				} else if (this.isCompletingTagAttribute(node, ast.source, params)) {
					return this.getAttributesForNode(node, ast.source, params);
				} else if (this.isCompletingTag(node, params)){
					if (this.isCompletingCommentOpen(node)){
						return this.getComment(node, params.offset, ast.source, true);
					}
					if (this.isCompletingTagWithMatchingClose(node, ast.source)){
						return [];
					}
					return this.getTags(ast.source, params);
				}
				return this.getProposalsForTextContent(node, ast.source, params);
			}
			
			// If we have a non-empty source file with no valid tags, still offer tag completions
			return this.getTags(ast.source, params);
		},
		
		/**
		 * Returns if the tag block that we are in is a style of script block
		 * @param {Object} node The node
		 * @returns {Boolean} True if the current node context is style or script
		 * @since 10.0 
		 */
		inScriptOrStyle: function(node, offset, source) {
			if (node){
				if (node.type === 'tag'){
					var name = node.name ? node.name.toLowerCase() : '';
					if (name === 'script' || name === 'style') {
						if (node.openrange && node.endrange){
							// If we are in the tag itself we are not actually in the script block
							if (offset < node.openrange[1] || offset > node.endrange[0]){
								return false;
							}
						}
						return true;
					}
				}
			}
			return false;
		},  
		
		/**
		 * Returns if the offset is in a closing tag. A closing tag is determined as an 
		 * offset past the last child but before the closing range of the tag itself
		 * @param {Object} node The AST not context
		 * @param {Number} offset The curren offset
		 * @param {String} source The source 
		 */
		inClosingTag: function(node, offset, source) {
			if(node && source) {
				switch(node.type) {
					case 'tag': {
						// Smarter way now that we have end ranges
						if (node.endrange){
							return offset > node.endrange[0] && offset < node.endrange[1];
						}
						// TODO Delete the old way
						var _s = source.slice(node.range[0], node.range[1]);
						var _r = new RegExp("<\\s*\/\\s*"+node.name+"\\s*>$"); //$NON-NLS-1$ //$NON-NLS-2$
						var _m = _r.exec(_s);
						if(_m) {
							return offset > (_m.index+node.range[0]) && offset < node.range[1];
						}
						break;
					}
					default: {
						var _p = node.parent;
						if(_p && _p.type === 'tag') {
							return Array.isArray(_p.children) && _p.children.length > 0 && (offset > _p.children[_p.children.length-1].range[1]) && offset <= _p.range[1];
						}
						break;
					}
				}
			}
			return false;
		},
		
		/**
		 * Computes if we are trying to complete a comment start or end
		 * @param {Object} node The AST node to check with the offset
		 * @returns {Boolean} True if we are completing a comment, false otherwise 
		 * @since 10.0 
		 */
		isCompletingCommentClose: function(node, offset) {
			return node && node.type === 'comment' && offset >= node.range[0] && offset <= node.range[1];
		},
		
		/**
		 * Computes if we are trying to complete an open comment
		 * @param {Object} node The AST node to check with the offset
		 * @returns {Boolean} True if we are completing a comment, false otherwise 
		 * @since 10.0 
		 */
		isCompletingCommentOpen: function(node) {
			if(node && node.type === 'tag' && node.name.match(/^!-{0,2}$/)){
				return true;
			}
			return false;
		},
		
		/**
		 * Computes if we are trying to complete tag attributes
		 * @param {Object} node The AST node to check with the offset
		 * @param {String} source The backing source
		 * @param {Object} params The parameters
		 * @returns {Boolean} True if we are completing the attributes of a tag, false otherwise 
		 * @since 10.0 
		 */
		isCompletingTagAttribute: function(node, source, params) {
			if(node) {
				var offset = params.offset;
				if(node.type === 'tag') {
					var tagNameEnd = node.range[0] + 1 + node.name.length;
					if(tagNameEnd < offset) {
						if (node.openrange){
							return offset < node.openrange[1] || (offset === node.openrange[1] && source[offset-1] !== '>' && source[offset-1] !== '<');
						}
						// TODO openrange from htmlparser2 is more accurate, consider removing this legacy range check
						var idx = offset;
						while(idx < node.range[1]) {
							var char = source[idx];
							if(char === '<') {
								return false;
							} else if(char === '>') {
								return true;
							}
							idx++;
						}
					}
				} else if(node.type === 'attr') {
					return offset >= node.range[0] || offset <= node.range[1];
				}
			}
			return false;
		},
		
		/**
		 * Computes if we are trying to complete a tag
		 * @param {Object} node The AST node to check with the offset
		 * @param {Object} params The parameters
		 * @returns {Boolean} True if we are completing a tag, false otherwise 
		 * @since 10.0 
		 */
		isCompletingTag: function(node, params) {
			if(node) {
				var offset = params.offset;
				if(node.type === 'tag') {
					if (node.openrange){
						if (offset >= node.openrange[0] && offset <= node.openrange[1]){
							return true;
						}
					} else if (offset >= node.range[0] && offset <= node.range[1]){
						return true;
					}
 				}
			}
			return false;
		},
		
		/**
		 * Computes if we are completing a tag that already has a matching close tag
		 * @param {Object} node The AST node to check with the offset
		 * @param {String} source The source of the file
		 * @returns {Boolean} True if we are completing a tag with a matching close tag, false otherwise 
		 * @since 11.0 
		 */
		isCompletingTagWithMatchingClose: function(node, source) {
			if(node && node.type === 'tag' && node.name) {
				if (node.endrange && node.endrange.length === 2){
					// If the HTML is incomplete, the parser recovery sometimes uses the end range of the parent element
					return node.name === source.substring(node.endrange[0]+2, node.endrange[1]-1);
				}
 			}
		},
		
		/**
		 * Returns the tag proposals for the current offset
		 * @function
		 * @param {Object} source The source in the buffer
		 * @param {Object} params the parameters, including the offset in the source
		 * @returns returns {Array.<Object>} The array of proposals
		 */
		getTags: function(source, params) {
			var tags = Tags.tagTemplates;
			var proposals = [];
			var namePrefix = params.prefix ? params.prefix : "";
			var precedingChar = source.charAt(params.offset - namePrefix.length - 1);
			if (namePrefix.length === 0){
				while (precedingChar === '!' || precedingChar === '-'){
					namePrefix = precedingChar + namePrefix;
					precedingChar = source.charAt(params.offset - namePrefix.length - 1);
				}
				if (namePrefix.match(/^!-?$/)){
					var prefix = '<' + namePrefix;
					proposals.push(this.makeComputedProposal("<!-- ", Messages['openCommentName'], " - <!-- -->", null, prefix)); //$NON-NLS-1$ //$NON-NLS-2$
					return proposals;
				}
			}
			var leadingBracket = false;
			if (precedingChar === '<'){
				leadingBracket = true;
			}
			for(var j = 0; j < tags.length; j++) {
				var tag = tags[j];
				if(jsUtil.looselyMatches(namePrefix, tag.name)) {
					var hover = Object.create(null);
					hover.type = 'markdown'; //$NON-NLS-1$
					hover.content = "";
					if (tag.obsolete){
						hover.content += Messages['obsoleteTag'];
					}
					if (tag.doc){
						hover.content += tag.doc;
					}
					if(tag.url) {
						hover.content += i18nUtil.formatMessage(Messages['onlineDocumentation'], tag.url);
					}
					var proposalText = "";
					var desc = "";
					// TODO Allow tags to have custom templates
					tag.type = 'single'; //$NON-NLS-1$
					switch (tag.type) {
						case 'single':
							proposalText = "<" + tag.name + "></" + tag.name + ">"; //$NON-NLS-1$
//							desc = " - " + proposalText;
							if (leadingBracket){
								proposalText = proposalText.substring(1);
							}
							break;
						case 'multi':
							proposalText = "<" + tag.name + ">\n\n</" + tag.name + ">"; //$NON-NLS-1$
//							desc = " - " + proposalText;
							if (leadingBracket){
								proposalText = proposalText.substring(1);
							}
							break;
						case 'empty':
							proposalText = "<" + tag.name + "/>"; //$NON-NLS-1$
//							desc = " - " + proposalText;
							if (leadingBracket){
								proposalText = proposalText.substring(1);
							}
							break;
						default:
							proposalText = "<" + tag.name + ">";
//							desc = " - " + proposalText;
							if (leadingBracket){
								proposalText = proposalText.substring(1);
							}
							break;
					}
					var style = "emphasis";
					if (tag.obsolete){
						style = "strikethrough";
						//desc += Messages['obsoleteTagDesc'];
					}
					var proposal = this.makeComputedProposal(proposalText, tag.name, desc, hover, params.prefix, style);
					// The prefix not being includes prevents content assist staying open while typing
//					if (source.charAt(params.offset - prefix.length - 1) === '<'){
//						prefix = '<' + prefix;
//						proposal.prefix = prefix;
//					}
					proposal.escapePosition = params.offset - namePrefix.length + tag.name.length + 2;
					if(leadingBracket){
						proposal.escapePosition--;
					}
					proposals.push(proposal);
				}
			}
			return proposals;	
		},
		
		/**
		 * Returns the attributes that can be used in the specified tag
		 * @param {Object} node The AST node for the tag we are completing within
		 * @param {Object} params The parameters
		 * @returns {Array.<Object>} The array of proposals
		 * @since 10.0 
		 */
		getAttributesForNode: function(node, source, params) {
			var proposals = [];
			var prefix = params.prefix ? params.prefix : "";
			// we need to check if we need to rebuild the prefix for completion that contains a '-'
			var index = params.offset - prefix.length - 1;
			if (index > 0 && index < source.length) {
				var precedingChar = source.charAt(index);
				if (precedingChar === '=' && prefix.length === 0 && (index - 1) > 0) {
					precedingChar = source.charAt(index - 1);
					if (/[A-Za-z0-9_]/.test(precedingChar)) {
						proposals.push(this.makeComputedProposal("\"\"",  Messages['addQuotesToAttributes'], " - \"\"", null, prefix)); //$NON-NLS-1$ //$NON-NLS-2$
						return proposals;
					}
				}
			}
			var attrs = Attributes.getAttributesForNode(node);
			if(Array.isArray(attrs.global)) {
				proposals = proposals.concat(this.addProposals(node, attrs.global, params));
			}
			if(Array.isArray(attrs.formevents)) {
				var arr = this.addProposals(node, attrs.formevents, params);
				if(arr.length > 0) {
					proposals.push({
							proposal: '',
							description: Messages['formeventsHeader'],
							style: 'noemphasis_title', //$NON-NLS-1$
							unselectable: true,
							kind: 'html' //$NON-NLS-1$
					});
					proposals = proposals.concat(arr);
				}
			}
			if(Array.isArray(attrs.keyboardevents)) {
				arr = this.addProposals(node, attrs.keyboardevents, params);
				if(arr.length > 0) {
					proposals.push({
							proposal: '',
							description: Messages['keyboardeventsHeader'],
							style: 'noemphasis_title', //$NON-NLS-1$
							unselectable: true,
							kind: 'html' //$NON-NLS-1$
					});
					proposals = proposals.concat(arr);
				}
			}
			if(Array.isArray(attrs.mouseevents)) {
				arr = this.addProposals(node, attrs.mouseevents, params);
				if(arr.length > 0) {
					proposals.push({
							proposal: '',
							description: Messages['mouseeventsHeader'],
							style: 'noemphasis_title', //$NON-NLS-1$
							unselectable: true,
							kind: 'html' //$NON-NLS-1$
						});
					proposals = proposals.concat(arr);
				}
			}
			if(Array.isArray(attrs.windowevents) && attrs.windowevents.length > 0) {
				arr = this.addProposals(node, attrs.windowevents, params);
				if(arr.length > 0) {
					proposals.push({
							proposal: '',
							description: Messages['windoweventsHeader'],
							style: 'noemphasis_title', //$NON-NLS-1$
							unselectable: true,
							kind: 'html' //$NON-NLS-1$
						});
					proposals = proposals.concat(arr);
				}
			}
			if(Array.isArray(attrs.aria)) {
				arr = this.addProposals(node, attrs.aria, params);
				if(arr.length > 0) {
					proposals.push({
							proposal: '',
							description: 'ARIA', //$NON-NLS-1$
							style: 'noemphasis_title', //$NON-NLS-1$
							unselectable: true,
							kind: 'html' //$NON-NLS-1$
					});
					proposals = proposals.concat(arr);
				}
			}
			return proposals;
		},
		
		addProposals: function addProposals(node, attrs, params) {
			// TODO Try adding spaces ahead of the attribute if previous attribute had no trailing whitespace
			var proposals = [];
			var tagNode = node;
			if (node.type === 'attr' && node.parent){
				tagNode = node.parent;
			}
			for(var j = 0; j < attrs.length; j++) {
				var attr = attrs[j];
				var prefix = params.prefix ? params.prefix : "";
				if(jsUtil.looselyMatches(prefix, attr.name) && !this._hasAttribute(tagNode, attr.name)) {
					
					var deprecated = Deprecated.isAttributeDeprecated(tagNode.name, attr.name);
					var hover = Object.create(null);
					var desc = "";
					hover.type = 'markdown'; //$NON-NLS-1$
					hover.content = "";
					if (deprecated){
						hover.content += i18nUtil.formatMessage(Messages['obsoleteAttr'], deprecated);
						desc += Messages['obsoleteAttrDesc'];
					}
					if (attr.doc){
						hover.content += attr.doc;
					}
					if (Array.isArray(attr.values)) {
						hover.content += Messages['possibleValues'];
						for(var v = 0; v < attr.values.length; v++) {
							var val = attr.values[v];
							hover.content += i18nUtil.formatMessage(Messages['valueNameDocMarkdown'], val.name, val.doc);
						}
					}
					if(attr.url) {
						hover.content += i18nUtil.formatMessage(Messages['onlineDocumentation'], attr.url);
					}
					var proposalText = attr.name;
					var caretOffset = 0;
					if (!Array.isArray(node.valueRange)
							|| (node.valueRange[0] > params.offset || node.valueRange[1] < params.offset)) {
						if (typeof node.value !== 'string') {
							proposalText += '=""'; //$NON-NLS-1$
							caretOffset = 2; // 2 to put the caret between the two quotes
						} else if (proposalText.indexOf(prefix) === -1) {
							proposalText += '=""'; //$NON-NLS-1$
							caretOffset = 2; // 2 to put the caret between the two quotes
						} else if (prefix.length === 0 || (prefix.length !== 0 && proposalText.indexOf(prefix) === -1)) {
							proposalText += '=""'; //$NON-NLS-1$
							caretOffset = 2; // 2 to put the caret between the two quotes
						}
					}
					var proposal = this.makeComputedProposal(proposalText, attr.name, desc, hover, prefix);
					proposal.escapePosition = params.offset - prefix.length + attr.name.length + caretOffset; 
					proposals.push(proposal);
				}
			}
			proposals.sort(function(l,r) {
				//sort by relevance and then by name
				if(typeof l.relevance === 'undefined') {
					l.relevance = 1;
				}
				if(typeof r.relevance === 'undefined') {
					r.relevance = 1;
				}
				if (l.relevance > r.relevance) {
					return -1;
				} else if (r.relevance > l.relevance) {
					return 1;
				}
				var ldesc = l.name;
				var rdesc = r.name;
				if (ldesc < rdesc) {
					return -1;
				} else if (rdesc < ldesc) {
					return 1;
				}
				return 0;
			});
			return proposals;
		},
		
		/**
		 * Returns a comment open/close proposal or an empty array
		 * @param {Object} node The AST node for the tag we are completing within
		 * @param {Number} offset The offset content assist was activated at
		 * @param {String} source The source of the file
		 * @param {Boolean} open If true will propose open comment proposals, otherwise return close comment
		 * @returns {Array.<Object>} The array of proposals
		 * @since 10.0 
		 */
		getComment: function(node, offset, source, open) {
			var proposals = [];
			if (open){
				var prefix = '<' + node.name;
				proposals.push(this.makeComputedProposal("<!-- ", Messages['openCommentName'], " - <!-- -->", null, prefix)); //$NON-NLS-1$ //$NON-NLS-2$
			} else {
				if (node.data.length > 0){
					prefix = "";
					// Check if user has typed dashes (not including the leading <!--)
					if (source.charAt(offset-1) === '-' && offset > node.range[0]+4){
						prefix += '-';
						if (source.charAt(offset-2) === '-'){
							prefix += '-';
						}
					}
					proposals.push(this.makeComputedProposal("-->", Messages['closeCommentName'], " - <!-- -->", null, prefix)); //$NON-NLS-1$ //$NON-NLS-2$
				}
			}
			return proposals;	
		},
		
		
		/**
		 * @description Returns true if the node has the given attribute already
		 * @param {Object} node The AST node to check
		 * @param {String} attribute the name of the attribute
		 * @returns {Boolean} True if the node has the given attribute, false otherwise
		 */
		_hasAttribute: function(node, attribute) {
			return node
					&& node.type === 'tag'
					&& Array.isArray(node.attributes)
					&& attribute
					&& node.attributes.some(function(att) {
						return att.name === attribute && att.value !== null;
					});
		},
		
		/**
		 * Returns the options (if any) that can be used in the specified attribute
		 * @param {Object} node The AST node for the attribute we are completing within
		 * @param {Object} params The parameters
		 * @returns {Array.<Object>} The array of proposals
		 * @since 10.0 
		 */
		getValuesForAttribute: function(node, source, params) {
			var proposals = [];
			var prefix = params.prefix ? params.prefix : "";
			// we need to check if we need to rebuild the prefix for completion that contains a '-'
			var index = params.offset - prefix.length - 1;
			if (index > 0 && index < source.length) {
				var precedingChar = source.charAt(index);
				if (precedingChar === '=' && prefix.length === 0 && (index - 1) > 0) {
					precedingChar = source.charAt(index - 1);
					if (/[A-Za-z0-9_]/.test(precedingChar)) {
						if (index + 1 >= source.length || 
								(source.charAt(index + 1) !== '\"' && source.charAt(index + 1) !== "'")) {
							proposals.push(this.makeComputedProposal("\"\"",  Messages['addQuotesToAttributes'], " - \"\"", null, prefix)); //$NON-NLS-1$ //$NON-NLS-2$
						}
					}
				}
			}
			var vals = Attributes.getValuesForAttribute(node);
			if(Array.isArray(vals)) {
				proposals = proposals.concat(this.addProposals(node, vals, params));
			}
			return proposals;	
		},
		/**
		 * Returns any proposals (if any) for when the user is editing text contents based upon
		 * state of the AST.  Templates are added to this list.
		 * @param {Object} node The AST node for the attribute we are completing within
		 * @param {String} source The backing source
		 * @param {Object} params The parameters
		 * @returns {Array.<Object>} The array of proposals
		 * @since 10.0 
		 */
		getProposalsForTextContent: function(node, source, params) {
			if (node){
				var startTag;
				// If text content is a '/' offer to close the tag
				// If we have an uncompleted tag '</' offer to complete the tag
				if (node.type === 'tag' && node.openrange && params.offset > node.openrange[1]){
					startTag = node;
				} else if (node.type === 'tag' && (params.offset > node.range[1] || params.offset < node.range[0])){
					startTag = node;
				}
				if (startTag){
					var preceding = source.substring(0, params.offset);
					var match = preceding.match(/<?\/$/);
					if (match){
						var name = '</' + startTag.name + '>'; //$NON-NLS-1$
						var desc = i18nUtil.formatMessage(Messages['closeTagDescription'], startTag.name);
						return [this.makeComputedProposal(name, name, desc, null, match[0])];
					}
				}
			}
			return this.getTags(source, params);	
		},
		
		/**
		 * Computes if we are trying to complete attributes
		 * @param {Object} node The AST node to check with the offset
		 * @param {String} source The backing source
		 * @param {Object} params The parameters
		 * @returns {Boolean} True if we are completing the attributes of a tag, false otherwise 
		 * @since 10.0 
		 */
		isCompletingAttributeValue: function(node, source, params) {
			// TODO We can do better with the new parser, handle no quotes cases too
			if(node && node.type === 'attr') {
				if (node.valueRange) {
					var range = node.valueRange;
					return range[0] <= params.offset && range[1] >= params.offset;
				}
				return this.within('"', '"', source, params.offset, node.range) || //$NON-NLS-1$ //$NON-NLS-2$
						this.within("'", "'", source, params.offset, node.range); //$NON-NLS-1$ //$NON-NLS-2$
			}
			return false;
		},
		
		/**
		 * Factory-like function to create proposal objects
		 * @param {String} proposal The proposal text
		 * @param {String} name The name for the proposal
		 * @param {String} description The description for the proposal
		 * @param {Object} hover The markdown hover object for the proposal
		 * @param {String} prefix The prefix for the proposal
		 * @param {String} style The optional style. If omitted, defaults to 'emphasis'
		 * @since 10.0   
		 */
		makeComputedProposal: function(proposal, name, description, hover, prefix, style) {
			return {
				proposal: proposal,
				relevance: 100,
				name: name,
				description: description,
				hover: hover,
				prefix: prefix,
				style: typeof style === 'string' ? style : 'emphasis', //$NON-NLS-1$
				overwrite: true,
				kind: 'html' //$NON-NLS-1$
		    };
		},
		
		/**
		 * A util method to determine if the caret is within two given chars, that are found within 
		 * the given bounds
		 * @param {String} start The char to the LHS
		 * @param {String} end The char to the RHS
		 * @param {String} source The source to check against
		 * @param {Number} offset   
		 */
		within: function(start, end, source, offset, bounds) {
			var idx = offset;
			var _c;
			var before = false;
			while(idx > bounds[0]) {
				_c = source[idx];
				if(_c === start) {
					before = true;
					break;
				}
				idx--;
			}
			if(before) {
				idx = offset;
				while(idx < bounds[1]) {
					_c = source[idx];
					if(_c === end) {
						return true;
					}
					idx++;
				}
			}
			return false;
		}
	});

	return {
		HTMLContentAssistProvider: HTMLContentAssistProvider
	};
});
