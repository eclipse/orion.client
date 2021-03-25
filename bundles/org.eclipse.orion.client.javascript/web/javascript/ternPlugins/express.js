/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (https://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (https://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node, amd*/
/*globals infer tern resolver*/
/**
 * Tern type index and templates for ExpressJS node support
 */
define([
	"tern/lib/tern",
	"javascript/finder",
	"i18n!javascript/nls/messages"
], function(tern, Finder, Messages) {

	var templates = [
	/* eslint-disable missing-nls */
		{
			name: "express require",
			nodes: {top:true, member:false, prop:false},
			template: "var ${app} = require('express');",
			doc: Messages['expressrequire'],
			url: "https://expressjs.com/en/4x/api.html"
			
		},
		{
			name: "express app",
			nodes: {top:true, member:false, prop:false},
			template: "var express = require('express');\n" +
					  "var ${app} = express();\n" + 
					  "${cursor}\n"+ 
					  "app.listen(${timeout});\n",
			doc: Messages['expressInstance'],
			url: "https://expressjs.com/en/4x/api.html#app"
		},
		{
			name: "express app get",
			nodes: {top:true, member:false, prop:false},
			template: "var value = app.get(${id}, function(request, result){\n" +
					  "\t${cursor}\n});\n",
			doc: Messages['expressGet'],
			url: "https://expressjs.com/en/4x/api.html#app.get"
		},
		{
			name: "express app set",
			nodes: {top:true, member:false, prop:false},
			template: "app.set(${id}, ${value});\n",
			doc: Messages['expressSet'],
			url: "https://expressjs.com/en/4x/api.html#app.set"
		},
		{
			name: "express app use",
			nodes: {top:true, member:false, prop:false},
			template: "app.use(${fnOrObject});\n",
			doc: Messages['expressUse'],
			url: "https://expressjs.com/en/4x/api.html#app.use"
		},
		{
			name: "express app engine",
			nodes: {top:true, member:false, prop:false},
			template: "app.engine(${fnOrObject});\n",
			doc: Messages['expressEngine'],
			url: "https://expressjs.com/en/4x/api.html#app.engine"
		},
		{
			name: "express app param",
			nodes: {top:true, member:false, prop:false},
			template: "app.param(${id}, ${value});\n",
			doc: Messages['expressParam'],
			url: "https://expressjs.com/en/4x/api.html#app.param"
		},
		{
			name: "express app error use",
			nodes: {top:true, member:false, prop:false},
			template: "app.use(function(error, request, result, next) {\n" + 
  					  "\tresult.send(${code}, ${message});\n" + 
					  "});\n",
			doc: Messages['expressUseError'],
			url: "https://expressjs.com/en/4x/api.html#app.use"
		}
		/* eslint-enable missing-nls */
	];
	
	var cachedQuery;
	
	/* eslint-enable missing-nls */
	tern.registerPlugin("express", /* @callback */ function(server, options) { //$NON-NLS-1$
	 	server.addDefs(defs);
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
								c.origin = 'express';
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
  "!name": "express",
  "!define": {
  	"!known_modules": {
	      "express": {
	      	  "static" : {
		    		"!type": "fn(name: string)",
		    		"!doc": "Built-in middleware function.  Pass the name of the directory that contains the static assets."
		    	},
	          "!type": "fn() -> app",
	          "!url": "https://expressjs.com",
	          "!doc": "Express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications."
          }
      },
	"express.static.!0": "string",
    "View.prototype.lookup.!0": "string",
    "View.prototype.resolve.!0": "string",
    "View.prototype.resolve.!1": "string",
    "View.!0": "string",
    "slice.!0": "number",
    "slice.!1": "number",
    "app.use.!0": "string",
    "app.engine.!0": "string",
    "app.set.!0": "string",
    "app.path.!ret": "string",
    "app.enabled.!0": "string",
    "app.enabled.!ret": "bool",
    "app.disabled.!0": "string",
    "app.disabled.!ret": "bool",
    "app.enable.!0": "string",
    "app.disable.!0": "string",
    "app.all.!0": "string",
    "app.render.!0": "string",
    "app.etag.!1": "string",
    "app.etag.!ret": "string",
    "app.wetag.!1": "string",
    "app.wetag.!ret": "string",
    "app.isAbsolute.!0": "string",
    "app.isAbsolute.!ret": "bool",
    "app.normalizeType.!0": "string",
    "app.normalizeType.!ret": {
      "value": "string",
      "quality": "number",
      "params": {
        "<i>": "string"
      }
    },
    "app.normalizeTypes.!0": "[?]",
    "app.normalizeTypes.!ret": "[acceptParams.!ret]",
    "app.setCharset.!0": "string",
    "app.setCharset.!1": "string",
    "app.setCharset.!ret": "string",
    "app.application.param.!0": "string",
    "app.application.handle.!0": "string",
    "app.application.handle.!2": "string",
    "app.application.use.!0": "string",
    "app.application.route.!0": "string",
    "app.request.range.!0": "number",
    "app.request.param.!0": "string",
    "app.request.param.!ret": "string",
    "app.request.response.status.!0": "number",
    "app.request.response.sendStatus.!0": "number",
    "app.request.response.sendFile.!0": "string",
    "app.request.response.attachment.!0": "string",
    "app.request.response.append.!0": "string",
    "app.request.response.get.!0": "string",
    "app.request.response.get.!ret": "string",
    "app.request.response.clearCookie.!0": "string",
    "app.request.response.cookie.!0": "string",
    "app.request.response.location.!0": "string",
    "app.request.Route.prototype._handles_method.!ret": "bool",
    "app.request.Route.!0": "string",
    "app.response.status.!0": "number",
    "app.response.sendStatus.!0": "number",
    "app.response.sendFile.!0": "string",
    "app.response.attachment.!0": "string",
    "app.response.append.!0": "string",
    "app.response.get.!0": "string",
    "app.response.get.!ret": "string",
    "app.response.clearCookie.!0": "string",
    "app.response.cookie.!0": "string",
    "app.response.location.!0": "string",
    "app.Route.prototype._handles_method.!ret": "bool",
    "app.Route.!0": "string",
    "tryRender.!1": {},
    "req.range.!0": "number",
    "req.range.!ret": "[?]",
    "req.param.!0": "string",
    "req.param.!ret": "string",
    "req.is.!0": "[?]",
    "defineGetter.!1": "string",
    "res.status.!0": "number",
    "res.sendStatus.!0": "number",
    "res.sendFile.!0": "string",
    "res.attachment.!0": "string",
    "res.append.!0": "string",
    "res.get.!0": "string",
    "res.get.!ret": "string",
    "res.clearCookie.!0": "string",
    "res.cookie.!0": "string",
    "res.location.!0": "string",
    "res.render.!1": {
      "!type": "fn(err: ?, str: ?)",
      "!doc": "default callback to respond"
    },
    "sendfile.!3": "fn(err: +Error)",
    "acceptParams.!0": "string",
    "acceptParams.!ret": {
      "value": "string",
      "quality": "number",
      "params": {
        "<i>": "string"
      }
    },
    "tryStat.!0": "string",
    "proto.param.!0": "string",
    "proto.handle.!0": "string",
    "proto.handle.!2": "string",
    "proto.use.!0": "string",
    "proto.route.!0": "string",
    "proto.!ret": {
      "_params": "[?]",
      "stack": "[?]",
      "!type": "fn(req: ?, res: ?, next: ?)"
    },
    "Route.prototype._handles_method.!ret": "bool",
    "Route.prototype.all.!ret": "+Route",
    "Route.!0": "string",
    "Layer.prototype.match.!0": "string",
    "Layer.prototype.match.!ret": "bool",
    "Layer.!0": "string",
    "appendMethods.!0": {
      "!type": "[?]",
      "!doc": "store options for OPTIONS request\nonly used if OPTIONS request"
    },
    "gettype.!ret": "string",
    "matchLayer.!1": "string",
    "restore.!ret": "fn(err: ?)",
    "wrap.!1": "fn(old: ?, err: ?)",
    "wrap.!ret": "fn()",
    "decode_param.!0": "string",
    "decode_param.!ret": "string",
    "Route.stack.<i>": "+Layer",
    "app.application.!ret": {
      "_params": "proto.!ret._params",
      "stack": "proto.!ret.stack"
    }
  },
  "View": {
    "prototype": {
      "lookup": {
        "!type": "fn(name: string)",
        "!doc": "Lookup view by the given `name`\n\n@param {string} name\n@private"
      },
      "render": {
        "!type": "fn(options: ?, callback: ?)",
        "!doc": "Render with the given options.\n\n@param {object} options\n@param {function} callback\n@private"
      },
      "resolve": {
        "!type": "fn(dir: string, file: string)",
        "!doc": "Resolve the file within the given directory.\n\n@param {string} dir\n@param {string} file\n@private"
      }
    },
    "!type": "fn(name: string, options: ?)",
    "!doc": "Initialize a new `View` with the given `name`.\n\nOptions:\n\n  - `defaultEngine` the default template engine name\n  - `engines` template engine require() cache\n  - `root` root path for view lookup\n\n@param {string} name\n@param {object} options\n@public"
  },
  "slice": {
    "!type": "fn(from: number, to?: number) -> !this",
    "!doc": "Module variables.\n@private"
  },
  "app": {
  	"delete": {
  		"!type": "fn()",
  	},
  	"get": {
  		"!type": "fn()",
  	},
  	"METHOD": {
  		"!type": "fn()",
  	},
  	"post": {
  		"!type": "fn()",
  	},
  	"put": {
  		"!type": "fn()",
  	},
    "init": {
      "!type": "fn(app: +Function) -> fn(req: ?, res: ?, next: ?)|+Function",
      "!doc": "Initialize the server.\n\n  - setup default configuration\n  - setup default middleware\n  - setup route reflection methods\n\n@private"
    },
    "defaultConfiguration": {
      "!type": "fn()",
      "!doc": "Initialize application configuration.\n@private"
    },
    "lazyrouter": {
      "!type": "fn()",
      "!doc": "lazily adds the base router if it has not yet been added.\n\nWe cannot add the base router in the defaultConfiguration because\nit reads app settings which might be set after that has run.\n\n@private"
    },
    "handle": {
      "!type": "fn(req: ?, res: ?, callback: ?)",
      "!doc": "Dispatch a req, res pair into the application. Starts pipeline processing.\n\nIf no callback is provided, then default error handlers will respond\nin the event of an error bubbling through the stack.\n\n@private"
    },
    "use": {
      "!type": "fn(fn: ?) -> !this",
      "!doc": "Proxy `Router#use()` to add middleware to the app router.\nSee Router#use() documentation for details.\n\nIf the _fn_ parameter is an express app, then it will be\nmounted at the _route_ specified.\n\n@public"
    },
    "route": {
      "!type": "fn(path: ?)",
      "!doc": "Proxy to the app `Router#route()`\nReturns a new `Route` instance for the _path_.\n\nRoutes are isolated middleware stacks for specific paths.\nSee the Route api docs for details.\n\n@public"
    },
    "engine": {
      "!type": "fn(ext: string, fn: +Function) -> !this",
      "!doc": "Register the given template engine callback `fn`\nas `ext`.\n\nBy default will `require()` the engine based on the\nfile extension. For example if you try to render\na \"foo.jade\" file Express will invoke the following internally:\n\n    app.engine('jade', require('jade').__express);\n\nFor engines that do not provide `.__express` out of the box,\nor if you wish to \"map\" a different extension to the template engine\nyou may use this method. For example mapping the EJS template engine to\n\".html\" files:\n\n    app.engine('html', require('ejs').renderFile);\n\nIn this case EJS provides a `.renderFile()` method with\nthe same signature that Express expects: `(path, options, callback)`,\nthough note that it aliases this method as `ejs.__express` internally\nso if you're using \".ejs\" extensions you dont need to do anything.\n\nSome template engines do not follow this convention, the\n[Consolidate.js](https://github.com/tj/consolidate.js)\nlibrary was created to map all of node's popular template\nengines to follow this convention, thus allowing them to\nwork seamlessly within Express.\n\n@param {String} ext\n@param {Function} fn\n@return {app} for chaining\n@public"
    },
    "param": {
      "!type": "fn(name: string|[?], fn: +Function) -> !this",
      "!doc": "Proxy to `Router#param()` with one added api feature. The _name_ parameter\ncan be an array of names.\n\nSee the Router#param() docs for more details.\n\n@param {String|Array} name\n@param {Function} fn\n@return {app} for chaining\n@public"
    },
    "set": {
      "!type": "fn(setting: string, val: ?) -> !this.settings.<i>",
      "!doc": "Assign `setting` to `val`, or return `setting`'s value.\n\n   app.set('foo', 'bar');\n   app.get('foo');\n   // => \"bar\"\n\nMounted servers inherit their parent server's settings.\n\n@param {String} setting\n@param {*} [val]\n@return {Server} for chaining\n@public"
    },
    "path": {
      "!type": "fn() -> string",
      "!doc": "Return the app's absolute pathname\nbased on the parent(s) that have\nmounted it.\n\nFor example if the application was\nmounted as \"/admin\", which itself\nwas mounted as \"/blog\" then the\nreturn value would be \"/blog/admin\".\n\n@return {String}\n@private"
    },
    "enabled": {
      "!type": "fn(setting: string) -> bool",
      "!doc": "Check if `setting` is enabled (truthy).\n\n   app.enabled('foo')\n   // => false\n\n   app.enable('foo')\n   app.enabled('foo')\n   // => true\n\n@param {String} setting\n@return {Boolean}\n@public"
    },
    "disabled": {
      "!type": "fn(setting: string) -> bool",
      "!doc": "Check if `setting` is disabled.\n\n   app.disabled('foo')\n   // => true\n\n   app.enable('foo')\n   app.disabled('foo')\n   // => false\n\n@param {String} setting\n@return {Boolean}\n@public"
    },
    "enable": {
      "!type": "fn(setting: string) -> app",
      "!doc": "Enable `setting`.\n\n@param {String} setting\n@return {app} for chaining\n@public"
    },
    "disable": {
      "!type": "fn(setting: string) -> app",
      "!doc": "Disable `setting`.\n\n@param {String} setting\n@return {app} for chaining\n@public"
    },
    "<i>": "fn(path: ?) -> !this",
    "all": {
      "!type": "fn(path: string) -> !this",
      "!doc": "Special-cased \"all\" method, applying the given route `path`,\nmiddleware, and callback to _every_ HTTP method.\n\n@param {String} path\n@param {Function} ...\n@return {app} for chaining\n@public"
    },
    "render": {
      "!type": "fn(name: string, options: ?, callback: +Function) -> !1.!ret",
      "!doc": "Render the given view `name` name with `options`\nand a callback accepting an error and the\nrendered template string.\n\nExample:\n\n   app.render('email', { name: 'Tobi' }, function(err, html){\n     // ...\n   })\n\n@param {String} name\n@param {Object|Function} options or fn\n@param {Function} callback\n@public"
    },
    "listen": {
      "!type": "fn() -> ?",
      "!doc": "Listen for connections.\n\nA node `http.Server` is returned, with this\napplication (which is a `Function`) as its\ncallback. If you wish to create both an HTTP\nand HTTPS server you may do so with the \"http\"\nand \"https\" modules as shown here:\n\n   var http = require('http')\n     , https = require('https')\n     , express = require('express')\n     , app = express();\n\n   http.createServer(app).listen(80);\n   https.createServer({ ... }, app).listen(443);\n\n@return {http.Server}\n@public"
    },
    "etag": {
      "!type": "fn(body: string|?, encoding?: string) -> string",
      "!doc": "Return strong ETag for `body`.\n\n@param {String|Buffer} body\n@param {String} [encoding]\n@return {String}\n@api private"
    },
    "wetag": {
      "!type": "fn(body: string|?, encoding?: string) -> string",
      "!doc": "Return weak ETag for `body`.\n\n@param {String|Buffer} body\n@param {String} [encoding]\n@return {String}\n@api private"
    },
    "isAbsolute": {
      "!type": "fn(path: string) -> bool",
      "!doc": "Check if `path` looks absolute.\n\n@param {String} path\n@return {Boolean}\n@api private"
    },
    "normalizeType": {
      "!type": "fn(type: string) -> acceptParams.!ret",
      "!doc": "Normalize the given `type`, for example \"html\" becomes \"text/html\".\n\n@param {String} type\n@return {Object}\n@api private"
    },
    "normalizeTypes": {
      "!type": "fn(types: [?]) -> [acceptParams.!ret]",
      "!doc": "Normalize `types`, for example \"html\" becomes \"text/html\".\n\n@param {Array} types\n@return {Array}\n@api private"
    },
    "compileETag": {
      "!type": "fn(val: ?) -> !0",
      "!doc": "Compile \"etag\" value to function.\n\n@param  {Boolean|String|Function} val\n@return {Function}\n@api private"
    },
    "compileQueryParser": {
      "!type": "fn(val: string|+Function) -> !0",
      "!doc": "Compile \"query parser\" value to function.\n\n@param  {String|Function} val\n@return {Function}\n@api private"
    },
    "compileTrust": {
      "!type": "fn(val: ?) -> !0",
      "!doc": "Compile \"proxy trust\" value to function.\n\n@param  {Boolean|String|Number|Array|Function} val\n@return {Function}\n@api private"
    },
    "setCharset": {
      "!type": "fn(type: string, charset: string) -> !0",
      "!doc": "Set the charset in a given Content-Type string.\n\n@param {String} type\n@param {String} charset\n@return {String}\n@api private"
    },
    "application": {
      "param": {},
      "handle": {},
      "use": {},
      "route": {},
      "process_params": "proto.process_params",
      "<i>": "proto.<i>"
    },
    "request": {
      "range": {},
      "param": {},
      "response": {
        "status": {},
        "sendStatus": {},
        "sendFile": {},
        "attachment": {},
        "append": {},
        "get": {},
        "clearCookie": {},
        "cookie": {},
        "location": {},
        "contentType": "res.type",
        "set": "res.header",
        "links": "res.links",
        "send": "res.send",
        "json": "res.json",
        "jsonp": "res.jsonp",
        "sendfile": "res.sendfile",
        "download": "res.download",
        "type": "res.type",
        "format": "res.format",
        "header": "res.header",
        "redirect": "res.redirect",
        "vary": "res.vary",
        "render": "res.render"
      },
      "Route": {
        "prototype": {
          "_handles_method": {},
          "_options": "Route.prototype._options",
          "dispatch": "Route.prototype.dispatch",
          "all": "Route.prototype.all",
          "<i>": "Route.prototype.<i>"
        }
      },
      "init": "app.init",
      "get": "req.header",
      "etag": "app.etag",
      "wetag": "app.wetag",
      "isAbsolute": "app.isAbsolute",
      "normalizeType": "app.normalizeType",
      "normalizeTypes": "app.normalizeTypes",
      "compileETag": "app.compileETag",
      "compileQueryParser": "app.compileQueryParser",
      "compileTrust": "app.compileTrust",
      "setCharset": "app.setCharset",
      "application": "proto",
      "request": "req",
      "header": "req.header",
      "accepts": "req.accepts",
      "acceptsEncodings": "req.acceptsEncodings",
      "acceptsCharsets": "req.acceptsCharsets",
      "acceptsLanguages": "req.acceptsLanguages",
      "is": "req.is"
    },
    "response": {
      "status": {},
      "sendStatus": {},
      "sendFile": {},
      "attachment": {},
      "append": {},
      "get": {},
      "clearCookie": {},
      "cookie": {},
      "location": {},
      "contentType": "res.type",
      "set": "res.header",
      "links": "res.links",
      "send": "res.send",
      "json": "res.json",
      "jsonp": "res.jsonp",
      "sendfile": "res.sendfile",
      "download": "res.download",
      "type": "res.type",
      "format": "res.format",
      "header": "res.header",
      "redirect": "res.redirect",
      "vary": "res.vary",
      "render": "res.render"
    },
    "Route": {
      "prototype": {
        "_handles_method": {},
        "_options": "Route.prototype._options",
        "dispatch": "Route.prototype.dispatch",
        "all": "Route.prototype.all",
        "<i>": "Route.prototype.<i>"
      }
    },
    "!doc": "Application prototype."
  },
  "trustProxyDefaultSymbol": {
    "!type": "string",
    "!doc": "Variable for trust proxy inheritance back-compat\n@private"
  },
  "logerror": {
    "!type": "fn(err: +Error)",
    "!doc": "Log error using console.error.\n\n@param {Error} err\n@private"
  },
  "tryRender": {
    "!type": "fn(view: ?, options: tryRender.!1, callback: ?)",
    "!doc": "Try rendering a view.\n@private"
  },
  "req": {
    "header": {
      "!type": "fn(name: ?) -> !this.headers.referrer",
      "!doc": "Return request header.\n\nThe `Referrer` header field is special-cased,\nboth `Referrer` and `Referer` are interchangeable.\n\nExamples:\n\n    req.get('Content-Type');\n    // => \"text/plain\"\n\n    req.get('content-type');\n    // => \"text/plain\"\n\n    req.get('Something');\n    // => undefined\n\nAliased as `req.header()`.\n\n@param {String} name\n@return {String}\n@public"
    },
    "accepts": "fn()",
    "acceptsEncodings": {
      "!type": "fn() -> string|[?]",
      "!doc": "Check if the given `encoding`s are accepted.\n\n@param {String} ...encoding\n@return {String|Array}\n@public"
    },
    "acceptsCharsets": {
      "!type": "fn() -> string|[?]",
      "!doc": "Check if the given `charset`s are acceptable,\notherwise you should respond with 406 \"Not Acceptable\".\n\n@param {String} ...charset\n@return {String|Array}\n@public"
    },
    "acceptsLanguages": {
      "!type": "fn() -> string|[?]",
      "!doc": "Check if the given `lang`s are acceptable,\notherwise you should respond with 406 \"Not Acceptable\".\n\n@param {String} ...lang\n@return {String|Array}\n@public"
    },
    "range": {
      "!type": "fn(size: number) -> [?]",
      "!doc": "Parse Range header field,\ncapping to the given `size`.\n\nUnspecified ranges such as \"0-\" require\nknowledge of your resource length. In\nthe case of a byte range this is of course\nthe total number of bytes. If the Range\nheader field is not given `null` is returned,\n`-1` when unsatisfiable, `-2` when syntactically invalid.\n\nNOTE: remember that ranges are inclusive, so\nfor example \"Range: users=0-3\" should respond\nwith 4 users when available, not 3.\n\n@param {Number} size\n@return {Array}\n@public"
    },
    "param": {
      "!type": "fn(name: string, defaultValue?: ?) -> !this.params.<i>",
      "!doc": "Return the value of param `name` when present or `defaultValue`.\n\n - Checks route placeholders, ex: _/user/:id_\n - Checks body params, ex: id=12, {\"id\":12}\n - Checks query string params, ex: ?id=12\n\nTo utilize request bodies, `req.body`\nshould be an object. This can be done by using\nthe `bodyParser()` middleware.\n\n@param {String} name\n@param {Mixed} [defaultValue]\n@return {String}\n@public"
    },
    "is": "fn(types: ?)",
    "!doc": "Request prototype.",
    "init": "app.init",
    "get": "req.header",
    "etag": "app.etag",
    "wetag": "app.wetag",
    "isAbsolute": "app.isAbsolute",
    "normalizeType": "app.normalizeType",
    "normalizeTypes": "app.normalizeTypes",
    "compileETag": "app.compileETag",
    "compileQueryParser": "app.compileQueryParser",
    "compileTrust": "app.compileTrust",
    "setCharset": "app.setCharset",
    "application": "proto",
    "request": "req",
    "response": "res",
    "Route": "Route"
  },
  "defineGetter": {
    "!type": "fn(obj: req, name: string, getter: ?)",
    "!doc": "Helper function for creating a getter on an object.\n\n@param {Object} obj\n@param {String} name\n@param {Function} getter\n@private"
  },
  "res": {
    "status": {
      "!type": "fn(code: number) -> !this",
      "!doc": "Set status `code`.\n\n@param {Number} code\n@return {ServerResponse}\n@public"
    },
    "links": {
      "!type": "fn(links: ?) -> ?",
      "!doc": "Set Link header field with the given `links`.\n\nExamples:\n\n   res.links({\n     next: 'https://api.example.com/users?page=2',\n     last: 'https://api.example.com/users?page=5'\n   });\n\n@param {Object} links\n@return {ServerResponse}\n@public"
    },
    "send": {
      "!type": "fn(body: ?) -> !this",
      "!doc": "Send a response.\n\nExamples:\n\n    res.send(new Buffer('wahoo'));\n    res.send({ some: 'json' });\n    res.send('<p>some html</p>');\n\n@param {string|number|boolean|object|Buffer} body\n@public"
    },
    "json": {
      "!type": "fn(obj: ?)",
      "!doc": "Send JSON response.\n\nExamples:\n\n    res.json(null);\n    res.json({ user: 'tj' });\n\n@param {string|number|boolean|object} obj\n@public"
    },
    "jsonp": {
      "!type": "fn(obj: ?)",
      "!doc": "Send JSON response with JSONP callback support.\n\nExamples:\n\n    res.jsonp(null);\n    res.jsonp({ user: 'tj' });\n\n@param {string|number|boolean|object} obj\n@public"
    },
    "sendStatus": {
      "!type": "fn(statusCode: number)",
      "!doc": "Send given HTTP status code.\n\nSets the response status to `statusCode` and the body of the\nresponse to the standard description from node's http.STATUS_CODES\nor the statusCode number if no description.\n\nExamples:\n\n    res.sendStatus(200);\n\n@param {number} statusCode\n@public"
    },
    "sendFile": {
      "!type": "fn(path: ?, options: ?, callback: ?)",
      "!doc": "Transfer the file at the given `path`.\n\nAutomatically sets the _Content-Type_ response header field.\nThe callback `callback(err)` is invoked when the transfer is complete\nor when an error occurs. Be sure to check `res.sentHeader`\nif you wish to attempt responding, as the header and some data\nmay have already been transferred.\n\nOptions:\n\n  - `maxAge`   defaulting to 0 (can be string converted by `ms`)\n  - `root`     root directory for relative filenames\n  - `headers`  object of headers to serve with file\n  - `dotfiles` serve dotfiles, defaulting to false; can be `\"allow\"` to send them\n\nOther options are passed along to `send`.\n\nExamples:\n\n The following example illustrates how `res.sendFile()` may\n be used as an alternative for the `static()` middleware for\n dynamic situations. The code backing `res.sendFile()` is actually\n the same code, so HTTP cache support etc is identical.\n\n    app.get('/user/:uid/photos/:file', function(req, res){\n      var uid = req.params.uid\n        , file = req.params.file;\n\n      req.user.mayViewFilesFrom(uid, function(yes){\n        if (yes) {\n          res.sendFile('/uploads/' + uid + '/' + file);\n        } else {\n          res.send(403, 'Sorry! you cant see that.');\n        }\n      });\n    });\n\n@public"
    },
    "sendfile": {
      "!type": "fn(path: ?, options: ?, callback: ?)",
      "!doc": "Transfer the file at the given `path`.\n\nAutomatically sets the _Content-Type_ response header field.\nThe callback `callback(err)` is invoked when the transfer is complete\nor when an error occurs. Be sure to check `res.sentHeader`\nif you wish to attempt responding, as the header and some data\nmay have already been transferred.\n\nOptions:\n\n  - `maxAge`   defaulting to 0 (can be string converted by `ms`)\n  - `root`     root directory for relative filenames\n  - `headers`  object of headers to serve with file\n  - `dotfiles` serve dotfiles, defaulting to false; can be `\"allow\"` to send them\n\nOther options are passed along to `send`.\n\nExamples:\n\n The following example illustrates how `res.sendfile()` may\n be used as an alternative for the `static()` middleware for\n dynamic situations. The code backing `res.sendfile()` is actually\n the same code, so HTTP cache support etc is identical.\n\n    app.get('/user/:uid/photos/:file', function(req, res){\n      var uid = req.params.uid\n        , file = req.params.file;\n\n      req.user.mayViewFilesFrom(uid, function(yes){\n        if (yes) {\n          res.sendfile('/uploads/' + uid + '/' + file);\n        } else {\n          res.send(403, 'Sorry! you cant see that.');\n        }\n      });\n    });\n\n@public"
    },
    "download": {
      "!type": "fn(path: ?, filename: ?, callback: ?)",
      "!doc": "Transfer the file at the given `path` as an attachment.\n\nOptionally providing an alternate attachment `filename`,\nand optional callback `callback(err)`. The callback is invoked\nwhen the data transfer is complete, or when an error has\nocurred. Be sure to check `res.headersSent` if you plan to respond.\n\nThis method uses `res.sendfile()`.\n\n@public"
    },
    "type": {
      "!type": "fn(type: ?)",
      "!doc": "Set _Content-Type_ response header with `type` through `mime.lookup()`\nwhen it does not contain \"/\", or set the Content-Type to `type` otherwise.\n\nExamples:\n\n    res.type('.html');\n    res.type('html');\n    res.type('json');\n    res.type('application/json');\n    res.type('png');\n\n@param {String} type\n@return {ServerResponse} for chaining\n@public"
    },
    "format": {
      "!type": "fn(obj: ?) -> !this",
      "!doc": "Respond to the Acceptable formats using an `obj`\nof mime-type callbacks.\n\nThis method uses `req.accepted`, an array of\nacceptable types ordered by their quality values.\nWhen \"Accept\" is not present the _first_ callback\nis invoked, otherwise the first match is used. When\nno match is performed the server responds with\n406 \"Not Acceptable\".\n\nContent-Type is set for you, however if you choose\nyou may alter this within the callback using `res.type()`\nor `res.set('Content-Type', ...)`.\n\n   res.format({\n     'text/plain': function(){\n       res.send('hey');\n     },\n\n     'text/html': function(){\n       res.send('<p>hey</p>');\n     },\n\n     'appliation/json': function(){\n       res.send({ message: 'hey' });\n     }\n   });\n\nIn addition to canonicalized MIME types you may\nalso use extnames mapped to these types:\n\n   res.format({\n     text: function(){\n       res.send('hey');\n     },\n\n     html: function(){\n       res.send('<p>hey</p>');\n     },\n\n     json: function(){\n       res.send({ message: 'hey' });\n     }\n   });\n\nBy default Express passes an `Error`\nwith a `.status` of 406 to `next(err)`\nif a match is not made. If you provide\na `.default` callback it will be invoked\ninstead.\n\n@param {Object} obj\n@return {ServerResponse} for chaining\n@public"
    },
    "attachment": {
      "!type": "fn(filename: string) -> !this",
      "!doc": "Set _Content-Disposition_ header to _attachment_ with optional `filename`.\n\n@param {String} filename\n@return {ServerResponse}\n@public"
    },
    "append": {
      "!type": "fn(field: string, val: string|[?]) -> ?",
      "!doc": "Append additional header `field` with value `val`.\n\nExample:\n\n   res.append('Link', ['<https://localhost/>', '<https://localhost:3000/>']);\n   res.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');\n   res.append('Warning', '199 Miscellaneous warning');\n\n@param {String} field\n@param {String|Array} val\n@return {ServerResponse} for chaining\n@public"
    },
    "header": {
      "!type": "fn(field: ?, val: ?) -> !this",
      "!doc": "Set header `field` to `val`, or pass\nan object of header fields.\n\nExamples:\n\n   res.set('Foo', ['bar', 'baz']);\n   res.set('Accept', 'application/json');\n   res.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });\n\nAliased as `res.header()`.\n\n@param {String|Object} field\n@param {String|Array} val\n@return {ServerResponse} for chaining\n@public"
    },
    "get": {
      "!type": "fn(field: string) -> string",
      "!doc": "Get value for header `field`.\n\n@param {String} field\n@return {String}\n@public"
    },
    "clearCookie": {
      "!type": "fn(name: string, options: ?) -> ?",
      "!doc": "Clear cookie `name`.\n\n@param {String} name\n@param {Object} options\n@return {ServerResponse} for chaining\n@public"
    },
    "cookie": {
      "!type": "fn(name: string, value: string|?, options: ?) -> !this",
      "!doc": "Set cookie `name` to `value`, with the given `options`.\n\nOptions:\n\n   - `maxAge`   max-age in milliseconds, converted to `expires`\n   - `signed`   sign the cookie\n   - `path`     defaults to \"/\"\n\nExamples:\n\n   // \"Remember Me\" for 15 minutes\n   res.cookie('rememberme', '1', { expires: new Date(Date.now() + 900000), httpOnly: true });\n\n   // save as above\n   res.cookie('rememberme', '1', { maxAge: 900000, httpOnly: true })\n\n@param {String} name\n@param {String|Object} value\n@param {Options} options\n@return {ServerResponse} for chaining\n@public"
    },
    "location": {
      "!type": "fn(url: string) -> !this",
      "!doc": "Set the location header to `url`.\n\nThe given `url` can also be \"back\", which redirects\nto the _Referrer_ or _Referer_ headers or \"/\".\n\nExamples:\n\n   res.location('/foo/bar').;\n   res.location('https://example.com');\n   res.location('../login');\n\n@param {String} url\n@return {ServerResponse} for chaining\n@public"
    },
    "redirect": {
      "!type": "fn(url: ?)",
      "!doc": "Redirect to the given `url` with optional response `status`\ndefaulting to 302.\n\nThe resulting `url` is determined by `res.location()`, so\nit will play nicely with mounted apps, relative paths,\n`\"back\"` etc.\n\nExamples:\n\n   res.redirect('/foo/bar');\n   res.redirect('https://example.com');\n   res.redirect(301, 'https://example.com');\n   res.redirect('../login'); // /blog/post/1 -> /blog/login\n\n@public"
    },
    "vary": {
      "!type": "fn(field: [?]|string) -> !this",
      "!doc": "Add `field` to Vary. If already present in the Vary set, then\nthis call is simply ignored.\n\n@param {Array|String} field\n@return {ServerResponse} for chaining\n@public"
    },
    "render": {
      "!type": "fn(view: ?, options: ?, callback: ?)",
      "!doc": "Render `view` with the given `options` and optional callback `fn`.\nWhen a callback function is given a response will _not_ be made\nautomatically, otherwise a response of _200_ and _text/html_ is given.\n\nOptions:\n\n - `cache`     boolean hinting to the engine it should cache\n - `filename`  filename of the view being rendered\n\n@public"
    },
    "!doc": "Response prototype.",
    "contentType": "res.type",
    "set": "res.header"
  },
  "charsetRegExp": {
    "!type": "+RegExp",
    "!doc": "Module variables.\n@private"
  },
  "sendfile": {
    "!type": "fn(res: ?, file: ?, options: ?, callback: fn(err: +Error))",
    "!doc": "pipe the send file stream"
  },
  "acceptParams": {
    "!type": "fn(str: string, index: ?) -> acceptParams.!ret",
    "!doc": "Parse accept params `str` returning an\nobject with `.value`, `.quality` and `.params`.\nalso includes `.originalIndex` for stable sorting\n\n@param {String} str\n@return {Object}\n@api private"
  },
  "parseExtendedQueryString": {
    "!type": "fn(str: ?) -> ?",
    "!doc": "Parse an extended query string with qs.\n\n@return {Object}\n@private"
  },
  "newObject": {
    "!type": "fn() -> ?",
    "!doc": "Return new empty object.\n\n@return {Object}\n@api private"
  },
  "tryStat": {
    "!type": "fn(path: string) -> ?",
    "!doc": "Return a stat, maybe.\n\n@param {string} path\n@return {fs.Stats}\n@private"
  },
  "proto": {
    "param": {
      "!type": "fn(name: string, fn: +Function) -> !this",
      "!doc": "Map the given param placeholder `name`(s) to the given callback.\n\nParameter mapping is used to provide pre-conditions to routes\nwhich use normalized placeholders. For example a _:user_id_ parameter\ncould automatically load a user's information from the database without\nany additional code,\n\nThe callback uses the same signature as middleware, the only difference\nbeing that the value of the placeholder is passed, in this case the _id_\nof the user. Once the `next()` function is invoked, just like middleware\nit will continue on to execute the route, or subsequent parameter functions.\n\nJust like in middleware, you must either respond to the request or call next\nto avoid stalling the request.\n\n app.param('user_id', function(req, res, next, id){\n   User.find(id, function(err, user){\n     if (err) {\n       return next(err);\n     } else if (!user) {\n       return next(new Error('failed to load user'));\n     }\n     req.user = user;\n     next();\n   });\n });\n\n@param {String} name\n@param {Function} fn\n@return {app} for chaining\n@public"
    },
    "handle": {
      "!type": "fn(req: ?, res: ?, out: ?)",
      "!doc": "Dispatch a req, res into the router.\n@private"
    },
    "process_params": {
      "!type": "fn(layer: ?, called: ?, req: ?, res: ?, done: ?)",
      "!doc": "Process any parameters for the layer.\n@private"
    },
    "use": {
      "!type": "fn(fn: ?) -> !this",
      "!doc": "Use the given middleware function, with optional path, defaulting to \"/\".\n\nUse (like `.all`) will run for any http METHOD, but it will not add\nhandlers for those methods so OPTIONS requests will not consider `.use`\nfunctions even if they could respond.\n\nThe other difference is that _route_ path is stripped and not visible\nto the handler function. The main effect of this feature is that mounted\nhandlers can operate without any code changes regardless of the \"prefix\"\npathname.\n\n@public"
    },
    "route": {
      "!type": "fn(path: string) -> proto.route",
      "!doc": "Create a new Route for the given path.\n\nEach route contains a separate middleware stack and VERB handlers.\n\nSee the Route api documentation for details on adding handlers\nand middleware to routes.\n\n@param {String} path\n@return {Route}\n@public"
    },
    "<i>": "fn(path: ?) -> !this",
    "!type": "fn(options: ?) -> fn(req: ?, res: ?, next: ?)",
    "!doc": "Initialize a new `Router` with the given `options`.\n\n@param {Object} options\n@return {Router} which is an callable function\n@public"
  },
  "Route": {
    "prototype": {
      "_handles_method": {
        "!type": "fn(method: ?) -> bool",
        "!doc": "Determine if the route handles a given method.\n@private"
      },
      "_options": {
        "!type": "fn() -> [string]",
        "!doc": "@return {Array} supported HTTP methods\n@private"
      },
      "dispatch": {
        "!type": "fn(req: ?, res: ?, done: ?)",
        "!doc": "dispatch req, res into this route\n@private"
      },
      "all": {
        "!type": "fn() -> !this",
        "!doc": "Add a handler for all HTTP verbs to this route.\n\nBehaves just like middleware and can respond or call `next`\nto continue processing.\n\nYou can use multiple `.all` call to add multiple handlers.\n\n  function check_something(req, res, next){\n    next();\n  };\n\n  function validate_user(req, res, next){\n    next();\n  };\n\n  route\n  .all(validate_user)\n  .all(check_something)\n  .get(function(req, res, next){\n    res.send('hello world');\n  });\n\n@param {function} handler\n@return {Route} for chaining\n@api public"
      },
      "<i>": "fn() -> !this"
    },
    "!type": "fn(path: string)",
    "!doc": "Initialize `Route` with the given `path`,\n\n@param {String} path\n@public",
    "path": "string",
    "stack": "[+Layer]",
    "methods": {
      "_all": "bool",
      "<i>": "bool",
      "!doc": "route handlers for various http methods"
    }
  },
  "createApplication": {
    "!type": "fn() -> fn(req: ?, res: ?, next: ?)|+Function",
    "!doc": "Create an express application.\n\n@return {Function}\n@api public"
  },
  "Layer": {
    "prototype": {
      "handle_error": {
        "!type": "fn(error: +Error, req: ?, res: ?, next: ?)",
        "!doc": "Handle the error for the layer.\n\n@param {Error} error\n@param {Request} req\n@param {Response} res\n@param {function} next\n@api private"
      },
      "handle_request": {
        "!type": "fn(req: ?, res: ?, next: ?)",
        "!doc": "Handle the request for the layer.\n\n@param {Request} req\n@param {Response} res\n@param {function} next\n@api private"
      },
      "match": {
        "!type": "fn(path: string) -> bool",
        "!doc": "Check if this route matches `path`, if so\npopulate `.params`.\n\n@param {String} path\n@return {Boolean}\n@api private"
      }
    },
    "!type": "fn(path: string, options: ?, fn: ?) -> +Layer",
    "name": "string",
    "params": {
      "!doc": "store values"
    },
    "path": "string",
    "keys": "[?]"
  },
  "appendMethods": {
    "!type": "fn(list: [?], addition: ?)",
    "!doc": "append methods to a list of methods"
  },
  "getPathname": {
    "!type": "fn(req: ?)",
    "!doc": "get pathname of request"
  },
  "gettype": {
    "!type": "fn(obj: ?) -> string",
    "!doc": "get type for error message"
  },
  "matchLayer": {
    "!type": "fn(layer: ?, path: string) -> +Error",
    "!doc": "Match path to a layer.\n\n@param {Layer} layer\n@param {string} path\n@private"
  },
  "mergeParams": {
    "!type": "fn(params: ?, parent: ?) -> !0",
    "!doc": "merge params with parent params"
  },
  "restore": {
    "!type": "fn(fn: ?, obj: ?) -> fn(err: ?)",
    "!doc": "restore obj props after function"
  },
  "sendOptionsResponse": {
    "!type": "fn(res: ?, options: [?], next: ?)",
    "!doc": "send an OPTIONS response"
  },
  "wrap": {
    "!type": "fn(old: fn(err: ?)|fn(), fn: fn(old: ?, err: ?)) -> fn()",
    "!doc": "wrap a function"
  },
  "decode_param": {
    "!type": "fn(val: string) -> !0",
    "!doc": "Decode param value.\n\n@param {string} val\n@return {string}\n@private"
  },
  "Error": {
    "statusCode": {
      "!type": "number",
      "!doc": "Respond"
    },
    "status": "number",
    "code": "string",
    "message": "string"
  },
  "objectRegExp": "+RegExp"
	};
});
