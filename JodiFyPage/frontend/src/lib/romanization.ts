/**
 * Módulo de Transcripción Fonética y Romanización (Romaji / Hangul RR / Pinyin).
 * Permite mostrar la lectura fonética debajo de las letras en japonés, coreano y otros alfabetos.
 */

// Descomposición matemática de sílabas Hangul (Revised Romanization of Korean)
const HANGUL_BASE = 0xAC00;
const HANGUL_END = 0xD7A3;

const HANGUL_INITIALS = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h',
];

const HANGUL_MEDIALS = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
];

const HANGUL_FINALS = [
  '', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h',
];

export function romanizeHangul(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= HANGUL_BASE && code <= HANGUL_END) {
      const syllableIndex = code - HANGUL_BASE;
      const finalIndex = syllableIndex % 28;
      const medialIndex = Math.floor((syllableIndex - finalIndex) / 28) % 21;
      const initialIndex = Math.floor((syllableIndex - finalIndex) / (28 * 21));

      const initial = HANGUL_INITIALS[initialIndex] || '';
      const medial = HANGUL_MEDIALS[medialIndex] || '';
      const fin = HANGUL_FINALS[finalIndex] || '';

      result += initial + medial + fin;
    } else {
      result += text[i];
    }
  }
  return result;
}

// Diccionario de Hiragana / Katakana a Romaji Hepburn
const KANA_MAP: Record<string, string> = {
  // Hiragana
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'を': 'wo', 'ん': 'n',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'dzu', 'で': 'de', 'ど': 'do',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
  'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
  'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
  'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
  'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
  'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
  'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
  'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
  'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
  'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
  'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
  'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
  // Katakana
  'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
  'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
  'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
  'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
  'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
  'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
  'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
  'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
  'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
  'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n',
  'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
  'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
  'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'dzu', 'デ': 'de', 'ド': 'do',
  'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
  'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
  'キャ': 'kya', 'キュ': 'kyu', 'キョ': 'kyo',
  'シャ': 'sha', 'シュ': 'shu', 'ショ': 'sho',
  'チャ': 'cha', 'チュ': 'chu', 'チョ': 'cho',
  'ニャ': 'nya', 'ニュ': 'nyu', 'ニョ': 'nyo',
  'ヒャ': 'hya', 'ヒュ': 'hyu', 'ヒョ': 'hyo',
  'ミャ': 'mya', 'ミュ': 'myu', 'ミョ': 'myo',
  'リャ': 'rya', 'リュ': 'ryu', 'リョ': 'ryo',
  'ギャ': 'gya', 'ギュ': 'gyu', 'ギョ': 'gyo',
  'ジャ': 'ja', 'ジュ': 'ju', 'ジョ': 'jo',
  'ビャ': 'bya', 'ビュ': 'byu', 'ビョ': 'byo',
  'ピャ': 'pya', 'ピュ': 'pyu', 'ピョ': 'pyo',
  'ー': '-',
};

// Kanji frecuentes en letras musicales
const COMMON_KANJI_MAP: Record<string, string> = {
  '愛': 'ai', '私': 'watashi', '僕': 'boku', '君': 'kimi', '心': 'kokoro',
  '夢': 'yume', '今': 'ima', '世界': 'sekai', '夜': 'yoru', '光': 'hikari',
  '涙': 'namida', '歌': 'uta', '風': 'kaze', '花': 'hana', '空': 'sora',
  '雨': 'ame', '星': 'hoshi', '時': 'toki', '道': 'michi', '手': 'te',
  '目': 'me', '声': 'koe', '明日': 'ashita', '今日': 'kyou', '未来': 'mirai',
  '想い': 'omoi', '約束': 'yakusoku', '希望': 'kibou', '時間': 'jikan',
  '記憶': 'kioku', '永遠': 'eien', '奇跡': 'kiseki', '絆': 'kizuna',
  '運命': 'unmei', '命': 'inochi', '自由': 'jiyuu', '太陽': 'taiyou',
  '月': 'tsuki', '海': 'umi', '火': 'hi', '冬': 'fuyu', '夏': 'natsu',
  '春': 'haru', '秋': 'aki', '一人': 'hitori', '二人': 'futari',
  '大好き': 'daisuki', '好き': 'suki', 'ありがとう': 'arigatou',
};

export function romanizeJapanese(text: string): string {
  let s = text;

  // Reemplazar kanji comunes
  for (const [k, v] of Object.entries(COMMON_KANJI_MAP)) {
    s = s.replaceAll(k, ` ${v} `);
  }

  // Dígrafos primero (2 caracteres: きゃ, etc.)
  let result = '';
  let i = 0;
  while (i < s.length) {
    const pair = s.slice(i, i + 2);
    if (KANA_MAP[pair]) {
      result += KANA_MAP[pair];
      i += 2;
      continue;
    }

    const char = s[i];
    // Sokuon (pequeño っ o ッ duplica la consonante siguiente)
    if (char === 'っ' || char === 'ッ') {
      const nextPair = s.slice(i + 1, i + 3);
      const nextChar = s[i + 1];
      const nextRomaji = KANA_MAP[nextPair] || KANA_MAP[nextChar] || '';
      if (nextRomaji) {
        result += nextRomaji[0];
      }
      i++;
      continue;
    }

    if (KANA_MAP[char]) {
      result += KANA_MAP[char];
    } else {
      result += char;
    }
    i++;
  }

  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Detecta si una cadena contiene caracteres asiáticos (Hangul, Hiragana, Katakana, CJK).
 */
export function containsAsianScript(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/.test(text);
}

/**
 * Genera la lectura fonética/Romaji adecuada según el alfabeto detectado.
 */
export function getPhoneticTranscript(text: string): string | null {
  if (!text || !containsAsianScript(text)) return null;

  // Si contiene Hangul
  if (/[\uac00-\ud7af]/.test(text)) {
    return romanizeHangul(text);
  }

  // Si contiene Kana japonés
  if (/[\u3040-\u30ff]/.test(text)) {
    return romanizeJapanese(text);
  }

  // Kanji suelto
  return romanizeJapanese(text);
}
