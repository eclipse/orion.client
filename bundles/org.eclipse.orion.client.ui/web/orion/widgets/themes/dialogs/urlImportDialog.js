/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!orion/widgets/nls/messages', 'orion/webui/dialog', 'orion/fileUtils', 'orion/selection', 'orion/explorers/explorer', 'orion/explorers/explorer-table'],
function(messages, dialog, mFileUtils, mSelection, mExplorer, mExplorerTable) {

    function URLPrompterRenderer (options, explorer) {
        this.explorer = explorer;
        this._init(options);
    }
    URLPrompterRenderer.prototype = new mExplorer.SelectionRenderer();
    URLPrompterRenderer.prototype.constructor = URLPrompterRenderer;
    URLPrompterRenderer.prototype.getLabelColumnIndex = function() {
        return 0;
    };

    /**
    * @param options {{
            func : function(item)     Function to be called with the selected item
            message : String          (Optional) Message to display in dialog.
            title : String            (Optional) Dialog title.
        }}
     */

    function URLPrompterDialog(options) {
        this._init(options);
    }

    URLPrompterDialog.prototype = new dialog.Dialog();

    URLPrompterDialog.prototype.TEMPLATE =
        '<div id="message" style="width: 25em; padding-bottom: 5px;"></div>' + //$NON-NLS-0$
        '<div id="themeImportUrlContainer">' + //$NON-NLS-0$
            '<input id="themeImportUrlInput" type="text" />' + //$NON-NLS-0$
        '</div>'; //$NON-NLS-0$

    URLPrompterDialog.prototype._init = function(options) {
        this.title = options.title;
        this.modal = true;
        this.buttons = [{text: "Import", isDefault: true, callback: this.done.bind(this)}];
        this.customFocus = true;
        this._fileClient = options.fileClient;
        this._serviceRegistry = options.serviceRegistry;
        this._message = options.message || "";
        this._func = options.func;
        this._initialize();
    };

    URLPrompterDialog.prototype._bindToDom = function(parent) {
        if (this._message) {
            this.$message.appendChild(document.createTextNode(this._message));
        } else {
            this.$message.style.display = "none"; //$NON-NLS-0$
        }
        this.$themeImportUrlInput.focus();
    };

    URLPrompterDialog.prototype.done = function() {
        this.hide();
        this._func("returning from urlImportDialog.js huyidze!!!!!!");
    };

    URLPrompterDialog.prototype.constructor = URLPrompterDialog;
    //return the module exports
    return {showUrlImportDialog: URLPrompterDialog};

});
