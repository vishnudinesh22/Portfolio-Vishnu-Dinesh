import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createNavigator } from "../src/navigation.js";
test("guidance routes around the couch and reaches the right-wall table approach", () => {
  const boundaries = JSON.parse(readFileSync(new URL("../public/map.json", import.meta.url))).layers.find(l => l.name === "boundaries").objects;
  const table = { x: 301, y: 126, width: 32, solidY: 12, solidHeight: 8 };
  const navigate = createNavigator(boundaries, table);
  const first = navigate({ x: 112, y: 128 }, { x: 120, y: 79 });
  assert.ok(first.x > 112, "Go around the couch rather than through it");
  let position = { x: 215, y: 130 };
  for (let i = 0; i < 50 && Math.hypot(position.x - 317, position.y - 143) >= 21; i++) position = navigate(position, { x: 317, y: 143 });
  assert.ok(Math.hypot(position.x - 317, position.y - 143) < 21);
});
