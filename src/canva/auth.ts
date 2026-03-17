import { loadConfig, updateDotEnv } from "../config.js";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
};

let accessTokenCache: string | undefined;

export async function getCanvaAccessToken(options: { forceRefresh?: boolean } = {}): Promise<string> {
  const config = loadConfig();

  if (!options.forceRefresh) {
    const token = accessTokenCache ?? config.canvaAccessToken;

    if (token) {
      accessTokenCache = token;
      return token;
    }
  }

  return refreshCanvaAccessToken();
}

export async function refreshCanvaAccessToken(): Promise<string> {
  const config = loadConfig();

  if (!config.canvaRefreshToken || !config.canvaClientId || !config.canvaClientSecret) {
    throw new Error("Canva refresh token 설정 없음. 새 OAuth 승인 필요.");
  }

  const json = await requestToken({
    grant_type: "refresh_token",
    refresh_token: config.canvaRefreshToken,
  });

  if (!json.access_token) {
    throw new Error("Canva 토큰 응답에 access_token 없음.");
  }

  accessTokenCache = json.access_token;
  updateDotEnv({
    CANVA_ACCESS_TOKEN: json.access_token,
    CANVA_REFRESH_TOKEN: json.refresh_token ?? config.canvaRefreshToken,
  });

  return json.access_token;
}

export function clearCanvaAccessToken(): void {
  accessTokenCache = undefined;
}

export async function exchangeCanvaAuthorizationCode(code: string, codeVerifier: string): Promise<string> {
  const config = loadConfig();

  if (!config.canvaClientId || !config.canvaClientSecret || !config.canvaRedirectUri) {
    throw new Error("Canva OAuth 설정 부족. CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CANVA_REDIRECT_URI 확인 필요.");
  }

  const json = await requestToken({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: config.canvaRedirectUri,
  });

  if (!json.access_token) {
    throw new Error("Canva 토큰 응답에 access_token 없음.");
  }

  accessTokenCache = json.access_token;
  updateDotEnv({
    CANVA_ACCESS_TOKEN: json.access_token,
    CANVA_REFRESH_TOKEN: json.refresh_token,
  });

  return json.access_token;
}

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const config = loadConfig();

  if (!config.canvaClientId || !config.canvaClientSecret) {
    throw new Error("Canva client 설정 없음.");
  }

  const basic = Buffer.from(`${config.canvaClientId}:${config.canvaClientSecret}`).toString("base64");
  const response = await fetch("https://api.canva.com/rest/v1/oauth/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(15_000),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(`Canva 토큰 갱신 실패: ${response.status} ${responseBody}`);
  }

  return JSON.parse(responseBody) as TokenResponse;
}
