import { refreshCanvaAccessToken } from "../canva/auth.js";

async function main(): Promise<void> {
  const token = await refreshCanvaAccessToken();

  process.stdout.write("Canva 토큰 갱신 완료\n");
  process.stdout.write(`CANVA_ACCESS_TOKEN=${token.slice(0, 16)}...\n`);
  process.stdout.write(".env 업데이트 완료\n");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "알 수 없는 오류";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
