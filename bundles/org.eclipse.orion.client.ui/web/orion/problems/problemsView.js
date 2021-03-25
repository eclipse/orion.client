/*******************************************************************************
 * Copyright (c) 2013, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
/*eslint-env browser, amd*/
define([
	'i18n!orion/problems/nls/messages',
	'orion/objects',
	'orion/webui/littlelib',
	'orion/problems/problemsExplorer',
	'orion/webui/Slideout',
	'orion/bidiUtils'
], function(messages, objects, lib, mProblemsExplorer, mSlideout, bidiUtils) {
	var SlideoutViewMode = mSlideout.SlideoutViewMode;
	/** 
	 * Constructs a new ProblemView object.
	 * 
	 * @class 
	 * @name orion.BrowseView
	 */
	function ProblemsView(options, slideout) {
		if(slideout) {
			SlideoutViewMode.call(this, slideout);
		}
		var parentId = options.parentId ? options.parentId : "orion.PropertyPanel.container";
		this._parent = lib.node(parentId);
		this.serviceRegistry = options.serviceRegistry;
		this.commandRegistry = options.commandRegistry;
		this.preferences = options.preferences;
		this.fileClient = options.fileClient;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this._init(slideout);
	}
	ProblemsView.prototype = Object.create(SlideoutViewMode.prototype);
	ProblemsView.prototype.constructor = ProblemsView;
	objects.mixin(ProblemsView.prototype, /** @lends orion.problems.problemsView.prototype */ {
		_init: function(slideout) {
			if(!this._inner_node){
				this._inner_node = document.createElement("div"); //$NON-NLS-0$
				this._inner_node.classList.add("problems_inner_container"); //$NON-NLS-0$
			}
			if(slideout) {
				this._slideout.getContentNode().appendChild(this._inner_node); // temporarily add wrapper node to DOM to get around Safari fussiness
			} else {
				lib.empty(this._parent);
				this._parent.appendChild(this._inner_node);
			}
			this._createFilterInput();
			this._createCommandsContainer();
			var explorerParentNode = document.createElement("div"); //$NON-NLS-0$
			explorerParentNode.id = "problemsExplorerParent_id"; //$NON-NLS-0$
			explorerParentNode.classList.add("problemsExplorerNodeWrapper"); //$NON-NLS-0$
			this._inner_node.appendChild(explorerParentNode);
			this._inner_node.tabIndex = -1;
			this._inner_node.style.outline = "none";
			this._inner_node.addEventListener("keydown", function(e) { //$NON-NLS-0$
				if(e.defaultPrevented){// If the key event was handled by other listeners and preventDefault was set on(e.g. input completion handled ENTER), we do not handle it here
					return;
				}
				var keyCode= e.charCode || e.keyCode;
				if (keyCode === lib.KEY.ESCAPE) {
						this.hide();
				}
			}.bind(this));
			this._problemsExplorer = new mProblemsExplorer.ProblemsExplorer({parentId: explorerParentNode.id, serviceRegistry: this.serviceRegistry, commandRegistry: this.commandRegistry, 
																			preferences: this.preferences, contentTypeRegistry: this.contentTypeRegistry, fileClient: this.fileClient});
		},
		_createCommandsContainer: function() {
			var CommandsContainerNodeCore = document.createElement("div"); //$NON-NLS-0$
			CommandsContainerNodeCore.classList.add("problemsCommandsContainer"); //$NON-NLS-0$
			this._inner_node.appendChild(CommandsContainerNodeCore);
			var CommandsContainerNode = document.createElement("div"); //$NON-NLS-0$
			CommandsContainerNode.id = "problemsViewActionsContainerLeft"; //$NON-NLS-0$
			CommandsContainerNode.classList.add("problemsCommandsContainerLeft"); //$NON-NLS-0$
			CommandsContainerNode.classList.add("layoutLeft"); //$NON-NLS-0$
			CommandsContainerNodeCore.appendChild(CommandsContainerNode);
			var CommandsContainerNodeRight = document.createElement("div"); //$NON-NLS-0$
			CommandsContainerNodeRight.id = "problemsViewActionsContainerRight"; //$NON-NLS-0$
			CommandsContainerNodeRight.classList.add("problemsCommandsContainerRight"); //$NON-NLS-0$
			CommandsContainerNodeRight.classList.add("layoutRight"); //$NON-NLS-0$
			CommandsContainerNodeCore.appendChild(CommandsContainerNodeRight);
		},
		_createFilterInput: function() {
			var label = document.createElement("label"); //$NON-NLS-0$
 			label.textContent = messages["Filter problems:"];
 			label.classList.add("problemsFilterLabel"); //$NON-NLS-0$
			lib.setSafeAttribute(label, "for", "problemsFilterText");
 			var input = document.createElement("input"); //$NON-NLS-0$
 			input.id = "problemsFilterText"; //$NON-NLS-0$
			input.classList.add("problemsFilter"); //$NON-NLS-0$
			input.placeholder = messages["ProblemsFilter"]; //$NON-NLS-0$
			input.type="text"; //$NON-NLS-0$
			bidiUtils.initInputField(input);
			input.addEventListener("input", function (e) { //$NON-NLS-0$
				if (this._filterInputTimeout) {
					window.clearTimeout(this._filterInputTimeout);
				}
				var that = this;
				this._filterInputTimeout = window.setTimeout(function(){
					if (that._problemsExplorer) {
						that._problemsExplorer.filterProblems(input.value);
					}
					that._filterInputTimeout = null;
				}, 400);
			}.bind(this));
		
			input.addEventListener("keydown", function (e) { //$NON-NLS-0$
				var navHandler = null;
				var firstNode = null;
				if (e.keyCode === lib.KEY.DOWN)	{
					input.blur();
					navHandler = this._problemsExplorer.getNavHandler();
					navHandler.focus();
					if (navHandler.getTopLevelNodes()) {
						firstNode = navHandler.getTopLevelNodes()[0];
						navHandler.cursorOn(firstNode, false, true);
						if (firstNode.isNotSelectable) {
							navHandler.iterate(true, false, false, true);
						}
					}
					
					//prevent the browser's default behavior of automatically scrolling 
					//the outline view down because the DOWN key was pressed
					if (e.preventDefault) {
						e.preventDefault();	
					}
				} else if (e.keyCode === lib.KEY.ESCAPE) {
					if (this._slideout.getPreviousActiveElement()) {
						if (this._slideout.getPreviousActiveElement() === input) {
							input.blur();
						} else {
							this._slideout.getPreviousActiveElement().focus();
						}
						this.hide();
					}
				}
			}.bind(this), false);
			
			this._inner_node.appendChild(label);
			this._inner_node.appendChild(input);
			this._filterInput = input;
		},
		getWrapperNode: function() {
			return this._inner_node;
		},
		validate: function(location) {
			this._filterInput.value = "";
			this._problemsExplorer.validate(location, function(){
				this._filterInput.select();
			}.bind(this));
		}
	});
	return {ProblemsView: ProblemsView};
});
