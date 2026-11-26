import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { CourseCurriculumItem } from '@/lib/types';

export function Curriculum({ items }: { items: CourseCurriculumItem[] }) {
	const [openIndex, setOpenIndex] = useState<number | null>(0);

	return (
		<div className="curriculum-accordion">
			{items.map((item, index) => {
				const isOpen = openIndex === index;
				return (
					<div className="curriculum-item" key={item.module}>
						<button
							type="button"
							className="curriculum-header"
							aria-expanded={isOpen}
							onClick={() => setOpenIndex(isOpen ? null : index)}
						>
							<span className="curriculum-module">{item.module}</span>
							<span className="curriculum-title">{item.title}</span>
							<Plus size={18} className={`curriculum-icon ${isOpen ? 'open' : ''}`} />
						</button>
						{isOpen && (
							<ul className="curriculum-topics">
								{item.topics.map(topic => <li key={topic}>{topic}</li>)}
							</ul>
						)}
					</div>
				);
			})}
		</div>
	);
}
