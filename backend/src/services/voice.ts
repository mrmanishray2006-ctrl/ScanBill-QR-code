export interface VoiceCommand {
  action: 'ADD' | 'REMOVE' | 'CHECKOUT' | 'UNKNOWN';
  quantity: number;
  productQuery: string;
}

// Map of verbal numbers to digits in English, Hindi, and Marathi
const NUMBER_MAP: { [key: string]: number } = {
  // English
  'a': 1, 'an': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  
  // Hindi (Hindi numbers written in latin/phonetic scripts or Devanagari)
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ek': 1, 'do': 2, 'teen': 3, 'chaar': 4, 'paanch': 5, 'che': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
  
  // Marathi
  'दोन': 2, 'चार': 4, 'पाच': 5, 'सहा': 6, 'आठ': 8, 'नऊ': 9, 'don': 2, 'pach': 5, 'saha': 6, 'nauu': 9
};

export const parseVoiceCommand = (text: string): VoiceCommand => {
  const normalized = text.toLowerCase().trim();

  // 1. Checkout triggers
  const checkoutTriggers = [
    'checkout', 'pay', 'billing', 'finish',
    'चेकआउट', 'बिल करो', 'भुगतान', 'बिल करा', 'चेकआउट करा',
    'bill karo', 'bill kara'
  ];

  if (checkoutTriggers.some(trigger => normalized.includes(trigger))) {
    return { action: 'CHECKOUT', quantity: 0, productQuery: '' };
  }

  // 2. Remove triggers
  const removeTriggers = [
    'remove', 'delete', 'subtract',
    'हटाएं', 'हटाओ', 'काढा', 'वजा करा',
    'hatao', 'hataen', 'kadha'
  ];

  for (const trigger of removeTriggers) {
    if (normalized.startsWith(trigger) || normalized.endsWith(trigger)) {
      // Extract target product name
      let productQuery = '';
      if (normalized.startsWith(trigger)) {
        productQuery = normalized.replace(trigger, '').trim();
      } else {
        productQuery = normalized.substring(0, normalized.length - trigger.length).trim();
      }
      
      // Clean up prepositions
      productQuery = productQuery.replace(/^(from|of|को|चे)\s+/i, '').trim();

      if (productQuery) {
        return { action: 'REMOVE', quantity: 1, productQuery };
      }
    }
  }

  // 3. Add triggers (Fallback to ADD if none of the above matches)
  // Check if it's an explicit "Add" command
  const addPrefixes = ['add', 'जोड़ें', 'जोड़ो', 'जोडा', 'टाका', 'jodo', 'joda', 'taka'];
  let cleanText = normalized;
  
  let isAdd = false;
  for (const prefix of addPrefixes) {
    if (normalized.startsWith(prefix)) {
      cleanText = normalized.replace(prefix, '').trim();
      isAdd = true;
      break;
    } else if (normalized.endsWith(prefix)) {
      cleanText = normalized.substring(0, normalized.length - prefix.length).trim();
      isAdd = true;
      break;
    }
  }

  // Extract quantity from cleanText (either numeric digits or verbal words)
  let quantity = 1;
  let productQuery = cleanText;

  // Split sentence into words
  const words = cleanText.split(/\s+/);
  
  // Look for numeric digit or mapped text at the beginning
  const firstWord = words[0];
  const lastWord = words[words.length - 1];

  if (/^\d+$/.test(firstWord)) {
    quantity = parseInt(firstWord);
    productQuery = words.slice(1).join(' ').trim();
  } else if (NUMBER_MAP[firstWord] !== undefined) {
    quantity = NUMBER_MAP[firstWord];
    productQuery = words.slice(1).join(' ').trim();
  } else if (/^\d+$/.test(lastWord)) {
    quantity = parseInt(lastWord);
    productQuery = words.slice(0, -1).join(' ').trim();
  } else if (NUMBER_MAP[lastWord] !== undefined) {
    quantity = NUMBER_MAP[lastWord];
    productQuery = words.slice(0, -1).join(' ').trim();
  }

  // Clean trailing/leading connector words (e.g., "of", "units", "को")
  productQuery = productQuery
    .replace(/^(of|units|piece|pieces|unit|नग|को)\s+/gi, '')
    .replace(/\s+(of|units|piece|pieces|unit|नग|को)$/gi, '')
    .trim();

  return {
    action: isAdd || productQuery ? 'ADD' : 'UNKNOWN',
    quantity,
    productQuery: productQuery || cleanText
  };
};
