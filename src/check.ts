#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Config, CheckResult } from './types/dependency-types';
import { getLatestFlutterVersion } from './services/flutter-api.service';
import { checkRepository } from './services/repository-checker.service';
import { sendSlackNotification } from './services/slack-notification.service';

/**
 * メイン処理
 */
async function main() {
  const configPath = process.env.REPOSITORIES_CONFIG || path.join(process.cwd(), 'repositories.json');
  
  if (!fs.existsSync(configPath)) {
    console.error(`Error: ${configPath} not found`);
    console.error('Please create repositories.json or set REPOSITORIES_CONFIG environment variable');
    process.exit(1);
  }
  
  const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const githubToken = process.env.GH_TOKEN;
  
  if (!slackToken) {
    console.error('Error: SLACK_BOT_TOKEN environment variable is required');
    process.exit(1);
  }
  
  console.log('🔍 Checking Flutter versions and packages...');
  const latestFlutter = await getLatestFlutterVersion();
  console.log(`✅ Latest Flutter version: ${latestFlutter}`);
  
  const results: CheckResult[] = [];
  for (const repo of config.repositories) {
    console.log(`Checking ${repo.name}...`);
    const result = await checkRepository(repo, latestFlutter, githubToken);
    results.push(result);
  }
  
  console.log('📤 Sending notification to Slack...');
  // チャンネルIDは環境変数で指定（必須）
  const channel = process.env.SLACK_CHANNEL;
  if (!channel) {
    console.error('Error: SLACK_CHANNEL environment variable is required');
    process.exit(1);
  }
  await sendSlackNotification(channel, results, slackToken, latestFlutter);
  console.log('✅ Done!');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
