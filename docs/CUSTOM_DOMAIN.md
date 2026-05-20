# nexmusic.ai 커스텀 도메인 (Railway)

주소창에 `nex-project-production.up.railway.app`이 보이면 **도메인 미연결**이거나 **예전 빌드**가 서빙 중일 수 있습니다.

## 1. Railway — Custom Domain (필수)

1. [Railway](https://railway.app) → **nex-project** 서비스
2. **Settings** → **Networking** → **Custom Domain**
3. `nexmusic.ai` 추가 → DNS에 안내된 **CNAME** 입력
4. (권장) `www.nexmusic.ai`도 추가
5. 상태가 **Active** / 인증서 **Ready**일 때까지 대기 (10~30분)

`nexmusic.ai`가 Active가 아니면 브라우저가 Railway 기본 URL로만 열립니다.

## 2. DNS (도메인 등록업체)

| 호스트 | 타입 | 값 |
|--------|------|-----|
| `@` | CNAME 또는 ALIAS | Railway가 준 CNAME |
| `www` | CNAME | Railway가 준 CNAME |

## 3. Railway 환경 변수

```bash
PUBLIC_APP_URL=https://nexmusic.ai
VITE_PUBLIC_SITE_URL=https://nexmusic.ai
```

**중요 — `GOOGLE_CALLBACK_URL`**

- 값이 `https://nex-project-production.up.railway.app/...` 로만 되어 있으면 **삭제**하거나 `https://nexmusic.ai/api/auth/google/callback` 로 바꾸세요.
- 비우면 로그인 시 **지금 접속한 호스트**(`nexmusic.ai` 또는 Railway)에 맞는 callback을 씁니다.

배포 후 Railway 기본 URL로 들어가도 서버/클라이언트가 **301으로 nexmusic.ai**로 보냅니다 (`server/canonicalHost.ts`).

## 4. Google Cloud Console (로그인 화면)

[Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials** → OAuth 2.0 Client

**Authorized redirect URIs** (둘 다 등록 권장):

```
https://nexmusic.ai/api/auth/google/callback
https://www.nexmusic.ai/api/auth/google/callback
https://nex-project-production.up.railway.app/api/auth/google/callback
```

**Authorized JavaScript origins**:

```
https://nexmusic.ai
https://www.nexmusic.ai
https://nex-project-production.up.railway.app
```

OAuth 동의 화면 **Application home page**: `https://nexmusic.ai`

## 5. 배포 확인 (UI가 안 바뀔 때)

코드는 GitHub에 push되어야 Railway가 새로 빌드합니다.

배포 성공 후 브라우저에서:

```
https://nexmusic.ai/api/health
```

응답에 `"creatorDirectoryV3": true` 가 있으면 **최신 서버**입니다.

| 확인 | 최신이면 |
|------|----------|
| `/music` | `— empty` 슬롯 없음 |
| `/new` | `0 PLAYS` 곡 없음 |
| `/creators` | 상단에 재생 많은 크리에이터, **Wins 숫자** (승률 % 아님) |

위가 그대로면 **아직 예전 빌드** — Railway Deployments에서 최신 커밋이 Success인지 확인하세요.

## 6. HTTPS

Railway가 Let's Encrypt를 자동 발급합니다. DNS 전파 후 적용됩니다.

## 7. 로컬 개발

`canonicalHost` 리다이렉트는 `NODE_ENV=production`에서만 동작합니다. 로컬은 `localhost` 그대로 사용합니다.
