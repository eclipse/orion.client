/*******************************************************************************
 * @license Copyright (c) 2014 IBM Corporation and others. All rights
 *          reserved. This program and the accompanying materials are made
 *          available under the terms of the Eclipse Public License 2.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/

define([
	'i18n!git/nls/gitmessages',
	'orion/explorers/explorer',
	'orion/explorers/explorer-table',
	'orion/objects'
], function(messages, mExplorer, mExplorerTable, objects) {
		
	function GitFileListModel() {
		mExplorerTable.FileModel.apply(this, arguments);
	}
	GitFileListModel.prototype = Object.create(mExplorerTable.FileModel.prototype);
	objects.mixin(GitFileListModel.prototype, /** @lends orion.git.GitFileListModel.prototype */ {
	});
	
	/**
	 * @class orion.git.GitFileListExplorer
	 * @extends orion.explorers.Explorer
	 */
	function GitFileListExplorer(options) {
		this.showRoot = true;
		options.rendererFactory =  function(explorer) {  //$NON-NLS-0$
			var renderer = new GitFileListRenderer({
				registry: options.serviceRegistry,
				commandService: options.commandRegistry,
				actionScopeId: options.actionScopeId,
				checkbox: explorer.checkbox
			}, explorer);
			return renderer;
		};
		mExplorerTable.FileExplorer.call(this, options);	
		this.actionScopeId = options.actionScopeId;
		this.section = options.section;
		this.selectionPolicy = options.selectionPolicy;
		this.handleError = options.handleError;
		this.gitClient = options.gitClient;
		this.progressService = options.progressService;
	}
	GitFileListExplorer.prototype = Object.create(mExplorerTable.FileExplorer.prototype);
	objects.mixin(GitFileListExplorer.prototype, /** @lends orion.git.GitFileListExplorer.prototype */ {
		createModel: function() {
			return new GitFileListModel(this.registry, this.treeRoot, this.fileClient, this.parentId, this.excludeFiles, this.excludeFolders);
		},
		display: function(location) {
			return this.loadResourceList(location, true, null);
		},
		refreshSelection: function() {
		},
		isRowSelectable: function() {
			return !!this.selection;
		}
	});
	
	function GitFileListRenderer(options) {
		options.cachePrefix = null; // do not persist table state
		options.noRowHighlighting = true;
		mExplorer.SelectionRenderer.apply(this, arguments);
	}
	GitFileListRenderer.prototype = Object.create(mExplorer.SelectionRenderer.prototype);
	objects.mixin(GitFileListRenderer.prototype, {
		getCellHeaderElement: function(col_no) {
			var labelText = "";
			switch (col_no) {
			case 0:
				labelText = messages["files"];
				break;
			default:
				return null;
			}
			var th = document.createElement("th"); //$NON-NLS-0$
			th.className = "visuallyhidden"; //$NON-NLS-0$
			th.style.paddingTop = th.style.paddingLeft = "4px"; //$NON-NLS-0$
			th.textContent = labelText;
			return th;
		},
		getCellElement: function(col_no, item, tableRow){
			if (col_no !== 0) {
				return null;
			}
		
			var col = document.createElement("td"); //$NON-NLS-0$
			var span = document.createElement("span"); //$NON-NLS-0$
			col.className = "gitNavColumn";  //$NON-NLS-0$
			span.id = tableRow.id + "navSpan"; //$NON-NLS-0$
			col.appendChild(span);
			span.className = "mainNavColumn singleNavColumn"; //$NON-NLS-0$
			if (item.Directory) {
				this.getExpandImage(tableRow, span);
			}
			span.appendChild(document.createTextNode(item.Name)); 
			return col;
		}
	});
	
	return {
		GitFileListExplorer: GitFileListExplorer,
		GitFileListRenderer: GitFileListRenderer
	};

});
