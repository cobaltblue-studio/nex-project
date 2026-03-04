import { z } from "zod";
import { insertProfileSchema, insertWorkSchema, profiles, works } from "./schema";
import { users } from "./models/auth";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  profiles: {
    me: {
      method: "GET" as const,
      path: "/api/profiles/me" as const,
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/profiles" as const,
      input: insertProfileSchema,
      responses: {
        201: z.custom<typeof profiles.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/profiles" as const,
      input: z.object({
        league: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof profiles.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/profiles/:id" as const,
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  works: {
    list: {
      method: "GET" as const,
      path: "/api/works" as const,
      input: z.object({
        type: z.string().optional(),
        creatorId: z.string().optional(),
        limit: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof works.$inferSelect & { creator: typeof profiles.$inferSelect }>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/works/:id" as const,
      responses: {
        200: z.custom<typeof works.$inferSelect & { creator: typeof profiles.$inferSelect }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/works" as const,
      input: insertWorkSchema,
      responses: {
        201: z.custom<typeof works.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound, // If profile not found
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type ProfileResponse = z.infer<typeof api.profiles.get.responses[200]>;
export type ProfileListResponse = z.infer<typeof api.profiles.list.responses[200]>;
export type ProfileCreateInput = z.infer<typeof api.profiles.create.input>;

export type WorkResponse = z.infer<typeof api.works.get.responses[200]>;
export type WorkListResponse = z.infer<typeof api.works.list.responses[200]>;
export type WorkCreateInput = z.infer<typeof api.works.create.input>;
