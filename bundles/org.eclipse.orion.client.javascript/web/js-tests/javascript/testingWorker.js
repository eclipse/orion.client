/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2016 IBM Corporation, Inc. and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, browser*/
/* eslint-disable missing-nls */
define([
'orion/xhr',
'orion/URL-shim' //global, stays last
], function(_xhr) {

	var worker, //the backing worker
		_state, //the mutable testing state
		callbacks, //the object of callback functions per request ID
		testFiles = Object.create(null), //list of xhr requests we should ignore
		messageID = 0, //the message ID counter
		ignore404s = false;

	/**
	 * @description Create a new instance of the worker
	 * @param {String} script The URL to load
	 * @returns {WrappedWorker} A new WrappedWorker instance
	 * @since 10.0
	 */
	function WrappedWorker(script, state) {
 		var wUrl = new URL(script, window.location.href);
    	worker = new Worker(wUrl.href);
    	worker.onmessage = onmessage.bind(this);
    	worker.onerror = onerror.bind(this);
    	if(!state.delayedStart) {
	    	worker.postMessage({request: 'start_server', args: {}});
		}
    	messageID = 0;
    	callbacks = Object.create(null);
    	if(state) {
    		_state = state;
		} else {
	    	_state = Object.create(null);
		}
	}

	/**
	 * @name WrappedWorker.prototype.postMessage
	 * @description Wraps the default postMessage function from the underlying worker to allow
	 * IDs to be added to the messages
	 * @function
	 * @param {Object} msg The message to send
	 * @param {Function} f The callback function to call when the Tern server responds
	 */
	WrappedWorker.prototype.postMessage = function(msg, f) {
		message(msg, f);
	};

	/**
	 * @name WrappedWorker.prototype.terminate
	 * @description Stops the underlying worker
	 * @function
	 */
	WrappedWorker.prototype.terminate = function() {
		worker.terminate();
	};

	function message(msg, f) {
		if(msg !== null && typeof msg === 'object') {
			if(typeof msg.messageID !== 'number') {
				//don't overwrite an id from a tern-side request
				msg.messageID = messageID++;
				callbacks[msg.messageID] = f;
			}
		}
		worker.postMessage(msg);
	}

	/**
	 * @description Starts the worker
	 * @function
	 * @param {Function} callback The callback to call when done starting worker and server
	 * @since 11.0
	 */
	WrappedWorker.prototype.start = function(callback, json, fn) {
		if(callback) {
			//tests can pass in null here to avoid having the test "complete" once the server starts
			_state.callback = callback;
		}
		var j = json ? json : {};
		message({request: 'start_server', args: j}, function() {
			if(typeof fn === "function") {
				fn();
			}
			if(callback) {
				callback();
			}
		});
	};
	/**
	 * @name WrappedWorker.prototype.setTestState
	 * @description Sets the test state, must be called per test to ensure the correct state is being tested
	 * @function
	 * @param {Object} state The state for the worker to use per test
	 */
	WrappedWorker.prototype.setTestState = function(state) {
		_state = state;
	};

	/**
	 * @description Returns the current test state
	 * @function
	 * @returns {Object} The current state being tested in the worker
	 * @since 11.0
	 */
	WrappedWorker.prototype.getTestState = function() {
		return _state;
	};
	/**
	 * @description Allows an exception to be ignored during testing - for example a failed lookup for a file that does not exist,
	 * to avoid failing a test
	 * @param {boolean} flag The exception to ignore
	 */
	WrappedWorker.prototype.ignore404s = function(flag) {
		ignore404s = flag;
	};

	/**
	 * @description Adds a fake file that will return the given contents when requested rather than perform an xhr
	 * only be ignored once.
	 * @function
	 * @param {String} fileName the file name to ignore
	 */
	WrappedWorker.prototype.createTestFile = function(fileName, text) {
		testFiles[fileName] = text;
	};

	function maybeCallback(rejection, error) {
		if(ignore404s && rejection.status === 404) {
				return;
		}
		_state.callback(new Error(error));
	}

	function onmessage(ev) {
		if(typeof ev.data === 'object') {
			var _d = ev.data;
			var id  = _d.messageID;
			var f = callbacks[id];
			if(typeof f === 'function') {
				if(_d.error) {
					f(_d, _d.error);
				} else {
					f(_d);
				}
				delete callbacks[id];
			} else if(_d.request === "worker_ready") {
    			if(typeof _state.workerReady === 'function') {
					_state.workerReady();
				} else {
					this.postMessage({request: 'start_server', args: {}},
						/* @callback */ function(response) {
							delete _state.warmup;
							_state.callback();
						});
				}
			} else if(_d.request === "start_server") {
				return;
			} else if(_d.request === 'read') {
				var url, filePath;
				if(_d.args && _d.args.file) {
					if(typeof _d.args.file === 'object') {
						filePath = _d.args.file.logical ? _d.args.file.logical : _d.args.file;
						url = getFileURL(filePath);

						if (typeof testFiles[filePath] === 'string'){
							if (testFiles[filePath].length > 0){
								this.postMessage({request: 'read', ternID: _d.ternID, args: {contents: testFiles[filePath], file: filePath, logical: _d.args.file.logical}});
							} else {
								this.postMessage({request: 'read', ternID: _d.ternID, args: {error: "Empty test file ignored", logical: _d.args.file.logical}});
							}
							testFiles[filePath] = undefined;
							return;
						}

						_xhr('GET', url.href, {log: true, timeout: 2000}).then(function(response) {
							this.postMessage({request: 'read', ternID: _d.ternID, args: {contents: response.response, file: response.url, logical: _d.args.file.logical}});
						}.bind(this), function(rejection) {
							var error = 'XHR GET failed: ' + url.href;
							maybeCallback(rejection, error);
							this.postMessage({request: 'read', ternID: _d.ternID, args: {error: error, logical: _d.args.file.logical, file: rejection.url}});
						}.bind(this));
					} else if(typeof _d.args.file === 'string') {
						filePath = _d.args.file;
						url = getFileURL(filePath);

						if (typeof testFiles[filePath] === 'string'){
							if (testFiles[filePath].length > 0){
								this.postMessage({request: 'read', ternID: _d.ternID, args: {contents: testFiles[filePath], file: filePath, logical: _d.args.file.logical}});
							} else {
								this.postMessage({request: 'read', ternID: _d.ternID, args: {error: "Empty test file ignored", logical: _d.args.file.logical}});
							}
							testFiles[filePath] = undefined;
							return;
						}

						_xhr('GET', url.href, {log: true, timeout: 2000}).then(function(response) {
							this.postMessage({request: 'read', ternID: _d.ternID, args: {contents: response.target.response, file: response.target.responseURL}});
						}.bind(this), function(rejection){
							var error = 'XHR GET failed: ' + url.href;
							maybeCallback(rejection, error);
							this.postMessage({request: 'read', ternID: _d.ternID, args: {error: error, logical: _d.args.file.logical, file: rejection.url}});
						}.bind(this));
					}
				} else {
					this.postMessage({request: 'read', ternID: _d.ternID, args: {contents: _state.buffer, file: _state.file}});
				}
			} else if(_d.request === 'delFile' || _d.request === 'addFile') {
				return;
			} else if(typeof _d.request === 'string') {
				//don't process requests other than the ones we want
				_state.callback(new Error('Got message I don\'t know: '+_d.request));
			} else if(_d.error) {
				var err = _d.error;
				if(err instanceof Error) {
					_state.testErr = err;
					_state.callback(err);
				} else if(typeof err === 'string') {
					if(typeof _d.message === 'string') {
						_state.testErr = new Error(err+": "+_d.message);
						_state.callback(new Error(err+": "+_d.message));
					} else {
						//wrap it
						_state.testErr = new Error(err);
						_state.callback(new Error(err));
					}
				} else if(err && typeof err.message === 'string') {
					_state.testErr = new Error(err.message);
					_state.callback(new Error(err.message));
				}
			} else if(_d.__isError && _d.xhr) {
				//these are reports from failing to load a definition file or plugin via a tern-project file
				//they are a delayed XHR that will not fail a test - a normal XHR fail from the tests will hit the rejjection
				//functions in the read callback above
				return;
			} else {
				_state.callback(new Error('Got message I don\'t know: '+JSON.stringify(_d)));
			}
		}
	}

	function onerror(err) {
		if(err instanceof Error) {
			_state.callback(err);
		} else if(typeof err === 'string') {
			//wrap it
			_state.callback(new Error(err));
		} else if(err && typeof err.message === 'string') {
			_state.callback(new Error(err.message));
		}
	}

	function getFileURL(filePath){
		var rootIndex = window.location.href.indexOf('js-tests/javascript');
		if(!/\.js$/g.test(filePath)) {
			// Must have trailing .js extension
			filePath += '.js';
		}
		if (/^(?:\.\/|\.\.\/)/g.test(filePath)){ // starts with ./ or ../
			// Relative file paths need to be relative to js-tests/javascript/ folder
			if (rootIndex === -1){
				return new URL('js-tests/javascript/' + filePath, window.location.href);
			} else {
				return new URL(filePath, window.location.href);
			}
		} else {
			// Absolute paths need to use the site root
			if (rootIndex > -1){
				return new URL(filePath, window.location.href.substring(0, rootIndex));
			} else {
				return new URL(filePath, window.location.href);
			}
		}
	}

	return {
		instance:  function(state) {
			// Allow for both self-hosted and hermetic (karma) tests.
			var localTest = document.URL.indexOf('/js-tests/') > -1;
			var path = "../../" + (!localTest ? "base/" : "") + "javascript/plugins/ternWorker.js";
			if(typeof state.path === 'string') {
				path = state.path;
			}
			return new WrappedWorker(path, state);
		}
	};
});
