'use strict';

var _ = require('lodash');
var assert = require('assert');

var base = process.cwd();
var factory = require(base + '/lib/loader/mapper');

function shouldMatch(mapper, mappings) {
	return Promise.all(Object.keys(mappings).map(function ($ref) {
		return _test(mappings[$ref], $ref);
	}));

	function _test(expected, $ref) {
		return new Promise(function (resolve) {
			mapper(null, $ref, function (err, schema) {
				assert.deepEqual(schema, expected);
				resolve();
			});
		});
	}
}

function shouldOverride(mapper, orignal, override) {
	var untouched;

	untouched = _.omit(orignal, Object.keys(override));
	return Promise.all([
		shouldMatch(mapper, untouched),
		shouldMatch(mapper, override)
	]);
}

function callAdd(mapper, mappings) {
	Object.keys(mappings).forEach(function ($ref) {
		mapper.map($ref, mappings[$ref]);
	});
}

describe('mapper()', function () {
	var $schema = 'http://json-schema.org/draft-04/schema#';
	var $hyper = 'http://json-schema.org/draft-04/hyper-schema#';
	var $extend = 'http://github.com/amobiz/json-normalizer/schema/normalizable#';
	var alias = {
		properties: {
			'alias': {
				type: 'array'
			}
		}
	};
	var primary = {
		properties: {
			'primary': {
				type: 'string'
			}
		}
	};
	var gathering = {};
	var mappings = {
		'http://json-schema.org/draft-04/schema#': {
			title: 'draft-04/schema'
		},
		'http://json-schema.org/draft-04/hyper-schema#': {
			title: 'draft-04/hyper-schema'
		},
		'http://github.com/amobiz/json-normalizer/schema/normalizable#': {
			definitions: {
				alias: alias,
				primary: primary,
				gathering: gathering
			}
		}
	};

	describe('factory', function () {
		it('factory should optionally accepts a definition object', function () {
			var mapper;

			mapper = factory();
			assert(mapper);
			mapper = factory(mappings);
			assert(mapper);
		});
	});

	describe('map()', function () {
		it('should returns falsy and do not call callback when mapping not found', function () {
			return new Promise(function (resolve) {
				var mapper, callCount;

				callCount = 0;
				function callback() {
					++callCount;
				}

				mapper = factory();
				assert(mapper(null, $schema, callback) !== true);
				assert(mapper(null, $hyper, callback) !== true);
				process.nextTick(function () {
					assert.equal(callCount, 0);
					resolve();
				});
			});
		});

		it('should map all defined $refs passed to factory', function () {
			var mapper;

			mapper = factory(mappings);
			return shouldMatch(mapper, mappings);
		});

		it('subsequent map() calls overrides previous map() calls', function () {
			var i, n, mapper, promise;

			var cases = [{
				mappings: mappings
			}, {
				mappings: {
					'http://github.com/amobiz/json-normalizer/schema/normalizable#': {
						definitions: {
							alias: {
								title: 'alias'
							}
						}
					}
				},
				type: 'add'
			}, {
				mappings: {
					'http://github.com/amobiz/json-normalizer/schema/normalizable#': {
						definitions: {
							primary: {
								title: 'primary'
							}
						}
					}
				},
				type: 'map'
			}, {
				mappings: {
					'http://github.com/amobiz/json-normalizer/schema/normalizable#': {
						definitions: {
							primary: {
								title: 'primary2'
							},
							others: {
								title: 'others'
							}
						}
					}
				},
				type: 'map'
			}, {
				mappings: {
					'http://github.com/amobiz/json-normalizer/schema/normalizable#': {
						definitions: {
							primary: {
								title: 'primary5'
							},
							others: {
								title: 'others5'
							}
						}
					}
				},
				type: 'add'
			}];

			promise = Promise.resolve(true);
			mapper = factory(mappings);
			for (i = 1, n = cases.length; i < n; ++i) {
				promise = _testCase(promise, i);
			}
			return promise;

			function _testCase(_promise, idx) {
				return _promise.then(function () {
					return _test(cases[idx - 1].mappings, cases[idx].mappings, cases[idx].type);
				});
			}

			function _test(orignal, override, type) {
				if (type === 'add') {
					callAdd(mapper, override);
				} else {
					mapper.map(override);
				}
				return shouldOverride(mapper, orignal, override);
			}
		});
	});

	describe('mapper()', function () {
		it('allows reference inside schema', function (done) {
			var mapper;

			mapper = factory(mappings);
			mapper(null, $extend + '/definitions/alias', function (err, schema) {
				assert.equal(schema, alias);
				assert.notEqual(schema, primary);
				done();
			});
		});

		it('disallows local references', function () {
			var mapper;

			mapper = factory(mappings);
			assert(mapper(null, '#') !== true);
			assert(mapper(null, '#/definitions/alias') !== true);
		});
	});
});
