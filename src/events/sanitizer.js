/**
 * Comment / username moderation.
 * Carried over from the original project (Cuneiform/Zalgo/Braille spam filter,
 * Vietnamese-only whitelist, profanity list) and made length-configurable.
 */
const WEIRD_SPAM_RE = /[\u{12000}-\u{1254F}﷽⠀-⣿▀-▟]|[̀-ͯ]{3,}/u;
const BRACKET_EMOTE_RE = /\[[^\]]{1,24}\]/g;
const ALLOWED_VI_TEXT_RE = /[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s.,!?']/g;
const ALLOWED_VI_NAME_RE = /[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s._-]/g;
const VI_LETTER_RE = /[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/g;
const URL_RE = /(https?:\/\/|www\.)\S+|\b\S+\.(com|net|vn|io|me|xyz|link)\b/gi;
const BAD_WORDS_RE = /(đá dái|địt|lồn|cặc|\bđm\b|\bvcl\b|\bvl\b|yamate|lừa đảo|lừa à|te-le gram|telegram|bố là trùm|\bfuck|\bshit\b|\bbitch)/i;

const FALLBACK_NAME = 'Khách Mời';

function isBlockedSpamOrToxic(raw) {
  if (!raw) return true;
  const s = String(raw);
  return WEIRD_SPAM_RE.test(s) || BAD_WORDS_RE.test(s);
}

function letterCount(s) {
  return (s.match(VI_LETTER_RE) || []).length;
}

function sanitizeUserName(rawName, maxLen = 24) {
  const normalized = String(rawName || '')
    .normalize('NFKC')
    .normalize('NFC')
    .replace(BRACKET_EMOTE_RE, ' ')
    .replace(ALLOWED_VI_NAME_RE, ' ')
    .replace(/(.)\1{3,}/gi, '$1$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
    .trim();
  if (!normalized || BAD_WORDS_RE.test(normalized) || letterCount(normalized) < 2) return FALLBACK_NAME;
  return normalized;
}

/** Returns '' when the text should not be shown at all. */
function sanitizeText(rawText, maxLen = 90) {
  if (!rawText) return '';
  let cleaned = String(rawText)
    .normalize('NFKC')
    .normalize('NFC')
    .replace(URL_RE, ' ')
    .replace(BRACKET_EMOTE_RE, ' ')
    .replace(ALLOWED_VI_TEXT_RE, ' ')
    .replace(/([.,!?])\1+/g, '$1')
    .replace(/(.)\1{2,}/gi, '$1$1')
    .replace(/\s+/g, ' ')
    .replace(/^[.,!?\s'-]+|[,\s'-]+$/g, '')
    .trim();
  if (cleaned.length > maxLen) {
    const cut = cleaned.slice(0, maxLen);
    const lastSpace = cut.lastIndexOf(' ');
    cleaned = `${(lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
  }
  if (!cleaned || BAD_WORDS_RE.test(cleaned) || letterCount(cleaned) < 2) return '';
  return cleaned;
}

function sanitizeAvatar(url) {
  const s = String(url || '');
  return /^https:\/\/[^\s"'<>]+$/i.test(s) && s.length < 1024 ? s : '';
}

module.exports = {
  FALLBACK_NAME,
  isBlockedSpamOrToxic,
  sanitizeUserName,
  sanitizeText,
  sanitizeAvatar
};
