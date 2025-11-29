"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PROFILE_IMAGE_PATH = exports.PROFILE_IMAGES_FOLDER = void 0;
exports.normalizeProfileImagePath = normalizeProfileImagePath;
exports.resolveProfileImageMeta = resolveProfileImageMeta;
function sanitizeFolderName(value) {
    const trimmed = (value ?? 'images').trim().replace(/(^\/+|\/+$)/g, '');
    return trimmed || 'images';
}
exports.PROFILE_IMAGES_FOLDER = sanitizeFolderName(process.env.PROFILE_IMAGE_FOLDER);
function ensureFolderPrefix(relativePath) {
    const normalizedFolder = exports.PROFILE_IMAGES_FOLDER.replace(/\/+/g, '/');
    const folderPrefix = `${normalizedFolder}/`;
    if (relativePath.toLowerCase().startsWith(folderPrefix.toLowerCase())) {
        return relativePath;
    }
    const stripped = relativePath.replace(/^images\//i, '');
    return `${normalizedFolder}/${stripped}`;
}
function stripUnsafeSegments(value) {
    const normalizedSeparators = value.replace(/\+/g, '/');
    const withoutTraversal = normalizedSeparators
        .replace(/\.\.(?=\/|$)/g, '')
        .replace(/\.\./g, '');
    return withoutTraversal.replace(/^\/+/g, '');
}
function normalizeProfileImagePath(input) {
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
function resolveDefaultImagePath() {
    const envDefined = normalizeProfileImagePath(process.env.DEFAULT_PROFILE_IMAGE_PATH ?? undefined);
    if (envDefined) {
        return envDefined;
    }
    return normalizeProfileImagePath(`${exports.PROFILE_IMAGES_FOLDER}/default-avatar.svg`);
}
exports.DEFAULT_PROFILE_IMAGE_PATH = resolveDefaultImagePath();
function resolveProfileImageMeta(rawValue, options) {
    const sanitized = normalizeProfileImagePath(rawValue);
    if (sanitized) {
        if (exports.DEFAULT_PROFILE_IMAGE_PATH && sanitized === exports.DEFAULT_PROFILE_IMAGE_PATH) {
            return { path: sanitized, status: 'default' };
        }
        return { path: sanitized, status: 'custom' };
    }
    if (options?.fallbackToDefault !== false && exports.DEFAULT_PROFILE_IMAGE_PATH) {
        return { path: exports.DEFAULT_PROFILE_IMAGE_PATH, status: 'default' };
    }
    return { path: null, status: 'none' };
}
