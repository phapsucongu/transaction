import { z } from 'zod';

export const createTransferSchema = z
  .object({
    source_account_id: z.string().uuid('Select a source account.'),
    destination_account_id: z.string().uuid('Select a destination account.'),
    amount_minor: z.coerce
      .number()
      .int('Amount must be an integer minor unit.')
      .min(1, 'Amount must be greater than 0.'),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter uppercase code.'),
  })
  .refine((data) => data.source_account_id !== data.destination_account_id, {
    path: ['destination_account_id'],
    message: 'Destination must be different from source.',
  });

export type CreateTransferFormValues = z.infer<typeof createTransferSchema>;

