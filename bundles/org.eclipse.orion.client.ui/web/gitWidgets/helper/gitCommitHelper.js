/******************************************************************************* 
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'i18n!git/nls/gitmessages',
	'orion/git/widgets/gitChangeList',
	'orion/section',
	'orion/webui/littlelib',
	'orion/commandRegistry',
	'orion/staticDataSource',
	'orion/objects'
], function(
	messages,
	mGitChangeList, 
	mSection, 
	lib, 
	mCommandRegistry,
	mStaticDataSource,
	objects
) {
	function GitCommitHelper(options) {
		this.parentId = options.parentId;
		this._serviceRegistry = options.serviceRegistry;
		this.gitClient = options.gitClient;
		//this.linkService = options.linkService;
		this._commandRegistry = new mCommandRegistry.CommandRegistry({});
		//this.fileClient = options.fileClient;
		//this.progressService = options.progressService;
		//this.preferencesService = options.preferencesService;
		//this.statusService = options.statusService;
		this.pageNavId = options.pageNavId;
		this.actionScopeId = options.actionScopeId;
	}
	
	objects.mixin(GitCommitHelper.prototype, /** @lends orion.git.GitCommitHelper.prototype */ {
		handleError: function(error) {
			var display = {};
			display.Severity = "Error"; //$NON-NLS-0$
			display.HTML = false;
			try {
				var resp = JSON.parse(error.responseText);
				display.Message = resp.DetailedMessage ? resp.DetailedMessage : resp.Message;
			} catch (Exception) {
				display.Message = error.DetailedMessage || error.Message || error.message;
			}
			//this.statusService.setProgressResult(display);
			
		},
		destroy: function() {
			this.destroyDiffs();
			if (this._inner_node && this._inner_node.parentNode) {
				this._inner_node.parentNode.removeChild(this._inner_node);
			}
			this._inner_node = null;
		},
		destroyDiffs: function() {
			if (this.diffsNavigator) {
				this.diffsNavigator.destroy();
				this.diffsNavigator = null;
			}
			if (this.diffsSection) {
				this.diffsSection.destroy();
				this.diffsSection = null;
			}
		},
		displayDiffs: function(commit, location, commitName, title) {
			this.destroy();
			this._parent = lib.node(this.parentId);
			this._inner_node = document.createElement("div"); //$NON-NLS-0$
			this._inner_node.classList.add("commit_browse_inner_container"); //$NON-NLS-0$
			this._parent.appendChild(this._inner_node);
			var parent = this._inner_node;
			var section = this.diffsSection = new mSection.Section(parent, {
				id : "diffSection", //$NON-NLS-0$
				title : title || messages["CommitChanges"],
				content : '<div id="diffNode"></div>', //$NON-NLS-0$
				canHide : false,
				noTwistie: true,
				preferencesService : this.preferencesService
			});
	
			var explorer = this.diffsNavigator = new mGitChangeList.GitChangeListExplorer({
				serviceRegistry: this._serviceRegistry,
				commandRegistry: this._commandRegistry,
				selection: null,
				parentId:"diffNode", //$NON-NLS-0$
				actionScopeId: "diffSectionItemActionArea", //$NON-NLS-0$
				prefix: "diff", //$NON-NLS-0$
				//repository: repository,
				commit: commit,
				changes: commit ? commit.Diffs : null,
				location: location,
				commitName: commitName,
				section: section,
				gitClient: this.gitClient,
				progressService: this.progressService,
				preferencesService: this.preferencesService,
				standAloneOptions: {
					highlighters: [new mStaticDataSource.SyntaxHighlighter(), new mStaticDataSource.SyntaxHighlighter()] 
				},
				handleError: this.handleError.bind(this)
			});
			return explorer.display();
		}
	});
	
	return {
		GitCommitHelper: GitCommitHelper
	};
});
