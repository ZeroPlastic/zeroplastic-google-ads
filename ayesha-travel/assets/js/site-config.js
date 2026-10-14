/* =====================================================================
   AYESHA TRAVEL — EDITABLE SITE CONTENT
   ---------------------------------------------------------------------
   This is the one file to edit for contact details and destinations.
   Plain text only. Save, then redeploy (or refresh when previewing).
   ===================================================================== */

window.AYESHA_SITE = {
  /* ---------------------------------------------------------------
     CONTACT DETAILS
     Leave a value as '' (empty) to hide it. Nothing is shown for an
     empty value, so the site never displays a broken link.
     --------------------------------------------------------------- */
  contact: {
    // Public email address shown on the site, e.g. 'hello@yourdomain.com'
    email: '',

    // WhatsApp number in international format, digits only, no '+' or spaces,
    // e.g. '94771234567' for +94 77 123 4567
    whatsapp: '',

    // Full profile URLs, e.g. 'https://www.instagram.com/yourprofile'
    instagram: '',
    facebook: '',
    tiktok: '',
  },

  /* ---------------------------------------------------------------
     DESTINATIONS
     Each destination becomes a card and an option in the enquiry form.
     - id:         short unique name, lowercase, no spaces
     - name:       shown on the card and in enquiry emails
     - region:     small label above the name
     - summary:    one or two sentences
     - highlights: exactly three short experience highlights
     - image:      file name base in assets/img/destinations/
                   (needs NAME-480, NAME-800 and NAME-1200 in .jpg and .webp)
     - imageAlt:   describe the photo for people using screen readers
     - imageRatio: width / height of the photo (prevents layout jumps)
     - credit:     photographer and licence (also list in IMAGE_CREDITS.md)
     --------------------------------------------------------------- */
  destinations: [
    {
      id: 'sigiriya',
      name: 'Sigiriya',
      region: 'Cultural Triangle',
      summary:
        'A fifth-century rock fortress rising from the plains, surrounded by villages where traditional ways of life and handcraft continue.',
      highlights: [
        'Explore the Sigiriya rock fortress and its water gardens',
        'Spend time in a nearby village and see daily rural life',
        'Meet local artisans working in traditional crafts',
      ],
      image: 'sigiriya',
      imageAlt: 'Sigiriya rock rising above trees at the end of a garden pathway under a blue sky',
      imageRatio: 4 / 3,
      credit: 'Bernard Gagnon, CC BY-SA 3.0',
    },
    {
      id: 'kandy',
      name: 'Kandy',
      region: 'Central Highlands',
      summary:
        'The last royal capital, set around a lake in green hills and home to the Temple of the Sacred Tooth Relic.',
      highlights: [
        'Visit the Temple of the Sacred Tooth Relic',
        'Walk around Kandy Lake and the old town',
        'Explore gardens and viewpoints in the surrounding hills',
      ],
      image: 'kandy',
      imageAlt: 'Kandy Lake with the Temple of the Sacred Tooth Relic and white colonial buildings on the shore',
      imageRatio: 3 / 2,
      credit: 'Dan arndt, CC BY-SA 4.0',
    },
    {
      id: 'ella',
      name: 'Ella',
      region: 'Hill Country',
      summary:
        'A small mountain town among tea estates and forested ridges, made for slow mornings and unhurried walks.',
      highlights: [
        'See the Nine Arches Bridge set in the forest',
        'Walk through tea landscapes to hill-country viewpoints',
        'Travel by train through the highlands',
      ],
      image: 'ella',
      imageAlt: 'The curved stone Nine Arches Bridge near Ella surrounded by dense green forest',
      imageRatio: 3 / 2,
      credit: 'Knthabrew, CC BY-SA 4.0',
    },
    {
      id: 'galle',
      name: 'Galle',
      region: 'South Coast',
      summary:
        'A fortified old town on the coast, where ramparts, lanes and the lighthouse reward relaxed exploration.',
      highlights: [
        'Walk the ramparts of Galle Fort at sunset',
        'Wander historic streets, cafés and small shops',
        'Discover the coastal culture of the south',
      ],
      image: 'galle',
      imageAlt: 'The white lighthouse at Galle Fort framed by palm trees under a clear sky',
      imageRatio: 5 / 4,
      credit: 'A.Savin, Free Art License',
    },
    {
      id: 'mirissa',
      name: 'Mirissa',
      region: 'South Coast',
      summary:
        'A crescent of golden sand fringed with palms, for slow beach days and time by the Indian Ocean.',
      highlights: [
        'Spend unhurried days on the beach',
        'Watch the sun set over the bay',
        'Ask about seasonal whale-watching from the coast',
      ],
      image: 'mirissa',
      imageAlt: 'Mirissa beach with gentle waves, golden sand and a palm-covered headland',
      imageRatio: 3 / 2,
      credit: 'dronepicr, CC BY 2.0',
    },
    {
      id: 'yala',
      name: 'Yala',
      region: 'Southeast',
      summary:
        'Dry forest, lagoons and rocky outcrops in one of the island’s best-known national parks for wildlife.',
      highlights: [
        'Go on a jeep safari in Yala National Park',
        'Look out for leopards, elephants and birdlife',
        'Experience the coastal scrub and lagoon landscapes',
      ],
      image: 'yala',
      imageAlt: 'A Sri Lankan leopard resting on a rock beside a tree trunk in Yala National Park',
      imageRatio: 3 / 2,
      credit: 'Byrdyak, CC BY-SA 4.0',
    },
  ],
};
