export const TRIAL_I18N = {
  pl: {
    'trial.banner.remaining': 'Pozostało {count} dni testu',
    'trial.banner.lastDay': 'Ostatni dzień testu',
    'trial.modal.title': 'Okres testowy wygasł',
    'trial.modal.expiresAt': 'Data wygaśnięcia: {date}',
    'trial.modal.cta': 'Skontaktuj się / Kup'
  },
  en: {
    'trial.banner.remaining': '{count} days left in trial',
    'trial.banner.lastDay': 'Last day of trial',
    'trial.modal.title': 'Trial has expired',
    'trial.modal.expiresAt': 'Expiration date: {date}',
    'trial.modal.cta': 'Contact us / Buy'
  }
} as const;

export type TrialLang = keyof typeof TRIAL_I18N;

export function tTrial(key: keyof typeof TRIAL_I18N['pl'], params: Record<string, string | number> = {}, lang: TrialLang = 'pl'): string {
  const dict = TRIAL_I18N[lang] as Record<string, string>;
  let s = dict[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    s = s.replace(`{${k}}`, String(v));
  }
  return s;
}
