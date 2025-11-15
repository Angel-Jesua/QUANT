import { ProfileImageStatus } from './user.types';

function sanitizeFolderName(value?: string | null): string {
  const trimmed = (value ?? 'images').trim().replace(/(^\/+|\/+$)/g, '');
  return trimmed || 'images';
}

export const PROFILE_IMAGES_FOLDER = sanitizeFolderName(process.env.PROFILE_IMAGE_FOLDER);

function ensureFolderPrefix(relativePath: string): string {
  const normalizedFolder = PROFILE_IMAGES_FOLDER.replace(/\/+/g, '/');
  const folderPrefix = `${normalizedFolder}/`;
  if (relativePath.toLowerCase().startsWith(folderPrefix.toLowerCase())) {
    return relativePath;
  }
  const stripped = relativePath.replace(/^images\//i, '');
  return `${normalizedFolder}/${stripped}`;
}

function stripUnsafeSegments(value: string): string {
  const normalizedSeparators = value.replace(/\+/g, '/');
  const withoutTraversal = normalizedSeparators
    .replace(/\.\.(?=\/|$)/g, '')
    .replace(/\.\./g, '');
  return withoutTraversal.replace(/^\/+/g, '');
}

export function normalizeProfileImagePath(input?: string | null): string | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (/^[a-zA-Z]+:\/\//.test(trimmed)) {
    // Enforce local relative paths under the configured images folder
    return null;
  }

  const sanitized = stripUnsafeSegments(trimmed);
  if (!sanitized) {
    return null;
  }

  return ensureFolderPrefix(sanitized);
}

function resolveDefaultImagePath(): string | null {
  const envDefined = normalizeProfileImagePath(process.env.DEFAULT_PROFILE_IMAGE_PATH ?? undefined);
  if (envDefined) {
    return envDefined;
  }
  return normalizeProfileImagePath(`${PROFILE_IMAGES_FOLDER}/default-avatar.svg`);
}

export const DEFAULT_PROFILE_IMAGE_PATH = resolveDefaultImagePath();

export function resolveProfileImageMeta(
  rawValue?: string | null,
  options?: { fallbackToDefault?: boolean }
): { path: string | null; status: ProfileImageStatus } {
  const sanitized = normalizeProfileImagePath(rawValue);
  if (sanitized) {
    if (DEFAULT_PROFILE_IMAGE_PATH && sanitized === DEFAULT_PROFILE_IMAGE_PATH) {
      return { path: sanitized, status: 'default' };
    }
    return { path: sanitized, status: 'custom' };
  }

  if (options?.fallbackToDefault !== false && DEFAULT_PROFILE_IMAGE_PATH) {
    return { path: DEFAULT_PROFILE_IMAGE_PATH, status: 'default' };
  }

  return { path: null, status: 'none' };
}
