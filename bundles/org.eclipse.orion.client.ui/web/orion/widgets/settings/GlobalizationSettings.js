/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
define([
	'i18n!orion/settings/nls/messages',
	'orion/section',
	'orion/webui/littlelib', 
	'orion/objects',
	'orion/util',
	'orion/widgets/input/SettingsCheckbox',
	'orion/widgets/input/SettingsSelect'
	], function(messages, mSection, lib, objects, util, SettingsCheckbox, SettingsSelect) {

	var BIDI_MODES = [
	         		{value: "ltr", label: messages["Left-To-Right"]}, //$NON-NLS-1$ //$NON-NLS-0$
	         		{value: "rtl", label: messages["Right-To-Left"]}, //$NON-NLS-1$ //$NON-NLS-0$
	         		{value: "auto", label: messages["Auto direction"]} //$NON-NLS-1$ //$NON-NLS-0$
	         	];
	
	var CALENDAR_TYPES = [
		         		{value: "gregorian", label: messages.Gregorian}, //$NON-NLS-0$
		         		{value: "hebrew", label: messages.Hebrew}, //$NON-NLS-0$
					{value: "islamic", label: messages.Islamic} //$NON-NLS-0$
		         	];
	
	var bidiEnabled = "bidiEnabled"; //$NON-NLS-0$
	var calendarType = "calendarType";	//$NON-NLS-0$
	var bidiLayout = "bidiLayout";	//$NON-NLS-0$
	var bidiStoragePrefix = "/orion/preferences/bidi/"; //$NON-NLS-0$
	
	function GlobalizationSettings(options, node) {
		objects.mixin(this, options);
		this.node = node;
	}
	objects.mixin(GlobalizationSettings.prototype, {
		dispatch: true,

			createElements: function() {
				this.createSections();
			},	
					
			createSections: function(){
				
				var setBidiFieldsFunction = this.setBidiFields.bind(this);
				var setBidiPreferencesFunction = this.setBidiPreferences.bind(this);
				
				/* - bidi fields ----------------------------------------------------- */
				this.bidiFields = [
				    new SettingsCheckbox( {fieldlabel: messages["Enable bidi support"], postChange: setBidiFieldsFunction}),  //$NON-NLS-0$
				    new SettingsSelect(
							{	fieldlabel:messages["Base text direction"], //$NON-NLS-0$
								options:createSelectProperty(bidiLayout, BIDI_MODES), 
								postChange: setBidiPreferencesFunction
							}),
				    new SettingsSelect(
							{	fieldlabel:messages["Calendar type"], //$NON-NLS-0$
								options:createSelectProperty(calendarType, CALENDAR_TYPES), 
								postChange: setBidiPreferencesFunction
							})						    
				];
				//initiate  CheckBox value from cookie
				var selectedVal = (util.readSetting(bidiStoragePrefix + bidiEnabled) === "true"); //$NON-NLS-0$
				this.bidiFields[0].setSelection(selectedVal);
				// set bidiFields according to Enable bidi support checkbox value
				this.setBidiFields();
				
				var sectionWidget = new mSection.Section(this.node, {
					id: "Globalization", //$NON-NLS-0$
					title: messages.Globalization,
					content: '<div class="setting-row" id="setting-row">', //$NON-NLS-0$
				});	
				
				var settingsContentElement = document.createElement('div'); //$NON-NLS-0$
				settingsContentElement.className = 'setting-content'; //$NON-NLS-0$
				settingsContentElement.style.paddingLeft = "30px";
				
				lib.node('setting-row').appendChild(settingsContentElement); //$NON-NLS-0$

				this.bidiFields.forEach(function(child) {
					settingsContentElement.appendChild(child.node);
					child.show();
				});
				
				function createSelectProperty(property, selectValues) {
					var keys = [];
					for( var i= 0; i < selectValues.length; i++ ){
						var set = {
								value: selectValues[i].value,
								label: selectValues[i].label
							};								
						if( selectValues[i].value === util.readSetting(bidiStoragePrefix + property)){
							set.selected = true;
						}
						keys.push(set);
					}
					return keys;
				}
			},
					
			setBidiPreferences: function() {
				var bidiEnabledVal = this.bidiFields[0].isChecked();
				var bidiLayoutVal = this.bidiFields[1].getSelected();
				var calendarTypeVal = this.bidiFields[2].getSelected();
				
				util.saveSetting(bidiStoragePrefix + bidiEnabled, bidiEnabledVal);
				util.saveSetting(bidiStoragePrefix + bidiLayout, bidiLayoutVal);
				util.saveSetting(bidiStoragePrefix + calendarType, calendarTypeVal);
			},

			setBidiFields: function() {
				var selectedVal = this.bidiFields[0].getSelection();
				if (selectedVal) {
					util.saveSetting(bidiStoragePrefix + bidiEnabled, "true"); //$NON-NLS-0$
		        	this.bidiFields[1].select.disabled = false;
		        	this.bidiFields[2].select.disabled = false;
				}
				else {
					util.saveSetting(bidiStoragePrefix + bidiEnabled, "false"); //$NON-NLS-0$
					util.saveSetting(bidiStoragePrefix + bidiLayout, "ltr" ); //$NON-NLS-0$
					util.saveSetting(bidiStoragePrefix + calendarType, messages.Gregorian);
		        	this.bidiFields[1].select.disabled = true;
		        	this.bidiFields[2].select.disabled = true;						
				}
			},
					
			show:function(){
				this.createElements();
			},
			destroy: function() {
				if (this.node) {
					this.node = null;
				}
			}
	});
	return GlobalizationSettings;
});
