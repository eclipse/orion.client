/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (https://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (https://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
define([
	'i18n!javascript/nls/messages',
], function(Messages) {

	return {
		defNames: ["ecma5", "ecma6", "ecma7", "browser", "chai"], //these are in the same order to avoid a walk of the array
		definitions: Object.freeze({
			ecma5: {
				doc: Messages["ecma5"],
				url: "https://ternjs.net/doc/manual.html#typedef"
			},
			ecma6: {
				doc: Messages["ecma6"],
				url: "https://ternjs.net/doc/manual.html#typedef"
			},
			ecma7: {
				doc: Messages["ecma7"],
				url: "https://ternjs.net/doc/manual.html#typedef"
			},
			browser: {
				doc: Messages["browserDef"],
				url: "https://ternjs.net/doc/manual.html#typedef"
			},
			chai: {
				doc: Messages["chai"],
				url: "https://ternjs.net/doc/manual.html#typedef"
			}
		}),
		attributes: Object.freeze({
			dependencyBudget: {
				doc: Messages["dependencyBudget"],
				url: "https://ternjs.net/doc/manual.html#configuration"
			},
			dontLoad: {
				doc: Messages["dontLoad"],
				url: "https://ternjs.net/doc/manual.html#configuration"
			},
			ecmaVersion: {
				doc: Messages["ecmaVersionDescription"],
				url: "https://ternjs.net/doc/manual.html#configuration"
			},
			libs: {
				doc: Messages["libs"],
				url: "https://ternjs.net/doc/manual.html#configuration"
			},
			loadEagerly: {
				doc: Messages["loadEagerly"],
				url: "https://ternjs.net/doc/manual.html#configuration"
			},
			plugins: {
				doc: Messages["plugins"],
				url: "https://ternjs.net/doc/manual.html#configuration"
			}
		}),
		plugins: Object.freeze({
			required: {
				async_await: {
					name: Messages.asyncAwaitPluginName,
					description: Messages.asyncAwaitPluginDescription,
					version: "1.0.0"
				},
				doc_comment: {
					name: Messages["ternDocPluginName"],
					description: Messages["ternDocPluginDescription"],
					url: "https://ternjs.net/doc/manual.html#plugin_doc_comment",
					fullDocs: true,
					version: "0.18.0"
				},
				plugins: {
					name: Messages["ternPluginsPluginName"],
					description: Messages["ternPluginsPluginDescription"],
					version: "1.0"
				},
				occurrences: {
					name: Messages["occurrencesPluginName"],
					description: Messages["occurrencesPluginDescription"],
					version: "1.0"
				},
				open_impl: {
					name: Messages["openImplPluginName"],
					description: Messages["openImplPluginDescription"],
					version: "1.0"
				},
				html: {
					name: Messages["htmlDepPluginName"],
					description: Messages["htmlDepPluginDescription"],
					version: "1.0"
				},
				refs: {
					name: Messages["findTypesName"],
					description: Messages["findTypesDescription"],
					version: "1.0"
				},
				jsdoc: {
					name: Messages["jsdocPluginName"],
					description: Messages["jsdocPluginDescription"],
					version: "1.0"
				},
				eslint: {
					name: Messages["eslintPluginName"],
					description: Messages["eslintPluginDescription"],
					version: "1.0"
				},
				outliner: {
					name: Messages["outlinerPluginName"],
					description: Messages["outlinerPluginDescription"],
					version: "1.0"
				},
				fixes: {
					name: Messages["fixesPluginName"],
					description: Messages["fixesPluginDescription"],
					version: "1.0"
				},
				ast: {
					name: Messages["astPluginName"],
					description: Messages["astPluginDescription"],
					version: "1.0"
				},
				templates: {
					name: Messages["templatesPlugin"],
					description: Messages["templatesPluginDescription"],
					version: "1.0"
				},
				beautifier: {
					name: Messages["beautifierPluginName"],
					description: Messages["beautifierPluginDescription"],
					version: "1.0"
				},
				resolver: {
					name: Messages["resolverPluginName"],
					description: Messages["resolverPluginDescription"],
					version: "1.0"
				},
			},
			optional: {
				amqp: {
					name: Messages["orionAMQPPluginName"],
					description: Messages["orionAMQPPluginDescription"],
					version: "0.9.1",
					env: "amqp"
				},
				angular: {
					name: Messages["orionAngularPluginName"],
					description: Messages["orionAngularPluginDescription"],
					url: "https://ternjs.net/doc/manual.html#plugin_angular",
					version: "0.18.0"
				},
				commonjs: {
					name: Messages['commonjsPluginName'],
					description: Messages['commonjsPluginDescription'],
					url: "https://ternjs.net/doc/manual.html#plugin_commonjs",
					version: "0.18.0"
				},
				complete_strings: {
					name: Messages['ternCompleteStringsPluginName'],
					description: Messages['ternCompleteStringsPluginDescription'],
					url: "https://ternjs.net/doc/manual.html#plugin_complete_strings",
					version: "0.18.0"
				},
				express: {
					name: Messages["orionExpressPluginName"],
					description: Messages["orionExpressPluginDescription"],
					version: "4.12.4",
					env: "express"
				},
				es_modules: {
					name: Messages["orionESModulesPluginName"],
					description: Messages["orionESModulesPluginDescription"],
					url: "https://ternjs.net/doc/manual.html#plugin_es_modules",
					version: "0.18.0",
				},
				mongodb: {
					name: Messages["orionMongoDBPluginName"],
					description: Messages["orionMongoDBPluginDescription"],
					version: "1.1.21",
					env: "mongodb"
				},
				mysql: {
					name: Messages["orionMySQLPluginName"],
					description: Messages["orionMySQLPluginDescription"],
					version: "2.7.0",
					env: "mysql"
				},
				node: {
					name: Messages["orionNodePluginName"],
					description: Messages["orionNodePluginDescription"],
					url: "https://ternjs.net/doc/manual.html#plugin_node",
					version: "0.18.0"
				},
				postgres: {
					name: Messages["orionPostgresPluginName"],
					description: Messages["orionPostgresPluginDescription"],
					version: "4.4.0",
					env: "pg"
				},
				redis: {
					name: Messages["orionRedisPluginName"],
					description: Messages["orionRedisPluginDescription"],
					version: "0.12.1",
					env: "redis"
				},
				requirejs: {
					name: Messages["orionRequirePluginName"],
					description: Messages["orionRequirePluginDescription"],
					url: "https://ternjs.net/doc/manual.html#plugin_requirejs",
					version: "0.18.0"
				},
				webpack: {
					name: Messages["orionWebpackPluginName"],
					description: Messages["orionWebpackPluginDescription"],
					url: "https://ternjs.net/doc/manual.html#plugin_webpack",
					version: "0.18.0"
				}
			}
		})
	};
});
