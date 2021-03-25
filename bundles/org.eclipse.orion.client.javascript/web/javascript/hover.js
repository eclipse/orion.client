/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd*/
/* global doctrine */
define([
'orion/objects',
'javascript/finder',
'orion/URITemplate',
'orion/Deferred',
'i18n!javascript/nls/messages',
'orion/i18nUtil',
'doctrine/doctrine'
], function(Objects, Finder, URITemplate, Deferred, Messages, i18nUtil, doctrine) {

/**
 * @description Formats the hover info as markdown text
 * @param {String} node The text to format
 * @returns returns
 */
function formatMarkdownHover(comment, offsetRange) {
    if (!comment) {
        return null;
    }
    try {
        var format = Object.create(null);
        if (comment) {
            var doc = doctrine.parse(comment, {
                recoverable: true,
                unwrap: true
            });
            format.params = [];
            format.throws = [];
            format.see = [];
            format.desc = doc.description ? doc.description : '';
            if (doc.tags) {
                var len = doc.tags.length;
                for (var i = 0; i < len; i++) {
                    var tag = doc.tags[i];
                    switch (tag.title) {
                        case 'name':
                            {
                                if (tag.name) {
                                    format.name = tag.name;
                                }
                                break;
                            }
                        case 'description':
                            {
                                if (tag.description !== null) {
                                    format.desc = format.desc === '' ? tag.description : format.desc + '\n' + tag.description; //$NON-NLS-1$
                                }
                                break;
                            }
                        case 'param':
                            {
                                format.params.push(_convertTagType(tag.type) +
                                    (tag.name ? '__' + tag.name + '__ ' : '') + //$NON-NLS-1$ //$NON-NLS-2$
                                    (tag.description ? tag.description + '\n' : '')); //$NON-NLS-1$
                                break;
                            }
                        case 'returns':
                        case 'return':
                            {
                                format.returns = _convertTagType(tag.type) +
                                (tag.description ? tag.description + '\n' : ''); //$NON-NLS-1$
                                break;
                            }
                        case 'since':
                            {
                                if (tag.description) {
                                    format.since = tag.description;
                                }
                                break;
                            }
                        case 'callback':
                            {
                                if (tag.description) {
                                    format.callback = tag.description;
                                } else {
                                    format.callback = Messages['callbackText'];
                                }
                                break;
                            }
                        case 'throws':
                            {
                                format.throws.push(_convertTagType(tag.type) + (tag.description ? tag.description + '\n' : '')); //$NON-NLS-1$
                                break;
                            }
                        case 'see':
                            {
                                format.see.push(_convertTagType(tag.type) + (tag.description ? tag.description + '\n' : '')); //$NON-NLS-1$
                                break;
                            }
                        case 'deprecated':
                            {
                                format.deprecated = tag.description ? tag.description + '\n' : ''; //$NON-NLS-1$
                            }
                    }
                }
            }
        }
        var hover = '';
        if (typeof format.deprecated !== 'undefined') {
            hover += i18nUtil.formatMessage('__${0}__ ', Messages['deprecatedHoverTitle']) + format.deprecated + '\n\n'; //$NON-NLS-2$ //$NON-NLS-1$
        }
        if (format.desc !== '') {
            hover += format.desc + '\n\n'; //$NON-NLS-1$
        }
        if (format.params.length > 0) {
            hover += i18nUtil.formatMessage('__${0}__\n\n', Messages['parametersHoverTitle']); //$NON-NLS-1$
            for (i = 0; i < format.params.length; i++) {
                hover += '>' + format.params[i] + '\n\n'; //$NON-NLS-1$
            }
        }
        if (format.returns) {
            hover += i18nUtil.formatMessage('__${0}__\n\n>', Messages['returnsHoverTitle']) + format.returns + '\n\n'; //$NON-NLS-2$ //$NON-NLS-1$
        }
        if (format.throws.length > 0) {
            hover += i18nUtil.formatMessage('__${0}__\n\n', Messages['throwsHoverTitle']); //$NON-NLS-1$
            for (i = 0; i < format.throws.length; i++) {
                hover += '>' + format.throws[i] + '\n\n'; //$NON-NLS-1$
            }
        }
        if (format.callback) {
            hover += i18nUtil.formatMessage('__${0}__\n\n>', Messages['callbackHoverTitle']) + format.callback + '\n\n'; //$NON-NLS-2$ //$NON-NLS-1$
        }
        if (format.since) {
            hover += i18nUtil.formatMessage('__${0}__\n\n>', Messages['sinceHoverTitle']) + format.since + '\n\n'; //$NON-NLS-2$ //$NON-NLS-1$
        }
        if (format.see.length > 0) {
            hover += i18nUtil.formatMessage('__${0}__\n\n', Messages['seeAlsoHoverTitle']); //$NON-NLS-1$
            for (i = 0; i < format.see.length; i++) {
                hover += '>' + format.see[i];
                if (i < format.see.length - 1) {
                    hover += '\n\n'; //$NON-NLS-1$
                }
            }
        }
        if (hover === '') {
            return null;
        }
        //TODO scope this to not show when you are on a decl
        /**var href = new URITemplate("#{,resource,params*}").expand(
                      {
                      resource: metadata.location,
                      params: {start:node.range[0], end: node.range[1]}
                      }); //$NON-NLS-0$
        hover += '\n\n\n  [Jump to declaration]('+href+')';*/
    } catch (e) {
        hover = '';
    }
    var result = {
        content: hover,
        type: 'markdown'
    };
    if (offsetRange) {
        result.offsetStart = offsetRange[0];
        result.offsetEnd = offsetRange[1];
    }
    return result;
}

/**
 * @description Converts the doctrine tag type to a simple form to appear in the hover
 * @private
 * @param {Object} tag Teh doctrine tag object
 * @returns {String} The simple name to display for the given doctrine tag type
 */
function _convertTagType(type) {
    if (!type) {
        return '';
    }
    switch (type.type) {
        case 'NameExpression':
            {
                if (type.name) {
                    return '*(' + type.name + ')* '; //$NON-NLS-1$ //$NON-NLS-2$
                }
                break;
            }
        case 'RecordType':
            {
                return '*(Object)* '; //$NON-NLS-1$
            }
        case 'FunctionType':
            {
                return '*(Function)* '; //$NON-NLS-1$
            }
        case 'NullableType':
        case 'NonNullableType':
        case 'OptionalType':
        case 'RestType':
            {
                return _convertTagType(type.expression);
            }
        case 'TypeApplication':
            {
                //we only want to care about the first part i.e. Object[] vs. Object.<string, etc>
                if (type.expression.name === 'Array') {
                    //we need to grab the first application
                    if (type.applications && type.applications.length > 0) {
                        var val = type.applications[0];
                        if (val.name) {
                            //simple type
                            return '*(' + val.name + '[])* '; //$NON-NLS-1$ //$NON-NLS-2$
                        } else if (val.fields && val.fields.length > 0) {
                            return _convertTagType(val.fields[0]);
                        }
                        //fallback to trying to format the raw value
                        return _convertTagType(val);
                    }
                }
                return _convertTagType(type.expression);
            }
        case 'UnionType':
        case 'ArrayType':
            {
                if (type.elements && type.elements.length > 0) {
                    //always just take the first type
                    return _convertTagType(type.elements[0]);
                }
                break;
            }
        case 'FieldType':
            {
                return _convertTagType(type.value);
            }
        default:
            return '';
    }
}
var deferred;
/**
 * @name javascript.JavaScriptHover
 * @description creates a new instance of the hover
 * @constructor
 * @public
 * @param {javascript.ASTManager} astManager
 * @param {javascript.ScriptResolver} resolver
 * @param {javascript.TernWorkerCore} ternWorker
 * @param {javascript.CUProvider} cuProvider
 * @since 7.0
 */
function JavaScriptHover(astManager, resolver, ternWorker, cuProvider) {
    this.astManager = astManager;
    this.resolver = resolver;
    this.ternworker = ternWorker;
    this.cuprovider = cuProvider;
}

Objects.mixin(JavaScriptHover.prototype, /** @lends javascript.JavaScriptHover.prototype*/ {

    /**
     * @description Callback from the editor to compute the hover
     * @function
     * @public
     * @memberof javascript.JavaScriptOccurrences.prototype
     * @param {?} editorContext The current editor context
     * @param {?} ctxt The current selection context
     */
    computeHoverInfo: function computeHoverInfo(editorContext, ctxt) {
        if (ctxt.proposal && ctxt.proposal.kind === 'js') {
            return ctxt.proposal.hover;
        }
        var that = this;
        return editorContext.getFileMetadata().then(function(meta) {
            if (!meta) {
                return null;
            }
            if (Array.isArray(meta.parents) && meta.parents.length > 0) {
                that.resolver.setSearchLocation(meta.parents[meta.parents.length - 1].Location);
            } else {
                that.resolver.setSearchLocation(null);
            }
            if (meta && meta.contentType.id === 'application/javascript') {
                return that.astManager.getAST(editorContext).then(function(ast) {
                    return that._doHover(ast, ctxt, meta);
                });
            }
            return editorContext.getText().then(function(text) {
                var cu = that.cuprovider.getCompilationUnit(function() {
                    return Finder.findScriptBlocks(text);
                }, meta);
                if (cu.validOffset(ctxt.offset)) {
                    return that.astManager.getAST(cu.getEditorContext()).then(function(ast) {
                        return that._doHover(ast, ctxt, meta, text);
                    });
                }
                return null;
            });
        });

    },

    _doHover: function _doHover(ast, ctxt, meta, htmlsource) {
        var node = Finder.findNode(ctxt.offset, ast, {
            parents: true
        });
        if (node && node.type === 'Literal') {
            //Symantic navigation
            if (ctxt.offset <= node.range[0] || ctxt.offset >= node.range[1]) {
                //be a bit more precise than finder
                return null;
            }
            var parents = node.parents;
            var parent = parents.pop();
            var that = this;
            if (parent.type === 'ArrayExpression') {
                parent = parents.pop();
                if (parent.type === 'CallExpression' && (parent.callee.name === 'define' || parent.callee.name === 'require')) {
                    var path = node.value;
                    return that.resolver.getWorkspaceFile(path).then(function(files) {
                        return that._formatFilesHover(path, files);
                    });
                }
            } else if (parent.type === 'CallExpression') {
                path = node.value;
                switch (parent.callee.name) {
                    case 'require':
                        {
                            return that.resolver.getWorkspaceFile(path).then(function(files) {
                                if (!/\.js$/.test(path)) {
                                    path += '.js'; //$NON-NLS-1$
                                }
                                var rels = that.resolver.resolveRelativeFiles(path, files, meta);
                                if (rels && rels.length > 0) {
                                    return that._formatFilesHover(node.value, rels);
                                }
                            });
                        }
                        //$FALLTHROUGH$
                    case 'importScripts':
                        {
                            path = node.value;
                            return that.resolver.getWorkspaceFile(path).then(function(files) {
                                if (!/\.js$/.test(path)) {
                                    path += '.js'; //$NON-NLS-1$
                                }
                                var rels = that.resolver.resolveRelativeFiles(path, files, meta);
                                if (rels && rels.length > 0) {
                                    return that._formatFilesHover(node.value, rels);
                                }
                            });
                        }
                }
            } else if (parent.type === 'ImportDeclaration') {
                path = node.value;
                return that.resolver.getWorkspaceFile(path).then(function(files) {
                    if (!/\.js$/.test(path)) {
                        path += '.js'; //$NON-NLS-1$
                    }
                    var rels = that.resolver.resolveRelativeFiles(path, files, meta);
                    if (rels && rels.length > 0) {
                        return that._formatFilesHover(node.value, rels);
                    }
                });
            }
            return null;
        }
        deferred = new Deferred();
        var files = [{
            type: 'full',
            name: meta.location,
            text: htmlsource ? htmlsource : ast.sourceFile.text
        }];
        this.ternworker.postMessage({
                request: 'documentation',
                args: {
                    params: {
                        offset: ctxt.offset,
                        docFormat: 'full'
                    },
                    files: files,
                    meta: {
                        location: meta.location
                    }
                }
            },
            function(response) {
                var hover = '';
                if (response.request === 'documentation') {
                    if (response.doc) {
                        hover = formatMarkdownHover(response.doc.doc);
                    }
                    deferred.resolve(hover);
                }
            });
        return deferred;
    },

    /**
     * @description Formats the list of files as links for the hover
     * @function
     * @private
     * @param {String} path The path we are navigating to
     * @param {Array.<javascript.ScriptResolver.File>} files The array of files to linkify
     * @returns {String} The mardown to show in the hover
     */
    _formatFilesHover: function _formatFilesHover(path, files) {
        if (path && files) {
            var title = null;
            if (files.length > 1) {
                title = i18nUtil.formatMessage('###${0} \'${1}\'###', Messages['openFileForTitle'], path); //$NON-NLS-1$
            }
            var hover = '';
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (file.name && file.path && file.contentType) {
                    hover += '[';
                    var href = new URITemplate("#{,resource,params*}").expand( //$NON-NLS-1$
                        {
                            resource: file.location,
                            params: {}
                        });
                    hover += file.name + '](' + href + ') - ' + file.path + '\n\n'; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$
                }

            }
            return {
                title: title,
                content: hover,
                type: 'markdown',
                allowFullWidth: true
            };
        }
        return null;
    }
});

/**
 * @name javascript.JavaScriptDebugHover
 * @constructor
 * @public
 * @param {javascript.ASTManager} astManager
 * @param {javascript.ScriptResolver} resolver
 * @param {javascript.TernWorkerCore} ternWorker
 * @param {javascript.CUProvider} cuProvider
 */
function JavaScriptDebugHover(astManager, resolver, ternWorker, cuProvider) {
    this.astManager = astManager;
    this.resolver = resolver;
    this.ternworker = ternWorker;
    this.cuprovider = cuProvider;
}

/**
 * Get the plain text of a node.
 * @param {Node} node
 * @return {string}
 */
function _getNodeText(node) {
    return node.sourceFile.text.substr(node.start, node.end - node.start);
}

Objects.mixin(JavaScriptDebugHover.prototype, /** @lends javascript.JavaScriptDebugHover.prototype*/ {

    /**
     * @description Get hover text
     * @function
     * @public
     * @param {?} editorContext The current editor context
     * @param {?} ctxt The current selection context
     */
    findHoverText: function findHoverText(editorContext, ctxt) {
        if (ctxt.proposal && ctxt.proposal.kind === 'js') {
            return ctxt.proposal.hover;
        }
        var that = this;
        return editorContext.getFileMetadata().then(function(meta) {
            if (!meta) {
                return null;
            }
            if (Array.isArray(meta.parents) && meta.parents.length > 0) {
                that.resolver.setSearchLocation(meta.parents[meta.parents.length - 1].Location);
            } else {
                that.resolver.setSearchLocation(null);
            }
            if (meta && meta.contentType.id === 'application/javascript') {
                return that.astManager.getAST(editorContext).then(function(ast) {
                    return that._doHover(ast, ctxt, meta);
                });
            }
            return editorContext.getText().then(function(text) {
                var cu = that.cuprovider.getCompilationUnit(function() {
                    return Finder.findScriptBlocks(text);
                }, meta);
                if (cu.validOffset(ctxt.offset)) {
                    return that.astManager.getAST(cu.getEditorContext()).then(function(ast) {
                        return that._doHover(ast, ctxt, meta, text);
                    });
                }
                return null;
            });
        });

    },

    _doHover: function _doHover(ast, ctxt, meta, htmlsource) {
        var node = Finder.findNode(ctxt.offset, ast, {
            parents: true
        });
        if (!node) {
            return null;
        } else if (node.type === 'Literal') {
            return _getNodeText(node);
        } else if (node.type === 'Identifier') {
            if (node.parents[node.parents.length - 1].type === 'MemberExpression' &&
                node.parents[node.parents.length - 1].property.range[0] <= ctxt.offset) {
                return _getNodeText(node.parents[node.parents.length - 1]);
            } else {
                return _getNodeText(node);
            }
        } else {
            return null;
        }
    }

});

return {
    JavaScriptHover: JavaScriptHover,
    JavaScriptDebugHover: JavaScriptDebugHover,
    formatMarkdownHover: formatMarkdownHover
};
});
