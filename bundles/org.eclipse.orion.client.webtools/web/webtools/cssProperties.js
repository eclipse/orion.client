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
	var cssProperties = Object.create(null);
	cssProperties = [
		/*
		 * The following data was scraped from http://www.w3schools.com/cssref/
		 */
		{
			name: "@font-face",
			category: "Font Properties",
			doc: "A rule that allows websites to download and use fonts other than the 'web-safe' fonts",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face"
		},
		{
			name: "@font-feature-values",
			category: "Font Properties",
			doc: "Allows authors to use a common name in font-variant-alternate for feature activated differently in OpenType",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/@font-feature-values"
		},
		{
			name: "@keyframes",
			category: "Animation Properties",
			doc: "Specifies the animation code",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/@keyframes"
		},
		{
			name: "align-content",
			category: "Flexible Box Layout",
			doc: "Specifies the alignment between the lines inside a flexible container when the items do not use all available space",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/align-content"
		},
		{
			name: "align-items",
			category: "Flexible Box Layout",
			doc: "Specifies the alignment for items inside a flexible container",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/align-items"
		},
		{
			name: "align-self",
			category: "Flexible Box Layout",
			doc: "Specifies the alignment for selected items inside a flexible container",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/align-self"
		},
		{
			name: "animation",
			category: "Animation Properties",
			doc: "A shorthand property for all the animation properties (except animation-play-state and animation-fill-mode)",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/animation"
		},
		{
			name: "animation-delay",
			category: "Animation Properties",
			doc: "Specifies a delay for the start of an animation",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/animation-delay"
		},
		{
			name: "animation-direction",
			category: "Animation Properties",
			doc: "Specifies whether or not the animation should play in reverse on alternate cycles",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/animation-direction"
		},
		{
			name: "animation-duration",
			category: "Animation Properties",
			doc: "Specifies how many seconds or milliseconds an animation takes to complete one cycle",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/animation-duration"
		},
		{
			name: "animation-fill-mode",
			category: "Animation Properties",
			doc: "Specifies a style for the element when the animation is not playing (when it is finished, or when it has a delay)",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/animation-fill-mode"
		},
		{
			name: "animation-iteration-count",
			category: "Animation Properties",
			doc: "Specifies the number of times an animation should be played",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/animation-iteration-count"
		},
		{
			name: "animation-name",
			category: "Animation Properties",
			doc: "Specifies the name of the @keyframes animation",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/animation-name"
		},
		{
			name: "animation-play-state",
			category: "Animation Properties",
			doc: "Specifies whether the animation is running or paused",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/animation-play-state"
		},
		{
			name: "animation-timing-function",
			category: "Animation Properties",
			doc: "Specifies the speed curve of an animation",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timing-function"
		},
		{
			name: "backface-visibility",
			category: "Transform Properties",
			doc: "Defines whether or not an element should be visible when not facing the screen",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/backface-visibility"
		},
		{
			name: "background",
			category: "Background and Border Properties",
			doc: "A shorthand property for setting all the background properties in one declaration",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/background"
		},
		{
			name: "background-attachment",
			category: "Background and Border Properties",
			doc: "Sets whether a background image is fixed or scrolls with the rest of the page",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/background-attachment"
		},
		{
			name: "background-clip",
			category: "Background and Border Properties",
			doc: "Specifies the painting area of the background",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/background-clip"
		},
		{
			name: "background-color",
			category: "Background and Border Properties",
			doc: "Specifies the background color of an element",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/background-color"
		},
		{
			name: "background-image",
			category: "Background and Border Properties",
			doc: "Specifies one or more background images for an element",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/background-image"
		},
		{
			name: "background-origin",
			category: "Background and Border Properties",
			doc: "Specifies where the background image(s) is/are positioned",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/background-origin"
		},
		{
			name: "background-position",
			category: "Background and Border Properties",
			doc: "Specifies the position of a background image",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/background-position"
		},
		{
			name: "background-repeat",
			category: "Background and Border Properties",
			doc: "Sets how a background image will be repeated",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/background-repeat"
		},
		{
			name: "background-size",
			category: "Background and Border Properties",
			doc: "Specifies the size of the background image(s)",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/background-size"
		},
		{
			name: "border",
			category: "Background and Border Properties",
			doc: "Sets all the border properties in one declaration",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border"
		},
		{
			name: "border-bottom",
			category: "Background and Border Properties",
			doc: "Sets all the bottom border properties in one declaration",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-bottom"
		},
		{
			name: "border-bottom-color",
			category: "Background and Border Properties",
			doc: "Sets the color of the bottom border",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-bottom-color"
		},
		{
			name: "border-bottom-left-radius",
			category: "Background and Border Properties",
			doc: "Defines the shape of the border of the bottom-left corner",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-bottom-left-radius"
		},
		{
			name: "border-bottom-right-radius",
			category: "Background and Border Properties",
			doc: "Defines the shape of the border of the bottom-right corner",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-bottom-right-radius"
		},
		{
			name: "border-bottom-style",
			category: "Background and Border Properties",
			doc: "Sets the style of the bottom border",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-bottom-style"
		},
		{
			name: "border-bottom-width",
			category: "Background and Border Properties",
			doc: "Sets the width of the bottom border",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-bottom-width"
		},
		{
			name: "border-collapse",
			category: "Table Properties",
			doc: "Specifies whether or not table borders should be collapsed",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-collapse"
		},
		{
			name: "border-color",
			category: "Background and Border Properties",
			doc: "Sets the color of the four borders",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-color"
		},
		{
			name: "border-image",
			category: "Background and Border Properties",
			doc: "A shorthand property for setting all the border-image-* properties",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-image"
		},
		{
			name: "border-image-outset",
			category: "Background and Border Properties",
			doc: "Specifies the amount by which the border image area extends beyond the border box",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-image-outset"
		},
		{
			name: "border-image-repeat",
			category: "Background and Border Properties",
			doc: "Specifies whether the border image should be repeated, rounded or stretched",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-image-repeat"
		},
		{
			name: "border-image-slice",
			category: "Background and Border Properties",
			doc: "Specifies how to slice the border image",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-image-slice"
		},
		{
			name: "border-image-source",
			category: "Background and Border Properties",
			doc: "Specifies the path to the image to be used as a border",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-image-source"
		},
		{
			name: "border-image-width",
			category: "Background and Border Properties",
			doc: "Specifies the widths of the image-border",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-image-width"
		},
		{
			name: "border-left",
			category: "Background and Border Properties",
			doc: "Sets all the left border properties in one declaration",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-left"
		},
		{
			name: "border-left-color",
			category: "Background and Border Properties",
			doc: "Sets the color of the left border",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-left-color"
		},
		{
			name: "border-left-style",
			category: "Background and Border Properties",
			doc: "Sets the style of the left border",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-left-style"
		},
		{
			name: "border-left-width",
			category: "Background and Border Properties",
			doc: "Sets the width of the left border",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-left-width"
		},
		{
			name: "border-radius",
			category: "Background and Border Properties",
			doc: "A shorthand property for setting all the four border-*-radius properties",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-radius"
		},
		{
			name: "border-right",
			category: "Background and Border Properties",
			doc: "Sets all the right border properties in one declaration",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-right"
		},
		{
			name: "border-right-color",
			category: "Background and Border Properties",
			doc: "Sets the color of the right border",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-right-color"
		},
		{
			name: "border-right-style",
			category: "Background and Border Properties",
			doc: "Sets the style of the right border",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-right-style"
		},
		{
			name: "border-right-width",
			category: "Background and Border Properties",
			doc: "Sets the width of the right border",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-right-width"
		},
		{
			name: "border-spacing",
			category: "Table Properties",
			doc: "Specifies the distance between the borders of adjacent cells",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-spacing"
		},
		{
			name: "border-style",
			category: "Background and Border Properties",
			doc: "Sets the style of the four borders",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-style"
		},
		{
			name: "border-top",
			category: "Background and Border Properties",
			doc: "Sets all the top border properties in one declaration",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-top"
		},
		{
			name: "border-top-color",
			category: "Background and Border Properties",
			doc: "Sets the color of the top border",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-top-color"
		},
		{
			name: "border-top-left-radius",
			category: "Background and Border Properties",
			doc: "Defines the shape of the border of the top-left corner",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-top-left-radius"
		},
		{
			name: "border-top-right-radius",
			category: "Background and Border Properties",
			doc: "Defines the shape of the border of the top-right corner",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-top-right-radius"
		},
		{
			name: "border-top-style",
			category: "Background and Border Properties",
			doc: "Sets the style of the top border",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-top-style"
		},
		{
			name: "border-top-width",
			category: "Background and Border Properties",
			doc: "Sets the width of the top border",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-top-width"
		},
		{
			name: "border-width",
			category: "Background and Border Properties",
			doc: "Sets the width of the four borders",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-width"
		},
		{
			name: "bottom",
			category: "Basic Box Properties",
			doc: "Specifies the bottom position of a positioned element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/bottom"
		},
		{
			name: "box-decoration-break",
			category: "Background and Border Properties",
			doc: "Sets the behaviour of the background and border of an element at page-break, or, for in-line elements, at line-break.",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/box-decoration-break"
		},
		{
			name: "box-shadow",
			category: "Background and Border Properties",
			doc: "Attaches one or more drop-shadows to the box",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow"
		},
		{
			name: "box-sizing",
			category: "Basic User Interface Properties",
			doc: "Tells the browser what the sizing properties (width and height) should include",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/box-sizing"
		},
		{
			name: "break-after",
			category: "Multi-column Layout Properties",
			doc: "Specifies the page-, column-, or region-break behavior after the generated box",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/break-after"
		},
		{
			name: "break-before",
			category: "Multi-column Layout Properties",
			doc: "Specifies the page-, column-, or region-break behavior before the generated box",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/break-before"
		},
		{
			name: "break-inside",
			category: "Multi-column Layout Properties",
			doc: "Specifies the page-, column-, or region-break behavior inside the generated box",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/break-inside"
		},
		{
			name: "caption-side",
			category: "Table Properties",
			doc: "Specifies the placement of a table caption",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/caption-side"
		},
		{
			name: "clear",
			category: "Basic Box Properties",
			doc: "Specifies which sides of an element where other floating elements are not allowed",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/clear"
		},
		{
			name: "clip",
			category: "Basic Box Properties",
			doc: "Clips an absolutely positioned element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/clip"
		},
		{
			name: "color",
			category: "Color Properties",
			doc: "Sets the color of text",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/color"
		},
		{
			name: "column-count",
			category: "Multi-column Layout Properties",
			doc: "Specifies the number of columns an element should be divided into",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/column-count"
		},
		{
			name: "column-fill",
			category: "Multi-column Layout Properties",
			doc: "Specifies how to fill columns",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/column-fill"
		},
		{
			name: "column-gap",
			category: "Multi-column Layout Properties",
			doc: "Specifies the gap between the columns",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/column-gap"
		},
		{
			name: "column-rule",
			category: "Multi-column Layout Properties",
			doc: "A shorthand property for setting all the column-rule-* properties",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/column-rule"
		},
		{
			name: "column-rule-color",
			category: "Multi-column Layout Properties",
			doc: "Specifies the color of the rule between columns",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/column-rule-color"
		},
		{
			name: "column-rule-style",
			category: "Multi-column Layout Properties",
			doc: "Specifies the style of the rule between columns",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/column-rule-style"
		},
		{
			name: "column-rule-width",
			category: "Multi-column Layout Properties",
			doc: "Specifies the width of the rule between columns",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/column-rule-width"
		},
		{
			name: "column-span",
			category: "Multi-column Layout Properties",
			doc: "Specifies how many columns an element should span across",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/column-span"
		},
		{
			name: "column-width",
			category: "Multi-column Layout Properties",
			doc: "Specifies the width of the columns",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/column-width"
		},
		{
			name: "columns",
			category: "Multi-column Layout Properties",
			doc: "A shorthand property for setting column-width and column-count",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/columns"
		},
		{
			name: "content",
			category: "Basic User Interface Properties",
			doc: "Used with the :before and :after pseudo-elements, to insert generated content",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/content"
		},
		{
			name: "counter-increment",
			category: "Lists and Counters Properties",
			doc: "Increments one or more counters",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/counter-increment"
		},
		{
			name: "counter-reset",
			category: "Lists and Counters Properties",
			doc: "Creates or resets one or more counters",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/counter-reset"
		},
		{
			name: "cursor",
			category: "Basic User Interface Properties",
			doc: "Specifies the type of cursor to be displayed",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/cursor"
		},
		{
			name: "direction",
			category: "Writing Modes Properties",
			doc: "Specifies the text direction/writing direction",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/direction"
		},
		{
			name: "display",
			category: "Basic Box Properties",
			doc: "Specifies how a certain HTML element should be displayed",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/display"
		},
		{
			name: "empty-cells",
			category: "Table Properties",
			doc: "Specifies whether or not to display borders and background on empty cells in a table",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/empty-cells"
		},
		{
			name: "filter",
			category: "Filter Effects Properties",
			doc: "Defines effects (e.g. blurring or color shifting) on an element before the element is displayed",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/filter"
		},
		{
			name: "flex",
			category: "Flexible Box Layout",
			doc: "Specifies the length of the item, relative to the rest",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/flex"
		},
		{
			name: "flex-basis",
			category: "Flexible Box Layout",
			doc: "Specifies the initial length of a flexible item",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/flex-basis"
		},
		{
			name: "flex-direction",
			category: "Flexible Box Layout",
			doc: "Specifies the direction of the flexible items",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/flex-direction"
		},
		{
			name: "flex-flow",
			category: "Flexible Box Layout",
			doc: "A shorthand property for the flex-direction and the flex-wrap properties",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/flex-flow"
		},
		{
			name: "flex-grow",
			category: "Flexible Box Layout",
			doc: "Specifies how much the item will grow relative to the rest",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/flex-grow"
		},
		{
			name: "flex-shrink",
			category: "Flexible Box Layout",
			doc: "Specifies how the item will shrink relative to the rest",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/flex-shrink"
		},
		{
			name: "flex-wrap",
			category: "Flexible Box Layout",
			doc: "Specifies whether the flexible items should wrap or not",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/flex-wrap"
		},
		{
			name: "float",
			category: "Basic Box Properties",
			doc: "Specifies whether or not a box should float",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/float"
		},
		{
			name: "font",
			category: "Font Properties",
			doc: "Sets all the font properties in one declaration",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font"
		},
		{
			name: "font-family",
			category: "Font Properties",
			doc: "Specifies the font family for text",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-family"
		},
		{
			name: "font-feature-settings",
			category: "Font Properties",
			doc: "Allows control over advanced typographic features in OpenType fonts",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-feature-settings"
		},
		{
			name: "font-kerning",
			category: "Font Properties",
			doc: "Controls the usage of the kerning information (how letters are spaced)",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-kerning"
		},
		{
			name: "font-language-override",
			category: "Font Properties",
			doc: "Controls the usage of language-specific glyphs in a typeface",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-language-override"
		},
		{
			name: "font-size",
			category: "Font Properties",
			doc: "Specifies the font size of text",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-size"
		},
		{
			name: "font-size-adjust",
			category: "Font Properties",
			doc: "Preserves the readability of text when font fallback occurs",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-size-adjust"
		},
		{
			name: "font-stretch",
			category: "Font Properties",
			doc: "Selects a normal, condensed, or expanded face from a font family",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-stretch"
		},
		{
			name: "font-style",
			category: "Font Properties",
			doc: "Specifies the font style for text",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-style"
		},
		{
			name: "font-synthesis",
			category: "Font Properties",
			doc: "Controls which missing typefaces (bold or italic) may be synthesized by the browser",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-synthesis"
		},
		{
			name: "font-variant",
			category: "Font Properties",
			doc: "Specifies whether or not a text should be displayed in a small-caps font",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant"
		},
		{
			name: "font-variant-alternates",
			category: "Font Properties",
			doc: "Controls the usage of alternate glyphs associated to alternative names defined in @font-feature-values",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-alternates"
		},
		{
			name: "font-variant-caps",
			category: "Font Properties",
			doc: "Controls the usage of alternate glyphs for capital letters",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-caps"
		},
		{
			name: "font-variant-east-asian",
			category: "Font Properties",
			doc: "Controls the usage of alternate glyphs for East Asian scripts (e.g Japanese and Chinese)",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-east-asian"
		},
		{
			name: "font-variant-ligatures",
			category: "Font Properties",
			doc: "Controls which ligatures and contextual forms are used in textual content of the elements it applies to",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-ligatures"
		},
		{
			name: "font-variant-numeric",
			category: "Font Properties",
			doc: "Controls the usage of alternate glyphs for numbers, fractions, and ordinal markers",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric"
		},
		{
			name: "font-variant-position",
			category: "Font Properties",
			doc: "Controls the usage of alternate glyphs of smaller size positioned as superscript or subscript regarding the baseline of the font",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-position"
		},
		{
			name: "font-weight",
			category: "Font Properties",
			doc: "Specifies the weight of a font",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight"
		},
		{
			name: "hanging-punctuation",
			category: "Text Properties",
			doc: "Specifies whether a punctuation character may be placed outside the line box",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/hanging-punctuation"
		},
		{
			name: "height",
			category: "Basic Box Properties",
			doc: "Sets the height of an element",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/height"
		},
		{
			name: "hyphens",
			category: "Text Properties",
			doc: "Sets how to split words to improve the layout of paragraphs",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/hyphens"
		},
		{
			name: "image-orientation",
			category: "Image Values and Replaced Content",
			doc: "Specifies a rotation in the right or clockwise direction that a user agent applies to an image (This property is likely going to be deprecated and its functionality moved to HTML)",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/image-orientation"
		},
		{
			name: "image-rendering",
			category: "Image Values and Replaced Content",
			doc: "Gives a hint to the browser about what aspects of an image are most important to preserve when the image is scaled",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering"
		},
		{
			name: "image-resolution",
			category: "Image Values and Replaced Content",
			doc: "Specifies the intrinsic resolution of all raster images used in/on the element",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/image-resolution"
		},
		{
			name: "ime-mode",
			category: "Basic User Interface Properties",
			doc: "Controls the state of the input method editor for text fields",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/ime-mode"
		},
		{
			name: "justify-content",
			category: "Flexible Box Layout",
			doc: "Specifies the alignment between the items inside a flexible container when the items do not use all available space",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/justify-content"
		},
		{
			name: "left",
			category: "Basic Box Properties",
			doc: "Specifies the left position of a positioned element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/left"
		},
		{
			name: "letter-spacing",
			category: "Text Properties",
			doc: "Increases or decreases the space between characters in a text",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/letter-spacing"
		},
		{
			name: "line-break",
			category: "Text Properties",
			doc: "Specifies how/if to break lines",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/line-break"
		},
		{
			name: "line-height",
			category: "Text Properties",
			doc: "Sets the line height",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/line-height"
		},
		{
			name: "list-style",
			category: "Lists and Counters Properties",
			doc: "Sets all the properties for a list in one declaration",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/list-style"
		},
		{
			name: "list-style-image",
			category: "Lists and Counters Properties",
			doc: "Specifies an image as the list-item marker",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/list-style-image"
		},
		{
			name: "list-style-position",
			category: "Lists and Counters Properties",
			doc: "Specifies if the list-item markers should appear inside or outside the content flow",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/list-style-position"
		},
		{
			name: "list-style-type",
			category: "Lists and Counters Properties",
			doc: "Specifies the type of list-item marker",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/list-style-type"
		},
		{
			name: "margin",
			category: "Basic Box Properties",
			doc: "Sets all the margin properties in one declaration",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/margin"
		},
		{
			name: "margin-bottom",
			category: "Basic Box Properties",
			doc: "Sets the bottom margin of an element",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/margin-bottom"
		},
		{
			name: "margin-left",
			category: "Basic Box Properties",
			doc: "Sets the left margin of an element",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/margin-left"
		},
		{
			name: "margin-right",
			category: "Basic Box Properties",
			doc: "Sets the right margin of an element",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/margin-right"
		},
		{
			name: "margin-top",
			category: "Basic Box Properties",
			doc: "Sets the top margin of an element",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/margin-top"
		},
		{
			name: "mark",
			category: "Speech Properties",
			doc: "A shorthand property for setting the mark-before and mark-after properties",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/mark"
		},
		{
			name: "mark-after",
			category: "Speech Properties",
			doc: "Allows named markers to be attached to the audio stream",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/mark-after"
		},
		{
			name: "mark-before",
			category: "Speech Properties",
			doc: "Allows named markers to be attached to the audio stream",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/mark-before"
		},
		{
			name: "marks",
			category: "Generated Content for Paged Media",
			doc: "Adds crop and/or cross marks to the document",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/marks"
		},
		{
			name: "marquee-direction",
			category: "Marquee Properties",
			doc: "Sets the direction of the moving content",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/marquee-direction"
		},
		{
			name: "marquee-play-count",
			category: "Marquee Properties",
			doc: "Sets how many times the content move",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/marquee-play-count"
		},
		{
			name: "marquee-speed",
			category: "Marquee Properties",
			doc: "Sets how fast the content scrolls",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/marquee-speed"
		},
		{
			name: "marquee-style",
			category: "Marquee Properties",
			doc: "Sets the style of the moving content",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/marquee-style"
		},
		{
			name: "mask",
			category: "Masking Properties",
			doc: "",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/mask"
		},
		{
			name: "mask-type",
			category: "Masking Properties",
			doc: "",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/mask-type"
		},
		{
			name: "max-height",
			category: "Basic Box Properties",
			doc: "Sets the maximum height of an element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/max-height"
		},
		{
			name: "max-width",
			category: "Basic Box Properties",
			doc: "Sets the maximum width of an element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/max-width"
		},
		{
			name: "min-height",
			category: "Basic Box Properties",
			doc: "Sets the minimum height of an element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/min-height"
		},
		{
			name: "min-width",
			category: "Basic Box Properties",
			doc: "Sets the minimum width of an element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/min-width"
		},
		{
			name: "nav-down",
			category: "Basic User Interface Properties",
			doc: "Specifies where to navigate when using the arrow-down navigation key",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/nav-down"
		},
		{
			name: "nav-index",
			category: "Basic User Interface Properties",
			doc: "Specifies the tabbing order for an element",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/nav-index"
		},
		{
			name: "nav-left",
			category: "Basic User Interface Properties",
			doc: "Specifies where to navigate when using the arrow-left navigation key",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/nav-left"
		},
		{
			name: "nav-right",
			category: "Basic User Interface Properties",
			doc: "Specifies where to navigate when using the arrow-right navigation key",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/nav-right"
		},
		{
			name: "nav-up",
			category: "Basic User Interface Properties",
			doc: "Specifies where to navigate when using the arrow-up navigation key",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/nav-up"
		},
		{
			name: "object-fit",
			category: "Image Values and Replaced Content",
			doc: "Specifies how the contents of a replaced element should be fitted to the box established by its used height and width",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit"
		},
		{
			name: "object-position",
			category: "Image Values and Replaced Content",
			doc: "Specifies the alignment of the replaced element inside its box",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/object-position"
		},
		{
			name: "opacity",
			category: "Color Properties",
			doc: "Sets the opacity level for an element",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/opacity"
		},
		{
			name: "order",
			category: "Flexible Box Layout",
			doc: "Sets the order of the flexible item, relative to the rest",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/order"
		},
		{
			name: "orphans",
			category: "Paged Media",
			doc: "Sets the minimum number of lines that must be left at the bottom of a page when a page break occurs inside an element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/orphans"
		},
		{
			name: "outline",
			category: "Basic User Interface Properties",
			doc: "Sets all the outline properties in one declaration",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/outline"
		},
		{
			name: "outline-color",
			category: "Basic User Interface Properties",
			doc: "Sets the color of an outline",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/outline-color"
		},
		{
			name: "outline-offset",
			category: "Basic User Interface Properties",
			doc: "Offsets an outline, and draws it beyond the border edge",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/outline-offset"
		},
		{
			name: "outline-style",
			category: "Basic User Interface Properties",
			doc: "Sets the style of an outline",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/outline-style"
		},
		{
			name: "outline-width",
			category: "Basic User Interface Properties",
			doc: "Sets the width of an outline",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/outline-width"
		},
		{
			name: "overflow",
			category: "Basic Box Properties",
			doc: "Specifies what happens if content overflows an element's box",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/overflow"
		},
		{
			name: "overflow-wrap",
			category: "Text Properties",
			doc: "Specifies whether or not the browser may break lines within words in order to prevent overflow (when a string is too long to fit its containing box)",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-wrap"
		},
		{
			name: "overflow-x",
			category: "Basic Box Properties",
			doc: "Specifies whether or not to clip the left/right edges of the content, if it overflows the element's content area",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-x"
		},
		{
			name: "overflow-y",
			category: "Basic Box Properties",
			doc: "Specifies whether or not to clip the top/bottom edges of the content, if it overflows the element's content area",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-y"
		},
		{
			name: "padding",
			category: "Basic Box Properties",
			doc: "Sets all the padding properties in one declaration",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/padding"
		},
		{
			name: "padding-bottom",
			category: "Basic Box Properties",
			doc: "Sets the bottom padding of an element",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/padding-bottom"
		},
		{
			name: "padding-left",
			category: "Basic Box Properties",
			doc: "Sets the left padding of an element",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/padding-left"
		},
		{
			name: "padding-right",
			category: "Basic Box Properties",
			doc: "Sets the right padding of an element",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/padding-right"
		},
		{
			name: "padding-top",
			category: "Basic Box Properties",
			doc: "Sets the top padding of an element",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/padding-top"
		},
		{
			name: "page-break-after",
			category: "Paged Media",
			doc: "Sets the page-breaking behavior after an element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/page-break-after"
		},
		{
			name: "page-break-before",
			category: "Paged Media",
			doc: "Sets the page-breaking behavior before an element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/page-break-before"
		},
		{
			name: "page-break-inside",
			category: "Paged Media",
			doc: "Sets the page-breaking behavior inside an element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/page-break-inside"
		},
		{
			name: "perspective",
			category: "Transform Properties",
			doc: "Specifies the perspective on how 3D elements are viewed",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/perspective"
		},
		{
			name: "perspective-origin",
			category: "Transform Properties",
			doc: "Specifies the bottom position of 3D elements",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/perspective-origin"
		},
		{
			name: "phonemes",
			category: "Speech Properties",
			doc: "Specifies a phonetic pronunciation for the text contained by the corresponding element",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/phonemes"
		},
		{
			name: "position",
			category: "Basic Box Properties",
			doc: "Specifies the type of positioning method used for an element (static, relative, absolute or fixed)",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/position"
		},
		{
			name: "quotes",
			category: "Generated Content for Paged Media",
			doc: "Sets the type of quotation marks for embedded quotations",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/quotes"
		},
		{
			name: "resize",
			category: "Basic User Interface Properties",
			doc: "Specifies whether or not an element is resizable by the user",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/resize"
		},
		{
			name: "rest",
			category: "Speech Properties",
			doc: "A shorthand property for setting the rest-before and rest-after properties",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/rest"
		},
		{
			name: "rest-after",
			category: "Speech Properties",
			doc: "Specifies a rest or prosodic boundary to be observed after speaking an element's content",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/rest-after"
		},
		{
			name: "rest-before",
			category: "Speech Properties",
			doc: "Specifies a rest or prosodic boundary to be observed before speaking an element's content",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/rest-before"
		},
		{
			name: "right",
			category: "Basic Box Properties",
			doc: "Specifies the right position of a positioned element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/right"
		},
		{
			name: "tab-size",
			category: "Text Properties",
			doc: "Specifies the length of the tab-character",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/tab-size"
		},
		{
			name: "table-layout",
			category: "Table Properties",
			doc: "Sets the layout algorithm to be used for a table",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/table-layout"
		},
		{
			name: "text-align",
			category: "Text Properties",
			doc: "Specifies the horizontal alignment of text",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-align"
		},
		{
			name: "text-align-last",
			category: "Text Properties",
			doc: "Describes how the last line of a block or a line right before a forced line break is aligned when text-align is 'justify'",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-align-last"
		},
		{
			name: "text-combine-upright",
			category: "Writing Modes Properties",
			doc: "Specifies the combination of multiple characters into the space of a single character",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-combine-upright"
		},
		{
			name: "text-decoration",
			category: "Text Decoration Properties",
			doc: "Specifies the decoration added to text",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration"
		},
		{
			name: "text-decoration-color",
			category: "Text Decoration Properties",
			doc: "Specifies the color of the text-decoration",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration-color"
		},
		{
			name: "text-decoration-line",
			category: "Text Decoration Properties",
			doc: "Specifies the type of line in a text-decoration",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration-line"
		},
		{
			name: "text-decoration-style",
			category: "Text Decoration Properties",
			doc: "Specifies the style of the line in a text decoration",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration-style"
		},
		{
			name: "text-indent",
			category: "Text Properties",
			doc: "Specifies the indentation of the first line in a text-block",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-indent"
		},
		{
			name: "text-justify",
			category: "Text Properties",
			doc: "Specifies the justification method used when text-align is 'justify'",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-justify"
		},
		{
			name: "text-orientation",
			category: "Writing Modes Properties",
			doc: "Defines the orientation of the text in a line",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-orientation"
		},
		{
			name: "text-overflow",
			category: "Basic User Interface Properties",
			doc: "Specifies what should happen when text overflows the containing element",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-overflow"
		},
		{
			name: "text-shadow",
			category: "Text Decoration Properties",
			doc: "Adds shadow to text",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-shadow"
		},
		{
			name: "text-transform",
			category: "Text Properties",
			doc: "Controls the capitalization of text",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-transform"
		},
		{
			name: "text-underline-position",
			category: "Text Decoration Properties",
			doc: "Specifies the position of the underline which is set using the text-decoration property",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-underline-position"
		},
		{
			name: "top",
			category: "Basic Box Properties",
			doc: "Specifies the top position of a positioned element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/top"
		},
		{
			name: "transform",
			category: "Transform Properties",
			doc: "Applies a 2D or 3D transformation to an element",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/transform"
		},
		{
			name: "transform-origin",
			category: "Transform Properties",
			doc: "Allows you to change the position on transformed elements",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/transform-origin"
		},
		{
			name: "transform-style",
			category: "Transform Properties",
			doc: "Specifies how nested elements are rendered in 3D space",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style"
		},
		{
			name: "transition",
			category: "Transitions Properties",
			doc: "A shorthand property for setting the four transition properties",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/transition"
		},
		{
			name: "transition-delay",
			category: "Transitions Properties",
			doc: "Specifies when the transition effect will start",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/transition-delay"
		},
		{
			name: "transition-duration",
			category: "Transitions Properties",
			doc: "Specifies how many seconds or milliseconds a transition effect takes to complete",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/transition-duration"
		},
		{
			name: "transition-property",
			category: "Transitions Properties",
			doc: "Specifies the name of the CSS property the transition effect is for",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/transition-property"
		},
		{
			name: "transition-timing-function",
			category: "Transitions Properties",
			doc: "Specifies the speed curve of the transition effect",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/transition-timing-function"
		},
		{
			name: "unicode-bidi",
			category: "Writing Modes Properties",
			doc: "Used together with the direction property to set or return whether the text should be overridden to support multiple languages in the same document",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/unicode-bidi"
		},
		{
			name: "vertical-align",
			category: "Basic Box Properties",
			doc: "Sets the vertical alignment of an element",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/vertical-align"
		},
		{
			name: "visibility",
			category: "Basic Box Properties",
			doc: "Specifies whether or not an element is visible",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/visibility"
		},
		{
			name: "voice-balance",
			category: "Speech Properties",
			doc: "Specifies the balance between left and right channels",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/voice-balance"
		},
		{
			name: "voice-duration",
			category: "Speech Properties",
			doc: "Specifies how long it should take to render the selected element's content",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/voice-duration"
		},
		{
			name: "voice-pitch",
			category: "Speech Properties",
			doc: "Specifies the average pitch (a frequency) of the speaking voice",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/voice-pitch"
		},
		{
			name: "voice-pitch-range",
			category: "Speech Properties",
			doc: "Specifies variation in average pitch",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/voice-pitch-range"
		},
		{
			name: "voice-rate",
			category: "Speech Properties",
			doc: "Controls the speaking rate",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/voice-rate"
		},
		{
			name: "voice-stress",
			category: "Speech Properties",
			doc: "Indicates the strength of emphasis to be applied",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/voice-stress"
		},
		{
			name: "voice-volume",
			category: "Speech Properties",
			doc: "Refers to the amplitude of the waveform output by the speech synthesises",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/voice-volume"
		},
		{
			name: "white-space",
			category: "Text Properties",
			doc: "Specifies how white-space inside an element is handled",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/white-space"
		},
		{
			name: "widows",
			category: "Multi-column Layout Properties",
			doc: "Sets the minimum number of lines that must be left at the top of a page when a page break occurs inside an element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/widows"
		},
		{
			name: "width",
			category: "Basic Box Properties",
			doc: "Sets the width of an element",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/width"
		},
		{
			name: "word-break",
			category: "Text Properties",
			doc: "Specifies line breaking rules for non-CJK scripts",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/word-break"
		},
		{
			name: "word-spacing",
			category: "Text Properties",
			doc: "Increases or decreases the space between words in a text",
			cssSpec: "1",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/word-spacing"
		},
		{
			name: "word-wrap",
			category: "Text Properties",
			doc: "Allows long, unbreakable words to be broken and wrap to the next line",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/word-wrap"
		},
		{
			name: "writing-mode",
			category: "Writing Modes Properties",
			doc: "",
			cssSpec: "3",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode"
		},
		{
			name: "z-index",
			category: "Basic Box Properties",
			doc: "Sets the stack order of a positioned element",
			cssSpec: "2",
			url: "https://developer.mozilla.org/en-US/docs/Web/CSS/z-index"
		}
	];
	
	return {
		cssProperties: cssProperties
	};
});
