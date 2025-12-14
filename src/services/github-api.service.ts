import axios from 'axios';

/**
 * GitHubからpubspec.yamlを取得
 */
export async function getPubspecFromGitHub(repoUrl: string, githubToken?: string): Promise<string> {
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
    `https://api.github.com/repos/${owner}/${repo}/contents/pubspec.yaml`,
    { headers, timeout: 10000 }
  );
  
  return Buffer.from(response.data.content, 'base64').toString('utf-8');
}

