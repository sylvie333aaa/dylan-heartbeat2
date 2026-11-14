const DEFAULT_MAX_MESSAGES = 4;
const DEFAULT_MAX_CHARS = 48;

function cleanLine(line) {
  return String(line || "")
    .replace(/^[-*•]\s*/, "")
    .replace(/^\d+[.、)]\s*/, "")
    .replace(/^(?:标题|正文|心理活动|内心|旁白|动作|备注)[：:]\s*/, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/^🐈‍⬛\s*[｜|]\s*/, "")
    .trim();
}

function splitLongSentence(sentence, maxChars) {
  const parts = [];
  let remaining = sentence.trim();

  while (remaining.length > maxChars) {
    let cut = -1;
    for (const mark of ["，", ",", "、", "；", ";", " "]) {
      const index = remaining.lastIndexOf(mark, maxChars - 1);
      if (index > cut && index >= Math.floor(maxChars * 0.45)) cut = index;
    }
    if (cut < 0) cut = maxChars - 1;
    parts.push(remaining.slice(0, cut + 1).trim());
    remaining = remaining.slice(cut + 1).trim();
  }

  if (remaining) parts.push(remaining);
  return parts.filter(Boolean);
}

function buildPushBodies(text, options = {}) {
  const maxMessages = Math.max(1, Number(options.maxMessages) || DEFAULT_MAX_MESSAGES);
  const maxChars = Math.max(12, Number(options.maxChars) || DEFAULT_MAX_CHARS);

  const cleaned = String(text || "")
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/\[BARK\]|\[\/BARK\]/gi, "\n")
    .replace(/\*\*/g, "")
    .trim();

  const bodies = [];

  for (const line of cleaned.split(/\n+/)) {
    const sentences = (cleanLine(line).match(/[^。！？!?；;]+[。！？!?；;]?/g) || [])
      .map(item => item.trim())
      .filter(Boolean);
    let current = "";

    for (const sentence of sentences) {
      const pieces = splitLongSentence(sentence, maxChars);
      for (const piece of pieces) {
        if (!current) {
          current = piece;
        } else if (`${current}${piece}`.length <= maxChars) {
          current += piece;
        } else {
          bodies.push(current);
          current = piece;
        }
        if (bodies.length >= maxMessages) break;
      }
      if (bodies.length >= maxMessages) break;
    }

    if (current && bodies.length < maxMessages) bodies.push(current);
    if (bodies.length >= maxMessages) break;
  }

  return bodies.slice(0, maxMessages);
}

module.exports = { buildPushBodies };
