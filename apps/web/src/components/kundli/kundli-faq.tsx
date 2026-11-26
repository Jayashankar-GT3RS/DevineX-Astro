import { kundliFaqs } from '@/data/site';

export function KundliFaq() {
	return (
		<section className="section kundli-faq-section">
			<div className="center-heading">
				<div className="eyebrow">FREQUENTLY ASKED</div>
				<h2>Your Kundli <em>questions answered</em></h2>
				<p>Everything you need to know about requesting, receiving and securely downloading your personalized Vedic Kundli report.</p>
			</div>
			<div className="faq-list kundli-faq-list">
				{kundliFaqs.map((faq, i) => (
					<details key={i} name="kundli-faq">
						<summary>
							{faq.question}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
						</summary>
						<p>{faq.answer}</p>
					</details>
				))}
			</div>
		</section>
	);
}
