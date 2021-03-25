/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define([
'i18n!orion/search/nls/messages', 
'orion/Deferred', 
'orion/i18nUtil', 
'orion/explorers/explorer', 
'orion/uiUtils', 
'orion/searchUtils',
'orion/objects'
], function(messages, Deferred, i18nUtil, mExplorer, mUiUtils, mSearchUtils, Objects) {

    /*
     *	The model to support the search result.
     */
    function SearchResultModel(serviceRegistry, fileClient, searchResult, totalNumber, searchParams, options) {
        this.registry = serviceRegistry;
        this.fileClient = fileClient;
        if(searchResult && searchResult.categories) {
        	this._fileList = searchResult.refResult;
        	this._categories = searchResult.categories;
        } else {
        	this._fileList = searchResult;
        }
        this._numberOnPage = this._fileList.length;
        this._totalNumber = totalNumber;
        this._shape = searchParams.shape ? searchParams.shape : 'file'; //$NON-NLS-1$
        this._listRoot = {
            isRoot: true,
            children: []
        };
        this._filteredRoot = {
            isRoot: true,
            children: []
        };
        this._filterText = null;
        this._indexedFileItems = [];
        this._location2ModelMap = [];
        this._lineDelimiter = ""; //$NON-NLS-0$
        this.onMatchNumberChanged = options.onMatchNumberChanged;
        this._matchFilter = options.matchFilter;
        this._searchHelper = mSearchUtils.generateSearchHelper(searchParams);
    }
    SearchResultModel.prototype = new mExplorer.ExplorerModel();
	
	Objects.mixin(SearchResultModel.prototype, {
		/**
		 * @description Returns the root element of the search result model
		 * @function
		 * @param {function} onItem The function to call back to for the root item
		 * @override
		 */
		getRoot: function getRoot(onItem) {
	        onItem(this.getListRoot());
	    },
	    
	    /**
    	 * @description Gets the children from the given parent and calls onComplete when done
    	 * @function
    	 * @param {Object} parentItem The parent search item
    	 * @param {function} onComplete The callback when the operation completes
    	 * @override
    	 */
    	getChildren: function getChidren(parentItem, onComplete) {
	        if (!parentItem) {
	            return;
	        }
	        if(parentItem.type === "file" && this._filterText) {
				if(parentItem.filteredChildren) {
					onComplete(parentItem.filteredChildren);
				} else {
					onComplete([]);
				}
				return;
	        }
	        if (parentItem.children) {
				onComplete(parentItem.children);
	        } else if (parentItem.type === "detail") { //$NON-NLS-0$
	            onComplete([]);
	        } else if (parentItem.type === "file" && parentItem.location) { //$NON-NLS-0$
	            if (this._searchHelper.params.keyword === "") {
	                return;
	            }
	            this.registry.getService("orion.page.progress"). progress(this.fileClient.read(parentItem.location), "Getting file contents " + parentItem.name).then( //$NON-NLS-1$ //$NON-NLS-2$
	
	            function(jsonData) {
	            	this._generateChildren(parentItem, jsonData);
	                onComplete(parentItem.children);
	            }.bind(this),
	            function(error) {
	            	this.registry.getService("orion.page.message").setProgressResult({Message: error.message, Severity: "Error"}); //$NON-NLS-1$ //$NON-NLS-2$
	                onComplete([]);
	            }.bind(this));
	        } else if(parentItem.type === 'group') {
	        	onComplete(parentItem.children);
	        } else {
	            onComplete([]);
	        }
	    },
	    /**
    	 * @description Returns the identifier of the given item
    	 * @function
    	 * @param {Object} item The tree item
    	 * @returns {String} TRhe identifier or undefined
    	 * @override
    	 */
    	getId: function getId(item) {
	        var result;
	        if (item === this.getListRoot()) {
	            result = this.rootId;
	        } else {
	            result = item.location;
	            // remove all non valid chars to make a dom id. 
	            result = result.replace(/[^\.\:\-\_0-9A-Za-z]/g, "");
	            if(typeof item.lineNumber === "number") {
	            	result = result + "-" + item.lineNumber;
	            }
	            if(typeof item.matchNumber === "number") {
	            	result = result + "-" + item.matchNumber;
	            }
//	            if(typeof item.start === "number") {
//	            	result = result + "-" + item.start;
//	            }
	        }
	        return result;
	    },
	    /**
    	 * @description If item expanding should be disabled
    	 * @function
    	 * @returns {boolean} If item expanding should be disabled
    	 * @callback
    	 * @override
    	 */
    	disableExpand: function disableExpand(item) {
			return this._provideSearchHelper().params.keyword === "";
		},
		/**
		 * @description If check boxes should be shown in the tree
		 * @function
		 * @returns {boolean} If check boxes should be shown
		 * @callback 
		 * @override
		 */
		enableCheckbox: function enableCheckbox(item) {
			return this.replaceMode();
		},
		/**
		 * @description Return the root model. Required function.
     	 * There should be three layers of the root model. Any model item in each layer must have a string property called type.
     	 * The top layer is the root model whose type is "root". It should have a property callded children which is an array object.
     	 * The middle layer is the files whose type is "file". It should have a property callded children which is an array object and a property called parent which points to the root model.
     	 * The bottom layer is the detail matches within a file, whose type is "detail". It should have a property called parent which points to the file item.
		 * @function
		 * @returns {Object} The list root
		 * @override
		 */
		getListRoot: function getListRoot() {
	        return this._filterText ? this._filteredRoot : this._listRoot;
	    },
	    /**
    	 * @description  build the model tree. Required function.
     	 * There should be three layers of the root model. Any model item in each layer must have a string property called type.
     	 * The top layer is the root model whose type is "root". It should have a property callded children which is an array object.
     	 * The middle layer is the files whose type is "file". It should have a property callded children which is an array object and a property called parent which points to the root model.
     	 * The bottom layer is the detail matches within a file, whose type is "detail". It should have a property called parent which points to the file item.
    	 * @function
    	 * @override
    	 */
    	buildResultModel: function buildResultModel() {
	        this._indexedFileItems = [];
	        this.getListRoot().children = [];
	        if(this._shape === 'group' && this._categories) {
				for (var prop in this._categories) {
					if(this._categories[prop] !== undefined && this._categories[prop] !== null){
		    			var categoryNode = { //$NON-NLS-1$
				    			parent: this.getListRoot(),
				    			type: 'group', //$NON-NLS-1$
				    			name: this._categories[prop].name,
				    			location: this._categories[prop].category,
				    			category: this._categories[prop].category,
				    			sort: this._categories[prop].sort,
				    			children: []
				    	};
						this.getListRoot().children.push(categoryNode);
					}
				}
 				this.getListRoot().children.sort(function(a, b) {
					return a.sort - b.sort;
				});
	        }
	        for (var i = 0, len = this._fileList.length; i < len; i++) {
	        	switch(this._shape) {
	        		case 'file': {
	        			this._buildFileResult(this._fileList[i]);
	        			break;
	        		}
	        		case 'group': {
	        			this._buildCategoryResult(this._fileList[i]);
	        			break;
	        		}
	        	}
	        }
	        if(this._shape === 'group' && this._categories) {
 				var filtered = this.getListRoot().children.filter(function(category) {
					return category.children.length > 0;
				});
				this.getListRoot().children = filtered;
				this.getListRoot().children.forEach(function(category){
					category.children.sort(function(a, b) {
						//There are rare cases that a match confidence is not assigned.
						var aC = typeof a.confidence === 'number' ? a.confidence : -1000;
						var bC = typeof b.confidence === 'number' ? b.confidence : -1000;
	 					if(aC === bC) {
	 						if(a.location === b.location) {
	 							return a.lineNumber - b.lineNumber;
	 						}
	 						return a.logicalParent.name - b.logicalParent.name;
	 					}
						return bC - aC;
					});
				});
	        }
	    },
	    /**
    	 * @description Builds the file-based search result model
    	 * @function
    	 * @private
    	 * @param {Object} result The current result
    	 * @since 10.0
    	 */
    	_buildFileResult: function _buildFileResult(result) {
    		var children = result.children;
	    	var fileNode = {
	                parent: this.getListRoot(),
	                type: "file", //$NON-NLS-0$
	                name: result.name,
	                children: children,
	                contents: result.contents,
	                location: result.location,
	                totalMatches: result.totalMatches,
	                workspace: result.workspace,
	                parentLocation: mUiUtils.path2FolderName(result.location, true),
	                fullPathName: mUiUtils.path2FolderName(result.path)
	            };
            if(children) {//If the children is already generated, we need convert it back to UI model.
            	var newChildren = [];
            	children.forEach(function(child) {
					for(var j = 0; j < child.matches.length; j++){
						var newMatch = child.matches[j];
	    				if(!this._filterOnMatch(newMatch)) {
	    					continue;
	    				}
						var matchNumber = j+1;
						newMatch.parent = fileNode;
						newMatch.matches = child.matches;
						newMatch.lineNumber = child.lineNumber;
						newMatch.matchNumber = matchNumber;
						newMatch.checked = newMatch.confidence === 100 ? true: false	;
						newMatch.type = "detail";
						newMatch.name = child.name;
						newMatch.location = fileNode.location;
//						var newMatch = {confidence: child.matches[j].confidence, parent: fileNode, matches: child.matches, lineNumber: child.lineNumber, matchNumber: matchNumber, 
//							checked: child.matches[j].confidence === 100 ? true: false, type: "detail", //$NON-NLS-1$
//							start: child.matches[j].start, end: child.matches[j].end, name: child.name, location: fileNode.location
//						};
						newChildren.push(newMatch);
					}
            	}.bind(this));
 				newChildren.sort(function(a, b) {
 					if(a.confidence === b.confidence) {
 						return a.lineNumber - b.lineNumber;
 					}
					return b.confidence - a.confidence;
				});
           	
            	fileNode.children = newChildren;
            }
            //this._location2ModelMap[fileNode.location] = fileNode;
            if(fileNode.children && fileNode.children.length > 0 || !children ) {
	            this.getListRoot().children.push(fileNode);
	            this._indexedFileItems.push(fileNode);
        	}
	    },
	    _match2Category: function _match2Category(match) {
			var hasOne = this.getListRoot().children[0];
			this.getListRoot().children.some(function(element){
				if (element.category === match.category) {
					hasOne = element;
					return true;
				}				
				return false;
			}, this);
	    	return hasOne;
	    },
	    _getLogicalFileNode: function _getLogicalFileNode(fileResult) {
			var hasOne = null;
			this._indexedFileItems.some(function(element){
				if (element.location === fileResult.location) {
					hasOne = element;
					return true;
				}				
				return false;
			}, this);
	    	if(!hasOne) {
	    		hasOne = {
	                //parent: this.getListRoot(),
	                type: "file", //$NON-NLS-0$
	                name: fileResult.name,
	                children: [],
	                contents: fileResult.contents,
	                location: fileResult.location,
	                totalMatches: fileResult.totalMatches,
	                parentLocation: mUiUtils.path2FolderName(fileResult.location, true),
	                fullPathName: mUiUtils.path2FolderName(fileResult.path)
	            };
	            this._indexedFileItems.push(hasOne);
	    	}
	    	return hasOne;
	    },
	    _generateChildren: function _generateChildren(fileNode, fileContents){
            mSearchUtils.searchWithinFile(this._searchHelper.inFileQuery, fileNode, fileContents, this.replaceMode(), this._searchHelper.params.caseSensitive, false, !this.replaceMode());
        	if(!this.replaceMode()) {
	        	var children = fileNode.children;
	        	var newChildren = [];
	        	children.forEach(function(child) {
					for(var j = 0; j < child.matches.length; j++){
	    				if(!this._filterOnMatch(child.matches[j])) {
	    					continue;
	    				}
						var matchNumber = j+1;
						var newMatch = {parent: fileNode, matches: child.matches, lineNumber: child.lineNumber, matchNumber: matchNumber, 
							type: "detail", //$NON-NLS-1$
							start: child.matches[j].start, end: child.matches[j].end, name: child.name, location: fileNode.location
						};
						newChildren.push(newMatch);
					}
	        	}.bind(this));
	            fileNode.children = newChildren;
        	}
            if (this.onMatchNumberChanged) {
                this.onMatchNumberChanged(fileNode);
            }
	    },
	    _findFileNode: function _findFileNode(fileLocation) {
	    	var fileNode;
	    	if(this._indexedFileItems) {
				this._indexedFileItems.some(function(element){
					if (decodeURIComponent(element.location) === fileLocation) {
						fileNode = element;
						return true;
					}				
					return false;
				});
	    	}
	    	if(fileNode && !fileNode.children) {
	            return this.fileClient.read(fileLocation).then(
		            function(jsonData) {
		            	this._generateChildren(fileNode, jsonData);
		                return new Deferred().resolve(fileNode);
		            }.bind(this),
		            function(error) {
		            	this.registry.getService("orion.page.message").setProgressResult({Message: error.message, Severity: "Error"}); //$NON-NLS-1$ //$NON-NLS-2$
		            }.bind(this));
	    	}
	    	return new Deferred().resolve(fileNode);
	    },
	    _filterOnMatch: function _filterOnMatch(match) {
	    	if(!this._matchFilter) {
	    		return true;
	    	}
			for (var prop in this._matchFilter) {
				if(this._matchFilter[prop].filterFunc(match.confidence, this._matchFilter[prop].flag)) {
					return true;
				}
			}
			return false;
	    },
	    _buildCategoryResult: function _buildCategoryResult(singleFileResult) {
    		var matchLines = singleFileResult.children;
    		if(matchLines) {
    			var logicalFileNode = this._getLogicalFileNode(singleFileResult);
	    		for(var i = 0, len = matchLines.length; i < len; i++) {
	    			var matchLine = matchLines[i];
	    			var matches = matchLine.matches;
	    			for (var j = 0, len2 = matches.length; j < len2; j++) {
	    				var match = matches[j];
	    				if(!this._filterOnMatch(match)) {
	    					continue;
	    				}
						var matchNumber = j+1;
	    				match.lineNumber = matchLine.lineNumber;
	    				match.matchNumber = matchNumber;
	    				match.matches = matches;
	    				match.checked = match.confidence === 100 ? true: false;
	    				if(matchLine.name) {
	    					match.lineString = matchLine.name;
	    					match.name = matchLine.name;
	    				} else {
	    					match.lineString = '';
	    					match.name = '';
	    				}
	    				if(singleFileResult.location) {
	    					match.location = singleFileResult.location;
	    				} else {
	    					match.location = '';
	    				}
	    				var categoryNode = this._match2Category(match);
	    				match.parent = categoryNode;
	    				categoryNode.children.push(match);
			    		match.logicalParent = logicalFileNode;
			    		logicalFileNode.children.push(match);
	    			}
	    		}
			}
	    },
	    /**
    	 * @description if replace mode is enabled
    	 * @function
    	 * @returns {boolean} If replace mode is enabled
    	 * @override
    	 */
    	replaceMode: function replaceMode() {
	        return typeof this._searchHelper.params.replace === "string"; //$NON-NLS-0$
	    },
	    /**
    	 * @description Get the paging paramerterss. Required function.
     	 * The return value is an object containing the following properties:
     	 * totalNumber: the total number of files in the model
     	 * start: the zero-based number of the starting number of the file in this page.
     	 * rows: max number of files per page.
     	 * numberOnPage: current file numbers on the page
    	 * @function
    	 * @returns {Object} The paging params
    	 */
    	getPagingParams: function getPagingParams() {
	        return {
	            totalNumber: this._totalNumber,
	            start: typeof this._searchHelper.params.start === "undefined" ? 0 : this._searchHelper.params.start,
	            rows: typeof this._searchHelper.params.rows === "undefined" ? this._totalNumber : this._searchHelper.params.rows,
	            numberOnPage: this._numberOnPage
	        };
	    },
	    /**
    	 * @description Get the scoping paramerters by a given model item. Required function.
     	 * This function is for customizing each link on the "Location" column. Each link represents an URL that can scope down the search.
     	 * @param {Object} modelItem The given model item.
     	 * The return value is an object containing the following properties:
     	 * name: String. The name of the link.
     	 * href: String. The href of the link.
     	 * tooltip: String. The tooltip of the link.
    	 * @function
    	 * @param {Object} modelItem The model item to collect scope params from
    	 * @returns {Object} The parameter object
    	 * @override
    	 */
    	getScopingParams: function getScopingParams(modelItem) {
	        var qParams = mSearchUtils.copySearchParams(this._searchHelper.params, true);
	        qParams.resource = modelItem.parentLocation;
	        qParams.start = 0;
	        var tooltip = i18nUtil.formatMessage(messages["Search again in this folder with \"${0}\""], this._searchHelper.displayedSearchTerm);
	        return {
	            name: modelItem.fullPathName,
	            tooltip: tooltip
	        };
	    },
	    /**
    	 * @description  Get the detail match infomation by a given model item. Required function.
     	 * This function is for matching the compare widget diff annotation when a detail match item is selected.
      	 * @param {Object} modelItem The given detail match model item.
     	 * The return value is an object containing the following properties:
     	 * lineString: String. The lline string of hte detail match.
     	 * lineNumber: Number. The zero-based line number of the detail match, in the file.
     	 * name: Number. The zero-based line number of the detail match, in the file.
     	 * matches: Array. All the matches on this line.  Each item of the array contains:
     	 *         startIndex: The zero-based offset of the match in the line. If line is "foo bar foo" and the match is "bar", then the offset is 4.
     	 *         length: The length of the match in characters.
     	 * matchNumber: Number. The zero-based match number in matches.
    	 * @function
    	 * @param modelItem
    	 * @returns {Object} The detail info for the given item
    	 * @override
    	 */
    	getDetailInfo: function getDetailInfo(modelItem) {
    		var lineString = modelItem.lineString ? modelItem.lineString : modelItem.name;
    		var matches = Array.isArray(modelItem.matches) ? modelItem.matches : modelItem.parent.children;
			return {lineString: lineString, lineNumber: modelItem.lineNumber-1, matches: matches, matchNumber: modelItem.matchNumber ? modelItem.matchNumber - 1 : 0};
	    },
	    /**
    	 * @description Returns the file name from the given item or undefined if one has not been set
    	 * @function
    	 * @param {Object} modelItem The model item
    	 * @returns {String} The file name from the item or undefined
    	 * @override
    	 */
    	getFileName: function getFileName(modelItem) {
			return modelItem.name;
	    },
	    /**
    	 * @description Get the file contents by a given file model. Async call. Required function.
    	 * @function
    	 * @param {Object} fileItem The file item
    	 * @param {function} onComplete The callback for when the operation completes
    	 * @override
    	 */
    	provideFileContent: function provideFileContent(fileItem, onComplete) {
			this._provideFileContent(fileItem).then(function() { onComplete(fileItem);});
	    },
	    /**
    	 * @description Get the file contents by a given file model. Sync call. Required function.
    	 * @function
    	 * @param {Object} fileItem The file item
    	 * @returns {String} The contents of the file
    	 * @override
    	 */
    	getFileContents: function getFileContents(fileItem) {
	        return fileItem.contents.join(this._lineDelimiter);
	    },
	    /**
	     * Get the replaced file contents by a given file model. Sync call. Required function.
     	 * @param {Object} newContentHolder The returned replaced file content holder. The content holder has to have a property called "contents". It can be either type of the below:
     	 *		   String type: the pure contents of the file
     	 *		   Array type: the lines of the file exclude the line delimeter. If an array type of contents is provided, the lineDelim property has to be defined. Otherwise "\n" is used.
     	 * @param {Boolean} updating The flag indicating if getting replaced file contets based on existing newContentHolder.contents. It can be ignored if over riding this function does not care the case below.
     	 *         The explorer basically caches the current file's replaced contents. If only check box is changed on the same file, the falg is set to true when call this fucntion.
     	 *         Lets say a file with 5000 lines has been changed only because one line is changed, then we do not have to replace the whole 5000 lines but only one line.
     	 * @param {Object} fileItem The file item that generates the replaced contents.
     	 * @override
	     */
	    getReplacedFileContent: function getReplacedFileContent(newContentHolder, updating, fileItem) {
			mSearchUtils.generateNewContents(updating, fileItem.contents, newContentHolder, fileItem, this._searchHelper.params.replace, this._searchHelper.inFileQuery.searchStrLength);
			newContentHolder.lineDelim = this._lineDelimiter;
	    },
	    /**
     	 * Write the replace file contents. Required function.
     	 * @param {Array} reportList The array of the report items.
     	 * Each item of the reportList contains the following properties
     	 * model: the file item
     	 * matchesReplaced: The number of matches that replaced in this file
     	 * status: "pass" or "failed"
     	 * message: Optional. The error message when writing fails.
	 	 * @returns {orion.Promise} A new promise. The returned promise is generally fulfilled to an <code>Array</code> whose elements
	 	 * writes all the new contetns by checking the checked flag on all details matches. A file with no checked flag on all detail matches should not be written a new replaced contents.
	 	 * @override
	 	*/
	    writeReplacedContents: function writeReplacedContents(reportList){
	        var promises = [];
			var validFileList = this.getValidFileList();
			validFileList.forEach(function(fileItem) {
				promises.push(this._writeOneFile(fileItem, reportList));
			}.bind(this));
			return Deferred.all(promises, function(error) { return {_error: error}; });
	    },
	    /**
    	 * @description  Return the string that describe the header of the file column. Optional. 
    	 * If not defined, "Results" is used.
    	 * @function
    	 * @returns {String} The deaer string
    	 * @override
    	 */
    	getHeaderString: function getHeaderString() {
    		if(this._shape === 'group') {
    			//# references to <str> in <project_name>|<workspace>
    			var total = 0;
    			for(var i = 0, len = this._fileList.length; i < len; i++) {
    				var matches = this._fileList[i].totalMatches;
    				if(typeof(matches) === 'number') {
	    				total += matches;
					}
    			}
    			var res = this._searchHelper.params.resource;
    			if(res && res !== '/file') {
    				res = res.replace(/\/$/g, '');
    				var idx = res.lastIndexOf('/');
    				if(idx > -1) {
    					res = res.substring(idx+1);
    				}
    				return i18nUtil.formatMessage(messages['refsInProject'], {0: total, 1: this._searchHelper.displayedSearchTerm, 2: decodeURIComponent(res)});
    			}
    			return i18nUtil.formatMessage(messages['refsInWorkspace'], {0: total, 1: this._searchHelper.displayedSearchTerm});
    		}
	        var headerStr = messages["Results"]; //$NON-NLS-0$
	        if (this._searchHelper.displayedSearchTerm) {
	            var pagingParams = this.getPagingParams();
	            if (pagingParams.numberOnPage > 0) {
	                var startNumber = pagingParams.start + 1;
	                var endNumber = startNumber + pagingParams.numberOnPage - 1;
	                headerStr = "";
	                if (!this.replaceMode()) {
	                    headerStr = i18nUtil.formatMessage(messages["FilesAofBmatchingC"],
	                    startNumber + "-" + endNumber, pagingParams.totalNumber, this._searchHelper.displayedSearchTerm); //$NON-NLS-0$
	                } else {
	                    headerStr = i18nUtil.formatMessage(messages["ReplaceAwithBforCofD"],
	                    this._searchHelper.displayedSearchTerm,
	                    this._searchHelper.params.replace,
	                    startNumber + "-" + endNumber, //$NON-NLS-0$
	                    pagingParams.totalNumber);
	                }
	            }
	        }
	        return headerStr;
 	    },
	    /**
    	 * @description The function to return the list of valid files. Optional.
     	 * If not defined, this.getListRoot().children is used.
     	 * For example, if staled files appear in the children of the root model, theses files have to be filtered out so that the valid file list will exclude them.
    	 * @function
    	 * @returns {Array.<Object>} The file listing
    	 * @override
    	 */
    	getValidFileList: function getValidFileList() {
	        return this._indexedFileItems;
	    },
	    /**
    	 * @description Set the list of valid files. Optional.
    	 * @function
    	 * @param {Array.<Object>} validList The file list to set
    	 * @override
    	 */
    	setValidFileList: function setValidFileList(validList) {
	        this._indexedFileItems = validList;
	    },
	    /**
    	 * @description Fileter the list with the given text. Optional.
    	 * @function
    	 * @param {String} filterText The filter text
    	 * @override
    	 */
    	filterOn: function filterOn(filterText) {
			this._filterText = filterText;
			if(this._filterText) {
				var keyword = this._filterText.toLowerCase();
				this._filteredRoot.children = [];
				this._indexedFileItems.forEach(function(fileItem) {
					var hitFlag = false;
					if(this._filterSingleString(fileItem.name, keyword) || this._filterSingleString(fileItem.fullPathName, keyword)){
						hitFlag = true;
					} 
					if( fileItem.children){
						fileItem.filteredChildren = [];
						fileItem.children.forEach(function(detailItem) {
						    if (this._filterSingleString(detailItem.name, keyword)) {
						        fileItem.filteredChildren.push(detailItem);
						        hitFlag = true;
						    }
						}.bind(this));
					}
					if(hitFlag) {
						this._filteredRoot.children.push(fileItem);
					}
				}.bind(this));
			}
	    },
	    /**
    	 * @description Get the list of filtered children from the model
    	 * @function
    	 * @param {SearchResultModel} model The backing model
    	 * @returns {Array.<Object>} The filtered list of children
    	 * @override
    	 */
    	getFilteredChildren: function getFilteredChildren(model) {
	        if(model.type === "file" && this._filterText && model.filteredChildren) {
				return model.filteredChildren;
	        } else if(model.isRoot && this._filterText) {
				return this._filteredRoot.children;
	        }
	        return model.children;
	    },
	    /**
    	 * @description description
    	 * @function
    	 * @private
    	 * @param {String} loc The location to fetch from the map
    	 * @returns {Object|null} The mapped object or null
    	 */
    	_location2Model: function _location2Model(loc) {
	        if (loc && this._location2ModelMap[loc]) {
	            return this._location2ModelMap[loc];
	        }
	        if (this._indexedFileItems.length > 0) {
	            return this._indexedFileItems[0];
	        }
	        return null;
	    }
	});

    SearchResultModel.prototype._provideFileContent = function(fileItem) {
        if (fileItem.contents) {
            return new Deferred().resolve(fileItem);
        }
        return this.registry.getService("orion.page.progress").progress(this.fileClient.read(fileItem.location), "Getting file contents " + fileItem.Name).then( //$NON-NLS-1$ //$NON-NLS-2$

        function(jsonData) {
            mSearchUtils.searchWithinFile(this._searchHelper.inFileQuery, fileItem, jsonData, this.replaceMode(), this._searchHelper.params.caseSensitive);
            return fileItem;
        }.bind(this),

        function(error) {
            this.registry.getService("orion.page.message").setProgressResult({Message: error.message, Severity: "Error"}); //$NON-NLS-1$ //$NON-NLS-2$
            return fileItem;
        }.bind(this));
    };    

    /*** Internal model functions ***/

    SearchResultModel.prototype._provideSearchHelper = function() {
        return this._searchHelper;
    };

    SearchResultModel.prototype._filterSingleString = function(stringToFilter, keyword) {
        var lowerCaseStr = stringToFilter.toLowerCase();
        return lowerCaseStr.indexOf(keyword) >= 0;
    };

    SearchResultModel.prototype._model2Index = function(model, list) {
        var lookAt = list;
        if (!lookAt && model.parent) {
            lookAt = model.parent.children;
        }
        if (lookAt) {
            for (var i = 0; i < lookAt.length; i++) {
                if (lookAt[i] === model) {
                    return i;
                }
            }
        }
        return -1;
    };

    SearchResultModel.prototype._restoreGlobalStatus = function() {
        this.defaultReplaceStr = this._searchHelper.displayedSearchTerm;
        var defaultReplaceStr = window.sessionStorage["global_search_default_replace_string"]; //$NON-NLS-0$
        if (typeof defaultReplaceStr === "string") { //$NON-NLS-0$
            if (defaultReplaceStr.length > 0) {
                this.defaultReplaceStr = defaultReplaceStr;
            }
        }
        this.sortByName = this._provideSearchHelper().params.sort.indexOf("Name") > -1; //$NON-NLS-0$
    };

    SearchResultModel.prototype._storeGlobalStatus = function(replacingStr) {
        window.sessionStorage["global_search_default_replace_string"] = replacingStr; //$NON-NLS-0$
    };

    SearchResultModel.prototype._writeOneFile = function(fileItem, reportList) {
       var matchesReplaced = this._matchesReplaced(fileItem);
       if (matchesReplaced > 0) {
           return this._provideFileContent(fileItem).then(function() {
			   matchesReplaced = this._matchesReplaced(fileItem);
               var newContents = {};
               mSearchUtils.generateNewContents(false, fileItem.contents, newContents, fileItem, this._searchHelper.params.replace, this._searchHelper.inFileQuery.searchStrLength);
               var contents = newContents.contents.join(this._lineDelimiter);
               var etag = fileItem.ETag;
               var args = etag ? {
                   "ETag": etag //$NON-NLS-0$
               } : null;
               return this.registry.getService("orion.page.progress").progress(this.fileClient.write(fileItem.location, contents, args), "Saving changes to " + fileItem.location).then( //$NON-NLS-1$ //$NON-NLS-2$
               /* @callback */ function(result) {
                   reportList.push({
                       model: fileItem,
                       matchesReplaced: matchesReplaced,
                       status: "pass" //$NON-NLS-0$
                   });
               }.bind(this),

               function(error) {
                   // expected error - HTTP 412 Precondition Failed 
                   // occurs when file is out of sync with the server
                   if (error.status === 412) {
                       reportList.push({
                           model: fileItem,
                           message: messages["ResourceChanged."],
                           matchesReplaced: matchesReplaced,
                           status: "failed" //$NON-NLS-0$
                       });
                   }
                   // unknown error
                   else {
                       error.log = true;
                       reportList.push({
                           model: fileItem,
                           message: messages["Failed to write file."],
                           matchesReplaced: matchesReplaced,
                           status: "failed" //$NON-NLS-0$
                       });
                   }
               }.bind(this));
           }.bind(this));
       }
       return new Deferred().resolve(fileItem);
	};    
   
    SearchResultModel.prototype._matchesReplaced = function(model) {
        var matchesReplaced = 0;
        if (!model.children) {
            return model.checked === false ? 0 : 1;
        }
        if (model.children) {
            for (var j = 0; j < model.children.length; j++) {
                if (model.children[j].checked !== false) {
                    matchesReplaced += 1;
                }
            }
        }
        return matchesReplaced;
    };
    
    SearchResultModel.prototype.removeChild = function(model, item) {
        var index = model.children.indexOf(item);
        if (-1 < index) {
        	model.children.splice(index, 1);
        	item.stale = true;
        }
    };

    SearchResultModel.prototype.findFileNode = function(fileLocation) {
    	return this._findFileNode(fileLocation).then(function(fileNode){
    		return fileNode;
    	});
    };

    SearchResultModel.prototype.constructor = SearchResultModel;

    //return module exports
    return {
        SearchResultModel: SearchResultModel
    };
});
