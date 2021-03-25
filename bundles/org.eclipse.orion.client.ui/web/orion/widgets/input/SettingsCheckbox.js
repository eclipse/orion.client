/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/objects', 'orion/webui/littlelib', 'orion/widgets/input/Checkbox', 'orion/webui/tooltip'],  function(objects, lib, Checkbox, mTooltip) {

	/**
	 * This is just an orion/widgets/input/Select with a label.
	 */
	function SettingsCheckbox( params, node ){
		makeLocalCheckbox(params);
		Checkbox.apply(this, arguments);
		this.mylabel = lib.$(".setting-label", this.node); //$NON-NLS-0$
		this.mycontrol = lib.$(".setting-control", this.node); //$NON-NLS-0$
	}

	objects.mixin(SettingsCheckbox.prototype, Checkbox.prototype, makeCheckbox());

	function makeLocalCheckbox(params) {
		var newCheckbox = makeCheckbox();

		if (params.local) {
			newCheckbox.templateString =
			'<label>' + //$NON-NLS-0$
				'<span class="setting-label"></span>' + //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				'<input class="setting-control settingsCheckbox" type="checkbox"/>' + //$NON-NLS-0$
			'</label>';  //$NON-NLS-0$

			objects.mixin(SettingsCheckbox.prototype, Checkbox.prototype, newCheckbox);
		}
	}

	function makeCheckbox() {
		return {
			templateString :
			'' +  //$NON-NLS-0$
			'<label>' + //$NON-NLS-0$
				'<span class="setting-label"></span>' + //$NON-NLS-2$ //$NON-NLS-0$
				'<input class="setting-control settingsCheckbox" type="checkbox"/>' + //$NON-NLS-0$
			'</label>',  //$NON-NLS-0$

			postCreate: function() {
				Checkbox.prototype.postCreate.call(this);
				this.mylabel.textContent = this.fieldlabel;
				if(this.fieldTitle) {
					this.mycontrol.commandTooltip = new mTooltip.Tooltip({
						node: this.mycontrol,
						text: this.fieldTitle,
						position: ["above", "below", "right", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					});
				}
			},

			destroy: function() {
				Checkbox.prototype.destroy.call(this);
				if (this.mylabel) {
					this.mylabel = null;
				}
				if (this.mycontrol) {
					if (this.mycontrol.commandTooltip) {
			            this.mycontrol.commandTooltip.destroy();
			        }
		            this.mycontrol = null;
		        }
			}
		};
	}


	return SettingsCheckbox;
});
