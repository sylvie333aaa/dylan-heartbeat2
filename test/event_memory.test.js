const test = require("node:test");
const assert = require("node:assert/strict");
const { buildEventMemoryBlock, injectEventMemory } = require("../event_memory");

test("builds a first-person event memory from recent events", () => {
  const block = buildEventMemoryBlock([
    { role: "assistant", content: "（刚刚给用户发了 Bark 推送：🐈‍⬛｜第一条）" },
    { role: "assistant", content: "（刚刚给用户发了 Bark 推送：🐈‍⬛｜第二条）" }
  ]);

  assert.match(block, /你最近的后台主动行为记录/);
  assert.match(block, /第一条/);
  assert.match(block, /第二条/);
  assert.match(block, /不要说自己不知道/);
});

test("injects event memory into the existing system message", () => {
  const messages = injectEventMemory(
    [{ role: "system", content: "原始人格" }, { role: "user", content: "我刚才收到了什么？" }],
    [{ role: "assistant", content: "（刚刚给用户发了 Bark 推送：🐈‍⬛｜记得带伞）" }]
  );

  assert.equal(messages[0].role, "system");
  assert.match(messages[0].content, /原始人格/);
  assert.match(messages[0].content, /记得带伞/);
  assert.equal(messages[1].role, "user");
});

test("keeps only the latest events up to the configured limit", () => {
  const events = Array.from({ length: 7 }, (_, index) => ({ content: `事件${index + 1}` }));
  const block = buildEventMemoryBlock(events, 3);

  assert.doesNotMatch(block, /事件4/);
  assert.match(block, /事件5/);
  assert.match(block, /事件6/);
  assert.match(block, /事件7/);
});
