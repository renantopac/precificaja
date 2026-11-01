import { randomBytes } from 'crypto';

export function createId(size = 12) {
  return randomBytes(Math.ceil(size * 0.75))
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, size);
}
