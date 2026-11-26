import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { FacultyProfile } from '@/components/trainers/faculty-profile';
import type { PublicTrainer } from '@/lib/types';

export function TrainersProfiles({ trainers }: { trainers: PublicTrainer[] }) {
	return (
		<section className="section faculty-section" aria-labelledby="faculty-heading">
			<div className="faculty-section-heading">
				<div><div className="eyebrow">KNOWLEDGE MEETS GUIDANCE</div><h2 id="faculty-heading">Meet our <em>faculty.</em></h2></div>
				<p>Traditional knowledge, shared through clear teaching and guided practice.</p>
			</div>
			{trainers.length > 0 ? <div className="faculty-list">{trainers.map(trainer => <FacultyProfile trainer={trainer} key={trainer.id} />)}</div> : <div className="faculty-empty"><p>Faculty profiles are not available right now. Please contact us to learn more about our trainers.</p></div>}
			<div className="center-action"><Link className="button outline-button" to="/contact?intent=Enrollment+inquiry">Ask about our trainers <ArrowUpRight size={16} /></Link></div>
		</section>
	);
}
