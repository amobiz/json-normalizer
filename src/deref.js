/*global process */
'use strict';

var _ = require('lodash');
var traverse = require('./lib/util').traverse;

/**
 * Dereference a schema that using JSON references.
 * 
 * Default implementation supports only local references, 
 * i.e. references that starts with “#“. 
 * Custom loaders can be provided via the options object.
 * 
 * @context don't care.
 * @param schema: string
 * @param option.loader | option.loaders: function | [function]
 *   A loader function or an array of loader functions.
 *  
 *   Loader must be a function that returns truthy if it can handle the given reference, falsy otherwise.
 *   Loader takes root schema, $ref and callback(err, schema) as parameters in that order.
 *   A local loader that is always tested first, and other loaders provided in options are then tested by the order they being listed.
 * 
 * @param callback: function
 * @return no return value. 
 * 
 */
function deref(schema, options, callback) {
    var root, loaders, error;
    
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    
    root = _.cloneDeep(schema);
    loaders = _loaders(require('./loader/local'), options);
    process.nextTick(function() {
        traverse(root, _visit, _done);
    });
    
    function _visit(node, key, owner, next) {
        if (node === root) {
            next();
        }
        if (typeof node.$ref === 'string') {
            _load(node.$ref, function(err, schema) {
                if (err) {
                    error = err;
                    return false;
                }
                owner[key] = schema;
                next();
            });
        }
        else {
            next();
        }
        
        function _load($ref, resolve) {
            _evaluate(loaders, _try) || resolve({
                message: 'no appropriate loader',
                $ref: $ref
                });
            
            function _try(loader) {
                return loader(root, $ref, resolve);
            }
        }
    }
    
    function _done() {
        process.nextTick(function() {
            if (error) {
                callback(error);
            }
            else {
                callback(null, root);
            }
        });
    }
}

function sync(schema, options) {
    var root = _.cloneDeep(schema);
    var loaders = _loaders(require('./loader/local').sync, options || {});
    return traverse(root, _visit, _done);
    
    function _visit(node, key, owner, next) {
        var schema;
        
        if (node === root) {
            return false;
        }
        if (typeof node.$ref === 'string') {
            schema = _load(node.$ref);
            if (schema) {
                owner[key] = schema;
            }
        }
        next();
    
        function _load($ref) {
            return _evaluate(loaders, _try);
            
            function _try(loader) {
                return loader(root, $ref);
            }
        }
    }

    function _done() {
    }
}

function _loaders(local, options) {
    var loaders = [local];
    if (options.loader || options.loaders) {
        loaders = loaders.concat(options.loader || options.loaders);
    }
    return loaders;
}

function _evaluate(collection, iterator) {
    var i, n, v;
    
    for (i = 0, n = collection.length; i < n; ++i) {
        if (v = iterator(collection[i])) {
            return v;
        }
    }
}

module.exports = deref;
module.exports.sync = sync;