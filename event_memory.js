const DEFAULT_EVENT_MEMORY_LIMIT = 5;

function buildEventMemoryBlock(events, limit = DEFAULT_EVENT_MEMORY_LIMIT) {
  const contents = (Array.isArray(events) ? events : [])
    .map(event => String(event?.content || "").trim())
    .filter(Boolean)
    .slice(-Math.max(1, limit));

  if (contents.length === 0) return "";

  return [
    "",
    "",
    "## 你最近的后台主动行为记录",
    "以下是你在用户没有主动聊天时真实发送过的手机推送或后台行为。它们属于你自己的近期行为；用户问起时，请以这些记录为准，不要说自己不知道。",
    ...contents.map(content => `- ${content}`)
  ].join("\n");
}

function injectEventMemory(messages, events, limit = DEFAULT_EVENT_MEMORY_LIMIT) {
  const memoryBlock = buildEventMemoryBlock(events, limit);
  if (!memoryBlock) return messages;

  const nextMessages = messages.map(message => ({ ...message }));
  const systemIndex = nextMessages.findIndex(message => message.role === "system");

  if (systemIndex >= 0) {
    const original = nextMessages[systemIndex].content;
    nextMessages[systemIndex].content = Array.isArray(original)
      ? [...original, { type: "text", text: memoryBlock }]
      : `${original || ""}${memoryBlock}`;
    return nextMessages;
  }

  nextMessages.unshift({ role: "system", content: memoryBlock.trim() });
  return nextMessages;
}

module.exports = { buildEventMemoryBlock, injectEventMemory };
