/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define(['i18n!orion/crawler/nls/messages', 'orion/i18nUtil', 'orion/searchUtils', 'orion/contentTypes', 'orion/uiUtils', 'orion/Deferred'], 
		function(messages, i18nUtil, mSearchUtils, mContentTypes, mUiUtils, Deferred) {
	
	var DEBUG = false;
	var _folderFilter = [".git", "node_modules", ".cvs"];
	/**
	 * SearchCrawler is an alternative when a file service does not provide the search API.
	 * It assumes that the file client at least provides the fetchChildren and read APIs.
	 * It basically visits all the children recursively under a given directory location and search on a given keyword, either literal or wild card.
	 * @param {serviceRegistry} serviceRegistry The service registry.
	 * @param {fileClient} fileClient The file client that provides fetchChildren and read APIs.
	 * @param {Object} searchParams The search parameters. 
	 * @param {Object} options Not used yet. For future use.
	 * @name orion.search.SearchCrawler
	 */
	function SearchCrawler(	serviceRegistry, fileClient, searchParams, options) {
		this.registry= serviceRegistry;
		this.fileClient = fileClient; 
		this.fileLocations = [];
		this.fileSkeleton = [];
		this._hitCounter = 0;
		this._totalCounter = 0;
		this._searchOnName = options && options.searchOnName;
		this._buildSkeletonOnly = options && options.buildSkeletonOnly;
		this._fetchChildrenCallBack = options && options.fetchChildrenCallBack;
		this._searchParams = searchParams;
		this.searchHelper = (this._searchOnName || this._buildSkeletonOnly || !this._searchParams) ? null: mSearchUtils.generateSearchHelper(searchParams);
		this._location = searchParams ? searchParams.resource : options && options.location;
		this._childrenLocation = options && options.childrenLocation ? options.childrenLocation : this._location;   
		this._reportOnCancel = options && options.reportOnCancel;
		this._visitSingleFile = options && options.visitSingleFile;
		if(!this._visitSingleFile) {
			this._visitSingleFile = this._searchSingleFile;
		}
		this._cancelMessage = options && options.cancelMessage;
		if(!this._cancelMessage) {
			this._cancelMessage = messages["searchCancelled"];
		}
		this._cancelled = false;
		this._statusService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
		this._progressService = this.registry.getService("orion.page.progress"); //$NON-NLS-0$
		if(this._statusService) {
			this._statusService.setCancelFunction(function() {this._cancelFileVisit();}.bind(this));
		}
	}
	
	/**
	 * Do search based on this.searchHelper.
	 * @param {Function} onComplete The callback function on search complete. The array of hit file locations are passed to the callback.
	 */
	SearchCrawler.prototype.search = function(onComplete){
		this.contentTypeService = this.registry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
		this._onSearchComplete = onComplete;
		this._cancelled = false;
		this._deferredArray = [];
		var result;
		return this.contentTypeService.getContentTypes().then(function(ct) {
			this.contentTypesCache = ct;
			var crawler = this;
			return this._visitRecursively(this._childrenLocation).then(function(){
				//We only report the result on the completion in two cases: 1.If there is no cancellation 2.If the option reportResultOnCancel is true
				if(!crawler._cancelled || crawler._reportOnCancel){//If it is in simulating mode we need to report the result anyway
					result = crawler._reportResult();
				} 
				//Normally if a cancellation happens it goes to error handler. But in corner cases that deferred.resolve is faster than deferred.cancel we need to capture the case
				if(crawler._cancelled) {
					crawler._HandleStatus({name: "Cancel"}); //$NON-NLS-0$
				}
				return new Deferred().resolve(result);
			}.bind(crawler),
			function(error){
				result = crawler._reportResult();
				crawler._HandleStatus(error); 
				return new Deferred().resolve(result);
			}.bind(crawler));
		}.bind(this));
	};
	
	/**
	 * Search file name on the query string from the file skeleton.
	 * @param {String} queryStr The query string. This is temporary for now. The format is "?sort=Path asc&rows=40&start=0&q=keyword+Location:/file/e/bundles/\*"
	 * @param {Function} onComplete The callback function on search complete. The array of hit file locations are passed to the callback.
	 */
	SearchCrawler.prototype.searchName = function(searchParams){
		if(searchParams){
			this._searchParams = searchParams;
			this.searchHelper = mSearchUtils.generateSearchHelper(searchParams, true);
		}
		var results = [];
		this._cancelled = false;
		this._deferredArray = [];
		this._sort(this.fileSkeleton);
		if(this.fileSkeleton.length > 0){
			for (var i = 0; i < this.fileSkeleton.length ; i++){
				var lineString = this.fileSkeleton[i].Name.toLowerCase();
				var result;
				if(this.searchHelper.inFileQuery.wildCard){
					result = mSearchUtils.searchOnelineRegEx(this.searchHelper.inFileQuery, lineString, true);
				} else {
					result = mSearchUtils.searchOnelineLiteral(this.searchHelper.inFileQuery, lineString, true);
				}
				if(result){
					results.push(this.fileSkeleton[i]);
					if(results.length >= this.searchHelper.params.rows){
						break;
					}
				}
			}
			var response = {numFound: results.length, docs: results };
			return new Deferred().resolve({response: response});
		} else {
			return new Deferred().resolve({response: {numFound: 0, docs: []}});
		}
	};
	
	/**
	 * Do search based on this.searchHelper.
	 * @param {Function} onComplete The callback function on search complete. The array of hit file locations are passed to the callback.
	 */
	SearchCrawler.prototype.buildSkeleton = function(onBegin, onComplete){
		this._buildingSkeleton = true;
		this.contentTypeService = this.registry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
		this._cancelled = false;
		this._deferredArray = [];
		var that = this;
		onBegin();
		this.contentTypeService.getContentTypes().then(function(ct) {
			that.contentTypesCache = ct;
			that._visitRecursively(that._childrenLocation).then(function(){ //$NON-NLS-0$
					that._buildingSkeleton = false;
					onComplete();
			});
		});
	};
	
	SearchCrawler.prototype.incrementalReport = function(fileObj, doSort){
		if(this._cancelled){
			return;
		}
		fileObj.LastModified = fileObj.LocalTimeStamp;
		this.fileLocations.push(fileObj);
		this._hitCounter++;
		if(doSort) {
			this._sort(this.fileLocations);
		}
		var response = {numFound: this.fileLocations.length, docs: this.fileLocations };
		this._onSearchComplete({response: response}, true);
		if(this._statusService) {
			this._statusService.setProgressResult({Message: i18nUtil.formatMessage(messages["filesFound"], this._hitCounter, this._totalCounter)}, messages["Cancel"]);
		}
	};
	
	SearchCrawler.prototype.addTotalCounter = function(number){
		if(!number) {
			number = 1;
		}
		this._totalCounter = this._totalCounter + number;
	};
	
	SearchCrawler.prototype.isCancelled = function(){
		return this._cancelled;
	};
	
	/**
	 * @name SearchCrawler.prototype._contains
	 * @description Checks to see if the given string item is in the given array of strings - ignoring case
	 * @function
	 * @private
	 * @param {Array.<String>} array The array to check
	 * @param {String} item The item to check for
	 * @returns {Boolean} Returns if the string is found in the array, ignoring case
	 */
	SearchCrawler.prototype._contains = function(array, item){
		if(Array.isArray(array) && typeof item === 'string') {
			var val = item.toLocaleLowerCase();
			return array.some(function(elt) {
				return elt === val;
			});
		}
		return false;
	};
	
	SearchCrawler.prototype._sort = function(fileArray){
		fileArray.sort(function(a, b) {
			var n1, n2;
			if(this._searchParams && this._searchParams.sort === "Path asc"){ //$NON-NLS-0$
				//Folder equals to Location's substring after tailing out the file name
				//We can not purely sort on Location because "Location" includes the file name at the tail.
				//E.g. "DDD/f1_2_1.css" will be lined up after "DDD/AAA/f1_2_2.html" if we do so.
				var location1 = a.Location && a.Location.toLowerCase();
				n1 = mUiUtils.path2FolderName(location1, true);
				var location2 = b.Location && b.Location.toLowerCase();
				n2 = mUiUtils.path2FolderName(location2, true);
				if (n1 < n2) { return -1; }
				if (n1 > n2) { return 1; }
				//If the same folder appears to two files, then we sort on file name
				return this._sortOnNameSingle(a, b);
			}
			return this._sortOnNameSingle(a, b);
		}.bind(this)); 
	};
		
	SearchCrawler.prototype._HandleStatus = function(error){
		if(this._statusService && error.name === "Cancel") { //$NON-NLS-0$
			if(DEBUG) {
				console.log("Crawling search cancelled. Deferred array length : " + this._deferredArray.length); //$NON-NLS-0$
			}
			this._statusService.setProgressResult({Message: this._cancelMessage, Severity: "Warning"}); //$NON-NLS-0$
		}
	};
		
	SearchCrawler.prototype._reportResult = function(){
		this._sort(this.fileLocations);
		var response = {numFound: this.fileLocations.length, docs: this.fileLocations };
		var result = {response: response};
		this._onSearchComplete(result);
		return result;
	};
		
	SearchCrawler.prototype._sortOnNameSingle = function(a, b){
		var	n1 = a.Name && a.Name.toLowerCase();
		var	n2 = b.Name && b.Name.toLowerCase();
		if (n1 < n2) { return -1; }
		if (n1 > n2) { return 1; }
		return 0;
	};
	
	SearchCrawler.prototype._fileNameMatches = function(fileName){
		var matches = true;
		if(this.searchHelper && this.searchHelper.params.fileNamePatterns){
			matches = this.searchHelper.params.fileNamePatterns.some(function(pattern){
				var regExpPattern = "^" + pattern.replace(/([*?])/g, ".$1") + "$"; // add line start, line end, and convert user input * and ? to .* and .? //$NON-NLS-0$
				return fileName.match(regExpPattern);
			});
		}
		return matches;
	};
	
	SearchCrawler.prototype._visitRecursively = function(directoryLocation){
		var results = [];
		var _this = this;
		if(this._fetchChildrenCallBack){
			this._fetchChildrenCallBack(directoryLocation);
		}
		return (_this._progressService ? this._progressService.progress(_this.fileClient.fetchChildren(directoryLocation), "Crawling search for children of " + directoryLocation) : _this.fileClient.fetchChildren(directoryLocation)).then(function(children) { //$NON-NLS-0$
			for (var i = 0; i < children.length ; i++){
				if(children[i].Directory !== undefined && children[i].Directory === false){
					if(_this._searchOnName){
						results.push(_this._buildSingleSkeleton(children[i]));
					} else if(_this._buildSkeletonOnly){
						results.push(_this._buildSingleSkeleton(children[i]));
					}else if(!_this._cancelled) {
						var contentType = mContentTypes.getFilenameContentType(children[i].Name, _this.contentTypesCache);
						var isBinary = (mContentTypes.isImage(contentType) || mContentTypes.isBinary(contentType));
						if(!isBinary && _this._fileNameMatches(children[i].Name)){
							var fileDeferred = _this._visitSingleFile(_this, children[i], contentType);
							results.push(fileDeferred);
							_this._deferredArray.push(fileDeferred);
						}
					}
				} else if (children[i].Location) {
					if(_this._cancelled) {
						break;
					} else if(_this._contains(_folderFilter, children[i].Name)) {
						continue;
					} else {
						var folderDeferred = _this._visitRecursively(children[i].ChildrenLocation);
						results.push(folderDeferred);
						_this._deferredArray.push(folderDeferred);
					}
				}
			}
			return Deferred.all(results);
		});
	};

	SearchCrawler.prototype._hitOnceWithinFile = function( fileContentText){
		var lineString = this._searchParams.caseSensitive ? fileContentText : fileContentText.toLowerCase();
		var result;
		if(this.searchHelper.inFileQuery.wildCard){
			result = mSearchUtils.searchOnelineRegEx(this.searchHelper.inFileQuery, lineString, true);
		} else {
			result = mSearchUtils.searchOnelineLiteral(this.searchHelper.inFileQuery, lineString, true);
		}
		return result;
	};

	SearchCrawler.prototype._cancelFileVisit = function(){
		this._cancelled = true;
		if(this._cancelled) {
			this._deferredArray.forEach(function(result) {
				result.cancel();
			});
		}
	};
	
	SearchCrawler.prototype._searchSingleFile = function(crawer, fileObj, contentType){
		this.addTotalCounter();
		var self = this;
		if(this._cancelled){
			return;
		}
		if(this.searchHelper.params.keyword === ""){
			this.incrementalReport(fileObj, true);
		} else {
			return (self._progressService ? self._progressService.progress(self.fileClient.read(fileObj.Location), "Reading file " + fileObj.Location) : self.fileClient.read(fileObj.Location)).then(function(jsonData) { //$NON-NLS-0$
					if(self._hitOnceWithinFile(jsonData)){
						self.incrementalReport(fileObj, true);
					}
				},
				function(error) {
					if(error && error.message && error.message.toLowerCase() !== "cancel") { //$NON-NLS-0$
						console.error("Error loading file content: " + error.message); //$NON-NLS-0$
					}
				}
			);
		}
	};
	
	SearchCrawler.prototype._buildSingleSkeleton = function(fileObj){
		this.addTotalCounter();
		this.fileSkeleton.push(fileObj);
		var df = new Deferred();
		df.resolve(this._totalCounter);
		return df;
	};
	
	SearchCrawler.prototype.constructor = SearchCrawler;
	
	//return module exports
	return {
		SearchCrawler: SearchCrawler
	};
});
