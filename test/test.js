import test from "ava";
import { ImportManager } from "../src/core.js";

// NOTE: the main testing will happen at the rollup plugin

const source = `
import foo, { bar, baz } from "foobar";
const qux = require("quux");
const corge = await import("./path/to/grault"); 
`;

test("creating a IM instance with the 3 import types", async t => {
    const manager = new ImportManager(source);

    t.is(manager.imports.cjs.count, 1);
    t.is(manager.imports.es6.count, 1);
    t.is(manager.imports.dynamic.count, 1);

});
