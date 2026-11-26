/**
 * Translation runtime: dictionary lookup, locale hooks and client-side
 * language persistence. Shared by server render and client — no browser-only
 * values are read during render.
 */
import { useCallback, useMemo } from 'react';
import { useMatches } from 'react-router';
import pb from '@/lib/pocketbase-client';
import { DEFAULT_LANGUAGE, isLocale, isVerifiedLocale, localePath } from './languages';
import { en, type TranslationKey } from './dictionaries/en';
import { hi } from './dictionaries/hi';
import { bn } from './dictionaries/bn';
import { te } from './dictionaries/te';
import { mr } from './dictionaries/mr';
import { ta } from './dictionaries/ta';
import { gu } from './dictionaries/gu';
import { kn } from './dictionaries/kn';
import { ml } from './dictionaries/ml';
import { or } from './dictionaries/or';
import { pa } from './dictionaries/pa';
import { as } from './dictionaries/as';

export type { TranslationKey };

const dictionaries: Record<string, Partial<Record<TranslationKey, string>>> = {
	en,
	hi,
	bn,
	te,
	mr,
	ta,
	gu,
	kn,
	ml,
	or,
	pa,
	as,
};

export function getDictionary(locale: string): Partial<Record<TranslationKey, string>> {
	return dictionaries[isLocale(locale) ? locale : DEFAULT_LANGUAGE] ?? {};
}

/** Translate a key with English fallback (never a fake machine translation). */
export function translate(locale: string, key: TranslationKey): string {
	const dict = getDictionary(locale);
	return dict[key] ?? en[key] ?? key;
}

export { isLocale, isVerifiedLocale, localePath, DEFAULT_LANGUAGE };
export { LANGUAGES, POPULAR_LANGUAGES, getLanguage, stripLocale, VERIFIED_LOCALES } from './languages';

/**
 * Current locale from the matched routes: `/:lang?/...` routes carry a `lang`
 * param; the bare `/:lang` localized home is served by the page route, where
 * the `page` param itself is a locale code.
 */
export function useLocale(): string {
	const matches = useMatches();
	for (const match of matches) {
		const lang = (match.params as Record<string, string | undefined>).lang;
		if (lang && isLocale(lang)) return lang;
	}
	for (const match of matches) {
		const page = (match.params as Record<string, string | undefined>).page;
		if (page && isLocale(page) && page !== DEFAULT_LANGUAGE) return page;
	}
	return DEFAULT_LANGUAGE;
}

/** Translator bound to the current locale. */
export function useT() {
	const locale = useLocale();
	return useMemo(() => (key: TranslationKey) => translate(locale, key), [locale]);
}

/** Build locale-aware hrefs so navigation keeps the visitor's language. */
export function useLocalePath() {
	const locale = useLocale();
	return useCallback((path: string) => localePath(locale, path), [locale]);
}

// ---- Client-side persistence (localStorage + customer profile) ----

export const LANGUAGE_STORAGE_KEY = 'devinex_preferred_language';
export const LANGUAGE_PROMPT_KEY = 'devinex_language_prompted';

export function getSavedLanguage(): string | null {
	if (typeof localStorage === 'undefined') return null;
	const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
	return isLocale(value) ? value : null;
}

export function hasSeenLanguagePrompt(): boolean {
	if (typeof localStorage === 'undefined') return true;
	return localStorage.getItem(LANGUAGE_PROMPT_KEY) === 'seen';
}

export function markLanguagePromptSeen(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(LANGUAGE_PROMPT_KEY, 'seen');
}

/** Persist the choice locally and (when signed in) on the customer profile. */
export async function saveLanguagePreference(locale: string): Promise<void> {
	if (!isLocale(locale) || typeof localStorage === 'undefined') return;
	localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
	markLanguagePromptSeen();
	try {
		const user = pb.authStore.record;
		if (user && user.preferredLanguage !== locale) {
			await pb.collection('users').update(user.id, { preferredLanguage: locale }, { requestKey: null });
		}
	} catch {
		// Profile sync is best-effort; the local preference still applies.
	}
}
