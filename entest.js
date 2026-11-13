// المجتهد — بنك أسئلة اختبار المستوى في الإنجليزي (الصف الأول حتى التاسع)
// مبني على وحدات كتب English for Libya: الحروف والأصوات (1–3)، المفردات، القواعد، القراءة والفهم.
// d = الصف الذي تُدرَّس فيه المهارة تقريباً. الاختبار يختار من مستويات قريبة من صف الطالب ويتدرّج من السهل إلى الأصعب.

export const SKILLS = {
  abc: ['🔤', 'الحروف والأصوات'],
  voc: ['🖼️', 'المفردات'],
  gr: ['📝', 'القواعد'],
  rd: ['📖', 'القراءة والفهم'],
  mix: ['🌟', 'اختبار شامل'],
};
export const skillsFor = g => g <= 1 ? ['abc', 'voc', 'mix'] : g <= 3 ? ['abc', 'voc', 'gr', 'mix'] : ['voc', 'gr', 'rd', 'mix'];

const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuf = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---------------- المفردات: [رمز, الكلمة, المعنى, الصف, المجموعة] ---------------- */
const V = [
  // الصف 1: حروف الكتاب وكلماتها، الألوان، الأرقام، الجسم
  ['🍎', 'apple', 'تفاحة', 1, 'food'], ['🍊', 'orange', 'برتقالة', 1, 'food'], ['🍋', 'lemon', 'ليمونة', 1, 'food'], ['🍅', 'tomato', 'طماطم', 1, 'food'], ['🫒', 'olive', 'زيتون', 1, 'food'], ['🥚', 'egg', 'بيضة', 1, 'food'], ['🧀', 'cheese', 'جبن', 1, 'food'],
  ['🐱', 'cat', 'قطة', 1, 'animal'], ['🐰', 'rabbit', 'أرنب', 1, 'animal'], ['🦁', 'lion', 'أسد', 1, 'animal'], ['🦓', 'zebra', 'حمار وحشي', 1, 'animal'], ['🐔', 'chicken', 'دجاجة', 1, 'animal'], ['🐝', 'bee', 'نحلة', 1, 'animal'], ['🐜', 'ant', 'نملة', 1, 'animal'],
  ['🚗', 'car', 'سيارة', 1, 'thing'], ['🔑', 'key', 'مفتاح', 1, 'thing'], ['🪁', 'kite', 'طائرة ورقية', 1, 'thing'], ['☂️', 'umbrella', 'مظلة', 1, 'thing'], ['🚕', 'taxi', 'سيارة أجرة', 1, 'thing'], ['⌚', 'watch', 'ساعة يد', 1, 'thing'], ['🎻', 'violin', 'كمان', 1, 'thing'], ['👑', 'king', 'ملك', 1, 'thing'], ['💍', 'ring', 'خاتم', 1, 'thing'], ['📖', 'book', 'كتاب', 1, 'thing'], ['🥄', 'spoon', 'ملعقة', 1, 'thing'], ['🚂', 'train', 'قطار', 1, 'thing'], ['⛵', 'boat', 'قارب', 1, 'thing'], ['🧥', 'coat', 'معطف', 1, 'thing'], ['🌳', 'tree', 'شجرة', 1, 'thing'],
  ['✋', 'hand', 'يد', 1, 'body'], ['👁️', 'eye', 'عين', 1, 'body'], ['👃', 'nose', 'أنف', 1, 'body'], ['👂', 'ear', 'أذن', 1, 'body'], ['🦶', 'foot', 'قدم', 1, 'body'], ['💪', 'arm', 'ذراع', 1, 'body'],
  ['🔴', 'red', 'أحمر', 1, 'colour'], ['🔵', 'blue', 'أزرق', 1, 'colour'], ['🟢', 'green', 'أخضر', 1, 'colour'], ['🟡', 'yellow', 'أصفر', 1, 'colour'], ['⚫', 'black', 'أسود', 1, 'colour'], ['⚪', 'white', 'أبيض', 1, 'colour'], ['🟣', 'purple', 'بنفسجي', 2, 'colour'], ['🟤', 'brown', 'بني', 2, 'colour'],
  // الصف 2: الأسرة، الفصل، البيت، الطعام
  ['👩', 'mother', 'أم', 2, 'family'], ['👨', 'father', 'أب', 2, 'family'], ['👦', 'brother', 'أخ', 2, 'family'], ['👧', 'sister', 'أخت', 2, 'family'], ['👶', 'baby', 'رضيع', 2, 'family'], ['👵', 'grandmother', 'جدة', 2, 'family'], ['👴', 'grandfather', 'جد', 2, 'family'],
  ['✏️', 'pencil', 'قلم رصاص', 2, 'school'], ['📏', 'ruler', 'مسطرة', 2, 'school'], ['🎒', 'bag', 'حقيبة', 2, 'school'], ['🪑', 'chair', 'كرسي', 2, 'school'], ['✂️', 'scissors', 'مقص', 2, 'school'], ['🖍️', 'crayon', 'قلم تلوين', 2, 'school'],
  ['🛏️', 'bed', 'سرير', 2, 'home'], ['🛋️', 'sofa', 'أريكة', 2, 'home'], ['🚪', 'door', 'باب', 2, 'home'], ['🪟', 'window', 'نافذة', 2, 'home'], ['💡', 'light', 'مصباح', 2, 'home'], ['🛁', 'bath', 'حوض استحمام', 2, 'home'],
  ['🍚', 'rice', 'أرز', 2, 'food'], ['🍞', 'bread', 'خبز', 2, 'food'], ['🥛', 'milk', 'حليب', 2, 'food'], ['🍌', 'banana', 'موزة', 2, 'food'], ['🍰', 'cake', 'كعكة', 2, 'food'], ['🐒', 'monkey', 'قرد', 2, 'animal'], ['🐟', 'fish', 'سمكة', 2, 'animal'], ['🐦', 'bird', 'طائر', 2, 'animal'],
  // الصف 3–4: الحيوانات، الطعام، الأماكن، الأفعال
  ['🐘', 'elephant', 'فيل', 3, 'animal'], ['🦒', 'giraffe', 'زرافة', 3, 'animal'], ['🐪', 'camel', 'جمل', 3, 'animal'], ['🐍', 'snake', 'ثعبان', 3, 'animal'], ['🐢', 'turtle', 'سلحفاة', 3, 'animal'], ['🐴', 'horse', 'حصان', 3, 'animal'],
  ['🥕', 'carrot', 'جزرة', 3, 'food'], ['🍇', 'grapes', 'عنب', 3, 'food'], ['🧃', 'juice', 'عصير', 3, 'food'], ['🍦', 'ice cream', 'مثلجات', 3, 'food'], ['🍕', 'pizza', 'بيتزا', 3, 'food'], ['🥗', 'salad', 'سلطة', 4, 'food'],
  ['🏫', 'school', 'مدرسة', 3, 'place'], ['🏥', 'hospital', 'مستشفى', 4, 'place'], ['🏪', 'shop', 'متجر', 3, 'place'], ['🏞️', 'park', 'حديقة عامة', 3, 'place'], ['🕌', 'mosque', 'مسجد', 3, 'place'], ['🏖️', 'beach', 'شاطئ', 4, 'place'], ['🛒', 'supermarket', 'سوبرماركت', 3, 'place'],
  ['🏊', 'swim', 'يسبح', 3, 'action'], ['🏃', 'run', 'يجري', 3, 'action'], ['🚴', 'ride a bike', 'يركب دراجة', 3, 'action'], ['⚽', 'play football', 'يلعب كرة القدم', 3, 'action'], ['✍️', 'write', 'يكتب', 3, 'action'], ['🧗', 'climb', 'يتسلق', 4, 'action'], ['🎨', 'draw', 'يرسم', 3, 'action'],
  // الصف 5: الطقس، الرياضة، المواصلات، المدينة
  ['☀️', 'sunny', 'مشمس', 5, 'weather'], ['🌧️', 'rainy', 'ممطر', 5, 'weather'], ['❄️', 'snowy', 'مثلج', 5, 'weather'], ['💨', 'windy', 'عاصف', 5, 'weather'], ['☁️', 'cloudy', 'غائم', 5, 'weather'],
  ['🏀', 'basketball', 'كرة السلة', 5, 'sport'], ['🎾', 'tennis', 'التنس', 5, 'sport'], ['🏐', 'volleyball', 'الكرة الطائرة', 5, 'sport'], ['🥋', 'karate', 'الكاراتيه', 5, 'sport'],
  ['✈️', 'plane', 'طائرة', 5, 'transport'], ['🚌', 'bus', 'حافلة', 4, 'transport'], ['🚲', 'bicycle', 'دراجة', 5, 'transport'], ['🚢', 'ship', 'سفينة', 5, 'transport'],
  ['🏦', 'bank', 'مصرف', 5, 'place'], ['🏨', 'hotel', 'فندق', 5, 'place'], ['🏛️', 'museum', 'متحف', 5, 'place'], ['🛫', 'airport', 'مطار', 5, 'place'], ['🍽️', 'restaurant', 'مطعم', 5, 'place'],
  // الصف 6: المهن، المشاعر، المواد
  ['👨‍⚕️', 'doctor', 'طبيب', 6, 'job'], ['👩‍🏫', 'teacher', 'معلمة', 6, 'job'], ['👨‍🍳', 'cook', 'طاهٍ', 6, 'job'], ['👨‍🌾', 'farmer', 'مزارع', 6, 'job'], ['👷', 'builder', 'عامل بناء', 6, 'job'], ['🧑‍✈️', 'pilot', 'طيار', 6, 'job'], ['👮', 'police officer', 'شرطي', 6, 'job'],
  ['😀', 'happy', 'سعيد', 6, 'feel'], ['😢', 'sad', 'حزين', 6, 'feel'], ['😴', 'tired', 'متعب', 6, 'feel'], ['😠', 'angry', 'غاضب', 6, 'feel'], ['🤒', 'ill', 'مريض', 6, 'feel'],
  // الصف 7: الاختراعات، الطبيعة، الصحة
  ['📱', 'mobile phone', 'هاتف محمول', 7, 'invent'], ['💻', 'computer', 'حاسوب', 7, 'invent'], ['📺', 'television', 'تلفاز', 7, 'invent'], ['📷', 'camera', 'آلة تصوير', 7, 'invent'], ['🔦', 'torch', 'مصباح يدوي', 7, 'invent'],
  ['🌋', 'volcano', 'بركان', 7, 'nature'], ['🏜️', 'desert', 'صحراء', 7, 'nature'], ['⛰️', 'mountain', 'جبل', 7, 'nature'], ['🌲', 'forest', 'غابة', 7, 'nature'], ['🌊', 'wave', 'موجة', 7, 'nature'],
  ['🤕', 'headache', 'صداع', 7, 'health'], ['🦷', 'toothache', 'ألم أسنان', 7, 'health'], ['🤧', 'a cold', 'زكام', 7, 'health'],
  // الصف 8–9: التواصل والإعلام، البيئة، الوظائف
  ['📰', 'newspaper', 'جريدة', 8, 'media'], ['📻', 'radio', 'مذياع', 8, 'media'], ['✉️', 'letter', 'رسالة', 8, 'media'], ['🎤', 'interview', 'مقابلة', 8, 'media'],
  ['👨‍🚒', 'firefighter', 'رجل إطفاء', 8, 'job'], ['👩‍🔬', 'scientist', 'عالمة', 8, 'job'], ['👨‍⚖️', 'judge', 'قاضٍ', 9, 'job'], ['👩‍💻', 'programmer', 'مبرمجة', 9, 'job'], ['🧑‍🔧', 'mechanic', 'ميكانيكي', 8, 'job'],
  ['🗑️', 'rubbish', 'قمامة', 8, 'env'], ['♻️', 'recycle', 'يعيد التدوير', 8, 'env'], ['🏭', 'factory', 'مصنع', 8, 'env'], ['🐼', 'panda', 'باندا', 8, 'env'], ['🕷️', 'spider', 'عنكبوت', 9, 'env'],
  ['🎬', 'film', 'فيلم', 9, 'media'], ['🏆', 'trophy', 'كأس', 9, 'media'], ['🛍️', 'customer', 'زبون', 9, 'shop'], ['🧾', 'receipt', 'إيصال', 9, 'shop'],
];

function vocItem(w, g) {
  const [e, en, ar, d, grp] = w;
  const near = V.filter(x => x !== w && Math.abs(x[3] - d) <= 2 && x[1] !== en);
  const same = near.filter(x => x[4] === grp);
  const pool = shuf(same.length >= 3 ? same : near).slice(0, 3);
  const kind = g <= 3 ? (Math.random() < .75 ? 'pic' : 'w2pic') : pick(['pic', 'ar2en', 'en2ar']);
  if (kind === 'pic') return { k: 'voc', d, tag: 'كلمات: ' + GRP[grp], q: 'ما اسم هذا بالإنجليزية؟', big: e, say: null, opts: shuf([en, ...pool.map(x => x[1])]), a: en, en: true };
  if (kind === 'w2pic') return { k: 'voc', d, tag: 'كلمات: ' + GRP[grp], q: 'اختر صورة الكلمة:', big: en, bigEn: true, say: en, opts: shuf([e, ...pool.map(x => x[0])]), a: e, emo: true };
  if (kind === 'ar2en') return { k: 'voc', d, tag: 'كلمات: ' + GRP[grp], q: 'كلمة «' + ar + '» بالإنجليزية:', big: e, opts: shuf([en, ...pool.map(x => x[1])]), a: en, en: true };
  return { k: 'voc', d, tag: 'كلمات: ' + GRP[grp], q: 'ما معنى هذه الكلمة؟', big: en, bigEn: true, say: en, opts: shuf([ar, ...pool.map(x => x[2])]), a: ar };
}
const GRP = { food: 'الطعام', animal: 'الحيوانات', thing: 'الأشياء', body: 'الجسم', colour: 'الألوان', family: 'الأسرة', school: 'أدوات الفصل', home: 'البيت', place: 'الأماكن', action: 'الأفعال', weather: 'الطقس', sport: 'الرياضة', transport: 'المواصلات', job: 'المهن', feel: 'المشاعر', invent: 'الاختراعات', nature: 'الطبيعة', health: 'الصحة', media: 'الإعلام والتواصل', env: 'البيئة', shop: 'التسوق' };

/* ---------------- الحروف والأصوات (الصف 1–3) ---------------- */
const ABC = 'abcdefghijklmnopqrstuvwxyz'.split('');
const LNAME = { a: 'ay', b: 'bee', c: 'see', d: 'dee', e: 'ee', f: 'ef', g: 'jee', h: 'aitch', i: 'eye', j: 'jay', k: 'kay', l: 'el', m: 'em', n: 'en', o: 'oh', p: 'pee', q: 'cue', r: 'ar', s: 'ess', t: 'tee', u: 'you', v: 'vee', w: 'double you', x: 'ex', y: 'why', z: 'zed' };
const FIRST = V.filter(x => x[3] <= 2 && /^[a-z]+$/.test(x[1]) && !/^(c|k|g)/.test(x[1]) || ['cat', 'car', 'key', 'kite'].includes(x[1]));
function abcItem(g, lv, canSpeak) {
  const types = ['upper', 'lower', 'next', 'first', 'miss'].concat(canSpeak ? ['hear', 'hear'] : []).concat(g >= 2 ? ['spell', 'miss'] : []);
  let t = pick(types); if (lv === 1 && (t === 'spell' || t === 'miss') && g <= 1) t = 'upper';
  const L = pick(ABC); const others = n => shuf(ABC.filter(x => x !== L)).slice(0, n);
  if (t === 'upper') return { k: 'abc', d: 1, tag: 'الحروف الكبيرة والصغيرة', q: 'ما الحرف الكبير لهذا الحرف؟', big: L, bigEn: true, opts: shuf([L.toUpperCase(), ...others(3).map(x => x.toUpperCase())]), a: L.toUpperCase(), en: true };
  if (t === 'lower') return { k: 'abc', d: 1, tag: 'الحروف الكبيرة والصغيرة', q: 'ما الحرف الصغير لهذا الحرف؟', big: L.toUpperCase(), bigEn: true, opts: shuf([L, ...others(3)]), a: L, en: true };
  if (t === 'hear') return { k: 'abc', d: 1, tag: 'أسماء الحروف', q: '🔊 استمع: أي حرف هذا؟', big: '🔊', say: LNAME[L], opts: shuf([L.toUpperCase() + ' ' + L, ...others(3).map(x => x.toUpperCase() + ' ' + x)]), a: L.toUpperCase() + ' ' + L, en: true };
  if (t === 'next') { const i = R(0, 24); return { k: 'abc', d: 1, tag: 'ترتيب الحروف', q: 'ما الحرف الذي يأتي بعد هذا الحرف؟', big: ABC[i].toUpperCase(), bigEn: true, opts: shuf([ABC[i + 1].toUpperCase(), ...shuf(ABC.filter((x, j) => j !== i + 1 && j !== i)).slice(0, 3).map(x => x.toUpperCase())]), a: ABC[i + 1].toUpperCase(), en: true }; }
  if (t === 'first') { const w = pick(FIRST); const f = w[1][0]; return { k: 'abc', d: 1, tag: 'الصوت الأول في الكلمة', q: 'بأي حرف تبدأ هذه الكلمة؟', big: w[0], say: w[1], opts: shuf([f, ...shuf(ABC.filter(x => x !== f)).slice(0, 3)]), a: f, en: true, sub: w[1] }; }
  const w = pick(V.filter(x => x[3] <= (g >= 2 ? 3 : 1) && /^[a-z]{3,6}$/.test(x[1]))); const i = R(0, w[1].length - 1); const c = w[1][i];
  if (t === 'spell') { const wrong = shuf([w[1].replace(c, c === 'e' ? 'a' : 'e'), w[1].split('').reverse().join(''), w[1].slice(0, -1) + (w[1].slice(-1) === 's' ? 'z' : 's'), w[1][0] + w[1].slice(2)].filter(x => x !== w[1])).slice(0, 3);
    return { k: 'abc', d: 2, tag: 'التهجئة', q: 'اختر الكتابة الصحيحة:', big: w[0], say: w[1], opts: shuf([w[1], ...wrong]), a: w[1], en: true }; }
  return { k: 'abc', d: 2, tag: 'الحرف الناقص', q: 'ما الحرف الناقص؟', big: w[0] + '  ' + w[1].slice(0, i) + '_' + w[1].slice(i + 1), bigEn: true, say: w[1], opts: shuf([c, ...shuf(ABC.filter(x => x !== c)).slice(0, 3)]), a: c, en: true };
}

/* ---------------- القواعد: [الصف, الجملة (___ مكان الفراغ), الصحيح, خيارات خاطئة, الوسم] ---------------- */
const G = [
  [2, 'My name ___ Ali.', 'is', ['am', 'are', 'be'], 'am / is / are'], [2, 'I ___ a girl.', 'am', ['is', 'are', 'be'], 'am / is / are'], [2, 'How ___ you? — I\'m fine.', 'are', ['is', 'am', 'do'], 'am / is / are'],
  [2, 'This is ___ apple.', 'an', ['a', 'two', 'the a'], 'a / an'], [2, 'It is ___ cat.', 'a', ['an', 'two', 'are'], 'a / an'], [2, 'one book, two ___', 'books', ['book', 'bookes', 'a book'], 'الجمع'],
  [2, '___ is it? — It\'s a pen.', 'What', ['Who', 'Where', 'How'], 'أدوات السؤال'], [2, 'I ___ fruit. 🍎', 'like', ['likes', 'am like', 'liking'], 'المضارع البسيط'], [2, '___ is the monkey? — It\'s in the tree.', 'Where', ['What', 'Who', 'How many'], 'أدوات السؤال'],
  [2, 'How many ___ are there? — Three.', 'lights', ['light', 'a light', 'lightes'], 'الجمع'], [2, 'Monday, Tuesday, ___', 'Wednesday', ['Friday', 'Sunday', 'Saturday'], 'أيام الأسبوع'],
  [2, 'Hello! ___ name is Sara.', 'My', ['I', 'Me', 'Is'], 'ضمائر الملكية'], [2, 'This is my brother. ___ is ten.', 'He', ['She', 'It', 'They'], 'الضمائر'], [2, 'This is my sister. ___ is six.', 'She', ['He', 'It', 'We'], 'الضمائر'],
  [2, 'The pencil is ___ the bag.', 'in', ['on a', 'from', 'at a'], 'حروف الجر'], [2, 'I ___ my hands before I eat.', 'wash', ['washes', 'washing', 'am wash'], 'المضارع البسيط'], [2, 'Do you have any rice? — Yes, we ___.', 'do', ['are', 'is', 'have'], 'الأسئلة بـ Do'],
  [2, 'What colour ___ the apple? — It\'s red.', 'is', ['are', 'am', 'do'], 'am / is / are'], [2, 'I play ___ my friends.', 'with', ['to', 'from', 'of'], 'حروف الجر'],
  [3, 'Can you swim? — Yes, I ___.', 'can', ['do', 'am', 'can\'t'], 'can / can\'t'], [3, 'We ___ go to school on Friday.', 'don\'t', ['doesn\'t', 'aren\'t', 'isn\'t'], 'المضارع البسيط'], [3, 'How much ___ the juice? — One dinar.', 'is', ['are', 'am', 'do'], 'am / is / are'],
  [3, 'Look ___ the big elephant!', 'at', ['on', 'in', 'to'], 'حروف الجر'], [3, 'My friends ___ happy today.', 'are', ['is', 'am', 'be'], 'am / is / are'], [3, '___ old are you? — I\'m nine.', 'How', ['What', 'Where', 'Who'], 'أدوات السؤال'],
  [3, 'We were at the waterfall. It ___ beautiful!', 'was', ['were', 'is', 'are'], 'الماضي was / were'], [3, 'Two ___ and a cat are in the garden.', 'dogs', ['dog', 'doges', 'a dog'], 'الجمع'],
  [3, 'A fish can ___. 🐟', 'swim', ['fly', 'climb', 'run'], 'can / can\'t'], [3, 'I ___ fly. I\'m not a bird.', 'can\'t', ['can', 'am', 'do'], 'can / can\'t'], [3, 'I\'m ___ Libya.', 'from', ['in', 'at', 'of'], 'حروف الجر'],
  [3, '___ are you from? — I\'m from Libya.', 'Where', ['What', 'Who', 'When'], 'أدوات السؤال'], [3, 'There ___ two books on the desk.', 'are', ['is', 'am', 'be'], 'there is / there are'], [3, 'There ___ a cat under the chair.', 'is', ['are', 'am', 'have'], 'there is / there are'],
  [3, 'Do you like milk? — Yes, I ___.', 'do', ['am', 'like', 'does'], 'الأسئلة بـ Do'], [3, 'He ___ a red bike.', 'has', ['have', 'is', 'haves'], 'have / has'], [3, 'Yesterday I ___ at home.', 'was', ['am', 'were', 'is'], 'الماضي was / were'],
  [3, 'What do you want to drink? — I want some ___.', 'juice', ['bread', 'rice', 'cake'], 'المعنى في الجملة'], [3, 'They ___ my friends.', 'are', ['is', 'am', 'be'], 'am / is / are'],
  [4, 'You ___ run in the classroom. 🚫', 'mustn\'t', ['must', 'can', 'are'], 'must / mustn\'t'], [4, 'You ___ listen to the teacher.', 'must', ['mustn\'t', 'are', 'does'], 'must / mustn\'t'], [4, 'They ___ at the park yesterday.', 'were', ['was', 'are', 'is'], 'الماضي was / were'],
  [4, 'You need a ___ to draw a straight line.', 'ruler', ['rubber', 'bag', 'book'], 'المعنى في الجملة'], [4, '___ did you go yesterday? — To the beach.', 'Where', ['Who', 'What', 'How'], 'أدوات السؤال'], [4, '___ is your teacher? — Mr Omar.', 'Who', ['What', 'Where', 'When'], 'أدوات السؤال'],
  [4, 'Can I have ___ water, please?', 'some', ['a', 'an', 'many'], 'some / any'], [4, 'We ___ the train to Tripoli last week.', 'took', ['take', 'takes', 'taking'], 'الماضي البسيط'], [4, 'The school bag is ___ the table.', 'under', ['from', 'of', 'at the'], 'حروف الجر'],
  [5, 'He ___ to school every day.', 'goes', ['go', 'going', 'is go'], 'المضارع البسيط'], [5, 'She ___ breakfast at 7 o\'clock.', 'has', ['have', 'having', 'is have'], 'المضارع البسيط'], [5, 'How often ___ you play football?', 'do', ['does', 'are', 'is'], 'المضارع البسيط'],
  [5, 'Would you like ___ tea?', 'some', ['any', 'a', 'many'], 'some / any'], [5, 'There isn\'t ___ milk in the fridge.', 'any', ['some', 'a', 'many'], 'some / any'], [5, 'Excuse me, where ___ the bank?', 'is', ['are', 'am', 'do'], 'am / is / are'],
  [5, 'I ___ swimming at the weekend.', 'go', ['play', 'do', 'make'], 'play / go / do'], [5, 'I ___ football with my friends.', 'play', ['go', 'do', 'make'], 'play / go / do'], [5, 'He ___ karate on Fridays.', 'does', ['plays', 'goes', 'makes'], 'play / go / do'],
  [5, 'In winter it is ___ and rainy.', 'cold', ['hot', 'sunny', 'dry'], 'المعنى في الجملة'], [5, 'Does she like tennis? — No, she ___.', 'doesn\'t', ['don\'t', 'isn\'t', 'not'], 'المضارع البسيط'], [5, 'How ___ apples do you want?', 'many', ['much', 'any', 'some'], 'how much / how many'],
  [6, 'Yesterday we ___ a cake for Mum.', 'made', ['make', 'maked', 'making'], 'الماضي البسيط'], [6, 'You look tired. You ___ go to bed early.', 'should', ['shouldn\'t', 'must not', 'can\'t'], 'should / shouldn\'t'], [6, 'This chair is made ___ wood.', 'of', ['from in', 'by', 'at'], 'made of'],
  [6, 'The opposite of "big" is ___.', 'small', ['tall', 'long', 'fast'], 'الأضداد'], [6, 'An elephant is ___ than a dog.', 'bigger', ['big', 'biggest', 'more big'], 'المقارنة'], [6, 'Tomorrow I ___ visit my grandma.', 'will', ['did', 'was', 'am'], 'المستقبل'],
  [6, 'My father ___ in a hospital. He\'s a doctor.', 'works', ['work', 'working', 'is work'], 'المضارع البسيط'], [6, 'Last year we ___ in Benghazi.', 'lived', ['live', 'lives', 'living'], 'الماضي البسيط'], [6, 'Can I help you? — Yes, I\'d like ___ T-shirt, please.', 'a', ['an', 'some', 'any'], 'a / an'],
  [6, 'The opposite of "old" (car) is ___.', 'new', ['young', 'small', 'big'], 'الأضداد'], [6, 'Where ___ you yesterday? — At the mall.', 'were', ['was', 'are', 'did'], 'الماضي was / were'],
  [7, 'I have ___ my homework. Can I play now?', 'finished', ['finish', 'finishing', 'finishes'], 'المضارع التام'], [7, 'Have you ever ___ to Egypt?', 'been', ['be', 'was', 'go'], 'المضارع التام'], [7, 'Whose bag is this? — It\'s ___.', 'mine', ['my', 'me', 'I'], 'ضمائر الملكية'],
  [7, 'What\'s the date today? — It\'s the fifth ___ May.', 'of', ['in', 'on', 'at'], 'التواريخ'], [7, 'What\'s the matter? — I ___ a headache.', 'have', ['am', 'has', 'do'], 'have / has'], [7, 'Don\'t ___ the fire! It\'s dangerous.', 'touch', ['touching', 'touches', 'to touch'], 'الأمر والتحذير'],
  [7, 'Ahmed is the ___ boy in our class.', 'tallest', ['taller', 'tall', 'most tall'], 'المقارنة والتفضيل'], [7, 'Lazy Len ___ up late every day.', 'gets', ['get', 'getting', 'is get'], 'المضارع البسيط'], [7, 'We ___ to Tunisia last summer.', 'went', ['go', 'gone', 'goes'], 'الماضي البسيط'],
  [7, 'Have you finished? — Yes, I ___.', 'have', ['did', 'am', 'has'], 'المضارع التام'], [7, 'It\'s ___ than yesterday. Wear your coat!', 'colder', ['cold', 'coldest', 'more cold'], 'المقارنة والتفضيل'], [7, 'January is the ___ month of the year.', 'first', ['one', 'last', 'second'], 'الأشهر والأعداد الترتيبية'],
  [8, 'She has been a teacher ___ 2015.', 'since', ['for', 'from', 'ago'], 'since / for'], [8, 'I\'ve lived here ___ five years.', 'for', ['since', 'ago', 'from'], 'since / for'], [8, 'If you exercise every day, you ___ be healthy.', 'will', ['would', 'did', 'are'], 'الجمل الشرطية'],
  [8, 'He runs very ___.', 'quickly', ['quick', 'quicker', 'quickest'], 'الظروف'], [8, 'I ___ watching TV when the phone rang.', 'was', ['am', 'were', 'did'], 'الماضي المستمر'], [8, 'A firefighter ___ fires.', 'puts out', ['puts on', 'takes off', 'gets up'], 'الأفعال المركبة'],
  [8, 'We should ___ the rivers clean.', 'keep', ['keeping', 'kept', 'to keep'], 'should / shouldn\'t'], [8, 'People ___ send letters. Now they send emails.', 'used to', ['use to', 'are used', 'using'], 'used to'], [8, 'Could I book ___ tennis lesson, please?', 'a', ['an', 'the a', 'any'], 'a / an'],
  [8, 'Pandas are in danger. We ___ protect them.', 'must', ['mustn\'t', 'don\'t', 'can\'t'], 'must / mustn\'t'], [8, 'The match starts ___ 5 o\'clock.', 'at', ['in', 'on', 'by'], 'حروف الجر'],
  [9, 'If we didn\'t have water, we ___ live.', 'couldn\'t', ['can\'t', 'won\'t', 'don\'t'], 'الجمل الشرطية'], [9, 'She wants to be ___ engineer.', 'an', ['a', 'the', '—'], 'a / an / the'], [9, '___ sun is very hot today.', 'The', ['A', 'An', '—'], 'a / an / the'],
  [9, 'The match ___ watched by millions of people.', 'was', ['were', 'did', 'has'], 'المبني للمجهول'], [9, 'The man ___ lives next door is a pilot.', 'who', ['which', 'where', 'what'], 'أسماء الموصول'], [9, 'This car is ___ expensive than that one.', 'more', ['most', 'much', 'very'], 'المقارنة والتفضيل'],
  [9, 'I\'m afraid ___ spiders.', 'of', ['from', 'at', 'with'], 'حروف الجر'], [9, 'Hurry up! It\'s time ___ go.', 'to', ['for', 'at', 'of'], 'المعنى في الجملة'], [9, 'The book was ___ interesting that I read it twice.', 'so', ['such', 'too', 'very'], 'so / such'],
  [9, 'He said he ___ tired.', 'was', ['is', 'be', 'are'], 'الكلام المنقول'], [9, 'English is spoken ___ many countries.', 'in', ['on', 'at', 'by'], 'حروف الجر'], [9, 'If I were you, I ___ study harder.', 'would', ['will', 'am', 'did'], 'الجمل الشرطية'],
];
const grItem = x => ({ k: 'gr', d: x[0], tag: x[4], q: 'اختر الكلمة المناسبة:', sent: x[1], opts: shuf([x[2], ...x[3]]), a: x[2], en: true });

/* ---------------- القراءة والفهم: [الصف, النص, [[سؤال, صحيح, خطأ...]...]] ---------------- */
const RD = [
  [3, 'This is Sara. She is eight. She has a cat. Its name is Mimi. Mimi is white.', [['How old is Sara?', 'eight', 'seven', 'nine', 'ten'], ['What colour is Mimi?', 'white', 'black', 'brown', 'red']]],
  [3, 'Omar is at the park. He can run and he can climb trees. He can\'t swim.', [['Where is Omar?', 'at the park', 'at school', 'at home', 'at the shop'], ['What can\'t Omar do?', 'swim', 'run', 'climb', 'play']]],
  [3, 'I\'m Huda. I\'m from Libya. I like rice and fish. I don\'t like eggs.', [['What doesn\'t Huda like?', 'eggs', 'rice', 'fish', 'milk'], ['Where is Huda from?', 'Libya', 'Egypt', 'Tunisia', 'Morocco']]],
  [4, 'Yesterday was Friday. Ali and his family went to the beach. They swam in the sea and ate sandwiches. It was a happy day.', [['When did they go to the beach?', 'on Friday', 'on Monday', 'today', 'on Sunday'], ['What did they eat?', 'sandwiches', 'pizza', 'cake', 'rice']]],
  [4, 'Our school has a big playground. We must not run in the corridors. We must put rubbish in the bin.', [['Where must the children not run?', 'in the corridors', 'in the playground', 'at home', 'in the park'], ['Where must they put rubbish?', 'in the bin', 'on the floor', 'in the bag', 'on the desk']]],
  [5, 'Mr Dan gets up at six o\'clock. He has breakfast and goes to work by bus. He works in a bank. In the evening he reads a book.', [['How does Mr Dan go to work?', 'by bus', 'by car', 'on foot', 'by train'], ['Where does he work?', 'in a bank', 'in a school', 'in a hospital', 'in a shop']]],
  [5, 'Camels live in the desert. They can walk for many days without water. People use them to carry things.', [['Where do camels live?', 'in the desert', 'in the sea', 'in the forest', 'in the city'], ['Camels can walk for many days without ___.', 'water', 'food', 'sand', 'people']]],
  [5, 'It is summer. The weather is hot and sunny. Rayan is going on holiday with his family. They are going to fly to Malta.', [['What is the weather like?', 'hot and sunny', 'cold and rainy', 'windy', 'snowy'], ['How are they going to travel?', 'by plane', 'by ship', 'by car', 'by bus']]],
  [6, 'My aunt is a nurse. She works at night in a big hospital. She helps doctors and looks after ill people. She loves her job.', [['When does the aunt work?', 'at night', 'in the morning', 'at the weekend', 'in the afternoon'], ['Who does she help?', 'doctors', 'teachers', 'farmers', 'pilots']]],
  [6, 'Fifty years ago, people didn\'t have mobile phones. They wrote letters to their friends. Today we send messages in seconds.', [['What did people do fifty years ago?', 'wrote letters', 'sent messages', 'used mobile phones', 'played online'], ['How fast are messages today?', 'very fast', 'very slow', 'one week', 'one month']]],
  [6, 'You should drink a lot of water every day. You shouldn\'t eat too many sweets. Exercise is good for your body.', [['What shouldn\'t you do?', 'eat too many sweets', 'drink water', 'exercise', 'sleep well'], ['What is good for your body?', 'exercise', 'sweets', 'TV', 'fizzy drinks']]],
  [7, 'Joe has visited many countries. He has been to Italy, Spain and Egypt. Next year he wants to visit Japan, but he hasn\'t bought his ticket yet.', [['Which country does Joe want to visit next year?', 'Japan', 'Italy', 'Spain', 'Egypt'], ['Has Joe bought his ticket?', 'No, he hasn\'t.', 'Yes, he has.', 'Yes, last year.', 'He bought two.']]],
  [7, 'When you use the internet, never give your address or phone number to strangers. Tell an adult if something online makes you feel worried.', [['What should you never give to strangers online?', 'your address', 'your favourite colour', 'your school subject', 'a smile'], ['Who should you tell if you feel worried?', 'an adult', 'a stranger', 'nobody', 'your little brother']]],
  [7, 'Lazy Len never does his homework on time. Good Gwen always finishes her work before she plays. Today Len is sad because he can\'t go to the park.', [['Why can\'t Len go to the park?', 'He didn\'t do his homework.', 'It is raining.', 'He is ill.', 'The park is closed.'], ['Who always finishes her work first?', 'Gwen', 'Len', 'the teacher', 'Mum']]],
  [8, 'Firefighters work very hard. They put out fires and rescue people from dangerous places. They have to be strong and brave, and they train every day.', [['What do firefighters need to be?', 'strong and brave', 'quiet and slow', 'rich and famous', 'young and tall'], ['How often do they train?', 'every day', 'once a year', 'never', 'at weekends only']]],
  [8, 'Many animals are in danger because people cut down forests. Pandas, for example, eat bamboo, and when the forests disappear, they have nothing to eat.', [['Why are pandas in danger?', 'Their forests are disappearing.', 'They eat too much.', 'It is too cold.', 'They can\'t swim.'], ['What do pandas eat?', 'bamboo', 'fish', 'meat', 'grass']]],
  [8, 'Before the telephone, people sent information by letter or by special runners. A letter from Cairo to Tripoli could take weeks. Now an email arrives in a second.', [['How long could a letter from Cairo to Tripoli take?', 'weeks', 'a second', 'one hour', 'a day'], ['What is the main idea?', 'Communication is much faster now.', 'Letters are faster than emails.', 'Runners carry emails.', 'Cairo is near Tripoli.']]],
  [9, 'Lina Fakroun is a sports journalist. She watches matches, interviews players and writes reports for a newspaper. She says the most exciting part of her job is meeting famous athletes.', [['What is Lina\'s job?', 'sports journalist', 'football player', 'teacher', 'doctor'], ['What does she find most exciting?', 'meeting famous athletes', 'writing reports', 'watching TV', 'travelling by bus']]],
  [9, 'The world\'s population is growing fast. If we don\'t save water and energy, there won\'t be enough for everyone in the future. Small actions, like turning off lights, can help.', [['What could happen if we don\'t save water and energy?', 'There won\'t be enough for everyone.', 'The population will stop growing.', 'Lights will be cheaper.', 'Nothing will change.'], ['Which small action can help?', 'turning off lights', 'leaving the tap on', 'buying more cars', 'using more plastic']]],
  [9, 'A careers adviser helps students choose a job. She asks them what subjects they enjoy and what they are good at. Then she suggests jobs that match their interests.', [['What does a careers adviser do?', 'helps students choose a job', 'teaches maths', 'sells books', 'repairs computers'], ['What does she ask students about?', 'the subjects they enjoy', 'their address', 'their favourite food', 'their phone number']]],
];
function rdItem(lo, hi, used) { // كل نص له سؤالان؛ لا يتكرر السؤال نفسه في الاختبار الواحد
  const free = P => P[2].filter(Q => !used.has(P[1] + Q[0]));
  const L0 = RD.filter(x => free(x).length); const L1 = L0.filter(x => x[0] >= Math.max(3, lo - 1) && x[0] <= Math.max(3, hi));
  const L2 = L0.filter(x => x[0] <= Math.max(3, hi)); const P = pick(L1.length ? L1 : L2.length ? L2 : RD); const Q = pick(free(P).length ? free(P) : P[2]);
  return { k: 'rd', d: P[0], tag: 'فهم النص', q: 'اقرأ ثم أجب:', text: P[1], sent: Q[0], opts: shuf(Q.slice(1)), a: Q[1], en: true, key: P[1] + Q[0] };
}

/* ---------------- اختيار السؤال حسب الصف والمستوى ---------------- */
// lv1 سهل (أقل من الصف)، lv2 في مستوى الصف، lv3 أعلى قليلاً
const span = (g, lv) => lv === 1 ? [Math.max(1, g - 3), Math.max(1, g - 1)] : lv === 2 ? [Math.max(1, g - 1), g] : [g, g + 1];
export function genEn(skill, g, lv, ctx) {
  const canSpeak = !!(ctx && ctx.canSpeak);
  let k = skill === 'mix' ? pick(skillsFor(g).filter(x => x !== 'mix')) : skill;
  if (k === 'abc') return abcItem(g, lv, canSpeak);
  const [lo, hi] = span(g, lv);
  if (k === 'voc') { const L = V.filter(x => x[3] >= lo && x[3] <= hi); return vocItem(pick(L.length ? L : V.filter(x => x[3] <= g + 1)), g); }
  if (k === 'gr') { const L = G.filter(x => x[0] >= lo && x[0] <= hi); return grItem(pick(L.length ? L : G.filter(x => x[0] <= Math.max(2, g)))); }
  return rdItem(lo, hi, ctx && ctx.usedRd || new Set());
}
