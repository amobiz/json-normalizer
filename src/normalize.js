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

function normalize(schema, values, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = null;
    }
    process.nextTick(_async);
    
    function _async() {
        deref(schema, options || {}, function(err, schema) {
            var errors;
            
            if (err) {
                callback(err);
            }
            else {
                errors = [];
                schema = _process(schema, values, errors);
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
    var errors;
    
    errors = [];
    schema = deref.sync(schema, options || {});
    schema = _process(schema, values, errors);
    if (errors.length > 0) {
        throw errors;
    }
    return schema;
}

function _process(schema, values, errors) {
    var resolved = _instance(schema, values);
    if (resolved) {
        return resolved();
    }
    
    function _instance(schema, values) {
        schema = _extends(schema);
        return _validate(schema,
            _object(schema, values) || _primary(schema, values) || _primitive(schema, values)
        );
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
            var name, gathering;
            
            gathering = _.omit(values, omits)

            if (_.size(gathering)) {
                if (schema.additionalProperties) {
                    _.defaults(ret, gathering);
                }
                else {
                    name = schema.gathering || 'others';
                    if (ret[name]) {
                        _.defaults(ret[name], gathering);
                    }
                    else {
                        ret[name] = gathering;
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
        switch (type) {
            case 'missing':
                errors.push({
                    error: 'required property missing',
                    message: 'property "' + property + '" is required but missing',
                    schema: schema
                });
                break;
        }
    } 
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

module.exports = normalize;
module.exports.sync = sync;
