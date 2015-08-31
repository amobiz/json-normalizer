/*global describe, it */
'use strict';

var assert = require('assert');
var async = require('../../src/lib/async');

var iterate = async.iterate;
var traverse = async.traverse;

describe('async()', function() {

    describe('iterate()', function() {
        var v = {
            schema: {
                definitions: {
                    ext: {
                    }
                },
                properties: {
                    a: { $ref: '#/definitions/ext' },
                    b: {
                    }
                }
            },
            value: {
            },
            expected: {
            }
        };
        
        var a = {};
        
        it('should iterate in order', function(done) {
            iterate(v, function(value, key, list, next) {
                a[key] = value;
                next();
            }, function() {
                assert.deepEqual(a, v);
                done();
            });
        });
        
    });

    describe('traverse()', function() {
    
        var v = {
            a: {
                b: {
                    c: {},
                    d: {}
                },
                e: {}
            },
            f: {
                g: [{
                    h: {},
                    i: {}
                }, {
                    j: [4, 5, 6]
                }],
                k: 4
            }
        };
        
        var e = [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 0, 'h', 'i', 1, 'j', 0, 1, 2, 'k' ];
        
        var a = [];
        
        it('should traverse deep first', function(done) {
            traverse(v, function(value, key, list, next) {
                a.push(key);
                next();
            }, function() {
                assert.deepEqual(a, e);
                done();
            });
        });
        
    });
    
});
