import { loadConfig } from "../config.js";

type TokenResponse = {
  access_token: string;
};

export async function getCanvaAccessToken(): Promise<string> {
  const config = loadConfig();

  if (config.canvaAccessToken) {
    return config.canvaAccessToken;
  }

  if (config.canvaRefreshToken && config.canvaClientId && config.canvaClientSecret) {
    const response = await fetch("https://api.canva.com/rest/v1/oauth/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: config.canvaRefreshToken,
        client_id: config.canvaClientId,
        client_secret: config.canvaClientSecret,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Canva 토큰 갱신 실패: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as TokenResponse;
    return json.access_token;
  }

  throw new Error("Canva access token 없음. CANVA_ACCESS_TOKEN 또는 refresh token 설정 필요.");
}
