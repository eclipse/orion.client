/*******************************************************************************
 * Copyright (c) 2012, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node, express, compression*/
var auth = require('./lib/middleware/auth'),
	express = require('express'),
	http = require('http'),
	https = require('https'),
	fs = require('fs'),
	mkdirp = require('mkdirp'),
	os = require('os'),
	constants = require('constants'),
	log4js = require('log4js'),
	compression = require('compression'),
	path = require('path'),
	util = require('util'),
	argslib = require('./lib/args'),
	graceful = require('./lib/graceful-cluster'),
	configParams = require("nconf"),
	api = require('./lib/api'),
	serverUtil = require('./lib/util/serverUtil');

// Patches the fs module to use graceful-fs instead
require('graceful-fs').gracefulify(fs);

configParams.argv({
	parseValues: true
}).env({
	parseValues: true
});
var configFile = configParams.any("config", "c") || path.join(__dirname, 'orion.conf');
configParams.file({
	parseValues: true,
	file: configFile, 
	format: path.extname(configFile) === ".conf" ? configParams.formats.ini : configParams.formats.json
});

var PORT_LOW = 8082;
var PORT_HIGH = 10082;
var port = configParams.any("port", "p", "PORT") || 8081;

var cluster, clusterParam = configParams.get("orion_cluster");
if (clusterParam) {
	cluster = require('cluster');
}

var homeDir = os.homedir();
if (process.versions.electron) {
	var logPath = path.join(homeDir, '.orion', 'orion.log');
	if(process.platform === 'darwin'){
		logPath = path.join(homeDir, '/Library/Logs/Orion', 'orion.log');
	}else if(process.platform === 'linux'){
		logPath = path.join(homeDir, '/.config', 'orion.log');
	}else if(process.platform === 'win32'){
		logPath = path.join(homeDir, '\AppData\Roaming\Orion', 'orion.log');
	}
	var log4jsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config/log4js.json'), 'utf8'));
	log4jsConfig.appenders.datefile.filename = logPath;
	// add datefile appender to default categories
	log4jsConfig.categories["default"].appenders.push("datefile");
	log4js.configure(log4jsConfig);
} else {
	// init logging
	log4js.configure(path.join(__dirname, 'config/log4js.json'));
}

var logger = log4js.getLogger('server');

api.setShouldAddStrictTransportHeaders(configParams.get("orion_add_strict_transport_headers"));

var restartOnMemoryLimit = parseInt(configParams.get("orion_threshold_memory_mb"));
if (restartOnMemoryLimit) {
	logger.info("Process memory limit: " + restartOnMemoryLimit + "MB");
	restartOnMemoryLimit = restartOnMemoryLimit * 1024 * 1024; /* bytes */
}

function startServer(cb) {
	var workspaceArg = configParams.any("workspace", "w") || configParams.get("_")[0];
	var workspaceDir;
	if (workspaceArg) {
		workspaceDir = path.resolve(process.cwd(), workspaceArg);
	} else if (configParams.get("isElectron")) {
		workspaceDir =  path.join(homeDir, '.orion', '.workspace');
	} else {
		workspaceDir = path.join(__dirname, '.workspace');
	}
	configParams.set("workspace", workspaceDir);
	mkdirp.sync(workspaceDir);
	var contextPath = configParams.get("orion.context.path") || "";
	var listenContextPath = configParams.get("orion.context.listenPath") || false;
	var passwordFile = configParams.get("password") || configParams.get("pwd");
	var password = argslib.readPasswordFile(passwordFile);
	var dev = configParams.get("dev");
	var log = configParams.get("log");
	if (dev) {
		process.env.OrionDevMode = true;
		logger.info('Development mode: client code will not be cached.');
	}
	if (passwordFile) {
		logger.info(util.format('Using password from file: %s', passwordFile));
	}
	logger.info(util.format('Using workspace: %s', workspaceDir));
	
	var server;
	// create web server
	var app = express();
	app.disable('x-powered-by');
	if (configParams.get("orion.https.key") && configParams.get("orion.https.cert")) {
		server = https.createServer({
			secureOptions: constants.SSL_OP_NO_TLSv1,
			key: fs.readFileSync(configParams.get("orion.https.key")),
			cert: fs.readFileSync(configParams.get("orion.https.cert"))
		}, app);
	} else {
		server = http.createServer(app);
	}

	// Configure middleware
	if (log) {
		var requestLogger = log4js.getLogger('request');
		app.use(log4js.connectLogger(requestLogger, {
			format: ':method :url :status - :response-time ms'
		}));
	}
	if (password || configParams.get("pwd")) {
		app.use(listenContextPath ? contextPath : "/", auth(password || configParams.get("pwd")));
	}
	app.use(compression());
	var orion = require('./index.js')({
		workspaceDir: workspaceDir,
		configParams: configParams,
		maxAge: dev ? 0 : undefined,
		server: server
	});
	app.use(listenContextPath ? contextPath : "/", /* @callback */ function(req, res, next){
		req.contextPath = contextPath;
		next();
	}, orion);
	
	if ((configParams.get("orion.proxy.host") || configParams.get("orion.proxy.port")) && listenContextPath){
		var httpProxy;
		try {
			httpProxy = require('http-proxy');
			var proxyHost = configParams.get("orion.proxy.host");
			var proxyPort = configParams.get("orion.proxy.port");
			var proxy = httpProxy.createProxyServer({});
			app.use(function(req, res, next) {
				proxy.web(req, res, {
					target: proxyHost + (proxyPort ? ":" + proxyPort : ""),
					changeOrigin: true
				}, function() {
					next();
				});
			});
		} catch (e) {
			logger.info("WARNING: http-proxy is not installed. Some features will be unavailable. Reason: " + e.message);
		}
	}

	//error handling
	app.use(/* @callback */ function(err, req, res, next) { // 'next' has to be here, so that this callback works as a final error handler instead of a normal middleware
		logger.error(req.method, req.originalUrl, err);
		if (res.finished) {
			return;
		}
		if (err) {
			res.status(err.status || 500);
		} else {
			res.status(404);
		}

		// respond with json
		if (req.accepts('json')) {
			api.writeResponse(null, res, null, { error: err ? err.message : 'Not found' });
			return;
		}
		
		// default to plain-text. send()
		api.writeResponse(null, res, {"Content-Type":'text/plain'}, err ? err.message : 'Not found');
	});

	server.on('listening', function() {
		configParams.set("port", port);
		logger.info(util.format('Listening on port %d...', port));
		if (cb) {
			cb();
		}
	});
	server.on('error', function(err) {
		if (err.code === "EADDRINUSE") {
			port = Math.floor(Math.random() * (PORT_HIGH - PORT_LOW) + PORT_LOW);
			logger.info("About to listen on: " + port);
			server.listen(port);
		} else {
			logger.error(err);
		}
	});
	logger.info("About to listen on: " + port);
	server.listen(port);
	var shutdownTimeout = configParams.get("shutdown.timeout");
	new graceful.GracefulServer({
		server: server,
		log: logger.info.bind(logger),
		shutdownTimeout: shutdownTimeout,
		exitFunction: function(code) {
			serverUtil.shutdown(code, shutdownTimeout, logger);
		}
	});

	if (cluster && configParams.get("orion_cluster_restart_timeout")) {
		try {
			var date = require("cron-parser").parseExpression(configParams.get("orion_cluster_restart_timeout"), {utc: true}).next();
			var timeout = date.getTime() - Date.now();
			logger.info('Cluster: worker ' + process.pid + ' scheduling restart on ' + date + " -> timeout=" + timeout);
			setTimeout(function() {
				logger.info('Cluster: worker ' + process.pid + ' restarting by timer...');
				graceful.GracefulCluster.gracefullyRestartCurrentWorker();
			}, timeout);
		} catch (ex) {
			logger.error(ex);
		} 
	}
	process.on('uncaughtException', function(err) {
		logger.error(err);
		if (clusterParam) {
			graceful.GracefulCluster.gracefullyRestartCurrentWorker();
		} else {
			process.exit(1);
		}
	});
}

function start(electron) {
	if (electron) {
		require("./electron").start(startServer, configParams);
	} else {
		startServer();
	}
}

try {
	if (cluster) {
		if (cluster.isMaster) {
			require("lru-cache-for-clusters-as-promised").init();
			logger.info("Master " + process.pid + " started");
		}
		var numCPUs = typeof clusterParam === "boolean" ? os.cpus().length : clusterParam >> 0;
		graceful.GracefulCluster.start({
			serverFunction: function() {
				start(false); //TODO electron with cluster?
			},
			log: logger.info.bind(logger),
			shutdownTimeout: configParams.get("shutdown.timeout"),
			workersCount: numCPUs,
			restartOnMemory: restartOnMemoryLimit,
			errorLog: function(value) {logger.error(value);}
		});
	} else {
		start(process.versions.electron);
	}
} catch (ex) {
	logger.error("Error starting server up", ex);
	throw ex;
}
