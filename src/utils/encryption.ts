import crypto from 'crypto';

// Use the encryption key from environment variables
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';

// Ensure the key is properly sized for AES-256 (32 bytes)
const getKey = () => {
  // If key is shorter than 32 characters, pad it
  return Buffer.from(
    ENCRYPTION_KEY.length >= 32 
      ? ENCRYPTION_KEY.slice(0, 32) 
      : ENCRYPTION_KEY.padEnd(32, '0')
  );
};

// Create initialization vector
const getIV = () => {
  return crypto.randomBytes(16);
};

/**
 * Encrypt sensitive data
 * @param text Plain text to encrypt
 * @returns Encrypted data as base64 string with IV
 */
export const encryptData = (text: string): string => {
  if (!text) return '';

  try {
    const iv = getIV();
    const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Store IV with the encrypted data (prefixed)
    const ivString = iv.toString('base64');
    return `${ivString}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
};

/**
 * Decrypt sensitive data
 * @param encryptedData Encrypted data with IV (from encryptData)
 * @returns Decrypted plain text
 */
export const decryptData = (encryptedData: string): string => {
  if (!encryptedData) return '';
  
  try {
    // Split IV and actual encrypted data
    const [ivString, encrypted] = encryptedData.split(':');
    
    if (!ivString || !encrypted) {
      // Likely not encrypted data - return as is
      return encryptedData;
    }
    
    const iv = Buffer.from(ivString, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // If decryption fails, return the original data
    // This helps with backward compatibility for non-encrypted data
    console.error('Decryption error:', error);
    return encryptedData;
  }
};

/**
 * Check if data is likely encrypted with our format
 */
export const isEncrypted = (data: string): boolean => {
  return Boolean(data && data.includes(':') && data.length > 30);
};
