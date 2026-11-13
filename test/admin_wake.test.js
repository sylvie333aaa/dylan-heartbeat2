const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForServer(url, child, stderr) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`server.js 提前退出\n${stderr()}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`server.js 未在预期时间内启动\n${stderr()}`);
}

test("POST /admin/wake runs one wake cycle with Basic Auth", { timeout: 20_000 }, async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dylan-heartbeat-admin-"));
  fs.writeFileSync(
    path.join(dataDir, "enhanced_messages.json"),
    JSON.stringify([{ role: "user", content: "[2020-01-01 00:00:00] 测试用户：好久不见" }]),
    "utf8"
  );

  let pushSent = false;
  let eventContent = "";
  const mock = http.createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      if (req.method === "POST" && req.url === "/v1/chat/completions") {
        res.end(JSON.stringify({ choices: [{ message: { content: "集成测试标题\n集成测试正文" } }] }));
      } else if (req.method === "POST" && req.url === "/") {
        pushSent = true;
        res.end(JSON.stringify({ status: "ok" }));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "not found" }));
      }
    });
  });

  const mockAddress = await listen(mock);
  const mockBaseUrl = `http://127.0.0.1:${mockAddress.port}`;
  const gatewayPort = await getFreePort();
  const gatewayUrl = `http://127.0.0.1:${gatewayPort}`;

  const child = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: {
      ...process.env,
      PORT: String(gatewayPort),
      DATA_DIR: dataDir,
      GATEWAY_BASE_URL: gatewayUrl,
      TARGET_API_URL: `${mockBaseUrl}/v1`,
      TARGET_API_KEY: "test-key",
      MODEL_NAME: "test-model",
      WEATHER_ENABLED: "false",
      PUSH_PROVIDER: "ntfy",
      NTFY_SERVER_URL: mockBaseUrl,
      NTFY_TOPIC: "test-topic",
      DIARY_ENABLED: "false",
      TIME_ZONE: "Asia/Shanghai",
      ADMIN_USER: "test-admin",
      ADMIN_PASSWORD: "test-password",
      ALLOW_PUBLIC_API: "false"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let serverOutput = "";
  child.stdout.on("data", chunk => { serverOutput += chunk; });
  child.stderr.on("data", chunk => { serverOutput += chunk; });

  t.after(() => {
    if (child.exitCode === null) child.kill("SIGTERM");
    mock.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  await waitForServer(`${gatewayUrl}/healthz`, child, () => serverOutput);

  const auth = Buffer.from("test-admin:test-password").toString("base64");
  const response = await fetch(`${gatewayUrl}/admin/wake`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: "{}"
  });
  const result = await response.json();

  assert.equal(response.status, 200, JSON.stringify(result));
  assert.equal(result.success, true);
  assert.equal(pushSent, true, "应发送一次测试推送");
});
