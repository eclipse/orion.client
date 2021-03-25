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
/*eslint-env amd */
define([
	"tern/lib/tern",
	"javascript/finder",
	"i18n!javascript/nls/messages"
], function(tern, Finder, Messages) {

	var templates = [
	/* eslint-disable missing-nls */
		{
			name: "amqp",
			nodes: {top:true, member:false, prop:false},
			template: "var amqp = require('amqp');\n",
			doc: Messages['amqpRequire'],
			url: "https://www.npmjs.com/package/amqp"
		},
		{
			name: "amqp connection",
			nodes: {top:true, member:false, prop:false},
			template: "var amqp = require('amqp');\n" +
					  "var ${connection} = amqp.createConnection({\n" +  
					  "\thost: ${host},\n" + 
					  "\tport: ${port},\n" + 
					  "\tlogin: ${login},\n" + 
					  "\tpassword: ${password}\n" + 
					  "});\n",
			doc: Messages['amqpConnection'],
			url: "https://www.npmjs.com/package/amqp"
		},
		{
			name: "amqp on",
			nodes: {top:true, member:false, prop:false},
			template: "${connection}.on(${event}, function() {\n" +  
					  "\t${cursor}\n" + 
					  "});\n",
			doc: Messages['amqpOn'],
			url: "https://www.npmjs.com/package/amqp"
		},
		{
			name: "amqp queue",
			nodes: {top:true, member:false, prop:false},
			template: "${connection}.queue(${id}, function(queue) {\n" + 
					  "\tqueue.bind(\'#\'); //catch all messages\n" +
					  "\tqueue.subscribe(function (message, headers, deliveryInfo) {\n" +
					  "\t\t// Receive messages\n" +
					  "\t});\n" +
					  "\t${cursor}\n" + 
					  "});\n",
			doc: Messages['amqpQueue'],
			url: "https://www.npmjs.com/package/amqp"
		},
		{
			name: "amqp exchange",
			nodes: {top:true, member:false, prop:false},
			template: "var exchange = ${connection}.exchange(${id}, {type: \'topic\'}, function(exchange) {\n" +  
					  "\t${cursor}\n" + 
					  "});\n",
			doc: Messages['amqpExchange'],
			url: "https://www.npmjs.com/package/amqp"
		}
		/* eslint-enable missing-nls */
	];
	
	var cachedQuery;
	
	/* eslint-enable missing-nls */
	tern.registerPlugin("amqp", /* @callback */ function(server, options) { //$NON-NLS-1$
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
								c.doc = template.doc;
								c.url = template.url;
								c.type = 'template'; //$NON-NLS-1$
								c.ecma = template.ecma;
								c.origin = 'amqp';
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
  "!name": "amqp",
  "!define": {
  	"!known_modules": {
	      "amqp": {
	      	 "Connection" : "Connection",
		     "createConnection": "fn(options: Object, implOptions: Object, readyCallback: fn()) -> +Connection",
          }
      },
    "Message.!1": {
      "parseError": "+Error",
      "rawData": "string"
    },
    "serializer.serializeFields.!2": {
      "reserved1": "number",
      "routingKey": "string",
      "noWait": "bool"
    },
    "Exchange.!3": {
      "type": "string"
    },
    "Queue.prototype.subscribeRaw.!0": {
      "state": "string"
    },
    "Connection.prototype._bodyToBuffer.!ret": "[Connection.prototype._bodyToBuffer.!ret.<i>]",
    "Connection.prototype._bodyToBuffer.!ret.<i>": {
      "contentType": "string"
    },
    "Connection.prototype._parseURLOptions.!ret": {
      "ssl": {
        "enabled": "bool"
      }
    },
    "createExchangeErrorHandlerFor.!ret": "fn(err: ?)",
    "parseTable.!ret": {
      "!doc": "XXX check if bitIndex greater than 7?"
    },
    "parseFields.!1": "[?]",
    "parseFields.!ret": {}
  },
  "Message": {
    "prototype": {
      "acknowledge": {
        "!type": "fn(all: ?)",
        "!doc": "Acknowledge receipt of message.\nSet first arg to 'true' to acknowledge this and all previous messages\nreceived on this queue."
      },
      "reject": {
        "!type": "fn(requeue: ?)",
        "!doc": "Reject an incoming message.\nSet first arg to 'true' to requeue the message."
      }
    },
    "!type": "fn(queue: +Queue, args: ?)",
    "!doc": "Properties:\n- routingKey\n- size\n- deliveryTag\n\n- contentType (default 'application/octet-stream')\n- contentEncoding\n- headers\n- deliveryMode\n- priority (0-9)\n- correlationId\n- replyTo\n- experation\n- messageId\n- timestamp\n- userId\n- appId\n- clusterId",
    "queue": "+Queue",
    "read": "number",
    "size": "number"
  },
  "serializer": {
    "serializeFloat": "fn(b: ?, size: number, value: ?, bigEndian: ?)",
    "serializeInt": "fn(b: ?, size: number, int: number)",
    "serializeShortString": "fn(b: ?, string: ?)",
    "serializeLongString": "fn(b: ?, string: ?)",
    "serializeDate": "fn(b: ?, date: ?)",
    "serializeBuffer": "fn(b: ?, buffer: ?)",
    "serializeBase64": "fn(b: ?, buffer: ?)",
    "isBigInt": "fn(value: ?) -> bool",
    "getCode": "fn(dec: ?) -> string",
    "isFloat": "fn(value: ?) -> bool",
    "serializeValue": "fn(b: ?, value: ?)",
    "serializeTable": "fn(b: ?, object: ?)",
    "serializeArray": "fn(b: ?, arr: ?)",
    "serializeFields": "fn(buffer: ?, fields: ?, args: ?, strict: bool)"
  },
  "methods": {
    "<i>": {
      "!doc": "debug(name);"
    },
    "!doc": "methods keyed on their name"
  },
  "methodTable": {
    "<i>": {
      "<i>": "methods.<i>"
    },
    "!doc": "a look up table for methods recieved\nindexed on class id, method id"
  },
  "classes": {
    "!doc": "classes keyed on their index"
  },
  "Exchange": {
    "prototype": {
      "_onMethod": "fn(channel: ?, method: ?, args: ?) -> bool",
      "publish": {
        "!type": "fn(routingKey: ?, data: ?, options: ?, callback: ?)",
        "!doc": "exchange.publish('routing.key', 'body');\n\nthe third argument can specify additional options\n- mandatory (boolean, default false)\n- immediate (boolean, default false)\n- contentType (default 'application/octet-stream')\n- contentEncoding\n- headers\n- deliveryMode\n- priority (0-9)\n- correlationId\n- replyTo\n- expiration\n- messageId\n- timestamp\n- userId\n- appId\n- clusterId\n\nthe callback is optional and is only used when confirm is turned on for the exchange"
      },
      "_awaitConfirm": {
        "!type": "fn(task: ?, callback: ?)",
        "!doc": "registers tasks for confirms"
      },
      "cleanup": {
        "!type": "fn()",
        "!doc": "do any necessary cleanups eg. after queue destruction"
      },
      "destroy": "fn(ifUnused: ?)",
      "unbind": "fn()",
      "bind": "fn()",
      "bind_headers": "fn()"
    },
    "!type": "fn(connection: +Connection, channel: number, name: ?, options: Exchange.!3, openCallback: ?)",
    "binds": "number",
    "exchangeBinds": "number",
    "sourceExchanges": {
      "<i>": "+Exchange"
    },
    "_sequence": "number",
    "_unAcked": {},
    "_addedExchangeErrorHandler": "bool",
    "state": "string",
    "channel": "number",
    "connection": "+Connection",
    "_tasks": "[?]"
  },
  "Queue": {
    "prototype": {
      "subscribeRaw": "fn(options: Queue.consumerTagListeners.<i>, messageListener: Queue.consumerTagListeners.<i>)",
      "unsubscribe": "fn(consumerTag: ?)",
      "subscribe": "fn(options: ?, messageListener: ?)",
      "shift": {
        "!type": "fn(reject: ?, requeue: ?)",
        "!doc": "Acknowledges the last message"
      },
      "bind": "fn(exchange: string, routingKey: string, callback: string)",
      "unbind": "fn(exchange: string, routingKey: string)",
      "bind_headers": "fn()",
      "unbind_headers": "fn()",
      "destroy": "fn(options: ?)",
      "purge": "fn()",
      "_onMethod": "fn(channel: ?, method: ?, args: ?)",
      "_onContentHeader": "fn(channel: number, classInfo: ?, weight: number, properties: parseFields.!ret, size: number)",
      "_onContent": "fn(channel: number, data: ?)",
      "flow": "fn(active: ?)",
      "subscribeJSON": "Queue.prototype.subscribe"
    },
    "!type": "fn(connection: +Connection, channel: number, name: ?, options: ?, callback: ?)",
    "name": "string",
    "_bindings": {
      "<i>": {
        "<i>": "number"
      }
    },
    "consumerTagListeners": {
      "<i>": {
        "state": "string"
      }
    },
    "consumerTagOptions": {
      "<i>": "Queue.consumerTagListeners.<i>"
    },
    "options": {
      "autoDelete": "bool",
      "closeChannelOnUnsubscribe": "bool"
    },
    "state": "string",
    "_bindCallback": "string",
    "_sequence": "number",
    "confirm": "bool",
    "currentMessage": "+Message"
  },
  "AMQPParser": {
    "prototype": {
      "throwError": {
        "!type": "fn(error: string)",
        "!doc": "If there's an error in the parser, call the onError handler or throw"
      },
      "execute": {
        "!type": "fn(data: ?)",
        "!doc": "Everytime data is recieved on the socket, pass it to this function for\nparsing."
      },
      "_parseMethodFrame": "fn(channel: number, buffer: ?)",
      "_parseHeaderFrame": "fn(channel: number, buffer: ?)"
    },
    "!type": "fn(version: string, type: string)",
    "!doc": "An interruptible AMQP parser.\n\ntype is either 'server' or 'client'\nversion is '0-9-1'.\n\nInstances of this class have several callbacks\n- onMethod(channel, method, args);\n- onHeartBeat()\n- onContent(channel, buffer);\n- onContentHeader(channel, class, weight, properties, size);\n\nThis class does not subclass EventEmitter, in order to reduce the speed\nof emitting the callbacks. Since this is an internal class, that should\nbe fine.",
    "isClient": "bool",
    "state": "string",
    "parse": "fn(data: ?) -> AMQPParser.parse",
    "onMethod": "fn(channel: number, method: methods.<i>, args: parseFields.!ret)",
    "onContent": "fn(channel: number, data: ?)",
    "onContentHeader": "fn(channel: number, classInfo: ?, weight: number, properties: parseFields.!ret, size: number)",
    "onHeartBeat": "fn()",
    "onError": "fn(e: string)"
  },
  "maxFrameBuffer": {
    "!type": "number",
    "!doc": "parser"
  },
  "channelMax": {
    "!type": "number",
    "!doc": "copying qpid)"
  },
  "defaultPorts": {
    "amqp": "number",
    "amqps": "number"
  },
  "defaultOptions": {
    "host": "string",
    "port": "number",
    "login": "string",
    "password": "string",
    "authMechanism": "string",
    "vhost": "string",
    "connectionTimeout": "number",
    "ssl": {
      "enabled": "bool"
    }
  },
  "defaultSslOptions": {
    "port": "number",
    "ssl": {
      "rejectUnauthorized": "bool"
    }
  },
  "defaultImplOptions": {
    "defaultExchangeName": "string",
    "reconnect": "bool",
    "reconnectBackoffStrategy": "string",
    "reconnectExponentialLimit": "number",
    "reconnectBackoffTime": "number"
  },
  "defaultClientProperties": {
    "platform": "string",
    "product": "string"
  },
  "Connection": {
    "prototype": {
      "setOptions": "fn(options: ?)",
      "setImplOptions": "fn(options: ?)",
      "connect": "fn()",
      "reconnect": "fn()",
      "disconnect": "fn()",
      "addAllListeners": "fn()",
      "on": "fn(event: string, action: fn())",
      "heartbeat": "fn()",
      "exchange": {
        "!type": "fn(name: ?, options: Exchange.!3, openCallback: ?) -> +Exchange",
        "!doc": "connection.exchange('my-exchange', { type: 'topic' });\nOptions\n- type 'fanout', 'direct', or 'topic' (default)\n- passive (boolean)\n- durable (boolean)\n- autoDelete (boolean, default true)"
      },
      "exchangeClosed": {
        "!type": "fn(name: ?)",
        "!doc": "remove an exchange when it's closed (called from Exchange)"
      },
      "queue": {
        "!type": "fn(name: ?) -> +Queue",
        "!doc": "Options\n- passive (boolean)\n- durable (boolean)\n- exclusive (boolean)\n- autoDelete (boolean, default true)"
      },
      "queueClosed": {
        "!type": "fn(name: ?)",
        "!doc": "remove a queue when it's closed (called from Queue)"
      },
      "publish": {
        "!type": "fn(routingKey: ?, body: ?, options: ?, callback: ?)",
        "!doc": "Publishes a message to the default exchange."
      },
      "_bodyToBuffer": "fn(body: ?) -> [?]",
      "_inboundHeartbeatTimerReset": "fn()",
      "_outboundHeartbeatTimerReset": "fn()",
      "_saslResponse": "fn() -> ?|string",
      "_onMethod": "fn(channel: number, method: methods.<i>, args: parseFields.!ret)",
      "_parseURLOptions": {
        "!type": "fn(connectionString: ?) -> Connection.prototype._parseURLOptions.!ret",
        "!doc": "Generate connection options from URI string formatted with amqp scheme."
      },
      "_chooseHost": {
        "!type": "fn() -> !this.options.host",
        "!doc": "If you pass a array of hosts, lets choose a random host or the preferred host number, or then next one."
      },
      "_createSocket": "fn()",
      "end": "fn()",
      "_getSSLOptions": "fn() -> !this.sslConnectionOptions",
      "_startHandshake": {
        "!type": "fn()",
        "!doc": "Time to start the AMQP 7-way connection initialization handshake!\n1. The client sends the server a version string"
      },
      "_sendBody": {
        "!type": "fn(channel: number, body: ?, properties: ?)",
        "!doc": "Parse helpers"
      },
      "_sendHeader": {
        "!type": "fn(channel: number, size: ?, properties: ?)",
        "!doc": "connection: the connection\nchannel: the channel to send this on\nsize: size in bytes of the following message\nproperties: an object containing any of the following:\n- contentType (default 'application/octet-stream')\n- contentEncoding\n- headers\n- deliveryMode\n- priority (0-9)\n- correlationId\n- replyTo\n- expiration\n- messageId\n- timestamp\n- userId\n- appId\n- clusterId"
      },
      "_sendMethod": "fn(channel: number, method: ?, args: ?)",
      "generateChannelId": {
        "!type": "fn() -> !this.channelCounter",
        "!doc": "tries to find the next available id slot for a channel"
      }
    },
    "!type": "fn(connectionArgs: ?, options: ?, readyCallback: ?)",
    "connectionAttemptScheduled": {
      "!type": "bool",
      "!doc": "Set to false, so that if we fail in the reconnect attempt, we can\nschedule another one."
    },
    "_defaultExchange": "+Exchange",
    "channelCounter": "number",
    "_blocked": "bool",
    "channels": {
      "!doc": "In the case where this is a reconnection, do not trample on the existing\nchannels.\nFor your reference, channel 0 is the control channel.",
      "<i>": "+Queue"
    },
    "exchanges": {
      "<i>": "+Exchange"
    },
    "parser": {
      "!type": "+AMQPParser",
      "!doc": "Reset parser state"
    },
    "readyEmitted": {
      "!type": "bool",
      "!doc": "Set 'ready' flag for auth failure detection."
    },
    "_inboundHeartbeatTimer": "number",
    "_outboundHeartbeatTimer": "number",
    "hosti": {
      "!type": "number",
      "!doc": "If this is already set, it looks like we want to choose another one.\nAdd one to hosti but don't overflow it."
    },
    "<i>": "fn()",
    "sslConnectionOptions": {}
  },
  "Channel": {
    "prototype": {
      "closeOK": "fn()",
      "reconnect": "fn()",
      "_taskPush": "fn(reply: ?, cb: ?)",
      "_tasksFlush": "fn()",
      "_handleTaskReply": "fn(channel: ?, method: ?, args: ?) -> bool",
      "_onChannelMethod": "fn(channel: ?, method: ?, args: ?)",
      "close": "fn(reason: ?)"
    },
    "!type": "fn(connection: +Connection, channel: number)",
    "!doc": "This class is not exposed to the user. Queue and Exchange are subclasses\nof Channel. This just provides a task queue."
  },
  "createExchangeErrorHandlerFor": {
    "!type": "fn(exchange: +Exchange) -> fn(err: ?)",
    "!doc": "creates an error handler scoped to the given `exchange`"
  },
  "parseShortString": "fn(buffer: ?)",
  "parseLongString": "fn(buffer: ?)",
  "parseSignedInteger": "fn(buffer: ?) -> !0.<i>",
  "parseValue": "fn(buffer: ?) -> !0.<i>",
  "parseTable": "fn(buffer: ?) -> parseTable.!ret",
  "parseFields": "fn(buffer: ?, fields: [?]) -> parseFields.!ret",
  "i": "number",
  "o": "number",
  "bigEndian": "bool",
  "match": "[string]",
  "Error": {
    "name": "string"
  }
};
});
