/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    let collection;
    try {
      collection = app.findCollectionByNameOrId('courses');
    } catch (_) {
      collection = new Collection({
        name: 'courses',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: 'title', type: 'text', required: true, max: 300 },
          { name: 'slug', type: 'text', required: true, max: 200 },
          { name: 'shortDescription', type: 'text', required: true, max: 500 },
          { name: 'overview', type: 'text', max: 10000 },
          { name: 'level', type: 'text', max: 50 },
          { name: 'duration', type: 'text', required: true, max: 50 },
          { name: 'fee', type: 'number', min: 0 },
          { name: 'eligibility', type: 'text', max: 1000 },
          { name: 'format', type: 'text', max: 200 },
          { name: 'learningObjectives', type: 'text', max: 2000 },
          { name: 'curriculum', type: 'text', max: 50000 },
          { name: 'faqs', type: 'text', max: 20000 },
          { name: 'instructorName', type: 'text', max: 200 },
          { name: 'instructorBio', type: 'text', max: 2000 },
          { name: 'category', type: 'select', maxSelect: 1, values: ['vedic', 'numerology'] },
          { name: 'status', type: 'select', maxSelect: 1, values: ['draft', 'published'] },
          { name: 'enrollmentStatus', type: 'select', maxSelect: 1, values: ['enquire', 'open', 'closed'] },
          { name: 'batchStartDate', type: 'date' },
          { name: 'enrollmentDeadline', type: 'date' },
          { name: 'maxCapacity', type: 'number', min: 0 },
          { name: 'trainer', type: 'text', max: 200 },
          { name: 'deliveryMethod', type: 'text', max: 200 },
          { name: 'icon', type: 'text', max: 50 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_courses_slug ON courses (slug)'],
      });
      app.save(collection);
    }

    const seedId = (key) => $security.sha256(key).substring(0, 15);

    const courses = [
      {
        title: 'Foundation Certificate Program in Vedic Astrology',
        slug: 'foundation-vedic-astrology',
        shortDescription:
          'Begin your journey into Jyotish Shastra with a structured introduction to traditional Vedic astrology, birth-chart interpretation, and the foundational principles of Jyotish.',
        overview:
          'Begin your journey into the world of Jyotish Shastra with a structured introduction to traditional Vedic astrology.\n\nThis program is designed to help learners understand the fundamental principles of birth-chart interpretation, planetary positions, zodiac signs, astrological houses and Nakshatras.\n\nWhether you are exploring astrology for personal interest or preparing for advanced study, this program provides a foundation in the traditional interpretive framework of Vedic Astrology.',
        level: 'Beginner',
        duration: '3 Months',
        fee: 9999,
        eligibility: 'Students, professionals, homemakers, enthusiasts and complete beginners.',
        format: 'Online learning with planned live classes and guided exercises.',
        learningObjectives:
          'Understand foundational astrology terminology, identify chart components, and practice introductory horoscope interpretation using traditional Jyotish concepts.',
        category: 'vedic',
        icon: 'sun',
        curriculum: [
          { module: 'Module 1', title: 'Introduction to Jyotish Shastra', topics: ['Historical development of Vedic Astrology', 'Classical astrology traditions', 'Different branches of Jyotish', 'Basic terminology'] },
          { module: 'Module 2', title: 'Zodiac Signs', topics: ['Twelve Rashis', 'Elements and modalities', 'Rashi characteristics', 'Sign rulership and relationships'] },
          { module: 'Module 3', title: 'Nine Grahas', topics: ['Navagraha concepts', 'Planetary symbolism', 'Natural planetary relationships', 'Planetary dignity'] },
          { module: 'Module 4', title: 'Twelve Houses', topics: ['The 12 Bhavas', 'House significations', 'Angular, trinal and other house classifications', 'House lordship'] },
          { module: 'Module 5', title: 'Nakshatra Foundations', topics: ['Introduction to the 27 Nakshatras', 'Nakshatra lords', 'Traditional symbolism', 'Lunar placement concepts'] },
          { module: 'Module 6', title: 'Birth Chart Reading', topics: ['Understanding a Janam Kundli', 'Ascendant and planetary placements', 'Basic chart interpretation', 'Guided practical exercises'] },
        ],
        faqs: [
          { question: 'Is this course suitable for complete beginners?', answer: 'Yes. The Foundation Certificate Program is designed for students with no prior astrology knowledge.' },
          { question: 'What is the proposed duration and fee?', answer: 'The proposed duration is 3 months with a proposed fee of ₹9,999. Final details will be confirmed at launch.' },
          { question: 'Will I receive a certificate?', answer: 'Certification details will be announced before enrollment opens. No accreditation is currently claimed.' },
        ],
      },
      {
        title: 'Advanced Vedic Astrology & Kundli Analysis',
        slug: 'advanced-vedic-astrology-kundli',
        shortDescription:
          'Deepen your knowledge of traditional Vedic Astrology through advanced horoscope analysis, divisional charts, planetary combinations, Dasha systems and transit interpretation.',
        overview:
          'Deepen your knowledge of traditional Vedic Astrology through advanced horoscope analysis, divisional charts, planetary combinations, Dasha systems and transit interpretation.\n\nThe program is designed for learners who understand the basics of Kundli reading and want to develop more sophisticated interpretation skills.',
        level: 'Intermediate to Advanced',
        duration: '4 Months',
        fee: 19999,
        eligibility: 'Learners who understand the basics of Kundli reading and birth-chart interpretation.',
        format: 'Online learning with planned live classes, case studies and guided exercises.',
        learningObjectives:
          'Develop deeper familiarity with traditional predictive techniques and gain experience integrating multiple chart factors.',
        category: 'vedic',
        icon: 'orbit',
        curriculum: [
          { module: 'Module 1', title: 'Advanced Planetary Interpretation', topics: ['Planetary dignity', 'Aspects and conjunctions', 'Planetary strength', 'Benefic and malefic classifications'] },
          { module: 'Module 2', title: 'Yogas and Doshas', topics: ['Raja Yoga', 'Dhana Yoga', 'Traditional Dosha concepts', 'Contextual chart interpretation'] },
          { module: 'Module 3', title: 'Divisional Charts', topics: ['Navamsa (D9)', 'Dashamsa (D10)', 'Additional Varga chart concepts', 'Comparison with the main birth chart'] },
          { module: 'Module 4', title: 'Dasha Systems', topics: ['Vimshottari Dasha', 'Mahadasha and Antardasha', 'Traditional timing interpretations', 'Worked examples'] },
          { module: 'Module 5', title: 'Planetary Transits', topics: ['Gochar fundamentals', 'Transit interpretation', 'Jupiter and Saturn transits', 'Combining transit and Dasha frameworks'] },
          { module: 'Module 6', title: 'Applied Kundli Analysis', topics: ['Guided case studies', 'Integrating chart components', 'Traditional interpretations of life themes', 'Responsible consultation and interpretation'] },
        ],
        faqs: [
          { question: 'Do I need prior astrology knowledge?', answer: 'Yes. This program is designed for learners who understand the basics of Kundli reading and birth-chart interpretation.' },
          { question: 'What is the proposed duration and fee?', answer: 'The proposed duration is 4 months with a proposed fee of ₹19,999. Final details will be confirmed at launch.' },
          { question: 'Will I learn predictive techniques?', answer: 'The program covers Dasha systems, transits, Yogas and divisional charts for deeper chart interpretation.' },
        ],
      },
      {
        title: 'Numerology & Name Analysis',
        slug: 'numerology-name-analysis',
        shortDescription:
          'Explore the symbolic traditions of numerology and discover how different numerological systems use birth dates, names and number combinations.',
        overview:
          'Explore the symbolic traditions of numerology and discover how different numerological systems use birth dates, names and number combinations.\n\nThis program introduces popular numerological calculation methods and traditional interpretation frameworks.',
        level: 'Beginner to Intermediate',
        duration: '6 Weeks',
        fee: 6999,
        eligibility: 'Open to beginners and enthusiasts interested in numerology.',
        format: 'Online learning with practical exercises and worked examples.',
        learningObjectives:
          'Calculate commonly used numerology values and understand their traditional symbolic interpretations.',
        category: 'numerology',
        icon: 'hash',
        curriculum: [
          { module: 'Module 1', title: 'Introduction to Numerology', topics: ['Historical traditions', 'Foundational number symbolism', 'Different numerology systems'] },
          { module: 'Module 2', title: 'Core Number Calculations', topics: ['Birth Number', 'Life Path Number', 'Destiny Number', 'Compound Numbers'] },
          { module: 'Module 3', title: 'Chaldean Numerology', topics: ['Letter-to-number values', 'Name calculations', 'Compound number interpretation', 'Worked examples'] },
          { module: 'Module 4', title: 'Name Analysis', topics: ['Name number calculations', 'Spelling variations', 'Brand name numerology', 'Interpretation exercises'] },
          { module: 'Module 5', title: 'Practical Numerology', topics: ['Case-based exercises', 'Communicating interpretations', 'Ethical practices and limitations'] },
        ],
        faqs: [
          { question: 'Is this course suitable for beginners?', answer: 'Yes. The program is designed for beginners to intermediate learners interested in numerology.' },
          { question: 'What is the proposed duration and fee?', answer: 'The proposed duration is 6 weeks with a proposed fee of ₹6,999. Final details will be confirmed at launch.' },
          { question: 'Which numerology systems are covered?', answer: 'The program introduces core number calculations, Chaldean numerology and name analysis.' },
        ],
      },
      {
        title: 'Nakshatra & Planetary Studies',
        slug: 'nakshatra-planetary-studies',
        shortDescription:
          'Explore the traditional significance of the Nakshatras and planetary relationships within the Vedic astrology system.',
        overview:
          'Explore the traditional significance of the Nakshatras and planetary relationships within the Vedic astrology system.\n\nUnderstand the characteristics, symbolism, ruling planets and interpretive applications of the lunar constellations.',
        level: 'Intermediate',
        duration: '2 Months',
        fee: 8999,
        eligibility: 'Learners with basic familiarity with Vedic astrology concepts.',
        format: 'Online learning with guided practical exercises.',
        learningObjectives:
          'Understand the structure of the Nakshatra system and practice traditional Nakshatra-based chart interpretation.',
        category: 'vedic',
        icon: 'sparkles',
        curriculum: [
          { module: 'Module 1', title: 'Foundations of Nakshatra Studies', topics: ['Lunar constellations', 'Traditional astronomy context', 'Nakshatra classifications'] },
          { module: 'Module 2', title: 'The 27 Nakshatras', topics: ['Individual Nakshatra characteristics', 'Symbols and associated traditions', 'Ruling planets'] },
          { module: 'Module 3', title: 'Nakshatra Padas', topics: ['Four Padas', 'Navamsa relationships', 'Interpretation examples'] },
          { module: 'Module 4', title: 'Planetary Relationships', topics: ['Traditional planetary characteristics', 'Sign and house relationships', 'Planet–Nakshatra interactions'] },
          { module: 'Module 5', title: 'Applied Interpretation', topics: ['Birth chart examples', 'Nakshatra-based analysis', 'Guided practical exercises'] },
        ],
        faqs: [
          { question: 'Do I need prior knowledge of Vedic astrology?', answer: 'Basic familiarity with Vedic astrology concepts is recommended for this intermediate-level program.' },
          { question: 'What is the proposed duration and fee?', answer: 'The proposed duration is 2 months with a proposed fee of ₹8,999. Final details will be confirmed at launch.' },
          { question: 'Are all 27 Nakshatras covered?', answer: 'Yes. The program explores all 27 Nakshatras, their Padas and ruling planets.' },
        ],
      },
      {
        title: 'Professional Astrology Practitioner Program',
        slug: 'professional-astrology-practitioner',
        shortDescription:
          'A comprehensive learning pathway for individuals interested in developing a deeper understanding of Vedic Astrology and exploring responsible professional consultation practices.',
        overview:
          'A comprehensive learning pathway for individuals interested in developing a deeper understanding of Vedic Astrology and exploring responsible professional consultation practices.\n\nThis program combines classical astrological concepts, applied chart interpretation, practical case discussions and professional communication skills.\n\nCompletion of this course does not guarantee employment, income, professional licensing or a particular client outcome.',
        level: 'Advanced',
        duration: '6 Months',
        fee: 34999,
        eligibility: 'Advanced learners with prior Vedic astrology study or practice.',
        format: 'Online learning with live classes, case studies, mock consultations and a final project.',
        learningObjectives:
          'Strengthen traditional chart-interpretation skills, improve consultation communication, and understand the ethical responsibilities of providing astrology-related guidance.',
        category: 'vedic',
        icon: 'compass',
        curriculum: [
          { module: 'Module 1', title: 'Comprehensive Jyotish Review', topics: ['Rashis, Grahas, Bhavas and Nakshatras', 'Foundational interpretation', 'Chart relationships'] },
          { module: 'Module 2', title: 'Advanced Horoscope Interpretation', topics: ['Divisional charts', 'Planetary combinations', 'Strength assessment', 'Dasha and transit frameworks'] },
          { module: 'Module 3', title: 'Traditional Life-Theme Analysis', topics: ['Education and career themes', 'Relationship and compatibility traditions', 'Family and personal circumstances', 'Limits of astrological interpretation'] },
          { module: 'Module 4', title: 'Consultation Techniques', topics: ['Client intake', 'Question analysis', 'Chart review process', 'Clear and respectful communication'] },
          { module: 'Module 5', title: 'Professional Ethics', topics: ['Client confidentiality', 'Informed consent', 'Avoiding deterministic predictions', 'Recognizing health, legal and financial boundaries'] },
          { module: 'Module 6', title: 'Applied Practice', topics: ['Case study portfolio', 'Guided interpretation exercises', 'Mock consultation sessions', 'Final project presentation'] },
        ],
        faqs: [
          { question: 'Is this course suitable for beginners?', answer: 'No. This is an advanced program for learners with prior Vedic astrology study or practice.' },
          { question: 'What is the proposed duration and fee?', answer: 'The proposed duration is 6 months with a proposed fee of ₹34,999. Final details will be confirmed at launch.' },
          { question: 'Does completion guarantee professional practice?', answer: 'No. Completion does not guarantee employment, income, professional licensing or a particular client outcome.' },
        ],
      },
    ];

    for (const c of courses) {
      const id = seedId('courses:' + c.slug);
      try {
        app.findRecordById('courses', id);
        continue;
      } catch (_) {
        /* create below */
      }
      const record = new Record(collection);
      record.set('id', id);
      record.set('title', c.title);
      record.set('slug', c.slug);
      record.set('shortDescription', c.shortDescription);
      record.set('overview', c.overview);
      record.set('level', c.level);
      record.set('duration', c.duration);
      record.set('fee', c.fee);
      record.set('eligibility', c.eligibility);
      record.set('format', c.format);
      record.set('learningObjectives', c.learningObjectives);
      record.set('curriculum', JSON.stringify(c.curriculum));
      record.set('faqs', JSON.stringify(c.faqs));
      record.set('instructorName', 'To be announced');
      record.set('instructorBio', 'Instructor profiles will be shared before courses launch.');
      record.set('category', c.category);
      record.set('status', 'published');
      record.set('enrollmentStatus', 'enquire');
      record.set('trainer', 'To be announced');
      record.set('deliveryMethod', c.format);
      record.set('icon', c.icon);
      app.save(record);
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('courses'));
    } catch (_) {
      /* already gone */
    }
  },
);
