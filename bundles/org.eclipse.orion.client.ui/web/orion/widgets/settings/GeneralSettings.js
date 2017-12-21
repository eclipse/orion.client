/*eslint-env browser */
define([
	'i18n!orion/settings/nls/messages',
	'orion/section',
	'orion/webui/littlelib',
	'orion/objects',
	'orion/widgets/input/SettingsCheckbox',
	'orion/widgets/input/SettingsTextfield',
	'orion/widgets/settings/Subsection',
	'orion/util'
], function(messages, mSection, lib, objects, SettingsCheckbox, SettingsTextfield, Subsection, util) {
	function GeneralSettings(options, node) {
		objects.mixin(this, options);
		this.node = node;
	}
	objects.mixin(GeneralSettings.prototype, {
		dispatch: true,

			createElements: function() {
				this.createSections();
			},

			createSections: function(){
				/* - desktop selection policy fields ----------------------------------------------------- */
				this.desktopSelectionPolicyCheckbox = new SettingsCheckbox( {fieldlabel: messages["desktopSelectionPolicy"],
					fieldTitle: messages["desktopSelectionPolicyTooltip"],
					postChange: this.setPreferences.bind(this)
				});
				this.filteredResourcesTextfield = new SettingsTextfield({
					fieldlabel: messages["filteredResources"],
					fieldTitle: messages["filteredResourcesTooltip"],
					postChange: this.setPreferences.bind(this)
				});
				this.enableEditorTabs = new SettingsCheckbox({
					fieldlabel: messages["enableEditorTabs"],
					fieldTitle: messages["enableEditorTabsTooltip"],
					postChange: this.setPreferences.bind(this)
				});
				this.maximumEditorTabsTextfield = new SettingsTextfield({
					fieldlabel: messages["maximumEditorTabs"],
					fieldTitle: messages["maximumEditorTabsTooltip"],
					fieldType: "number",
					fieldMin: 0,
					postChange: this.setPreferences.bind(this)
				});
				this.enableDebuggerCheckbox = new SettingsCheckbox({
					fieldlabel: messages["enableDebugger"],
					fieldTitle: messages["enableDebuggerTooltip"],
					postChange: this.setPreferences.bind(this)
				}),

				new mSection.Section(this.node, {
					id: "fileNavigation", //$NON-NLS-0$
					title: messages.fileNavigation,
					content: '<section class="setting-row" role="region" aria-labelledby="fileNavigationTitle" id="setting-row-general">', //$NON-NLS-0$
				});

				var settingsContentElement = document.createElement('div');
				settingsContentElement.className = 'setting-content'; //$NON-NLS-0$
				lib.node('setting-row-general').appendChild(settingsContentElement); //$NON-NLS-0$
				
				var fileSubsection = new Subsection({
					sectionName: messages["Files"],
					parentNode: settingsContentElement,
					children: util.isElectron ? [this.filteredResourcesTextfield] 
					: [this.desktopSelectionPolicyCheckbox, this.filteredResourcesTextfield]
				});
				fileSubsection.show();
				var editorTabs = new Subsection({
					sectionName: messages["EditorTabs"],
					parentNode: settingsContentElement,
					children: util.isElectron ?[this.maximumEditorTabsTextfield]
					: [this.enableEditorTabs, this.maximumEditorTabsTextfield]
				});
				editorTabs.show();
				
				this.debuggerSubsection = new Subsection({
					sectionName: messages["Debugger"],
					parentNode: settingsContentElement,
					children: [this.enableDebuggerCheckbox]
				});
			},

			setPreferences: function() {
				// Return the promise for test purposes.
				return this.preferences.getPrefs().then(function (generalPrefs) {
					generalPrefs.desktopSelectionPolicy = this.desktopSelectionPolicyCheckbox.isChecked();
					generalPrefs.filteredResources = this.filteredResourcesTextfield.getValue();
					generalPrefs.enableEditorTabs = this.enableEditorTabs.isChecked();
					if(this.enableEditorTabs.isChecked()){
						this.desktopSelectionPolicyCheckbox.setChecked("true");
						this.desktopSelectionPolicyCheckbox.disableCheckBox();
					}else{
						this.desktopSelectionPolicyCheckbox.enableCheckBox();
					}
					var maxTabs = parseInt(this.maximumEditorTabsTextfield.getValue(), 10);
					maxTabs = isNaN(maxTabs) || maxTabs< 0 ? 0 : maxTabs;
					generalPrefs.maximumEditorTabs = maxTabs;
					generalPrefs.enableDebugger = this.enableDebuggerCheckbox.isChecked();
					this.preferences.setPrefs(generalPrefs);
				}.bind(this));
			},

			show:function(node, callback){
				if (node) {
					this.node = node;
				}
				this.createElements();
				this.preferences.getPrefs().then(function (generalPrefs) {
					if(!util.isElectron){
						this.desktopSelectionPolicyCheckbox.setSelection(generalPrefs.desktopSelectionPolicy);
						this.desktopSelectionPolicyCheckbox.show();
						// Enable editor tabs.
						this.enableEditorTabs.setSelection(generalPrefs.enableEditorTabs);
						this.enableEditorTabs.show();
						
						if(generalPrefs.enableEditorTabs){
							this.desktopSelectionPolicyCheckbox.disableCheckBox();
						}
					}
					
					//filtered resources
					if(typeof generalPrefs.filteredResources !== 'string') {
						this.filteredResourcesTextfield.setValue(".git, .DS_Store"); //default
					} else {
						this.filteredResourcesTextfield.setValue(generalPrefs.filteredResources);
					}
					this.filteredResourcesTextfield.show();
					
					// Maximum editor tabs.
					this.maximumEditorTabsTextfield.setValue(generalPrefs.maximumEditorTabs);
					this.maximumEditorTabsTextfield.show();

					// Enable debugger.
					if (generalPrefs.enableDebuggerVisible || util.isElectron) {
						this.debuggerSubsection.show();
						this.enableDebuggerCheckbox.setSelection(generalPrefs.enableDebugger);
						this.enableDebuggerCheckbox.show();
					}

					if (callback) {
						callback();
					}
				}.bind(this));
			},
			destroy: function() {
				if (this.node) {
					this.node = null;
				}
			}
	});
	return GeneralSettings;
});
