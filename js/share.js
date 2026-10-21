// Share button: "I pashed the Porsche N times", a rank and compliment for N, and a copy-able share text with a link.
// [from, title, compliment, emoji]. A new rank every 10 kisses: 0, 1-9, then 10, 20 ... 590, and 600+.
const RANKS = [
  [0, 'Playing Hard to Get', 'The Porsche is lonely and keeps checking its phone.', '😏'],
  [1, 'First Date', "Bold. You didn't even buy it dinner first.", '🥰'],
  [10, 'Cheeky Smooch', 'The headlights are blushing. Please be gentle with the paintwork.', '😘'],
  [20, 'Bonnet Flirt', "Nice moves. You're practically sitting on the bonnet of love.", '😉'],
  [30, 'Serious Pasher', 'This is more than a fling. The Porsche is telling its mates.', '😍'],
  [40, 'Hopeless Romantic', "Candles, jazz, dim lights. Subtle as a brick, and it's working.", '🕯️'],
  [50, 'Half-Century Heartthrob', "Fifty kisses in. The car is calling you 'babe' now.", '💘'],
  [60, 'Grille Whisperer', "Whispering sweet nothings into the air intake. It's breathing heavily.", '💞'],
  [70, 'Wing Mirror Charmer', 'Even the mirrors are checking you out. Though that is their whole job.', '🪞'],
  [80, 'Pit Lane Pasher', 'Quick, efficient, no tyre-kicking. A true professional.', '🏁'],
  [90, 'Lipstick Lover', 'Ninety kisses, zero regrets. Several smudges.', '💄'],
  [100, 'Century Smoocher', 'Triple digits. Legally, you now owe it a ring.', '💯'],
  [110, 'Spoiler Alert', 'Spoiler alert: the Porsche is into you too.', '🔥'],
  [120, 'Dashboard Dreamer', "You've already named your first child after the car, haven't you?", '🌹'],
  [130, 'Turbo Lips', 'Zero to smitten in 3.2 seconds. Slow down, tiger.', '🌀'],
  [140, 'Horsepower Hero', 'All that puckering is worth roughly 400 horsepower.', '⚡'],
  [150, 'Showroom Sweetheart', "You've been in the showroom so long they've offered you a job.", '✨'],
  [160, 'Paint-Job Poet', "Roses are red, so's the lipstick on the door. Please stop. (Don't.)", '🖌️'],
  [170, 'Rev-Up Romantic', 'Your heart is revving so hard the neighbours are complaining.', '🎶'],
  [180, 'Chassis Charmer', "Smooth operator. The car can't believe its luck.", '🧲'],
  [190, 'Smooch Specialist', 'Precision pashing. The panel gaps give you ten out of ten.', '🎯'],
  [200, 'Double Century Darling', 'Two hundred! The driveway has never seen so much public affection.', '🏆'],
  [210, "Detailer's Nightmare", 'A detailer cries a little every time you click.', '🧽'],
  [220, 'Grand Tourer of Love', 'Long-distance love, no pit stops, definitely no chaperone.', '🛣️'],
  [230, 'Carbon-Fibre Cuddler', 'Light, strong and extremely clingy.', '🖤'],
  [240, 'Lap Record Lover', 'A personal best every single time. Your ex would be furious.', '⏱️'],
  [250, 'Quarter-Thousand Casanova', 'A quarter of a thousand. The Porsche has stopped pretending to play it cool.', '👑'],
  [260, 'Burnout Sweetheart', 'Smoky, steamy, and the tyres are wondering what is going on.', '🚦'],
  [270, 'Autobahn Adorer', "No speed limit on this love. Mind the speed cameras, they're jealous.", '🚀'],
  [280, 'Wheel Whisperer', "You've got the wheel, the keys and, apparently, the car's heart.", '🛞'],
  [290, 'Exhaust Note Enthusiast', 'You hear poetry in the exhaust note. Everyone else hears a very loud car.', '🎼'],
  [300, 'Triple Century Titan', "Three hundred pashes. At this point it's a lifestyle, not a hobby.", '🎉'],
  [310, 'Concours Connoisseur', 'Full marks from the judges for devotion, minus several for personal space.', '🏅'],
  [320, 'Showstopper', "Heads are turning. Mostly the neighbours', and not in a good way.", '🎆'],
  [330, 'Pole Position Pasher', "Always first in line for the next smooch. Mate, there's no queue.", '🥇'],
  [340, 'Heart-on-Sleeve Racer', 'Your feelings are fully loaded and your seatbelt is optional.', '💝'],
  [350, 'Lipstick Legend', 'The paintwork is basically one giant love letter, written in lipstick.', '💋'],
  [360, 'Full-Circle Fanatic', "Three hundred and sixty. You've gone all the way round. Twice, probably.", '🔄'],
  [370, 'Pash-ion Icon', "It's art. Slightly sticky, extremely unhinged, but art.", '🎨'],
  [380, 'Love Valet', "You park here every day, don't you? The car has started telling its mum.", '🅿️'],
  [390, 'Gloss Guru', 'Every inch of panel gets the royal smooch treatment. Even the awkward bits.', '🧴'],
  [400, 'Four-Hundred Club', 'Welcome to the exclusive club. Membership: you and one very smug Porsche.', '🍾'],
  [410, 'Flat-Six Sweetheart', 'Six cylinders, one big heart, and an engine that will not stop blushing.', '💓'],
  [420, 'Cruise Control Casanova', 'Smooth, steady, effortlessly charming. Slightly smudgy around the edges.', '😎'],
  [430, 'Panel-Gap Perfectionist', "You've kissed every last gap and crevice. Frankly, that's intense.", '📐'],
  [440, 'Hairpin Heartthrob', 'Tight, twisty and a bit dizzying. Just like your love life.', '🏔️'],
  [450, 'Smooch Strategist', 'A masterclass in planned affection. Or a restraining order. Probably affection.', '🧠'],
  [460, 'Overdrive Obsessive', 'You found a gear nobody knew existed. The car is flattered and alarmed.', '⚙️'],
  [470, 'Chrome-Hearted', 'Shiny on the outside, mushy on the inside, and absolutely covered in lipstick.', '🪩'],
  [480, 'Glovebox Guardian', 'You know its secrets, its PIN and its favourite song.', '🗝️'],
  [490, 'Almost Legend', 'Ten to go. The Porsche is already picking an outfit.', '⭐'],
  [500, 'Five-Hundred Phenomenon', 'Five hundred kisses. Someone should check your lips for a warranty.', '🌟'],
  [510, 'Hall-of-Fame Hugger', 'Your name is now etched into the driveway. The council has questions.', '🏛️'],
  [520, 'Marathon Smoocher', 'You went the whole distance, then asked for extra time.', '🏃'],
  [530, 'Hypercar Heartthrob', "You've left normal human affection in the dust. Have a sit-down and some water.", '🛸'],
  [540, 'Dreamboat Driver', "Honestly? The Porsche is the lucky one. It knows. It's insufferable about it.", '🛥️'],
  [550, 'Smitten Supercharger', 'Boost pressure: dangerously high. Blood pressure: same.', '🔌'],
  [560, 'Unstoppable Romantic', 'Nothing gets between you and this car. Not even decency.', '🌈'],
  [570, 'Lip-Lock Laureate', 'A lifetime achievement award in smooching. Your lips would like a word with HR.', '📜'],
  [580, 'Grand Marshal of Love', 'You lead the parade. The parade is just you and one very flustered Porsche.', '🚩'],
  [590, 'Nearly There', 'Ten more and you hit the top. The Porsche has already ordered flowers.', '🔔'],
  [600, 'Pash Deity', 'Six hundred and beyond. The car has built a small shrine and is being weird about it.', '🌠'],
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
