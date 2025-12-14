import axios from 'axios';

/**
 * pub.devからパッケージの最新バージョンを取得
 */
export async function getLatestPackageVersion(packageName: string): Promise<string> {
  try {
    const response = await axios.get(
      `https://pub.dev/api/packages/${packageName}`,
      { timeout: 10000 }
    );
    
    if (!response.data) {
      throw new Error(`No data returned from pub.dev API for ${packageName}`);
    }
    
    if (!response.data.latest) {
      throw new Error(`No latest version information found for ${packageName}. Response: ${JSON.stringify(response.data).substring(0, 200)}`);
    }
    
    if (!response.data.latest.version) {
      throw new Error(`No version property found in latest for ${packageName}. Latest object: ${JSON.stringify(response.data.latest).substring(0, 200)}`);
    }
    
    return response.data.latest.version;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`Failed to get latest version for ${packageName}: HTTP ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error(`Failed to get latest version for ${packageName}: No response from server`);
      }
    }
    throw new Error(`Failed to get latest version for ${packageName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

