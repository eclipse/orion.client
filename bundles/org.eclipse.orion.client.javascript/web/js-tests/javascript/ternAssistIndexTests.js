/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2017 IBM Corporation, Inc. and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, mocha, browser*/
/* eslint-disable missing-nls */
define([
'js-tests/javascript/testingWorker',
'javascript/astManager',
'javascript/contentAssist/ternAssist',
'javascript/cuProvider',
'chai/chai',
'orion/Deferred',
'mocha/mocha' //must stay at the end, not a module
], function(TestWorker, ASTManager, TernAssist, CUProvider, chai, Deferred) {
	var assert = chai.assert;
	var worker;
	before("reset timeout", function(done) {
		worker = TestWorker.instance({delayedStart: true});
		this.timeout(20000);
		worker.start(done);
	});
	after("stop the worker", function() {
		if(worker) {
			worker.terminate();
		}
	});

	var ternAssist;
	var astManager = new ASTManager.ASTManager();
	var jsFile = 'tern_content_assist_index_test_script.js';
	var htmlFile = 'tern_content_assist_index_test_script.html';
	var timeoutReturn = ['Content assist timed out'];
	var jsProject = {
		getEcmaLevel: function getEcmaLevel() {},
		getESlintOptions: function getESlintOptions() {
			return new Deferred().resolve(null);
		},
		getComputedEnvironment: function getComputedEnvironment() {
			return new Deferred().resolve({});
		}
	};

	/**
	 * @description Sets up the test
	 * @param {Object} options The options the set up with
	 * @returns {Object} The object with the initialized values
	 */
	function setup(options) {
		var state = Object.create(null);
		var buffer = state.buffer = typeof options.buffer === 'undefined' ? '' : options.buffer;
		var prefix = state.prefix = typeof options.prefix === 'undefined' ? '' : options.prefix;
		var offset = state.offset = typeof options.offset === 'undefined' ? 0 : options.offset;
		var line = state.line = typeof options.line === 'undefined' ? '' : options.line;
		var keywords = typeof options.keywords === 'undefined' ? false : options.keywords;
		var templates = typeof options.templates === 'undefined' ? false : options.templates;

		var contentType = options.contenttype ? options.contenttype : 'application/javascript';
		var	file = state.file = jsFile;
		if (contentType === 'text/html'){
			// Tern plug-ins don't have the content type, only the name of the file
			file = state.file = htmlFile;
		}
		assert(options.callback, 'You must provide a test callback for worker-based tests');
		state.callback = options.callback;
		worker.setTestState(state);
		var ecma = options.ecma ? options.ecma : 5;
		jsProject.getEcmaLevel = function() {
			return new Deferred().resolve(ecma);
		};
		// Delete any test files created by previous tests
		worker.postMessage({request: 'delFile', args:{file: jsFile}});
		worker.postMessage({request: 'delFile', args:{file: htmlFile}});

		var editorContext = {
			/*override*/
			getText: function() {
				return new Deferred().resolve(buffer);
			},

			getFileMetadata: function() {
			    var o = Object.create(null);
			    o.contentType = Object.create(null);
			    o.contentType.id = contentType;
			    o.location = file;
			    return new Deferred().resolve(o);
			}
		};
		astManager.onModelChanging({file: {location: file}});
		var params = {offset: offset, prefix : prefix, keywords: keywords, template: templates, line: line, timeout: options.timeout ? options.timeout : 20000, timeoutReturn: timeoutReturn};
		return {
			editorContext: editorContext,
			params: params
		};
	}

	/**
	 * @description Pretty-prints the given array of proposal objects
	 * @param {Array} expectedProposals The array of proposals
	 * @returns {String} The pretty-printed proposals
	 */
	function stringifyExpected(expectedProposals) {
		var text = "";
		for (var i = 0; i < expectedProposals.length; i++)  {
			var prop = expectedProposals[i][0].replace(/\n/g, "\\n");
			prop = prop.replace(/\'/g, "\\'");
			text += '[\'' + prop + "\', \'" + expectedProposals[i][1] + "\'],\n"; //$NON-NLS-1$ //$NON-NLS-0$
		}
		return text;
	}

	/**
	 * @description Pretty-prints the given array of proposal objects
	 * @param {Array} expectedProposals The array of proposals
	 * @returns {String} The pretty-printed proposals
	 */
	function stringifyActual(actualProposals) {
		var text = "";
		for (var i = 0; i < actualProposals.length; i++) {
			var prop = actualProposals[i].proposal.replace(/\n/g, "\\n");
			prop = prop.replace(/\'/g, "\\'");
			if (actualProposals[i].name) {
				var desc = actualProposals[i].description ? actualProposals[i].description : "";
				text += '[\'' + prop + "\', \'" + actualProposals[i].name + desc + "\'],\n"; //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				text += '[\'' + prop + "\', \'" + actualProposals[i].description + "\'],\n"; //$NON-NLS-1$ //$NON-NLS-0$
			}
		}
		return text;
	}

	/**
	 * @description Checks the proposals returned from the given proposal promise against
	 * the array of given proposals
	 * @param {Object} options The options to test with
	 * @param {Array} expectedProposals The array of expected proposal objects
	 */
	function testProposals(options, expectedProposals) {
		var _p = setup(options);
		assert(_p, 'setup() should have completed normally');
		ternAssist.computeContentAssist(_p.editorContext, _p.params).then(function (actualProposals) {
			try {
				assert(actualProposals, "Error occurred, returned proposals was undefined");
				if (actualProposals === timeoutReturn){
					assert(false, "The content assist operation timed out");
				}
				assert.equal(actualProposals.length, expectedProposals.length,
					"Wrong number of proposals.  Expected:\n" + stringifyExpected(expectedProposals) +"\nActual:\n" + stringifyActual(actualProposals));
				for (var i = 0; i < actualProposals.length; i++) {
				    var ap = actualProposals[i];
				    var ep = expectedProposals[i];
					var text = ep[0];
					var description = ep[1];
					assert.equal(ap.proposal, text, "Invalid proposal text. Expected proposals:\n" + stringifyExpected(expectedProposals) +"\nActual proposals:\n" + stringifyActual(actualProposals)); //$NON-NLS-0$
					if (description) {
						if (ap.name) {
							var desc = ap.description ? ap.description : "";
							assert.equal(ap.name + desc, description, "Invalid proposal description. Expected proposals:\n" + stringifyExpected(expectedProposals) +"\nActual proposals:\n" + stringifyActual(actualProposals)); //$NON-NLS-0$
						} else {
							assert.equal(ap.description, description, "Invalid proposal description. Expected proposals:\n" + stringifyExpected(expectedProposals) +"\nActual proposals:\n" + stringifyActual(actualProposals)); //$NON-NLS-0$
						}
					}
					if(ep.length >= 3 && !ap.unselectable /*headers have no hover*/) {
					    //check for doc hover
					    assert(ap.hover, 'There should be a hover entry for the proposal');
					    assert(ap.hover.content.indexOf(ep[2]) === 0, "The doc should have started with the given value.\nActual: " + ap.hover.content + '\nExpected: ' + ep[2]);
					}
					if (ep.length >= 4 && typeof ep[3] === 'object'){
						assert(ap.groups, "Expected template proposal with selection group");
						assert(ap.groups[0].positions, "Expected template proposal with selection group");
						var offset = ap.groups[0].positions[0].offset;
						var len = ap.groups[0].positions[0].length;
						assert.equal(offset, ep[3].offset, "Template proposal had different offset for selection group");
						assert.equal(offset, ep[3].offset, "Template proposal had different offset for selection group");
						assert.equal(len, ep[3].length, "Template proposal had different length for selection group");
					}
				}
				worker.getTestState().callback();
			}
			catch(err) {
				worker.getTestState().callback(err);
			}
		}, function (error) {
			worker.getTestState().callback(error);
		});
	}

	describe('Tern Content Assist for Index Plugin Tests', function() {
		this.timeout(10000);
		before('Message the server for warm up', function(done) {
			CUProvider.setUseCache(false);
			ternAssist = new TernAssist.TernContentAssist(astManager, worker, CUProvider, jsProject);
			worker.start(done); // Reset the tern server state to remove any prior files
		});

		describe('AMQP', function() {
			before('Restart with the amqp plugin', function(done) {
				worker.start(done, {options: {plugins: {amqp: {}, node: {}}, libs: []}});
			});

			it('AMQP templates - no eslint-env', function(done) {
				var options = {
					buffer: "amq",
					prefix: "amq",
					offset: 3,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'amqp'],
					['AMQPParser(version, type)', 'AMQPParser(version, type)'],
					['var amqp = require(\'amqp\');\n', 'amqp'],
					['var amqp = require(\'amqp\');\nvar connection = amqp.createConnection({\n	host: host,\n	port: port,\n	login: login,\n	password: password\n});\n', 'amqp connection'],
					['var exchange = connection.exchange(id, {type: \'topic\'}, function(exchange) {\n	\n});\n', 'amqp exchange'],
					['connection.on(event, function() {\n	\n});\n', 'amqp on'],
					['connection.queue(id, function(queue) {\n	queue.bind(\'#\'); //catch all messages\n	queue.subscribe(function (message, headers, deliveryInfo) {\n		// Receive messages\n	});\n	\n});\n', 'amqp queue'],
				]);
			});
			it('AMQP templates - eslint-env set', function(done) {
				var options = {
					buffer: "/* eslint-env amqp */\namq",
					prefix: "amq",
					offset: 25,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'amqp'],
					['AMQPParser(version, type)', 'AMQPParser(version, type)'],
					['var amqp = require(\'amqp\');\n', 'amqp'],
					['var amqp = require(\'amqp\');\nvar connection = amqp.createConnection({\n	host: host,\n	port: port,\n	login: login,\n	password: password\n});\n', 'amqp connection'],
					['var exchange = connection.exchange(id, {type: \'topic\'}, function(exchange) {\n	\n});\n', 'amqp exchange'],
					['connection.on(event, function() {\n	\n});\n', 'amqp on'],
					['connection.queue(id, function(queue) {\n	queue.bind(\'#\'); //catch all messages\n	queue.subscribe(function (message, headers, deliveryInfo) {\n		// Receive messages\n	});\n	\n});\n', 'amqp queue'],
				]);
			});
			it('AMQP completions - amqp.cre', function(done) {
				var options = {
					buffer: "/* eslint-env node, amqp */\nvar amqp = require('amqp'); var connection = amqp.cre",
					prefix: "cre",
					offset: 81,
					callback: done
				};
				testProposals(options, [
					['', 'amqp'],
					['createConnection(options, implOptions, readyCallback)', 'createConnection(options, implOptions, readyCallback) : Connection'],
				]);
			});
			it('AMQP completions - connection.o', function(done) {
				var options = {
					buffer: "/* eslint-env node, amqp */\nvar amqp = require('amqp'); var connection = amqp.createConnection({});\nconnection.o",
					prefix: "o",
					offset: 112,
					callback: done
				};
				testProposals(options, [
					['', 'amqp'],
					['on(event, action)', 'on(event, action)'],
				]);
			});
			it('AMQP completions - connection.exch', function(done) {
				var options = {
					buffer: "/* eslint-env node, amqp */\nvar amqp = require('amqp'); var connection = amqp.createConnection({});\nconnection.exch",
					prefix: "exch",
					offset: 115,
					callback: done
				};
				testProposals(options, [
					['', 'amqp'],
					['exchange(name, options, openCallback)', 'exchange(name, options, openCallback) : Exchange'],
					['exchangeClosed(name)', 'exchangeClosed(name)'],
				]);
			});
			it('AMQP completions - connection.queu', function(done) {
				var options = {
					buffer: "/* eslint-env node, amqp */\nvar amqp = require('amqp'); var connection = amqp.createConnection({});\nconnection.queu",
					prefix: "queu",
					offset: 115,
					callback: done
				};
				testProposals(options, [
					['', 'amqp'],
					['queue(name)', 'queue(name) : Queue'],
					['queueClosed(name)', 'queueClosed(name)'],
				]);
			});
		});

		describe('Express', function() {
			before('Restart with the express plugin', function(done) {
				worker.start(done, {options: {plugins: {express: {}, node: {}}, libs: ['ecma5']}});
			});
			it('Express templates - no eslint-env', function(done) {
				var options = {
					buffer: "expr",
					prefix: "expr",
					offset: 2,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'express'],
					["var express = require('express');\nvar app = express();\n\napp.listen(timeout);\n",'express app'],
					['app.engine(fnOrObject);\n', 'express app engine'],
					['app.use(function(error, request, result, next) {\n	result.send(code, message);\n});\n', 'express app error use'],
					['var value = app.get(id, function(request, result){\n	\n});\n', 'express app get'],
					['app.param(id, value);\n', 'express app param'],
					['app.set(id, value);\n', 'express app set'],
					['app.use(fnOrObject);\n', 'express app use'],
					['var app = require(\'express\');', 'express require']
				]);
			});
			it('Express templates - eslint-env set', function(done) {
				var options = {
					buffer: "/* eslint-env express */\nexpr",
					prefix: "expr",
					offset: 27,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'express'],
					["var express = require('express');\nvar app = express();\n\napp.listen(timeout);\n",'express app'],
					['app.engine(fnOrObject);\n', 'express app engine'],
					['app.use(function(error, request, result, next) {\n	result.send(code, message);\n});\n', 'express app error use'],
					['var value = app.get(id, function(request, result){\n	\n});\n', 'express app get'],
					['app.param(id, value);\n', 'express app param'],
					['app.set(id, value);\n', 'express app set'],
					['app.use(fnOrObject);\n', 'express app use'],
					['var app = require(\'express\');', 'express require']
				]);
			});
			it('Express templates - eslint-env set, check offsets', function(done) {
				var options = {
					buffer: "/* eslint-env express */\nexpres\nvar a = 3;",
					prefix: "expres",
					offset: 31,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'express'],
					["var express = require('express');\nvar app = express();\n\napp.listen(timeout);\n",'express app'],
					['app.engine(fnOrObject);\n', 'express app engine'],
					['app.use(function(error, request, result, next) {\n	result.send(code, message);\n});\n', 'express app error use'],
					['var value = app.get(id, function(request, result){\n	\n});\n', 'express app get'],
					['app.param(id, value);\n', 'express app param'],
					['app.set(id, value);\n', 'express app set'],
					['app.use(fnOrObject);\n', 'express app use'],
					['var app = require(\'express\');', 'express require']
				]);
			});
			it('Express completions - app.u', function(done) {
				var options = {
					buffer: "/* eslint-env node, express */\nvar express = require('express'); var app = express(); app.u",
					prefix: "u",
					offset: 91,
					callback: done
				};
				testProposals(options, [
					['', 'express'],
					['use(fn)', 'use(fn)', 'Proxy `Router#use()`']
				]);
			});
			it('Express completions - app.static', function(done) {
				var options = {
					buffer: "/* eslint-env node, express */\nvar express = require('express'); express.stati",
					prefix: "stati",
					offset: 78,
					callback: done
				};
				testProposals(options, [
					['', 'express'],
					['static(name)', 'static(name)', 'Built-in middleware function.']
				]);
			});
			it('Express completions - app.', function(done) {
				var options = {
					buffer: "/* eslint-env node, express */\nvar express = require('express'); var app = express(); app.",
					prefix: "",
					offset: 90,
					callback: done
				};
				testProposals(options, [
					['', 'express'],
					['METHOD()', 'METHOD()'],
					['all(path)', 'all(path)'],
					['compileETag(val)', 'compileETag(val)'],
					['compileQueryParser(val)', 'compileQueryParser(val)'],
					['compileTrust(val)', 'compileTrust(val)'],
					['defaultConfiguration()', 'defaultConfiguration()'],
					['delete()', 'delete()'],
					['disable(setting)', 'disable(setting) : app'],
					['disabled(setting)', 'disabled(setting) : bool'],
					['enable(setting)', 'enable(setting) : app'],
					['enabled(setting)', 'enabled(setting) : bool'],
					['engine(ext, fn)', 'engine(ext, fn)'],
					['etag(body, encoding?)', 'etag(body, encoding?) : string'],
					['get()', 'get()'],
					['handle(req, res, callback)', 'handle(req, res, callback)'],
					['init(app)', 'init(app) : fn(req: any, res: any, next: any)|Function'],
					['isAbsolute(path)', 'isAbsolute(path) : bool'],
					['lazyrouter()', 'lazyrouter()'],
					['listen()', 'listen()'],
					['normalizeType(type)', 'normalizeType(type) : acceptParams.!ret'],
					['normalizeTypes(types)', 'normalizeTypes(types) : [acceptParams.!ret]'],
					['param(name, fn)', 'param(name, fn)'],
					['path()', 'path() : string'],
					['post()', 'post()'],
					['put()', 'put()'],
					['render(name, options, callback)', 'render(name, options, callback)'],
					['route(path)', 'route(path)'],
					['set(setting, val)', 'set(setting, val)'],
					['setCharset(type, charset)', 'setCharset(type, charset)'],
					['use(fn)', 'use(fn)'],
					['wetag(body, encoding?)', 'wetag(body, encoding?) : string'],
					['Route', 'Route : app.Route'],
					['application', 'application : app.application'],
					['request', 'request : app.request'],
					['response', 'response : app.response'],
					['', 'ecma5'],
					['hasOwnProperty(prop)', 'hasOwnProperty(prop) : bool'],
					['isPrototypeOf(obj)', 'isPrototypeOf(obj) : bool'],
					['propertyIsEnumerable(prop)', 'propertyIsEnumerable(prop) : bool'],
					['toLocaleString()', 'toLocaleString() : string'],
					['toString()', 'toString() : string'],
					['valueOf()', 'valueOf() : number'],
				]);
			});
		});

		describe('MongoDB', function() {
			before('Restart with the mongodb plugin', function(done) {
				worker.start(done, {options: {plugins: {mongodb: {}, node: {}}, libs: []}});
			});
			it('MongoDB templates - no eslint-env', function(done) {
				var options = {
					buffer: "mongo",
					prefix: "mongo",
					offset: 5,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'mongodb'],
					['mongodb', 'mongodb : mongodb'],
					['var MongoClient = require(\'mongodb\').MongoClient;\nvar Server = require(\'mongodb\').Server;\n', 'mongodb client'],
					['db.collection(id, function(error, collection) {\n	\n});', 'mongodb collection'],
					['var MongoClient = require(\'mongodb\').MongoClient;\nMongoClient.connect(url, function(error, db) {\n	\n});\n', 'mongodb connect'],
					['if (process.env.VCAP_SERVICES) {\n	var env = JSON.parse(process.env.VCAP_SERVICES);\n	var mongo = env[\'mongo-version\'][0].credentials;\n} else {\n	var mongo = {\n		username : \'username\',\n		password : \'password\',\n		url : \'mongodb://username:password@localhost:27017/database\'\n	};\n}\nvar MongoClient = require(\'mongodb\').MongoClient;\nMongoClient.connect(mongo.url, function(error, db) {\n	\n});\n', 'mongodb connect (Cloud Foundry)'],
					['var MongoClient = require(\'mongodb\').MongoClient;\nvar Server = require(\'mongodb\').Server;\nvar client = new MongoClient(new Server(host, port));\ntry {\n	client.open(function(error, client) {\n		var db = client.db(name);\n		\n	});\n} finally {\n	client.close();\n};', 'mongodb open'],
					['db.collection(id, {strict:true}, function(error, collection) {\n	\n});', 'mongodb strict collection']
				]);
			});
			it('MongoDB templates - eslint-env set', function(done) {
				var options = {
					buffer: "/* eslint-env mongodb */\nmongo",
					prefix: "mongo",
					offset: 30,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'mongodb'],
					['mongodb', 'mongodb : mongodb'],
					['var MongoClient = require(\'mongodb\').MongoClient;\nvar Server = require(\'mongodb\').Server;\n', 'mongodb client'],
					['db.collection(id, function(error, collection) {\n	\n});', 'mongodb collection'],
					['var MongoClient = require(\'mongodb\').MongoClient;\nMongoClient.connect(url, function(error, db) {\n	\n});\n', 'mongodb connect'],
					['if (process.env.VCAP_SERVICES) {\n	var env = JSON.parse(process.env.VCAP_SERVICES);\n	var mongo = env[\'mongo-version\'][0].credentials;\n} else {\n	var mongo = {\n		username : \'username\',\n		password : \'password\',\n		url : \'mongodb://username:password@localhost:27017/database\'\n	};\n}\nvar MongoClient = require(\'mongodb\').MongoClient;\nMongoClient.connect(mongo.url, function(error, db) {\n	\n});\n', 'mongodb connect (Cloud Foundry)'],
					['var MongoClient = require(\'mongodb\').MongoClient;\nvar Server = require(\'mongodb\').Server;\nvar client = new MongoClient(new Server(host, port));\ntry {\n	client.open(function(error, client) {\n		var db = client.db(name);\n		\n	});\n} finally {\n	client.close();\n};', 'mongodb open'],
					['db.collection(id, {strict:true}, function(error, collection) {\n	\n});', 'mongodb strict collection']
				]);
			});
			it('MongoDB completions - require.MongoCli', function(done) {
				var options = {
					buffer: "/* eslint-env node, mongodb */\nvar MongoClient = require('mongodb').MongoCli",
					prefix: "MongoCli",
					offset: 76,
					callback: done
				};
				testProposals(options, [
					['', 'mongodb'],
					['MongoClient(serverConfig, options)', 'MongoClient(serverConfig, options)'],
				]);
			});
			it('MongoDB completions - MongoClient.con', function(done) {
				var options = {
					buffer: "/* eslint-env node, mongodb */\nvar MongoClient = require('mongodb').MongoClient;\nMongoClient.con",
					prefix: "con",
					offset: 96,
					callback: done
				};
				testProposals(options, [
					['', 'mongodb'],
					['connect(uri, options, callback)', 'connect(uri, options, callback)']
				]);
			});
		});

		describe('MySQL', function() {
			before('Restart with the mysql plugin', function(done) {
				worker.start(done, {options: {plugins: {mysql: {}, node: {}}, libs: []}});
			});
			it('MySQL templates - no eslint-env', function(done) {
				var options = {
					buffer: "mysq",
					prefix: "mysq",
					offset: 4,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'mysql'],
					['mysql', 'mysql : mysql'],
					['var mysql = require(\'mysql\');\nvar connection = mysql.createConnection({\n	host : host,\n	user : username,\n	password : password\n});\ntry {\n	connection.connect();\n	\n} finally {\n	connection.end();\n}', 'mysql connection'],
					['connection.query(sql, function(error, rows, fields) {\n	\n});\n', 'mysql query']
				]);
			});
			it('MySQL templates - eslint-env set', function(done) {
				var options = {
					buffer: "/* eslint-env mysql */\nmysq",
					prefix: "mysq",
					offset: 27,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'mysql'],
					['mysql', 'mysql : mysql'],
					['var mysql = require(\'mysql\');\nvar connection = mysql.createConnection({\n	host : host,\n	user : username,\n	password : password\n});\ntry {\n	connection.connect();\n	\n} finally {\n	connection.end();\n}', 'mysql connection'],
					['connection.query(sql, function(error, rows, fields) {\n	\n});\n', 'mysql query']
				]);
			});
			it('MySQL completions - mysql.createCon', function(done) {
				var options = {
					buffer: "/* eslint-env node, mysql */\nvar mysql = require('mysql');\nvar connection = mysql.createCon",
					prefix: "createCon",
					offset: 91,
					callback: done
				};
				testProposals(options, [
					['', 'mysql'],
					['createConnection(connectionUri)', 'createConnection(connectionUri) : mysql.Connection']
				]);
			});
			it('MySQL completions - connection.c', function(done) {
				var options = {
					buffer: "/* eslint-env node, mysql */\nvar mysql = require('mysql');\nvar connection = mysql.createConnection({});\nconnection.c",
					prefix: "c",
					offset: 116,
					callback: done
				};
				testProposals(options, [
					['', 'mysql'],
					['changeUser(options)', 'changeUser(options)'],
					['commit(callback)', 'commit(callback)'],
					['connect()', 'connect()'],
					['config', 'config : any']
				]);
			});
			it('MySQL completions - connection.q', function(done) {
				var options = {
					buffer: "/* eslint-env node, mysql */\nvar mysql = require('mysql');\nvar connection = mysql.createConnection({});\nconnection.q",
					prefix: "q",
					offset: 116,
					callback: done
				};
				testProposals(options, [
					['', 'mysql'],
					['query', 'query : any']
				]);
			});
			it('MySQL completions - connection.e', function(done) {
				var options = {
					buffer: "/* eslint-env node, mysql */\nvar mysql = require('mysql');\nvar connection = mysql.createConnection({});\nconnection.e",
					prefix: "e",
					offset: 116,
					callback: done
				};
				testProposals(options, [
					['', 'mysql'],
					['end()', 'end()'],
					['escape(value)', 'escape(value) : string'],
					['escapeId(value)', 'escapeId(value) : string']
				]);
			});
		});

		describe('Postgres', function() {
			before('Restart with the postgres plugin', function(done) {
				worker.start(done, {options: {plugins: {postgres: {}, node: {}}, libs: []}});
			});
			it('Postgres templates - no eslint-env', function(done) {
				var options = {
					buffer: "postgre",
					prefix: "postgre",
					offset: 7,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'pg'],
					['var pg = require(\'pg\');\n', 'postgres'],
					['var pg = require(\'pg\');\nvar url = "postgres://postgres:port@host/database";\nvar client = new pg.Client(url);\n', 'postgres client'],
					['var pg = require(\'pg\');\nvar url = "postgres://postgres:port@host/database";\nvar client = new pg.Client(url);\nclient.connect(function(error) {\n	\n});\n', 'postgres connect'],
					['client.query(sql, function(error, result) {\n	\n});\n', 'postgres query']
				]);
			});
			it('Postgres templates - eslint-env set', function(done) {
				var options = {
					buffer: "/* eslint-env pg */\npostgre",
					prefix: "postgre",
					offset: 27,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'pg'],
					['var pg = require(\'pg\');\n', 'postgres'],
					['var pg = require(\'pg\');\nvar url = "postgres://postgres:port@host/database";\nvar client = new pg.Client(url);\n', 'postgres client'],
					['var pg = require(\'pg\');\nvar url = "postgres://postgres:port@host/database";\nvar client = new pg.Client(url);\nclient.connect(function(error) {\n	\n});\n', 'postgres connect'],
					['client.query(sql, function(error, result) {\n	\n});\n', 'postgres query']
				]);
			});
			it('Postgres completions - pg.c', function(done) {
				var options = {
					buffer: "/* eslint-env node, pg */\nvar pg = require('pg');\npg.c",
					prefix: "c",
					offset: 54,
					callback: done
				};
				testProposals(options, [
					['', 'pg'],
					['Client(connection)', 'Client(connection)'],
					['connect(connection, callback)', 'connect(connection, callback)']
				]);
			});
		});

		describe('Redis', function() {
			before('Restart with the redis plugin', function(done) {
				worker.start(done, {options: {plugins: {redis: {}, node: {}}, libs: ['ecma5']}});
			});
			it('Redis templates - no eslint-env', function(done) {
				var options = {
					buffer: "redi",
					prefix: "redi",
					offset: 4,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'redis'],
					['RedisClient', 'RedisClient : RedisClient'],
					['var name = require(\'redis\');\n', 'redis'],
					['var name = require(\'redis\');\nvar client = name.createClient(port, host, options);\n', 'redis client'],
					['var name = require(\'redis\');\nvar client = name.createClient(port, host, options);\ntry {\n	\n} finally {\n	client.close();\n}\n', 'redis connect'],
					['client.get(key, function(error, reply) {\n	\n});\n', 'redis get'],
					['client.on(event, function(arg) {\n	});\n', 'redis on'],
					['client.set(key, value);\n', 'redis set']
				]);
			});
			it('Redis templates - eslint-env set', function(done) {
				var options = {
					buffer: "/* eslint-env redis */\nredi",
					prefix: "redi",
					offset: 27,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'redis'],
					['RedisClient', 'RedisClient : RedisClient'],
					['var name = require(\'redis\');\n', 'redis'],
					['var name = require(\'redis\');\nvar client = name.createClient(port, host, options);\n', 'redis client'],
					['var name = require(\'redis\');\nvar client = name.createClient(port, host, options);\ntry {\n	\n} finally {\n	client.close();\n}\n', 'redis connect'],
					['client.get(key, function(error, reply) {\n	\n});\n', 'redis get'],
					['client.on(event, function(arg) {\n	});\n', 'redis on'],
					['client.set(key, value);\n', 'redis set']
				]);
			});
			it('Redis completions - redis.cr', function(done) {
				var options = {
					buffer: "/* eslint-env node, redis */\nvar redis = require('redis');\nredis.cr",
					prefix: "cr",
					offset: 67,
					callback: done
				};
				testProposals(options, [
					['', 'redis'],
					['createClient(port_arg, host_arg?, options?)', 'createClient(port_arg, host_arg?, options?) : RedisClient']
				]);
			});
			it('Redis completions - client.h', function(done) {
				var options = {
					buffer: "/* eslint-env node, redis */\nvar redis = require('redis');\nvar client = redis.createClient();\nclient.h",
					prefix: "h",
					offset: 102,
					callback: done
				};
				testProposals(options, [
					['', 'ecma5'],
					['hasOwnProperty(prop)', 'hasOwnProperty(prop) : bool'],
					['', 'redis'],
					['hdel(args, callback?)', 'hdel(args, callback?)'],
					['hexists(args, callback?)', 'hexists(args, callback?)'],
					['hget(args, callback?)', 'hget(args, callback?)'],
					['hgetall(args, callback?)', 'hgetall(args, callback?)'],
					['hincrby(args, callback?)', 'hincrby(args, callback?)'],
					['hkeys(args, callback?)', 'hkeys(args, callback?)'],
					['hlen(args, callback?)', 'hlen(args, callback?)'],
					['hmget(args, callback?)', 'hmget(args, callback?)'],
					['hmset(args, callback?)', 'hmset(args, callback?)'],
					['hset(args, callback?)', 'hset(args, callback?)'],
					['hsetnx(args, callback?)', 'hsetnx(args, callback?)'],
					['hvals(args, callback?)', 'hvals(args, callback?)']
				]);
			});
			it('Redis completions - client.s', function(done) {
				var options = {
					buffer: "/* eslint-env node, redis */\nvar redis = require('redis');\nvar client = redis.createClient();\nclient.s",
					prefix: "s",
					offset: 102,
					callback: done
				};
				testProposals(options, [
					['', 'redis'],
					['sadd(args, callback?)', 'sadd(args, callback?)'],
					['save(args, callback?)', 'save(args, callback?)'],
					['scard(args, callback?)', 'scard(args, callback?)'],
					['sdiff(args, callback?)', 'sdiff(args, callback?)'],
					['sdiffstore(args, callback?)', 'sdiffstore(args, callback?)'],
					['select(args, callback?)', 'select(args, callback?)'],
					['set(key, value, callback?)', 'set(key, value, callback?)'],
					['setbit(args, callback?)', 'setbit(args, callback?)'],
					['setex(args, callback?)', 'setex(args, callback?)'],
					['setnx(args, callback?)', 'setnx(args, callback?)'],
					['setrange(args, callback?)', 'setrange(args, callback?)'],
					['shutdown(args, callback?)', 'shutdown(args, callback?)'],
					['sinter(args, callback?)', 'sinter(args, callback?)'],
					['sinterstore(args, callback?)', 'sinterstore(args, callback?)'],
					['sismember(args, callback?)', 'sismember(args, callback?)'],
					['slaveof(args, callback?)', 'slaveof(args, callback?)'],
					['smembers(args, callback?)', 'smembers(args, callback?)'],
					['smove(args, callback?)', 'smove(args, callback?)'],
					['sort(args, callback?)', 'sort(args, callback?)'],
					['spop(args, callback?)', 'spop(args, callback?)'],
					['srandmember(args, callback?)', 'srandmember(args, callback?)'],
					['srem(args, callback?)', 'srem(args, callback?)'],
					['strlen(args, callback?)', 'strlen(args, callback?)'],
					['subscribe(channel)', 'subscribe(channel)'],
					['substr(args, callback?)', 'substr(args, callback?)'],
					['sunion(args, callback?)', 'sunion(args, callback?)'],
					['sunionstore(args, callback?)', 'sunionstore(args, callback?)'],
					['sync(args, callback?)', 'sync(args, callback?)'],
					['server_info', 'server_info : ServerInfo']
				]);
			});
			it('Redis completions - client.o', function(done) {
				var options = {
					buffer: "/* eslint-env node, redis */\nvar redis = require('redis');\nvar client = redis.createClient();\nclient.o",
					prefix: "o",
					offset: 102,
					callback: done
				};
				// We manually add the on() function to the index
				testProposals(options, [
					['', 'redis'],
					['object(args, callback?)', 'object(args, callback?)'],
					['on(event, action)', 'on(event, action)'],
					['offline_queue', 'offline_queue : [?]']
				]);
			});
		});
	});
});
