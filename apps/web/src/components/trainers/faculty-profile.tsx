import { Link } from 'react-router';
import { ArrowUpRight, Orbit, Youtube } from 'lucide-react';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { PublicTrainer } from '@/lib/types';

function socialLinks(raw: string): { label: string; url: string }[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((item): item is { label: string; url: string } => {
			if (!item || typeof item !== 'object' || typeof item.url !== 'string' || (item.label != null && typeof item.label !== 'string')) return false;
			try { return ['https:', 'http:'].includes(new URL(item.url).protocol); } catch { return false; }
		});
	} catch { return []; }
}

export function FacultyProfile({ trainer, compact = false }: { trainer: PublicTrainer; compact?: boolean }) {
	const photoUrl = trainer.photo ? pb.files.getURL(trainer, trainer.photo) : trainer.photoUrl;
	const paragraphs = trainer.biography?.split(/\n\s*\n/).filter(Boolean) ?? [];
	const links = socialLinks(trainer.socialLinks);
	return (
		<article className={`faculty-profile${compact ? ' faculty-profile-compact' : ''}`} id={compact ? undefined : `faculty-${trainer.slug}`}>
			<div className="faculty-portrait-wrap">
				{photoUrl ? <img className="faculty-portrait" src={photoUrl} alt={`Portrait of ${trainer.fullName}`} width="160" height="160" /> : <div className="faculty-portrait faculty-portrait-empty"><Orbit size={48} strokeWidth={1} /></div>}
				<span className="faculty-portrait-caption">DEVINEX ASTRO · FACULTY</span>
			</div>
			<div className="faculty-details">
				<span className="small-label">FACULTY &amp; MENTORSHIP</span>
				<h3>{trainer.fullName}</h3>
				{trainer.designation && <p className="faculty-designation">{trainer.designation}</p>}
				{trainer.specialization && <div className="faculty-specialties"><span>Areas of focus</span><p>{trainer.specialization}</p></div>}
				{trainer.experience && <p className="faculty-experience">{trainer.experience}</p>}
				<div className="faculty-biography">{(compact ? paragraphs.slice(0, 1) : paragraphs).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>
				<div className="faculty-actions">
					{compact && <Link className="text-link" to={`/trainers#faculty-${trainer.slug}`}>Meet your mentor <ArrowUpRight size={16} /></Link>}
					{links.map(link => <a key={link.url} className="text-link" href={link.url} target="_blank" rel="noopener noreferrer">{link.label?.toLowerCase() === 'youtube' && <Youtube size={16} />} {link.label || 'Professional profile'} <ArrowUpRight size={15} /></a>)}
				</div>
			</div>
		</article>
	);
}
