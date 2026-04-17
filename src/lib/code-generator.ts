const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getMonthlyPrefix = (prefix: string, date: Date = new Date()): string => {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${prefix}-${yy}${mm}-`;
};

export const getNextCodeByPrefix = (
  existingCodes: Array<string | null | undefined>,
  prefix: string,
  padding: number = 4,
): string => {
  const safePrefix = escapeRegExp(prefix);
  const pattern = new RegExp(`^${safePrefix}(\\d+)$`);
  let maxSequence = 0;

  existingCodes.forEach((code) => {
    if (!code) return;
    const matched = code.match(pattern);
    if (!matched) return;
    const sequence = Number.parseInt(matched[1], 10);
    if (!Number.isNaN(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  });

  return `${prefix}${String(maxSequence + 1).padStart(padding, '0')}`;
};