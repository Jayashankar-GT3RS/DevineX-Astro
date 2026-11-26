/// <reference path="../pb_data/types.d.ts" />

// Creates the blog_posts collection for the DevineX Astro Knowledge Centre and
// seeds ten original, SEO-friendly articles across the requested categories.
// Articles are informational; traditional beliefs are distinguished from
// scientifically established facts. No fictional authors or credentials.
migrate(
  (app) => {
    let collection;
    try {
      collection = app.findCollectionByNameOrId('blog_posts');
    } catch (_) {
      collection = new Collection({
        type: 'base',
        name: 'blog_posts',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: 'title', type: 'text', required: true, max: 300 },
          { name: 'slug', type: 'text', required: true, max: 200 },
          { name: 'excerpt', type: 'text', required: true, max: 500 },
          { name: 'content', type: 'text', required: true, max: 50000 },
          { name: 'category', type: 'select', maxSelect: 1, values: [
            'Vedic Astrology Basics', 'Jyotish Shastra', 'Kundli Analysis',
            'Zodiac Signs', 'Navagraha', 'Nakshatras', 'Numerology',
            'Astrology Education', 'Traditional Indian Knowledge',
          ] },
          { name: 'tags', type: 'text', max: 500 },
          { name: 'author', type: 'text', max: 200 },
          { name: 'metaDescription', type: 'text', max: 300 },
          { name: 'status', type: 'select', maxSelect: 1, values: ['draft', 'published'] },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      });
      app.save(collection);
    }

    const seedId = (key) => $security.sha256(key).substring(0, 15);

    const articles = [
      {
        title: "What Is Vedic Astrology? A Complete Beginner's Guide",
        slug: 'what-is-vedic-astrology-beginners-guide',
        category: 'Vedic Astrology Basics',
        excerpt: 'An introduction to Jyotish, the traditional Indian system of astrology, its origins, core concepts, and how it differs from modern astronomy.',
        metaDescription: 'A beginner-friendly guide to Vedic Astrology (Jyotish): its origins, core concepts, the birth chart, and how traditional interpretation differs from science.',
        content: [
          'Vedic Astrology, known in Sanskrit as Jyotish, is the traditional system of astrology that developed in ancient India. The word Jyotish translates roughly to "the science of light," reflecting its aim of bringing insight into the patterns of human life through the observation of celestial bodies.',
          'Jyotish is one of the six Vedangas, the auxiliary disciplines associated with the Vedas, the oldest scriptures of the Indian subcontinent. For centuries, scholars used these observations to track time, plan rituals, and explore the relationship between cosmic cycles and earthly events.',
          'At the heart of Vedic Astrology is the birth chart, or Kundli, a map of the sky at the moment and place of a person\'s birth. This chart records the positions of the planets (Grahas), the twelve zodiac signs (Rashis), the twelve houses (Bhavas), and the twenty-seven lunar mansions (Nakshatras). An astrologer interprets the relationships between these elements to discuss tendencies, strengths, and life themes.',
          'It is important to distinguish between astrology and astronomy. Astronomy is the scientific study of celestial objects and the physical universe, grounded in observation, measurement, and verifiable evidence. Vedic Astrology, by contrast, is a traditional interpretive discipline rooted in cultural and philosophical frameworks. Its claims about human destiny are not scientifically established and should be approached as belief and interpretation rather than proven fact.',
          'For beginners, the study of Jyotish offers a window into a rich intellectual tradition that connects mathematics, astronomy, language, and philosophy. Whether approached as a cultural subject or a personal practice, it rewards patient, structured study and a thoughtful, questioning mindset.',
        ].join('\n\n'),
      },
      {
        title: 'How to Learn Vedic Astrology Online',
        slug: 'how-to-learn-vedic-astrology-online',
        category: 'Astrology Education',
        excerpt: 'A practical roadmap for studying Jyotish through online courses, from foundational concepts to structured chart interpretation.',
        metaDescription: 'A practical guide to learning Vedic Astrology online: foundational topics, structured study paths, and how to choose a credible course.',
        content: [
          'Learning Vedic Astrology online has become increasingly accessible, with structured courses, video lessons, and digital communities making the subject available to students far beyond traditional centres of study. A thoughtful approach helps beginners build a solid foundation rather than feeling overwhelmed.',
          'The first step is to understand the building blocks: the nine Grahas (planets), the twelve Rashis (zodiac signs), the twelve Bhavas (houses), and the twenty-seven Nakshatras (lunar mansions). These elements form the vocabulary of Jyotish, and every interpretation depends on understanding how they interact within a chart.',
          'Once the basics are clear, students can move toward chart construction and interpretation. This includes learning about planetary dignity, aspects (Drishti), yogas (combinations), and the Dasha system, which tracks planetary periods over the course of a life. Practical exercises with sample charts help translate theory into applied understanding.',
          'When choosing an online course, look for transparency. A credible programme should clearly state its syllabus, the experience of its trainers, the learning format, the language of instruction, and any fees. Be cautious of courses that promise guaranteed predictions, secret techniques, or instant mastery. Jyotish is a lifelong study, and responsible educators present it as such.',
          'Finally, approach the subject with both curiosity and critical thinking. Vedic Astrology is a traditional interpretive art, not a science. The most rewarding study combines respect for the tradition with an honest understanding of its limitations, distinguishing cultural belief from verifiable knowledge.',
        ].join('\n\n'),
      },
      {
        title: 'Understanding the 12 Rashis',
        slug: 'understanding-the-12-rashis',
        category: 'Zodiac Signs',
        excerpt: 'An overview of the twelve zodiac signs (Rashis) in Vedic Astrology, their elements, qualities, and role in the birth chart.',
        metaDescription: 'Learn about the 12 Rashis (zodiac signs) in Vedic Astrology: their elements, modalities, ruling planets, and symbolic meanings.',
        content: [
          'In Vedic Astrology, the zodiac is divided into twelve equal segments of thirty degrees each, known as Rashis. These signs form the backdrop against which the planets move, and each Rashi carries its own symbolic qualities, element, and ruling planet.',
          'The twelve Rashis are Aries (Mesha), Taurus (Vrishabha), Gemini (Mithuna), Cancer (Karka), Leo (Simha), Virgo (Kanya), Libra (Tula), Scorpio (Vrishchika), Sagittarius (Dhanu), Capricorn (Makara), Aquarius (Kumbha), and Pisces (Meena). Each corresponds to a constellation along the ecliptic, the apparent path of the Sun across the sky.',
          'Each Rashi belongs to one of four elements: fire (Aries, Leo, Sagittarius), earth (Taurus, Virgo, Capricorn), air (Gemini, Libra, Aquarius), or water (Cancer, Scorpio, Pisces). The element describes the fundamental temperament associated with the sign. Signs are also grouped by modality: cardinal, fixed, or dual, which describes their style of action and change.',
          'A key distinction between Vedic and Western astrology is the zodiac system used. Vedic Astrology follows the sidereal zodiac, which accounts for the precession of the equinoxes and aligns signs with the actual fixed stars. Western astrology uses the tropical zodiac, fixed to the seasons. As a result, a person\'s Rashi in Vedic Astrology often differs by about twenty-three degrees from their Western sun sign.',
          'In a birth chart, the Rashi occupying the first house at the moment of birth becomes the ascendant, or Lagna, which is considered especially significant. Understanding the Rashis is an essential step toward reading any chart, as they colour the expression of every planet that occupies them.',
        ].join('\n\n'),
      },
      {
        title: 'Navagraha Explained',
        slug: 'navagraha-explained',
        category: 'Navagraha',
        excerpt: 'An introduction to the nine Grahas of Vedic Astrology, their astronomical basis, and their symbolic significance in chart interpretation.',
        metaDescription: 'A clear explanation of the Navagraha, the nine planetary bodies in Vedic Astrology, their symbolism, and their role in the birth chart.',
        content: [
          'The Navagraha, or "nine celestial bodies," are central to Vedic Astrology. The term Graha is often translated as "planet," but it more precisely means "that which seizes or holds influence." The nine Grahas are the Sun (Surya), Moon (Chandra), Mars (Mangala), Mercury (Budha), Jupiter (Guru), Venus (Shukra), Saturn (Shani), and the two lunar nodes, Rahu and Ketu.',
          'It is worth noting that the Grahas include the Sun and Moon, which are not planets in the astronomical sense, as well as Rahu and Ketu, which are mathematical points where the Moon\'s orbit intersects the apparent path of the Sun. These points correspond to lunar and solar eclipse geometry. The Navagraha thus reflects an observational framework rather than the modern astronomical classification of planets.',
          'Each Graha carries symbolic associations. The Sun represents the self, vitality, and authority; the Moon, the mind and emotions; Mars, energy and courage; Mercury, intellect and communication; Jupiter, wisdom and expansion; Venus, harmony and desire; Saturn, discipline and time; Rahu, ambition and worldly focus; and Ketu, detachment and spiritual insight.',
          'In a birth chart, the strength, dignity, and placement of each Graha shape the interpretation. A planet may be exalted (strongest expression), debilitated (weakest), or in a friendly or hostile sign. The aspects (Drishti) that planets cast upon one another further modify their influence.',
          'The Navagraha are also honoured in temple traditions across India, reflecting their cultural significance. For students of Jyotish, understanding these nine bodies is foundational, as nearly every interpretive technique builds upon their interactions within the chart.',
        ].join('\n\n'),
      },
      {
        title: 'How to Read a Kundli for Beginners',
        slug: 'how-to-read-a-kundli-for-beginners',
        category: 'Kundli Analysis',
        excerpt: 'A step-by-step introduction to reading a Vedic birth chart (Kundli), covering houses, planets, signs, and the basic interpretive process.',
        metaDescription: 'Learn how to read a Kundli (Vedic birth chart) step by step: the twelve houses, planetary placements, ascendant, and basic interpretation.',
        content: [
          'A Kundli, or birth chart, is the foundational document of Vedic Astrology. It is a two-dimensional map of the sky at the exact time, date, and place of a person\'s birth, divided into twelve sections called Bhavas, or houses. Each house represents a domain of life, and the planets and signs placed within it shape the interpretation of that domain.',
          'The first step in reading a Kundli is to identify the Lagna, or ascendant, which is the sign rising on the eastern horizon at the moment of birth. The Lagna sets the first house and establishes the framework for the entire chart. It is considered a key indicator of personality and physical vitality.',
          'Next, examine the twelve houses. The first house represents the self; the second, wealth and speech; the third, siblings and effort; the fourth, home and mother; the fifth, intellect and children; the sixth, health and obstacles; the seventh, partnerships; the eighth, transformation and longevity; the ninth, fortune and higher learning; the tenth, career and reputation; the eleventh, gains and aspirations; and the twelfth, loss and liberation.',
          'For each house, note which Rashi occupies it, which Grahas are placed within it, and which planets aspect it. A planet\'s dignity, whether exalted, own sign, or debilitated, influences how comfortably it can express its energy. The relationships between planets, such as conjunctions and aspects, add further layers of meaning.',
          'Beginners should remember that a Kundli is a complex, interconnected system. No single placement tells the whole story. Responsible interpretation considers the chart as a whole, acknowledges its subtleties, and avoids fatalistic pronouncements. Vedic Astrology is an interpretive tradition, and its insights should be weighed thoughtfully rather than treated as deterministic fact.',
        ].join('\n\n'),
      },
      {
        title: 'What Are the 27 Nakshatras?',
        slug: 'what-are-the-27-nakshatras',
        category: 'Nakshatras',
        excerpt: 'An introduction to the twenty-seven lunar mansions (Nakshatras) of Vedic Astrology and their role in timing, compatibility, and interpretation.',
        metaDescription: 'Discover the 27 Nakshatras, the lunar mansions of Vedic Astrology: their structure, symbolism, and use in timing and chart interpretation.',
        content: [
          'The Nakshatras are twenty-seven (sometimes twenty-eight) divisions of the sky used in Vedic Astrology to track the Moon\'s path. Each Nakshatra spans thirteen degrees and twenty minutes along the ecliptic, together covering the full circle of the zodiac. The word Nakshatra means "star" or "lunar mansion," and these divisions are among the oldest elements of Indian astronomical thought.',
          'The Moon spends approximately one day in each Nakshatra, making them central to the traditional lunar calendar. The Nakshatra in which the Moon is placed at the time of birth is called the Janma Nakshatra, and it is considered significant for understanding a person\'s temperament, rhythms, and emotional nature.',
          'Each Nakshatra is associated with a ruling planet, a symbol, a presiding deity, and a set of qualities. For example, Ashwini, the first Nakshatra, is ruled by Ketu and symbolised by a horse\'s head, suggesting speed and initiative. Rohini, ruled by the Moon, is associated with growth and creativity. These associations provide a rich symbolic vocabulary for interpretation.',
          'Nakshatras are used in several practical applications. They play a role in Muhurta, the selection of auspicious timings for important events. They are also central to Ashtakoota, the traditional system of compatibility analysis used in matchmaking, which compares the Nakshatras of two individuals across multiple factors.',
          'For students, the Nakshatras add depth and precision to chart analysis beyond what the twelve Rashis alone provide. They connect the broader zodiac to the Moon\'s daily journey, offering a finer-grained framework that has shaped Indian timekeeping, ritual, and interpretation for millennia.',
        ].join('\n\n'),
      },
      {
        title: 'Introduction to Chaldean Numerology',
        slug: 'introduction-to-chaldean-numerology',
        category: 'Numerology',
        excerpt: 'An overview of Chaldean numerology, its number-letter system, and how it is applied to names and personal analysis.',
        metaDescription: 'A beginner-friendly introduction to Chaldean numerology: its number-letter mapping, core numbers, and how names are analysed.',
        content: [
          'Chaldean numerology is an ancient system of number interpretation that traces its origins to the Chaldeans of Mesopotamia. Unlike some other numerological systems, it assigns numbers to letters based on sound vibration rather than sequential order, which its practitioners consider central to its distinctive approach.',
          'In the Chaldean system, the numbers one through eight are assigned to the letters of the alphabet, while the number nine is considered sacred and is not directly assigned. Each number carries a set of qualities: one suggests independence and leadership; two, harmony and cooperation; three, expression and creativity; four, stability and discipline; five, freedom and change; six, responsibility and care; seven, analysis and spirituality; and eight, ambition and material mastery.',
          'A common application is name analysis. Each letter of a name is converted to its corresponding number, and these are summed and reduced to derive a name number. This is read alongside the birth number, derived from the date of birth, and the life path, to explore the energies associated with a person\'s name and life themes.',
          'It is important to approach numerology as a traditional interpretive practice rather than a science. The meanings assigned to numbers are symbolic and culturally rooted, not empirically verified. Numerology can offer a framework for reflection, but it does not predict concrete outcomes or determine a person\'s future.',
          'For those interested in study, Chaldean numerology pairs naturally with Vedic Astrology, as both traditions share roots in ancient Indian and Mesopotamian thought. Together they offer complementary lenses for self-reflection, provided they are understood as interpretive arts rather than factual claims.',
        ].join('\n\n'),
      },
      {
        title: 'Essential Subjects in an Astrology Course',
        slug: 'essential-subjects-in-an-astrology-course',
        category: 'Astrology Education',
        excerpt: 'A guide to the core subjects a structured Vedic Astrology course should cover, from foundational concepts to practical interpretation.',
        metaDescription: 'Explore the essential subjects covered in a structured Vedic Astrology course, from planets and signs to dashas, yogas, and chart interpretation.',
        content: [
          'A well-structured Vedic Astrology course builds knowledge progressively, moving from foundational concepts toward applied interpretation. Understanding the standard subjects helps students evaluate whether a programme offers a complete education or only fragments of the tradition.',
          'The foundation begins with the nine Grahas, their significations, dignities, and relationships. Students then study the twelve Rashis, their elements and modalities, and the twelve Bhavas, which map the domains of life. The twenty-seven Nakshatras are introduced to add lunar precision to chart analysis.',
          'Beyond these basics, a comprehensive course covers planetary aspects (Drishti), yogas (planetary combinations that indicate specific life patterns), and the Dasha system, which tracks the timing of planetary influences across a lifetime. Transit analysis (Gochara) examines how moving planets interact with the static birth chart.',
          'Practical subjects include chart construction, the calculation of the Lagna, and the use of divisional charts (Vargas), which magnify specific areas of life such as career, marriage, or fortune. A responsible course also addresses ethics, communication, and the limitations of astrological interpretation, training students to present insights thoughtfully.',
          'When evaluating a course, check whether these subjects appear in the syllabus and whether the programme provides opportunities for guided practice with real charts. A credible educator is transparent about what the course covers, the qualifications of its trainers, and the boundaries of what astrology can and cannot responsibly claim.',
        ].join('\n\n'),
      },
      {
        title: 'Vedic Astrology vs Western Astrology',
        slug: 'vedic-astrology-vs-western-astrology',
        category: 'Vedic Astrology Basics',
        excerpt: 'A comparison of Vedic and Western astrology, their zodiac systems, techniques, and philosophical foundations.',
        metaDescription: 'Compare Vedic and Western astrology: sidereal vs tropical zodiacs, differing techniques, and the philosophical roots of each tradition.',
        content: [
          'Vedic Astrology and Western Astrology are two distinct traditions that share ancient roots but have developed along different paths. Understanding their differences helps students appreciate each system on its own terms and avoid conflating their methods.',
          'The most significant technical difference lies in the zodiac. Vedic Astrology uses the sidereal zodiac, which is aligned with the fixed stars and accounts for the precession of the equinoxes, the gradual shift in the Earth\'s rotational axis. Western Astrology uses the tropical zodiac, which is fixed to the seasons and the position of the Sun at the vernal equinox. Because of precession, the two zodiacs have drifted apart by roughly twenty-three degrees, meaning a person\'s Vedic ascendant or Moon sign often differs from their Western sun sign.',
          'The two traditions also emphasise different elements. Vedic Astrology places strong focus on the Moon and the Nakshatras, the lunar mansions, and uses the Dasha system for timing life events. Western Astrology tends to emphasise the Sun sign and psychological archetypes, drawing heavily on the work of modern astrologers who framed the practice as a tool for self-understanding.',
          'Philosophically, Vedic Astrology is embedded in the broader framework of Indian thought, with connections to karma, dharma, and spiritual development. Western Astrology has been shaped by Hellenistic, medieval, and modern influences, including twentieth-century psychology.',
          'Neither tradition is scientifically validated. Both are interpretive systems rooted in cultural and historical contexts. Students may study either or both, but should approach them as frameworks for reflection rather than as sources of factual prediction about events or personality.',
        ].join('\n\n'),
      },
      {
        title: 'How to Choose an Astrology Training Program',
        slug: 'how-to-choose-an-astrology-training-program',
        category: 'Astrology Education',
        excerpt: 'Practical guidance on selecting a credible Vedic Astrology course, including what to look for and what to question.',
        metaDescription: 'A practical guide to choosing a credible Vedic Astrology training program: syllabus, trainer transparency, format, fees, and red flags.',
        content: [
          'Choosing an astrology training programme is an important decision, as the quality and integrity of instruction vary widely. A thoughtful evaluation helps students find a course that offers genuine learning rather than empty promises.',
          'Begin with transparency. A credible programme should clearly publish its syllabus, the topics covered at each stage, the learning format, the language of instruction, and the fees. The trainers\' backgrounds and areas of expertise should be honestly presented, without inflated or unverifiable credentials. If a course is vague about what it teaches or who teaches it, that is a reason to question it.',
          'Consider the structure of the curriculum. A complete programme should cover the Grahas, Rashis, Bhavas, Nakshatras, aspects, yogas, and the Dasha system, along with opportunities for guided practice. Look for courses that teach chart construction and interpretation rather than only memorisation, and that address the ethical responsibilities of interpretation.',
          'Be cautious of red flags. Programmes that guarantee predictions, promise secret knowledge, claim instant mastery, or suggest that astrology can replace medical, legal, or financial advice are not acting responsibly. Vedic Astrology is a lifelong interpretive study, and honest educators present it as such.',
          'Finally, consider the learning format and support. Online courses, live classes, recorded lessons, and community discussion each suit different learners. The right programme balances structured content, accessible instruction, and a respectful approach to the tradition and its limitations, helping you build knowledge with both curiosity and discernment.',
        ].join('\n\n'),
      },
    ];

    for (const a of articles) {
      try {
        const record = new Record(collection);
        record.set('title', a.title);
        record.set('slug', a.slug);
        record.set('excerpt', a.excerpt);
        record.set('content', a.content);
        record.set('category', a.category);
        record.set('author', 'DevineX Astro');
        record.set('metaDescription', a.metaDescription);
        record.set('status', 'published');
        app.save(record);
      } catch (err) {
        $app.logger().error('blog seed failed', 'slug', a.slug, 'err', String(err));
      }
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('blog_posts');
      app.delete(collection);
    } catch (_) { /* already gone */ }
  },
);
