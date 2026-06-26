import { z } from 'zod';

export const addLinkSchema = z.object({
  url: z.string().url(),
});

export const updateLinkSchema = z.object({
  title: z.string().max(500).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  is_read: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
});

export const classifyResultSchema = z.object({
  category: z.string(),
  tags: z.array(z.string()),
  // Título conciso sugerido pela IA quando o original é ausente/ruim/longo demais;
  // null (ou ausente) significa "manter o título atual".
  title: z.string().nullable().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export type AddLinkInput = z.infer<typeof addLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type ClassifyResult = z.infer<typeof classifyResultSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
