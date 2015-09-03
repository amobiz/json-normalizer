/*global process */
'use strict';

function factory(definitions) {
    var _definitions = {};

    if (definitions) {
        map(definitions);
    }
    mapper.sync = sync;
    mapper.map = map;
    return mapper;

    function mapper(root, $ref, callback) {
        var ref = _lookup($ref)
        if (ref.schema) {
            process.nextTick(_process);
            return true;
        }
        
        function _process() {
            var schema = _locate(ref.schema, ref.paths);
            if (schema) {
                callback(null, schema);
            }
            else {
                callback({
                    'message': 'reference not found in the specified $schema', 
                    '$ref': $ref
                });
            }
        }
    }
    
    function sync(root, $ref) {
        var ref = _lookup($ref)
        if (ref.schema) {
            return _locate(ref.schema, ref.paths);
        }
    }
    
    function map($ref, schema) {
        var definitions;
        
        if (typeof $ref === 'string' && schema) {
            _add($ref, schema);
        }
        else {
            definitions = $ref;
            Object.keys(definitions).forEach(function($ref) {
                _add($ref, definitions[$ref]);
            });
        }
    
        function _add($ref, schema) {
            _definitions[$ref] = schema;
        }
    }
    
    function _lookup($ref) {
        var parts, ref, uri;
        
        ref = {};
        if (_definitions[$ref]) {
            ref.uri = $ref; 
            ref.paths = [];
            ref.schema = _definitions[$ref];
        }
        else {
            // NOTE: this regex make sure supporting of:
            // "a URI which has a non empty fragment part which is not a JSON Pointer".
            // i.e., a json pointer with '#' in its name. 
            // http://json-schema.org/latest/json-schema-core.html#anchor31
            parts = $ref.split(/#\//);
            // local reference shouldn't be mapped.
            uri = parts[0]; 
            ref.uri = uri + '#';
            ref.paths = parts[1] ? parts[1].split(/\//) : []; 
            ref.schema = _definitions[ref.uri];
        }
        return ref;            
    }
    
    function _locate(schema, paths) {
        var i, n;
        
        for (i = 0, n = paths.length; i < n; ++i) {
            schema = schema[paths[i]];
            if (!schema) {
                return;
            }
        }
        return schema;
    }
}

module.exports = factory;
