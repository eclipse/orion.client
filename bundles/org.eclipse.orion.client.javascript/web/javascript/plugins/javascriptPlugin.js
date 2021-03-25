/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd, browser*/
/*
 * This module may be loaded in a web worker or a regular Window. Therefore it must NOT use the DOM or other
 * APIs not available in workers.
 */
define([
	'orion/plugin',
	'orion/serviceregistry',
	'orion/Deferred',
	'javascript/scriptResolver',
	'javascript/astManager',
	'javascript/quickFixes',
	'javascript/javascriptFormatter',
	'javascript/javascriptProject',
	'javascript/contentAssist/ternAssist',
	'javascript/jsonAstManager',
	'javascript/support/ternproject/ternProjectSupport',
	'javascript/support/packagejson/packageJsonSupport',
	'javascript/support/eslint/eslintSupport',
	'javascript/validator',
	'javascript/occurrences',
	'javascript/hover',
	'javascript/outliner',
	'javascript/astOutliner',
	'javascript/cuProvider',
	'orion/urlModifier',
	'orion/util',
	'javascript/logger',
	'javascript/commands/generateDocCommand',
	'javascript/commands/openDeclaration',
	'javascript/commands/openImplementation',
	'javascript/commands/renameCommand',
	'javascript/commands/refsCommand',
	'orion/editor/stylers/application_javascript/syntax',
	'orion/editor/stylers/application_json/syntax',
	'orion/editor/stylers/application_schema_json/syntax',
	'orion/editor/stylers/application_x-ejs/syntax',
	'i18n!javascript/nls/messages',
	'orion/i18nUtil',
	'orion/URL-shim'
], function(PluginProvider, mServiceRegistry, Deferred, ScriptResolver, ASTManager, QuickFixes, JavaScriptFormatter, JavaScriptProject, TernAssist,
	JsonAstManager, TernProjectSupport, PackageJsonSupport, ESLintSupport, EslintValidator, Occurrences, Hover, Outliner, AstOutliner, CUProvider, urlModifier, Util, Logger, GenerateDocCommand, OpenDeclCommand, OpenImplCommand,
	RenameCommand, RefsCommand, mJS, mJSON, mJSONSchema, mEJS, javascriptMessages, i18nUtil) {

	var serviceRegistry = new mServiceRegistry.ServiceRegistry();
	var provider = new PluginProvider({
		name: javascriptMessages['pluginName'],
		version: "1.0", //$NON-NLS-1$
		description: javascriptMessages['pluginDescription']
	}, serviceRegistry);

	/**
	 * Register the JavaScript content types
	 */
	provider.registerService("orion.core.contenttype", //$NON-NLS-1$
		{},
		{
			contentTypes: [{
				id: "application/javascript", //$NON-NLS-1$
				"extends": "text/plain", //$NON-NLS-1$ //$NON-NLS-1$
				name: "JavaScript", //$NON-NLS-1$
				extension: ["js"], //$NON-NLS-1$
				imageClass: "file-sprite-javascript modelDecorationSprite" //$NON-NLS-1$
			},
			{
				id: "javascript/config", //$NON-NLS-1$
				"extends": "application/json", //$NON-NLS-1$ //$NON-NLS-1$
				name: "JavaScript Configuration Files", //$NON-NLS-1$
				extension: ["tern-project", "eslintrc", "jsbeautifyrc"], //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
				imageClass: "file-sprite-javascript modelDecorationSprite" //$NON-NLS-1$
			},
			{
				id: "application/x-ejs", //$NON-NLS-1$
				"extends": "text/plain", //$NON-NLS-1$ //$NON-NLS-1$
				name: "Embedded Javascript", //$NON-NLS-1$
				extension: ["ejs"], //$NON-NLS-1$
				imageClass: "file-sprite-javascript modelDecorationSprite" //$NON-NLS-1$
			}]
		});

	var fileMap = Object.create(null);
	provider.registerService("orion.edit.model", //$NON-NLS-1$
		{
			onModelChanged: function fileMapOnModelChanged(evnt) {
				delete fileMap[evnt.file.location];
			},
			onInputChanged: function onInputChanged(evnt) {
				delete fileMap[evnt.file.location];
			}
		},
		{
			contentType: ["application/javascript", "text/html"] //$NON-NLS-1$ //$NON-NLS-2$
		});

	/**
	 * @description Removes the files array if the location is in the 'has not been edited' map
	 * @param {{args: Object, files: Array, request: string}} msg
	 * @returns {{args: Object, request: string}} The original request with the files array removed if the file has not changed since
	 * the last request
	 */
	function clean(msg) {
		if (msg && msg.args && msg.args.meta) {
			if (fileMap[msg.args.meta.location]) {
				delete msg.args.files;
			} else {
				fileMap[msg.args.meta.location] = true;
			}
		}
		return msg;
	}

	/**
	 * Create the script resolver
	 * @since 8.0
	 */
	var scriptresolver = new ScriptResolver.ScriptResolver(serviceRegistry);

	// Avoid using localStorage while running the plugin as a worker
	var TRACE = false;

	var ternReady = false,
		workerReady = false,
		pendingStart,
		messageQueue = [], // for all other requests
		modifyQueue = []; // for add and removes only

	/**
	 * @description Make a new worker
	 */
	function WrappedWorker(script, onMessage, onError) {
		var wUrl = new URL(script, window.location.href);
		wUrl = new URL(urlModifier(wUrl.href));
		wUrl.query.set("worker-language",  ((navigator.languages && navigator.languages[0]) ||
			navigator.language || navigator.userLanguage || 'root').toLowerCase()); //$NON-NLS-1$
		this.worker = new Worker(wUrl.href);
		this.worker.onmessage = onMessage.bind(this);
		this.worker.onerror = onError.bind(this);
		this.worker.postMessage({
			request: "start_worker"
		});
		this.messageId = 0;
		this.callbacks = Object.create(null);
	}

	/**
	 * Use to reset the tern server when the .tern-project file is found and used.
	 */
	function setStarting() {
		ternReady = false;
	}

	/**
	 * @callback
	 */
	WrappedWorker.prototype.postMessage = function(msg, f) {
		var _msg = clean(msg);
		if (ternReady || _msg.request === 'read') { //configuration reads can happen while the server is starting
			if (_msg !== null && typeof _msg === 'object') {
				if (typeof _msg.messageID !== 'number' && typeof _msg.ternID !== 'number') {
					//don't overwrite an id from a tern-side request
					_msg.messageID = this.messageId++;
					this.callbacks[_msg.messageID] = f;
				}
			}
			if (TRACE) {
				console.log("postMessage (" + this.messageId + ") - SENT " + _msg.request); //$NON-NLS-1$ //$NON-NLS-2$
			}
			this.worker.postMessage(_msg);
		} else if (_msg.request === "start_server") {
			if (!workerReady) {
				pendingStart = {
					msg: _msg,
					f: f
				};
			} else {
				if (TRACE) {
					console.log("postMessage (" + this.messageId + ") - START " + JSON.stringify(_msg.args)); //$NON-NLS-1$ //$NON-NLS-2$
				}
				this.worker.postMessage(_msg);
			}
		} else if (_msg.request === "addFile" || _msg.request === "delFile") {
			if (TRACE) {
				console.log("postMessage (" + this.messageId + ") - MODIFY QUEUED: " + _msg.request); //$NON-NLS-1$ //$NON-NLS-2$
			}
			modifyQueue.push({
				msg: _msg,
				f: f
			});
		} else {
			if (TRACE) {
				console.log("postMessage (" + this.messageId + ") - MESSAGE QUEUED: " + _msg.request); //$NON-NLS-1$ //$NON-NLS-2$
			}
			messageQueue.push({
				msg: _msg,
				f: f
			});
		}
	};

	var ternWorker;

	var handlers = {
		'read': doRead,
		/**
		 * @callback
		 */
		'worker_ready': function(response) {
			if (TRACE) {
				console.log("worker_ready (" + ternWorker.messageId + "): " + response.request); //$NON-NLS-1$ //$NON-NLS-2$
			}
			workerReady = true;
			if (pendingStart) {
				ternWorker.postMessage(pendingStart.msg, pendingStart.f);
				pendingStart = null;
			}
		},
		/**
		 * @callback
		 */
		'start_server': function(response) {
			if (TRACE) {
				console.log("server_ready (" + ternWorker.messageId + "): " + response.request); //$NON-NLS-1$ //$NON-NLS-2$
			}
			serverReady();
		}
	};

	// Start the worker
	ternWorker = new WrappedWorker("ternWorker.js", //$NON-NLS-1$
		function(evnt) {
			var _d = evnt.data;
			if (_d.__isError) {
				Logger.log(_d.message);
				if(_d.stack) {
					Logger.log(_d.stack);
				}
			} else if (typeof _d === 'object') {
				var id = _d.messageID;
				var f = this.callbacks[id];
				if (typeof f === 'function') {
					f(_d, _d.error);
					delete this.callbacks[id];
				}
				var _handler = handlers[_d.request];
				if (typeof _handler === 'function') {
					_handler(_d);
				}
			}
		},
		function(err) {
			Logger.log(err);
		});

	/**
	 * Create a new JavaScript project context
	 * @since 12.0
	 */
	var jsProject = new JavaScriptProject(serviceRegistry);
	var jsonAstManager = new JsonAstManager.JsonAstManager();
	/**
	 * Register JSON AST manager as Model Change listener
	 */
	provider.registerService("orion.edit.model", //$NON-NLS-1$
		{
			onModelChanging: jsonAstManager.onModelChanging.bind(jsonAstManager),
			onInputChanged: jsonAstManager.onInputChanged.bind(jsonAstManager)
		},
		{
			contentType: ["application/json", "javascript/config"] //$NON-NLS-1$ //$NON-NLS-2$
		});
		
// Register .tern-project support
	var ternProjectSupport = new TernProjectSupport(serviceRegistry, jsProject, jsonAstManager, ternWorker, scriptresolver, setStarting);
	ternProjectSupport.registerExtensions(provider);

//Register package.json support
	var packageJsonSupport = new PackageJsonSupport(jsonAstManager, scriptresolver);
	packageJsonSupport.registerExtensions(provider);

//Register eslintrc* support
	var eslintSupport = new ESLintSupport(jsonAstManager, scriptresolver, jsProject);
	eslintSupport.registerExtensions(provider);
	
	provider.registerService("orion.edit.model", //$NON-NLS-1$
		{
			onInputChanged: jsProject.onInputChanged.bind(jsProject)
		},
		{
			contentType: ["application/javascript", "text/html", "application/json"] //$NON-NLS-1$ //$NON-NLS-2$//$NON-NLS-3$
		});

	/**
	 * @description Makes sure the filename does not expose Orion file client-specific paths to the UI
	 * @param {String} fileName The namw of the file
	 * @returns {String} The cleaned up filename
	 * @since 15.0
	 */
	function cleanFileName(fileName) {
		if(fileName) {
			if(fileName.indexOf("/file/") === 0) {
				return fileName.slice(6);
			} else if(fileName.indexOf("file/") === 0) {
				return fileName.slice(5);
			}
		}
		return fileName;
	}

	provider.registerService("orion.project.handler", {
		/**
		 * @callback
		 */
		getAdditionalProjectProperties: function getAdditionalProjectProperties(item, projectMetadata) {
			return jsProject.initFrom(item.Location).then(function initFrom() {
				return jsProject.getComputedEnvironment().then(function(env) {
					var infos = [
						{
							Name: javascriptMessages.javascript,
							Children: []
						}
					];
					var val = jsProject.getProjectPath();
					if(!val) {
						infos[0].Children.push({Name: javascriptMessages.projectPath, Value: javascriptMessages.unknown});
					} else {
						infos[0].Children.push({Name: javascriptMessages.projectPath, Value: cleanFileName(val), Href: "{+OrionHome}/edit/edit.html#"+val});
					}
					if(env) {
						//ECMA version
						infos[0].Children.push({Name: javascriptMessages.ecmaVersion, Value: env.ecmaVersion});
						//Guessed envs
						infos[0].Children.push({Name: javascriptMessages.devEnv, Value: Object.keys(env.envs).toString()});
						//ESLint
						if(env.eslint) {
							infos[0].Children.push({Name: javascriptMessages.eslintConfig,
													Value: javascriptMessages.eslintFile,
													Href: "{+OrionHome}/edit/edit.html#"+ env.eslint.file.name});
						} else {
							infos[0].Children.push({Name: javascriptMessages.eslintConfig, Value: javascriptMessages.none});	
						}
						//Package.json
						if(env.packagejson) {
							infos[0].Children.push({Name: javascriptMessages.nodeConfig,
													Value: javascriptMessages.packagejsonFile,
													Href: "{+OrionHome}/edit/edit.html#"+ env.packagejson.file.name});
						} else {
							infos[0].Children.push({Name: javascriptMessages.nodeConfig, Value: javascriptMessages.none});
						}
						//Tern project
						if(env.ternproject) {
							infos[0].Children.push({Name: javascriptMessages.ternConfig,
													Value: javascriptMessages.ternFile,
													Href: "{+OrionHome}/edit/edit.html#"+ env.ternproject.file.name});
						} else {
							infos[0].Children.push({Name: javascriptMessages.ternConfig, Value: javascriptMessages.none});
						}
					} else {
						infos[0].Children.push({Name: javascriptMessages.environment, Value: javascriptMessages.noEnvironment});
					}
					return infos;
				});
			});
		}
	}, {
		id: "orion.javascript.projecthandler",
		type: "javascript",
		validationProperties: [
			{source: "Location"}
		]
	});

	/**
	 * Create the AST manager
	 */
	var astManager = new ASTManager.ASTManager(serviceRegistry, jsProject);

	/**
	 * @description Handler for Tern read requests
	 * @param {Object} request The request from Tern
	 * @since 10.0
	 */
	function doRead(request) {
		var response = {
			request: 'read',
			ternID: request.ternID,
			args: {}
		};
		var fileClient = serviceRegistry.getService("orion.core.file.client"); //$NON-NLS-1$
		if (typeof request.args.file === 'object') {
			if(request.args.file.tourl) {
				var f = request.args.file.file;
				response.args.file = request.args.file;
				response.args.file.url = f;
				if(/^[/]?file/.test(f)) {
					response.args.file.url = new URL(f, self.location.origin).href;
				}
				return ternWorker.postMessage(response);
			}
			var _l = request.args.file.logical;
			response.args.logical = _l;
			if (request.args.file.env === 'node') {
				if (!/^[\.]+/.test(_l)) {
					_nodeRead(response, _l, request.args.file.file, fileClient, null, 0, true);
				} else {
					_readRelative(request, response, _l, fileClient);
				}
			} else {
				if (!/^[\.]+/.test(_l)) {
					scriptresolver.getWorkspaceFile(_l).then(function(files) {
							if (files && files.length > 0) {
								return _normalRead(response, files[0].location, fileClient);
							}
							_failedRead(response, _l, "File not found in workspace");
						},
						function(err) {
							_failedRead(response, _l, err);
						});
				} else {
					_readRelative(request, response, _l, fileClient);
				}
			}
		} else {
			_normalRead(response, request.args.file, fileClient);	
		}
	}
	/**
	 * @since 12.0
	 */
	function _nodeRead(response, moduleName, filePath, fileclient, error, depth, subModules) {
		if(!jsProject.hasNodeModules()) {
			return _failedRead(response, moduleName, "No node_modules folder in project");
		}
		if (depth > 2) {
			if (TRACE) { console.log("Don't read '" + moduleName + "': too deep"); }
			return _failedRead(response, moduleName, "Too deep");
		}
		var index = filePath.lastIndexOf('/', filePath.length - 2);
		if (index === -1) {
			return _failedRead(response, moduleName, error === null ? 'Could not read module ' + moduleName : error);
		}
		var parentFolder = filePath.substr(0, index + 1); // include the trailing / in the folder path
		if (parentFolder === filePath) {
			if (TRACE) { console.log("Infinite loop reading '" + filePath); }
			return _failedRead(response, moduleName, "Infinite loop");
		}
		var modulePath = parentFolder + "node_modules/" + moduleName;
		if (moduleName.indexOf('/') !== -1 && subModules) {
			// module name contains /
			var fileToLoad = modulePath;
			if (!/(\.js)$/.test(modulePath)) {
				fileToLoad += ".js";
			}
			return fileclient.read(fileToLoad, false, false, {readIfExists: true}).then(function(contents) {
					if (contents) {
						response.args.contents = contents;
						response.args.file = fileToLoad;
						return ternWorker.postMessage(response);
					}
					_failedRead(response, moduleName, 'Could not read module: ' + moduleName);
				},
				function(err) {
					_failedRead(response, moduleName, err);
				});
		}
		return fileclient.read(modulePath + "/package.json", false, false, {
			readIfExists: true
		}).then(function(json) {
			if (json) {
				var val = JSON.parse(json);
				var mainPath = null;
				var main = val.main;
				if (main) {
					if (!/(\.js)$/.test(main)) {
						main += ".js";
					}
				} else {
					main = "index.js";
				}
				mainPath = modulePath + "/" + main;
				return fileclient.read(mainPath).then(function(contents) {
						response.args.contents = contents;
						response.args.file = mainPath;
						response.args.path = main;
						if (TRACE) { console.log(mainPath); }
						ternWorker.postMessage(response);
					},
					function(err) {
						_failedRead(response, "node_modules", err);
					});
			}
			_nodeRead(response, moduleName, parentFolder, fileclient, "No contents", depth + 1, true);
		},
		function(err) {
			// if it fails, try to parent folder
			_nodeRead(response, moduleName, parentFolder, fileclient, err, depth + 1, true);
		});
	}
	/**
	 * @since 12.0
	 */
	function _normalRead(response, filePath, fileclient) {
		response.args.file = filePath;
		if (!/\.js|\.htm|\.htm$/ig.test(filePath)) {
			//no extension given, guess at js
			filePath += '.js'; //$NON-NLS-1$
		}
		return fileclient.read(filePath, false, false, {
			readIfExists: true
		}).then(function(contents) {
				response.args.contents = contents;
				ternWorker.postMessage(response);
			},
			function(err) {
				_failedRead(response, filePath, err);
			});
	}

	/**
	 * @since 12.0
	 */
	function _failedRead(response, fileName, err) {
		response.args.message = err.toString();
		response.args.error = i18nUtil.formatMessage(javascriptMessages['failedToReadFile'], fileName);
		ternWorker.postMessage(response);
	}
	/**
	 * @since 12.0
	 */
	function _readRelative(request, response, logical, fileclient) {
		scriptresolver.getWorkspaceFile(logical).then(function(files) {
				if (files && files.length > 0) {
					var rel = scriptresolver.resolveRelativeFiles(logical, files, {
						location: request.args.file.file,
						contentType: {
							name: 'JavaScript'
						}
					});
					if (rel && rel.length > 0) {
						return fileclient.read(rel[0].location).then(function(contents) {
							response.args.contents = contents;
							response.args.file = rel[0].location;
							response.args.path = rel[0].path;
							ternWorker.postMessage(response);
						});
					}
					response.args.error = i18nUtil.formatMessage(javascriptMessages['failedToReadFile'], logical);
					ternWorker.postMessage(response);
				} else {
					response.args.error = i18nUtil.formatMessage(javascriptMessages['failedToReadFile'], logical);
					ternWorker.postMessage(response);
				}
			},
			function(err) {
				_failedRead(response, logical, err);
			});
	}
	/**
	 * @description Handles the server being ready
	if (TRACE) console.log("Fail to read " + fileName + " - " + (err.error ? err.error : "<no error>"));
	 * @param {Object} request The request
	 * @since 10.0
	 */
	function serverReady() {
		ternReady = true;
		// process all add/remove first
		for (var i = 0, len = modifyQueue.length; i < len; i++) {
			var item = modifyQueue[i];
			if (TRACE) {
				console.log("clearing MODIFY queue: " + item.msg.request); //$NON-NLS-1$
			}
			ternWorker.postMessage(item.msg, item.f);
		}
		modifyQueue = [];
		// process remaining pending requests
		for (i = 0, len = messageQueue.length; i < len; i++) {
			item = messageQueue[i];
			if (TRACE) {
				console.log("clearing MESSAGE queue: " + item.msg.request); //$NON-NLS-1$
			}
			ternWorker.postMessage(item.msg, item.f);
		}
		messageQueue = [];
	}

	
	provider.registerService("orion.edit.contentassist", new TernAssist.TernContentAssist(astManager, ternWorker, CUProvider, jsProject), //$NON-NLS-1$
		{
			contentType: ["application/javascript", "text/html"], //$NON-NLS-1$ //$NON-NLS-2$
			nls: 'javascript/nls/messages', //$NON-NLS-1$
			name: 'ternContentAssist', //$NON-NLS-1$
			id: "orion.edit.contentassist.javascript.tern", //$NON-NLS-1$
			charTriggers: "[.]", //$NON-NLS-1$
			excludedStyles: "(string.*)", //$NON-NLS-1$
			autoApply: false
		});

	/**
	 * Register the jsdoc-based outline
	 */
	provider.registerService("orion.edit.outliner", new Outliner.JSOutliner(ternWorker), //$NON-NLS-1$
		{
			contentType: ["application/javascript"], //$NON-NLS-1$
			name: javascriptMessages["sourceOutline"],
			title: javascriptMessages['sourceOutlineTitle'],
			id: "orion.javascript.outliner.source" //$NON-NLS-1$
		});
	provider.registerService("orion.edit.outliner", new AstOutliner.JSOutliner(astManager), //$NON-NLS-1$
		{
			contentType: ["application/javascript"], //$NON-NLS-1$
			name: javascriptMessages["astOutline"],
			title: javascriptMessages['astOutlineTitle'],
			id: "orion.javascript.outliner.ast" //$NON-NLS-1$
		});

	/**
	 * Register the mark occurrences support
	 */
	provider.registerService("orion.edit.occurrences", new Occurrences.JavaScriptOccurrences(ternWorker), //$NON-NLS-1$
		{
			contentType: ["application/javascript", "text/html"] //$NON-NLS-1$ //$NON-NLS-2$
		});

	/**
	 * Register the hover support
	 */
	provider.registerService("orion.edit.hover", new Hover.JavaScriptHover(astManager, scriptresolver, ternWorker, CUProvider), //$NON-NLS-1$
		{
			name: javascriptMessages['jsHover'],
			contentType: ["application/javascript", "text/html"] //$NON-NLS-1$ //$NON-NLS-2$
		});

	provider.registerService("orion.debug.hoverEvaluationProvider", new Hover.JavaScriptDebugHover(astManager, scriptresolver, ternWorker, CUProvider), //$NON-NLS-1$
		{
			name: javascriptMessages['jsHoverEvaluationProvider'],
			contentType: ["application/javascript", "text/html"] //$NON-NLS-1$ //$NON-NLS-2$
		});

	/**
	 * Register AST manager as Model Change listener
	 */
	provider.registerService("orion.edit.model", //$NON-NLS-1$
		{
			onModelChanging: astManager.onModelChanging.bind(astManager),
			onInputChanged: astManager.onInputChanged.bind(astManager)
		},
		{
			contentType: ["application/javascript", "text/html"] //$NON-NLS-1$ //$NON-NLS-2$
		});

	var validator = new EslintValidator(ternWorker, jsProject, serviceRegistry);

	/**
	 * Register the ESLint validator
	 */
	provider.registerService("orion.edit.validator", validator, //$NON-NLS-1$
		{
			contentType: ["application/javascript", "text/html"], //$NON-NLS-1$ //$NON-NLS-2$
			pid: 'eslint.config' //$NON-NLS-1$
		});

	/**
	 * register the compilation unit provider as a listener
	 */
	provider.registerService("orion.edit.model", //$NON-NLS-1$
		{
			onModelChanging: CUProvider.onModelChanging.bind(CUProvider),
			onInputChanged: CUProvider.onInputChanged.bind(CUProvider)
		},
		{
			contentType: ["text/html"] //$NON-NLS-1$
		});

	var generateDocCommand = new GenerateDocCommand.GenerateDocCommand(astManager, CUProvider);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		generateDocCommand, {
			name: javascriptMessages["generateDocName"],
			tooltip: javascriptMessages['generateDocTooltip'],
			id: "generate.js.doc.comment", //$NON-NLS-1$
			key: ["j", false, true, !Util.isMac, Util.isMac], //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'] //$NON-NLS-1$ //$NON-NLS-2$
		}
	);

	provider.registerServiceProvider("orion.edit.open.declaration",
		new OpenDeclCommand.OpenDeclarationCommand(ternWorker, "replace"), {
			contentType: ["application/javascript", "text/html"],
			id: "orion.open.declaration.js"
		}
	);

	var refscommand = new RefsCommand(ternWorker,
		astManager,
		scriptresolver,
		CUProvider,
		serviceRegistry);
	
	provider.registerServiceProvider("orion.edit.references",
		refscommand, {
			contentType: ["application/javascript", "text/html"],
			id: "orion.references.js"
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		new OpenImplCommand.OpenImplementationCommand(ternWorker), {
			name: javascriptMessages["openImplName"],
			tooltip: javascriptMessages['openImplTooltip'],
			id: "open.js.impl", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			key: [114, true, false, false, false]
		}
	);
	var renameCommand = new RenameCommand.RenameCommand(ternWorker, scriptresolver);
	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		renameCommand, {
			name: javascriptMessages['renameElement'],
			tooltip: javascriptMessages['renameElementTooltip'],
			id: "rename.js.element", //$NON-NLS-1$
			key: ['R', false, true, !Util.isMac, Util.isMac], //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'] //$NON-NLS-1$ //$NON-NLS-2$
		}
	);

	var quickFixComputer = new QuickFixes.JavaScriptQuickfixes(astManager, renameCommand, generateDocCommand, jsProject, ternWorker);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		{
			/** @callback */
			execute: function(editorContext, context) {
				context.annotation.fixid = 'ignore-in-file'; //$NON-NLS-1$
				return quickFixComputer.execute(editorContext, context);
			}
		},
		{
			name: javascriptMessages["ignoreInFileFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "ignore.in.file.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:.*\\S.*)$" //$NON-NLS-1$
				},
				{
					source: "annotation:data:ruleId", //$NON-NLS-1$
					match: "^(?:.*\\S.*)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["curlyFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "curly.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:curly)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["removeExtraParensFixName"],
			fixAllEnabled: true,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "rm.extra.parens.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-extra-parens)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["removeExtraSemiFixName"],
			fixAllEnabled: true,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "rm.extra.semi.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-extra-semi)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["addFallthroughCommentFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "add.fallthrough.comment.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-fallthrough)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		{
			/** @callback */
			execute: function(editorContext, context) {
				if (context.annotation.id === 'no-fallthrough') {
					context.annotation.fixid = 'no-fallthrough-break'; //$NON-NLS-1$
				}
				return quickFixComputer.execute(editorContext, context);
			}
		},
		{
			name: javascriptMessages["addBBreakFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "add.fallthrough.break.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-fallthrough)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["addEmptyCommentFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "add.empty.comment.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id",
					match: "^(?:no-empty-block)$"
				},
				{
					source: "readonly",
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["addESLintEnvFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "add.eslint-env.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id",
					match: "^(?:no-undef-defined-inenv)$"
				},
				{
					source: "readonly",
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["addESLintEnvFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "add.module.eslint-env.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:unknown-require-missing-env)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noReservedKeysFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			fixAllEnabled: true,
			id: "update.reserved.property.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-reserved-keys)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["useIsNanFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			fixAllEnabled: true,
			id: "use.isnan.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:use-isnan)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["addESLintGlobalFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "add.eslint-global.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-undef-defined)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["openDefinition"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "open.definition.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id",//$NON-NLS-1$
					match: "^(?:no-undef-expression-defined-object)$"//$NON-NLS-1$
				},
				{
					source: "readonly",//$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		{
			/** @callback */
			execute: function(editorContext, context) {
				if (context.annotation.id === 'no-unused-params-expr') {
					context.annotation.fixid = 'no-unused-params'; //$NON-NLS-1$
				}
				return quickFixComputer.execute(editorContext, context);
			}
		},
		{
			name: javascriptMessages["removeUnusedParamsFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			fixAllEnabled: true,
			id: "remove.unused.param.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-unused-params|no-unused-params-expr)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["commentCallbackFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "comment.callback.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-unused-params-expr)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["eqeqeqFixName"],
			fixAllEnabled: true,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "eqeqeq.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:eqeqeq)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		{
			/** @callback */
			execute: function(editorContext, context) {
				if (context.annotation.id === 'unknown-require-not-running' || context.annotation.id === 'missing-requirejs') {
					context.annotation.fixid = 'unknown-require-plugin'; //$NON-NLS-1$
				}
				return quickFixComputer.execute(editorContext, context);
			}
		},
		{
			name: javascriptMessages["unknownRequirePluginFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "unknown.require.plugin.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:unknown-require-not-running|missing-requirejs)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noeqnullFixName"],
			fixAllEnabled: true,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "noeqnull.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-eq-null)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noundefinitFixName"],
			fixAllEnabled: true,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.undef.init.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-undef-init)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noselfassignFixName"],
			fixAllEnabled: true,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.self.assign.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-self-assign)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		{
			/** @callback */
			execute: function(editorContext, context) {
				if (context.annotation.id === 'no-self-assign') {
					context.annotation.fixid = 'no-self-assign-rename'; //$NON-NLS-1$
				}
				return quickFixComputer.execute(editorContext, context);
			}
		},
		{
			name: javascriptMessages["noselfassignRenameFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.self.assign.rename.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-self-assign)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["newparensFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "new.parens.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:new-parens)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["unreachableFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "remove.unreachable.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-unreachable)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["sparseArrayFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "sparse.array.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-sparse-arrays)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["semiFixName"],
			fixAllEnabled: true,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "semi.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:semi)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["unusedVarsUnusedFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "unused.var.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-unused-vars-unused)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["unreadVarsFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "unread.var.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-unused-vars-unread)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["unusedFuncDeclFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "unused.func.decl.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-unused-vars-unused-funcdecl)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noElseReturnFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.else.return.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-else-return)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noCommaDangleFixName"],
			fixAllEnabled: true,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.comma.dangle.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html', "application/json"], //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-comma-dangle)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noThrowLiteralFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.throw.literal.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-throw-literal)$" //$NON-NLS-1$
				},
				{
					source: "readonly",
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["missingNlsFixName"],
			fixAllEnabled: true,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "missing.nls.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:missing-nls)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["missingDocFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "missing.doc.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:missing-doc)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["unnecessaryNlsFixName"],
			fixAllEnabled: true,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "unnecessary.nls.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:unnecessary-nls)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noNewArrayFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.new.array.literal.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-new-array)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noShadowFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.shadow.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-shadow|no-shadow-global|no-shadow-global-param)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noDebuggerFixName"],
			fixAllEnabled: true,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.debugger.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-debugger)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["radixFixName"],
			fixAllEnabled: true,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "radix.base.ten.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:radix)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noNewWrappersFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.new.wrappers.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-new-wrappers)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		{
			/** @callback */
			execute: function(editorContext, context) {
				if (context.annotation.id === 'no-new-wrappers') {
					context.annotation.fixid = 'no-new-wrappers-literal'; //$NON-NLS-1$
				}
				return quickFixComputer.execute(editorContext, context);
			}
		},
		{
			name: javascriptMessages["noNewWrappersLiteralFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.new.wrappers.literal.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-new-wrappers)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noDupeKeysFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.dupe.keys.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-dupe-keys)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["NoRedeclareFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.redeclare.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-redeclare)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["NoCondAssignFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			fixAllEnabled: true,
			id: "no.cond.assign.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-cond-assign)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noDuplicateCaseFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.duplicate.case.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-duplicate-case)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		{
			/** @callback */
			execute: function(editorContext, context) {
				if (context.annotation.id === 'no-duplicate-case') {
					context.annotation.fixid = 'remove-duplicate-case'; //$NON-NLS-1$
				}
				return quickFixComputer.execute(editorContext, context);
			}
		},
		{
			name: javascriptMessages["removeDuplicateCaseFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			fixAllEnabled: true,
			id: "remove.duplicate.case.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-duplicate-case)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["unknownRequirePluginFixName"],
			fixAllEnabled: false,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "check.tern.plugin.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:check-tern-plugin)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["unknownRequirePluginFixName"],
			fixAllEnabled: false,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "check.tern.lib.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:check-tern-lib)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);
	
	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		{
			/** @callback */
			execute: function(editorContext, context) {
				if (context.annotation.id === 'unknown-require-plugin' || context.annotation.id === 'unknown-require') {
					context.annotation.fixid = 'unknown-require-packagejson'; //$NON-NLS-1$
				}
				return quickFixComputer.execute(editorContext, context);
			}
		}, {
			name: javascriptMessages.unknownRequirePackagejsonFixName,
			fixAllEnabled: false,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "check.tern.lib.fix.packagejson", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:unknown-require-plugin|unknown-require)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["forbiddenExportImportFixName"],
			fixAllEnabled: false,
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "forbidden.export.import.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:forbiddenExportImport)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["NoExtraBindFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			fixAllEnabled: true,
			id: "no.extra.bind.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-extra-bind)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["quoteFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			fixAllEnabled: true,
			id: "quote.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:quotes)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noUnusedExpressionsFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			fixAllEnabled: true,
			id: "no.unused.expressions.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-unused-expressions)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noImplicitCoercionFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			fixAllEnabled: true,
			id: "no.implicit.coercion.fix", //$NON-NLS-1$
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-implicit-coercion)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	provider.registerServiceProvider("orion.edit.command", //$NON-NLS-1$
		quickFixComputer, {
			name: javascriptMessages["noTrailingSpacesFixName"],
			scopeId: "orion.edit.quickfix", //$NON-NLS-1$
			id: "no.trailing.spaces.fix", //$NON-NLS-1$
			fixAllEnabled: true,
			contentType: ['application/javascript', 'text/html'], //$NON-NLS-1$ //$NON-NLS-2$
			validationProperties: [{
					source: "annotation:id", //$NON-NLS-1$
					match: "^(?:no-trailing-spaces)$" //$NON-NLS-1$
				},
				{
					source: "readonly", //$NON-NLS-1$
					match: false
				}
			]
		}
	);

	/**
	 * legacy pref id
	 */
	provider.registerService("orion.cm.managedservice", validator, {
		pid: "eslint.config"
	});
	/**
	 * new sectioned pref block ids
	 */
	provider.registerService("orion.cm.managedservice", validator, {
		pid: "eslint.config.potential"
	});
	provider.registerService("orion.cm.managedservice", validator, {
		pid: "eslint.config.practices"
	});
	provider.registerService("orion.cm.managedservice", validator, {
		pid: "eslint.config.codestyle"
	});

	/**
	 * ESLint settings
	 */
	var ignore = 0,
		warning = 1,
		error = 2,
		info = 3,
		severities = [
			{
				label: javascriptMessages['error'],
				value: error
			},
			{
				label: javascriptMessages['warning'],
				value: warning
			},
			{
				label: javascriptMessages['info'],
				value: info
			},
			{
				label: javascriptMessages['ignore'],
				value: ignore
			}];

	var doubleQuote = 'double';
	var singleQuote = 'single';
	var backTick = 'backtick';
	var quotes = [
		{
			label: javascriptMessages['singleQuote'],
			value: singleQuote
		},
		{
			label: javascriptMessages['doubleQuote'],
			value: doubleQuote
		},
		{
			label: javascriptMessages['backtickQuote'],
			value: backTick
		}];

	var Never = 'never';
	var Always = 'always';
	var kinds = [
		{
			label: javascriptMessages['always'],
			value: Always
		},
		{
			label: javascriptMessages['never'],
			value: Never
		}];

	var allKind = "all";
	var functionsKind = "functions";
	var extraParensKinds = [
		{
			label: javascriptMessages['allKind'],
			value: allKind
		},
		{
			label: javascriptMessages['functionKind'],
			value: functionsKind
		}];
	provider.registerService("orion.core.setting", //$NON-NLS-1$
		{},
		{
			settings: [{
				pid: "eslint.config.potential", //$NON-NLS-1$
				order: 1,
				name: javascriptMessages['prefPotentialProblems'],
				tags: "validation javascript js eslint".split(" "), //$NON-NLS-1$  //$NON-NLS-1$
				category: 'javascript', //$NON-NLS-1$
				categoryLabel: javascriptMessages['javascriptValidation'],
				properties: [{
					id: "no-cond-assign", //$NON-NLS-1$
					name: javascriptMessages["noCondAssign"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-constant-condition", //$NON-NLS-1$
					name: javascriptMessages["noConstantCondition"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-const-assign", //$NON-NLS-1$
					name: javascriptMessages["noConstAssign"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-control-regex", //$NON-NLS-1$
					name: javascriptMessages["no-control-regex"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-empty-character-class", //$NON-NLS-1$
					name: javascriptMessages["no-empty-character-class"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-obj-calls", //$NON-NLS-1$
					name: javascriptMessages["no-obj-calls"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-negated-in-lhs", //$NON-NLS-1$
					name: javascriptMessages["no-negated-in-lhs"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-extra-boolean-cast", //$NON-NLS-1$
					name: javascriptMessages["no-extra-boolean-cast"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-extra-parens", //$NON-NLS-1$
					name: javascriptMessages["no-extra-parens"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-extra-parens!1", //$NON-NLS-1$
					dependsOn: "no-extra-parens",
					name: javascriptMessages["no-extra-parens-kinds"],
					type: "string", //$NON-NLS-1$
					defaultValue: allKind,
					options: extraParensKinds
				},
				{
					id: "no-extra-parens:conditionalAssign", //$NON-NLS-1$
					dependsOn: "no-extra-parens",
					name: javascriptMessages["no-extra-parens-conditionalAssign"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: "no-extra-parens:returnAssign", //$NON-NLS-1$
					dependsOn: "no-extra-parens",
					name: javascriptMessages["no-extra-parens-returnAssign"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: "no-extra-parens:nestedBinaryExpressions", //$NON-NLS-1$
					dependsOn: "no-extra-parens",
					name: javascriptMessages["no-extra-parens-nestedBinaryExpressions"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: "no-debugger", //$NON-NLS-1$
					name: javascriptMessages["noDebugger"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-console", //$NON-NLS-1$
					name: javascriptMessages["noConsole"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "type-checked-consistent-return", //$NON-NLS-1$
					name: javascriptMessages["type-checked-consistent-return"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "no-duplicate-case", //$NON-NLS-1$
					name: javascriptMessages["no-duplicate-case"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-dupe-keys", //$NON-NLS-1$
					name: javascriptMessages["noDupeKeys"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "valid-typeof", //$NON-NLS-1$
					name: javascriptMessages["validTypeof"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-invalid-regexp", //$NON-NLS-1$
					name: javascriptMessages["no-invalid-regexp"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-invalid-regexp:allowConstructorFlags", //$NON-NLS-1$
					dependsOn: "no-invalid-regexp",
					name: javascriptMessages["no-invalid-regexp-flags"],
					type: "string", //$NON-NLS-1$
					defaultValue: ""
				},
				{
					id: "no-regex-spaces", //$NON-NLS-1$
					name: javascriptMessages["noRegexSpaces"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "use-isnan", //$NON-NLS-1$
					name: javascriptMessages["useIsNaN"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-reserved-keys", //$NON-NLS-1$
					name: javascriptMessages["noReservedKeys"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "no-sparse-arrays", //$NON-NLS-1$
					name: javascriptMessages["noSparseArrays"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-fallthrough", //$NON-NLS-1$
					name: javascriptMessages["noFallthrough"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-comma-dangle", //$NON-NLS-1$
					name: javascriptMessages["noCommaDangle"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "no-empty-block", //$NON-NLS-1$
					name: javascriptMessages["noEmptyBlock"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "no-extra-semi", //$NON-NLS-1$
					name: javascriptMessages["unnecessarySemis"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-unreachable", //$NON-NLS-1$
					name: javascriptMessages["noUnreachable"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-irregular-whitespace", //$NON-NLS-1$
					name: javascriptMessages["no-irregular-whitespace"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "no-irregular-whitespace:skipStrings", //$NON-NLS-1$
					dependsOn: "no-irregular-whitespace",
					name: javascriptMessages["no-irregular-whitespace-skipStrings"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: "no-irregular-whitespace:skipComments", //$NON-NLS-1$
					dependsOn: "no-irregular-whitespace",
					name: javascriptMessages["no-irregular-whitespace-skipComments"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: "no-irregular-whitespace:skipRegExps", //$NON-NLS-1$
					dependsOn: "no-irregular-whitespace",
					name: javascriptMessages["no-irregular-whitespace-skipRegexps"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: "no-irregular-whitespace:skipTemplates", //$NON-NLS-1$
					dependsOn: "no-irregular-whitespace",
					name: javascriptMessages["no-irregular-whitespace-skipTemplates"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: false
				},
				]
			},
			{
				pid: "eslint.config.practices", //$NON-NLS-1$
				order: 2,
				name: javascriptMessages['prefBestPractices'],
				tags: "validation javascript js eslint".split(" "), //$NON-NLS-1$  //$NON-NLS-1$
				category: 'javascript', //$NON-NLS-1$
				categoryLabel: javascriptMessages['javascriptValidation'],
				properties: [{
					id: "no-eq-null", //$NON-NLS-1$
					name: javascriptMessages["no-eq-null"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-self-assign", //$NON-NLS-1$
					name: javascriptMessages["no-self-assign"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-self-compare", //$NON-NLS-1$
					name: javascriptMessages["no-self-compare"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "eqeqeq", //$NON-NLS-1$
					name: javascriptMessages["noEqeqeq"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-caller", //$NON-NLS-1$
					name: javascriptMessages["noCaller"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-eval", //$NON-NLS-1$
					name: javascriptMessages["noEval"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "no-new-array", //$NON-NLS-1$
					name: javascriptMessages["noNewArray"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-new-func", //$NON-NLS-1$
					name: javascriptMessages["noNewFunc"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-new-object", //$NON-NLS-1$
					name: javascriptMessages["noNewObject"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-with", //$NON-NLS-1$
					name: javascriptMessages["noWith"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-iterator", //$NON-NLS-1$
					name: javascriptMessages["noIterator"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-proto", //$NON-NLS-1$
					name: javascriptMessages["noProto"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-implied-eval", //$NON-NLS-1$
					name: javascriptMessages["noImpliedEval"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "no-new-wrappers", //$NON-NLS-1$
					name: javascriptMessages["noNewWrappers"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-undef-init", //$NON-NLS-1$
					name: javascriptMessages["noUndefInit"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "accessor-pairs", //$NON-NLS-1$
					name: javascriptMessages["accessor-pairs"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-shadow-global", //$NON-NLS-1$
					name: javascriptMessages["noShadowGlobals"],
					defaultValue: ignore,
					type: "number", //$NON-NLS-1$
					options: severities
				},
				{
					id: "no-throw-literal", //$NON-NLS-1$
					name: javascriptMessages["noThrowLiteral"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-use-before-define", //$NON-NLS-1$
					name: javascriptMessages["useBeforeDefine"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "check-tern-plugin", //$NON-NLS-1$
					name: javascriptMessages["check-tern-plugin"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "radix", //$NON-NLS-1$
					name: javascriptMessages['radix'],
					type: 'number', //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-empty-label", //$NON-NLS-1$
					name: javascriptMessages["no-empty-label"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "missing-requirejs", //$NON-NLS-1$
					name: javascriptMessages["missingRequirejs"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "curly", //$NON-NLS-1$
					name: javascriptMessages["missingCurly"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "no-undef-expression", //$NON-NLS-1$
					name: javascriptMessages["undefExpression"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-undef", //$NON-NLS-1$
					name: javascriptMessages["undefMember"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "unknown-require", //$NON-NLS-1$
					name: javascriptMessages["unknownRequire"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-else-return", //$NON-NLS-1$
					name: javascriptMessages["no-else-return"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-unused-params", //$NON-NLS-1$
					name: javascriptMessages["unusedParams"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-unused-vars", //$NON-NLS-1$
					name: javascriptMessages["unusedVars"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-redeclare", //$NON-NLS-1$
					name: javascriptMessages['varRedecl'],
					type: 'number', //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-shadow", //$NON-NLS-1$
					name: javascriptMessages["varShadow"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-void", //$NON-NLS-1$
					name: javascriptMessages["no-void"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "no-extra-bind", //$NON-NLS-1$
					name: javascriptMessages["no-extra-bind"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-implicit-coercion", //$NON-NLS-1$
					name: javascriptMessages["no-implicit-coercion"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-implicit-coercion:boolean", //$NON-NLS-1$
					dependsOn: "no-implicit-coercion",
					name: javascriptMessages["no-implicit-coercion-boolean"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: true
				},
				{
					id: "no-implicit-coercion:number", //$NON-NLS-1$
					dependsOn: "no-implicit-coercion",
					name: javascriptMessages["no-implicit-coercion-number"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: true
				},
				{
					id: "no-implicit-coercion:string", //$NON-NLS-1$
					dependsOn: "no-implicit-coercion",
					name: javascriptMessages["no-implicit-coercion-string"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: true
				},
				{
					id: "no-extend-native", //$NON-NLS-1$
					name: javascriptMessages["no-extend-native"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-extend-native:exceptions", //$NON-NLS-1$
					dependsOn: "no-extend-native",
					name: javascriptMessages["no-extend-native-exceptions"],
					type: "string", //$NON-NLS-1$
					defaultValue: ""
				},
				{
					id: "no-lone-blocks", //$NON-NLS-1$
					name: javascriptMessages["no-lone-blocks"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "yoda", //$NON-NLS-1$
					name: javascriptMessages["yoda"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "yoda!1", //$NON-NLS-1$
					dependsOn: "yoda",
					name: javascriptMessages["yodaKind"],
					type: "string", //$NON-NLS-1$
					defaultValue: Never,
					options: kinds
				},
				{
					id: "yoda:exceptRange", //$NON-NLS-1$
					dependsOn: "yoda",
					name: javascriptMessages["yodaExceptRange"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: "yoda:onlyEquality", //$NON-NLS-1$
					dependsOn: "yoda",
					name: javascriptMessages["yodaOnlyEquality"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: "no-param-reassign", //$NON-NLS-1$
					name: javascriptMessages["no-param-reassign"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "no-param-reassign:props", //$NON-NLS-1$
					dependsOn: "no-param-reassign",
					name: javascriptMessages["no-param-reassign-props"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: "no-native-reassign", //$NON-NLS-1$
					name: javascriptMessages["no-native-reassign"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "no-native-reassign:exceptions", //$NON-NLS-1$
					dependsOn: "no-native-reassign",
					name: javascriptMessages["no-native-reassign-exceptions"],
					type: "string", //$NON-NLS-1$
					defaultValue: ""
				},
				{
					id: "no-unused-expressions", //$NON-NLS-1$
					name: javascriptMessages["no-unused-expressions"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "no-unused-expressions:allowShortCircuit", //$NON-NLS-1$
					dependsOn: "no-unused-expressions",
					name: javascriptMessages["no-unused-expressions-allowShortCircuit"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: "no-unused-expressions:allowTernary", //$NON-NLS-1$
					dependsOn: "no-unused-expressions",
					name: javascriptMessages["no-unused-expressions-allowTernary"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: "no-invalid-this", //$NON-NLS-1$
					name: javascriptMessages["no-invalid-this"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				}, ]
			},
			{
				pid: "eslint.config.codestyle", //$NON-NLS-1$
				order: 3,
				name: javascriptMessages['prefCodeStyle'],
				tags: "validation javascript js eslint".split(" "), //$NON-NLS-1$  //$NON-NLS-1$
				category: 'javascript', //$NON-NLS-1$
				categoryLabel: javascriptMessages['javascriptValidation'],
				properties: [{
					id: "missing-doc", //$NON-NLS-1$
					name: javascriptMessages["missingDoc"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "new-parens", //$NON-NLS-1$
					name: javascriptMessages["newParens"],
					type: "number", //$NON-NLS-1$
					defaultValue: warning,
					options: severities
				},
				{
					id: "semi", //$NON-NLS-1$
					name: javascriptMessages["missingSemi"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "semi!1", //$NON-NLS-1$
					dependsOn: "semi",
					name: javascriptMessages["missingSemiFineGrained"],
					type: "string", //$NON-NLS-1$
					defaultValue: Always,
					options: kinds
				},
				{
					id: "semi:omitLastInOneLineBlock", //$NON-NLS-1$
					dependsOn: "semi",
					name: javascriptMessages["missingSemiOmitLastInOneLineBlock"],
					type: "boolean", //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: "no-mixed-spaces-and-tabs", //$NON-NLS-1$
					name: javascriptMessages["noMixedSpacesAndTabs"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "missing-nls", //$NON-NLS-1$
					name: javascriptMessages["missingNls"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "unnecessary-nls", //$NON-NLS-1$
					name: javascriptMessages["unnecessaryNls"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "no-jslint", //$NON-NLS-1$
					name: javascriptMessages["unsupportedJSLint"],
					type: "number", //$NON-NLS-1$
					defaultValue: info,
					options: severities
				},
				{
					id: "quotes", //$NON-NLS-1$
					name: javascriptMessages["quotes"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "quotes!1", //$NON-NLS-1$
					name: javascriptMessages["quotesKind"],
					type: "string", //$NON-NLS-1$
					defaultValue: doubleQuote,
					dependsOn: "quotes",
					options: quotes
				},
				{
					id: "quotes:avoidEscape", //$NON-NLS-1$
					name: javascriptMessages["quotesAvoidEscape"],
					type: "boolean", //$NON-NLS-1$
					dependsOn: "quotes",
					defaultValue: false
				},
				{
					id: "quotes:allowTemplateLiterals", //$NON-NLS-1$
					name: javascriptMessages["quotesAllowTemplateLiterals"],
					type: "boolean", //$NON-NLS-1$
					dependsOn: "quotes",
					defaultValue: false
				},
				{
					id: "no-trailing-spaces", //$NON-NLS-1$
					name: javascriptMessages["noTrailingSpaces"],
					type: "number", //$NON-NLS-1$
					defaultValue: ignore,
					options: severities
				},
				{
					id: "no-trailing-spaces:skipBlankLines", //$NON-NLS-1$
					name: javascriptMessages["noTrailingSpacesSkipBlankLines"],
					type: "boolean", //$NON-NLS-1$
					dependsOn: "no-trailing-spaces",
					defaultValue: true
				}
				]
			}]
		});

	var jsFormatter = new JavaScriptFormatter.JavaScriptFormatter(ternWorker, jsProject);
	provider.registerServiceProvider("orion.edit.format",
		jsFormatter, {
			name: javascriptMessages["javascriptFormatter"],
			contentType: ["application/javascript"],
			id: "orion.format.js.formatter"
		}
	);
	// register preferences for formatting when modified (updated call)
	provider.registerService("orion.cm.managedservice", jsFormatter, {
		pid: 'jsbeautify.config.js'
	});

	var unix = "\n";
	var mac = "\r";
	var windows = "\n\r";
	var eof_characters = [
		{
			label: javascriptMessages['indentation_unix'],
			value: unix
		},
		{
			label: javascriptMessages['indentation_mac'],
			value: mac
		},
		{
			label: javascriptMessages['indentation_windows'],
			value: windows
		}
	];

	var space = ' ';
	var tab = '\t';
	var indentation_characters = [
		{
			label: javascriptMessages['indentation_space'],
			value: space
		},
		{
			label: javascriptMessages['indentation_tab'],
			value: tab
		}
	];

	var before_newline = 'before-newline';
	var after_newline = 'after-newline';
	var preserve_newline = 'preserve-newline';
	var operator_positions = [
		{
			label: javascriptMessages['before_newline'],
			value: before_newline
		},
		{
			label: javascriptMessages['after_newline'],
			value: after_newline
		},
		{
			label: javascriptMessages['preserve_newline'],
			value: preserve_newline
		}
	];

	var collapse_preserve_inline = 'collapse-preserve-inline';
	var collapse = 'collapse';
	var expand = 'expand';
	var end_expand = 'end-expand';
	var none = 'none';
	var brace_styles = [
		{
			label: javascriptMessages['collapse_preserve_inline'],
			value: collapse_preserve_inline
		},
		{
			label: javascriptMessages['collapse'],
			value: collapse
		},
		{
			label: javascriptMessages['expand'],
			value: expand
		},
		{
			label: javascriptMessages['end_expand'],
			value: end_expand
		},
		{
			label: javascriptMessages['none'],
			value: none
		}
	];
	provider.registerServiceProvider("orion.core.setting", {},
	{
		settings: [{
			pid: 'jsbeautify.config.js', //$NON-NLS-1$
			name: javascriptMessages['javascriptFormattingSettings'],
			tags: 'beautify javascript js formatting'.split(' '), //$NON-NLS-1$
			category: 'javascriptFormatting', //$NON-NLS-1$
			categoryLabel: javascriptMessages['javascriptFormatting'],
			properties: [
				{
					id: 'js_indent_size', //$NON-NLS-1$
					name: javascriptMessages['js_indent_size'],
					type: 'number', //$NON-NLS-1$
					defaultValue: 4
				},
				{
					id: 'js_indent_char', //$NON-NLS-1$
					name: javascriptMessages['js_indent_char'],
					type: 'string', //$NON-NLS-1$
					defaultValue: space,
					options: indentation_characters
				},
				{
					id: 'js_eol', //$NON-NLS-1$
					name: javascriptMessages['js_eol'],
					type: 'string', //$NON-NLS-1$
					defaultValue: unix,
					options: eof_characters
				},
				{
					id: 'js_end_with_newline', //$NON-NLS-1$
					name: javascriptMessages['js_end_with_newline'],
					type: 'boolean', //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: 'js_preserve_newlines', //$NON-NLS-1$
					name: javascriptMessages['js_preserve_newlines'],
					type: 'boolean', //$NON-NLS-1$
					defaultValue: true
				},
				{
					id: 'js_max_preserve_newlines', //$NON-NLS-1$
					name: javascriptMessages['js_max_preserve_newlines'],
					type: 'number', //$NON-NLS-1$
					defaultValue: 10
				},
				{
					id: 'js_brace_style', //$NON-NLS-1$
					name: javascriptMessages['js_brace_style'],
					type: 'boolean', //$NON-NLS-1$
					defaultValue: collapse,
					options: brace_styles
				},
				{
					id: 'js_wrap_line_length', //$NON-NLS-1$
					name: javascriptMessages['js_wrap_line_length'],
					type: 'number', //$NON-NLS-1$
					defaultValue: 0
				},
				{
					id: 'indent_level', //$NON-NLS-1$
					name: javascriptMessages['indent_level'],
					type: 'number', //$NON-NLS-1$
					defaultValue: 0
				},
				{
					id: 'space_in_paren', //$NON-NLS-1$
					name: javascriptMessages['space_in_paren'],
					type: 'boolean', //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: 'space_in_empty_paren', //$NON-NLS-1$
					name: javascriptMessages['space_in_empty_paren'],
					type: 'boolean', //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: 'space_after_anon_function', //$NON-NLS-1$
					name: javascriptMessages['space_after_anon_function'],
					type: 'boolean', //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: 'break_chained_methods', //$NON-NLS-1$
					name: javascriptMessages['break_chained_methods'],
					type: 'boolean', //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: 'keep_array_indentation', //$NON-NLS-1$
					name: javascriptMessages['keep_array_indentation'],
					type: 'boolean', //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: 'space_before_conditional', //$NON-NLS-1$
					name: javascriptMessages['space_before_conditional'],
					type: 'boolean', //$NON-NLS-1$
					defaultValue: true
				},
				{
					id: 'unescape_strings', //$NON-NLS-1$
					name: javascriptMessages['unescape_strings'],
					type: 'boolean', //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: 'e4x', //$NON-NLS-1$
					name: javascriptMessages['e4x'],
					type: 'boolean', //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: 'comma_first', //$NON-NLS-1$
					name: javascriptMessages['comma_first'],
					type: 'boolean', //$NON-NLS-1$
					defaultValue: false
				},
				{
					id: 'operator_position', //$NON-NLS-1$
					name: javascriptMessages['operator_position'],
					type: 'string', //$NON-NLS-1$
					defaultValue: before_newline,
					options: operator_positions
				}]
		}]
	});

	/**
	 * Register syntax styling for js, json and json schema content
	 */
	var newGrammars = Object.create(null);
	mJS.grammars.forEach(function(current) {
		newGrammars[current.id] = current;
	});
	mJSON.grammars.forEach(function(current) {
		newGrammars[current.id] = current;
	});
	mJSONSchema.grammars.forEach(function(current) {
		newGrammars[current.id] = current;
	});
	mEJS.grammars.forEach(function(current) {
		newGrammars[current.id] = current;
	});
	Object.keys(newGrammars).forEach(function(key) {
		provider.registerService("orion.edit.highlighter", {}, newGrammars[key]); //$NON-NLS-1$
	});
	provider.connect(function() {
		var fc = serviceRegistry.getService("orion.core.file.client"); //$NON-NLS-1$
		fc.addEventListener("Changed", jsProject.onFileChanged.bind(jsProject));
		fc.addEventListener("Changed", astManager.onFileChanged.bind(astManager));
		fc.addEventListener("Changed", CUProvider.onFileChanged.bind(CUProvider));
		/*
			var prefs = serviceRegistry.getService("orion.core.preference"); //$NON-NLS-1$ //$NON-NLS-1$
			if(prefs) {
				prefs.get("/js", null, {scope: 2}).then(function(prefs) { //$NON-NLS-1$
					TRACE = prefs.message_trace === "true";
				});
		}*/
	});
});
