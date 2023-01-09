# Import Manager

[![License](https://img.shields.io/github/license/UmamiAppearance/ImportManager?color=009911&style=for-the-badge)](./LICENSE)
[![npm](https://img.shields.io/npm/v/import-manager?color=009911&style=for-the-badge)](https://www.npmjs.com/package/import-manager)

This is the outsourced home of the underlying module for the rollup plugin: [rollup-plugin-import-manager](https://github.com/UmamiAppearance/rollup-plugin-import-manager). To have the ability to analyze and modify JavaScript source code for import statements (cjs/es6/dynamic) without having to deal with rollup or rollup dependencies, the source code for the **ImportManager** class itself has its own repository. It can be downloaded and used independently from the rollup plugin and or a building process.

_Note:_ A detailed documentation will follow soon.


## Install
Using npm:
```console
npm install import-manager
```

## How it works
**ImportManager** analyzes a given source code for import statements. Those are collected as so called unit objects, on which the user can interact with. Also the creation of new units &rarr; import statements is possible. 


## Usage

### Importing
```js
import ImportManager from "import-manager
```

### Initializing
```js
const manager = new ImportManager(<sourceCodeAsString>, <filename>)
```

### Methods

#### Global Methods

##### `analyze()`
Analyzes the source and stores all import statements as unit objects in the object `this.imports`.

#### Unit Methods

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2022, UmamiAppearance


