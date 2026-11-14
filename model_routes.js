const { normalizeChatCompletionsUrl } = require("./api_url");

function parseModelRoutes(raw) {
  if (!raw) return {};
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn("MODEL_ROUTES_JSON 格式无效，已忽略额外模型路由");
    return {};
  }
}

function buildModelRoutes(env = process.env) {
  const defaultModel = String(env.MODEL_NAME || "gateway-model").trim() || "gateway-model";
  const defaultRoute = {
    apiUrl: normalizeChatCompletionsUrl(env.TARGET_API_URL),
    apiKey: String(env.TARGET_API_KEY || "").trim(),
    model: defaultModel
  };
  const configured = parseModelRoutes(env.MODEL_ROUTES_JSON);
  const routes = { [defaultModel]: defaultRoute };

  for (const [name, value] of Object.entries(configured)) {
    const id = String(name || "").trim();
    if (!id || !value || typeof value !== "object" || Array.isArray(value)) continue;
    const keyEnvName = String(value.apiKeyEnv || "").trim();
    const keyFromEnv = keyEnvName ? String(env[keyEnvName] || "").trim() : "";
    routes[id] = {
      apiUrl: normalizeChatCompletionsUrl(value.apiUrl || defaultRoute.apiUrl),
      apiKey: String(value.apiKey || keyFromEnv || defaultRoute.apiKey).trim(),
      model: String(value.model || id).trim() || id
    };
  }

  return routes;
}

function availableModelIds(routes) {
  return Object.keys(routes || {}).filter(id => id !== "*");
}

function resolveModelRoute(routes, requestedModel, fallbackModel) {
  const map = routes || {};
  const requested = String(requestedModel || "").trim();
  if (requested && map[requested]) return { id: requested, ...map[requested] };

  if (requested && map["*"]) {
    return { id: requested, ...map["*"], model: requested };
  }

  const fallback = String(fallbackModel || "").trim();
  if (fallback && map[fallback]) return { id: fallback, ...map[fallback] };

  const firstId = Object.keys(map)[0];
  return firstId ? { id: firstId, ...map[firstId] } : null;
}

function modelsUrlForRoute(route) {
  if (!route?.apiUrl) return "";
  try {
    const url = new URL(route.apiUrl);
    url.pathname = url.pathname.replace(/\/chat\/completions\/?$/i, "/models");
    return url.toString();
  } catch {
    return "";
  }
}

module.exports = { availableModelIds, buildModelRoutes, modelsUrlForRoute, parseModelRoutes, resolveModelRoute };
