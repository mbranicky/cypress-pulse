import test from "node:test";
import assert from "node:assert/strict";
import { extractTestSource } from "./test-source.mjs";

const selected = (title, parents = []) => ({
  title,
  titlePath: [...parents, title],
});
test("extracts Cypress test declarations with original line numbers and nested syntax", () => {
  const text = [
    "describe('checkout', () => {",
    "  it('discount', {retries:1}, async () => {",
    "    const expression: string = `brace } ${1}`;",
    "    const pattern = /[{}]/g; // }",
    "    expect({expression}).to.exist;",
    "  });",
    "  it('other', () => {});",
    "});",
  ].join("\r\n");
  const value = extractTestSource(
    "checkout.cy.ts",
    text,
    selected("discount", ["checkout"]),
  );
  assert.equal(value.startLine, 2);
  assert.equal(value.endLine, 6);
  assert.match(value.text, /^it\('discount'/);
  assert.match(value.text, /const pattern/);
  assert.doesNotMatch(value.text, /it\('other'/);
  assert.doesNotMatch(value.text, /\r/);
});
test("matches full suites, skipped and focused Cypress declarations without guessing", () => {
  const text =
    "describe('one',()=>{it.skip('same',()=>{});});\ndescribe.only('two',()=>{it.only('same',()=>{cy.log('selected')});});";
  assert.match(
    extractTestSource("x.js", text, selected("same", ["two"])).text,
    /selected/,
  );
  assert.throws(
    () =>
      extractTestSource(
        "x.js",
        "it('same',()=>{});it('same',()=>{});",
        selected("same"),
      ),
    /Several/,
  );
  assert.throws(
    () =>
      extractTestSource(
        "x.js",
        "const name='dynamic'; it(name,()=>{});",
        selected("dynamic"),
      ),
    /could not be matched/,
  );
  assert.throws(
    () => extractTestSource("x.js", "it('bad',()=>{", selected("bad")),
    /could not be parsed/,
  );
});
