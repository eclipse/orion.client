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
	
	var compare = new Compare(options, "compareCmdDiv", "twoWay", true/*, "toggleCmd"*/); //$NON-NLS-1$ //$NON-NLS-0$
	
	function getFile(file) {
		try {
			var objXml = new XMLHttpRequest();
			objXml.open("GET",file,false); //$NON-NLS-0$
			objXml.send(null);
			return objXml.responseText;
		} catch (e) {
			return null;
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
	 		 	title: "",
	 		 	type: "compare.demo.customize.linehighlight",
	 		 	html: "",
	 		 	//style: {styleClass: "lineHighlightGutter"}, //Gutter style at the line
	 		 	rangeStyle: {styleClass: "lineHighlightGutter2", node: div2Insert},
//	 		 	rangeStyle: {styleClass: "lineHighlightGutter2", html: divHTML},
	 		 	//rangeStyle: {styleClass: "lineHighlightGutter1", html: "<div style='width:100px;height:30px;background-color:blue'></div>"},
	 //		 	lineStyle: {styleClass: "lineHighlight"} //The line style in the editor
 		 	}]);
	 	});
	}
	function doCompare() {
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
	 		 	title: "",
	 		 	type: "compare.demo.customize.linehighlight",
	 		 	html: "",
	 		 	//style: {styleClass: "lineHighlightGutter"}, //Gutter style at the line
	 		 	rangeStyle: {styleClass: "lineHighlightGutter2", node: div2Insert},
//	 		 	rangeStyle: {styleClass: "lineHighlightGutter2", html: divHTML},
	 		 	//rangeStyle: {styleClass: "lineHighlightGutter1", html: "<div style='width:100px;height:30px;background-color:blue'></div>"},
	 //		 	lineStyle: {styleClass: "lineHighlight"} //The line style in the editor
 		 	}]);
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
