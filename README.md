# Import Manager

[![License](https://img.shields.io/github/license/UmamiAppearance/ImportManager?color=009911&style=for-the-badge)](./LICENSE)
[![npm](https://img.shields.io/npm/v/import-manager?color=009911&style=for-the-badge)](https://www.npmjs.com/package/import-manager)

This is the outsourced home of the underlying module for the rollup plugin: [rollup-plugin-import-manager](https://github.com/UmamiAppearance/rollup-plugin-import-manager). To have the ability to analyze and modify JavaScript source code for import statements (cjs/es6/dynamic) without having to deal with rollup or rollup dependencies, the source code for the **ImportManager** class itself has its own repository. It can be downloaded and used independently from the rollup plugin and or a building process.


## Install
Using npm:
```console
npm install import-manager
```

## How it works
**ImportManager** analyzes a given source code for import statements. Those are collected (in the [imports object](#imports-object)) as so called unit objects, on which the user can interact with. Also the creation of new units &rarr; import statements is possible. 


## Usage

### Importing
```js
import ImportManager from "import-manager"
```

### Initializing
```js
const manager = new ImportManager(<sourceCodeAsString>, <filename>)
```
#### `constructor(source, filename, warnSpamProtection=new Set(), warnings=true, pluginInstance=null)`
* _source_ - The unmodified source code.
* _filename_ (optional) - The path/name of the input file (used for hash generation only). 
* _warnSpamProtection_ (empty `Set()` by default) - A Set which contains all previously printed warning hashes.
* _warnings_ (default `true`) - Pass false to suppress warning messages.
* _pluginInstance_ (optional) - Rollup plugin instance if used as a plugin.

### `imports` [object]
`this.imports` contains all _units_ (if [`analyze`](#analyze) was called) which are objects for every import statement. It has three sub-objects for the import statement types:
* cjs
* dynamic
* es6

### Methods

#### Global Methods
Methods, callable from manager instance.

##### `analyze()`
Analyzes the source and stores all import statements as unit objects in the [imports object](#imports-object).

##### `selectModByName(name, type, allowNull)`
Searches `this.imports` for the given module _name_ (`String` | `RegExp`). If _type_ is provided (`cjs`/`dynamic`/`es6`), it only searches for the module in that category. If _allowNull_ `false` the module must be found or a [`MatchError`](#matcherror
) is thrown.

##### `selectModById(id, allowNull)`
Searches `this.imports` for the given module _id_. If _allowNull_ `false` the module must be found or a [`MatchError`](#matcherror
) is thrown.

##### `selectModByHash(hash, allowNull)`
Searches `this.imports` for the given module _hash_. If _allowNull_ `false` the module must be found or a [`MatchError`](#matcherror
) is thrown.

##### `makeCJSStatement(module, declarator, varname)`
Generates a CJS Import Statement String from the _module_, _declarator_ (`const`/`let`/`var`/`global`) and the _varname_.  
`<declarator> <varname> = require(<module>)`

##### `makeDynamicStatement(module, declarator, varname)`
Generates a Dynamic Import Statement String including with a `await` call from the _module_, _declarator_ (`const`/`let`/`var`/`global`) and the _varname_.  
`<declarator> <varname> = await import(<module>)`

##### `makeES6Statement(module, defaultMembers, members)`
Generates an ES6 Import Statement String from the _module_ and _defaultMember_ and/or _members_ if provided.  
`import <defaultMembers>, { <members> } from <module>`

##### `insertStatement(statement, pos, type)`
Inserts an import _statement_ to the  <i>pos</i>ition `top` of the file or the `bottom` which is after the last found import statement.

##### `insertAtUnit(unit, mode, statement)`
Inserts an import _statement_ at a given _unit_-object. There are three different <i>mode</i>s available:
* `append` - _statement_ gets inserted after the given _unit_
* `prepend` - _statement_ gets inserted before the given _unit_
* `replace` - _statement_ replaces the given _unit_

##### `logUnits()`
Debugging method to stop the building process to list all import units with its `id`, `hash` and `module`.

##### `logUnitObjects()`
Debugging method to stop the building process to list the complete import object with all its units, which is much more verbose than [`logUnits`](#logunits).

##### `remove(unit)`
Removes a unit from the code instance.

##### `commitChanges(unit)`
All manipulation done via a [unit method](#unit-methods) is made on the code slice of the _unit_. This methods finally writes it to the main code instance.


#### Unit Methods
Methods callable from a unit object.

##### `renameModule(name, modType)`
Changes the _name_ -> module (path). _modType_ can be `"string"` which adds quotation marks around _name_ or `"raw"`, which doesn't and can be used to pass variables if valid for the import type.

Note: name can alternatively be (moduleSourceRaw: string) => string where moduleSourceRaw is the module's source code including quotes if _modType_ is `"string"`.

##### `addDefaultMembers(names)`
_names_ is an array of strings (even for the most common case of a single member) of default members to add to the unit. _[es6 only]_

##### `addMembers(names)`
_names_ is an array of strings of members to add to the unit. _[es6 only]_

##### `removeMember(memberType, name)`
Removes a singular `defaultMember` if _memberType_ is set to it or a `member` with the specified _name_. _[es6 only]_

##### `removeMembers(membersType)`
Removes the group of `defaultMember(s)` if _memberType_ is set to it or all  `member(s)`. _[es6 only]_

##### `renameMember(memberType, name, newName, keepAlias)`
Renames a singular member of _memberType_ `defaultMember`/`member` matching the given _name_ to a _newName_. It is possible to _keepAlias_ if it should not be changed. _[es6 only]_

##### `setAlias(memberType, name, set)`
Sets a alias of _memberType_ `defaultMember`/`member` of the given member _name_. You can either _set_ (pass a string) a new name or don't define _set_ to delete the alias. _[es6 only]_

##### `makeUntraceable()`
Method to call after a unit was completely removed or replaced, to prevent matching it again afterwards.

##### `log()`
Debugging method to stop the building process and list the unit properties.

##### `updateUnit()`
If multiple changes should be performed on a `es6` unit, this method should be called after a change. If called the unit gets generated again with the updates code.


### Errors

#### `MatchError`
Extends the generic JavaScript `Error`. An error to inform, that it is not possible to select a specific unit.

#### `DebuggingError`
Extends the generic JavaScript `Error`. An error to deliberately abort the building process for retrieving information about the imports/units.


## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2022-2023, UmamiAppearance
