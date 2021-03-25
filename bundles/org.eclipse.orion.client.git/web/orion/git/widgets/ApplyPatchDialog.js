/*******************************************************************************
 * @license Copyright (c) 2011, 2013 IBM Corporation and others. All rights
 *          reserved. This program and the accompanying materials are made
 *          available under the terms of the Eclipse Public License 2.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
/*eslint-env browser, amd*/

define([ 'i18n!git/nls/gitmessages', 'orion/webui/dialog', 'orion/xsrfUtils', 'orion/xhr' ], function(messages, dialog, xsrfUtils, xhr) {

	function ApplyPatchDialog(options) {
		this._init(options);
	}

	ApplyPatchDialog.prototype = new dialog.Dialog();

	ApplyPatchDialog.prototype.TEMPLATE =

	'<div role="radiogroup" aria-label="${Patch Location}">' +
		'<div style="padding:4px"><input type="radio" name="radio" value="urlRadio" id="urlRadio" checked/>' +
			'<label for="urlRadio" id="urlRadioLabel">${URL:}</label>' + 
			'<input type="text" name="url" id="patchurl" aria-labelledby="urlRadioLabel"/>' +
		'</div>' +
		'<div style="padding:4px"><input type="radio" name="radio" value="fileRadio" id="fileRadio"/>' +
			'<label for="fileRadio" id="fileRadioLabel">${File:}</label>' + 
			'<input type="file" name="selectedFile" id="selectedFile" class="uploadChooser" aria-labelledby="fileRadioLabel selectedFile"/>' +
		'</div>' +
	'</div>';

	ApplyPatchDialog.prototype._init = function(options) {
		this.title = messages["ApplyPatchDialog"];
		this.modal = true;
		this.messages = messages;
		this.options = options;
		this.customFocus = true;

		this.buttons = [];

		this.buttons.push({
			callback: function() {
				if (this.$okButton.classList.contains(this.DISABLED)) {
					return;
				}
				this._applyPatch();
			}.bind(this),
			id: "okButton",
			text: messages["OK"]
		});

		// Start the dialog initialization.
		this._initialize();
	};

	/** @callback */
	ApplyPatchDialog.prototype._bindToDom = function(parent) {
		var updateOkEnablement = function() {
			if ((this.$fileRadio.checked && this.$selectedFile.value) || (this.$urlRadio.checked && this.$patchurl.value)) {
				this.$okButton.classList.remove(this.DISABLED);
				this.$okButton.disabled = false;
			} else {
				this.$okButton.classList.add(this.DISABLED);
				this.$okButton.disabled = true;
			}
		}.bind(this);

		this.$selectedFile.onchange = function() {
			this.$urlRadio.checked = false;
			this.$fileRadio.checked = "fileRadio";
			updateOkEnablement();
		}.bind(this);
		this.$patchurl.onfocus = function() {
			this.$urlRadio.checked = "urlRadio";
			this.$fileRadio.checked = false;
			updateOkEnablement();
		}.bind(this);
		this.$patchurl.onkeyup = function() {
			this.$urlRadio.checked = "urlRadio";
			this.$fileRadio.checked = false;
			updateOkEnablement();
		}.bind(this);
		this.$urlRadio.onchange = function() {
			updateOkEnablement();
		}.bind(this);
		this.$fileRadio.onchange = function() {
			updateOkEnablement();
		}.bind(this);

		this.$okButton.classList.add(this.DISABLED);
		this.$okButton.disabled = true;

		window.setTimeout(
			function() {
				this.$patchurl.focus();
			}.bind(this),
			0
		);
	};

	/** @callback */
	ApplyPatchDialog.prototype._applyPatch = function(parent) {
		var formData = new FormData();
		formData.append("uploadedfile", this.$selectedFile.files[0]);
		formData.append("url", this.$patchurl.value);
		formData.append("radio", this.$fileRadio.checked ? "fileRadio" : "urlRadio");

		// TODO the following should move to gitClient
		var opts = {
			headers: {
				"Orion-Version": "1"
			},
			data: formData
		};
		return xhr("POST", this.options.diffLocation, opts).then(
			function(result) {
				if (this.options.deferred) {
					this.options.deferred.resolve(result.responseText);
				}
				this.hide();
			}.bind(this),
			function(error) {
				if (this.options.deferred){
					this.options.deferred.reject(error.responseText);
				}
				this.hide();
			}.bind(this)
		);
	};

	ApplyPatchDialog.prototype.constructor = ApplyPatchDialog;

	// return the module exports
	return {ApplyPatchDialog : ApplyPatchDialog};

});
