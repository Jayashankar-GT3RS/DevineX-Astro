import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { ArrowUpRight, Menu, X, Sun, Phone } from 'lucide-react';
import { useDisclosure } from '@/hooks/use-disclosure';
import { navigation, business } from '@/data/site';
import { telHref } from '@/lib/contact-links';
import { useT, useLocalePath } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/language-switcher';
import { LoginSwitcher } from '@/components/login-switcher';
import type { TranslationKey } from '@/lib/i18n';
const NAV_KEYS: Record<string, TranslationKey> = {
 'Home': 'nav.home', 'About us': 'nav.about', 'Courses': 'nav.courses',
 'Free Kundli': 'nav.kundli', 'Our trainers': 'nav.trainers',
 'Insights': 'nav.blog', 'Contact': 'nav.contact',
};
export function SiteHeader() {
 const menu = useDisclosure({ lockScroll: true });
 const t = useT();
 const lp = useLocalePath();
 const [scrolled, setScrolled] = useState(false);
 useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
 }, []);
 return <header className={`site-header${scrolled ? ' scrolled' : ''}`}><div className="header-inner"><Link to="/" className="brand" aria-label="DevineX Astro home"><Sun size={38} strokeWidth={1.1}/><span>Devine<span className="gold">X</span> <span className="brand-astro">ASTRO</span><small>WISDOM BEYOND THE STARS</small></span></Link><nav className="desktop-nav" aria-label="Main navigation">{navigation.map(n => <NavLink key={n.path} to={lp(n.path)} end={n.path === '/'}>{t(NAV_KEYS[n.label] ?? 'nav.home')}</NavLink>)}</nav><a href={telHref(business.phone)} className="header-phone"><Phone size={15}/> <span>{business.phone}</span></a><LanguageSwitcher/><LoginSwitcher/><Link className="button gold-button header-apply" to={lp('/contact')}>{t('nav.apply')} <ArrowUpRight size={16}/></Link><button className="menu-button" {...menu.triggerProps} aria-label={menu.isOpen ? 'Close menu' : 'Open menu'}>{menu.isOpen ? <X/> : <Menu/>}</button></div>{menu.isOpen && <nav className="mobile-nav" {...menu.panelProps} aria-label="Mobile navigation">{navigation.map(n => <Link key={n.path} to={lp(n.path)} onClick={menu.close}>{t(NAV_KEYS[n.label] ?? 'nav.home')}</Link>)}<Link to={lp('/login')} onClick={menu.close} className="button outline-button">{t('nav.loginStudent')}</Link><Link to={lp('/trainer/login')} onClick={menu.close} className="button outline-button">{t('nav.loginTrainer')}</Link><Link to={lp('/contact')} onClick={menu.close} className="button gold-button">{t('nav.apply')} <ArrowUpRight size={16}/></Link></nav>}</header>;
}
