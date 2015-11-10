/*global process */
'use strict';

var _ = require('lodash');

function iterate(collection, iterator, done) {
    var keys, n;

    if (_.isPlainObject(collection)) {
        keys = Object.keys(collection);
        n = keys.length;
        _visit(0);
    }
    else if (_.isArray(collection)) {
        n = collection.length;
        _visit(0);
    }
    else {
        done();
    }
    return collection;

    function _visit(i) {
        var key;

        if (i < n) {
            key = keys ? keys[i] : i;
            if (iterator(collection[key], key, collection, _next) === false) {
                done();
            }
        }
        else {
            done();
        }

        function _next() {
            _visit(i+1);
        }
    }
}

function traverse(collection, iterator, done) {
    return iterate(collection, _visit, done);

    function _visit(val, key, collection, next) {
        if (iterator(val, key, collection, _next) === false) {
            return false;
        }

        function _next() {
            traverse(val, iterator, next);
        }
    }
}

function reduce(collection, iteratee, accumulator) {
    if (!collection) {
        return accumulator;
    }
    if (Array.isArray(collection)) {
        return collection.reduce(iteratee, accumulator);
    }
    return iteratee(accumulator, collection);
}

exports.iterate = iterate;
exports.traverse = traverse;
exports.reduce = reduce;
