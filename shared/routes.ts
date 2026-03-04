import { z } from "zod";
import { insertProfileSchema, insertTrackSchema, profiles, tracks } from "./schema";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  forbidden: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    me: { method: "GET" as const, path: "/api/auth/user" as const, responses: { 200: z.any() } },
  },
  profiles: {
    me: { method: "GET" as const, path: "/api/profiles/me" as const, responses: { 200: z.custom<typeof profiles.$inferSelect>(), 404: errorSchemas.notFound } },
    get: { method: "GET" as const, path: "/api/profiles/:id" as const, responses: { 200: z.custom<typeof profiles.$inferSelect & { tracks: any[] }>(), 404: errorSchemas.notFound } },
  },
  tracks: {
    list: { 
      method: "GET" as const, 
      path: "/api/tracks" as const, 
      input: z.object({ status: z.string().optional(), featured: z.boolean().optional(), limit: z.coerce.number().optional() }).optional(),
      responses: { 200: z.array(z.any()) } 
    },
    get: { method: "GET" as const, path: "/api/tracks/:id" as const, responses: { 200: z.any(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/tracks" as const, input: insertTrackSchema, responses: { 201: z.any(), 401: errorSchemas.unauthorized } },
    vote: { method: "POST" as const, path: "/api/tracks/:id/vote" as const, responses: { 200: z.any(), 401: errorSchemas.unauthorized } },
    like: { method: "POST" as const, path: "/api/tracks/:id/like" as const, responses: { 200: z.any(), 401: errorSchemas.unauthorized } },
  },
  admin: {
    review: { method: "POST" as const, path: "/api/admin/tracks/:id/review" as const, input: z.object({ status: z.enum(["PUBLISHED", "REJECTED"]), aiCraftScore: z.number().optional() }), responses: { 200: z.any(), 403: errorSchemas.forbidden } },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}
