type KoFields = {
  subjectKo: string;
  headlineKo: string;
  bodyKo: string;
  ctaLabelKo?: string;
};

export type EnFields = {
  subjectEn: string;
  headlineEn: string;
  bodyEn: string;
  ctaLabelEn: string;
};

async function translateWithOpenAi(fields: KoFields): Promise<EnFields | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const prompt = `Translate these NEX music platform announcement fields from Korean to natural English.
Keep the body paragraph breaks (blank lines). Keep brand name NEX unchanged.
Return ONLY valid JSON with keys: subjectEn, headlineEn, bodyEn, ctaLabelEn.

Korean input:
subject: ${fields.subjectKo}
headline: ${fields.headlineKo}
body:
${fields.bodyKo}
cta: ${fields.ctaLabelKo || "NEX 열기"}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TRANSLATE_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You translate Korean product announcements to clear English for an international audience.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EnFields>;
    if (!parsed.subjectEn?.trim() || !parsed.headlineEn?.trim() || !parsed.bodyEn?.trim()) {
      return null;
    }
    return {
      subjectEn: parsed.subjectEn.trim(),
      headlineEn: parsed.headlineEn.trim(),
      bodyEn: parsed.bodyEn.trim(),
      ctaLabelEn: parsed.ctaLabelEn?.trim() || "Open NEX",
    };
  } catch {
    return null;
  }
}

async function translateTextKoToEn(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "ko");
  url.searchParams.set("tl", "en");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", trimmed);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "NEX-Announcement/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Translation service unavailable (${res.status})`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error("Translation service returned an unexpected response");
  }
  return (data[0] as Array<[string, ...unknown[]]>)
    .map((chunk) => chunk[0])
    .join("")
    .trim();
}

export async function translateAnnouncementKoToEn(fields: KoFields): Promise<EnFields> {
  const fromOpenAi = await translateWithOpenAi(fields);
  if (fromOpenAi) return fromOpenAi;

  const [subjectEn, headlineEn, bodyEn, ctaLabelEn] = await Promise.all([
    translateTextKoToEn(fields.subjectKo),
    translateTextKoToEn(fields.headlineKo),
    translateTextKoToEn(fields.bodyKo),
    translateTextKoToEn(fields.ctaLabelKo?.trim() || "NEX 열기"),
  ]);

  return {
    subjectEn,
    headlineEn,
    bodyEn,
    ctaLabelEn: ctaLabelEn || "Open NEX",
  };
}
