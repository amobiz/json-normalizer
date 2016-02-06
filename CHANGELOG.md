## json-normalizer changelog

### 2016/01/24 - 0.3.5

* Feature: add `before` and `after` hook.

### 2016/01/13 - 0.3.4

* NPM: Upgrade lodash to 4.0.0.

### 2016/01/01 - 0.3.3

* Bug Fix: When "additionalProperties" set to false, should ignore all unknown properties.
* Feature: Add "patternProperties" support.

### 2015/12/26 - 0.3.2

* Bug Fix: Respect schema and options settings (e.g. options.ignoreUnknownProperties): returning what ever normalized rather.

### 2015/12/24 - 0.3.1

* NPM: Update npm settings.

### 2015/12/23 - 0.3.0

* Breaking Change: Sync version now returns normalized JSON value object directly since it never returns error.
* Feature: Process `items` property of schema that are `array` types.

### 2015/11/24 - 0.2.2

* Misc: Extract test framework to [mocha-cases](https://github.com/amobiz/mocha-cases) project.

### 2015/11/20 - 0.2.1

* Feature: Process only object type at top level [deprecated in 0.3.0].
* Feature: Always return an object even nothing resolved.
* Feature: Add default value if required.

### 2015/11/12 - 0.2.0

* Breaking Change: stop validate "required" property, since json-normalizer is not a validator.
* Feature: options.ignoreUnknownProperties allow ignore unknown properties.
* Feature: options.gatheringProperties allow set default gathering name other then "others".

### 2015/10/25 - 0.1.2

* Bug Fix: Convert value to array if primary property's type is array.

### 2015/09/15 - 0.1.1

* Feature: Add sync version.
* Feature: Remove mapper#add() method, use mapper#map() instead.
