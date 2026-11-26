import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { CourseFaq } from '@/lib/types';

export function CourseFaqs({ faqs }: { faqs: CourseFaq[] }) {
	const [openIndex, setOpenIndex] = useState<number | null>(0);

	if (faqs.length === 0) return null;

	return (
		<div className="course-faq-list">
			{faqs.map((faq, index) => {
				const isOpen = openIndex === index;
				return (
					<div className="course-faq-item" key={index}>
						<button
							type="button"
							className="course-faq-header"
							aria-expanded={isOpen}
							onClick={() => setOpenIndex(isOpen ? null : index)}
						>
							<span>{faq.question}</span>
							<Plus size={18} className={`curriculum-icon ${isOpen ? 'open' : ''}`} />
						</button>
						{isOpen && <p className="course-faq-answer">{faq.answer}</p>}
					</div>
				);
			})}
		</div>
	);
}
