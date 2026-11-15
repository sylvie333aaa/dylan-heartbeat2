const CHAT_STYLE_GUIDANCE = [
  "",
  "",
  "## 聊天回复格式（最高优先级）",
  "只输出你直接对用户说的话，像真人聊天一样自然。",
  "禁止输出动作描写、神态描写、心理活动、内心独白、旁白、场景说明、括号里的动作、Markdown 代码块或 ``` 包裹的内容。",
  "不要描述“看到你”“我心里想”“我愣了一下”“声音放轻”等表演性内容。",
  "不要使用星号包裹动作。"
].join("\n");

function cleanAssistantText(text) {
  const cleaned = String(text || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^\s*[（(][^）)\n]{1,240}[）)]\s*/gm, "")
    .replace(/^\s*\*[^*\n]{1,160}\*\s*$/gm, "")
    .replace(/^\s*[（(][^）)\n]{1,240}$/gm, "")
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned;
}

function injectChatStyle(messages) {
  const nextMessages = messages.map(message => ({ ...message }));
  const systemIndex = nextMessages.findIndex(message => message.role === "system");
  if (systemIndex >= 0) {
    const original = nextMessages[systemIndex].content;
    nextMessages[systemIndex].content = Array.isArray(original)
      ? [...original, { type: "text", text: CHAT_STYLE_GUIDANCE }]
      : `${original || ""}${CHAT_STYLE_GUIDANCE}`;
    return nextMessages;
  }
  nextMessages.unshift({ role: "system", content: CHAT_STYLE_GUIDANCE.trim() });
  return nextMessages;
}

module.exports = { CHAT_STYLE_GUIDANCE, cleanAssistantText, injectChatStyle };
