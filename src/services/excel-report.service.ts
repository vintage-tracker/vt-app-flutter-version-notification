import ExcelJS from 'exceljs';
import { CheckResult } from '../types/dependency-types';
import { getVersionUpdateType } from '../utils/version-utils';

/**
 * Excelファイルを生成
 */
export async function generateExcelFile(results: CheckResult[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('依存関係チェック結果');
  
  // ヘッダー行
  worksheet.columns = [
    { header: 'リポジトリ', key: 'repository', width: 20 },
    { header: 'パッケージ名', key: 'package', width: 30 },
    { header: '現在のバージョン', key: 'current', width: 20 },
    { header: '最新バージョン', key: 'latest', width: 20 },
    { header: 'Flutterバージョン', key: 'flutter', width: 25 }
  ];
  
  // ヘッダーのスタイル設定
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  let rowNumber = 2;
  
  for (const result of results) {
    if (result.error) {
      worksheet.addRow({
        repository: result.repository.name,
        package: 'エラー',
        current: result.error,
        latest: '',
        flutter: ''
      });
      worksheet.getRow(rowNumber).font = { color: { argb: 'FFFF0000' } };
      rowNumber++;
      continue;
    }
    
    // Flutterバージョン情報（更新の有無に関わらず表示）
    worksheet.addRow({
      repository: result.repository.name,
      package: 'Flutter SDK',
      current: result.flutter.current,
      latest: result.flutter.latest,
      flutter: result.flutter.updateAvailable 
        ? `${result.flutter.current} → ${result.flutter.latest}`
        : result.flutter.current
    });
    
    // 更新可能な場合はオレンジ色、最新の場合は通常の色
    if (result.flutter.updateAvailable) {
      worksheet.getRow(rowNumber).font = { color: { argb: 'FFFF6600' } };
    }
    rowNumber++;
    
    // パッケージ情報
    for (const pkg of result.packages) {
      worksheet.addRow({
        repository: result.repository.name,
        package: pkg.name,
        current: pkg.current,
        latest: pkg.latest,
        flutter: ''
      });
      
      // 更新可能な場合のみ色分け
      if (pkg.updateAvailable) {
        const updateType = getVersionUpdateType(pkg.current, pkg.latest);
        const row = worksheet.getRow(rowNumber);
        
        if (updateType === 'major') {
          // メジャーバージョンアップ: 赤色
          row.font = { color: { argb: 'FFFF0000' } };
        } else if (updateType === 'minor' || updateType === 'patch') {
          // マイナー/パッチバージョンアップ: 青色
          row.font = { color: { argb: 'FF0066CC' } };
        } else {
          // バージョン判定できない場合: 青色（デフォルト）
          row.font = { color: { argb: 'FF0066CC' } };
        }
      }
      rowNumber++;
    }
  }
  
  // バッファに書き込み
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

