import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homePage = readFileSync("app/page.tsx", "utf8");
const publicPage = readFileSync("app/public/page.tsx", "utf8");

test("home page is a single login entry without public/admin/portal tiles", () => {
  assert.match(homePage, /<LoginForm \/>/);
  assert.match(homePage, /Ein gemeinsamer Login/);
  assert.doesNotMatch(homePage, /href="\/public"/);
  assert.doesNotMatch(homePage, /href="\/portal"/);
  assert.doesNotMatch(homePage, /href="\/admin"/);
  assert.doesNotMatch(homePage, /Öffentlicher Bereich|Ã–ffentlicher Bereich/);
});

test("public landing page redirects to login while public calendar remains separately guarded", () => {
  assert.match(publicPage, /redirect\("\/login"\)/);
  assert.doesNotMatch(publicPage, /getPublicAreaEnabled/);
});
