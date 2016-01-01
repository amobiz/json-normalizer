'use strict';

var _ = require('lodash');
var deref = require('./deref');

/**
 * Normalizes a loose json data object to a strict json-schema data object.
 *
 * @context Don't care.
 * @param schema The schema used to normalize the given JSON data object.
 * @param data The JSON data object.
 * @param options Optional. Currently only accepts loader or array of loaders.
 * @param options.loader | options.loaders A loader or an array of loaders
 *	  that help loading remote schemas. Loaders are tested in the order listed.
 * @param callback The callback function with `function(err, detail)` signature
 *	  that the normalizer delivers the normalized JSON object to. Called with null context.
 * @return No return value.
 */
function async(schema, values, optionalOptions, callbackFn) {
	var options, callback;

	options = optionalOptions || {};
	callback = callbackFn || optionalOptions;
	process.nextTick(_async);

	function _async() {
		deref(schema, options, function (err, derefSchema) {
			var result;

			if (err) {
				callback(err);
			} else {
				result = normalize(derefSchema, values, options);
				callback(null, result);
			}
		});
	}
}

function sync(schema, values, optionalOptions) {
	var options, derefSchema;

	options = optionalOptions || {};
	derefSchema = deref.sync(schema, options);
	return normalize(derefSchema, values, options);
}

function normalize(rootSchema, rootValues, options) {
	return (_instance(extend(rootSchema), rootValues) || resolve({}))();

	function _instance(schema, values) {
		return _array(schema, values) || _object(schema, values) || _primary(schema, values) || _primitive(schema, values);
	}

	function _array(schema, values) {
		var arrayValues;

		arrayValues = _strict() || _loose();
		if (arrayValues) {
			return resolve(arrayValues.reduce(_item, []));
		}

		function _strict() {
			if (schema.type === 'array') {
				// note: if schema.type is 'array', we force value to be an array.
				if (!Array.isArray(values)) {
					return [values];
				}
				return values;
			}
		}

		function _loose() {
			if (Array.isArray(values) && (!schema.type || _.contains(schema.type, 'array'))) {
				return values;
			}
		}

		function _item(ret, value) {
			var itemSchema;

			itemSchema = schema.items && extend(schema.items) || {};
			return _accumulate(_instance(itemSchema, value));

			function _accumulate(resolved) {
				if (resolved) {
					ret.push(resolved());
				}
				return ret;
			}
		}
	}

	function _object(schema, values) {
		var omits, ret;

		if ((_strict() || _loose()) && _.isPlainObject(values)) {
			omits = [];
			ret = {};
			_properties();
			_patternProperties();
			_gathering();
			return suffice(resolve(ret));
		}

		function _strict() {
			return schema.type === 'object';
		}

		function _loose() {
			return schema.properties || schema.patternProperties;
		}

		function _properties() {
			_.forOwn(schema.properties, _property);

			function _property(propertySchema, property) {
				var extendedPropertySchema;

				extendedPropertySchema = extend(propertySchema);
				_exact() || _alias() || _default();

				function _exact() {
					return _exists(property);
				}

				function _alias() {
					var alias, i, n;

					if (extendedPropertySchema.alias) {
						for (i = 0, n = extendedPropertySchema.alias.length; i < n; ++i) {
							alias = extendedPropertySchema.alias[i];
							if (_exists(alias)) {
								return true;
							}
						}
					}
				}

				function _default() {
					if (__required() && __absent() && __default()) {
						return _resolve(__default());
					}

					function __required() {
						return schema.required && _.contains(schema.required, property);
					}

					function __absent() {
						return !(property in ret);
					}

					function __default() {
						return extendedPropertySchema.default;
					}
				}

				function _exists(key) {
					if (key in values) {
						omits.push(key);
						return _resolve(values[key]);
					}
				}

				function _resolve(value) {
					set(ret, property, _instance(extendedPropertySchema, value));
					return true;
				}
			}
		}

		function _patternProperties() {
			_.forOwn(schema.patternProperties, _pattern);

			function _pattern(propertySchema, pattern) {
				var regex, extendedPropertySchema;

				extendedPropertySchema = extend(propertySchema);
				regex = new RegExp(pattern);
				Object.keys(values).forEach(_property);

				function _property(property) {
					if (regex.test(property)) {
						omits.push(property);
						set(ret, property, _instance(extendedPropertySchema, values[property]));
					}
				}
			}
		}

		function _gathering() {
			var remainder;

			remainder = _.omit(values, omits);

			if (_.size(remainder)) {
				__additional() || __strict() || __default();
			}

			function __additional() {
				if ('additionalProperties' in schema) {
					if (schema.additionalProperties) {
						_.defaults(ret, remainder);
					}
					return true;
				}
			}

			function __strict() {
				if (typeof schema.gathering === 'string') {
					return __gathering(schema.gathering);
				}
			}

			function __default() {
				if (!options.ignoreUnknownProperties) {
					return __gathering(options.gatheringProperties || 'others');
				}
			}

			function __gathering(name) {
				if (ret[name]) {
					_.defaults(ret[name], remainder);
				} else {
					ret[name] = remainder;
				}
				return true;
			}
		}
	}

	function _primary(schema, values) {
		var primarySchema;

		if (schema.primary && typeof values !== 'undefined') {
			primarySchema = schema.properties && schema.properties[schema.primary];
			return resolve(set({}, schema.primary, primarySchema && _array(primarySchema, values) || resolve(values)));
		}
	}

	function _primitive(schema, values) {
		if (!schema.properties && !schema.primary) {
			return resolve(values);
		}
	}
}

// NOTE:
// Since there is circular references,
// it is impossible to extend early before normalize().
// i.e. can't use json-regulator to remove "extends".
function extend(schema) {
	var schemas, extendedSchema;

	if (schema.extends) {
		schemas = [{}, schema].concat(schema.extends);
		extendedSchema = _.defaultsDeep.apply(null, schemas);
		extendedSchema = _.omit(extendedSchema, ['extends']);
		return extendedSchema;
	}
	return schema;
}

function suffice(resolved) {
	if (resolved && _.size(resolved()) > 0) {
		return resolved;
	}
}

function resolve(value) {
	return function () {
		return value;
	};
}

function set(target, property, resolved) {
	if (resolved) {
		target[property] = resolved();
	}
	return target;
}

module.exports = async;
module.exports.sync = sync;
