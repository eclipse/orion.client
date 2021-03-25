/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation, Inc. and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (https://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (https://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *   IBM Corporation - Various improvements
 ******************************************************************************/
/*eslint-env amd, browser, node */
define([
	'i18n!javascript/nls/messages',
	'orion/i18nUtil',
    'javascript/finder',
	'javascript/hover',
	'javascript/util',
	'orion/editor/templates',
	'acorn/dist/acorn'
], function(Messages, i18nUtil, Finder, Hover, Util, mTemplates, Acorn) {
	
	/**
	 * @description Parse the source to an ESTree AST
	 * @param {String} source The source
	 * @returns {Object} The AST
	 */
	function parse(source) {
		try {
			var ast = Acorn.parse(source, {
				ranges: true
			});
		} catch (e) {
			ast = Util.errorAST(e, '', source);
		}
		return ast;
	}
	
	var templates = [
		{
			prefix: "",
			name: "New file",  //$NON-NLS-0$
			description: "",
			template: '{\n'+ //$NON-NLS-1$
							'\t"plugins": {},\n'+ //$NON-NLS-1$
							'\t"libs": ["ecma5", "ecma6"],\n'+ //$NON-NLS-1$
							'\t"ecmaVersion": 6,\n'+ //$NON-NLS-1$
							'\t"loadEagerly": [\n\t\t\n\t]\n'+ //$NON-NLS-1$
					   '}',
			doc: Messages['emptyFileTemplateDoc'],
			url: "https://ternjs.net/doc/manual.html#configuration" //$NON-NLS-1$
		}
	];
	
	/**
	 * @description Collects the templates for the given prefix
	 * @param {String} prefix The prefix or the empty string
	 * @returns {Array.<mTemplates.Template>} The array of template objects
	 */
	function getTemplatesForPrefix(prefix) {
		var ts = [];
		templates.forEach(function(entry) {
			if(Util.looselyMatches(prefix, entry.prefix)) {
				var t = new mTemplates.Template(prefix, entry.description, entry.template, entry.name);
				if(entry.doc) {
					t.doc = entry.doc;
				}
				if(entry.url) {
					t.url = entry.url;
				}
				ts.push(t);
			}
		});
		return ts;
	} 
	
	/**
	 * @description Returns the Orion completion proposal from the given template and params
	 * @param {mTemplate.Template} template The template
	 * @param {Object} params The params
	 * @returns {Object} The Orion completion proposal
	 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#The_Proposal_object
	 */
	function getProposalFromTemplate(template, params) {
		var proposal = template.getProposal(params.prefix, params.offset, params);
		var _h;
		if(template.doc) {
			_h = Hover.formatMarkdownHover(template.doc);
		} else {
			_h = Object.create(null);
	        _h.type = 'markdown'; //$NON-NLS-1$
	        _h.content = Messages['templateHoverHeader'];
	        _h.content += proposal.proposal;
        }
        if(template.url) {
	        _h.content += i18nUtil.formatMessage.call(null, Messages['onlineDocumentationProposalEntry'], template.url);
	    }
        proposal.hover = _h;
        proposal.style = 'emphasis'; //$NON-NLS-1$
		removePrefix(params.prefix, proposal);
		proposal.kind = 'js'; //$NON-NLS-1$
		return proposal;
	}
	
	/**
	 * @description Remove the prefix from the proposal
	 * @param {String} prefix the prefix to remove
	 * @param {Object} proposal The proposal to remove the prefix from
	 */
	function removePrefix(prefix, proposal) {
		var overwrite = proposal.overwrite = proposal.proposal.substring(0, prefix.length) !== prefix;
		if (!overwrite) {
			proposal.proposal = proposal.proposal.substring(prefix.length);
		}
	}
	
	/**
	 * @description Computes completion proposals for the given source and parameters
	 * @param {source} source The source
	 * @param {Object} params The parameters from the Orion API callback
	 * @returns {Array.<Object>} returns
	 * @since 11.0
	 */
	function getProposals(source, params) {
		var proposals = [];
		if(source.trim().length === 0) {
			var _templates = getTemplatesForPrefix(params.prefix);
			_templates.forEach(function(_template) {
				proposals.push(getProposalFromTemplate(_template, params));
			});
		} else {
			var src = "var v="+source; //$NON-NLS-1$
			var ast = parse(src);
			var node = Finder.findNode(params.offset, ast, {parents:true});
			if(node) {
				//TODO we don't currently have deep enough recovery support for object expressions and properties to have this work
			}
		}
		return proposals;
	}
	
	return {
		getProposals: getProposals
	};
});
