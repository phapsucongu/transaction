export function formatMinorMoney(amountMinor: number | string, currency: string): string {
  const numericAmount =
    typeof amountMinor === 'string' ? Number.parseInt(amountMinor, 10) : amountMinor;

  if (!Number.isFinite(numericAmount)) {
    return `${amountMinor} ${currency}`;
  }

  return `${new Intl.NumberFormat('en-US').format(numericAmount)} ${currency}`;
}

export function parseMinorAmountInput(input: string): number {
  if (!/^\d+$/.test(input.trim())) {
    throw new Error('Amount must be an integer minor unit.');
  }

  const value = Number.parseInt(input, 10);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error('Amount must be a positive safe integer.');
  }

  return value;
}

