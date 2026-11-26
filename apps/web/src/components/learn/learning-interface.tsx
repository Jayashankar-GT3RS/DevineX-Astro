import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
	CheckCircle2, Circle, ChevronDown, ChevronRight, PlayCircle, FileText,
	Download, ArrowRight, ArrowLeft, Loader2, Lock, BookOpen, ClipboardList,
} from 'lucide-react';
import pb from '@/lib/pocketbase-client';
import type { Course, Lesson, LessonProgress, LessonResource } from '@/lib/types';
import { parseResources } from '@/lib/types';
import { QuizRunner } from '@/components/learn/quiz-runner';

interface ModuleGroup {
	module: string;
	lessons: Lesson[];
}

interface Props {
	user: { id: string; email?: string; name?: string };
	course: Course;
	enrollment: { id: string; status: string };
	lessons: Lesson[];
	initialProgress: LessonProgress[];
}

export function LearningInterface({ user, course, enrollment, lessons, initialProgress }: Props) {
	const [selectedId, setSelectedId] = useState(lessons[0]?.id ?? '');
	const [progress, setProgress] = useState<Record<string, LessonProgress>>(() => {
		const map: Record<string, LessonProgress> = {};
		for (const p of initialProgress) map[p.lesson] = p;
		return map;
	});
	const [openModules, setOpenModules] = useState<Record<string, boolean>>(() => {
		const first = lessons[0]?.module || 'Lessons';
		return { [first]: true };
	});
	const [saving, setSaving] = useState(false);
	const [activeQuizId, setActiveQuizId] = useState<string | null>(null);

	const modules = useMemo<ModuleGroup[]>(() => {
		const groups: ModuleGroup[] = [];
		for (const lesson of lessons) {
			const mod = lesson.module || 'Lessons';
			let g = groups.find(x => x.module === mod);
			if (!g) { g = { module: mod, lessons: [] }; groups.push(g); }
			g.lessons.push(lesson);
		}
		return groups;
	}, [lessons]);

	const completedCount = lessons.filter(l => progress[l.id]?.completed).length;
	const pct = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
	const selected = lessons.find(l => l.id === selectedId) ?? lessons[0] ?? null;
	const selectedIndex = selected ? lessons.findIndex(l => l.id === selected.id) : -1;
	const nextLesson = selectedIndex >= 0 && selectedIndex < lessons.length - 1 ? lessons[selectedIndex + 1] : null;
	const prevLesson = selectedIndex > 0 ? lessons[selectedIndex - 1] : null;

	const toggleComplete = async (lesson: Lesson) => {
		const existing = progress[lesson.id];
		const nowCompleted = !existing?.completed;
		setSaving(true);
		try {
			if (existing) {
				const updated = await pb.collection('lesson_progress').update<LessonProgress>(
					existing.id,
					{ completed: nowCompleted, completedAt: nowCompleted ? new Date().toISOString() : '' },
					{ requestKey: null },
				);
				setProgress(prev => ({ ...prev, [lesson.id]: updated }));
			} else {
				const created = await pb.collection('lesson_progress').create<LessonProgress>({
					student: user.id,
					lesson: lesson.id,
					course: course.id,
					completed: nowCompleted,
					completedAt: nowCompleted ? new Date().toISOString() : '',
					position: 0,
				}, { requestKey: null });
				setProgress(prev => ({ ...prev, [lesson.id]: created }));
			}
		} catch {
			/* ignore — progress stays local */
		} finally {
			setSaving(false);
		}
	};

	const goNext = () => { if (nextLesson) { setSelectedId(nextLesson.id); setActiveQuizId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); } };

	if (lessons.length === 0) {
		return (
			<main className="learn-page">
				<section className="learn-hero">
					<div className="learn-hero-content">
						<div className="breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/dashboard">Dashboard</Link><span>/</span><span>{course.title}</span></div>
						<div className="eyebrow">LEARNING INTERFACE</div>
						<h1>{course.title}</h1>
						<p>Lessons for this programme have not been published yet. Your enrollment is confirmed — content will appear here as it is released.</p>
						<div className="hero-actions"><Link className="button outline-button" to="/dashboard">Back to dashboard</Link></div>
					</div>
				</section>
				<section className="section">
					<div className="learn-empty">
						<BookOpen size={48} strokeWidth={1} />
						<h3>No lessons published yet</h3>
						<p>Your trainer and the DevineX Astro team are preparing the lesson content. Check back soon, or contact support if you believe this is an error.</p>
					</div>
				</section>
			</main>
		);
	}

	return (
		<main className="learn-page">
			<section className="learn-hero">
				<div className="learn-hero-content">
					<div className="breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/dashboard">Dashboard</Link><span>/</span><span>{course.title}</span></div>
					<div className="eyebrow">LEARNING INTERFACE</div>
					<h1>{course.title}</h1>
					<div className="learn-progress-bar">
						<div className="learn-progress-track"><div className="learn-progress-fill" style={{ width: `${pct}%` }} /></div>
						<span className="learn-progress-text">{completedCount} / {lessons.length} lessons · {pct}%</span>
					</div>
				</div>
			</section>

			<section className="section learn-section">
				<div className="learn-layout">
					<aside className="learn-sidebar">
						<div className="learn-sidebar-head">
							<span className="small-label">COURSE CONTENT</span>
							<span className="widget-count">{lessons.length} lessons</span>
						</div>
						<nav className="learn-nav">
							{modules.map(group => {
								const isOpen = openModules[group.module] ?? false;
								const groupDone = group.lessons.filter(l => progress[l.id]?.completed).length;
								return (
									<div className="learn-module" key={group.module}>
										<button
											type="button"
											className="learn-module-head"
											aria-expanded={isOpen}
											onClick={() => setOpenModules(prev => ({ ...prev, [group.module]: !isOpen }))}
										>
											{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
											<span className="learn-module-title">{group.module}</span>
											<span className="learn-module-count">{groupDone}/{group.lessons.length}</span>
										</button>
										{isOpen && (
											<ul className="learn-lesson-list">
												{group.lessons.map(lesson => {
													const done = Boolean(progress[lesson.id]?.completed);
													const active = selected?.id === lesson.id;
													return (
														<li key={lesson.id}>
															<button
																type="button"
																className={`learn-lesson-item ${active ? 'active' : ''}`}
																onClick={() => { setSelectedId(lesson.id); setActiveQuizId(null); }}
															>
																{done ? <CheckCircle2 size={16} className="gold" /> : <Circle size={16} />}
																<span>{lesson.title}</span>
																{lesson.duration && <small>{lesson.duration}</small>}
															</button>
														</li>
													);
												})}
											</ul>
										)}
									</div>
								);
							})}
						</nav>
					</aside>

					<div className="learn-main">
						{selected && (
							<>
								<div className="learn-lesson-head">
									<div>
										<span className="small-label">{selected.module || 'LESSON'} · {selectedIndex + 1} of {lessons.length}</span>
										<h2>{selected.title}</h2>
									</div>
									<button
										className={`button ${progress[selected.id]?.completed ? 'outline-button' : 'gold-button'}`}
										onClick={() => toggleComplete(selected)}
										disabled={saving}
									>
										{saving ? <Loader2 size={15} className="spin" /> : progress[selected.id]?.completed ? <CheckCircle2 size={15} /> : <Circle size={15} />}
										{progress[selected.id]?.completed ? 'Completed' : 'Mark complete'}
									</button>
								</div>

								<div className="learn-video">
									{selected.videoUrl ? (
										<LessonVideo lesson={selected} />
									) : (
										<div className="learn-video-placeholder">
											<Lock size={32} />
											<p>No video resource has been published for this lesson yet. Video materials are added by your trainer and are only visible to enrolled students.</p>
										</div>
									)}
								</div>

								{selected.description && (
									<div className="learn-block">
										<div className="eyebrow"><FileText size={14} /> LESSON DESCRIPTION</div>
										<p className="learn-desc">{selected.description}</p>
									</div>
								)}

								{selected.notes && (
									<div className="learn-block">
										<div className="eyebrow"><FileText size={14} /> LESSON NOTES</div>
										<div className="learn-notes">{selected.notes.split('\n').map((line, i) => <p key={i}>{line}</p>)}</div>
									</div>
								)}

								<LessonResources json={selected.resources} />

								<div className="learn-block">
									<div className="eyebrow"><ClipboardList size={14} /> ASSESSMENT</div>
									<QuizRunner course={course} lesson={selected} studentId={user.id} activeQuizId={activeQuizId} setActiveQuizId={setActiveQuizId} />
								</div>

								<div className="learn-nav-buttons">
									{prevLesson ? (
										<button className="button outline-button learn-nav-btn" onClick={() => { setSelectedId(prevLesson.id); setActiveQuizId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
											<ArrowLeft size={15} /> <span><small>Previous</small><strong>{prevLesson.title}</strong></span>
										</button>
									) : <span />}
									{nextLesson ? (
										<button className="button gold-button learn-nav-btn" onClick={goNext}>
											<span><small>Next</small><strong>{nextLesson.title}</strong></span> <ArrowRight size={15} />
										</button>
									) : (
										<Link className="button gold-button learn-nav-btn" to="/dashboard"><CheckCircle2 size={15} /> Finish &amp; return to dashboard</Link>
									)}
								</div>
							</>
						)}
					</div>
				</div>
			</section>
		</main>
	);
}

function LessonVideo({ lesson }: { lesson: Lesson }) {
	const url = lesson.videoUrl;
	const provider = lesson.videoProvider;
	if (provider === 'youtube') {
		const videoId = extractYouTubeId(url);
		if (videoId) return <iframe className="learn-video-frame" src={`https://www.youtube.com/embed/${videoId}`} title={lesson.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
	}
	if (provider === 'vimeo') {
		const videoId = extractVimeoId(url);
		if (videoId) return <iframe className="learn-video-frame" src={`https://player.vimeo.com/video/${videoId}`} title={lesson.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
	}
	if (provider === 'uploaded' || (url && provider !== 'none')) {
		return <video className="learn-video-frame" src={url} controls preload="metadata" />;
	}
	return (
		<div className="learn-video-placeholder">
			<PlayCircle size={32} />
			<p>A video resource is linked but not yet playable. Your trainer will publish the final video before this lesson goes live.</p>
		</div>
	);
}

function LessonResources({ json }: { json: string }) {
	const resources = parseResources(json);
	if (resources.length === 0) return null;
	return (
		<div className="learn-block">
			<div className="eyebrow"><Download size={14} /> LEARNING RESOURCES</div>
			<ul className="learn-resources">
				{resources.map((r: LessonResource, i) => (
					<li key={i}><a href={r.url} target="_blank" rel="noopener noreferrer"><Download size={14} /> {r.name || 'Resource'}</a></li>
				))}
			</ul>
		</div>
	);
}

function extractYouTubeId(url: string): string | null {
	const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
	return m ? m[1] : null;
}

function extractVimeoId(url: string): string | null {
	const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
	return m ? m[1] : null;
}
