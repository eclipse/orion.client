/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others. 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'i18n!orion/widgets/nls/messages',
	'orion/webui/dialog',
	'text!orion/webui/dialogs/confirmdialog.html',
	'orion/EventTarget',
	'orion/webui/littlelib',
], function(messages, mDialog, ConfirmDialogFragment, EventTarget, lib) {
	var Dialog = mDialog.Dialog;

	/**
	 * Dispatched when the user dismisses the ConfirmDialog.
	 * @name orion.webui.dialogs.DismissEvent
	 * @property {Boolean} value The confirmation value: <tt>true</tt> if the user gave an affirmative response
	 * (eg. clicking Yes/OK); <tt>false</tt> if they gave a negative response (eg. clicking Cancel/no/close button).
	 */

	/**
	 * Creates a modal confirm dialog.
	 * <p>Dispatches a {@link orion.webui.dialogs.DismissEvent} giving the confirmation value.</p>
	 * 
	 * @name orion.webui.dialogs.ConfirmDialog
	 * @class
	 * @extends orion.webui.Dialog
	 * 
	 * @param {Object} options The options for this dialog. Only options specific to ConfirmDialog are
	 *   documented here; see @{link orion.webui.Dialog} for a list of other usable options.
	 * @param {String} [options.title] The title to be displayed in the dialog's title bar.
	 * @param {String} options.confirmMessage The message to be displayed in the dialog.
	 * @param {Boolean} [options.yesNoDialog=false] A boolean which if true indicates that this dialog should have yes/no buttons instead of ok/cancel buttons.
	 */
	function ConfirmDialog(options) {
		EventTarget.attach(this);
		this._init(options);
	}
	
	ConfirmDialog.prototype = Object.create(Dialog.prototype);
	ConfirmDialog.prototype.constructor = ConfirmDialog;
	
	ConfirmDialog.prototype.TEMPLATE = ConfirmDialogFragment;
	
	ConfirmDialog.prototype._init = function(options) {
		this.title = options.title || document.title;
		
		this.messages = {
			ConfirmMessage: options.confirmMessage
		};
		
		if (options.checkboxMessage) {
			this.messages.CheckboxMessage = options.checkboxMessage;
		}
		
		this.modal = true;
		
		if (options.yesNoDialog) {
			this.buttons = [
				{id: "yesButton", text: messages["Yes"], callback: this._dismiss.bind(this, true), isDefault: true}, //$NON-NLS-1$ //$NON-NLS-0$
				{id: "noButton", text: messages["No"], callback: this._dismiss.bind(this, false)} //$NON-NLS-1$ //$NON-NLS-0$
			];
		} else {
			this.buttons = [
				{id: "okButton", text: messages["OK"], callback: this._dismiss.bind(this, true), isDefault: true}, //$NON-NLS-1$ //$NON-NLS-0$
				{id: "cancelButton", text: messages["Cancel"], callback: this._dismiss.bind(this, false)} //$NON-NLS-1$ //$NON-NLS-0$
			];
		}
		
		this._initialize(); //superclass function
		this.$frame.classList.add("confirmDialog"); //$NON-NLS-0$
		
		var checkboxWrapper = lib.$(".checkboxWrapper", this.$frame); //$NON-NLS-0$
		
		if (options.checkboxMessage) {
			this._checkbox = lib.$("input.confirmDialogCheckbox", checkboxWrapper); //$NON-NLS-0$
		} else {
			checkboxWrapper.parentNode.removeChild(checkboxWrapper);
		}
	};

	ConfirmDialog.prototype._bindToDom = function(/*parent*/) {
		var cancel = this._dismiss.bind(this, false);
		this.$close.addEventListener("click", cancel); //$NON-NLS-0$
		this.escListener = function (e) { //$NON-NLS-0$
			if(e.keyCode === lib.KEY.ESCAPE) {
				cancel();
			}
		};
		this.$frameParent.addEventListener("keydown", this.escListener); //$NON-NLS-0$
	};

	ConfirmDialog.prototype.destroy = function() {
		this.$frameParent.removeEventListener("keydown", this.escListener); //$NON-NLS-0$
		Dialog.prototype.destroy.apply(this, arguments);
	};

	/**
	 * Dispatches a {@link orion.webui.dialogs.DismissEvent} and hides the dialog. 
	 */
	ConfirmDialog.prototype._dismiss = function(value) {
		var event = { type: "dismiss", value: value }; //$NON-NLS-0$
		if (this._checkbox) {
			event.checkboxValue = this._checkbox.checked;
		}
		
		this.hide();
		this.dispatchEvent(event);
	};

	return {ConfirmDialog: ConfirmDialog};
});
