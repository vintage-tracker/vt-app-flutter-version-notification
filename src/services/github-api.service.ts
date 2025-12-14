import axios from 'axios';

/**
 * GitHubからファイルを取得（共通処理）
 */
async function getFileFromGitHub(
  repoUrl: string,
  filePath: string,
  githubToken?: string
): Promise<string | null> {
  try {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${repoUrl}`);
    }
    const [, owner, repo] = match;
    
    const headers: any = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Flutter-Version-Checker'
    };
    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }
    
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      { headers, timeout: 10000 }
    );
    
    return Buffer.from(response.data.content, 'base64').toString('utf-8');
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null; // ファイルが存在しない
    }
    throw error;
  }
}

/**
 * GitHubから.fvmrcを取得
 */
export async function getFvmrcFromGitHub(repoUrl: string, githubToken?: string): Promise<string | null> {
  return getFileFromGitHub(repoUrl, '.fvmrc', githubToken);
}

/**
 * GitHubからpubspec.yamlを取得
 */
export async function getPubspecFromGitHub(repoUrl: string, githubToken?: string): Promise<string> {
  const content = await getFileFromGitHub(repoUrl, 'pubspec.yaml', githubToken);
  if (!content) {
    throw new Error('pubspec.yaml not found');
  }
  return content;
}

