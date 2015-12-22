'use strict';

var _ = require('lodash');
var reduce = require('./util').reduce;
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
		deref(schema, options || {}, function (err, derefSchema) {
			var errors, result;

			if (err) {
				callback(err);
			} else {
				errors = [];
				result = _process(derefSchema, values, errors, options);
				if (errors.length > 0) {
					callback(errors);
				} else {
					callback(null, result);
				}
			}
		});
	}
}

function sync(schema, values, optionalOptions) {
	var options, errors, result, derefSchema;

	options = optionalOptions || {};

	errors = [];
	derefSchema = deref.sync(schema, options);
	result = {
		values: _process(derefSchema, values, errors, options)
	};
	if (errors.length) {
		result.errors = errors;
	}
	return result;
}

function _process(rootSchema, rootValues, errors, options) {
	return (_nonObject(rootSchema, rootValues) || _instance(rootSchema, rootValues) || resolve({}))();

	function _instance(schema, values) {
		var extendedSchema;

		extendedSchema = extend(schema);
		return _object(extendedSchema, values) || _primary(extendedSchema, values) || _primitive(extendedSchema, values);
	}

	function _nonObject(schema, values) {
		if (schema.type && (schema.type !== 'object' || !_.contains(schema.type, 'object'))) {
			return resolve(values);
		}
	}

	function _object(schema, values) {
		var omits, ret;

		if ((schema.type === 'object' || schema.properties || schema.patternProperties) && _.isPlainObject(values)) {
			omits = [];
			ret = {};
			_properties();
			_gathering();
			return nonEmpty(resolve(ret));
		}

		function _properties() {
			_.forOwn(schema.properties, _property);

			function _property(propertySchema, property) {
				var extendedPropertySchema;

				extendedPropertySchema = extend(propertySchema);
				_exact(_resolve) || _alias(_resolve) || _required(_resolve);

				function _resolve(value) {
					_final(property, _array(extendedPropertySchema, value) || _instance(extendedPropertySchema, value));
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

					if (extendedPropertySchema.alias) {
						for (i = 0, n = extendedPropertySchema.alias.length; i < n; ++i) {
							alias = extendedPropertySchema.alias[i];
							if (_exists(alias, resolve)) {
								return true;
							}
						}
					}
				}

				function _required(resolve) {
					if (__required() && __absent() && __default()) {
						resolve(__default());
						return true;
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

			gathering = _.omit(values, omits);

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
				} else {
					ret[name] = gathering;
				}
			}
		}
	}

	function _primary(schema, values) {
		var primarySchema, value;

		if (schema.primary && typeof values !== 'undefined') {
			primarySchema = schema.properties && schema.properties[schema.primary];
			value = (primarySchema && _array(primarySchema, values) || resolve(values))();
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
			return nonEmpty(resolve(reduce(values, _item, [])));
		}

		function _item(ret, values) {
			return _accumulate(nonEmpty(_instance(schema, values)));

			function _accumulate(resolved) {
				if (resolved) {
					ret.push(resolved());
				}
				return ret;
			}
		}
	}
}

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

function nonEmpty(resolved) {
	if (resolved && _.size(resolved()) > 0) {
		return resolved;
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

module.exports = async;
module.exports.sync = sync;
