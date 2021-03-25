/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2017 IBM Corporation and others.
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
'orion/Deferred',
'i18n!javascript/nls/messages',
"orion/i18nUtil"
], function(Objects, Deferred, Messages, i18nUtil) {

	/**
	 * @description Creates a new rename command
	 * @constructor
	 * @public
	 * @param {TernWorker} ternWorker The running Tern worker
	 * @param {ScriptResolver} scriptResolver The backing script resolver
	 * @returns {javascript.commands.RenameCommand} A new command
	 * @since 9.0
	 */
	function RenameCommand(ternWorker, scriptResolver) {
		this.ternworker = ternWorker;
		this.scriptResolver = scriptResolver;
		this.timeout = null;
	}

	Objects.mixin(RenameCommand.prototype, {
		/*
		 * override
		 * @callback
		 */
		execute: function(editorContext, options) {
			var that = this;
			var deferred = new Deferred();
			editorContext.getFileMetadata().then(function(metadata) {
				if(Array.isArray(metadata.parents) && metadata.parents.length > 1) {
					that.scriptResolver.setSearchLocation(metadata.parents[metadata.parents.length - 1].Location);
				} else {
					that.scriptResolver.setSearchLocation(null);	
				}
	    		return that._doRename(editorContext, options, deferred);
			}, /* @callback */ function(err) {
				deferred.reject({Severity: 'Error', Message: Messages['noFileMeta']}); //$NON-NLS-1$
			});
			return deferred;
		},

		/**
		 * @description Actually do the work
		 * @function
		 * @private
		 * @param {orion.editor.EditorContext} editorContext The editor context
		 * @param {Object} params The parameters
		 * @returns {Deferred} A deferred to resolve
		 */
		_doRename: function _doRename(editorContext, params, deferred) {
			var that = this;
			return editorContext.getText().then(function(text) {
				if(that.timeout) {
					clearTimeout(that.timeout);
				}
				that.timeout = setTimeout(function() {
					deferred.reject({Severity: 'Error', Message: Messages['renameFailedTimedOut']}); //$NON-NLS-1$
					that.timeout = null;
				}, 5000);
				var files = [{type:'full', name:params.input, text:text}]; //$NON-NLS-1$
				var offset = params.offset;
				if (params.annotation) {
					// this is used in the quickfix to get the right offset
					offset = params.annotation.start;
				}
				that.ternworker.postMessage(
					{request:'rename', args:{params:{offset: offset}, files: files, meta:{location: params.input}, newname:''}}, //$NON-NLS-1$
					function(response) {
						var changes = response.changes;
						if(changes && changes.changes && changes.changes.length > 0) {
							var ranges = changes.changes;
							// turn the ranges into offset / length
							var offsets = [];
							for (var i = 0; i < ranges.length; i++) {
								if(ranges[i].file !== params.input) {
									continue;
								}
								offsets.push({
									offset: ranges[i].start,
									length: ranges[i].end - ranges[i].start
								});
							}
							var groups = [{data: {}, positions: offsets}];
							var linkModel = {groups: groups, escapePosition: offset};
							editorContext.exitLinkedMode().then(function() {
								editorContext.enterLinkedMode(linkModel).then(deferred.resolve, deferred.reject);
							}, deferred.reject);
						} else if(typeof response.error === 'string') {
							deferred.reject({Severity: 'Warning', Message: badRename(response.error)}); //$NON-NLS-1$
						}
					});
			}, deferred.reject);
		}
	});

	/**
	 * @description Shims the default reason for not doing an inline rename, or returns the original error message if
	 * not the default
	 * @param {String} original The original message
	 * @returns {String} The message to present to the user
	 */
	function badRename(original) {
		if("Not at a variable." === original) {
			return Messages["badInlineRename"];
		}
		return i18nUtil.formatMessage(Messages["failedRename"], original);
	}

	return {
		RenameCommand : RenameCommand
	};
});
