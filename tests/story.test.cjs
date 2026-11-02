const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = require('node:path').join(__dirname, '../src/story.js');
const S = fs.existsSync(p) ? require(p) : {};
test('each playable chapter supplies readable object descriptions and a hint', () => {
  for (const chapter of ['prologue', 'vinyl', 'tape', 'cd', 'finale']) {
    const c = S.chapters?.[chapter];
    assert.ok(c, chapter);
    assert.ok(c.intro.length > 40);
    assert.ok(c.hint.length > 10);
    for (const o of c.objects) { assert.ok(o.label); assert.ok(o.text.length > 30); }
  }
});
test('epilogue reflects every previous choice without selecting an ending on behalf of player', () => {
  const first = S.journal?.({ vinyl: 'side', tape: 'letter', cd: 'backup' });
  const second = S.journal?.({ vinyl: 'song', tape: 'copy', cd: 'catalog' });
  assert.equal(first?.length, 3);
  assert.equal(second?.length, 3);
  for (let i = 0; i < 3; i++) assert.notEqual(first[i].text, second[i].text);
  assert.match(first[0].text, /сторону/);
  assert.match(second[2].text, /каталог/);
});
