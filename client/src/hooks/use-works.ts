import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type WorkResponse, type WorkListResponse, type WorkCreateInput } from "@shared/routes";

export function useWorks(type?: string, creatorId?: string) {
  return useQuery({
    queryKey: [api.works.list.path, type, creatorId],
    queryFn: async () => {
      const url = new URL(api.works.list.path, window.location.origin);
      if (type) url.searchParams.set("type", type);
      if (creatorId) url.searchParams.set("creatorId", creatorId);
      
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch works");
      return (await res.json()) as WorkListResponse;
    },
  });
}

export function useWork(id: string | number) {
  return useQuery({
    queryKey: [api.works.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.works.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch work");
      return (await res.json()) as WorkResponse;
    },
    enabled: !!id,
  });
}

export function useCreateWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: WorkCreateInput) => {
      const res = await fetch(api.works.create.path, {
        method: api.works.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit work");
      }
      return (await res.json()) as WorkResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.works.list.path] });
    },
  });
}
