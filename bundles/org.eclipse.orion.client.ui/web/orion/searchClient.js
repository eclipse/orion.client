/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2015 IBM Corporation and others 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors:
 * IBM Corporation - initial API and implementation
 *******************************************************************************/
 
/*eslint-env browser, amd*/
define([
	'i18n!orion/search/nls/messages', 
	'orion/webui/littlelib', 
	'orion/i18nUtil', 
	'orion/searchUtils', 
	'orion/crawler/searchCrawler', 
	'orion/Deferred'
], function(messages, lib, i18nUtil, mSearchUtils, mSearchCrawler, Deferred){

	/**
	 * Creates a new search client.
	 * @param {Object} options The options object
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry The service registry
	 * @name orion.searchClient.Searcher
	 * @class Provides API for searching the workspace.
	 */
	function Searcher(options) {
		this._registry= options.serviceRegistry;
		this._commandService = options.commandService;
		this._fileClient = options.fileService;
		//TODO clean up the search client API. Make any helper private
		this._registry.registerService("orion.core.search.client", this); //$NON-NLS-1$
	}
	Searcher.prototype = /**@lends orion.searchClient.Searcher.prototype*/ {
		getFileService: function(){
			return this.getFileClient();
		},
		_getNoneRootMeta: function(meta) {
			if(meta) {
				if(meta.Directory === undefined && meta.Location) {// Nodejs server does not return Directory property on a non root folder from a file's parent chain.
					return meta;
				}
				if(meta.Directory && meta.Location && meta.Parents) {
					return meta;
				}
			}
			return null;
		},
		/**
		 * Used to update "selectd" and "project" search scope based on the file or folder selected.
		 */
		setLocationByMetaData: function(meta, useParentLocation){
			var locationName = "";
			var noneRootMeta = null;
			this._setLocationbyURL(meta);
			this._searchRootLocation = meta.WorkspaceLocation || this._fileClient.fileServiceRootURL(meta.Location);
			if(useParentLocation && meta && meta.Parents && meta.Parents.length > 0){
				if(useParentLocation.index === "last"){
					noneRootMeta = meta.Parents[meta.Parents.length-1];
				} else {
					noneRootMeta = meta.Parents[0];
				}
			} else {
				noneRootMeta = this._getNoneRootMeta(meta);
			} 
			if(noneRootMeta){
				this.setLocationbyURL(noneRootMeta.Location);
				locationName = noneRootMeta.Name;
				this._childrenLocation = noneRootMeta.ChildrenLocation;
			} else if(meta){
				this.setLocationbyURL(this._searchRootLocation);
				locationName = this._fileClient.fileServiceName(meta.Location);
				this._childrenLocation = meta.ChildrenLocation;
			}
			var searchInputDom = lib.node("search"); //$NON-NLS-0$
			if(!locationName){
				locationName = "";
			}
			this._searchLocationName = locationName;
			if(searchInputDom && searchInputDom.placeholder){
				searchInputDom.value = "";
				var placeHolder = i18nUtil.formatMessage(messages["Search ${0}"], locationName);
				
				if(placeHolder.length > 30){
					searchInputDom.placeholder = placeHolder.substring(0, 27) + "..."; //$NON-NLS-0$
				} else {
					searchInputDom.placeholder = i18nUtil.formatMessage(messages["Search ${0}"], locationName);
				}
			}
			if(searchInputDom && searchInputDom.title){
				searchInputDom.title = messages["TypeKeyOrWildCard"] + locationName;
			}
		},
		setLocationbyURL: function(locationURL){
			this._searchLocation = locationURL;			
		},
		_calculateProjectScope : function (data) {
		  //Similar mechanism to the setLocationByMetaData method in searchClient.js with meta = data.items[0]
		  //and useParentLocation = {index: "last"} to retrieve project scope info.
		  var searchLoc = null;
		  if(data.items[0] && data.items[0].Parents && data.items[0].Parents.length){
		    searchLoc = data.items[0].Parents[data.items[0].Parents.length - 1];
		  } else if(data.items[0]) {
		    searchLoc = data.items[0];
		  } else {
		  	searchLoc = data.items;
		  }
		  return searchLoc;
		},
		/**
		 * Used to update "other" search scope, this location info comes directly from InlineSearchPane.js
		 */
		setLocationOther: function(otherLocation){
			this._searchLocation_other = otherLocation;
		},
		_handleSearchscopeLocation: function(searchTarget){
			// If the search target's Location is /workspace/orionode, change it to fileSearviceRootUrl(), which in most cases will give you /file
			return searchTarget.Location !== "/workspace/orionode" ? searchTarget.Location : this._fileClient.fileServiceRootURL();
		},
		_setLocationbyURL: function(meta){
			this._searchLocation_selected = typeof meta ==="string" ? meta : meta.Directory ? meta : meta.Parents[0];
			this._searchLocation_project = this._calculateProjectScope({items: [meta]});
			if(this._displaycallBack){
				if(this._searchScopeOption === "selected"){
					this._displaycallBack([this._handleSearchscopeLocation(this._searchLocation_selected)]);
				}else if(this._searchScopeOption === "project"){
					this._displaycallBack([this._handleSearchscopeLocation(this._searchLocation_project)]);
				}
			}
		},
		getSearchLocation: function(searchScope){
			switch(searchScope){
				case "selected":
					if(this._searchLocation_selected){
						return this._handleSearchscopeLocation(this._searchLocation_selected);
					}
					break;
				case "project":
					if(this._searchLocation_project){
						return this._handleSearchscopeLocation(this._searchLocation_project);
					}
					break;
				case "workspace":
					return this.getSearchRootLocation();
				case "other":
					if(this._searchLocation_other){
						return this._searchLocation_other;
					}
					break;
			}
			if(this._searchLocation){
				return this._searchLocation;
			}
			return this._fileClient.fileServiceRootURL();
		},
		getSearchLocationName: function(){
			return this._searchLocationName;
		},
		getSearchRootLocation: function(){
			return this._searchRootLocation || this._fileClient.fileServiceRootURL();
		},
		getChildrenLocation: function(){
			return this._childrenLocation || this.getSearchRootLocation();
		},
		addDisplaycallback: function(displayCallback, searchScopeOption){
			this._displaycallBack = displayCallback;
			this._searchScopeOption = searchScopeOption;
		},
		
		/**
		 * @name getFileClient
		 * @description Get the file client;
		 * @function
		 * @returns {orion.FileClient} returns a file client
		 */
		getFileClient: function() {
			return this._fileClient ? this._fileClient : this._registry.getService("orion.core.file.client"); //$NON-NLS-1$
		},
		/**
		 * Runs a search and displays the results under the given DOM node.
		 * @public
		 * @param {Object} searchParams The search parameters.
		 * @param {Function(JSONObject)} Callback function that receives the results of the query.
		 */
		search: function(searchParams, generateMatches, generateMeta) {
			try {
				return this.getFileClient().search(searchParams).then(function(jsonData) {
					var searchResult = this.convert(jsonData, searchParams);
					return this._generateMatches(searchParams, searchResult, generateMatches).then(function() {
						return this._generateMeta(searchResult, generateMeta).then(function() {
							return searchResult;
						});
					}.bind(this));
				}.bind(this));
			}
			catch(err){
				var error = err.message || err;
				if(typeof error === "string" && error.toLowerCase().indexOf("search") > -1){ //$NON-NLS-1$ //$NON-NLS-0$
					if(!this._crawler) {
						this._crawler = this._createCrawler(searchParams);
					}
					if(searchParams.nameSearch) {
						return this._crawler.searchName(searchParams).then(function(jsonData) {
							return this.convert(jsonData, searchParams);
						}.bind(this));
					}
					var result;
					return result = this._crawler.search(function() {
						result.progress(arguments[0], arguments[1]);
					}).then(function(jsonData) {
						return this.convert(jsonData, searchParams);
					}.bind(this));
				}
				throw error;
			}
		},
		_generateSingle: function(sResult, searchHelper) {
			return this.getFileClient().read(sResult.location).then(function(jsonData) {
				mSearchUtils.searchWithinFile(searchHelper.inFileQuery, sResult, jsonData, false, searchHelper.params.caseSensitive, true);
				return sResult;
			}.bind(this),
			function(error) {
				var statusService = this._registry.getService("orion.page.message"); //$NON-NLS-1$
				if (statusService) {
					statusService.setProgressResult({Message: error.message, Severity: "Error"}); //$NON-NLS-1$
				}
			}.bind(this));
		},
		_generateMatches: function(searchParams, searchResult, generateMatches) {
			if(!generateMatches || searchResult.length === 0) {
				return new Deferred().resolve(searchResult);
			}
			var searchHelper = mSearchUtils.generateSearchHelper(searchParams);
			var promises = [];
			searchResult.forEach(function(sResult) {
				promises.push(this._generateSingle(sResult, searchHelper));
			}.bind(this)); 
			return Deferred.all(promises, function(error) { return {_error: error}; });
		},
		_generateSingleMeta: function(sResult) {
			return this.getFileClient().read(sResult.location, true).then(function(jsonData) {
				sResult.metadata = jsonData;
				return sResult;
			}.bind(this), function(error) {
				var statusService = this._registry.getService("orion.page.message"); //$NON-NLS-1$
				if (statusService) {
					statusService.setProgressResult({Message: error.message, Severity: "Error"}); //$NON-NLS-1$
				}
			}.bind(this));
		},
		_generateMeta: function(searchResult, generateMeta) {
			if(!generateMeta || searchResult.length === 0) {
				return new Deferred().resolve(searchResult);
			}
			var promises = [];
			searchResult.forEach(function(sResult) {
				promises.push(this._generateSingleMeta(sResult));
			}.bind(this)); 
			return Deferred.all(promises, function(error) { return {_error: error}; });
		},
		convert: function(jsonData, searchParams) {
			var converted = [];
			var rootURL = this._fileClient.fileServiceRootURL(searchParams.resource);
			if (jsonData.response.numFound > 0) {
				for (var i=0; i < jsonData.response.docs.length; i++) {
					var hit = jsonData.response.docs[i];
					if (!hit.Directory) {
						var loc = hit.Location;
						var path = hit.Path;
						if (!path) {
							path = loc.substring(rootURL ? rootURL.length : 0); //remove file service root from path
						}
						converted.push({location: loc, path: path, name: hit.Name, workspace: this._searchRootLocation});
					}
				}
			}
			return converted;
		},
		_createCrawler: function(searchParams, options) {
			this._crawler = new mSearchCrawler.SearchCrawler(this._registry, this.getFileClient(), searchParams, options);
			return this._crawler;
		},
		
		/**
		 * Returns a query object for search. The return value has the propertyies of resource and parameters.
		 * @param {String} keyword The text to search for, or null when searching purely on file name
		 * @param {Boolean} [nameSearch] The name of a file to search for
		 * @param {Boolean} [useRoot] If true, do not use the location property of the searcher. Use the root url of the file system instead.
		 */
		createSearchParams: function(keyword, nameSearch, useRoot, advancedOptions, searchScope)  {
			var searchOn = useRoot ? this.getSearchRootLocation(): this.getSearchLocation(searchScope);
			if (nameSearch) {
				//assume implicit trailing wildcard if there isn't one already
				//var wildcard= (/\*$/.test(keyword) ? "" : "*"); //$NON-NLS-0$
				return {
					resource: searchOn,
					sort: "NameLower asc", //$NON-NLS-0$
					rows: 100,
					start: 0,
					nameSearch: true,
					keyword: keyword,
					exclude: (advancedOptions && advancedOptions.exclude) ? advancedOptions.exclude : undefined,
				};
			}
			return {
				resource: searchOn,
				sort: advancedOptions && advancedOptions.sort ? advancedOptions.sort : "Path asc", //$NON-NLS-0$
				rows: advancedOptions && advancedOptions.rows ? advancedOptions.rows : 40,
				start: 0,
				caseSensitive: advancedOptions ? advancedOptions.caseSensitive : undefined,
				wholeWord: advancedOptions ? advancedOptions.wholeWord : undefined,
				regEx: advancedOptions ? advancedOptions.regEx : undefined,
				fileType: advancedOptions ? advancedOptions.fileType : undefined,
				fileNamePatterns: (advancedOptions && advancedOptions.fileNamePatterns) ? advancedOptions.fileNamePatterns : undefined,
				exclude: (advancedOptions && advancedOptions.exclude) ? advancedOptions.exclude : undefined,
				keyword: keyword,
				replace: advancedOptions ? advancedOptions.replace : undefined,
				searchScope: searchScope
			};
		}
	};

	Searcher.prototype.constructor = Searcher;
	//return module exports
	return {Searcher:Searcher};
});
