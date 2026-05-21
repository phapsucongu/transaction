import { describe, expect, it } from 'vitest';
import { createTransferSchema } from './transfers.schemas';

const source = '11111111-1111-4111-8111-111111111111';
const destination = '22222222-2222-4222-8222-222222222222';

describe('createTransferSchema', () => {
  it('accepts a valid minor-unit transfer payload', () => {
    expect(
      createTransferSchema.safeParse({
        source_account_id: source,
        destination_account_id: destination,
        amount_minor: 1000,
        currency: 'VND',
      }).success,
    ).toBe(true);
  });

  it('rejects same source and destination', () => {
    expect(
      createTransferSchema.safeParse({
        source_account_id: source,
        destination_account_id: source,
        amount_minor: 1000,
        currency: 'VND',
      }).success,
    ).toBe(false);
  });
});

