/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
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

], function() {
	/* eslint-disable missing-nls */
	// Scraped from http://www.w3.org/TR/html4/index/attributes.html
	// and http://www.w3.org/TR/html5/obsolete.html#non-conforming-features
	// Microdata deprecated attributes (itemid, itemprop, itemref, itemscope, and itemtype) determined from http://manu.sporny.org/2013/microdata-downward-spiral/
	var deprecated = Object.create(null);
	deprecated.global = Object.create(null);
	deprecated.global.itemid = "HTML 5";
	deprecated.global.itemprop = "HTML 5";
	deprecated.global.itemref = "HTML 5";
	deprecated.global.itemscope = "HTML 5";
	deprecated.global.itemtype = "HTML 5";
	deprecated.a = Object.create(null);
	deprecated.a.charset = "HTML 5";
	deprecated.a.coords = "HTML 5";
	deprecated.a.datafld = "HTML 5";
	deprecated.a.datasrc = "HTML 5";
	deprecated.a.methods = "HTML 5";
	deprecated.a.shape = "HTML 5";
	deprecated.a.urn = "HTML 5";
	deprecated.applet = Object.create(null);
	deprecated.applet.align = "HTML 4.01";
	deprecated.applet.alt = "HTML 4.01";
	deprecated.applet.archive = "HTML 4.01";
	deprecated.applet.code = "HTML 4.01";
	deprecated.applet.codebase = "HTML 4.01";
	deprecated.applet.datafld = "HTML 5";
	deprecated.applet.datasrc = "HTML 5";
	deprecated.applet.height = "HTML 4.01";
	deprecated.applet.hspace = "HTML 4.01";
	deprecated.applet.name = "HTML 4.01";
	deprecated.applet.object = "HTML 4.01";
	deprecated.applet.vspace = "HTML 4.01";
	deprecated.applet.width = "HTML 4.01";
	deprecated.area = Object.create(null);
	deprecated.area.nohref = "HTML 5";
	deprecated.basefont = Object.create(null);
	deprecated.basefont.color = "HTML 4.01";
	deprecated.basefont.face = "HTML 4.01";
	deprecated.basefont.size = "HTML 4.01";
	deprecated.body = Object.create(null);
	deprecated.body.alink = "HTML 5";
	deprecated.body.background = "HTML 5";
	deprecated.body.bgcolor = "HTML 5";
	deprecated.body.link = "HTML 5";
	deprecated.body.marginbottom = "HTML 5";
	deprecated.body.marginheight = "HTML 5";
	deprecated.body.marginleft = "HTML 5";
	deprecated.body.marginright = "HTML 5";
	deprecated.body.margintop = "HTML 5";
	deprecated.body.marginwidth = "HTML 5";
	deprecated.body.text = "HTML 5";
	deprecated.body.vlink = "HTML 5";
	deprecated.br = Object.create(null);
	deprecated.br.clear = "HTML 5";
	deprecated.button = Object.create(null);
	deprecated.button.datafld = "HTML 5";
	deprecated.button.dataformatas = "HTML 5";
	deprecated.button.datasrc = "HTML 5";
	deprecated.caption = Object.create(null);
	deprecated.caption.align = "HTML 5";
	deprecated.col = Object.create(null);
	deprecated.col.align = "HTML 5";
	deprecated.col.char = "HTML 5";
	deprecated.col.charoff = "HTML 5";
	deprecated.col.valign = "HTML 5";
	deprecated.col.width = "HTML 5";
	deprecated.dir = Object.create(null);
	deprecated.dir.compact = "HTML 4.01";
	deprecated.div = Object.create(null);
	deprecated.div.align = "HTML 5";
	deprecated.div.datafld = "HTML 5";
	deprecated.div.dataformatas = "HTML 5";
	deprecated.div.datasrc = "HTML 5";
	deprecated.dl = Object.create(null);
	deprecated.dl.compact = "HTML 5";
	deprecated.embed = Object.create(null);
	deprecated.embed.align = "HTML 5";
	deprecated.embed.hspace = "HTML 5";
	deprecated.embed.name = "HTML 5";
	deprecated.embed.vspace = "HTML 5";
	deprecated.fieldset = Object.create(null);
	deprecated.fieldset.datafld = "HTML 5";
	deprecated.font = Object.create(null);
	deprecated.font.color = "HTML 4.01";
	deprecated.font.face = "HTML 4.01";
	deprecated.font.size = "HTML 4.01";
	deprecated.form = Object.create(null);
	deprecated.form.accept = "HTML 5";
	deprecated.frame = Object.create(null);
	deprecated.frame.datafld = "HTML 5";
	deprecated.frame.datasrc = "HTML 5";
	deprecated.h1 = Object.create(null);
	deprecated.h1.align = "HTML 4.01";
	deprecated.h2 = Object.create(null);
	deprecated.h2.align = "HTML 4.01";
	deprecated.h3 = Object.create(null);
	deprecated.h3.align = "HTML 4.01";
	deprecated.h4 = Object.create(null);
	deprecated.h4.align = "HTML 4.01";
	deprecated.h5 = Object.create(null);
	deprecated.h5.align = "HTML 4.01";
	deprecated.h6 = Object.create(null);
	deprecated.h6.align = "HTML 4.01";
	deprecated.head = Object.create(null);
	deprecated.head.profile = "HTML 5";
	deprecated.hr = Object.create(null);
	deprecated.hr.align = "HTML 5";
	deprecated.hr.color = "HTML 5";
	deprecated.hr.noshade = "HTML 5";
	deprecated.hr.size = "HTML 5";
	deprecated.hr.width = "HTML 5";
	deprecated.html = Object.create(null);
	deprecated.html.version = "HTML 5";
	deprecated.iframe = Object.create(null);
	deprecated.iframe.align = "HTML 5";
	deprecated.iframe.allowtransparency = "HTML 5";
	deprecated.iframe.datafld = "HTML 5";
	deprecated.iframe.datasrc = "HTML 5";
	deprecated.iframe.frameborder = "HTML 5";
	deprecated.iframe.hspace = "HTML 5";
	deprecated.iframe.marginheight = "HTML 5";
	deprecated.iframe.marginwidth = "HTML 5";
	deprecated.iframe.scrolling = "HTML 5";
	deprecated.iframe.vspace = "HTML 5";
	deprecated.img = Object.create(null);
	deprecated.img.align = "HTML 5";
	deprecated.img.border = "HTML 4.01";
	deprecated.img.datafld = "HTML 5";
	deprecated.img.datasrc = "HTML 5";
	deprecated.img.hspace = "HTML 5";
	deprecated.img.lowsrc = "HTML 5";
	deprecated.img.name = "HTML 5";
	deprecated.img.vspace = "HTML 5";
	deprecated.input = Object.create(null);
	deprecated.input.align = "HTML 5";
	deprecated.input.datafld = "HTML 5";
	deprecated.input.dataformatas = "HTML 5";
	deprecated.input.datasrc = "HTML 5";
	deprecated.input.hspace = "HTML 5";
	deprecated.input.ismap = "HTML 5";
	deprecated.input.usemap = "HTML 5";
	deprecated.input.vspace = "HTML 5";
	deprecated.isindex = Object.create(null);
	deprecated.isindex.prompt = "HTML 4.01";
	deprecated.label = Object.create(null);
	deprecated.label.datafld = "HTML 5";
	deprecated.label.dataformatas = "HTML 5";
	deprecated.label.datasrc = "HTML 5";
	deprecated.legend = Object.create(null);
	deprecated.legend.align = "HTML 5";
	deprecated.legend.datafld = "HTML 5";
	deprecated.legend.dataformatas = "HTML 5";
	deprecated.legend.datasrc = "HTML 5";
	deprecated.li = Object.create(null);
	deprecated.li.type = "HTML 5";
	deprecated.li.value = "HTML 4.01";
	deprecated.link = Object.create(null);
	deprecated.link.charset = "HTML 5";
	deprecated.link.methods = "HTML 5";
	deprecated.link.target = "HTML 5";
	deprecated.link.urn = "HTML 5";
	deprecated.marquee = Object.create(null);
	deprecated.marquee.datafld = "HTML 5";
	deprecated.marquee.dataformatas = "HTML 5";
	deprecated.marquee.datasrc = "HTML 5";
	deprecated.menu = Object.create(null);
	deprecated.menu.compact = "HTML 4.01";
	deprecated.meta = Object.create(null);
	deprecated.meta.scheme = "HTML 5";
	deprecated.object = Object.create(null);
	deprecated.object.align = "HTML 5";
	deprecated.object.archive = "HTML 5";
	deprecated.object.border = "HTML 5";
	deprecated.object.classid = "HTML 5";
	deprecated.object.code = "HTML 5";
	deprecated.object.codebase = "HTML 5";
	deprecated.object.codetype = "HTML 5";
	deprecated.object.datafld = "HTML 5";
	deprecated.object.dataformatas = "HTML 5";
	deprecated.object.datasrc = "HTML 5";
	deprecated.object.declare = "HTML 5";
	deprecated.object.hspace = "HTML 5";
	deprecated.object.standby = "HTML 5";
	deprecated.object.vspace = "HTML 5";
	deprecated.ol = Object.create(null);
	deprecated.ol.compact = "HTML 5";
	deprecated.ol.start = "HTML 4.01";
	deprecated.ol.type = "HTML 4.01";
	deprecated.option = Object.create(null);
	deprecated.option.dataformatas = "HTML 5";
	deprecated.option.datasrc = "HTML 5";
	deprecated.option.name = "HTML 5";
	deprecated.p = Object.create(null);
	deprecated.p.align = "HTML 5";
	deprecated.param = Object.create(null);
	deprecated.param.datafld = "HTML 5";
	deprecated.param.type = "HTML 5";
	deprecated.param.valuetype = "HTML 5";
	deprecated.pre = Object.create(null);
	deprecated.pre.width = "HTML 5";
	deprecated.script = Object.create(null);
	deprecated.script.event = "HTML 5";
	deprecated.script.for = "HTML 5";
	deprecated.script.language = "HTML 4.01";
	deprecated.select = Object.create(null);
	deprecated.select.datafld = "HTML 5";
	deprecated.select.dataformatas = "HTML 5";
	deprecated.select.datasrc = "HTML 5";
	deprecated.span = Object.create(null);
	deprecated.span.datafld = "HTML 5";
	deprecated.span.dataformatas = "HTML 5";
	deprecated.span.datasrc = "HTML 5";
	deprecated.table = Object.create(null);
	deprecated.table.align = "HTML 5";
	deprecated.table.background = "HTML 5";
	deprecated.table.bgcolor = "HTML 5";
	deprecated.table.bordercolor = "HTML 5";
	deprecated.table.cellpadding = "HTML 5";
	deprecated.table.cellspacing = "HTML 5";
	deprecated.table.dataformatas = "HTML 5";
	deprecated.table.datapagesize = "HTML 5";
	deprecated.table.datasrc = "HTML 5";
	deprecated.table.frame = "HTML 5";
	deprecated.table.rules = "HTML 5";
	deprecated.table.summary = "HTML 5";
	deprecated.table.width = "HTML 5";
	deprecated.tbody = Object.create(null);
	deprecated.tbody.align = "HTML 5";
	deprecated.tbody.background = "HTML 5";
	deprecated.tbody.char = "HTML 5";
	deprecated.tbody.charoff = "HTML 5";
	deprecated.tbody.valign = "HTML 5";
	deprecated.td = Object.create(null);
	deprecated.td.align = "HTML 5";
	deprecated.td.axis = "HTML 5";
	deprecated.td.background = "HTML 5";
	deprecated.td.bgcolor = "HTML 5";
	deprecated.td.char = "HTML 5";
	deprecated.td.charoff = "HTML 5";
	deprecated.td.height = "HTML 5";
	deprecated.td.nowrap = "HTML 5";
	deprecated.td.scope = "HTML 5";
	deprecated.td.valign = "HTML 5";
	deprecated.td.width = "HTML 5";
	deprecated.textarea = Object.create(null);
	deprecated.textarea.datafld = "HTML 5";
	deprecated.textarea.datasrc = "HTML 5";
	deprecated.tfoot = Object.create(null);
	deprecated.tfoot.align = "HTML 5";
	deprecated.tfoot.background = "HTML 5";
	deprecated.tfoot.char = "HTML 5";
	deprecated.tfoot.charoff = "HTML 5";
	deprecated.tfoot.valign = "HTML 5";
	deprecated.th = Object.create(null);
	deprecated.th.align = "HTML 5";
	deprecated.th.axis = "HTML 5";
	deprecated.th.background = "HTML 5";
	deprecated.th.bgcolor = "HTML 5";
	deprecated.th.char = "HTML 5";
	deprecated.th.charoff = "HTML 5";
	deprecated.th.height = "HTML 5";
	deprecated.th.nowrap = "HTML 5";
	deprecated.th.valign = "HTML 5";
	deprecated.th.width = "HTML 5";
	deprecated.thead = Object.create(null);
	deprecated.thead.align = "HTML 5";
	deprecated.thead.background = "HTML 5";
	deprecated.thead.char = "HTML 5";
	deprecated.thead.charoff = "HTML 5";
	deprecated.thead.valign = "HTML 5";
	deprecated.tr = Object.create(null);
	deprecated.tr.align = "HTML 5";
	deprecated.tr.background = "HTML 5";
	deprecated.tr.bgcolor = "HTML 5";
	deprecated.tr.char = "HTML 5";
	deprecated.tr.charoff = "HTML 5";
	deprecated.tr.valign = "HTML 5";
	deprecated.ul = Object.create(null);
	deprecated.ul.compact = "HTML 5";
	deprecated.ul.type = "HTML 5";
	
	/**
	 * @description Returns the version in which the given attribute is deprecated for the given element tag or <code>null</code> if it is not deprecated.
	 * @param {String} tagName The name of the element tag
	 * @param {String} attributeName The name of the attribute
	 * @returns {String} The version in which the attribute is deprecated or <code>null</code> if it is not deprecated.
	 * @since 10.0
	 */
	function isAttributeDeprecated(tagName, attributeName) {
		var dep = deprecated[tagName];
		if (dep){
			dep = dep[attributeName];
			if (dep){
				return dep;
			}
		}
		dep = deprecated.global[attributeName];
		if (dep){
			return dep;
		}
		return null;
	}
	
	return {
		isAttributeDeprecated: isAttributeDeprecated
	};
});
