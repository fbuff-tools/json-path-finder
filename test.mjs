import { test } from "node:test";
import assert from "node:assert/strict";
import { findPaths, getAt, parsePath, toJsonPath, toJqPath } from "./jsonpath-find.mjs";

const data = { store: { book: [{ title: "Dune", price: 9.99 }, { title: "Emma" }] }, "first name": "Ann" };

test("finds keys and values, case-insensitive", () => {
  assert.deepEqual(findPaths(data, "emma").map(toJsonPath), ["$.store.book[1].title"]);
  assert.deepEqual(findPaths(data, "TITLE").map(toJsonPath), ["$.store.book[0].title", "$.store.book[1].title"]);
});

test("quotes keys that are not identifiers", () => {
  assert.equal(toJsonPath(["first name"]), '$["first name"]');
  assert.equal(toJqPath(["first name"]), '.["first name"]');
});

test("paths round-trip", () => {
  for (const p of findPaths(data, "a")) assert.deepEqual(parsePath(toJsonPath(p)), p);
  assert.equal(getAt(data, parsePath("$.store.book[0]['price']")), 9.99);
});

test("missing paths and wildcards throw", () => {
  assert.throws(() => getAt(data, parsePath("$.store.book[5]")), /No match/);
  assert.throws(() => parsePath("$.store.book[*]"), /not supported/);
});
