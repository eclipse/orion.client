/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/plugin',
'orion/serviceregistry',
'javascript/scriptResolver',
'webtools/htmlAstManager',
'webtools/htmlHover',
'webtools/htmlContentAssist',
'webtools/htmlOccurrences',
'webtools/htmlOutliner',
'webtools/htmlValidator',
'orion/editor/stylers/text_html/syntax',
'webtools/cssContentAssist',
'webtools/cssValidator',
'webtools/cssOutliner',
'webtools/cssHover',
'webtools/cssQuickFixes',
'webtools/cssResultManager',
'orion/editor/stylers/text_css/syntax',
'i18n!webtools/nls/messages',
'webtools/htmlFormatter',
'webtools/cssFormatter',
'webtools/htmlRename',
'orion/util'
], function(PluginProvider, mServiceRegistry, ScriptResolver, HtmlAstManager, htmlHover, htmlContentAssist, htmlOccurrences, htmlOutliner, htmlValidator,
            mHTML, cssContentAssist, mCssValidator, mCssOutliner, cssHover, cssQuickFixes, cssResultManager, mCSS, messages, HtmlFormatter, CssFormatter,
            RenameCommand, Util) {

	/**
	 * Plug-in headers
	 */
	var headers = {
		name: messages["pluginName"],
		version: "1.0", //$NON-NLS-1$
		description: messages["pluginDescription"]
	};
	var serviceRegistry = new mServiceRegistry.ServiceRegistry();
	var provider = new PluginProvider(headers, serviceRegistry);

    	/**
    	 * Register the content types: HTML, CSS
    	 */
    	provider.registerServiceProvider("orion.core.contenttype", {}, { //$NON-NLS-1$
    		contentTypes: [
    			{	id: "text/html", //$NON-NLS-1$
    				"extends": "text/plain", //$NON-NLS-1$ //$NON-NLS-1$
    				name: "HTML", //$NON-NLS-1$
    				extension: ["html", "htm"], //$NON-NLS-1$ //$NON-NLS-2$
    				imageClass: "file-sprite-html modelDecorationSprite" //$NON-NLS-1$
    			},
    			{	id: "text/css", //$NON-NLS-1$
    				"extends": "text/plain", //$NON-NLS-1$ //$NON-NLS-1$
    				name: "CSS", //$NON-NLS-1$
    				extension: ["css"], //$NON-NLS-1$
    				imageClass: "file-sprite-css modelDecorationSprite" //$NON-NLS-1$
    			}
    		]
    	});
        var cssResultMgr = new cssResultManager(serviceRegistry);
        var htmlAstManager = new HtmlAstManager.HtmlAstManager(serviceRegistry);

    	/**
    	 * Register result manager as model changed listener
    	 */
    	provider.registerService("orion.edit.model", {  //$NON-NLS-1$
    		onModelChanging: cssResultMgr.onModelChanging.bind(cssResultMgr),
    		onInputChanged: cssResultMgr.onInputChanged.bind(cssResultMgr)
    	},
    	{
    		contentType: ["text/css", "text/html"],  //$NON-NLS-1$ //$NON-NLS-2$
    		types: ["ModelChanging", 'Destroy', 'onSaving', 'onInputChanged']  //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$
    	});
    	
    	/**
    	 * Register result manager as pref manager
    	 */
    	provider.registerService("orion.cm.managedservice", cssResultMgr, { //$NON-NLS-1$
    		pid: 'csslint.config.potential'  //$NON-NLS-1$
    	});
    	provider.registerService("orion.cm.managedservice", cssResultMgr, { //$NON-NLS-1$
    		pid: 'csslint.config.compat'  //$NON-NLS-1$
    	});
    	provider.registerService("orion.cm.managedservice", cssResultMgr, { //$NON-NLS-1$
    		pid: 'csslint.config.perf'  //$NON-NLS-1$
    	});
    	
    	/**
    	 * Register AST manager as Model Change listener
    	 */
    	provider.registerService("orion.edit.model", {  //$NON-NLS-1$
    		onModelChanging: htmlAstManager.onModelChanging.bind(htmlAstManager),
    		onInputChanged: htmlAstManager.onInputChanged.bind(htmlAstManager)
    	},
    	{
    		contentType: ["text/html"],  //$NON-NLS-1$
    		types: ["ModelChanging", 'Destroy', 'onSaving', 'onInputChanged']  //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$
    	});

    	/**
    	 * Register validators
    	 */
    	provider.registerService(["orion.edit.validator", "orion.cm.managedservice"], new htmlValidator(htmlAstManager), //$NON-NLS-1$ //$NON-NLS-2$
    		{
    			contentType: ["text/html"], //$NON-NLS-1$
    			pid: 'htmllint.config' //$NON-NLS-1$
    		}
    	);
    	provider.registerService(["orion.edit.validator", "orion.cm.managedservice"], new mCssValidator(cssResultMgr), //$NON-NLS-1$ //$NON-NLS-2$
    		{
    			contentType: ["text/css", "text/html"], //$NON-NLS-1$ //$NON-NLS-2$
    		}
    	);

    	/**
    	 * Register content assist providers
    	 */
    	provider.registerService("orion.edit.contentassist", //$NON-NLS-1$
    		new htmlContentAssist.HTMLContentAssistProvider(htmlAstManager),
    		{	name: messages['htmlContentAssist'],
    			contentType: ["text/html"], //$NON-NLS-1$
    			charTriggers: "<",
    			excludedStyles: "(comment.*|string.*)" //$NON-NLS-1$
    		}
    	);
    	 provider.registerService("orion.edit.contentassist", //$NON-NLS-1$
    		new cssContentAssist.CssContentAssistProvider(cssResultMgr),
    		{	name: messages["cssContentAssist"],
    			contentType: ["text/css", "text/html"] //$NON-NLS-1$ //$NON-NLS-2$
    		}
    	);

		var occurrences = new htmlOccurrences.HTMLOccurrences(htmlAstManager);
	  	/**
    	 * Register occurrence providers
    	 */
    	provider.registerService("orion.edit.occurrences", //$NON-NLS-1$
    		occurrences,
    		{
    			contentType: ["text/html"] //$NON-NLS-1$
    		}
    	);

		var renameCommand = new RenameCommand.RenameCommand(occurrences);
		provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
			renameCommand, {
				name: messages.htmlRenameCommand,
				tooltip: messages.htmlRenameCommandDescription,
				id: "rename.html.element", //$NON-NLS-1$
				key: ['W', false, true, !Util.isMac, Util.isMac], //$NON-NLS-1$
				contentType: ['text/html'] //$NON-NLS-1$
			}
		);
    	/**
    	* Register outliners
    	*/
    	provider.registerService("orion.edit.outliner", new htmlOutliner.HtmlOutliner(htmlAstManager), //$NON-NLS-1$
    		{
    			id: "orion.webtools.html.outliner", //$NON-NLS-1$
    			name: messages["htmlOutline"],
    			contentType: ["text/html"] //$NON-NLS-1$
    		});

    	provider.registerService("orion.edit.outliner", new mCssOutliner.CssOutliner(),  //$NON-NLS-1$
    		{
    			id: "orion.outline.css.outliner", //$NON-NLS-1$
    			name: messages["cssOutline"],
    			contentType: ["text/css"] //$NON-NLS-1$
    		});

    	/**
    	 * Register syntax styling
    	 */
    	var newGrammars = {};
    	mCSS.grammars.forEach(function(current){
    		newGrammars[current.id] = current;
    	});
    	mHTML.grammars.forEach(function(current){
    		newGrammars[current.id] = current;
    	});
    	for (var current in newGrammars) {
    	    if (newGrammars.hasOwnProperty(current)) {
       			provider.registerService("orion.edit.highlighter", {}, newGrammars[current]); //$NON-NLS-1$
      		}
        }

        var resolver = new ScriptResolver.ScriptResolver(serviceRegistry);

        /**
    	 * Register the hover support
    	 */
    	provider.registerService("orion.edit.hover", new cssHover.CSSHover(resolver, cssResultMgr),  //$NON-NLS-1$
    		{
    		    name: messages['cssHover'],
    			contentType: ["text/css", "text/html"]	//$NON-NLS-1$ //$NON-NLS-2$
    	});

    	/**
    	 * Register the hover support
    	 */
    	provider.registerService("orion.edit.hover", new htmlHover.HTMLHover(htmlAstManager, resolver),  //$NON-NLS-1$
    		{
    		    name: messages['htmlHover'],
    			contentType: ["text/html"]	//$NON-NLS-1$
    	});

    	/**
    	 * Register quick fixes as editor commands
    	 */
    	var cssQuickFixComputer = new cssQuickFixes.CssQuickFixes();
    	
    	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		{
			/** @callback */
			execute: function(editorContext, context) {
				context.annotation.fixid = 'ignore-on-line'; //$NON-NLS-1$
				return cssQuickFixComputer.execute(editorContext, context);
			}
		},
		{
			name: messages["quickfix-ignore-on-line"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "css.ignore.on-line.fix", //$NON-NLS-1$
			contentType: ['text/css', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:.*\\S.*)$" //$NON-NLS-1$
				},
				{
					source: "annotation:data:cssRuleId", //$NON-NLS-1$
					match: "^(?:.*\\S.*)$" //$NON-NLS-1$
				},
				{
					source: "annotation:data:ruleSource", //$NON-NLS-1$
					match: "css" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
		);
		
    	provider.registerServiceProvider("orion.edit.command",  //$NON-NLS-1$
    		cssQuickFixComputer,
    		{
	    		name: messages["quickfix-empty-rules"],
	    		scopeId: "orion.edit.quickfix", //$NON-NLS-1$
	    		id : "quickfix-empty-rules",  //$NON-NLS-1$
	    		contentType: ['text/css','text/html'],  //$NON-NLS-1$ //$NON-NLS-2$
	    		validationProperties: [
    				{source: "annotation:id", match: "empty-rules"},//$NON-NLS-1$ //$NON-NLS-2$
    				{source: "readonly", match: false} //$NON-NLS-1$
    		    ]
    		}
    	);
    	provider.registerServiceProvider("orion.edit.command",  //$NON-NLS-1$
    		cssQuickFixComputer,
    		{
	    		name: messages["quickfix-important"],
	    		scopeId: "orion.edit.quickfix", //$NON-NLS-1$
	    		id : "quickfix-important",  //$NON-NLS-1$
	    		contentType: ['text/css','text/html'],  //$NON-NLS-1$ //$NON-NLS-2$
	    		validationProperties: [
	    			{source: "annotation:end", match: "!0"}, //$NON-NLS-1$ //$NON-NLS-2$
    		    	{source: "annotation:id", match: "important"}, //$NON-NLS-1$ //$NON-NLS-2$
    				{source: "readonly", match: false} //$NON-NLS-1$
    		    ]
    		}
    	);
    	provider.registerServiceProvider("orion.edit.command",  //$NON-NLS-1$
    		cssQuickFixComputer,
    		{
	    		name: messages["quickfix-zero-units"],
	    		scopeId: "orion.edit.quickfix", //$NON-NLS-1$
	    		id : "quickfix-zero-units",  //$NON-NLS-1$
	    		contentType: ['text/css','text/html'],  //$NON-NLS-1$ //$NON-NLS-2$
	    		validationProperties: [
 		        	{source: "annotation:id", match: "zero-units"}, //$NON-NLS-1$ //$NON-NLS-2$
    				{source: "readonly", match: false} //$NON-NLS-1$
    		    ]
    		}
    	);

		var htmlFormatter = new HtmlFormatter.HtmlFormatter();
		provider.registerServiceProvider("orion.edit.format", //$NON-NLS-1$
			htmlFormatter,
			{
				contentType: ["text/html"], //$NON-NLS-1$
				id: "orion.format.html.formatter", //$NON-NLS-1$
				name: messages["htmlFormatter"],
			}
		);

		var cssFormatter = new CssFormatter.CssFormatter();
		provider.registerServiceProvider("orion.edit.format", //$NON-NLS-1$
			cssFormatter,
			{
				contentType: ["text/css"],//$NON-NLS-1$
				id: "orion.format.css.formatter", //$NON-NLS-1$
				name: messages["cssFormatter"],
			}
		);

		provider.registerService("orion.cm.managedservice", cssFormatter, {pid: 'jsbeautify.config.css'}); //$NON-NLS-1$ //$NON-NLS-2$

		// html formatter needs to listen to all formatting preference changes because html source can contain css and javascript
		provider.registerService("orion.cm.managedservice", htmlFormatter, {pid: 'jsbeautify.config.html'}); //$NON-NLS-1$ //$NON-NLS-2$
		provider.registerService("orion.cm.managedservice", htmlFormatter, {pid: 'jsbeautify.config.css'}); //$NON-NLS-1$ //$NON-NLS-2$
		provider.registerService("orion.cm.managedservice", htmlFormatter, {pid: 'jsbeautify.config.js'}); //$NON-NLS-1$ //$NON-NLS-2$

		/**
		 * CSS formatting settings
		 */
		var unix = "\n"; //$NON-NLS-1$
		var mac = "\r"; //$NON-NLS-1$
		var windows = "\n\r"; //$NON-NLS-1$
		var eof_characters = [
			{label: messages.indentation_unix,  value: unix},
			{label: messages.indentation_mac, value: mac},
			{label: messages.indentation_windows, value: windows}
		];

		var space = ' '; //$NON-NLS-1$
		var tab= '\t'; //$NON-NLS-1$
		var indentation_characters = [
			{label: messages.indentation_space,  value: space},
			{label: messages.indentation_tab,  value: tab},
		];
		var collapse_preserve_inline = 'collapse-preserve-inline'; //$NON-NLS-1$
		var collapse = 'collapse'; //$NON-NLS-1$
		var expand = 'expand'; //$NON-NLS-1$
		var end_expand = 'end-expand'; //$NON-NLS-1$
		var none = 'none'; //$NON-NLS-1$
		var brace_styles = [
			{ label: messages.collapse_preserve_inline , value: collapse_preserve_inline},
			{ label: messages.collapse , value: collapse},
			{ label: messages.expand , value: expand},
			{ label: messages.end_expand , value: end_expand},
			{ label: messages.none , value: none},
		];

		provider.registerServiceProvider("orion.core.setting", {}, { //$NON-NLS-1$
			settings: [
				{
					pid: 'jsbeautify.config.css', //$NON-NLS-1$
					name: messages['cssFormattingSettings'],
					tags: 'beautify css formatting'.split(' '), //$NON-NLS-1$
					category: 'cssFormatting', //$NON-NLS-1$
					categoryLabel: messages['cssFormatting'],
					properties: [
						{
							id: 'css_indent_size',  //$NON-NLS-1$
							name: messages['css_indent_size'],
							type: 'number', //$NON-NLS-1$
							defaultValue: 4
						},
						{
							id: 'css_indent_char',  //$NON-NLS-1$
							name: messages['css_indent_char'],
							type: 'string', //$NON-NLS-1$
							defaultValue: space,
							options: indentation_characters
						},
						{
							id: 'css_eol',  //$NON-NLS-1$
							name: messages['css_eol'],
							type: 'string', //$NON-NLS-1$
							defaultValue: unix,
							options: eof_characters
						},
						{
							id: 'css_end_with_newline',  //$NON-NLS-1$
							name: messages['css_end_with_newline'],
							type: 'boolean', //$NON-NLS-1$
							defaultValue: false
						},
						{
							id: 'selector_separator_newline',  //$NON-NLS-1$
							name: messages['selector_separator_newline'],
							type: 'boolean', //$NON-NLS-1$
							defaultValue: true
						},
						{
							id: 'newline_between_rules',  //$NON-NLS-1$
							name: messages['newline_between_rules'],
							type: 'boolean', //$NON-NLS-1$
							defaultValue: true
						},
						{
							id: 'space_around_selector_separator',  //$NON-NLS-1$
							name: messages['space_around_selector_separator'],
							type: 'boolean', //$NON-NLS-1$
							defaultValue: false
						}
					]
				}]
		});

		/**
		 * Html formatting settings
		 */
		var keep = 'keep'; //$NON-NLS-1$
		var separate = 'separate'; //$NON-NLS-1$
		var normal = 'normal'; //$NON-NLS-1$
		var indent_scripts_values = [
			{ label: messages.normal, value: normal},
			{ label: messages.keep, value: keep},
			{ label: messages.separate, value: separate},
		];
		var auto = 'auto'; //$NON-NLS-1$
		var force = 'force'; //$NON-NLS-1$
		var wrap_attributes_values = [
			{ label: messages.auto, value: auto},
			{ label: messages.force, value: force},
		];
		provider.registerServiceProvider("orion.core.setting", {}, { //$NON-NLS-1$
			settings: [
				{
					pid: 'jsbeautify.config.html', //$NON-NLS-1$
					name: messages['htmlFormattingOptions'],
					tags: 'beautify html formatting'.split(' '), //$NON-NLS-1$
					category: 'htmlFormatting', //$NON-NLS-1$
					categoryLabel: messages['htmlFormatting'],
					properties: [
						{
							id: 'html_indent_size',  //$NON-NLS-1$
							name: messages['html_indent_size'],
							type: 'number', //$NON-NLS-1$
							defaultValue: 4
						},
						{
							id: 'html_indent_char',  //$NON-NLS-1$
							name: messages['html_indent_char'],
							type: 'string', //$NON-NLS-1$
							defaultValue: space,
							options: indentation_characters
						},
						{
							id: 'html_eol',  //$NON-NLS-1$
							name: messages['html_eol'],
							type: 'string', //$NON-NLS-1$
							defaultValue: unix,
							options: eof_characters
						},
						{
							id: 'html_end_with_newline',  //$NON-NLS-1$
							name: messages['html_end_with_newline'],
							type: 'boolean', //$NON-NLS-1$
							defaultValue: false
						},
						{
							id: 'html_preserve_new_lines',  //$NON-NLS-1$
							name: messages['html_preserve_new_lines'],
							type: 'boolean', //$NON-NLS-1$
							defaultValue: true
						},
						{
							id: 'html_max_preserve_new_lines',  //$NON-NLS-1$
							name: messages['html_max_preserve_new_lines'],
							type: 'number', //$NON-NLS-1$
							defaultValue: 32786
						},
						{
							id: 'html_brace_style',  //$NON-NLS-1$
							name: messages['html_brace_style'],
							type: 'boolean', //$NON-NLS-1$
							defaultValue: collapse,
							options: brace_styles
						},
						{
							id: 'html_wrap_line_length',  //$NON-NLS-1$
							name: messages['html_wrap_line_length'],
							type: 'number', //$NON-NLS-1$
							defaultValue: 0
						},
						{
							id: 'indent_inner_html',  //$NON-NLS-1$
							name: messages['indent_inner_html'],
							type: 'boolean', //$NON-NLS-1$
							defaultValue: false
						},
						{
							id: 'indent_handlebars',  //$NON-NLS-1$
							name: messages['indent_handlebars'],
							type: 'boolean', //$NON-NLS-1$
							defaultValue: false
						},
						{
							id: 'wrap_attributes',  //$NON-NLS-1$
							name: messages['wrap_attributes'],
							type: 'string', //$NON-NLS-1$
							defaultValue: 'auto', //$NON-NLS-1$
							options: wrap_attributes_values
						},
						{
							id: 'wrap_attributes_indent_size',  //$NON-NLS-1$
							name: messages['wrap_attributes_indent_size'],
							type: 'number', //$NON-NLS-1$
							defaultValue: 1
						},
						{
							id: 'extra_liners',  //$NON-NLS-1$
							name: messages['extra_liners'],
							type: 'string', //$NON-NLS-1$
							defaultValue: 'head,body,html' //$NON-NLS-1$
						},
						{
							id: 'indent-scripts',  //$NON-NLS-1$
							name: messages['indent_scripts'],
							type: 'string', //$NON-NLS-1$
							defaultValue: normal,
							options: indent_scripts_values
						}
					]
				}]
		});

    	/**
    	 * HTML validation settings
    	 */
    	var ignore = 0, 
    		warning = 1, 
    		error = 2, 
    		info = 3,
    		severities = [
    		{label: messages.ignore,  value: ignore},
    		{label: messages.info,   value: info},
    		{label: messages.warning, value: warning},
    		{label: messages.error,   value: error}
    	];
    	provider.registerService("orion.core.setting",  //$NON-NLS-1$
    		{},
    		{	settings: [
    				{	pid: "htmllint.config",  //$NON-NLS-1$
    					name: messages["htmlValidator"],
    					tags: "validation webtools html htmllint".split(" "),  //$NON-NLS-1$  //$NON-NLS-1$
    					category: "html",  //$NON-NLS-1$
    					categoryLabel: messages["html"],
    					properties: [
    						{
    							id: "validate_attr_bans", //$NON-NLS-1$
    							name: messages["attr_bans"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_attr_no_dup", //$NON-NLS-1$
    							name: messages["attr_no_dup"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: info,
    							options: severities
    						},
    						{
    							id: "validate_fig_req_figcaption", //$NON-NLS-1$
    							name: messages["fig_req_figcaption"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: info,
    							options: severities
    						},
    						{
    							id: "validate_img_req_alt", //$NON-NLS-1$
    							name: messages["img_req_alt"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: info,
    							options: severities
    						},
    						{
    							id: "validate_tag_close", //$NON-NLS-1$
    							name: messages["tag_close"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: info,
    							options: severities
    						}]
    				}]
    		}
    	);
    	
    	/**
    	 * CSSLint settings
    	 */
    	provider.registerService("orion.core.setting",  //$NON-NLS-1$
    		{},
    		{	settings: [
    				{	pid: "csslint.config.potential",  //$NON-NLS-1$
    					name: messages["csslintValidatorPotential"],
    					tags: "validation webtools css csslint".split(" "),  //$NON-NLS-1$
    					category: "css",  //$NON-NLS-1$
    					categoryLabel: messages["css"],
    					properties: [
    						{
    							id: "validate_box_model", //$NON-NLS-1$
    							name: messages["box-model"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_display_property_grouping", //$NON-NLS-1$
    							name: messages["display-property-grouping"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: info,
    							options: severities
    						},
    						{
    							id: "validate_duplicate_properties", //$NON-NLS-1$
    							name: messages["duplicate-properties"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: info,
    							options: severities
    						},
    						{
    							id: "validate_empty_rules", //$NON-NLS-1$
    							name: messages["empty-rules"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: info,
    							options: severities
    						},
    						{
    							id: "validate_known_properties", //$NON-NLS-1$
    							name: messages["known-properties"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: warning,
    							options: severities
    						},
    						{
    							id: "validate_outline_none", //$NON-NLS-1$
    							name: messages["outline-none"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: info,
    							options: severities
    						},
    						{
    							id: "validate_text_indent", //$NON-NLS-1$
    							name: messages["text-indent"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: info,
    							options: severities
    						},
    					]
    				},
    				{	pid: "csslint.config.compat",  //$NON-NLS-1$
    					name: messages["csslintValidatorCompat"],
    					tags: "validation webtools css csslint".split(" "),  //$NON-NLS-1$  //$NON-NLS-1$
    					category: "css",  //$NON-NLS-1$
    					categoryLabel: messages["css"],
    					properties: [
    						{
    							id: "validate_adjoining_classes", //$NON-NLS-1$
    							name: messages["adjoining-classes"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_box_sizing", //$NON-NLS-1$
    							name: messages["box-sizing"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_bulletproof_font_face", //$NON-NLS-1$
    							name: messages["bulletproof-font-face"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_compatible_vendor_prefixes", //$NON-NLS-1$
    							name: messages["compatible-vendor-prefixes"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: info,
    							options: severities
    						},
    						{
    							id: "validate_fallback_colors", //$NON-NLS-1$
    							name: messages["fallback-colors"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_gradients", //$NON-NLS-1$
    							name: messages["gradients"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: info,
    							options: severities
    						},
    						{
    							id: "validate_qualified_headings", //$NON-NLS-1$
    							name: messages["qualified-headings"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_selector_max_approaching", //$NON-NLS-1$
    							name: messages["selector-max-approaching"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_selector_max", //$NON-NLS-1$
    							name: messages["selector-max"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: info,
    							options: severities
    						},
    						{
    							id: "validate_star_property_hack", //$NON-NLS-1$
    							name: messages["star-property-hack"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_underscore_property_hack", //$NON-NLS-1$
    							name: messages["underscore-property-hack"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_unique_headings", //$NON-NLS-1$
    							name: messages["unique-headings"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_vendor_prefix", //$NON-NLS-1$
    							name: messages["vendor-prefix"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: info,
    							options: severities
    						}
    					]
    				},
    				{	pid: "csslint.config.perf",  //$NON-NLS-1$
    					name: messages["csslintValidatorPerf"],
    					tags: "validation webtools css csslint".split(" "),  //$NON-NLS-1$  //$NON-NLS-1$
    					category: "css",  //$NON-NLS-1$
    					categoryLabel: messages["css"],
    					properties: [
    						{
    							id: "validate_duplicate_background_images", //$NON-NLS-1$
    							name: messages["duplicate-background-images"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_floats", //$NON-NLS-1$
    							name: messages["floats"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_font_faces", //$NON-NLS-1$
    							name: messages["font-faces"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_font_sizes", //$NON-NLS-1$
    							name: messages["font-sizes"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_ids", //$NON-NLS-1$
    							name: messages["ids"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_imports", //$NON-NLS-1$
    							name: messages["import"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_important", //$NON-NLS-1$
    							name: messages["important"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_order_alphabetical", //$NON-NLS-1$
    							name: messages["order-alphabetical"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_overqualified_elements", //$NON-NLS-1$
    							name: messages["overqualified-elements"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_regex_selectors", //$NON-NLS-1$
    							name: messages["regex-selectors"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_rules_count", //$NON-NLS-1$
    							name: messages["rules-count"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_shorthand", //$NON-NLS-1$
    							name: messages["shorthand"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_universal_selector", //$NON-NLS-1$
    							name: messages["universal-selector"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_unqualified_attributes", //$NON-NLS-1$
    							name: messages["unqualified-attributes"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						},
    						{
    							id: "validate_zero_units", //$NON-NLS-1$
    							name: messages["zero-units"],
    							type: "number", //$NON-NLS-1$
    							defaultValue: ignore,
    							options: severities
    						}]
    				}
    			]
    		}
		);


    	provider.connect(function() {
			var fc = serviceRegistry.getService("orion.core.file.client"); //$NON-NLS-1$
	    	fc.addEventListener("Changed", htmlAstManager.onFileChanged.bind(htmlAstManager));
 		});
});
