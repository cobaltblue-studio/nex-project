import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type TrackResponse, type TrackListResponse, type TrackCreateInput } from "@shared/routes";

export function useWorks(type?: string, creatorId?: string) {
  return useQuery({
    queryKey: [api.tracks.list.path, type, creatorId],
    queryFn: async () => {
      const url = new URL(api.tracks.list.path, window.location.origin);
      if (type) url.searchParams.set("trackType", type);
      if (creatorId) url.searchParams.set("creatorId", creatorId);
      
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tracks");
      return (await res.json()) as TrackListResponse;
    },
  });
}

export function useWork(id: string | number) {
  return useQuery({
    queryKey: [api.tracks.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.tracks.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch track");
      return (await res.json()) as TrackResponse;
    },
    enabled: !!id,
  });
}

export function useCreateWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.tracks.create.path, {
        method: api.tracks.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit track");
      }
      return (await res.json()) as TrackResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tracks.list.path] });
    },
  });
}
