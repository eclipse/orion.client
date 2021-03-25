/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define("orion/editor/stylers/text_x-vb/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
	    "AddHandler", "AddressOf", "Aggregate", "Alias", "AndAlso",
	    "And", "Ansi", "Assembly", "Async", "As", "Auto", "Await",
	    "Binary", "Boolean", "ByRef", "Byte", "ByVal",
	    "Call", "Case", "Catch", "CBool", "CByte", "CChar", "CDate",
	    "CDbl", "CDec", "Char", "CInt", "Class", "CLng", "CObj", "Compare",
	    "Const", "CShort", "CSng", "CStr", "CType", "Custom",
	    "Date", "Decimal", "Declare", "Default", "Delegate", "Dim",
	    "DirectCast", "Distinct", "Double", "Do",
	    "Each", "ElseIf", "Else", "EndIf", "End", "Enum", "Equals",
	    "Erase", "Error", "Event", "Exit", "Explicit",
	    "False", "Finally", "For", "Friend", "From", "Function",
	    "GetType", "Get", "GoSub", "GoTo", "Group By", "Group Join",
	    "Handles",
	    "If", "Implements", "Imports", "Inherits", "Integer", "Interface",
	    "Into", "In", "IsFalse", "IsTrue", "Is", "Iterator",
	    "Join",
	    "Key",
	    "Let", "Lib", "Like", "Long", "Loop",
	    "Me", "Mid", "Module", "Mod", "MustInherit", "MustOverride",
	    "MyBase", "MyClass",
	    "Namespace", "New", "Next", "Nothing", "NotInheritable",
	    "NotOverridable", "Not",
	    "Object", "Off", "On", "Optional", "Option", "Order By", "OrElse",
	    "Or", "Overloads", "Overridable", "Overrides",
	    "ParamArray", "Preserve", "Private", "Property", "Protected", "Public",
	    "RaiseEvent", "ReadOnly", "ReDim", "REM", "RemoveHandler", "Resume", "Return",
	    "Select", "Set", "Shadows", "Shared", "Short", "Single", "Skip While", "Skip",
	    "Static", "Step", "Stop", "Strict", "String", "Structure", "Sub", "SyncLock",
	    "Take While", "Take", "Text", "Then", "Throw", "To", "True", "Try", "TypeOf",
	    "Unicode", "Until",
	    "Variant",
	    "Wend", "When", "Where", "While", "WithEvents", "With", "WriteOnly",
	    "Xor",
	    "Yield"
	];

	var preprocessorDirectives = ["Const", "ElseIf", "Else", "End", "ExternalSource", "If", "Region"];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.vb",
		contentTypes: ["text/x-vb"],
		patterns: [
			{
				match: "^\\s*#(?:" + preprocessorDirectives.join("|") + ")\\b[^$]*",
				name: "meta.preprocessor.vb"
			},
			{include: "orion.lib#string_doubleQuote"},
			{include: "#doc"},
			{include: "#comment"},
			{include: "orion.lib#brace_open"},
			{include: "orion.lib#brace_close"},
			{include: "orion.lib#bracket_open"},
			{include: "orion.lib#bracket_close"},
			{include: "orion.lib#parenthesis_open"},
			{include: "orion.lib#parenthesis_close"},
			{include: "orion.lib#operator"},
			{include: "orion.lib#number_decimal"},
			{include: "#number_hex"},
			{
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.vb"
			}
		],
		repository: {
			comment: {
				begin: {match: "'", literal: "'"},
				end: {match: "$", literal: ""},
				name: "comment.line.vb",
				patterns: [
					{
						include: "orion.lib#todo_comment_singleLine"
					}
				]
			},
			doc: {
				match: {match: "'''.*", literal: "'''"},
				name: "comment.line.documentation.vb",
				patterns: [
					{
						match: "<[^\\s>]*>",
						name: "meta.documentation.tag"
					}, {
						include: "orion.lib#todo_comment_singleLine"
					}
				]
			},
			number_hex: {
				match: "&[hH][0-9A-Fa-f]+\\b",
				name: "constant.numeric.hex.vb"
			},
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
