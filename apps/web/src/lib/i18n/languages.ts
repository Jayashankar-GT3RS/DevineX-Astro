/**
 * Language registry for the DevineX Astro multilingual platform.
 *
 * Covers English plus all 22 officially scheduled Indian languages. The
 * registry is the single source of truth for locale codes, native names,
 * script direction and translation status. Adding a future regional language
 * (Bhojpuri, Tulu, Rajasthani, …) is one new entry here plus a dictionary
 * file — every other part of the system reads this list.
 *
 * status:
 *  - 'verified': a complete, reviewed UI dictionary exists (site chrome is
 *    fully translated; database content still follows the translation
 *    review pipeline).
 *  - 'pending': the language is selectable but its UI dictionary has not been
 *    reviewed yet — visitors see English content with an honest notice. No
 *    fake or machine-unreviewed translations are displayed as final.
 */
export interface LanguageInfo {
	code: string;
	name: string;
	native: string;
	rtl?: boolean;
	popular?: boolean;
	status: 'verified' | 'pending';
}

export const LANGUAGES: LanguageInfo[] = [
	{ code: 'en', name: 'English', native: 'English', popular: true, status: 'verified' },
	{ code: 'hi', name: 'Hindi', native: 'हिन्दी', popular: true, status: 'verified' },
	{ code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', popular: true, status: 'verified' },
	{ code: 'te', name: 'Telugu', native: 'తెలుగు', popular: true, status: 'verified' },
	{ code: 'ta', name: 'Tamil', native: 'தமிழ்', popular: true, status: 'verified' },
	{ code: 'bn', name: 'Bengali', native: 'বাংলা', popular: true, status: 'verified' },
	{ code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', popular: true, status: 'verified' },
	{ code: 'mr', name: 'Marathi', native: 'मराठी', popular: true, status: 'verified' },
	{ code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', popular: true, status: 'verified' },
	{ code: 'ml', name: 'Malayalam', native: 'മലയാളം', popular: true, status: 'verified' },
	{ code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', popular: true, status: 'verified' },
	{ code: 'as', name: 'Assamese', native: 'অসমীয়া', popular: true, status: 'verified' },
	// Remaining scheduled languages — selectable, translations pending review.
	{ code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्', status: 'pending' },
	{ code: 'ur', name: 'Urdu', native: 'اردو', rtl: true, status: 'pending' },
	{ code: 'sd', name: 'Sindhi', native: 'सिन्धी', status: 'pending' },
	{ code: 'brx', name: 'Bodo', native: 'बड़ो', status: 'pending' },
	{ code: 'doi', name: 'Dogri', native: 'डोगरी', status: 'pending' },
	{ code: 'ks', name: 'Kashmiri', native: 'कॉशुर', status: 'pending' },
	{ code: 'kok', name: 'Konkani', native: 'कोंकणी', status: 'pending' },
	{ code: 'mai', name: 'Maithili', native: 'मैथिली', status: 'pending' },
	{ code: 'mni', name: 'Manipuri (Meitei)', native: 'ꯃꯤꯇꯩꯂꯣꯟ', status: 'pending' },
	{ code: 'ne', name: 'Nepali', native: 'नेपाली', status: 'pending' },
	{ code: 'sat', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ', status: 'pending' },
];

export const DEFAULT_LANGUAGE = 'en';

export const LOCALE_CODES: string[] = LANGUAGES.map(l => l.code);

export const VERIFIED_LOCALES: string[] = LANGUAGES.filter(l => l.status === 'verified').map(l => l.code);

export const POPULAR_LANGUAGES: LanguageInfo[] = LANGUAGES.filter(l => l.popular);

export function getLanguage(code: string | undefined | null): LanguageInfo | undefined {
	if (!code) return undefined;
	return LANGUAGES.find(l => l.code === code);
}

export function isLocale(code: string | undefined | null): boolean {
	return Boolean(code && LOCALE_CODES.includes(code));
}

/** True when the locale has a complete reviewed UI dictionary. */
export function isVerifiedLocale(code: string | undefined | null): boolean {
	return Boolean(code && VERIFIED_LOCALES.includes(code));
}

/**
 * Prefix a site path with a locale. English (the default) keeps the existing
 * canonical URLs — `/courses` stays `/courses`, preserving already-indexed
 * URLs. Other locales get `/hi/courses` style URLs.
 */
export function localePath(locale: string, path: string): string {
	if (!isLocale(locale) || locale === DEFAULT_LANGUAGE) return path;
	return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

/** Split a pathname into its locale (default 'en') and the locale-free path. */
export function stripLocale(pathname: string): { locale: string; path: string } {
	const segment = pathname.split('/')[1] ?? '';
	if (segment && isLocale(segment) && segment !== DEFAULT_LANGUAGE) {
		const rest = pathname.slice(segment.length + 1);
		return { locale: segment, path: rest || '/' };
	}
	return { locale: DEFAULT_LANGUAGE, path: pathname };
}
