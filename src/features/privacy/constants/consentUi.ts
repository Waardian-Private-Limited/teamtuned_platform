export const CONSENT_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'te', label: 'తెలుగు' },
] as const;

export type ConsentLang = (typeof CONSENT_LANGUAGES)[number]['code'];

export interface ConsentStrings {
  read: string;
  required: string;
  optional: string;
  accept: string;
  accepting: string;
  hint: string;
  selectAll: string;
  language: string;
  grievance: string;
  retry: string;
  changed: string;
  isNew: string;
}

// The words around the notice. The notice itself comes from the server in each language.
export const CONSENT_STRINGS: Record<ConsentLang, ConsentStrings> = {
  en: { read: 'I have read and understood this notice', required: 'Required', optional: 'Optional', accept: 'I agree and continue', accepting: 'Saving…', hint: 'Tick every required item and confirm you have read the notice.', selectAll: 'Tick all required', language: 'Language', grievance: 'Grievance officer', retry: 'Retry', changed: 'What changed in this update', isNew: 'New' },
  hi: { read: 'मैंने यह सूचना पढ़ और समझ ली है', required: 'आवश्यक', optional: 'वैकल्पिक', accept: 'मैं सहमत हूँ और आगे बढ़ें', accepting: 'सहेजा जा रहा है…', hint: 'हर आवश्यक बिंदु पर निशान लगाएँ और पुष्टि करें कि आपने सूचना पढ़ ली है।', selectAll: 'सभी आवश्यक चुनें', language: 'भाषा', grievance: 'शिकायत अधिकारी', retry: 'फिर कोशिश करें', changed: 'इस अपडेट में क्या बदला', isNew: 'नया' },
  mr: { read: 'मी ही सूचना वाचली आणि समजून घेतली आहे', required: 'आवश्यक', optional: 'ऐच्छिक', accept: 'मी सहमत आहे, पुढे जा', accepting: 'जतन होत आहे…', hint: 'प्रत्येक आवश्यक मुद्द्यावर खूण करा आणि सूचना वाचल्याची खात्री करा.', selectAll: 'सर्व आवश्यक निवडा', language: 'भाषा', grievance: 'तक्रार अधिकारी', retry: 'पुन्हा प्रयत्न करा', changed: 'या अपडेटमध्ये काय बदलले', isNew: 'नवीन' },
  gu: { read: 'મેં આ સૂચના વાંચી અને સમજી છે', required: 'જરૂરી', optional: 'વૈકલ્પિક', accept: 'હું સંમત છું, આગળ વધો', accepting: 'સાચવી રહ્યું છે…', hint: 'દરેક જરૂરી મુદ્દા પર નિશાન કરો અને સૂચના વાંચી હોવાની પુષ્ટિ કરો.', selectAll: 'બધા જરૂરી પસંદ કરો', language: 'ભાષા', grievance: 'ફરિયાદ અધિકારી', retry: 'ફરી પ્રયાસ કરો', changed: 'આ અપડેટમાં શું બદલાયું', isNew: 'નવું' },
  kn: { read: 'ನಾನು ಈ ಸೂಚನೆಯನ್ನು ಓದಿ ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆ', required: 'ಅಗತ್ಯ', optional: 'ಐಚ್ಛಿಕ', accept: 'ನಾನು ಒಪ್ಪುತ್ತೇನೆ, ಮುಂದುವರಿಸಿ', accepting: 'ಉಳಿಸಲಾಗುತ್ತಿದೆ…', hint: 'ಪ್ರತಿ ಅಗತ್ಯ ಅಂಶಕ್ಕೆ ಗುರುತು ಹಾಕಿ ಮತ್ತು ಸೂಚನೆ ಓದಿದ್ದನ್ನು ದೃಢೀಕರಿಸಿ.', selectAll: 'ಎಲ್ಲಾ ಅಗತ್ಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ', language: 'ಭಾಷೆ', grievance: 'ದೂರು ಅಧಿಕಾರಿ', retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ', changed: 'ಈ ಅಪ್‌ಡೇಟ್‌ನಲ್ಲಿ ಏನು ಬದಲಾಯಿತು', isNew: 'ಹೊಸದು' },
  te: { read: 'నేను ఈ నోటీసును చదివి అర్థం చేసుకున్నాను', required: 'అవసరం', optional: 'ఐచ్ఛికం', accept: 'నేను అంగీకరిస్తున్నాను, కొనసాగండి', accepting: 'సేవ్ అవుతోంది…', hint: 'ప్రతి అవసరమైన అంశాన్ని టిక్ చేసి నోటీసు చదివినట్లు నిర్ధారించండి.', selectAll: 'అన్ని అవసరమైనవి ఎంచుకోండి', language: 'భాష', grievance: 'ఫిర్యాదుల అధికారి', retry: 'మళ్లీ ప్రయత్నించండి', changed: 'ఈ అప్‌డేట్‌లో ఏమి మారింది', isNew: 'కొత్త' },
};
