# css-module-deps
[![version](https://img.shields.io/npm/v/css-module-deps.svg)](https://www.npmjs.org/package/css-module-deps)
[![status](https://travis-ci.org/zoubin/css-module-deps.svg?branch=master)](https://travis-ci.org/zoubin/css-module-deps)
[![coverage](https://img.shields.io/coveralls/zoubin/css-module-deps.svg)](https://coveralls.io/github/zoubin/css-module-deps)
[![dependencies](https://david-dm.org/zoubin/css-module-deps.svg)](https://david-dm.org/zoubin/css-module-deps)
[![devDependencies](https://david-dm.org/zoubin/css-module-deps/dev-status.svg)](https://david-dm.org/zoubin/css-module-deps#info=devDependencies)

Walk the css dependency graph to generate a stream of json output.

## Breaking changes in 2.0.0

* `Deps` is no constructor anymore.
* `atDeps` is replaced by `atRuleName`
* `processor` is replaced by `transform`
* `noParse` only supports patterns.

## Related
* [depsify](https://github.com/zoubin/depsify)
* [reduce-css](https://github.com/zoubin/reduce-css)
* [reduce-css-postcss](https://github.com/zoubin/reduce-css-postcss)

## Example

```javascript
var Deps = require('..')
var path = require('path')
var postcss = require('postcss')
var url = require('postcss-url')
var atImport = require('postcss-import')
var vars = require('postcss-advanced-variables')
var JSONStream = require('JSONStream')

var fixtures = path.resolve.bind(path, __dirname, 'src')
var processor = postcss([ atImport(), url(), vars() ])

var stream = Deps({ atRuleName: 'external', basedir: fixtures() })
stream.write({
  transform: function (result) {
    return processor.process(result.css, {
      from: result.from,
      to: result.to,
    })
    .then(function (res) {
      result.css = res.css
    })
  },
})
stream.write({ file: './import-url.css' })
stream.end({ file: './import-and-deps.css' })

stream.pipe(
  JSONStream.stringify(false, null, null, 2)
)
.pipe(process.stdout)

```

Directory structure:

```
⌘ tree example/src
example/src
├── import-and-deps.css
├── import-url.css
└── node_modules
    ├── helper
    │   └── vars.css
    └── sprites
        └── dialog
            ├── index.css
            └── sp-dialog.png
```

import-and-deps.css:
```css
@external "./import-url";
@import "helper/vars";

.import-and-deps {
  color: $red;
}

```

import-url.css
```css
@import "sprites/dialog";
.importUrl{}

```

helper/vars.css:
```css
$red: #FF0000;

```

sprites/dialog/index.css:
```css
.dialog {
  background: url(sp-dialog.png)
}

```

output:

```
⌘ node example/deps.js
{
  "file": "/Users/zoubin/usr/src/self/css-module-deps/example/src/import-url.css",
  "source": ".dialog {\n  background: url(node_modules/sprites/dialog/sp-dialog.png)\n}\n.importUrl{}\n\n",
  "deps": {},
  "id": "/Users/zoubin/usr/src/self/css-module-deps/example/src/import-url.css"
}
{
  "file": "/Users/zoubin/usr/src/self/css-module-deps/example/src/import-and-deps.css",
  "source": ".import-and-deps {\n  color: #FF0000;\n}\n\n",
  "deps": {
    "./import-url": "/Users/zoubin/usr/src/self/css-module-deps/example/src/import-url.css"
  },
  "id": "/Users/zoubin/usr/src/self/css-module-deps/example/src/import-and-deps.css"
}

```

## stream = Deps(opts)

Return an object stream that expects `{ file: ... }` objects as input,
and produces objects for every dependency from a recursive module traversal as output.

### opts

#### resolve
Specify how to resolve a file path

Type: `Function`

Receives the string to be resolved, and an option object with `basedir`.

Should return a promise, or the absolute path.


#### noParse
Specify which files to skip parsing.

Type: `Array`

Passed to [`multimatch`](https://github.com/sindresorhus/multimatch) to do matching.

#### atRuleName
Specify the name of at-rules to declare a dependency.

Type: `String`

Default: `deps`

Dependencies are declared through the `@deps` at-rule by default.

#### transform
Used to transform each file in the dependency graph.

Type: `Function`, `Array`

Signature: `fn(result)`

Return a promise to make it asynchronous.

`result` is an instance of [`Result`](#result).

#### basedir

Type: `String`

Used to resolve input filenames.

### Result

`var r = new Result(row)`

Each row has the following fields:

* `file`: file path
* `source`: file contents

Read or modify `r.root` (the [AST object](https://github.com/postcss/postcss/blob/master/docs/api.md#root-node))
or `r.css` to do transformations.

Usually, you do not have to access both.

`r.from` is the file path.

`r` is an emitter.

### Events

#### stream.on('file', file => {})
Before `readFile` called.

#### stream.on('transform', (result, file) => {})
Before applying transforms.

`result` is an [`Result`](#result).

