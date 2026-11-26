import { Plus } from 'lucide-react';
import { faqs } from '@/data/site';
export function Faq() { return <section className="section faq-section"><div><div className="eyebrow">06 / A LITTLE MORE CLARITY</div><h2>Curious minds<br/><em>ask questions.</em></h2><p>What to know before you begin.</p></div><div className="faq-list">{faqs.map(f => <details key={f.question}><summary>{f.question}<Plus size={18}/></summary><p>{f.answer}</p></details>)}</div></section>; }
