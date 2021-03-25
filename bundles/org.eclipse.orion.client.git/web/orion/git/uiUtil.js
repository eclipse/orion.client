/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/

/**
 * This class extends orion/git/util to provide UI-related utility methods.
 */
define([
	'i18n!git/nls/gitmessages',
	'orion/webui/tooltip',
	'orion/compare/compareCommands',
	'orion/compare/resourceComparer',
	'orion/webui/littlelib',
	'orion/bidiUtils',
	'orion/git/util'
], function(messages, Tooltip, mCompareCommands, mResourceComparer, lib, bidiUtils, mGitUtil) {
	var exports = Object.create(mGitUtil); // extend util

	function createFilter(section, msgKey, callback) {
		var filterDiv = document.createElement("div"); //$NON-NLS-0$
		filterDiv.className = "gitFilterBox"; //$NON-NLS-0$
		
		var id = lib.validId(msgKey);
		var label = document.createElement("label");
		label.textContent = messages["Filter:"];
		lib.setSafeAttribute(label, "for", id);
		filterDiv.appendChild(label);

		var msg = messages[msgKey];
		var filter = document.createElement("input"); //$NON-NLS-0$
		filter.id = id;
		filter.type = "search"; //$NON-NLS-1$
		filter.placeholder = msg;
		bidiUtils.initInputField(filter);
		filterDiv.appendChild(filter);
		
		var createTooltip = function(button) {
			return button.tooltip = new Tooltip.Tooltip({
				node: button,
				text: msg,
				position: ["above", "below", "right", "left"] //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$
			});
		};
		
		var button = document.createElement("button"); //$NON-NLS-0$
		lib.setSafeAttribute(button, "aria-label", messages["Filter"]);
		button.className = "core-sprite-filter searchButton"; //$NON-NLS-0$
		var commandTooltip = createTooltip(button);
		filterDiv.appendChild(button);
			
		var doFilter = function() {
			callback(filter.value);
			if (filter.value) {
				button.classList.remove("core-sprite-filter"); //$NON-NLS-0$
				button.classList.add("core-sprite-show-filtered"); //$NON-NLS-0$
			} else {
				button.classList.remove("core-sprite-show-filtered"); //$NON-NLS-0$
				button.classList.add("core-sprite-filter"); //$NON-NLS-0$
			}
		};
		
		var clickFilter = function() {
			doFilter();
		};
		button.addEventListener("click", clickFilter); //$NON-NLS-0$
		filter.addEventListener ("search", clickFilter, false);
		
		var sectionContent = section.getContentElement();
		sectionContent.insertBefore(filterDiv, sectionContent.firstChild);
		
		var keyDownFilter  = function(e) {
			if (e.keyCode === 13) {
				doFilter();
			}
		};
		filter.addEventListener("keydown", keyDownFilter); //$NON-NLS-0$
		
		return {
			filter: filter,
			button: button,
			commandTooltip: commandTooltip,
			clickFilter: clickFilter,
			keyDownFilter: keyDownFilter,
			
			destroy: function() {
				this.commandTooltip.destroy();
				this.button.removeEventListener("click", this.clickFilter);
				this.filter.removeEventListener("search", this.clickFilter);
				this.filter.removeEventListener("keydown", this.keyDownFilter);
			}
		};
	}
	exports.createFilter = createFilter;

	/**
	 * Create an embedded toggleable compare widget inside a given DIV.
	 * @param {Object} serviceRegistry The serviceRegistry.
	 * @param {Object} commandService The commandService.
	 * @param {String} resoure The URL string of the complex URL which will be resolved by a diff provider into two file URLs and the unified diff.
	 * @param {Boolean} hasConflicts The flag to indicate if the compare contains conflicts.
	 * @param {Object} parentDivId The DIV node or string id of the DIV that holds the compare widget.
	 * @param {String} commandSpanId The id of the DIV where all the commands of the compare view are rendered. "Open in compare page", "toggle", "navigate diff" commands will be rendered.
	 * @param {Boolean} editableInComparePage The flag to indicate if opening compage will be editable on the left side. Default is false. Optional.
	 * @param {Object} gridRenderer If all the commands have to be rendered as grids, especially inside a row of Orion explorer, this has to be provided. Optional.
	 * @param {String} compareTo Optional. If the resource parameter is a simple file URL then this can be used as the second file URI to compare with.
	 * @param {String} toggleCommandSpanId Optional. The id of the DIV where the "toggle" command will be rendered. If this parameter is defined, the "toggle" command will ONLY be rendered in this DIV.
	 */
	function createCompareWidget(serviceRegistry, commandService, resource, hasConflicts, parentDivId, commandSpanId, editableInComparePage, gridRenderer, compareTo, toggleCommandSpanId, 
								 preferencesService, saveCmdContainerId, saveCmdId, titleIds, containerModel, standAloneOptions) {
		var setCompareSelection = function(diffProvider, cmdProvider, ignoreWhitespace, type) {
				var comparerOptions = {
				toggleable: true,
				type: type, //$NON-NLS-0$ //From user preference
				ignoreWhitespace: ignoreWhitespace,//From user reference
				readonly: !saveCmdContainerId || !editableInComparePage,
				hasConflicts: hasConflicts,
				diffProvider: diffProvider,
				resource: resource,
				compareTo: compareTo,
				saveLeft: {	saveCmdContainerId: saveCmdContainerId, saveCmdId: saveCmdId, titleIds: titleIds},
				editableInComparePage: editableInComparePage,
				standAlone: (standAloneOptions ? true : false)
			};
			var viewOptions = {
				parentDivId: parentDivId,
				commandProvider: cmdProvider,
				highlighters: (standAloneOptions ? standAloneOptions.highlighters : null)
			};
			var comparer = new mResourceComparer.ResourceComparer(serviceRegistry, commandService, comparerOptions, viewOptions);
			if(containerModel) {
				containerModel.resourceComparer = comparer;
				containerModel.destroy = function() {
					this.resourceComparer.destroy();
				};
			}
			comparer.start().then(function(maxHeight) {
				var vH = 420;
				if (maxHeight < vH) {
					vH = maxHeight;
				}
				var diffContainer = lib.node(parentDivId);
				diffContainer.style.height = vH + "px"; //$NON-NLS-0$
			});
		};
		
		var diffProvider = new mResourceComparer.DefaultDiffProvider(serviceRegistry);
		var cmdProvider = new mCompareCommands.CompareCommandFactory({commandService: commandService, commandSpanId: commandSpanId, toggleCommandSpanId: toggleCommandSpanId, gridRenderer: gridRenderer, serviceRegistry: serviceRegistry});
		var ignoreWhitespace = false;
		var mode = "inline";  //$NON-NLS-0$
		if (preferencesService) {
			cmdProvider.addEventListener("compareConfigChanged", function(e) { //$NON-NLS-0$
				var data;
				switch (e.name) {
					case "mode":  //$NON-NLS-0$
						data = {mode: e.value};
					break;
					case "ignoreWhiteSpace":  //$NON-NLS-0$
						data = {ignoreWhitespace: e.value};
					break;
				}
				if (data) {
					preferencesService.put("/git/compareSettings", data); //$NON-NLS-1$
				}
			}.bind(this));
			preferencesService.get("/git/compareSettings").then(function(prefs) {  //$NON-NLS-0$
				ignoreWhitespace = prefs["ignoreWhitespace"] || ignoreWhitespace; //$NON-NLS-0$
				mode =  prefs["mode"] || mode; //$NON-NLS-0$
				setCompareSelection(diffProvider, cmdProvider, ignoreWhitespace, mode);
			});
		} else {
			setCompareSelection(diffProvider, cmdProvider, ignoreWhitespace, mode);
		}
	}
	
	//return module exports
	exports.createCompareWidget = createCompareWidget;
	

	function getCommitSvgs(commits) {

		var COLUMN_SPACING = 15;
		var COLUMN_LENGTH = 100;
		var NODE_SIZE = 8;
		var LINE_WIDTH= 2;
		var columnInfo = {
			branchCount :0,
			columnReserve : []
		};
		

		
		// only dark colors for the white background
		var distinguishableColors = [
			"#000000", "#1CE6FF", "#008941",
			"#006FA6", "#A30059", "#456D75",
			"#0000A6", "#63FFAC", "#004D43",
			"#5A0007", "#809693", "#1B4400",
			"#4FC601", "#3B5DFF", "#4A3B53",
			"#61615A", "#6B7900", "#00C2A0",
			"#D16100", "#222800", "#012C58",
			"#000035", "#A1C299", "#300018",
			"#0AA6D8", "#013349", "#00846F",
			"#372101", "#C2FFED", "#A079BF",
			"#C0B9B2", "#C2FF99", "#001E09",
			"#00489C", "#6F0062", "#0CBD66",
			"#D157A0", "#456648", "#0086ED",
			
			"#34362D", "#B4A8BD", "#00A6AA",
			"#452C2C", "#636375", "#A3C8C9",
			"#575329", "#00FECF", "#B05B6F",
			"#3B9700", "#04F757", "#1E6E00",
			"#6367A9", "#A05837", "#6B002C",
			"#549E79", "#201625", "#72418F",
			"#3A2465", "#922329", "#938A81",
			"#5B4534", "#404E55", "#0089A3",
			"#A4E804", "#324E72", "#6A3A4C",
			"#83AB58", "#001C1E", "#D1F7CE",
			"#004B28", "#A3A489", "#806C66",
			"#66796D", "#1E0200", "#5B4E51",
			"#320033", "#66E1D3", "#D0AC94"
		];
		
		var distinguishableColorIndex = 0;
		
		var getDistinguishableColor = function(){
			distinguishableColorIndex++;
			if(distinguishableColorIndex>76)distinguishableColorIndex=0;
			return distinguishableColors[distinguishableColorIndex];
		};


		var makeSVG = function(tag, attrs) {
			var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
			for (var k in attrs)
				lib.setSafeAttribute(el, k, attrs[k]);
			return el;
		};

		var addToReserve = function(columnInfo, columnItem){
			var firstEmpty = -1;
			for(var n =0;n<columnInfo.columnReserve.length;n++){
				if(!columnInfo.columnReserve[n].Name){
					firstEmpty = n;
					break;
				}
			}
			if(firstEmpty<0){
				columnInfo.columnReserve.push(columnItem);
				firstEmpty = columnInfo.columnReserve.length-1;
			}else{
				columnInfo.columnReserve[firstEmpty]=columnItem;
			}
			columnInfo.branchCount++;
			return firstEmpty;
		};
		
		var updateColumnReserve = function(commit, columnInfo, row) {
			var drawingUpdate = [];
			var index = columnInfo.columnReserve.map(function(x) {
				return x.Name;
			}).indexOf(commit.Name);
			if (!commit.Parents || commit.Parents.length === 0) {
				if (index > -1) {
					columnInfo.columnReserve.splice(index, 1);
				}
			} else {
				if (index > -1) {
					var parentInReserve = columnInfo.columnReserve.map(function(x) {
						return x.Name;
					}).indexOf(commit.Parents[0].Name);
					// if parent 1 is in reserve
					if (parentInReserve > -1) {
						drawingUpdate.push({
							type: "branchOut",
							fromColumn: index,
							toColumn: parentInReserve,
							row: row,
							Color: columnInfo.columnReserve[parentInReserve].Color
						});

						
						if(index===columnInfo.columnReserve.length-1){
							columnInfo.columnReserve.splice(index, 1);
						}else{
							columnInfo.columnReserve[index] = {
							};
						}
						columnInfo.branchCount--;
					}
					// if not, add it in reserve
					else {
						var oldColor = columnInfo.columnReserve[index].Color;
						columnInfo.columnReserve[index] = {
							Name: commit.Parents[0].Name,
							Color: oldColor||getDistinguishableColor()
						};
					}
				}
				else {
					index = addToReserve(columnInfo, {
						Name: commit.Parents[0].Name,
						Color: getDistinguishableColor()
					});
				}
				if (commit.Parents.length > 1) {
					for (var k = 1; k < commit.Parents.length; k++) {
						var parentIndex = columnInfo.columnReserve.map(function(x) {
							return x.Name;
						}).indexOf(commit.Parents[k].Name);
						var type = "merge";
						if (parentIndex < 0) {
							parentIndex = addToReserve(columnInfo, {
								Name: commit.Parents[k].Name,
								Color: getDistinguishableColor()
							});
							type="mergeNewBranch";
						}
						drawingUpdate.push({
							type: type,
							fromColumn: index,
							toColumn: parentIndex,
							row: row,
							Color: columnInfo.columnReserve[parentIndex].Color
						});
						
					}
				}

			}
			return drawingUpdate;
		};

		
		var updateDrawingForCommit = function(drawingUpdate, svg) {
			if (drawingUpdate) {
				var columnGap = 	drawingUpdate.fromColumn-drawingUpdate.toColumn;
				var x1 =(COLUMN_SPACING) * (drawingUpdate.fromColumn + 1),
				x2=(COLUMN_SPACING) * (drawingUpdate.toColumn + 1) - (columnGap * (LINE_WIDTH/2));
				if(columnGap>0){
					x2 = x2-0.5;
				}else if(columnGap<0){
					x2 = x2+0.5;
				}
				var crossline = makeSVG('line', {
					x1: x1,
					y1: NODE_SIZE,
					x2: x2,
					y2: NODE_SIZE + COLUMN_LENGTH,
					stroke: drawingUpdate.Color||'black',
					'stroke-width': LINE_WIDTH
				});
				svg.appendChild(crossline);
			}

		};

		var getIndexBy = function(array, filedName, value) {
			for (var m = 0; m < array.length; m++) {
				if (array[m][filedName] === value) {
					return m;
				}
			}
			return -1;
		};

		var maxWidth = 0;

		addToReserve(columnInfo,{
			Name: commits[0].Name,
			Color: getDistinguishableColor()
		});
		for (var i = 0; i < commits.length; i++) {
			var svgDiv = document.createElement("div");
			var linesSvg = makeSVG("svg",{"class":"commitSvgGraphLines"});
			var commit = commits[i];
			var columnIndex = getIndexBy(columnInfo.columnReserve, "Name", commit.Name);
			var node, line;
			var nodeSvg = makeSVG("svg",{"class":"commitSvgGraphNode"});
			if (columnIndex > -1) {
				node = makeSVG('circle', {
					Name: commit.Name + "_node",
					cx: COLUMN_SPACING * (columnIndex + 1),
					cy: NODE_SIZE-1,
					r: NODE_SIZE-2,
					stroke: columnInfo.columnReserve[columnIndex].Color||'black',
					fill: 'white',
					'stroke-width': LINE_WIDTH
				});
				nodeSvg.appendChild(node);
				svgDiv.appendChild(nodeSvg);
			} 
			var newWidth = (columnInfo.columnReserve.length + 1) * COLUMN_SPACING + 3;
			if (newWidth > maxWidth) {
				maxWidth = newWidth;
			}
			var drawingUpdates = updateColumnReserve(commits[i], columnInfo, i);
			var mergeNewBranchIndex = getIndexBy(drawingUpdates, "type", "mergeNewBranch");

			for (var j = 0, processedBranches = 0; j < columnInfo.columnReserve.length && processedBranches<columnInfo.branchCount; j++) {
				if(columnInfo.columnReserve[j].Name){
					if(mergeNewBranchIndex<0 || drawingUpdates[mergeNewBranchIndex].toColumn!==j){
						line = makeSVG('line', {
							x1: COLUMN_SPACING * (j + 1),
							y1: 0,
							x2: COLUMN_SPACING * (j + 1),
							y2: NODE_SIZE + COLUMN_LENGTH,
							stroke: columnInfo.columnReserve[j].Color||'black',
							'stroke-width': LINE_WIDTH
						});
	
						linesSvg.appendChild(line);
					}

					
					processedBranches++;
				}
			}
			for (j=0;j<drawingUpdates.length;j++){
				updateDrawingForCommit(drawingUpdates[j], linesSvg);
			}
			

			lib.setSafeAttribute(linesSvg, "width", newWidth + "px");
			//svg.setAttribute("height","100%");
			lib.setSafeAttribute(linesSvg, "preserveAspectRatio", "none");
			lib.setSafeAttribute(linesSvg, "viewBox","0 0 "+newWidth+" "+COLUMN_LENGTH);
			lib.setSafeAttribute(svgDiv, "class","commitSvgGraph");
			svgDiv.style.width =  newWidth + "px";
			svgDiv.appendChild(linesSvg);
			if (columnIndex > -1) {
				lib.setSafeAttribute(nodeSvg, "width", newWidth + "px");
				lib.setSafeAttribute(nodeSvg, "height", NODE_SIZE*2 + "px");
				svgDiv.appendChild(nodeSvg);
			}
			commits[i].graphSvg = svgDiv;
			
		}
		return columnInfo;
	}
	exports.getCommitSvgs = getCommitSvgs;

	//return module exports
	return exports;
});
