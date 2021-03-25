/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
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
'orion/i18nUtil',
'i18n!javascript/nls/messages'
], function(Objects, Deferred, i18nUtil, Messages) {

	/**
	 * @description Creates a new open declaration command
	 * @constructor
	 * @public
	 * @param {TernWorker} ternWorker The running Tern worker
	 * @returns {javascript.commands.OpenImplementationCommand} A new command
	 * @since 10.0
	 */
	function OpenImplementationCommand(ternWorker) {
		this.ternworker = ternWorker;
		this.timeout = null;
	}

	Objects.mixin(OpenImplementationCommand.prototype, {
		/* override */
		execute: function(editorContext, options) {
			var that = this;
			var deferred = new Deferred();
			editorContext.getText().then(function(text) {
		     	return that._findImpl(editorContext, options, text, deferred);
			}, deferred.reject);
			return deferred;
		},

		_findImpl: function(editorContext, options, text, deferred) {
			if(this.timeout) {
				clearTimeout(this.timeout);
			}
			this.timeout = setTimeout(function() {
				deferred.reject({Severity: 'Error', Message: Messages['implTimedOut']}); //$NON-NLS-1$
				this.timeout = null;
			}, 5000);
			var files = [{type: 'full', name: options.input, text: text}]; //$NON-NLS-1$
			this.ternworker.postMessage(
				{request:'implementation', args:{params:{offset: options.offset}, guess: true, files: files, meta:{location: options.input}}}, //$NON-NLS-1$
				function(response) {
					if(response.implementation && (typeof response.implementation.start === 'number' && typeof response.implementation.end === 'number')) {
						var opts = Object.create(null);
						opts.start = response.implementation.start;
						opts.end = response.implementation.end;
						deferred.resolve(editorContext.openEditor(response.implementation.file, opts));
					} else if (response.implementation && response.implementation.origin){
						deferred.reject({Severity: 'Warning', Message: i18nUtil.formatMessage(Messages['implFoundInIndex'], response.implementation.origin)}); //$NON-NLS-1$
					} else {
						deferred.reject({Severity: 'Warning', Message: Messages['noImplFound']}); //$NON-NLS-1$
					}
				});
		}
	});

	return {
		OpenImplementationCommand : OpenImplementationCommand
	};
});
