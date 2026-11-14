const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPushBodies } = require("../push_messages");

test("splits a long paragraph into several short messages", () => {
  const bodies = buildPushBodies("今天外面下雨了，记得带伞。路上慢一点，不要着急。到地方了跟我说一声，我会等你。", {
    maxMessages: 4,
    maxChars: 24
  });

  assert.ok(bodies.length > 1);
  assert.ok(bodies.every(body => body.length <= 24));
});

test("keeps line-separated chat messages separate", () => {
  const bodies = buildPushBodies("到家了吗？\n今天累不累？\n记得早点休息。", {
    maxMessages: 4,
    maxChars: 48
  });

  assert.deepEqual(bodies, ["到家了吗？", "今天累不累？", "记得早点休息。"]);
});

test("removes titles, numbering and fenced inner monologue", () => {
  const bodies = buildPushBodies("标题：晚安\n1. 今天辛苦啦。\n2. 早点睡。\n```心理活动：她应该睡了```", {
    maxMessages: 4,
    maxChars: 48
  });

  assert.deepEqual(bodies, ["晚安", "今天辛苦啦。", "早点睡。"]);
});

test("limits the number of generated notifications", () => {
  const bodies = buildPushBodies("一\n二\n三\n四\n五\n六", { maxMessages: 3, maxChars: 48 });
  assert.equal(bodies.length, 3);
});
