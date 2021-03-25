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
 /*eslint-env amd, browser*/
define([
'orion/objects',
'orion/Deferred',
'i18n!javascript/nls/messages',
'orion/i18nUtil',
'orion/URITemplate',
], function(Objects, Deferred, Messages, i18nUtil, URITemplate) {
	
	var ternworker;

	/**
	 * @description Creates a new open declaration command
	 * @constructor
	 * @public
	 * @param {TernWorker} ternWorker The running Tern worker
	 * @returns {javascript.commands.OpenDeclarationCommand} A new command
	 * @since 8.0
	 */
	function OpenDeclarationCommand(ternWorker, openMode) {
		ternworker = ternWorker;
		this.openMode = openMode;
		this.timeout = null;
	}

	/**
	 * @description Create a human-readable name to display for the file in the declaration object
	 * @param {Object} declaration The decl
	 * @returns {String} The formatted string of the file the declaration references
	 * @since 11.0
	 */
	function displayFileName(declaration) {
		var fileName = declaration.file;
		fileName = fileName.replace(/^\/file\//, "");
		fileName = fileName.substring(fileName.indexOf("/")+1, fileName.length);
		return i18nUtil.formatMessage(Messages['declDisplayName'], fileName, declaration.start, declaration.end);
	}

	Objects.mixin(OpenDeclarationCommand.prototype, {
		
		/**
		 * @callback
		 */
		findDeclaration: function findDeclaration(editorContext, options) {
			var deferred = new Deferred();
			editorContext.getText().then(function(text) {
				return this._findDecl(editorContext, options, text, deferred);
			}.bind(this), deferred.reject);
			return deferred;
		},

		_findDecl: function(editorContext, options, text, deferred) {
			if(this.timeout) {
				clearTimeout(this.timeout);
			}
			this.timeout = setTimeout(function() {
				deferred.reject({Severity: 'Error', Message: Messages['noDeclTimedOut']}); //$NON-NLS-1$
				this.timeout = null;
			}, 10000);
			var files = [{type: 'full', name: options.input, text: text}]; //$NON-NLS-1$
			ternworker.postMessage(
				{request:'definition', args:{params:{offset: options.offset}, guess: true, files: files, meta:{location: options.input}}}, //$NON-NLS-1$
				function(response) {
					if(response.declaration) {
						if (response.declaration.results) {
							// build up the message based on potential matches
							var display = Object.create(null);
							display.Severity = 'Status'; //$NON-NLS-0$
							var message = Messages['declPotentialHeader'];
							var declarations = response.declaration.results;
							declarations.forEach(function(decl) {
								if (typeof decl.start  === 'number' && typeof decl.end === 'number') {
									var href = new URITemplate("#{,resource,params*}").expand( //$NON-NLS-1$
										{
											resource: decl.file,
											params: {start:decl.start, end: decl.end}
										});
									var fName = decl.file.substring(decl.file.lastIndexOf('/')+1);
									message += '*    ['+fName+ '](' + href + ') - '+displayFileName(decl)+'\n'; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$
								}
							}, this);
							display.stayOnTarget = true;
							display.Message = message;
							return deferred.reject(display);
						} else if (typeof response.declaration.start  === 'number' && typeof response.declaration.end === 'number') {
								if(response.declaration.guess) {
									return deferred.reject({Severity: 'Warning', Message: Messages['noDeclFound']}); //$NON-NLS-1$
								} 
								var value = Object.create(null);
								value.start = response.declaration.start;
								value.end = response.declaration.end;
								if(this.openMode !== null && typeof this.openMode !== 'undefined') {
									value.mode = this.openMode;
								}
								value.file = response.declaration.file;
								return deferred.resolve(value);
						} else if (response.declaration.origin) {
							if(response.declaration.guess) {
								return deferred.reject({Severity: 'Warning', Message: Messages['noDeclFound']}); //$NON-NLS-1$
							}
							deferred.reject({Severity: 'Warning', Message: i18nUtil.formatMessage(Messages['declFoundInIndex'], response.declaration.origin)}); //$NON-NLS-1$
						}
					}
					deferred.reject({Severity: 'Warning', Message: Messages['noDeclFound']}); //$NON-NLS-1$
				}.bind(this));
		}
	});

	return {
		OpenDeclarationCommand : OpenDeclarationCommand
	};
});
