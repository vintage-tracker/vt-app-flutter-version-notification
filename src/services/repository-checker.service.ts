import * as yaml from 'yaml';
import { Repository, CheckResult, FlutterVersion, PackageInfo } from '../types/dependency-types';
import { getLatestFlutterVersion } from './flutter-api.service';
import { getPubspecFromGitHub } from './github-api.service';
import { getLatestPackageVersion } from './pub-dev-api.service';
import { getFlutterVersionFromPubspec, extractDependencies } from '../utils/pubspec-utils';
import { isUpdateAvailable } from '../utils/version-utils';

/**
 * リポジトリをチェック
 */
export async function checkRepository(
  repository: Repository,
  latestFlutter: string,
  githubToken?: string
): Promise<CheckResult> {
  try {
    console.log(`  📥 Fetching pubspec.yaml from ${repository.url}...`);
    const pubspecContent = await getPubspecFromGitHub(repository.url, githubToken);
    console.log(`  ✅ pubspec.yaml fetched (${pubspecContent.length} bytes)`);
    
    const pubspec = yaml.parse(pubspecContent);
    if (!pubspec) {
      throw new Error('Failed to parse pubspec.yaml: result is null');
    }
    console.log(`  ✅ pubspec.yaml parsed successfully`);
    
    const currentFlutter = getFlutterVersionFromPubspec(pubspecContent) || latestFlutter;
    const flutter: FlutterVersion = {
      current: currentFlutter,
      latest: latestFlutter,
      updateAvailable: currentFlutter !== latestFlutter
    };
    
    console.log(`  📦 Extracting dependencies...`);
    const dependencies = extractDependencies(pubspec, true);
    console.log(`  ✅ Found ${dependencies.length} dependencies`);
    
    const packages: PackageInfo[] = [];
    
    for (const dep of dependencies) {
      if (!dep.version || dep.version === 'any') {
        console.log(`  ⏭️  Skipping ${dep.name}: version is '${dep.version}'`);
        continue;
      }
      if (typeof dep.version === 'string' && (dep.version.includes('git:') || dep.version.includes('path:'))) {
        console.log(`  ⏭️  Skipping ${dep.name}: git/path dependency`);
        continue;
      }
      
      try {
        console.log(`    🔍 Checking ${dep.name} (${dep.version})...`);
        const latest = await getLatestPackageVersion(dep.name);
        const updateAvailable = isUpdateAvailable(dep.version, latest);
        if (updateAvailable) {
          console.log(`    🔄 ${dep.name}: ${dep.version} → ${latest}`);
        }
        packages.push({
          name: dep.name,
          current: dep.version,
          latest,
          updateAvailable
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`    ❌ Failed to check package ${dep.name} (current: ${dep.version}): ${errorMessage}`);
        // エラーが発生したパッケージも結果に含める（エラー情報付き）
        packages.push({
          name: dep.name,
          current: dep.version,
          latest: 'N/A',
          updateAvailable: false
        });
      }
    }
    
    return {
      repository,
      flutter,
      packages
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to check ${repository.name}: ${errorMessage}`);
    return {
      repository,
      flutter: {
        current: 'unknown',
        latest: latestFlutter,
        updateAvailable: false
      },
      packages: [],
      error: errorMessage
    };
  }
}

