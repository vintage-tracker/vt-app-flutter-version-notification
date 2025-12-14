import semver from 'semver';

/**
 * バージョン更新が利用可能かチェック
 */
export function isUpdateAvailable(currentVersion: string, latestVersion: string): boolean {
  try {
    const baseVersion = currentVersion.replace(/^[\^~>=<\s]+/, '').split(/\s+/)[0];
    if (semver.valid(baseVersion) && semver.valid(latestVersion)) {
      return semver.gt(latestVersion, baseVersion) && 
             !semver.satisfies(latestVersion, currentVersion);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * バージョン更新の種類を判定（メジャー/マイナー/パッチ）
 */
export function getVersionUpdateType(currentVersion: string, latestVersion: string): 'major' | 'minor' | 'patch' | null {
  try {
    const baseVersion = currentVersion.replace(/^[\^~>=<\s]+/, '').split(/\s+/)[0];
    const current = semver.valid(baseVersion);
    const latest = semver.valid(latestVersion);
    
    if (!current || !latest) {
      return null;
    }
    
    if (semver.major(latest) > semver.major(current)) {
      return 'major';
    } else if (semver.minor(latest) > semver.minor(current)) {
      return 'minor';
    } else if (semver.patch(latest) > semver.patch(current)) {
      return 'patch';
    }
    
    return null;
  } catch {
    return null;
  }
}

