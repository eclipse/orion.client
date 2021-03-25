/*******************************************************************************
 * @license
 * Copyright (c) 2017, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define([
    'i18n!orion/debug/nls/messages',
    'orion/webui/littlelib',
    'orion/i18nUtil',
    'orion/debug/debugSocket',
    'orion/debug/breakpoint',
    'orion/section',
    'orion/webui/tooltip'
], function(messages, lib, i18nUtil, mDebugSocket, mBreakpoint, mSection, mTooltip) {

    'use strict';

    /**
     * Debug UI widget
     * @class {orion.debug.DebugPane}
     * 
     * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
     * @param {orion.commandregistry.CommandRegistry} commandRegistry
     * @param {orion.preferences.PreferencesService} preferences
     * @param {orion.deubg.DebugSlideoutViewMode} parent
     * @param {orion.debug.DebugSocket} debugSocket
     */
    var DebugPane = function(serviceRegistry, commandRegistry, preferences, parent, debugSocket) {
        this._commandRegistry = commandRegistry;
        this._preferences = preferences;
        this._parent = parent;
        this._debugService = serviceRegistry.getService('orion.debug.service');
        this._debugSocket = debugSocket;
        this._domNode = this._createDomNode();
        this._stopReasonElement = lib.$('.stopReason', this._domNode);
        this._stackTraceElement = lib.$('.stackTrace', this._domNode);
        this._debugOutputElement = lib.$('.debugOutput', this._domNode);
        this._watchListElement = lib.$('.watchList', this._domNode);
        this._variableListElement = lib.$('.variableList', this._domNode);
        this._breakpointsElement = lib.$('.breakpoints', this._domNode);

        this._threads = {};
        this._stoppedThreads = {};
        this._currentThreadId = undefined;
        this._currentFrameId = undefined;

        this._loadWatches();
        this._loadBreakpoints();
        this._hookDefaultBreakpoints();

        this._debugService.addEventListener('WatchAdded', this._boundLoadWatches = this._loadWatches.bind(this));
        this._debugService.addEventListener('WatchRemoved', this._boundLoadWatches);
        this._debugService.addEventListener('BreakpointAdded', this._boundLoadBreakpoints = this._loadBreakpoints.bind(this));
        this._debugService.addEventListener('BreakpointRemoved', this._boundLoadBreakpoints);
        // this._debugService.addEventListener('BreakpointEnabled', this._boundLoadBreakpoints);
        // this._debugService.addEventListener('BreakpointDisabled', this._boundLoadBreakpoints);

        this._debugSocket.addEventListener('launch', this._boundHandleLaunchEvent = this._handleLaunchEvent.bind(this));
        this._debugSocket.addEventListener('status', this._boundHandleStatusEvent = this._handleStatusEvent.bind(this));
        this._debugSocket.addEventListener('capabilities', this._boundHandleCapabilitiesEvent = this._handleCapabilitiesEvent.bind(this));
        this._debugSocket.addEventListener('event', this._boundHandleAdapterEvent = this._handleAdapterEvent.bind(this));

        lib.$('.debugContinue', this._domNode).addEventListener('click', this._continueOnClick.bind(this));
        lib.$('.debugPause', this._domNode).addEventListener('click', this._pauseOnClick.bind(this));
        lib.$('.debugStepOver', this._domNode).addEventListener('click', this._stepOverOnClick.bind(this));
        lib.$('.debugStepIn', this._domNode).addEventListener('click', this._stepInOnClick.bind(this));
        lib.$('.debugStepOut', this._domNode).addEventListener('click', this._stepOutOnClick.bind(this));
        lib.$('.debugReverse', this._domNode).addEventListener('click', this._reverseOnClick.bind(this));
        lib.$('.debugStepBack', this._domNode).addEventListener('click', this._stepBackOnClick.bind(this));
        lib.$('.debugRestartFrame', this._domNode).addEventListener('click', this._restartFrameOnClick.bind(this));

        lib.$('.replInput input', this._domNode).addEventListener('change', this._replOnSubmit.bind(this));

        lib.$('.debugClearOutput', this._domNode).addEventListener('click', this._clearOutputOnClick.bind(this));
        lib.$('.debugAddWatch', this._domNode).addEventListener('click', this._addWatchOnClick.bind(this));
        lib.$$('.debugMaximize', this._domNode).forEach(function(maximizeButton) {
            maximizeButton.addEventListener('click', this._maximizeOnClick.bind(this));
        }.bind(this));
    };

    /**
     * Deregister all the bindings
     */
    DebugPane.prototype.destroy = function() {
        this._debugService.removeEventListener('WatchAdded', this._boundLoadWatches);
        this._debugService.removeEventListener('WatchRemoved', this._boundLoadWatches);
        this._debugService.removeEventListener('BreakpointAdded', this._boundLoadBreakpoints);
        this._debugService.removeEventListener('BreakpointRemoved', this._boundLoadBreakpoints);
        // this._debugService.removeEventListener('BreakpointEnabled', this._boundLoadBreakpoints);
        // this._debugService.removeEventListener('BreakpointDisabled', this._boundLoadBreakpoints);

        this._debugSocket.removeEventListener('launch', this._boundHandleLaunchEvent);
        this._debugSocket.removeEventListener('status', this._boundHandleStatusEvent);
        this._debugSocket.removeEventListener('capabilities', this._boundHandleCapabilitiesEvent);
        this._debugSocket.removeEventListener('event', this._boundHandleAdapterEvent);
    };

    /**
     * Initialize the UI
     * @private
     * @return {Element}
     */
    DebugPane.prototype._createDomNode = function() {
        var domNode = document.createElement('div');
        domNode.classList.add('debugPane');
        var sectionContainer;

        // Buttons
        var buttons = document.createElement('div');
        buttons.classList.add('debugButtons');
        buttons.appendChild(this._createDebugCommandButton('debugContinue', 'core-sprite-play', messages['Continue'], true));
        buttons.appendChild(this._createDebugCommandButton('debugPause', 'debug-sprite-pause', messages['Pause'], true));
        buttons.appendChild(this._createDebugCommandButton('debugStepOver', 'core-sprite-forward', messages['StepOver'], true));
        buttons.appendChild(this._createDebugCommandButton('debugStepIn', 'core-sprite-move-down', messages['StepIn'], true));
        buttons.appendChild(this._createDebugCommandButton('debugStepOut', 'core-sprite-move-up', messages['StepOut'], true));
        buttons.appendChild(this._createDebugCommandButton('debugReverse', null, messages['ReverseContinue'], true, true));
        buttons.appendChild(this._createDebugCommandButton('debugStepBack', null, messages['StepBack'], true, true));
        buttons.appendChild(this._createDebugCommandButton('debugRestartFrame', 'core-sprite-refresh', messages['RestartFrame'], true, true));
        domNode.appendChild(buttons);

        // Stop reason
        var stopReason = document.createElement('div');
        stopReason.classList.add('stopReason');
        domNode.appendChild(stopReason);

        // Debug frame
        // Put everything below in this frame so that buttons and the stop reason will always stay top
        var debugFrame = document.createElement('div');
        debugFrame.classList.add('debugFrame');
        domNode.appendChild(debugFrame);

        // Stack trace
        sectionContainer = document.createElement('div');
        sectionContainer.classList.add('sectionContainer');
        debugFrame.appendChild(sectionContainer);
        var stackTrace = document.createElement('div');
        stackTrace.classList.add('stackTrace');
        stackTrace.classList.add('dataArea');
        var stackTraceSection = new mSection.Section(sectionContainer, {
            id: 'DebugStackTrace',
            title: messages['StackTrace'],
            canHide: true,
            content: stackTrace,
            preferenceService: this._preferences
        });
        var maxButton = this._createDebugCommandButton('debugMaximize', 'core-sprite-open', messages['Maximize'], false);
        stackTraceSection.getActionElement().appendChild(maxButton);

        // Output
        sectionContainer = document.createElement('div');
        sectionContainer.classList.add('sectionContainer');
        debugFrame.appendChild(sectionContainer);
        var inputOutputWrapper = document.createElement('div');
        var output = document.createElement('div');
        output.classList.add('debugOutput');
        output.classList.add('dataArea');
        inputOutputWrapper.appendChild(output);
        var input = document.createElement('div');
        input.classList.add('replInput');
        var inputBox = document.createElement('input');
        lib.setSafeAttribute(inputBox, 'type', 'text');
        input.appendChild(inputBox);
        inputOutputWrapper.appendChild(input);
        var outputSection = new mSection.Section(sectionContainer, {
            id: 'DebugOutput',
            title: messages['Output'],
            canHide: true,
            content: inputOutputWrapper,
            preferenceService: this._preferences
        });
        // Clear button
        var outputClearButton = this._createDebugCommandButton('debugClearOutput', null, messages['Clear'], false);
        outputSection.getActionElement().appendChild(outputClearButton);
        var maxButton = this._createDebugCommandButton('debugMaximize', 'core-sprite-open', messages['Maximize'], false);
        outputSection.getActionElement().appendChild(maxButton);

        // Watch
        sectionContainer = document.createElement('div');
        sectionContainer.classList.add('sectionContainer');
        debugFrame.appendChild(sectionContainer);
        var watchWrapper = document.createElement('div');
        watchWrapper.classList.add('watchList');
        watchWrapper.classList.add('dataArea');
        var watchSection = new mSection.Section(sectionContainer, {
            id: 'DebugWatch',
            title: messages['Watch'],
            canHide: true,
            content: watchWrapper,
            preferenceService: this._preferences
        });
        // Add button
        var watchAddButton = this._createDebugCommandButton('debugAddWatch', null, messages['Add'], false);
        watchSection.getActionElement().appendChild(watchAddButton);
        var maxButton = this._createDebugCommandButton('debugMaximize', 'core-sprite-open', messages['Maximize'], false);
        watchSection.getActionElement().appendChild(maxButton);

        // Variables
        sectionContainer = document.createElement('div');
        sectionContainer.classList.add('sectionContainer');
        debugFrame.appendChild(sectionContainer);
        var variablesWrapper = document.createElement('div');
        variablesWrapper.classList.add('variableList');
        variablesWrapper.classList.add('dataArea');
        var variablesSection = new mSection.Section(sectionContainer, {
            id: 'DebugVariables',
            title: messages['Variables'],
            canHide: true,
            content: variablesWrapper,
            preferenceService: this._preferences
        });
        var maxButton = this._createDebugCommandButton('debugMaximize', 'core-sprite-open', messages['Maximize'], false);
        variablesSection.getActionElement().appendChild(maxButton);

        // Breakpoints
        sectionContainer = document.createElement('div');
        sectionContainer.classList.add('sectionContainer');
        debugFrame.appendChild(sectionContainer);
        var breakpointsWrapper = document.createElement('div');
        breakpointsWrapper.classList.add('breakpoints');
        breakpointsWrapper.classList.add('dataArea');
        var breakpointsSection = new mSection.Section(sectionContainer, {
            id: 'DebugBreakpoints',
            title: 'Breakpoints',
            canHide: true,
            content: breakpointsWrapper,
            preferenceService: this._preferences
        });
        var maxButton = this._createDebugCommandButton('debugMaximize', 'core-sprite-open', messages['Maximize'], false);
        breakpointsSection.getActionElement().appendChild(maxButton);
        // Default breakpoints
        var exceptionBreakpointAll = document.createElement('div');
        exceptionBreakpointAll.classList.add('exceptionBreakpoint');
        lib.setSafeAttribute(exceptionBreakpointAll, 'extype', 'all');
        var exceptionBreakpointAllCheckbox = document.createElement('input');
        lib.setSafeAttribute(exceptionBreakpointAllCheckbox, 'type', 'checkbox');
        exceptionBreakpointAll.appendChild(exceptionBreakpointAllCheckbox);
        var exceptionBreakpointAllLabel = document.createElement('span');
        exceptionBreakpointAllLabel.innerText = messages['AllExceptions'];
        exceptionBreakpointAll.appendChild(exceptionBreakpointAllLabel);
        breakpointsWrapper.appendChild(exceptionBreakpointAll);
        var exceptionBreakpointUncaught = document.createElement('div');
        exceptionBreakpointUncaught.classList.add('exceptionBreakpoint');
        lib.setSafeAttribute(exceptionBreakpointUncaught, 'extype', 'uncaught');
        var exceptionBreakpointUncaughtCheckbox = document.createElement('input');
        exceptionBreakpointUncaughtCheckbox.checked = true;
        lib.setSafeAttribute(exceptionBreakpointUncaughtCheckbox, 'type', 'checkbox');
        exceptionBreakpointUncaught.appendChild(exceptionBreakpointUncaughtCheckbox);
        var exceptionBreakpointUncaughtLabel = document.createElement('span');
        exceptionBreakpointUncaughtLabel.innerText = messages['UncaughtExceptions'];
        exceptionBreakpointUncaught.appendChild(exceptionBreakpointUncaughtLabel);
        breakpointsWrapper.appendChild(exceptionBreakpointUncaught);

        return domNode;
    };

    /**
     * Getter of dom node
     * @return {Element}
     */
    DebugPane.prototype.getDomNode = function() {
        return this._domNode;
    };

    /**
     * Create a debug command button (e.g. Continue)
     * @private
     * @param {string} className
     * @param {?string} iconClass
     * @param {string} tooltip
     * @param {boolean} disabled
     * @param {boolean} hideOnDisabled
     * @return {Element}
     */
    DebugPane.prototype._createDebugCommandButton = function(className, iconClass, tooltip, disabled, hideOnDisabled) {
        var button = document.createElement('button');
        button.classList.add('orionButton');
        button.classList.add('commandButton');
        button.classList.add(className);
        if (disabled) {
            button.classList.add('disabled');
            lib.setSafeAttribute(button, 'disabled', 'disabled')
        }
        if (hideOnDisabled) {
            button.classList.add('autoHide');
        }
        if (iconClass) {
            new mTooltip.Tooltip({
                node: button,
                text: tooltip,
                position: ["above", "below", "right", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
            });
            button.classList.add(iconClass);
            button.classList.add('spriteButton');
        } else {
            button.appendChild(document.createTextNode(tooltip));
        }
        return button;
    };

    /**
     * Handle launch event from debug client
     * @private
     * @param {LaunchEvent} e
     */
    DebugPane.prototype._handleLaunchEvent = function(e) {
        this.reset();
        this._parent.showIfActivated(this._debugSocket);
    };

    /**
     * Handle status event from debug client
     * @private
     * @param {StatusEvent} e
     */
    DebugPane.prototype._handleStatusEvent = function(e) {
        var i, buttons = lib.$$array('.debugButtons button', this._domNode);
        if (e.status === e.STATUS.IDLE) {
            for (i = 0; i < buttons.length; i++) {
                lib.setSafeAttribute(buttons[i], 'disabled', 'disabled');
                buttons[i].classList.add('disabled');
            }
            this.clear();
            // Remove the focused line
            this._debugService.unfocusLine();
        } else if (e.status === e.STATUS.RUNNING) {
            // Remove the focused line
            this._debugService.unfocusLine();
            this.clear();
        }
    };

    /**
     * Handle capabilities settings from the adapter
     * @private
     * @param {CapabilitiesEvent} e
     */
    DebugPane.prototype._handleCapabilitiesEvent = function(e) {
        var buttons = lib.$$array('.debugButtons button', this._domNode);
        for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].classList.contains('debugStepBack')) {
                if (e.capabilities.supportsStepBack) {
                    buttons[i].removeAttribute('disabled');
                    buttons[i].classList.remove('disabled');
                }
            } else if (buttons[i].classList.contains('debugReverse')) {
                if (e.capabilities.supportsStepBack) {
                    buttons[i].removeAttribute('disabled');
                    buttons[i].classList.remove('disabled');
                }
            } else if (buttons[i].classList.contains('debugRestartFrame')) {
                if (e.capabilities.supportsRestartFrame) {
                    buttons[i].removeAttribute('disabled');
                    buttons[i].classList.remove('disabled');
                }
            } else {
                buttons[i].removeAttribute('disabled');
                buttons[i].classList.remove('disabled');
            }
        }
    };

    /**
     * Handle all kind of adapter events and then sent them to the real handlers
     * @private
     * @param {AdapterEvent} e
     */
    DebugPane.prototype._handleAdapterEvent = function(e) {
        switch (e.event) {
            case 'output':
                this._handleOutputEvent(e);
                break;

            case 'initialized':
                this._config();
                break;

            case 'terminated':
                this._debugSocket.disconnect();
                break;

            case 'stopped':
                this._handleStoppedEvent(e);
                break;

            case 'continued':
                this._handleContinuedEvent(e);
                break;

            case 'thread':
                this._handleThreadEvent(e);
                break;

            default:
                console.error('Unsupported debug event type: ' + e.event);
                break;
        }
    };

    /**
     * Reset the pane for a new debug session
     */
    DebugPane.prototype.reset = function() {
        this._threads = {};
        this._stoppedThreads = {};
        this._currentThreadId = undefined;
        this._currentFrameId = undefined;
        this._debugSocket.setFrameId(undefined);
        while (this._debugOutputElement.firstChild) {
            this._debugOutputElement.removeChild(this._debugOutputElement.firstChild);
        }
        this.clear();
    };

    /**
     * Clear the pane when the program continues
     */
    DebugPane.prototype.clear = function() {
        this._stopReasonElement.innerText = '';
        while (this._stackTraceElement.firstChild) { // TODO: should threads be kept when debugee is running?
            this._stackTraceElement.removeChild(this._stackTraceElement.firstChild);
        }
        this._currentThreadId = undefined;
        this._currentFrameId = undefined;
        this._evaluateScope(0);
    };

    /**
     * Config the adapter.
     * Get all current threads and then set breakpoints
     * @private
     */
    DebugPane.prototype._config = function() {
        var that = this;
        // this._debugSocket.request('threads', {}, function(response) {
        //     that._handleThreadsResponse(response);
        //     that._debugSocket.config(function() {
        //         if (that._debugSocket.supportsConfigurationDoneRequest) {
        //             that._debugSocket.request('configurationDone');
        //         }
        //     });
        // });
        this._debugSocket.config(function() {
            if (that._debugSocket.supportsConfigurationDoneRequest) {
                that._debugSocket.request('configurationDone');
            }
        });
    };

    /**
     * Load all watches from debug service
     * @private
     */
    DebugPane.prototype._loadWatches = function() {
        var that = this;
        while (this._watchListElement.firstChild) {
            this._watchListElement.removeChild(this._watchListElement.firstChild);
        }
        this._debugService.getWatches().then(function(watches) {
            watches.forEach(function(watch) {
                var watchElement = document.createElement('div');
                watchElement.classList.add('watch');
                lib.setSafeAttribute(watchElement, 'expr', watch);
                var nameElement = document.createElement('span');
                nameElement.classList.add('name');
                nameElement.innerText = watch;
                var colonText = document.createElement('span');
                colonText.innerText = ': ';
                var variableElement = document.createElement('span');
                variableElement.classList.add('variable');
                var removeElement = document.createElement('span');
                removeElement.classList.add('remove');
                removeElement.innerText = '×';
                watchElement.appendChild(removeElement);
                watchElement.appendChild(nameElement);
                watchElement.appendChild(colonText);
                watchElement.appendChild(variableElement);
                removeElement.addEventListener('click', function(e) {
                    that._debugService.removeWatch(watch);
                });
                that._watchListElement.appendChild(watchElement);
            });
        });
        if (this._currentFrameId) {
            this._evaluateScope(this._currentFrameId);
        }
    };

    /**
     * Load all breakpoints from debug service
     * @private
     */
    DebugPane.prototype._loadBreakpoints = function() {
        var that = this;
        var toDelete = lib.$$array('.sourceBreakpoint', this._breakpointsElement);
        toDelete.forEach(function(breakpointElement) {
            that._breakpointsElement.removeChild(breakpointElement);
        });
        this._debugService.getBreakpoints().then(function(breakpoints) {
            breakpoints.forEach(function(breakpoint) {
                if (breakpoint instanceof mBreakpoint.LineBreakpoint || breakpoint instanceof mBreakpoint.LineConditionalBreakpoint) {
                    var breakpointElement = document.createElement('div');
                    breakpointElement.classList.add('sourceBreakpoint');
                    var breakpointCheckbox = document.createElement('input');
                    lib.setSafeAttribute(breakpointCheckbox, 'type', 'checkbox');
                    breakpointCheckbox.checked = breakpoint.enabled;
                    var nameElement = document.createElement('span');
                    nameElement.classList.add('name');
                    nameElement.innerText = breakpoint.location + ':' + (breakpoint.line + 1);
                    var removeElement = document.createElement('span');
                    removeElement.classList.add('remove');
                    removeElement.innerText = '×';
                    breakpointElement.appendChild(breakpointCheckbox);
                    breakpointElement.appendChild(nameElement);
                    breakpointElement.appendChild(removeElement);
                    that._breakpointsElement.appendChild(breakpointElement);
                    // Hook events
                    nameElement.addEventListener('click', function(e) {
                        window.location.hash = '#' + breakpoint.location + ',line=' + (breakpoint.line + 1);
                    });
                    removeElement.addEventListener('click', function(e) {
                        that._debugService.removeBreakpoint(breakpoint);
                    });
                    breakpointCheckbox.addEventListener('change', function(e) {
                        if (event.target.checked) {
                            that._debugService.enableBreakpoint(breakpoint);
                        } else {
                            that._debugService.disableBreakpoint(breakpoint);
                        }
                    });
                } else if (breakpoint instanceof mBreakpoint.ExceptionBreakpoint) {
                    // Right now there are fixed number of exception breakpoints.
                    // Add the ability to add dynamic exception breakpoints once any adapter uses this feature.
                    var exceptionElement = lib.$('.exceptionBreakpoint[extype="' + breakpoint.label + '"]', that._breakpointsElement);
                    if (exceptionElement) {
                        var exceptionCheckbox = lib.$('input', exceptionElement);
                        exceptionCheckbox.checked = breakpoint.enabled;
                    }
                }
            });
        });
    };

    /**
     * Hook events for default breakpoints (e.g. Uncaught Exceptions)
     */
    DebugPane.prototype._hookDefaultBreakpoints = function() {
        var that = this;
        this._debugService.getGlobalBreakpoints().then(function(breakpoints) {
            if (breakpoints.length === 0) {
                // Initialize default breakpoints
                breakpoints.push(new mBreakpoint.ExceptionBreakpoint('all', 'All Exceptions', false));
                breakpoints.push(new mBreakpoint.ExceptionBreakpoint('uncaught', 'Uncaught Exceptions', true));
                breakpoints.forEach(function(breakpoint) {
                    if (breakpoint.enabled) {
                        that._debugService.enableBreakpoint(breakpoint);
                    } else {
                        that._debugService.disableBreakpoint(breakpoint);
                    }
                });
            }
            breakpoints.forEach(function(breakpoint) {
                var exceptionCheckbox = lib.$('.exceptionBreakpoint[extype="' + breakpoint.label + '"] input', that._breakpointsElement);
                if (exceptionCheckbox) {
                    exceptionCheckbox.checked = breakpoint.enabled;
                    exceptionCheckbox.addEventListener('change', function(e) {
                        if (event.target.checked) {
                            that._debugService.enableBreakpoint(breakpoint);
                        } else {
                            that._debugService.disableBreakpoint(breakpoint);
                        }
                    });
                }
            });
        });
    };

    /**
     * Evaluate watches and scopes of a stack frame
     * @private
     * @param {number} frameId - 0 means cleaning up
     */
    DebugPane.prototype._evaluateScope = function(frameId) {
        var that = this;
        this._currentFrameId = frameId;
        this._debugSocket.setFrameId(frameId);
        while (this._variableListElement.firstChild) {
            this._variableListElement.removeChild(this._variableListElement.firstChild);
        }
        lib.$$array('.watch', this._watchListElement).forEach(function(watchElement) {
            watchElement.classList.remove('invalid');
            var variableElement = lib.$('.variable', watchElement);
            while (variableElement.firstChild) {
                variableElement.removeChild(variableElement.firstChild);
            }
        });
        if (frameId) {
            // Get scopes
            this._debugSocket.request('scopes', {
                frameId: frameId
            }, function(response) {
                if (!response.success) {
                    that._reportError(i18nUtil.formatMessage(messages['FailedToLoadScopesOfStackFrame${0}'], frameId));
                    return;
                }
                response.body.scopes.forEach(function(scope) {
                    var scopeElement = document.createElement('div');
                    scopeElement.classList.add('scope');
                    var variableElement = document.createElement('span');
                    variableElement.classList.add('variable');
                    that._renderVariable(variableElement, undefined, scope.name, scope.variablesReference);
                    scopeElement.appendChild(variableElement);
                    that._variableListElement.appendChild(scopeElement);
                });
            });

            // Evaluate watches
            this._debugService.getWatches().then(function(watches) {
                watches.forEach(function(watch) {
                    that._debugSocket.request('evaluate', {
                        expression: watch,
                        frameId: frameId,
                        context: 'watch'
                    }, function(response) {
                        var watchElement = lib.$('.watch[expr="' + watch + '"]', that._watchListElement);
                        if (!watchElement) {
                            return;
                        }
                        if (!response.success) {
                            watchElement.classList.add('invalid');
                            return;
                        }
                        var variableElement = lib.$('.variable', watchElement);
                        that._renderVariable(variableElement, response.body.type, response.body.result, response.body.variablesReference);
                    });
                });
            });
        }
    };

    /**
     * Render a variable element
     * @private
     * @param {Element} variableElement
     * @param {string=} type
     * @param {string} type
     * @param {number} reference - Greater than 0 means this variable is a structure variable (has children)
     */
    DebugPane.prototype._renderVariable = function(variableElement, type, value, reference) {
        var that = this;
        var typeElememt = document.createElement('span');
        typeElememt.classList.add('type');
        if (type) {
            typeElememt.innerText = type;
        }
        var spaceText = document.createTextNode(' ');
        var valueElememt = document.createElement('span');
        valueElememt.classList.add('value');
        valueElememt.innerText = value;

        if (reference) {
            // This is a structured variable
            var moreElement = document.createElement('span');
            moreElement.classList.add('more');
            moreElement.classList.add('core-sprite-closedarrow');
            moreElement.addEventListener('click', function(e) {
                var subvarElement = lib.$('.subvariable', variableElement);
                // Check if this variable has already been requested
                if (subvarElement) {
                    if (subvarElement.classList.contains('collapsed')) {
                        moreElement.classList.remove('core-sprite-closedarrow');
                        moreElement.classList.add('core-sprite-openarrow');
                        subvarElement.classList.remove('collapsed');
                    } else {
                        moreElement.classList.remove('core-sprite-openarrow');
                        moreElement.classList.add('core-sprite-closedarrow');
                        subvarElement.classList.add('collapsed');
                    }
                } else {
                    subvarElement = document.createElement('div');
                    subvarElement.classList.add('subvariable');
                    variableElement.appendChild(subvarElement);
                    moreElement.classList.remove('core-sprite-closedarrow');
                    moreElement.classList.add('core-sprite-openarrow');
                    that._debugSocket.request('variables', {
                        variablesReference: reference
                    }, function(response) {
                        if (!response.success) {
                            that._reportError(i18nUtil.formatMessage(messages['FailedToGetVariable${0}$'], reference));
                            return;
                        }
                        response.body.variables.forEach(function(variable) {
                            var wrapperElement = document.createElement('div');
                            wrapperElement.classList.add('variableWrapper');
                            var nameElement = document.createElement('span');
                            nameElement.classList.add('name');
                            nameElement.innerText = variable.name;
                            var colonText = document.createElement('span');
                            colonText.innerText = ': ';
                            var variableElement = document.createElement('span');
                            variableElement.classList.add('variable');
                            that._renderVariable(variableElement, variable.type, variable.value, variable.variablesReference);
                            wrapperElement.appendChild(nameElement);
                            wrapperElement.appendChild(colonText);
                            wrapperElement.appendChild(variableElement);
                            subvarElement.appendChild(wrapperElement);
                        });
                    });
                }
            });
            variableElement.appendChild(moreElement);
        }
        variableElement.appendChild(typeElememt);
        variableElement.appendChild(spaceText);
        variableElement.appendChild(valueElememt);
    };

    /**
     * Handle threads response.
     * It updates the threads in stack trace UI.
     * @private
     * @param {DebugProtocol.ThreadsResponse} response
     */
    DebugPane.prototype._handleThreadsResponse = function(response) {
        if (response.success) {
            var newThreads = {};
            response.body.threads.forEach(function(thread) {
                newThreads[thread.id] = thread.name;
            });
            var oldThreadIds = Object.keys(this._threads);
            var newThreadIds = Object.keys(newThreads);
            oldThreadIds.sort();
            newThreadIds.sort();
            // Find the difference. Then add started threads and remove exited threads
            var i = 0, j = 0;
            while (i < oldThreadIds.length || j < newThreadIds.length) {
                if (j >= newThreadIds.length || oldThreadIds[i] < newThreadIds[j]) {
                    // A thread has been exited
                    // Remove it from the stack trace UI
                    var threadElement = lib.$('.thread[threadId="' + oldThreadIds[i] + '"]', this._stackTraceElement);
                    if (threadElement) {
                        this._stackTraceElement.removeChild(threadElement);
                    }
                    i++;
                } else if (i >= oldThreadIds.length || oldThreadIds[i] > newThreadIds[j]) {
                    // A thread has been started
                    // Add it to the stack trace UI or update its name
                    var threadElement = lib.$('.thread[threadId="' + oldThreadIds[i] + '"]', this._stackTraceElement);
                    if (threadElement) {
                        // Update name
                        lib.$('.threadDescription', threadElement).innerText = newThreads[newThreadIds[j]];
                    } else {
                        // Add new
                        threadElement = this._createThreadStackUI(newThreadIds[j], newThreads[newThreadIds[j]]);
                        this._stackTraceElement.appendChild(threadElement);
                    }
                    j++;
                } else { // oldThreadIds[i] === newThreadIds[j]
                    // Same thread. Do nothing.
                    i++;
                    j++;
                }
            }
            this._threads = newThreads;
        }
    };

    /**
     * Create a thread entry in the stack trace UI
     * @param {number} threadId
     * @param {string=} threadName
     * @return {Element} html element
     */
    DebugPane.prototype._createThreadStackUI = function(threadId, threadName) {
        threadName = threadName || 'Thread ' + threadId;
        var threadStack = document.createElement('div');
        threadStack.classList.add('thread');
        lib.setSafeAttribute(threadStack, 'threadId', threadId);
        var threadDescription = document.createElement('div');
        threadDescription.classList.add('threadDescription');
        threadStack.appendChild(threadDescription);
        threadDescription.innerText = threadName;
        threadDescription.addEventListener('click', function(e) {
            if (threadStack.classList.contains('collapsed')) {
                threadStack.classList.remove('collapsed');
            } else {
                threadStack.classList.add('collapsed');
            }
        });
        return threadStack;
    };

    /**
     * Handle thread event. Refresh the UI.
     * @param {DebugProtocol.ThreadEvent} e
     */
    DebugPane.prototype._handleThreadEvent = function(e) {
        var that = this;
        this._debugSocket.request('threads', {}, function(response) {
            that._handleThreadsResponse(e);
        });
    };

    /**
     * Handle output event
     * @private
     * @param {DebugProtocol.OutputEvent} e
     */
    DebugPane.prototype._handleOutputEvent = function(e) {
        if (e.body.category === 'telemetry') {
            console.info('Debug adapter telemetry:', e.body.output, e.body.data);
        } else {
            var outputElement = document.createElement('div');
            outputElement.classList.add(e.body.category);
            if (e.body.variablesReference) {
                var variableElement = document.createElement('span');
                variableElement.classList.add('variable');
                this._renderVariable(variableElement, undefined, e.body.output, e.body.variablesReference);
                outputElement.appendChild(variableElement);
            } else {
                outputElement.innerText = e.body.output;
            }
            this._appendOutputElement(outputElement);
        }
    };

    /**
     * Handle stopped event
     * @private
     * @param {DebugProtocol.StoppedEvent} e
     */
    DebugPane.prototype._handleStoppedEvent = function(e) {
        var that = this;
        var threadId = e.body.threadId;
        this._stoppedThreads[threadId] = true;
        if (!this._currentThreadId) {
            this._currentThreadId = threadId;
        }
        this._stopReasonElement.innerText = 'Stop reason: ' + e.body.reason;
        var threadStack = lib.$('.thread[threadId="' + threadId + '"]', this._stackTraceElement);
        if (!threadStack && isFinite(threadId)) {
            // Create a temporary div for this thread
            threadStack = this._createThreadStackUI(threadId);
            this._stackTraceElement.appendChild(threadStack);
        }

        // Print stack trace
        this._debugSocket.request('stackTrace', {
            threadId: e.body.threadId || this._currentThreadId,
            //startFrame: 0,
            //levels: 99
        }, function(response) {
            that._handleStackTraceResponse(response, threadId);
        });

        // Update status
        this._debugSocket.setStatus(mDebugSocket.StatusEvent.STATUS.PAUSED);
    };

    /**
     * Handle continued event
     * @private
     * @param {DebugProtocol.ContinuedEvent} e
     */
    DebugPane.prototype._handleContinuedEvent = function(e) {
        this._handleContinue(e.body.threadId, e.body.allThreadsContinued);
    };

    /**
     * Handle all continue case
     * @private
     * @param {number} threadId
     * @param {boolean} allThreadsContinued
     */
    DebugPane.prototype._handleContinue = function(threadId, allThreadsContinued) {
        if (allThreadsContinued) {
            this._stoppedThreads = [];
            this._currentThreadId = undefined;
            this._debugSocket.setStatus(mDebugSocket.StatusEvent.STATUS.RUNNING);
            lib.$$array('.stackFrame', this._stackTraceElement).forEach(function(frameElement) {
                frameElement.parentElement.removeChild(frameElement);
            });
        } else {
            delete this._stoppedThreads[threadId];
            if (this._currentThreadId = threadId) {
                if (Object.keys(this._stoppedThreads).length > 0) {
                    this._currentThreadId = this._stoppedThreads[0];
                } else {
                    this._currentThreadId = undefined;
                    this._debugSocket.setStatus(mDebugSocket.StatusEvent.STATUS.RUNNING);
                }
            }
            lib.$$array('.thread[threadId="' + threadId + '"] .stackFrame', this._stackTraceElement).forEach(function(frameElement) {
                frameElement.parentElement.removeChild(frameElement);
            });
        }
    };

    /**
     * Handle stack trace response
     * @private
     * @param {DebugProtocol.StackTraceResponse} response
     * @param {number} threadId
     */
    DebugPane.prototype._handleStackTraceResponse = function(response, threadId) {
        if (!response.success) {
            this._reportError(response.message);
            return;
        }
        var threadElement = lib.$('.thread[threadId="' + threadId + '"]', this._stackTraceElement);
        if (threadElement) {
            while(threadElement.lastChild.classList.contains('stackFrame')) {
                threadElement.removeChild(threadElement.lastChild);
            }
            var firstFrameFocused = false; // The editor should focus the line at the available first frame
            for (var i = 0; i < response.body.stackFrames.length; i++) {
                // Add stack frame HTML element
                var frame = response.body.stackFrames[i];
                var frameElement = document.createElement('div');
                frameElement.classList.add('stackFrame');
                lib.setSafeAttribute(frameElement, 'frameId', frame.id);
                var nameElement = document.createElement('div');
                nameElement.classList.add('stackName');
                nameElement.innerText = frame.name;
                frameElement.appendChild(nameElement);
                if (frame.source) {
                    var sourceElement = document.createElement('div');
                    sourceElement.classList.add('stackSource');
                    var sourceLink = document.createElement('a');
                    sourceLink.innerText = frame.source.name + ':' + (frame.line + 1) + ':' + (frame.column + 1);
                    lib.setSafeAttribute(sourceLink, 'alt', frame.source.path);
                    var projectLocation = this._getSourceProjectPath(frame.source);
                    lib.setSafeAttribute(sourceLink, 'href', '#' + projectLocation);
                    sourceElement.appendChild(sourceLink);
                    frameElement.appendChild(sourceElement);

                    // Bind mouse events to redirect the editor
                    sourceLink.addEventListener('click', function(e) {
                        e.preventDefault();
                    });
                    frameElement.addEventListener('click', (function(that, projectLocation, line, column, threadId, frameId) { return function(e) {
                        that._enterFrame(frameId, projectLocation, line, column, threadId); // Create a closure here
                    };})(this, projectLocation, frame.line, frame.column, threadId, frame.id));

                    if (!firstFrameFocused && (!frame.source.presentationHint || frame.source.presentationHint === 'emphasize')) {
                        // Let the editor to focus this line
                        firstFrameFocused = true;
                        this._enterFrame(frame.id, projectLocation, frame.line, frame.column, threadId);
                    }
                }
                threadElement.appendChild(frameElement);
            }
        }
    };

    /**
     * Get the project path of a source
     * @param {DebugProtocol.Source} source
     */
    DebugPane.prototype._getSourceProjectPath = function(source) {
        if (source.sourceReference) {
            return '/debug/file/' + this._debugSocket.getId() + '/' + source.sourceReference + '/' + (source.path || 'anonymous');
        } else {
            return this._debugSocket.absoluteToProjectPath(source.path);
        }
    };

    /**
     * Show the detail of a stackframe and focus to it
     * @param {number} frameId
     * @param {string} location
     * @param {number} line
     * @param {number} column
     * @param {number} threadId
     */
    DebugPane.prototype._enterFrame = function(frameId, location, line, column, threadId) {
        this._currentThreadId = threadId;
        this._debugService.focusLine(location, line);
        window.location.hash = '#' + location + ',line=' + (line + 1) + ',offset=' + column;
        this._evaluateScope(frameId);
    };

    /**
     * Continue button click action
     * @private
     * @param {MouseEvent} e
     */
    DebugPane.prototype._continueOnClick = function(e) {
        var that = this;
        var threadId = this._currentThreadId;
        if (this._currentThreadId) {
            this._debugSocket.request('continue', {
                threadId: threadId
            }, function(response) {
                if (response.success) {
                    that._handleContinue(threadId, response.body && response.body.allThreadsContinued);
                }
            });
        }
    };

    /**
     * Pause button click action
     * @private
     * @param {MouseEvent} e
     */
    DebugPane.prototype._pauseOnClick = function(e) {
        var that = this;
        Object.keys(this._threads).forEach(function(threadId) {
            that._debugSocket.request('pause', {
                threadId: threadId
            });
        });
    };

    /**
     * Step over button click action
     * @private
     * @param {MouseEvent} e
     */
    DebugPane.prototype._stepOverOnClick = function(e) {
        if (this._currentThreadId) {
            this._debugSocket.request('next', {
                threadId: this._currentThreadId
            });
        }
    };

    /**
     * Step in button click action
     * @private
     * @param {MouseEvent} e
     */
    DebugPane.prototype._stepInOnClick = function(e) {
        if (this._currentThreadId) {
            this._debugSocket.request('stepIn', {
                threadId: this._currentThreadId
            });
        }
    };

    /**
     * Step out button click action
     * @private
     * @param {MouseEvent} e
     */
    DebugPane.prototype._stepOutOnClick = function(e) {
        if (this._currentThreadId) {
            this._debugSocket.request('stepOut', {
                threadId: this._currentThreadId
            });
        }
    };

    /**
     * Reverse continue button click action
     * @private
     * @param {MouseEvent} e
     */
    DebugPane.prototype._reverseOnClick = function(e) {
        if (this._currentThreadId) {
            this._debugSocket.request('reverseContinue', {
                threadId: this._currentThreadId
            });
        }
    };

    /**
     * Step back button click action
     * @private
     * @param {MouseEvent} e
     */
    DebugPane.prototype._stepBackOnClick = function(e) {
        if (this._currentThreadId) {
            this._debugSocket.request('stepBack', {
                threadId: this._currentThreadId
            });
        }
    };

    /**
     * Restart frame button click action
     * @private
     * @param {MouseEvent} e
     */
    DebugPane.prototype._restartFrameOnClick = function(e) {
        if (this._currentFrameId) {
            this._debugSocket.request('restartFrame', {
                frameId: this._currentFrameId
            });
        }
    };

    /**
     * Add watch click action
     * @private
     * @param {MouseEvent} e
     */
    DebugPane.prototype._addWatchOnClick = function(e) {
        var that = this;
        e.stopPropagation(); // prevent toggling
        this._commandRegistry.prompt(e.target, "Please enter an expression:", "Confirm", "Cancel", "", false, function(watch) {
            if (watch) {
                that._debugService.addWatch(watch);
            }
        });
    };

    /**
     * Clear output click action
     * @private
     * @param {MouseEvent} e
     */
    DebugPane.prototype._clearOutputOnClick = function(e) {
        e.stopPropagation(); // prevent toggling
        while (this._debugOutputElement.firstChild) {
            this._debugOutputElement.removeChild(this._debugOutputElement.firstChild);
        }
    };

    /**
     * Maximize click action
     * @private
     * @param {MouseEvent} e
     */
    DebugPane.prototype._maximizeOnClick = function(e) {
        var sectionContainer = e.target;
        while (sectionContainer.parentElement && !sectionContainer.classList.contains('sectionContainer')) {
            sectionContainer = sectionContainer.parentElement;
        }
        if (sectionContainer.classList.contains('maximized')) {
            sectionContainer.classList.remove('maximized');
        } else {
            sectionContainer.classList.add('maximized');
        }
    };

    /**
     * REPL input submit action
     * @private
     * @param {Event} e
     */
    DebugPane.prototype._replOnSubmit = function(e) {
        var that = this;
        var input = e.target.value;
        e.target.value = "";
        var outputElement = document.createElement('div');
        outputElement.classList.add('input');
        outputElement.innerText = input;
        this._appendOutputElement(outputElement);
        this._debugSocket.evaluate(input, 'repl', function(result) {
            var outputElement = document.createElement('div');
            outputElement.classList.add('console');
            if (result === null) {
                outputElement.innerText = "Failed to execute.";
            } else if (result.variablesReference) {
                var variableElement = document.createElement('span');
                variableElement.classList.add('variable');
                that._renderVariable(variableElement, undefined, result.result, result.variablesReference);
                outputElement.appendChild(variableElement);
            } else {
                outputElement.innerText = result.result;
            }
            that._appendOutputElement(outputElement);
        });
    };

    /**
     * Append new output element and scroll the container to the bottom.
     * @private
     * @param {Element} element
     */
    DebugPane.prototype._appendOutputElement = function(element) {
        this._debugOutputElement.appendChild(element);
        this._debugOutputElement.scrollTop = this._debugOutputElement.scrollHeight;
    };

    /**
     * Report an error
     * @private
     * @param {string} message
     */
    DebugPane.prototype._reportError = function(message) {
        this._debugSocket._reportError(message);
    };

    return {
        DebugPane: DebugPane
    };

});
