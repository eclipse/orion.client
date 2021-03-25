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
 * Tern type index and templates for PostgreSQL node support
 */
define([
	"tern/lib/tern",
	"javascript/finder",
	"i18n!javascript/nls/messages"
], function(tern, Finder, Messages) {

	var templates = [
	/* eslint-disable missing-nls */
		{
			name: "postgres", 
			nodes: {top:true, member:false, prop:false},
			template: "var pg = require('pg');\n",
			doc: Messages['postgresRequire'],
			url: "https://github.com/brianc/node-postgres/wiki"
		},
		{
			name: "postgres client", 
			nodes: {top:true, member:false, prop:false},
			template: "var pg = require('pg');\n" + 
					  "var url = \"postgres://postgres:${port}@${host}/${database}\";\n" +  
					  "var ${client} = new pg.Client(url);\n",
			doc: Messages['postgresClient'],
			url: "https://github.com/brianc/node-postgres/wiki"
		},
		{
			name: "postgres connect", 
			nodes: {top:true, member:false, prop:false},
			template: "var pg = require('pg');\n" + 
					  "var url = \"postgres://postgres:${port}@${host}/${database}\";\n" +  
					  "var ${client} = new pg.Client(url);\n" + 
					  "${client}.connect(function(error) {\n" +  
					  "\t${cursor}\n" +  
					  "});\n",
			doc: Messages['postgresConnect'],
			url: "https://github.com/brianc/node-postgres/wiki"
		},
		{
			name: "postgres query", 
			nodes: {top:true, member:false, prop:false},
			template: "${client}.query(${sql}, function(error, result) {\n" + 
					  "\t${cursor}\n" +  
					  "});\n",
			doc: Messages['postgresQuery'],
			url: "https://github.com/brianc/node-postgres/wiki"
		}
		/* eslint-enable missing-nls */
	];
	
	var cachedQuery;
	
	/* eslint-enable missing-nls */
	tern.registerPlugin("postgres", /* @callback */ function(server, options) { //$NON-NLS-1$
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
								c.origin = 'pg';
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
	  "pg": {
	    "connect": "fn(connection: string, callback: fn(err: Error, client: Client, done: fn()))",
	    "end": "fn()",
	    "ConnectionConfig": {
	      "user": "string",
	      "database": "string",
	      "password": "string",
	      "port": "number",
	      "host": "string"
	    },
	    "Defaults": {
	      "poolSize": "number",
	      "poolIdleTimeout": "number",
	      "reapIntervalMillis": "number",
	      "binary": "bool",
	      "parseInt8": "bool"
	    },
	    "ClientConfig": {
	      "ssl": "bool"
	    },
	    "QueryConfig": {
	      "name": "string",
	      "text": "string",
	      "values": "[?]"
	    },
	    "QueryResult": {
	      "rows": "[?]"
	    },
	    "ResultBuilder": {
	      "command": "string",
	      "rowCount": "number",
	      "oid": "number",
	      "addRow": "fn(row: ?)"
	    },
	    "Client": {
	      "!type": "fn(connection: string)",
	      "prototype": {
	        "connect": "fn(callback?: fn(err: Error))",
	        "end": "fn()",
	        "query": "fn(queryText: string, callback?: fn(err: Error, result: QueryResult)) -> Query",
	        "copyFrom": "fn(queryText: string) -> stream.Writable",
	        "copyTo": "fn(queryText: string) -> stream.Readable",
	        "pauseDrain": "fn()",
	        "resumeDrain": "fn()",
	        "on": "fn(event: string, listener: fn()) -> Client"
	      }
	    },
	    "Query": {
	      "prototype": {
	        "on": "fn(event: string, listener: fn(row: ?, result?: ResultBuilder)) -> Query"
	      }
	    },
	    "Events": {
	      "prototype": {
	        "on": "fn(event: string, listener: fn(err: Error, client: Client)) -> Events"
	      }
	    }
	  },
	  "!name": "pg",
	  "!define": {
	  	"!known_modules": {
	  		"pg": {
	  			"connect": "fn(connection: string, callback: fn(err: Error, client: Client, done: fn()))",
	    		"end": "fn()",
	    		"Client": "pg.Client"
	  		}
	  	}
	  }
	};
});
