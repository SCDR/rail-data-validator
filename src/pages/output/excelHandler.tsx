import ExcelJS from 'exceljs';

export type SimpleColumn = { name: string; label?: string; hidden?: boolean };
export type SectionSpec = {
  title: string;
  columns: SimpleColumn[];
  values: Record<string, any>;
  // 标红的列名集合（该 section 中有错误的字段）
  errorColumns?: string[];
  // 致命错误列名集合（该 section 中触发 fatal 规则的字段）
  fatalColumns?: string[];
  // 三角坑相关错误涉及的列对（遇到这些列对时，在值后追加“▲”）
  trianglePairs?: Array<[string, string]>;
  // 每列错误原因（用于在导出时写入备注/说明行）
  errorReasons?: Record<string, string[]>;
  // 每列致命错误原因（若存在，则在备注中加粗并前置“【致命】”）
  fatalReasons?: Record<string, string[]>;
  // 新增：参考值（普通分段为单行）
  references?: Record<string, any>;
  // 新增：尖轨降低值分段的双参考行（距尖长/计划）
  switchRailReferences?: Record<string, { distanceLength?: any; plan?: any }>;
};

// 导出报表顶部“元数据”表结构（来自记录页与登录用户信息）
export type ExportMetadata = {
  project?: string;
  operator?: string;
  deviceId?: string;
  note?: string;
  uid?: string;
  createdAt?: number; // 记录创建时间（毫秒）
  exportAt?: number; // 导出时间（毫秒）
  // 分别记录：保存该记录时的用户与导出报表时的用户
  recordUser?: {
    name?: string;
    userid?: string;
    group?: string;
    title?: string;
    access?: string;
  };
  exportUser?: {
    name?: string;
    userid?: string;
    group?: string;
    title?: string;
    access?: string;
  };
  // 兼容旧字段（若仍传入 user，则视为导出用户）
  user?: {
    name?: string;
    userid?: string;
    group?: string;
    title?: string;
    access?: string;
  };
};

// 构建 Excel 工作簿并返回字节缓冲区（Uint8Array）
export async function buildExcelBuffer(
  sections: SectionSpec[],
  meta?: { creator?: string; created?: Date },
  metadataTable?: ExportMetadata,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  if (meta?.creator) wb.creator = meta.creator;
  wb.created = meta?.created ?? new Date();

  // 单工作表：汇总
  const ws = wb.addWorksheet('数据汇总');

  let cursor = 1; // 当前写入的起始行

  const _ensureColWidths = (labels: string[]) => {
    for (let i = 0; i < labels.length; i++) {
      const col = ws.getColumn(i + 1);
      const target = Math.max(10, (labels[i] ?? '').length + 4);
      col.width = Math.max(col.width ?? 0, target);
    }
  };

  // 前四个分段使用统一的列集合：改为取前四段“可见列”的并集，并且补入任何仅在错误中出现的列名，避免遗漏错误原因
  const groupCount = Math.min(4, sections.length);
  const baselineUnionCols: SimpleColumn[] = [];
  const seen = new Set<string>();
  // 先并集可见列，按第1分段顺序优先，其余增量追加
  for (let i = 0; i < groupCount; i++) {
    const cols = (sections[i].columns || []).filter((c) => !c.hidden);
    for (const col of cols) {
      if (!seen.has(col.name)) {
        baselineUnionCols.push(col);
        seen.add(col.name);
      }
    }
  }
  // 若有只在错误中出现、但未加入的列名（例如某分段隐藏列产生错误），则追加这些列，label 通过各分段定义回退为 name
  const findLabel = (n: string): string => {
    for (let i = 0; i < groupCount; i++) {
      const col = (sections[i].columns || []).find((c) => c.name === n);
      if (col) return col.label ?? col.name;
    }
    return n;
  };
  for (let i = 0; i < groupCount; i++) {
    const s = sections[i];
    const extraKeys = new Set<string>();
    (s.errorColumns || []).forEach((k) => extraKeys.add(k));
    (s.fatalColumns || []).forEach((k) => extraKeys.add(k));
    Object.keys(s.errorReasons || {}).forEach((k) => extraKeys.add(k));
    Object.keys(s.fatalReasons || {}).forEach((k) => extraKeys.add(k));
    extraKeys.forEach((k) => {
      if (!seen.has(k)) {
        baselineUnionCols.push({ name: k, label: findLabel(k), hidden: false });
        seen.add(k);
      }
    });
  }
  const baselineNames = baselineUnionCols.map((c) => c.name);
  const baselineLabels = baselineUnionCols.map((c) => c.label ?? c.name);

  const writeSection = (
    section: SectionSpec,
    names: string[],
    labels: string[],
  ) => {
    const hasSwitchRefs = !!section.switchRailReferences;
    const topRows = hasSwitchRefs ? 4 : 3; // 列名 + 参考值(或两行参考值) + 输入值

    // 合并第一列为分段名称，覆盖顶部行（不包含原因行）
    ws.mergeCells(cursor, 1, cursor + topRows - 1, 1);
    const mergedCell = ws.getRow(cursor).getCell(1);
    mergedCell.value = section.title || 'Section';
    mergedCell.font = { bold: true, size: 12 };
    mergedCell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    mergedCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F8F8' },
    };
    mergedCell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };

    // 表头行：第2列为“类型”列（列名/参考值/输入值），第3列开始为各字段表头
    const headerRow = ws.getRow(cursor);
    const typeHeaderCell = headerRow.getCell(2);
    typeHeaderCell.value = '列名';
    typeHeaderCell.font = { bold: true };
    typeHeaderCell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    typeHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAEAEA' },
    };
    typeHeaderCell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
    for (let i = 0; i < labels.length; i++) {
      const cell = headerRow.getCell(i + 3);
      cell.value = labels[i];
      cell.font = { bold: true };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEAEAEA' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    }

    // 参考值行（普通分段 1 行；尖轨降低值 2 行）
    const refRow1 = ws.getRow(cursor + 1);
    const refRow1Type = refRow1.getCell(2);
    refRow1Type.value = hasSwitchRefs ? '距尖长' : '参考值';
    refRow1Type.font = { bold: true };
    refRow1Type.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    refRow1Type.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAEAEA' },
    };
    refRow1Type.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const rv = hasSwitchRefs
        ? section.switchRailReferences?.[name]?.distanceLength
        : section.references?.[name];
      const cell = refRow1.getCell(i + 3);
      cell.value =
        rv === undefined || rv === null
          ? ''
          : typeof rv === 'object'
            ? JSON.stringify(rv)
            : String(rv);
      cell.font = { bold: true };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEAEAEA' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      };
    }

    if (hasSwitchRefs) {
      const refRow2 = ws.getRow(cursor + 2);
      const refRow2Type = refRow2.getCell(2);
      refRow2Type.value = '计划';
      refRow2Type.font = { bold: true };
      refRow2Type.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      refRow2Type.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEAEAEA' },
      };
      refRow2Type.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const rv2 = section.switchRailReferences?.[name]?.plan;
        const cell = refRow2.getCell(i + 3);
        cell.value =
          rv2 === undefined || rv2 === null
            ? ''
            : typeof rv2 === 'object'
              ? JSON.stringify(rv2)
              : String(rv2);
        cell.font = { bold: true };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEAEAEA' },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        };
      }
    }

    // 数据行：第2列写“输入值”，第3列开始写实际数据
    const dataRowIndex = hasSwitchRefs ? cursor + 3 : cursor + 2;
    const dataRow = ws.getRow(dataRowIndex);
    const typeDataCell = dataRow.getCell(2);
    typeDataCell.value = '输入值';
    typeDataCell.font = { bold: true };
    typeDataCell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    typeDataCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAEAEA' },
    };
    typeDataCell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
    const redCols = new Set(section.errorColumns || []);
    const fatalCols = new Set(section.fatalColumns || []);
    const triangleCols = new Set<string>();
    (section.trianglePairs || []).forEach(([a, b]) => {
      triangleCols.add(a);
      triangleCols.add(b);
    });

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const raw = section.values?.[name];
      const isBlank =
        raw === undefined || raw === null || String(raw).trim() === '';
      const v = isBlank
        ? '无数据'
        : typeof raw === 'object'
          ? JSON.stringify(raw)
          : String(raw);
      const cell = dataRow.getCell(i + 3);
      cell.value = triangleCols.has(name) && !isBlank ? `${v} ▲` : v;
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };

      // 空白斜线：使用格纹填充近似表示“斜向边框无需收集”
      if (isBlank) {
        cell.fill = {
          type: 'pattern',
          pattern: 'lightTrellis',
          fgColor: { argb: 'FFFFFFFF' },
          bgColor: { argb: 'FFEFEFEF' },
        } as any;
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        };
      }

      // 错误标红；fatal 使用更强提示（白字+深红底）
      if (redCols.has(name)) {
        const isFatal = fatalCols.has(name);
        if (isFatal) {
          // 致命错误：白色粗体 + 深红底色
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFCC0000' },
          };
        } else {
          // 普通错误：红字 + 浅红底（非空）
          cell.font = { color: { argb: 'FFFF0000' } };
          if (!isBlank) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFEAEA' },
            };
          }
        }
      }
    }

    // 错误原因行（在数据行之后，逐列写入原因摘要）
    const reasonRow = ws.getRow(dataRowIndex + 1);
    const reasonMap = section.errorReasons || {};
    const fatalReasonMap = section.fatalReasons || {};
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const normalMsgs = (reasonMap[name] || []).filter(Boolean);
      const fatalMsgs = (fatalReasonMap[name] || []).filter(Boolean);
      const markedFatalMsgs = fatalMsgs.map((m) => `【致命】${m}`);
      const msgs = [...markedFatalMsgs, ...normalMsgs];
      const text = msgs.length > 0 ? msgs.join('；') : '';
      const cell = reasonRow.getCell(i + 3);
      cell.value = text;
      // 若该列存在致命错误，则原因行加粗显示
      const isFatal = fatalCols.has(name);
      cell.font = {
        color: { argb: 'FFCC0000' },
        italic: !isFatal,
        bold: isFatal,
        size: 9,
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        right: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      };
    }

    // 宽度优化：第1列标题，第2列类型，其他列按表头长度
    ws.getColumn(1).width = Math.max(
      ws.getColumn(1).width ?? 0,
      Math.max(12, (section.title || '').length + 6),
    );
    ws.getColumn(2).width = Math.max(ws.getColumn(2).width ?? 0, 10);
    for (let i = 0; i < labels.length; i++) {
      const col = ws.getColumn(i + 3);
      const target = Math.max(10, (labels[i] ?? '').length + 4);
      col.width = Math.max(col.width ?? 0, target);
    }

    // 空行分隔：顶部行（含参考）+ 1 行原因 + 1 行空行
    cursor += topRows + 2;
  };

  // 顶部“元数据”表：横向排列（第1列合并为标题，第2列开始依次为各字段表头，下一行是对应值）
  const writeMetadataTable = (meta?: ExportMetadata) => {
    const entries: Array<{ label: string; value: string }> = [];
    const dt = (ms?: number) => (ms ? new Date(ms).toLocaleString() : '—');
    // 分别处理记录的用户与导出的用户（旧的 user 字段回退为导出用户）
    const ru = meta?.recordUser ?? {};
    const eu = meta?.exportUser ?? meta?.user ?? {};
    entries.push({
      label: '项目/线路',
      value: String(meta?.project ?? '未填写'),
    });
    entries.push({
      label: '操作员',
      value: String(meta?.operator ?? '未填写'),
    });
    entries.push({
      label: '设备标识',
      value: String(meta?.deviceId ?? '未填写'),
    });
    entries.push({ label: '备注', value: String(meta?.note ?? '未填写') });
    entries.push({ label: '记录UID', value: String(meta?.uid ?? '—') });
    entries.push({ label: '记录创建时间', value: dt(meta?.createdAt) });
    entries.push({ label: '导出时间', value: dt(meta?.exportAt) });
    entries.push({
      label: '记录用户',
      value: [ru.name, ru.userid].filter(Boolean).join(' / ') || '—',
    });
    entries.push({
      label: '记录分组/角色',
      value: [ru.group, ru.title, ru.access].filter(Boolean).join(' / ') || '—',
    });
    entries.push({
      label: '导出用户',
      value: [eu.name, eu.userid].filter(Boolean).join(' / ') || '—',
    });
    entries.push({
      label: '导出分组/角色',
      value: [eu.group, eu.title, eu.access].filter(Boolean).join(' / ') || '—',
    });

    // 合并标题列占两行
    ws.mergeCells(cursor, 1, cursor + 1, 1);
    const titleCell = ws.getRow(cursor).getCell(1);
    titleCell.value = '元数据';
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F8F8' },
    };
    titleCell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };

    // 表头行：从第2列开始横向写入各字段名
    const headerRow = ws.getRow(cursor);
    for (let i = 0; i < entries.length; i++) {
      const cell = headerRow.getCell(i + 2);
      cell.value = entries[i].label;
      cell.font = { bold: true };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEAEAEA' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    }

    // 数据行：对应值横向写入
    const dataRow = ws.getRow(cursor + 1);
    for (let i = 0; i < entries.length; i++) {
      const cell = dataRow.getCell(i + 2);
      cell.value = entries[i].value;
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      };
    }

    // 列宽优化：第1列为标题，其余列按表头长度扩展
    ws.getColumn(1).width = Math.max(ws.getColumn(1).width ?? 0, 12);
    for (let i = 0; i < entries.length; i++) {
      const col = ws.getColumn(i + 2);
      const target = Math.max(12, entries[i].label.length + 4);
      col.width = Math.max(col.width ?? 0, target);
    }

    // 空行分隔
    cursor += 3;
  };

  // “其他”分段自定义排版：每个数据项=4×1（名称）+4×3（文本），每行两个数据项
  const writeOtherSection = (section: SectionSpec) => {
    const visibleCols = (section.columns || []).filter((c) => !c.hidden);
    const items = visibleCols.map((c) => ({
      title: c.label ?? c.name,
      name: c.name,
      value: section.values?.[c.name],
    }));

    const itemWidth = 4; // 合并列数
    const itemNameHeight = 1; // 名称行高（合并行数）
    const itemContentHeight = 3; // 内容行高（合并行数）
    const itemHeight = itemNameHeight + itemContentHeight; // 单项总高度
    const itemsPerRow = 2; // 每行两个数据项

    const rowGroups = Math.max(1, Math.ceil(items.length / itemsPerRow));
    const totalRows = rowGroups * itemHeight;

    // 标题列：合并整个分段高度
    ws.mergeCells(cursor, 1, cursor + totalRows - 1, 1);
    const titleCell = ws.getRow(cursor).getCell(1);
    titleCell.value = section.title || '其他';
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F8F8' },
    };
    titleCell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };

    // 布局每个数据项
    for (let idx = 0; idx < items.length; idx++) {
      const groupIndex = Math.floor(idx / itemsPerRow);
      const colIndexInGroup = idx % itemsPerRow; // 0 或 1

      const startRow = cursor + groupIndex * itemHeight;
      const startCol = 2 + colIndexInGroup * itemWidth;

      const { title, value } = items[idx];
      const raw = value;
      const isBlank =
        raw === undefined || raw === null || String(raw).trim() === '';
      const text = isBlank
        ? '无数据'
        : typeof raw === 'object'
          ? JSON.stringify(raw)
          : String(raw);

      // 名称单元格：合并 4×1
      ws.mergeCells(startRow, startCol, startRow, startCol + itemWidth - 1);
      const nameCell = ws.getRow(startRow).getCell(startCol);
      nameCell.value = title;
      nameCell.font = { bold: true };
      nameCell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      nameCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEAEAEA' },
      };
      nameCell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };

      // 内容单元格：合并 4×3
      ws.mergeCells(
        startRow + 1,
        startCol,
        startRow + itemHeight - 1,
        startCol + itemWidth - 1,
      );
      const contentCell = ws.getRow(startRow + 1).getCell(startCol);
      contentCell.value = text;
      contentCell.alignment = {
        vertical: 'top',
        horizontal: 'left',
        wrapText: true,
      };
      contentCell.border = {
        top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      };

      if (isBlank) {
        contentCell.fill = {
          type: 'pattern',
          pattern: 'lightTrellis',
          fgColor: { argb: 'FFFFFFFF' },
          bgColor: { argb: 'FFEFEFEF' },
        } as any;
      }
    }

    // 分隔一空行
    cursor += totalRows + 1;
  };

  // 先写入元数据表
  writeMetadataTable(metadataTable);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const visibleCols = section.columns.filter((c) => !c.hidden);
    const localNames = visibleCols.map((c) => c.name);
    const localLabels = visibleCols.map((c) => c.label ?? c.name);

    if (section.title === '其他') {
      // 特殊排版的“其他”分段
      writeOtherSection(section);
    } else if (i < groupCount) {
      // 前四个分段按照基准列名/表头输出，缺失值斜线表示无需收集
      writeSection(section, baselineNames, baselineLabels);
    } else {
      // 其他分段保持自身列集
      writeSection(section, localNames, localLabels);
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
}
