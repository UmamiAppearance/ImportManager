# rollup-plugin-import-manager

[![License](https://img.shields.io/github/license/UmamiAppearance/rollup-plugin-import-manager?color=009911&style=for-the-badge)](./LICENSE)
[![npm](https://img.shields.io/npm/v/rollup-plugin-import-manager?color=009911&style=for-the-badge)](https://www.npmjs.com/package/rollup-plugin-import-manager)

A Rollup plugin which makes it possible to manipulate import statements. Features are deleting, adding, changing the members and modules and much more. Supports ES6 Import Statements, CommonJS and Dynamic Imports.

## Table of Contents
  - [Install](#install)
  - [How it works](#how-it-works)
  - [Usage](#usage)
  - [Options](#options)
    - [`include`](#include)
    - [`exclude`](#exclude)
    - [`showDiff`](#showdiff)
    - [`debug`](#debug)
    - [`warnings`](#warnings)
    - [`units`](#units)
      - [`module`](#module-option-for-units)
      - [`hash`](#hash-option-for-units)
      - [`id`](#id-option-for-units)
      - [`file`](#file-option-for-units)
      - [`type`](#type-option-for-units)
      - [`createModule`](#createmodule-option-for-units)
      - [`addCode`](#addcode-option-for-units)
      - [`insert`](#insert-option-for-units)
      - [`append`](#append-option-for-units)
      - [`prepend`](#prepend-option-for-units)
      - [`replace`](#replace-option-for-units)
      - [`const`](#const-option-for-units)
      - [`let`](#let-option-for-units)
      - [`var`](#var-option-for-units)
      - [`global`](#global-option-for-units)
      - [`actions`](#actions-option-for-units)
        - [`debug`](#debug-option-for-actions)
        - [`select`](#select-option-for-actions)
        - [`name`](#name-option-for-actions)
        - [`alias`](#alias-option-for-actions)
        - [`rename`](#rename-option-for-actions)
        - [`modType`](#modtype-option-for-actions)
        - [`keepAlias`](#keepalias-option-for-actions)
        - [`remove`](#remove-option-for-actions)
        - [`add`](#add-option-for-actions)
  - [Examples](#examples)
    - [Creating an Import Statement](#creating-an-import-statement)
      - [Basic ES6 Statement via createModule](#basic-es6-statement-via-createmodule)
      - [Basic CJS Statement via createModule](#basic-cjs-statement-via-createmodule)
      - [Basic Dynamic Import Statement via createModule](#basic-dynamic-import-statement-via-createmodule)
      - [Manual Statement creation via addCode](#manual-statement-creation-via-addcode) 
      - [Creating an Import Statement, appended after another statement](#creating-an-import-statement-appended-after-another-statement)
      - [Creating an Import Statement, prepended before another statement](#creating-an-import-statement-prepended-before-another-statement)
      - [Creating an Import Statement by replacing another statement](#creating-an-import-statement-by-replacing-another-statement)
    - [Removing an Import Statement](#removing-an-import-statement)
      - [Shorthand Method](#shorthand-method)
    - [Changing the module](#changing-the-module)
    - [Addressing the (default) members](#addressing-the-default-members)
      - [Adding a defaultMember](#adding-a-defaultmember)
      - [Removing a member](#removing-a-member)
      - [Removing a group of members](#removing-a-group-of-members)
      - [Changing a defaultMember name](#changing-a-defaultmember-name)
        - [Renaming but keeping the alias](#renaming-but-keeping-the-alias)
        - [Addressing an alias](#addressing-an-alias)
  - [General Hints](#general-hints)
    - [Chaining](#chaining)
    - [Array and Object shortening](#array-and-object-shortening)
  - [Debugging](#debugging)
    - [Show Diff](#show-diff)
    - [Debugging Files](#debugging-files)
    - [Debugging Units](#debugging-units)
  - [License](#license)


## Install
Using npm:
```console
npm install rollup-plugin-import-manager --save-dev
```

## How it works
**rollup-plugin-import-manager** analyzes each file (which is used for the rollup building process) for import statements. Those are collected as so called unit objects, on which the user can interact with. Also the creation of new units &rarr; import statements is possible. 


## Usage
Create a `rollup.config.js` [configuration file](https://www.rollupjs.org/guide/en/#configuration-files) and import the plugin.

```js
import { importManager } from "rollup-plugin-import-manager";

export default {
    input: "src/index.js",
    output: {   
        format: "es",
        name: "myBuild",
        file: "./dist/build.js",
    },
    plugins: [
        importManager({
            units: [
                {
                    file: "**/my-file.js",
                    module: "my-module",
                    actions: [
                        // ...
                    ]
                }
            ]
        })
    ]
}
```

Then call `rollup` either via the [CLI](https://www.rollupjs.org/guide/en/#command-line-reference) or the [API](https://www.rollupjs.org/guide/en/#javascript-api).


## Options

### `include`  
Type: `String` | `Array[...String]`  
Default: `null`  

A [minimatch pattern](https://github.com/isaacs/minimatch), or array of patterns, which specifies the files in the build the plugin should operate on. By default all files are targeted. On top of that each unit has the possibility to [target a specific file](#file-option-for-units).


### `exclude`  
Type: `String` | `Array[...String]`  
Default: `null`  

A [minimatch pattern](https://github.com/isaacs/minimatch), or array of patterns, which specifies the files in the build the plugin should _ignore_. By default no files are ignored.


### `showDiff`  
Type: `String`  
Default: `null`  

A [debugging](#debugging) method. If set to anything other than the string `"file"` a console output of [diff](https://github.com/kpdecker/jsdiff) is shown. It is modified a little and looks much like the default output of diff from the [GNU diffutils](https://www.gnu.org/software/diffutils/), with colors on top. If set to `"file"` the whole file with insertions and deletions is shown. Either way it only gets logged if there are any changes at all. If this is not the case, there is another (now following) global debugging method available.


### `debug`  
Type: `String`  
Default: `null`  

A [debugging](#debugging) method. If more than one source file is involved, this really only is useful in combination with [include](#include). It stops the building process by throwing an intentional error and lists all units of the first file, that is getting processed. Even more verbose information about all unit objects can be made accessible by passing the strings `verbose`, `object(s)` or `import(s)` (which one to use doesn't matter). 


### `warnings`
Type: `Boolean`  
Default: `true`  

Set to `false` to prevent displaying warning messages.


### `units`
Type: `Object` | `Array[...Object]`  
Default: `null`  

This is where the plugin comes to life. Here is the place where units are getting selected, created or removed. It has several **options** by itself. Units are objects, for multiple units pass an array of objects:

---

#### `module` <samp>[option for units]</samp>
Type: `String`  
Default: `null`  

Selects a unit by its module name. Each import has a name object. This is constructed from the module.
Path information are getting removed. This may look like this:
```js
import foo from "./path/bar.js";
```
The internal name will be `bar.js`. And can be matched with: `module: "bar.js"`  
(The matching method is actually a little more generous. You can skip the extension or even bigger parts if you like and if this doesn't lead to multiple matches).  

Absolute imports are directly taken as the name attribute. Eg:
```js
import foo from "bar";
```
The internal name will be `bar` and can be matched by that name: `module: "bar"`


#### `hash` <samp>[option for units]</samp>
Type: `String`  
Default: `null`  

Selects a unit by its hash. This is more like an emergency solution. If for any reason it is not possible to match via the module name, this is an alternative. If multiple matches are found the hashes are logged to the console. Also by running a global [debugging](#debug), the hash can be found.  

The hash is generated by the module name and its members and also the filename. If the filename or any of the other properties are changing so is the hash. The build will fail in this case, so no need to worry to overlook it. The matching via module name should nevertheless be preferred.

If the hash option is set, the [module](#module-option-for-units) option will get ignored.


#### `id` <samp>[option for units]</samp>
Type: `Number`  
Default: `null`  

Internally every unit gets an Id. There are different scopes for the generation:

| type    | scope  |
| ------- | ------ | 
| es6     | `1000` |
| dynamic | `2000` |
| cjs     | `3000` |

The first ES6 Import statement of a file will have the Id `1000`, the second `1001` and so forth. For a quick test you can select via Id (if the [filename](#file) is specified). But actually this is only an internal method to locate the statements. Testing is the only other reason to use it. If one statement is added before the one to match, the Id will change, and there is a good change to not even realize that. You have been warned (and you will get warned again by the plugin if you decide to use it). 

If the id option is set, [hash](#hash-option-for-units) and [module](#module-option-for-units) will get ignored.


#### `file` <samp>[option for units]</samp>
Type: `String`  
Default: `null`  

A [minimatch pattern](https://github.com/isaacs/minimatch), which specifies the file where the unit is located.  

It is always a good idea to set it, even if the files are already limited by include or exclude. The reason for this is, that a the unit is expected to be in the specified file if the value is set and an error is thrown if it doesn't match. Otherwise it will simply be ignored, if a match is not there.  

Also for unit creation this is almost always critical. If there are multiple source files, and no file is specified, the fresh import statement will get created in any file, that is processed (and this probably not what you want and also will most likely lead to errors).  

However, it is not mandatory.


#### `type` <samp>[option for units]</samp>
Type: `String`  
Default: `null`

A possibility to specify the unit type. Valid parameters are:
 * `es6`
 * `cjs`
 * `dynamic`

This argument is mainly necessary when creating new units. Without members or default members the type cannot be guessed and needs to be specified. But the argument _can_ also be helpful for selecting modules, if there are overlapping matches across the types. For example if es6 and dynamic import share the same module name. Which is admittedly a very unusual scenario. 


#### `createModule` <samp>[option for units]</samp>
Type: `String`  
Default: `null`

Creates a new module. Every selection method ([id](#id-option-for-units), [hash](#hash-option-for-units), [module](#module-option-for-units)) will get ignored if this key is passed to a unit. For the value set the module (path).  
Eg: `createModule: "./path/to/my-module.js"`


#### `addCode` <samp>[option for units]</samp>
Type: `String`  
Default: `null`

This is the manual version of [`createModule`](#createmodule-option-for-units). The value is a string which gets [inserted](#insert-option-for-units), [appended](#append-option-for-units) or [prepended](#prepend-option-for-units) to the code.  
[Example](#creating-an-import-statement)


#### `insert` <samp>[option for units]</samp>
Type: `String`  
Default: `"bottom"`

Additional parameter for [`createModule`](#createmodule-option-for-units)/[`addCode`](#addcode-option-for-units). If set to bottom, the file is analyzed and the import statement is appended after the last found es6 import statement (which is the default behavior if not set). Setting it top top will append the statement on top of the file, directly after the the description if present (this is the default if no other es import statement was found).  
[Example](#creating-an-import-statement)


#### `append` <samp>[option for units]</samp>
Type: `Object`  
Default: `null`

Additional parameter for [`createModule`](#createmodule-option-for-units)/[`addCode`](#addcode-option-for-units). Instead of inserting a fresh statement at the top or bottom of the other statements, it is also possible to append it after another import statement. This works by passing a [`unit`](#units) as a value.  
[Example](#creating-an-import-statement-appended-after-another-statement). 


#### `prepend` <samp>[option for units]</samp>
Type: `Object`  
Default: `null`

Additional parameter for [`createModule`](#createmodule-option-for-units)/[`addCode`](#addcode-option-for-units). Instead of inserting a fresh statement at the top or bottom of the other statements, it is also possible to prepend it before another import statement. This works by passing a [`unit`](#units) as a value.  
[Example](#creating-an-import-statement-prepended-before-another-statement). 


#### `replace` <samp>[option for units]</samp>
Type: `Object`  
Default: `null`

Additional parameter for [`createModule`](#createmodule-option-for-units)/[`addCode`](#addcode-option-for-units). Instead of somehow adding it around another unit, this keyword replaces the according import statement, which is also passed as a [`unit`](#units) object.  
[Example](#creating-an-import-statement-by-replacing-another-statement). 


#### `const` <samp>[option for units]</samp>
Type: `String`  
Default: `null`

Additional parameter for [`createModule`](#createmodule-option-for-units). Only has an effect if _cjs_ or _dynamic_ modules are getting created. `const` is the declarator type, the value is the variable name for the import.


#### `let` <samp>[option for units]</samp>
Type: `String`  
Default: `null`

Additional parameter for [`createModule`](#createmodule-option-for-units). Only has an effect if _cjs_ or _dynamic_ modules are getting created. `let` is the declarator type, the value is the variable name for the import.


#### `var` <samp>[option for units]</samp>
Type: `String`  
Default: `null`

Additional parameter for [`createModule`](#createmodule-option-for-units). Only has an effect if _cjs_ or _dynamic_ modules are getting created. `var` is the declarator type, the value is the variable name for the import.


#### `global` <samp>[option for units]</samp>
Type: `String`  
Default: `null`

Additional parameter for [`createModule`](#createmodule-option-for-units). Only has an effect if _cjs_ or _dynamic_ modules are getting created. If `global` is set, there is no declarator type and the variable should be declared before this statement. The value is the variable name for the import.


#### `actions` <samp>[option for units]</samp>  
Type: `Object` | `Array[...Object]`  
Default: `null`  

This is the place where the actual manipulation of a unit (and ultimately a statement) is taking place. Several actions/**options** can be passed, for a singular option, use an object for multiple an array of objects:

---

##### `debug` <samp>[option for actions]</samp>
Type: `Any`  
Default: `null`  

A [debugging](#debugging) method for a specific unit. This also throws an intentional debugging error, which stops the building process. Verbose information about the specific unit are logged to the console. The value is irrelevant. If this is the only action it can be passed as a string: `actions: "debug"`


##### `select` <samp>[option for actions]</samp>
Type: `String`  
Default: `null`  

Select the part you like to modify. This can be specific part (which also needs the option [name](#name-option-for-actions) to be passed):
 * `defaultMember`
 * `member`
 * `module`  
  

Or the groups:
 * `defaultMembers`
 * `members`
  
Common JS and dynamic imports only have the `module` available to select.


##### `name` <samp>[option for actions]</samp>
Type: `String`  
Default: `null`  

For the selection of a specific part (`defaultMember` or `member`) the name needs to be specified. The name is directly related to the name of a member or default member (without its alias if present).   
A member part of `{ foobar as foo, baz }` can be selected with `name: "foobar"` and `name: "baz"`.


##### `alias` <samp>[option for actions]</samp>
Type: `String`  
Default: `null`  

An option to target an alias of a [selected](#select-option-for-actions) `defaultMember` or `member`. If a value is set, this will change or initially set the alias to the this value. Aliases for _members_ can also be [removed](#remove-option-for-actions), in this case the value for alias will be ignored.


##### `rename` <samp>[option for actions]</samp>
Type: `String`  
Default: `null`  

This option is used to rename a [selected](#select-option-for-actions) specific part (`defaultMember`, `member`, `module`). The value is the new name of the selected part.


##### `modType` <samp>[option for actions]</samp>
Type: `String`  
Default: `"string"|"raw"`  

If [renaming](#rename-option-for-actions) is done with modType `string` there are quotation marks set around the input by default, mode `raw` is not doing that. This can be useful for replacing the module by anything other than a string (which is only valid for _cjs_ and _dynamic_ imports). By default the `modType` is defined by the existing statement. If it is not a string, type `raw` is assumed (those are rare occasions).  


##### `keepAlias` <samp>[option for actions]</samp>
Type: `Boolean`  
Default: `false`  

This is an extra argument to [rename](#rename-option-for-actions) a (default) member. If true, the alias will kept untouched, otherwise it gets overwritten in the renaming process, wether a new alias is set or not.


##### `remove` <samp>[option for actions]</samp>
Type: `Any`  
Default: `null`  

When no part was selected, this removes the entire unit &rarr; import statement. The value is irrelevant. If this is the only action it can be passed as a string: `actions: "remove"`. If a part is [selected](#select-option-for-actions) (`defaultMembers`, `members`, `module` or [`alias`](#alias-option-for-actions)) only the according (most specific) part is getting removed.


##### `add` <samp>[option for actions]</samp>
Type: `String` | `Array[...String]`
Default: `null`  

An additional parameter for `defaultMembers` or `members`. It adds one or multiple (default) members to the existing ones. The group has to be [selected](#select-option-for-actions) for the `add` keyword to have an effect.  
[Example](#adding-a-defaultmember)


## Examples

### Creating an Import Statement
There are a few options on how to create new import statements. The [`createModule`](#createmodule-option-for-units) is working a lot like the the methods for selecting existing statements.

#### Basic ES6 Statement via [`createModule`](#createmodule-option-for-units)
```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            createModule: "./path/to/foo.js", 
            actions: [
                {
                    "select": "defaultMembers",
                    "add": "bar"
                },
                {
                    "select": "members",
                    "add": "baz as qux"
                }
            ]
        }
    })
]
```

Without specifying [`insert`](#insert-option-for-units) or [`append`](#append-option-for-units)/[`prepend`](#prepend-option-for-units) the following import statement is getting inserted after the last import statement:
```js
import bar, { baz as qux } from "./path/to/foo.js";
```

#### Basic CJS Statement via [`createModule`](#createmodule-option-for-units)
CJS Imports are also supported. But this time the [`type`](#type-option-for-units) needs to be specified. Also a variable name has to be set. In this example the [`const`](#const-option-for-units) _foo_. (Other declaration types are: [`let`](#let-option-for-units), [`var`](#var-option-for-units) and [`global`](#global-option-for-units))

```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            createModule: "./path/to/foo.js", 
            type: "cjs",
            const: "foo"
        }
    })
]
```

Result:
```js
const foo = require("./path/to/foo.js");
```

#### Basic Dynamic Import Statement via [`createModule`](#createmodule-option-for-units)
Almost exactly the same (only the [`type`](#type-option-for-units) differs) goes for dynamic imports:

```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            createModule: "./path/to/foo.js", 
            type: "dynamic",
            let: "foo"
        }
    })
]
```

Result:
```js
let foo = await import("./path/to/foo.js");
```

#### Manual Statement creation via [`addCode`](#addcode-option-for-units)
If this is all to much predetermination, the [`addCode`](#addcode-option-for-units) method is a very handy feature. It allows to inject a string containing the code snippet (most likely an import statement). Which is very different but behaves exactly the same in other regards ([inserting](#insert-option-for-units), [appending](#append-option-for-units)/[prepending](#prepend-option-for-units), [replacing](#replace-option-for-units)).

Example:
```js
const customImport = `
let foobar;
import("fs").then(fs => fs.readFileSync("./path/to/foobar.txt"));
`;

plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            addCode: customImport,
        }
    })
]
```

Result:
```js
let foobar;
import("fs").then(fs => foobar = fs.readFileSync("./path/to/foobar.txt"));
```

The [`addCode`](#addcode-option-for-units) value can contain any code you like. You probably should not get too creative. It is designed to add import statements and it gets appended to existing statements. 


#### Creating an Import Statement, appended after another statement:
Example Target module: 
```js
import { foo } from "bar";
```

```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            createModule: "./path/to/baz.js", 
            actions: {
                "select": "defaultMembers",
                "add": "* as qux"
            },
            append: {
                module: "bar"
            }
        }
    })
]
```  

Result:
```js
import { foo } from "bar";
import * as qux from "./path/to/baz.js";
```

#### Creating an Import Statement, prepended before another statement:
Example:
```js
import { foo } from "bar";
```

```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            createModule: "./path/to/baz.js", 
            actions: {
                "select": "defaultMembers",
                "add": "* as qux"
            },
            prepend: {
                module: "bar"
            }
        }
    })
]
```  

#### Creating an Import Statement by replacing another statement:
Example:
```js
import { foo } from "bar";
```

```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            createModule: "./path/to/baz.js", 
            actions: {
                "select": "defaultMembers",
                "add": "* as qux"
            },
            replace: {
                module: "bar"
            }
        }
    })
]
```  

Result:
```js
import * as qux from "./path/to/baz.js";
```


### Removing an Import Statement
If we take the example from before:
```js
import { foo } from "bar";
import * as qux from "./path/to/baz.js";
```

Module _bar_ can be removed like this:
```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            module: "bar",
            actions: [
                {
                    remove: null,
                }
            ]
        }
    })
]
```

#### Shorthand Method
The above can be shortened by a lot as the removal is the only action and the value is not relevant:
```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            module: "bar",
            actions: "remove"
        }
    })
]
```

### Changing the module
In this example there is a relative path that should be changed to a non relative module.
```js
import foo from "./path/to/bar.js";
```

This can be achieved like this:
```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            module: "bar.js",
            actions: {
                select: "module",
                rename: "bar"
            }
        }
    })
]
```

Result:
```js
import foo from "bar";
```

### Addressing the (default) members
`defaultMembers` and `members` are using the exact same methods. It is only important to keep in mind to address default members with `select: "defaultMembers"` or for a specific one `select: "defaultMember"`; for members `select: "members"` and `select: "member"`. 

#### Adding a defaultMember
Example:
```js
import foo from "bar";
```  

A default Member can be added like this:
```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            module: "bar",
            actions: {
                select: "defaultMembers",
                add: "* as baz"
            }
        }
    })
]
```

Result:
```js
import foo, * as baz from "bar";
```

Adding multiple members, again for the same example:
```js
import foo from "bar";
```  

```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            module: "bar",
            actions: {
                select: "members",
                add: [
                    "baz",
                    "qux"
                ]
            }
        }
    })
]
```

Result:
```js
import foo, { baz, qux } from "bar";
```

#### Removing a member
```js
import { foo, bar, baz } from "qux";
```  

```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            module: "qux",
            actions: {
                select: "member",
                name: "bar",
                remove: null
            }
        }
    })
]
```

Result:
```js
import { foo, baz } from "qux";
``` 

#### Removing a group of members
```js
import foo, { bar, baz } from "qux";
```  

```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            module: "qux",
            actions: {
                select: "members",
                remove: null
            }
        }
    })
]
```

Result:
```js
import foo from "qux";
``` 

#### Changing a defaultMember name
Example:
```js
import foo from "bar";
```  

```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            module: "bar",
            actions: {
                select: "defaultMember",
                name: "foo",
                rename: "baz"
            }
        }
    })
]
```

##### Renaming but keeping the alias
Example:
```js
import { foo as bar } from "baz";
```

By default the alias gets overwritten, but this can be prevented.
```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            module: "bar",
            actions: {
                select: "member",
                name: "foo",
                rename: "qux"
                keepAlias: true
            }
        }
    })
]
```  

Result:
```js
import { qux as bar } from "baz";
```

##### Addressing an alias
Aliases can also be addressed (_set_, _renamed_ and _removed_). All possibilities demonstrated at once via [chaining](#chaining).

Example:
```js
import { foo as bar, baz as qux, quux } from "quuz";
```  

```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            module: "bar",
            actions: [
                {
                    select: "member",
                    name: "foo",
                    alias: null,
                    remove: null // redundant **
                },
                {
                    select: "member",
                    name: "baz",
                    alias: "corge"
                },
                {
                    select: "member",
                    name: "quux",
                    alias: "grault"
                },
            ]
        }
    })
]

// ** remove can be set, but if the alias
//    is null, this is redundant
//    (the option is only there to keep the
//    method syntactically consistent)
```  

Result:
```js
import { foo, baz as corge, quux as grault } from "quuz";
```

## General Hints

### Chaining
It is possible to address every part of a statement in one go. The order usually doesn't matter. But one part should not be selected twice, which might produce unwanted results. To address every part of a [`unit`](#units) with its [`actions`](#actions-option-for-units) can be as complex as follows.

Example Statement:
```js
import foo, { bar } from "baz";
```

```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            module: "baz", 
            actions: [
                {
                    select: "defaultMember",
                    name: "foo",
                    remove: null
                },
                {
                    select: "defaultMembers",
                    add: "qux"
                },
                {
                    select: "member",
                    name: "bar",
                    alias: "quux"
                },
                {
                    select: "members",
                    add: [
                        "quuz",
                        "corge"
                    ] 
                },
                {
                    select: "module",
                    rename: "grault"
                }
            ]
        }
    })
]
```

Result:
```js
import qux, { bar as quux, quuz, corge } from "grault";
```

This is in no way an efficient, but an example to show the complexity modifications are allowed to have. 

### Array and Object shortening
As a general rule, all arrays can be unpacked if only one member is inside. Objects with meaningless values, can be passed as a string, if syntactically allowed. An example is shown [here](#shorthand-method).


## Debugging

### Show Diff
A general hint while creating a `rollup.config.js` [configuration file](https://www.rollupjs.org/guide/en/#configuration-files): it is useful to enable [`diff`](#show-diff) logging to see how the source file is actually getting manipulated.

```js
plugins: [
    importManager({
        showDiff: null,
        units: {
            //...
        }
    })
]
```

This will log the performed changes to the console.

### Debugging Files
To visualize the properties of a specific file, it can help to stop the building process and throw a `DebuggingError`.

```js
plugins: [
    importManager({
        include: "**/my-file.js"
        debug: null,
        units: {
            //...
        }
    })
]
```
Or more verbose:

```js
plugins: [
    importManager({
        include: "**/my-file.js"
        debug: "verbose",
        units: {
            //...
        }
    })
]
```

In both cases the [`include`](#include) keyword is also passed. Otherwise the debug key would make the build process stop at the very first file it touches (if there is only one file involved at all, it is not necessary to pass it).

### Debugging Units
Also a single unit can be debugged. The keyword can be added to the existing list in an [actions](#actions-option-for-units) object.

```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            module: "foo",
            actions: {
                select: "defaultMember",
                name: "foo",
                rename: "baz"
                debug: null
            }
        }
    })
]
```

Or as a shorthand, if it is the only option:
```js
plugins: [
    importManager({
        units: {
            file: "**/my-file.js",
            module: "foo",
            actions: "debug"
        }
    })
]
```

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2022, UmamiAppearance

