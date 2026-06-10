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
              <h2 className="text-sm font-bold text-zinc-200 mb-2">1. 수집하는 데이터</h2>
              <p>
                NEX는 차트·배틀·재생 집계를 위해 트랙 메타데이터, 재생·투표·배틀 이벤트, 기기 유형(mobile/desktop),
                유입 도메인(referrer 호스트), 그리고 로그인 사용자의 프로필 국가를 수집할 수 있습니다.
              </p>
            </section>
            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">2. B2B 데이터 상품 (익명화)</h2>
              <p>
                플랫폼이 성장함에 따라 NEX는 <strong className="text-zinc-300">익명·집계된</strong> 행동 데이터와
                카탈로그 메타데이터를 연구·분석·산업 인사이트 목적으로 제3자에 제공할 수 있습니다.
                B2B보내기에는 이메일, OAuth 식별자, 원문 ai_prompt가 포함되지 않으며, listener_id는
                일방향 해시로 처리됩니다. 재식별(re-identification) 시도는 금지됩니다.
              </p>
            </section>
            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">3. 크리에이터 콘텐츠</h2>
              <p>
                업로드한 트랙·프롬프트·링크의 권리는 크리에이터에게 있습니다. NEX는 차트 운영·통계·익명화 리포트
                생성을 위한 <strong className="text-zinc-300">비독점적 이용</strong> 권한을 서비스 이용 시 부여받습니다.
                오디오/영상 파일 자체의 재판매는 하지 않습니다.
              </p>
            </section>
            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">4. 문의</h2>
              <p>
                데이터 라이선스·삭제 요청:{" "}
                <a href="mailto:d9ckoblack@gmail.com" className="text-primary hover:underline">
                  d9ckoblack@gmail.com
                </a>
              </p>
            </section>
          </>
        ) : (
          <>
            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">1. What we collect</h2>
              <p>
                NEX collects track metadata, play/vote/battle events, device class (mobile/desktop), referrer host,
                and profile country for signed-in users to operate charts and battles.
              </p>
            </section>
            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">2. B2B data products (anonymized)</h2>
              <p>
                As the platform grows, NEX may license <strong className="text-zinc-300">anonymized, aggregated</strong>{" "}
                behavioral data and catalog metadata to third parties for research and industry insights. B2B exports
                exclude emails, OAuth ids, and raw ai_prompt text; listener_id uses one-way hashing. Re-identification
                attempts are prohibited.
              </p>
            </section>
            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">3. Creator content</h2>
              <p>
                Creators retain rights to submitted tracks, prompts, and links. By using NEX you grant a{" "}
                <strong className="text-zinc-300">non-exclusive</strong> license for chart operation, statistics, and
                anonymized reporting. We do not resell audio/video files.
              </p>
            </section>
            <section>
              <h2 className="text-sm font-bold text-zinc-200 mb-2">4. Contact</h2>
              <p>
                Data licensing or deletion requests:{" "}
                <a href="mailto:d9ckoblack@gmail.com" className="text-primary hover:underline">
                  d9ckoblack@gmail.com
                </a>
              </p>
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
