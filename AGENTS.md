# AGENTS

## Canva 토큰 운영

- Canva API가 `invalid_access_token` 또는 `revoked_access_token` 를 반환하면 코드가 1회 자동 refresh 후 재시도한다.
- refresh 성공 시 새 `CANVA_ACCESS_TOKEN`, `CANVA_REFRESH_TOKEN` 을 `.env` 에 자동 저장한다.
- 수동 갱신이 필요하면 레포 루트에서 `pnpm canva:refresh-token` 실행.
- `refresh_token` 은 회전될 수 있으니, 수동 `curl` 로 갱신했더라도 응답의 새 `refresh_token` 으로 `.env` 를 바로 덮어쓴다.
- `pnpm canva:refresh-token` 이 `400` 으로 실패하면 refresh token 이 이미 만료/재사용된 상태일 가능성이 높다. 이 경우 Canva OAuth 승인부터 다시 진행하고, 새 `access_token`/`refresh_token` 을 `.env` 에 저장한다.
