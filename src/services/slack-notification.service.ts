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
    
    console.log(`📎 Uploading file: ${filename} (${excelBuffer.length} bytes)`);
    console.log(`📍 Channel: ${channel}, Thread: ${messageResponse.ts || 'N/A'}`);
    
    // Step 1: アップロードURLを取得
    console.log('🔗 Step 1: Getting upload URL...');
    const getUploadURLResponse = await slack.files.getUploadURLExternal({
      filename: filename,
      length: excelBuffer.length
    });
    
    if (!getUploadURLResponse.ok || !getUploadURLResponse.upload_url || !getUploadURLResponse.file_id) {
      console.error('Upload URL response:', JSON.stringify(getUploadURLResponse, null, 2));
      throw new Error(getUploadURLResponse.error || 'Failed to get upload URL');
    }
    
    const uploadUrl = getUploadURLResponse.upload_url;
    const fileId = getUploadURLResponse.file_id;
    console.log(`✅ Got upload URL and file ID: ${fileId}`);
    
    // Step 2: ファイルをアップロード（fetchを使用）
    console.log('📤 Step 2: Uploading file binary data...');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: excelBuffer,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Length': excelBuffer.length.toString()
      }
    });
    
    if (!uploadResponse.ok) {
      const responseText = await uploadResponse.text();
      console.error('Upload response:', responseText);
      throw new Error(
        `Failed to upload file binary: ${uploadResponse.status} ${uploadResponse.statusText} - ${responseText}`
      );
    }
    
    console.log('✅ File binary uploaded successfully');
    
    // Step 3: アップロード完了を通知（thread_tsを直接指定）
    console.log('🎯 Step 3: Completing upload...');
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
      console.error('Complete upload response:', JSON.stringify(completeUploadResponse, null, 2));
      throw new Error(completeUploadResponse.error || 'Failed to complete upload');
    }
    
    console.log(`✅ File upload completed successfully: ${filename}`);
  } catch (error: any) {
    console.error(`❌ File upload error:`, error.message);
    if (error.data) {
      console.error('Upload error data:', JSON.stringify(error.data, null, 2));
    }
    if (error.response) {
      console.error('Upload error response:', JSON.stringify(error.response, null, 2));
    }
    // Excelファイルのアップロードに失敗しても処理は続行
  }
}

