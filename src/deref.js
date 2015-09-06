/*global process */
'use strict';

var _ = require('lodash');
var traverse = require('./lib/async').traverse;

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
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    process.nextTick(_process);
    
    function _process() {
        var loaders = [require('./loader/local')];
        if (options.loader || options.loaders) {
            loaders = loaders.concat(options.loader || options.loaders);
        }
        
        schema = _.cloneDeep(schema);
        traverse(schema, _visit, _done);
    
        function _visit(node, key, owner, next) {
            if (node === schema) {
                return false;
            }
            
            if (typeof node.$ref === 'string') {
                _load(node.$ref, function(err, schema) {
                    if (!err && schema) {
                        owner[key] = schema;
                    }
                    next();
                });
            }
            else {
                next();
            }
        }
        
        function _load($ref, resolve) {
            _evaluate(loaders, _try) || resolve('no appropriate loader to handle the $ref: ' + $ref);
            
            function _try(loader) {
                return loader(schema, $ref, resolve);
            }
        }
    
        function _done() {
            process.nextTick(function() {
                callback(null, schema);
            });
        }
    }

    function _evaluate(collection, iterator) {
        var i, n;
        
        for (i = 0, n = collection.length; i < n; ++i) {
            if (iterator(collection[i])) {
                return true;
            }
        }
    }
}

module.exports = deref;