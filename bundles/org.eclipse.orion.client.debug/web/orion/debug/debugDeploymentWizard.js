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
    'orion/Deferred',
    'orion/fileClient',
    'orion/xhr',
    'orion/bootstrap',
    'cfui/plugins/wizards/common/deploymentLogic',
    'orion/webui/Wizard',
    'text!orion/debug/debugDeploymentWizardServerPage.html'
], function(messages, lib, Deferred, mFileClient, xhr, mBootstrap, mDeploymentLogic, mWizard, serverPageTemplate) {

    'use strict';

    var TIMEOUT = 5000;

    var serviceRegistry;
    var fileClient;
    var contentLocation;
    var appPath;
    var confParams;
    var confName;
    var projName;
    var forceRemote = false;
    var wizard;
    var serverPage;
    var serverPageRendered = false;
    var editor;
    var newConf;
    var expandTemplateOnLoad = false;
    var currentFile;

    mBootstrap.startup().then(function(core) {
        serviceRegistry = core.serviceRegistry;
        fileClient = new mFileClient.FileClient(serviceRegistry);

        /* set up initial message */
        document.getElementById('title').appendChild(document.createTextNode(messages["configureApplicationDeployment"]));

        /* allow the frame to be closed */
        var closeButton = document.getElementById('closeDialog');
        lib.setSafeAttribute(closeButton, 'aria-label', messages["Close"]);
        closeButton.addEventListener('click', closeFrame);

        /* allow frame to be dragged by title bar */
        var titleBar = document.getElementById('titleBar');
        var dragging = false;
        var dragContext = {
            startX: 0,
            staryY: 0
        };
        titleBar.addEventListener('mousedown', function(e) {
            dragging = true;
            if (titleBar.setCapture) {
                titleBar.setCapture();
            }
            dragContext.startX = e.screenX;
            dragContext.startY = e.screenY;
            titleBar.addEventListener('mousemove', handleDrag);
        });

        titleBar.addEventListener('mouseup', function(e) {
            dragging = false;
            if (titleBar.releaseCapture) {
                titleBar.releaseCapture();
            }
            titleBar.removeEventListener('mousemove', handleDrag);
        });
        
        function handleDrag(e) {
            var dx = e.screenX - dragContext.startX;
            var dy = e.screenY - dragContext.startY;
            
            dragContext.startX = e.screenX;
            dragContext.startY = e.screenY;
            
            var x = parseInt(frameElement.style.left, 10) + dx;
            var y = parseInt(frameElement.style.top, 10) + dy;
            
            frameElement.style.left = x + 'px';
            frameElement.style.top = y + 'px';
        };

        // Setup wizard
        initConf().then(function() {
            setupWizard();
        });
    });

    function closeFrame() {
        window.parent.postMessage(JSON.stringify({
            pageService: 'orion.page.delegatedUI',
            source: 'org.eclipse.orion.client.debug.deploy.uritemplate',
            cancelled: true
        }), '*');
    }

    function postMsg(status) {
        window.parent.postMessage(JSON.stringify({
            pageService: 'orion.page.delegatedUI',
            source: 'org.eclipse.orion.client.debug.deploy.uritemplate',
            status: status
        }), '*');
    }

    function initConf() {
        var confInput;
        try {
            confInput = JSON.parse(decodeURIComponent(decodeURIComponent(location.hash.substr(1))));
        } catch (ex) {
            return new Deferred().resolve();
        }

        contentLocation = confInput.ContentLocation;
        appPath = confInput.AppPath;
        confParams = confInput.ConfParams || {};
        confName = confInput.ConfName;
        projName = confInput.ProjName;
        currentFile = confInput.CurrentFile;

        // Load or create
        if (confName) {
            // Load
            newConf = false;
            confParams.remoteRoot = confParams.remoteRoot || '';
            confParams.launchArguments = confParams.launchArguments || {};
            var rootReg = '^' + confParams.remoteRoot.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            confParams.launchArguments = replaceInObject(confParams.launchArguments, confParams.remoteRoot, '${workspaceRoot}');
            return new Deferred().resolve();
        } else {
            // Create
            newConf = true;
            var nameDeferred = new Deferred();
            var remoteDeferred = new Deferred();
            var adaptersDeferred = new Deferred();

            // Create a unique name
            mDeploymentLogic.uniqueLaunchConfigName(fileClient, contentLocation, projName).then(function(name) {
                confName = name;
                nameDeferred.resolve();
            });

            // Check if local debugging is available by loading adapter types
            xhr('GET', new URL('../../debug/adapterTypes', location.href).href, {
                timeout: TIMEOUT
            }).then(function(result) {
                if (result.status === 200) {
                    adaptersDeferred.resolve(JSON.parse(result.response));
                } else {
                    adaptersDeferred.resolve();
                }
            }, function(result) {
                adaptersDeferred.resolve();
            });

            adaptersDeferred.then(function(adapterTypes) {
                if (adapterTypes && adapterTypes.length > 0) {
                    // Local debugging is available
                    confParams.type = adapterTypes[0];
                    confParams.remote = false;
                    remoteDeferred.resolve();
                } else {
                    // Local debugging is unavailable
                    confParams.remote = true;
                    forceRemote = true;
                    remoteDeferred.resolve();
                }
            });

            return Deferred.all([nameDeferred, remoteDeferred, adaptersDeferred]);
        }
    }

    function setupWizard() {
        serverPage = new mWizard.WizardPage({
            template: serverPageTemplate,
            render: renderServerPage,
            validate: validateServerPage,
            getResult: function() { return {}; }
        });

        wizard = new mWizard.Wizard({
            parent: "wizard",
            pages: [serverPage],
            onCancel: closeFrame,
            buttonNames: { ok: messages["save"] },
            size: { width: "calc(100% - 24px)", height: "370px" },
            onSubmit: submit
        });
    }

    function submit() {
        var conf = {};
        conf.ConfigurationName = lib.$('#config-name-input').value;
        conf.Parameters = {};
        conf.Type = 'Native';
        // Read input
        conf.Parameters.remote = lib.$('#remote-debug-checkbox').checked;
        conf.Parameters.debugServer = lib.$('#debug-server-input').value;
        conf.Parameters.remoteRoot = lib.$('#remote-root-input').value.replace(/\/$/, '');
        conf.Parameters.type = lib.$('#debug-adapter-type-select').value;
        conf.Parameters.launchArguments = replaceInObject(JSON.parse(editor.getText()), '${workspaceRoot}', conf.Parameters.remoteRoot);
        var message = {
            CheckState: true,
            ToSave: conf
        };
        postMsg(message);
    }

    function renderServerPage() {
        if (serverPageRendered) {
            return;
        }
        serverPageRendered = true;
        lib.$('#config-name-input').value = confName || '';
        var remoteCheckbox = lib.$('#remote-debug-checkbox');
        remoteCheckbox.checked = confParams.remote;
        var serverInput = lib.$('#debug-server-input');
        if (forceRemote) {
            lib.setSafeAttribute(remoteCheckbox, 'disabled', 'disabled');
        }
        var remoteInput = lib.$('#remote-root-input');
        if (confParams.remote) {
            serverInput.value = confParams.debugServer || '';
            remoteInput.value = confParams.remoteRoot || '';
        }
        handleRemoteCheckboxChanged();
        handleDebugServerChanged();
        remoteCheckbox.addEventListener('change', handleRemoteCheckboxChanged);
        serverInput.addEventListener('change', handleDebugServerChanged);

        // Render editor
        if (!confParams.launchArguments) {
            confParams.launchArguments = {
                "program": "${workspaceRoot}/program",
                "cwd": "${workspaceRoot}"
            };
        }

        var typeSelect = lib.$('#debug-adapter-type-select');
        var templateDropdown = lib.$('#template-dropdown');
        var templateButton = lib.$('#template-button');
        templateButton.addEventListener('click', function(e) {
            if (typeSelect.value && !serverInput.classList.contains('invalid')) {
                lib.setSafeAttribute(templateButton, 'disabled', 'disabled');
                templateButton.classList.add('disabled');
                xhr('GET', new URL('debug/templates/' + typeSelect.value, serverInput.value).href, {
                    timeout: TIMEOUT
                }).then(function(result) {
                    templateButton.removeAttribute('disabled');
                    templateButton.classList.remove('disabled');
                    // Remove previous templates
                    while (templateDropdown.firstChild) {
                        templateDropdown.removeChild(templateDropdown.firstChild);
                    }
                    // Add new templates
                    JSON.parse(result.response).forEach(function(template) {
                        if (currentFile) {
                            // Auto fill the program path
                            template.program = currentFile;
                        }
                        var templateOption = document.createElement('option');
                        templateOption.innerText = template.name || 'Template';
                        if (template.name) {
                            delete template.name;
                        }
                        templateOption.value = JSON.stringify(template);
                        templateDropdown.appendChild(templateOption);
                    });
                    templateDropdown.selectedIndex = -1;
                    templateDropdown.classList.remove('collapsed');
                    if (expandTemplateOnLoad) {
                        expandTemplateOnLoad = false;
                        // TODO: use a wiget dropdown instead of HTML <select> to expand it by JS
                    }
                }, function(result) {
                    templateButton.removeAttribute('disabled');
                    templateButton.classList.remove('disabled');
                });
            }
        });
        templateDropdown.addEventListener('change', function(e) {
            templateDropdown.classList.add('collapsed');
            editor.setText(JSON.stringify(JSON.parse(templateDropdown.value), null, '\t'));
        });
        var typeOnChange;
        typeSelect.addEventListener('change', typeOnChange = function(e) {
            templateButton.removeAttribute('disabled');
            templateButton.classList.remove('disabled');
            lib.$('#template-dropdown').classList.add('collapsed');
            templateButton.click();
            expandTemplateOnLoad = true;
        });

        require(['orion/editor/edit'], function(edit) {
            editor = edit({
                parent: lib.$('#editor'),
                contentType: 'application/json',
                contents: JSON.stringify(confParams.launchArguments, null, '\t'),
                title: 'launchConfiguration'
            });
            editor.getModel().addEventListener('Changed', function(e) {
                wizard.validate();
            });
            wizard.validate();

            if (newConf) {
                typeOnChange();
            }
        });

        if (!newConf) {
            // Disable adapter and template selection when editing a config
            typeSelect.classList.add('disabled');
            lib.setSafeAttribute(typeSelect, 'disabled', 'disabled');
            templateButton.classList.add('hidden');
        }
    }

    function validateServerPage(setValid) {
        try {
            var text = editor.getText();
            var json = JSON.parse(text);
        } catch (ex) {
            setValid(false);
            return;
        }
        if (!lib.$('#config-name-input').value ||
            !lib.$('#debug-server-input').value ||
            !lib.$('#remote-root-input').value ||
            !lib.$('#debug-adapter-type-select').value ||
            lib.$('#debug-server-input').classList.contains('invalid'))
        {
            setValid(false);
        }
        setValid(true);
    }
    function handleRemoteCheckboxChanged() {
        var remoteCheckbox = lib.$('#remote-debug-checkbox');
        var debugServerInput = lib.$('#debug-server-input');
        var useRemote = remoteCheckbox.checked;
        if (useRemote) {
            debugServerInput.removeAttribute('disabled');
            lib.$('#remote-root-input').removeAttribute('disabled');
        } else {
            var debugServerUrl = new URL('../../', location.href);
            debugServerUrl.hash = '';
            debugServerInput.value = debugServerUrl.href;
            lib.setSafeAttribute(debugServerInput, 'disabled', 'disabled');
            lib.setSafeAttribute(lib.$('#remote-root-input'), 'disabled', 'disabled');

            xhr('GET', new URL('debug/workspacePath', debugServerUrl.href).href, {
                timeout: TIMEOUT
            }).then(function(result) {
                if (!remoteCheckbox.checked) {
                    if (result.status === 200) {
                        lib.$('#remote-root-input').value = result.response.replace(/\/$/, '') + (result.response.charAt(0) === '/' ? '/' : '\\') + projName;
                    } else {
                        forceRemote = true;
                        lib.setSafeAttribute(remoteCheckbox, 'disabled', 'disabled');
                    }
                }
                wizard.validate();
            }, function(result) {
                forceRemote = true;
                remoteCheckbox.checked = true;
                lib.setSafeAttribute(remoteCheckbox, 'disabled', 'disabled');
            });
        }
    }

    function handleDebugServerChanged() {
        var debugServerInput = lib.$('#debug-server-input');
        var serverUrl = debugServerInput.value;
        var adapterSelect = lib.$('#debug-adapter-type-select');
        var currentAdapter;
        if (adapterSelect.selectedIndex >= 0) {
            currentAdapter = adapterSelect.options[adapterSelect.selectedIndex].value;
        } else {
            currentAdapter = confParams.type;
        }
        for (var i = adapterSelect.options.length - 1; i >= 0; i--) {
            adapterSelect.remove(i);
        }
        try {
            xhr('GET', new URL('debug/adapterTypes', serverUrl).href, {
                timeout: TIMEOUT
            }).then(function(result) {
                if (debugServerInput.value === serverUrl) {
                    if (result.status === 200) {
                        debugServerInput.classList.remove('invalid');
                        try {
                            var adapters = JSON.parse(result.response);
                            if (adapters.length === 0) {
                                throw new Error('No available adapters.');
                            }
                            // Double erase
                            for (var i = adapterSelect.options.length - 1; i >= 0; i--) {
                                adapterSelect.remove(i);
                            }
                            var setCurrent = false;
                            adapters.forEach(function(adapter) {
                                var option = document.createElement('option');
                                option.value = option.text = adapter;
                                adapterSelect.add(option);
                                if (adapter === currentAdapter) {
                                    setCurrent = true;
                                }
                            });
                            if (setCurrent) {
                                adapterSelect.value = currentAdapter;
                            }
                        } catch (ex) {
                            debugServerInput.classList.add('invalid');
                        } finally {
                            wizard.validate();
                        }
                    } else {
                        debugServerInput.classList.add('invalid');
                        wizard.validate();
                    }
                }
            }, function() {
                debugServerInput.classList.add('invalid');
                wizard.validate();
            });
        } catch (ex) {
            debugServerInput.classList.add('invalid');
            wizard.validate();
        }
    }

    function replaceInObject(obj, from, to) {
        if (typeof obj === 'string') {
            return obj.replace(from, to);
        } else {
            Object.keys(obj).forEach(function(key) {
                obj[key] = replaceInObject(obj[key], from, to);
            });
            return obj;
        }
    }
});
