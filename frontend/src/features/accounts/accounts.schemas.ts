import { z } from 'zod';

export const createAccountSchema = z.object({
  code: z.string().trim().min(1, 'Code is required.').max(50, 'Code is too long.'),
  name: z.string().trim().min(1, 'Name is required.').max(100, 'Name is too long.'),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter uppercase code.'),
});

export const topupSchema = z.object({
  amount_minor: z.coerce
    .number()
    .int('Amount must be an integer minor unit.')
    .min(1, 'Amount must be greater than 0.'),
});

export type CreateAccountFormValues = z.infer<typeof createAccountSchema>;
export type TopupFormValues = z.infer<typeof topupSchema>;

