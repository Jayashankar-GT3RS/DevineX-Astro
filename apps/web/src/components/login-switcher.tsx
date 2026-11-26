import { Link } from 'react-router';
import { ChevronDown, GraduationCap, Users } from 'lucide-react';
import { useDisclosure } from '@/hooks/use-disclosure';
import { useT, useLocalePath } from '@/lib/i18n';

/**
 * Header login selector — a single "Log in" dropdown that branches into the
 * student/customer portal and the trainer portal. Replaces the two separate
 * header links with one consolidated entry point.
 */
export function LoginSwitcher() {
	const { isOpen, triggerProps, panelProps } = useDisclosure();
	const t = useT();
	const lp = useLocalePath();

	return (
		<div className="login-switcher">
			<button className="button outline-button header-login login-switcher-trigger" {...triggerProps}>
				<span>{t('nav.login')}</span>
				<ChevronDown size={13} className={`login-switcher-chev ${isOpen ? 'open' : ''}`} />
			</button>
			{isOpen && (
				<div className="login-switcher-panel" {...panelProps} role="menu">
					<Link to={lp('/login')} className="login-switcher-item" role="menuitem">
						<GraduationCap size={16} />
						<span>
							<strong>{t('nav.loginStudent')}</strong>
							<small>{t('nav.login')}</small>
						</span>
					</Link>
					<Link to={lp('/trainer/login')} className="login-switcher-item" role="menuitem">
						<Users size={16} />
						<span>
							<strong>{t('nav.loginTrainer')}</strong>
							<small>{t('nav.login')} · {t('nav.loginTrainer')}</small>
						</span>
					</Link>
				</div>
			)}
		</div>
	);
}
