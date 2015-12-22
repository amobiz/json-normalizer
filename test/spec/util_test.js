'use strict';

var assert = require('assert');

var base = process.cwd();
var util = require(base + '/lib/util');

var iterate = util.iterate;
var traverse = util.traverse;

describe('util()', function () {
	describe('iterate()', function () {
		var nodes = {
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

		it('should iterate in order', function (done) {
			var actual;

			actual = {};
			iterate(nodes, function (value, key, list, next) {
				actual[key] = value;
				next();
			}, function () {
				assert.deepEqual(actual, nodes);
				done();
			});
		});
	});

	describe('traverse()', function () {
		var nodes = {
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
		var order = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 0, 'h', 'i', 1, 'j', 0, 1, 2, 'k'];

		it('should traverse deep first', function (done) {
			var actual;

			actual = [];
			traverse(nodes, function (value, key, list, next) {
				actual.push(key);
				next();
			}, function () {
				assert.deepEqual(actual, order);
				done();
			});
		});
	});
});
