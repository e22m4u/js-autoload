## @e22m4u/js-autoload

![npm version](https://badge.fury.io/js/@e22m4u%2Fjs-autoload.svg)
![license](https://img.shields.io/badge/license-mit-blue.svg)

English | [Русский](./README.ru.md)

Zero-configuration module for invoking functions from a specified directory.

- Traversal of files strictly within the specified directory (no recursion).
- Passing of any number of arguments to the invoked functions.
- Guaranteed invocation order via alphanumeric sorting.
- Support for async functions with waiting for completion.
- Invocation of `export default` functions only (classes and other types
  are skipped).
- Automatic filtering of test files (`*.test.js`, `*.spec.js`).
- Fast execution stop (*fail-fast*) when errors occur.

## Table of Contents

- [Motivation](#motivation)
- [Installation](#installation)
- [Usage](#usage)
  - [Usage Example](#usage-example)
  - [Passing Arguments](#passing-arguments)
  - [File Processing Rules](#file-processing-rules)
  - [CommonJS Support](#commonjs-support)
- [Tests](#tests)
- [License](#license)

## Motivation

A typical situation in server application development is when the entry
point turns into a long list of manual imports and calls for connecting
data sources, registering models, declaring routes, etc. Each new file
requires modification of the main module, which increases the risk
of error and complicates code maintenance as the project grows.

```js
import {defineRoleModel} from './models/user-model.js';
import {defineUserModel} from './models/role-model.js';
import {defineRoleRoutes} from './routes/role-routes.js';
import {defineUserRoutes} from './routes/user-routes.js';

// const orm = ...
// const router = ...

defineRoleModel(orm);
defineUserModel(orm);
defineRoleRoutes(router);
defineUserRoutes(router);
```

The module removes the need to list connected files manually.
It is sufficient to place files in a separate directory, and the
`invokeFromDir` function finds them, imports them, and invokes the
default-exported functions in a predictable order.

```js
import {invokeFromDir} from '@e22m4u/js-autoload';

// const orm = ...
// const router = ...

await invokeFromDir(`${import.meta.dirname}/models`, orm);
await invokeFromDir(`${import.meta.dirname}/routes`, router);
```

This approach simplifies the organization of application initialization,
where each file in the directory is responsible for its own part of the
setup and receives an arbitrary set of arguments, whether a service
container, a database schema, or a router object. The startup logic
remains compact, and the execution order is explicit and readable
directly from the file system structure.

## Installation

```bash
npm install @e22m4u/js-autoload
```

The module supports both ESM and CommonJS standards.

*ESM*

```js
import {invokeFromDir} from '@e22m4u/js-autoload';
```

*CommonJS*

```js
const {invokeFromDir} = require('@e22m4u/js-autoload');
```

## Usage

The `invokeFromDir(dirPath, ...args)` function traverses the specified
directory, finds *JavaScript* files, imports them, and invokes the
functions contained in them if passed as a default export.

- Default export for ESM `export default function() { ... }`
- Default export for CJS `module.exports = function() { ... }`

**Note.** The examples below use numeric prefixes (`01-`, `02-`, etc.)
solely to visually demonstrate the alphanumeric invocation order of
files. In practice, the use of numeric prefixes is not recommended,
since adding a new file to the beginning or middle of the list may
require renaming several neighboring files to preserve the desired
order. The module is primarily oriented toward managing the invocation
order of *groups* of files, where each group is processed by a
separate `invokeFromDir` call. For example, models first, then routes,
then *middleware*, etc. The order within a single group is usually
irrelevant if the files do not depend on each other.

### Usage Example

The example below is intended for the *ESM* standard. This clarification
is due to the use of the top-level `await` operator within the module.
Such syntax is natively supported in *ESM* mode but causes a syntax
error in *CommonJS*. An implementation of similar logic for
*CommonJS* is described in the [*"CommonJS Support"*](#commonjs-support)
section.

File structure:

```text
project/
  scripts/
    01-init.js
    02-process.js
  index.js
```

Content of `01-init.js`

```js
export default function(context) {
  context.initialized = true;
}
```

Content of `02-process.js`

```js
// simulation of asynchronous execution
export default async function(context) {
  context.status = 'done';
};
```

Content of `index.js`

```js
import {invokeFromDir} from '@e22m4u/js-autoload';

const appState = {
  initialized: false,
  status: 'pending',
};

await invokeFromDir(`${import.meta.dirname}/scripts`, appState);
// import.meta.dirname is available only for Node.js 20.11 and above

console.log(appState); 
// { initialized: true, status: 'done' }
```

Passing an absolute path to the target directory is recommended (as
shown above), since a relative path is resolved from the location of
the `node` command invocation, not from the file in which this utility
is used.

### Passing Arguments

The `invokeFromDir` function accepts an unlimited number of arguments
after the directory path. All passed arguments are sent unchanged to
each invoked function.

```js
import {invokeFromDir} from '@e22m4u/js-autoload';

// ...
await invokeFromDir('./src/actions', arg1, arg2, arg3);
```

### CommonJS Support

The modern *ESM* standard allows the use of the top-level `await`
operator. The *CommonJS* standard does not support this capability.
Using the `await` operator at the root of a file results in a syntax
error.

To bypass this limitation, an async wrapper function is created. Inside
such a function, the `await` operator works normally. All application
startup logic is placed inside the body of this function. An example
implementation of this approach is provided below.

File structure:

```text
project/
  scripts/
    01-init.js
    02-process.js
  index.js
```

Content of `01-init.js`

```js
module.exports = function(context) {
  context.initialized = true;
};
```

Content of `02-process.js`

```js
// simulation of asynchronous execution
module.exports = async function(context) {
  context.status = 'done';
};
```

Content of `index.js`

```javascript
const path = require('path');
const {invokeFromDir} = require('@e22m4u/js-autoload');

const appState = {
  initialized: false,
  status: 'pending'
};

async function main() {
  await invokeFromDir(path.join(__dirname, './scripts'), appState);
  console.log(appState);
  // { initialized: true, status: 'done' }
}

main();
```

The `invokeFromDir` utility invokes only functions exported as the
default export. When working with the *CommonJS* standard, assigning
the target function to the `module.exports` object is automatically
treated by the runtime as a default export. For this reason, such
functions are successfully recognized and invoked by this utility.

### File Processing Rules

The following rules apply when calling the `invokeFromDir` function:

**Nesting**  
Only files at the first level of the specified directory are processed.
Nested directories are ignored.

**Extensions**  
Only files with the `.js`, `.mjs`, and `.cjs` extensions are loaded.
Files with other extensions are ignored.

**Exclusions**  
Files whose names end with `.test.js` or `.spec.js` are skipped.

**Execution Order**  
Before execution, the list of paths is sorted alphabetically taking
numeric values within the strings into account. Naming files with
numeric prefixes (`01-*`, `02-*`, etc.) guarantees a strict invocation
sequence.

**Export Verification**  
Only functions provided as `export default` are invoked. Named exports
are ignored. Strings, objects, or other data types are skipped.

**Classes**  
If the default export is a class (*ES6 class*), it is ignored and not
instantiated.

**Asynchrony**  
If a function returns a `Promise`, execution is paused until the
promise is resolved. The next file is processed only after completion
of the previous one.

**Errors**  
If the specified directory does not exist, or an error occurs inside
the invoked function, the process stops and the error is propagated
to the calling code.

## Tests

```bash
npm run test
```

## License

MIT