'use strict';

var _ = require('lodash');
var async = require('./lib/async');

var loaders = [require('./loader/local')];

function registerLoader(loader) {
    loaders.push(loader);
}

function deref(schema, callback) {
    schema = _.cloneDeep(schema);
    async.traverse(schema, _visit, _done);

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
        evaluate(loaders, _try) || resolve('no appropriate loader to handle the $ref: ' + $ref);
        
        function _try(loader) {
            return loader(schema, $ref, resolve);
        }
    }
    
    function _done() {
        setTimeout(function() {
            callback(null, schema);
        }, 0);
    }
}

function evaluate(collection, iterator) {
    var i, n;
    
    for (i = 0, n = collection.length; i < n; ++i) {
        if (iterator(collection[i])) {
            return true;
        }
    }
}

deref.registerLoader = registerLoader;

module.exports = deref;