/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node, amd*/
/*globals infer tern resolver*/
/**
 * Tern type index and templates for AMQP node support
 */
define([
	"tern/lib/tern",
	"javascript/finder",
	"i18n!javascript/nls/messages"
], function(tern, Finder, Messages) {

	var templates = [
	/* eslint-disable missing-nls */
		{
			name: "mysql", 
			nodes: {top:true, member:false, prop:false},
			template: "var mysql = require('mysql');\n",
			doc: Messages[''],
			url: "https://github.com/redblaze/node-mysql#apis"
		},
		{
			name: "mysql connection", 
			nodes: {top:true, member:false, prop:false},
			template: "var mysql = require('mysql');\n" + 
					  "var ${connection} = mysql.createConnection({\n" +  
  					  "\thost : ${host},\n" +  
  					  "\tuser : ${username},\n" +  
  					  "\tpassword : ${password}\n" +  
					  "});\n" + 
					  "try {\n" +  
					  "\t${connection}.connect();\n" +  
					  "\t${cursor}\n" +  
					  "} finally {\n" +  
					  "\t${connection}.end();\n" +  
					  "}",
			doc: Messages['mysqlConnection'],
			url: "https://github.com/redblaze/node-mysql#apis"
		},
		{
			name: "mysql query", 
			nodes: {top:true, member:false, prop:false},
			template: "${connection}.query(${sql}, function(error, rows, fields) {\n" + 
					  "\t${cursor}\n" +  
					  "});\n",
			doc: Messages['mysqlQuery'],
			url: "https://github.com/redblaze/node-mysql#apis"
		}
		/* eslint-enable missing-nls */
	];
	
	var cachedQuery;
	
	/* eslint-enable missing-nls */
	tern.registerPlugin("mysql", /* @callback */ function(server, options) { //$NON-NLS-1$
	    return {
	      defs : defs,
	      passes: {
	      	/**
	      	 * @callback
	      	 */
	      	completion: function(file, query) {
	      		cachedQuery = query;
	      	},
	      	/**
	      	 * @callback
	      	 */
	      	variableCompletion: function(file, start, end, gather) {
	      		if(cachedQuery.includeTemplates || cachedQuery.includeTemplates === undefined) {
		      		var kind = Finder.findCompletionKind(file.ast, end);
		      		if(kind && kind.kind) {
			      		var tmpls = Finder.findTemplatesForKind(templates, kind.kind, cachedQuery.ecma ? cachedQuery.ecma : 6);
			      		tmpls.forEach(function(template) {
							gather(template.name, null, 0, function(c) {
								c.template = template.template;
								c.description = template.description;
								c.doc = template.doc;
								c.url = template.url;
								c.type = 'template'; //$NON-NLS-1$
								c.ecma = template.ecma;
								c.origin = 'mysql';
								c.overwrite = true;
							});
						});
			      	}
		      	}
	      	}
	      }
	    };
	});
	
	/* eslint-disable missing-nls */
	var defs = {
		
			  "mysql": {
			    "createConnection": "fn(connectionUri: string) -> Connection",
			    "createPool": "fn(config: PoolConfig) -> Pool",
			    "createPoolCluster": "fn(config?: PoolClusterConfig) -> PoolCluster",
			    "escape": "fn(value: ?) -> string",
			    "format": "fn(sql: string) -> string",
			    "MySql": {
			      "createConnection": "fn(connectionUri: string) -> Connection",
			      "createPool": "fn(config: PoolConfig) -> Pool",
			      "createPoolCluster": "fn(config?: PoolClusterConfig) -> PoolCluster",
			      "escape": "fn(value: ?) -> string",
			      "format": "fn(sql: string) -> string"
			    },
			    "ConnectionStatic": {
			      "createQuery": "fn(sql: string) -> Query"
			    },
			    "Connection": {
			      "config": "ConnectionConfig",
			      "threadId": "number",
			      "beginTransaction": "fn(callback: fn(err: Error))",
			      "connect": "fn()",
			      "commit": "fn(callback: fn(err: Error))",
			      "changeUser": "fn(options: ConnectionOptions)",
			      "query": "QueryFunction",
			      "end": "fn()",
			      "destroy": "fn()",
			      "pause": "fn()",
			      "release": "fn()",
			      "resume": "fn()",
			      "escape": "fn(value: ?) -> string",
			      "escapeId": "fn(value: string) -> string",
			      "format": "fn(sql: string) -> string",
			      "on": "fn(ev: string, callback: fn(args: [?])) -> Connection",
			      "rollback": "fn(callback: fn())"
			    },
			    "Pool": {
			      "config": "PoolConfig",
			      "getConnection": "fn(callback: fn(err: Error, connection: Connection))",
			      "query": "QueryFunction",
			      "end": "fn()",
			      "on": "fn(ev: string, callback: fn(args: [?])) -> Pool"
			    },
			    "PoolCluster": {
			      "config": "PoolClusterConfig",
			      "add": "fn(config: PoolConfig)",
			      "end": "fn()",
			      "getConnection": "fn(callback: fn(err: Error, connection: Connection))",
			      "of": "fn(pattern: string) -> Pool",
			      "on": "fn(ev: string, callback: fn(args: [?])) -> PoolCluster"
			    },
			    "Query": {
			      "sql": "string",
			      "start": "fn()",
			      "determinePacket": "fn(firstByte: number, parser: ?) -> ?",
			      "stream": "fn(options: StreamOptions) -> stream.Readable",
			      "pipe": "fn(callback: fn(args: [?])) -> Query",
			      "on": "fn(ev: string, callback: fn(args: [?])) -> Query"
			    },
			    "QueryFunction": {},
			    "QueryOptions": {
			      "sql": "string",
			      "timeout": "number",
			      "nestTables": "?",
			      "typeCast": "?"
			    },
			    "StreamOptions": {
			      "highWaterMark": "number",
			      "objectMode": "?"
			    },
			    "ConnectionOptions": {
			      "user": "string",
			      "password": "string",
			      "database": "string",
			      "charset": "string"
			    },
			    "ConnectionConfig": {
			      "host": "string",
			      "port": "number",
			      "localAddress": "string",
			      "socketPath": "string",
			      "timezone": "string",
			      "connectTimeout": "number",
			      "stringifyObjects": "bool",
			      "insecureAuth": "bool",
			      "typeCast": "?",
			      "queryFormat": "fn(query: string, values: ?)",
			      "supportBigNumbers": "bool",
			      "bigNumberStrings": "bool",
			      "dateStrings": "bool",
			      "debug": "?",
			      "trace": "bool",
			      "multipleStatements": "bool",
			      "flags": "?",
			      "ssl": "?"
			    },
			    "PoolConfig": {
			      "acquireTimeout": "number",
			      "waitForConnections": "bool",
			      "connectionLimit": "number",
			      "queueLimit": "number"
			    },
			    "PoolClusterConfig": {
			      "canRetry": "bool",
			      "removeNodeErrorCount": "number",
			      "defaultSelector": "string"
			    },
			    "SslCredentials": {
			      "pfx": "string",
			      "key": "string",
			      "passphrase": "string",
			      "cert": "string",
			      "ca": "?",
			      "crl": "?",
			      "ciphers": "string"
			    },
			    "Error": {
			      "code": "string",
			      "errno": "number",
			      "sqlStateMarker": "string",
			      "sqlState": "string",
			      "fieldCount": "number",
			      "stack": "string",
			      "fatal": "bool"
			    }
	  },
	  "!name": "mysql",
	  "!define": {
			"!known_modules": {
				"mysql": {
					"createConnection": "fn(connectionUri: string) -> mysql.Connection",
				    "createPool": "fn(config: mysql.PoolConfig) -> mysql.Pool",
				    "createPoolCluster": "fn(config?: mysql.PoolClusterConfig) -> mysql.PoolCluster",
				    "escape": "fn(value: ?) -> string",
				    "format": "fn(sql: string) -> string"
			    }
			}
		}
	};
});
