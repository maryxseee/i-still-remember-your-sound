const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const enginePath = path.join(__dirname, '../src/engine.js');
const E = fs.existsSync(enginePath) ? require(enginePath) : {};
const act = (s, type, value) => E.reduce(s, { type, value });
function vinyl() { return act(E.initialState(), 'enter'); }
function played() {
  let s = vinyl();
  for (const v of ['edges', 'clean', 'place', '33', 'play']) s = act(s, 'vinyl', v);
  return s;
}
function tape(choice = 'side') {
  let s = act(played(), 'choice', choice);
  return act(s, 'restore');
}
function disc(a = 'side', b = 'letter') {
  let s = act(tape(a), 'tape', ['road', 'meeting', 'unsaid']);
  s = act(s, 'choice', b);
  return act(s, 'restore');
}
test('wrong vinyl action permits retry without moving progress', () => {
  let s = vinyl();
  const wrong = act(s, 'vinyl', 'play');
  assert.equal(wrong.step, 0);
  assert.match(wrong.feedback, /краї/);
  s = act(wrong, 'vinyl', 'edges');
  assert.equal(s.step, 1);
  assert.equal(played().phase, 'choice');
});
test('future chapter and ending cannot be opened before solving', () => {
  const s = E.initialState();
  assert.deepEqual(act(s, 'ending', 'archive'), s);
  assert.deepEqual(act(vinyl(), 'choice', 'side'), vinyl());
  assert.deepEqual(act(s, 'restore'), s);
});
test('tape ordering accepts only the narrative sequence and allows retries', () => {
  const s = tape();
  const wrong = act(s, 'tape', ['meeting', 'road', 'unsaid']);
  assert.equal(wrong.phase, 'explore');
  assert.ok(wrong.feedback);
  assert.equal(act(wrong, 'tape', ['road', 'meeting', 'unsaid']).phase, 'choice');
  assert.equal(act(s, 'tape', ['road', 'road', 'unsaid']).phase, 'explore');
});
test('both supported CD routes work, wrong album and unsupported MP3 do not', () => {
  for (const pair of [['audio', 'player'], ['mp3', 'computer']]) {
    assert.equal(act(disc(), 'disc', pair).phase, 'choice');
  }
  for (const pair of [['other', 'player'], ['mp3', 'player'], ['bad', 'computer']]) {
    const wrong = act(disc(), 'disc', pair);
    assert.equal(wrong.phase, 'explore');
    assert.equal(act(wrong, 'disc', ['audio', 'player']).phase, 'choice');
  }
});
test('all 24 choice paths reach the chosen ending, independent of earlier decisions', () => {
  for (const a of ['side', 'song']) for (const b of ['letter', 'copy']) for (const c of ['backup', 'catalog']) {
    let s = act(disc(a, b), 'disc', ['audio', 'player']);
    s = act(act(s, 'choice', c), 'restore');
    assert.equal(s.chapter, 'finale');
    for (const end of ['home', 'together', 'archive']) {
      const ended = act(s, 'ending', end);
      assert.equal(ended.ending, end);
      assert.deepEqual(ended.choices, { vinyl: a, tape: b, cd: c });
      assert.ok(ended.unlocked.includes(end));
    }
  }
});
test('returning to final choice and restarting keep opened endings', () => {
  let s = act(act(act(disc(), 'disc', ['mp3', 'computer']), 'choice', 'catalog'), 'restore');
  s = act(s, 'ending', 'home');
  s = act(act(s, 'backToFinale'), 'ending', 'archive');
  assert.deepEqual(s.unlocked, ['home', 'archive']);
  const fresh = E.initialState(s.unlocked);
  assert.equal(fresh.chapter, 'prologue');
  assert.deepEqual(fresh.unlocked, ['home', 'archive']);
});
test('save survives roundtrip and malformed or impossible saves are rejected', () => {
  const s = act(played(), 'choice', 'song');
  assert.deepEqual(E.parseSave(E.serialize(s)), s);
  for (const text of ['{', 'null', '{}', '[]', '"hi"', JSON.stringify({ ...s, chapter: 'missing' }), JSON.stringify({ ...s, step: -3 }), JSON.stringify({ ...s, choices: { vinyl: 'bad' } }), JSON.stringify({ ...s, chapter: 'cd', phase: 'choice', choices: {} })]) {
    assert.equal(E.parseSave(text), null);
  }
});
test('observed objects are unique and unknown actions leave state unchanged', () => {
  let s = vinyl();
  s = act(act(s, 'inspect', 'invitation'), 'inspect', 'invitation');
  assert.deepEqual(s.seen.vinyl, ['invitation']);
  assert.deepEqual(act(s, 'unknown'), s);
  assert.deepEqual(act(s, 'inspect', '__proto__'), s);
});
