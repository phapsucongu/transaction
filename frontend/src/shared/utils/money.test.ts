import { describe, expect, it } from 'vitest';
import { formatMinorMoney, parseMinorAmountInput } from './money';

describe('money utils', () => {
  it('formats integer minor units without doing financial math', () => {
    expect(formatMinorMoney(100000, 'VND')).toBe('100,000 VND');
  });

  it('parses positive integer minor unit input', () => {
    expect(parseMinorAmountInput('123')).toBe(123);
  });

  it('rejects decimal input', () => {
    expect(() => parseMinorAmountInput('1.23')).toThrow('integer minor unit');
  });
});

