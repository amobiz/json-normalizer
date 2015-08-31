/**
 * The schema is based on json-schema with some teaks and extensions:
 * 
 * Teaks:
 * 1.Required metadata is defined within property not its parent. 
 * 2.Types are ignored.
 * 
 * Extensions:
 * 1.Property alias are allowed and being normalized.
 * 2.Properties can have sample values.
 * 3.A primary property can be specified that provided value can be assigned to when it is not an object.
 * 4.Unrecognized properties can be gathered to a specified property, defaults to 'others'.
 * 5.Converts a single value to an array for property of array type.
 * 6.Allow schema extends other schemas. 
 * 
 * references:
 *   json-schema.org
 *   http://json-schema.org/
 * 
 *   http://jsonschema.net/
 */
'use strict';

var _ = require('lodash');

var deref = require('./deref');

/**
 * Register a json reference loader.
 * 
 * @param loader: function
 *   Loader must be a function that returns true if it can handle the given reference, false otherwise.
 *   Loader takes root schema, $ref and callback(err, schema) as parameters.
 *   Loaders are called by the order they being registered. 
 * 
 */

function normalize(schema, values, callback) {
    var error, details = [];
    
    deref(schema, function(err, schema) {
        if (err) {
            error = err;
            details = schema;
        }
        else {
            var resolved = _instance(schema, values);
            if (resolved) {
                details = resolved();
            }
        }
        callback(error, details); 
    });
    
    function _extends(schema) {
        var schemas;
        if (schema.extends) {
            schemas = [{}, schema].concat(schema.extends);
            schema = _.defaultsDeep.apply(null, schemas);
            schema = _.omit(schema, ['extends']);              
        }
        return schema;
    }
    
    function _instance(schema, values) {
        schema = _extends(schema);
        return _validate(schema,
            _object(schema, values) || _primary(schema, values) || _primitive(schema, values)
        );
    }
    
    function _object(schema, values) {
        var omits, ret;
        
        if ((schema.type === 'object' || schema.properties || schema.patternProperties) && _.isPlainObject(values)) {
            omits = [];
            ret = {}
            _properties();
            _others();
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
        
        function _others() {
            var name, others;
            
            others = _.omit(values, omits)

            if (_.size(others)) {
                if (schema.additionalProperties) {
                    _.defaults(ret, others);
                }
                else {
                    name = schema.others || 'others';
                    if (ret[name]) {
                        _.defaults(ret[name], others);
                    }
                    else {
                        ret[name] = others;
                    }
                }
            }
        }
    }
    
    function _primary(schema, values) {
        if (schema.primary && typeof values !== 'undefined') {
            return resolve(set({}, schema.primary, values));
        }
    }
    
    function _primitive(schema, values) {
        if (!schema.properties && !schema.primary) {
            return resolve(values);
        }
    }
                
    function _array(schema, value) {
        // note: if schema.type is 'array, we force value to be an array.
        if (schema.type === 'array' || (Array.isArray(value) && (!schema.type || _.contains(schema.type, 'array')))) {
            return _filter(resolve(reduce(value, _item, [])));
        }
        
        function _item(ret, values) {
            _accumulate(_filter(_instance(schema, values)));
            return ret;
        
            function _accumulate(resolved) {
                if (resolved) {
                    ret.push(resolved());
                }
            }
        }
    }
    
    function _filter(resolved) {
        if (resolved && _.size(resolved()) > 0) {
            return resolved;
        }
    }
    
    // TODO: validate should be done after full normalized.
    //    but, think about how to cache schemas.
    function _validate(schema, resolved) {
        var values;
        
        values = resolved ? resolved() : {};
        
        reduce(schema.required, _check);
        return resolved;
        
        function _check(prev, property) {
            if (! (property in values)) {
                _error('missing', schema, property);
            }
        }
    }

    function _error(type, schema, property) {
        error = true;
        switch (type) {
            case 'missing':
                details.push({
                    error: 'required property missing',
                    message: 'property "' + property + '" is required but missing',
                    schema: schema
                });
                break;
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
    
function resolve(value) {
    return function() {
        return value;
    };
}

function set(target, property, value) {
    target[property] = value;
    return target;
}

normalize.registerLoader = deref.registerLoader;

module.exports = normalize;
