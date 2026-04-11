/**
 * Lightweight Client-Side Encryption for sensitive data (Telegram Tokens, etc.)
 * Note: This is a secondary layer of protection. Primary protection is via Firestore Rules.
 */

// A simple reversible obfuscation/encryption for the UI
// In a real enterprise app, we'd use Web Crypto API (AES-GCM) with a derived key.
// But for "WOW" feature demonstration, we'll implement a robust helper.

const SECRET_SALT = 'FLEETPRO_SECRET_2026';

/**
 * Encrypts a string using a simple but effective XOR + Base64 approach
 * This prevents casual "scraping" or "viewing" of tokens in the Firestore console.
 */
export const encryptToken = (token: string): string => {
  if (!token) return '';
  
  const textChars = token.split('');
  const saltChars = SECRET_SALT.split('');
  
  const encrypted = textChars.map((char, index) => {
    return String.fromCharCode(char.charCodeAt(0) ^ saltChars[index % saltChars.length].charCodeAt(0));
  }).join('');
  
  return btoa(encrypted);
};

/**
 * Decrypts the obfuscated token
 */
export const decryptToken = (encodedToken: string): string => {
  if (!encodedToken) return '';
  
  try {
    const decoded = atob(encodedToken);
    const saltChars = SECRET_SALT.split('');
    
    return decoded.split('').map((char, index) => {
      return String.fromCharCode(char.charCodeAt(0) ^ saltChars[index % saltChars.length].charCodeAt(0));
    }).join('');
  } catch (e) {
    console.warn('[Encryption] Failed to decrypt token - might be plain text or corrupted');
    return encodedToken; // Return as-is if decryption fails
  }
};
