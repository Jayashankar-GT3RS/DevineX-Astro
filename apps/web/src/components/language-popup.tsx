import { useEffect, useState } from 'react';
import { Globe, X } from 'lucide-react';
import { POPULAR_LANGUAGES, LANGUAGES, saveLanguagePreference, hasSeenLanguagePrompt, markLanguagePromptSeen, DEFAULT_LANGUAGE, useT } from '@/lib/i18n';

/**
 * First-visit language prompt. Shows once per browser (localStorage flag),
 * lets the visitor pick a language or continue in English. SSR-safe: renders
 * nothing on the server and during hydration, then appears after mount if the
 * prompt has not been seen.
 */
export function LanguagePopup() {
	const [show, setShow] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const t = useT();

	useEffect(() => {
		if (!hasSeenLanguagePrompt()) {
			const timer = setTimeout(() => setShow(true), 600);
			return () => clearTimeout(timer);
		}
	}, []);

	const choose = async (code: string) => {
		await saveLanguagePreference(code);
		const target = code === DEFAULT_LANGUAGE ? '/' : `/${code}`;
		window.location.assign(target);
	};

	const dismiss = () => {
		markLanguagePromptSeen();
		setShow(false);
	};

	if (!show) return null;

	const list = expanded ? LANGUAGES : POPULAR_LANGUAGES;

	return (
		<div className="lang-popup-overlay" role="dialog" aria-modal="true" aria-label="Choose your language">
			<div className="lang-popup">
				<button className="lang-popup-close" onClick={dismiss} aria-label="Close"><X size={18} /></button>
				<div className="lang-popup-icon"><Globe size={32} /></div>
				<h3 className="lang-popup-title">{t('lang.popupWelcome')}</h3>
				<p className="lang-popup-msg">{t('lang.popupMsg')}</p>
				<div className="lang-popup-grid">
					{list.map(lang => (
						<button key={lang.code} className="lang-popup-btn" onClick={() => choose(lang.code)}>
							{lang.native}
						</button>
					))}
				</div>
				{!expanded ? (
					<button className="lang-popup-more" onClick={() => setExpanded(true)}>{t('lang.viewAll')}</button>
				) : (
					<button className="lang-popup-more" onClick={() => setExpanded(false)}>{t('lang.viewLess')}</button>
				)}
				<button className="lang-popup-continue" onClick={dismiss}>{t('lang.continueEnglish')}</button>
			</div>
		</div>
	);
}
