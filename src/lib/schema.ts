import { z } from 'zod';

export const addLinkSchema = z.object({
  url: z.string().url(),
});

export const updateLinkSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  is_read: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
});

export const classifyResultSchema = z.object({
  category: z.string(),
  tags: z.array(z.string()),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export type AddLinkInput = z.infer<typeof addLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type ClassifyResult = z.infer<typeof classifyResultSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
