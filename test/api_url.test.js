const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeChatCompletionsUrl } = require("../api_url");

test("adds the chat completions path to a v1 base URL", () => {
  assert.equal(
    normalizeChatCompletionsUrl("https://api.deepseek.com/v1"),
    "https://api.deepseek.com/v1/chat/completions"
  );
});

test("keeps a complete chat completions endpoint unchanged", () => {
  assert.equal(
    normalizeChatCompletionsUrl("https://example.com/v1/chat/completions?api-version=1"),
    "https://example.com/v1/chat/completions?api-version=1"
  );
});

test("adds chat completions to a bare provider URL", () => {
  assert.equal(
    normalizeChatCompletionsUrl("https://api.deepseek.com"),
    "https://api.deepseek.com/chat/completions"
  );
});
