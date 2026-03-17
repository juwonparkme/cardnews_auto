import { createServer } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { spawn } from "node:child_process";

import { exchangeCanvaAuthorizationCode } from "../canva/auth.js";
import { loadConfig } from "../config.js";

async function main(): Promise<void> {
  const config = loadConfig();

  if (!config.canvaClientId || !config.canvaRedirectUri) {
    throw new Error("CANVA_CLIENT_ID 또는 CANVA_REDIRECT_URI 없음.");
  }

  const redirectUrl = new URL(config.canvaRedirectUri);
  const verifier = randomBytes(96).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(24).toString("base64url");
  const scope = [
    "asset:read",
    "asset:write",
    "brandtemplate:meta:read",
    "brandtemplate:content:read",
    "design:meta:read",
    "design:content:read",
    "design:content:write",
  ].join(" ");

  const authUrl = new URL("https://www.canva.com/api/oauth/authorize");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "s256");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", config.canvaClientId);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("redirect_uri", config.canvaRedirectUri);

  const code = await waitForAuthorizationCode(redirectUrl, authUrl, state);
  const token = await exchangeCanvaAuthorizationCode(code, verifier);

  process.stdout.write("Canva OAuth 재인증 완료\n");
  process.stdout.write(`CANVA_ACCESS_TOKEN=${token.slice(0, 16)}...\n`);
  process.stdout.write(".env 업데이트 완료\n");
}

async function waitForAuthorizationCode(redirectUrl: URL, authUrl: URL, expectedState: string): Promise<string> {
  const port = Number(redirectUrl.port || (redirectUrl.protocol === "https:" ? "443" : "80"));
  const hostname = redirectUrl.hostname;
  const pathname = redirectUrl.pathname;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Canva OAuth 대기 timeout"));
    }, 5 * 60_000);

    const server = createServer((request, response) => {
      try {
        const requestUrl = new URL(request.url ?? "/", `${redirectUrl.protocol}//${redirectUrl.host}`);

        if (requestUrl.pathname !== pathname) {
          response.statusCode = 404;
          response.end("Not found");
          return;
        }

        const code = requestUrl.searchParams.get("code");
        const state = requestUrl.searchParams.get("state");
        const error = requestUrl.searchParams.get("error");

        if (error) {
          response.statusCode = 400;
          response.end(`OAuth failed: ${error}`);
          clearTimeout(timeout);
          server.close();
          reject(new Error(`Canva OAuth 실패: ${error}`));
          return;
        }

        if (!code || state !== expectedState) {
          response.statusCode = 400;
          response.end("Invalid OAuth callback");
          clearTimeout(timeout);
          server.close();
          reject(new Error("Canva OAuth callback 검증 실패"));
          return;
        }

        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end("<h1>Canva OAuth complete</h1><p>브라우저 닫아도 됩니다.</p>");
        clearTimeout(timeout);
        server.close();
        resolve(code);
      } catch (error) {
        clearTimeout(timeout);
        server.close();
        reject(error);
      }
    });

    server.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    server.listen(port, hostname, () => {
      process.stdout.write(`브라우저 여는 중: ${authUrl.toString()}\n`);
      spawn("open", [authUrl.toString()], {
        stdio: "ignore",
        detached: true,
      }).unref();
    });
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "알 수 없는 오류";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
