/*******************************************************************************
 * @license Copyright (c) 2014, 2019 IBM Corporation and others. All rights
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
	'i18n!orion/search/nls/messages',
	'orion/i18nUtil',
	'orion/explorers/explorer',
	'orion/webui/littlelib',
	'orion/explorers/navigationUtils',
	'orion/objects',
	'orion/webui/tooltip',
	'orion/breadcrumbs',
	'orion/URITemplate',
	'orion/Deferred'
], function(messages, i18nUtil, mExplorer, lib, mNavUtils, objects, mTooltip, mBreadcrumbs, URITemplate, Deferred) {
	
	var uriTemplate = new URITemplate("#{,resource,params*}");
	var breadCrumbs = [];
	var tooltips = [];
	/* Internal wrapper functions*/
	function _connect(nodeOrId, event, eventHandler) {
		var node = lib.node(nodeOrId);
		if (node) {
			node.addEventListener(event, eventHandler, false);
		}
	}

	function _place(ndoeToPlace, parent, position) {
		var parentNode = lib.node(parent);
		if (parentNode) {
			if (position === "only") { //$NON-NLS-0$
				lib.empty(parentNode);
			}
			parentNode.appendChild(ndoeToPlace);
		}
	}

	function _createElement(elementTag, classNames, id, parent) {
		var element = document.createElement(elementTag);
		if (classNames) {
			if (Array.isArray(classNames)) {
				for (var i = 0; i < classNames.length; i++) {
					element.classList.add(classNames[i]);
				}
			} else if (typeof classNames === "string") { //$NON-NLS-0$
				element.className = classNames;
			}
		}
		if (id) {
			element.id = id;
		}
		var parentNode = lib.node(parent);
		if (parentNode) {
			parentNode.appendChild(element);
		}
		return element;
	}

	function _createSpan(classNames, id, parent, spanName) {
		var span = _createElement('span', classNames, id, parent); //$NON-NLS-0$
		if (spanName) {
			span.appendChild(document.createTextNode(spanName));
		}
		return span;
	}

	function getPrefs(preferences, prefName, properties) {
		return preferences.get(prefName).then(function(prefs) { //$NON-NLS-0$
			var returnVal = [];
			properties.forEach(function(property){
				var value = !!prefs[property];
				returnVal.push(value);
			});
			return new Deferred().resolve(returnVal);
		}, function(/*err*/){
			return new Deferred().resolve(false);
		});
	}
	
	function showFullPath(parentNode, show) {
		if (show) {
			tooltips.forEach(function(tooltip){
				tooltip.turnOff();
			});
			parentNode.classList.add("showFullPath"); //$NON-NLS-0$
		} else {
			tooltips.forEach(function(tooltip){
				tooltip.turnOn();
			});
			parentNode.classList.remove("showFullPath"); //$NON-NLS-0$
		}
	}

	function togglePrefs(preferences, prefName, properties) {
		return preferences.get(prefName).then(function(prefs) { //$NON-NLS-0$
			var returnVal = [];
			properties.forEach(function(property){
				var value = !prefs[property];
				prefs[property] = value;
				returnVal.push(value);
			});
			preferences.put(prefName, prefs);
			return new Deferred().resolve(returnVal);
		}, function(/*err*/){
			return new Deferred().resolve();
		});
	}
	
	function wrapDetailElement(item, spanHolder, link, explorer) {
		spanHolder.appendChild(link);
		link.classList.add("searchDetailLink"); //$NON-NLS-0$
	   
	   	mNavUtils.addNavGrid(explorer.getNavDict(), item, link);
	   	//trigger a click on the span when the link is clicked to set the selection cursor
//	   	_connect(link, "click", function() { //$NON-NLS-0$
//	   		spanHolder.click();
//		});
		var span = _createElement('span', null, null, link); //$NON-NLS-0$
		return span;
	}

	function FileDetailRenderer(options, explorer) {
		mExplorer.SelectionRenderer.call(this, options, explorer);
	}
	FileDetailRenderer.prototype = Object.create(mExplorer.SelectionRenderer.prototype);
	objects.mixin(FileDetailRenderer.prototype, {
		// Overrides Explorer.SelectionRenderer.prototype.renderRow
		renderRow: function(item, tableRow) {
			mExplorer.SelectionRenderer.prototype.renderRow.call(this, item, tableRow);
			if (item.type !== "file") { //$NON-NLS-0$
				tableRow.classList.add("searchDetailRow"); //$NON-NLS-0$
			}
		},
		focus: function() {
			var resultParentDiv = lib.node(this.explorer.getParentDivId());
			window.setTimeout(function() {
				resultParentDiv.focus();
			}, 10);
		},
		_getFileRenderName: function(item) {
			var renderName;
			if (item.totalMatches === 1) {
				renderName = this.explorer.model.getFileName(item) + " " + messages["singleMatch"]; //$NON-NLS-0$
			} else if (item.totalMatches > 1) {
				renderName = this.explorer.model.getFileName(item) + " (" + i18nUtil.formatMessage(messages["${0} matches"], item.totalMatches) + ")"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			} else if(item.type === 'file') {
				renderName = this.explorer.model.getFileName(item);
			} else if(item.type === 'group') {
				renderName = item.name;
			}
			return renderName;
		},
		_getFileNameElement: function(item) {
			var renderName = this._getFileRenderName(item);
			var fileSpan = document.createElement("span"); //$NON-NLS-0$
			fileSpan.classList.add("fileNameSpan"); //$NON-NLS-0$
			fileSpan.appendChild(document.createTextNode(renderName));
			return fileSpan;
		},
		/**
		 * @description Renders the name of the group in its span
		 * @function
		 * @param {Object} item The backing group item to render
		 * @param {DOMNode} spanHolder The DOM element to hold the rendered element
		 * @since 10.0
		 */
		renderGroupElement: function renderGroupElement(item, spanHolder) {
			var nameSpan = document.createElement("span"); //$NON-NLS-0$
			nameSpan.appendChild(document.createTextNode(item.name)); //$NON-NLS-0$
			nameSpan.classList.add("groupNameSpan"); //$NON-NLS-0$
			spanHolder.appendChild(nameSpan);
			var countSpan = document.createElement("span"); //$NON-NLS-0$
			var message = i18nUtil.formatMessage(messages["(${0})"], item.children.length);
			if(item.children.length === 1) {
				message = messages["singleMatch"];
			}
			countSpan.appendChild(document.createTextNode(message));
			countSpan.classList.add("groupCountSpan"); //$NON-NLS-0$
			spanHolder.appendChild(countSpan);
			spanHolder.classList.add("groupParentSpan"); //$NON-NLS-0$
		},
		renderFileElement: function(item, spanHolder, resultModel) {
			var link = this.generateFileLink(resultModel, item);
			mNavUtils.addNavGrid(this.explorer.getNavDict(), item, link);
			
			var scopeParams = resultModel.getScopingParams(item);
			var folders = decodeURIComponent(scopeParams.name).split("/"); //$NON-NLS-0$
			var parentFolder = folders.pop();
			
			if (0 < folders.length) {
				var fullPathSpan = document.createElement("span"); //$NON-NLS-0$
				fullPathSpan.classList.add("fullPathSpan"); //$NON-NLS-0$
				
				var fullPathText = folders.join("/"); //$NON-NLS-0$
				
				fullPathSpan.appendChild(document.createTextNode(fullPathText + "/")); //$NON-NLS-0$
				link.appendChild(fullPathSpan);
				
				var ellipsisSpan = document.createElement("span"); //$NON-NLS-0$
				ellipsisSpan.classList.add("ellipsisSpan"); //$NON-NLS-0$
				ellipsisSpan.appendChild(document.createTextNode(".../")); //$NON-NLS-0$
				link.appendChild(ellipsisSpan);
			}
					
			// create a direct parent folder span and prepend to link		
			var parentSpan = document.createElement("span"); //$NON-NLS-0$
			parentSpan.classList.add("fileParentSpan"); //$NON-NLS-0$
			parentSpan.appendChild(document.createTextNode(parentFolder + "/")); //$NON-NLS-0$
			link.appendChild(parentSpan);
					
			var fileSpan = this._getFileNameElement(item);
			link.appendChild(fileSpan);
	
			//trigger a click on the span when the link is clicked to set the selection cursor
//			link.addEventListener("click", function(){ //$NON-NLS-0$
//				spanHolder.click();
//			});
	
			// append link to parent span
			spanHolder.appendChild(link);
			spanHolder.classList.add("filePathSpan"); //$NON-NLS-0$
		},
		_generateDetailSegments: function(detailModel) {
			var detailInfo = this.explorer.model.getDetailInfo(detailModel);
			var segments = [];
			var lineString = detailInfo.lineString;
			if(detailModel.parent.type === 'group') {
				var end = detailModel.startIndex+detailModel.length;
				if(detailModel.startIndex > 0) {
					segments.push({name: lineString.substring(0, detailModel.startIndex), startIndex: 0, bold: false, highlight: false});
				}
				segments.push({
					name: lineString.substring(detailModel.startIndex, end), 
					startIndex: detailModel.startIndex, 
					bold: true, 
					highlight: false
				});
				if (end < lineString.length) {
					segments.push({name: lineString.substring(end), startIndex: end, bold: false, highlight: false});
				}
			} else {
				var startIndex = 0;
				for (var i = 0; i < detailInfo.matches.length; i++) {
					if (startIndex >= lineString.length) {
						break;
					}
					//if (this.enableCheckbox(detailModel))
					if (i !== detailInfo.matchNumber) {
						continue;
					}
					if (startIndex !== detailInfo.matches[i].startIndex) {
						segments.push({name: lineString.substring(startIndex, detailInfo.matches[i].startIndex), startIndex: startIndex, bold: false, highlight: false});
					}
					var  gap = detailInfo.matches[i].length;
					segments.push({name: lineString.substring(detailInfo.matches[i].startIndex, detailInfo.matches[i].startIndex + gap), startIndex: detailInfo.matches[i].startIndex, bold: true, highlight: false});
					startIndex = detailInfo.matches[i].startIndex + gap;
					//if (this.enableCheckbox(detailModel))
					break;
				}
				if (startIndex < lineString.length - 1) {
					segments.push({name: lineString.substring(startIndex), startIndex: startIndex, bold: false, highlight: false});
				}
			}
			return segments;
		},
		_mergesingleSegment: function(segments, range) {
			var newSegments = [];
			
			segments.forEach(function(segment) {
				var startIndex = segment.startIndex;
				var endIndex = segment.startIndex + segment.name.length;
				if(range.start > startIndex && range.end < endIndex){
					newSegments.push({name: segment.name.substring(0, range.start - startIndex), startIndex: segment.startIndex, bold: segment.bold, highlight: false});
					newSegments.push({name: segment.name.substring(range.start - startIndex, range.end - startIndex), startIndex: range.start, bold: segment.bold, highlight: true});
					newSegments.push({name: segment.name.substring(range.end - startIndex), startIndex: range.end, bold: segment.bold, highlight: false});
				} else if(range.start > startIndex && range.start < endIndex){
					newSegments.push({name: segment.name.substring(0, range.start - startIndex), startIndex: segment.startIndex, bold: segment.bold, highlight: false});
					newSegments.push({name: segment.name.substring(range.start - startIndex), startIndex: range.start, bold: segment.bold, highlight: true});
				} else if( startIndex >= range.start && endIndex <= range.end) {
					segment.highlight = true;
					newSegments.push(segment);
				} else if(range.end > startIndex && range.end < endIndex){
					newSegments.push({name: segment.name.substring(0, range.end - startIndex), startIndex: segment.startIndex, bold: segment.bold, highlight: true});
					newSegments.push({name: segment.name.substring(range.end - startIndex), startIndex: range.end, bold: segment.bold, highlight: false});
				} else {
					newSegments.push(segment);
				}
			}.bind(this));
			return newSegments;
		},
		_renderSegments: function(segments, parentSpan) {
			segments.forEach(function(segment) {
				if(segment.bold){
					var matchSegBold = _createElement('b', null, null, parentSpan); //$NON-NLS-0$
					if(segment.highlight) {
						matchSegBold.classList.add("search-filter-text");
					}
					_place(document.createTextNode(segment.name), matchSegBold, "only"); //$NON-NLS-0$				
				} else {
					var matchSpan = _createElement('span', null, null, parentSpan); //$NON-NLS-0$
					if(segment.highlight) {
						matchSpan.classList.add("search-filter-text");
					}
				   _place(document.createTextNode(segment.name), matchSpan, "only"); //$NON-NLS-0$
				}
			}.bind(this));
		},
		generateDetailHighlight: function(detailModel, parentSpan) {
			var segments = this._generateDetailSegments(detailModel);
			this._renderSegments(segments, parentSpan);
		},
		renderDetailElement: function(item, spanHolder) {
			this.generateDetailDecorator(item, spanHolder);
			var linkSpan = this.getDetailElement(item, spanHolder);
			this.generateDetailHighlight(item, linkSpan);
		},
		renderDetailLineNumber: function(item, spanHolder, showFile) {
			var detailInfo = this.explorer.model.getDetailInfo(item);
			var lineNumber = detailInfo.lineNumber + 1;
			var span = document.createElement("span"); //$NON-NLS-1$
			span.className = "fileLineSpan"; //$NON-NLS-1$
			if (showFile) {
				var loc = item.location;
				_place(document.createTextNode(loc.substring(loc.lastIndexOf('/') + 1) + "@"), span, "last"); //$NON-NLS-1$ //$NON-NLS-0$
			}
			if (!this.enableCheckbox(item) || detailInfo.matches.length <= 1) {
				_place(document.createTextNode(lineNumber), span, "last"); //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				var matchNumber = detailInfo.matchNumber + 1;
				_place(document.createTextNode(lineNumber + " (" + matchNumber + ")"), span, "last"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			}
			spanHolder.appendChild(span);
		},
		getDetailElement: function(item, spanHolder) {
			var link = this.generateDetailLink(item);
			return wrapDetailElement(item, spanHolder, link, this.explorer);
		},
		enableCheckbox: function(item) {
			return typeof this.explorer.model.enableCheckbox === "function" && this.explorer.model.enableCheckbox(item); //$NON-NLS-0$
		},
		generateDetailDecorator: function(/*item, col*/) {
		},
		getHeaderRowCount: function() {
			return 2;
		},
		getCellHeaderElement: function(col_no, row_no) {
			var labelText = "", colspan = 1, rowspan = 1, id, headers = "";
			if (row_no === 0) {
				switch (col_no) {
				case 0:
					labelText = messages["Resource"];
					id = "searchResultItemColumn";
					headers = "searchResultLineColumn searchResultLineDetails";
					colspan = 2;
					break;
				default:
					return null;
				}
			} else if (row_no === 1) {
				switch (col_no) {
				case 0:
					labelText = messages["Line"];
					id = "searchResultLineColumn";
					break;
				case 1:
					labelText = messages["Details"];
					id = "searchResultLineDetails";
					break;
				default:
					return null;
				}
			} else {
				return null;
			}
			var th = document.createElement("th"); //$NON-NLS-0$
			th.id = id;
			th.rowSpan = rowspan;
			th.colSpan = colspan;
			if (headers) {
				lib.setSafeAttribute(th, "headers", headers);
			}
			th.style.textAlign = "left";
			th.className = "visuallyhidden"; //$NON-NLS-0$
			th.style.paddingTop = th.style.paddingLeft = "4px"; //$NON-NLS-0$
			th.textContent = labelText;
			return th;
		},
		getCellElement: function(col_no, item, tableRow) {
			var col = null;
			var span;
			switch (col_no) {
				case 0:
					col = _createElement('td'); //$NON-NLS-0$
					if (item.type === "file") { //$NON-NLS-0$
						col.colSpan = 2;
						lib.setSafeAttribute(col, "headers", "searchResultItemColumn");
						if(typeof this.explorer.model.disableExpand === "function" && this.explorer.model.disableExpand(item)){ //$NON-NLS-0$
							//var decorateImage = _createSpan(null, null, col, null);
							//decorateImage.classList.add('imageSprite'); //$NON-NLS-0$
							//decorateImage.classList.add('core-sprite-file'); //$NON-NLS-0$
						} else {
							this.getExpandImage(tableRow, _createSpan(null, null, col, null)); //$NON-NLS-0$
						}
						span = _createSpan(null, this.getFileIconId ? this.getFileIconId(item) : null, col, null);					
						this._lastFileIconDom = span;
						span = _createSpan(null, this.getFileSpanId(item), col, null);
						this.renderFileElement(item, span, this.explorer.model);
						this.generateBreadCrumb(tableRow, this.generateFileMetaForBreadCrumb(item), this.explorer._shouldShowFullPath);
					} else if (item.type === "group") { //$NON-NLS-0$
						col.colSpan = 2;
						lib.setSafeAttribute(col, "headers", "searchResultItemColumn");
						this.getExpandImage(tableRow, _createSpan(null, null, col, null)); //$NON-NLS-0$
						span = _createSpan(null, null, col, null);
						this.renderGroupElement(item, span, this.explorer.model);
						this.generateBreadCrumb(tableRow, item.name);
					} else {
						lib.setSafeAttribute(col, "headers", "searchResultLineColumn");
						this.renderDetailLineNumber(item, col, item.parent.type === "group");
					}
					break;
				case 1: 
					if (item.type !== "file" && item.type !== "group") { //$NON-NLS-0$
						col = _createElement('td'); //$NON-NLS-0$
						lib.setSafeAttribute(col, "headers", "searchResultLineDetails");
	 					this.renderDetailElement(item, col);
					}
					break;
				case 20: //TODO fix look and feel, re-enable
					if (item.type === "file") { //$NON-NLS-0$
						col = _createElement('td'); //$NON-NLS-0$
						var button = _createElement("button", ["imageSprite", "core-sprite-delete", "dismissButton", "deleteSearchRowButton"], null, col); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						button.title = messages["Remove from search results"]; //$NON-NLS-0$
						button.addEventListener("click", function(){ //$NON-NLS-0$
						//TODO fix behavior in replace preview mode
							var model = this.explorer.model;
							model.removeChild(item.parent, item);
							this.explorer.getNavHandler().refreshModel(this.explorer.getNavDict(), model, model.children);
							this.explorer.getNavHandler().cursorOn(null, true);
							tableRow.parentNode.removeChild(tableRow);
							
							if (item.children) {
								item.children.forEach(function(child){
									var childRow = this.explorer.getRow(child);
									childRow.parentNode.removeChild(childRow);
								}, this);
							}
							
							//TODO update match count, maybe...
						}.bind(this));
					}
					break;
			}
			
			return col;
		},
		
		generateBreadCrumb: function(tableRow, metadata, shouldShowFullPath){
			if(typeof metadata === "string"){
				var groupNodeTooltip = new mTooltip.Tooltip({
					node: tableRow,
					text: metadata,
					position: ["below", "above", "right", "left"]
				});
				tooltips.push(groupNodeTooltip);
			}else{
				var fileNodeTooltip = new mTooltip.Tooltip({
					node: tableRow,
					position: ["below", "above", "right", "left"]
				});
				// Create breadcrumb for tooltip.
				var localBreadcrumbNode = document.createElement("div");
				var tipContainer = fileNodeTooltip.contentContainer();
				tipContainer.appendChild(localBreadcrumbNode);
				
				var makeHref = function(segment, folderLocation, folder) {
					segment.href = uriTemplate.expand({resource: folderLocation});
					if (folder) {
						if (metadata && metadata.Location === folder.Location) {
							segment.addEventListener("click", function() { //$NON-NLS-0$
								if (this.explorer.sidebarNavInputManager){
									this.explorer.sidebarNavInputManager.reveal(folder);
								}
							}.bind(this));
						}
					}
				}.bind(this);
				var breadcrumbUniquifier = "_explorer_";
				var breadcrumbOptions = {
					container: localBreadcrumbNode,
					resource: metadata,
					makeFinalHref: true,
					makeHref: makeHref,
					// This id should be unique regardless of editor views open.
					id: "breadcrumb" + metadata.Location + breadcrumbUniquifier
				};
				new mBreadcrumbs.BreadCrumbs(breadcrumbOptions);
				if(shouldShowFullPath){
					fileNodeTooltip.turnOff();
				}
				tooltips.push(fileNodeTooltip);
			}
		},
		
		generateFileMetaForBreadCrumb: function(item){
			var fileMeta = {
				Location: item.location,
				Name: item.name
			};
			var parentSegs = item.location.split("/");
			var parents = [];
	 		parentSegs.reduce(function(acc, curV, curI, array){
	 			if(curI !== array.length -1){
					var path = (acc ? acc : "/") +  curV + "/";
					if(curI > 2){ //skip "file" and "orionode" for breadcrumb segs
	 					parents.push({
			 				Name: curV,
			 				Location: path
			 			});
	 				}
	 				return path;
 				}
	 		});
	 		parents = parents.reverse().slice(0);
	 		fileMeta.Parents = parents;
	 		fileMeta.workspace = item.workspace;
	 		return fileMeta;
		},
		
		cleanBreadCrumbs: function(){
			if(tooltips){
				tooltips.forEach(function(tooltip){
					tooltip.destroy();
				});
				tooltips = [];
			}
		},
		
		//This is an optional function for explorerNavHandler. It provides the div with the "href" attribute.
		//The explorerNavHandler hooked up by the explorer will check if the href exist as the attribute and react on enter key press.
		getRowActionElement: function(tableRowId) {
			return lib.node(this.getItemLinkId(tableRowId));
		},
		getFileSpanId: function(item) {
			return this.explorer.model.getId(item) + "_fileSpan"; //$NON-NLS-0$
		},
		getFileIconId: function(item) {
			return this.explorer.model.getId(item) + "_fileIcon"; //$NON-NLS-0$
		},
		getItemLinkId: function(itemOrId) {
			if (typeof itemOrId === "string") { //$NON-NLS-0$
				return itemOrId + "_itemLink"; //$NON-NLS-0$
			}
			return this.explorer.model.getId(itemOrId) + "_itemLink"; //$NON-NLS-0$
		},
		getPrimColumnStyle: function(item) {
			if(item) {
				if(item.type === 'group') {
					return 'refs_primaryColumn'; //$NON-NLS-1$
				} else if(item.type === 'file') {
					return "search_primaryColumn"; //$NON-NLS-1$
				} 
			} 
			return  "search_primaryColumn_Details"; //$NON-NLS-0$
		},
		getSecondaryColumnStyle: function(i) {
			if (i === 2) {
				return "search_secondaryColumn_line"; //$NON-NLS-0$
			}
			return "search_secondaryColumn"; //$NON-NLS-0$
		}
	});
	
	return {
		FileDetailRenderer: FileDetailRenderer,
		togglePrefs: togglePrefs,
		getPrefs: getPrefs,
		showFullPath: showFullPath,
		wrapDetailElement: wrapDetailElement
	};

});
	
