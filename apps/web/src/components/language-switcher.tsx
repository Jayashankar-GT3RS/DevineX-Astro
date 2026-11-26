import { useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useDisclosure } from '@/hooks/use-disclosure';
import { useLocale, useT, LANGUAGES, getLanguage, saveLanguagePreference, isVerifiedLocale, DEFAULT_LANGUAGE } from '@/lib/i18n';

/**
 * Header language selector — a globe-icon dropdown available on every page.
 * On select it persists the choice to localStorage and the signed-in profile,
 * then navigates to the localized URL so the page re-renders in the new
 * language. English keeps the existing canonical URLs.
 */
export function LanguageSwitcher() {
	const { isOpen, triggerProps, panelProps } = useDisclosure();
	const locale = useLocale();
	const t = useT();
	const [pending, setPending] = useState<string | null>(null);
	const current = getLanguage(locale) ?? getLanguage(DEFAULT_LANGUAGE)!;

	const choose = async (code: string) => {
		setPending(code);
		await saveLanguagePreference(code);
		// Full navigation so the server renders the new locale's HTML/lang.
		const target = code === DEFAULT_LANGUAGE ? '/' : `/${code}`;
		window.location.assign(target);
	};

	return (
		<div className="lang-switcher">
			<button className="lang-switcher-trigger" {...triggerProps} aria-label="Select language">
				<Globe size={16} />
				<span className="lang-switcher-code">{current.native}</span>
				<ChevronDown size={13} className={`lang-switcher-chev ${isOpen ? 'open' : ''}`} />
			</button>
			{isOpen && (
				<div className="lang-switcher-panel" {...panelProps} role="listbox">
					<div className="lang-switcher-section">
						<span className="lang-switcher-heading">भारतीय भाषाएँ · Indian Languages</span>
					</div>
					<div className="lang-switcher-grid">
						{LANGUAGES.map(lang => (
							<button
								key={lang.code}
								className={`lang-switcher-item ${lang.code === locale ? 'active' : ''}`}
								onClick={() => choose(lang.code)}
								disabled={pending !== null}
								role="option"
								aria-selected={lang.code === locale}
							>
								<span className="lang-switcher-native">{lang.native}</span>
							</button>
						))}
					</div>
					{!isVerifiedLocale(locale) && locale !== DEFAULT_LANGUAGE && (
						<p className="lang-switcher-pending">{t('lang.pendingNotice')}</p>
					)}
				</div>
			)}
		</div>
	);
}
