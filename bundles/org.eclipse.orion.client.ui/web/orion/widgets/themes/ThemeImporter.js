/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/

define([
        'i18n!orion/settings/nls/messages',
        'orion/webui/littlelib',
        'orion/webui/dialog',
        'text!orion/widgets/themes/templates/ImportThemeDialogTemplate.html',
        'orion/widgets/themes/dialogs/urlImportDialog',
        'orion/widgets/themes/editor/ThemeData',
        'orion/objects'
], function(messages, lib, dialog, ImportThemeDialogTemplate, urlImportDialog, themeData, objects) {
        var luminanceDarkLimit = 70;


        function ThemeImporter() {
        }

        function colorToHex(color) {
            if (color.substr(0, 1) === '#') {
                return color;
            }
            var digits = /(.*?)rgb\((\d+), (\d+), (\d+)\)/.exec(color);

            var red = parseInt(digits[2]);
            var green = parseInt(digits[3]);
            var blue = parseInt(digits[4]);

            var rgb = blue | (green << 8) | (red << 16) | (1 << 24);
            return digits[1] + '#' + rgb.toString(16).substring(1,8);
        }

        ThemeImporter.prototype.colorToHex = colorToHex;

        function parseToXML(text) {
            try {
                var parser = new DOMParser();
                var xml = parser.parseFromString(text, "text/xml"); //$NON-NLS-0$
                var found = xml.getElementsByTagName("parsererror"); //$NON-NLS-0$
                if (!found || !found.length || !found[0].childNodes.length) {
                    return xml;
                }
            } catch (e) { /* suppress */ }
            return null;
        }

        ThemeImporter.prototype.parseToXML = parseToXML;

        // Changes XML to JSON
        function xmlToJson(xml) {
            // Create the return object
            var obj = {};
            if (xml.nodeType === 1) { // element
                // do attributes
                if (xml.attributes.length > 0) {
                    for (var j = 0; j < xml.attributes.length; j++) {
                        var attribute = xml.attributes.item(j);
                        obj[attribute.nodeName] = attribute.value;
                    }
                }
            } else if (xml.nodeType === 3) { // text
                obj = xml.nodeValue.trim(); // add trim here
            }
            // do children
            if (xml.hasChildNodes()) {
                for (var i = 0; i < xml.childNodes.length; i++) {
                    var item = xml.childNodes.item(i);
                    var nodeName = item.nodeName;
                    if (typeof(obj[nodeName]) === "undefined") { //$NON-NLS-0$
                        var tmp = xmlToJson(item);
                        if (tmp !== "") // if not empty string
                            obj[nodeName] = tmp;
                    } else {
                        if (typeof(obj[nodeName].push) === "undefined") { //$NON-NLS-0$
                            var old = obj[nodeName];
                            obj[nodeName] = [];
                            obj[nodeName].push(old);
                        }
                        tmp = xmlToJson(item);
                        if (tmp !== "") // if not empty string
                            obj[nodeName].push(tmp);
                    }
                }
            }
            return obj;
        }

        function rulesForCssText (styleContent) {
            var doc = document.implementation.createHTMLDocument(""),
                styleElement = document.createElement("style");

            styleElement.textContent = styleContent;
            // the style will only be parsed once it is added to a document
            doc.body.appendChild(styleElement);

            return styleElement.sheet.cssRules;
        }

        var ImportThemeDialog = function(options) {
            options = options || {};
            this.options = options;
            objects.mixin(this, options);
            this._init(options);
        };
        ImportThemeDialog.prototype = new dialog.Dialog();
        objects.mixin(ImportThemeDialog.prototype, {
            TEMPLATE: ImportThemeDialogTemplate,
            _init: function(options) {
                this.title = messages["Import a theme"]; //$NON-NLS-1$
                this.buttons = [
                    /*{ text: "Import from a URL", callback: this.urlButtonClicked.bind(this), id: "urlThemeImportBtn" }, Hidden for now*/
                    { text: messages["Import"], isDefault: true, callback: this.importFromTextarea.bind(this), id: "textAreaImportBtn" } //$NON-NLS-1$
                ];
                this.modal = true;
                this.firstFocus = "fileInputLabel"; //$NON-NLS-0$

                this._initialize();
            },
            _bindToDom: function() {
                this.$importButton = this.$buttonContainer.firstChild;
                this.$importButton.classList.add("disabled"); //$NON-NLS-0$
                lib.setSafeAttribute(this.$importButton, "disabled", "disabled");
                this.appendThemeList();
            },
            appendThemeList: function() {
                var docFragment = document.createDocumentFragment(),
                    importInput = document.createElement("input"),
                    importLabel = document.createElement("label"),
                    dropZone = document.createElement("div"), //$NON-NLS-0$
                    textBox = document.createElement("textarea"); //$NON-NLS-0$

                importInput.id = "fileInput";
                importInput.className = "visuallyhidden"; //$NON-NLS-0$
                importInput.type = "file";
                importInput.tabIndex = -1;
                importInput.addEventListener("change", this.importOnSelect.bind(this));
                docFragment.appendChild(importInput);

                importLabel.id = "fileInputLabel";
                importLabel.className = "orionButton commandButton";
                importLabel.tabIndex = 0;
                importLabel.htmlFor = importInput.id;
                lib.setSafeInnerHTML(importLabel, messages["importThemeButton"]);
                importLabel.addEventListener("keydown", function(e) { //$NON-NLS-0$
					if (e.keyCode === lib.KEY.SPACE) {
						importLabel.click();
					}
				}, false);
                docFragment.appendChild(importLabel);

                dropZone.className = "drop-zone"; //$NON-NLS-0$
                dropZone.id = "dropZone"; //$NON-NLS-0$
                lib.setSafeAttribute(dropZone, "aria-label", messages["Drop Theme File:"]);
                dropZone.textContent = messages["dndTheme"];
                docFragment.appendChild(dropZone);

                dropZone.addEventListener("dragenter", this.dragEnter.bind(this)); //$NON-NLS-0$
                dropZone.addEventListener("dragleave", this.dragLeave.bind(this)); //$NON-NLS-0$
                dropZone.addEventListener("dragover", this.dragOver.bind(this)); //$NON-NLS-0$
                dropZone.addEventListener("drop", this.dragAndDropped.bind(this)); //$NON-NLS-0$

                textBox.rows = "4"; //$NON-NLS-0$
                textBox.cols = "35"; //$NON-NLS-0$
                lib.setSafeAttribute(textBox, "aria-label", messages["Paste Theme:"]);
                textBox.placeholder = messages["textTheme"];
                textBox.id = "themeText"; //$NON-NLS-0$
                textBox.addEventListener("input", this.watchTextarea.bind(this)); //$NON-NLS-0$

                docFragment.appendChild(textBox);
                lib.setSafeInnerHTML(this.$importThemeMessage, messages["ImportThemeDialogMessage"]);
                this.$importThemeContainer.appendChild(docFragment, null);
                lib.setSafeAttribute(this.$frame, "aria-describedby", "importThemeMessage");
            },
            watchTextarea: function() {
                var textArea = document.getElementById("themeText"); //$NON-NLS-0$
                if (textArea.value.length > 0) {
                    this.$importButton.classList.remove("disabled"); //$NON-NLS-0$
	                this.$importButton.removeAttribute("disabled"); //$NON-NLS-0$
                } else {
                    this.$importButton.classList.add("disabled"); //$NON-NLS-0$
                    lib.setSafeAttribute(this.$importButton, "disabled", "disabled");
                }
            },
            dragEnter: function(e) {
                var dropZone = document.getElementById("dropZone"); //$NON-NLS-0$
                dropZone.className = "drop-zone over"; //$NON-NLS-0$
            },
            dragLeave: function(e) {
                var dropZone = document.getElementById("dropZone"); //$NON-NLS-0$
                dropZone.className = "drop-zone"; //$NON-NLS-0$
            },
            dragOver: function(e) {
                e.stopPropagation();
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy"; //$NON-NLS-0$
            },
            dragAndDropped: function(e) {
                e.stopPropagation();
                e.preventDefault();

                var file = e.dataTransfer.files[0],
                    reader = new FileReader(),
                    self = this;

                reader.onloadend = function(e) {
                    if (e.target.readyState === FileReader.DONE) {
                        var dropZone = document.getElementById("dropZone"); //$NON-NLS-0$
                        dropZone.className = "drop-zone"; //$NON-NLS-0$
                        self.importTheme(self, e.target.result);
                    }
                };
                reader.readAsText(file);
            },
            importOnSelect: function(e) {
                e.stopPropagation();
                e.preventDefault();
                var file = e.target.files[0],
                    reader = new FileReader(),
                    self = this;

                reader.onloadend = function(e) {
                    if (e.target.readyState === FileReader.DONE) {
                        self.importTheme(self, e.target.result);
                    }
                };
                reader.readAsText(file);
            },
            importFromTextarea: function() {
                var styles = document.getElementById("themeText").value; //$NON-NLS-0$
                if (styles.length) {
                    this.importTheme(this, styles);
                }
            },
            importTheme: function(commandInvocation, styles) {
                importTheme(commandInvocation, styles);
            },
            closeButtonClicked: function() {
                this.hide();
            },
            urlButtonClicked: function() {
                var importURLdialog = new urlImportDialog.showUrlImportDialog({
                    title: "Import theme from a URL",
                    message: "A friendly explanation for the urls that can be used goes here",
                    func: this.onURL.bind(this, "Message to send")
                });
                this._addChildDialog(importURLdialog);
                importURLdialog.show();

            },
            onURL: function(huy, url) {
                alert(huy + " this.onURL.bind");
                alert(url);
            }
        });

        function showImportThemeDialog(data) {
            new ImportThemeDialog(data).show();
        }
        ThemeImporter.prototype.showImportThemeDialog = showImportThemeDialog;

        function importSublimeTheme(xml) {
            var themeJson = xmlToJson(xml); //convert to Json
            var dictKey = themeJson.plist[1].dict.array.dict[0].dict.key;
            var dictString = themeJson.plist[1].dict.array.dict[0].dict.string;

            var bgColor = getBackgroundColor(dictKey, dictString);
            var useDarkBase = calculateLuminance(bgColor) < luminanceDarkLimit;
            var newStyle = themeData.getBaseTheme({dark: useDarkBase});

            //finds the general attributes
            for (var i = 0; i < dictKey.length; i++) {
                if (dictKey[i]["#text"] === "background" && dictString[i]["#text"].length < 8) { //$NON-NLS-0$
                    newStyle.styles.backgroundColor = dictString[i]["#text"];
                }
                else if (dictKey[i]["#text"] === "foreground" && dictString[i]["#text"].length < 8) { //$NON-NLS-0$
                    newStyle.styles.color = dictString[i]["#text"];
                }
                else if (dictKey[i]["#text"] === "lineHighlight" && dictString[i]["#text"].length < 8) { //$NON-NLS-0$
                    newStyle.styles.annotationLine.currentLine.backgroundColor = dictString[i]["#text"];
                }////annotationRange matchingSearch
                else if (dictKey[i]["#text"] === "selection" && dictString[i]["#text"].length < 8) { //$NON-NLS-0$
                    newStyle.styles.annotationRange.matchingSearch.backgroundColor = dictString[i]["#text"];
                    newStyle.styles.annotationRange.matchingSearch.currentSearch.backgroundColor = dictString[i]["#text"];
                    newStyle.styles.textviewSelection.backgroundColor = dictString[i]["#text"];
                    newStyle.styles["textviewContent ::selection"].backgroundColor = dictString[i]["#text"];
                    newStyle.styles["textviewContent ::-moz-selection"].backgroundColor = dictString[i]["#text"];
                }
            }

            //finds the name tag
            for (i = 0; i < themeJson.plist[1].dict.key.length; i++) {
                if (themeJson.plist[1].dict.key[i]["#text"] === "name") { //$NON-NLS-0$
                    newStyle.name = themeJson.plist[1].dict.string[i]["#text"];
                    newStyle.className = newStyle.name.replace(/\s+/g, '');
                }
            }

            //finds the scope attributes
            var restKey = themeJson.plist[1].dict.array.dict;

            for (i = 1; i < restKey.length; i++) {
                try {
                    var target = restKey[i].string[0]["#text"].split(",");
                    var targetKey = "";
                    for (var k = 0; k < target.length; k++) {
                        targetKey = target[k].trim();
                        if (targetKey === "Comment") { //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (var l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.comment.color = restKey[i].dict.string[l]["#text"];
                                        newStyle.styles.comment.block.color = restKey[i].dict.string[l]["#text"];
                                        newStyle.styles.comment.line.color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.comment.color = restKey[i].dict.string["#text"];
                                    newStyle.styles.comment.block.color = restKey[i].dict.string["#text"];
                                    newStyle.styles.comment.line.color = restKey[i].dict.string["#text"];
                                }
                            }
                        }
                        else if (targetKey === "Keyword") { //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.keyword.control.color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.keyword.control.color = restKey[i].dict.string["#text"];
                                }
                            }
                        }
                        else if (targetKey === "Tag name") { //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.meta.tag.color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.meta.tag.color = restKey[i].dict.string["#text"];
                                } else {
                                    newStyle.styles.meta.tag.color = newStyle.styles.color;
                                }
                            }
                        }
                        else if (targetKey === "Tag attribute") { //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.meta.tag.attribute.color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.meta.tag.attribute.color = restKey[i].dict.string["#text"];
                                } else {
                                    newStyle.styles.meta.tag.attribute.color = newStyle.styles.color;
                                }
                            }
                        }
                        else if (targetKey === "HTML: Doctype") { //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.meta.tag.doctype = {};
                                        newStyle.styles.meta.tag.doctype.color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.meta.tag.doctype = {};
                                    newStyle.styles.meta.tag.doctype.color = restKey[i].dict.string["#text"];
                                }
                            }
                        }
                        else if (targetKey === "CSS: Property") { //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.support.type.propertyName.color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.support.type.propertyName.color = restKey[i].dict.string["#text"];
                                }
                            }
                        }
                        else if (targetKey === "Variable" || targetKey === "Function argument") { //$NON-NLS-1$ //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.variable.language.color = restKey[i].dict.string[l]["#text"];
                                        newStyle.styles.variable.other.color = restKey[i].dict.string[l]["#text"];
                                        newStyle.styles.variable.parameter.color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.variable.language.color = restKey[i].dict.string["#text"];
                                    newStyle.styles.variable.other.color = restKey[i].dict.string["#text"];
                                    newStyle.styles.variable.parameter.color = restKey[i].dict.string["#text"];
                                }
                            }
                        }
                        else if (targetKey === "Constant" || targetKey === "Number") { //$NON-NLS-1$ //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.constant.color = restKey[i].dict.string[l]["#text"];
                                        newStyle.styles.constant.numeric.color = restKey[i].dict.string[l]["#text"];
                                        newStyle.styles.constant.numeric.hex.color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.constant.color = restKey[i].dict.string["#text"];
                                    newStyle.styles.constant.numeric.color = restKey[i].dict.string["#text"];
                                    newStyle.styles.constant.numeric.hex.color = restKey[i].dict.string["#text"];
                                }
                            }
                        }
                        else if (targetKey === "String") { //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.string.color = restKey[i].dict.string[l]["#text"];
                                        newStyle.styles.string.quoted.single.color = restKey[i].dict.string[l]["#text"];
                                        newStyle.styles.string.quoted.double.color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.string.color = restKey[i].dict.string["#text"];
                                    newStyle.styles.string.quoted.single.color = restKey[i].dict.string["#text"];
                                    newStyle.styles.string.quoted.double.color = restKey[i].dict.string["#text"];
                                }
                            }
                        }
                        else if (targetKey === "Storage" || targetKey === "Storage type") { //$NON-NLS-1$ //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.keyword.operator.color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.keyword.operator.color = restKey[i].dict.string["#text"];
                                }
                            }
                        }
                        else if (targetKey === "Function" || targetKey === "Entity" || targetKey === "Function name") { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.entity.name.color = restKey[i].dict.string[l]["#text"];
                                        newStyle.styles.entity.name["function"].color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.entity.name.color = restKey[i].dict.string["#text"];
                                        newStyle.styles.entity.name["function"].color = restKey[i].dict.string["#text"];
                                }
                            }
                        }
                        else if (targetKey === "Markdown Titles" || targetKey === "Headings") { //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.markup.heading.color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.markup.heading.color = restKey[i].dict.string["#text"];
                                }
                            }
                        }
                        else if (targetKey === "String" || targetKey === "Markdown Raw") { //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.markup.raw.color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.markup.raw.color = restKey[i].dict.string["#text"];
                                }
                            }
                        }
                        else if (targetKey === "Constants" || targetKey === "Constant") { //$NON-NLS-0$
                            if (restKey[i].dict.key instanceof Array) {
                                for (l = 0; l < restKey[i].dict.key.length; l++) {
                                    if (restKey[i].dict.key[l]["#text"] === "foreground") { //$NON-NLS-0$
                                        newStyle.styles.markup.other.separator.color = restKey[i].dict.string[l]["#text"];
                                        break;
                                    }
                                }
                            }
                            else {
                                if (restKey[i].dict.key["#text"] === "foreground") { //$NON-NLS-0$
                                    newStyle.styles.markup.other.separator.color = restKey[i].dict.string["#text"];
                                }
                            }
                        }

                        // Setting the ruler background and color to that of Sublime Text's ruler background and color
                        newStyle.styles.rulerLines.color = "#3d3d3d"; //$NON-NLS-0$
                        newStyle.styles.ruler.annotations.backgroundColor = "#1e1e1e"; //$NON-NLS-0$
                        newStyle.styles.ruler.backgroundColor = "#1e1e1e"; //$NON-NLS-0$
                        newStyle.styles.ruler.overview.backgroundColor = "#1e1e1e"; //$NON-NLS-0$

                        // Calculate luminance for the background color and decide on what background color to use for raw html based on it
                        newStyle.styles.markup.raw.html.backgroundColor = calculateLuminance(newStyle.styles.backgroundColor) < luminanceDarkLimit ? "#000000" : newStyle.styles.markup.raw.html.backgroundColor; //$NON-NLS-0$
                    }
                } catch(e) {}
            }

            return newStyle;
        }
        ThemeImporter.prototype.importSublimeTheme = importSublimeTheme;

        function calculateLuminance(c) {
            c = c.substring(1);      // strip #
            var rgb = parseInt(c, 16);   // convert rrggbb to decimal
            var r = (rgb >> 16) & 0xff;  // extract red
            var g = (rgb >>  8) & 0xff;  // extract green
            var b = (rgb >>  0) & 0xff;  // extract blue

            var luminence = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709

            return luminence;
        }
        ThemeImporter.prototype.calculateLuminance = calculateLuminance;

        function getBackgroundColor(styles, dictString) {
            if (styles[0].cssText) { /* this is a brackets style definition */
                var rules = styles;
                var scrollString = "-scroll";
                for (var i = 0; i < rules.length; i++) {
                    var classes = rules[i].selectorText.split(",");
                    for (var l = 0; l < classes.length; l++) {
                        try {
                            classes[l] = classes[l].trim();
                            if (classes[l].substr(classes[l].length - scrollString.length) === scrollString) { //$NON-NLS-0$
                                if (rules[i].style.background) {
                                    return colorToHex(rules[i].style.background);
                                }
                            }
                        } catch(e) {}
                    }
                }
                /* return default brackets background color if no color is specified */
                return "#f0f0f0";
            }

            /* presumably is a sublime style definition */
            for (i = 0; i < styles.length; i++) {
                if (styles[i]["#text"] === "background") { //$NON-NLS-0$
                    return dictString[i]["#text"];
                }
            }
			/* return default sublime background color if no color is specified */
            return "#1e1e1e";
        }
        ThemeImporter.prototype.getBackgroundColor = calculateLuminance;

        function importBracketsTheme(rules) {
            var bgColor = getBackgroundColor(rules);
            /* use a dark base theme if luminance is low (the theme being imported is dark) */
            var useDarkBase = calculateLuminance(bgColor) < luminanceDarkLimit;
            var newStyle = themeData.getBaseTheme({dark: useDarkBase});

            var activelineBgString = "-activeline-background",
                atomString = "-atom",
                attributeString = "-attribute",
                bracketString = "-bracket",
                commentString = "-comment",
                defString = "-def",
                guttersString = "-gutters",
                keywordString = "-keyword",
                lineNumString = "-linenumber",
                matchingBracketString = "-matchingbracket",
                metaString = "-meta",
                numberString = "-number",
                propertyString = "-property",
                scrollString = "-scroll",
                selectedString = "-selected",
                stringString = "-string",
                tagString = "-tag";

            for (var i = 0; i < rules.length; i++) {
                var classes = rules[i].selectorText.split(",");
                for (var l = 0; l < classes.length; l++) {
                    try {
                        classes[l] = classes[l].trim();

                        if (classes[l].substr(classes[l].length - scrollString.length) === scrollString) { //$NON-NLS-0$
                            if (rules[i].style.background) {
                                newStyle.styles.backgroundColor = colorToHex(rules[i].style.background);
                            }
                            if (rules[i].style.color) {
                                newStyle.styles.color = colorToHex(rules[i].style.color);
                            }
                        }
                        else if (classes[l].substr(classes[l].length - attributeString.length) === attributeString) { //$NON-NLS-0$
                            if (rules[i].style.color) {
                                newStyle.styles.meta.tag.attribute.color = colorToHex(rules[i].style.color);
                            }
                        }
                        else if (classes[l].substr(classes[l].length - commentString.length) === commentString) { //$NON-NLS-0$
                            if (rules[i].style.color) {
                                newStyle.styles.comment.color = colorToHex(rules[i].style.color);
                                newStyle.styles.comment.block.color = colorToHex(rules[i].style.color);
                                newStyle.styles.comment.line.color = colorToHex(rules[i].style.color);

                                // Brackets styles raw html in markdown as comments
                                newStyle.styles.markup.raw.code.color = newStyle.styles.comment.color;
                            }
                        }
                        else if (classes[l].substr(classes[l].length - stringString.length) === stringString) { //$NON-NLS-0$
                            if (rules[i].style.color) {
                                newStyle.styles.string.color = colorToHex(rules[i].style.color);
                                newStyle.styles.string.quoted.single.color = colorToHex(rules[i].style.color);
                                newStyle.styles.string.quoted.double.color = colorToHex(rules[i].style.color);
                            }
                        }
                        else if (classes[l].substr(classes[l].length - numberString.length) === numberString || classes[l].substr(classes[l].length - atomString.length) === atomString) { //$NON-NLS-1$ //$NON-NLS-0$
                            if (rules[i].style.color) {
                                newStyle.styles.constant.color = colorToHex(rules[i].style.color);
                                newStyle.styles.constant.numeric.color = colorToHex(rules[i].style.color);
                                newStyle.styles.constant.numeric.hex.color = colorToHex(rules[i].style.color);
                            }
                        }
                        else if (classes[l].substr(classes[l].length - propertyString.length) === propertyString) { //$NON-NLS-0$
                            if (rules[i].style.color) {
                                newStyle.styles.support.type.propertyName.color = colorToHex(rules[i].style.color);
                            }
                        }
                        else if (classes[l].substr(classes[l].length - defString.length) === defString) { //$NON-NLS-0$
                            if (rules[i].style.color) {
                                newStyle.styles.entity.name.color = colorToHex(rules[i].style.color);
                                newStyle.styles.entity.name["function"].color = colorToHex(rules[i].style.color);
                                newStyle.styles.variable.parameter.color = colorToHex(rules[i].style.color);
                                newStyle.styles.variable.other.color = colorToHex(rules[i].style.color);
                                newStyle.styles.variable.language.color = colorToHex(rules[i].style.color);
                            }
                        }
                        else if (classes[l].substr(classes[l].length - keywordString.length) === keywordString) { //$NON-NLS-0$
                            if (rules[i].style.color) {
                                newStyle.styles.keyword.control.color = colorToHex(rules[i].style.color);
                                newStyle.styles.keyword.operator.color = colorToHex(rules[i].style.color);
                            }
                        }
                        else if (classes[l].substr(classes[l].length - tagString.length) === tagString) { //$NON-NLS-0$
                            if (rules[i].style.color) {
                                newStyle.styles.meta.tag.color = colorToHex(rules[i].style.color);
                            }
                        }
                        else if (classes[l].substr(classes[l].length - metaString.length) === metaString) { //$NON-NLS-0$
                            if (rules[i].style.color) {
                                newStyle.styles.meta.tag.doctype = {};
                                newStyle.styles.meta.tag.doctype.color = colorToHex(rules[i].style.color);
                                newStyle.styles.meta.documentation.annotation.color = colorToHex(rules[i].style.color);
                            }
                        }
                        else if (classes[l].substr(classes[l].length - lineNumString.length) === lineNumString) { //$NON-NLS-0$
                            if (rules[i].style.color) {
                                newStyle.styles.rulerLines.color = colorToHex(rules[i].style.color);
                            }
                        }
                        else if (classes[l].substr(classes[l].length - activelineBgString.length) === activelineBgString) { //$NON-NLS-0$
                            if (rules[i].style.backgroundColor) {
                                newStyle.styles.annotationLine.currentLine.backgroundColor = rules[i].style.backgroundColor;
                            }
                            if (rules[i].style.borderTop) {
                                newStyle.styles.annotationLine.currentLine.borderTop = rules[i].style.borderTop;
                            }
                            if (rules[i].style.borderBottom) {
                                newStyle.styles.annotationLine.currentLine.borderBottom = rules[i].style.borderBottom;
                            }
                            if (rules[i].style.border) {
                                newStyle.styles.annotationLine.currentLine.border = rules[i].style.border;
                            }
                        }
                        else if (classes[l].substr(classes[l].length - matchingBracketString.length) === matchingBracketString) { //$NON-NLS-0$
                            if (rules[i].style.backgroundColor) {
                                newStyle.styles.annotationRange.matchingBracket.backgroundColor = rules[i].style.backgroundColor;
                                newStyle.styles.annotationRange.currentBracket.backgroundColor = rules[i].style.backgroundColor;
                            } else {
                                newStyle.styles.annotationRange.matchingBracket.backgroundColor = "transparent"; //$NON-NLS-0$
                                newStyle.styles.annotationRange.currentBracket.backgroundColor = "transparent"; //$NON-NLS-0$
                            }
                        }
                        else if (classes[l].substr(classes[l].length - selectedString.length) === selectedString) { //$NON-NLS-0$
                            if (rules[i].style.backgroundColor) {
                                newStyle.styles.textviewSelection.backgroundColor = rules[i].style.backgroundColor;
                                newStyle.styles["textviewContent ::selection"].backgroundColor = rules[i].style.backgroundColor;
                                newStyle.styles["textviewContent ::-moz-selection"].backgroundColor = rules[i].style.backgroundColor;
                            }
                        }
                        else if (classes[l].substr(classes[l].length - guttersString.length) === guttersString) { //$NON-NLS-0$
                            if (rules[i].style.backgroundColor) {
                                newStyle.styles.ruler.backgroundColor = colorToHex(rules[i].style.backgroundColor);
                                newStyle.styles.ruler.overview.backgroundColor = colorToHex(rules[i].style.backgroundColor);
                                newStyle.styles.ruler.annotations.backgroundColor = colorToHex(rules[i].style.backgroundColor);
                            }
                            if (rules[i].style.borderRight) {
                                newStyle.styles.textviewRightRuler.borderLeft = rules[i].style.borderRight;
                                newStyle.styles.textviewLeftRuler.borderRight = rules[i].style.borderRight;
                            }
                        }
                        else if (classes[l].substr(classes[l].length - bracketString.length) === bracketString) { //$NON-NLS-0$
                            if (rules[i].style.color) {
                                newStyle.styles.punctuation.block.color = colorToHex(rules[i].style.color);
                            }
                        }
                    } catch(e) {}
                }
            }

            // Ask the user to name the theme since css files contain no theme name information
            var themeName = prompt && prompt(messages["nameImportedTheme"], messages["defaultImportedThemeName"]) || messages["defaultImportedThemeName"];
            newStyle.name = themeName;
            newStyle.className = themeName;

            return newStyle;
        }
        ThemeImporter.prototype.importBracketsTheme = importBracketsTheme;

        function importEclipseTheme(xml) {
            /* use a dark base theme if luminance is low (the theme being imported is dark) */
            var useDarkBase = calculateLuminance(getValuesFromXML(xml, "background")) < luminanceDarkLimit;
            var newStyle = themeData.getBaseTheme({dark: useDarkBase});

            var styles = newStyle.styles;

            // Set the background and text colors
            styles.backgroundColor = getValuesFromXML(xml, "background");
            styles.color = getValuesFromXML(xml, "foreground");

            styles.comment.color = getValuesFromXML(xml, "singleLineComment");
            styles.annotationLine.currentLine.backgroundColor = getValuesFromXML(xml, "currentLine");
            styles.annotationLine.highlightedLine.backgroundImage = getValuesFromXML(xml, "highlightedLine");

            // Eclipse themes do not set the background color for matching brackets. Instead, they set a border for the matching bracket.
            styles.annotationRange.matchingBracket.backgroundColor = "transparent";
            styles.annotationRange.currentBracket.backgroundColor = styles.annotationRange.matchingBracket.backgroundColor;
            styles.annotationRange.matchingBracket.borderColor = getValuesFromXML(xml, "bracket");
            styles.annotationRange.matchingBracket.borderWidth = "1px";
            styles.annotationRange.matchingBracket.borderStyle = "solid";

            // Set the bracket color to be the same as border color
            styles.punctuation = {};
            styles.punctuation.section = {};
            styles.punctuation.section.color = styles.annotationRange.matchingBracket.borderColor;


            styles.annotationRange.writeOccurrence.backgroundColor = getValuesFromXML(xml, "writeOccurrenceIndication");
            styles.annotationRange.searchRange.backgroundColor = getValuesFromXML(xml, "searchRangeIndication");
            styles.constant.color = getValuesFromXML(xml, "constant");
            styles.entity.name.color = getValuesFromXML(xml, "class");
            styles.entity.name.function.color = getValuesFromXML(xml, "class");
            styles.entity.name.function.fontWeight = getValuesFromXML(xml, "class", 1);
            styles.entity.other["attribute-name"].color = styles.entity.name.function.color;
            styles.keyword.control.color = getValuesFromXML(xml, "keyword");
            styles.keyword.control.fontWeight = getValuesFromXML(xml, "keyword", 1);
            styles.keyword.operator.color = styles.keyword.control.color;

            // Set language variable to the same color as keywords since Eclipse doesn't make a distrinction between the two
            styles.variable.language.color = styles.keyword.operator.color;

            // Setting JAVA-specific keyword styling for certain words
            styles.constantDeclaration = {};
            styles.constantDeclaration.keyword = {};
            styles.constantDeclaration.keyword.color = getValuesFromXML(xml, "sourceHoverBackground");

            // "TO DO" task styling
            styles.keyword.other.documentation.task.color = getValuesFromXML(xml, "commentTaskTag");

            // HTML tag styling
            styles.meta.tag.color = getValuesFromXML(xml, "localVariableDeclaration");
            styles.meta.tag.doctype = {};
            styles.meta.tag.doctype.color = getValuesFromXML(xml, "method");

            // HTML tag attribute styling
            styles.meta.tag.attribute.color = getValuesFromXML(xml, "javadocTag");

            styles.string.color = getValuesFromXML(xml, "string");

            // Jade-specific. Eclipse themes don't know about Jade
            styles.string.interpolated.color = styles.string.color;

            // Setting the CSS property name color to string color since Eclipse themese don't style CSS
            styles.support.type.propertyName.color = styles.string.color;

            // Eclipse themes set a different color specifically for numeric values.
            styles.constant.numeric = {};
            styles.constant.numeric.color = getValuesFromXML(xml, "number");

            styles.textviewSelection.backgroundColor = getValuesFromXML(xml, "selectionBackground");
            styles["textviewContent ::selection"].backgroundColor = styles.textviewSelection.backgroundColor;
            styles["textviewContent ::-moz-selection"].backgroundColor = styles.textviewSelection.backgroundColor;

            // No quicksearch in Eclipse, so setting the search background same as selection background
            styles.annotationRange.matchingSearch.backgroundColor = styles.textviewSelection.backgroundColor;
            styles.annotationRange.matchingSearch.currentSearch.backgroundColor = styles.textviewSelection.backgroundColor;

            // No ruler background styling in Eclipse so settings the styles same as regular background
            styles.ruler.annotations.backgroundColor = styles.backgroundColor;
            styles.ruler.backgroundColor = styles.backgroundColor;
            styles.ruler.overview.backgroundColor = styles.backgroundColor;

            // Line number color
            styles.rulerLines.color = getValuesFromXML(xml, "lineNumber");

            // Setting the border to the same color as the line number since this is how it works in Eclipse
            styles.textviewLeftRuler.borderColor = styles.rulerLines.color;
            styles.textviewRightRuler.borderColor = styles.rulerLines.color;

            // Get the theme name
            newStyle.name = xml.getElementsByTagName("colorTheme")[0].attributes[1].value;
            newStyle.className = xml.getElementsByTagName("colorTheme")[0].attributes[1].value;

            return newStyle;
        }
        ThemeImporter.prototype.importEclipseTheme = importEclipseTheme;

        function importTheme(data, styles) {
            var body = styles;
            var rules = "", newStyle = "";
            var xml = parseToXML(body);
            if (!xml) {
                rules = rulesForCssText(body);
            }

            if (rules.length !== 0) {
                newStyle = importBracketsTheme(rules);
            }
            else if (xml && xml.children[0].tagName === "plist") { //$NON-NLS-0$ //assume it uses tmTheme structure [sublime, textmate, etc]
                newStyle = importSublimeTheme(xml);
            }
            else if (xml && xml.children[0].tagName === "colorTheme") { //this is an Eclipse theme
                newStyle = importEclipseTheme(xml);
            } else if (xml) {
                /* old-style theme definition */
                newStyle = {};

                newStyle.name = xml.getElementsByTagName("colorTheme")[0].attributes[1].value;
                newStyle.annotationRuler = xml.getElementsByTagName("background")[0].attributes[0].value;
                newStyle.background = xml.getElementsByTagName("background")[0].attributes[0].value;
                newStyle.comment = xml.getElementsByTagName("singleLineComment")[0].attributes[0].value;
                newStyle.keyword = xml.getElementsByTagName("keyword")[0].attributes[0].value;
                newStyle.text = xml.getElementsByTagName("foreground")[0].attributes[0].value;
                newStyle.string = xml.getElementsByTagName("string")[0].attributes[0].value;
                newStyle.overviewRuler = xml.getElementsByTagName("background")[0].attributes[0].value;
                newStyle.lineNumberOdd = xml.getElementsByTagName("lineNumber")[0].attributes[0].value;
                newStyle.lineNumberEven = xml.getElementsByTagName("lineNumber")[0].attributes[0].value;
                newStyle.lineNumber = xml.getElementsByTagName("lineNumber")[0].attributes[0].value;
                newStyle.currentLine = xml.getElementsByTagName("selectionBackground")[0].attributes[0].value;
            } else {
                /* parsing the data as xml failed, now try the new-style theme definition (JSON) */
                try {
                    newStyle = JSON.parse(body);
                } catch (e) {}
            }

            if (newStyle) {
                data.options.items.saveTheme(newStyle);
                data.hide();
            } else {
                if (!document.getElementById("themeImportError")) {
                    var docFragment = document.createDocumentFragment(),
                        errorContainer = document.createElement("div"); //$NON-NLS-0$

                    errorContainer.className = "importerror"; //$NON-NLS-0$
                    errorContainer.id = "themeImportError"; //$NON-NLS-0$
                    errorContainer.textContent = messages["ImportThemeError"];
                    docFragment.appendChild(errorContainer);

                    document.getElementById("importThemeContainer").appendChild(docFragment, null); //$NON-NLS-0$
                }
            }
        }
        ThemeImporter.prototype.importTheme = importTheme;

        function getValuesFromXML(xml, tagName, attrId) {
            var attr = attrId || 0;
            var element = xml.getElementsByTagName(tagName)[0],
                returnValue;

            if (element) {
                var elementAttribute = element.attributes[attr] !== undefined ? element.attributes[attr] : false;
                if (elementAttribute && elementAttribute.name === "bold" && elementAttribute.value === "true") {
                    return "bold";
                } else if (elementAttribute && elementAttribute.name === "bold" && elementAttribute.value === "false") {
                    return "normal";
                }

                returnValue = elementAttribute !== undefined ? elementAttribute.value : "normal";
                return returnValue;
            }
        }
        ThemeImporter.prototype.getValuesFromXML = getValuesFromXML;

        return {
            ThemeImporter:ThemeImporter
        };
    }
);
