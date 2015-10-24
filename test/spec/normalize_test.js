/*global describe, it, Promise, __dirname */
'use strict';

var fs = require('fs');
var assert = require('assert');
var normalize = require('../../src/normalize');

describe('normalize()', function() {
    
    describe('required', function() {
        var schema = {
            "properties": {
                "path": {
                    "type": "string"
                }
            },
            "required": ["path"]
        };
        var cases = [{
            "name": "detect missing required property",
            "schema": schema,
            value: {
            },
            error: [{
                error: "required property missing",
                message: "property \"path\" is required but missing",
                schema: schema
            }]
        }];
        
        test(null, cases);
    });
    
    describe('self-certification', function() {
       
        var schema = json(__dirname + '/schema/schema');
        var normalizable = json(__dirname + '/schema/normalizable');
        
        var cases = [{
            name: 'self-certification standard json-schema',
            schema: schema,
            value: schema,
            expected: schema
        }, {
            name: 'self-certification extended json-schema: normalizable',
            schema: normalizable,
            value: normalizable,
            expected: normalizable,
            options: {
                loader: require('../../src/loader/mapper')({
                    'http://json-schema.org/draft-04/schema#': schema
                })
            }
        }];
        
        test(null, cases);
    });
    
    describe('samples', function() {
                
        describe('src()', function() {
            
            var schema = {
                "properties": {
                    "globs": {
                        "description": "",
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "alias": ["glob"],
                        "samples": ["src", "src/**/*.{png|jpg}"]
                    },
                    "options": {
                        "description": "",
                        "type": "object",
                        "properties": {
                            "base": {
                                "description": "",
                                "type": "string"
                            },
                            "buffer": {
                                "description": "",
                                "type": "boolean",
                                "default": true
                            },
                            "read": {
                                "description": "",
                                "type": "boolean",
                                "default": true
                            }
                        }
                    }
                },
                "required": ["globs"],
                "primary": "globs",
                "gathering": "options"
            };
            
            var cases = [{
                "name": "accepts a simple string and converts to globs array",
                "value": "src",
                "expected": {
                    "globs": ["src"]
                }
            }, {
                "name": "accepts a single glob string and converts to globs array",
                "value": "**/*.css",
                "expected": {
                    "globs": ["**/*.css"]
                }
            }, {
                "name": "accepts an array as globs",
                "value": ["bootstrap/css/**/*.{css,less}", "views/**/*.{css,stylus}"],
                "expected": {
                    "globs": ["bootstrap/css/**/*.{css,less}", "views/**/*.{css,stylus}"]
                }
            }, {
                "name": "accepts mixed options and normalizes them as \"\"options\"",
                "value": {
                    "globs": ["app/*.css", "views/**/*.stylus"],
                    "base": ".",
                    "read": false
                },
                "expected": {
                    "globs": ["app/*.css", "views/**/*.stylus"],
                    "options": {
                        "base": ".",
                        "read": false
                    }
                }
            }, {
                "name": "accepts alternative property name \"glob\" and normalizes it as \"globs\"",
                "value": {
                    "glob": ["app/*.css", "views/**/*.stylus"],
                    "base": ".",
                    "read": false
                },
                "expected": {
                    "globs": ["app/*.css", "views/**/*.stylus"],
                    "options": {
                        "base": ".",
                        "read": false
                    }
                }
            }, {
                "name": "accepts unrecognized properties and put them to \"options\" or \"others\"",
                "value": {
                    "glob": ["app/*.css", "views/**/*.stylus"],
                    "base": ".",
                    "cwd": ".",
                    "options": {
                        "mode": "0777",
                        "buffer": false,
                        "read": false
                    }
                },
                "expected": {
                    "globs": ["app/*.css", "views/**/*.stylus"],
                    "options": {
                        "base": ".",
                        "buffer": false,
                        "read": false,
                        "cwd": ".",
                        "others": {
                            "mode": "0777"
                        }
                    }
                }
            }, {
                "name": "accepts normalized form",
                "value": {
                    "glob": ["app/*.css", "views/**/*.stylus"],
                    "options": {
                        "base": ".",
                        "read": false
                    }
                },
                "expected": {
                    "globs": ["app/*.css", "views/**/*.stylus"],
                    "options": {
                        "base": ".",
                        "read": false
                    }
                }
            }];
    
            test(schema, cases);
        });
        
        describe('dest()', function() {
            
            var schema = {
                "properties": {
                    "path": {
                        "description": "",
                        "type": "string"
                    },
                    "options": {
                        "description": "",
                        "type": "object",
                        "properties": {
                            "cwd": {
                                "description": "",
                                "type": "string"
                            },
                            "mode": {
                                "description": "",
                                "type": "string"
                            }
                        }
                    }
                },
                "required": ["path"],
                "primary": "path",
                "gathering": "options"
            };
            
            var cases = [{
                "name": "accepts a simple string and converts to the primary property \"path\"",
                "value": "dist",
                "expected": {
                    "path": "dist"
                }
            }, {
                "name": "accepts a mixed options and normalizes them as \"options\"",
                "value": {
                    "path": "dist/css",
                    "cwd": ".",
                    "mode": "0777"
                },
                "expected": {
                    "path": "dist/css",
                    "options": {
                        "cwd": ".",
                        "mode": "0777"
                    }
                }
            }, {
                "name": "accepts unrecognized properties and put them to \"options\" or \"others\"",
                "value": {
                    "path": "dist",
                    "read": false,
                    "options": {
                        "cwd": ".",
                        "mode": "0777",
                        "buffer": false
                    }
                },
                "expected": {
                    "path": "dist",
                    "options": {
                        "cwd": ".",
                        "mode": "0777",
                        "read": false,
                        "others": {
                            "buffer": false
                        }
                    }
                }
            }, {
                "name": "accepts normalized form",
                "value": {
                    "path": "dist",
                    "options": {
                        "cwd": ".",
                        "mode": "0777"
                    }
                },
                "expected": {
                    "path": "dist",
                    "options": {
                        "cwd": ".",
                        "mode": "0777"
                    }
                }
            }];
    
            test(schema, cases);
        });
        
        describe('browserify', function() {
            var schema = {
                "definitions": {
                    "io": {
                        "properties": {
                            "src": {
                                "description": "",
                                "type": "array"
                            },
                            "dest": {
                                "description": "",
                                "type": "string"
                            }
                        }
                    },
                    "options": {
                        "properties": {
                            "extensions": {
                                "description": "",
                                "type": "array",
                                "alias": ["extension"]
                            },
                            "require": {
                                "description": "",
                                "type": "array",
                                "alias": ["requires"]
                            },
                            "external": {
                                "description": "",
                                "type": "array",
                                "alias": ["externals"]
                            },
                            "plugin": {
                                "description": "",
                                "type": "array",
                                "alias": ["plugins"]
                            },
                            "transform": {
                                "description": "",
                                "type": "array",
                                "alias": ["transforms"]
                            },
                            "exclude": {
                                "description": "",
                                "type": "array",
                                "alias": ["excludes"]
                            },
                            "ignore": {
                                "description": "",
                                "type": "array",
                                "alias": ["ignores"]
                            },
                            "shim": {
                                "description": "",
                                "type": "array",
                                "alias": ["shims", "browserify-shim", "browserify-shims"]
                            }
                        }
                    }
                },
                "extends": { "$ref": "#/definitions/io" },
                "properties": {
                    "options": {
                        "description": "common options for all bundles",
                        "extends": { "$ref": "#/definitions/options" },
                        "type": "object"
                    },
                    "bundles": {
                        "description": "",
                        "alias": ["bundle"],
                        "type": "array",
                        "extends": [
                            { "$ref": "#/definitions/io" },
                            { "$ref": "#/definitions/options" }
                        ],
                        "properties": {
                            "file": {
                                "description": "",
                                "type": "string"
                            },
                            "entries": {
                                "description": "",
                                "alias": ["entry"],
                                "type": "array"
                            },
                            "options": {
                                "extends": { "$ref": "#/definitions/options" }
                            }
                        },
                        "required": ["file", "entries"]
                    }
                },
                "required": ["bundles"],
                "default": {
                    "options": {}
                }
            };
            
            var options = {
                "extensions": [".js", ".json", ".jsx", ".es6", ".ts"],
                "plugin": ["tsify"],
                "transform": ["brfs"]
            };
            
            var cases = [{
                "name": "accepts single bundle",
                "value": {
                    "bundle": {
                        "file": "index.js",
                        "entry": "index.js"
                    }
                },
                "expected": {
                    "bundles": [{
                        "file": "index.js",
                        "entries": ["index.js"]
                    }]
                }
            }, {
                "name": "accepts single bundle in bundles array",
                "value": {
                    "bundles": [{
                        "file": "index.js",
                        "entry": "index.js"
                    }]
                },
                "expected": {
                    "bundles": [{
                        "file": "index.js",
                        "entries": ["index.js"]
                    }]
                }
            }, {
                "name": "accepts bundles with common options",
                "value": {
                    "options": {
                        "require": "angular2/angular2"
                    },
                    "bundles": [{
                        "file": "index.js",
                        "entry": "index.js"
                    }]
                },
                "expected": {
                    "options": {
                        "require": ["angular2/angular2"]
                    },
                    "bundles": [{
                        "file": "index.js",
                        "entries": ["index.js"]
                    }]
                }
            }, {
                "name": "accepts real life angular2 example",
                "value": {
                    "bundles": [{
                        "file": "deps.js",
                        "entries": [{
                            "file": "traceur/bin/traceur-runtime"
                        }, {
                            "file": "rtts_assert/rtts_assert"
                        }, {
                            "file": "reflect-propertydata"
                        }, {
                            "file": "zone.js"
                        }],
                        "require": ["angular2/angular2", "angular2/router"]
                    }, {
                        "file": "services.js",
                        "entry": "services/*/index.js",
                        "external": ["angular2/angular2", "angular2/router"],
                        "options": options
                    }, {
                        "file": "index.js",
                        "entry": "index.js",
                        "external": "./services",
                        "options": options
                    }, {
                        "file": "auth.js",
                        "entry": "auth/index.js",
                        "external": "./services",
                        "options": options
                    }, {
                        "file": "dashboard.js",
                        "entry": "dashboard/index.js",
                        "external": "./services",
                        "options": options
                    }]
                },
                "expected": {
                    "bundles": [{
                        "file": "deps.js",
                        "entries": [{
                            "file": "traceur/bin/traceur-runtime"
                        }, {
                            "file": "rtts_assert/rtts_assert"
                        }, {
                            "file": "reflect-propertydata"
                        }, {
                            "file": "zone.js"
                        }],
                        "require": ["angular2/angular2", "angular2/router"]
                    }, {
                        "file": "services.js",
                        "entries": ["services/*/index.js"],
                        "external": ["angular2/angular2", "angular2/router"],
                        "options": options
                    }, {
                        "file": "index.js",
                        "entries": ["index.js"],
                        "external": ["./services"],
                        "options": options
                    }, {
                        "file": "auth.js",
                        "entries": ["auth/index.js"],
                        "external": ["./services"],
                        "options": options
                    }, {
                        "file": "dashboard.js",
                        "entries": ["dashboard/index.js"],
                        "external": ["./services"],
                        "options": options
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
    var tests = cases.filter(only); 
    if (tests.length === 0) {
        tests = cases.filter(skip);
    }
    
    tests.forEach(function(test, index) {
        it('async: should ' + (test.name || 'pass test case ' + index), function() {
            return new Promise(function(resolve, reject) {
                if (test.debug) {
                    debugger;
                }
                normalize(schema || test.schema, test.value, test.options || {}, function(err, actual) {
                    if (test.expected) {
                        assert.deepEqual(actual, test.expected);
                    }
                    else if (test.error) {
                        assert(err);
                        assert.deepEqual(err, test.error);
                    }
                    resolve();
                });
            });
        });

        it('sync: should ' + (test.name || 'pass test case ' + index), function() {
            var options;
            
            if (test.debug) {
                debugger;
            }
            if (test.options) {
                options = {
                    loader: test.options.loader.sync
                };
            }
            try {
                var actual = normalize.sync(schema || test.schema, test.value, options || {});
                if (test.expected) {
                    assert.deepEqual(actual, test.expected);
                }
            }
            catch (ex) {
                assert.deepEqual(ex, test.error);
            }
        });
    });
    
    function only(test) {
        return test.only;
    }        
    
    function skip(test) {
        return !test.skip;
    }
}

