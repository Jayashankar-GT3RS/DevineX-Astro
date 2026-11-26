export interface CourseCurriculumItem {
	module: string;
	title: string;
	topics: string[];
}

export interface CourseFaq {
	question: string;
	answer: string;
}

export interface Course {
	id: string;
	title: string;
	slug: string;
	shortDescription: string;
	overview: string;
	level: string;
	duration: string;
	fee: number;
	eligibility: string;
	format: string;
	learningObjectives: string;
	curriculum: string;
	faqs: string;
	instructorName: string;
	instructorBio: string;
	category: string;
	status: string;
	enrollmentStatus: string;
	batchStartDate: string;
	enrollmentDeadline: string;
	maxCapacity: number;
	trainer: string;
	deliveryMethod: string;
	icon: string;
	taxConfig: string;
	taxRate: number;
	discount: number;
	discountLabel: string;
	paymentEnabled: boolean;
	paymentStatus: string;
	deliveryLanguages: string;
	assignedTrainer: string;
	created: string;
	updated: string;
}

export const taxConfigLabel: Record<string, string> = {
	pending: 'Tax pending approval',
	included: 'Tax included in fee',
	excluded: 'Tax excluded (added at checkout)',
	exempt: 'Tax exempt',
};

export const paymentStatusLabel: Record<string, string> = {
	disabled: 'Payment disabled',
	pending: 'Gateway setup pending',
	configured: 'Gateway configured',
	tested: 'Payment tested & live',
};

export interface Enrollment {
	id: string;
	student: string;
	course: string;
	status: string;
	notes: string;
	created: string;
	updated: string;
	expand?: {
		course?: Course;
		student?: { id: string; email: string; name: string };
	};
}

export function parseCurriculum(json: string): CourseCurriculumItem[] {
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function parseCourseFaqs(json: string): CourseFaq[] {
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export const enrollmentStatusLabel: Record<string, string> = {
	pending: 'Enquiry submitted',
	active: 'Enrolled',
	completed: 'Completed',
	cancelled: 'Cancelled',
};

export const courseEnrollmentLabel: Record<string, string> = {
	enquire: 'Enquire to Enroll',
	open: 'Enrollment Open',
	closed: 'Enrollment Closed',
};

// ---- LMS learning, assessment and administration types ----

export interface Lesson {
	id: string;
	course: string;
	module: string;
	title: string;
	description: string;
	order: number;
	videoUrl: string;
	videoProvider: string;
	notes: string;
	resources: string;
	duration: string;
	isPreview: boolean;
	status: string;
	created: string;
	updated: string;
	expand?: { course?: Course };
}

export interface LessonResource {
	name: string;
	url: string;
}

export function parseResources(json: string): LessonResource[] {
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export interface LessonProgress {
	id: string;
	student: string;
	lesson: string;
	course: string;
	completed: boolean;
	completedAt: string;
	position: number;
	created: string;
	updated: string;
}

export interface Batch {
	id: string;
	course: string;
	name: string;
	trainer: string;
	startDate: string;
	endDate: string;
	maxCapacity: number;
	status: string;
	created: string;
	updated: string;
	expand?: { course?: Course; trainer?: { id: string; name: string; email: string } };
}

export interface LiveClass {
	id: string;
	course: string;
	batch: string;
	title: string;
	description: string;
	trainer: string;
	scheduledAt: string;
	durationMins: number;
	meetingUrl: string;
	meetingProvider: string;
	recordingUrl: string;
	status: string;
	created: string;
	updated: string;
	expand?: { course?: Course; batch?: Batch; trainer?: { id: string; name: string; email: string } };
}

export interface Assignment {
	id: string;
	course: string;
	lesson: string;
	title: string;
	description: string;
	instructions: string;
	deadline: string;
	maxMarks: number;
	status: string;
	created: string;
	updated: string;
	expand?: { course?: Course; lesson?: Lesson };
}

export interface Submission {
	id: string;
	assignment: string;
	student: string;
	content: string;
	fileUrl: string;
	submittedAt: string;
	marks: number;
	feedback: string;
	status: string;
	created: string;
	updated: string;
	expand?: { assignment?: Assignment; student?: { id: string; name: string; email: string } };
}

export interface QuizQuestion {
	question: string;
	options: string[];
	correctIndex: number;
}

export interface Quiz {
	id: string;
	course: string;
	lesson: string;
	title: string;
	description: string;
	questions: string;
	passingScore: number;
	maxAttempts: number;
	status: string;
	created: string;
	updated: string;
}

export function parseQuizQuestions(json: string): QuizQuestion[] {
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export interface QuizAttempt {
	id: string;
	quiz: string;
	student: string;
	answers: string;
	score: number;
	passed: boolean;
	attemptedAt: string;
	created: string;
	updated: string;
}

export interface Certificate {
	id: string;
	student: string;
	course: string;
	certificateNumber: string;
	studentName: string;
	courseTitle: string;
	completionDate: string;
	signatory: string;
	templateApproved: boolean;
	status: string;
	issuedAt: string;
	created: string;
	updated: string;
	expand?: { student?: { id: string; name: string; email: string }; course?: Course };
}

export interface Announcement {
	id: string;
	course: string;
	batch: string;
	title: string;
	message: string;
	author: string;
	audience: string;
	created: string;
	updated: string;
}

export interface Payment {
	id: string;
	enrollment: string;
	student: string;
	course: string;
	amount: number;
	method: string;
	transactionRef: string;
	status: string;
	recordedBy: string;
	notes: string;
	created: string;
	updated: string;
	expand?: { student?: { id: string; name: string; email: string }; course?: Course };
}

export const paymentMethodLabel: Record<string, string> = {
	offline_cash: 'Offline · Cash',
	offline_upi: 'Offline · UPI',
	offline_bank: 'Offline · Bank transfer',
	other: 'Other (offline)',
};

export const paymentRecordStatusLabel: Record<string, string> = {
	pending: 'Recorded — pending verification',
	verified: 'Verified',
	rejected: 'Rejected',
};

export const liveClassStatusLabel: Record<string, string> = {
	scheduled: 'Scheduled',
	live: 'Live now',
	completed: 'Completed',
	cancelled: 'Cancelled',
};

export const batchStatusLabel: Record<string, string> = {
	planned: 'Planned',
	active: 'Active',
	completed: 'Completed',
	cancelled: 'Cancelled',
};

export const submissionStatusLabel: Record<string, string> = {
	submitted: 'Submitted',
	reviewed: 'Reviewed',
	returned: 'Returned for revision',
};

export const certificateStatusLabel: Record<string, string> = {
	pending: 'Pending approval',
	issued: 'Issued',
	revoked: 'Revoked',
};

// ---- Blog / Knowledge Centre ----

export interface BlogPost {
	id: string;
	title: string;
	slug: string;
	excerpt: string;
	content: string;
	category: string;
	tags: string;
	author: string;
	metaDescription: string;
	status: string;
	created: string;
	updated: string;
}

export const blogCategories = [
	'Vedic Astrology Basics',
	'Jyotish Shastra',
	'Kundli Analysis',
	'Zodiac Signs',
	'Navagraha',
	'Nakshatras',
	'Numerology',
	'Astrology Education',
	'Traditional Indian Knowledge',
] as const;

// ---- Trainer profiles ----

export interface PublicTrainer {
	id: string;
	collectionId: string;
	fullName: string;
	slug: string;
	designation: string;
	specialization: string;
	experience: string;
	biography: string;
	socialLinks: string;
	photo: string;
	photoUrl: string;
}

export interface Trainer {
	id: string;
	fullName: string;
	slug: string;
	specialization: string;
	experience: string;
	biography: string;
	qualifications: string;
	coursesTaught: string;
	socialLinks: string;
	photo: string;
	status: string;
	user: string;
	languages: string;
	availability: string;
	bankInfo: string;
	created: string;
	updated: string;
}

// ---- Kundli requests ----

export interface KundliRequest {
	id: string;
	customer: string;
	fullName: string;
	email: string;
	phone: string;
	dateOfBirth: string;
	timeOfBirth: string;
	placeOfBirth: string;
	birthTimeAccuracy: string;
	existingChart: string;
	questions: string;
	privacyConsent: boolean;
	marketingConsent: boolean;
	aiConsent: boolean;
	birthState: string;
	birthCountry: string;
	requestId: string;
	status: string;
	assignedTo: string;
	adminNotes: string;
	reportPdf: string;
	reportApproved: boolean;
	reportReleased: boolean;
	readyNotified: boolean;
	downloadCount: number;
	lastDownloadAt: string;
	mobileVerified: boolean;
	created: string;
	updated: string;
	expand?: {
		customer?: { id: string; email: string; name: string };
		assignedTo?: { id: string; name: string; email: string };
	};
}

export const kundliStatusLabel: Record<string, string> = {
	submitted: 'Submitted',
	validating: 'Validating Birth Details',
	calculating: 'Calculating Birth Chart',
	interpreting: 'Generating AI Interpretation',
	creating_pdf: 'Creating PDF',
	awaiting_review: 'Awaiting Review',
	in_progress: 'In Progress',
	under_review: 'Under Review',
	ready: 'Ready for Download',
	completed: 'Completed',
	failed: 'Failed — Needs Attention',
};

export const kundliBirthAccuracyLabel: Record<string, string> = {
	exact: 'Exact',
	approximate: 'Approximate',
	unknown: 'Unknown',
};

// ---- Lead CRM ----

export const leadStatusLabel: Record<string, string> = {
	New: 'New',
	Contacted: 'Contacted',
	Interested: 'Interested',
	'Follow-Up': 'Follow-Up',
	'Payment Pending': 'Payment Pending',
	Enrolled: 'Enrolled',
	'Not Interested': 'Not Interested',
};

export interface Lead {
	id: string;
	name: string;
	email: string;
	phone: string;
	course: string;
	intent: string;
	city: string;
	state: string;
	experienceLevel: string;
	preferredLanguage: string;
	leadSource: string;
	assignedCounsellor: string;
	leadStatus: string;
	leadNotes: string;
	lastContactedDate: string;
	preferred_time: string;
	message: string;
	created: string;
	updated: string;
}
