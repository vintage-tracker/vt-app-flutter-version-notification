import axios from 'axios';
import { WebClient } from '@slack/web-api';
import { CheckResult } from '../types/dependency-types';
import { generateExcelFile } from './excel-report.service';

/**
 * Slackに通知を送信
 */
export async function sendSlackNotification(
  channel: string,
  results: CheckResult[],
  slackToken: string,
  latestFlutter: string
): Promise<void> {
  const slack = new WebClient(slackToken);
  
  const successfulChecks = results.filter(r => !r.error).length;
  const failedChecks = results.filter(r => r.error).length;
  const hasUpdates = results.some(r => 
    !r.error && (r.flutter.updateAvailable || r.packages.some(p => p.updateAvailable))
  );
  
  // 各リポジトリのFlutterバージョン情報を収集
  const flutterVersions: Array<{ repo: string; current: string; latest: string; updateAvailable: boolean }> = [];
  for (const result of results) {
    if (!result.error) {
      flutterVersions.push({
        repo: result.repository.name,
        current: result.flutter.current,
        latest: result.flutter.latest,
        updateAvailable: result.flutter.updateAvailable
      });
    }
  }
  
  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: hasUpdates ? '🔄 Flutter依存関係更新通知' : '✅ Flutter依存関係チェック結果'
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*総リポジトリ数*\n${results.length}個`
        },
        {
          type: 'mrkdwn',
          text: `*成功*\n${successfulChecks}個`
        },
        {
          type: 'mrkdwn',
          text: `*失敗*\n${failedChecks}個`
        },
        {
          type: 'mrkdwn',
          text: `*Flutter SDK最新版*\n${latestFlutter}`
        }
      ]
    }
  ];
  
  // Flutterバージョン情報を表示
  if (flutterVersions.length > 0) {
    const flutterVersionText = flutterVersions
      .map(fv => {
        if (fv.updateAvailable) {
          return `• ${fv.repo}: ${fv.current} → ${fv.latest} 🔄`;
        } else {
          return `• ${fv.repo}: ${fv.current} ✅`;
        }
      })
      .join('\n');
    
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Flutter SDKバージョン*\n${flutterVersionText}`
      }
    });
  }
  
  // 更新があるリポジトリの詳細
  for (const result of results) {
    if (result.error) {
      // 失敗したリポジトリの情報を表示
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*❌ ${result.repository.name}*\nエラー: ${result.error}`
        }
      });
      continue;
    }
    
    const outdatedPackages = result.packages.filter(p => p.updateAvailable);
    const hasFlutterUpdate = result.flutter.updateAvailable;
    
    if (hasFlutterUpdate || outdatedPackages.length > 0) {
      const packageList = outdatedPackages
        .slice(0, 5)
        .map(p => `• ${p.name}: ${p.current} → ${p.latest}`)
        .join('\n');
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${result.repository.name}*\n` +
            (outdatedPackages.length > 0 
              ? `更新可能パッケージ (${outdatedPackages.length}個):\n${packageList}${outdatedPackages.length > 5 ? `\n... 他 ${outdatedPackages.length - 5}個` : ''}`
              : '')
        }
      });
    }
  }
  
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `最終チェック: ${new Date().toLocaleString('ja-JP')}`
      }
    ]
  });
  
  // メッセージを送信
  const messageResponse = await slack.chat.postMessage({
    channel,
    text: hasUpdates ? 'Flutter依存関係更新通知' : 'Flutter依存関係チェック結果',
    blocks,
    username: 'Flutter Version Bot',
    icon_emoji: ':flutter:'
  });
  
  // Excelファイルを生成してスレッドに添付（新しいアップロード方法）
  try {
    console.log('📊 Generating Excel file...');
    const excelBuffer = await generateExcelFile(results);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `flutter-dependency-check-${timestamp}.xlsx`;
    
    // Step 1: アップロードURLを取得
    const getUploadURLResponse = await slack.files.getUploadURLExternal({
      filename: filename,
      length: excelBuffer.length
    });
    
    if (!getUploadURLResponse.ok || !getUploadURLResponse.upload_url || !getUploadURLResponse.file_id) {
      throw new Error(getUploadURLResponse.error || 'Failed to get upload URL');
    }
    
    const uploadUrl = getUploadURLResponse.upload_url;
    const fileId = getUploadURLResponse.file_id;
    
    // Step 2: ファイルをアップロード
    await axios.put(uploadUrl, excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Length': excelBuffer.length.toString()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    // Step 3: アップロード完了を通知（thread_tsを直接指定）
    const completeUploadOptions: any = {
      files: [{
        id: fileId,
        title: 'Flutter依存関係チェック結果'
      }],
      channel_id: channel,
      initial_comment: '📊 詳細なチェック結果をExcelファイルで添付しました。'
    };
    
    // メッセージのタイムスタンプが存在する場合はスレッドに直接投稿
    if (messageResponse.ts) {
      completeUploadOptions.thread_ts = messageResponse.ts;
    }
    
    const completeUploadResponse = await slack.files.completeUploadExternal(completeUploadOptions);
    
    if (!completeUploadResponse.ok) {
      throw new Error(completeUploadResponse.error || 'Failed to complete upload');
    }
    
    console.log('✅ Excel file uploaded to Slack thread');
  } catch (error) {
    console.error('❌ Failed to upload Excel file:', error instanceof Error ? error.message : String(error));
    // Excelファイルのアップロードに失敗しても処理は続行
  }
}

