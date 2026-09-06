import { useTranslation } from "react-i18next";
import { Link } from "wouter";

export default function DataPolicy() {
  const { i18n } = useTranslation();
  const ko = i18n.language.startsWith("ko");

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-primary/60 mb-2">NEX Platform</p>
      <h1 className="text-2xl font-black uppercase tracking-[0.15em] text-white mb-6 neon-text-green">
        {ko ? "데이터·개인정보 정책" : "Data & Privacy Policy"}
      </h1>

      <div className="space-y-6 text-[13px] text-zinc-400 leading-relaxed">
        {ko ? (
          <>
            <section>
              <p>
                NEX(nexmusic.ai)는 AI 음악 차트·배틀·커뮤니티 서비스입니다. 본 문서는 NEX가 서비스를 제공하기 위해
                다루는 정보와 이용 방식을 안내합니다. 법령상 「개인정보처리방침」의{" "}
                <strong className="text-zinc-300">운영 초안</strong>이며, 서비스 변화에 따라 개정될 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">1. 수집하는 정보</h2>
              <p className="mb-2 font-semibold text-zinc-300">계정·로그인 (Google 로그인 시)</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>이메일, 이름(또는 표시 이름), 프로필 이미지 URL, Google 계정 식별자</li>
                <li>로그인 유지를 위한 세션 정보(쿠키)</li>
              </ul>
              <p className="mb-2 font-semibold text-zinc-300">프로필</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>사용자명, 소개, 국가, 아바타, 사용 AI 툴 등 직접 입력·선택한 정보</li>
              </ul>
              <p className="mb-2 font-semibold text-zinc-300">서비스 이용 기록</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>트랙 제출·메타데이터, 재생·좋아요·투표·배틀·팔로우</li>
                <li>커뮤니티 글·댓글·좋아요</li>
                <li>방문·페이지 이용 기록, 유입 정보(예: referrer, UTM 등)</li>
                <li>게스트 이용 시 브라우저에 저장되는 임시 식별자(로그인 전 재생 등)</li>
              </ul>
              <p className="mb-2 font-semibold text-zinc-300">알림·운영</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  계정 이메일로 보내는 서비스 알림(트랙 승인/거절, 좋아요, 재생, 팔로우, 배틀 결과, 중요 공지 등) 및
                  관련 발송 기록
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">2. 이용 목적</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>회원 식별·로그인·보안</li>
                <li>차트·배틀·랭킹·커뮤니티 운영</li>
                <li>크리에이터 알림·고객 대응</li>
                <li>서비스 개선·부정 이용 방지·통계(가능한 경우 집계·익명화)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">3. 보관</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>서비스 제공에 필요한 기간 동안 데이터베이스 등에 보관합니다.</li>
                <li>로그인 세션 쿠키는 약 7일(설정에 따름)입니다.</li>
                <li>
                  구체적 보존 기간표는 아직 운영에 고정되어 있지 않으며, 개정 시 본 문서에 명시합니다.
                </li>
                <li>
                  삭제·탈퇴 요청이 오면 합리적인 범위에서 처리합니다(법적 보관 의무가 있는 기록은 예외).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">4. 제3자·처리 위탁 (인프라)</h2>
              <p className="mb-2">NEX 운영을 위해 아래 유형의 서비스에 정보가 처리될 수 있습니다.</p>
              <ul className="list-disc pl-5 space-y-1 mb-2">
                <li>
                  <strong className="text-zinc-300">Google</strong> — 로그인(OAuth)
                </li>
                <li>
                  <strong className="text-zinc-300">Resend</strong> — 이메일 발송
                </li>
                <li>
                  <strong className="text-zinc-300">Neon</strong> — 데이터베이스
                </li>
                <li>
                  <strong className="text-zinc-300">Railway / Vercel</strong> — 서버·웹 호스팅
                </li>
              </ul>
              <p>
                위 사업자의 자체 정책이 추가로 적용될 수 있습니다. 마케팅 목적의 이메일 무단 판매는 하지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">5. B2B·익명 데이터 (선택·향후)</h2>
              <p>
                플랫폼이 성장하면,{" "}
                <strong className="text-zinc-300">이메일·OAuth 식별자·원문 프롬프트 등을 제외한</strong> 익명·집계
                데이터를 연구·산업 인사이트 목적으로 제공할 수 있습니다. 재식별 시도는 금지합니다. 현재 대량 B2B
                반출이 상시 가동 중이지는 않을 수 있으며, 가동·변경 시 본 문서를 갱신합니다.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">6. 크리에이터 콘텐츠</h2>
              <p>
                업로드한 트랙·프롬프트·링크의 권리는 크리에이터에게 있습니다. NEX는 차트·통계·서비스 운영을 위한{" "}
                <strong className="text-zinc-300">비독점적 이용</strong> 권한을 부여받으며, 오디오/영상 파일 자체를
                재판매하지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">7. 이용자 권리·요청</h2>
              <p>
                열람·수정·삭제·탈퇴·메일 수신 관련 요청:{" "}
                <a href="mailto:d9ckoblack@gmail.com" className="text-primary hover:underline">
                  d9ckoblack@gmail.com
                </a>
              </p>
              <p className="mt-2">현재 앱 내 원클릭 탈퇴 기능은 없으며, 요청 후 수동 처리합니다.</p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">8. 문의·개정</h2>
              <p>
                문의:{" "}
                <a href="mailto:d9ckoblack@gmail.com" className="text-primary hover:underline">
                  d9ckoblack@gmail.com
                </a>
              </p>
              <p className="mt-2">개정 시 본 페이지에 게시합니다. 초안 기준일: 2026-09-06</p>
            </section>
          </>
        ) : (
          <>
            <section>
              <p>
                NEX (nexmusic.ai) is an AI music chart, battle, and community service. This page explains what
                information we handle to run the service. It is an{" "}
                <strong className="text-zinc-300">operational draft</strong> of a privacy notice and may be updated as
                the product changes.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">1. Information we collect</h2>
              <p className="mb-2 font-semibold text-zinc-300">Account &amp; login (Google sign-in)</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>Email, name (or display name), profile image URL, Google account identifier</li>
                <li>Session information (cookie) to keep you signed in</li>
              </ul>
              <p className="mb-2 font-semibold text-zinc-300">Profile</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>Username, bio, country, avatar, AI tools used, and other details you enter or choose</li>
              </ul>
              <p className="mb-2 font-semibold text-zinc-300">Service activity</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>Track submissions and metadata; plays, likes, votes, battles, follows</li>
                <li>Community posts, comments, and likes</li>
                <li>Visit / page activity and acquisition info (e.g. referrer, UTM)</li>
                <li>Temporary browser identifiers for guest use (e.g. plays before login)</li>
              </ul>
              <p className="mb-2 font-semibold text-zinc-300">Notifications &amp; operations</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Service emails to your account address (track approve/reject, likes, plays, follows, battle
                  results, important announcements) and related delivery records
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">2. Purposes</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Account identity, login, and security</li>
                <li>Operating charts, battles, rankings, and community</li>
                <li>Creator notifications and support</li>
                <li>Product improvement, abuse prevention, and statistics (aggregated/anonymized where practical)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">3. Retention</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>We keep data in our database for as long as needed to provide the service.</li>
                <li>Login session cookies last about 7 days (per configuration).</li>
                <li>A fixed retention schedule is not yet locked in code/ops; we will update this page when it is.</li>
                <li>
                  Deletion or account-closure requests are handled within a reasonable scope (except records we must
                  keep by law).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">4. Processors / infrastructure</h2>
              <p className="mb-2">Information may be processed by services we use to run NEX:</p>
              <ul className="list-disc pl-5 space-y-1 mb-2">
                <li>
                  <strong className="text-zinc-300">Google</strong> — sign-in (OAuth)
                </li>
                <li>
                  <strong className="text-zinc-300">Resend</strong> — email delivery
                </li>
                <li>
                  <strong className="text-zinc-300">Neon</strong> — database
                </li>
                <li>
                  <strong className="text-zinc-300">Railway / Vercel</strong> — API and web hosting
                </li>
              </ul>
              <p>
                Those providers’ own policies may also apply. We do not sell your email for marketing.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">5. B2B / anonymized data (optional, future)</h2>
              <p>
                As the platform grows, we may provide{" "}
                <strong className="text-zinc-300">anonymized, aggregated</strong> data for research and industry
                insights, excluding emails, OAuth identifiers, and raw prompt text. Re-identification attempts are
                prohibited. Large-scale B2B export may not be running continuously today; we will update this page if
                that changes.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">6. Creator content</h2>
              <p>
                Creators retain rights to submitted tracks, prompts, and links. By using NEX you grant a{" "}
                <strong className="text-zinc-300">non-exclusive</strong> license for chart operation, statistics, and
                service operation. We do not resell audio/video files.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">7. Your requests</h2>
              <p>
                Access, correction, deletion, account closure, or email preferences:{" "}
                <a href="mailto:d9ckoblack@gmail.com" className="text-primary hover:underline">
                  d9ckoblack@gmail.com
                </a>
              </p>
              <p className="mt-2">There is no one-click in-app account deletion yet; requests are handled manually.</p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">8. Contact &amp; updates</h2>
              <p>
                Contact:{" "}
                <a href="mailto:d9ckoblack@gmail.com" className="text-primary hover:underline">
                  d9ckoblack@gmail.com
                </a>
              </p>
              <p className="mt-2">Updates will be posted on this page. Draft date: 2026-09-06</p>
            </section>
          </>
        )}

        <p className="text-[11px] text-zinc-600">
          <Link href="/about" className="text-primary hover:underline">
            {ko ? "NEX 소개" : "About NEX"}
          </Link>
        </p>
      </div>
    </div>
  );
}
