/** Normalize an unknown thrown value into a user-facing message. */
export function toMessage(err: unknown, fallback = '予期しないエラーが発生しました'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}
