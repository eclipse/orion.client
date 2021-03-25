/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*globals onmessage:true onconnect:true requirejs*/
/*eslint-env node, browser*/
var lang = 'en'; //$NON-NLS-1$
var sear = self.location.search;
if (sear) {
  var langs = sear.split('worker-language'); //$NON-NLS-1$
  if (Array.isArray(langs) && langs.length === 2) {
    lang = langs[1].slice(1);
    if (lang) {
      lang = lang.toLocaleLowerCase();
    }
  }
}
requirejs.config({locale: lang});
require([
    'tern/lib/tern',
    'javascript/plugins/ternDefaults',
    'orion/Deferred',
    "orion/objects",
    'orion/serialize',
    'i18n!javascript/nls/messages',
    'orion/i18nUtil'
  ],
  function (Tern, defaultOptions, Deferred, Objects, Serialize, Messages, i18nUtil) {

    var ternserver = null;

    function mergeArray(target, source) {
      if (Array.isArray(target) && Array.isArray(source)) {
        if (target.length < 1) {
          for (var i = 0, len = source.length; i < len; i++) {
            target.push(source[i]);
          }
        } else {
          for (i = 0, len = source.length; i < len; i++) {
            if (target.indexOf(source[i]) < 0) {
              target.push(source[i]);
            }
          }
        }
      }
    }

    function removeEntry(target, item) {
      if (Array.isArray(target)) {
        var idx = target.indexOf(item);
        if (idx > -1) {
          target.slice(idx, idx + 1);
        }
      }
    }

    /**
     * @param {Object} jsonOptions The optional map of JSON options to start the server with
     * @param {Function} callback The optional function to callback to
     * @description Start up the Tern server, send a message after trying
     */
    function startServer(jsonOptions, callback) {
      if (ternserver) {
        ternserver.reset();
        ternserver = null;
      }
      var options = defaultOptions.serverOptions();
      options.getFile = _getFile;

      var defNames = [], plugins, projectLoc;
      if (jsonOptions) {
        projectLoc = jsonOptions.projectLoc;
        plugins = jsonOptions.plugins;
        if (jsonOptions.libs) {
          mergeArray(defNames, jsonOptions.libs);
        }
        if (jsonOptions.defs) {
          mergeArray(defNames, jsonOptions.defs);
        }
        if (Array.isArray(jsonOptions.loadEagerly) && jsonOptions.loadEagerly.length > 0) {
          options.loadEagerly = jsonOptions.loadEagerly;
        }
        if (typeof jsonOptions.ecmaVersion === 'number') {
          options.ecmaVersion = jsonOptions.ecmaVersion;
          if (options.ecmaVersion === 5) {
            mergeArray(defNames, ['ecma5']);
            removeEntry(defNames, 'ecma6');
            removeEntry(defNames, 'ecma7');
          } else if (options.ecmaVersion === 6) {
            mergeArray(defNames, ["ecma5", "ecma6"]);
            removeEntry(defNames, 'ecma7');
          } else if (options.ecmaVersion === 7) {
            mergeArray(defNames, ["ecma5", "ecma6", "ecma7"]);
          }
        } else {
          mergeArray(defNames, ["ecma5", "ecma6", "ecma7"]);
        }
        if (typeof jsonOptions.sourceType === 'string') {
          options.sourceType = jsonOptions.sourceType;
        }
        if (typeof jsonOptions.dependencyBudget === 'number') {
          options.dependencyBudget = jsonOptions.dependencyBudget;
        }
        if (Array.isArray(jsonOptions.dontLoad)) {
          var valid = true;
          for (var i = 0, len = jsonOptions.dontLoad.length; i < len; i++) {
            if (typeof jsonOptions.dontLoad[i] !== 'string') {
              valid = false;
              break;
            }
          }
          if (valid) {
            options.dontLoad = jsonOptions.dontLoad;
          }
        }
      }
      //plugins
      if (plugins && typeof plugins === 'object') {
        Objects.mixin(options.plugins, plugins);
      }
      //definitions
      if (!Array.isArray(defNames) || defNames.length < 1) {
        defNames = [];
      } else {
        defNames = defNames.sort();
      }

      /**
       * @description Start the server with the default options in the event a problem occurrs
       * @param {Error} err The error object from the failed deferred
       */
      function fallback(err) {
        options = defaultOptions.serverOptions();
        options.getFile = _getFile;
        try {
          startAndMessage(options);
          if(err) {
            post(Serialize.serializeError(err));
          }
        }
        catch (err) {
          post(Serialize.serializeError(err));
        }
      }

      /**
       * @description Starts the tern server wit the given options
       * @param {Object} options The options to start the server with
       */
      function startAndMessage(options) {
        ternserver = new Tern.Server(options);
        if (Array.isArray(options.loadEagerly) && options.loadEagerly.length > 0) {
          options.loadEagerly.forEach(function (file) {
            ternserver.addFile(file);
          });
        }
        callback({request: 'start_server', state: "server_ready"}); //$NON-NLS-1$ //$NON-NLS-2$
      }

      Deferred.all(loadPlugins(options.plugins, projectLoc)).then(function () {
        return Deferred.all(loadDefs(defNames, projectLoc));
      })
        .then(function (json) {
        	var arr = json;
        	if(!Array.isArray(arr)) {
        		arr = [arr];
        	}
        	options.defs = [];
        	arr.forEach(function(def) {
        		if(Object.keys(def).length < 1) {
        			return;
        		}
        		options.defs.push(def);
        	});
          startAndMessage(options);
        }, fallback)
        .then(undefined, fallback);
    }

    post({request: "worker_ready"}); //$NON-NLS-1$

    var handlers = {
      /* start_server message handler */
      'start_server': function (args, callback) {
        startServer(args.options, callback);
      },
      /* addFile message handler */
      'addFile': function (args, callback) {
        ternserver.addFile(args.file, args.source);
        callback({request: 'addFile'}); //$NON-NLS-1$
      },
      /* completions message handler */
      'completions': function (args, callback) {
        if (ternserver) {
          ternserver.request({
              query: {
                type: "completions",  //$NON-NLS-1$
                file: args.meta.location,
                types: true,
                origins: true,
                urls: true,
                docs: true,
                end: args.params.offset,
                sort: true,
                filter: false,
                ecma: args.params.ecma,
                expandWordForward: false,
                omitObjectPrototype: false,
                includeKeywords: args.params.keywords,
                includeTemplates: args.params.template,
                caseInsensitive: true,
                docFormat: "full" //$NON-NLS-1$
              },
              files: args.files
            },
            function (error, comps) {
              if (error) {
                callback({
                  request: 'completions',
                  proposals: [],
                  error: error.message,
                  message: Messages['failedToComputeProposals']
                }); //$NON-NLS-1$
              } else if (comps && comps.completions) {
                callback({request: 'completions', proposals: comps.completions}); //$NON-NLS-1$
              } else {
                callback({request: 'completions', proposals: []}); //$NON-NLS-1$
              }
            });

        } else {
          callback({request: 'completions', message: Messages['failedToComputeProposalsNoServer']}); //$NON-NLS-1$
        }
      },
      /* definition message handler */
      'definition': function (args, callback) {
        if (ternserver) {
          ternserver.request({
              query: {
                type: "definition",  //$NON-NLS-1$
                file: args.meta.location,
                end: args.params.offset,
                guess: args.guess
              },
              files: args.files
            },
            function (error, decl) {
              if (error) {
                callback({request: 'definition', error: error.message, message: Messages['failedToComputeDecl']}); //$NON-NLS-1$
              }
              if (decl && typeof decl.start === 'number' && typeof decl.end === "number") {
                callback({request: 'definition', declaration: decl}); //$NON-NLS-1$
              } else if (decl && decl.origin) {
                //tern guessed at it when there is no line infos
                var idx = decl.origin.lastIndexOf(".");
                if (idx > -1 && decl.origin.slice(idx) === ".js") {
                  decl.guess = true;
                } else {
                  delete decl.guess;  //sometimes Tern will set the guess flag, we only want the index flag
                  decl.index = true;
                }
                callback({request: 'definition', declaration: decl}); //$NON-NLS-1$
              } else {
                callback({request: 'definition', declaration: null}); //$NON-NLS-1$
              }
            });
        } else {
          callback({request: 'definition', message: Messages['failedToComputeDeclNoServer']}); //$NON-NLS-1$
        }
      },
      /* delFile message handler */
      'delFile': function (args, callback) {
        if (ternserver && typeof args.file === 'string') {
          ternserver.delFile(args.file);
          callback({request: 'delFile'}); //$NON-NLS-1$
        } else {
          callback({request: 'delFile', message: i18nUtil.formatMessage(Messages['failedDeleteRequest'], args.file)}); //$NON-NLS-1$
        }
      },
      /* documentation message handler */
      'documentation': function (args, callback) {
        if (ternserver) {
          ternserver.request({
              query: {
                type: "documentation",  //$NON-NLS-1$
                file: args.meta.location,
                end: args.params.offset,
                docFormat: args.params.docFormat
              },
              files: args.files
            },
            function (error, doc) {
              if (error) {
                callback({request: 'documentation', error: error.message, message: Messages['failedToComputeDoc']}); //$NON-NLS-1$
              } else if (doc && doc.doc) {
                callback({request: 'documentation', doc: doc}); //$NON-NLS-1$
              } else {
                callback({request: 'documentation', doc: null}); //$NON-NLS-1$
              }
            });
        } else {
          callback({request: 'documentation', message: Messages['failedToComputeDocNoServer']}); //$NON-NLS-1$
        }
      },
      /* environments message handler */
      'environments': function (args, callback) {
        if (ternserver) {
          ternserver.request({
              query: {
                type: 'environments' //$NON-NLS-1$
              }
            },
            function (error, envs) {
              if (error) {
                callback({request: 'environments', error: error.message, message: Messages['failedGetEnvs']}); //$NON-NLS-1$
              }
              if (typeof envs === 'object') {
                callback({request: 'environments', envs: envs}); //$NON-NLS-1$
              } else {
                callback({request: 'environments', envs: null}); //$NON-NLS-1$
              }
            });
        } else {
          callback({request: 'environments', message: Messages['failedGetEnvsNoServer']}); //$NON-NLS-1$
        }
      },
      /* implementation message handler */
      'implementation': function (args, callback) {
        if (ternserver) {
          ternserver.request({
              query: {
                type: "implementation",  //$NON-NLS-1$
                file: args.meta.location,
                end: args.params.offset,
                guess: args.guess
              },
              files: args.files
            },
            function (error, impl) {
              if (error) {
                callback({request: 'implementation', error: error.message, message: Messages['failedToComputeImpl']}); //$NON-NLS-1$
              }
              if (impl && impl.implementation && typeof impl.implementation.start === 'number' && typeof impl.implementation.end === "number") {
                callback({request: 'implementation', implementation: impl.implementation}); //$NON-NLS-1$
              } else if (impl && impl.implementation && impl.implementation.origin) {
                callback({request: 'implementation', implementation: impl.implementation}); //$NON-NLS-1$
              } else {
                callback({request: 'implementation', implementation: null}); //$NON-NLS-1$
              }
            });
        } else {
          callback({request: 'implementation', message: Messages['failedToComputeImplNoServer']}); //$NON-NLS-1$
        }
      },
      /* installed_plugins message handler */
      'installed_plugins': function (args, callback) {
        if (ternserver) {
          ternserver.request({
              query: {
                type: 'installed_plugins' //$NON-NLS-1$
              }
            },
            function (error, plugins) {
              if (error) {
                callback({
                  request: 'installed_plugins',
                  error: error.message,
                  message: Messages['failedGetInstalledPlugins']
                }); //$NON-NLS-1$
              }
              if (typeof plugins === 'object') {
                callback({request: 'installed_plugins', plugins: plugins}); //$NON-NLS-1$
              } else {
                callback({request: 'installed_plugins', plugins: null}); //$NON-NLS-1$
              }
            });
        } else {
          callback({request: 'installed_plugins', message: Messages['failedGetInstalledPluginsNoServer']}); //$NON-NLS-1$
        }
      },
      /* installed_defs message handler */
      'installed_defs': function (args, callback) {
        if (ternserver) {
          ternserver.request({
              query: {
                type: 'installed_defs' //$NON-NLS-1$
              }
            },
            function (error, defs) {
              if (error) {
                callback({
                  request: 'installed_defs',
                  error: error.message,
                  message: Messages['failedGetInstalledDefs']
                }); //$NON-NLS-1$
              }
              if (typeof defs === 'object') {
                callback({request: 'installed_defs', defs: defs}); //$NON-NLS-1$
              } else {
                callback({request: 'installed_defs', defs: null}); //$NON-NLS-1$
              }
            });
        } else {
          callback({request: 'installed_defs', message: Messages['failedGetInstalledDefsNoServer']}); //$NON-NLS-1$
        }
      },
      /* rename message handler */
      'rename': function (args, callback) {
        if (ternserver) {
          ternserver.request({
              query: {
                type: "rename",  //$NON-NLS-1$
                file: args.meta.location,
                end: args.params.offset,
                newName: args.newname
              },
              files: args.files
            },
            function (error, changes) {
              if (error) {
                callback({
                  request: 'rename',
                  error: typeof error === 'string' ? error : error.message,
                  message: Messages['failedRenameTern']
                }); //$NON-NLS-1$
              } else if (changes && Array.isArray(changes.changes)) {
                callback({request: 'rename', changes: changes}); //$NON-NLS-1$
              } else {
                callback({request: 'rename', changes: []}); //$NON-NLS-1$
              }
            });
        } else {
          callback({request: 'rename', message: Messages['failedRenameNoServer']}); //$NON-NLS-1$
        }
      },
      /* type message handler */
      'type': function (args, callback) {
        ternserver.request({
            query: {
              type: "type",  //$NON-NLS-1$
              file: args.meta.location,
              end: args.params.offset
            }
          },
          function (error, type) {
            if (error) {
              callback({
                request: 'type',
                error: typeof error === 'string' ? error : error.message,
                message: Messages['failedType']
              }); //$NON-NLS-1$
            } else {
              callback({request: 'type', type: type}); //$NON-NLS-1$
            }
          });
      },
      /* checkRef message handler */
      'checkRef': function (args, callback) {
        ternserver.request({
            query: {
              type: "checkRef",  //$NON-NLS-1$
              file: args.meta.location,
              end: args.params.offset,
              origin: args.origin
            },
            files: args.files
          },
          function (error, type) {
            if (error) {
              callback({
                request: 'checkRef',
                error: typeof error === 'string' ? error : error.message,
                message: Messages['failedType']
              }); //$NON-NLS-1$
            } else {
              callback({request: 'checkRef', type: type}); //$NON-NLS-1$
            }
          });
      },
      /* lint message handler */
      'lint': function (args, callback) {
        var query =
          {
            type: "lint",  //$NON-NLS-1$
            file: args.meta.location,
            config: args.config
          };
        ternserver.request(
          {
            query: query,
            files: args.files
          },
          function (error, problems) {
            if (error) {
              callback({request: 'lint', error: error.message, message: Messages['failedToComputeProblems']}); //$NON-NLS-1$
            } else if (problems && Array.isArray(problems)) {
              callback({request: 'lint', problems: problems}); //$NON-NLS-1$
            } else {
              callback({request: 'lint', problems: []}); //$NON-NLS-1$
            }
          });
      },
      /* outline message handler */
      'outline': function (args, callback) {
        ternserver.request({
            query: {
              type: "outline", //$NON-NLS-1$
              file: args.meta.location,
              ast: args.ast
            },
            files: args.files
          },
          function (error, outline) {
            if (error) {
              callback({request: 'outline', error: error.message, message: Messages['failedToComputeOutline']}); //$NON-NLS-1$
            } else if (outline && Array.isArray(outline)) {
              callback({request: 'outline', outline: outline}); //$NON-NLS-1$
            } else {
              callback({request: 'outline', outline: []}); //$NON-NLS-1$
            }
          }
        );
      },
      /* fixes message handler */
      'fixes': function (args, callback) {
        ternserver.request({
            query: {
              type: "fixes", //$NON-NLS-1$
              file: args.meta.location,
              problemId: args.problemId,
              annotation: args.annotation,
              annotations: args.annotations
            },
            files: args.files
          },
          function (error, fixes) {
            if (error) {
              callback({request: 'fixes', error: error.message, message: Messages['failedToComputeFixes']}); //$NON-NLS-1$
            } else if (fixes && Array.isArray(fixes)) {
              callback({request: 'fixes', fixes: fixes}); //$NON-NLS-1$
            } else {
              callback({request: 'fixes', fixes: []}); //$NON-NLS-1$
            }
          }
        );
      },
      'occurrences': function (args, callback) {
        if (ternserver) {
          ternserver.request({
              query: {
                type: "occurrences", //$NON-NLS-1$
                file: args.meta.location,
                end: args.params.offset
              },
              files: Array.isArray(args.files) ? args.files : []
            },
            function (error, occurrences) {
              if (error) {
                callback(null, {error: error.message, message: Messages['failedToComputeOccurrences']});
              } else if (Array.isArray(occurrences)) {
                callback({request: 'outline', occurrences: occurrences}); //$NON-NLS-1$
              } else {
                callback({request: 'outline', occurrences: []}); //$NON-NLS-1$
              }
            }
          );
        } else {
          callback(null, {message: Messages['failedToComputeOccurrencesNoServer']});
        }
      },
      /* lint message handler */
      'beautify': function (args, callback) {
        if (ternserver) {
          var query =
            {
              type: "beautify",  //$NON-NLS-1$
              file: args.meta.location,
              args: {
                config: args.config,
                start: args.start,
                end: args.end,
                contentType: args.contentType
              }
            };
          ternserver.request(
            {
              query: query,
              files: args.files
            },
            function (error, text) {
              if (error) {
                callback({request: 'beautify', error: error.message, message: Messages['failedToFormat']}); //$NON-NLS-1$
              } else if (text) {
                callback({request: 'beautify', text: text}); //$NON-NLS-1$
              } else {
                callback({request: 'beautify', text: ""}); //$NON-NLS-1$
              }
            }
          );
        } else {
          callback(null, {message: Messages['failedToFormatNoServer']});
        }
      },
    };

    var ternID = 0;
    var reads = Object.create(null);
    var resolverReads = Object.create(null);

    /**
     * @description Worker callback when a message is sent to the worker
     * @callback
     */
    onmessage = function (evnt) {
      if (typeof evnt.data === 'object') {
        var _d = evnt.data;
        var _handler = handlers[_d.request];
        if (typeof _handler === 'function') {
          if (!ternserver && _d.request !== 'start_server') {
            serverNotReady(_d);
            return;
          }
          _handler(_d.args, function (response) {
            if (typeof _d.messageID === 'number') {
              response.messageID = _d.messageID;
            } else if (typeof _d.ternID === 'number') {
              response.ternID = _d.ternID;
            }
            post(response);
            return;
          });
        } else if (_d.request === 'read') {
          var _read = reads[_d.ternID];
          if (typeof _read === 'function') {
            var text = '';
            if (_d.args && _d.args.contents) {
              text = _d.args.contents;
            }
            _read(_d.args.error, text);//{contents: _d.args.contents ? _d.args.contents : '', file:_d.args.file, logical: _d.args.logical});
            delete reads[_d.ternID];
          }
          _read = resolverReads[_d.ternID];
          if (typeof _read === 'function') {
            _read(_d.args.error, {
              contents: _d.args.contents ? _d.args.contents : '',
              file: _d.args.file,
              logical: _d.args.logical
            });
            delete reads[_d.ternID];
          }
          return;
        } else {
          //no one handled the request, report back an error
          unknownRequest(_d);
        }
      }
    };

    /**
     * @description Respond back that the request is unknown
     * @param {Object} data The original request data
     */
    function unknownRequest(data) {
      var response = Object.create(null);
      response.request = data.request;
      if (data.messageID) {
        response.messageID = data.messageID;
      } else if (data.ternID) {
        response.ternID = data.ternID;
      }
      response.error = i18nUtil.formatMessage(Messages['unknownRequest'], response.request);
      post(response);
    }

    /**
     * @description Respond back that the tern server has not been started
     * @param {Object} data The original request data
     */
    function serverNotReady(data) {
      var response = Object.create(null);
      response.request = data.request;
      if (data.messageID) {
        response.messageID = data.messageID;
      } else if (data.ternID) {
        response.ternID = data.ternID;
      }
      response.error = i18nUtil.formatMessage(Messages['serverNotStarted'], response.request);
      post(response);
    }

    /**
     * @description Worker callback when an error occurs
     * @callback
     */
    onerror = function (evnt) {
      post(evnt);
    };

    /**
     * @description Worker callback when a shared worker starts up
     * @callback
     */
    onconnect = function (evnt) {
      this.port = evnt.ports[0];
      this.port.onmessage = onmessage;
      this.port.start();
    };

    /**
     * @description Sends the given message back to the client. If the msg is null, send an Error
     * object with the optional given error message
     * @param {Object} msg The message to send back to the client
     * @param {String} errormsg The optional error message to send back to the client if the main message is null
     */
    function post(msg, errormsg) {
      if (!msg) {
        msg = new Error(errormsg ? errormsg : Messages['unknownError']);
      }
      if (this.port) {
        this.port.postMessage(msg);
      } else {
        postMessage(msg);
      }
    }

    /**
     * @description Read a file from the workspace into Tern
     * @private
     * @param {String} file The full path of the file
     * @param {Function} callback The callback once the file has been read or failed to read
     */
    function _getFile(file, callback) {
      var request = {request: 'read', ternID: ternID++, args: {file: file}}; //$NON-NLS-1$
      if (file !== null && typeof file === 'object') {
        resolverReads[request.ternID] = callback;
      } else {
        reads[request.ternID] = callback;
      }
      post(request, null);
    }

    /**
     * @description Loads the plugins listed in the given plugins object
     * @param {Object} plugins The object of plugins
     * @param {String} projectDir The base directory of the project
     * @returns {Promise} The promise to resolve all of the plugin loads
     * @since 11.0
     */
    function loadPlugins(plugins, projectDir) {
      var promises = [];
      if (plugins) {
        Object.keys(plugins).forEach(function (key) {
          if (defaultOptions.plugins.required[key] || defaultOptions.plugins.optional[key]) {
            //default plugins are statically loaded
            return;
          }
          var plugin = plugins[key];
          if (!plugin || typeof plugin !== 'object') {
            return;
          }
          if (typeof plugin.location === 'string' && typeof key === 'string') {
            var deferred = new Deferred(),
              loc = /^.tern-plugins/.test(plugin.location) ? projectDir + plugin.location : plugin.location;
            promises.push(deferred);
            _getFile({file: loc, tourl: true}, function (err, meta) {
              var config = {};
              loc = !err && meta && meta.file && meta.file.url ? meta.file.url : plugin.location;
              config[key] = loc;
              requirejs.config({
                paths: config
              });
              requirejs([loc], /* @callback */ function (p) {
                return deferred.resolve(key); //doesn't matter what we resolve, just that the plugin loaded into require
              }, function (err) {
                delete plugins[key];
                promises.pop();
                post("Tern plugin '" + key + "' from '" + loc + "'failed to load.\n\nReason:\n" + Serialize.serializeError(err));
                return deferred.resolve(err);
              });
            });
          }
        });
      }
      return promises;
    }


    /**
     * @description Load any defs from the .tern-project file
     * @param {Array.<String>|Object} defs The definitions, either from an array of names or an object of names with additional metadata
     * @param {String} projectLoc The location of the project we are reading configs from
     * @returns {Promise} Returns a promise to resolve all def loads
     * @since 11.0
     */
    function loadDefs(defs, projectLoc) {
      var _defs = [];
      if (Array.isArray(defs)) {
        defs.forEach(function (_def) {
          if (/^\.definitions/.test(_def)) {
            if (typeof _def === 'string') {
              var deferred = _loadDef(_def, projectLoc);
              if (deferred) {
                _defs.push(deferred);
              }
            }
          } else {
            var idx = defaultOptions.defNames.indexOf(_def);
            if (idx > -1) {
              //a default def, get it
              _defs.push(new Deferred().resolve(defaultOptions.defs[idx]));
            }
          }
        });
      }
      return _defs;
    }

    /**
     * @description Delegate to actually load a definition
     * @private
     * @param {String} def The name of the definition load try and load
     * @param {String} projectLoc The location of the project we are reading configs from
     * @since 11.0
     */
    function _loadDef(def, projectLoc) {
      var loc = def;
      if (projectLoc) {
        loc = projectLoc + loc;
      }
      if (!/\.json$/i.test(def)) {
        loc = loc + '.json'; //$NON-NLS-1$
      }
      var deferred = new Deferred();
      _getFile(loc, /* @callback */ function (err, contents) {
        if (typeof contents === 'string') {
          deferred.resolve(contents.length > 0 ? JSON.parse(contents) : Object.create(null));
        } else {
          deferred.reject();
        }
      });
      return deferred;
    }
  });
