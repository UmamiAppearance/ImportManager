'use strict';

var acorn = require('acorn');
var acornWalk = require('acorn-walk');
var MagicString = require('magic-string');
var colorette = require('colorette');
var os = require('os');

/**
 * Custom error to tell the user, that it is
 * not possible to select a specific unit.
 */
class MatchError extends Error {
    constructor(message) {
        super(message);
        this.name = "MatchError";
    }
}

/**
 * Custom error to abort the building process
 * for retrieving information.
 */
class DebuggingError extends Error {
    constructor(message) {
        if (typeof message !== "string") {
            message = JSON.stringify(message, null, 4);
        }
        super(message);
        this.name = "DebuggingError";
    }
}

/**
 * Creates methods for unit manipulation to
 * be attached to a requested unit.
 */
class ImportManagerUnitMethods {

    /**
     * Stores the handed over unit and creates
     * an update method.
     * @param {Object} unit - The unit a user requests 
     * @param {*} es6NodeToUnit - Method to analyze a 
     */
    constructor(unit, es6NodeToUnit) {
        this.unit = unit;

        // After a change in the code of a es6 unit is made
        // it gets analyzed again, which is very verbose,
        // but prevents errors. The "MagicString" does not
        // contain multiple changes at a time. The analysis
        // function is the same as for the initial file
        // analyses and gets handed over by the main class.

        this.updateUnit = () => {

            const unit = es6NodeToUnit(
                this.unit.code.toString(),
                this.unit.start,
                this.unit.end
            );

            Object.assign(this.unit, unit);

        };
    }


    /**
     * Makes sure, that the processed unit is of type 'es6'. 
     */
    #ES6only() {
        if (this.unit.type !== "es6") {
            throw new Error("This method is only available for ES6 imports.");
        }
    }  

    /**
     * Changes the module part of a import statement.
     * @param {string|function} name - The new module part/path or a function that receives the module's full (raw) name/path - including quotes if present - which must return the new module part/path.
     * @param {string} modType - Module type (string|raw).
     */
    renameModule(name, modType) {

        if (typeof name === "function") {
            name = name(this.unit.module.rawName);
            if (typeof name !== "string") {
                throw new TypeError("If a function is provided the output must be a string.");
            }
        }

        else if (modType === "string") {
            if (!this.unit.module.quotes) {
                this.unit.module.quotes = "\"";
            }
            const q = this.unit.module.quotes;
            name = q + name + q;
        }
        
        else if (modType !== "raw") {
            throw new TypeError(`Unknown modType '${modType}'. Valid types are 'string' and 'raw'.`);
        }
        
        this.unit.code.overwrite(this.unit.module.start, this.unit.module.end, name);

        if (this.unit.type === "es6") {
            this.updateUnit();
        }
    }


    /**
     * Adds default members to the import statement.
     * @param {string[]} names - A list of default members to add.
     */
    addDefaultMembers(names) {
        this.#ES6only();

        let start; 
        let defStr;
        let memberPart = null;

        // handle the case if default members already exist
        if (this.unit.defaultMembers.count > 0) {
            start = this.unit.defaultMembers.entities.at(-1).absEnd;
            defStr = this.unit.defaultMembers.separator 
                   + names.join(this.unit.defaultMembers.separator);
            this.unit.code.appendRight(start, defStr);
        }

        // handle the case if default members do not exist, 
        // and also no non default members (the addition
        // needs to be appended left, otherwise is
        // interferes with the module part)
        else if (this.unit.members.count === 0) {
            start = this.unit.module.start;
            defStr = names.join(this.unit.members.separator);
            memberPart = defStr;
            defStr += " from ";
            this.unit.code.appendLeft(start, defStr);
        }

        // handle the case if default members do not exist, 
        // but non default members
        else {
            start = this.unit.members.start;
            defStr = names.join(this.unit.defaultMembers.separator)
                   + this.unit.members.separator;
            this.unit.code.appendRight(start, defStr);
        }
        
        this.updateUnit(memberPart);
    }


    /**
     * Adds non default members to the import statement.
     * @param {string[]} names - A list of members to add. 
     */
    addMembers(names) {
        this.#ES6only();

        let start; 
        let memStr;
        let memberPart = null;
        
        // handle the case if members already exist
        if (this.unit.members.count > 0) {
            start = this.unit.members.entities.at(-1).absEnd;
            memStr = this.unit.members.separator 
                   + names.join(this.unit.members.separator);
            this.unit.code.appendRight(start, memStr);
        }

        // handle the case if members do not exist, 
        // and also no default members (the addition
        // needs to be appended left, otherwise is
        // interferes with the module part)
        else if (this.unit.defaultMembers.count === 0) {
            start = this.unit.module.start;
            memStr = "{ "
                   + names.join(this.unit.members.separator)
                   + " }";
            memberPart = memStr;
            memStr += " from ";
            this.unit.code.appendLeft(start, memStr);
        }

        // handle the case if members do not exist, 
        // but default members
        else {
            start = this.unit.defaultMembers.end;
            memStr = this.unit.defaultMembers.separator
                   + "{ "
                   + names.join(this.unit.members.separator)
                   + " }";
            this.unit.code.appendRight(start, memStr);
        }

        this.updateUnit(memberPart);
    }


    /**
     * Internal helper method to get the member type.
     * The user input distinguishes between member/defaultMember
     * and the plural versions of them. To prevent confusion in the
     * process of selecting the different styles in the unit, this
     * methods adds an "s" to the given string if missing and selects
     * the requested type.
     * @param {*} memberType 
     * @returns 
     */
    #getType(memberType) {
        if (memberType.at(-1) !== "s") {
            memberType += "s";
        }
        return this.unit[memberType];
    }


    /**
     * Internal helper method to find a specific member
     * or default member.
     * @param {string} memberType - member/defaultMember. 
     * @param {string} name - (default) member name. 
     * @returns {Object} - (default) member object.
     */
    #findMember(memberType, name) {
        if (!name) {
            throw new Error(`${memberType} name must be set.`);
        }
        const filtered = this.#getType(memberType).entities.filter(m => m.name === name);
        if (filtered.length !== 1) {
            throw new MatchError(`Unable to locate ${memberType} with name '${name}'`);
        }
        return filtered[0];
    }


    /**
     * Removes a (default) member.
     * @param {string} memberType - member|defaultMember
     * @param {string} name - Name of the (default) member 
     */
    removeMember(memberType, name) {
        this.#ES6only();

        const member = this.#findMember(memberType, name);

        if (this.#getType(memberType).count === 1) {
            this.removeMembers(memberType);
        } 

        else {
            let start;
            let end;
            
            if (member.next) {
                start = member.start;
                end = member.next;
            } else if (member.last) {
                start = member.last;
                end = member.absEnd;
            } else {
                start = member.start;
                end = member.absEnd;
            }

            this.unit.code.remove(start, end);  
            this.updateUnit();

        }
    }


    /**
     * Removes an entire group of members or default members.
     * @param {string} membersType - member(s)|defaultMember(s) 
     */
    removeMembers(membersType) {
        this.#ES6only();

        const isDefault = membersType.indexOf("default") > -1;

        const members = this.#getType(membersType);
        const others = this.#getType(isDefault ? "members" : "defaultMembers");

        let memberPart = null;
        if (others.count > 0) {
            
            const start = !isDefault 
                ? this.unit.defaultMembers.entities.at(-1).end
                : members.start;

            this.unit.code.remove(start, members.end);
        }

        else {
            this.unit.code.remove(members.start, this.unit.module.start);
            memberPart = "";
        }

        this.updateUnit(memberPart);
    }


    /**
     * Renames a single (default) member. The alias
     * can be kept or overwritten. 
     * @param {string} memberType - member|defaultMember 
     * @param {string} name - The (default) member to rename.
     * @param {string} newName - The new name of the (default) member.
     * @param {boolean} keepAlias - True if the alias shall be untouched. 
     */
    renameMember(memberType, name, newName, keepAlias) {
        this.#ES6only();

        const member = this.#findMember(memberType, name);
        let end;

        if (keepAlias) {
            end = member.end;
        } else {
            end = member.absEnd;
        }
        
        this.unit.code.overwrite(member.start, end, newName);
        this.updateUnit();
    }


    /**
     * Changes the alias. Changing can be renaming
     * setting it initially or removing. 
     * @param {string} memberType - member|defaultMember
     * @param {string} name - (default) member name
     * @param {string} [set] - A new name or nothing for removal
     */
    setAlias(memberType, name, set) {
        this.#ES6only();
        
        if (memberType === "defaultMember") {
            if (name !== "*") {
                throw new TypeError("The modification of a default member alias is only possible if the module is an asterisk. For other changes use the 'rename' method.");
            } else if (!set) {
                throw new TypeError("Removing the alias of an asterisk is invalid. Use the 'rename' method for other changes.");
            }
        }
        const aliasStr = set ? `${name} as ${set}` : name;
        this.renameMember(memberType, name, aliasStr, false);
        this.updateUnit();
    }


    /**
     * Method to call after a unit was completely removed
     * or replaced, to prevent matching it again afterwards.
     */
    makeUntraceable() {
        this.unit.id = `(deleted) ${this.unit.id}`;
        this.unit.hash = `(deleted) ${this.unit.hash}`;
        this.unit.module.name = `(deleted) ${this.unit.module.name}`;
    }


    /**
     * Debugging method to stop the building process
     * and list this unit properties.
     */
    log(error=true) {
        const unit = { ...this.unit };
        delete unit.methods;
        unit.code = [ unit.code.toString() ];
        if (error) {
            throw new DebuggingError(unit);
        }
        return unit;
    }
}

/**
 * [ImportManager]{@link https://github.com/UmamiAppearance/ImportManager}
 *
 * The core class for the rollup-plugin-import-manager,
 * which can never the less be used standalone.  
 * It handles code analysis, creates units from import
 * statements, attaches methods to the units and more.
 * 
 * @version 0.4.3
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license MIT
 * @see https://github.com/UmamiAppearance/rollup-plugin-import-manager
 */




class ImportManager {

    /**
     * The constructor creates a class import
     * object and kicks of the code analysis.
     * @param {string} source - The unmodified source code.
     * @param {string} filename - The path/name of the input file (used for hash generation). 
     * @param {object} [warnSpamProtection] - A Set which contains all previously printed warning hashes.
     * @param {boolean} [warnings=true] - Pass false to suppress warning messages.
     * @param {object} [pluginInstance] - Rollup plugin instance if used as a plugin.
     */
    constructor(source, filename, warnSpamProtection=new Set(), warnings=true, pluginInstance=null) {

        if (!source) {
            source="";
        }

        if (!filename) {
            filename = String(simpleHash(source));
        }

        this.scopeMulti = 1000;

        this.imports = {
            es6: {
                count: 0,
                idScope: 1 * this.scopeMulti,
                searched: false,
                units: []
            },
            dynamic: {
                count: 0,
                idScope: 2 * this.scopeMulti,
                searched: false,
                units: []
            },
            cjs: {
                count: 0,
                idScope: 3 * this.scopeMulti,
                searched: false,
                units: []
            }

        };

        // id scope lookup table with the associated type
        this.idTypes = Object.fromEntries(Object.entries(this.imports).map(([k, v]) => [v.idScope, k]));

        this.code = new MagicString(source);

        this.hashList = {};
        this.filename = filename.split(process.cwd()).at(1);
        this.warnSpamProtection = warnSpamProtection;
        
        this.parsedCode = acorn.parse(source, {
            ecmaVersion: "latest",
            sourceType: "module"
        });

        if (!warnings) {
            this.warning = () => {
                return;
            };
        }
        
        else {
            if (pluginInstance) {
                this.warn = pluginInstance.warn;
            } else {
                this.warn = msg => {
                    console.warn(
                        colorette.bold(colorette.yellow(`ImportManager: ${msg}`))
                    );
                };
            }
        }
        
        this.analyze();
    }


    /**
     * Analyzes the source and stores all import
     * statements as unit objects in the object
     * "this.imports"
     */
    analyze() {
  
        let cjsId = this.imports.cjs.idScope;
        let cjsIndex = 0;

        let dynamicId = this.imports.dynamic.idScope;
        let dynamicIndex = 0;

        let es6Id = this.imports.es6.idScope;
        let es6Index = 0;

        this.parsedCode.body.forEach(node => {

            if (node.type === "ImportDeclaration") {
                const unit = this.#es6NodeToUnit(node);
                if (!unit) {
                    this.#unitCreationFailedWarning(node);
                    return;
                }
                
                unit.id = es6Id ++;
                unit.index = es6Index ++;
                unit.hash = this.#makeHash(unit);
                this.imports.es6.units.push(unit);
                this.imports.es6.count ++;
            }
        
            else if (node.type === "VariableDeclaration" ||
                     node.type === "ExpressionStatement")
            {
                acornWalk.full(node, part => {

                    if (part.type === "ImportExpression") {
                        const unit = this.#dynamicNodeToUnit(node, part);
                        if (!unit) {
                            this.#unitCreationFailedWarning(node);
                            return;
                        }
                        
                        unit.id = dynamicId ++;
                        unit.index = dynamicIndex ++;
                        unit.hash = this.#makeHash(unit);
                        this.imports.dynamic.units.push(unit);
                        this.imports.dynamic.count ++;
                    }
                    
                    else if (part.type === "Identifier" && part.name === "require") {
                        const unit = this.#cjsNodeToUnit(node);
                        if (!unit) {
                            this.#unitCreationFailedWarning(node);
                            return;
                        }
                        
                        unit.id = cjsId ++;
                        unit.index = cjsIndex ++;
                        unit.hash = this.#makeHash(unit);
                        this.imports.cjs.units.push(unit);
                        this.imports.cjs.count ++;
                    }

                });
            }
        });
    }

    /**
     * Helper method to generate a very simple hash
     * from the unit properties.
     * @param {Object} unit - Unit to generate a hash from. 
     * @returns {string} - a hash as a string 
     */
    #makeHash(unit) {

        const makeInput = (unit) => {
            
            const joinProps = list => {
                list.forEach(member => {
                    inputStr += member.name;
                    if (member.alias) {
                        inputStr += member.alias.name;
                    }
                });
            }; 

            let inputStr = unit.module.name
                         + unit.type
                         + this.filename;
            
            if (unit.members) {
                joinProps(unit.members.entities);
            }

            if (unit.defaultMembers) {
                joinProps(unit.defaultMembers.entities);
            }

            return inputStr;
        };

        const input = makeInput(unit);
        let hash = String(simpleHash(input));

        // handle duplicates
        if (hash in this.hashList) {
            
            if (unit.module.name !== "N/A") {
                this.warning(`It seems like there are multiple imports of module '${unit.module.name}'. You should examine that.`);
            }
            
            for (let nr=2;; nr++) {
                const nHash = `${hash}#${nr}`;
                if (!(nHash in this.hashList)) {
                    hash = nHash;
                    break;
                }
            }
        }
        
        this.hashList[hash] = unit.id;

        return hash;
    }


    /**
     * Method to generate a unit object from an acorn
     * node, originated from an ES6 Import Statement. 
     * @param {Object|string} node - acorn node or es6 import statement string. 
     * @param {number} [oStart] - For updating units the original start index has to be passed. 
     * @param {number} [oEnd] - For updating units the original end index has to be passed.
     * @returns {object} - Import Manager Unit Object.
     */
    #es6NodeToUnit(node, oStart, oEnd) {
        if (!node) return;

        let code;
        if (typeof node === "string") {
            code = node;
            try {
                node = acorn.parse(node, {
                    ecmaVersion: "latest",
                    sourceType: "module"
                }).body.at(0);
            } catch(e) {
                if (e instanceof SyntaxError) {
                    let msg = `${os.EOL}${os.EOL}Generated Code Snippet${os.EOL}----------------------${os.EOL}`;
                    let { line, column } = e.loc;
                    line --;
                    code.toString().split(os.EOL).forEach((l, i) => {
                        msg += `l${os.EOL}`;
                        if (line === i) {
                            msg += colorette.bold(" ".repeat(column) + `^${os.EOL}`);
                        }
                    });


                    throw new SyntaxError(msg);
                }
                throw new Error(e);
            }
        } else {
            code = this.code.slice(node.start, node.end);
        }
        
        const mem = {
            defaultMembers: {
                count: 0,
                entities: []
            },
            members: {
                count: 0,
                entities: []
            }
        };

        if (node.specifiers) {
            for (const spec of node.specifiers) {
                
                const memType = spec.type === "ImportSpecifier" ? "members" : "defaultMembers";
                const index = mem[memType].count;
                const hasAlias = spec.local.start !== spec.start;

                const start = spec.start - node.start;
                let end;
                if (!hasAlias) {
                    end = spec.end - node.start;
                } else {
                    end = (memType === "members") ? spec.imported.end-node.start : start+1;
                }
                const name = code.slice(start, end);
                

                const member = {
                    index,
                    name,
                    start,
                    end,
                    absEnd: spec.end - node.start
                };

                if (hasAlias) {
                    member.alias = {
                        name: spec.local.name,
                        start: spec.local.start - node.start,
                        end: spec.local.end - node.start
                    };
                }

                if (index > 0) {
                    member.last = mem[memType].entities[index-1].absEnd;
                    mem[memType].entities[index-1].next = member.start;
                }
                
                mem[memType].entities.push(member);
                mem[memType].count ++;

            }
        }

        if (mem.members.count > 0) {
            const nonDefaultMatch = code.match(/{[\s\S]*?}/);
            mem.members.start = nonDefaultMatch.index;
            mem.members.end = mem.members.start + nonDefaultMatch.at(0).length;    
        }

        if (mem.defaultMembers.count > 0) {
            mem.defaultMembers.start = mem.defaultMembers.entities.at(0).start;
            mem.defaultMembers.end = (mem.members.count > 0)
                ? mem.members.start
                : mem.defaultMembers.entities.at(-1).absEnd;  
        }

        // store the first separator of the non default
        // and default members for a consistent style
        // if one wants to add members
        mem.defaultMembers.separator = (mem.defaultMembers.count > 1) ? code.slice(mem.defaultMembers.entities[0].absEnd, mem.defaultMembers.entities[0].next) : ", ";
        mem.members.separator = (mem.members.count > 1) ? code.slice(mem.members.entities[0].absEnd, mem.members.entities[0].next) : ", ";


        const module = {
            name: node.source.value.split("/").at(-1),
            start: node.source.start - node.start,
            end: node.source.end - node.start,
            type: "string",
            quotes: node.source.raw.at(0),
            rawName: node.source.raw
        };
        
        const unit = {
            code: new MagicString(code),
            defaultMembers: mem.defaultMembers,
            members: mem.members,
            module,
            start: oStart || node.start,
            end: oEnd || node.end,
            type: "es6"
        };

        return unit;
    }


    /**
     * Method to generate a unit object from an acorn
     * node, originated from a Dynamic Import Statement.
     * @param {object} node - Complete acorn node.
     * @param {object} importObject - Actual import part.
     * @returns {object} - Import Manager Unit Object.
     */
    #dynamicNodeToUnit(node, importObject) {
        if (!node) return;

        const code = this.code.slice(node.start, node.end);

        const module = {
            name: importObject.source.value.split("/").at(-1) || "N/A",
            start: importObject.source.start - node.start,
            end: importObject.source.end - node.start,
            rawName: importObject.source.raw
        };

        if (importObject.source.type === "Literal") {
            module.type = "string";
            module.quotes = importObject.source.raw.at(0);
        } else {
            module.type = "raw";
        }

        const unit = {
            code: new MagicString(code),
            module,
            start: node.start,
            end: node.end,
            type: "dynamic",
        };

        return unit;
    }


    /**
     * Method to generate a unit object from an acorn
     * node, originated from a Common JS Import Statement.
     * @param {object} node - Complete acorn node.
     * @returns {object} - Import Manager Unit Object.
     */
    #cjsNodeToUnit(node) {
        if (!node || !node.declarations) return;

        const code = this.code.slice(node.start, node.end);

        const modulePart = node.declarations.at(0).init.arguments.at(0); // TODO: test if this is robust
        const module = {
            name: modulePart.value.split("/").at(-1) || "N/A",
            start: modulePart.start - node.start,
            end: modulePart.end - node.start,
            rawName: modulePart.raw
        };

        if (modulePart.type === "Literal") {
            module.type = "string";
            module.quotes = modulePart.raw.at(0);
        } else {
            module.type = "raw";
        }

        const unit = {
            code: new MagicString(code),
            module,
            start: node.start,
            end: node.end,
            type: "cjs",
        };

        return unit;
    }

    //              ___________________              //
    //              select unit methods              //

    /**
     * Helper method to list available units
     * in case of a MatchError.
     * @param {Object[]} units - Array of unit objects to list.
     * @returns {string} - Message for logging.
     */
    #listUnits(units) {
        const msgArray = [""];
        
        units.forEach(unit => {
            msgArray.push(
                "___",
                `ID:   ${unit.id}`,
                `HASH: ${unit.hash}`, 
                `NAME: ${unit.module.name}`,
                `STATEMENT:${os.EOL}${unit.code.toString()}${os.EOL}`
            );
        });
        return msgArray.join(os.EOL) + os.EOL;
    }


    /**
     * Helper method to list all available units.
     * @returns {string} - Message string.
     */
    #listAllUnits() {
        let msg = "";
        for (const type in this.imports) {
            msg += this.#listUnits(this.imports[type].units);
        }
        return msg;
    }

    
    /**
     * Selects a unit by its module name.
     * @param {string|Object} name - Module name as a string or a RegExp object. 
     * @param {string|string[]} [type] - Pass the strings "cjs", "dynamic", or "es6". Multiple types can be passed as as an array of those strings
     * @param {boolean} allowNull - If false the module must be found or a MatchError is thrown.
     * @param {boolean} [rawName=false] - If true the name is searched in the full raw module part (including quotes if present).
     * @returns {Object} - An explicit unit.
     */
    selectModByName(name, type, allowNull, rawName=false) {
        if (!name) {
            throw new TypeError("Pass a name as a string or a RegExp object for selecting a module by name");
        }

        let unitList = [];

        // if the type is not specified use all types (cjs|dynamic|es6)
        if (!type) {
            type = Object.keys(this.imports);
        } else if (!Array.isArray(type)) {
            type = [type];
        }

        // if an empty array was passed, also use all types
        if (!type.length) {
            type = Object.keys(this.imports);
        }

        // test types for validity
        for (const t of type) {
            if (!(t in this.imports)) {
                throw new TypeError(`Invalid type: '${t}' - Should be one or more of: 'cjs', 'dynamic', 'es6'.`);
            }

            // push all available imports in one list
            if (this.imports[t].count > 0) {
                unitList.push(...this.imports[t].units);
            }
        }

        // filter for unit name
        const units = unitList.filter(unit => {

            const nameLookup = rawName ? unit.module.rawName : unit.module.name;

            const match = name instanceof RegExp 
                ? name.test(nameLookup)
                : nameLookup.indexOf(name) > -1;

            // ignore deleted units
            if (match && (/^\(deleted\)/).test(unit.module.name)) {
                return false;
            }

            return match;
        });

        // throw errors if the match is not one
        // (if no filename was set a null match
        // is also valid)
        if (units.length === 0) {
            if (allowNull) {
                return null;
            }
            let msg = this.#listUnits(unitList);
            let typeStr;

            if (type.length === 1) {
                typeStr = type + "-imports";
            } else if (type.length < Object.keys(this.imports).length) { 
                typeStr = type.join("-imports or ") + "-imports";
            } else {
                typeStr = "any group";
            }

            msg += `___${os.EOL}Unable to locate import statement with name: '${name}' in ${typeStr}`;
            throw new MatchError(msg);
        }
        
        else if (units.length > 1) {
            let msg = this.#listUnits(units);
            msg += `___${os.EOL}Found multiple matches for '${name}'. Try matching via 'rawName'. If no other solution is available you may select via 'hash'.`;
            throw new MatchError(msg);
        }

        // finally add methods for manipulation to the unit
        const unit = units[0];
        unit.methods = new ImportManagerUnitMethods(unit, this.#es6NodeToUnit);

        return unit;
    }


    /**
     * Selects a unit by its id. Should only be used
     * for testing purposes.
     * @param {number} id - Unit id. 
     * @param {boolean} allowNull - If false the module must be found or a MatchError is thrown.
     * @returns {Object} - An explicit unit.
     */
    selectModById(id, allowNull) {
        if (!id) {
            throw new TypeError("The id must be provided");
        }
        
        // get the type by the id scope
        const type = this.idTypes[ Math.floor(id / this.scopeMulti) * this.scopeMulti ];

        // if it is not possible to extract a type by the scope,
        // the id is invalid 
        if (!type) {
            // generate an ascending list of valid ids
            const ascIds = Object.keys(this.idTypes).sort();
            throw new TypeError(`Id '${id}' is invalid. Ids range from ${ascIds.at(0)} to ${ascIds.at(-1)}+`);
        }

        // filter the units of the given type for the id
        const units = this.imports[type].units.filter(n => n.id == id);

        // if null matches are allowed return null 
        // if no match was found, otherwise raise
        // a match error
        if (units.length === 0) {
            if (allowNull) {
                return null;
            }
            let msg = this.#listUnits(this.imports[type].units);
            msg += `___${os.EOL}Unable to locate import statement with id: '${id}'`;
            throw new MatchError(msg);
        }

        // add unit methods
        const unit = units[0];
        unit.methods = new ImportManagerUnitMethods(unit, this.#es6NodeToUnit);

        return unit;
    }

    /**
     * Selects a unit by its hash. The hash will change
     * if the unit changes its properties in the source
     * code (like members, alias, etc.)
     * All hashes for one file are stored in a list, with
     * the corresponding id. The id-match method can there-
     * fore be used, to find the unit.
     * @param {string} hash - The hash string of the unit.
     * @param {boolean} allowNull - If false the module must be found or a MatchError is thrown.
     * @returns {object} - An explicit unit.
     */
    selectModByHash(hash, allowNull) {
        if (!(hash in this.hashList)) {
            if (allowNull) {
                return null;
            }
            let msg = this.#listAllUnits(); 
            msg += `___${os.EOL}Unable to locate import statement with hash '${hash}'`;
            throw new MatchError(msg);
        }

        return this.selectModById(this.hashList[hash]);
    }

    //         ___________________________________________        //
    //         methods for unit creation, replacement, etc.       //

    /**
     * All manipulation via unit method is made on the
     * code slice of the unit. This methods writes it
     * to the code instance. 
     * @param {Object} unit - Unit Object. 
     */
    commitChanges(unit) {
        this.code.overwrite(unit.start, unit.end, unit.code.toString());
    }


    /**
     * Removes a unit from the code instance.
     * The action must not be committed. 
     * @param {Object} unit - Unit Object.
     * @returns {string} - Unit code, for further processing.
     */
    remove(unit) {
        let charAfter = this.code.slice(unit.end, unit.end+1);
        let end = unit.end;
        
        if (charAfter === "\r") {
            end++;
            charAfter = this.code.slice(end, end+1);
        }
        if (charAfter === "\n") {
            end++;
        }
        
        const code = this.code.slice(unit.start, end);

        this.code.remove(unit.start, end);
        unit.methods.makeUntraceable();
        this.imports[unit.type].count --;
        
        return code;
    }

    /**
     * Helper method to declare a variable.
     * @param {string} declarator - const|let|var|global 
     * @param {string} varname - Variable Name. 
     * @returns {string} - Declarator + Varname + Equal Sign.
     */
    #genDeclaration(declarator, varname) {
        let declaration;
        if (declarator === "global") {
            declaration = varname;
        } else {
            declaration = `${declarator} ${varname}`;
        }
        return declaration;
    }

    /**
     * Generates a CJS Import Statement.
     * @param {string} module - Module (path).
     * @returns {string} - CJS Import Statement.
     */
    makeCJSStatement(module, declarator, varname) {
        const declaration = this.#genDeclaration(declarator, varname);
        return `${declaration} = require("${module}");${os.EOL}`;
    }

    /**
     * Generates a Dynamic Import Statement.
     * @param {string} module - Module (path).
     * @returns {string} - CJS Import Statement.
     */
    makeDynamicStatement(module, declarator, varname) {
        const declaration = this.#genDeclaration(declarator, varname);
        return `${declaration} = await import("${module}");${os.EOL}`;
    }
    

    /**
     * Generates an ES6 Import Statement.
     * @param {string} module - Module (path).
     * @param {string[]} defaultMembers - Default Member Part.
     * @param {string[]} members - Member Part.
     * @returns {string} - ES6 Import Statement.
     */
    makeES6Statement(module, defaultMembers, members) {
        const memberStrArray = [];
        
        if (defaultMembers.length) {
            memberStrArray.push(
                defaultMembers.join(", ")
            );
        }

        if (members.length) {
            memberStrArray.push(
                "{ " + members.join(", ") + " }"
            );
        }

        let memberPart = memberStrArray.join(", ");
        if (memberPart) {
            memberPart += " from ";
        }

        return `import ${memberPart}'${module}';${os.EOL}`;
    }


    /**
     * Inserts an Import Statement to the top
     * of the file or after the last found import
     * statement.
     * @param {string} statement - Import Statement.
     * @param {number} pos - 'top' or 'bottom'
     */
    insertStatement(statement, pos, type) {

        let index = 0;

        if (pos !== "top" && this.imports[type].count > 0) {
            index = this.imports[type].units.at(-1).end;

            // move the index if the following char is a newline
            // (if the line was removed in an earlier operation
            // this will throw an error, don't do any change in
            // this case

            let nextChar;
            try {
                nextChar = this.code.slice(index, index+1);
            } catch {
                nextChar = null;
            }

            if (nextChar === "\r") {
                index ++;
            }
            if (nextChar === "\n") {
                index ++;
            }
        }
        
        else {
            // find the first meaningful (not a comment)
            // code and use the start as insertion point
            
            index = this.parsedCode.body.at(0).start;
        }
        
        this.code.appendRight(index, statement);
    }


    /**
     * Inserts an Import Statement before or after
     * a given unit. Also an existing statement can be
     * replaced.
     * @param {Object} unit - Unit Object 
     * @param {string} mode - 'append'|'prepend'|'replace' 
     * @param {string} statement - Import Statement. 
     */
    insertAtUnit(unit, mode, statement) {

        let index;
        if (mode === "append") {
            index = unit.end;
            if (this.code.slice(index, index+1) === "\r") {
                index ++;
            }
            if (this.code.slice(index, index+1) === "\n") {
                index ++;
            }
            this.code.appendRight(index, statement);
        }
        
        else if (mode === "prepend") {
            index = unit.start;
            this.code.prependLeft(index, statement);
        }

        else if (mode === "replace") {
            // remove new line from statement
            statement = statement.slice(0, -1);
            
            this.code.overwrite(unit.start, unit.end, statement);
            unit.methods.makeUntraceable();
            this.imports[unit.type].count --;
        }
    }


    //                ________________________              //
    //                global debugging methods              //

    
    /**
     * Debug statements created by IM.
     * @param {string} code - Code Snippet String.
     * @param {Object} [target] - Target Unit Object.
     * @param {string} [type] - Target type.
     * @param {string} [mode] - Insert position or attach mode.
     */
    logCreations(code, target, type, mode) {
        let msg = {
            addCode: code
        };
        if (target) {
            msg.mode = mode;
            msg.targetType = target.type;
            msg.targetUnit = target.methods.log(false);
        } else if (type) {
            msg.insert = mode;
            msg.targetType = type;
        }
        throw new DebuggingError(msg);
    }


    /**
     * Debugging method to stop the building process
     * and list all import units with its id, hash and
     * import statement.
     */
    logUnits() {
        throw new DebuggingError(this.#listAllUnits());
    }


    /**
     * Debugging method to stop the building process
     * and list the complete import object.
     */
    logUnitObjects() {
        const imports = {...this.imports};
        for (const key in imports) {
            imports[key].units.forEach(unit => {
                unit.code = [ unit.code.toString() ];
            });
        }
        throw new DebuggingError(imports);
    }


    /**
     * Warnings with spam protection. Can use internal
     * and native rollup method.
     * @param {string} msg - Warning Message. 
     */
    warning(msg) {
        const hash = simpleHash(msg);

        if (this.warnSpamProtection.has(hash)) {
            return;
        }

        this.warnSpamProtection.add(hash);
        this.warn(msg);
    }


    #unitCreationFailedWarning(node) {
        const codeSnippet = this.code.slice(node.start, node.end);
        const message = `Could not create a unit from code snippet:${os.EOL}---${os.EOL}${codeSnippet}${os.EOL}---${os.EOL}If the related code is correct, this might be a bug. You can report this on:${os.EOL}https://github.com/UmamiAppearance/ImportManager/issues${os.EOL}`; 
        this.warn(message);
    }
}


/**
 * A (simple as it gets) hash from string function.
 * @see https://gist.github.com/iperelivskiy/4110988?permalink_comment_id=2697447#gistcomment-2697447
 * @see https://gist.github.com/badboy/6267743#knuths-multiplicative-method
 * @param {string} input 
 * @returns {number} - Hash number.
 */
const simpleHash = (input) => {
    let h = 0xdeadbeef;
    for (let i=0; i<input.length; i++) {
        h = Math.imul(h ^ input.charCodeAt(i), 2654435761);
    }
    return (h ^ h >>> 16) >>> 0;
};

exports.DebuggingError = DebuggingError;
exports.ImportManager = ImportManager;
exports.MatchError = MatchError;
exports.simpleHash = simpleHash;
//# sourceMappingURL=import-manager.cjs.map
