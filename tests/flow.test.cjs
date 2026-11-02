const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../src/engine.js');
const S = require('../src/story.js');
const p = path.join(__dirname, '../src/flow.js');
const F = fs.existsSync(p) ? require(p) : {};
const act = (s, type, value) => E.reduce(s, { type, value });
function readAll(s) { for (let i = 0; i < F.sequence(s, S).length; i++) s = F.advance(s, S); return s; }
test('reading dialogue never solves a puzzle or makes a story choice', () => {
  const s = act(E.initialState(), 'enter');
  const read = readAll(s);
  assert.equal(read.chapter, 'vinyl'); assert.equal(read.step, 0); assert.equal(read.phase, 'explore');
  assert.deepEqual(read.choices, {});
  assert.equal(F.presentation(read, S).ready, true);
  assert.equal(F.presentation(read, S).activity, 'explore');
  assert.equal(F.presentation(F.startPuzzle(read, S), S).activity, 'puzzle');
});
test('each vinyl step has its own clear question and next dialogue before acting', () => {
  let s = act(E.initialState(), 'enter');
  s = F.startPuzzle(readAll(s), S);
  s = act(s, 'vinyl', 'edges');
  const view = F.presentation(s, S);
  assert.equal(view.ready, false); assert.equal(view.activity, 'puzzle');
  assert.match(F.sequence(s, S)[0].text, /пил/);
  assert.match(F.vinylGuide(3).question, /швидкість/);
});
test('dismiss feedback permits retry without changing chapter, step, or choices', () => {
  const s = act(act(E.initialState(), 'enter'), 'vinyl', 'surface');
  assert.ok(s.feedback);
  const clean = act(s, 'dismissFeedback');
  assert.equal(clean.feedback, ''); assert.equal(clean.step, 0); assert.equal(clean.chapter, 'vinyl');
  assert.deepEqual(clean.choices, {});
  assert.equal(act(clean, 'vinyl', 'edges').step, 1);
});
test('dialogue position and puzzle mode roundtrip, old saves remain valid', () => {
  let s = F.advance(act(E.initialState(), 'enter'), S);
  assert.deepEqual(E.parseSave(E.serialize(s)), s);
  const old = act(E.initialState(), 'enter');
  assert.ok(E.parseSave(E.serialize(old)));
  s = F.startPuzzle(readAll(old), S);
  assert.equal(F.presentation(E.parseSave(E.serialize(s)), S).activity, 'puzzle');
  assert.equal(F.presentation({ ...old, presentation: { key: F.key(old), cursor: -9, activity: 'bad' } }, S).cursor, 0);
});
test('loss is preceded by consequence and followed by restoration, ending details read separately', () => {
  let s = act(E.initialState(), 'enter');
  for (const value of ['edges','clean','place','33','play']) s = act(s, 'vinyl', value);
  s = act(s, 'choice', 'side');
  const seq = F.sequence(s, S);
  assert.equal(seq[0].dim, false); assert.ok(seq.some(x => x.dim));
  assert.equal(seq.at(-1).dim, false);
  assert.ok(seq.every(x => x.text.length <= 320));
  assert.equal(readAll(s).phase, 'loss');
});
