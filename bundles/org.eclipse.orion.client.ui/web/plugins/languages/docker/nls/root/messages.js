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
/* eslint-env amd */
define({
	"pluginName": "Orion Dockerfile Editor",
	"pluginDescription": "This plug-in provides Dockerfile editing support for Orion, like keyword completion and syntax highlighting.",
	"dockerContentAssist": "Dockerfile Content Assist",
	"dockerContentHover": "Docker Content Hover",

	"hoverAdd": "Copy files, folders, or remote URLs from `source` to the `dest` path in the image's filesystem.\n\n",
	"hoverArg": "Define a variable with an optional default value that users can override at build-time when using `docker build`.\n\n",
	"hoverCmd": "Provide defaults for an executing container. If an executable is not specified, then `ENTRYPOINT` must be specified as well. There can only be one `CMD` instruction in a `Dockerfile`.\n\n",
	"hoverCopy": "Copy files or folders from `source` to the `dest` path in the image's filesystem.\n\n",
	"hoverEntrypoint": "Configures the container to be run as an executable.\n\n",
	"hoverEnv": "Set the environment variable `key` to the value `value`.\n\n",
	"hoverExpose": "Define the network `port`s that this container will listen on at runtime.\n\n",
	"hoverFrom": "Set the `baseImage` to use for subsequent instructions. `FROM` must be the first instruction in a `Dockerfile`.\n\n",
	"hoverHealthcheck": "Define how Docker should test the container to check that it is still working. Alternatively, disable the base image's `HEALTHCHECK` instruction. There can only be one `HEALTHCHECK` instruction in a `Dockerfile`.\n\nSince Docker 1.12\n\n",
	"hoverLabel": "Adds metadata to an image.\n\nSince Docker 1.6\n\n",
	"hoverMaintainer": "Set the _Author_ field of the generated images. This instruction has been deprecated in favor of `LABEL`.\n\n",
	"hoverOnbuild": "Add a _trigger_ instruction to the image that will be executed when the image is used as a base image for another build.\n\n",
	"hoverRun": "Execute any commands on top of the current image as a new layer and commit the results.\n\n",
	"hoverShell": "Override the default shell used for the _shell_ form of commands.\n\nSince Docker 1.12\n\n",
	"hoverStopsignal": "Set the system call signal to use to send to the container to exit. Signals can be valid unsigned numbers or a signal name in the `SIGNAME` format such as `SIGKILL`.\n\nSince Docker 1.12\n\n",
	"hoverUser": "Set the user name or UID to use when running the image in addition to any subsequent `CMD`, `ENTRYPOINT`, or `RUN` instructions that follow it in the `Dockerfile`.\n\n",
	"hoverVolume": "Create a mount point with the specifid name and mark it as holding externally mounted volumes from the native host or from other containers.\n\n",
	"hoverWorkdir": "Set the working directory for any subsequent `ADD`, `COPY`, `CMD`, `ENTRYPOINT`, or `RUN` instructions that follow it in the `Dockerfile`.\n\n",
	"hoverOnlineDocumentationFooter": "\n\n[Online documentation](${0})",

	"hoverEscape": "Sets the character to use to escape characters and newlines in this Dockerfile. If unspecified, the default escape character is `\\`.\n\n",

 	"proposalArgNameOnly": "Define a variable that users can set at build-time when using `docker build`.\n\n",
	"proposalArgDefaultValue": "Define a variable with the given default value that users can override at build-time when using `docker build`.\n\n",
	"proposalHealthcheckExec": "Define how Docker should test the container to check that it is still working. There can only be one `HEALTHCHECK` instruction in a `Dockerfile`.\n\nSince Docker 1.12\n\n",
	"proposalHealthcheckNone": "Disable the `HEALTHCHECK` instruction inherited from the base image if one exists. There can only be one `HEALTHCHECK` instruction in a `Dockerfile`.\n\nSince Docker 1.12"
});
