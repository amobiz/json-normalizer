var _ = require('lodash');

var definitions = {};

function mapper(root, $ref, callback) {
    if (definitions[$ref]) {
        callback(null, definitions[$ref]);
        return true;
    }
}

function add($ref, schema) {
    definitions[$ref] = schema;
}

function map(mappings) {
    _.assign(definitions, mappings);
}

mapper.add = add;
mapper.map = map;

module.exports = mapper;