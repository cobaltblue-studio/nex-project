import { QueryClient, QueryFunction } from "@tanstack/react-query";

/** Plain-language toast copy for failed API actions (non-developer friendly). */
export function apiMutationErrorToast(err: Error): { title: string; description: string } {
  const msg = String(err?.message ?? "");
  const m = msg.match(/^(\d{3}):\s*([\s\S]+)$/);
  const status = m ? Number(m[1]) : null;
  const detail = m ? m[2].trim() : msg.trim();

  if (status === 401) {
    return {
      title: "다시 로그인해 주세요",
      description:
        "로그인이 만료된 것 같아요. 로그아웃 후 다시 로그인한 다음, 좋아요를 다시 눌러 주세요.",
    };
  }
  if (status === 409) {
    return {
      title: "오늘은 이미 응원했어요",
      description: "이 트랙은 하루에 한 번만 좋아요를 누를 수 있어요. 내일 다시 눌러 주세요.",
    };
  }
  if (status && status >= 500) {
    return {
      title: "잠시 후 다시 시도해 주세요",
      description: "서버에 일시적인 문제가 있어요. 1~2분 뒤에 다시 눌러 보세요.",
    };
  }
  if (status === 403) {
    return {
      title: "할 수 없는 작업이에요",
      description: detail || "권한이 없어요.",
    };
  }
  return {
    title: "좋아요를 저장하지 못했어요",
    description: detail || "잠시 후 다시 시도해 주세요.",
  };
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let detail = text.trim() || res.statusText;
    try {
      const j = JSON.parse(text) as { message?: unknown };
      if (typeof j?.message === "string" && j.message.trim()) {
        detail = j.message.trim();
      }
    } catch {
      /* body is not JSON */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
