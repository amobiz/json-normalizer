/*global process */
'use strict';

module.exports = function(root, $ref, callback) {
    if (_isLocal($ref)) {
        process.nextTick(function() {
            callback(null, _load(root, $ref));
        });
        return true;
    }
}

module.exports.sync = function(root, $ref) {
    if (_isLocal($ref)) {
        return _load(root, $ref);
    }
}

function _isLocal($ref) {
    return (typeof $ref === 'string' && $ref[0] === '#');
}

function _load(root, $ref) {
    var ref

    if ($ref === '#') {
        return root;
    }

    ref = $ref.substr($ref.lastIndexOf('/') + 1);
    ref = root.definitions && root.definitions[ref];
    return ref;
}
