/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2019 IBM Corporation and others.
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
    'orion/webui/littlelib', 
    'orion/contentTypes', 
    'orion/i18nUtil', 
    'orion/explorers/explorer', 
    'orion/commands', 
    'orion/searchUtils', 
    'orion/compare/compareView', 
    'orion/highlight', 
    'orion/webui/tooltip', 
    'orion/explorers/navigatorRenderer', 
    'orion/extensionCommands',
    'orion/searchModel', 
    'orion/explorers/fileDetailRenderer',
	'orion/extensionCommands',
	'orion/objects',
    'orion/bidiUtils', 
    'orion/urlModifier',
    'orion/util'
], function(messages, Deferred, lib, mContentTypes, i18nUtil, mExplorer, mCommands, 
	mSearchUtils, mCompareView, mHighlight, mTooltip, 
	navigatorRenderer, extensionCommands, mSearchModel, mFileDetailRenderer,
	mExtensionCommands, objects, bidiUtils, urlModifier, util) {

	var isMac = window.navigator.platform.indexOf("Mac") !== -1; //$NON-NLS-0$
    /* Internal wrapper functions*/
    function _empty(nodeToEmpty) {
        var node = lib.node(nodeToEmpty);
        if (node) {
            lib.empty(node);
        }
        return node;
    }

    function _connect(nodeOrId, evnt, eventHandler) {
        var node = lib.node(nodeOrId);
        if (node) {
            node.addEventListener(evnt, eventHandler, false);
        }
    }

    function _place(ndoeToPlace, _parent, position) {
        var parentNode = lib.node(_parent);
        if (parentNode) {
            if (position === "only") {
                lib.empty(parentNode);
            }
            parentNode.appendChild(ndoeToPlace);
        }
    }

    function _createElement(elementTag, classNames, id, _parent) {
        var element = document.createElement(elementTag);
        if (classNames) {
            if (Array.isArray(classNames)) {
                for (var i = 0; i < classNames.length; i++) {
                    element.classList.add(classNames[i]);
                }
            } else if (typeof classNames === "string") {
                element.className = classNames;
            }
        }
        if (id) {
            element.id = id;
        }
        var parentNode = lib.node(_parent);
        if (parentNode) {
            parentNode.appendChild(element);
        }
        return element;
    }

    function _createSpan(classNames, id, _parent, spanName) {
        var span = _createElement('span', classNames, id, _parent); //$NON-NLS-1$
        if (spanName) {
            span.appendChild(document.createTextNode(spanName));
        }
        return span;
    }

    /*** Internal model wrapper functions ***/

    function _getFileModel(modelItem) {
        if (!modelItem) {
            return null;
        }
        if (modelItem.type === "file") {
            return modelItem;
        }
        return modelItem.logicalParent ? modelItem.logicalParent : modelItem.parent;
    }

    function _onSameFile(modelItem1, modelItem2) {
        return _getFileModel(modelItem1) === _getFileModel(modelItem2);
    }

    function _validFiles(searchModel) {
        if (typeof searchModel.getValidFileList === "function") {
            return searchModel.getValidFileList();
        }
        return searchModel.getListRoot().children;
    }

    function _headerString(searchModel) {
        if (typeof searchModel.getHeaderString === "function") {
            return searchModel.getHeaderString();
        }
        return messages["Results"]; //;
    }
    
    //Renderer to render the model
    function SearchResultRenderer(options, explorer) {
		mFileDetailRenderer.FileDetailRenderer.call(this, options, explorer);
    }
	SearchResultRenderer.prototype = Object.create(mFileDetailRenderer.FileDetailRenderer.prototype);
    
    /*
     * APIs that the subclass of fileDetailRenderer has to override
     */
    SearchResultRenderer.prototype.generateFileLink = function(resultModel, item) {
        var helper = null;
        if (resultModel._provideSearchHelper) {
            helper = resultModel._provideSearchHelper();
        }
		var params = helper ? mSearchUtils.generateFindURLBinding(helper.params, helper.inFileQuery, null, helper.params.replace, true) : null;
		var link = navigatorRenderer.createLink(null, 
				{Location: item.location}, 
				this.explorer._commandService, 
				this.explorer._contentTypeService,
				this.explorer._openWithCommands, 
				{id:this.getItemLinkId && this.getItemLinkId(item)}, 
				params, 
				{holderDom: this._lastFileIconDom});
		return link;
    };
    
	SearchResultRenderer.prototype.generateDetailDecorator = function(item, spanHolder) {
		if(typeof item.confidence === "number") {
			var icon = document.createElement("div"); //$NON-NLS-1$
			icon.classList.add("confidenceDecoratorImg"); //$NON-NLS-1$
			if(item.confidence >= 100) {
				icon.classList.add('confidenceHighImg'); //$NON-NLS-1$
				icon.classList.add("core-sprite-checkmark"); //$NON-NLS-1$
				icon.title = messages['perfectMatch'];
			} else if(item.confidence === 0) {
				icon.classList.add('confidenceLowImg'); //$NON-NLS-1$
				icon.classList.add("core-sprite-error"); //$NON-NLS-1$
				icon.title = messages['notAMatch'];
			} else {
				icon.classList.add('confidenceUnknownImg'); //$NON-NLS-1$
				icon.classList.add("core-sprite-questionmark"); //$NON-NLS-1$
				icon.title = messages['couldBeMatch'];
			}
			spanHolder.appendChild(icon);
		}
	};
	
	SearchResultRenderer.prototype._ctrlKeyOn = function(e){
		return isMac ? e.metaKey : e.ctrlKey;
	};
	
	SearchResultRenderer.prototype._createLink = function(modelItem, item, commandService, openWithCommands, linkProperties, helper) {
		// TODO FIXME folderPageURL is bad; need to use URITemplates here.
		// TODO FIXME refactor the async href calculation portion of this function into a separate function, for clients who do not want the <A> created.
		item = objects.clone(item);
		var link;
		var linkName = item.Name || '';
		if (!openWithCommands) {
			openWithCommands = mExtensionCommands.getOpenWithCommands(commandService);
		}
		link = document.createElement("a"); //$NON-NLS-0$
		link.tabIndex = -1;
		link.className= "navlink targetSelector"; //$NON-NLS-0$
		if (linkProperties && typeof linkProperties === "object") { //$NON-NLS-0$
			Object.keys(linkProperties).forEach(function(property) {
				link[property] = linkProperties[property];
			});
		}
		if(item.Name){
			link.appendChild(document.createTextNode(linkName));
		}
		link.href = "javascript:void(0)";
		link.addEventListener("click", function(evt) { //$NON-NLS-0$
			var href = item.Location;
			var uriParams; 
	        if(typeof modelItem.start === "number" && typeof modelItem.end === "number") {
	        	uriParams = {start: modelItem.start, end: modelItem.end};
	        } else {
				uriParams = helper ? mSearchUtils.generateFindURLBinding(helper.params, helper.inFileQuery, modelItem.lineNumber, helper.params.replace, true) : null;
			}
			if (uriParams && typeof uriParams === "object") { //$NON-NLS-0$
				item.params = {};
				objects.mixin(item.params, uriParams);
			}
			var openWithCommand = mExtensionCommands.getOpenWithCommand(commandService, item, openWithCommands);
			if (openWithCommand && typeof openWithCommand.hrefCallback === 'function') {
				href = openWithCommand.hrefCallback({items: item});
			}
			var navHandler = this.explorer.getNavHandler();
			if(navHandler) {
				navHandler.setSelection(modelItem);
			}
			if(this._ctrlKeyOn(evt)){
				window.open(urlModifier(href));
			} else {
				window.location.href = urlModifier(href);
			}
		}.bind(this), false);
		return link;
	};
        
    SearchResultRenderer.prototype.generateDetailLink = function(item) {
        var helper = null;
        if (this.explorer.model._provideSearchHelper) {
            helper = this.explorer.model._provideSearchHelper();
        }
		var loc = item.location;
		if(!loc) {
			loc = item.parent.location ? item.parent.location : '#';
		}
//      var params;
//      if(typeof item.start === "number" && typeof item.end === "number") {
//        	params = {start: item.start, end: item.end};
//      } else {
//			params = helper ? mSearchUtils.generateFindURLBinding(helper.params, helper.inFileQuery, item.lineNumber, helper.params.replace, true) : null;
//		}
//		var link = navigatorRenderer.createLink(null, 
//			{Location: loc/*, Name: name*/}, 
//			this.explorer._commandService, 
//			this.explorer._contentTypeService,
//			this.explorer._openWithCommands, 
//			{id:this.getItemLinkId(item)}, 
//			params, 
//			{});
		var link = this._createLink(item, 
			{Location: loc/*, Name: name*/}, 
			this.explorer._commandService, 
			this.explorer._openWithCommands, 
			{id:this.getItemLinkId(item)}, 
			helper);
		return link;
	};
	
    /*
     * End of APIs that the subclass of fileDetailRenderer has to override
     */

    SearchResultRenderer.prototype.replaceFileElement = function(item) {
		if(item.totalMatches) {
			var fileNameElement = this._getFileNameElement(item);
			var linkDiv = lib.node(this.getItemLinkId(item));
			if(linkDiv) {//In category mode, there is no file item rendered, so there is no linkDiv
				linkDiv.removeChild(linkDiv.lastElementChild);
				linkDiv.appendChild(fileNameElement);
			}
	    }    
	};

    SearchResultRenderer.prototype.replaceDetailIcon = function(item, direction) {
        if (this.enableCheckbox(item)) {
            return;
        }
        if (!item || item.type !== "detail") {
            return;
        }
        var iconSpan = lib.node(this.getDetailIconId(item));
        if (!iconSpan) {
            return;
        }
        _empty(iconSpan);
        var icon = _createSpan(null, null, iconSpan);
        icon.classList.add('imageSprite'); //$NON-NLS-1$
        if (direction === "right") {
            icon.classList.add('core-sprite-rightarrow'); //$NON-NLS-1$
        } else if (direction === "left") {
            icon.classList.add('core-sprite-leftarrow'); //$NON-NLS-1$
        } else {
            icon.classList.add('core-sprite-none'); //$NON-NLS-1$
        }
    };

    SearchResultRenderer.prototype.generateContextTip = function(detailModel) {
        var tableNode = _createElement('table'); //$NON-NLS-1$ //$NON-NLS-1$
        for (var i = 0; i < detailModel.context.length; i++) {
            var lineDiv = _createElement('tr', null, null, tableNode); //$NON-NLS-1$
            var lineTd;
            if (detailModel.context[i].current) {
                lineTd = _createElement('td', null, null, lineDiv); //$NON-NLS-1$
                lineTd.noWrap = true;
                var span = _createElement('span', null, null, lineTd); //$NON-NLS-1$ //$NON-NLS-1$
                this.generateDetailHighlight(detailModel, span);
            } else {
                lineTd = _createElement('td', null, null, lineDiv); //$NON-NLS-1$
                lineTd.noWrap = true;
                lineTd.textContent = detailModel.context[i].context + "\u00a0"; //$NON-NLS-1$
            }
        }
        return tableNode;
    };

    SearchResultRenderer.prototype.getDetailIconId = function(item) {
        return this.explorer.model.getId(item) + "_detailIcon"; //$NON-NLS-1$
    };

    function SearchReportRenderer(options, explorer) {
        this._init(options);
        this.options = options;
        this.explorer = explorer;
    }

    SearchReportRenderer.prototype = new mExplorer.SelectionRenderer();

    SearchReportRenderer.prototype.getCellHeaderElement = function(col_no) {
        var th;
        switch (col_no) {
            case 0:
                th = _createElement('th', "search_report", null, null); //$NON-NLS-1$ //$NON-NLS-1$ //$NON-NLS-2$
                th.textContent = messages["Files replaced"];
                break;
        }
        return th;
    };

    SearchReportRenderer.prototype.getCellElement = function(col_no, item, tableRow) {
    	var td = null;
        switch (col_no) {
            case 0:
                td = _createElement("td", "search_report", null, null); //$NON-NLS-1$ //$NON-NLS-1$ //$NON-NLS-2$
                
                var fileSpan = _createSpan(null, null, td, null);
                SearchResultRenderer.prototype.renderFileElement.call(this, item.model, fileSpan, this.explorer.resultModel);
                
                //render file location
                var scopeParams = this.explorer.resultModel.getScopingParams(item.model);
				tableRow.title = decodeURI(scopeParams.name + "/" + item.model.name);
                
                if (item.status) {
                	var statusMessage;
                	var linkNode = lib.$(".navlink", fileSpan); //$NON-NLS-1$
                	var operationIcon = document.createElement("span"); //$NON-NLS-1$
	                operationIcon.classList.add("imageSprite"); //$NON-NLS-1$
	                
                    switch (item.status) {
                        case "warning":
                            operationIcon.classList.add("core-sprite-warning"); //$NON-NLS-1$
                            statusMessage = item.message;
                            break;
                        case "failed":
                            operationIcon.classList.add("core-sprite-error"); //$NON-NLS-1$
                            statusMessage = item.message;
                            break;
                        case "pass":
                            operationIcon.classList.add("core-sprite-ok"); //$NON-NLS-1$
                            statusMessage = item.model.totalMatches ? i18nUtil.formatMessage(messages["matchesReplacedMsg"], item.matchesReplaced, item.model.totalMatches) : item.message;
                            break;
                    }
                    
                    linkNode.insertBefore(operationIcon, linkNode.firstElementChild);

                    var statusMessageSpan = _createElement("span", "replacementStatusSpan", null, linkNode); //$NON-NLS-1$ //$NON-NLS-1$ //$NON-NLS-2$
                    statusMessageSpan.appendChild(document.createTextNode("(" + statusMessage + ")"));
                }
        }
        return td;
    };
    
    SearchReportRenderer.prototype._getFileRenderName = function(item) {
    	return this.explorer.resultModel.getFileName(item);
    };

    SearchReportRenderer.prototype._getFileNameElement = function(item) {
    	return SearchResultRenderer.prototype._getFileNameElement.call(this, item);
    };

    SearchReportRenderer.prototype.generateFileLink = function(resultModel, item) {
    	return SearchResultRenderer.prototype.generateFileLink.call(this, resultModel, item);
    };

    SearchReportRenderer.prototype.constructor = SearchReportRenderer;

    function SearchReportExplorer(parentId, reportList, resultModel, commandService, contentTypeService, openWithCommands) {
        this.parentId = parentId;
        this.reportList = reportList;
        this.resultModel = resultModel;
        this._commandService = commandService;
        this._contentTypeService = contentTypeService;
        this._openWithCommands = openWithCommands;
        this.renderer = new SearchReportRenderer({
            checkbox: false
        }, this);
    }
    SearchReportExplorer.prototype = new mExplorer.Explorer();

    SearchReportExplorer.prototype.report = function() {
        this.createTree(this.parentId, new mExplorer.ExplorerFlatModel(null, null, this.reportList), {
            role: "grid",
            name: messages["Search Results"],
        });
    };

    SearchReportExplorer.prototype.constructor = SearchReportExplorer;

	function CompareStyler(registry){
		this._syntaxHighlither = new mHighlight.SyntaxHighlighter(registry);
	}	
	CompareStyler.prototype = {
		highlight: function(fileName, contentType, editor) {
			return this._syntaxHighlither.setup(contentType, editor.getTextView(), 
										 null, //passing an AnnotationModel allows the styler to use it to annotate tasks/comment folding/etc, but we do not really need this in compare editor
										 fileName,
										 false /*bug 378193*/);
		}
	};

    /**
     * Creates a new search result explorer.
     * @name orion.InlineSearchResultExplorer
     */
    function InlineSearchResultExplorer(registry, commandService, inlineSearchPane, preferences, fileClient, searcher) {
        this.registry = registry;
        this._commandService = commandService;
        this.fileClient = fileClient;
        this.defaulRows = 40;
		this._contentTypeService = new mContentTypes.ContentTypeRegistry(this.registry);
		this._inlineSearchPane = inlineSearchPane;
		this._preferences = preferences;
		this._searcher = searcher;
		this._replaceRenderer =  new SearchResultRenderer({
            checkbox: true,
            highlightSelection: false,
            getCheckedFunc: function(item) {
                return this.getItemChecked(item);
            }.bind(this),
            onCheckedFunc: function(rowId, checked, manually) {
                this.onRowChecked(rowId, checked, manually);
            }.bind(this)
        }, this);
        this.render = this._normalRenderer = new SearchResultRenderer({
            checkbox: false,
            highlightSelection: false
        }, this);
    	mFileDetailRenderer.getPrefs(this._preferences, "/inlineSearchPane", ["showFullPath", "viewByFile", "hidePerfectMatch", "hideNonMatch", "hidePossibleMatch"]).then(function(properties){ //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$ //$NON-NLS-5$ //$NON-NLS-6$
    		this._shouldShowFullPath = properties ? properties[0] : false;
    		this._viewByFile = properties ? properties[1] : false;
    		this._matchFilter = {};
    		this._matchFilter["hidePerfectMatch"] = {flag: properties ? properties[2] : false,
    												 filterFunc: function(confidence, hide) {
    												 	return !hide && confidence === 100;
    												 }};
    		this._matchFilter["hideNonMatch"] = {flag: properties ? properties[3] : false,
    												 filterFunc: function(confidence, hide) {
    												 	return !hide && confidence === 0;
    												 }};
    		this._matchFilter["hidePossibleMatch"] = {flag: properties ? properties[4] : false,
    												 filterFunc: function(confidence, hide) {
    												 	return !hide && confidence !== 100 && confidence !== 0;
    												 }};
    		this.declareCommands();
     	}.bind(this));
    }

    InlineSearchResultExplorer.prototype = new mExplorer.Explorer();

    /**
     * Clients can connect to this function to receive notification when the root item changes.
     * @param {Object} item
     */
    InlineSearchResultExplorer.prototype.onchange = function(/*item*/) {};

    InlineSearchResultExplorer.prototype.setResult = function(parentNode, model) {
        this.parentNode = parentNode;
        mFileDetailRenderer.showFullPath(this.parentNode, this._shouldShowFullPath);
        this.model = model;
        if (this.model.replaceMode()) {
            this._hasCheckedItems = true;
            this.checkbox = true;
            this.renderer = this._replaceRenderer;
        } else {
            this.checkbox = false;
            this.renderer = this._normalRenderer;
        }

        this._reporting = false;
        this._currentPreviewModel = null;
        this._currentReplacedContents = {
            contents: null
        };
        this._popUpContext = false;
        this._timer = null;
        this.compareView = null;
    };

    /* one-time setup of commands */
    InlineSearchResultExplorer.prototype.declareCommands = function() {
        var that = this;
        // page actions for search
		var switchViewCommand = new mCommands.Command({
			tooltip : messages["viewByTypesTooltip"],
			name: messages["viewByTypes"],
			imageClass : "problems-sprite-view-mode", //$NON-NLS-1$
            id: "orion.globalSearch.switchView", //$NON-NLS-1$
            groupId: "orion.searchGroup", //$NON-NLS-1$
			type: "switch", //$NON-NLS-1$
			checked: this._viewByFile,
			visibleWhen: function(/*item*/) {
				switchViewCommand.checked = this._viewByFile;
				switchViewCommand.name = this._viewByFile ? messages["viewByTypes"] : messages["viewByFiles"];
				switchViewCommand.tooltip = this._viewByFile ? messages["viewByTypesTooltip"] : messages["viewByFilesTooltip"];
				return this._cacheSearchResult && that.model;
			}.bind(this),
			callback : /* @callback */ function(data) {
				this.switchViewMode();
		}.bind(this)});
        var replaceAllCommand = new mCommands.Command({
            name: messages["Apply Changes"],
            tooltip: messages["Replace all selected matches"],
            id: "orion.globalSearch.replaceAll", //$NON-NLS-1$
            callback: function(/*data*/) {
                that.replaceAll();
            },
            visibleWhen: function(/*item*/) {
                return that.model && that.model.replaceMode() && !that._reporting && that._hasCheckedItems;
            }
        });
        
        var nextResultCommand = new mCommands.Command({
        	name: messages["Next result"],
            tooltip: messages["Next result"],
            imageClass: "core-sprite-move-down", //$NON-NLS-1$
            id: "orion.search.nextResult", //$NON-NLS-1$
            groupId: "orion.searchGroup", //$NON-NLS-1$
            visibleWhen: function(/*item*/) {
                return !that._reporting && that.getItemCount() > 0;
            },
            callback: function() {
                that.gotoNext(true, true);
            }
        });
        var prevResultCommand = new mCommands.Command({
        	name: messages["Previous result"],
            tooltip: messages["Previous result"],
            imageClass: "core-sprite-move-up", //$NON-NLS-1$
            id: "orion.search.prevResult", //$NON-NLS-1$
            groupId: "orion.searchGroup", //$NON-NLS-1$
            visibleWhen: function(/*item*/) {
                return !that._reporting && that.getItemCount() > 0;
            },
            callback: function() {
                that.gotoNext(false, true);
            }
        });
        
        var switchFullPathCommand = new mCommands.Command({
        	name: messages["fullPath"],
            tooltip: messages["switchFullPath"],
            imageClass : "sprite-switch-full-path", //$NON-NLS-1$
            id: "orion.search.switchFullPath", //$NON-NLS-1$
            groupId: "orion.searchGroup", //$NON-NLS-1$
            type: "switch", //$NON-NLS-1$
            checked: this._shouldShowFullPath,
            visibleWhen: function(/*item*/) {
            	if(that._cacheSearchResult) {
            		return that.getItemCount() > 0 && that._cacheSearchParams && that._cacheSearchParams.shape === "file";
            	}
                return that.getItemCount() > 0;
            },
            callback: function() {
                that.switchFullPath();
                //TODO toggle tooltip
            }
        });
        
		var togglePerfectMatchCommand = new mCommands.Command({
			tooltip: messages["showPerfectMatch"],
			imageClass: "core-sprite-checkmark", //$NON-NLS-1$
			extraClass: "togglePerfectMatch", //$NON-NLS-1$
            id: "orion.globalSearch.toggleMatch.perfect", //$NON-NLS-1$
            groupId: "orion.searchGroup", //$NON-NLS-1$
			type: "toggle", //$NON-NLS-1$
			visibleWhen: function(/*item*/) {
				if (!util.readSetting("showSearchFilters")) return false;
				var show = !this._matchFilter["hidePerfectMatch"].flag;
				togglePerfectMatchCommand.checked = show;
				togglePerfectMatchCommand.tooltip = show ? messages["hidePerfectMatch"] : messages["showPerfectMatch"];
				return this._cacheSearchResult && that.model;
			}.bind(this),
			callback : function(/*data*/) {
				this.filterMatch("hidePerfectMatch"); //$NON-NLS-1$
			}.bind(this)
		});

		var toggleNonMatchCommand = new mCommands.Command({
			tooltip : messages["showNonMatch"],
			imageClass : "core-sprite-error", //$NON-NLS-1$
			extraClass: "toggleNonMatch", //$NON-NLS-1$
            id: "orion.globalSearch.toggleMatch.non", //$NON-NLS-1$
            groupId: "orion.searchGroup", //$NON-NLS-1$
			type: "toggle", //$NON-NLS-1$
			visibleWhen: function(/*item*/) {
				if (!util.readSetting("showSearchFilters")) return false;
				var show = !this._matchFilter["hideNonMatch"].flag;
				toggleNonMatchCommand.checked = show;
				toggleNonMatchCommand.tooltip = show ? messages["hideNonMatch"] : messages["showNonMatch"];
				return this._cacheSearchResult && that.model;
			}.bind(this),
			callback : function(/*data*/) {
				this.filterMatch("hideNonMatch"); //$NON-NLS-1$
			}.bind(this)
		});

		var togglePossibleMatchCommand = new mCommands.Command({
			tooltip : messages["showPossibleMatch"],
			imageClass : "core-sprite-questionmark", //$NON-NLS-1$
			extraClass: "togglePossibleMatch", //$NON-NLS-1$
            id: "orion.globalSearch.toggleMatch.possible", //$NON-NLS-1$
            groupId: "orion.searchGroup", //$NON-NLS-1$
			type: "toggle", //$NON-NLS-1$
			visibleWhen: function(/*item*/) {
				if (!util.readSetting("showSearchFilters")) return false;
				var show = !this._matchFilter["hidePossibleMatch"].flag;
				togglePossibleMatchCommand.checked = show;
				togglePossibleMatchCommand.tooltip = show ? messages["hidePossibleMatch"] : messages["showPossibleMatch"];
				return this._cacheSearchResult && that.model;
			}.bind(this),
			callback : function(/*data*/) {
				this.filterMatch("hidePossibleMatch"); //$NON-NLS-1$
			}.bind(this)
		});

	    this._commandService.addCommand(switchViewCommand);
	    this._commandService.addCommand(togglePerfectMatchCommand);
	    this._commandService.addCommand(toggleNonMatchCommand);
	    this._commandService.addCommand(togglePossibleMatchCommand);
        this._commandService.addCommand(nextResultCommand);
        this._commandService.addCommand(prevResultCommand);
        this._commandService.addCommand(replaceAllCommand);
        this._commandService.addCommand(switchFullPathCommand);
        
        this._commandService.addCommandGroup("searchPageActions", "orion.searchActions.unlabeled", 200); //$NON-NLS-1$ //$NON-NLS-1$ //$NON-NLS-2$
        
        mExplorer.createExplorerCommands(this._commandService, function(item) {
			var emptyKeyword = false;
			if(that.model._provideSearchHelper && that.model._provideSearchHelper().params.keyword === ""){
				emptyKeyword = true;
			}
			return !item._reporting && !emptyKeyword;
        });
	    this._commandService.registerCommandContribution("searchPageActions", "orion.globalSearch.switchView", 0); //$NON-NLS-1$ //$NON-NLS-2$
	    this._commandService.registerCommandContribution("searchPageActions", "orion.globalSearch.toggleMatch.perfect", 1); //$NON-NLS-1$ //$NON-NLS-2$
	    this._commandService.registerCommandContribution("searchPageActions", "orion.globalSearch.toggleMatch.possible", 2); //$NON-NLS-1$ //$NON-NLS-2$
	    this._commandService.registerCommandContribution("searchPageActions", "orion.globalSearch.toggleMatch.non", 3); //$NON-NLS-1$ //$NON-NLS-2$
        this._commandService.registerCommandContribution("searchPageActionsRight", "orion.globalSearch.replaceAll", 11); //$NON-NLS-2$ //$NON-NLS-1$
        this._commandService.registerCommandContribution("searchPageActionsRight", "orion.explorer.expandAll", 12); //$NON-NLS-1$ //$NON-NLS-2$
        this._commandService.registerCommandContribution("searchPageActionsRight", "orion.explorer.collapseAll", 13); //$NON-NLS-1$ //$NON-NLS-2$
        this._commandService.registerCommandContribution("searchPageActionsRight", "orion.search.nextResult", 14); //$NON-NLS-1$ //$NON-NLS-2$
        this._commandService.registerCommandContribution("searchPageActionsRight", "orion.search.prevResult", 15); //$NON-NLS-1$ //$NON-NLS-2$
        this._commandService.registerCommandContribution("searchPageActionsRight", "orion.search.switchFullPath", 16); //$NON-NLS-1$ //$NON-NLS-2$
    };

    InlineSearchResultExplorer.prototype._fileExpanded = function(fileIndex, detailIndex) {
        var filItem = _validFiles(this.model)[fileIndex];
        if (detailIndex === null || detailIndex === undefined) {
            return {
                childrenNumber: 0,
                childDiv: lib.node(this.model.getId(filItem))
            };
        }
        if (filItem.children && filItem.children.length > 0) {
            if (detailIndex < 0) {
                detailIndex = filItem.children.length - 1;
            } else if (detailIndex >= filItem.children.length) {
                detailIndex = 0;
            }
            return {
                childrenNumber: filItem.children.length,
                childDiv: lib.node(this.model.getId(filItem.children[detailIndex]))
            };
        }
        return {
            childrenNumber: 0,
            childDiv: null
        };
    };

    InlineSearchResultExplorer.prototype.replaceAll = function() {
        var reportList = [];
        this._reporting = true;
        this.initCommands();
        this.reportStatus(messages["Writing files..."]);
		this.fileClient.freezeChangeEvents();
        this.model.writeReplacedContents(reportList).then(function(/*modellist*/) {
            _empty(this.getParentDivId());
            var reporter = new SearchReportExplorer(
            	this.getParentDivId(), 
            	reportList, 
            	this.model, 
            	this._commandService, 
            	this._contentTypeService, 
            	this._openWithCommands
            );
            reporter.report();
            this._inlineSearchPane.hideReplacePreview();
            this.reportStatus("");
            this.fileClient.thawChangeEvents();
        }.bind(this));
    };

    InlineSearchResultExplorer.prototype.toggleCompare = function(show) {
        this.replacePreview(false, show);
    };

    InlineSearchResultExplorer.prototype.replacePreview = function(init, comparing) {
        _empty(this.getParentDivId());
        if (comparing) {
            if (this.compareView) {
            	this.compareView.destroy();
            	this.compareView = null;
            }
            this._currentPreviewModel = null;
        } else {
            if (this.compareView) {
            	this.compareView.destroy();
            	this.compareView = null;
            }
            this._currentPreviewModel = null;
        }
        this.initCommands();
        if (init) {
            this.reportStatus(messages["Preparing preview..."]);
        }
        var that = this;
        this.createTree(this.getParentDivId(), this.model, {
            role: "treegrid",
            name: messages["Search Results"],
            selectionPolicy: "singleSelection", //$NON-NLS-1$
            indent: 0,
            setFocus: true,
            onCollapse: function(model) {
                that.onCollapse(model);
            }
        });

        if (init) {
            this.gotoCurrent(this.model.restoreLocationStatus ? this.model.restoreLocationStatus() : null);
            this.reportStatus("");
        } else {
            this.gotoCurrent(this.model.restoreLocationStatus ? this.model.restoreLocationStatus() : null);
        }
    };

    InlineSearchResultExplorer.prototype.getItemChecked = function(item) {
        if (item.checked === undefined) {
        	if(item.type === 'group' && (item.children.length === 0 || item.location === 'partial' || item.location === 'uncategorized')) {
        		item.checked = false;
        	} else if(item.parent && item.parent.type === 'group' && (item.parent.location === 'partial' || item.parent.location === 'uncategorized')) {
        		item.checked = false;
        	} else {
	            item.checked = true;
	        }
        }
        return item.checked;
    };

    InlineSearchResultExplorer.prototype._checkedItem = function() {
        var fileList = _validFiles(this.model);
        for (var i = 0; i < fileList.length; i++) {
            if (fileList[i].checked) {
                return true;
            }
            if (!fileList[i].children) {
                continue;
            }
            for (var j = 0; j < fileList[i].children.length; j++) {
                if (fileList[i].children[j].checked) {
                    return true;
                }
            }
        }
        return false;
    };

    InlineSearchResultExplorer.prototype.onRowChecked = function(rowId, checked, manually) {
        var hasCheckedItems;
        if (!rowId) {
            hasCheckedItems = checked;
            this.onItemChecked(this.model.getListRoot(), checked, manually);
        } else {
            var row = lib.node(rowId);
            if (row && row._item) {
                this.onItemChecked(row._item, checked, manually);
            }
            hasCheckedItems = this._checkedItem();
        }
        if (hasCheckedItems !== this._hasCheckedItems) {
            this._hasCheckedItems = hasCheckedItems;
            this.initCommands();
        }
    };

    InlineSearchResultExplorer.prototype.onNewContentChanged = function(fileItem) {
        if (fileItem === _getFileModel(this.getNavHandler().currentModel())) {
            this.buildPreview(true);
        }
    };

    InlineSearchResultExplorer.prototype.onItemChecked = function(item, checked, manually) {
        item.checked = checked;
        if (item.type === "file" || item.type === 'group' || item === this.model.getListRoot()) {
            if (item.children) {
                for (var i = 0; i < item.children.length; i++) {
                    var checkBox = lib.node(this.renderer.getCheckBoxId(this.model.getId(item.children[i])));
                    if (checkBox) {
                        this.renderer.onCheck(null, checkBox, checked, false);
                    } else {
                        item.children[i].checked = checked;
                    }
                }
            }
            if (item.type === "file" || item.type === 'group') {
                this.onNewContentChanged(item);
            }
        } else if (manually) {
            this.onNewContentChanged(item.parent);
        }
    };

    InlineSearchResultExplorer.prototype.buildPreview = function(updating) {
        if (_validFiles(this.model).length === 0) {
            return;
        }
        var fileItem = _getFileModel(this.getNavHandler().currentModel());
        this._currentPreviewModel = fileItem;
        this.model.provideFileContent(fileItem, function(fileItem) {
            if (this.model.onMatchNumberChanged) {
                this.model.onMatchNumberChanged(fileItem);
            }
			this.model.getReplacedFileContent(this._currentReplacedContents, updating, fileItem);
			var replacedContents = this._currentReplacedContents.contents;
			if(Array.isArray(replacedContents)){
				replacedContents = this._currentReplacedContents.contents.join(this._currentReplacedContents.lineDelim);
			}
            // Diff operations
            var fileName = this.model.getFileName(fileItem);
            var fType = this._contentTypeService.getFilenameContentType(fileName);
            var options = {
                readonly: true,
                hasConflicts: false,
                oldFile: {
                    Name: fileItem.location,
                    Type: fType,
                    Content: this.model.getFileContents(fileItem)
                },
                newFile: {
                    Name: fileItem.location,
                    Type: fType,
                    Content: replacedContents
                }
            };
            if (!this.compareView) {           	
				options.parentDivId = this._inlineSearchPane.getReplaceCompareDiv();
                this.compareView = new mCompareView.InlineCompareView(options);
                this.compareView.setOptions({highlighters: [new CompareStyler(this.registry)]});
                this.compareView.startup();
            } else {
                this.compareView.setOptions(options);
                this.compareView.refresh(true);
            }
            
            var titleDiv = this._inlineSearchPane.getReplaceCompareTitleDiv();
            lib.empty(titleDiv);
            titleDiv.appendChild(document.createTextNode(messages["Preview: "] + fileName));
            
           window.setTimeout(function() {
                this.renderer.focus();
            }.bind(this), 100);
        }.bind(this));
    };
    
    InlineSearchResultExplorer.prototype.caculateNextPage = function() {
        var pagingParams = this.model.getPagingParams();
        if (pagingParams.start + pagingParams.rows >= pagingParams.totalNumber) {
            return {
                start: pagingParams.start
            };
        }
        return {
            start: pagingParams.start + pagingParams.rows
        };
    };

    InlineSearchResultExplorer.prototype.caculatePrevPage = function() {
        var pagingParams = this.model.getPagingParams();
        var start = pagingParams.start - pagingParams.rows;
        if (start < 0) {
            start = 0;
        }
        return {
            start: start
        };
    };

    InlineSearchResultExplorer.prototype.initCommands = function() {
        var that = this;
       	this._commandService.destroy("searchPageActions"); //$NON-NLS-1$
        this._commandService.destroy("searchPageActionsRight"); //$NON-NLS-1$
        if(this._cacheSearchResult) {
	        this._commandService.renderCommands("searchPageActions", "searchPageActions", that, that, "tool"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-3$
	        this._commandService.renderCommands("searchPageActionsRight", "searchPageActionsRight", that, that, "tool"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-3$
        } else {
	        this._commandService.renderCommands("searchPageActionsRight", "searchPageActions", that, that, "tool"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-3$
        }
    };

    InlineSearchResultExplorer.prototype.reportStatus = function(message) {
        this.registry.getService("orion.page.message").setProgressMessage(message); //$NON-NLS-1$
    };

    InlineSearchResultExplorer.prototype.isExpanded = function(model) {
        return this.myTree.isExpanded(this.model.getId(model));
    };

    InlineSearchResultExplorer.prototype.popupContext = function(model) {
        if (this.contextTip) {
            this.contextTip.destroy();
            this.contextTip = null;
        }
        var modelLinkId = this.renderer.getDetailIconId(model);
        var tableNode = this.renderer.generateContextTip(model);
        var aroundNode = lib.node(modelLinkId);
        var orient = ["below", "right"]; //$NON-NLS-1$ //$NON-NLS-2$
        if (aroundNode) {
            var parentNode = this.myTree._parent;
            var parentRect = parentNode.getClientRects()[0];
            var rects = aroundNode.getClientRects();
            for (var i = 0, l = rects.length; i < l; i++) {
                var r = rects[i];
                if (r.bottom + 100 > parentRect.bottom) {
                    orient = ["above", "right"]; //$NON-NLS-1$ //$NON-NLS-2$
                    break;
                }
            }
        }
        this.contextTip = new mTooltip.Tooltip({
            node: aroundNode,
            showDelay: 0,
            trigger: "none", //$NON-NLS-1$
            position: orient
        });
        var toolTipContent = this.contextTip.contentContainer();
        toolTipContent.appendChild(tableNode);
        this.contextTip.show();
    };

    InlineSearchResultExplorer.prototype.closeContextTip = function(remainFlag) {
        if (!this.model.replaceMode()) {
            if (this.contextTip) {
                this.contextTip.destroy();
                this.contextTip = null;
            }
            if (!remainFlag) {
                this._popUpContext = false;
            }
            this.renderer.replaceDetailIcon(this.getNavHandler().currentModel(), "right"); //$NON-NLS-1$
        }
    };

    InlineSearchResultExplorer.prototype.onCollapse = function(model) {
        var curModel = this.getNavHandler().currentModel();
        if (!curModel) {
            return;
        }
        if (curModel.type === "detail") {
            var curFileModel = _getFileModel(model);
            if (curFileModel === model) {
                this.getNavHandler().cursorOn(model);
            }
        }
    };

    InlineSearchResultExplorer.prototype.onExpand = function(modelToExpand, childPosition/*, callback*/) {
        if (modelToExpand && modelToExpand.children && modelToExpand.children.length > 0 && typeof childPosition === "string") {
            var childIndex = 0;
            if (childPosition === "first") {
                childIndex = 0;
            } else if (childPosition === "last") {
                childIndex = modelToExpand.children.length - 1;
            } else {
                childIndex = JSON.parse(childPosition);
            }
            if (typeof childIndex === "string" || childIndex < 0 || childIndex >= modelToExpand.children.length) {
                childIndex = 0;
            }
            this.getNavHandler().cursorOn(modelToExpand.children[childIndex]);
        }
    };

    InlineSearchResultExplorer.prototype.forceExpandFunc = function(modelToExpand, childPosition, callback) {
        this.myTree.expand(modelToExpand, function() {
            this.onExpand(modelToExpand, childPosition, callback);
        }.bind(this));
        return null;
    };

    //Provide the key listening div.If not provided this._myTree._parent will be used.
    InlineSearchResultExplorer.prototype.keyEventListeningDiv = function(secondLevel) {
        return lib.node(this.getParentDivId(secondLevel));
    };

    InlineSearchResultExplorer.prototype.onFocus = function(_focus) {
        if (!_focus) {
            this.closeContextTip();
        }
    };

    InlineSearchResultExplorer.prototype.preventDefaultFunc = function(e, model) {
        if (!model) {
            return true;
        }
        if (!this.model.replaceMode() && !e.ctrlKey && model.type === "detail") {
            if (e.keyCode === 37 /*left*/ && this._popUpContext) {
                this.closeContextTip();
                e.preventDefault();
                return true;
            }
            if (e.keyCode === 39 /*right*/ && !this._popUpContext) {
                this._popUpContext = true;
                this.renderer.replaceDetailIcon(model, "left"); //$NON-NLS-1$
                this.popupContext(model);
                e.preventDefault();
                return true;
            }
        }
        return false;
    };

    InlineSearchResultExplorer.prototype.onReplaceCursorChanged = function(currentModel) {
    	if(currentModel && currentModel.type === "group") {
    		return;
    	}
    	this._inlineSearchPane.showReplacePreview();
        if (!_onSameFile(this._currentPreviewModel, currentModel)) {
            this.buildPreview();
        }
        if (this.compareView && ( currentModel.type === "detail" || currentModel.type === "orion.annotation.search.hit")) {
        	if(currentModel.checked) {//If the change is checked we highlight the pair of the diff
	        	// Figure out change index. Unchecked elements are 
	        	// removed from diffs and must therefore be skipped.
				var changeIndex = 0;
				var fileItem = _getFileModel(currentModel);
				if(fileItem && fileItem.children) {
					fileItem.children.some(function(element){
						if (this.model.getId(currentModel) === this.model.getId(element)) {
							return true;
						} else if (element.checked) {
							changeIndex++;
						}
						return false;
					}, this);
				    this.compareView.gotoDiff(changeIndex);
				}
			} else if (currentModel.lineNumber !== undefined) {//If the change is unchecked, scroll to the line and select the match
				var startIndex = currentModel.matches[currentModel.matchNumber - 1].startIndex;
				var endIndex = startIndex + currentModel.matches[currentModel.matchNumber - 1].length;
			    this.compareView.gotoLine(currentModel.lineNumber - 1, startIndex, endIndex);
			}
        }
    };

    InlineSearchResultExplorer.prototype.onCursorChanged = function(prevModel, currentModel) {
        this.renderer.replaceDetailIcon(prevModel, "none"); //$NON-NLS-1$
        if (this.model.storeLocationStatus) {
            this.model.storeLocationStatus(currentModel);
        }
        if (this.model.replaceMode()) {
			if (this._timer) {
				window.clearTimeout(this._timer);
			}			
            this._timer = window.setTimeout(function() {
            	this._timer = null;
                this.onReplaceCursorChanged(currentModel);
            }.bind(this), 200);
        } else if (currentModel && currentModel.type === "detail") {
            if (this._popUpContext) {
                this.popupContext(currentModel);
                this.renderer.replaceDetailIcon(currentModel, "left"); //$NON-NLS-1$
            } else {
                this.renderer.replaceDetailIcon(currentModel, "right"); //$NON-NLS-1$
            }
        } else {
            if (this._popUpContext) {
                this.closeContextTip(true);
            }
        }
    };
 
    InlineSearchResultExplorer.prototype._startUp = function() {
		var pagingParams = this.model.getPagingParams();
		if(this.model._provideSearchHelper){
			this._inlineSearchPane.newDocumentTitle = this.model._provideSearchHelper().displayedSearchTerm + " - " +  i18nUtil.formatMessage(messages["${0} matches"], pagingParams.totalNumber);//$NON-NLS-1$
			window.document.title = this._inlineSearchPane.newDocumentTitle;
		}
		if (pagingParams.numberOnPage === 0) {
			var message = messages["No matches"];
			if(this.model._provideSearchHelper){
				message = i18nUtil.formatMessage(messages["NoMatchFound"], bidiUtils.enforceTextDirWithUcc(this.model._provideSearchHelper().displayedSearchTerm));
			}
		    this.parentNode.textContent = "";
		    var textBold = _createElement('b', null, null, this.parentNode); //$NON-NLS-1$ //$NON-NLS-1$
		    _place(document.createTextNode(message), textBold, "only"); //$NON-NLS-1$
            this.reportStatus("");
		    return;
		} 
        var that = this;       
        this.model.buildResultModel();
        if (this.model.replaceMode()) {
            that.replacePreview(true, true);
        } else {
            this.initCommands();
            _empty(this.getParentDivId());
            this.createTree(this.getParentDivId(), this.model, {
                role: "treegrid",
                name: messages["Search Results"],
				selectionPolicy: "singleSelection", //$NON-NLS-1$
                indent: 0,
				getChildrenFunc: function(model) {return this.model.getFilteredChildren(model);}.bind(this),
				setFocus: true,
                onCollapse: function(model) {
                    that.onCollapse(model);
                }
            });
            this.gotoCurrent(this.model.restoreLocationStatus ? this.model.restoreLocationStatus() : null);
            this.reportStatus("");
        }
    };

    InlineSearchResultExplorer.prototype.startUp = function() {
        if(this._openWithCommands){
			this._startUp();
        } else {
			var openWithCommandsDeferred =  extensionCommands.createOpenWithCommands(this.registry, this._contentTypeService, this._commandService);
			Deferred.when(openWithCommandsDeferred, function(openWithCommands) {
					this._openWithCommands = openWithCommands;
					this._startUp();
				}.bind(this));
        }
    };

    InlineSearchResultExplorer.prototype._incrementalRender = function() {
        var that = this;
        this.model.buildResultModel();
        this.createTree(this.getParentDivId(), this.model, {
            role: "treegrid",
            name: messages["Search Results"],
            selectionPolicy: "singleSelection", //$NON-NLS-1$
            getChildrenFunc: function(model) {return this.model.getFilteredChildren(model);}.bind(this),
            indent: 0,
            setFocus: true,
            onCollapse: function(model) {
                that.onCollapse(model);
            }
        });
    };

    InlineSearchResultExplorer.prototype.incrementalRender = function() {
        if(this._openWithCommands){
			this._incrementalRender();
        } else {
			var openWithCommandsDeferred =  extensionCommands.createOpenWithCommands(this.registry, this._contentTypeService, this._commandService);
			Deferred.when(openWithCommandsDeferred, function(openWithCommands) {
					this._openWithCommands = openWithCommands;
					this._incrementalRender();
				}.bind(this));
        }
    };

    //provide to the expandAll/collapseAll commands
    InlineSearchResultExplorer.prototype.getItemCount = function() {
    	var count = 0;
    	if (this.model) {
    		count = this.model.getListRoot().children.length;
    	}
        return count;
    };

    InlineSearchResultExplorer.prototype.getParentDivId = function(/*secondLevel*/) {
    	return this.parentNode.id;
    };

    InlineSearchResultExplorer.prototype.gotoCurrent = function(cachedItem) {
        var modelToExpand = null;
        var detailIndex = "none"; //$NON-NLS-1$
        if (cachedItem) {
            modelToExpand = cachedItem.file;
            detailIndex = cachedItem.detail;
        } else {
            modelToExpand = this.getNavHandler().currentModel();
        }
        if(!modelToExpand){
			modelToExpand = _validFiles(this.model).length > 0 ? _validFiles(this.model)[0] : null;
        }
        this.getNavHandler().cursorOn(modelToExpand, true, null, true);
        if (modelToExpand && detailIndex && detailIndex !== "none") {
            this.myTree.expand(modelToExpand, function() {
                this.onExpand(modelToExpand, detailIndex);
            }.bind(this));
        }
    };

    InlineSearchResultExplorer.prototype.gotoNext = function(next, forceExpand) {
        if (_validFiles(this.model).length === 0) {
            return;
        }
        this.getNavHandler().iterate(next, forceExpand, true);
        
        // skip unchecked matches in replace mode
        if (this.model.replaceMode()) {
        	var currentModel = this.getNavHandler().currentModel();
        	while (currentModel && !currentModel.checked) {
        		this.getNavHandler().iterate(next, forceExpand, true);
        		currentModel = this.getNavHandler().currentModel();
        	}
        }
        
        // makes sure that the behaviour is consistent with actually clicking it
        var rowLinks = this.getRow(this.getNavHandler().currentModel()).getElementsByTagName("a");
        for (var i = 0; i < rowLinks.length; i++){
        	rowLinks[i].click();
        }
    };
    
    InlineSearchResultExplorer.prototype.switchFullPath = function() {
    	mFileDetailRenderer.togglePrefs(this._preferences, "/inlineSearchPane", ["showFullPath"]).then(function(properties){ //$NON-NLS-1$ //$NON-NLS-2$
    		this._shouldShowFullPath = properties ? properties[0] : false;
       		mFileDetailRenderer.showFullPath(this.parentNode, this._shouldShowFullPath);
     	}.bind(this));
    };

    InlineSearchResultExplorer.prototype.switchViewMode = function() {
	    	mFileDetailRenderer.togglePrefs(this._preferences, "/inlineSearchPane", ["viewByFile"]).then(function(properties){ //$NON-NLS-1$ //$NON-NLS-2$
	    		this._viewByFile = properties ? properties[0] : false;
	    		this.runSearch(this._cacheSearchParams, this._resultsNode, this._cacheSearchResult); 
	     	}.bind(this));
	};
	
    InlineSearchResultExplorer.prototype.filterMatch = function(prefName) {
	    	mFileDetailRenderer.togglePrefs(this._preferences, "/inlineSearchPane", [prefName]).then(function(properties){ //$NON-NLS-1$
	    		this._matchFilter[prefName].flag = properties ? properties[0] : false;
	    		this.runSearch(this._cacheSearchParams, this._resultsNode, this._cacheSearchResult); 
	     	}.bind(this));
	};
	
	InlineSearchResultExplorer.prototype._renderSearchResult = function(resultsNode, searchParams, searchResult, incremental) {
		var node = lib.node(resultsNode);
		lib.empty(node);
		node.focus();
		var that = this;
		var totalSearchResults = 0;
		if (searchResult.refResult) {
        	searchResult.refResult.forEach(function(file) {
        		totalSearchResults += file.totalMatches;
        	});
		}
		else {
			totalSearchResults = searchResult.length;
		}
        var searchModel = new mSearchModel.SearchResultModel(this.registry, this.fileClient, searchResult, totalSearchResults, searchParams, {
            onMatchNumberChanged: function(fileItem) {
                that.renderer.replaceFileElement(fileItem);
            },
            matchFilter: this._matchFilter
        });
		this.setResult(resultsNode, searchModel);
		if(incremental){
			this.incrementalRender();
		} else {
			this.startUp();
		}
		
		var resultTitleDiv = this._inlineSearchPane.getSearchResultsTitleDiv();
		lib.empty(resultTitleDiv);
		resultTitleDiv.appendChild(document.createTextNode(_headerString(this.model)));
	};

	/**
	 * Runs a search and displays the results under the given DOM node.
	 *
	 * @param {DOMNode} resultsNode Node under which results will be added.
	 * @param {Object} searchParams The search parameters to use for the search
	 * @param {Searcher} searcher
	 */
	InlineSearchResultExplorer.prototype._search = function(resultsNode, searchParams, searchResult) {
		lib.empty(resultsNode);
		if(searchResult) {
			this._resultsNode = resultsNode;
			this._cacheSearchParams = searchParams;
			this._cacheSearchParams.shape = this._viewByFile ? "file" : "group"; //$NON-NLS-1$ //$NON-NLS-2$
			this._cacheSearchResult = searchResult;
			this._renderSearchResult(resultsNode, this._cacheSearchParams, searchResult, searchParams.incremental);
			window.setTimeout(function() {
				this.expandAll(null, ["partial"]); //$NON-NLS-1$
			}.bind(this), 10);
			return new Deferred().resolve(searchResult);
		}
		this._cacheSearchResult = null;
		//If there is no search keyword defined, then we treat the search just as the scope change.
		if(typeof searchParams.keyword === "undefined"){
			return new Deferred().resolve([]);
		}
		this.registry.getService("orion.page.message").setProgressMessage(messages["Searching..."]); //$NON-NLS-1$
		var searchClient = this._searcher;
		return searchClient.search(searchParams).then(function(searchResult) {
			this.registry.getService("orion.page.message").setProgressMessage(""); //$NON-NLS-1$
			if(searchResult) {
				this._renderSearchResult(resultsNode, searchParams, searchResult);
			}
			return searchResult;
		}.bind(this), function(error) {
			var message = i18nUtil.formatMessage(messages["${0}. Try your search again."], error && error.error ? error.error : "Error"); //$NON-NLS-1$
			this.registry.getService("orion.page.message").setProgressResult({Message: message, Severity: "Error"}); //$NON-NLS-1$ //$NON-NLS-2$
		}.bind(this), function(jsonData, incremental) {
			this._renderSearchResult(resultsNode, searchParams, searchClient.convert(jsonData, searchParams), incremental);
			return searchResult;
		}.bind(this));
	};

	/**
	 * Performs the given query and generates the user interface 
	 * representation of the search results.
	 * @param {String} query The search query
	 * @param {String | DomNode} parentNode The parent node to display the results in
	 * @param {Searcher} searcher
	 */
	InlineSearchResultExplorer.prototype.runSearch = function(searchParams, parentNode, searchResult) {
		var _parent = lib.node(parentNode);
		return this._search(_parent, searchParams, searchResult);
	};

    InlineSearchResultExplorer.prototype.findFileNode = function(fileLocation) {
    	if(this.model) {
	    	return this.model.findFileNode(fileLocation).then(function(fileNode){
	    		return fileNode;
	    	});
    	}
		return new Deferred().resolve();
    };
    
    InlineSearchResultExplorer.prototype.constructor = InlineSearchResultExplorer;
    
    //return module exports
    return InlineSearchResultExplorer;
});
