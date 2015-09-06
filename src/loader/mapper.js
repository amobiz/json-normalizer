/*global process */
'use strict';

function factory(definitions) {
    var _definitions = {};

    if (definitions) {
        map(definitions);
    }
    mapper.add = add;
    mapper.map = map;
    return mapper;

    function mapper(root, $ref, callback) {
        var parts, uri, schema, i, n, err;
        
        if (_definitions[$ref]) {
            schema = _definitions[$ref]; 
        }
        else {
            // NOTE: this regex make sure supporting of:
            // "a URI which has a non empty fragment part which is not a JSON Pointer".
            // i.e., a json pointer with '#' in its name. 
            // http://json-schema.org/latest/json-schema-core.html#anchor31
            parts = $ref.split(/#\//);
            // local reference shouldn't be mapped.
            uri = parts[0]; 
            if (parts.length !== 2 || uri.length === 0) {
                return false;
            }
            schema = _definitions[uri+'#'];
            if (!schema) {
                return false;
            }
            
            parts = parts[1].split(/\//);
            for (i = 0, n = parts.length; i < n; ++i) {
                schema = schema[parts[i]];
                if (!schema) {
                    err = 'reference not found in the specified $schema';
                    schema = $ref;
                    break;
                }
            }
        }
        process.nextTick(function() {
            callback(err, schema);
        });
        return true;
    }
    
    function map(mappings) {
        Object.keys(mappings).forEach(function($ref) {
            add($ref, mappings[$ref]);
        });
    }
    
    function add($ref, schema) {
        _definitions[$ref] = schema;
    }
}


module.exports = factory;