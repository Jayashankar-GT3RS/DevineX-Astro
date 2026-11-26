/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const trainers = app.findCollectionByNameOrId('trainers');
    if (!trainers.fields.getByName('designation')) {
      trainers.fields.add(new TextField({ name: 'designation', max: 200 }));
    }
    if (!trainers.fields.getByName('photoUrl')) {
      trainers.fields.add(new TextField({ name: 'photoUrl', max: 1000 }));
    }
    app.save(trainers);

    const matches = app.findRecordsByFilter('trainers', "slug = 'pt-m-k-vasantha-kumar' || fullName = 'Pt. M. K. Vasantha Kumar'", '', 1, 0);
    const trainer = matches[0] || new Record(trainers);
    if (!matches.length) trainer.set('id', $security.sha256('trainers:pt-m-k-vasantha-kumar').substring(0, 15));
    trainer.set('fullName', 'Pt. M. K. Vasantha Kumar');
    trainer.set('slug', 'pt-m-k-vasantha-kumar');
    trainer.set('designation', 'Senior Astrology Faculty & Mentor');
    trainer.set('specialization', 'Vedic Astrology, Parashari Astrology and Yantra Studies');
    trainer.set('biography', 'Pt. M. K. Vasantha Kumar joins DevineX Astro as an astrology faculty member and mentor, bringing traditional Indian astrological knowledge into a structured modern learning environment.\n\nWith a focus on classical astrological principles, Parashari Astrology and traditional Yantra studies, he aims to guide aspiring astrologers in developing conceptual understanding, practical interpretation skills and responsible astrological practices.\n\nAt DevineX Astro, his mentorship will help learners explore the timeless wisdom of Jyotish Shastra through structured education and guided practice.');
    trainer.set('socialLinks', JSON.stringify([{ label: 'YouTube', url: 'https://www.youtube.com/@m.k.vasanthakumar4613' }]));
    trainer.set('photoUrl', 'https://horizons-cdn.hostinger.com/db638a6d-9c4b-4ea3-8229-75c807efba78/b55675e6cf4d7f3f3f3687b680753aa0.jpg');
    trainer.set('status', 'published');
    app.save(trainer);
  },
  () => {
    // Keep faculty records and any later edits intact if rolled back.
  },
);
