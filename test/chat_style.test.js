const test = require("node:test");
const assert = require("node:assert/strict");
const { cleanAssistantText, injectChatStyle } = require("../chat_style");

test("injects the no-action chat style into the system message", () => {
  const messages = injectChatStyle([
    { role: "system", content: "原始人格" },
    { role: "user", content: "你好" }
  ]);

  assert.match(messages[0].content, /原始人格/);
  assert.match(messages[0].content, /禁止输出动作描写/);
  assert.match(messages[0].content, /心理活动/);
});

test("removes fenced monologue and leading action descriptions", () => {
  const cleaned = cleanAssistantText([
    "（看到你回来，我眼睛一亮）",
    "欢迎回来。",
    "```",
    "她终于回来了，我很开心。",
    "```",
    "*把杯子放下*",
    "今天累不累？"
  ].join("\n"));

  assert.equal(cleaned, "欢迎回来。\n\n今天累不累？");
});

test("keeps an ordinary parenthesis inside a sentence", () => {
  assert.equal(cleanAssistantText("我在这里（真的）等你。"), "我在这里（真的）等你。");
});
