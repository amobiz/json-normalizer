'use strict';

var fs = require('fs');
var mochaCases = require('mocha-cases');

var normalize = require('../../src/normalize');

describe('normalize()', function () {
	describe('self-certification', function () {
		var schema = json(__dirname + '/schema/schema');
		var normalizable = json(__dirname + '/schema/normalizable');

		var cases = [{
			name: 'self-certification standard json-schema',
			value: {
				schema: schema,
				value: schema
			},
			expected: schema
		}, {
			name: 'self-certification extended json-schema: normalizable',
			value: {
				schema: normalizable,
				value: normalizable
			},
			expected: normalizable,
			options: {
				loader: require('../../src/loader/mapper')({
					'http://json-schema.org/draft-04/schema#': schema
				})
			}
		}];

		test(null, cases);
	});

	describe('process only object type at top level', function () {
		var cases = [{
			'name': 'not process non-object: array',
			'value': {
				'schema': {
					'type': 'array'
				},
				'value': [1, 3, 4, 5]
			},
			'expected': [1, 3, 4, 5]
		}, {
			'name': 'not process non-object: enum',
			'value': {
				'schema': {
					'enum': ['a', 'b', 'c']
				},
				'value': 'a'
			},
			'expected': 'a'
		}, {
			'name': 'not process non-object: string',
			'value': {
				'schema': {
					'type': 'string'
				},
				'value': 'abc'
			},
			'expected': 'abc'
		}, {
			'name': 'not process non-object: integer',
			'value': {
				'schema': {
					'type': 'integer'
				},
				'value': 999
			},
			'expected': 999
		}, {
			'name': 'not process non-object: number',
			'value': {
				'schema': {
					'type': 'integer'
				},
				'value': 99.99
			},
			'expected': 99.99
		}, {
			'name': 'not process non-object: boolean',
			'value': {
				'schema': {
					'type': 'integer'
				},
				'value': true
			},
			'expected': true
		}, {
			'name': 'not process non-object: multiple types',
			'value': {
				'schema': {
					'type': ['string', 'array', 'number', 'integer', 'boolean', 'null']
				},
				'value': [1, 3, 4, 5]
			},
			'expected': [1, 3, 4, 5]
		}, {
			'name': 'process object if defined in multiple types',
			'value': {
				'schema': {
					'type': ['string', 'array', 'number', 'integer', 'boolean', 'null', 'object']
				},
				'value': {
					'name': 'object'
				}
			},
			'expected': {
				'name': 'object'
			}
		}];

		test(null, cases);
	});

	describe('features - options', function () {
		var properties = {
			'known': {
				'type': 'string'
			}
		};
		var value = {
			'known': 'known',
			'unknown': 'unknown'
		};
		var cases = [{
			'name': 'additionalProperties takes priority than gathering',
			'value': {
				'schema': {
					'properties': properties,
					'additionalProperties': true,
					'gathering': 'rest'
				},
				'value': value
			},
			'expected': {
				'known': 'known',
				'unknown': 'unknown'
			}
		}, {
			'name': 'gathering takes priority than options.ignoreUnknownProperties',
			'value': {
				'schema': {
					'properties': properties,
					'gathering': 'rest'
				},
				'value': value
			},
			'expected': {
				'known': 'known',
				'rest': {
					'unknown': 'unknown'
				}
			},
			'options': {
				'ignoreUnknownProperties': true
			}
		}, {
			'name': 'options.ignoreUnknownProperties can ignore unknown properties',
			'value': {
				'schema': {
					'properties': properties
				},
				'value': value
			},
			'expected': {
				'known': 'known'
			},
			'options': {
				'ignoreUnknownProperties': true
			}
		}, {
			'name': 'no additionalProperties, no gathering, no options.ignoreUnknownProperties, then others',
			'value': {
				'schema': {
					'properties': properties
				},
				'value': value
			},
			'expected': {
				'known': 'known',
				'others': {
					'unknown': 'unknown'
				}
			}
		}, {
			'name': 'others can be renamed by options.gatheringProperties',
			'value': {
				'schema': {
					'properties': properties
				},
				'value': value
			},
			'expected': {
				'known': 'known',
				'something else': {
					'unknown': 'unknown'
				}
			},
			'options': {
				'gatheringProperties': 'something else'
			}
		}];

		test(null, cases);
	});

	describe('features - defaults', function () {
		var cases = [{
			'name': 'add default if required',
			'value': {
				'schema': {
					'properties': {
						'known': {
							'type': 'string',
							'default': 'known'
						}
					},
					'required': ['known']
				},
				'value': {}
			},
			'expected': {
				'known': 'known'
			}
		}, {
			'name': "not add default if default not defined (and hence invalid, but we don't validate that.)",
			'value': {
				'schema': {
					'properties': {
						'known': {
							'type': 'string'
						}
					},
					'required': ['known']
				},
				'value': {}
			},
			'expected': {}
		}, {
			'name': 'not add default if not required',
			'value': {
				'schema': {
					'properties': {
						'known': {
							'type': 'string',
							'default': 'known'
						}
					}
				},
				'value': {}
			},
			'expected': {}
		}];

		test(null, cases);
	});

	describe('samples', function () {
		describe('src()', function () {
			var schema = {
				'properties': {
					'globs': {
						'description': '',
						'type': 'array',
						'items': {
							'type': 'string'
						},
						'alias': ['glob'],
						'samples': ['src', 'src/**/*.{png|jpg}']
					},
					'options': {
						'description': '',
						'type': 'object',
						'properties': {
							'base': {
								'description': '',
								'type': 'string'
							},
							'buffer': {
								'description': '',
								'type': 'boolean',
								'default': true
							},
							'read': {
								'description': '',
								'type': 'boolean',
								'default': true
							}
						}
					}
				},
				'required': ['globs'],
				'primary': 'globs',
				'gathering': 'options'
			};

			var cases = [{
				'name': 'accepts a simple string and converts to globs array',
				'value': {
					'value': 'src'
				},
				'expected': {
					'globs': ['src']
				}
			}, {
				'name': 'accepts a single glob string and converts to globs array',
				'value': {
					'value': '**/*.css'
				},
				'expected': {
					'globs': ['**/*.css']
				}
			}, {
				'name': 'accepts an array as globs',
				'value': {
					'value': ['bootstrap/css/**/*.{css,less}', 'views/**/*.{css,stylus}']
				},
				'expected': {
					'globs': ['bootstrap/css/**/*.{css,less}', 'views/**/*.{css,stylus}']
				}
			}, {
				'name': 'accepts mixed options and normalizes them as ""options"',
				'value': {
					'value': {
						'globs': ['app/*.css', 'views/**/*.stylus'],
						'base': '.',
						'read': false
					}
				},
				'expected': {
					'globs': ['app/*.css', 'views/**/*.stylus'],
					'options': {
						'base': '.',
						'read': false
					}
				}
			}, {
				'name': 'accepts alternative property name "glob" and normalizes it as "globs"',
				'value': {
					'value': {
						'glob': ['app/*.css', 'views/**/*.stylus'],
						'base': '.',
						'read': false
					}
				},
				'expected': {
					'globs': ['app/*.css', 'views/**/*.stylus'],
					'options': {
						'base': '.',
						'read': false
					}
				}
			}, {
				'name': 'accepts unrecognized properties and put them to "options" or "others"',
				'value': {
					'value': {
						'glob': ['app/*.css', 'views/**/*.stylus'],
						'base': '.',
						'cwd': '.',
						'options': {
							'mode': '0777',
							'buffer': false,
							'read': false
						}
					}
				},
				'expected': {
					'globs': ['app/*.css', 'views/**/*.stylus'],
					'options': {
						'base': '.',
						'buffer': false,
						'read': false,
						'cwd': '.',
						'others': {
							'mode': '0777'
						}
					}
				}
			}, {
				'name': 'accepts normalized form',
				'value': {
					'value': {
						'glob': ['app/*.css', 'views/**/*.stylus'],
						'options': {
							'base': '.',
							'read': false
						}
					}
				},
				'expected': {
					'globs': ['app/*.css', 'views/**/*.stylus'],
					'options': {
						'base': '.',
						'read': false
					}
				}
			}];

			test(schema, cases);
		});

		describe('dest()', function () {
			var schema = {
				'properties': {
					'path': {
						'description': '',
						'type': 'string'
					},
					'options': {
						'description': '',
						'type': 'object',
						'properties': {
							'cwd': {
								'description': '',
								'type': 'string'
							},
							'mode': {
								'description': '',
								'type': 'string'
							}
						}
					}
				},
				'required': ['path'],
				'primary': 'path',
				'gathering': 'options'
			};

			var cases = [{
				'name': 'accepts a simple string and converts to the primary property "path"',
				'value': {
					'value': 'dist'
				},
				'expected': {
					'path': 'dist'
				}
			}, {
				'name': 'accepts a mixed options and normalizes them as "options"',
				'value': {
					'value': {
						'path': 'dist/css',
						'cwd': '.',
						'mode': '0777'
					}
				},
				'expected': {
					'path': 'dist/css',
					'options': {
						'cwd': '.',
						'mode': '0777'
					}
				}
			}, {
				'name': 'accepts unrecognized properties and put them to "options" or "others"',
				'value': {
					'value': {
						'path': 'dist',
						'read': false,
						'options': {
							'cwd': '.',
							'mode': '0777',
							'buffer': false
						}
					}
				},
				'expected': {
					'path': 'dist',
					'options': {
						'cwd': '.',
						'mode': '0777',
						'read': false,
						'others': {
							'buffer': false
						}
					}
				}
			}, {
				'name': 'accepts normalized form',
				'value': {
					'value': {
						'path': 'dist',
						'options': {
							'cwd': '.',
							'mode': '0777'
						}
					}
				},
				'expected': {
					'path': 'dist',
					'options': {
						'cwd': '.',
						'mode': '0777'
					}
				}
			}];

			test(schema, cases);
		});

		describe('browserify', function () {
			var schema = {
				'definitions': {
					'io': {
						'properties': {
							'src': {
								'description': '',
								'type': 'array'
							},
							'dest': {
								'description': '',
								'type': 'string'
							}
						}
					},
					'options': {
						'properties': {
							'extensions': {
								'description': '',
								'type': 'array',
								'alias': ['extension']
							},
							'require': {
								'description': '',
								'type': 'array',
								'alias': ['requires']
							},
							'external': {
								'description': '',
								'type': 'array',
								'alias': ['externals']
							},
							'plugin': {
								'description': '',
								'type': 'array',
								'alias': ['plugins']
							},
							'transform': {
								'description': '',
								'type': 'array',
								'alias': ['transforms']
							},
							'exclude': {
								'description': '',
								'type': 'array',
								'alias': ['excludes']
							},
							'ignore': {
								'description': '',
								'type': 'array',
								'alias': ['ignores']
							},
							'shim': {
								'description': '',
								'type': 'array',
								'alias': ['shims', 'browserify-shim', 'browserify-shims']
							}
						}
					}
				},
				'extends': {
					'$ref': '#/definitions/io'
				},
				'properties': {
					'options': {
						'description': 'common options for all bundles',
						'extends': {
							'$ref': '#/definitions/options'
						},
						'type': 'object'
					},
					'bundles': {
						'description': '',
						'alias': ['bundle'],
						'type': 'array',
						'extends': [{
							'$ref': '#/definitions/io'
						}, {
							'$ref': '#/definitions/options'
						}],
						'properties': {
							'file': {
								'description': '',
								'type': 'string'
							},
							'entries': {
								'description': '',
								'alias': ['entry'],
								'type': 'array'
							},
							'options': {
								'extends': {
									'$ref': '#/definitions/options'
								}
							}
						},
						'required': ['file', 'entries']
					}
				},
				'required': ['bundles'],
				'default': {
					'options': {}
				}
			};

			var options = {
				'extensions': ['.js', '.json', '.jsx', '.es6', '.ts'],
				'plugin': ['tsify'],
				'transform': ['brfs']
			};

			var cases = [{
				'name': 'accepts single bundle',
				'value': {
					'value': {
						'bundle': {
							'file': 'index.js',
							'entry': 'index.js'
						}
					}
				},
				'expected': {
					'bundles': [{
						'file': 'index.js',
						'entries': ['index.js']
					}]
				}
			}, {
				'name': 'accepts single bundle in bundles array',
				'value': {
					'value': {
						'bundles': [{
							'file': 'index.js',
							'entry': 'index.js'
						}]
					}
				},
				'expected': {
					'bundles': [{
						'file': 'index.js',
						'entries': ['index.js']
					}]
				}
			}, {
				'name': 'accepts bundles with common options',
				'value': {
					'value': {
						'options': {
							'require': 'angular2/angular2'
						},
						'bundles': [{
							'file': 'index.js',
							'entry': 'index.js'
						}]
					}
				},
				'expected': {
					'options': {
						'require': ['angular2/angular2']
					},
					'bundles': [{
						'file': 'index.js',
						'entries': ['index.js']
					}]
				}
			}, {
				'name': 'accepts real life angular2 example',
				'value': {
					'value': {
						'bundles': [{
							'file': 'deps.js',
							'entries': [{
								'file': 'traceur/bin/traceur-runtime'
							}, {
								'file': 'rtts_assert/rtts_assert'
							}, {
								'file': 'reflect-propertydata'
							}, {
								'file': 'zone.js'
							}],
							'require': ['angular2/angular2', 'angular2/router']
						}, {
							'file': 'services.js',
							'entry': 'services/*/index.js',
							'external': ['angular2/angular2', 'angular2/router'],
							'options': options
						}, {
							'file': 'index.js',
							'entry': 'index.js',
							'external': './services',
							'options': options
						}, {
							'file': 'auth.js',
							'entry': 'auth/index.js',
							'external': './services',
							'options': options
						}, {
							'file': 'dashboard.js',
							'entry': 'dashboard/index.js',
							'external': './services',
							'options': options
						}]
					}
				},
				'expected': {
					'bundles': [{
						'file': 'deps.js',
						'entries': [{
							'file': 'traceur/bin/traceur-runtime'
						}, {
							'file': 'rtts_assert/rtts_assert'
						}, {
							'file': 'reflect-propertydata'
						}, {
							'file': 'zone.js'
						}],
						'require': ['angular2/angular2', 'angular2/router']
					}, {
						'file': 'services.js',
						'entries': ['services/*/index.js'],
						'external': ['angular2/angular2', 'angular2/router'],
						'options': options
					}, {
						'file': 'index.js',
						'entries': ['index.js'],
						'external': ['./services'],
						'options': options
					}, {
						'file': 'auth.js',
						'entries': ['auth/index.js'],
						'external': ['./services'],
						'options': options
					}, {
						'file': 'dashboard.js',
						'entries': ['dashboard/index.js'],
						'external': ['./services'],
						'options': options
					}]
				}
			}];

			test(schema, cases);
		});
	});
});

function json(file) {
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function test(schema, cases) {
	mochaCases(cases, async, {
		prefix: 'async: ',
		async: true
	});
	mochaCases(cases, sync, {
		prefix: 'sync: '
	});

	function async(values, optionalOptions) {
		return new Promise(function (resolve, reject) {
			normalize(values.schema || schema, values.value, optionalOptions || {}, function (err, actual) {
				if (err) {
					reject(err);
				} else {
					resolve(actual);
				}
			});
		});
	}

	function sync(values, optionalOptions) {
		var options, result;

		options = Object.assign({}, optionalOptions || {});
		if (options.loader && options.loader.sync) {
			options.loader = options.loader.sync;
		}
		result = normalize.sync(values.schema || schema, values.value, options);
		if (result.errors) {
			throw result.errors;
		} else {
			return result.values;
		}
	}
}
