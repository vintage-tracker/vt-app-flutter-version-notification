export interface Repository {
  name: string;
  description?: string;
  url: string;
}

export interface Config {
  repositories: Repository[];
  settings: {
    includeDevDeps?: boolean;
  };
}

export interface FlutterVersion {
  current: string;
  latest: string;
  updateAvailable: boolean;
}

export interface PackageInfo {
  name: string;
  current: string;
  latest: string;
  updateAvailable: boolean;
}

export interface CheckResult {
  repository: Repository;
  flutter: FlutterVersion;
  packages: PackageInfo[];
  error?: string;
}

