const test = require("node:test");
const assert = require("node:assert/strict");
const { availableModelIds, buildModelRoutes, modelsUrlForRoute, resolveModelRoute } = require("../model_routes");

test("builds default and additional OpenAI-compatible routes", () => {
  const routes = buildModelRoutes({
    MODEL_NAME: "deepseek-chat",
    TARGET_API_URL: "https://api.deepseek.com/v1",
    TARGET_API_KEY: "default-key",
    MODEL_ROUTES_JSON: JSON.stringify({
      "gemini-flash": {
        apiUrl: "https://relay.example.com/v1",
        apiKey: "gemini-key",
        model: "gemini-2.5-flash"
      }
    })
  });

  assert.deepEqual(availableModelIds(routes).sort(), ["deepseek-chat", "gemini-flash"]);
  assert.equal(routes["deepseek-chat"].apiUrl, "https://api.deepseek.com/v1/chat/completions");
  assert.equal(routes["gemini-flash"].apiUrl, "https://relay.example.com/v1/chat/completions");
  assert.equal(routes["gemini-flash"].model, "gemini-2.5-flash");
});

test("resolves a requested model before falling back", () => {
  const routes = buildModelRoutes({
    MODEL_NAME: "default-model",
    TARGET_API_URL: "https://default.example.com/v1",
    TARGET_API_KEY: "default-key",
    MODEL_ROUTES_JSON: JSON.stringify({
      claude: { apiUrl: "https://claude.example.com/v1", apiKey: "claude-key" }
    })
  });

  assert.equal(resolveModelRoute(routes, "claude", "default-model").apiKey, "claude-key");
  assert.equal(resolveModelRoute(routes, "missing", "default-model").id, "default-model");
});

test("ignores malformed route configuration", () => {
  const routes = buildModelRoutes({
    MODEL_NAME: "default-model",
    TARGET_API_URL: "https://default.example.com/v1",
    TARGET_API_KEY: "default-key",
    MODEL_ROUTES_JSON: "{not valid json"
  });

  assert.deepEqual(availableModelIds(routes), ["default-model"]);
});

test("uses a wildcard route for any requested model", () => {
  const routes = buildModelRoutes({
    MODEL_NAME: "default-model",
    TARGET_API_URL: "https://default.example.com/v1",
    TARGET_API_KEY: "default-key",
    MODEL_ROUTES_JSON: JSON.stringify({
      "*": { apiUrl: "https://relay.example.com/v1", apiKey: "relay-key" }
    })
  });

  assert.equal(resolveModelRoute(routes, "frequently-changing-model", "default-model").model, "frequently-changing-model");
  assert.equal(modelsUrlForRoute(routes["*"]), "https://relay.example.com/v1/models");
});

test("resolves an API key from a named environment variable", () => {
  const routes = buildModelRoutes({
    MODEL_NAME: "default-model",
    TARGET_API_URL: "https://default.example.com/v1",
    TARGET_API_KEY: "default-key",
    RELAY_API_KEY: "relay-secret",
    MODEL_ROUTES_JSON: JSON.stringify({
      "*": { apiUrl: "https://relay.example.com/v1", apiKeyEnv: "RELAY_API_KEY" }
    })
  });

  assert.equal(routes["*"].apiKey, "relay-secret");
});
