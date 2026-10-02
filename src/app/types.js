import { z } from "zod";

export const MODERATION_CATEGORIES = ["OFFENSIVE", "OFF_BRAND", "VIOLENCE", "NONE"];

export const ModerationCategoryZod = z.enum([...MODERATION_CATEGORIES]);

export const GuardrailOutputZod = z.object({
  moderationRationale: z.string(),
  moderationCategory: ModerationCategoryZod,
  testText: z.string().optional(),
});
