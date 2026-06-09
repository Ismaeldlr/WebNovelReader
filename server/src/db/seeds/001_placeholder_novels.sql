INSERT INTO novels (
  source_site,
  source_url,
  title,
  author,
  description,
  tags,
  total_chapters,
  cover_url,
  cover_url_orig,
  last_scraped_at
) VALUES
  (
    'royal_road',
    'https://placeholder.webnovel-hub.local/royal-road/ashen-archive',
    'The Ashen Archive',
    'Mira Vale',
    'A junior archivist finds forbidden expedition logs that point to a city buried under volcanic glass.',
    ARRAY['fantasy', 'mystery', 'slow-burn'],
    128,
    NULL,
    NULL,
    NOW() - INTERVAL '3 hours'
  ),
  (
    'ranobes',
    'https://placeholder.webnovel-hub.local/ranobes/moonlit-alchemist',
    'Moonlit Alchemist',
    'Ren Kisar',
    'An exiled potion maker rebuilds her craft in a border town where every full moon changes the rules of magic.',
    ARRAY['alchemy', 'magic', 'slice-of-life'],
    86,
    NULL,
    NULL,
    NOW() - INTERVAL '8 hours'
  ),
  (
    'wtr_lab',
    'https://placeholder.webnovel-hub.local/wtr-lab/circuit-saint',
    'Circuit Saint',
    'J. Calder',
    'A repair tech with illegal neural implants gets pulled into a war between city-sized machines.',
    ARRAY['sci-fi', 'cyberpunk', 'action'],
    211,
    NULL,
    NULL,
    NOW() - INTERVAL '1 day'
  ),
  (
    'royal_road',
    'https://placeholder.webnovel-hub.local/royal-road/crown-of-small-gods',
    'Crown of Small Gods',
    'Theo Ardent',
    'A failed prince inherits a shrine of forgotten spirits and bargains his way through a fractured kingdom.',
    ARRAY['kingdom-building', 'politics', 'fantasy'],
    174,
    NULL,
    NULL,
    NOW() - INTERVAL '2 days'
  ),
  (
    'ranobes',
    'https://placeholder.webnovel-hub.local/ranobes/inkblade-apprentice',
    'Inkblade Apprentice',
    'Sana Rook',
    'A calligraphy student discovers that perfect strokes can cut through monsters, contracts, and lies.',
    ARRAY['martial-arts', 'academy', 'adventure'],
    64,
    NULL,
    NULL,
    NOW() - INTERVAL '4 days'
  ),
  (
    'wtr_lab',
    'https://placeholder.webnovel-hub.local/wtr-lab/the-last-mapmaker',
    'The Last Mapmaker',
    'Eli North',
    'In a world that redraws itself every sunrise, one cartographer remembers yesterday.',
    ARRAY['adventure', 'mystery', 'travel'],
    93,
    NULL,
    NULL,
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT (source_url) DO UPDATE SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  description = EXCLUDED.description,
  tags = EXCLUDED.tags,
  total_chapters = EXCLUDED.total_chapters,
  last_scraped_at = EXCLUDED.last_scraped_at,
  updated_at = NOW();
