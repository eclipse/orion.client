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
 ******************************************************************************/
/*eslint-env mocha*/
define([
	'orion/editor/stylers/text_x-dockerfile/syntax',
	'plugins/languages/docker/dockerAssist',
	'chai/chai',
	'mocha/mocha' //must stay at the end, not a module
], function(mDockerfile, DockerAssist, chai) {
	var assert = chai.assert;

	function compute(buffer, offset, editorContext) {
		return dockerAssist.computeProposals(buffer, offset, editorContext);
	}

	function assertOnlyFROM(proposals, offset, prefix) {
		assert.equal(proposals.length, 1);
		assertFROM(proposals[0], offset, prefix);
	}

	function assertADD(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "ADD source dest");
		assert.equal(proposal.name, "ADD");
		assert.equal(proposal.description, " source dest");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 2);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 4);
		assert.equal(proposal.positions[0].length, 6);
		assert.equal(proposal.positions[1].offset, offset - prefix.length + 11);
		assert.equal(proposal.positions[1].length, 4);
		assert.equal(proposal.escapePosition, offset - prefix.length + 15);
	}

	function assertARG_NameOnly(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "ARG name");
		assert.equal(proposal.name, "ARG");
		assert.equal(proposal.description, " name");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 1);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 4);
		assert.equal(proposal.positions[0].length, 4);
		assert.equal(proposal.escapePosition, offset - prefix.length + 8);
	}

	function assertARG_DefaultValue(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "ARG name=defaultValue");
		assert.equal(proposal.name, "ARG");
		assert.equal(proposal.description, " name=defaultValue");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 2);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 4);
		assert.equal(proposal.positions[0].length, 4);
		assert.equal(proposal.positions[1].offset, offset - prefix.length + 9);
		assert.equal(proposal.positions[1].length, 12);
		assert.equal(proposal.escapePosition, offset - prefix.length + 21);
	}

	function assertCMD(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "CMD [ \"executable\" ]");
		assert.equal(proposal.name, "CMD");
		assert.equal(proposal.description, " [ \"executable\" ]");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 1);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 7);
		assert.equal(proposal.positions[0].length, 10);
		assert.equal(proposal.escapePosition, offset - prefix.length + 20);
	}

	function assertCOPY(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "COPY source dest");
		assert.equal(proposal.name, "COPY");
		assert.equal(proposal.description, " source dest");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 2);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 5);
		assert.equal(proposal.positions[0].length, 6);
		assert.equal(proposal.positions[1].offset, offset - prefix.length + 12);
		assert.equal(proposal.positions[1].length, 4);
		assert.equal(proposal.escapePosition, offset - prefix.length + 16);
	}

	function assertENTRYPOINT(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "ENTRYPOINT [ \"executable\" ]");
		assert.equal(proposal.name, "ENTRYPOINT");
		assert.equal(proposal.description, " [ \"executable\" ]");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 1);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 14);
		assert.equal(proposal.positions[0].length, 10);
		assert.equal(proposal.escapePosition, offset - prefix.length + 27);
	}

	function assertENV(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "ENV key=value");
		assert.equal(proposal.name, "ENV");
		assert.equal(proposal.description, " key=value");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.positions.length, 2);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 4);
		assert.equal(proposal.positions[0].length, 3);
		assert.equal(proposal.positions[1].offset, offset - prefix.length + 8);
		assert.equal(proposal.positions[1].length, 5);
		assert.equal(proposal.escapePosition, offset - prefix.length + 13);
	}

	function assertEXPOSE(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "EXPOSE port");
		assert.equal(proposal.name, "EXPOSE");
		assert.equal(proposal.description, " port");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 1);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 7);
		assert.equal(proposal.positions[0].length, 4);
		assert.equal(proposal.escapePosition, offset - prefix.length  + 11);
	}

	function assertFROM(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "FROM baseImage");
		assert.equal(proposal.name, "FROM");
		assert.equal(proposal.description, " baseImage");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 1);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 5);
		assert.equal(proposal.positions[0].length, 9);
		assert.equal(proposal.escapePosition, offset - prefix.length + 14);
	}

	function assertHEALTHCHECK_CMD(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "HEALTHCHECK --interval=30s --timeout=30s --retries=3 CMD [ \"executable\" ]");
		assert.equal(proposal.name, "HEALTHCHECK");
		assert.equal(proposal.description, " --interval=30s --timeout=30s --retries=3 CMD [ \"executable\" ]");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 4);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 23);
		assert.equal(proposal.positions[0].length, 3);
		assert.equal(proposal.positions[1].offset, offset - prefix.length + 37);
		assert.equal(proposal.positions[1].length, 3);
		assert.equal(proposal.positions[2].offset, offset - prefix.length + 51);
		assert.equal(proposal.positions[2].length, 1);
		assert.equal(proposal.positions[3].offset, offset - prefix.length + 60);
		assert.equal(proposal.positions[3].length, 10);
		assert.equal(proposal.escapePosition, offset - prefix.length + 73);
	}

	function assertHEALTHCHECK_NONE(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "HEALTHCHECK NONE");
		assert.equal(proposal.name, "HEALTHCHECK");
		assert.equal(proposal.description, " NONE");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 0);
		assert.equal(proposal.escapePosition, offset - prefix.length + 16);
	}

	function assertLABEL(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "LABEL key=\"value\"");
		assert.equal(proposal.name, "LABEL");
		assert.equal(proposal.description, " key=\"value\"");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 2);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 6);
		assert.equal(proposal.positions[0].length, 3);
		assert.equal(proposal.positions[1].offset, offset - prefix.length + 11);
		assert.equal(proposal.positions[1].length, 5);
		assert.equal(proposal.escapePosition, offset - prefix.length + 17);
	}

	function assertMAINTAINER(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "MAINTAINER name");
		assert.equal(proposal.name, "MAINTAINER");
		assert.equal(proposal.description, " name");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 1);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 11);
		assert.equal(proposal.positions[0].length, 4);
		assert.equal(proposal.escapePosition, offset - prefix.length + 15);
	}

	function assertONBUILD(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "ONBUILD INSTRUCTION");
		assert.equal(proposal.name, "ONBUILD");
		assert.equal(proposal.description, " INSTRUCTION");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 1);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 8);
		assert.equal(proposal.positions[0].length, 11);
		assert.equal(proposal.escapePosition, offset - prefix.length + 19);
	}

	function assertRUN(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "RUN command");
		assert.equal(proposal.name, "RUN");
		assert.equal(proposal.description, " command");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 1);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 4);
		assert.equal(proposal.positions[0].length, 7);
		assert.equal(proposal.escapePosition, offset - prefix.length + 11);
	}

	function assertSHELL(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "SHELL [ \"executable\" ]");
		assert.equal(proposal.name, "SHELL");
		assert.equal(proposal.description, " [ \"executable\" ]");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 1);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 9);
		assert.equal(proposal.positions[0].length, 10);
		assert.equal(proposal.escapePosition, offset - prefix.length + 22);
	}

	function assertSTOPSIGNAL(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "STOPSIGNAL signal");
		assert.equal(proposal.name, "STOPSIGNAL");
		assert.equal(proposal.description, " signal");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 1);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 11);
		assert.equal(proposal.positions[0].length, 6);
		assert.equal(proposal.escapePosition, offset - prefix.length + 17);
	}

	function assertUSER(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "USER daemon");
		assert.equal(proposal.name, "USER");
		assert.equal(proposal.description, " daemon");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 1);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 5);
		assert.equal(proposal.positions[0].length, 6);
		assert.equal(proposal.escapePosition, offset - prefix.length + 11);
	}

	function assertVOLUME(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "VOLUME [ \"/data\" ]");
		assert.equal(proposal.name, "VOLUME");
		assert.equal(proposal.description, " [ \"/data\" ]");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 1);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 10);
		assert.equal(proposal.positions[0].length, 5);
		assert.equal(proposal.escapePosition, offset - prefix.length + 18);
	}

	function assertWORKDIR(proposal, offset, prefix) {
		assert.equal(proposal.proposal, "WORKDIR /path");
		assert.equal(proposal.name, "WORKDIR");
		assert.equal(proposal.description, " /path");
		assert.equal(proposal.prefix, prefix);
		assert.equal(proposal.overwrite, true);
		assert.equal(proposal.positions.length, 1);
		assert.equal(proposal.positions[0].offset, offset - prefix.length + 8);
		assert.equal(proposal.positions[0].length, 5);
		assert.equal(proposal.escapePosition, offset - prefix.length + 13);
	}

	function assertDirectiveEscape(proposals, offset, prefix) {
		assert.equal(proposals.length, 1);
		assert.equal(proposals[0].proposal, "escape=`");
		assert.equal(proposals[0].name, "escape");
		assert.equal(proposals[0].description, "=`");
		assert.equal(proposals[0].prefix, prefix);
		assert.equal(proposals[0].overwrite, true);
		assert.equal(proposals[0].positions.length, 1);
		assert.equal(proposals[0].positions[0].offset, offset - prefix.length + 7);
		assert.equal(proposals[0].positions[0].length, 1);
		assert.equal(proposals[0].escapePosition, offset - prefix.length + 8);
	}

	function assertProposals(proposals, offset, prefix) {
		for (var i = 0; i < proposals.length; i++) {
			switch (proposals[i].name) {
				case "ADD":
					assertADD(proposals[i], offset, prefix);
					break;
				case "ARG":
					assertARG_NameOnly(proposals[i++], offset, prefix);
					assertARG_DefaultValue(proposals[i], offset, prefix);
					break;
				case "CMD":
					assertCMD(proposals[i], offset, prefix);
					break;
				case "COPY":
					assertCOPY(proposals[i], offset, prefix);
					break;
				case "ENTRYPOINT":
					assertENTRYPOINT(proposals[i], offset, prefix);
					break;
				case "ENV":
					assertENV(proposals[i], offset, prefix);
					break;
				case "EXPOSE":
					assertEXPOSE(proposals[i], offset, prefix);
					break;
				case "FROM":
					assertFROM(proposals[i], offset, prefix);
					break;
				case "HEALTHCHECK":
					assertHEALTHCHECK_CMD(proposals[i++], offset, prefix);
					assertHEALTHCHECK_NONE(proposals[i], offset, prefix);
					break;
				case "LABEL":
					assertLABEL(proposals[i], offset, prefix);
					break;
				case "MAINTAINER":
					assertMAINTAINER(proposals[i], offset, prefix);
					break;
				case "ONBUILD":
					assertONBUILD(proposals[i], offset, prefix);
					break;
				case "RUN":
					assertRUN(proposals[i], offset, prefix);
					break;
				case "SHELL":
					assertSHELL(proposals[i], offset, prefix);
					break;
				case "STOPSIGNAL":
					assertSTOPSIGNAL(proposals[i], offset, prefix);
					break;
				case "USER":
					assertUSER(proposals[i], offset, prefix);
					break;
				case "VOLUME":
					assertVOLUME(proposals[i], offset, prefix);
					break;
				case "WORKDIR":
					assertWORKDIR(proposals[i], offset, prefix);
					break;
				default:
					throw new Error("Unknown proposal name: " + proposals[i].name);
			}
		}
	}

	function assertONBUILDProposals(proposals, offset, prefix) {
		// +1 for two ARG proposals
		// +1 for two HEALTHCHECK proposals
		// -3 for ONBUILD, FROM, MAINTAINER
		assert.equal(proposals.length, mDockerfile.keywords.length - 1);
		assertProposals(proposals, offset, prefix);
	}

	function assertAllProposals(proposals, offset, prefix) {
		// +1 for two ARG proposals
		// +1 for two HEALTHCHECK proposals
		assert.equal(proposals.length, mDockerfile.keywords.length + 2);
		assertProposals(proposals, offset, prefix);
	}

	describe('Docker Content Assist Tests', function() {

		before(function() {
			var mockMarkdowns = {};
			for (var i = 0; i < mDockerfile.keywords.length; i++) {
				mockMarkdowns[mDockerfile.keywords[i]] = null;
			}
			dockerAssist = new DockerAssist.DockerContentAssist(mDockerfile.keywords, mockMarkdowns);
		});

		describe('no content', function() {
			it('empty file', function() {
				var proposals = compute("", 0, {
					prefix: "",
					line: ""
				});
				assertOnlyFROM(proposals, 0, "");
			});

			it('whitespace', function() {
				var proposals = compute(" ", 0, {
					prefix: "",
					line: " "
				});
				assertOnlyFROM(proposals, 0, "");

				proposals = compute("\n", 0, {
					prefix: "",
					line: ""
				});
				assertOnlyFROM(proposals, 0, "");

				proposals = compute("\n", 1, {
					prefix: "",
					line: ""
				});
				assertOnlyFROM(proposals, 1, "");
			});

			describe('comments only', function() {
				it('in comment', function() {
					var proposals = compute("# abc\n", 6, {
						prefix: "",
						line: ""
					});
					assertOnlyFROM(proposals, 6, "");

					proposals = compute("# abc", 5, {
						prefix: "abc",
						line: "# abc"
					});
					assert.equal(proposals.length, 0);

					proposals = compute("#FROM", 5, {
						prefix: "#FROM",
						line: "#FROM"
					});
					assert.equal(proposals.length, 0);
				});

				it('outside comment', function() {
					var proposals = compute("# abc", 0, {
						prefix: "",
						line: "# abc"
					});
					assertOnlyFROM(proposals, 0, "");
				});
			});
		});

		describe('keywords', function() {
			it('none', function() {
				var proposals = compute("F ", 2, {
					prefix: "",
					line: "F "
				});
				assert.equal(proposals.length, 0);
			});

			it('all', function() {
				var proposals = compute("FROM node\n", 10, {
					prefix: "",
					line: ""
				});
				assertAllProposals(proposals, 10, "");

				proposals = compute("FROM node\n", 0, {
					prefix: "",
					line: "FROM node"
				});
				assertAllProposals(proposals, 0, "");

				proposals = compute("FROM node\n\t", 11, {
					prefix: "",
					line: "\t"
				});
				assertAllProposals(proposals, 11, "");

				proposals = compute("FROM node\n  ", 12, {
					prefix: "",
					line: "  "
				});
				assertAllProposals(proposals, 12, "");
			});

			it('prefix', function() {
				var proposals = compute("#F", 2, {
					prefix: "#F",
					line: "#F"
				});
				assert.equal(proposals.length, 0);

				proposals = compute("# F", 3, {
					prefix: "F",
					line: "#F"
				});
				assert.equal(proposals.length, 0);

				proposals = compute("F", 1, {
					prefix: "F",
					line: "F"
				});
				assertOnlyFROM(proposals, 1, "F");

				proposals = compute("F ", 1, {
					prefix: "F",
					line: "F "
				});
				assertOnlyFROM(proposals, 1, "F");

				proposals = compute(" F", 2, {
					prefix: "F",
					line: " F"
				});
				assertOnlyFROM(proposals, 2, "F");

				proposals = compute("F\n", 1, {
					prefix: "F",
					line: "F"
				});
				assertOnlyFROM(proposals, 1, "F");

				proposals = compute("FROM", 4, {
					prefix: "FROM",
					line: "FROM"
				});
				assert.equal(0, proposals.length);

				proposals = compute("from", 4, {
					prefix: "from",
					line: "from"
				});
				assert.equal(0, proposals.length);

				proposals = compute("FROM node\nA", 11, {
					prefix: "A",
					line: "A"
				});
				assert.equal(proposals.length, 3);
				assertADD(proposals[0], 11, "A");
				assertARG_NameOnly(proposals[1], 11, "A");
				assertARG_DefaultValue(proposals[2], 11, "A");

				proposals = compute("FROM node\na", 11, {
					prefix: "a",
					line: "a"
				});
				assert.equal(proposals.length, 3);
				assertADD(proposals[0], 11, "a");
				assertARG_NameOnly(proposals[1], 11, "a");
				assertARG_DefaultValue(proposals[2], 11, "a");

				proposals = compute("FROM node\nH", 11, {
					prefix: "H",
					line: "H"
				});
				assert.equal(proposals.length, 2);
				assertHEALTHCHECK_CMD(proposals[0], 11, "H");
				assertHEALTHCHECK_NONE(proposals[1], 11, "H");

				proposals = compute("FROM node\nh", 11, {
					prefix: "h",
					line: "h"
				});
				assert.equal(proposals.length, 2);
				assertHEALTHCHECK_CMD(proposals[0], 11, "h");
				assertHEALTHCHECK_NONE(proposals[1], 11, "h");

				proposals = compute("FROM node O", 10, {
					prefix: "O",
					line: "FROM node O"
				});
				assert.equal(proposals.length, 0);
			});

			function testEscape(header, instruction, escapeChar) {
				var content = header + "FROM node\n" + instruction + escapeChar + "\n";
				var proposals = compute(content, content.length, {
					prefix: "",
					line: ""
				});
				assert.equal(proposals.length, 0);

				content = header + "FROM node\n" + instruction + escapeChar + "\r\n";
				proposals = compute(content, content.length, {
					prefix: "",
					line: ""
				});
				assert.equal(proposals.length, 0);

				content = header + "FROM node\n" + instruction + " " + escapeChar + "\n";
				proposals = compute(content, content.length, {
					prefix: "",
					line: ""
				});
				if (instruction === "ONBUILD") {
					assertONBUILDProposals(proposals, content.length, "");
				} else {
					assert.equal(proposals.length, 0);
				}

				content = header + "FROM node\n" + instruction + " " + escapeChar + "\r\n";
				proposals = compute(content, content.length, {
					prefix: "",
					line: ""
				});
				if (instruction === "ONBUILD") {
					assertONBUILDProposals(proposals, content.length, "");
				} else {
					assert.equal(proposals.length, 0);
				}

				content = header + "FROM node\n" + instruction + escapeChar + "\n ";
				proposals = compute(content, content.length, {
					prefix: "",
					line: " "
				});
				if (instruction === "ONBUILD") {
					assertONBUILDProposals(proposals, content.length, "");
				} else {
					assert.equal(proposals.length, 0);
				}

				content = header + "FROM node\n" + instruction + escapeChar + "\r\n ";
				proposals = compute(content, content.length, {
					prefix: "",
					line: " "
				});
				if (instruction === "ONBUILD") {
					assertONBUILDProposals(proposals, content.length, "");
				} else {
					assert.equal(proposals.length, 0);
				}

				content = header + "FROM node\n" + instruction + " " + escapeChar + "\n ";
				proposals = compute(content, content.length, {
					prefix: "",
					line: " "
				});
				if (instruction === "ONBUILD") {
					assertONBUILDProposals(proposals, content.length, "");
				} else {
					assert.equal(proposals.length, 0);
				}

				content = header + "FROM node\n" + instruction + " " + escapeChar + "\r\n ";
				proposals = compute(content, content.length, {
					prefix: "",
					line: " "
				});
				if (instruction === "ONBUILD") {
					assertONBUILDProposals(proposals, content.length, "");
				} else {
					assert.equal(proposals.length, 0);
				}
			}

			describe("escape", function() {
				it("no instruction", function() {
					var content = "FROM node\n\\";
					var proposals = compute(content, content.length, {
						prefix: "",
						line: "\\"
					});
					assert.equal(proposals.length, 0);
	
					content = "FROM node\n\\\n";
					proposals = compute(content, content.length, {
						prefix: "",
						line: ""
					});
					assertAllProposals(proposals, content.length, "");
	
					content = "FROM node\r\n\\";
					proposals = compute(content, content.length, {
						prefix: "",
						line: "\\"
					});
					assert.equal(proposals.length, 0);
	
					content = "FROM node\n\\\r\n";
					proposals = compute(content, content.length, {
						prefix: "",
						line: ""
					});
					assertAllProposals(proposals, content.length, "");
	
					content = "\\";
					proposals = compute(content, content.length, {
						prefix: "",
						line: "\\"
					});
					assert.equal(proposals.length, 0);
				});
				
				it("no header", function() {
					testEscape("", "ADD", "\\");
					testEscape("", "ARG", "\\");
					testEscape("", "CMD", "\\");
					testEscape("", "COPY", "\\");
					testEscape("", "ENTRYPOINT", "\\");
					testEscape("", "ENV", "\\");
					testEscape("", "EXPOSE", "\\");
					testEscape("", "FROM", "\\");
					testEscape("", "HEALTHCHECK", "\\");
					testEscape("", "LABEL", "\\");
					testEscape("", "MAINTAINER", "\\");
					testEscape("", "ONBUILD", "\\");
					testEscape("", "RUN", "\\");
					testEscape("", "SHELL", "\\");
					testEscape("", "STOPSIGNAL", "\\");
					testEscape("", "USER", "\\");
					testEscape("", "VOLUME", "\\");
					testEscape("", "WORKDIR", "\\");
				});

				it("#escape=\\n", function() {
					testEscape("#escape=\n", "ADD", "\\");
					testEscape("#escape=\n", "ARG", "\\");
					testEscape("#escape=\n", "CMD", "\\");
					testEscape("#escape=\n", "COPY", "\\");
					testEscape("#escape=\n", "ENTRYPOINT", "\\");
					testEscape("#escape=\n", "ENV", "\\");
					testEscape("#escape=\n", "EXPOSE", "\\");
					testEscape("#escape=\n", "FROM", "\\");
					testEscape("#escape=\n", "HEALTHCHECK", "\\");
					testEscape("#escape=\n", "LABEL", "\\");
					testEscape("#escape=\n", "MAINTAINER", "\\");
					testEscape("#escape=\n", "ONBUILD", "\\");
					testEscape("#escape=\n", "RUN", "\\");
					testEscape("#escape=\n", "SHELL", "\\");
					testEscape("#escape=\n", "STOPSIGNAL", "\\");
					testEscape("#escape=\n", "USER", "\\");
					testEscape("#escape=\n", "VOLUME", "\\");
					testEscape("#escape=\n", "WORKDIR", "\\");
				});

				it("#escape=`\\n", function() {
					testEscape("#escape=`\n", "ADD", "`");
					testEscape("#escape=`\n", "ARG", "`");
					testEscape("#escape=`\n", "CMD", "`");
					testEscape("#escape=`\n", "COPY", "`");
					testEscape("#escape=`\n", "ENTRYPOINT", "`");
					testEscape("#escape=`\n", "ENV", "`");
					testEscape("#escape=`\n", "EXPOSE", "`");
					testEscape("#escape=`\n", "FROM", "`");
					testEscape("#escape=`\n", "HEALTHCHECK", "`");
					testEscape("#escape=`\n", "LABEL", "`");
					testEscape("#escape=`\n", "MAINTAINER", "`");
					testEscape("#escape=`\n", "ONBUILD", "`");
					testEscape("#escape=`\n", "RUN", "`");
					testEscape("#escape=`\n", "SHELL", "`");
					testEscape("#escape=`\n", "STOPSIGNAL", "`");
					testEscape("#escape=`\n", "USER", "`");
					testEscape("#escape=`\n", "VOLUME", "`");
					testEscape("#escape=`\n", "WORKDIR", "`");
				});
				
				it("#EsCaPe=`\\n", function() {
					testEscape("#EsCaPe=`\n", "ADD", "`");
					testEscape("#EsCaPe=`\n", "ARG", "`");
					testEscape("#EsCaPe=`\n", "CMD", "`");
					testEscape("#EsCaPe=`\n", "COPY", "`");
					testEscape("#EsCaPe=`\n", "ENTRYPOINT", "`");
					testEscape("#EsCaPe=`\n", "ENV", "`");
					testEscape("#EsCaPe=`\n", "EXPOSE", "`");
					testEscape("#EsCaPe=`\n", "FROM", "`");
					testEscape("#EsCaPe=`\n", "HEALTHCHECK", "`");
					testEscape("#EsCaPe=`\n", "LABEL", "`");
					testEscape("#EsCaPe=`\n", "MAINTAINER", "`");
					testEscape("#EsCaPe=`\n", "ONBUILD", "`");
					testEscape("#EsCaPe=`\n", "RUN", "`");
					testEscape("#EsCaPe=`\n", "SHELL", "`");
					testEscape("#EsCaPe=`\n", "STOPSIGNAL", "`");
					testEscape("#EsCaPe=`\n", "USER", "`");
					testEscape("#EsCaPe=`\n", "VOLUME", "`");
					testEscape("#EsCaPe=`\n", "WORKDIR", "`");
				});
				
				it("#escape =`\\n", function() {
					testEscape("#escape =`\n", "ADD", "`");
					testEscape("#escape =`\n", "ARG", "`");
					testEscape("#escape =`\n", "CMD", "`");
					testEscape("#escape =`\n", "COPY", "`");
					testEscape("#escape =`\n", "ENTRYPOINT", "`");
					testEscape("#escape =`\n", "ENV", "`");
					testEscape("#escape =`\n", "EXPOSE", "`");
					testEscape("#escape =`\n", "FROM", "`");
					testEscape("#escape =`\n", "HEALTHCHECK", "`");
					testEscape("#escape =`\n", "LABEL", "`");
					testEscape("#escape =`\n", "MAINTAINER", "`");
					testEscape("#escape =`\n", "ONBUILD", "`");
					testEscape("#escape =`\n", "RUN", "`");
					testEscape("#escape =`\n", "SHELL", "`");
					testEscape("#escape =`\n", "STOPSIGNAL", "`");
					testEscape("#escape =`\n", "USER", "`");
					testEscape("#escape =`\n", "VOLUME", "`");
					testEscape("#escape =`\n", "WORKDIR", "`");
				});
				
				it("#escape= `\\n", function() {
					testEscape("#escape= `\n", "ADD", "`");
					testEscape("#escape= `\n", "ARG", "`");
					testEscape("#escape= `\n", "CMD", "`");
					testEscape("#escape= `\n", "COPY", "`");
					testEscape("#escape= `\n", "ENTRYPOINT", "`");
					testEscape("#escape= `\n", "ENV", "`");
					testEscape("#escape= `\n", "EXPOSE", "`");
					testEscape("#escape= `\n", "FROM", "`");
					testEscape("#escape= `\n", "HEALTHCHECK", "`");
					testEscape("#escape= `\n", "LABEL", "`");
					testEscape("#escape= `\n", "MAINTAINER", "`");
					testEscape("#escape= `\n", "ONBUILD", "`");
					testEscape("#escape= `\n", "RUN", "`");
					testEscape("#escape= `\n", "SHELL", "`");
					testEscape("#escape= `\n", "STOPSIGNAL", "`");
					testEscape("#escape= `\n", "USER", "`");
					testEscape("#escape= `\n", "VOLUME", "`");
					testEscape("#escape= `\n", "WORKDIR", "`");
				});
				
				it("#escape= ` \\n", function() {
					testEscape("#escape= ` \n", "ADD", "`");
					testEscape("#escape= ` \n", "ARG", "`");
					testEscape("#escape= ` \n", "CMD", "`");
					testEscape("#escape= ` \n", "COPY", "`");
					testEscape("#escape= ` \n", "ENTRYPOINT", "`");
					testEscape("#escape= ` \n", "ENV", "`");
					testEscape("#escape= ` \n", "EXPOSE", "`");
					testEscape("#escape= ` \n", "FROM", "`");
					testEscape("#escape= ` \n", "HEALTHCHECK", "`");
					testEscape("#escape= ` \n", "LABEL", "`");
					testEscape("#escape= ` \n", "MAINTAINER", "`");
					testEscape("#escape= ` \n", "ONBUILD", "`");
					testEscape("#escape= ` \n", "RUN", "`");
					testEscape("#escape= ` \n", "SHELL", "`");
					testEscape("#escape= ` \n", "STOPSIGNAL", "`");
					testEscape("#escape= ` \n", "USER", "`");
					testEscape("#escape= ` \n", "VOLUME", "`");
					testEscape("#escape= ` \n", "WORKDIR", "`");
				});
				
				it("#esc ape=`\\n", function() {
					testEscape("#esc ape=`\n", "ADD", "\\");
					testEscape("#esc ape=`\n", "ARG", "\\");
					testEscape("#esc ape=`\n", "CMD", "\\");
					testEscape("#esc ape=`\n", "COPY", "\\");
					testEscape("#esc ape=`\n", "ENTRYPOINT", "\\");
					testEscape("#esc ape=`\n", "ENV", "\\");
					testEscape("#esc ape=`\n", "EXPOSE", "\\");
					testEscape("#esc ape=`\n", "FROM", "\\");
					testEscape("#esc ape=`\n", "HEALTHCHECK", "\\");
					testEscape("#esc ape=`\n", "LABEL", "\\");
					testEscape("#esc ape=`\n", "MAINTAINER", "\\");
					testEscape("#esc ape=`\n", "ONBUILD", "\\");
					testEscape("#esc ape=`\n", "RUN", "\\");
					testEscape("#esc ape=`\n", "SHELL", "\\");
					testEscape("#esc ape=`\n", "STOPSIGNAL", "\\");
					testEscape("#esc ape=`\n", "USER", "\\");
					testEscape("#esc ape=`\n", "VOLUME", "\\");
					testEscape("#esc ape=`\n", "WORKDIR", "\\");
				});
				
				it("#escape=``\\n", function() {
					testEscape("#escape=``\n", "ADD", "\\");
					testEscape("#escape=``\n", "ARG", "\\");
					testEscape("#escape=``\n", "CMD", "\\");
					testEscape("#escape=``\n", "COPY", "\\");
					testEscape("#escape=``\n", "ENTRYPOINT", "\\");
					testEscape("#escape=``\n", "ENV", "\\");
					testEscape("#escape=``\n", "EXPOSE", "\\");
					testEscape("#escape=``\n", "FROM", "\\");
					testEscape("#escape=``\n", "HEALTHCHECK", "\\");
					testEscape("#escape=``\n", "LABEL", "\\");
					testEscape("#escape=``\n", "MAINTAINER", "\\");
					testEscape("#escape=``\n", "ONBUILD", "\\");
					testEscape("#escape=``\n", "RUN", "\\");
					testEscape("#escape=``\n", "SHELL", "\\");
					testEscape("#escape=``\n", "STOPSIGNAL", "\\");
					testEscape("#escape=``\n", "USER", "\\");
					testEscape("#escape=``\n", "VOLUME", "\\");
					testEscape("#escape=``\n", "WORKDIR", "\\");
				});
				
				it("# This is a comment\\n#escape=`\\n", function() {
					testEscape("# This is a comment\n#escape=`\n", "ADD", "\\");
					testEscape("# This is a comment\n#escape=`\n", "ARG", "\\");
					testEscape("# This is a comment\n#escape=`\n", "CMD", "\\");
					testEscape("# This is a comment\n#escape=`\n", "COPY", "\\");
					testEscape("# This is a comment\n#escape=`\n", "ENTRYPOINT", "\\");
					testEscape("# This is a comment\n#escape=`\n", "ENV", "\\");
					testEscape("# This is a comment\n#escape=`\n", "EXPOSE", "\\");
					testEscape("# This is a comment\n#escape=`\n", "FROM", "\\");
					testEscape("# This is a comment\n#escape=`\n", "HEALTHCHECK", "\\");
					testEscape("# This is a comment\n#escape=`\n", "LABEL", "\\");
					testEscape("# This is a comment\n#escape=`\n", "MAINTAINER", "\\");
					testEscape("# This is a comment\n#escape=`\n", "ONBUILD", "\\");
					testEscape("# This is a comment\n#escape=`\n", "RUN", "\\");
					testEscape("# This is a comment\n#escape=`\n", "SHELL", "\\");
					testEscape("# This is a comment\n#escape=`\n", "STOPSIGNAL", "\\");
					testEscape("# This is a comment\n#escape=`\n", "USER", "\\");
					testEscape("# This is a comment\n#escape=`\n", "VOLUME", "\\");
					testEscape("# This is a comment\n#escape=`\n", "WORKDIR", "\\");
				});
				
				it("#escape=`\\r\\n", function() {
					testEscape("#escape=`\r\n", "ADD", "`");
					testEscape("#escape=`\r\n", "ARG", "`");
					testEscape("#escape=`\r\n", "CMD", "`");
					testEscape("#escape=`\r\n", "COPY", "`");
					testEscape("#escape=`\r\n", "ENTRYPOINT", "`");
					testEscape("#escape=`\r\n", "ENV", "`");
					testEscape("#escape=`\r\n", "EXPOSE", "`");
					testEscape("#escape=`\r\n", "FROM", "`");
					testEscape("#escape=`\r\n", "HEALTHCHECK", "`");
					testEscape("#escape=`\r\n", "LABEL", "`");
					testEscape("#escape=`\r\n", "MAINTAINER", "`");
					testEscape("#escape=`\r\n", "ONBUILD", "`");
					testEscape("#escape=`\r\n", "RUN", "`");
					testEscape("#escape=`\r\n", "SHELL", "`");
					testEscape("#escape=`\r\n", "STOPSIGNAL", "`");
					testEscape("#escape=`\r\n", "USER", "`");
					testEscape("#escape=`\r\n", "VOLUME", "`");
					testEscape("#escape=`\r\n", "WORKDIR", "`");
				});
				
				it("#escape =`\\r\\n", function() {
					testEscape("#escape =`\r\n", "ADD", "`");
					testEscape("#escape =`\r\n", "ARG", "`");
					testEscape("#escape =`\r\n", "CMD", "`");
					testEscape("#escape =`\r\n", "COPY", "`");
					testEscape("#escape =`\r\n", "ENTRYPOINT", "`");
					testEscape("#escape =`\r\n", "ENV", "`");
					testEscape("#escape =`\r\n", "EXPOSE", "`");
					testEscape("#escape =`\r\n", "FROM", "`");
					testEscape("#escape =`\r\n", "HEALTHCHECK", "`");
					testEscape("#escape =`\r\n", "LABEL", "`");
					testEscape("#escape =`\r\n", "MAINTAINER", "`");
					testEscape("#escape =`\r\n", "ONBUILD", "`");
					testEscape("#escape =`\r\n", "RUN", "`");
					testEscape("#escape =`\r\n", "SHELL", "`");
					testEscape("#escape =`\r\n", "STOPSIGNAL", "`");
					testEscape("#escape =`\r\n", "USER", "`");
					testEscape("#escape =`\r\n", "VOLUME", "`");
					testEscape("#escape =`\r\n", "WORKDIR", "`");
				});
				
				it("#escape= `\\r\\n", function() {
					testEscape("#escape= `\r\n", "ADD", "`");
					testEscape("#escape= `\r\n", "ARG", "`");
					testEscape("#escape= `\r\n", "CMD", "`");
					testEscape("#escape= `\r\n", "COPY", "`");
					testEscape("#escape= `\r\n", "ENTRYPOINT", "`");
					testEscape("#escape= `\r\n", "ENV", "`");
					testEscape("#escape= `\r\n", "EXPOSE", "`");
					testEscape("#escape= `\r\n", "FROM", "`");
					testEscape("#escape= `\r\n", "HEALTHCHECK", "`");
					testEscape("#escape= `\r\n", "LABEL", "`");
					testEscape("#escape= `\r\n", "MAINTAINER", "`");
					testEscape("#escape= `\r\n", "ONBUILD", "`");
					testEscape("#escape= `\r\n", "RUN", "`");
					testEscape("#escape= `\r\n", "SHELL", "`");
					testEscape("#escape= `\r\n", "STOPSIGNAL", "`");
					testEscape("#escape= `\r\n", "USER", "`");
					testEscape("#escape= `\r\n", "VOLUME", "`");
					testEscape("#escape= `\r\n", "WORKDIR", "`");
				});
				
				it("#escape= ` \\r\\n", function() {
					testEscape("#escape= ` \r\n", "ADD", "`");
					testEscape("#escape= ` \r\n", "ARG", "`");
					testEscape("#escape= ` \r\n", "CMD", "`");
					testEscape("#escape= ` \r\n", "COPY", "`");
					testEscape("#escape= ` \r\n", "ENTRYPOINT", "`");
					testEscape("#escape= ` \r\n", "ENV", "`");
					testEscape("#escape= ` \r\n", "EXPOSE", "`");
					testEscape("#escape= ` \r\n", "FROM", "`");
					testEscape("#escape= ` \r\n", "HEALTHCHECK", "`");
					testEscape("#escape= ` \r\n", "LABEL", "`");
					testEscape("#escape= ` \r\n", "MAINTAINER", "`");
					testEscape("#escape= ` \r\n", "ONBUILD", "`");
					testEscape("#escape= ` \r\n", "RUN", "`");
					testEscape("#escape= ` \r\n", "SHELL", "`");
					testEscape("#escape= ` \r\n", "STOPSIGNAL", "`");
					testEscape("#escape= ` \r\n", "USER", "`");
					testEscape("#escape= ` \r\n", "VOLUME", "`");
					testEscape("#escape= ` \r\n", "WORKDIR", "`");
				});
				
				it("#esc ape=`\\r\\n", function() {
					testEscape("#esc ape=`\r\n", "ADD", "\\");
					testEscape("#esc ape=`\r\n", "ARG", "\\");
					testEscape("#esc ape=`\r\n", "CMD", "\\");
					testEscape("#esc ape=`\r\n", "COPY", "\\");
					testEscape("#esc ape=`\r\n", "ENTRYPOINT", "\\");
					testEscape("#esc ape=`\r\n", "ENV", "\\");
					testEscape("#esc ape=`\r\n", "EXPOSE", "\\");
					testEscape("#esc ape=`\r\n", "FROM", "\\");
					testEscape("#esc ape=`\r\n", "HEALTHCHECK", "\\");
					testEscape("#esc ape=`\r\n", "LABEL", "\\");
					testEscape("#esc ape=`\r\n", "MAINTAINER", "\\");
					testEscape("#esc ape=`\r\n", "ONBUILD", "\\");
					testEscape("#esc ape=`\r\n", "RUN", "\\");
					testEscape("#esc ape=`\r\n", "SHELL", "\\");
					testEscape("#esc ape=`\r\n", "STOPSIGNAL", "\\");
					testEscape("#esc ape=`\r\n", "USER", "\\");
					testEscape("#esc ape=`\r\n", "VOLUME", "\\");
					testEscape("#esc ape=`\r\n", "WORKDIR", "\\");
				});
				
				it("#escape=``\r\n", function() {
					testEscape("#escape=``\r\n", "ADD", "\\");
					testEscape("#escape=``\r\n", "ARG", "\\");
					testEscape("#escape=``\r\n", "CMD", "\\");
					testEscape("#escape=``\r\n", "COPY", "\\");
					testEscape("#escape=``\r\n", "ENTRYPOINT", "\\");
					testEscape("#escape=``\r\n", "ENV", "\\");
					testEscape("#escape=``\r\n", "EXPOSE", "\\");
					testEscape("#escape=``\r\n", "FROM", "\\");
					testEscape("#escape=``\r\n", "HEALTHCHECK", "\\");
					testEscape("#escape=``\r\n", "LABEL", "\\");
					testEscape("#escape=``\r\n", "MAINTAINER", "\\");
					testEscape("#escape=``\r\n", "ONBUILD", "\\");
					testEscape("#escape=``\r\n", "RUN", "\\");
					testEscape("#escape=``\r\n", "SHELL", "\\");
					testEscape("#escape=``\r\n", "STOPSIGNAL", "\\");
					testEscape("#escape=``\r\n", "USER", "\\");
					testEscape("#escape=``\r\n", "VOLUME", "\\");
					testEscape("#escape=``\r\n", "WORKDIR", "\\");
				});
				
				it("# This is a comment\\r\\n#escape=`\\r\\n", function() {
					testEscape("# This is a comment\r\n#escape=`\r\n", "ADD", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "ARG", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "CMD", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "COPY", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "ENTRYPOINT", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "ENV", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "EXPOSE", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "FROM", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "HEALTHCHECK", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "LABEL", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "MAINTAINER", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "ONBUILD", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "RUN", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "SHELL", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "STOPSIGNAL", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "USER", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "VOLUME", "\\");
					testEscape("# This is a comment\r\n#escape=`\r\n", "WORKDIR", "\\");
				});

				it("#\\n", function() {
					testEscape("#\n", "ADD", "\\");
					testEscape("#\n", "ARG", "\\");
					testEscape("#\n", "CMD", "\\");
					testEscape("#\n", "COPY", "\\");
					testEscape("#\n", "ENTRYPOINT", "\\");
					testEscape("#\n", "ENV", "\\");
					testEscape("#\n", "EXPOSE", "\\");
					testEscape("#\n", "FROM", "\\");
					testEscape("#\n", "HEALTHCHECK", "\\");
					testEscape("#\n", "LABEL", "\\");
					testEscape("#\n", "MAINTAINER", "\\");
					testEscape("#\n", "ONBUILD", "\\");
					testEscape("#\n", "RUN", "\\");
					testEscape("#\n", "SHELL", "\\");
					testEscape("#\n", "STOPSIGNAL", "\\");
					testEscape("#\n", "USER", "\\");
					testEscape("#\n", "VOLUME", "\\");
					testEscape("#\n", "WORKDIR", "\\");
				});

				it("#\\r\\n", function() {
					testEscape("#\r\n", "ADD", "\\");
					testEscape("#\r\n", "ARG", "\\");
					testEscape("#\r\n", "CMD", "\\");
					testEscape("#\r\n", "COPY", "\\");
					testEscape("#\r\n", "ENTRYPOINT", "\\");
					testEscape("#\r\n", "ENV", "\\");
					testEscape("#\r\n", "EXPOSE", "\\");
					testEscape("#\r\n", "FROM", "\\");
					testEscape("#\r\n", "HEALTHCHECK", "\\");
					testEscape("#\r\n", "LABEL", "\\");
					testEscape("#\r\n", "MAINTAINER", "\\");
					testEscape("#\r\n", "ONBUILD", "\\");
					testEscape("#\r\n", "RUN", "\\");
					testEscape("#\r\n", "SHELL", "\\");
					testEscape("#\r\n", "STOPSIGNAL", "\\");
					testEscape("#\r\n", "USER", "\\");
					testEscape("#\r\n", "VOLUME", "\\");
					testEscape("#\r\n", "WORKDIR", "\\");
				});

				it("#\\nescape=`", function() {
					testEscape("#\nescape=`", "ADD", "\\");
					testEscape("#\nescape=`", "ARG", "\\");
					testEscape("#\nescape=`", "CMD", "\\");
					testEscape("#\nescape=`", "COPY", "\\");
					testEscape("#\nescape=`", "ENTRYPOINT", "\\");
					testEscape("#\nescape=`", "ENV", "\\");
					testEscape("#\nescape=`", "EXPOSE", "\\");
					testEscape("#\nescape=`", "FROM", "\\");
					testEscape("#\nescape=`", "HEALTHCHECK", "\\");
					testEscape("#\nescape=`", "LABEL", "\\");
					testEscape("#\nescape=`", "MAINTAINER", "\\");
					testEscape("#\nescape=`", "ONBUILD", "\\");
					testEscape("#\nescape=`", "RUN", "\\");
					testEscape("#\nescape=`", "SHELL", "\\");
					testEscape("#\nescape=`", "STOPSIGNAL", "\\");
					testEscape("#\nescape=`", "USER", "\\");
					testEscape("#\nescape=`", "VOLUME", "\\");
					testEscape("#\nescape=`", "WORKDIR", "\\");
				});

				it("#\\r\\nescape=`", function() {
					testEscape("#\r\nescape=`", "ADD", "\\");
					testEscape("#\r\nescape=`", "ARG", "\\");
					testEscape("#\r\nescape=`", "CMD", "\\");
					testEscape("#\r\nescape=`", "COPY", "\\");
					testEscape("#\r\nescape=`", "ENTRYPOINT", "\\");
					testEscape("#\r\nescape=`", "ENV", "\\");
					testEscape("#\r\nescape=`", "EXPOSE", "\\");
					testEscape("#\r\nescape=`", "FROM", "\\");
					testEscape("#\r\nescape=`", "HEALTHCHECK", "\\");
					testEscape("#\r\nescape=`", "LABEL", "\\");
					testEscape("#\r\nescape=`", "MAINTAINER", "\\");
					testEscape("#\r\nescape=`", "ONBUILD", "\\");
					testEscape("#\r\nescape=`", "RUN", "\\");
					testEscape("#\r\nescape=`", "SHELL", "\\");
					testEscape("#\r\nescape=`", "STOPSIGNAL", "\\");
					testEscape("#\r\nescape=`", "USER", "\\");
					testEscape("#\r\nescape=`", "VOLUME", "\\");
					testEscape("#\r\nescape=`", "WORKDIR", "\\");
				});

				it("#escape=x", function() {
					var content = "#escape=x\nFROM x\n";
					var proposals = compute(content, content.length, {
						prefix: "",
						line: ""
					});
					assertAllProposals(proposals, content.length, "");
				});
			});
		});

		describe("directives", function() {
			describe("escape", function() {
				it("#", function() {
					var proposals = compute("#", 1, {
						prefix: "",
						line: "#"
					});
					assertDirectiveEscape(proposals, 1, "");
				});

				it("# ", function() {
					var proposals = compute("# ", 2, {
						prefix: "",
						line: "# "
					});
					assertDirectiveEscape(proposals, 2, "");
				});

				it("##", function() {
					var proposals = compute("##", 1, {
						prefix: "",
						line: "##"
					});
					assertDirectiveEscape(proposals, 1, "");
				});

				it("# #", function() {
					var proposals = compute("# #", 1, {
						prefix: "",
						line: "# #"
					});
					assertDirectiveEscape(proposals, 1, "");
				});

				it("# #", function() {
					var proposals = compute("# #", 2, {
						prefix: "",
						line: "# #"
					});
					assertDirectiveEscape(proposals, 2, "");
				});

				it("#e", function() {
					var proposals = compute("#e", 2, {
						prefix: "e",
						line: "#e"
					});
					assertDirectiveEscape(proposals, 2, "e");
				});

				it("# e", function() {
					var proposals = compute("# e", 3, {
						prefix: "e",
						line: "# e"
					});
					assertDirectiveEscape(proposals, 3, "e");
				});

				it("#E", function() {
					var proposals = compute("#E", 2, {
						prefix: "E",
						line: "#E"
					});
					assertDirectiveEscape(proposals, 2, "E");
				});

				it("#eS", function() {
					var proposals = compute("#eS", 3, {
						prefix: "eS",
						line: "#eS"
					});
					assertDirectiveEscape(proposals, 3, "eS");
				});

				it("#e ", function() {
					var proposals = compute("#e ", 3, {
						prefix: "",
						line: "#e "
					});
					assert.equal(proposals.length, 0);
				});

				it("#\n#", function() {
					var proposals = compute("#\n#", 3, {
						prefix: "",
						line: "#"
					});
					assert.equal(proposals.length, 0);
				});

				it("#\n#e", function() {
					var proposals = compute("#\n#e", 4, {
						prefix: "e",
						line: "#e"
					});
					assert.equal(proposals.length, 0);
				});
			});
		})

		describe('ONBUILD nesting', function() {
			describe('prefix', function() {
				it('ONBUILD W', function() {
					var proposals = compute("FROM node\nONBUILD W", 19, {
						prefix: "W",
						line: "ONBUILD W"
					});
					assert.equal(proposals.length, 1);
					assertWORKDIR(proposals[0], 19, "W");

					proposals = compute("FROM node\nONBUILD w", 19, {
						prefix: "w",
						line: "ONBUILD w"
					});
					assert.equal(proposals.length, 1);
					assertWORKDIR(proposals[0], 19, "w");

					proposals = compute("FROM node\nonbuild W", 19, {
						prefix: "W",
						line: "onbuild W"
					});
					assert.equal(proposals.length, 1);
					assertWORKDIR(proposals[0], 19, "W");

					proposals = compute("FROM node\nonbuild w", 19, {
						prefix: "w",
						line: "onbuild w"
					});
					assert.equal(proposals.length, 1);
					assertWORKDIR(proposals[0], 19, "w");
				});

				it('ONBUILD F', function() {
					// can't chain ONBUILD FROM
					var proposals = compute("FROM node\nONBUILD F", 19, {
						prefix: "F",
						line: "ONBUILD F"
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\nONBUILD f", 19, {
						prefix: "f",
						line: "ONBUILD f"
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\nonbuild F", 19, {
						prefix: "F",
						line: "onbuild F"
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\nonbuild f", 19, {
						prefix: "f",
						line: "onbuild f"
					});
					assert.equal(proposals.length, 0);
				});

				it('ONBUILD M', function() {
					// can't chain ONBUILD MAINTAINER
					var proposals = compute("FROM node\nONBUILD M", 19, {
						prefix: "M",
						line: "ONBUILD "
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\nONBUILD m", 19, {
						prefix: "m",
						line: "ONBUILD m"
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\nonbuild M", 19, {
						prefix: "M",
						line: "onbuild M"
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\nonbuild m", 19, {
						prefix: "m",
						line: "onbuild m"
					});
					assert.equal(proposals.length, 0);
				});

				it('ONBUILD O', function() {
					// can't chain ONBUILD ONBUILD
					var proposals = compute("FROM node\nONBUILD O", 19, {
						prefix: "O",
						line: "ONBUILD O"
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\nONBUILD o", 19, {
						prefix: "o",
						line: "ONBUILD o"
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\nonbuild O", 19, {
						prefix: "O",
						line: "onbuild O"
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\nonbuild o", 19, {
						prefix: "o",
						line: "onbuild o"
					});
					assert.equal(proposals.length, 0);
				});

				it('false ONBUILD instruction', function() {
					var proposals = compute("FROM node\nRUN echo \"ONBUILD W", 29, {
						prefix: "W",
						line: "RUN echo \"ONBUILD W",
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\nRUN echo \" ONBUILD W", 30, {
						prefix: "W",
						line: "RUN echo \" ONBUILD W",
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\nRUN echo \"\nONBUILD W", 30, {
						prefix: "W",
						line: "RUN echo \" ONBUILD W",
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\n\"ONBUILD ", 19, {
						prefix: "",
						line: "\"ONBUILD "
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\n\" ONBUILD ", 20, {
						prefix: "",
						line: "\" ONBUILD "
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\n\O NBUILD ", 19, {
						prefix: "",
						line: "O NBUILD "
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\n\ O NBUILD ", 20, {
						prefix: "",
						line: " O NBUILD "
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\n\"O NBUILD ", 20, {
						prefix: "",
						line: "\"O NBUILD "
					});
					assert.equal(proposals.length, 0);

					proposals = compute("FROM node\n\" O NBUILD ", 21, {
						prefix: "",
						line: "\" O NBUILD "
					});
					assert.equal(proposals.length, 0);
				});
			});

			it('all', function() {
				var proposals = compute("FROM node\nONBUILD ", 18, {
					prefix: "",
					line: "ONBUILD "
				});
				assertONBUILDProposals(proposals, 18, "");
			});
		});
	});
});
