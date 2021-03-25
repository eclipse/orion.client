/*******************************************************************************
 * Copyright (c) 2013, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/* eslint-disable missing-nls */
({
    optimizeCss: "standard.keepLines",
    optimize: "uglify2",
    generateSourceMaps: true,
    preserveLicenseComments: false,

    pragmas: {
        asynchLoader: true
    },

    skipDirOptimize: true,

    baseUrl: '.',
    locale: 'en-us',
    inlineText: true,
    paths: {
        text: 'requirejs/text',
        json: 'requirejs/json',
        i18n: 'requirejs/i18n',
        domReady: 'requirejs/domReady',
        gcli: 'gcli/gcli',
        util: 'gcli/util'
    },
    // Bundles whose ./web/ folders will be copied into the staging directory by the builder.
    // ** For Nashorn compatibility, use single quotes here **
    bundles: [
        '${orionClient}/bundles/org.eclipse.orion.client.collab',
        '${orionClient}/bundles/org.eclipse.orion.client.core',
        '${orionClient}/bundles/org.eclipse.orion.client.cf',
        '${orionClient}/bundles/org.eclipse.orion.client.ui',
        '${orionClient}/bundles/org.eclipse.orion.client.editor',
        '${orionClient}/bundles/org.eclipse.orion.client.git',
        '${orionClient}/bundles/org.eclipse.orion.client.help',
        '${orionClient}/bundles/org.eclipse.orion.client.javascript',
        '${orionClient}/bundles/org.eclipse.orion.client.webtools',
        '${orionClient}/bundles/org.eclipse.orion.client.users',
        '${orionClient}/bundles/org.eclipse.orion.client.debug'
    ],
    // Folders that should be searched for JSDoc
    jsdocs: [
        '${orionClient}/bundles/org.eclipse.orion.client.collab/web/orion/',
        '${orionClient}/bundles/org.eclipse.orion.client.core/web/orion/',
        '${orionClient}/bundles/org.eclipse.orion.client.cf/web/orion/',
        '${orionClient}/bundles/org.eclipse.orion.client.ui/web/orion/',
        '${orionClient}/bundles/org.eclipse.orion.client.editor/web/orion/',
        '${orionClient}/bundles/org.eclipse.orion.client.git/web/orion/',
        '${orionClient}/bundles/org.eclipse.orion.client.javascript/web/javascript/',
        '${orionClient}/bundles/org.eclipse.orion.client.webtools/web/webtools/',
        '${orionClient}/bundles/org.eclipse.orion.client.users/web/orion/'
    ],
    // List of modules that r.js will optimize
    modules: (function() {
        var modules = [
            { name: "index" },
            { name: "cfui/apps" },
            { name: "cfui/logs" },
            { name: "cfui/plugins/cFDeployPlugin" },
            { name: "cfui/plugins/cFPlugin" },
            { name: "cfui/plugins/wizards/generic/genericDeploymentWizard" },
            { name: "compare/compare" },
            { name: "compare-tree/compare-tree" },
            { name: "edit/content/imageViewerPlugin" },
            { name: "edit/content/jsonEditorPlugin" },
            { name: "edit/edit" },
            { name: "git/git-repository" },
            { name: "git/plugins/gitPlugin" },
            { name: "help/help" },
            { name: "javascript/plugins/javascriptPlugin" },
            { name: "javascript/plugins/ternWorkerCore" },
            { name: "mixloginstatic/javascript/landing-new" },
            { name: "mixloginstatic/javascript/login" },
            { name: "mixloginstatic/javascript/register" },
            { name: "mixloginstatic/javascript/reset" },
            { name: "mixloginstatic/javascript/ServerStatus" },
            { name: "mixloginstatic/javascript/manageExternalIds" },
            { name: "operations/list" },
            { name: "plugins/orionPlugin" },
            { name: "plugins/GerritFilePlugin" },
            { name: "plugins/GitHubFilePlugin" },
            { name: "plugins/authenticationPlugin" },
            { name: "plugins/fileClientPlugin" },
            { name: "plugins/helpPlugin" },
            { name: "plugins/jslintPlugin" },
            { name: "plugins/languageToolsPlugin" },
            { name: "plugins/languages/arduino/arduinoPlugin" },
            { name: "plugins/languages/bash/bashPlugin" },
            { name: "plugins/languages/c/cPlugin" },
            { name: "plugins/languages/coffeescript/coffeescriptPlugin" },
            { name: "plugins/languages/cpp/cppPlugin" },
            { name: "plugins/languages/csharp/csharpPlugin" },
            { name: "plugins/languages/docker/dockerPlugin" },
            { name: "plugins/languages/erlang/erlangPlugin" },
            { name: "plugins/languages/go/goPlugin" },
            { name: "plugins/languages/git/gitFilePlugin" },
            { name: "plugins/languages/haml/hamlPlugin" },
            { name: "plugins/languages/jade/jadePlugin" },
            { name: "plugins/languages/java/javaPlugin" },
            { name: "plugins/languages/jsx/jsxPlugin" },
            { name: "plugins/languages/json/jsonPlugin" },
            { name: "plugins/languages/launch/launchPlugin" },
            { name: "plugins/languages/less/lessPlugin" },
            { name: "plugins/languages/lua/luaPlugin" },
            { name: "plugins/languages/markdown/markdownPlugin" },
            { name: "plugins/languages/objectiveC/objectiveCPlugin" },
            { name: "plugins/languages/php/phpPlugin" },
            { name: "plugins/languages/python/pythonPlugin" },
            { name: "plugins/languages/properties/propertiesPlugin" },
            { name: "plugins/languages/ruby/rubyPlugin" },
            { name: "plugins/languages/scss/scssPlugin" },
            { name: "plugins/languages/smarty/smartyPlugin" },
            { name: "plugins/languages/sql/sqlPlugin" },
            { name: "plugins/languages/swift/swiftPlugin" },
            { name: "plugins/languages/typescript/typescriptPlugin" },
            { name: "plugins/languages/vb/vbPlugin" },
            { name: "plugins/languages/xml/xmlPlugin" },
            { name: "plugins/languages/xquery/xqueryPlugin" },
            { name: "plugins/languages/yaml/yamlPlugin" },
            { name: "plugins/googleAnalyticsPlugin" },
            { name: "plugins/pageLinksPlugin" },
            { name: "plugins/preferencesPlugin" },
            { name: "plugins/site/sitePlugin" },
            { name: "plugins/taskPlugin" },
            { name: "plugins/webEditingPlugin" },
            { name: "profile/user-profile" },
            { name: "profile/user-list" },
            { name: "profile/userservicePlugin" },
            { name: "settings/settings" },
            { name: "shell/plugins/shellPagePlugin" },
            { name: "shell/shellPage" },
            { name: "sites/site" },
            { name: "sites/sites" },
            { name: "sites/view" },
            { name: "webtools/plugins/webToolsPlugin" },
            { name: "orion/splash" }
        ];
        modules.forEach(function(module) {
            module.excludeShallow = ["chai/chai"];
        });
        return modules;
    }())
});
