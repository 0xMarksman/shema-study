// Builds the 365-day reading schedule (four parallel tracks) as data/schedule.json.
// Track A: Tanakh narrative/prophetic/wisdom books (Torah, Nevi'im, Ketuvim) minus Psalms & Proverbs
// Track B: Psalms (cycles ~2.4x through the year)
// Track C: Proverbs (cycles ~11.8x through the year, tracking day-of-month tradition)
// Track D: B'rit Chadashah / New Covenant Scriptures (once through + partial re-read of Matthew-Acts)
//
// Chapter counts follow standard versification, EXCEPT Joel (4 ch.) and Malachi (3 ch.),
// where the TLV follows the traditional Hebrew/Jewish chapter division rather than the
// English chapter division (English Joel 2:28-3:21 = Hebrew/TLV Joel 3:1-4:21; English
// Malachi 4 = Hebrew/TLV Malachi 3:19-24).

const fs = require('fs');

const trackA = [
  ['Genesis', 50], ['Exodus', 40], ['Leviticus', 27], ['Numbers', 36], ['Deuteronomy', 34],
  ['Joshua', 24], ['Judges', 21], ['1 Samuel', 31], ['2 Samuel', 24], ['1 Kings', 22], ['2 Kings', 25],
  ['Isaiah', 66], ['Jeremiah', 52], ['Ezekiel', 48],
  ['Hosea', 14], ['Joel', 4], ['Amos', 9], ['Obadiah', 1], ['Jonah', 4], ['Micah', 7],
  ['Nahum', 3], ['Habakkuk', 3], ['Zephaniah', 3], ['Haggai', 2], ['Zechariah', 14], ['Malachi', 3],
  ['Job', 42], ['Song of Songs', 8], ['Ruth', 4], ['Lamentations', 5], ['Ecclesiastes', 12],
  ['Esther', 10], ['Daniel', 12], ['Ezra', 10], ['Nehemiah', 13], ['1 Chronicles', 29], ['2 Chronicles', 36],
];

const trackD = [
  ['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21], ['Acts', 28],
  ['Romans', 16], ['1 Corinthians', 16], ['2 Corinthians', 13], ['Galatians', 6], ['Ephesians', 6],
  ['Philippians', 4], ['Colossians', 4], ['1 Thessalonians', 5], ['2 Thessalonians', 3],
  ['1 Timothy', 6], ['2 Timothy', 4], ['Titus', 3], ['Philemon', 1],
  ['Messianic Jews (Hebrews)', 13], ['James (Ya’akov)', 5],
  ['1 Peter (Kefa)', 5], ['2 Peter (Kefa)', 3],
  ['1 John (Yochanan)', 5], ['2 John (Yochanan)', 1], ['3 John (Yochanan)', 1],
  ['Jude (Yehudah)', 1], ['Revelation', 22],
];

function flatten(books) {
  const out = [];
  for (const [name, chapters] of books) {
    for (let c = 1; c <= chapters; c++) out.push({ book: name, chapter: c });
  }
  return out;
}

const flatA = flatten(trackA); // length 748
const flatD = flatten(trackD); // length 260
const PSALMS = 150;
const PROVERBS = 31;

const DAYS = 365;

// Even distribution of flatA (748 items) across 365 days -> mostly 2/day, some 3/day.
function evenCounts(total, days) {
  const counts = [];
  let prevCum = 0;
  for (let d = 1; d <= days; d++) {
    const cum = Math.floor((d * total) / days);
    counts.push(cum - prevCum);
    prevCum = cum;
  }
  return counts;
}

const countsA = evenCounts(flatA.length, DAYS);

function refString(items) {
  // items: array of {book, chapter} possibly spanning multiple books, in order.
  const groups = [];
  for (const it of items) {
    const last = groups[groups.length - 1];
    if (last && last.book === it.book && it.chapter === last.end + 1) {
      last.end = it.chapter;
    } else {
      groups.push({ book: it.book, start: it.chapter, end: it.chapter });
    }
  }
  return groups
    .map((g) => (g.start === g.end ? `${g.book} ${g.start}` : `${g.book} ${g.start}-${g.end}`))
    .join('; ');
}

const schedule = [];
let idxA = 0;
for (let day = 1; day <= DAYS; day++) {
  const n = countsA[day - 1];
  const chunkA = flatA.slice(idxA, idxA + n);
  idxA += n;

  const psalmChapter = ((day - 1) % PSALMS) + 1;
  const proverbsChapter = ((day - 1) % PROVERBS) + 1;
  const dItem = flatD[(day - 1) % flatD.length];

  schedule.push({
    day,
    tanakh: refString(chunkA),
    psalm: `Psalm ${psalmChapter}`,
    proverbs: `Proverbs ${proverbsChapter}`,
    brit_chadashah: `${dItem.book} ${dItem.chapter}`,
  });
}

fs.writeFileSync(
  __dirname + '/../data/schedule.json',
  JSON.stringify(schedule, null, 2)
);

// Sanity checks
console.log('Total days:', schedule.length);
console.log('trackA chapters used:', idxA, '(expect', flatA.length, ')');
console.log('First day:', JSON.stringify(schedule[0]));
console.log('Last day:', JSON.stringify(schedule[364]));
console.log('Day 260 (BC completes 1st pass):', JSON.stringify(schedule[259]));
console.log('Day 261 (BC restarts):', JSON.stringify(schedule[260]));
