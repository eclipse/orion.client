/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd */
define(['orion/collab/collabPeer', 'orion/collab/ot', 'orion/uiUtils'], function(mCollabPeer, ot, mUIUtils) {

    'use strict';

    var CollabPeer = mCollabPeer.CollabPeer;
    var TextOperation = ot.TextOperation;
    var Selection = ot.Selection;

    var INPUT_CHANGED_EVENT_INTERVAL = 250;

    var EDITING_FLAG_DURATION = 1000;

	var contextPath = location.pathname.substr(0, location.pathname.lastIndexOf('/edit/edit.html'));

    /**
     * The abstract socket adapter for OT
     *
     * @abstract
     * @class
     * @name orion.collab.OrionSocketAdapter
     *
     * @param {orion.collabClient.CollabClient} collabClient
     */
    var OrionSocketAdapter = function(collabClient) {
        this.collabClient = collabClient;
        this.callbacks = [];
        this.ignoreNextOperation = false;
    };

    OrionSocketAdapter.prototype.constructor = OrionSocketAdapter;
    
    /**
     * Send authenticate message
     */
    OrionSocketAdapter.prototype.authenticate = function() {
        var msg = {
            'type': 'authenticate',
            'token': JSON.parse(localStorage.getItem('orion.user')).jwt,
            'clientId': this.collabClient.getClientId()
        };
        this.send(JSON.stringify(msg));
    };

    /**
     * Send text
     * 
     * Implement this.
     *
     * @param {string} text
     */
    OrionSocketAdapter.prototype.send = function(text) {
        throw new Error('Not implemented.');
    };

    /**
     * Message handler
     *
     * @param {Object} msg
     */
    OrionSocketAdapter.prototype._onMessage = function(msg) {
        if (msg.doc) {
            this._onDocMessage(msg);
        } else {
            this._onSessionMessage(msg);
        }
    };

    /**
     * Document Message handler
     *
     * @param {Object} msg
     */
    OrionSocketAdapter.prototype._onDocMessage = function(msg) {
        if (!this.collabClient.textView) {
            return;
        }
        if (msg.type === "selection" && msg.selection !== null) {
            this.collabClient.otOrionAdapter.destroyCollabAnnotations(msg.clientId);
            if (msg.clientId === this.collabClient.getClientId() && msg.doc !== this.collabClient.currentDoc()) {
                this.sendSelection(null);
            }
        }
        if (msg.doc !== this.collabClient.currentDoc()) {
                return;
        }
        switch(msg.type) {
            case "init-document":
                this.collabClient.startOT(msg.revision, msg.operation, msg.clients);
                this.collabClient.awaitingClients = false;
                break;
            case "ack":
                this.trigger('ack');
                break;
            case "operation":
                if (msg.guid === this.collabClient.guid) {
                    break;
                }
                this.ignoreNextOperation = true;
                try {
                    this.trigger('operation', msg.operation);
                } catch (ex) {
                    this.sendInit();
                } finally {
                    this.ignoreNextOperation = false;
                }
                this.collabClient.editor.markClean();
                break;
            case "selection":
                this.trigger('selection', msg.clientId, msg.selection);
                break;
            case "reconnect":
                this.trigger('reconnect');
                break;
        }
    };

    /**
     * Session Message handler
     *
     * @param {Object} msg
     */
    OrionSocketAdapter.prototype._onSessionMessage = function(msg) {
        var type = msg.type;
        switch (type) {
            case 'file-operation':
                this.collabClient.handleFileOperation(msg);
                break;
        }
    };

    /**
     * Send the initial message
     */
    OrionSocketAdapter.prototype.sendInit = function() {
        var msg = {
            'type': 'join-document',
            'doc': this.collabClient.currentDoc(),
            'clientId': this.collabClient.getClientId()
        };

        this.send(JSON.stringify(msg));
    }

    /**
     * Send OT operation
     * @param {number} revision
     * @param {OT.Operation} operation
     * @param {OT.Selection} selection
     */
    OrionSocketAdapter.prototype.sendOperation = function(revision, operation, selection) {
        if (this.ignoreNextOperation) {
            return;
        }
        var myDoc = this.collabClient.currentDoc();
        var msg = {
            'type': 'operation',
            'revision': revision,
            'operation': operation,
            'selection': selection,
            'doc': myDoc,
            'clientId': this.collabClient.getClientId(),
            'guid': this.collabClient.guid
        };
        this.send(JSON.stringify(msg));
        this.collabClient.editor.markClean();
    };

    /**
     * Send OT selection
     * @param {OT.Selection} selection
     */
    OrionSocketAdapter.prototype.sendSelection = function (selection) {
        var myDoc = this.collabClient.currentDoc();
        var msg = {
            'type': 'selection',
            'selection': selection,
            'doc': myDoc,
            'clientId': this.collabClient.getClientId()
        };
        this.send(JSON.stringify(msg));
    };

    /**
     * Register callbacks.
     * We won't use EventTarget because OT uses registerCallbacks/trigger to
     * perform event operations.
     *
     * @param {Object.<string, (Function|Array.<Function>)>} cb - callbacks
     */
    OrionSocketAdapter.prototype.registerCallbacks = function (cb) {
        this.callbacks = cb;
    };

    /**
     * Trigger an event.
     *
     * @param {Object} event
     */
    OrionSocketAdapter.prototype.trigger = function (event) {
        if (!this.collabClient.textView) return;
        var args = Array.prototype.slice.call(arguments, 1);
        var action = this.callbacks && this.callbacks[event];
        if (action) { action.apply(this, args); }
    };

    /**
     * The socket adapter for OT using CollabSocket as the communitation socket
     *
     * @class
     * @extends orion.collab.OrionSocketAdapter
     * @name orion.collab.OrionCollabSocketAdapter
     *
     * @param {orion.collabClient.CollabClient} client
     * @param {orion.collabClient.CollabSocket} socket
     */
    var OrionCollabSocketAdapter = function(client, socket) {
        OrionSocketAdapter.call(this, client);

        var self = this;
        this.socket = socket;
        this.authenticated = false;

        // Register incoming message handler
        this.socket.addEventListener('message', function(e) {
            self._onMessage(JSON.parse(e.data));
        });
    };

    OrionCollabSocketAdapter.prototype = Object.create(OrionSocketAdapter.prototype);
    OrionCollabSocketAdapter.prototype.constructor = OrionCollabSocketAdapter;

    /**
     * Send text
     *
     * @param {string} text
     */
    OrionCollabSocketAdapter.prototype.send = function(text) {
        this.socket.send(text);
    };

    /**
     * Session Message handler
     *
     * @param {Object} msg
     */
    OrionCollabSocketAdapter.prototype._onDocMessage = function(msg) {
        switch (msg.type) {
            case 'client-joined-doc':
                // Add new client to OT
                this.trigger('client_joined', msg.clientId, this.collabClient.getPeer(msg.clientId));
                break;

            case 'client-left-doc':
                // Clear this client's line annotation
                this.trigger('client_left', msg.clientId);
                break;

            default:
                OrionSocketAdapter.prototype._onDocMessage.call(this, msg);
                break;
        }
    };

    /**
     * Session Message handler
     *
     * @param {Object} msg
     */
    OrionCollabSocketAdapter.prototype._onSessionMessage = function(msg) {
        switch(msg.type) {
            case 'authenticated':
                // Do some initialization
                this.authenticated = true;
                this.collabClient.sendCurrentLocation();
                this.updateClient({
                    name: this.collabClient.getClientDisplayedName()
                });
                this.send(JSON.stringify({
                    type: 'get-clients'
                }));
                if (this.collabClient.textView) {
					this.collabClient.viewInstalled();
                }
                break;

            case 'client-joined':
            case 'client-updated':
                this.collabClient.addOrUpdatePeer(new CollabPeer(msg.clientId, msg.name, msg.color));
                if (msg.location) {
                    this.collabClient.addOrUpdateCollabFileAnnotation(msg.clientId, contextPath, msg.location, msg.editing);
                } else {
                    this.collabClient.addOrUpdateCollabFileAnnotation(msg.clientId, contextPath,'', msg.editing);
                }
                break;

            case 'client-left':
                this.collabClient.removePeer(msg.clientId);
                break;

            default:
                OrionSocketAdapter.prototype._onSessionMessage.call(this, msg);
                break;
        }
    };

    /**
     * Send current location to the server
     * 
     * @param {string} location
     */
    OrionCollabSocketAdapter.prototype.sendLocation = function(location) {
        this.send(JSON.stringify({
            type: 'update-client',
            location: location,
            editing: this.collabClient.editing
        }));
    };

    /**
     * Update this client's info to the server
     * 
     * @param {Object} clientData - fields to update
     */
    OrionCollabSocketAdapter.prototype.updateClient = function(clientData) {
        clientData.type = 'update-client';
        this.send(JSON.stringify(clientData));
    };

    var OrionEditorAdapter = function (editor, collabClient, annotationTypes) {
        this.editor = editor;
        this.orion = editor.getTextView();
        this.model = editor.getModel();
        this.ignoreNextChange = false;
        this.changeInProgress = false;
        this.selectionChanged = false;
        this.myLine = 0;
        this.deleteContent = "";
        this.AT = annotationTypes;
        this.annotations = {};
        this.collabClient = collabClient;
        this.inputChangedRequested = false;
        this.collabClient.editing = false;
        this.editingTimeout = 0;

        this.destroyCollabAnnotations();

        this._onChanging = this.onChanging.bind(this);
        this._onChanged = this.onChanged.bind(this);
        this._onCursorActivity = this.onCursorActivity.bind(this);
        this._onFocus = this.onFocus.bind(this);
        this._onBlur = this.onBlur.bind(this);
        this._selectionListener = this.selectionListener.bind(this);

        this.model.addEventListener('Changing', this._onChanging);
        this.model.addEventListener('Changed', this._onChanged);
        this.orion.addEventListener('cursorActivity', this._onCursorActivity);
        this.orion.addEventListener('Focus', this._onFocus);
        this.orion.addEventListener('blur', this._onBlur);
        this.orion.addEventListener('Selection', this._selectionListener);
    }

    // Removes all event listeners from the Orion instance.
    OrionEditorAdapter.prototype.detach = function () {
        this.model.removeEventListener('Changing', this._onChanging);
        this.model.removeEventListener('Changed', this._onChanged);
        this.orion.removeEventListener('cursorActivity', this._onCursorActivity);
        this.orion.removeEventListener('Focus', this._onFocus);
        this.orion.removeEventListener('blur', this._onBlur);
        this.orion.removeEventListener('Selection', this._selectionListener);
    };

    // Converts a Orion change array (as obtained from the 'changes' event
    // in Orion v4) or single change or linked list of changes (as returned
    // by the 'change' event in Orion prior to version 4) into a
    // TextOperation and its inverse and returns them as a two-element array.
    OrionEditorAdapter.prototype.operationFromOrionChanges = function (changes, doc, deletedText) {
        // Approach: Replay the changes, beginning with the most recent one, and
        // construct the operation and its inverse. We have to convert the position
        // in the pre-change coordinate system to an index. We have a method to
        // convert a position in the coordinate system after all changes to an index,
        // namely Orion's `indexFromPos` method. We can use the information of
        // a single change object to convert a post-change coordinate system to a
        // pre-change coordinate system. We can now proceed inductively to get a
        // pre-change coordinate system for all changes in the linked list.
        // A disadvantage of this approach is its complexity `O(n^2)` in the length
        // of the linked list of changes.

        var docEndLength = this.model.getCharCount() - changes[0].addedCharCount + changes[0].removedCharCount;
        var operation    = new TextOperation().retain(docEndLength);
        var inverse      = new TextOperation().retain(docEndLength);

        for (var i = changes.length - 1; i >= 0; i--) {
            var change = changes[i];

            var fromIndex = change.start;
            var restLength = docEndLength - fromIndex - change.removedCharCount;

            operation = operation.compose(new TextOperation()
                .retain(fromIndex)
                ['delete'](change.removedCharCount)
                .insert(change.text)
                .retain(restLength)
            );

            if (change.addedCharCount && change.removedCharCount) {
            //REPLACE ACTION
            inverse = new TextOperation()
                .retain(fromIndex)
                ['delete'](change.addedCharCount)
                .insert(deletedText)
                .retain(restLength)
                .compose(inverse);
            } else if (change.addedCharCount) {
            //INSERT ACTION
            inverse = new TextOperation()
                .retain(fromIndex)
                ['delete'](change.addedCharCount)
                .retain(restLength)
                .compose(inverse);
            } else {
            //DELETE ACTION
            inverse = new TextOperation()
                .retain(fromIndex)
                .insert(deletedText)
                .retain(restLength)
                .compose(inverse);
            }

            docEndLength += change.removedCharCount - change.text.length;
        }

        return [operation, inverse];
    };

    /**
     *  Apply an operation to a Orion instance.
     * 
     * @throws {Error} operation bound check failed
     * 
     * @param {ot.Operation} operation -
     * @param {TextView} orion - 
     */
    OrionEditorAdapter.prototype.applyOperationToOrion = function (operation, orion) {
        var ops = operation.ops;
        var index = 0; // holds the current index into Orion's content
        var oldLine = this.myLine; // Track the current line before this operation
        var docLength = this.model.getCharCount(); // Track the doc length and verify it at the end
        for (var i = 0, l = ops.length; i < l; i++) {
            var op = ops[i];
            if (TextOperation.isRetain(op)) {
                index += op;
                if (index > docLength || index < 0) {
                    throw new Error('Invalid retain.');
                }
            } else if (TextOperation.isInsert(op)) {
                this.model.setText(op, index, i < (ops.length - 1) ? index : undefined);
                index += op.length;
                docLength += op.length;
                this.requestInputChangedEvent();
            } else if (TextOperation.isDelete(op)) {
                var from = index;
                var to   = index - op;
                docLength += op;
                if (to < 0) {
                    throw new Error('Invalid deletion');
                }
                this.model.setText('', from, to);
                this.requestInputChangedEvent();
            }
        }
        // Verify doc length
        if (index !== docLength) {
            throw new Error('Invalid doc length. Unsynchronized content.');
        }
        // Check if current line is changed
        var deltaLine = this.myLine - oldLine;
        if (deltaLine !== 0) {
            // Try to put the current line at the same position on the screen
            var lineHeight = this.collabClient.textView.getLineHeight();
			var deltaY = deltaLine * lineHeight;
            var originY = this.collabClient.textView.getTopPixel();
            this.collabClient.textView.setTopPixel(originY + deltaY);
        }
    };

    OrionEditorAdapter.prototype.registerCallbacks = function (cb) {
        this.callbacks = cb;

        // Give initial cursor position
        var cursor = this.editor.getSelection().start;
        this.selectionListener({
            newValue: {
                start: cursor
            }
        });
    };

    OrionEditorAdapter.prototype.onChanging = function (change) {
        // By default, Orion's event order is the following:
        // 1. 'ModelChanging', 2. 'ModelChanged'
        // We want to fire save the deleted/replaced text during a 'modelChanging' event if applicable,
        // so that we can use it to create the reverse operation used for the undo-stack after the model has changed.
        if (change.removedCharCount > 0) {
            this.deleteContent = this.model.getText(change.start, change.start + change.removedCharCount);
        }

        this.changeInProgress = true;
    };

    OrionEditorAdapter.prototype.onChanged = function (change) {
        var self = this;
        this.changeInProgress = true;
        if (!this.ignoreNextChange) {
            var pair = this.operationFromOrionChanges([change], this.orion, this.deleteContent);
            this.trigger('change', pair[0], pair[1]);
            // Send editing flag
            this.collabClient.editing = true;
            if (this.editingTimeout) {
                clearTimeout(this.editingTimeout);
            } else {
                this.collabClient.sendCurrentLocation();
                this.collabClient.updateSelfFileAnnotation();
            }
            this.editingTimeout = setTimeout(function() {
                self.editingTimeout = 0;
                self.collabClient.editing = false;
                self.collabClient.sendCurrentLocation();
                self.collabClient.updateSelfFileAnnotation();
            }, EDITING_FLAG_DURATION);
        }
        this.deleteContent = "";
        if (this.selectionChanged) { this.trigger('selectionChange'); }
        this.changeInProgress = false;
        // this.ignoreNextChange = false;
        this.requestInputChangedEvent();
    };

    OrionEditorAdapter.prototype.onCursorActivity = function () {
        if (this.changeInProgress) {
            this.selectionChanged = true;
        } else {
            this.trigger('selectionChange');
        }
    };
    
    OrionEditorAdapter.prototype.onFocus = function () {
        var clientId = this.collabClient.getClientId();
        var peer = this.collabClient.getPeer(clientId);
        var name = peer ? peer.name : undefined;
        var color = peer ? peer.color : color;
        var selection = this.getSelection();
        this.updateLineAnnotation(clientId, selection, name, color);
        this.collabClient.otSocketAdapter.sendSelection(selection);
    };

    OrionEditorAdapter.prototype.onBlur = function () {
        if (!this.orion.somethingSelected()) { this.trigger('blur'); }
    };

    OrionEditorAdapter.prototype.getValue = function () {
        return this.model.getText();
    };

    OrionEditorAdapter.prototype.getSelection = function () {
        return ot.Selection.createCursor(this.editor.getSelection().start);
    };

    OrionEditorAdapter.prototype.setSelection = function (selection) {
      // var ranges = [];
      // for (var i = 0; i < selection.ranges.length; i++) {
      //   var range = selection.ranges[i];
      //   ranges[i] = {
      //     anchor: this.orion.posFromIndex(range.anchor),
      //     head:   this.orion.posFromIndex(range.head)
      //   };
      // }
      // this.orion.setSelections(ranges);
    };

    var addStyleRule = (function () {
        var added = {};
        var styleElement = document.createElement('style');
        document.documentElement.getElementsByTagName('head')[0].appendChild(styleElement);
        var styleSheet = styleElement.sheet;

        return function (css) {
            if (added[css]) { return; }
            added[css] = true;
            styleSheet.insertRule(css, (styleSheet.cssRules || styleSheet.rules).length);
        };
    }());

    OrionEditorAdapter.prototype.selectionListener = function(e) {
        var offset = e.newValue.start;
        var currLine = this.model.getLineAtOffset(offset);
        var lastLine = this.model.getLineCount()-1;
        var lineStartOffset = this.model.getLineStart(currLine);

        if (offset) {
            //decide whether or not it is worth sending (if line has changed or needs updating).
            if (currLine !== this.myLine || currLine === lastLine || currLine === 0) {
                // Send this change
            } else {
                return;
            }
        }

        this.myLine = currLine;

        // Self-tracking
        var clientId = this.collabClient.getClientId();
        var peer = this.collabClient.getPeer(clientId);
        var name = peer ? peer.name : undefined;
        var color = peer ? peer.color : color;
        var selection = ot.Selection.createCursor(offset);
        this.updateLineAnnotation(clientId, selection, name, color);

        if (this.changeInProgress) {
            this.selectionChanged = true;
        } else {
            this.trigger('selectionChange');
        }
    };

    OrionEditorAdapter.prototype.setOtherSelection = function (selection, color, clientId) {
        if (clientId === this.collabClient.getClientId()) {
            // Don't update self by remote
            return {
                clear: function() {
                    // NOOP
                }
            };
        }
        var peer = this.collabClient.getPeer(clientId);
        var name = peer ? peer.name : undefined;
        color = peer ? peer.color : color;
        this.updateLineAnnotation(clientId, selection, name, color);
        var self = this;
        return {
            clear: function() {
                self.destroyCollabAnnotations(clientId);
            }
        };
    };

    OrionEditorAdapter.prototype.updateLineAnnotation = function(id, selection, name, color, force) {
        force = !!force;
        name = name || 'Unknown';
        color = color || '#000000';
        var cursor = selection.ranges[0].head || 0;
        var annotationModel = this.editor.getAnnotationModel();
        var ann = this.AT.createAnnotation(this.AT.ANNOTATION_COLLAB_LINE_CHANGED, cursor, cursor, name + " is editing");
        var initial = mUIUtils.getNameInitial(name);
        ann.html = ann.html.substring(0, ann.html.indexOf('></div>')) + " style='background-color:" + color + "'>" + initial + "</div>";
        ann.peerId = id;
        var peerId = id;

        /*if peer isn't being tracked yet, start tracking
        * else replace previous annotation
        */
        if (!(peerId in this.annotations && this.annotations[peerId]._annotationModel)) {
            this.annotations[peerId] = ann;
            annotationModel.addAnnotation(this.annotations[peerId]);
        } else {
            var currAnn = this.annotations[peerId];
            if (!force && ann.start === currAnn.start) return;
            annotationModel.replaceAnnotations([currAnn], [ann]);
            this.annotations[peerId] = ann;
        }
    };

    /**
     * Update the line annotation of a peer without change its line number
     * i.e. only updates name and color
     * @param {string} id - clientId
     */
    OrionEditorAdapter.prototype.updateLineAnnotationStyle = function(id) {
        var peer = this.collabClient.getPeer(id);
        var name = peer ? peer.name : undefined;
        var color = peer ? peer.color : undefined;
        var annotation = this.annotations[id];
        if (!annotation) {
            return;
        }
        var cursor = annotation.start;
        var selection = ot.Selection.createCursor(cursor);
        this.updateLineAnnotation(id, selection, name, color, true);
    };

    OrionEditorAdapter.prototype.destroyCollabAnnotations = function(peerId) {
      var annotationModel = this.editor.getAnnotationModel();
      var currAnn = null;

      /*If a peer is specified, just remove their annotation
      * Else remove all peers' annotations.
      */
      if (peerId) {
        if (this.annotations[peerId]) {
          //remove that users annotation
          currAnn = this.annotations[peerId];
          annotationModel.removeAnnotation(currAnn);
          delete this.annotations[peerId];
        }
      } else {
        //the session has ended remove everyone's annotation
        annotationModel.removeAnnotations(this.AT.ANNOTATION_COLLAB_LINE_CHANGED);
        this.annotations = {};
      }
    };

    OrionEditorAdapter.prototype.trigger = function (event) {
      var args = Array.prototype.slice.call(arguments, 1);
      var action = this.callbacks && this.callbacks[event];
      if (action) { action.apply(this, args); }
    };

    OrionEditorAdapter.prototype.applyOperation = function (operation) {
      this.ignoreNextChange = true;
      this.applyOperationToOrion(operation, this.model);
      this.ignoreNextChange = false;
    };

    OrionEditorAdapter.prototype.registerUndo = function (undoFn) {
      // this.orion.undo = undoFn;
      this.orion.setAction("undo", undoFn);
    };

    OrionEditorAdapter.prototype.registerRedo = function (redoFn) {
      // this.orion.redo = redoFn;
      this.orion.setAction("redo", redoFn);
    };

    /**
     * Trigger a delayed InputChanged event.
     * In collab mode, client-side auto saving is disabled. As a result, the
     * syntax checker won't work. So here we simulates a InputChanged event.
     */
    OrionEditorAdapter.prototype.requestInputChangedEvent = function() {
        if (!this.inputChangedRequested) {
            this.inputChangedRequested = true;
            var self = this;
            var editor = self.collabClient.editor;
            setTimeout(function() {
                editor.onInputChanged({
                    type: "InputChanged", //$NON-NLS-0$
                    title: editor.getTitle(),
                    message: null,
                    contents: editor.getText(),
                    contentsSaved: true
                });
                self.inputChangedRequested = false;
            }, INPUT_CHANGED_EVENT_INTERVAL);
        }
    };

    return {
        OrionCollabSocketAdapter: OrionCollabSocketAdapter,
        OrionEditorAdapter: OrionEditorAdapter
    };
});
