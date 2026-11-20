const prefix = 'model-studio:part-edits:v1:';
const emptyBackup = () => ({ draft: null, versions: [] });

export async function identifyModelFiles(files, filePath) {
  if (!globalThis.crypto?.subtle) return null;
  const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  try {
    const manifest = [];
    for (const file of files) {
      const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      manifest.push([filePath(file), hex(hash)]);
    }
    manifest.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    const encoded = new TextEncoder().encode(JSON.stringify(manifest));
    return hex(await crypto.subtle.digest('SHA-256', encoded));
  } catch {
    return null;
  }
}

export function readModelBackup(modelKey) {
  if (!modelKey) throw new Error('Model identity unavailable.');
  const data = localStorage.getItem(prefix + modelKey);
  if (!data) return emptyBackup();
  const backup = JSON.parse(data);
  if (!Array.isArray(backup.versions) || (backup.draft !== null && !Array.isArray(backup.draft)) ||
      backup.versions.some(version => !Array.isArray(version?.parts) || !Number.isSafeInteger(version?.time) || Math.abs(version.time) > 8.64e15)) {
    throw new Error('Invalid model backup.');
  }
  return backup;
}

export function writeModelBackup(modelKey, backup) {
  if (backup.draft !== null || backup.versions.length) {
    localStorage.setItem(prefix + modelKey, JSON.stringify(backup));
  } else {
    localStorage.removeItem(prefix + modelKey);
  }
}

export function sameParts(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}
