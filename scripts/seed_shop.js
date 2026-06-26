// Seed shop_items in Supabase
// Usage: $env:SUPABASE_SERVICE_KEY="your_key"; node seed_shop.js

const PROJECT_REF = 'csfahjeisguleoaekmgc';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ Set SUPABASE_SERVICE_KEY first.');
  process.exit(1);
}

const SQL = `
-- Clear existing items (optional; remove if you want to accumulate)
DELETE FROM shop_items WHERE true;

INSERT INTO shop_items (name, type, rarity, price_coins, asset_path, is_limited) VALUES
  -- Icons (equippable avatar icons)
  ('Aegis Guard',      'icon', 'common',    150, null, false),
  ('Gilded Crest',     'icon', 'rare',      450, null, false),
  ('Ember Spirit',     'icon', 'rare',      800, null, false),
  ('Sylvan Badge',     'icon', 'common',    300, null, false),
  ('Crystal Heart',    'icon', 'epic',     1200, null, false),
  ('Storm Charge',     'icon', 'epic',      650, null, false),
  ('Void Vortex',      'icon', 'epic',      900, null, false),
  ('Wraith Visage',    'icon', 'legendary', 2500, null, false),
  ('Chaos Dice',       'icon', 'legendary', 1800, null, false),
  ('Starfall Aura',    'icon', 'legendary', 3000, null, false),

  -- Titles (displayed under username)
  ('The Relentless',   'title', 'common',   200, null, false),
  ('Seeker of Truth',  'title', 'rare',     500, null, false),
  ('Ember Warden',     'title', 'rare',     750, null, false),
  ('Iron Sentinel',    'title', 'epic',    1000, null, false),
  ('Arcane Dreamer',   'title', 'epic',    1500, null, false),
  ('Crown of Kings',   'title', 'legendary',2000, null, false),
  ('Chaos Incarnate',  'title', 'legendary',3500, null, true),

  -- Themes (profile background)
  ('Cosmic Aura',      'theme', 'common',   200, null, false),
  ('Sunset Backdrop',  'theme', 'rare',     500, null, false),
  ('Frost Citadel',    'theme', 'rare',     600, null, false),
  ('Shadow Realm',     'theme', 'epic',    1100, null, false),
  ('Starfield Deep',   'theme', 'epic',    1200, null, false),
  ('Aether Vault',     'theme', 'legendary',2200, null, false),
  ('Inferno Palace',   'theme', 'legendary',2800, null, true);
`;

async function seed() {
  console.log('🌱 Seeding shop_items on project:', PROJECT_REF);
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL }),
  });

  const body = await res.text();
  if (res.ok) {
    console.log('✅ Shop items seeded!');
    console.log('   24 items inserted (10 icons, 7 titles, 7 themes).');
  } else {
    console.error('❌ Seeding failed:', res.status, body);
    console.error('\n👉 Run the SQL manually at:');
    console.error('   https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
    console.log('\nSQL to paste:\n', SQL);
  }
}

seed();
