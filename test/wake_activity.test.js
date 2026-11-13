const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { formatDateTimeInTimeZone } = require("../time_utils");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
}

test("a recent proactive event delays the next wake cycle", { timeout: 15_000 }, async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dylan-heartbeat-cooldown-"));
  const recentTime = formatDateTimeInTimeZone(new Date(Date.now() - 5 * 60 * 1000), "Asia/Shanghai");
  fs.writeFileSync(
    path.join(dataDir, "enhanced_messages.json"),
    JSON.stringify([
      { role: "user", content: "[2020-01-01 00:00:00] 测试用户：很久以前的消息" },
      { role: "assistant", content: `（${recentTime} 刚刚给用户发了Bark推送：🐈‍⬛｜刚刚才发过）` }
    ]),
    "utf8"
  );

  let modelRequests = 0;
  let pushSent = false;
  const server = http.createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      if (req.method === "POST" && req.url === "/v1/chat/completions") {
        modelRequests += 1;
      } else if (req.method === "POST" && req.url === "/") {
        pushSent = true;
      }
      res.end(JSON.stringify({ status: "ok", choices: [{ message: { content: "不应该发送" } }] }));
    });
  });

  const address = await listen(server);
  const baseUrl = `http://127.0.0.1:${address.port}`;
  t.after(() => {
    server.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const child = spawn(process.execPath, [path.join(__dirname, "..", "wake_up.js")], {
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      GATEWAY_BASE_URL: baseUrl,
      TARGET_API_URL: `${baseUrl}/v1`,
      TARGET_API_KEY: "test-key",
      MODEL_NAME: "test-model",
      WAKE_ONCE: "true",
      WAKE_FORCE_SEND: "false",
      WEATHER_ENABLED: "false",
      PUSH_PROVIDER: "ntfy",
      NTFY_SERVER_URL: baseUrl,
      NTFY_TOPIC: "test-topic",
      DIARY_ENABLED: "false",
      TIME_ZONE: "Asia/Shanghai",
      DAY_WAKE_AFTER_MINUTES: "45"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });

  assert.equal(code, 0, output);
  assert.equal(modelRequests, 0, "冷却期内不应请求模型");
  assert.equal(pushSent, false, "冷却期内不应发送推送");
  assert.match(output, /暂不需要唤醒/);
});
