import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type ProfileResponse, type ProfileListResponse, type ProfileCreateInput } from "@shared/routes";

export function useMe() {
  return useQuery({
    queryKey: [api.profiles.me.path],
    queryFn: async () => {
      const res = await fetch(api.profiles.me.path, { credentials: "include" });
      if (res.status === 404) return null; // No profile yet
      if (res.status === 401) return null; // Not logged in
      if (!res.ok) throw new Error("Failed to fetch profile");
      return (await res.json()) as ProfileResponse;
    },
  });
}

export function useProfile(id: string | number) {
  return useQuery({
    queryKey: [api.profiles.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.profiles.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch profile");
      return (await res.json()) as ProfileResponse;
    },
    enabled: !!id,
  });
}

export function useProfiles(league?: string) {
  return useQuery({
    queryKey: [api.profiles.list.path, league],
    queryFn: async () => {
      const url = new URL(api.profiles.list.path, window.location.origin);
      if (league) url.searchParams.set("league", league);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profiles");
      return (await res.json()) as ProfileListResponse;
    },
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ProfileCreateInput) => {
      const res = await fetch(api.profiles.create.path, {
        method: api.profiles.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create profile");
      }
      return (await res.json()) as ProfileResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.profiles.me.path] });
      queryClient.invalidateQueries({ queryKey: [api.profiles.list.path] });
    },
  });
}
