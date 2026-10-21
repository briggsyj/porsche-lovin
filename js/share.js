// Share button: "I pashed the Porsche N times", a rank and compliment for N, and a copy-able share text with a link.
// [from, title, compliment, emoji]. A new rank every 10 kisses: 0, 1-9, then 10, 20 ... 590, and 600+.
const RANKS = [
  [0, 'Playing Hard to Get', 'The Porsche has waxed, polished and sucked in its tummy. Please, make a move.', '😏'],
  [1, 'First Date', "Bold. You didn't even buy it dinner first. It drinks premium unleaded, by the way.", '🥰'],
  [10, 'Cheeky Smooch', 'Ten kisses. The headlights are blushing and nobody is mentioning the hazard lights.', '😘'],
  [20, 'Bonnet Flirt', "Twenty kisses and you're already popping the bonnet. Steady on, we haven't checked the oil.", '😉'],
  [30, 'Serious Pasher', 'Thirty. The Porsche has told its mates, changed its relationship status and deleted its dating app.', '😍'],
  [40, 'Hopeless Romantic', "Candles, jazz, dim lights. You've set the mood so hard the airbags are tingling.", '🕯️'],
  [50, 'Half-Century Heartthrob', "Fifty kisses. It's saved your number as 'Babe (Do Not Detail)'.", '💘'],
  [60, 'Grille Whisperer', "Whispering sweet nothings into the air intake. It's breathing heavily, and not from the turbo.", '💞'],
  [70, 'Wing Mirror Charmer', 'Objects in the mirror are hotter than they appear. The mirrors are checking you out. Again.', '🪞'],
  [80, 'Pit Lane Pasher', 'Quick in, quick out, and not one complaint about stamina. Pit crews, take notes.', '🏁'],
  [90, 'Lipstick Lover', "Ninety kisses. That bonnet's got more lipstick than a hen's night in Surfers Paradise.", '💄'],
  [100, 'Century Smoocher', 'Triple digits. Legally you owe it a ring, half the driveway and an awkward chat with the Cayman.', '💯'],
  [110, 'Spoiler Alert', "Spoiler alert: it's into you. It's also into rear spoilers, but that's a conversation for later.", '🔥'],
  [120, 'Dashboard Dreamer', "You've already named your first child 'Carrera' and picked the nursery colour. It's Guards Red.", '🌹'],
  [130, 'Turbo Lips', 'Zero to smitten in 3.2 seconds. Slow down, tiger. Even the airbags need a minute.', '🌀'],
  [140, 'Horsepower Hero', 'Puckering at roughly 400 horsepower. Please check your lips for a licence and a limiter.', '⚡'],
  [150, 'Showroom Sweetheart', "You've been in the showroom so long they've offered you commission. And a chair.", '✨'],
  [160, 'Paint-Job Poet', "Roses are red, so's the lipstick on the door. Please stop. (Please, God, don't.)", '🖌️'],
  [170, 'Rev-Up Romantic', "Revving hard in the driveway at 2am. The neighbours know exactly what's happening.", '🎶'],
  [180, 'Chassis Charmer', 'Smooth operator. The suspension just gave way, along with its standards and its warranty.', '🧲'],
  [190, 'Smooch Specialist', "Precision pashing. The panel gaps give you ten out of ten and ask if you're free Thursday.", '🎯'],
  [200, 'Double Century Darling', 'Two hundred! The magpies are scandalised, the neighbours stopped waving and the Porsche is smoking.', '🏆'],
  [210, "Detailer's Nightmare", "A detailer weeps quietly every time you click. They've seen the lipstick and they have questions.", '🧽'],
  [220, 'Grand Tourer of Love', 'Long-distance love, no pit stops, no chaperone. Dads everywhere are furious.', '🛣️'],
  [230, 'Carbon-Fibre Cuddler', "Light, strong and extremely clingy. Let go of the wing mirror, it's getting weird.", '🖤'],
  [240, 'Lap Record Lover', 'A personal best every single time. Your ex heard and has taken up kayaking out of spite.', '⏱️'],
  [250, 'Quarter-Thousand Casanova', 'A quarter of a thousand. The Porsche has stopped playing it cool and left the doors unlocked.', '👑'],
  [260, 'Burnout Sweetheart', 'Smoky, steamy, tyres screaming. The fire brigade has arrived and is staying for coffee.', '🚦'],
  [270, 'Autobahn Adorer', 'No speed limit on this love. The speed cameras are single and have never been so jealous.', '🚀'],
  [280, 'Wheel Whisperer', "You've got the wheel, the keys and apparently the car's heart. Hand over your licence and dignity.", '🛞'],
  [290, 'Exhaust Note Enthusiast', 'You hear poetry in the exhaust note. Everyone else hears a very loud car and a very odd person.', '🎼'],
  [300, 'Triple Century Titan', "Three hundred. It's a lifestyle. The Porsche has a drawer at yours and a toothbrush in the glovebox.", '🎉'],
  [310, 'Concours Connoisseur', 'Full marks for devotion, minus several for personal space, and a point off for the noises.', '🏅'],
  [320, 'Showstopper', "Heads are turning. The neighbours' mostly, and they are not in favour.", '🎆'],
  [330, 'Pole Position Pasher', "First in line for the next smooch. Mate, there's no queue. It's you and a Porsche. It's weird.", '🥇'],
  [340, 'Heart-on-Sleeve Racer', 'Your feelings are fully loaded and your seatbelt is optional. Kinky, but road-legal.', '💝'],
  [350, 'Lipstick Legend', 'The paintwork is one giant love letter, written in lipstick, poor decisions and mild trespassing.', '💋'],
  [360, 'Full-Circle Fanatic', 'Three hundred and sixty. All the way round, then another go for the bits you missed. Thorough.', '🔄'],
  [370, 'Pash-ion Icon', "It's art. Slightly sticky, extremely unhinged, but undeniably art. Banksy would be jealous.", '🎨'],
  [380, 'Love Valet', "You park here every day, don't you? The car has started telling its mum about you. She is not pleased.", '🅿️'],
  [390, 'Gloss Guru', 'Every inch of panel gets the royal smooch. Even the awkward bits. Especially the awkward bits.', '🧴'],
  [400, 'Four-Hundred Club', 'Welcome to the exclusive club. Membership: you and one extremely smug Porsche wearing a hickey.', '🍾'],
  [410, 'Flat-Six Sweetheart', 'Six cylinders, one big heart and a boxer engine blushing right behind your seat. Mid-engine, mid-crisis.', '💓'],
  [420, 'Cruise Control Casanova', "Smooth, steady, effortlessly charming. Slightly smudgy. Not the first time you've left your mark.", '😎'],
  [430, 'Panel-Gap Perfectionist', "You've kissed every last gap and crevice. It's intense. It's thorough. The car needs a minute.", '📐'],
  [440, 'Hairpin Heartthrob', 'Tight, twisty and a bit dizzying. Much like your love life, but with better handling.', '🏔️'],
  [450, 'Smooch Strategist', 'A masterclass in planned affection. Or a restraining order. The car is consulting a lawyer.', '🧠'],
  [460, 'Overdrive Obsessive', 'You found a gear nobody knew existed. The car is flattered, alarmed and has follow-up questions.', '⚙️'],
  [470, 'Chrome-Hearted', 'Shiny on the outside, mushy on the inside, and absolutely covered in lipstick. Relatable.', '🪩'],
  [480, 'Glovebox Guardian', "You know its secrets, its PIN and its favourite song. Honestly, you know too much. It's considering moving.", '🗝️'],
  [490, 'Almost Legend', 'Ten to go. The Porsche is already trying on outfits, hiding evidence and rehearsing its speech.', '⭐'],
  [500, 'Five-Hundred Phenomenon', 'Five hundred kisses. Your lips have a warranty claim and the Porsche has a cracking story for the pub.', '🌟'],
  [510, 'Hall-of-Fame Hugger', 'Your name is etched into the driveway. The council has questions, a clipboard and a strongly worded letter.', '🏛️'],
  [520, 'Marathon Smoocher', 'You went the whole distance, then asked for extra time. The car needs a lie-down and a cigarette.', '🏃'],
  [530, 'Hypercar Heartthrob', "You've left normal affection in the dust. Have a sit-down, a glass of water and a word with yourself.", '🛸'],
  [540, 'Dreamboat Driver', "Honestly? The Porsche is the lucky one. It knows. It's insufferable about it at car meets.", '🛥️'],
  [550, 'Smitten Supercharger', 'Boost pressure: dangerously high. Blood pressure: same. Please remain seated and stop touching it.', '🔌'],
  [560, 'Unstoppable Romantic', 'Nothing gets between you and this car. Not decency, not dignity, not even the handbrake.', '🌈'],
  [570, 'Lip-Lock Laureate', 'Lifetime achievement in smooching. Your lips would like a word with HR, and possibly a physio.', '📜'],
  [580, 'Grand Marshal of Love', "You lead the parade. The parade is just you and one very flustered Porsche. There's no band.", '🚩'],
  [590, 'Nearly There', 'Ten more and you hit the top. The Porsche has ordered flowers and bought a lock for the garage.', '🔔'],
  [600, 'Pash Deity', 'Six hundred and beyond. The car has built a small shrine to you and is being weird about it.', '🌠'],
].map(([min, title, compliment, emoji]) => ({ min, title, compliment, emoji }));

export function rankFor(count) {
  let rank = RANKS[0];
  for (const r of RANKS) if (count >= r.min) rank = r;
  return rank;
}

export function shareText(count, url) {
  const r = rankFor(count);
  return `I pashed the Porsche ${count} ${count === 1 ? 'time' : 'times'}! 💋🏎️\n${r.emoji} ${r.title}: ${r.compliment}\nGo on, pash it yourself ➡️ ${url}`;
}

// The link carries ?pw=g so the page loads for whoever opens it.
const pageUrl = () => `${location.origin}${location.pathname}?pw=g`;

export function createShare({ getCount }) {
  const root = document.getElementById('share');
  const status = root.querySelector('.share-status');
  const els = { n: root.querySelector('#share-n'), unit: root.querySelector('#share-unit'), rank: root.querySelector('#share-rank'), compliment: root.querySelector('#share-compliment') };
  let statusTimer = 0, shown = -1;

  // The panel is always visible, so the count follows the kisses as they're placed.
  function render() {
    const count = getCount();
    if (count === shown) return;
    shown = count;
    const r = rankFor(count);
    els.n.textContent = String(count);
    els.unit.textContent = count === 1 ? 'time' : 'times';
    els.rank.textContent = r.title;
    els.compliment.textContent = r.compliment;
  }

  // "Copy & share": always copies the text; where the browser has a share sheet (phones, some desktops) it opens that too.
  async function copyAndShare() {
    const text = shareText(getCount(), pageUrl());
    const copied = copyText(text); // started right away so the click's permission covers both calls
    if (navigator.share) navigator.share({ text }).catch(() => {}); // dismissing the sheet is not an error
    const ok = await copied;
    status.textContent = ok ? 'Copied! Go paste it somewhere.' : 'Could not copy. Select and copy it manually.';
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (status.textContent = ''), 2500);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through to the older way */ }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }

  root.querySelector('.share-copy').addEventListener('click', copyAndShare);
  // Touching the panel shouldn't move or pulse the cursor-following person.
  root.addEventListener('pointerdown', (e) => e.stopPropagation());
  render();
  setInterval(render, 200);
  return { shareText: () => shareText(getCount(), pageUrl()) };
}
