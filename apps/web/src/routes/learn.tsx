import type { Route } from './+types/learn';
import { redirect } from 'react-router';
import { seo } from '@/lib/seo';
import { celestialImage } from '@/data/site';
import { requireAuth } from '@/lib/require-auth';
import pb from '@/lib/pocketbase-client';
import type { Course, Lesson, LessonProgress } from '@/lib/types';
import { LearningInterface } from '@/components/learn/learning-interface';

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const user = requireAuth(`/login?redirect=/learn/${params.courseSlug}`);

	let course: Course;
	try {
		course = await pb.collection('courses').getFirstListItem<Course>(
			pb.filter('slug = {:slug}', { slug: params.courseSlug }),
		);
	} catch {
		throw redirect('/courses');
	}

	// Only enrolled students (active or completed) may enter the learning interface.
	let enrollment: { id: string; status: string } | null = null;
	try {
		const records = await pb.collection('enrollments').getFullList({
			filter: pb.filter('student = {:student} && course = {:course}', { student: user.id, course: course.id }),
			requestKey: `learn-enroll-${course.id}`,
		});
		if (records.length > 0) enrollment = { id: records[0].id, status: records[0].status };
	} catch {
		/* ignore */
	}

	if (!enrollment || (enrollment.status !== 'active' && enrollment.status !== 'completed')) {
		throw redirect(`/courses/${params.courseSlug}`);
	}

	let lessons: Lesson[] = [];
	try {
		lessons = await pb.collection('lessons').getFullList<Lesson>({
			filter: pb.filter('course = {:course} && status = \'published\'', { course: course.id }),
			sort: 'order,created',
			requestKey: `learn-lessons-${course.id}`,
		});
	} catch {
		/* no lessons yet */
	}

	let progress: LessonProgress[] = [];
	try {
		progress = await pb.collection('lesson_progress').getFullList<LessonProgress>({
			filter: pb.filter('student = {:student} && course = {:course}', { student: user.id, course: course.id }),
			requestKey: `learn-progress-${course.id}`,
		});
	} catch {
		/* ignore */
	}

	return { user, course, enrollment, lessons, progress };
}
clientLoader.hydrate = true as const;

export function HydrateFallback() {
	return <div aria-hidden />;
}

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'Learning Interface | DevineX Astro',
		description: 'Continue your lessons, track progress and access course materials.',
		image: celestialImage,
		noindex: true,
	});
}

export default function LearnPage({ loaderData }: Route.ComponentProps) {
	return (
		<LearningInterface
			user={loaderData.user}
			course={loaderData.course}
			enrollment={loaderData.enrollment}
			lessons={loaderData.lessons}
			initialProgress={loaderData.progress}
		/>
	);
}
