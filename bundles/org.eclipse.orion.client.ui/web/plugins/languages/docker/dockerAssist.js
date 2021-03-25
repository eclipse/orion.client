/*******************************************************************************
 * @license
 * Copyright (c) 2017 Remy Suen and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Remy Suen - initial API and implementation
 *******************************************************************************/
/*eslint-env amd*/
define([
	'orion/objects',
	'i18n!plugins/languages/docker/nls/messages',
	'orion/i18nUtil'
], function(Objects, dockerMessages, i18nUtil) {

	/**
	 * @description Creates a new DockerContentAssist object
	 * @constructor
	 * @public
	 * @param {Object} keywords an array of Dockerfile keywords
	 * @param {Object} markdowns a dictionary of markdown documentation hovers
	 */
	function DockerContentAssist(keywords, markdowns) {
		this.keywords = keywords;
		this.markdowns = markdowns;
	}

	Objects.mixin(DockerContentAssist.prototype, {
		computeProposals: function (buffer, offset, context) {
			var firstCommentIdx = -1;
			var escapeCharacter = "\\";
			directiveCheck: for (var i = 0; i < buffer.length; i++) {
				switch (buffer.charAt(i)) {
					case '#':
						firstCommentIdx = i;
						// in the first comment of the file, look for directives
						var directive = "";
						var capture = false;
						escapeCheck: for (var j = i + 1; j < buffer.length; j++) {
							var char = buffer.charAt(j);
							switch (char) {
								case ' ':
								case '\t':
									// ignore whitespace if directive is well-formed or hasn't been found yet
									if (directive !== "escape" && directive !== "") {
										break escapeCheck;
									}
									continue;
								case '=':
									if (directive === "escape") {
										// '=' found and the directive that has been declared is the escape directive,
										// record its value so we know what the escape character of this Dockerfile is
										capture = true;
									} else {
										// unknown directive found, stop searching
										break escapeCheck;
									}
									break;
								default:
									if (capture) {
										// the escape directive should be a single character and followed by whitespace,
										// it should also either be a backslash or a backtick
										if ((j + 1 === buffer.length || isWhitespace(buffer.charAt(j + 1)))
												&& (char === '\\' || char === '`')) {
											escapeCharacter = char;
										}
										break escapeCheck;
									}
									directive = directive + char.toLowerCase();
									break;
							}
						}
						break directiveCheck;
					case ' ':
					case '\t':
						// ignore whitespace
						continue;
					case '\r':
					case '\n':
						break directiveCheck;
					default:
						// not a comment then not a directive
						break directiveCheck;
				}
			}

			// start from the offset and walk back
			commentCheck: for (i = offset - 1; i >= 0; i--) {
				switch (buffer.charAt(i)) {
					case '#':
						if (i === firstCommentIdx) {
							// we're in the first comment, might need to suggest
							// the escape directive as a proposal
							var directivePrefix = buffer.substring(i + 1, offset).trimLeft().toLowerCase();
							if ("escape".indexOf(directivePrefix) === 0) {
								return [ createEscape(context.prefix, offset - context.prefix.length, this.markdowns["escape"]) ];
							}
						}
						// in a comment, no proposals to suggest
						return [];
					case ' ':
					case '\t':
						// ignore whitespace
						continue;
					case '\r':
					case '\n':
						// walked back to the beginning of this line, not in a comment
						break commentCheck;
				}
			}

			// get every line in the file
			var split = buffer.trim().split("\n");
			var fromOnly = split.some(function(line) {
				var trimmed = line.trim();
				// check if it's a comment or an empty line
				return trimmed.length !== 0 && trimmed.charAt(0) !== '#';
			});
			if (!fromOnly) {
				// if we only have empty lines and comments, only suggest FROM
				return [ createFROM(context.prefix, offset, this.markdowns["FROM"]) ];
			}
			
			if (context.prefix === "") {
				context.prefix = calculateTruePrefix(buffer, offset, escapeCharacter);
			}

			var previousWord = "";
			var whitespace = false;
			var lineStart = 0;
			lineCheck: for (i = offset - 1; i >= 0; i--) {
				char = buffer.charAt(i);
				switch (char) {
					case '\n':
						if (buffer.charAt(i - 1) === escapeCharacter) {
							i--;
							continue;
						} else if (buffer.charAt(i - 1) === '\r' && buffer.charAt(i - 2) === escapeCharacter) {
							i = i - 2;
							continue;
						}

						if (previousWord !== "" && previousWord !== "ONBUILD") {
							// keyword content assist only allowed after an ONBUILD
							return [];
						}
						lineStart = i + 1;
						break lineCheck;
					case ' ':
					case '\t':
						if (whitespace) {
							if (previousWord !== "" && previousWord !== "ONBUILD") {
								// keyword content assist only allowed after an ONBUILD
								return [];
							}
						} else {
							whitespace = true;
						}
						break;
					default:
						if (whitespace) {
							previousWord = char.toUpperCase() + previousWord;
						}
						break;
				}
			}

			if (previousWord !== "" && previousWord !== "ONBUILD") {
				// only suggest proposals if at the front or after an ONBUILD
				return [];
			}

			var proposals = [];
			if (context.prefix === "") {
				createProposals(proposals, this.keywords, previousWord, "", offset, this.markdowns);
				return proposals;
			}

			var suggestions = [];
			var uppercasePrefix = context.prefix.toUpperCase();
			for (i = 0; i < this.keywords.length; i++) {
				if (this.keywords[i] === uppercasePrefix) {
					// prefix is a keyword already, nothing to suggest
					return [];
				} else if (this.keywords[i].indexOf(uppercasePrefix) === 0) {
					suggestions.push(this.keywords[i]);
				}
			}

			if (suggestions.length === 0) {
				// prefix doesn't match any keywords, nothing to suggest
				return [];
			}

			if (lineStart + context.line.indexOf(context.prefix) + context.prefix.length === offset) {
				createProposals(proposals, suggestions, previousWord, context.prefix, offset, this.markdowns);
				return proposals;
			}
			return [];
		}
	});

	function createProposals(proposals, keywords, previousWord, prefix, offset, markdowns) {
		for (var i = 0; i < keywords.length; i++) {
			switch (keywords[i]) {
				case "ARG":
					proposals.push(createARG_NameOnly(prefix, offset - prefix.length));
					proposals.push(createARG_DefaultValue(prefix, offset - prefix.length));
					break;
				case "HEALTHCHECK":
					proposals.push(createHEALTHCHECK_CMD(prefix, offset - prefix.length));
					proposals.push(createHEALTHCHECK_NONE(prefix, offset - prefix.length));
					break;
				default:
					proposals.push(createSingleProposals(keywords[i], prefix, offset, markdowns));
					break;
			}
		}

		if (previousWord === "ONBUILD") {
			// can't have FROM, MAINTAINER, or ONBUILD follow an ONBUILD
			for (i = 0; i < proposals.length; i++) {
				switch (proposals[i].name) {
					case "FROM":
					case "MAINTAINER":
					case "ONBUILD":
						proposals.splice(i, 1);
						i--;
						break;
				}
			}
		}
	}

	function isWhitespace(char) {
		return char === ' ' || char === '\t' || char === '\r' || char === '\n';
	}

	/**
	 * Walks back in the text buffer to calculate the true prefix of the
	 * current text caret offset. Orion's provided prefix does not include
	 * symbols but we do want to consider that a prefix in Dockerfiles.
	 * 
	 * @param buffer the content of the opened file
	 * @param offset the current text caret's offset
	 * @param escapeCharacter the escape character defined in this Dockerfile
	 */
	function calculateTruePrefix(buffer, offset, escapeCharacter) {
		var char = buffer.charAt(offset - 1);
		switch (char) {
			case '\n':
				var escapedPrefix = "";
				for (var i = offset - 1; i >= 0; i--) {
					if (buffer.charAt(i) === '\n') {
						if (buffer.charAt(i - 1) === escapeCharacter) {
							i--;
						} else if (buffer.charAt(i - 1) === '\r' && buffer.charAt(i - 2) === escapeCharacter) {
							i = i -2;
						} else {
							break;
						}
					} else if (buffer.charAt(i) === ' ' || buffer.charAt(i) === '\t') {
						break;
					} else {
						escapedPrefix = buffer.charAt(i).toUpperCase() + escapedPrefix;
					}
				}
				
				if (escapedPrefix !== "") {
					return escapedPrefix;
				}
				break;
			case '\r':
			case ' ':
			case '\t':
				break;
			default:
				var truePrefix = char;
				prefixCheck: for (i = offset - 2; i >= 0; i--) {
					char = buffer.charAt(i);
					switch (char) {
						case '\r':
						case '\n':
						case ' ':
						case '\t':
							break prefixCheck;
						default:
							for (i = offset - 2; i >= 0; i--) {
								truePrefix = char + truePrefix;
							}
							break;
					}
				}
				return truePrefix;
		}
		return "";
	}

	function createSingleProposals(keyword, prefix, offset, markdowns) {
		switch (keyword) {
			case "ADD":
				return createADD(prefix, offset - prefix.length, markdowns[keyword]);
			case "CMD":
				return createCMD(prefix, offset - prefix.length, markdowns[keyword]);
			case "COPY":
				return createCOPY(prefix, offset - prefix.length, markdowns[keyword]);
			case "ENTRYPOINT":
				return createENTRYPOINT(prefix, offset - prefix.length, markdowns[keyword]);
			case "ENV":
				return createENV(prefix, offset - prefix.length, markdowns[keyword]);
			case "EXPOSE":
				return createEXPOSE(prefix, offset - prefix.length, markdowns[keyword]);
			case "FROM":
				return createFROM(prefix, offset - prefix.length, markdowns[keyword]);
			case "LABEL":
				return createLABEL(prefix, offset - prefix.length, markdowns[keyword]);
			case "MAINTAINER":
				return createMAINTAINER(prefix, offset - prefix.length, markdowns[keyword]);
			case "ONBUILD":
				return createONBUILD(prefix, offset - prefix.length, markdowns[keyword]);
			case "RUN":
				return createRUN(prefix, offset - prefix.length, markdowns[keyword]);
			case "SHELL":
				return createSHELL(prefix, offset - prefix.length, markdowns[keyword]);
			case "STOPSIGNAL":
				return createSTOPSIGNAL(prefix, offset - prefix.length, markdowns[keyword]);
			case "WORKDIR":
				return createWORKDIR(prefix, offset - prefix.length, markdowns[keyword]);
			case "VOLUME":
				return createVOLUME(prefix, offset - prefix.length, markdowns[keyword]);
			case "USER":
				return createUSER(prefix, offset - prefix.length, markdowns[keyword]);
		}
	}

	function createADD(prefix, offset, markdown) {
		return {
			name: "ADD",
			description: " source dest",
			proposal: "ADD source dest",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'source'
				{
					offset: offset + 4,
					length: 6
				},
				// linked mode for 'dest'
				{
					offset: offset + 11,
					length: 4
				}
			],
			escapePosition: offset + 15,
			hover: markdown
		};
	}

	function createARG_NameOnly(prefix, offset) {
		return {
			name: "ARG",
			description: " name",
			proposal: "ARG name",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'name'
				{
					offset: offset + 4,
					length: 4
				}
			],
			escapePosition: offset + 8,
			hover: {
				type: "markdown",
				content: dockerMessages["proposalArgNameOnly"] +
					"```\n" +
					"ARG userName\n" +
					"```" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#arg")
			}
		};
	}

	function createARG_DefaultValue(prefix, offset) {
		return {
			name: "ARG",
			description: " name=defaultValue",
			proposal: "ARG name=defaultValue",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'name'
				{
					offset: offset + 4,
					length: 4
				},
				// linked mode for 'defaultValue'
				{
					offset: offset + 9,
					length: 12
				}
			],
			escapePosition: offset + 21,
			hover: {
				type: "markdown",
				content: dockerMessages["proposalArgDefaultValue"] +
					"```\n" +
					"ARG testOutputDir=test\n" +
					"```" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#arg")
			}
		};
	}

	function createCMD(prefix, offset, markdown) {
		return {
			name: "CMD",
			description: " [ \"executable\" ]",
			proposal: "CMD [ \"executable\" ]",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'executable'
				{
					offset: offset + 7,
					length: 10
				}
			],
			escapePosition: offset + 20,
			hover: markdown
		};
	}

	function createCOPY(prefix, offset, markdown) {
		return {
			name: "COPY",
			description: " source dest",
			proposal: "COPY source dest",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'source'
				{
					offset: offset + 5,
					length: 6
				},
				// linked mode for 'dest'
				{
					offset: offset + 12,
					length: 4
				}
			],
			escapePosition: offset + 16,
			hover: markdown
		};
	}

	function createENTRYPOINT(prefix, offset, markdown) {
		return {
			name: "ENTRYPOINT",
			description: " [ \"executable\" ]",
			proposal: "ENTRYPOINT [ \"executable\" ]",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'executable'
				{
					offset: offset + 14,
					length: 10
				}
			],
			escapePosition: offset + 27,
			hover: markdown
		};
	}

	function createENV(prefix, offset, markdown) {
		return {
			name: "ENV",
			description: " key=value",
			proposal: "ENV key=value",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'key'
				{
					offset: offset + 4,
					length: 3
				},
				// linked mode for 'value'
				{
					offset: offset + 8,
					length: 5
				}
			],
			escapePosition: offset + 13,
			hover: markdown
		};
	}

	function createEXPOSE(prefix, offset, markdown) {
		return {
			name: "EXPOSE",
			description: " port",
			proposal: "EXPOSE port",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'port'
				{
					offset: offset + 7,
					length: 4
				}
			],
			escapePosition: offset + 11,
			hover: markdown
		};
	}

	function createFROM(prefix, offset, markdown) {
		return {
			name: "FROM",
			description: " baseImage",
			proposal: "FROM baseImage",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'baseImage'
				{
					offset: offset + 5,
					length: 9
				}
			],
			escapePosition: offset + 14,
			hover: markdown
		};
	}

	function createHEALTHCHECK_CMD(prefix, offset) {
		return {
			name: "HEALTHCHECK",
			description: " --interval=30s --timeout=30s --retries=3 CMD [ \"executable\" ]",
			proposal: "HEALTHCHECK --interval=30s --timeout=30s --retries=3 CMD [ \"executable\" ]",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'interval'
				{
					offset: offset + 23,
					length: 3
				},
				// linked mode for 'timeout'
				{
					offset: offset + 37,
					length: 3
				},
				// linked mode for 'retries'
				{
					offset: offset + 51,
					length: 1
				},
				// linked mode for 'executable'
				{
					offset: offset + 60,
					length: 10
				}
			],
			escapePosition: offset + 73,
			hover: {
				type: "markdown",
				content: dockerMessages["proposalHealthcheckExec"] +
				"```\n" +
				"HEALTHCHECK --interval=10m --timeout=5s \\\n" +
				"    CMD curl -f http://localhost/ || exit 1\n" +
				"```" + 
				i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#healthcheck")
			}
		};
	}

	function createHEALTHCHECK_NONE(prefix, offset) {
		return {
			name: "HEALTHCHECK",
			description: " NONE",
			proposal: "HEALTHCHECK NONE",
			prefix: prefix,
			positions: [],
			overwrite: true,
			escapePosition: offset + 16,
			hover: {
				type: "markdown",
				content: dockerMessages["proposalHealthcheckNone"] +
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#healthcheck")
			}
		};
	}

	function createLABEL(prefix, offset, markdown) {
		return {
			name: "LABEL",
			description: " key=\"value\"",
			proposal: "LABEL key=\"value\"",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'key'
				{
					offset: offset + 6,
					length: 3
				},
				// linked mode for 'value'
				{
					offset: offset + 11,
					length: 5
				}
			],
			escapePosition: offset + 17,
			hover: markdown
		};
	}

	function createMAINTAINER(prefix, offset, markdown) {
		return {
			name: "MAINTAINER",
			description: " name",
			proposal: "MAINTAINER name",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'name'
				{
					offset: offset + 11,
					length: 4
				}
			],
			escapePosition: offset + 15,
			hover: markdown
		};
	}

	function createONBUILD(prefix, offset, markdown) {
		return {
			name: "ONBUILD",
			description: " INSTRUCTION",
			proposal: "ONBUILD INSTRUCTION",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'INSTRUCTION'
				{
					offset: offset + 8,
					length: 11
				}
			],
			escapePosition: offset + 19,
			hover: markdown
		};
	}

	function createRUN(prefix, offset, markdown) {
		return {
			name: "RUN",
			description: " command",
			proposal: "RUN command",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'command'
				{
					offset: offset + 4,
					length: 7
				}
			],
			escapePosition: offset + 11,
			hover: markdown
		};
	}

	function createSHELL(prefix, offset, markdown) {
		return {
			name: "SHELL",
			description: " [ \"executable\" ]",
			proposal: "SHELL [ \"executable\" ]",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'executable'
				{
					offset: offset + 9,
					length: 10
				}
			],
			escapePosition: offset + 22,
			hover: markdown
		};
	}

	function createSTOPSIGNAL(prefix, offset, markdown) {
		return {
			name: "STOPSIGNAL",
			description: " signal",
			proposal: "STOPSIGNAL signal",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'signal'
				{
					offset: offset + 11,
					length: 6
				}
			],
			escapePosition: offset + 17,
			hover: markdown
		};
	}

	function createUSER(prefix, offset, markdown) {
		return {
			name: "USER",
			description: " daemon",
			proposal: "USER daemon",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'daemon'
				{
					offset: offset + 5,
					length: 6
				}
			],
			escapePosition: offset + 11,
			hover: markdown
		};
	}

	function createVOLUME(prefix, offset, markdown) {
		return {
			name: "VOLUME",
			description: " [ \"/data\" ]",
			proposal: "VOLUME [ \"/data\" ]",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for '/data'
				{
					offset: offset + 10,
					length: 5
				}
			],
			escapePosition: offset + 18,
			hover: markdown
		};
	}

	function createWORKDIR(prefix, offset, markdown) {
		return {
			name: "WORKDIR",
			description: " /path",
			proposal: "WORKDIR /path",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for 'path'
				{
					offset: offset + 8,
					length: 5
				}
			],
			escapePosition: offset + 13,
			hover: markdown
		};
	}

	function createEscape(prefix, offset, markdown) {
		return {
			name: "escape",
			description: "=`",
			proposal: "escape=`",
			prefix: prefix,
			overwrite: true,
			positions: [
				// linked mode for '`'
				{
					offset: offset + 7,
					length: 1
				}
			],
			escapePosition: offset + 8,
			hover: markdown
		};
	}

	return {
		DockerContentAssist : DockerContentAssist
	};
});
