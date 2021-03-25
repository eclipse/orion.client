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
define("orion/editor/stylers/lib/syntax", [], function() {
	return {
		id: "orion.lib",
		grammars: [{
			id: "orion.lib",
			repository: {
				brace_open: {
					match: "{",
					name: "punctuation.section.block.begin"
				},
				brace_close: {
					match: "}",
					name: "punctuation.section.block.end"
				},
				bracket_open: {
					match: "\\[",
					name: "punctuation.section.bracket.begin"
				},
				bracket_close: {
					match: "\\]",
					name: "punctuation.section.bracket.end"
				},
				parenthesis_open: {
					match: "\\(",
					name: "punctuation.section.parens.begin"
				},
				parenthesis_close: {
					match: "\\)",
					name: "punctuation.section.parens.end"
				},
				operator: {
					match: "(\\+|-|!|=|>|<|&|(\\|\\|))+",
					name: "punctuation.operator"
				},
				doc_block: {
					begin: "/\\*\\*",
					end: "\\*/",
					name: "comment.block.documentation",
					beginCaptures: {
						0: {name: "comment.block.documentation.start"}
					},
					endCaptures: {
						0: {name: "comment.block.documentation.end"}
					},
					patterns: [
						{
							match: "@(?:(?!\\*/)\\S)*",
							name: "meta.documentation.annotation"
						}, {
							match: "<[^\\s>]*>",
							name: "meta.documentation.tag"
						}, {
							match: "(\\b)(TODO)(\\b)(((?!\\*/).)*)",
							name: "meta.annotation.task.todo",
							captures: {
								2: {name: "keyword.other.documentation.task"},
								4: {name: "comment.block"}
							}
						}
					]
				},
				number_decimal: {
					match: "\\b-?(?:\\.\\d+|\\d+\\.?\\d*)(?:[eE][+-]?\\d+)?\\b",
					name: "constant.numeric.number"
				},
				number_hex: {
					match: "\\b0[xX][0-9A-Fa-f]+\\b",
					name: "constant.numeric.hex"
				},
				string_doubleQuote: {
					match: '"(?:\\\\.|[^"])*"?',
					name: "string.quoted.double"
				},
				string_singleQuote: {
					match: "'(?:\\\\.|[^'])*'?",
					name: "string.quoted.single"
				},
				todo_comment_singleLine: {
					match: "(\\b)(TODO)(\\b)(.*)",
					name: "meta.annotation.task.todo",
					captures: {
						2: {name: "keyword.other.documentation.task"},
						4: {name: "comment.line"}
					}
				}
			}
		}, {
			id: "orion.c-like",
			repository: {
				comment_singleLine: {
					match: {match: "(//).*", literal: "//"},
					name: "comment.line.double-slash",
					captures: {
						1: {name: "comment.line.double-slash.start"}
					},
					patterns: [
						{
							include: "orion.lib#todo_comment_singleLine"
						}
					]
				},
				comment_block: {
					begin: {match: "/\\*", literal: "/*"},
					end: {match: "\\*/", literal: "*/"}, 
					name: "comment.block",
					beginCaptures: {
						0: {name: "comment.block.start"}
					},
					endCaptures: {
						0: {name: "comment.block.end"}
					},
					patterns: [
						{
							match: "(\\b)(TODO)(\\b)(((?!\\*/).)*)",
							name: "meta.annotation.task.todo",
							captures: {
								2: {name: "keyword.other.documentation.task"},
								4: {name: "comment.block"}
							}
						}
					]
				}
			}
		}],
		keywords: []
	};
});
