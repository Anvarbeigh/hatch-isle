// UI strings: English + Russian (picked from the portal / browser locale). t('key', {n}) fills {n}.
const STR = {
  en: {
    docTitle: 'Hatch Isle', title: 'Hatch Isle', loading: 'Loading…',
    tapEgg: 'Tap the egg!', tapMore: 'Keep tapping!',
    eggs: 'Eggs', tap: 'Tap', lamp: 'Lamp', treats: 'Treats', book: 'Pets',
    tapInfo: 'More warmth and coins per tap', lampInfo: 'Warms the egg by itself', treatsInfo: 'Pets drop more coins',
    lvl: 'Lv {n}', max: 'MAX', perSec: '/s',
    egg: ['Meadow Egg', 'Forest Egg', 'Snow Egg', 'Beach Egg', 'Volcano Egg'],
    eggShort: ['Meadow', 'Forest', 'Snow', 'Beach', 'Volcano'],
    free: 'Free', select: 'Use', selected: 'On nest', locked: 'Find {n} {egg} pets',
    eggsTitle: 'Choose an egg', eggsSub: 'The next egg on the nest. Every egg costs coins, pets inside are random.',
    chance: 'Chances', rarity: ['Common', 'Uncommon', 'Rare', 'Legendary'],
    bookTitle: 'Pet collection', found: '{n} / 20 found', unknown: '???',
    newPet: 'NEW PET!', dupe: 'Star up!', stars: '★{n}', tapContinue: 'tap to continue',
    starBonus: 'Every star: +50% coins from this pet',
    pets: {
      chick: 'Chick', bunny: 'Bunny', piglet: 'Piglet', lamb: 'Crown Lamb',
      hedgehog: 'Hedgehog', owlet: 'Owlet', fox: 'Fox Kit', mossbear: 'Moss Bear',
      penguin: 'Penguin', seal: 'Seal Pup', polarbear: 'Polar Cub', frostfox: 'Frost Fox',
      crab: 'Crab', turtle: 'Turtle', parrot: 'Parrot', otter: 'Pearl Otter',
      lizard: 'Ember Lizard', snail: 'Lava Snail', dragon: 'Baby Dragon', phoenix: 'Phoenix',
    },
    boost: 'Sunny Day', boostInfo: '×2 coins from everything for 3 minutes',
    watch: 'Watch ad', orCoins: 'or', active: 'Active {t}', boostOn: 'Sunny Day! ×2 coins',
    noAd: 'No ad right now, try later',
    welcome: 'Welcome back!', offlineText: 'Your pets earned while you were away', take: 'Take', take2: 'Take ×2',
    notEnough: 'Not enough coins', nextEggFree: 'Not enough coins: a free Meadow Egg instead',
    unlocked: '{egg} unlocked!', sound: 'Sound', music: 'Music', close: 'Close',
    hatchHint: 'Pets walk around and drop coins',
    needMore: 'Need {n} more', waitHatch: 'Wait for the hatch to finish', eggOnNest: '{egg} is on the nest!',
    goalFind: 'Find 2 {egg} pets', goalSet: 'Collect all {egg} pets', goalAll: 'All pets found!', setDone2: '{egg} set complete!', newEgg: 'NEW EGG!',
    upTap: 'Tap power {n}!', upLamp: 'Lamp {n} taps/s', upTreats: 'Pet coins {n}%', ready: 'UPGRADE!',
    newIn: 'new pet in ≤{n} hatches', setDone: 'all found!', newShort: 'new ≤{n}',
    pityInfo: 'Fair hatching: a pet you don\'t have yet is guaranteed at least every {n} hatches of the same egg.',
  },
  ru: {
    docTitle: 'Остров Питомцев', title: 'Остров Питомцев', loading: 'Загрузка…',
    tapEgg: 'Жми на яйцо!', tapMore: 'Жми ещё!',
    eggs: 'Яйца', tap: 'Тап', lamp: 'Лампа', treats: 'Еда', book: 'Питомцы',
    tapInfo: 'Больше тепла и монет за тап', lampInfo: 'Греет яйцо сама', treatsInfo: 'Питомцы дают больше монет',
    lvl: 'Ур {n}', max: 'МАКС', perSec: '/с',
    egg: ['Луговое яйцо', 'Лесное яйцо', 'Снежное яйцо', 'Пляжное яйцо', 'Вулканье яйцо'],
    eggShort: ['Луг', 'Лес', 'Снег', 'Пляж', 'Вулкан'],
    free: 'Даром', select: 'Взять', selected: 'В гнезде', locked: 'Найди {n} пит. ({egg})',
    eggsTitle: 'Выбери яйцо', eggsSub: 'Следующее яйцо в гнезде. Яйца покупаются за монеты, питомцы внутри случайные.',
    chance: 'Шансы', rarity: ['Обычный', 'Необычный', 'Редкий', 'Легендарный'],
    bookTitle: 'Коллекция', found: 'Найдено {n} / 20', unknown: '???',
    newPet: 'НОВЫЙ ПИТОМЕЦ!', dupe: 'Звезда!', stars: '★{n}', tapContinue: 'нажми, чтобы продолжить',
    starBonus: 'Каждая звезда: +50% монет от питомца',
    pets: {
      chick: 'Цыплёнок', bunny: 'Зайчик', piglet: 'Поросёнок', lamb: 'Королевский ягнёнок',
      hedgehog: 'Ёжик', owlet: 'Совёнок', fox: 'Лисёнок', mossbear: 'Моховой мишка',
      penguin: 'Пингвин', seal: 'Тюлень', polarbear: 'Белый мишка', frostfox: 'Морозный лис',
      crab: 'Краб', turtle: 'Черепаха', parrot: 'Попугай', otter: 'Жемчужная выдра',
      lizard: 'Огненная ящерка', snail: 'Лавовая улитка', dragon: 'Дракончик', phoenix: 'Феникс',
    },
    boost: 'Солнечный день', boostInfo: '×2 монет от всего на 3 минуты',
    watch: 'Смотреть рекламу', orCoins: 'или', active: 'Ещё {t}', boostOn: 'Солнечный день! ×2 монет',
    noAd: 'Реклама сейчас недоступна',
    welcome: 'С возвращением!', offlineText: 'Питомцы заработали, пока тебя не было', take: 'Забрать', take2: 'Забрать ×2',
    notEnough: 'Не хватает монет', nextEggFree: 'Не хватает монет: бесплатное луговое яйцо',
    unlocked: '{egg}: открыто!', sound: 'Звук', music: 'Музыка', close: 'Закрыть',
    hatchHint: 'Питомцы гуляют и приносят монеты',
    needMore: 'Не хватает {n}', waitHatch: 'Дождись, пока вылупится', eggOnNest: '{egg} в гнезде!',
    goalFind: 'Найди 2 пит. ({egg})', goalSet: 'Собери всех ({egg})', goalAll: 'Все питомцы найдены!', setDone2: 'Набор «{egg}» собран!', newEgg: 'НОВОЕ ЯЙЦО!',
    upTap: 'Сила тапа {n}!', upLamp: 'Лампа {n} тап/с', upTreats: 'Монеты питомцев {n}%', ready: 'УЛУЧШИ!',
    newIn: 'новый питомец не позже чем через {n}', setDone: 'все найдены!', newShort: 'новый ≤{n}',
    pityInfo: 'Честно: нового питомца гарантированно дают не реже, чем каждые {n} вылуплений одного яйца.',
  },
};
STR.ru.egg[4] = 'Вулканическое яйцо';
let lang = 'en';
const RU = ['ru', 'be', 'kk', 'uk', 'uz', 'ky', 'tg', 'hy', 'az'];
export function setLang(code) { lang = RU.includes(String(code || '').slice(0, 2).toLowerCase()) ? 'ru' : 'en'; document.documentElement.lang = lang; }
export const getLang = () => lang;
export function t(key, vars) {
  let s = key.split('.').reduce((o, k) => (o == null ? o : o[k]), STR[lang]);
  if (s == null) s = key.split('.').reduce((o, k) => (o == null ? o : o[k]), STR.en);
  if (typeof s === 'string' && vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}
