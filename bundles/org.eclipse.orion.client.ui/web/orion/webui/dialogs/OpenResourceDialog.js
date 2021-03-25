/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *     Andy Clement (vmware) - bug 344614
 *******************************************************************************/
/*eslint-env browser, amd*/
/*global define document console window*/
define([
	'i18n!orion/widgets/nls/messages', 
	'i18n!orion/search/nls/messages',
	'orion/extensionCommands', 
	'orion/i18nUtil', 
	'orion/bidiUtils',
	'orion/searchUtils', 
	'orion/explorers/navigatorRenderer', 
	'orion/contentTypes', 
	'require', 
	'orion/webui/littlelib', 
	'orion/util', 
	'orion/webui/dialog', 
	'orion/metrics',
	'orion/generalPreferences',
	'orion/Deferred',
	'orion/urlModifier'
], function(messages, searchMSG, extensionCommands, i18nUtil, bidiUtils, mSearchUtils, navigatorRenderer, mContentTypes, require, lib, util, dialog, mMetrics, mGeneralPreferences, Deferred, urlModifier) {
	//default search renderer until we factor this out completely
	function DefaultSearchRenderer(serviceRegistry, commandRegistry) {
		this.serviceRegistry = serviceRegistry;
		this.commandRegistry = commandRegistry;
		this.openWithCommands = null;
	}
	/**
	 * Create a renderer to display search results.
	 * @public
     * @param {DOMNode} resultsNode Node under which results will be added.
	 * @param {String} [heading] the heading text, or null if none required
	 * @param {Function(DOMNode)} [onResultReady] If any results were found, this is called on the resultsNode.
	 * @param {Function(DOMNode)} [decorator] A function to be called that knows how to decorate each row in the result table
	 *   This function is passed a <td> element.
	 * @returns a render function.
	 */
	DefaultSearchRenderer.prototype.makeRenderFunction = function(contentTypeService, resultsNode, heading, onResultReady, decorator) {
		var serviceRegistry = this.serviceRegistry, commandRegistry = this.commandRegistry;
		this.openWithCommands = this.openWithCommands || extensionCommands.createOpenWithCommands(serviceRegistry, contentTypeService, commandRegistry);

		/**
		 * Displays links to resources under the given DOM node.
		 * @param {Object[]} resources array of resources. The shape of a resource is {name, path, lineNumber, directory, isExternalResource}
		 *	Both directory and isExternalResource cannot be true at the same time.
		 * @param {String} [queryName] A human readable name to display when there are no matches.  If 
		 *  not used, then there is nothing displayed for no matches
		 * @param {String} [error] A human readable error to display.
		 * @param {Object} [searchParams] Search params used
		 */
		var _self = this;
		function render(resources, queryName, error, searchParams) {
			return Deferred.when(_self.openWithCommands, function(openWithCommands) {
				if (error) {
					lib.empty(resultsNode);
					var message = document.createElement("div"); //$NON-NLS-0$
					message.appendChild(document.createTextNode(searchMSG["Search failed."]));
					resultsNode.appendChild(message);
					if (typeof(onResultReady) === "function") { //$NON-NLS-0$
						onResultReady(resultsNode);
					}
					return;
				} 
			
				//Helper function to append a path String to the end of a search result dom node 
				var appendPath = (function() { 
				
					//Map to track the names we have already seen. If the name is a key in the map, it means
					//we have seen it already. Optionally, the value associated to the key may be a function' 
					//containing some deferred work we need to do if we see the same name again.
					var namesSeenMap = {};
					
					function doAppend(domElement, resource) {
						var path = resource.folderName ? resource.folderName : resource.path;
						var pathNode = document.createElement('span'); //$NON-NLS-0$
						pathNode.id = path.replace(/[^a-zA-Z0-9_\.:\-]/g,'');
						pathNode.appendChild(document.createTextNode(' - ' + path + ' ')); //$NON-NLS-1$ //$NON-NLS-0$
						domElement.appendChild(pathNode);
					}
					
					function appendPath(domElement, resource) {
						var name = resource.name;
						if (namesSeenMap.hasOwnProperty(name)) {
							//Seen the name before
							doAppend(domElement, resource);
							var deferred = namesSeenMap[name];
							if (typeof(deferred)==='function') { //$NON-NLS-0$
								//We have seen the name before, but prior element left some deferred processing
								namesSeenMap[name] = null;
								deferred();
							}
						} else {
							//Not seen before, so, if we see it again in future we must append the path
							namesSeenMap[name] = function() { doAppend(domElement, resource); };
						}
					}
					return appendPath;
				}()); //End of appendPath function
	
				var foundValidHit = false;
				lib.empty(resultsNode);
				if (resources && resources.length > 0) {
					var table = document.createElement('table'); //$NON-NLS-0$
					lib.setSafeAttribute(table, 'role', 'presentation');
					for (var i=0; i < resources.length; i++) {
						var resource = resources[i];
						var col;
						if (!foundValidHit) {
							foundValidHit = true;
							// Every caller is passing heading === false, consider removing this code.
							if (heading) {
								var headingRow = table.insertRow(0);
								col = headingRow.insertCell(0);
								col.textContent = heading;
							}
						}
						var row = table.insertRow(-1);
						col = row.insertCell(0);
						col.colspan = 2;
						if (decorator) {
							decorator(col);
						}
	
						// Transform into File object that navigatorRenderer can consume
						var item = {
							Name: resource.name,
							Location: resource.location
						};
						var params = null;
						if (typeof resource.LineNumber === "number") { //$NON-NLS-0$
							params = {};
							params.line = resource.LineNumber;
						}
						if (searchParams && searchParams.keyword && !searchParams.nameSearch) {
							var searchHelper = mSearchUtils.generateSearchHelper(searchParams);
							params = params || {};
							params.find = searchHelper.inFileQuery.searchStr;
							params.regEx = searchHelper.inFileQuery.wildCard ? true : undefined;
						}
						var resourceLink = navigatorRenderer.createLink(require.toUrl("edit/edit.html"), item, commandRegistry, contentTypeService,
							openWithCommands, {
								"aria-describedby": (resource.folderName ? resource.folderName : resource.path).replace(/[^a-zA-Z0-9_\.:\-]/g,''), //$NON-NLS-0$
								style: {
									verticalAlign: "middle" //$NON-NLS-0$
								}
							}, params);
						resourceLink.resource = resource;
						if (resource.LineNumber) { // FIXME LineNumber === 0 
							resourceLink.appendChild(document.createTextNode(' (Line ' + resource.LineNumber + ')'));
						}
	
						col.appendChild(resourceLink);
						appendPath(col, resource);
					}
					resultsNode.appendChild(table);
					if (typeof(onResultReady) === "function") { //$NON-NLS-0$
						onResultReady(resultsNode);
					}
				}
				if (!foundValidHit) {
					// only display no matches found if we have a proper name
					if (queryName) {
						var errorStr = i18nUtil.formatMessage(searchMSG["NoMatchFound"], bidiUtils.enforceTextDirWithUcc(queryName)); 
						lib.empty(resultsNode);
						resultsNode.appendChild(document.createTextNode(errorStr)); 
						if (typeof(onResultReady) === "function") { //$NON-NLS-0$
							onResultReady(resultsNode);
						}
					}
				} 
			});
		} // end render
		return render;
	};//end makeRenderFunction

	/**
	 * Usage: <code>new OpenResourceDialog(options).show();</code>
	 * 
	 * @name orion.webui.dialogs.OpenResourceDialog
	 * @class A dialog that searches for files by name or wildcard.
	 * @param {String} [options.title] Text to display in the dialog's titlebar.
	 * @param {orion.searchClient.Searcher} options.searcher The searcher to use for displaying results.
	 * @param {Function} options.onHide a function to call when the dialog is hidden.  Optional.
	 */
	function OpenResourceDialog(options) {
		this._init(options);
	}
	
	OpenResourceDialog.prototype = new dialog.Dialog();


	OpenResourceDialog.prototype.TEMPLATE = 
		'<div>' + //$NON-NLS-0$
			'<div><label id="fileNameMessage" for="fileName">${Type the name of a file to open (? = any character, * = any string):}</label></div>' + //$NON-NLS-0$
			'<div><input id="fileName" type="text" class="openResourceDialogInput" aria-autocomplete="list" style="min-width: 25em; width:90%;"/></div>' + //$NON-NLS-0$
			'<div><label for="searchScope"><input id="searchScope" type="checkbox" style="width: auto" class="openResourceDialogInput"/>${Search In All Folders}</label></input></div>' + //$NON-NLS-0$
			'<div id="progress" style="padding: 2px 0 0; width: 100%;"><img src="'+ require.toUrl("../../../images/progress_running.gif") + '" class="progressPane_running_dialog" id="crawlingProgress"></img></div>' +  //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			'<div id="results" style="max-height:250px; height:auto; overflow-y:auto;" aria-live="off"></div>' + //$NON-NLS-0$
			'<div id="statusbar"></div>' + //$NON-NLS-0$
		'</div>'; //$NON-NLS-0$

	OpenResourceDialog.prototype._init = function(options) {
		this.title = options.title || messages['FindFileNamed'];
		this.modal = true;
		this.messages = messages;
		this.serviceRegistry = options.serviceRegistry;
		this.commandRegistry = options.commandRegistry;
		this._searcher = options.searcher;
		this._progress = options.progress;
		this._prefService = options.prefService;
		this._onHide = options.onHide;
		this._contentTypeService = new mContentTypes.ContentTypeRegistry(this.serviceRegistry);
		if (!this._searcher) {
			throw new Error("Missing required argument: searcher"); //$NON-NLS-0$
		}	
		this._searchDelay = options.searchDelay || 500;
		this._time = 0;
		this._forceUseCrawler = false;
		this._initialText = options.initialText;
		this._message = options.message;
		this._nameSearch = true;
		if (options.nameSearch !== undefined) {
			this._nameSearch = options.nameSearch;
		}
		this._searchOnRoot = false; // true;
		this._fileClient = this._searcher.getFileService();
		if (!this._fileClient) {
			throw new Error(messages['Missing required argument: fileService']);
		}
		this._searchRenderer = new DefaultSearchRenderer(this.serviceRegistry, this.commandRegistry);
		this._initialize();
	};
	
	OpenResourceDialog.prototype._bindToDom = function(parent) {
		var self = this;
		
		var gs = this.getSearchPref();
		this.$searchScope.checked = gs;
		this.updateTitle();
		this.$searchScope.addEventListener("click", function(e) {
			mMetrics.logEvent("preferenceChange", "searchScope", null, this.$searchScope.checked ? 0 : 1); //$NON-NLS-1$ //$NON-NLS-2$
			util.saveSetting("/searchScope", this.$searchScope.checked); //$NON-NLS-1$
			
			this.updateTitle();
			this.doSearch();
		}.bind(this));
		
		self.$crawlingProgress.style.display = "none"; //$NON-NLS-0$
		if(this._nameSearch) {
			lib.setSafeAttribute(this.$fileName, "placeholder", messages["FileName FolderName"]);
		} else {
			lib.setSafeAttribute(this.$fileName, "placeholder", messages["Search"]);
		}
		bidiUtils.initInputField(this.$fileName);
		this.$fileName.addEventListener("input", function(evt) { //$NON-NLS-0$
			self.checkSearch();
		}, false);
		this.$fileName.addEventListener("keydown",function(evt) { //$NON-NLS-0$
			if (evt.keyCode === lib.KEY.ENTER) {
				var link = lib.$("a", self.$results); //$NON-NLS-0$
				if (link) {
					lib.stop(evt);
					if(util.isMac ? evt.metaKey : evt.ctrlKey){
						window.open(urlModifier(link.href));
					} else {
						window.location.href = urlModifier(link.href);
						self.hide();
					}
					self._saveOpenedFileName(link.resource);
				}
			}
		}, false);
		parent.addEventListener("keydown", function(evt) { //$NON-NLS-0$
			var links, searchFieldNode, currentFocus, currentSelectionIndex, ele;
			var incrementFocus = function(currList, index, nextEntry) {
				if (index < currList.length - 1) {
					return currList[index+1];
				} else {
					return nextEntry;
				}
			};
			var decrementFocus = function(currList, index, prevEntry) {
				if (index > 0) {
					return currList[index-1];
				} else {
					return prevEntry;
				}
			};
			
			if (evt.keyCode === lib.KEY.DOWN || evt.keyCode === lib.KEY.UP) {
				links = lib.$$array("a", self.$results); //$NON-NLS-0$
				currentFocus = document.activeElement;
				currentSelectionIndex = links.indexOf(currentFocus);
				if (evt.keyCode === lib.KEY.DOWN) {
					if (currentSelectionIndex >= 0) {
						currentFocus.classList.remove("treeIterationCursor");
						ele = incrementFocus(links, currentSelectionIndex, links[0]);
						ele.focus();
						ele.classList.add("treeIterationCursor");
					} else if (links.length > 0) {
						// coming from the searchFieldNode
						ele = incrementFocus(links, -1, links[0]);
						ele.focus();
						ele.classList.add("treeIterationCursor");
					}   
				} else {
					if (currentSelectionIndex >= 0) {
						// jump to searchFieldNode if index === 0
						currentFocus.classList.remove("treeIterationCursor");
						searchFieldNode = self.$fileName;
						ele = decrementFocus(links, currentSelectionIndex, searchFieldNode);
						ele.focus();
						if(currentSelectionIndex > 0) {
							ele.classList.add("treeIterationCursor");
						}
					} else if (links.length > 0) {
						// coming from the searchFieldNode go to end of list
						links[links.length-1].focus();
						links[links.length-1].classList.add("treeIterationCursor");
					}
				}
				lib.stop(evt);
			}
		});
		parent.addEventListener("mouseup", function(e) { //$NON-NLS-0$
			// WebKit focuses <body> after link is clicked; override that
			e.target.focus();
		}, false);
		setTimeout(function() {
			if(self._forceUseCrawler || !self._fileClient.getService(self._searcher.getSearchLocation())["search"]){//$NON-NLS-0$
				var searchLoc = self._searchOnRoot ? self._searcher.getSearchRootLocation() : self._searcher.getChildrenLocation();
				self._crawler = self._searcher._createCrawler({resource: searchLoc}, {searchOnName: true}); 
				self._crawler.buildSkeleton(function() {
					self.$crawlingProgress.style.display = "inline"; //$NON-NLS-0$
					self.$progress.appendChild(document.createTextNode(messages['Building file skeleton...']));
					}, function(){
						self.$crawlingProgress.style.display = "none"; //$NON-NLS-0$
						self.$progress.removeChild(self.$progress.lastChild);
					});
			}
		}, 0);
		if (this._message) {
			this.$fileNameMessage.removeChild(this.$fileNameMessage.firstChild);
			this.$fileNameMessage.appendChild(document.createTextNode(this._message));
		}
		if (this._initialText) {
			this.$fileName.value = this._initialText;
			this.doSearch();
		}
	};

	/** @private */
	OpenResourceDialog.prototype.updateTitle = function() {
		var isGlobalSearch = this.$searchScope.checked;

		var newTitle, scope;
		if (!isGlobalSearch) {
			scope = "\'" + this._searcher.getSearchLocationName() + "\'"; //$NON-NLS-1$ //$NON-NLS-2$
			newTitle = util.formatMessage(this.title, bidiUtils.enforceTextDirWithUcc(scope));
		} else {
			scope = messages["FileFileGlobal"];
			newTitle = messages["FindFileGlobal"];
		}
		
		var titleDiv = lib.$("span", this.$frame); //$NON-NLS-1$
		titleDiv.textContent = newTitle;
		lib.setSafeAttribute(this.$frame, "aria-label", newTitle);
		
		// Hide the checkbox if this search must be global
		if (this.forcedGlobalSearch()) {
			this.$searchScope.parentNode.style.display = "none"; //$NON-NLS-1$
		}
		this._showRecentSearchedOpenedFiles();
	};

	/** @private */
	OpenResourceDialog.prototype.checkSearch = function() {
		if (this._timeoutId) clearTimeout(this._timeoutId);
		this._timeoutId = setTimeout(this.doSearch.bind(this), this._searchDelay); //$NON-NLS-0$
	};

	/** @private */
	OpenResourceDialog.prototype.forcedGlobalSearch = function() {
		var loc = this._searcher.getSearchLocation();
		var rootLoc = this._searcher.getSearchRootLocation();
		return loc === rootLoc;
	};

	/** @private */
	OpenResourceDialog.prototype.getSearchPref = function() {
		if (this.forcedGlobalSearch())
			return true;
			
		var globalSearch = util.readSetting("/searchScope") === 'true'; //$NON-NLS-0$
		return globalSearch;
	};

	/** @private */
	OpenResourceDialog.prototype._detectFolderKeyword = function(text) {
		var regex, match, keyword = text, folderKeyword = null;
		if(this._nameSearch){
			regex = /(\S+)\s*(.*)/;
			match = regex.exec(text);
			if(match && match.length === 3){
				if(match[1]){
					keyword = match[1];
				}
				if(match[2]){
					folderKeyword = match[2];
				}
			}
		} else {
			//TODO: content search has to do similar thing. E.g. "foo bar" folder123
		}
		return {keyword: keyword, folderKeyword: folderKeyword};
	};

	/** @private */
	OpenResourceDialog.prototype.doSearch = function() {
		var text = this.$fileName.value;

		// don't do a server-side query for an empty text box
		if (text) {
			// Gives Webkit a chance to show the "Searching" message
			var keyword = this._detectFolderKeyword(text);
			
			// Capture the checkbox state
			this._searchOnRoot = this.$searchScope.checked;
			return new mGeneralPreferences.GeneralPreferences(this._prefService).getPrefs().then(function(prefs) {
				if(typeof prefs.filteredResources === 'string') {
					var excludeFilesFromSetting = prefs.filteredResources.split(',');
				}
				var searchParams = this._searcher.createSearchParams(keyword.keyword, this._nameSearch, this._searchOnRoot,{exclude:excludeFilesFromSetting});
				var renderFunction = this._searchRenderer.makeRenderFunction(this._contentTypeService, this.$results, false, this.decorateResult.bind(this));
				var div = document.createElement("div"); //$NON-NLS-0$
				div.appendChild(document.createTextNode(this._nameSearch ? messages['Searching...'] : util.formatMessage(messages["SearchOccurences"], text)));
				lib.empty(this.$results);
				this.$results.appendChild(div);
				if (this._searchPending) {
					this._searchPending.cancel();
				}
				var currentSearch = this._searchPending = this._searcher.search(searchParams).then(function(searchResult) {
					this._searchPending =  null;
					var filteredResult = searchResult.filter(function(item) {
						return keyword.folderKeyword ? item.path.indexOf(keyword.folderKeyword) >= 0 : true;
					});
					renderFunction(filteredResult, searchParams.keyword, null, searchParams);
				}.bind(this), function(error) {
					if (currentSearch === this._searchPending) {
						this._searchPending = null;
						renderFunction(null, null, error, null);
					}
				}.bind(this));
			}.bind(this));
		}
		this._showRecentSearchedOpenedFiles();
	};
	
	/** @private */
	OpenResourceDialog.prototype.decorateResult = function(resultsDiv) {
		var self = this;
		var links = lib.$$array("a", resultsDiv); //$NON-NLS-0$
		function clicked(evt) { //$NON-NLS-0$
			if (evt.button === 0 && !evt.ctrlKey && !evt.metaKey) {
				self.hide();
			}
			var resource = evt.target ? evt.target.resource : evt.srcElement.resource;
			self._saveOpenedFileName(resource);
		}
		for (var i=0; i<links.length; i++) {
			var link = links[i];
			link.addEventListener("click", clicked, false);
		}
	};
	/** @private */
	OpenResourceDialog.prototype._saveOpenedFileName = function(resource) {
		var exsitingSearchedOpenedFileList = JSON.parse(sessionStorage.getItem("lastSearchedOpendFiles")) || [];
		var MAX_LENGTH = 10;
		if(exsitingSearchedOpenedFileList.length > 0){
			var oldIndex = indexofFileLink(exsitingSearchedOpenedFileList, resource);
			if(oldIndex !== -1){
				exsitingSearchedOpenedFileList.splice(oldIndex, 1);
			}
		}
		if(exsitingSearchedOpenedFileList.length < MAX_LENGTH){
			exsitingSearchedOpenedFileList.unshift(resource);
		}else if(exsitingSearchedOpenedFileList.length === MAX_LENGTH){
			exsitingSearchedOpenedFileList.pop();
			exsitingSearchedOpenedFileList.unshift(resource);
		}
		sessionStorage.setItem("lastSearchedOpendFiles", JSON.stringify(exsitingSearchedOpenedFileList)); //$NON-NLS-1$
		function indexofFileLink(array,link){
			for( var k=0; k < array.length ; k++){
				if(array[k].location === link.location){
					return k;
				}
			}
			return -1;
		}
	};
	
	/** @private */
	OpenResourceDialog.prototype._showRecentSearchedOpenedFiles = function() {
		var exsitingSearchedOpenedFileList = JSON.parse(sessionStorage.getItem("lastSearchedOpendFiles"));
		if(exsitingSearchedOpenedFileList && exsitingSearchedOpenedFileList.length > 0 ){
			var renderFunction = this._searchRenderer.makeRenderFunction(this._contentTypeService, this.$results, messages["Recently Opened Files"], this.decorateResult.bind(this));
			renderFunction(exsitingSearchedOpenedFileList, null, null, null);
		}
	};
	
	/** @private */
	OpenResourceDialog.prototype._beforeHiding = function() {
		clearTimeout(this._timeoutId);
		this._timeoutId = 0;
	};
	
	OpenResourceDialog.prototype._afterHiding = function() {
		if (this._onHide) {
			this._searcher.setLocationbyURL(this._searcher.getSearchLocation());
			this._onHide();
		}
	};
	
	OpenResourceDialog.prototype.constructor = OpenResourceDialog;
	//return the module exports
	return {OpenResourceDialog: OpenResourceDialog};
});
