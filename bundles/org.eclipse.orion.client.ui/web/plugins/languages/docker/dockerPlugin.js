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
/*eslint-env amd*/
define([
	'orion/plugin',
	'orion/editor/stylers/text_x-dockerfile/syntax',
	'plugins/languages/docker/dockerAssist',
	'i18n!plugins/languages/docker/nls/messages',
	'orion/i18nUtil'
], function(PluginProvider, mDockerfile, DockerAssist, dockerMessages, i18nUtil) {

	function connect() {
		var headers = {
			name: dockerMessages['pluginName'],
			version: "1.0",
			description: dockerMessages['pluginDescription'],
		};
		var pluginProvider = new PluginProvider(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	function registerServiceProviders(pluginProvider) {
		var markdowns = {
			ADD: {
				type: "markdown",
				content: dockerMessages["hoverAdd"] +
					"```\n" +
					"ADD hello.txt /absolute/path\n" +
					"ADD hello.txt relative/to/workdir\n" +
					"```" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#add")
			},

			ARG: {
				type: "markdown",
				content: dockerMessages["hoverArg"] +
					"```\n" +
					"ARG userName\n" +
					"ARG testOutputDir=test\n" +
					"```" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#arg")
			},

			CMD: {
				type: "markdown",
				content:  dockerMessages["hoverCmd"] +
					"`CMD [ \"/bin/ls\", \"-l\" ]`" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#cmd")
			},

			COPY: {
				type: "markdown",
				content:  dockerMessages["hoverCopy"] +
					"```\n" +
					"COPY hello.txt /absolute/path\n" +
					"COPY hello.txt relative/to/workdir\n" +
					"```" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#copy")
			},

			ENTRYPOINT: {
				type: "markdown",
				content:  dockerMessages["hoverEntrypoint"] +
					"`ENTRYPOINT [ \"/opt/app/run.sh\", \"--port\", \"8080\" ]`" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#entrypoint")
			},

			ENV: {
				type: "markdown",
				content:  dockerMessages["hoverEnv"] +
					"`ENV buildTag=1.0`" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#env")
			},

			EXPOSE: {
				type: "markdown",
				content:  dockerMessages["hoverExpose"] +
					"```\n" +
					"EXPOSE 8080\n" +
					"EXPOSE 80 443 22\n" +
					"EXPOSE 7000-8000\n" +
					"```" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#expose")
			},

			FROM: {
				type: "markdown",
				content:  dockerMessages["hoverFrom"] +
					"```\n" +
					"FROM baseImage\n" +
					"FROM baseImage:tag\n" +
					"FROM baseImage@digest\n" + 
					"```" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#from")
			},

			HEALTHCHECK: {
				type: "markdown",
				content:  dockerMessages["hoverHealthcheck"] +
				"```\n" +
				"HEALTHCHECK --interval=10m --timeout=5s \\\n" +
				"    CMD curl -f http://localhost/ || exit 1\n" +
				"HEALTHCHECK NONE\n" +
				"```" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#healthcheck")
			},

			LABEL: {
				type: "markdown",
				content:  dockerMessages["hoverLabel"] +
					"`LABEL version=\"1.0\"`" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#label")
			},

			MAINTAINER: {
				type: "markdown",
				content: dockerMessages["hoverMaintainer"] +
					"`MAINTAINER name`" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#maintainer")
			},

			ONBUILD: {
				type: "markdown",
				content: dockerMessages["hoverOnbuild"] +
					"```\n" +
					"ONBUILD ADD . /opt/app/src/extensions\n" +
					"ONBUILD RUN /usr/local/bin/build.sh /opt/app" +
					"```" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#cmd")
			},

			RUN: {
				type: "markdown",
				content: dockerMessages["hoverRun"] +
					"`RUN apt-get update && apt-get install -y curl`" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#run")
			},

			SHELL: {
				type: "markdown",
				content: dockerMessages["hoverShell"] +
					"`SHELL [ \"powershell\", \"-command\" ]`" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#shell")
			},

			STOPSIGNAL: {
				type: "markdown",
				content: dockerMessages["hoverStopsignal"] +
					"`STOPSIGNAL 9`" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#stopsignal")
			},

			USER: {
				type: "markdown",
				content: dockerMessages["hoverUser"] +
					"`USER daemon`" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#user")
			},

			VOLUME: {
				type: "markdown",
				content: dockerMessages["hoverVolume"] +
					"`VOLUME [ \"/var/db\" ]`" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#volume")
			},

			WORKDIR: {
				type: "markdown",
				content: dockerMessages["hoverWorkdir"] +
					"```\n" +
					"WORKDIR /path/to/workdir\n" +
					"WORKDIR relative/path\n" +
					"```" + 
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#workdir")
			},

			escape: {
				type: "markdown",
				content: dockerMessages["hoverEscape"] +
					"```\n" + 
					"# escape=`\n" +
					"```" +
					i18nUtil.formatMessage.call(null, dockerMessages["hoverOnlineDocumentationFooter"], "https://docs.docker.com/engine/reference/builder/#escape")
			}
		};

		pluginProvider.registerServiceProvider("orion.core.contenttype", {}, {
			contentTypes: [
				{	id: "text/x-dockerfile",
					"extends": "text/plain",
					name: "dockerfile",
					extension: ["dockerfile"],
					filenamePattern: "^dockerfile"
				}
			] 
		});
		
		pluginProvider.registerServiceProvider("orion.edit.contentAssist", new DockerAssist.DockerContentAssist(mDockerfile.keywords, markdowns), {
			name: dockerMessages['dockerContentAssist'],
			contentType:  ["text/x-dockerfile" ]
		});

		pluginProvider.registerServiceProvider("orion.edit.hover", {
			computeHoverInfo: function (editorContext, context) {
				if (context.proposal && context.proposal.hover) {
					return context.proposal.hover;
				}

				var textLength;
				var content;
				return editorContext.getText()
				.then(function(text) {
					content = text;
					textLength = text.length;
					return editorContext.getLineAtOffset(context.offset);
				})
				.then(function(line) {
					return editorContext.getLineStart(line);
				}).then(function(lineStart) {
					for (var i = lineStart; i < textLength; i++) {
						if (content.charAt(i) === '#') {
							// might be hovering over a directive
							var directive = "";
							var directiveOffset = -1;
							var stop = false;
							for (var j = i + 1; j < textLength; j++) {
								if (content.charAt(j) === '=') {
									if (directiveOffset === -1) {
										// record the end offset for the directive if not already recorded
										directiveOffset = j;
									}
									break;
								} else if (content.charAt(j) === ' ' || content.charAt(j)  === '\t'
										|| content.charAt(j) === '\r' || content.charAt(j)  === '\n') {
									if (directive !== "" && !stop) {
										// directive has been captured, stop and record the ending offset
										directiveOffset = j;
										stop = true;
									}
									continue;
								}

								if (stop) {
									// a whitespace was encountered and we should stop capturing but
									// another character was found, so this is not a directive
									return null;
								} else {
									// capture the directive
									directive = directive + content.charAt(j);
								}
							}
							// check to make sure the user is hovering over the directive itself
							if (i <= context.offset && context.offset <= j) {
								return markdowns[directive.toLowerCase()];
							}
							return null;
						}
						// skip initial whitespace at the beginning of the line
						if (content.charAt(i) !== ' ' && content.charAt(i) !== '\t') {
							for (var j = i + 1; j < textLength; j++) {
								// find the end of the word
								if (content.charAt(j) === ' ' || content.charAt(j)  === '\t'
										|| content.charAt(j) === '\r' || content.charAt(j)  === '\n') {
									if (i <= context.offset && context.offset <= j) {
										return markdowns[content.substring(i, j).toUpperCase()];
									}
									return null;
								}
							}
							return markdowns[content.substring(i, j).toUpperCase()];
						}
					}
					return null;
				});
			}
		}, {
			name: dockerMessages['dockerContentHover'],
			contentType: [ "text/x-dockerfile" ]
		});

		mDockerfile.grammars.forEach(function(current) {
			pluginProvider.registerServiceProvider("orion.edit.highlighter", {}, current);
		});
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
