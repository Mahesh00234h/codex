export const DEMO_DATA_MODE = import.meta.env.VITE_DEMO_DATA_MODE === 'true';

export function isMissingBackendError(error: unknown): boolean {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message)
    : String(error ?? '');

  return (
    message.includes('schema cache') ||
    message.includes('Could not find the table') ||
    message.includes('PGRST205') ||
    message.includes('Failed to fetch') ||
    message.includes('Edge Function')
  );
}

