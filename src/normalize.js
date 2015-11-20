/*global process*/
/**
 * Normalizes a loose json data object to a strict json-schema data object.
 *
 * @context Don't care.
 * @param schema The schema used to normalize the given JSON data object.
 * @param data The JSON data object.
 * @param options Optional. Currently only accepts loader or array of loaders.
 * @param options.loader | options.loaders A loader or an array of loaders
 *      that help loading remote schemas. Loaders are tested in the order listed.
 * @param callback The callback function with `function(err, detail)` signature
 *      that the normalizer delivers the normalized JSON object to. Called with null context.
 * @return No return value.
 */
'use strict';

var _ = require('lodash');
var reduce = require('./lib/util').reduce;
var deref = require('./deref');

// TODO: add default values if absent. options: only when required.
function normalize(schema, values, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = null;
    }
	options = options || {};
    process.nextTick(_async);

    function _async() {
        deref(schema, options || {}, function (err, schema) {
            var errors;

            if (err) {
                callback(err);
            }
            else {
                errors = [];
                schema = _process(schema, values, errors, options);
                if (errors.length > 0) {
                    callback(errors);
                }
                else {
                    callback(null, schema);
                }
            }
        });
    }
}

function sync(schema, values, options) {
    var errors, result;

	options = options || {};
	errors = []
    schema = deref.sync(schema, options);
    values = _process(schema, values, errors, options);
	result = {
		values: values
	};
	if (errors.length) {
		result.errors = errors;
	}
	return result;
}

function _process(schema, values, errors, options) {
    var resolved = _non_object(schema, values) || _instance(schema, values);
    if (resolved) {
        return resolved();
    }

    function _instance(schema, values) {
        schema = _extends(schema);
        return _object(schema, values) || _primary(schema, values) || _primitive(schema, values);
    }

    function _extends(schema) {
        var schemas;
        if (schema.extends) {
            schemas = [{}, schema].concat(schema.extends);
            schema = _.defaultsDeep.apply(null, schemas);
            schema = _.omit(schema, ['extends']);
        }
        return schema;
    }

	function _non_object(schema, values) {
		if (schema.type && (schema.type !== 'object' || !_.contains(schema.type, 'object'))) {
			return resolve(values);
		}
	}

    function _object(schema, values) {
        var omits, ret;

        if ((schema.type === 'object' || schema.properties || schema.patternProperties) && _.isPlainObject(values)) {
            omits = [];
            ret = {}
            _properties();
            _gathering();
            return _filter(resolve(ret));
        }

        function _properties() {
            _.forOwn(schema.properties, _property);

            function _property(schema, property) {
                schema = _extends(schema)
                _exact(_resolve) || _alias(_resolve);

                function _resolve(value) {
                    _final(property, _array(schema, value) || _instance(schema, value));
                }

                function _final(property, resolved) {
                    if (resolved) {
                        set(ret, property, resolved());
                    }
                }

                function _exact(resolve) {
                    return _exists(property, resolve);
                }

                function _alias(resolve) {
                    var alias, i, n;

                    if (schema.alias) {
                        for (i = 0, n = schema.alias.length; i < n; ++i) {
                            alias = schema.alias[i];
                            if (_exists(alias, resolve)) {
                                return true;
                            }
                        }
                    }
                }

                function _exists(property, resolve) {
                    if (property in values) {
                        omits.push(property);
                        resolve(values[property]);
                        return true;
                    }
                }
            }
        }

        function _gathering() {
            var gathering;

            gathering = _.omit(values, omits)

            if (_.size(gathering)) {
				_additional() || _strict() || _default();
            }

			function _additional() {
                if (schema.additionalProperties) {
                    _.defaults(ret, gathering);
					return true;
                }
			}

			function _strict() {
				if (typeof schema.gathering === 'string') {
					__gathering(schema.gathering);
					return true;
				}
			}

			function _default() {
				if (!options.ignoreUnknownProperties) {
					__gathering(options.gatheringProperties || 'others');
					return true;
				}
			}

			function __gathering(name) {
				if (ret[name]) {
					_.defaults(ret[name], gathering);
				}
				else {
					ret[name] = gathering;
				}
			}
        }
    }

    function _primary(schema, values) {
        if (schema.primary && typeof values !== 'undefined') {
			var primarySchema = schema.properties && schema.properties[schema.primary];
			var value = (primarySchema && _array(primarySchema, values) || resolve(values))();
            return resolve(set({}, schema.primary, value));
        }
    }

    function _primitive(schema, values) {
        if (!schema.properties && !schema.primary) {
            return resolve(values);
        }
    }

    function _array(schema, values) {
        // note: if schema.type is 'array, we force value to be an array.
        if (schema.type === 'array' || (Array.isArray(values) && (!schema.type || _.contains(schema.type, 'array')))) {
            return _filter(resolve(reduce(values, _item, [])));
        }

        function _item(ret, values) {
            return _accumulate(_filter(_instance(schema, values)));

            function _accumulate(resolved) {
                if (resolved) {
                    ret.push(resolved());
                }
                return ret;
            }
        }
    }

    function _filter(resolved) {
        if (resolved && _.size(resolved()) > 0) {
            return resolved;
        }
    }
}

function resolve(value) {
    return function () {
        return value;
    };
}

function set(target, property, value) {
    target[property] = value;
    return target;
}

module.exports = normalize;
module.exports.sync = sync;
