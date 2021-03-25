/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!orion/settings/nls/messages', 'require', 'orion/commands', 'orion/git/gitPreferenceStorage', 'orion/git/gitConfigPreference', 'orion/webui/littlelib', 'orion/objects', 'orion/i18nUtil',
		'orion/widgets/settings/Subsection', 'orion/widgets/input/SettingsTextfield', 'orion/widgets/input/SettingsCheckbox', 'orion/widgets/input/SettingsCommand', 'orion/util'
		], function(messages, require, mCommands, GitPreferenceStorage, GitConfigPreference, lib, objects, i18nUtil, Subsection, SettingsTextfield, SettingsCheckbox, SettingsCommand, util) {

	function GitSettings(options, node) {
		objects.mixin(this, options);
		this.node = node;
	}
	objects.mixin(GitSettings.prototype, {
		dispatch: true,

		// TODO these should be real Orion sections, not fake DIVs
		templateString: '' +  //$NON-NLS-0$
					'<div role="region" class="orionSection" aria-labelledby="gitSettingsTitle">' +
						'<div class="sectionWrapper toolComposite">' +
							'<div id="gitSettingsTitle" class="sectionAnchor sectionTitle layoutLeft">${Git Settings}</div>' + 
							'<div id="userCommands" class="layoutRight sectionActions"></div>' +
						'</div>' + //$NON-NLS-2$ //$NON-NLS-0$
						'<div class="sections sectionTable"></div>' + //$NON-NLS-0$
					'</div>', //$NON-NLS-0$

		createElements: function() {
			lib.setSafeInnerHTML(this.node, this.templateString);
			lib.processTextNodes(this.node, messages);
			
			this.sections = lib.$('.sections', this.node);
			
			this.createSections();
		},

		setHash: function(iframe, hash){
			if(iframe.src.indexOf("#")>0){ //$NON-NLS-0$
				iframe.src = iframe.src.substr(0, iframe.src.indexOf("#")) + "#" + hash; //$NON-NLS-1$ //$NON-NLS-0$
			}else{
				iframe.src = iframe.src + "#" + hash; //$NON-NLS-0$
			}
		},
		
		refreshGitCredentials : function(){
			var that = this;
			var gitPreferenceStorage = new GitPreferenceStorage(this.registry);
			gitPreferenceStorage.isEnabled().then(
				function(isEnabled){
					this.gitCredentialsSection.show();
					that.gitCredentialsFields[0].setChecked(isEnabled);
				}
			);
		},
		
		createSections: function(){
			
			/* - git --------------------------------------------------------- */
			this.gitFields = [
				new SettingsTextfield( 
					{	fieldlabel:messages['Git Email Address'],
						fieldAutocomplete: "email", //$NON-NLS-0$
						postChange: this.update.bind(this)
					} 
				),
				new SettingsTextfield( 
					{	fieldlabel:messages['Git Username'],
						fieldAutocomplete: "name", //$NON-NLS-0$
						postChange: this.update.bind(this)
					} 
				)
			];
			var gitSection = new Subsection( {sectionName:messages["Git Config"], parentNode: this.sections, children: this.gitFields, additionalCssClass: 'git-setting-header'} );
			gitSection.show();
			
			/* - git select all -------------------------------------------------- */
			this.gitAlwaysSelect = [ new SettingsCheckbox( 
				{	fieldlabel: messages["SelectUnstagedChanges"], 
					postChange: this.update.bind(this)
				} 
			)];
			var gitSection2 = new Subsection( {sectionName:messages["GitWorkDir"], parentNode: this.sections, children: this.gitAlwaysSelect, additionalCssClass: 'git-setting-header'} );
			gitSection2.show();
			
			//--------- git credentials -------------------------------
			this.gitCredentialsFields = [];
			var gitCredentialsFieldsDefaultLength;
			if(!util.isElectron){
				this.gitCredentialsFields = [ new SettingsCheckbox( 
					{	fieldlabel:messages["Enable Storage"], 
						postChange: this.updateGitCredentials.bind(this)
					} 
				) ];
				gitCredentialsFieldsDefaultLength = 1;
			}else{
				gitCredentialsFieldsDefaultLength= 0;
			}
			var that = this;
			
			// erase credentials command
			var erasePrivateKeyCommand = new mCommands.Command({
				name: messages["Delete"],
				id: "eclipse.orion.git.eraseGitCredentials",
				callback : function(data){
					var repository = data.items.gitUrl;
					var keyIndex = data.items.keyIndex;
					
					var messageService = that.registry.getService("orion.page.message");
					
					var gitPreferenceStorage = new GitPreferenceStorage(that.registry);
					gitPreferenceStorage.remove(repository).then(
						function(){
							messageService.setProgressResult(i18nUtil.formatMessage(messages["DeletedGitMsg"], [repository]));
							that.gitCredentialsFields[keyIndex + gitCredentialsFieldsDefaultLength].destroy();
						}
					);
				},
				visibleWhen : function(item){
					return true;
				}
			});
			this.commandService.addCommand(erasePrivateKeyCommand);
			this.commandService.registerCommandContribution("repositoryItemCommands", "eclipse.orion.git.eraseGitCredentials", 1);
			
			var gitPreferenceStorage = new GitPreferenceStorage(this.registry);
			gitPreferenceStorage.getRepositories().then(
				function(repositories){
					for(var i=0; i<repositories.length; ++i){
						var settingsCommand = new SettingsCommand( {keyIndex: i, fieldlabel: repositories[i], commandService: that.commandService, scopeId: "repositoryItemCommands"} );
						that.gitCredentialsFields.push(settingsCommand);
					}
					
					this.gitCredentialsSection = new Subsection( {sectionName: messages["Git Credentials Storage"], parentNode: that.sections, children: that.gitCredentialsFields, additionalCssClass: 'git-setting-header'} ); //$NON-NLS-0$
				}
			);
			
			/* - git niff dir -------------------------------------------------- */
			this.gitRepoDir = [ new SettingsTextfield( 
				{	fieldlabel: messages["GitRepoSearchDirs"], 
					fieldTitle: messages["GitRepoSearchDirsTooltip"],
					postChange: this.updateGitRepoDir.bind(this)
				} 
			)];
			this.gitSection4 = new Subsection( {sectionName:messages["GitRepoDir"], parentNode: this.sections, children: this.gitRepoDir, additionalCssClass: 'git-setting-header'} );
			
		},
		
		update: function(){
			var gitConfigPreference = new GitConfigPreference(this.registry);
			var messageService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
			gitConfigPreference.setConfig({GitMail: this.gitFields[0].getValue(),	
										GitName: this.gitFields[1].getValue(),
										GitSelectAll: this.gitAlwaysSelect[0].isChecked()}).then(
				function(){
					messageService.setProgressResult( messages['GitUsrUpdateSuccess'] );
				}
			);
		},
		
		updateGitRepoDir: function(){
			var gitConfigPreference = new GitConfigPreference(this.registry);
			var messageService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
			gitConfigPreference.setConfig({GitRepoDir: this.gitRepoDir[0].getValue()}).then(
				function(){
					messageService.setProgressResult( messages['GitUsrUpdateSuccess'] );
				}
			);
		},
		
		updateGitCredentials : function(){
			var messageService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
			
			// git authentication update
			var gitPreferenceStorage = new GitPreferenceStorage(this.registry);
			if( this.gitCredentialsFields[0].isChecked() ){
				var confirmMessage = messages["BrowserCredStoreMsg"] + '\n\n' + messages["AskEnableKeyStorage"];
				this.dialogService.confirm(confirmMessage, function(result){
					if(result){
						gitPreferenceStorage.enable().then(
							function(){
								messageService.setProgressResult( messages['GitCredsUpdateSuccess'] );
							}
						);
					}else{
						this.gitCredentialsFields[0].setChecked(false);
					}			
				}.bind(this),this.gitCredentialsFields[0].checkbox);
			} else {
				gitPreferenceStorage.disable().then(
					function(){
						messageService.setProgressResult( messages['GitCredsUpdateSuccess'] );
					}
				);
			}
		},
		
		show:function(){
			this.createElements();
			var gitConfigPreference = new GitConfigPreference(this.registry);
			gitConfigPreference.getConfig().then(
				function(userInfo){
					if(userInfo){
						if( userInfo.GitMail ){
							this.gitFields[0].setValue( userInfo.GitMail );
						}
						if( userInfo.GitName ){
							this.gitFields[1].setValue( userInfo.GitName );	
						}
						if ( userInfo.GitSelectAll ) {
							this.gitAlwaysSelect[0].setChecked(userInfo.GitSelectAll);
						}
						if ( userInfo.GitRepoDirEnabled ) {
							this.gitSection4.show();
							this.gitRepoDir[0].show();
						}
						if ( userInfo.GitRepoDir ) {
							this.gitRepoDir[0].setValue(userInfo.GitRepoDir);
						}
					}
				}.bind(this));
			// git authentication startup
			this.refreshGitCredentials();
		},

		destroy: function() {
			if (this.node) {
				lib.empty(this.node);
				this.node = this.sections = null;
			}
		}
	});
	return GitSettings;
});
