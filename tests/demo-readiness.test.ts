import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("documents demo seed and pilot test entry points", () => {
  const packageJson = readFileSync("package.json", "utf8");
  const readme = readFileSync("README.md", "utf8");
  const pilotPlan = readFileSync("docs/pilot-testplan.md", "utf8");
  const projectStatus = readFileSync("docs/project-status.md", "utf8");

  assert.match(packageJson, /"demo:seed"/);
  assert.match(readme, /npm run demo:seed/);
  assert.match(readme, /demo\.admin@example\.test/);
  assert.match(pilotPlan, /Demo-Logins/);
  assert.match(pilotPlan, /http:\/\/localhost:3000/);
  assert.match(projectStatus, /Phase 20/);
});
