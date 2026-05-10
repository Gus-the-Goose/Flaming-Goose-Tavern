import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getStorageMode, readState, resetState, writeState } from "./lib/storage.js";
import { applyTurn } from "./lib/table-engine.js";

const port = process.env.PORT || 3000;
const publicDir = path.join(process.cwd(), "public");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);
  const ext = path.extname(filePath);

  try {
    const file = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "text/plain; charset=utf-8" });
    res.end(file);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

export function createAppServer() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/api/health") {
        return sendJson(res, 200, {
          ok: true,
          app: "flaming-goose-tavern",
          storage: getStorageMode(),
          timestamp: new Date().toISOString()
        });
      }

      if (req.method === "GET" && url.pathname === "/api/state") {
        const state = await readState();
        return sendJson(res, 200, state);
      }

      if (req.method === "POST" && url.pathname === "/api/message") {
        const body = await readRequestBody(req);
        const state = await readState();
        const nextState = await applyTurn(state, body, {
          onHumanEntry: (intermediateState) => writeState(intermediateState)
        });
        await writeState(nextState);
        return sendJson(res, 200, nextState);
      }

      if (req.method === "POST" && url.pathname === "/api/campaign") {
        const body = await readRequestBody(req);
        const state = await readState();
        state.campaign = { ...state.campaign, ...body };
        await writeState(state);
        return sendJson(res, 200, state);
      }

      if (req.method === "POST" && url.pathname.startsWith("/api/agents/")) {
        const agentId = url.pathname.split("/").pop();
        const body = await readRequestBody(req);
        const state = await readState();
        const agent = state.agents.find((item) => item.id === agentId);
        if (!agent) {
          return sendJson(res, 404, { error: "Agent not found" });
        }
        Object.assign(agent, body);
        await writeState(state);
        return sendJson(res, 200, state);
      }

      if (req.method === "POST" && url.pathname === "/api/reset") {
        const state = await resetState();
        return sendJson(res, 200, state);
      }

      return serveStatic(req, res);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown server error";
      return sendJson(res, 500, { error: message });
    }
  });
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  const server = createAppServer();
  server.listen(port, () => {
    console.log(`Dyad D&D MVP running at http://localhost:${port}`);
  });
}
