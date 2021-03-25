/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (https://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (https://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/* eslint-env amd */
define([

], function() {
	/* eslint-disable missing-nls */
	var attributes = Object.create(null);
	/*
	 * ADDED MISSING TAGS
	 * - xmlns
	 */
	attributes.globals = [
			{
				name: "accesskey",
				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/accesskey",
				doc: "Provides a hint for generating a keyboard shortcut for the current element. This attribute consists of a space-separated list of characters. The browser should use the first one that exists on the computer keyboard layout."
			},
			{
 				name: "class",
 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class",
 				doc: "Is a space-separated list of the classes of the element. Classes allows CSS and JavaScript to select and access specific elements via the class selectors or functions like the method Document.getElementsByClassName()."
 			},
 			{
 				name: "contenteditable",
 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable",
 				doc: "Is an enumerated attribute indicating if the element should be editable by the user. If so, the browser modifies its widget to allow editing.",
				values: [
					{name: "true", doc: "(or empty string) indicates that the element must be editable"},
					{name: "false", doc: "the element must not be editable"}
				]
			},
 			{
 				name: "contextmenu",
 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contextmenu",
 				doc: "Is the id of an <menu> to use as the contextual menu for this element."
 			},
 			{
 				name: "dataset",
 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/data-*",
 				doc: "Forms a class of attributes, called custom data attributes, that allow proprietary information to be exchanged between the HTML and its DOM representation that may be used by scripts. All such custom data are available via the HTMLElement interface of the element the attribute is set on. The HTMLElement.dataset property gives access to them."
 			},
 			{
 				name: "dir",
 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir",
 				doc: "Is an enumerated attribute indicating the directionality of the element's text.",
				values: [
					{name: "ltr", doc: "means left to right and is to be used for languages that are written from the left to the right (like English)"},
					{name: "rtl", doc: "means right to left and is to be used for languages that are written from the right to the left (like Arabic)"},
					{name: "auto", doc: "lets the user agent decide. It uses a basic algorithm as it parses the characters inside the element until it finds a character with a strong directionality, then apply that directionality to the whole element"}
				]
			},
 			{
 				name: "draggable",
 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/draggable",
 				doc: "Is an enumerated attribute indicating whether the element can be dragged, using the Drag and Drop API.",
				values: [
					{name: "true", doc: "the element may be dragged"},
					{name: "false", doc: "the element may not be dragged"}
				]
 			},
 			{
 				name: "dropzone",
 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dropzone",
 				doc: "Is an enumerated attribute indicating what types of content can be dropped on an element, using the Drag and Drop API.",
				values: [
					{name: "copy", doc: "dropping will create a copy of the element that was dragged"},
					{name: "move", doc: "the element that was dragged will be moved to this new location"},
					{name: "link", doc: "create a link to the dragged data"}
				]
 			},
 			{
 				name: "hidden",
 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/hidden",
 				doc: "Is a Boolean attribute indicates that the element is not yet, or is no longer, relevant. For example, it can be used to hide elements of the page that can't be used until the login process has been completed. The browser won't render such elements. This attribute must not be used to hide content that could legitimately be shown."
 			},
 			{
 				name: "id",
 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/id",
 				doc: "Defines a unique identifier (ID) which must be unique in the whole document. Its purpose is to identify the element when linking (using a fragment identifier), scripting, or styling (with CSS)."
 			},
// 			{
// 				name: "itemid",
// 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemid",
// 				doc: "This attribute is related to the WHATWG HTML Microdata feature.",
// 			},
// 			{
// 				name: "itemprop",
// 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemprop",
// 				doc: "This attribute is related to the WHATWG HTML Microdata feature.",
// 			},
// 			{
// 				name: "itemref",
// 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemref",
// 				doc: "This attribute is related to the WHATWG HTML Microdata feature.",
// 			},
// 			{
// 				name: "itemscope",
// 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemscope",
// 				doc: "This attribute is related to the WHATWG HTML Microdata feature.",
// 			},
// 			{
// 				name: "itemtype",
// 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemtype",
// 				doc: "This attribute is related to the WHATWG HTML Microdata feature.",
// 			},
 			{
 				name: "lang",
 				url: "/en-US/docs/Web/HTML/Global_attributes/lang",
 				doc: "Participates in defining the language of the element, the language that non-editable elements are written in or the language that editable elements should be written in. The tag contains one single entry value in the format defines in the Tags for Identifying Languages (BCP47) IETF document. xml:lang has priority over it."
 			},
 			{
 				name: "spellcheck",
				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/spellcheck",
				doc: "Is an enumerated attribute that defines whether the element may be checked for spelling errors.",
				values: [
					{name: "true", doc: "the element should be, if possible, checked for spelling errors"},
  					{name: "false", doc: "the element should not be checked for spelling errors"}
  				]
 			},
 			{
 				name: "style",
 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/style",
 				doc: "Contains CSS styling declarations to be applied to the element. Note that it is recommended for styles to be defined in a separate file or files. This attribute and the <style> element have mainly the purpose of allowing for quick styling, for example for testing purposes."
 			},
 			{
 				name: "tabindex",
 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex",
 				doc: "Is an integer attribute that indicates if the element can take input focus (is focusable), if it should participate in sequential keyboard navigation, and if so, at what position.",
				values: [
					{name: "-1", doc: "a negative value means that the element should be focusable, but should not be reachable via sequential keyboard navigation"},
					{name: "0", doc: "the element should be focusable and reachable via sequential keyboard navigation, but its relative order is defined by the platform convention"},
					{name: "positiveInteger", doc: "a positive value means that the element should be focusable and reachable via sequential keyboard navigation; its relative order is defined by the value of the attribute: the sequential follow the increasing number of the tabindex. If several elements share the same tabindex, their relative order follows their relative position in the document"}
				]
			},
			{
	 			name: "title",
	 			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/title",
	 			doc: "Contains a text representing advisory information related to the element it belongs to. Such information can typically, but not necessarily, be presented to the user as a tooltip."
 			},
 			{
 				name: "translate",
 				url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/translate",
 				doc: "Is an enumerated attribute that is used to specify whether an element's attribute values and the values of its Text node children are to be translated when the page is localized, or whether to leave them unchanged.",
				values: [
					{name: "yes", doc: "empty string and \"yes\" indicate that the element will be translated"},
					{name: "no", doc: "the element will not be translated"}
				]
 			}
	];
	
	attributes.windowevents = [
		//Window events
		{
			name: "onafterprint",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onafterprint",
			doc: "The WindowEventHandlers.onafterprint property sets and returns the onafterprint EventHandler for the current window."
		},
		{
			name: "onbeforeprint",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers.onbeforeprint",
			doc: "The onbeforeprint property sets and returns the onbeforeprint event handler code for the current window."
		},
		{
			name: "onbeforeunload",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onbeforeunload",
			doc: "An event that fires when a window is about to unload its resources. The document is still visible and the event is still cancelable."
		},
		{
			name : "onerror",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror",
			doc: "An event handler for runtime script errors."
		},
		{
			name: "onhashchange",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onhashchange",
			doc: "The hashchange event fires when a window's hash changes (see location.hash)."
		},
		{
			name: "onload",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onload",
			doc: "An event handler for the load event of a window."
		},
		{
			name: "onmessage",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/onmessage",
			doc: "An event handler for message events"
		},
		{
			name: "onoffline",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/Document/onoffline",
			doc: "This event handler is called when an offline is fired on body and bubbles up, when navigator.onLine property changes and becomes false."
		},
		{
			name: "ononline",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/Document/ononline",
			doc: "\"online\" event is fired on the <body> of each page when the browser switches between online and offline mode. Additionally, the events bubble up from document.body, to document, ending at window. Both events are non-cancellable (you can't prevent the user from coming online, or going offline)."
		},
		{
			name: "onpagehide",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpagehide",
			doc: "Is an EventHandler representing the code to be called when the pagehide event is raised."
		},
		{
			name: "onpageshow",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpageshow",
			doc: "Is an EventHandler representing the code to be called when the pageshow event is raised."
		},
		{
			name: "onpopstate",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate",
			doc: "An event handler for the popstate event on the window."
		},
		{
			name: "onresize",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onresize",
			doc: "Is an EventHandler representing the code to be called when the resize event is raised."
		},
		{
			name: "onstorage",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onstorage",
			doc: "Is an EventHandler representing the code to be called when the storage event is raised."
		},
		{
			name: "onunload",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onunload",
			doc: "Is an EventHandler representing the code to be called when the unload event is raised."
		},
	];
	
	attributes.formevents = [
		//Form events
		{
			name: "onblur",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onblur",
			doc: "The onblur property returns the onBlur event handler code, if any, that exists on the current element."
		},
		{
			name: "onchange",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onchange",
			doc: "The onchange property sets and returns the event handler for the change event."
		},
		{
			name: "oncontextmenu",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/oncontextmenu",
			doc: "An event handler property for right-click events on the window. Unless the default behavior is prevented (see examples below on how to do this), the browser context menu will activate (though IE8 has a bug with this and will not activate the context menu if a contextmenu event handler is defined). Note that this event will occur with any non-disabled right-click event and does not depend on an element possessing the \"contextmenu\" attribute."
		},
		{
			name: "onfocus",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onfocus",
			doc: "The onfocus property returns the onFocus event handler code on the current element."
		},
		{
			name: "oninput",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/oninput",
			doc: "An event handler for the input event on the window. The input event is raised when an <input> element value changes. "
		},
		{
			name: "oninvalid",
			url: "",
			doc: "The oninvalid event occurs when a submittable <input> element is invalid."
		},
		{
			name: "onreset",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onreset",
			doc: "The GlobalEventHandlers.onreset property contains an EventHandler triggered when a reset event is received."
		},
		{
			name: "onsearch",
			url: "",
			doc: "The onsearch attribute fires when a user presses the \"ENTER\" key or clicks the \"x\" button in an <input> element with type=\"search\"."
		},
		{
			name: "onselect",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onselect",
			doc: "An event handler for the select event on the window."
		},
		{
			name: "onsubmit",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onsubmit",
			doc: "An event handler for the submit event on the window."
		}
	];

	attributes.keyboardevents = [
		//Keyboard events
		{
			name: "onkeydown",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onkeydown",
			doc: "The onkeydown property returns the onKeyDown event handler code on the current element."
		},
		{
			name: "onkeypress",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onkeypress",
			doc: "The onkeypress property sets and returns the onKeyPress event handler code for the current element."
		},
		{
			name: "onkeyup",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onkeyup",
			doc: "The onkeyup property returns the onKeyUp event handler code for the current element."
		},
	];
	attributes.mouseevents = [
		//Mouse events
		{
			name: "onclick",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onclick",
			doc: "The onclick property returns the click event handler code on the current element."
		},
		{
			name: "ondblclick",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/ondblclick",
			doc: "The ondblclick property returns the onDblClick event handler code on the current element."
		},
		{
			name: "ondrag",
			url: "https://www.w3schools.com/tags/ev_ondrag.asp",
			doc: "The ondrag attribute fires when an element or text selection is being dragged."
		},
		{
			name: "ondragend",
			url: "https://www.w3schools.com/tags/ev_ondragend.asp",
			doc: "The ondragend attribute fires when the user has finished dragging an element or text selection."
		},
		{
			name: "ondragenter",
			url: "https://www.w3schools.com/tags/ev_ondragenter.asp",
			doc: "The ondragenter attribute fires when a draggable element or text selection enters a valid drop target."
		},
		{
			name: "ondragleave",
			url: "https://www.w3schools.com/tags/ev_ondragleave.asp",
			doc: "The ondragleave attribute fires when a draggable element or text selection leaves a valid drop target."
		},
		{
			name: "ondragover",
			url: "https://www.w3schools.com/tags/ev_ondragover.asp",
			doc: "The ondragover attribute fires when a draggable element or text selection is being dragged over a valid drop target."
		},
		{
			name: "ondragstart",
			url: "https://www.w3schools.com/tags/ev_ondragstart.asp",
			doc: "The ondragstart attribute fires when the user starts to drag an element or text selection."
		},
		{
			name: "ondrop",
			url: "https://www.w3schools.com/tags/ev_ondrop.asp",
			doc: "The ondrop attribute fires when a draggable element or text selection is dropped on a valid drop target."
		},
		{
			name: "onmousedown",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onmousedown",
			doc: "The onmousedown property returns the onmousedown event handler code on the current element."
		},
		{
			name: "onmousemove",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onmousemove",
			doc: "The onmousemove property returns the mousemove event handler code on the current element."
		},
		{
			name: "onmouseout",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onmouseout",
			doc: "The onmouseout property returns the onMouseOut event handler code on the current element."
		},
		{
			name: "onmouseover",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onmouseover",
			doc: "The onmouseover property returns the onMouseOver event handler code on the current element."
		},
		{
			name: "onmouseup",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onmouseup",
			doc: "The onmouseup property returns the onMouseUp event handler code on the current element."
		},
		{
			name: "onmousewheel",
			url: "",
			doc: "Deprecated. Use the onwheel attribute instead"
		},
		{
			name: "onscroll",
			url: "https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onscroll",
			doc: "An event handler for scroll events on element."
		},
		{
			name: "onwheel",
			url: "https://www.w3schools.com/tags/ev_onwheel.asp",
			doc: "The onwheel attribute fires when the wheel of a pointing device is rolled up or down over an element."
		}
	];
	
	attributes.tags = Object.create(null);
	attributes.tags.a = [
		{
			name: "download",
			doc: "This attribute, if present, indicates that the author intends the hyperlink to be used for downloading a resource so that when the user clicks on the link they will be prompted to save it as a local file. If the attribute has a value, the value will be used as the pre-filled file name in the Save prompt that opens when the user clicks on the link (the user can change the name before actually saving the file of course). There are no restrictions on allowed values (though / and \ will be converted to underscores, preventing specific path hints), but you should consider that most file systems have limitations with regard to what punctuation is supported in file names, and browsers are likely to adjust file names accordingly.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-download"
		},
		{
			name: "href",
			doc: "This was the single required attribute for anchors defining a hypertext source link, but is no longer required in HTML5. Omitting this attribute creates a placeholder link. The href attribute indicates the link target, either a URL or a URL fragment. A URL fragment is a name preceded by a hash mark (#), which specifies an internal target location (an ID) within the current document. URLs are not restricted to Web (HTTP)-based documents. URLs might use any protocol supported by the browser. For example, file, ftp, and mailto work in most user agents.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-href"
		},
		{
			name: "hreflang",
			doc: "This attribute indicates the language of the linked resource. It is purely advisory. Allowed values are determined by BCP47 for HTML5 and by RFC1766 for HTML4. Use this attribute only if the href attribute is present.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-hreflang"
		},
		{
			name: "media",
			doc: "This attribute specifies the media which the linked resource applies to. Its value must be a media query. This attribute is mainly useful when linking to external stylesheets by allowing the user agent to pick the best adapted one for the device it runs on.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-media"
		},
		{
			name: "ping",
			doc: "The 'ping' attribute, if present, sends the URLs of the resources a notification/ping if the user follows the hyperlink.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-ping"
		},
		{
			name: "rel",
			doc: "For anchors containing the href attribute, this attribute specifies the relationship of the target object to the link object. The value is a comma-separated list of link types values. The values and their semantics will be registered by some authority that might have meaning to the document author. The default relationship, if no other is given, is void. Use this attribute only if the href attribute is present.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-rel"
		},
		{
			name: "shape",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-shape"
		},
		{
			name: "target",
			doc: "This attribute specifies where to display the linked resource. In HTML4, this is the name of, or a keyword for, a frame. In HTML5, it is a name of, or keyword for, a browsing context (for example, tab, window, or inline frame). The following keywords have special meanings:",
			values: [
				{name: "_self", doc: "Load the response into the same HTML4 frame (or HTML5 browsing context) as the current one. This value is the default if the attribute is not specified"},
				{name: "_blank", doc: "Load the response into a new unnamed HTML4 window or HTML5 browsing context"},
				{name: "_parent", doc: "Load the response into the HTML4 frameset parent of the current frame or HTML5 parent browsing context of the current one. If there is no parent, this option behaves the same way as _self"},
				{name: "_top", doc: "In HTML4: Load the response into the full, original window, canceling all other frames. In HTML5: Load the response into the top-level browsing context (that is, the browsing context that is an ancestor of the current one, and has no parent). If there is no parent, this option behaves the same way as _self"}
			],
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-target"
		},
		{
			name: "type",
			doc: "This attribute specifies the media type in the form of a MIME type for the link target. Generally, this is provided strictly as advisory information; however, in the future a browser might add a small icon for multimedia types. For example, a browser might add a small speaker icon when type is set to audio/wav. For a complete list of recognized MIME types, see https://www.w3.org/TR/html4/references.html#ref-MIMETYPES. Use this attribute only if the href attribute is present.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-type"
		}
		// Obsolete attributes
//		{
//			name: "charset",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#Obsolete",
//			doc: "This attribute defines the character encoding of the linked resource. The value is a space- and/or comma-delimited list of character sets as defined in RFC 2045. The default value is ISO-8859-1.",
//		},
//		{
//			name: "coords",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#Obsolete",
//			doc: "For use with object shapes, this attribute uses a comma-separated list of numbers to define the coordinates of the object on the page.",
//		},
//		{
//			name: "name",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#Obsolete",
//			doc: "This attribute is required in an anchor defining a target location within a page. A value for name is similar to a value for the id core attribute and should be an alphanumeric identifier unique to the document. Under the HTML 4.01 specification, id and name both can be used with the <a> element as long as they have identical values.",
//		},
//		{
//			name: "rev",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#Obsolete",
//			doc: "This attribute specifies a reverse link, the inverse relationship of the rel attribute. It is useful for indicating where an object came from, such as the author of a document.",
//		},
//		{
//			name: "shape",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#Obsolete",
//			doc: "This attribute is used to define a selectable region for hypertext source links associated with a figure to create an image map. The values for the attribute are circle, default, polygon, and rect. The format of the coords attribute depends on the value of shape. For circle, the value is x,y,r where x and y are the pixel coordinates for the center of the circle and r is the radius value in pixels. For rect, the coords attribute should be x,y,w,h. The x,y values define the upper-left-hand corner of the rectangle, while w and h define the width and height respectively. A value of polygon for shape requires x1,y1,x2,y2,... values for coords. Each of the x,y pairs defines a point in the polygon, with successive points being joined by straight lines and the last point joined to the first. The value default for shape requires that the entire enclosed area, typically an image, be used.",
//		}
	];

	attributes.tags.applet = [
		{
			name: "align",
			doc: "Specifies the horizontal alignment of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/applet#attr-align"
		},
		{
			name: "code",
			doc: "Specifies the URL of the applet's class file to be loaded and executed.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/applet#attr-code"
		},
		{
			name: "codebase",
			doc: "This attribute gives the absolute or relative URL of the directory where applets' .class files referenced by the code attribute are stored.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/applet#attr-codebase"
		}
	];

	attributes.tags.area = [
		{
			name: "coords",
			doc: "A set of values specifying the coordinates of the hot-spot region.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area#attr-coords"
		},
		{
			name: "download",
			doc: "Indicates that the hyperlink is to be used for downloading a resource.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area#attr-download"
		},
		{
			name: "href",
			doc: "The URL of a linked resource.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area#attr-href"
		},
		{
			name: "hreflang",
			doc: "Specifies the language of the linked resource.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area#attr-hreflang"
		},
		{
			name: "media",
			doc: "Specifies a hint of the media for which the linked resource was designed.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area#attr-media"
		},
		{
			name: "ping",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area#attr-ping"
		},
		{
			name: "rel",
			doc: "Specifies the relationship of the target object to the link object.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area#attr-rel"
		},
		{
			name: "shape",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area#attr-shape"
		},
		{
			name: "target",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area#attr-target"
		}
	];

	attributes.tags.audio = [
		{
			name: "autoplay",
			doc: "The audio or video should play as soon as possible.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio#attr-autoplay"
		},
		{
			name: "buffered",
			doc: "Contains the time range of already buffered media.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio#attr-buffered"
		},
		{
			name: "controls",
			doc: "Indicates whether the browser should show playback controls to the user.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio#attr-controls"
		},
		{
			name: "loop",
			doc: "Indicates whether the media should start playing from the start when it's finished.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio#attr-loop"
		},
		{
			name: "preload",
			doc: "Indicates whether the whole resource, parts of it or nothing should be preloaded.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio#attr-preload"
		},
		{
			name: "src",
			doc: "The URL of the embeddable content.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio#attr-src"
		}
	];

	attributes.tags.base = [
		{
			name: "href",
			doc: "The URL of a linked resource.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base#attr-href"
		},
		{
			name: "target",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base#attr-target"
		}
	];

	attributes.tags.basefont = [
		{
			name: "color",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/basefont#attr-color"
		}
	];

	attributes.tags.bgsound = [
		{
			name: "loop",
			doc: "Indicates whether the media should start playing from the start when it's finished.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/bgsound#attr-loop"
		}
	];

	attributes.tags.blockquote = [
		{
			name: "cite",
			doc: "Contains a URI which points to the source of the quote or change.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote#attr-cite"
		}
	];

	attributes.tags.body = [
		{
			name: "bgcolor",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body#attr-bgcolor"
		}
		// Obsolete attributes
//		{
//			name: "alink",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body#Attributes",
//			doc: "Color of text for hyperlinks when selected. This method is non-conforming, use CSS color property in conjunction with the :active pseudo-class instead.",
//		},
//		{
//			name: "background",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body#Attributes",
//			doc: "URI of a image to use as a background. This method is non-conforming, use CSS background property on the element instead.",
//		},
//		{
//			name: "bgcolor",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body#Attributes",
//			doc: "Background color for the document. This method is non-conforming, use CSS background-color property on the element instead.",
//		},
//		{
//			name: "bottommargin",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body#Attributes",
//			doc: "The margin of the bottom of the body. This method is non-conforming, use CSS margin-bottom property on the element instead.",
//		},
//		{
//			name: "leftmargin",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body#Attributes",
//			doc: "The margin of the left of the body. This method is non-conforming, use CSS margin-left property on the element instead.",
//		},
//		{
//			name: "link",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body#Attributes",
//			doc: "Color of text for unvisited hypertext links. This method is non-conforming, use CSS color property in conjunction with the :link pseudo-class instead.",
//		},
//		{
//			name: "rightmargin",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body#Attributes",
//			doc: "The margin of the right of the body. This method is non-conforming, use CSS margin-right property on the element instead.",
//		},
//		{
//			name: "text",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body#Attributes",
//			doc: "Foreground color of text. This method is non-conforming, use CSS color property on the element instead.",
//		},
//		{
//			name: "topmargin",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body#Attributes",
//			doc: "The margin of the top of the body. This method is non-conforming, use CSS margin-top property on the element instead.",
//		},
//		{
//			name: "vlink",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body#Attributes",
//			doc: "Color of text for visited hypertext links. This method is non-conforming, use CSS color property in conjunction with the :visited pseudo-class instead.",
//		}
	];
	
	// Obsolete tags
//	attributes.tags.br = [
//		{
//			name: "clear",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/br#Attributes",
//			doc: "Indicates where to begin the next line after the break.",
//		}
//	];

	attributes.tags.button = [
		{
			name: "autofocus",
			doc: "The element should be automatically focused after the page loaded.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#attr-autofocus"
		},
		{
			name: "disabled",
			doc: "Indicates whether the user can interact with the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#attr-disabled"
		},
		{
			name: "form",
			doc: "Indicates the form that is the owner of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#attr-form"
		},
		{
			name: "formaction",
			doc: "Indicates the action of the element, overriding the action defined in the <form>.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#attr-formaction"
		},
		{
			name: "name",
			doc: "Name of the element. For example used by the server to identify the fields in form submits.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#attr-name"
		},
		{
			name: "type",
			doc: "Defines the type of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#attr-type"
		},
		{
			name: "value",
			doc: "Defines a default value which will be displayed in the element on page load.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#attr-value"
		}
	];

	attributes.tags.canvas = [
		{
			name: "height",
			doc: "Note: In some instances, such as <div>, this is a legacy attribute, in which case the CSS height property should be used instead. In other cases, such as <canvas>, the height must be specified with this attribute.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#attr-height"
		},
		{
			name: "width",
			doc: "Note: In some instances, such as <div>, this is a legacy attribute, in which case the CSS width property should be used instead. In other cases, such as <canvas>, the width must be specified with this attribute.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#attr-width"
		}
	];

	attributes.tags.caption = [
		{
			name: "align",
			doc: "Specifies the horizontal alignment of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/caption#attr-align"
		}
	];

	attributes.tags.col = [
		{
			name: "align",
			doc: "Specifies the horizontal alignment of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/col#attr-align"
		},
		{
			name: "bgcolor",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/col#attr-bgcolor"
		},
		{
			name: "span",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/col#attr-span"
		}
	];

	attributes.tags.colgroup = [
		{
			name: "align",
			doc: "Specifies the horizontal alignment of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/colgroup#attr-align"
		},
		{
			name: "bgcolor",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/colgroup#attr-bgcolor"
		},
		{
			name: "span",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/colgroup#attr-span"
		}
	];

	attributes.tags.command = [
		{
			name: "checked",
			doc: "Indicates whether the element should be checked on page load.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/command#attr-checked"
		},
		{
			name: "disabled",
			doc: "Indicates whether the user can interact with the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/command#attr-disabled"
		},
		{
			name: "icon",
			doc: "Specifies a picture which represents the command.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/command#attr-icon"
		},
		{
			name: "radiogroup",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/command#attr-radiogroup"
		},
		{
			name: "type",
			doc: "Defines the type of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/command#attr-type"
		}
	];

	attributes.tags.del = [
		{
			name: "cite",
			doc: "Contains a URI which points to the source of the quote or change.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/del#attr-cite"
		},
		{
			name: "datetime",
			doc: "Indicates the date and time associated with the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/del#attr-datetime"
		}
	];

	attributes.tags.details = [
		{
			name: "open",
			doc: "Indicates whether the details will be shown on page load.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details#attr-open"
		}
	];

	attributes.tags.embed = [
		{
			name: "height",
			doc: "Note: In some instances, such as <div>, this is a legacy attribute, in which case the CSS height property should be used instead. In other cases, such as <canvas>, the height must be specified with this attribute.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/embed#attr-height"
		},
		{
			name: "src",
			doc: "The URL of the embeddable content.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/embed#attr-src"
		},
		{
			name: "type",
			doc: "Defines the type of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/embed#attr-type"
		},
		{
			name: "width",
			doc: "Note: In some instances, such as <div>, this is a legacy attribute, in which case the CSS width property should be used instead. In other cases, such as <canvas>, the width must be specified with this attribute.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/embed#attr-width"
		}
	];

	attributes.tags.fieldset = [
		{
			name: "disabled",
			doc: "Indicates whether the user can interact with the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset#attr-disabled"
		},
		{
			name: "form",
			doc: "Indicates the form that is the owner of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset#attr-form"
		},
		{
			name: "name",
			doc: "Name of the element. For example used by the server to identify the fields in form submits.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset#attr-name"
		}
	];

	attributes.tags.font = [
		{
			name: "color",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/font#attr-color"
		}
	];

	attributes.tags.form = [
		{
			name: "accept",
			doc: "List of types the server accepts, typically a file type.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#attr-accept"
		},
		{
			name: "accept-charset",
			doc: "List of supported charsets.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#attr-accept-charset"
		},
		{
			name: "action",
			doc: "The URI of a program that processes the information submitted via the form.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#attr-action"
		},
		{
			name: "autocomplete",
			doc: "Indicates whether controls in this form can by default have their values automatically completed by the browser.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#attr-autocomplete"
		},
		{
			name: "enctype",
			doc: "Defines the content type of the form date when the method is POST.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#attr-enctype"
		},
		{
			name: "method",
			doc: "Defines which HTTP method to use when submitting the form. Can be GET (default) or POST.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#attr-method"
		},
		{
			name: "name",
			doc: "Name of the element. For example used by the server to identify the fields in form submits.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#attr-name"
		},
		{
			name: "novalidate",
			doc: "This attribute indicates that the form shouldn't be validated when submitted.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#attr-novalidate"
		},
		{
			name: "target",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#attr-target"
		}
	];

	attributes.tags.hr = [
		// Deprecated attributes
//		{
//			name: "align",
//			doc: "Specifies the horizontal alignment of the element.",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr#attr-align"
//		},
//		{
//			name: "color",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr#attr-color"
//		},
//		{
//			name: "noshade",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr#Attributes",
//			doc: "Sets the rule to have no shading.",
//		},
//		{
//			name: "size",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr#Attributes",
//			doc: "Sets the height, in pixels, of the rule.",
//		},
//		{
//			name: "width",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr#Attributes",
//			doc: "Sets the length of the rule on the page through a pixel or percentage value.",
//		}
	];

	attributes.tags.html = [
		{
			name: "manifest",
			doc: "Specifies the URI of a resource manifest indicating resources that should be cached locally. See Using the application cache for details.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html#attr-manifest"
		},
		// Deprecated attributes
//		{
//			name: "version",
//			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html#Attributes",
//			doc: "Specifies the version of the HTML Document Type Definition that governs the current document. This attribute is not needed, because it is redundant with the version information in the document type declaration.",
//		},
		{
			name: "xmlns",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html#attr-xmlns",
			doc: "Specifies the XML Namespace of the document. Default value is https://www.w3.org/1999/xhtml. This is required in XHTML, and optional in HTML5."
		}
	];

	attributes.tags.iframe = [
		{
			name: "align",
			doc: "The alignment of this element with respect to the surrounding context.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-align"
		},
		{
			name: "height",
			doc: "Indicates the height of the frame HTML5 in CSS pixels, or HTML 4.01 in pixels or as a percentage.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-height"
		},
		{
			name: "name",
			doc: "A name for the embedded browsing context (or frame). This can be used as the value of the target attribute of an <a> or <form> element, or the formtarget attribute of an <input> or <button> element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-name"
		},
		{
			name: "sandbox",
			doc: "If specified as an empty string, this attribute enables extra restrictions on the content that can appear in the inline frame. The value of the attribute can either be an empty string (all the restrictions are applied), or a space-separated list of tokens that lift particular restrictions.",
			values: [
				{name: "allow-same-origin", doc: "Allows the content to be treated as being from its normal origin. If this keyword is not used, the embedded content is treated as being from a unique origin"},
				{name: "allow-top-navigation", doc: "Allows the embedded browsing context to navigate (load) content to the top-level browsing context. If this keyword is not used, this operation is not allowed"},
				{name: "allow-forms", doc: "Allows the embedded browsing context to submit forms. If this keyword is not used, this operation is not allowed"},
				{name: "allow-popups", doc: "Allows popups (like from window.open, target=\"_blank\", showModalDialog). If this keyword is not used, that functionality will silently fail"},
				{name: "allow-scripts", doc: "Allows the embedded browsing context to run scripts (but not create pop-up windows). If this keyword is not used, this operation is not allowed"},
				{name: "allow-pointer-lock", doc: "Allows the embedded browsing context to use the Pointer Lock API"},
				{name: "allow-unsandboxed-auxiliary", doc: "(Chrome only) Allows a sandboxed document to open new windows without forcing the sandboxing flags upon them. This will allow, for example, a third-party advertisement to be safely sandboxed without forcing the same restrictions upon a landing page"}
			],
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox"
		},
		{
			name: "seamless",
			doc: "This Boolean attribute indicates that the browser should render the inline frame in a way that makes it appear to be part of the containing document, for example by applying CSS styles that apply to the <iframe> to the contained document before styles specified in that document, and by opening links in the contained documents in the parent browsing context (unless another setting prevents this). In XHTML, attribute minimization is forbidden, and the seamless attribute must be defined as <iframe seamless=\"seamless\">.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-seamless"
		},
		{
			name: "src",
			doc: "The URL of the embeddable content.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-src"
		},
		{
			name: "srcdoc",
			doc:  "The content of the page that the embedded context is to contain. This attribute is expected to be used together with the sandbox and seamless attributes. If a browser supports the srcdoc attribute, it will override the content specified in the src attribute (if present). If a browser does NOT support the srcdoc attribute, it will show the file specified in the src attribute instead (if present).",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-srcdoc"
		},
		{
			name: "width",
			doc: "Indicates the width of the frame HTML5 in CSS pixels, or HTML 4.01 in pixels or as a percentage.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-width"
		}
	];

	attributes.tags.img = [
		{
			name: "align",
			doc: "The alignment of the image with respect to its surrounding context.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-align"
		},
		{
			name: "alt",
			doc: "This attribute defines the alternative text describing the image. Users will see this displayed if the image URL is wrong, the image is not in one of the supported formats, or if the image is not yet downloaded.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-alt"
		},
		{
			name: "border",
			doc: "The width of a border around the image.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-border"
		},
		{
			name: "height",
			doc: "The intrinsic height of the image in HTML5 CSS pixels, or HTML 4 in pixels or as a percentage.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-height"
		},
		{
			name: "ismap",
			doc: "This Boolean attribute indicates that the image is part of a server-side map. If so, the precise coordinates of a click are sent to the server.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-ismap"
		},
		{
			name: "src",
			doc: "The image URL. This attribute is mandatory for the <img> element. On browsers supporting srcset, src is treated like a candidate image with a pixel density descriptor 1x unless an image with this pixel density descriptor is already defined in srcset or srcset contains 'w' descriptors.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-src"
		},
		{
			name: "srcset",
			doc: "A list of one or more strings separated by commas indicating a set of possible image sources for the user agent to use. Each string is composed of:"
					+ "\n* a URL to an image"
					+ "\n* optionally, whitespace followed by one of:"
					+ "\n * a width descriptor, that is a positive integer directly followed by 'w'. The width descriptor is divided by the source size given in the sizes attribute to calculate the effective pixel density"
					+ "\n * a pixel density descriptor, that is a positive floating point number directly followed by 'x'"
					+ "\nIf no descriptor is specified, the source is assigned the default descriptor: 1x.\n"
					+ "\nIt is invalid to mix width descriptors and pixel density descriptors in the same srcset attribute. Duplicate descriptors (for instance, two sources in the same srcset which are both described with '2x') are invalid, too."
					+ "\nUser agents are given discretion to choose any one of the available sources. This provides them with significant leeway to tailor their selection based on things like user preferences or bandwidth conditions.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-srcset"
		},
		{
			name: "usemap",
			doc: "The partial URL (starting with '#') of an image map associated with the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-usemap"
		},
		{
			name: "width",
			doc: "The intrinsic width of the image in HTML5 CSS pixels, or HTML 4 in pixels or as a percentage.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-width"
		}
	];

	attributes.tags.input = [
		{
			name: "accept",
			doc: "List of types the server accepts, typically a file type.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-accept"
		},
		{
			name: "autocomplete",
			doc: "Indicates whether controls in this form can by default have their values automatically completed by the browser.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-autocomplete"
		},
		{
			name: "autofocus",
			doc: "The element should be automatically focused after the page loaded.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-autofocus"
		},
		{
			name: "autosave",
			doc: "Previous values should persist dropdowns of selectable values across page loads.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-autosave"
		},
		{
			name: "checked",
			doc: "Indicates whether the element should be checked on page load.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-checked"
		},
		{
			name: "dirname",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-dirname"
		},
		{
			name: "disabled",
			doc: "Indicates whether the user can interact with the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-disabled"
		},
		{
			name: "form",
			doc: "Indicates the form that is the owner of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-form"
		},
		{
			name: "formaction",
			doc: "Indicates the action of the element, overriding the action defined in the <form>.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-formaction"
		},
		{
			name: "height",
			doc: "Note: In some instances, such as <div>, this is a legacy attribute, in which case the CSS height property should be used instead. In other cases, such as <canvas>, the height must be specified with this attribute.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-height"
		},
		{
			name: "list",
			doc: "Identifies a list of pre-defined options to suggest to the user.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-list"
		},
		{
			name: "max",
			doc: "Indicates the maximum value allowed.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-max"
		},
		{
			name: "maxlength",
			doc: "Defines the maximum number of characters allowed in the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-maxlength"
		},
		{
			name: "min",
			doc: "Indicates the minimum value allowed.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-min"
		},
		{
			name: "multiple",
			doc: "Indicates whether multiple values can be entered in an input of the type email or file.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-multiple"
		},
		{
			name: "name",
			doc: "Name of the element. For example used by the server to identify the fields in form submits.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-name"
		},
		{
			name: "pattern",
			doc: "Defines a regular expression which the element's value will be validated against.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-pattern"
		},
		{
			name: "placeholder",
			doc: "Provides a hint to the user of what can be entered in the field.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-placeholder"
		},
		{
			name: "readonly",
			doc: "Indicates whether the element can be edited.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-readonly"
		},
		{
			name: "required",
			doc: "Indicates whether this element is required to fill out or not.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-required"
		},
		{
			name: "size",
			doc: "Defines the width of the element (in pixels). If the element's type attribute is text or password then it's the number of characters.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-size"
		},
		{
			name: "src",
			doc: "The URL of the embeddable content.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-src"
		},
		{
			name: "step",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-step"
		},
		{
			name: "type",
			doc: "The type of control to display. The default type is text, if this attribute is not specified.",
			values: [
				{name: "button", doc: "A push button with no default behavior."},
				{name: "checkbox", doc: "A check box. You must use the value attribute to define the value submitted by this item. Use the checked attribute to indicate whether this item is selected. You can also use the indeterminate attribute to indicate that the checkbox is in an indeterminate state (on most platforms, this draws a horizontal line across the checkbox)."},
				{name: "color", doc: "A control for specifying a color. A color picker's UI has no required features other than accepting simple colors as text (more info)."},
				{name: "date", doc: "A control for entering a date (year, month, and day, with no time)."},
				{name: "datetime-local", doc: "A control for entering a date and time, with no time zone."},
				{name: "email", doc: "A field for editing an e-mail address. The input value is validated to contain either the empty string or a single valid e-mail address before submitting. The :valid and :invalid CSS pseudo-classes are applied as appropriate."},
				{name: "file", doc: "A control that lets the user select a file. Use the accept attribute to define the types of files that the control can select."},
				{name: "hidden", doc: "A control that is not displayed, but whose value is submitted to the server."},
				{name: "image", doc: "A graphical submit button. You must use the src attribute to define the source of the image and the alt attribute to define alternative text. You can use the height and width attributes to define the size of the image in pixels."},
				{name: "month", doc: "A control for entering a month and year, with no time zone."},
				{name: "number", doc: "A control for entering a floating point number."},
				{name: "password", doc: "A single-line text field whose value is obscured. Use the maxlength attribute to specify the maximum length of the value that can be entered."},
				{name: "radio", doc: "A radio button. You must use the value attribute to define the value submitted by this item. Use the checked attribute to indicate whether this item is selected by default. Radio buttons that have the same value for the name attribute are in the same \"radio button group\"; only one radio button in a group can be selected at a time."},
				{name: "range", doc: "A control for entering a number whose exact value is not important. This type control uses the following default values if the corresponding attributes are not specified:"
					+ "\n * min: 0"
					+ "\n * max: 100"
					+ "\n * value: min + (max-min)/2, or min if max is less than min"
					+ "\n * step: 1"},
				{name: "reset", doc: "A button that resets the contents of the form to default values."},
				{name: "search", doc: "A single-line text field for entering search strings; line-breaks are automatically removed from the input value."},
				{name: "submit", doc: "A button that submits the form."},
				{name: "tel", doc: "A control for entering a telephone number; line-breaks are automatically removed from the input value, but no other syntax is enforced. You can use attributes such as pattern and maxlength to restrict values entered in the control. The :valid and :invalid CSS pseudo-classes are applied as appropriate."},
				{name: "text", doc: "A single-line text field; line-breaks are automatically removed from the input value."},
				{name: "time", doc: "A control for entering a time value with no time zone."},
				{name: "url", doc: "A field for editing a URL. The input value is validated to contain either the empty string or a valid absolute URL before submitting. Line-breaks and leading or trailing whitespace are automatically removed from the input value. You can use attributes such as pattern and maxlength to restrict values entered in the control. The :valid and :invalid CSS pseudo-classes are applied as appropriate."},
				{name: "week", doc: "A control for entering a date consisting of a week-year number and a week number with no time zone."}
			],
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-type"
		},
		{
			name: "usemap",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-usemap"
		},
		{
			name: "value",
			doc: "Defines a default value which will be displayed in the element on page load.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-value"
		},
		{
			name: "width",
			doc: "Note: In some instances, such as <div>, this is a legacy attribute, in which case the CSS width property should be used instead. In other cases, such as <canvas>, the width must be specified with this attribute.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-width"
		}
	];

	attributes.tags.ins = [
		{
			name: "cite",
			doc: "Contains a URI which points to the source of the quote or change.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ins#attr-cite"
		},
		{
			name: "datetime",
			doc: "Indicates the date and time associated with the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ins#attr-datetime"
		}
	];

	attributes.tags.keygen = [
		{
			name: "autofocus",
			doc: "The element should be automatically focused after the page loaded.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/keygen#attr-autofocus"
		},
		{
			name: "challenge",
			doc: "A challenge string that is submitted along with the public key.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/keygen#attr-challenge"
		},
		{
			name: "disabled",
			doc: "Indicates whether the user can interact with the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/keygen#attr-disabled"
		},
		{
			name: "form",
			doc: "Indicates the form that is the owner of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/keygen#attr-form"
		},
		{
			name: "keytype",
			doc: "Specifies the type of key generated.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/keygen#attr-keytype"
		},
		{
			name: "name",
			doc: "Name of the element. For example used by the server to identify the fields in form submits.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/keygen#attr-name"
		}
	];

	attributes.tags.label = [
		{
			name: "for",
			doc: "Describes elements which belongs to this one.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label#attr-for"
		},
		{
			name: "form",
			doc: "Indicates the form that is the owner of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label#attr-form"
		}
	];

	attributes.tags.li = [
		{
			name: "value",
			doc: "Defines a default value which will be displayed in the element on page load.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/li#attr-value"
		}
	];

	attributes.tags.link = [
		{
			name: "href",
			doc: "The URL of a linked resource.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href"
		},
		{
			name: "hreflang",
			doc: "Specifies the language of the linked resource.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-hreflang"
		},
		{
			name: "media",
			doc: "Specifies a hint of the media for which the linked resource was designed.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-media"
		},
		{
			name: "rel",
			doc: "Specifies the relationship of the target object to the link object.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-rel"
		},
		{
			name: "sizes",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-sizes"
		}
	];

	attributes.tags.map = [
		{
			name: "name",
			doc: "Name of the element. For example used by the server to identify the fields in form submits.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/map#attr-name"
		}
	];

	attributes.tags.marquee = [
		{
			name: "bgcolor",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/marquee#attr-bgcolor"
		},
		{
			name: "loop",
			doc: "Indicates whether the media should start playing from the start when it's finished.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/marquee#attr-loop"
		}
	];

	attributes.tags.menu = [
		{
			name: "type",
			doc: "Defines the type of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/menu#attr-type"
		}
	];

	attributes.tags.meta = [
		{
			name: "charset",
			doc: "Declares the character encoding of the page or script.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-charset"
		},
		{
			name: "content",
			doc: "A value associated with http-equiv or name depending on the context.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-content"
		},
		{
			name: "http-equiv",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-http-equiv"
		},
		{
			name: "name",
			doc: "Name of the element. For example used by the server to identify the fields in form submits.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-name"
		}
	];

	attributes.tags.meter = [
		{
			name: "form",
			doc: "Indicates the form that is the owner of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter#attr-form"
		},
		{
			name: "high",
			doc: "Indicates the lower bound of the upper range.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter#attr-high"
		},
		{
			name: "low",
			doc: "Indicates the upper bound of the lower range.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter#attr-low"
		},
		{
			name: "max",
			doc: "Indicates the maximum value allowed.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter#attr-max"
		},
		{
			name: "min",
			doc: "Indicates the minimum value allowed.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter#attr-min"
		},
		{
			name: "optimum",
			doc: "Indicates the optimal numeric value.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter#attr-optimum"
		},
		{
			name: "value",
			doc: "Defines a default value which will be displayed in the element on page load.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter#attr-value"
		}
	];

	attributes.tags.object = [
		{
			name: "border",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object#attr-border"
		},
		{
			name: "form",
			doc: "Indicates the form that is the owner of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object#attr-form"
		},
		{
			name: "height",
			doc: "Note: In some instances, such as <div>, this is a legacy attribute, in which case the CSS height property should be used instead. In other cases, such as <canvas>, the height must be specified with this attribute.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object#attr-height"
		},
		{
			name: "name",
			doc: "Name of the element. For example used by the server to identify the fields in form submits.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object#attr-name"
		},
		{
			name: "type",
			doc: "Defines the type of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object#attr-type"
		},
		{
			name: "usemap",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object#attr-usemap"
		},
		{
			name: "width",
			doc: "Note: In some instances, such as <div>, this is a legacy attribute, in which case the CSS width property should be used instead. In other cases, such as <canvas>, the width must be specified with this attribute.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object#attr-width"
		}
	];

	attributes.tags.ol = [
		{
			name: "reversed",
			doc: "Indicates whether the list should be displayed in a descending order instead of a ascending.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol#attr-reversed"
		},
		{
			name: "start",
			doc: "Defines the first number if other than 1.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol#attr-start"
		}
	];

	attributes.tags.optgroup = [
		{
			name: "disabled",
			doc: "Indicates whether the user can interact with the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/optgroup#attr-disabled"
		}
	];

	attributes.tags.option = [
		{
			name: "disabled",
			doc: "Indicates whether the user can interact with the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option#attr-disabled"
		},
		{
			name: "selected",
			doc: "Defines a value which will be selected on page load.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option#attr-selected"
		},
		{
			name: "value",
			doc: "Defines a default value which will be displayed in the element on page load.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option#attr-value"
		}
	];

	attributes.tags.output = [
		{
			name: "for",
			doc: "Describes elements which belongs to this one.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output#attr-for"
		},
		{
			name: "form",
			doc: "Indicates the form that is the owner of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output#attr-form"
		},
		{
			name: "name",
			doc: "Name of the element. For example used by the server to identify the fields in form submits.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output#attr-name"
		}
	];

	attributes.tags.param = [
		{
			name: "name",
			doc: "Name of the element. For example used by the server to identify the fields in form submits.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/param#attr-name"
		},
		{
			name: "value",
			doc: "Defines a default value which will be displayed in the element on page load.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/param#attr-value"
		}
	];

	attributes.tags.progress = [
		{
			name: "form",
			doc: "Indicates the form that is the owner of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress#attr-form"
		},
		{
			name: "max",
			doc: "Indicates the maximum value allowed.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress#attr-max"
		},
		{
			name: "value",
			doc: "Defines a default value which will be displayed in the element on page load.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress#attr-value"
		}
	];

	attributes.tags.q = [
		{
			name: "cite",
			doc: "Contains a URI which points to the source of the quote or change.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/q#attr-cite"
		}
	];

	attributes.tags.script = [
		{
			name: "async",
			doc: "Indicates that the script should be executed asynchronously.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-async"
		},
		{
			name: "charset",
			doc: "Declares the character encoding of the page or script.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-charset"
		},
		{
			name: "defer",
			doc: "Indicates that the script should be executed after the page has been parsed.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-defer"
		},
		{
			name: "language",
			doc: "Defines the script language used in the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-language"
		},
		{
			name: "src",
			doc: "The URL of the embeddable content.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-src"
		},
		{
			name: "type",
			doc: "Defines the type of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type"
		}
	];

	attributes.tags.select = [
		{
			name: "autofocus",
			doc: "The element should be automatically focused after the page loaded.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select#attr-autofocus"
		},
		{
			name: "disabled",
			doc: "Indicates whether the user can interact with the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select#attr-disabled"
		},
		{
			name: "form",
			doc: "Indicates the form that is the owner of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select#attr-form"
		},
		{
			name: "multiple",
			doc: "Indicates whether multiple values can be entered in an input of the type email or file.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select#attr-multiple"
		},
		{
			name: "name",
			doc: "Name of the element. For example used by the server to identify the fields in form submits.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select#attr-name"
		},
		{
			name: "required",
			doc: "Indicates whether this element is required to fill out or not.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select#attr-required"
		},
		{
			name: "size",
			doc: "Defines the width of the element (in pixels). If the element's type attribute is text or password then it's the number of characters.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select#attr-size"
		}
	];

	attributes.tags.source = [
		{
			name: "media",
			doc: "Specifies a hint of the media for which the linked resource was designed.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source#attr-media"
		},
		{
			name: "src",
			doc: "The URL of the embeddable content.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source#attr-src"
		},
		{
			name: "type",
			doc: "Defines the type of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source#attr-type"
		}
	];

	attributes.tags.style = [
		{
			name: "media",
			doc: "Specifies a hint of the media for which the linked resource was designed.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style#attr-media"
		},
		{
			name: "scoped",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style#attr-scoped"
		},
		{
			name: "type",
			doc: "Defines the type of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style#attr-type"
		}
	];

	attributes.tags.table = [
		{
			name: "align",
			doc: "Specifies the horizontal alignment of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table#attr-align"
		},
		{
			name: "bgcolor",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table#attr-bgcolor"
		},
		{
			name: "border",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table#attr-border"
		},
		{
			name: "summary",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table#attr-summary"
		}
	];

	attributes.tags.tbody = [
		{
			name: "align",
			doc: "Specifies the horizontal alignment of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tbody#attr-align"
		},
		{
			name: "bgcolor",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tbody#attr-bgcolor"
		}
	];

	attributes.tags.td = [
		{
			name: "align",
			doc: "Specifies the horizontal alignment of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/td#attr-align"
		},
		{
			name: "bgcolor",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/td#attr-bgcolor"
		},
		{
			name: "colspan",
			doc: "The colspan attribute defines the number of columns a cell should span.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/td#attr-colspan"
		},
		{
			name: "headers",
			doc: "IDs of the <th> elements which applies to this element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/td#attr-headers"
		},
		{
			name: "rowspan",
			doc: "Defines the number of rows a table cell should span over.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/td#attr-rowspan"
		}
	];

	attributes.tags.textarea = [
		{
			name: "autofocus",
			doc: "The element should be automatically focused after the page loaded.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea#attr-autofocus"
		},
		{
			name: "cols",
			doc: "Defines the number of columns in a textarea.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea#attr-cols"
		},
		{
			name: "dirname",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea#attr-dirname"
		},
		{
			name: "disabled",
			doc: "Indicates whether the user can interact with the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea#attr-disabled"
		},
		{
			name: "form",
			doc: "Indicates the form that is the owner of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea#attr-form"
		},
		{
			name: "maxlength",
			doc: "Defines the maximum number of characters allowed in the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea#attr-maxlength"
		},
		{
			name: "name",
			doc: "Name of the element. For example used by the server to identify the fields in form submits.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea#attr-name"
		},
		{
			name: "placeholder",
			doc: "Provides a hint to the user of what can be entered in the field.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea#attr-placeholder"
		},
		{
			name: "readonly",
			doc: "Indicates whether the element can be edited.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea#attr-readonly"
		},
		{
			name: "required",
			doc: "Indicates whether this element is required to fill out or not.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea#attr-required"
		},
		{
			name: "rows",
			doc: "Defines the number of rows in a textarea.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea#attr-rows"
		},
		{
			name: "wrap",
			doc: "Indicates whether the text should be wrapped.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea#attr-wrap"
		}
	];

	attributes.tags.tfoot = [
		{
			name: "align",
			doc: "Specifies the horizontal alignment of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tfoot#attr-align"
		},
		{
			name: "bgcolor",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tfoot#attr-bgcolor"
		}
	];

	attributes.tags.th = [
		{
			name: "align",
			doc: "Specifies the horizontal alignment of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th#attr-align"
		},
		{
			name: "bgcolor",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th#attr-bgcolor"
		},
		{
			name: "colspan",
			doc: "The colspan attribute defines the number of columns a cell should span.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th#attr-colspan"
		},
		{
			name: "headers",
			doc: "IDs of the <th> elements which applies to this element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th#attr-headers"
		},
		{
			name: "rowspan",
			doc: "Defines the number of rows a table cell should span over.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th#attr-rowspan"
		},
		{
			name: "scope",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th#attr-scope"
		}
	];

	attributes.tags.thead = [
		{
			name: "align",
			doc: "Specifies the horizontal alignment of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/thead#attr-align"
		}
	];

	attributes.tags.time = [
		{
			name: "datetime",
			doc: "Indicates the date and time associated with the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time#attr-datetime"
		},
		{
			name: "pubdate",
			doc: "Indicates whether this date and time is the date of the nearest <article> ancestor element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time#attr-pubdate"
		}
	];

	attributes.tags.tr = [
		{
			name: "align",
			doc: "Specifies the horizontal alignment of the element.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tr#attr-align"
		},
		{
			name: "bgcolor",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tr#attr-bgcolor"
		}
	];

	attributes.tags.track = [
		{
			name: "default",
			doc: "Indicates that the track should be enabled unless the user's preferences indicate something different.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track#attr-default"
		},
		{
			name: "kind",
			doc: "Specifies the kind of text track.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track#attr-kind"
		},
		{
			name: "label",
			doc: "Specifies a user-readable title of the text track.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track#attr-label"
		},
		{
			name: "src",
			doc: "The URL of the embeddable content.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track#attr-src"
		},
		{
			name: "srclang",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track#attr-srclang"
		}
	];

	attributes.tags.video = [
		{
			name: "autoplay",
			doc: "A Boolean attribute; if specified, the video will automatically begin to play back as soon as it can do so without stopping to finish loading the data.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#attr-autoplay"
		},
		{
			name: "buffered",
			doc: "An attribute you can read to determine which time ranges of the media have been buffered. This attribute contains a TimeRanges object.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#attr-buffered"
		},
		{
			name: "controls",
			doc: "If this attribute is present, Gecko will offer controls to allow the user to control video playback, including volume, seeking, and pause/resume playback.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#attr-controls"
		},
		{
			name: "height",
			doc: "The height of the video's display area, in CSS pixels.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#attr-height"
		},
		{
			name: "loop",
			doc: "A Boolean attribute; if specified, we will, upon reaching the end of the video, automatically seek back to the start.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#attr-loop"
		},
		{
			name: "poster",
			doc: "A URL indicating a poster frame to show until the user plays or seeks. If this attribute isn't specified, nothing is displayed until the first frame is available; then the first frame is displayed as the poster frame.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#attr-poster"
		},
		{
			name: "preload",
			doc: "This enumerated attribute is intended to provide a hint to the browser about what the author thinks will lead to the best user experience.",
			values: [
				{name: "none", doc: "hints that either the author thinks that the user won't need to consult that video or that the server wants to minimize its traffic; in others terms this hint indicates that the video should not be cached"},
				{name: "metadata", doc: "hints that though the author thinks that the user won't need to consult that video, fetching the metadata (e.g. length) is reasonable"},
				{name: "auto", doc: "(or empty string) hints that the user needs have priority; in others terms this hint indicated that, if needed, the whole video could be downloaded, even if the user is not expected to use it"},
			],
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#attr-preload"
		},
		{
			name: "src",
			doc: "The URL of the video to embed. This is optional; you may instead use the <source> element within the video block to specify the video to embed.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#attr-src"
		},
		{
			name: "width",
			doc: "The width of the video's display area, in CSS pixels.",
			url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#attr-width"
		}
	];

	var aria = Object.create(null);
	aria.globalAttributes = [
		{
			name: "aria-atomic",
			doc: "Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. See related aria-relevant.",
			values: [
				{name: "true", doc: "Assistive technologies will present the entire region as a whole."},
				{name: "false", doc: "A change within the region may be processed by the assistive technologies on its own."}
			],
			url: "https://www.w3.org/TR/wai-aria/complete#aria-atomic"
		},
		{
			name: "aria-busy",
			doc: "Indicates whether an element, and its subtree, are currently being updated.",
			values: [
				{name: "true", doc: "The live region is still being updated."},
				{name: "false", doc: "There are no more expected updates for that live region."}
			],
			url: "https://www.w3.org/TR/wai-aria/complete#aria-busy"
		},
		{
			name: "aria-controls",
			doc: "Identifies the element (or elements) whose contents or presence are controlled by the current element. See related aria-owns.",
			url: "https://www.w3.org/TR/wai-aria/complete#aria-controls"
		},
		{
			name: "aria-describedby",
			doc: "Identifies the element (or elements) that describes the object. See related aria-labelledby.",
			url: "https://www.w3.org/TR/wai-aria/complete#aria-describedby"
		},
		{
			name: "aria-disabled",
			doc: "Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable. See related aria-hidden and aria-readonly.",
			values: [
				{name: "true", doc: "The element and all focusable descendants are disabled and its value cannot be changed by the user."},
				{name: "false", doc: "The element is enabled."}
			],
			url: "https://www.w3.org/TR/wai-aria/complete#aria-disabled"
		},
		{
			name: "aria-dropeffect",
			doc: "Indicates what functions can be performed when the dragged object is released on the drop target. This allows assistive technologies to convey the possible drag options available to users, including whether a pop-up menu of choices is provided by the application. Typically, drop effect functions can only be provided once an object has been grabbed for a drag operation as the drop effect functions available are dependent on the object being dragged.",
			values: [
				{name: "copy", doc: "A duplicate of the source object will be dropped into the target."},
				{name: "move", doc: "The source object will be removed from its current location and dropped into the target."},
				{name: "link", doc: "A reference or shortcut to the dragged object will be created in the target object."},
				{name: "execute", doc: "A function supported by the drop target is executed, using the drag source as an input."},
				{name: "popup", doc: "There is a popup menu or dialog that allows the user to choose one of the drag operations (copy, move, link, execute) and any other drag functionality, such as cancel."},
				{name: "none", doc: "No operation can be performed; effectively cancels the drag operation if an attempt is made to drop on this object. Ignored if combined with any other token value. e.g. 'none copy' is equivalent to a 'copy' value."}
			],
			url: "https://www.w3.org/TR/wai-aria/complete#aria-dropeffect"
		},
		{
			name: "aria-flowto",
			doc: "Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion, allows assistive technology to override the general default of reading in document source order.",
			url: "https://www.w3.org/TR/wai-aria/complete#aria-flowto"
		},
		{
			name: "aria-grabbed",
			doc: "Indicates an element's 'grabbed' state in a drag-and-drop operation.",
			values: [
				{name: "true", doc: "Indicates that the element has been 'grabbed' for dragging."},
				{name: "false", doc: "Indicates that the element supports being dragged."},
				{name: "undefined", doc: "Indicates that the element does not support being dragged."}
			],
			url: "https://www.w3.org/TR/wai-aria/complete#aria-grabbed"
		},
		{
			name: "aria-haspopup",
			doc: "Indicates that the element has a popup context menu or sub-level menu.",
			values: [
				{name: "true", doc: "Indicates the object has a popup, either as a descendant or pointed to by aria-owns."},
				{name: "false", doc: "The object has no popup."}
			],
			url: "https://www.w3.org/TR/wai-aria/complete#aria-haspopup"
		},
		{
			name: "aria-hidden",
			doc: "Indicates that the element and all of its descendants are not visible or perceivable to any user as implemented by the author. See related aria-disabled.",
			values: [
				{name: "true", doc: "Indicates that this section of the document and its children are hidden from the rendered view."},
				{name: "false", doc: "Indicates that this section of the document is rendered."}
			],
			url: "https://www.w3.org/TR/wai-aria/complete#aria-hidden"
		},
		{
			name: "aria-invalid",
			doc: "Indicates the entered value does not conform to the format expected by the application.",
			values: [
				{name: "grammar", doc: "A grammatical error was detected."},
				{name: "false", doc: "There are no detected errors in the value."},
				{name: "spelling", doc: "A spelling error was detected."},
				{name: "true", doc: "The value entered by the user has failed validation."}
			],
			url: "https://www.w3.org/TR/wai-aria/complete#aria-invalid"
		},
		{
			name: "aria-label",
			doc: "Defines a string value that labels the current element. See related aria-labelledby.",
			url: "https://www.w3.org/TR/wai-aria/complete#aria-label"
		},
		{
			name: "aria-labelledby",
			doc: "Identifies the element (or elements) that labels the current element. See related aria-label and aria-describedby.",
			url: "https://www.w3.org/TR/wai-aria/complete#aria-labelledby"
		},
		{
			name: "aria-live",
			doc: "Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region.",
			values: [
				{name: "off", doc: "Updates to the region will not be presented to the user unless the assistive technology is currently focused on that region."},
				{name: "polite", doc: "(Background change) Assistive technologies SHOULD announce updates at the next graceful opportunity, such as at the end of speaking the current sentence or when the user pauses typing."},
				{name: "assertive", doc: "This information has the highest priority and assistive technologies SHOULD notify the user immediately. Because an interruption may disorient users or cause them to not complete their current task, authors SHOULD NOT use the assertive value unless the interruption is imperative."}
			],
			url: "https://www.w3.org/TR/wai-aria/complete#aria-live"
		},
		{
			name: "aria-owns",
			doc: "Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship between DOM elements where the DOM hierarchy cannot be used to represent the relationship. See related aria-controls.",
			url: "https://www.w3.org/TR/wai-aria/complete#aria-owns"
		},
		{
			name: "aria-relevant",
			doc: "Indicates what user agent change notifications (additions, removals, etc.) assistive technologies will receive within a live region. See related aria-atomic.",
			values: [
				{name: "additions", doc: "Element nodes are added to the DOM within the live region."},
				{name: "removals", doc: "Text or element nodes within the live region are removed from the DOM."},
				{name: "text", doc: "Text is added to any DOM descendant nodes of the live region."},
				{name: "all", doc: "Equivalent to the combination of all values, 'additions removals text'."},
				{name: "additions text", doc: "Equivalent to the combination of values, 'additions text'."}
			],
			url: "https://www.w3.org/TR/wai-aria/complete#aria-relevant"
		}
	];

	aria.tags = Object.create(null);
	aria.tags.a = ["button", "checkbox", "link", "menuitem", "menuitemcheckbox", "menuitemradio", 
		"tab", "treeitem"];
	aria.tags.abbr = ["all"];
	aria.tags.address = ["contentinfo"];
	aria.tags.area = ["link"];
	aria.tags.article = ["application", "article", "document", "main"];
	aria.tags.aside = ["complementary", "note", "presentation", "search"];
	aria.tags.audio = ["application"];
	aria.tags.b = ["all"];
	aria.tags.bdi = ["all"];
	aria.tags.bdo = ["all"];
	aria.tags.blockquote = ["all"];
	aria.tags.body = ["application", "document"];
	aria.tags.br = ["all"];
	aria.tags.button = ["button", "link", "menuitem", "menuitemcheckbox", "menuitemradio", "radio"];
	aria.tags.canvas = ["all"];
	aria.tags.caption = ["all"];
	aria.tags.cite = ["all"];
	aria.tags.code = ["all"];
	aria.tags.data = ["all"];
	aria.tags.datalist = ["listbox"];
	aria.tags.dd = ["all"];
	aria.tags.del = ["all"];
	aria.tags.details = ["alert", "alertdialog", "application", "article", "banner", "button", 
		"columnheader", "complementary", "contentinfo", "definition", "dialog", "directory", "document", "form", 
		"grid", "gridcell", "group", "heading", "img", "link", "list", "listbox", 
		"listitem", "log", "main", "marquee", "math", "menu", "menubar", "navigation", 
		"note", "radiogroup", "region", "row", "rowgroup", "rowheader", "search", "separator", 
		"status", "tab", "tablist", "tabpanel", "timer", "toolbar", "tooltip", "tree", 
		"treegrid", "treeitem"];
	aria.tags.dfn = ["all"];
	aria.tags.dialog = ["alert", "alertdialog", "application", "dialog", "log", "marquee", 
		"status"];
	aria.tags.div = ["all"];
	aria.tags.dl = ["all"];
	aria.tags.dt = ["all"];
	aria.tags.em = ["all"];
	aria.tags.embed = ["application", "document", "img", "presentation"];
	aria.tags.fieldset = ["group", "presentation"];
	aria.tags.figcaption = ["all"];
	aria.tags.figure = ["all"];
	aria.tags.footer = ["contentinfo", "presentation"];
	aria.tags.form = ["all"];
	aria.tags.h1 = ["heading", "presentation", "tab"];
	aria.tags.h2 = ["heading", "presentation", "tab"];
	aria.tags.h3 = ["heading", "presentation", "tab"];
	aria.tags.h4 = ["heading", "presentation", "tab"];
	aria.tags.h5 = ["heading", "presentation", "tab"];
	aria.tags.h6 = ["heading", "presentation", "tab"];
	aria.tags.header = ["banner", "presentation"];
	aria.tags.hr = ["presentation", "separator"];
	aria.tags.i = ["all"];
	aria.tags.iframe = ["application", "document", "img", "presentation"];
	aria.tags.img = ["all"];
	aria.tags.input = ["button", "checkbox", "combobox", "link", "menuitem", "menuitemcheckbox", 
		"menuitemradio", "radio", "searchbox", "slider", "spinbutton", "switch", "textbox"];
	aria.tags.ins = ["all"];
	aria.tags.kbd = ["all"];
	aria.tags.legend = ["all"];
	aria.tags.li = ["listitem", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "presentation", 
		"radio", "tab", "treeitem"];
	aria.tags.link = ["link"];
	aria.tags.main = ["main", "presentation"];
	aria.tags.mark = ["all"];
	aria.tags.menu = ["directory", "list", "listbox", "menu", "menubar", "tablist", 
		"tabpanel", "tree"];
	aria.tags.menuitem = ["menuitem"];
	aria.tags.nav = ["navigation", "presentation"];
	aria.tags.object = ["application", "document", "img", "presentation"];
	aria.tags.ol = ["directory", "group", "list", "listbox", "menu", "menubar", 
		"presentation", "radiogroup", "tablist", "toolbar", "tree"];
	aria.tags.option = ["menuitem", "menuitemradio", "option", "separator"];
	aria.tags.output = ["all"];
	aria.tags.p = ["all"];
	aria.tags.pre = ["all"];
	aria.tags.progress = ["progressbar"];
	aria.tags.q = ["all"];
	aria.tags.rb = ["all"];
	aria.tags.rp = ["all"];
	aria.tags.rt = ["all"];
	aria.tags.rtc = ["all"];
	aria.tags.ruby = ["all"];
	aria.tags.s = ["all"];
	aria.tags.samp = ["all"];
	aria.tags.section = ["alert", "alertdialog", "application", "contentinfo", "dialog", "document", 
		"log", "main", "marquee", "presentation", "region", "search", "status"];
	aria.tags.select = ["listbox", "menu"];
	aria.tags.small = ["all"];
	aria.tags.span = ["all"];
	aria.tags.strong = ["all"];
	aria.tags.sub = ["all"];
	aria.tags.summary = ["button"];
	aria.tags.table = ["all"];
	aria.tags.tbody = ["all"];
	aria.tags.td = ["all"];
	aria.tags.textarea = ["textbox"];
	aria.tags.tfoot = ["all"];
	aria.tags.th = ["all"];
	aria.tags.thead = ["all"];
	aria.tags.time = ["all"];
	aria.tags.tr = ["all"];
	aria.tags.u = ["all"];
	aria.tags.ul = ["directory", "group", "list", "listbox", "menu", "menubar", 
		"presentation", "radiogroup", "tablist", "toolbar", "tree"];
	aria.tags.var = ["all"];
	aria.tags.video = ["application"];
	aria.tags.wbr = ["all"];

	aria.roles = Object.create(null);
	aria.roles.all = ["alert", "alertdialog", "application", "article", "banner", "button", 
		"checkbox", "columnheader", "combobox", "complementary", "contentinfo", "definition", "dialog", "directory", 
		"document", "form", "grid", "gridcell", "group", "heading", "img", "link", 
		"list", "listbox", "listitem", "log", "main", "marquee", "math", "menu", 
		"menubar", "menuitem", "menuitemcheckbox", "menuitemradio", "navigation", "note", "option", "presentation", 
		"progressbar", "radio", "radiogroup", "region", "row", "rowgroup", "rowheader", "scrollbar", 
		"search", "separator", "slider", "spinbutton", "status", "tab", "tablist", "tabpanel", 
		"textbox", "timer", "toolbar", "tooltip", "tree", "treegrid", "treeitem"];
	aria.roles.alert = ["aria-expanded"];
	aria.roles.alertdialog = ["aria-expanded"];
	aria.roles.application = ["aria-expanded"];
	aria.roles.article = ["aria-expanded"];
	aria.roles.banner = ["aria-expanded"];
	aria.roles.button = ["aria-expanded", "aria-pressed"];
	aria.roles.checkbox = ["aria-checked"];
	aria.roles.columnheader = ["aria-expanded", "aria-readonly", "aria-required", "aria-selected", "aria-sort"];
	aria.roles.combobox = ["aria-activedescendant", "aria-autocomplete", "aria-expanded", "aria-required"];
	aria.roles.complementary = ["aria-expanded"];
	aria.roles.contentinfo = ["aria-expanded"];
	aria.roles.definition = ["aria-expanded"];
	aria.roles.dialog = ["aria-expanded"];
	aria.roles.directory = ["aria-expanded"];
	aria.roles.document = ["aria-expanded"];
	aria.roles.form = ["aria-expanded"];
	aria.roles.grid = ["aria-activedescendant", "aria-expanded", "aria-level", "aria-multiselectable", "aria-readonly"];
	aria.roles.gridcell = ["aria-expanded", "aria-readonly", "aria-required", "aria-selected"];
	aria.roles.group = ["aria-activedescendant", "aria-expanded"];
	aria.roles.heading = ["aria-expanded", "aria-level"];
	aria.roles.img = ["aria-expanded"];
	aria.roles.link = ["aria-expanded"];
	aria.roles.list = ["aria-expanded"];
	aria.roles.listbox = ["aria-activedescendant", "aria-expanded", "aria-multiselectable", "aria-required"];
	aria.roles.listitem = ["aria-expanded", "aria-level", "aria-posinset", "aria-setsize"];
	aria.roles.log = ["aria-expanded"];
	aria.roles.main = ["aria-expanded"];
	aria.roles.marquee = ["aria-expanded"];
	aria.roles.math = ["aria-expanded"];
	aria.roles.menu = ["aria-activedescendant", "aria-expanded"];
	aria.roles.menubar = ["aria-activedescendant", "aria-expanded"];
	aria.roles.menuitemcheckbox = ["aria-checked"];
	aria.roles.menuitemradio = ["aria-checked", "aria-posinset", "aria-selected", "aria-setsize"];
	aria.roles.navigation = ["aria-expanded"];
	aria.roles.note = ["aria-expanded"];
	aria.roles.option = ["aria-checked", "aria-posinset", "aria-selected", "aria-setsize"];
	aria.roles.progressbar = ["aria-valuemax", "aria-valuemin", "aria-valuenow", "aria-valuetext"];
	aria.roles.radio = ["aria-checked", "aria-posinset", "aria-selected", "aria-setsize"];
	aria.roles.radiogroup = ["aria-activedescendant", "aria-expanded", "aria-required"];
	aria.roles.region = ["aria-expanded"];
	aria.roles.row = ["aria-activedescendant", "aria-expanded", "aria-level", "aria-selected"];
	aria.roles.rowgroup = ["aria-activedescendant", "aria-expanded"];
	aria.roles.rowheader = ["aria-expanded", "aria-readonly", "aria-required", "aria-selected", "aria-sort"];
	aria.roles.scrollbar = ["aria-orientation", "aria-valuemax", "aria-valuemin", "aria-valuenow", "aria-valuetext"];
	aria.roles.search = ["aria-expanded"];
	aria.roles.separator = ["aria-expanded", "aria-orientation"];
	aria.roles.slider = ["aria-orientation", "aria-valuemax", "aria-valuemin", "aria-valuenow", "aria-valuetext"];
	aria.roles.spinbutton = ["aria-required", "aria-valuemax", "aria-valuemin", "aria-valuenow", "aria-valuetext"];
	aria.roles.status = ["aria-expanded"];
	aria.roles.tab = ["aria-expanded", "aria-selected"];
	aria.roles.tablist = ["aria-activedescendant", "aria-expanded", "aria-level", "aria-multiselectable"];
	aria.roles.tabpanel = ["aria-expanded"];
	aria.roles.textbox = ["aria-activedescendant", "aria-autocomplete", "aria-multiline", "aria-readonly", "aria-required"];
	aria.roles.timer = ["aria-expanded"];
	aria.roles.toolbar = ["aria-activedescendant", "aria-expanded"];
	aria.roles.tooltip = ["aria-expanded"];
	aria.roles.tree = ["aria-activedescendant", "aria-expanded", "aria-multiselectable", "aria-required"];
	aria.roles.treegrid = ["aria-activedescendant", "aria-expanded", "aria-level", "aria-multiselectable", "aria-readonly", "aria-required"];
	aria.roles.treeitem = ["aria-checked", "aria-expanded", "aria-level", "aria-posinset", "aria-selected", "aria-setsize"];

	aria.attributes = Object.create(null);
	aria.attributes.activedescendant = {
		name: "aria-activedescendant",
		doc: "Identifies the currently active descendant of a composite widget.",
		url: "https://www.w3.org/TR/wai-aria/complete#aria-activedescendant"
	};
	aria.attributes.autocomplete = {
		name: "aria-autocomplete",
		doc: "Indicates whether user input completion suggestions are provided.",
		values: [
			{name: "inline", doc: "The system provides text after the caret as a suggestion for how to complete the field."},
			{name: "list", doc: "A list of choices appears from which the user can choose."},
			{name: "both", doc: "A list of choices appears and the currently selected suggestion also appears inline."},
			{name: "none", doc: "No input completion suggestions are provided."}
		],
		url: "https://www.w3.org/TR/wai-aria/complete#aria-autocomplete"
	};
	aria.attributes.checked = {
		name: "aria-checked",
		doc: "Indicates the current 'checked' state of checkboxes, radio buttons, and other widgets. See related aria-pressed and aria-selected.",
		values: [
			{name: "true", doc: "The element is checked."},
			{name: "false", doc: "The element supports being checked but is not currently checked."},
			{name: "mixed", doc: "Indicates a mixed mode value for a tri-state checkbox or menuitemcheckbox."},
			{name: "undefined", doc: "The element does not support being checked."}
		],
		url: "https://www.w3.org/TR/wai-aria/complete#aria-checked"
	};
	aria.attributes.expanded = {
		name: "aria-expanded",
		doc: "Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed.",
		values: [
			{name: "true", doc: "The element, or another grouping element it controls, is expanded."},
			{name: "false", doc: "The element, or another grouping element it controls, is collapsed."},
			{name: "undefined", doc: "The element, or another grouping element it controls, is neither expandable nor collapsible; all its child elements are shown or there are no child elements."}
		],
		url: "https://www.w3.org/TR/wai-aria/complete#aria-expanded"
	};
	aria.attributes.level = {
		name: "aria-level",
		doc: "Defines the hierarchical level of an element within a structure.",
		url: "https://www.w3.org/TR/wai-aria/complete#aria-level"
	};
	aria.attributes.multiline = {
		name: "aria-multiline",
		doc: "Indicates whether a text box accepts multiple lines of input or only a single line.",
		values: [
			{name: "true", doc: "This is a multi-line text box."},
			{name: "false", doc: "This is a single-line text box."}
		],
		url: "https://www.w3.org/TR/wai-aria/complete#aria-multiline"
	};
	aria.attributes.multiselectable = {
		name: "aria-multiselectable",
		doc: "Indicates that the user may select more than one item from the current selectable descendants.",
		values: [
			{name: "true", doc: "More than one item in the widget may be selected at a time."},
			{name: "false", doc: "Only one item can be selected."}
		],
		url: "https://www.w3.org/TR/wai-aria/complete#aria-multiselectable"
	};
	aria.attributes.orientation = {
		name: "aria-orientation",
		doc: "Indicates whether the element and orientation is horizontal or vertical.",
		values: [
			{name: "vertical", doc: "The element is oriented vertically."},
			{name: "horizontal", doc: "The element is oriented horizontally."}
		],
		url: "https://www.w3.org/TR/wai-aria/complete#aria-orientation"
	};
	aria.attributes.posinset = {
		name: "aria-posinset",
		doc: "Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. See related aria-setsize.",
		url: "https://www.w3.org/TR/wai-aria/complete#aria-posinset"
	};
	aria.attributes.pressed = {
		name: "aria-pressed",
		doc: "Indicates the current 'pressed' state of toggle buttons. See related aria-checked and aria-selected.",
		values: [
			{name: "true", doc: "The element is pressed."},
			{name: "false", doc: "The element supports being pressed but is not currently pressed."},
			{name: "mixed", doc: "Indicates a mixed mode value for a tri-state toggle button."},
			{name: "undefined", doc: "The element does not support being pressed."}
		],
		url: "https://www.w3.org/TR/wai-aria/complete#aria-pressed"
	};
	aria.attributes.readonly = {
		name: "aria-readonly",
		doc: "Indicates that the element is not editable, but is otherwise operable. See related aria-disabled.",
		values: [
			{name: "true", doc: "The user cannot change the value of the element."},
			{name: "false", doc: "The user can set the value of the element."}
		],
		url: "https://www.w3.org/TR/wai-aria/complete#aria-readonly"
	};
	aria.attributes.required = {
		name: "aria-required",
		doc: "Indicates that user input is required on the element before a form may be submitted.",
		values: [
			{name: "true", doc: "Users need to provide input on an element before a form is submitted."},
			{name: "false", doc: "User input is not necessary to submit the form."}
		],
		url: "https://www.w3.org/TR/wai-aria/complete#aria-required"
	};
	aria.attributes.selected = {
		name: "aria-selected",
		doc: "Indicates the current 'selected' state of various widgets. See related aria-checked and aria-pressed.",
		values: [
			{name: "true", doc: "The selectable element is selected."},
			{name: "false", doc: "The selectable element is not selected."},
			{name: "undefined", doc: "The element is not selectable."}
		],
		url: "https://www.w3.org/TR/wai-aria/complete#aria-selected"
	};
	aria.attributes.setsize = {
		name: "aria-setsize",
		doc: "Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. See related aria-posinset.",
		url: "https://www.w3.org/TR/wai-aria/complete#aria-setsize"
	};
	aria.attributes.sort = {
		name: "aria-sort",
		doc: "Indicates if items in a table or grid are sorted in ascending or descending order.",
		values: [
			{name: "ascending", doc: "Items are sorted in ascending order by this column."},
			{name: "descending", doc: "Items are sorted in descending order by this column."},
			{name: "none", doc: "There is no defined sort applied to the column."},
			{name: "other", doc: "A sort algorithm other than ascending or descending has been applied."}
		],
		url: "https://www.w3.org/TR/wai-aria/complete#aria-sort"
	};
	aria.attributes.valuemax = {
		name: "aria-valuemax",
		doc: "Defines the maximum allowed value for a range widget.",
		url: "https://www.w3.org/TR/wai-aria/complete#aria-valuemax"
	};
	aria.attributes.valuemin = {
		name: "aria-valuemin",
		doc: "Defines the minimum allowed value for a range widget.",
		url: "https://www.w3.org/TR/wai-aria/complete#aria-valuemin"
	};
	aria.attributes.valuenow = {
		name: "aria-valuenow",
		doc: "Defines the current value for a range widget. See related aria-valuetext.",
		url: "https://www.w3.org/TR/wai-aria/complete#aria-valuenow"
	};
	aria.attributes.valuetext = {
		name: "aria-valuetext",
		doc: "Defines the human readable text alternative of aria-valuenow for a range widget.",
		url: "https://www.w3.org/TR/wai-aria/complete#aria-valuetext"
	};
	aria.attributes.role = {
		name: "role",
		doc: "Describes the role(s) the current element plays in the context of the document. This can be used, for example, by applications and assistive technologies to determine the purpose of an element.",
		values: [
			{name: "alert", doc: "A message with important, and usually time-sensitive, information. See related alertdialog and status.", url: "https://www.w3.org/TR/wai-aria/complete#alert"},
			{name: "alertdialog", doc: "A type of dialog that contains an alert message, where initial focus goes to an element within the dialog. See related alert and dialog.", url: "https://www.w3.org/TR/wai-aria/complete#alertdialog"},
			{name: "application", doc: "A region declared as a web application, as opposed to a web document.", url: "https://www.w3.org/TR/wai-aria/complete#application"},
			{name: "article", doc: "A section of a page that consists of a composition that forms an independent part of a document, page, or site.", url: "https://www.w3.org/TR/wai-aria/complete#article"},
			{name: "banner", doc: "A region that contains mostly site-oriented content, rather than page-specific content.", url: "https://www.w3.org/TR/wai-aria/complete#banner"},
			{name: "button", doc: "An input that allows for user-triggered actions when clicked or pressed. See related link.", url: "https://www.w3.org/TR/wai-aria/complete#button"},
			{name: "checkbox", doc: "A checkable input that has three possible values: true, false, or mixed.", url: "https://www.w3.org/TR/wai-aria/complete#checkbox"},
			{name: "columnheader", doc: "A cell containing header information for a column.", url: "https://www.w3.org/TR/wai-aria/complete#columnheader"},
			{name: "combobox", doc: "A presentation of a select; usually similar to a textbox where users can type ahead to select an option, or type to enter arbitrary text as a new item in the list. See related listbox.", url: "https://www.w3.org/TR/wai-aria/complete#combobox"},
			{name: "complementary", doc: "A supporting section of the document, designed to be complementary to the main content at a similar level in the DOM hierarchy, but remains meaningful when separated from the main content.", url: "https://www.w3.org/TR/wai-aria/complete#complementary"},
			{name: "contentinfo", doc: "A large perceivable region that contains information about the parent document.", url: "https://www.w3.org/TR/wai-aria/complete#contentinfo"},
			{name: "definition", doc: "A definition of a term or concept.", url: "https://www.w3.org/TR/wai-aria/complete#definition"},
			{name: "dialog", doc: "A dialog is an application window that is designed to interrupt the current processing of an application in order to prompt the user to enter information or require a response. See related alertdialog.", url: "https://www.w3.org/TR/wai-aria/complete#dialog"},
			{name: "directory", doc: "A list of references to members of a group, such as a static table of contents.", url: "https://www.w3.org/TR/wai-aria/complete#directory"},
			{name: "document", doc: "A region containing related information that is declared as document content, as opposed to a web application.", url: "https://www.w3.org/TR/wai-aria/complete#document"},
			{name: "form", doc: "A landmark region that contains a collection of items and objects that, as a whole, combine to create a form. See related search.", url: "https://www.w3.org/TR/wai-aria/complete#form"},
			{name: "grid", doc: "A grid is an interactive control which contains cells of tabular data arranged in rows and columns, like a table.", url: "https://www.w3.org/TR/wai-aria/complete#grid"},
			{name: "gridcell", doc: "A cell in a grid or treegrid.", url: "https://www.w3.org/TR/wai-aria/complete#gridcell"},
			{name: "group", doc: "A set of user interface objects which are not intended to be included in a page summary or table of contents by assistive technologies.", url: "https://www.w3.org/TR/wai-aria/complete#group"},
			{name: "heading", doc: "A heading for a section of the page.", url: "https://www.w3.org/TR/wai-aria/complete#heading"},
			{name: "img", doc: "A container for a collection of elements that form an image.", url: "https://www.w3.org/TR/wai-aria/complete#img"},
			{name: "link", doc: "An interactive reference to an internal or external resource that, when activated, causes the user agent to navigate to that resource. See related button.", url: "https://www.w3.org/TR/wai-aria/complete#link"},
			{name: "list", doc: "A group of non-interactive list items. See related listbox.", url: "https://www.w3.org/TR/wai-aria/complete#list"},
			{name: "listbox", doc: "A widget that allows the user to select one or more items from a list of choices. See related combobox and list.", url: "https://www.w3.org/TR/wai-aria/complete#listbox"},
			{name: "listitem", doc: "A single item in a list or directory.", url: "https://www.w3.org/TR/wai-aria/complete#listitem"},
			{name: "log", doc: "A type of live region where new information is added in meaningful order and old information may disappear. See related marquee.", url: "https://www.w3.org/TR/wai-aria/complete#log"},
			{name: "main", doc: "The main content of a document.", url: "https://www.w3.org/TR/wai-aria/complete#main"},
			{name: "marquee", doc: "A type of live region where non-essential information changes frequently. See related log.", url: "https://www.w3.org/TR/wai-aria/complete#marquee"},
			{name: "math", doc: "Content that represents a mathematical expression.", url: "https://www.w3.org/TR/wai-aria/complete#math"},
			{name: "menu", doc: "A type of widget that offers a list of choices to the user.", url: "https://www.w3.org/TR/wai-aria/complete#menu"},
			{name: "menubar", doc: "A presentation of menu that usually remains visible and is usually presented horizontally.", url: "https://www.w3.org/TR/wai-aria/complete#menubar"},
			{name: "menuitem", doc: "An option in a set of choices contained by a menu or menubar.", url: "https://www.w3.org/TR/wai-aria/complete#menuitem"},
			{name: "menuitemcheckbox", doc: "A menuitem with a checkable state whose possible values are true, false, or mixed.", url: "https://www.w3.org/TR/wai-aria/complete#menuitemcheckbox"},
			{name: "menuitemradio", doc: "A checkable menuitem in a set of elements with role menuitemradio, only one of which can be checked at a time.", url: "https://www.w3.org/TR/wai-aria/complete#menuitemradio"},
			{name: "navigation", doc: "A collection of navigational elements (usually links) for navigating the document or related documents.", url: "https://www.w3.org/TR/wai-aria/complete#navigation"},
			{name: "note", doc: "A section whose content is parenthetic or ancillary to the main content of the resource.", url: "https://www.w3.org/TR/wai-aria/complete#note"},
			{name: "option", doc: "A selectable item in a select list.", url: "https://www.w3.org/TR/wai-aria/complete#option"},
			{name: "presentation", doc: "An element whose implicit native role semantics will not be mapped to the accessibility API.", url: "https://www.w3.org/TR/wai-aria/complete#presentation"},
			{name: "progressbar", doc: "An element that displays the progress status for tasks that take a long time.", url: "https://www.w3.org/TR/wai-aria/complete#progressbar"},
			{name: "radio", doc: "A checkable input in a group of radio roles, only one of which can be checked at a time.", url: "https://www.w3.org/TR/wai-aria/complete#radio"},
			{name: "radiogroup", doc: "A group of radio buttons.", url: "https://www.w3.org/TR/wai-aria/complete#radiogroup"},
			{name: "region", doc: "A large perceivable section of a web page or document, that is important enough to be included in a page summary or table of contents, for example, an area of the page containing live sporting event statistics.", url: "https://www.w3.org/TR/wai-aria/complete#region"},
			{name: "row", doc: "A row of cells in a grid.", url: "https://www.w3.org/TR/wai-aria/complete#row"},
			{name: "rowgroup", doc: "A group containing one or more row elements in a grid.", url: "https://www.w3.org/TR/wai-aria/complete#rowgroup"},
			{name: "rowheader", doc: "A cell containing header information for a row in a grid.", url: "https://www.w3.org/TR/wai-aria/complete#rowheader"},
			{name: "search", doc: "A landmark region that contains a collection of items and objects that, as a whole, combine to create a search facility. See related form.", url: "https://www.w3.org/TR/wai-aria/complete#search"},
			{name: "separator", doc: "A divider that separates and distinguishes sections of content or groups of menuitems.", url: "https://www.w3.org/TR/wai-aria/complete#separator"},
			{name: "scrollbar", doc: "A graphical object that controls the scrolling of content within a viewing area, regardless of whether the content is fully displayed within the viewing area.", url: "https://www.w3.org/TR/wai-aria/complete#scrollbar"},
			{name: "slider", doc: "A user input where the user selects a value from within a given range.", url: "https://www.w3.org/TR/wai-aria/complete#slider"},
			{name: "spinbutton", doc: "A form of range that expects the user to select from among discrete choices.", url: "https://www.w3.org/TR/wai-aria/complete#spinbutton"},
			{name: "status", doc: "A container whose content is advisory information for the user but is not important enough to justify an alert, often but not necessarily presented as a status bar. See related alert.", url: "https://www.w3.org/TR/wai-aria/complete#status"},
			{name: "tab", doc: "A grouping label providing a mechanism for selecting the tab content that is to be rendered to the user.", url: "https://www.w3.org/TR/wai-aria/complete#tab"},
			{name: "tablist", doc: "A list of tab elements, which are references to tabpanel elements.", url: "https://www.w3.org/TR/wai-aria/complete#tablist"},
			{name: "tabpanel", doc: "A container for the resources associated with a tab, where each tab is contained in a tablist.", url: "https://www.w3.org/TR/wai-aria/complete#tabpanel"},
			{name: "textbox", doc: "Input that allows free-form text as its value.", url: "https://www.w3.org/TR/wai-aria/complete#textbox"},
			{name: "timer", doc: "A type of live region containing a numerical counter which indicates an amount of elapsed time from a start point, or the time remaining until an end point.", url: "https://www.w3.org/TR/wai-aria/complete#timer"},
			{name: "toolbar", doc: "A collection of commonly used function buttons or controls represented in compact visual form.", url: "https://www.w3.org/TR/wai-aria/complete#toolbar"},
			{name: "tooltip", doc: "A contextual popup that displays a description for an element.", url: "https://www.w3.org/TR/wai-aria/complete#tooltip"},
			{name: "tree", doc: "A type of list that may contain sub-level nested groups that can be collapsed and expanded.", url: "https://www.w3.org/TR/wai-aria/complete#tree"},
			{name: "treegrid", doc: "A grid whose rows can be expanded and collapsed in the same manner as for a tree.", url: "https://www.w3.org/TR/wai-aria/complete#treegrid"},
			{name: "treeitem", doc: "An option item of a tree. This is an element within a tree that may be expanded or collapsed if it contains a sub-level group of treeitem elements.", url: "https://www.w3.org/TR/wai-aria/complete#treeitem"}
		],
		url: "https://www.w3.org/TR/role-attribute/"
	};

	/**
	 * @description Returns the set of attributes that apply to the given DOM node
	 * @param {Object} node The DOM node to get attributes for
	 * @returns {Array.<Object>} The array of attributes for the given node or an empty array, never null
	 * @since 10.0
	 */
	function getAttributesForNode(node) {
		var ret = Object.create(null);
		var attrs = [].concat(attributes.globals);
		var ariaattrs = [];
		if (node){
			var testNode = node;
			if (node.type === 'attr'){
				testNode = node.parent;
			}
			if(testNode && testNode.type === 'tag') {
				var tags = attributes.tags[testNode.name];
				if(Array.isArray(tags) && tags.length > 0) {
					attrs = attrs.concat(tags);
				}
				// Determine ARIA attributes for node
				tags = aria.tags[testNode.name];
				if (Array.isArray(tags) && tags.length > 0) {
					var roles = [];
					if (tags[0] === "all") {
						roles = aria.roles.all;
					} else {
						roles = tags; // tag-specific roles
					}
					for (var i = 0; i < roles.length; i++) {
						var attrlist = aria.roles[roles[i]];
						if (Array.isArray(attrlist) && attrlist.length > 0) {
							for (var j = 0; j < attrlist.length; j++) {
								var attrkey = attrlist[j].substring(5); // strip off the "aria-"
								var attr = aria.attributes[attrkey];
								var found = false;
								for (var k = 0; k < ariaattrs.length; k++) {
									if (ariaattrs[k].name === attr.name) {
										found = true;
										break;
									}
								}
								if (!found) {
									ariaattrs.push(attr);
								}
							}
						}
					}
					ariaattrs.push(aria.attributes.role); // this tag allows role
				}
				ariaattrs = ariaattrs.concat(aria.globalAttributes); // add ARIA globals last to avoid looping through them (above)
			}
		}
		ret.global = attrs;
		ret.aria = ariaattrs;
		ret.formevents = attributes.formevents.slice(0);
		ret.keyboardevents = attributes.keyboardevents.slice(0);
		ret.mouseevents = attributes.mouseevents.slice(0);
		ret.windowevents = attributes.windowevents.slice(0);
		return ret;
	}
	
	function getValuesForAttribute(node) {
		var values = null;
		var url = null;
		if (node.type === 'attr') {
			var attr = null;
			var name = node.name;
			if (name.indexOf("aria-") === 0 || name === "role") {
				// ARIA attribute
				if (name === "role") {
					values = aria.attributes.role.values;
				} else {
					var key = name.substring(5); // strip off the "aria-"
					attr = aria.attributes[key];
					if (!attr) {
						attr = findAttribute(name, aria.globalAttributes);
					}
				}
			} else {
				// HTML attribute
				var tagAttrs = null;
				var testNode = node.parent;
				if (testNode && testNode.type === 'tag') {
					tagAttrs = attributes.tags[testNode.name];
				}
				if (Array.isArray(tagAttrs)) {
					attr = findAttribute(name, tagAttrs);
				} else {
					attr = findAttribute(name, attributes.globals);
				}
			}
			if (attr) {
				values = attr.values;
				url = attr.url;
			}
		}
		if (values && url) {
			for (var i = 0; i < values.length; i++) {
				if (!values[i].url) {
					values[i]["url"] = url;
				}
			}
		}
		return values;
	}
	
	function findAttribute(name, attributes) {
		var attr = null;
		for (var i = 0; i < attributes.length; i++) {
			if (attributes[i].name === name) {
				attr = attributes[i];
				break;
			}
		}
		return attr;
	}

	return {
		getAttributesForNode: getAttributesForNode,
		getValuesForAttribute: getValuesForAttribute
	};
});
