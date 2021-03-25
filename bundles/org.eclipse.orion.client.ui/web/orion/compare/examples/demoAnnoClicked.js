/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 
/*eslint-env browser, amd*/
define(['compare/builder/compare'],   
 
function(Compare) {
	var document = window.document;

	/** Buttons */	
	var bCompare = document.getElementById("doCompare"); //$NON-NLS-0$
	var bLoadSample = document.getElementById("loadSample"); //$NON-NLS-0$
	var bAnimateDiffs = document.getElementById("animateDiffs"); //$NON-NLS-0$
	
	var bCompareType = document.getElementById("compareTypeSelect"); //$NON-NLS-0$
	var bContentTypeTD = document.getElementById("contentTypes"); //$NON-NLS-0$
	var bContentType = document.getElementById("contentTypeSelect"); //$NON-NLS-0$
	var bAnimateInterval = document.getElementById("animateInterval"); //$NON-NLS-0$
	
	var compareType = "byTwoContents"; //$NON-NLS-0$
	var contentType = "js"; //$NON-NLS-0$
	
	
	var contentOnLeft = "Sample Orion compare contents on left side\n\nYou can replace the contents here and and click on [Compare Again] to see the new result\n"; //$NON-NLS-0$
	var	contentOnRight = "Sample Orion compare contents on right side\n\nYou can replace the contents here and and click on [Compare Again] to see the new result\n"; //$NON-NLS-0$
	var contentOnLeftURL = "Put file URL here\n"; //$NON-NLS-0$
	var	contentOnRightURL = "Put file URL here\n"; //$NON-NLS-0$
	
    var options = {
        parentDivId: "compareParentDiv", //$NON-NLS-0$
        newFile: {
            Name: "left." + contentType, //$NON-NLS-0$
            readonly: false,
            Content: contentOnLeft
        },
        oldFile: {
            Name: "right." + contentType, //$NON-NLS-0$
            readonly: false,
            Content: contentOnRight
        }
    };

	var compare = new Compare(options, "compareCmdDiv", "twoWay", true/*, "toggleCmd"*/);
	//Get the left hand side editor object
	var mainEditor = compare.getCompareView().getWidget().getMainEditor();
	
	//Disable the visibility of the following annotations in the annotation ruler
	var annoTypes = {};
	annoTypes["orion.annotation.task"] = false; // todo annotation
	annoTypes["orion.annotation.bookmark"] = false; // bookmark annotation (triggered by double clicking on the ruler)
	mainEditor.setAnnotationTypesVisible(annoTypes);
	
	//Disable all the annotations on the line number ruler
	mainEditor.getTextView().getRulers()[1].getAnnotationTypePriority = function(/*type*/) {
		return 0;
	};
	
	//Customize the behaviors on both hovering and clicking on an annotation or a group of annotations.
	//Orion has default behaviors for the best of generic editing experience on multiple annotaitons on one spot.
	//We send out an "AnnotationClicked" event attached to the textView object, before we go for the default behavior.
	//	var evt = {
	//		type: "AnnotationClicked",
	//		target: The ruler or tooltip object,
	//		targetType: "Ruler" or "Tooltip,
	//		annotation: the annotation object,
	//		selection: {// Set it to null if you wan to disable it
	//			start: start,
	//			end: end,
	//			viewportOffset: 1 / 3
	//		},
	//		showTooltip: true or undefined //Set it to false when targetType === "Ruler" and you do not want it
	//	};
	
	//User can listen to the event, handle it, and at last, modify the evt.selection and evt.showTooltip properties to change the Orion default behavior.
	
	
	//Default behavior:
	//1. When you click on an annotation from the annotation ruler(left to the line number ruler):
	//   It highlights(in the editor) the range of the first annotation and pops up its tooltip. If you click again it will do the same thing for the next one if there are multiple annotations.
	//   You can disable any of the two behaviors(selection and tooltip popup) by setting the evt.selection=null and evt.showTooltip=false
	//
	//2. When you hover on an annotation from the annotation ruler(left to the line number ruler): 
	//   It pops up all the annotations in a tooltip. If you put the "html" property(e.g., an icon) when you create your annotation, the "html" will berendered as a clickable DOM node to the left of the title.
	//   When you click on the icon, Orion will highlight the annotation in the editor and hide the tooltip.
	//   You can put your own action and disable the default "highlight annotaiton" behavior by setting evt.selection=null. 
	//   Note that if you disable the default behavior, you need to call evt.target.hide() to hide the tooltip if you want so.
	mainEditor.getTextView().addEventListener("AnnotationClicked", function(evt){
		if(evt.targetType === "Ruler") {// The event was triggered by clciking on the annotation ruler
			evt.selection = null;
			evt.showTooltip = false;
		} else if(evt.targetType === "Tooltip") {// The event was triggered by clciking on one of the buttons from the tool tip
			if(evt.annotation) {
				//Put your own action here
				alert(evt.annotation.title + "( " + evt.annotation.start + "," + evt.annotation.end + " )");
			}
			evt.selection = null;
			if(evt.target && typeof evt.target.hide === "function") {
				evt.target.hide();
			}
		}
	});
	
	function getFile(file) {
		try {
			var objXml = new XMLHttpRequest();
			objXml.open("GET",file,false); //$NON-NLS-0$
			objXml.send(null);
			return objXml.responseText;
		} catch (e) {
			return null;;;;;;;
		}
	}

	function onLoadSample() {
		var sampleLeft = getFile("./standalone/sampleLeft.js"); //$NON-NLS-0$
		var sampleRight = getFile("./standalone/sampleRight.js"); //$NON-NLS-0$
		if(sampleLeft && sampleRight) {
			bCompareType.selectedIndex = 0;
			compareType = bCompareType.options[bCompareType.selectedIndex].value;
			bContentType.selectedIndex = 0;
			contentType = bContentType.options[bContentType.selectedIndex].value;
			bContentTypeTD.style.display = "block"; //$NON-NLS-0$
			
			var widget = compare.getCompareView().getWidget();
			widget.options.oldFile.Content = sampleRight;
			widget.options.newFile.Content = sampleLeft;
			widget.options.oldFile.URL = null;
			widget.options.newFile.URL = null;
			widget.options.oldFile.Name = "sampRight.js"; //$NON-NLS-0$
			widget.options.newFile.Name = "sampleLeft.js"; //$NON-NLS-0$
			widget.options.mapper = null;
			compare.refresh(true);
			hookUp();
		}
	}
	function animateDiffs() {
		var widget = compare.getCompareView().getWidget();
		if(widget.nextChange()){
			var interval = parseInt(bAnimateInterval.options[bAnimateInterval.selectedIndex].value, 10);
			window.setTimeout(animateDiffs, interval);
		}
	}
	function onAnimateDiffs() {
		var widget = compare.getCompareView().getWidget();
		widget.initDiffNav();
		var interval = parseInt(bAnimateInterval.options[bAnimateInterval.selectedIndex].value, 10);
		window.setTimeout(animateDiffs, interval);
	}
	var GOTO_LINE = 23;
	
	var div2Insert = document.createElement("DIV");
	div2Insert.classList.add("injectedDiv");
	var select123 = document.createElement("SELECT");
	select123.classList.add("selectDiv");
	select123.addEventListener("change", function(){alert("I am changed");});
	div2Insert.appendChild(select123);
	var textArea = document.createElement("TEXTAREA");
	div2Insert.appendChild(textArea);
	textArea.placeholder = "Please put your review here...";
	["Reviewer1", 
	 "Reviewer2", 
	 "Reviewer3", 
	 "Reviewer4", 
	 "Reviewer5", 
	 "Reviewer6"
	].forEach(function(item) {
		var c = document.createElement("option");
		c.text = item;
		select123.options.add(c);
		
	});
	
	var oSerializer = new XMLSerializer();
	var divHTML = oSerializer.serializeToString(div2Insert);
	
	function hookUp() {
		compare.getCompareView().getWidget().addEventListener("contentLoaded", function(){ //$NON-NLS-0$
	 			return;
 			/*
 			 * Things you only need to do once
 			 */
 			//getMainEditor is the new API by which you can get either the left hand side editor in tow way mode or just he merged editor in inline mode
 			var editor = compare.getCompareView().getWidget().getMainEditor();
 		 	//annotationModel is the handler you add or remove you annotation models
 		 	var annotationModel = editor.getAnnotationModel();
  		 	if(!annotationModel){
		 		return;
 		 	}
 		 	//Get the line styler inside the editor
		 	var annoStyler = editor.getAnnotationStyler();
 		 	
 		 	//Get the REAL line number(if in inline mode, the GOTO_LINE has to be calculated because the textView is a merged one )
 		 	var lineNumber = compare.getCompareView().getWidget().getLineNumber(GOTO_LINE);
 		 	
 		 	//As the annotation model is a range that is based on the charater offset of the {star, end}, you have to use the textModel to calculate that)
 		 	var textModel = compare.getCompareView().getWidget().getMainEditor().getTextView().getModel();
 		 	//var startIndex = textModel.getLineStart(lineNumber+1);
 		 	var startIndex = textModel.getLineEnd(lineNumber);
 		 	var endIndex = startIndex;
 		 	//Add your annotation type to the editor 
 		 	annoStyler.addAnnotationType("compare.demo.customize.linehighlight");
 		 	//Add the same annotation type ot the annotation ruler(gutter)
 		 	editor.getAnnotationRuler().addAnnotationType("compare.demo.customize.linehighlight");
  			/*
 			 * Eond of things you only need to do once
 			 */
		 	
  		 	//Add and/or remove your annotation models
 		 	//The first param is an array of the annotations you want to remove
 		 	//The second param is an array of the annotations you want to add
 		 	annotationModel.replaceAnnotations([], [{
	 		 	start: startIndex,
	 		 	end: endIndex,
	 		 	title: "sdfsdfsdfs",
	 		 	type: "compare.demo.customize.linehighlight",
	 		 	html: "<div class='annotationHTML task'></div>",
	 		 	//style: {styleClass: "lineHighlightGutter"}, //Gutter style at the line
	 		 	rangeStyle: {styleClass: "lineHighlightGutter2", node: div2Insert},
//	 		 	rangeStyle: {styleClass: "lineHighlightGutter2", html: divHTML},
	 		 	//rangeStyle: {styleClass: "lineHighlightGutter1", html: "<div style='width:100px;height:30px;background-color:blue'></div>"},
	 //		 	lineStyle: {styleClass: "lineHighlight"} //The line style in the editor
 		 	}]);
	 	});
	}
	function doCompare() {
//			mainEditor.setAnnotationTypesVisible(annoTypes);
//			mainEditor.setOverviewAnnotationTypesVisible(annoTypes);
//			mainEditor.setTextAnnotationTypesVisible(annoTypes);
 			var editor = compare.getCompareView().getWidget().getMainEditor();
 		 	//annotationModel is the handler you add or remove you annotation models
 		 	var annotationModel = editor.getAnnotationModel();
  		 	if(!annotationModel){
		 		return;
 		 	}
 		 	//Get the line styler inside the editor
		 	var annoStyler = editor.getAnnotationStyler();
 		 	
 		 	//Get the REAL line number(if in inline mode, the GOTO_LINE has to be calculated because the textView is a merged one )
 		 	var lineNumber = compare.getCompareView().getWidget().getLineNumber(GOTO_LINE);
 		 	
 		 	//As the annotation model is a range that is based on the charater offset of the {star, end}, you have to use the textModel to calculate that)
 		 	var textModel = compare.getCompareView().getWidget().getMainEditor().getTextView().getModel();
 		 	var startIndex = textModel.getLineStart(lineNumber);
 		 	//var startIndex = textModel.getLineEnd(lineNumber);
 		 	var endIndex = textModel.getLineEnd(lineNumber);
 		 	//Add your annotation type to the editor 
 		 	annoStyler.addAnnotationType("compare.demo.customize.linehighlight");
 		 	//Add the same annotation type ot the annotation ruler(gutter)
 		 	editor.getAnnotationRuler().addAnnotationType("compare.demo.customize.linehighlight");
  			/*
 			 * Eond of things you only need to do once
 			 */
		 	
		 	
            var actionButton = document.createElement("div");
            actionButton.innerHTML = "<div class='annotationHTML lineHighlightGutter1'></div>";
            actionButton.lastChild.addEventListener("click", function(){
            	alert("dasdsdaf");
            }, true);
  		 	//Add and/or remove your annotation models
 		 	//The first param is an array of the annotations you want to remove
 		 	//The second param is an array of the annotations you want to add
 		 	annotationModel.replaceAnnotations([], [
	 		 	{
		 		 	start: startIndex + 10,
		 		 	end: startIndex + 15,
		 		 	title: "Code review issue1",
		 		 	type: "compare.demo.customize.linehighlight",
		 		 	html: actionButton.innerHTML,
		 			style: {styleClass: "lineHighlightGutter1"}, //Gutter style at the line
		 		 	//rangeStyle: {styleClass: "lineHighlightGutter2", node: div2Insert},
	//	 		 	rangeStyle: {styleClass: "lineHighlightGutter2", html: divHTML},
		 		 	//rangeStyle: {styleClass: "lineHighlightGutter1", html: "<div style='width:100px;height:30px;background-color:blue'></div>"},
		 //		 	lineStyle: {styleClass: "lineHighlight"} //The line style in the editor
	 		 	},
	 		 	{
		 		 	start: startIndex + 25,
		 		 	end: startIndex + 30,
		 		 	title: "Code review issue2",
		 		 	type: "compare.demo.customize.linehighlight",
		 		 	html: actionButton.innerHTML,
		 			style: {styleClass: "lineHighlightGutter1"}, //Gutter style at the line
		 		 	//rangeStyle: {styleClass: "lineHighlightGutter2", node: div2Insert},
	//	 		 	rangeStyle: {styleClass: "lineHighlightGutter2", html: divHTML},
		 		 	//rangeStyle: {styleClass: "lineHighlightGutter1", html: "<div style='width:100px;height:30px;background-color:blue'></div>"},
		 //		 	lineStyle: {styleClass: "lineHighlight"} //The line style in the editor
	 		 	}
 		 	]);
//		var widget = compare.getCompareView().getWidget();
//		if(widget.type === "twoWay"){ //$NON-NLS-0$
//			var editors = widget.getEditors();
//			var oldContents = editors[0].getTextView().getText();
//			var newContents = editors[1].getTextView().getText();
//			if(compareType === "byTwoContents"){ //$NON-NLS-0$
//				widget.options.oldFile.Content = oldContents;
//				widget.options.newFile.Content = newContents;
//				widget.options.oldFile.URL = null;
//				widget.options.newFile.URL = null;
//			} else {
//				widget.options.oldFile.URL = oldContents;
//				widget.options.newFile.URL = newContents;
//				bCompareType.selectedIndex = 0;
//				compareType = bCompareType.options[bCompareType.selectedIndex].value;
//				bContentTypeTD.style.display = "block"; //$NON-NLS-0$
//			}
//			widget.options.mapper = null;
//			compare.refresh(true);
//			hookUp();
//			//widget.refresh();
//		}
	}
	function onCompareType(evt) {
		compareType = bCompareType.options[bCompareType.selectedIndex].value;
		var widget = compare.getCompareView().getWidget();
		if(compareType === "byTwoContents"){ //$NON-NLS-0$
			widget.options.oldFile.Content = contentOnRight;
			widget.options.newFile.Content = contentOnLeft;
			widget.options.oldFile.URL = null;
			widget.options.newFile.URL = null;
			bContentTypeTD.style.display = "block"; //$NON-NLS-0$
		} else {
			widget.options.oldFile.Content = contentOnRightURL;
			widget.options.newFile.Content = contentOnLeftURL;
			widget.options.oldFile.URL = null;
			widget.options.newFile.URL = null;
			bContentTypeTD.style.display = "none"; //$NON-NLS-0$
		}
		widget.options.mapper = null;
		widget.refresh(true);
	}
	
	function onContentType(evt) {
		contentType = bContentType.options[bContentType.selectedIndex].value;
		compare.setFileNames("left." + contentType, "right." + contentType);
	}
	
	/* Adding events */
	bCompare.onclick = doCompare;
	bLoadSample.onclick = onLoadSample;
	bAnimateDiffs.onclick = onAnimateDiffs;
	bCompareType.onchange = onCompareType;
	bContentType.onchange = onContentType;
 });
