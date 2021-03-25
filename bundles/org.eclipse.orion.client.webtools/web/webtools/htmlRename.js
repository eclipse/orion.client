/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 /*eslint-env amd, browser*/
define([
'orion/objects',
'orion/Deferred'
], function(Objects, Deferred) {

	/**
	 * @description Creates a new rename command
	 * @constructor
	 * @public
	 * @param {?} occurences The HTML occurrences support class
	 * @returns {webtools.RenameCommand} A new command
	 * @since 16.0
	 */
	function RenameCommand(occurences) {
		this.occurrences = occurences;
	}

	Objects.mixin(RenameCommand.prototype, {
		/*
		 * @callback
		 */
		execute: function(editorContext, options) {
			return editorContext.getCaretOffset().then(function(off) {
				var deferred = new Deferred();
				if(!options.selection) {
					options.selection = Object.create(null);
					options.selection.start = off;
					options.selection.end = off;
				}
				this.occurrences.computeOccurrences(editorContext, options).then(function(occs) {
					if(!Array.isArray(occs) || occs.length < 1) {
						deferred.reject('No occurrences found to rename');
					}
					var offsets = [];
					for (var i = 0; i < occs.length; i++) {
						var o = occs[i].start,
							l = occs[i].end - o;
						if(occs[i].closeTag) {
							//close tag occurrences include the pre/postfix '/', get rid of it from the rename
							if(occs[i].selfClose) {
								continue; //the open tag is all we need to rename for self-closing tags
							} else {
								o++;
								l--;
							}
						}
						offsets.push({
							offset: o,
							length: l
						});
					}
					var groups = [{data: {}, positions: offsets}];
					var linkModel = {groups: groups, escapePosition: offsets[0].offset};
					editorContext.exitLinkedMode().then(function() {
						editorContext.enterLinkedMode(linkModel).then(deferred.resolve, deferred.reject);
					}, deferred.reject);
				});
				return deferred;
			}.bind(this));
		}
	});

	return {
		RenameCommand : RenameCommand
	};
});
