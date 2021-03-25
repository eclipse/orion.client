/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define("orion/editor/stylers/application_sql/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"ADD", "ALTER\\s+TABLE", "AND", "ASC",
		"BETWEEN",
		"COMMIT", "CONTAINS", "CREATE",
		"DELETE\\s+FROM", "DESC", "DROP(\\s+(INDEX|TABLE|DATABASE))?",
		"FROM",
		"GROUP\\s+BY",
		"HAVING",
		"INSERT\\s+INTO", "IN",
		"LIKE",
		"MODIFY",
		"ON", "ORDER\\s+BY", "OR",
		"PRIMARY\\s+KEY",
		"ROLLBACK",
		"SELECT(\\s+(COUNT|DISTINCT|SUM))?", "SET",
		"TO", "TRUNCATE\\s+TABLE",
		"UPDATE", "USE",
		"VALUES",
		"WHERE"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.sql",
		contentTypes: ["application/sql"],
		patterns: [
			{include: "orion.lib#string_singleQuote"},
			{include: "orion.lib#string_doubleQuote"},
			{include: "orion.lib#number_decimal"},
			{
				match: "(?i)\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.sql"
			}, {
				match: "<>|>=?|<=?|=",
				name: "punctuation.operator.sql"
			}
		],
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});

