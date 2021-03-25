/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 ******************************************************************************/
/*eslint-env browser, amd*/
define({//Default message bundle
	// JSLint Fatal Error Messages
	"Stopping.": "Stopping. (${0}% scanned)",
	"Too many errors.": "Too many errors. (${0}% scanned)",
	"Stopping, unable to continue.": "Stopping, unable to continue. (${0}% scanned)",
	// JSLint Problem Messages
	"'{a}' is a reserved key.": "'${0}' is a reserved key.", // Only displayed for {"__proto__"}, __proto__ is a reserved key
	"'{a}' should not be greater than '{b}'.": "'${0}' should not be greater than '${1}'.", // Regex with comma separated numbers {"a": /{{7,4}}/} the lower number must come first
	"A regular expression literal can be confused with '/='.": "A regular expression literal can be confused with '/='.",
	"A trailing decimal point can be confused with a dot '{a}'.": "A trailing decimal point can be confused with a dot '${0}'.",
	"ADsafe comment violation.": "ADsafe comment violation.",
	"ADsafe string violation.": "ADsafe string violation.",
	"Avoid \\x-.": "Avoid \\x-.",
	"Avoid 0x-. '{a}'.": "Avoid 0x-. '${0}'.",
	"Bad escapement.": "Bad escapement.",
	"Bad hex color '{a}'.": "Bad hex color '${0}'.",
	"Bad HTML string": "Bad HTML string",
	"Bad identifier {a}.": "Bad identifier ${0}.",
	"Bad number '{a}'.": "Bad number '${0}'.",
	"Confusing regular expression.": "Confusing regular expression.",
	"Control character in string: {a}.": "Control character in string: ${0}.",
	"Dangerous comment.": "Dangerous comment.",
	"Don't use extra leading zeros '{a}'.": "Don't use extra leading zeros '${0}'.",
	"Duplicate key '{a}'.": "Duplicate key '${0}'.",
	"Empty class.": "Empty class.",
	"Escapement in style string.": "Escapement in style string.",
	"Expected '<\\/' and instead saw '</'.": "Expected '<\\/' and instead saw '</'.",
	"Expected {a} and instead saw {b}.": "Expected ${0} and instead saw ${1}.",
	"Expected '{a}' and instead saw '{b}'.": "Expected '${0}' and instead saw '${1}'.",
	"Expected a number and instead saw '{a}'.": "Expected a number and instead saw '${0}'.",
	"Expected a string and instead saw {a}.": "Expected a string and instead saw ${0}.",
	"Expected a JSON value.": "Expected a JSON value.",
	"HTML confusion in regular expression '<{a}'.": "HTML confusion in regular expression '<${0}'.",
	"Insecure '{a}'.": "Insecure '${0}'.",
	"Missing ']' to match '[' from line {a}.": "Missing '}' to match '{' from line ${0}.",
	"Missing '}' to match '{' from line {a}.": "Missing '}' to match '{' from line ${0}.",
	"Missing semicolon.": "Missing semicolon.",
	"Missing space after '{a}'.": "Missing space after '${0}'.",
	"Nested comment.": "Nested comment.",
	"Spaces are hard to count. Use {{a}}.": "Spaces are hard to count. Use {${0}}.",
	"Strings must use doublequote.": "Strings must use doublequote.",
	"Unclosed comment.": "Unclosed comment.",
	"Unclosed regular expression.": "Unclosed regular expression.",
	"Unclosed string.": "Unclosed string.",
	"Unescaped '{a}'.": "Unescaped '${0}'.",
	"Unexpected <\/ in comment.": "Unexpected <\/ in comment.",
	"Unexpected {a} in '{b}'.": "Unexpected ${0} in '${1}'.",
	"Unexpected '{a}'.": "Unexpected '${0}'.",
	"Unexpected '<!' in a string.": "Unexpected '<!' in a string.",
	"Unexpected comma.": "Unexpected comma.",
	"Unexpected comment.": "Unexpected comment.",
	"Unexpected control character in regular expression.": "Unexpected control character in regular expression.",
	"Unexpected escaped character '{a}' in regular expression.": "Unexpected escaped character '${0}' in regular expression.",
	"Unexpected space after '-'.": "Unexpected space after '-'.",
	"Unexpected space after '{a}'.": "Unexpected space after '${0}'.",
	"Unnecessary escapement.": "Unnecessary escapement."
});
