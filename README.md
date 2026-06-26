## @e22m4u/js-autoload

English | [Russian](./README.ru.md)

A zero-configuration module for invoking functions from a specified directory.

- Recursive traversal of nested directories.
- Passing an arbitrary number of arguments to the invoked functions.
- Guaranteed execution order due to alphanumeric sorting.
- Support for asynchronous functions with execution completion awaiting.
- Invocation of `export default` functions only (classes and other types are
- Automatic filtering of test files (`*.test.js`, `*.spec.js`).
  skipped).
- Immediate execution halt (*fail-fast*) upon error occurrence.

## Contents

- [Installation](#installation)
- [Usage](#usage)
  - [Basic example](#basic-example)
  - [Passing arguments](#passing-arguments)
  - [File processing rules](#file-processing-rules)
- [Tests](#tests)
- [License](#license)

## Installation

```bash
npm install @e22m4u/js-autoload
```

The module supports ESM and CommonJS standards.

*ESM*

```js
import {invokeFromDir} from '@e22m4u/js-autoload';
```

*CommonJS*

```js
const {invokeFromDir} = require('@e22m4u/js-autoload');
```

## Usage

The `invokeFromDir` function traverses the specified directory, locates
*JavaScript* files, imports them, and invokes the contained functions if they
are provided as a default export (`export default ...`).

### Basic example

File structure:

```text
project/
  scripts/
    01-init.js
    02-process.js
  index.js
```

Contents of `01-init.js`

```js
export default function(context) {
  context.initialized = true;
}
```

Contents of `02-process.js`

```js
export default async (context) => {
  context.status = 'done';
};
```

Contents of `index.js`

```js
import {invokeFromDir} from '@e22m4u/js-autoload';

const appState = {
  initialized: false,
  status: 'pending',
};

// for ESM
await invokeFromDir(`${import.meta.dirname}/scripts`, appState);

// for CommonJS
// const path = require('path');
// await invokeFromDir(path.join(__dirname, './scripts'), appState);

console.log(appState); 
// { initialized: true, status: 'done' }
```

Passing an absolute path to the target directory is recommended (as shown
above), since a relative path is resolved based on the execution context of
the `node` command, rather than the file where this utility function is used.

### Passing arguments

The `invokeFromDir` function accepts an unlimited number of arguments after
the directory path. All provided arguments are forwarded to each invoked
function without modifications.

```js
import {invokeFromDir} from '@e22m4u/js-autoload';

// ...
await invokeFromDir('./src/actions', arg1, arg2, arg3);
```

### File processing rules

The following rules are applied when invoking the `invokeFromDir` function:

**Recursion**  
All files in the specified directory and all nested subdirectories are
processed.

**Extensions**  
Only files with `.js`, `.mjs`, and `.cjs` extensions are loaded. Files with
other extensions are ignored.

**Exclusions**  
Files ending in `.test.js` or `.spec.js` are skipped.

**Execution order**  
Prior to execution, the list of paths is sorted alphabetically, taking into
account numeric values in the strings. Naming files with numeric prefixes
(`01-*`, `02-*`, etc.) guarantees a strict execution sequence.

**Export validation**  
Only functions provided as `export default` are executed. Named exports are
ignored. Strings, objects, or other data types are skipped.

**Classes**  
If the default export is a class (*ES6 class*), it is ignored and not
instantiated.

**Asynchrony**  
If a function returns a `Promise`, execution is suspended until the promise
is resolved. The next file is processed only after the completion of the
previous one.

**Errors**  
In case of a missing specified directory or an error occurrence within the
executed function, the process is halted, and the error is thrown to the
calling code.

## Tests

```bash
npm run test
```

## License

MIT