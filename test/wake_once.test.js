const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
}

test("WAKE_ONCE performs one cycle and exits", { timeout: 15_000 }, async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dylan-heartbeat-once-"));
  fs.writeFileSync(
    path.join(dataDir, "enhanced_messages.json"),
    JSON.stringify([{ role: "user", content: "[2020-01-01 00:00:00] 测试用户：好久不见" }]),
    "utf8"
  );

  let pushSent = false;
  let eventContent = "";
  const server = http.createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");

      if (req.method === "POST" && req.url === "/v1/chat/completions") {
        res.end(JSON.stringify({ choices: [{ message: { content: "测试标题\n测试正文" } }] }));
        return;
      }
      if (req.method === "POST" && req.url === "/internal/wake-event") {
        eventContent = JSON.parse(body).content;
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }
      if (req.method === "POST" && req.url === "/internal/heartbeat") {
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }
      if (req.method === "POST" && req.url === "/") {
        pushSent = true;
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not found" }));
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
      WEATHER_ENABLED: "false",
      PUSH_PROVIDER: "ntfy",
      NTFY_SERVER_URL: baseUrl,
      NTFY_TOPIC: "test-topic",
      DIARY_ENABLED: "false",
      TIME_ZONE: "Asia/Shanghai"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  const exit = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });

  assert.equal(exit.code, 0, `wake_up.js 退出异常\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  assert.equal(pushSent, true, "应发送一次测试推送");
  assert.match(eventContent, /刚刚给用户发了ntfy推送/);
});
