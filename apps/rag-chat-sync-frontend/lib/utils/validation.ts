/**
 * Validate URL format
 * @param url - The URL string to validate
 * @returns true if the URL is valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    // Check if protocol is http or https
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate agent name
 * @param name - The agent name to validate
 * @returns true if the name is valid (non-empty, max 100 chars), false otherwise
 */
export function isValidAgentName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const trimmedName = name.trim();
  return trimmedName.length > 0 && trimmedName.length <= 100;
}

/**
 * Validate chat message
 * @param message - The message string to validate
 * @returns true if the message is valid (non-empty, max 5000 chars), false otherwise
 */
export function isValidMessage(message: string): boolean {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const trimmedMessage = message.trim();
  return trimmedMessage.length > 0 && trimmedMessage.length <= 5000;
}
