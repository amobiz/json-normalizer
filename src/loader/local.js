module.exports = function(root, $ref, callback) {
    var ref;
    
    if (typeof $ref === 'string' && $ref[0] === '#') {
        if ($ref === '#') {
            ref = root;
        }
        else {
            ref = $ref.substr($ref.lastIndexOf('/') + 1);
            ref = root.definitions && root.definitions[ref];
        }
        callback(null, ref);
        return true;
    }
}
