import assert from "node:assert/strict";
import { test } from "node:test";
import { computeZoom, FRAME } from "./storybook.ts";

test("tiny components zoom up to the cap", () => {
	// Badge: 54x21 would want ~12.8x; capped.
	assert.equal(computeZoom({ width: 54, height: 21 }), 4);
});

test("mid-size components fill the target share of the frame", () => {
	// DatePicker trigger: width binds -> 720 / 208 ≈ 3.46.
	assert.equal(computeZoom({ width: 208, height: 40 }), 3.46);
});

test("height binds for tall content", () => {
	// 100x300: width wants 7.2x, height wants 337.5/300 = 1.125.
	assert.equal(computeZoom({ width: 100, height: 300 }), 1.13);
});

test("large components are never shrunk", () => {
	assert.equal(computeZoom({ width: FRAME.width, height: FRAME.height }), 1);
});

test("empty or degenerate boxes leave zoom at 1", () => {
	assert.equal(computeZoom({ width: 0, height: 20 }), 1);
	assert.equal(computeZoom({ width: 20, height: -1 }), 1);
});
