/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['google-diff/diff-match-patch'], function(mJsDiff) {

var orion = orion || {};

function diff_lineOrWordMode(text1, text2, word) {
	var dmp = new mJsDiff();
	var a = dmp.diff_linesToChars_(text1, text2, word);
	var lineText1 = a.chars1;
	var lineText2 = a.chars2;
	var lineArray = a.lineArray;
	var diffs = dmp.diff_main(lineText1, lineText2, false);
	dmp.diff_charsToLines_(diffs, lineArray);
	return diffs;
}

function diff_charMode(text1, text2) {
  var dmp = new mJsDiff();
  var diffs = dmp.diff_main(text1, text2, false);
  return diffs;
}

orion.JSDiffAdapter = (function() {
	/**
	 * JSDiffAdapter is an adapter to convert jsdiff diff blocks into a list of mappers that is used in the Orion compare widget.
	 * 
	 * @name orion.JSDiffAdapter
	 * 
	 */
	function JSDiffAdapter(ignoreWhitespace) {
		this._ignoreWhitespace = ignoreWhitespace;
	}
	
	JSDiffAdapter.prototype = {
		//https://bugs.eclipse.org/bugs/show_bug.cgi?id=401905
		_specialLine: function(lineDelim, current, lastLineEnding) {
			return (current[1] === lineDelim && lastLineEnding !== lineDelim);
		},
		
		/**
		 * @class This object describes a mapper item representing a diff block, which is an array of 3 numbers.
		 * @name orion.diff.mapperItem
		 *
		 * @property {number} mapperItem[0] the number of lines in the new version of the string.
		 * @property {number} mapperItem[1] the number of lines in the old version of the string.
		 * @property {number} mapperItem[2] the number that indicates the state of the diff block:
		 *     <ul>
		 *       <li> 0  - the diff block represents same lines on both side. mapperItem[0] and mapperItem[1] should be identical to represent the number of the same lines</li>
		 *       <li> -1 - the diff block represents that the new version has deleted lines. mapperItem[0] should be 0 and mapperItem[1] should represent the line number that was deleted</li>
		 *       <li> >0 - the diff block represents that the new version has added linies and the old version has deleted lines, if any. mapperItem[0] should be greater than 0 and mapperItem[1] should represent the line number that was deleted</li>
		 *     </ul>
		 */
		/**
		 * @class This object describes the result of the adapt call.
		 * @name orion.diff.jsdiff.result
		 *
		 * @property {array of orion.diff.mapperItem} mapper the array of diff blocks.
		 * E.G.
		 * [0, 1, -1],
		 * [2, 2, 0],
		 * [2, 0, 1],
		 * [4, 4, 0],
		 * @property {array of String} changContents the array of strings that represents all the added lines in the new version of the compare string.
		 */
		/**
		 * Returns the mapper object representing diff between two versions of a string.
		 *
		 * @param {String} oldStr the old version of the string
		 * @param {String} newStr the new version of the string
		 * @param {String} lineDelim optional the line delimeter of the string
		 * @returns {orion.diff.jsdiff.result} the result
		 */
		adapt: function(oldStr, newStr, lineDelim){
			if(!lineDelim){
				lineDelim = "\n"; //$NON-NLS-0$
			}
			var splitOld = oldStr.split(lineDelim); //$NON-NLS-0$
			var splitNew = newStr.split(lineDelim); //$NON-NLS-0$
			var newLineAtEndOld = (splitOld[splitOld.length-1] === "");
			var newLineAtEndNew = (splitNew[splitNew.length-1] === "");
			
			//var diff = mJsDiff.diffLines(oldStr, newStr, this._ignoreWhitespace);
			var diff = diff_lineOrWordMode(oldStr, newStr);
			var map = [];
			var changContents = [];
			var linesAdded = 0;
			var linesRemoved = 0;
			var changeIndex = -1;
			var oFileLineCounter = 0;
			var previousDelim = true;
			//https://bugs.eclipse.org/bugs/show_bug.cgi?id=401905
			//We have to reserve last line's ending 
			var lastLineEnding = lineDelim;
		    for (var i = 0; i < diff.length; i++){ 
				var current = diff[i];
		        var lines = current[1].split(lineDelim); //$NON-NLS-0$
		        var currentLineNumber = lines.length;
		        var startNumber = 0;
		        if(lines.length > 1 && lines[lines.length-1] === ""){
					currentLineNumber--;
		        }
		        if (currentLineNumber > 1 && !previousDelim) {
		            if (lines[0] === "") {
		                currentLineNumber--;
		                startNumber++;
		            }
		        }		        
		        if (current[0] === 0) {
		            if(!this._specialLine(lineDelim, current, lastLineEnding)){
			            if (linesAdded || linesRemoved) {
			                map.push([linesAdded, linesRemoved, changeIndex]);
			                linesAdded = 0;
			                linesRemoved = 0;
			                changeIndex = -1;
			                oFileLineCounter += linesRemoved;
			            }
						map.push([currentLineNumber, currentLineNumber, 0]);
						oFileLineCounter += currentLineNumber;
		            }
		        } else if (current[0] === 1) {
		            if (changeIndex === -1) {
		                changeIndex = changContents.length + 1;
		            }
		            linesAdded += currentLineNumber;
		            for (var j = startNumber; j < (currentLineNumber + startNumber); j++) {
		                changContents.push(lines[j]);
		            }
		        } else {
		            linesRemoved += currentLineNumber;
		        }		        
		        previousDelim = false;
		        if(lines.length > 1 && lines[lines.length-1] === ""){
			        previousDelim = true;
		        }
		        //we want to reserverve the line ending to check next line
		        if(current[1]) {
					lastLineEnding = current[1][current[1].length - 1];
		        } else {
					lastLineEnding = lineDelim;
		        }
		    }
		    
			if (linesAdded || linesRemoved) {
			    map.push([linesAdded, linesRemoved, changeIndex]);
			    oFileLineCounter += linesRemoved;
			}
			
			if (oFileLineCounter < splitOld.length && splitOld.length > 1) {
			    var lastMapItem = map[map.length - 1];
			    if (lastMapItem[2] === 0) {
			        lastMapItem[0] += 1;
			        lastMapItem[1] += 1;
			    } else if (lastMapItem[2] === -1) {
			        map.push([1, 1, 0]);
			    } else if (newLineAtEndOld === newLineAtEndNew) {
			        map.push([1, 1, 0]);
			    } else {
			        if (newLineAtEndNew) {lastMapItem[0] += 1;}
			        if (newLineAtEndOld) {lastMapItem[1] += 1;}
			    }
			}
			return {mapper:map, changContents: {array:changContents , index:0}};
		},
		
		adaptCharDiff : function(oldStr, newStr, word) {
			var diff = word ? diff_lineOrWordMode(oldStr, newStr, true) : diff_charMode(oldStr, newStr);
			var map = [];
			var oldStart = 0;
			var newStart = 0;
			var charsAdded = 0;
			var charsRemoved = 0;
			for ( var i = 0; i < diff.length; i++) {
				var current = diff[i];
				if (current[0] === 0) {
					if (charsAdded > 0 || charsRemoved > 0) {
						map.push([ newStart,
								   newStart + charsAdded,
								   oldStart,
								   oldStart + charsRemoved ]);
						newStart += charsAdded;
						oldStart += charsRemoved;
						charsAdded = 0;
						charsRemoved = 0;
					}
					newStart += current[1].length;
					if(current.helperValue) {
						oldStart += current.helperValue.length;
					} else {
						oldStart += current[1].length;
					}
				} else if (current[0] === 1) {
					charsAdded += current[1].length;
				} else {
					charsRemoved += current[1].length;
				}
			}
			if (charsAdded > 0 || charsRemoved > 0) {
				map.push([ newStart, newStart + charsAdded,
						oldStart, oldStart + charsRemoved ]);
			}
			return map;
		}
	};
	return JSDiffAdapter;
}());

return orion;
});
