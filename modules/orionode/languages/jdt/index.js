/*******************************************************************************
 * Copyright (c) 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
const path = require('path'),
    cp = require('child_process'),
    api = require('../../lib/api'),
    net = require('net'),
    fs = require('fs'),
    fileUtil = require('../../lib/fileUtil'),
    log4js = require('log4js'),
    logger = log4js.getLogger("jdt-lsp");

const CONTENT_LENGTH = 'Content-Length: ',
	CONTENT_LENGTH_SIZE = CONTENT_LENGTH.length;

let remainingData,
	childProcess,
	java_home,
    ready = false,
    DEBUG = true;

class JDTLanguageServer {
	constructor(options) {
		this._options = options;
	}
	get route() {
		return '/jdt';
	}
	get id() {
		return 'java.jdt.language.server';
	}
	get name() {
		return 'JDT Java language server';
	}
	get contentType() {
		return ["text/x-java-source", "application/x-jsp"];
	}
	/**
	 * @callback From the language server registry
	 */
	onStart(socket, msg, options) {
		if(!ready) {
			console.log("ON START: jdt handler");
			var javaHome = getJavaHome();
			if (!javaHome) {
				let err = new Error('JAVA_HOME needs to be set. LSP featrues will be disabled');
				logger.error(err.message);
			}
			return runJavaServer(javaHome, options).then(function(child) {
				childProcess = child;
				child.on('error', function(err) {
					//closeServer();
					logger.error('java server process error: ' + err.toString());
					ready = false;
				});
				child.once('exit', function(code, signal) {
					//closeServer();
					logger.log("Java child process exited with code: "+code+" along with signal: "+signal);
					ready = false;
				});
			});
		}
	}
	/**
	 * @callback From the language server registry
	 */
	onData(socket, data) {
		console.log("ON DATA: jdt handler");
		const textDocument = data.params && data.params.textDocument;
		if (textDocument && textDocument.uri) {
			const workspaceUrl = "file:///" + this._options.workspaceDir.replace(/\\/g, "/"),
					workspaceFile = fileUtil.getFile2(this._options.metastore, textDocument.uri.replace(/^\/file/, ''));
			textDocument.uri = workspaceUrl + workspaceFile.path.slice(workspaceFile.workspaceDir.length);
			// convert backslashes to slashes only if on Windows
			if (path.sep === '\\') {
				textDocument.uri = textDocument.uri.replace(/\\/g, "/");
			}
		}
		var s = JSON.stringify(data);
		if (!ready) {
			// check if this is the initialization message if not skip it
			if (data.method !== "initialize" && data.method !== "textDocument/didOpen") {
				return;
			}
		}
		logger.info('data sent : ' + s);
		//stream.write("Content-Length: " + s.length + "\r\n\r\n" + s);
	}
	/**
	 * @callback From the language server registry
	 */
	onDisconnect(socket) {
		console.log("ON DISCONNECT: jdt handler");
		if(childProcess) {
			if (childProcess.connected) {
				childProcess.disconnect();
			} else {
				childProcess.kill();
			}
		}
		ready = false;
	}
	/**
	 * @callback From the language server registry
	 */
	onError(socket, err) {
		console.log("ON ERROR: jdt handler");
	}
}
module.exports = JDTLanguageServer;

/**
 * Gets the Java home location from the backing process environment, or tries to compute it.
 * @returns {string} The Java home location or `null`
 * @since 18.0
 */
function getJavaHome() {
	if(!java_home) {
		if(typeof process.env.JAVA_HOME === 'string' && process.env.JAVA_HOME) {
			java_home = process.env.JAVA_HOME;
		} else if(process.platform === 'darwin') {
			java_home = cp.execSync("/usr/libexec/java_home").toString().trim();
		} else if(process.platform === 'linux') {
			//TODO anything magical we can do here to compute the 'default' Java?
		} else if(process.platform === 'win32') {
			//TODO not sure Windows has any way to know where Java is installed
		}
	}
	return java_home;
}
// function parseMessage(data, workspaceUrl, sock) {
// 	try {
// 		var dataContents = data;
// 		if (remainingData) {
// 			dataContents = Buffer.concat([remainingData, dataContents]);
// 		}
// 		var offset = 0;
// 		var headerIndex = -1;
// 		loop: while ((headerIndex = dataContents.indexOf(CONTENT_LENGTH, offset, 'ascii')) !== -1) {
// 			// this is an known header
// 			var headerSizeIndex = dataContents.indexOf('\r\n\r\n', headerIndex + CONTENT_LENGTH_SIZE, 'ascii');
// 			if (headerSizeIndex !== -1) {
// 				var messageSize = Number(dataContents.slice(headerIndex + CONTENT_LENGTH_SIZE, headerSizeIndex));
// 				if (messageSize + headerSizeIndex >= dataContents.length) {
// 					// not enough data
// 					offset = headerIndex;
// 					break loop;
// 				}
// 				offset = headerSizeIndex + 4 + messageSize;
// 				// enough data to get the message contents
// 				var contents = dataContents.slice(headerSizeIndex + 4, headerSizeIndex + 4 + messageSize);
// 				var json = null;
// 				try {
// 					json = JSON.parse(contents.toString('utf8'));
// 				} catch(e) {
// 					logger.error(e);
// 					logger.error("==================== START CURRENT DATA =============================\n");
// 					logger.error("contents = " + contents);
// 					logger.error("messageSize = " + messageSize);
// 					logger.error("full data contents = " + dataContents);
// 					logger.error("headerSizeIndex = " + headerSizeIndex);
// 					logger.error("raw data = " + data);
// 					logger.error("raw data slice= " + data.slice(headerSizeIndex + 4, headerSizeIndex + 4 + messageSize));
// 					logger.error("remaining data = " + remainingData);
// 					logger.error("==================== END CURRENT DATA =============================\n");
// 				}
// 				if (json) {
// 					if (json.params) {
// 						fixURI(json.params, workspaceUrl);
// 					}
// 					if (json.result) {
// 						fixURI(json.result, workspaceUrl);
// 					}
// 				}
// 				if (json !== null && sock) {
// 					// detect that the server is ready
// //					{"method":"language/status","params":{"type":"Started","message":"Ready"},"jsonrpc":"2.0"}
// 					if (!ready
// 							&& json.method === "language/status"
// 							&& json.params
// 							&& json.params.type === "Started"
// 							&& json.params.message === "Ready") {
// 						ready = true;
// 					}
// 					logger.info(JSON.stringify(json));
// 					sock.emit('data', json);
// 				}
// 			} else {
// 				offset = headerIndex;
// 				break loop;
// 			}
// 		}
// 		if (offset === 0) {
// 			remainingData = dataContents;
// 		} else if (offset < dataContents.length) {
// 			remainingData = dataContents.slice(offset, dataContents.length);
// 		} else {
// 			remainingData = null;
// 		}
// 	} catch (err) {
// 		logger.error(err);
// 	}
// }

function fixURI(p, workspaceUrl) {
	if (Array.isArray(p)) {
		p.forEach(function(element) {
			fixURI(element, workspaceUrl);
		});
	}
	if (p.uri) {
		var s = p.uri.slice(workspaceUrl.length);
		p.uri = api.join('/file/orionode', s.charAt(0) === '/' ? s.slice(1) : s);
	}
}

/**
 * Run the Java language server
 * @param {string} javaHome The absolute path to the Java home directory
 * @param {{?}} options The map of options
 * @returns {Promise} A promise to load the Java language server
 */
function runJavaServer(javaHome, options) {
	return new Promise(function(resolve, reject) {
		const child = path.join(javaHome, '/jre/bin/java'),
			params = [];
		if (DEBUG) {
			params.push('-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=1044');
		}
		params.push("-Dlog.level=ALL");
		params.push('-Declipse.application=org.eclipse.jdt.ls.core.id1');
		params.push('-Dosgi.bundles.defaultStartLevel=4');
		params.push('-Declipse.product=org.eclipse.jdt.ls.core.product');
		if (DEBUG) {
			params.push('-Dlog.protocol=true');
		}
		var pluginsFolder = path.resolve(__dirname, './plugins');
		return fs.readdirAsync(pluginsFolder).then(function(files) {
			if (Array.isArray(files) && files.length !== 0) {
				for (var i = 0, length = files.length; i < length; i++) {
					var file = files[i];
					var indexOf = file.indexOf('org.eclipse.equinox.launcher_');
					if (indexOf !== -1) {
						params.push('-jar');
						params.push(path.resolve(__dirname, './plugins/' + file));
			
						//select configuration directory according to OS
						var configDir = 'config_win';
						if (process.platform === 'darwin') {
							configDir = 'config_mac';
						} else if (process.platform === 'linux') {
							configDir = 'config_linux';
						}
						params.push('-configuration');
						params.push(path.resolve(__dirname, configDir));
						params.push('-data');
						params.push(options.workspaceDir);
					}
				}
				return fork(child, params, options).then((childProcess) => {
					resolve(childProcess);
				}, (err) => {
					reject(err);
				});
			}
		});
	});
}
/**
 * Create a new child process
 * @param {string} modulePath The module path to spawn
 * @param {{?}} args The arguments array
 * @param {{?}} options The map of options
 * @returns {Promise} A promise to spawn the child process
 */
function fork(modulePath, args, options) {
	return new Promise((resolve, reject) => {
		const newEnv = generatePatchedEnv(process.env, options.IN_PORT, options.OUT_PORT),
		childProcess = cp.spawn(modulePath, args, {
			silent: true,
			cwd: options.cwd,
			env: newEnv,
			execArgv: options.execArgv
		});
		childProcess.once('error', function(err) {
			logger.error("Java process error event");
			logger.error(err);
			reject(err);
		});
		childProcess.once('exit', function(err) {
			logger.error("Java process exit event");
			logger.error(err);
			reject(err);
		});
		resolve(childProcess);
	});
}
/**
 * Clones the given environment map and adds in the std-in / std-out ports numbers
 * @param {*} env 
 * @param {*} inPort 
 * @param {*} outPort 
 */
function generatePatchedEnv(env, inPort, outPort) {
	// Set the two unique pipe names and the electron flag as process env
	var newEnv = {};
	for (var key in env) {
		newEnv[key] = env[key];
	}
	newEnv['STDIN_PORT'] = inPort;
	newEnv['STDOUT_PORT'] = outPort;
	return newEnv;
}
