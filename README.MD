# Json-normalizer
Normalizes a loose JSON data object to a strict [json-schema](http://json-schema.org/) data object.
 
Note: Json-normalizer is not a json-schema validator. If you are looking for json-schema validators, 
please check out here: https://www.npmjs.com/search?q=json-schema+validator
 
## Overview
 
### The Problems

You want:

* Alias, e.g., both "entry" and "entries" are valid property name, but you don't want to check both of them,
* Support either single item or an array of items, but you don't want to handle both of them,
* Flat data objects, i.e., user don't have to nest properties, and
* Maximum reuse of schemas, i.e., you want multiple inheritance.

### The Solution
The normalizer is based on json-schema with the "[normalizable](http://github.com/amobiz/json-normalizer/schema/normalizable#)" extension:

1. Properties can have alias and being normalized, using the "`alias`" keyword.
2. For schemas of "`object`" type, a "`primary`" property can be specified, 
   that when provided value is not an object (a primitive or an array), can be assigned to.
3. For schemas of "`object`" type, a "`gathering`" property can be specified,  that when "`additionalProperties`" is set to false, all unrecognized additional properties can be gathered to. The "`gathering`" property name defaults to "`others`".
4. For schemas of "`array`" type, if the provided value is not an array, converts that value to an array automatically.
5. Allow schema extends other schemas, using the "`extends`" keyword.

## Install
`npm install --save json-normalizer`

## API

### `normalize(schema, data, [options,] callback)`
Normalizes a loose JSON data object to a strict json-schema data object.
#### Context
Don't care.
#### Parameters
##### `schema`
The schema used to normalize the given JSON data object.
##### `data`
The JSON data object.
##### `options`
Optional. Currently only accepts a loader or an array of loaders.
###### `options.loader` | `options.loaders`
A loader or an array of loaders that help loading remote schemas. Loaders are tested in the order listed.
#### `callback`
The callback function with `function(err, detail)` signature that the normalizer delivers the normalized JSON object to. Called with null context.
#### Returns
No return value.
#### Example
```
var normalize = require('json-normalizer');
var schema = {
	"properties": {
		"entries": {
			"alias": "entry",
			"type": "array"
		}
	}
};
var data = {
	"entry": "index.js"
};
// optional, only needed if your schema references remote schema.
var mapper = ...; // see example bellow
var options = {
    loaders: [mapper]
};
normalize(schema, data, options, function(err, result) {
    if (!err) {
        // process the normalized JSON data object here.
    }
});
```
## Other functions that may be handy:

### `deref(schema, [options,] callback)`
Dereferences JSON references in a schema. Default implementation supports only local references, i.e. references that starts with "`#`". Custom loaders can be provided via the `options` object.
#### Context
Don't care.
#### Parameters
##### `schema`
The schema that contains JSON references.
##### `options`
Optional. Currently only accepts a loader or an array of loaders.
###### `options.loader` | `options.loaders`
A loader or an array of loaders that help loading remote schemas. Loaders are tested in the order listed.
##### `callback`
The callback function with `function(err, detail)` signature that the `deref` function delivers the deferenced schema to. Called with null context.
#### Returns
No return value.

### `maperFactory([definitions]): function`
Creates a mapper schema loader, i.e. a schema loader that holds schema definitions in memory, initialized with the optional `definitions` hash object.
#### Context
Don't care.
#### Parameters
##### `definitions`
Optional. If provided, all definitions in the `definitions` hash object will be available for mapping. See `mapper#map(definitions)` for more details.
#### Returns
The mapper schema loader.
### `mapper#add($ref, schema)`
Add a `schema` with the `$ref` JSON pointer. Subsequent calls with the same JSON pointer will override definition of preceding calls.
#### Context
Don't care.
#### Parameters
##### `$ref`
The JSON pointer the schema being published.
##### `schema`
The schema.
#### Returns
No return value.
### `mapper#map(definitions)`
Add all `$ref` : `schema` pairs defined in the `definitions` hash object. Subsequent calls with the same JSON pointer will override definition of preceding calls.
#### Context
Don't care.
#### Parameters
##### `definitions`
The definitions hash object. Keys in the hash object should be valid JSON pointers; Values in the hash object should be the schema of the corresponding JSON pointer.
#### Returns
No return value.
#### Example
```
var mapperFactory = require('json-normalizer/src/loader/mapper');
// map json references to local schema files.
var mapper = mapperFactory({
	'http://json-schema.org/draft-04/schema#': require('schema.json'),
	'http://json-schema.org/geo': require('geo.json'),
	'http://json-schema.org/card': require('card.json'),
	'http://json-schema.org/calendar': require('calendar.json'),
	'http://json-schema.org/address': require('address.json')
});
var schema = {
	...
	"properties": {
		"userId": { "type": "integer" },
		"userProfile": { "$ref": "http://json-schema.org/card" }
	}     
};
deref(schema, { loader: mapper }, function(err, schema) {
    // use the dereferenced schema.
});
```
### Write Your Own Loader
 *  Loaders are functions with `function(rootSchema, $ref, callback(err, schema))` signature,
 *  Loaders must return truthy if it can handle the given reference `$ref`, and the callback be called later when the schema is ready. However, if error occurred, e.g., network failure, the callback be called with the `err` set to the type of error and the second argument provides details of that error.
 *  Loaders must return falsy if it can not handle the given reference `$ref`, and the `callback` should not be called at all.
 *  A local loader is always tested first, and other loaders provided in `options.loader` or `options.loaders` argument are then tested by the order listed.

## Usage Examples

### Alias and Array Type

With the schema:
```
{
    "properties": {
        "entries": {
            "alias": ["entry"],
            "type": "array"
        }
    }
}
```
will normalize this data object:
```
{
    "entry": "index.js"
}
```
to:
```
{
    "entries": ["index.js"]
}
```

### Primary Property and Gathering Property

With the schema:
```
{
    "properties": {
        "src": {
            "type": "string | array"
        },
        "options": {
            "properties": {
	            "base": {
		            "type": "string"
	            },
	            "read": {
		            "type": "boolean"
	            },
	            "buffer": {
		            "type": "boolean"
	            }
            }
        },
        "required": ["src"]
    },
    "primary": "src",
    "additionalProperties": false,
    "gathering": "options"
}
```
will normalize this data object:
```
"src/index.js"
```
to:
```
{
    "src": "src/index.js"
}
```
and this data object:
```
{
    "src": "index.js",
    "base": "src",
    "read": false,
    "unknown": "..."
}
```
to:
```
{
    "src": "index.js",
    "options": {
        "base": "src",
        "read": false,
        "unknown": "..."
    }
}
```

### Extending Schema
```
{
	"definitions": {
		"options": {
			"properties": {
				"debug": {
					"type": "boolean"
				},
				"sourcemap": {
					"enum": [false, "inline", "external"]
				}
			}
		}
	},
	"extends": [{
		"$ref": "#/definitions/options"
	}],
	"properties": {
		"bundles": {
			"alias": ["bundle"],
			"type": "array",
			"extends": [{
				"$ref": "#/definitions/options"
			}],
			"properties": {
				"entries": {
					"alias": ["entry"],
					"type": "array"
				},
				"options" {
					"$ref": "#/definitions/options"
				}
			}
		},
		"options": {
			"$ref": "#/definitions/options"
		}
	}
}
```
Please refer to test for more examples.

## Test
Tests are written in mocha. Run tests in terminal:
```
npm test
```

## License
MIT

## Author
[Amobiz](https://github.com/amobiz)