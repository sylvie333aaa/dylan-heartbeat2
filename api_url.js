function normalizeChatCompletionsUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return value;

  let url;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  const path = url.pathname.replace(/\/+$/, "");
  if (!path) {
    url.pathname = "/chat/completions";
  } else if (/\/v1$/i.test(path)) {
    url.pathname = `${path}/chat/completions`;
  }

  return url.toString();
}

module.exports = { normalizeChatCompletionsUrl };
