import { AppError } from '../security/errors';

export function parsePaise(input: string): number {
  let value = input.trim().replace(/^(?:INR|₹)\s*/i,'');
  const parenthesis = /^\(.+\)$/.test(value);
  if (parenthesis) value = '-' + value.slice(1,-1);
  // Accept plain, international grouping or Indian grouping; never strip arbitrary punctuation.
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(value)) {
    throw new AppError('VALIDATION_ERROR',400,'Amount must be INR with at most two decimal places.');
  }
  const negative = value.startsWith('-');
  const [rupees, decimal=''] = value.replace(/^[+-]/,'').replaceAll(',','').split('.');
  const paise = BigInt(rupees)*100n + BigInt(decimal.padEnd(2,'0'));
  if (paise > 1_000_000_000_000n) throw new AppError('VALIDATION_ERROR',400,'Amount exceeds the supported limit.');
  return Number(negative ? -paise : paise);
}
export function sumPaise(values: number[]): number {
  const result = values.reduce((sum,n) => sum + BigInt(n),0n);
  if (result > BigInt(Number.MAX_SAFE_INTEGER) || result < BigInt(Number.MIN_SAFE_INTEGER)) throw new AppError('VALIDATION_ERROR',400,'Financial aggregate exceeds supported precision.');
  return Number(result);
}
export const formatPaise = (paise: number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(paise/100);
