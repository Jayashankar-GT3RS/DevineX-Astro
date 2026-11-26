import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Award, RotateCcw, ClipboardList } from 'lucide-react';
import pb from '@/lib/pocketbase-client';
import type { Course, Quiz, QuizAttempt, QuizQuestion } from '@/lib/types';
import { parseQuizQuestions } from '@/lib/types';

interface Props {
	course: Course;
	lesson: { id: string; title: string };
	studentId: string;
	activeQuizId: string | null;
	setActiveQuizId: (id: string | null) => void;
}

export function QuizRunner({ course, lesson, studentId, activeQuizId, setActiveQuizId }: Props) {
	const [quiz, setQuiz] = useState<Quiz | null>(null);
	const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
	const [loading, setLoading] = useState(false);
	const [answers, setAnswers] = useState<number[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<QuizAttempt | null>(null);
	const [error, setError] = useState('');

	const loadQuiz = async () => {
		setLoading(true);
		setError('');
		try {
			const records = await pb.collection('quizzes').getFullList<Quiz>({
				filter: pb.filter('course = {:course} && lesson = {:lesson} && status = \'published\'', { course: course.id, lesson: lesson.id }),
				requestKey: `quiz-${lesson.id}`,
			});
			if (records.length > 0) {
				const q = records[0];
				setQuiz(q);
				setAnswers(new Array(parseQuizQuestions(q.questions).length).fill(-1));
				const att = await pb.collection('quiz_attempts').getFullList<QuizAttempt>({
					filter: pb.filter('quiz = {:quiz} && student = {:student}', { quiz: q.id, student: studentId }),
					sort: '-created',
					requestKey: `quiz-attempts-${q.id}`,
				});
				setAttempts(att as unknown as QuizAttempt[]);
			} else {
				setQuiz(null);
			}
		} catch {
			setError('Could not load the quiz for this lesson.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (activeQuizId === lesson.id) loadQuiz();
	}, [activeQuizId, lesson.id]);

	if (!quiz && activeQuizId !== lesson.id) {
		return (
			<div className="quiz-pending">
				<p>This lesson may include a short quiz to check your understanding. Quizzes are created by your trainer and will appear here when published.</p>
				<button className="button outline-button" onClick={() => { setActiveQuizId(lesson.id); loadQuiz(); }}>
					<ClipboardList size={15} /> Check for quiz
				</button>
			</div>
		);
	}

	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading quiz…</div>;
	if (error) return <p className="error">{error}</p>;
	if (!quiz) {
		return (
			<div className="quiz-pending">
				<ClipboardList size={28} />
				<p>No quiz has been published for this lesson yet.</p>
				<button className="auth-back" onClick={() => setActiveQuizId(null)}>Hide</button>
			</div>
		);
	}

	const questions = parseQuizQuestions(quiz.questions);
	const passingScore = quiz.passingScore ?? 0;
	const maxAttempts = quiz.maxAttempts ?? 0;
	const attemptsLeft = maxAttempts > 0 ? Math.max(0, maxAttempts - attempts.length) : Infinity;

	const submit = async () => {
		setSubmitting(true);
		setError('');
		const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length;
		const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
		const passed = score >= passingScore;
		try {
			const created = await pb.collection('quiz_attempts').create<QuizAttempt>({
				quiz: quiz.id,
				student: studentId,
				answers: JSON.stringify(answers),
				score,
				passed,
				attemptedAt: new Date().toISOString(),
			}, { requestKey: null });
			setResult(created);
			setAttempts(prev => [created, ...prev]);
		} catch {
			setError('Could not submit your quiz attempt. Please try again.');
		} finally {
			setSubmitting(false);
		}
	};

	const reset = () => { setResult(null); setAnswers(new Array(questions.length).fill(-1)); };

	if (result) {
		return (
			<div className="quiz-result">
				<div className={`quiz-result-icon ${result.passed ? 'pass' : 'fail'}`}>
					{result.passed ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
				</div>
				<h3>{result.passed ? 'Quiz passed!' : 'Not passed yet'}</h3>
				<p className="quiz-score">You scored <strong>{result.score}%</strong> · passing mark {passingScore}%</p>
				{!result.passed && attemptsLeft > 0 && <p className="quiz-hint">Review the lesson and try again. You have {attemptsLeft === Infinity ? 'unlimited' : attemptsLeft} attempt(s) remaining.</p>}
				<div className="quiz-result-actions">
					{!result.passed && attemptsLeft > 0 && <button className="button outline-button" onClick={reset}><RotateCcw size={15} /> Try again</button>}
					<button className="auth-back" onClick={() => setActiveQuizId(null)}>Close quiz</button>
				</div>
				{attempts.length > 1 && (
					<div className="quiz-history">
						<span className="small-label">ATTEMPT HISTORY</span>
						<ul>{attempts.map(a => <li key={a.id}><Award size={13} /> {a.score}% {a.passed && '· passed'} <small>{a.attemptedAt ? new Date(a.attemptedAt).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : ''}</small></li>)}</ul>
					</div>
				)}
			</div>
		);
	}

	if (maxAttempts > 0 && attempts.length >= maxAttempts) {
		return (
			<div className="quiz-result">
				<XCircle size={40} className="fail" />
				<h3>Maximum attempts reached</h3>
				<p>You have used all {maxAttempts} attempt(s) for this quiz. Your best score: {attempts.length ? Math.max(...attempts.map(a => a.score)) : 0}%.</p>
				<button className="auth-back" onClick={() => setActiveQuizId(null)}>Close</button>
			</div>
		);
	}

	return (
		<div className="quiz-runner">
			<div className="quiz-head">
				<h3>{quiz.title}</h3>
				<span className="badge">Pass mark {passingScore}%</span>
			</div>
			{quiz.description && <p className="quiz-desc">{quiz.description}</p>}
			<ol className="quiz-questions">
				{questions.map((q: QuizQuestion, qi) => (
					<li key={qi}>
						<p className="quiz-question">{q.question}</p>
						<div className="quiz-options">
							{q.options.map((opt, oi) => (
								<label key={oi} className={`quiz-option ${answers[qi] === oi ? 'selected' : ''}`}>
									<input type="radio" name={`q-${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers(prev => prev.map((a, i) => i === qi ? oi : a))} />
									<span>{opt}</span>
								</label>
							))}
						</div>
					</li>
				))}
			</ol>
			{error && <p className="error">{error}</p>}
			<div className="quiz-actions">
				<button className="button gold-button" onClick={submit} disabled={submitting || answers.some(a => a < 0)}>
					{submitting ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />} Submit quiz
				</button>
				<button className="auth-back" onClick={() => setActiveQuizId(null)}>Cancel</button>
			</div>
		</div>
	);
}
