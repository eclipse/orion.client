/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2019 IBM Corporation and others. 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/objects',
	'orion/util',
	'orion/webui/littlelib',
	'orion/bidiUtils',
	'text!orion/search/InlineSearchPane.html',
	'orion/inlineSearchResultExplorer',
	'orion/searchUtils',
	'orion/Deferred', 
	'orion/webui/dialogs/DirectoryPrompterDialog',
	'orion/widgets/input/ComboTextInput',
	'i18n!orion/search/nls/messages',
	'orion/generalPreferences',
	'orion/webui/tooltip',
	'orion/webui/Slideout'
], function(
	objects, util, lib, bidiUtils, InlineSearchPaneTemplate, InlineSearchResultExplorer, 
	mSearchUtils, Deferred, DirectoryPrompterDialog, ComboTextInput, messages, mGeneralPreferences, mTooltip, mSlideout
) {
	var SearchAnnoTypes = {};
	SearchAnnoTypes.ANNO_SEARCH_HIT = "orion.annotation.search.hit"; //$NON-NLS-0$
	var SlideoutViewMode = mSlideout.SlideoutViewMode;
	/**
	 * @param {orion.webui.Slideout} slideout
	 * @param {Object} options
	 */
	function InlineSearchPane(slideout, options) {
		SlideoutViewMode.call(this, slideout);
		this._serviceRegistry = options.serviceRegistry;
		this._commandRegistry = options.commandRegistry;
		this._fileClient = options.fileClient;
		this._searcher = options.searcher;
		this._preferences = options.preferences;
		this._inputManager = options.inputManager;
		this._generalPreferrence = new mGeneralPreferences.GeneralPreferences(this._preferences);
		this._initialize();
	}
	InlineSearchPane.prototype = Object.create(SlideoutViewMode.prototype);
	InlineSearchPane.prototype.constructor = InlineSearchPane;

	objects.mixin(InlineSearchPane.prototype, /** @lends orion.search.InlineSearchPane.prototype */ {
		_initialize: function() {
			this._searchWrapper = document.createElement("div"); //$NON-NLS-0$
			
			this._slideout.getContentNode().appendChild(this._searchWrapper); // temporarily add wrapper node to DOM to get around Safari fussiness
			
			var range = document.createRange();
			range.selectNode(this._slideout.getContentNode());
						
			var domNodeFragment = range.createContextualFragment(InlineSearchPaneTemplate);
			lib.processTextNodes(domNodeFragment, messages);
			this._searchWrapper.appendChild(domNodeFragment);
			this._searchWrapper.classList.add("searchWrapper"); //$NON-NLS-0$
			
			this._focusOnTextInput = function(){
				this._searchTextInputBox.select();
				this._searchTextInputBox.focus();
			}.bind(this);

			this._replaceWrapper = lib.$(".replaceWrapper", this._searchWrapper); //$NON-NLS-0$
			this._searchOptWrapperDiv = lib.$(".searchOptWrapperDiv", this._searchWrapper); //$NON-NLS-0$
			this._searchResultsTitle = lib.$(".searchResultsTitle", this._searchWrapper); //$NON-NLS-0$
			this._searchResultsWrapperDiv = lib.$(".searchResultsWrapperDiv", this._searchWrapper); //$NON-NLS-0$
			this._searchResultsWrapperDiv.id = "inlineSearchResultsWrapper";
			lib.setSafeAttribute(this._searchResultsWrapperDiv, "aria-labelledby", "searchResultsTitle");
			
			this._replaceCompareTitleDiv = lib.node("replaceCompareTitleDiv"); //$NON-NLS-0$
			this._replaceCompareDiv = lib.node("replaceCompareDiv"); //$NON-NLS-0$

			this._searchResultExplorer = new InlineSearchResultExplorer(this._serviceRegistry, this._commandRegistry, this, this._preferences, this._fileClient, this._searcher);
			
			this._initControls();
			this._initHTMLLabelsAndTooltips();
			
			this._slideout.getContentNode().removeChild(this._searchWrapper); // detach wrapper now that initialization is done, see getContentNode().appendChild() call above
			this._inputManager.addEventListener("InputChanged", function(evt) { //$NON-NLS-0$
				if(evt.metadata && !evt.metadata.Directory) {
					this._generateAnnotations(decodeURIComponent(evt.metadata.Location), evt.editor);
				}
			}.bind(this));
		},
		
		isVisible: function() {
			return this._slideout.isVisible() && (this === this._slideout.getCurrentViewMode());
		},
		
		focusOnTextInput: function() {
			window.setTimeout(this._focusOnTextInput, 100);
		},
		
		show: function() {
			this.previousDocumentTitle = window.document.title;
			SlideoutViewMode.prototype.show.call(this);
			this.focusOnTextInput();
		},
		
		hide: function() {
			if(window.document.title === this.newDocumentTitle){
				window.document.title = this.previousDocumentTitle;
			}
			SlideoutViewMode.prototype.hide.call(this);
			//if(this._filledResult) {
				this._showSearchOptBLocks();	
				this._hideReplaceField();
				this._searchBox.show();
				this._searchBox.enable(true);
				delete this._filledResult;
				lib.empty(lib.node("searchResultsTitle"));
				lib.empty(lib.node("searchPageActions"));
				lib.empty(lib.node("searchPageActionsRight"));
				lib.empty(this._searchResultsWrapperDiv);
				this._searchResultExplorer._replaceRenderer.cleanBreadCrumbs();
			//}
			this.hideReplacePreview();
		},
		
		getWrapperNode: function() {
			return this._searchWrapper;
		},
		
		getOptions: function(){
			var resource = ""; //$NON-NLS-0$
			this._searchLocations.forEach(function(searchLocation){
				if (resource) {
					resource = resource.concat(","); //$NON-NLS-0$
				}
				resource = resource.concat(searchLocation);
			}, this);
			
			this._correctFileNamePatternsInputValue();
			this._correctExcludeFilesInputValue();
			var fileNamePatternsArray = mSearchUtils.getFileNamePatternsArray(this._fileNamePatternsBox.getTextInputValue());
			var excludeFilesArray = mSearchUtils.getFileNamePatternsArray(this._excludeFilesBox.getTextInputValue()) || [];
			var replaceValue = this._replaceBox.getTextInputValue() || undefined;
			return this._generalPreferrence.getPrefs().then(function(prefs) {
				if(typeof prefs.filteredResources === 'string') {
					var excludeFilesFromSetting = prefs.filteredResources.split(',');
					excludeFilesArray = excludeFilesArray.concat(excludeFilesFromSetting);
				}
				return {keyword: this._searchBox.getTextInputValue(),
					rows: 10000,
					start: 0,
					replace: replaceValue,
					caseSensitive: this._caseSensitive,
					wholeWord: this._wholeWord,
			        regEx: this._regEx,
					fileNamePatterns: fileNamePatternsArray,
					exclude:excludeFilesArray,
			        resource: resource
				};
			}.bind(this));
		},
		
		search: function(){
			this._searchBox.enable(true);
			this._showSearchOptBLocks();
			this._submitSearch();
		},
		
		updateSearchScopeFromSelection: function(meta){
			if(meta){
				this._searcher._setLocationbyURL(meta);
			}
		},
		
		_generateAnnotations: function(fileLocation, editor) {
			this._searchResultExplorer.findFileNode(fileLocation).then(function(fileNode) {
				if(fileNode && fileNode.children && editor) {
					var annotationModel = editor.getAnnotationModel();
					annotationModel.removeAnnotations(SearchAnnoTypes.ANNO_SEARCH_HIT);
					fileNode.children.forEach(function(match) {
						match.type = SearchAnnoTypes.ANNO_SEARCH_HIT;
						annotationModel.addAnnotation(match);
					});
				}
			}.bind(this));
		},
		
		_initAnnotations: function() {
			if(this._inputManager && this._inputManager.inputManager) {
				var fMeta = this._inputManager.inputManager.getFileMetadata();
				if(fMeta && !fMeta.Directory) {
					this._generateAnnotations(decodeURIComponent(fMeta.Location), this._inputManager.inputManager.editor);
				}
			}
		},
		
		fillSearchResult: function(searchResult) {
			this._filledResult = searchResult;
			this._showReplaceField();
			this._hideSearchOptBLocks();	
			this._searchResultExplorer.runSearch(searchResult.searchParams, this._searchResultsWrapperDiv, searchResult).then(function() {
				this._initAnnotations();
			}.bind(this));
		},
				
		_submitSearch: function(){
			this._searchResultExplorer._replaceRenderer.cleanBreadCrumbs();
			var deferredOptions = this.getOptions();
			deferredOptions.then(function(options){
				options.replace = null;
				if(options.keyword){
					this._searchBox.addTextInputValueToRecentEntries();
					this._fileNamePatternsBox.addTextInputValueToRecentEntries();
					this._excludeFilesBox.addTextInputValueToRecentEntries();
					var searchParams = mSearchUtils.getSearchParams(this._searcher, options.keyword, options, this.getSearchScopeOption());
					this._searchResultExplorer.runSearch(searchParams, this._searchResultsWrapperDiv).then(function() {
						this._initAnnotations();
					}.bind(this));
					this._hideSearchOptions();
				}
			}.bind(this));
		},
		
		_replacePreview: function(){
			this._searchResultExplorer._replaceRenderer.cleanBreadCrumbs();
			var deferredOptions = this.getOptions();
			deferredOptions.then(function(options){
				if(!options.replace){
					options.replace = "";
				}
				if(options.keyword){
					this._searchBox.addTextInputValueToRecentEntries();
					this._replaceBox.addTextInputValueToRecentEntries();
					this._fileNamePatternsBox.addTextInputValueToRecentEntries();
					this._excludeFilesBox.addTextInputValueToRecentEntries();
	       			var searchParams;
					if(this._filledResult) {
	       				searchParams = mSearchUtils.copySearchParams(this._filledResult.searchParams);
	       				searchParams.replace = options.replace;
					} else {
						searchParams = mSearchUtils.getSearchParams(this._searcher, options.keyword, options, this.getSearchScopeOption());
						this._hideSearchOptions();
					}
					this._searchResultExplorer.runSearch(searchParams, this._searchResultsWrapperDiv, this._filledResult);
				}
			}.bind(this));
		},
	    
	    _initSearchBox: function(){
			//Optional. Reading extended search proposals by asking plugins, if any.
			//If there are multiple plugins then merge all the proposals and call uiCallBack.
			//Plugins(with service id "orion.search.proposal") should define the property "filterForMe" to true or false. Which means:
			//If true the inputCompletion class will filter the proposals returned by the plugin.
			//If false the inputCompletion class assumes that the proposals are already filtered by hte given kerword. 
			//The false case happens when a plugin wants to use the keyword to ask for a set of filtered proposal from a web service by the keyword and Orion does not need to filter it again.
			var exendedProposalProvider = function(keyWord, uiCallback){
				var serviceReferences = this._serviceRegistry.getServiceReferences("orion.search.proposal"); //$NON-NLS-0$
				if(!serviceReferences || serviceReferences.length === 0){
					uiCallback(null);
					return;
				}
	            var promises = [];
	            var renderer = this;
				serviceReferences.forEach(function(serviceRef) {
					var filterForMe = serviceRef.getProperty("filterForMe");  //$NON-NLS-0$
					promises.push( this._serviceRegistry.getService(serviceRef).run(keyWord).then(function(returnValue) {
						//The return value has to be an array of {category : string, datalist: [string,string,string...]}
						var proposalList = {filterForMe: filterForMe, proposals: []};
						for (var i = 0; i < returnValue.length; i++) {
							proposalList.proposals.push({type: "category", label: returnValue[i].category});//$NON-NLS-0$
							for (var j = 0; j < returnValue[i].datalist.length; j++) {
								proposalList.proposals.push({type: "proposal", label: returnValue[i].datalist[j], value: returnValue[i].datalist[j]});//$NON-NLS-0$
							}
						}
						return proposalList;
					}));
				}.bind(renderer));
				Deferred.all(promises).then(function(returnValues) {
					//Render UI
					uiCallback(returnValues);
				});
			}.bind(this);
			
			var searchBoxParentNode = lib.$(".searchMainOptionBlock", this._searchWrapper); //$NON-NLS-0$
			
			var searchButtonListener = function() {
				if (!this.isVisible()) {
					this.show();
				}
				this._submitSearch();
			}.bind(this);
			
			this._searchBox = new ComboTextInput({
				id: "advSearchInput", //$NON-NLS-0$
				parentNode: searchBoxParentNode,
				insertBeforeNode: this._replaceWrapper,
				hasButton: true,
				buttonClickListener: searchButtonListener,
				hasInputCompletion: true,
				serviceRegistry: this._serviceRegistry,
				extendedRecentEntryProposalProvider: exendedProposalProvider
			});
			
			var searchButtonSpan = document.createElement("span"); //$NON-NLS-0$
			searchButtonSpan.classList.add("core-sprite-search"); //$NON-NLS-0$
			
			this._searchButton = this._searchBox.getButton();
			this._searchButton.classList.add("searchButton"); //$NON-NLS-0$
			lib.setSafeAttribute(this._searchButton, "aria-label", messages["Search"]);
			this._searchButton.appendChild(searchButtonSpan);
			
			this._searchTextInputBox = this._searchBox.getTextInputNode();
			this._searchTextInputBox.placeholder = messages["Type a search term"]; //$NON-NLS-1$ //$NON-NLS-0$
			
			lib.setSafeAttribute(this._searchBox.getRecentEntryButton(), "aria-label", messages["Show previous search terms"]);
			this._searchWrapper.tabIndex = -1;
			this._searchWrapper.style.outline = "none";
			this._searchWrapper.addEventListener("keydown", function(e) { //$NON-NLS-0$
				if(e.defaultPrevented){// If the key event was handled by other listeners and preventDefault was set on(e.g. input completion handled ENTER), we do not handle it here
					return;
				}
				var keyCode= e.charCode || e.keyCode;
				if (keyCode === lib.KEY.ENTER && this._searchTextInputBox === e.target) {
					this._searchTextInputBox.blur();
					if (this._replaceBoxIsHidden()) {
						this._submitSearch();
					} else {
						this._replacePreview();
					}
				} else if (keyCode === lib.KEY.ESCAPE) {
					if (this._slideout.getPreviousActiveElement()) {
						if (this._slideout.getPreviousActiveElement() === this._searchTextInputBox) {
							this._searchTextInputBox.blur();
						} else {
							this._slideout.getPreviousActiveElement().focus();
						}
						this.hide();
					}
				}
			}.bind(this));
	    },
	    
	    _initReplaceBox: function() {
	        this._replaceBox = new ComboTextInput({
				id: "advReplaceInput", //$NON-NLS-0$
				parentNode: this._replaceWrapper,
				hasButton: true,
				buttonClickListener: this._replacePreview.bind(this),
				hasInputCompletion: true,
				serviceRegistry: this._serviceRegistry,
			});
			
			this._replaceTextInputBox = this._replaceBox.getTextInputNode();
			this._replaceTextInputBox.placeholder = messages["Replace With"]; //$NON-NLS-0$
			lib.setSafeAttribute(this._replaceTextInputBox, "aria-label", messages["Replace With"]);

			this._previewButtonSpan = document.createElement("span"); //$NON-NLS-0$
			this._previewButtonSpan.classList.add("core-sprite-search");
			this._replaceButton = this._replaceBox.getButton();
			this._replaceButton.classList.add("searchButton"); //$NON-NLS-0$
			lib.setSafeAttribute(this._replaceButton, "aria-label", messages["Preview Replace"]);
			this._replaceButton.appendChild(this._previewButtonSpan);
	
			lib.setSafeAttribute(this._replaceBox.getRecentEntryButton(), "aria-label", messages["Show previous replace terms"]);
			this._replaceTextInputBox.addEventListener("keydown", function(e) { //$NON-NLS-0$
				var keyCode= e.charCode || e.keyCode;
				if (keyCode === lib.KEY.ENTER) {
					this._replacePreview();
					this._replaceTextInputBox.blur();
				} 
			}.bind(this));
	    },
	    
	    _initFileNamePatternsBox: function() {
			this._fileNamePatternsHint = lib.$(".fileNamePatternsHint", this._searchWrapper); //$NON-NLS-0$
			
			this._fileNamePatternsBox = new ComboTextInput({
				id: "fileNamePatternsInput", //$NON-NLS-0$
				insertBeforeNode: this._fileNamePatternsHint,
				parentNode: this._fileNamePatternsHint.parentNode,
				hasButton: false,
				hasInputCompletion: true,
				serviceRegistry: this._serviceRegistry
			});
			
			this._fileNamePatternsBox.getDomNode().classList.add("fileNamePatternsInput"); //$NON-NLS-0$
			
			this._fileNamePatternsTextInput = this._fileNamePatternsBox.getTextInputNode();
			this._fileNamePatternsTextInput.classList.add("fileNamePatternsTextInput"); //$NON-NLS-0$
			this._fileNamePatternsTextInput.placeholder = "*.*"; //$NON-NLS-0$
			lib.empty(this._fileNamePatternsHint);
			this._fileNamePatternsHint.appendChild(document.createTextNode(messages["(* = any string, ? = any character)"])); //$NON-NLS-0$
			lib.setSafeAttribute(this._fileNamePatternsTextInput, "aria-describedby", "fileNamePatternsHint");
			this._fileNamePatternsTextInput.addEventListener("focus", function(){ //$NON-NLS-0$
				this._fileNamePatternsHint.classList.add("fileNamePatternsHintVisible"); //$NON-NLS-0$
			}.bind(this));
			
			this._fileNamePatternsTextInput.addEventListener("blur", function(){ //$NON-NLS-0$
				this._correctFileNamePatternsInputValue();
				this._fileNamePatternsHint.classList.remove("fileNamePatternsHintVisible"); //$NON-NLS-0$
			}.bind(this));
			
			this._fileNamePatternsTextInput.addEventListener("keydown", function(e) { //$NON-NLS-0$
				var keyCode= e.charCode || e.keyCode;
				// Execute search if user hits Enter
				if (keyCode === lib.KEY.ENTER) {
					this._fileNamePatternsTextInput.blur();
					if (this._replaceBoxIsHidden()) {
						this._submitSearch();
					} else {
						this._replacePreview();
					}
				} 
			}.bind(this));
	    },
	    
	    _initExcludeFilesBox: function(){
	    	this._excludeFilesHint = lib.$("#excludeFilesHint", this._searchWrapper); //$NON-NLS-0$
	    	this._excludeFilesBox = new ComboTextInput({
				id: "excludeFilesInput", //$NON-NLS-0$
				insertBeforeNode: this._excludeFilesHint,
				parentNode: this._excludeFilesHint.parentNode,
				hasButton: false,
				hasInputCompletion: true,
				serviceRegistry: this._serviceRegistry
			});
			this._excludeFilesBox.getDomNode().classList.add("fileNamePatternsInput"); //$NON-NLS-0$
			this._excludeFilesTextInput = this._excludeFilesBox.getTextInputNode();
			this._excludeFilesTextInput.classList.add("fileNamePatternsTextInput");
			
			lib.empty(this._excludeFilesHint);
			this._excludeFilesTextInput.addEventListener("focus", function(){ //$NON-NLS-0$
				this._generalPreferrence.getPrefs().then(function(prefs) {
					if(typeof prefs.filteredResources === 'string') {
						var excludeFilesFromSetting = prefs.filteredResources || "";
					}
					this._excludeFilesHint.textContent = messages["(* = any string, ? = any character)"] + "\n" + messages["The following files are excluded from general setting"] + "\n" + excludeFilesFromSetting; //$NON-NLS-0$
					lib.setSafeAttribute(this._excludeFilesTextInput, "aria-describedby", "excludeFilesHint");
				}.bind(this));
				this._excludeFilesHint.classList.add("fileNamePatternsHintVisible"); //$NON-NLS-0$
			}.bind(this));
			this._excludeFilesTextInput.addEventListener("blur", function(){ //$NON-NLS-0$
				this._excludeFilesHint.classList.remove("fileNamePatternsHintVisible"); //$NON-NLS-0$
			}.bind(this));
	    },
	    
		_initControls: function(){
			this._initSearchBox();
			this._initReplaceBox();
			this._initFileNamePatternsBox();
			this._initExcludeFilesBox();
			
			this._caseSensitiveButton = lib.$("#advSearchCaseSensitive", this._searchWrapper); //$NON-NLS-0$
			this._wholeWordButton = lib.$("#advSearchWholeWord", this._searchWrapper); //$NON-NLS-0$
			this._regExButton = lib.$("#advSearchRegEx", this._searchWrapper); //$NON-NLS-0$
			this._toggleReplaceLink = lib.$("#toggleReplaceLink", this._searchWrapper); //$NON-NLS-0$
			this._replaceModeToolTip = this._generateTooltips(this._toggleReplaceLink,messages["To Replace Mode Tooltip"]);
			this._caseSensitiveButton.addEventListener("click", this._toggleCaseSensitive.bind(this)); 
			this._wholeWordButton.addEventListener("click", this._toggleWholeWord.bind(this)); 
			this._regExButton.addEventListener("click", this._toggleRegEx.bind(this)); 

			this._toggleSearchOptionsLink = lib.$("#toggleSearchOptionsLink", this._searchWrapper); //$NON-NLS-0$
			this._toggleSearchOptionsLink.addEventListener("click", this.showSearchOptions.bind(this)); //$NON-NLS-0$
			var span = document.createElement("span"); //$NON-NLS-0$
			lib.setSafeAttribute(span, "aria-hidden", "true");
			span.textContent = "^ "; //$NON-NLS-0$
			this._toggleSearchOptionsLink.appendChild(span);
			span = document.createElement("span"); //$NON-NLS-0$
			span.textContent = messages["Edit Search"];
			this._toggleSearchOptionsLink.appendChild(span);

			if (this._replaceBoxIsHidden()) {
	        	this._toggleReplaceLink.classList.remove("checkedSearchOptionButton"); //$NON-NLS-0$	
	        }
	        this._toggleReplaceLink.addEventListener("click", this._toggleReplaceFieldVisibility.bind(this)); //$NON-NLS-0$
	        
			this._replaceCompareTitleDiv.textContent = messages["Preview: "]; //$NON-NLS-0$
	        this._initSearchScope();
		},
		
		_initHTMLLabelsAndTooltips: function(){
			var label = lib.$("#searchLabel", this._searchWrapper);
			label.appendChild(document.createTextNode(messages["Search Label"])); //$NON-NLS-1$ //$NON-NLS-0$
			lib.setSafeAttribute(label, "for", "advSearchInputcomboTextInputField");
			label = lib.$("#searchScopeLabel", this._searchWrapper);
			label.appendChild(document.createTextNode(messages["Scope"])); //$NON-NLS-1$ //$NON-NLS-0$
			label = lib.$("#fileNamePatternsLabel", this._searchWrapper);
			label.appendChild(document.createTextNode(messages["File name patterns (comma-separated)"])); //$NON-NLS-1$ //$NON-NLS-0$
			lib.setSafeAttribute(label, "for", "fileNamePatternsInputcomboTextInputField");
			this._generateTooltips(label,messages["File Patterns Box Tooltip"]);
			label = lib.$("#excludeFilesLabel", this._searchWrapper);
			label.appendChild(document.createTextNode(messages["Exclude Files"]));
			lib.setSafeAttribute(label, "for", "excludeFilesInputcomboTextInputField");
			this._generateTooltips(label,messages["Exclude Files Box Tooltip"]);

			this._generateTooltips(this._searchButton,messages["Search"]);
			this._generateTooltips(this._searchBox.getRecentEntryButton(),messages["Show previous search terms"]);
			this._generateTooltips(this._replaceButton,messages["Preview Replace"]);
			this._generateTooltips(this._replaceBox.getRecentEntryButton(),messages["Show previous replace terms"]);
			this._generateTooltips(this._caseSensitiveButton,messages["Case sensitive"]);
			this._generateTooltips(this._wholeWordButton,messages["Whole Word"]);
			this._generateTooltips(this._regExButton,messages["Regular expression"]);
			this._generateTooltips(this._searchScopeSelectButton,messages["Choose a Folder"]);
			this._generateTooltips(lib.$("#advSearchScopeSelectedLabel", this._searchWrapper),messages["Current Folder Tooltip"]);
			this._generateTooltips(lib.$("#advSearchScopeProjectLabel", this._searchWrapper),messages["Root Folder Tooltip"]);
			this._generateTooltips(lib.$("#advSearchScopeAllProjectLabel", this._searchWrapper),messages["All Folders Tooltip"]);
			this._generateTooltips(lib.$("#advSearchScopeOtherLabel", this._searchWrapper),messages["Other Folder Tooltip"]);
		},

		_generateTooltips: function(node,message){
			return node.tooltip = new mTooltip.Tooltip({
				node: node,
				text: message,
				position: ["below", "right", "above", "left"] //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$
			});
		},

		setOtherSearchScope: function(scope){
			var otherLocationString = typeof scope === "string" ? scope : scope.Location;
			this._searchScopeOther.checked = true;
			this._searcher.setLocationOther(otherLocationString);
			util.saveSetting("/inlineSearchScopeOption", "other");
			util.saveSetting("/inlineSearchOtherScope", otherLocationString);
			this._displaySelectedSearchScope([otherLocationString]);
			this._searcher.addDisplaycallback(this._displaySelectedSearchScope.bind(this),"other");
		},
		
		setSearchScope: function(searchScopeOption) {	
			var searchLocation = this._searcher.getSearchLocation(searchScopeOption);
			this._targetFolder = searchLocation;
			this._displaySelectedSearchScope([searchLocation], searchScopeOption);
			this._searcher.addDisplaycallback(this._displaySelectedSearchScope.bind(this),searchScopeOption);
		},
		
		setSearchText: function(str) {
			this._searchBox.setTextInputValue(str);
		},
		
		setSearchOptionButtons: function(searchParams) {
			this._caseSensitive = searchParams.caseSensitive ? true : false;
			this._wholeWord = searchParams.wholeWord ? true : false;
			this._regEx = searchParams.regEx ? true : false;
		},
		
		setFileNamePatterns: function(fNamePattern) {
			if(Array.isArray(fNamePattern)) {
				this._fileNamePatternsBox.setTextInputValue(fNamePattern.join(", ")); //$NON-NLS-0$
			} else {
				this._fileNamePatternsBox.setTextInputValue("");
			}
		},
		
		getSearchScopeOption: function(){
			return util.readSetting("/inlineSearchScopeOption") || "selected";
		},
		
		updateScopeOptions: function(scopeOption){
			switch(scopeOption){
				case "selected":
					this._searchScopeSelected.checked = true;
					this.setSearchScope("selected" );
					break;
				case "project":
					this._searchScopeProject.checked = true;
					this.setSearchScope("project");
					break;
				case "workspace":
					this._searchScopeAllProject.checked = true;
					this.setSearchScope("workspace");
					break;
				case "other":
					this._searchScopeOther.checked = true;
					this.setOtherSearchScope(this._getOtherScope());
					break;
				default:
					this._searchScopeSelected.checked = true;
					this.setSearchScope("selected" );
					break;
			}
		},
		
		_getOtherScope: function(){
			return util.readSetting("/inlineSearchOtherScope") || this._fileClient.fileServiceRootURL();
		},
		
		_initSearchScope: function() {
			this._rootURL = this._fileClient.fileServiceRootURL();
			this._searchLocations = [this._rootURL];
			
			this._searchScopeSelected = lib.$("#advSearchScopeSelected", this._searchOptWrapperDiv); //$NON-NLS-0$
			this._searchScopeProject = lib.$("#advSearchScopeProject", this._searchOptWrapperDiv); //$NON-NLS-0$
			this._searchScopeAllProject = lib.$("#advSearchScopeAllProject", this._searchOptWrapperDiv); //$NON-NLS-0$
			this._searchScopeOther = lib.$("#advSearchScopeOther", this._searchOptWrapperDiv); //$NON-NLS-0$
			this._searchScopeElementWrapper = lib.$("#searchScopeElementWrapper", this._searchOptWrapperDiv); //$NON-NLS-0$
			this._searchScopeSelectButton = lib.$("#searchScopeSelectButton", this._searchOptWrapperDiv); //$NON-NLS-0$
			
			this._searchScopeSelectButton.addEventListener("click", function(){ //$NON-NLS-0$
				var deferred;
				if(typeof this._targetFolder === "string") {
					deferred = this._fileClient.read(this._targetFolder, true);
				} else {
					deferred = new Deferred().resolve(this._targetFolder);
				}
				deferred.then(function(scopeMetadata){
					this._targetFolder = scopeMetadata;
					var searchScopeDialog = new DirectoryPrompterDialog.DirectoryPrompterDialog({
						title: messages["Choose a Folder"], //$NON-NLS-0$
						serviceRegistry: this._serviceRegistry,
						fileClient: this._fileClient,
						targetFolder: scopeMetadata,
						func: this.setOtherSearchScope.bind(this)
					});
					searchScopeDialog.show();
				}.bind(this));
			}.bind(this));
			this._searchScopeElementWrapper.addEventListener("keypress", function(e) {
				e.preventDefault();
				if (e.keyCode === lib.KEY.ENTER) {
					this._searchScopeSelectButton.click();
				}
			}.bind(this));
			this._searchScopeSelected.addEventListener("change", function(){
				if(this._searchScopeSelected.checked){
					this._saveAndUpdateDisplayedScope("selected");
					this.setSearchScope("selected");
				}
			}.bind(this), false);
			this._searchScopeAllProject.addEventListener("change", function(){
				if(this._searchScopeAllProject.checked){
					this._saveAndUpdateDisplayedScope("workspace");
					this.setSearchScope("workspace");
				}
			}.bind(this), false);
			this._searchScopeProject.addEventListener("change", function(){
				if(this._searchScopeProject.checked){
					this._saveAndUpdateDisplayedScope("project");
					this.setSearchScope("project");
				}
			}.bind(this), false);
			this._searchScopeOther.addEventListener("change", function(){
				if(this._searchScopeOther.checked){
					this._saveAndUpdateDisplayedScope("other");
					this.setOtherSearchScope(this._getOtherScope());
				}
			}.bind(this), false);
		},
		
		_saveAndUpdateDisplayedScope: function(scope){
			util.saveSetting("/inlineSearchScopeOption", scope);
			while (this._searchScopeElementWrapper.firstChild) {
			    this._searchScopeElementWrapper.removeChild(this._searchScopeElementWrapper.firstChild);
			}
		},
		
		_replaceBoxIsHidden: function() {
			return this._replaceWrapper.classList.contains("replaceWrapperHidden"); //$NON-NLS-0$
		},
		
		searchOptionsVisible: function() {
			return !this._searchWrapper.classList.contains("searchOptionsHidden"); //$NON-NLS-0$
		},
		
		_toggleReplaceFieldVisibility: function () {
			var focusElement = this._searchTextInputBox;
			if (this._replaceBoxIsHidden()) {
				this._showReplaceField();
				if (this._searchTextInputBox.value.length > 0) {
					focusElement = this._replaceTextInputBox;
				}
			} else {
				this._hideReplaceField();
			}
			focusElement.focus();
		},
		_toggleCaseSensitive: function () {
			if(this._caseSensitive){
				this._caseSensitive = false;
				this._caseSensitiveButton.classList.remove("checkedSearchOptionButton");
				lib.setSafeAttribute(this._caseSensitiveButton, "aria-pressed", "false");
			}else{
				this._caseSensitive = true;
				this._caseSensitiveButton.classList.add("checkedSearchOptionButton");
				lib.setSafeAttribute(this._caseSensitiveButton, "aria-pressed", "true");
			}
		},
		
		_toggleWholeWord: function () {
			if(this._wholeWord){
				this._wholeWord = false;
				this._wholeWordButton.classList.remove("checkedSearchOptionButton");
				lib.setSafeAttribute(this._wholeWordButton, "aria-pressed", "false");
			}else{
				this._wholeWord = true;
				this._wholeWordButton.classList.add("checkedSearchOptionButton");
				lib.setSafeAttribute(this._wholeWordButton, "aria-pressed", "true");
			}
		},
		
		_toggleRegEx: function () {
			if(this._regEx){
				this._regEx = false;
				this._regExButton.classList.remove("checkedSearchOptionButton");
				lib.setSafeAttribute(this._regExButton, "aria-pressed", "false");
			}else{
				this._regEx = true;
				this._regExButton.classList.add("checkedSearchOptionButton");
				lib.setSafeAttribute(this._regExButton, "aria-pressed", "true");
			}
		},
		
		showSearchOptions: function() {
			this._searchWrapper.classList.remove("searchOptionsHidden"); //$NON-NLS-0$
			this._toggleSearchOptionsLink.classList.add("linkHidden"); //$NON-NLS-0$
			this.focusOnTextInput();
		},
		
		_hideSearchOptions: function() {
			this._searchWrapper.classList.add("searchOptionsHidden"); //$NON-NLS-0$
			this._toggleSearchOptionsLink.classList.remove("linkHidden"); //$NON-NLS-0$
		},
		
		_showSearchOptBLocks: function() {
			this._searchWrapper.classList.remove("searchOptParamBlockHidden");
		},
		
		_hideSearchOptBLocks: function() {
			this._searchWrapper.classList.add("searchOptParamBlockHidden");
			//this._searchBox.hide();
			this._replaceTextInputBox.focus();
			this._searchBox.enable(false);
		},
		
		_showReplaceField: function() {
			this._searchBox.hideButton();
			this._replaceWrapper.classList.remove("replaceWrapperHidden"); //$NON-NLS-0$
			this._searchWrapper.classList.add("replaceModeActive"); //$NON-NLS-0$
			this._toggleReplaceLink.classList.add("checkedSearchOptionButton");
			lib.setSafeAttribute(this._toggleReplaceLink, "aria-pressed", "true");
			this._replaceModeToolTip && this._replaceModeToolTip.destroy();
			this._replaceModeToolTip = this._generateTooltips(this._toggleReplaceLink,messages["To Search Mode Tooltip"]);
		},
		
		_hideReplaceField: function() {
			this._searchBox.showButton();
			this._replaceWrapper.classList.add("replaceWrapperHidden"); //$NON-NLS-0$
			this._searchWrapper.classList.remove("replaceModeActive"); //$NON-NLS-0$
			this._toggleReplaceLink.classList.remove("checkedSearchOptionButton");
			lib.setSafeAttribute(this._toggleReplaceLink, "aria-pressed", "false");
			this._replaceModeToolTip && this._replaceModeToolTip.destroy();
			this._replaceModeToolTip = this._generateTooltips(this._toggleReplaceLink,messages["To Replace Mode Tooltip"]);
			this.hideReplacePreview();
		},
		
		showReplacePreview: function() {
			this._replaceCompareTitleDiv.classList.add("replaceCompareTitleDivVisible"); //$NON-NLS-0$
			this._replaceCompareDiv.classList.add("replaceCompareDivVisible"); //$NON-NLS-0$
		},
		
		hideReplacePreview: function() {
			this._replaceCompareTitleDiv.classList.remove("replaceCompareTitleDivVisible"); //$NON-NLS-0$
			this._replaceCompareDiv.classList.remove("replaceCompareDivVisible"); //$NON-NLS-0$
		},
		
		_displaySelectedSearchScope: function(searchLocations, searchScopeOption) {
			var scopeElementWrapper = this._searchScopeElementWrapper;
			lib.empty(scopeElementWrapper);
			
			searchLocations.forEach(function(searchLocation){
				var decodedLocation = decodeURI(searchLocation);
				var scopeString = decodedLocation;
				var rootName = this._fileClient.fileServiceRootURL(scopeString);
				if (rootName === searchLocation) {
					//replace location string with file system name
					scopeString = this._fileClient.fileServiceName(scopeString);
				} else {
					scopeString = scopeString.replace(rootName, "");
					if(searchScopeOption === "workspace"){
						scopeString = messages["Scope All"];
					}else{
						// Remove the workspace name portion from the scopeString, which will remove 'orionode' from '/orionode/Foldername'
						scopeString = "/" + scopeString.split("/").slice(2).join("/");
					}
				}
				var locationElementWrapper = document.createElement("div");
				locationElementWrapper.classList.add("locationElementWrapper");
				
				var locationElement = document.createElement("span"); //$NON-NLS-0$
				
				locationElement.textContent = scopeString;
				if (bidiUtils.isBidiEnabled()) {
					locationElement.dir = bidiUtils.getTextDirection(scopeString);
				}
				locationElementWrapper.appendChild(locationElement);	
				scopeElementWrapper.appendChild(locationElementWrapper);	
			}, this);
		},
		
		_correctFileNamePatternsInputValue: function() {
			var inputValue = this._fileNamePatternsBox.getTextInputValue();
			if (inputValue) {
				var correctedPatternArray = mSearchUtils.getFileNamePatternsArray(inputValue);
				this._fileNamePatternsBox.setTextInputValue(correctedPatternArray.join(", ")); //$NON-NLS-0$
			}
		},
		
		_correctExcludeFilesInputValue: function() {
			var inputValue = this._excludeFilesBox.getTextInputValue();
			if (inputValue) {
				var correctedExcludeFilesArray = mSearchUtils.getFileNamePatternsArray(inputValue);
				this._excludeFilesBox.setTextInputValue(correctedExcludeFilesArray.join(", ")); //$NON-NLS-0$
			}
		},
		
		getSearchResultsTitleDiv: function() {
			return this._searchResultsTitle;
		},
		
		getReplaceCompareTitleDiv: function() {
			return this._replaceCompareTitleDiv;
		},
		
		getReplaceCompareDiv: function() {
			return this._replaceCompareDiv;
		}
	});

	return InlineSearchPane;
});
