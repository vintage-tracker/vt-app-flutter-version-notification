import axios from 'axios';

/**
 * Flutterバージョンを取得
 */
export async function getLatestFlutterVersion(): Promise<string> {
  try {
    const response = await axios.get(
      'https://storage.googleapis.com/flutter_infra_release/releases/releases_linux.json',
      { timeout: 10000 }
    );
    const releases = response.data.releases;
    const stableReleases = releases.filter((r: any) => r.channel === 'stable');
    if (stableReleases.length > 0) {
      return stableReleases[0].version;
    }
    throw new Error('No stable releases found');
  } catch (error) {
    // Fallback to GitHub API
    const response = await axios.get(
      'https://api.github.com/repos/flutter/flutter/releases',
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Flutter-Version-Checker'
        },
        timeout: 10000
      }
    );
    const stableRelease = response.data.find(
      (r: any) => !r.prerelease && !r.draft && !r.tag_name.includes('-')
    );
    if (stableRelease) {
      return stableRelease.tag_name.replace(/^v/, '');
    }
    throw new Error('Failed to get Flutter version');
  }
}

