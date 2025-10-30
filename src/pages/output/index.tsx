import React, { useEffect, useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card,
  Typography,
  Button,
  Drawer,
  Space,
  message,
  Popconfirm,
  Tooltip,
} from 'antd';
import { useIntl, useModel, history } from '@umijs/max';
import {
  FilePdfOutlined,
  FileExcelOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { exportElementToPdfBytes } from '@/utils/PdfUtils';
import { writeFile } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import {
  buildExcelBuffer,
  buildErrorStatsExcelBuffer,
  type SectionSpec,
} from './excelHandler';
import {
  setupDataCollectDB,
  listDataCollectRecords,
  getDataCollectRecordById,
  getDataCollectRecordByUid,
  type DataCollectRecordMeta,
} from '@/pages/dataCollect/dbHandler';
import * as XLSX from 'xlsx';

import { DataOverviewPlain } from '@/pages/dataValidator/dataValidator';
import { DataValidator } from '@/components/Validation/validator';
import { RuleConfigurator } from '@/components/Validation/ruleConfig';
import ComplianceNotice from '@/components/ComplianceNotice';
import { Alert } from 'antd';

const OutputPage: React.FC = () => {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const currentUser =
    (initialState?.currentUser as API.CurrentUser | undefined) || undefined;
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [excelExporting, setExcelExporting] = useState(false);
  const [excelGenerating, setExcelGenerating] = useState(false);
  const [excelHtml, setExcelHtml] = useState<string>('');
  const [excelErrorsOpen, setExcelErrorsOpen] = useState(false);
  const [excelErrorsExporting, setExcelErrorsExporting] = useState(false);
  const [excelErrorsGenerating, setExcelErrorsGenerating] = useState(false);
  const [excelErrorsHtml, setExcelErrorsHtml] = useState<string>('');
  const [datasetIdForPreview, setDatasetIdForPreview] = useState<string>('');
  const [pdfMeta, setPdfMeta] = useState<{
    latestMeta?: DataCollectRecordMeta;
    latestUid?: string;
    latestCreatedAt?: number;
    recordUser?: {
      name?: string;
      userid?: string;
      group?: string;
      title?: string;
      access?: string;
    };
    exportAt?: number;
  }>();
  const excelPreviewCss = `
    #excel-html-preview table { border-collapse: collapse; border-spacing: 0; }
    #excel-html-preview td, #excel-html-preview th { border: 1px solid #d9d9d9; padding: 4px 8px; }
    #excel-html-preview thead th { background: #fafafa; font-weight: 600; }
  `;
  const previewRef = useRef<HTMLDivElement>(null);

  // 概览容器 refs，用于连线标注层
  const straightGaugeOverviewRef = useRef<HTMLDivElement | null>(null);
  const straightHorizontalOverviewRef = useRef<HTMLDivElement | null>(null);
  const curvedGaugeOverviewRef = useRef<HTMLDivElement | null>(null);
  const curvedHorizontalOverviewRef = useRef<HTMLDivElement | null>(null);
  const offsetOverviewRef = useRef<HTMLDivElement | null>(null);
  const straightReducedOverviewRef = useRef<HTMLDivElement | null>(null);
  const curvedReducedOverviewRef = useRef<HTMLDivElement | null>(null);
  const straightGuardOverviewRef = useRef<HTMLDivElement | null>(null);
  const curvedGuardOverviewRef = useRef<HTMLDivElement | null>(null);
  const otherOverviewRef = useRef<HTMLDivElement | null>(null);

  // 预览页需要数据集，用最近保存记录中的 datasetId
  useEffect(() => {
    (async () => {
      try {
        await setupDataCollectDB();
        const recs = await listDataCollectRecords(1, 0);
        if (recs && recs.length > 0) {
          const full = await getDataCollectRecordById(recs[0].id);
          const ds =
            (full as any)?.payload?.references?.datasetId ||
            (full as any)?.payload?.datasetId;
          if (typeof ds === 'string') setDatasetIdForPreview(ds);
        }
      } catch {}
    })();
  }, []);

  // 读取采集到的数据
  const {
    getStraightGauge,
    getStraightHorizontal,
    getCurvedGauge,
    getCurvedHorizontal,
    getOffsetData,
    getStraightReducedValue,
    getCurvedReducedValue,
    getStraightGuardRailFlangeGroove,
    getCurvedGuardRailFlangeGroove,
    getOtherData,
    getUid,
  } = useModel('collectorData');

  // 列定义
  const {
    getStraightGaugeColumnTypes,
    getStraightHorizontalColumnTypes,
    getCurvedGaugeColumnTypes,
    getCurvedHorizontalColumnTypes,
    getOffsetColumnTypes,
    getStraightReducedValueOfSwitchRailColumnTypes,
    getCurvedReducedValueOfSwitchRailColumnTypes,
    getStraightGuardRailFlangeGrooveColumnTypes,
    getCurvedGuardRailFlangeGrooveColumnTypes,
    getOtherColumnTypes,
  } = useModel('columnTypes');

  const straightGaugeColumns = getStraightGaugeColumnTypes();
  const straightHorizontalColumns = getStraightHorizontalColumnTypes();
  const curvedGaugeColumns = getCurvedGaugeColumnTypes();
  const curvedHorizontalColumns = getCurvedHorizontalColumnTypes();
  const offsetColumns = getOffsetColumnTypes();
  const straightReducedColumns =
    getStraightReducedValueOfSwitchRailColumnTypes();
  const curvedReducedColumns = getCurvedReducedValueOfSwitchRailColumnTypes();
  const straightGuardColumns = getStraightGuardRailFlangeGrooveColumnTypes();
  const curvedGuardColumns = getCurvedGuardRailFlangeGrooveColumnTypes();
  const otherColumns = getOtherColumnTypes();

  const safeParse = (s: string | undefined) => {
    try {
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  };

  const sgValues = safeParse(getStraightGauge());
  const shValues = safeParse(getStraightHorizontal());
  const cgValues = safeParse(getCurvedGauge());
  const chValues = safeParse(getCurvedHorizontal());
  const offsetValues = safeParse(getOffsetData());
  const straightReducedValues = safeParse(getStraightReducedValue());
  const curvedReducedValues = safeParse(getCurvedReducedValue());
  const straightGuardValues = safeParse(getStraightGuardRailFlangeGroove());
  const curvedGuardValues = safeParse(getCurvedGuardRailFlangeGroove());
  const otherValues = safeParse(getOtherData());

  const isCompleteBy = (
    values: Record<string, any>,
    columns: { name: string; hidden?: boolean }[],
  ) => {
    if (!values) return false;
    return columns
      .filter((c) => !c.hidden)
      .every((c) => {
        const v = values[c.name];
        return v !== undefined && v !== null && String(v).trim() !== '';
      });
  };
  const isOtherComplete = otherColumns
    .filter((c) => !c.hidden)
    .every((c) => {
      const v = otherValues[c.label];
      return v !== undefined && v !== null && String(v).trim() !== '';
    });

  const _overviewCols = {
    xs: 3,
    sm: 6,
    md: 8,
    lg: 8,
    xl: 12,
    xxl: 12,
  } as const;

  const computeErrors = (
    values: Record<string, any>,
    columns: any[],
    configureRules: (v: DataValidator, cols: any[]) => void,
  ) => {
    try {
      const v = new DataValidator();
      configureRules(v, columns);
      // 注入 datasetId 供自定义规则获取参考值
      return v.validateAll([{ ...values, datasetId: datasetIdForPreview }]);
    } catch {
      return [];
    }
  };

  const straightGaugeErrors = computeErrors(
    sgValues,
    straightGaugeColumns,
    (v, cols) => RuleConfigurator.configureRailRules(v, cols),
  );
  const straightHorizontalErrors = computeErrors(
    shValues,
    straightHorizontalColumns,
    (v, cols) => RuleConfigurator.configureHorizontalRules(v, cols),
  );
  const curvedGaugeErrors = computeErrors(
    cgValues,
    curvedGaugeColumns,
    (v, cols) => RuleConfigurator.configureRailRules(v, cols),
  );
  const curvedHorizontalErrors = computeErrors(
    chValues,
    curvedHorizontalColumns,
    (v, cols) => RuleConfigurator.configureHorizontalRules(v, cols),
  );
  const offsetErrors = computeErrors(offsetValues, offsetColumns, (v, cols) =>
    RuleConfigurator.configureOffsetRules(v, cols),
  );
  const straightReducedErrors = computeErrors(
    straightReducedValues,
    straightReducedColumns,
    (v, cols) => RuleConfigurator.configureSwitchRailReducedRules(v, cols),
  );
  const curvedReducedErrors = computeErrors(
    curvedReducedValues,
    curvedReducedColumns,
    (v, cols) => RuleConfigurator.configureSwitchRailReducedRules(v, cols),
  );
  const straightGuardErrors = computeErrors(
    straightGuardValues,
    straightGuardColumns,
    (v, cols) => RuleConfigurator.configureGuardRailFlangeGrooveRules(v, cols),
  );
  const curvedGuardErrors = computeErrors(
    curvedGuardValues,
    curvedGuardColumns,
    (v, cols) => RuleConfigurator.configureGuardRailFlangeGrooveRules(v, cols),
  );
  const otherErrors: any[] = [];

  const openPreview = () => setOpen(true);
  // 抽屉打开时刷新 PDF 预览所需的 dataset 引用
  const refreshPreviewDataset = async () => {
    try {
      await setupDataCollectDB();
      const uid = getUid?.();
      if (uid && uid.trim() !== '') {
        const full = await getDataCollectRecordByUid(uid);
        const ds =
          (full as any)?.payload?.references?.datasetId ||
          (full as any)?.payload?.datasetId;
        if (typeof ds === 'string') setDatasetIdForPreview(ds);
      } else {
        const recs = await listDataCollectRecords(1, 0);
        if (recs && recs.length > 0) {
          const full = await getDataCollectRecordById(recs[0].id);
          const ds =
            (full as any)?.payload?.references?.datasetId ||
            (full as any)?.payload?.datasetId;
          if (typeof ds === 'string') setDatasetIdForPreview(ds);
        }
      }
    } catch {}
  };

  // 生成 Excel 预览 HTML（抽屉打开时或点击按钮时复用）
  const generateExcelPreview = async () => {
    try {
      setExcelGenerating(true);
      let sections = buildSections();
      // 收集元数据（登录用户 + 最近保存记录的元信息）
      let latestMeta: DataCollectRecordMeta | undefined;
      let latestUid: string | undefined;
      let latestCreatedAt: number | undefined;
      let latestRefs: any | undefined;
      try {
        await setupDataCollectDB();
        const uid = getUid?.();
        if (uid && uid.trim() !== '') {
          const full = await getDataCollectRecordByUid(uid);
          latestMeta = (full as any)?.metadata;
          latestUid = (full as any)?.uid;
          latestCreatedAt = (full as any)?.created_at;
          latestRefs = (full as any)?.payload?.references;
        } else {
          const recs = await listDataCollectRecords(1, 0);
          if (recs && recs.length > 0) {
            latestMeta = recs[0].metadata;
            latestUid = recs[0].uid;
            latestCreatedAt = recs[0].created_at;
            const full = await getDataCollectRecordById(recs[0].id);
            latestRefs = (full as any)?.payload?.references;
          }
        }
      } catch {}
      sections = attachReferencesToSections(sections, latestRefs);

      const recordUser = ((latestMeta as any)?.user || {}) as {
        name?: string;
        userid?: string;
        group?: string;
        title?: string;
        access?: string;
      };
      const buf = await buildExcelBuffer(
        sections,
        { creator: 'Data Validation', created: new Date() },
        {
          project: latestMeta?.project,
          operator: latestMeta?.operator,
          switchId: latestMeta?.switchId,
          note: latestMeta?.note,
          uid: latestUid,
          createdAt: latestCreatedAt,
          exportAt: Date.now(),
          recordUser,
          exportUser: {
            name: currentUser?.name,
            userid: currentUser?.userid,
            group: currentUser?.group,
            title: currentUser?.title,
            access: currentUser?.access,
          },
        },
      );
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const html = XLSX.utils.sheet_to_html(sheet, {
        id: 'excel-preview-table',
      });
      setExcelHtml(html);
    } catch (e: any) {
      console.error(e);
      message.error(
        e?.message ||
          intl.formatMessage({
            id: 'pages.output.preview.excel.fail',
            defaultMessage: '生成 Excel 预览失败',
          }),
      );
    } finally {
      setExcelGenerating(false);
    }
  };

  const openExcelPreview = async () => {
    // 打开抽屉后通过 afterOpenChange 触发生成，避免重复生成
    setExcelOpen(true);
  };

  const openExcelErrorsPreview = async () => {
    setExcelErrorsOpen(true);
  };

  const handleExport = async () => {
    try {
      const uid = getUid?.();
      if (!uid || uid.trim() === '') {
        message.warning('未检测到有效 UID。请在辅助校验的“记录元信息”步骤保存记录，或从历史页加载包含 UID 的记录。');
        return;
      }
      if (!previewRef.current) {
        message.error(
          intl.formatMessage({
            id: 'pages.output.preview.notfound',
            defaultMessage: '预览容器未找到',
          }),
        );
        return;
      }
      setExporting(true);
      const fileName = `data-export-${new Date().toISOString().slice(0, 10)}.pdf`;
      const bytes = await exportElementToPdfBytes(previewRef.current, {
        fileName,
        format: 'a4',
        orientation: 'portrait',
        background: '#ffffff',
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        scale: 2,
      });
      const picked = await save({
        title: intl.formatMessage({
          id: 'pages.output.save.title',
          defaultMessage: '保存导出报告',
        }),
        defaultPath: fileName,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (!picked) {
        message.info(
          intl.formatMessage({
            id: 'pages.output.save.cancel',
            defaultMessage: '已取消保存',
          }),
        );
        return;
      }
      await writeFile(picked, bytes);
      message.success(
        intl.formatMessage({
          id: 'pages.output.export.saved',
          defaultMessage: '已保存到所选位置',
        }),
      );
    } catch (e: any) {
      console.log(e);
      message.error(
        e?.message ||
          intl.formatMessage({
            id: 'pages.output.export.fail',
            defaultMessage: '导出失败',
          }),
      );
    } finally {
      setExporting(false);
    }
  };

  const generateExcelErrorsPreview = async () => {
    try {
      setExcelErrorsGenerating(true);
      let sections = buildSections();
      // 收集元数据（登录用户 + 最近保存记录的元信息）
      let latestMeta: DataCollectRecordMeta | undefined;
      let latestUid: string | undefined;
      let latestCreatedAt: number | undefined;
      try {
        await setupDataCollectDB();
        const uid = getUid?.();
        if (uid && uid.trim() !== '') {
          const full = await getDataCollectRecordByUid(uid);
          latestMeta = (full as any)?.metadata;
          latestUid = (full as any)?.uid;
          latestCreatedAt = (full as any)?.created_at;
        } else {
          const recs = await listDataCollectRecords(1, 0);
          if (recs && recs.length > 0) {
            latestMeta = recs[0].metadata;
            latestUid = recs[0].uid;
            latestCreatedAt = recs[0].created_at;
          }
        }
      } catch {}

      const recordUser = ((latestMeta as any)?.user || {}) as {
        name?: string;
        userid?: string;
        group?: string;
        title?: string;
        access?: string;
      };
      const buf = await buildErrorStatsExcelBuffer(
        sections,
        { creator: 'Data Validation', created: new Date() },
        {
          project: latestMeta?.project,
          operator: latestMeta?.operator,
          switchId: latestMeta?.switchId,
          note: latestMeta?.note,
          uid: latestUid,
          createdAt: latestCreatedAt,
          exportAt: Date.now(),
          recordUser,
          exportUser: {
            name: currentUser?.name,
            userid: currentUser?.userid,
            group: currentUser?.group,
            title: currentUser?.title,
            access: currentUser?.access,
          },
        },
      );
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const html = XLSX.utils.sheet_to_html(sheet, {
        id: 'excel-errors-preview-table',
      });
      setExcelErrorsHtml(html);
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || '生成错误统计预览失败');
    } finally {
      setExcelErrorsGenerating(false);
    }
  };

  const handleExcelErrorsExport = async () => {
    try {
      const uid = getUid?.();
      if (!uid || uid.trim() === '') {
        message.warning('未检测到有效 UID。请在辅助校验的“记录元信息”步骤保存记录，或从历史页加载包含 UID 的记录。');
        return;
      }
      setExcelErrorsExporting(true);
      let sections = buildSections();
      let latestMeta: DataCollectRecordMeta | undefined;
      let latestUid: string | undefined;
      let latestCreatedAt: number | undefined;
      try {
        await setupDataCollectDB();
        if (uid && uid.trim() !== '') {
          const full = await getDataCollectRecordByUid(uid);
          latestMeta = (full as any)?.metadata;
          latestUid = (full as any)?.uid;
          latestCreatedAt = (full as any)?.created_at;
        } else {
          const recs = await listDataCollectRecords(1, 0);
          if (recs && recs.length > 0) {
            latestMeta = recs[0].metadata;
            latestUid = recs[0].uid;
            latestCreatedAt = recs[0].created_at;
          }
        }
      } catch {}

      const recordUser = ((latestMeta as any)?.user || {}) as {
        name?: string;
        userid?: string;
        group?: string;
        title?: string;
        access?: string;
      };
      const buf = await buildErrorStatsExcelBuffer(
        sections,
        { creator: 'Data Validation', created: new Date() },
        {
          project: latestMeta?.project,
          operator: latestMeta?.operator,
          switchId: latestMeta?.switchId,
          note: latestMeta?.note,
          uid: latestUid,
          createdAt: latestCreatedAt,
          exportAt: Date.now(),
          recordUser,
          exportUser: {
            name: currentUser?.name,
            userid: currentUser?.userid,
            group: currentUser?.group,
            title: currentUser?.title,
            access: currentUser?.access,
          },
        },
      );
      const fileName = `error-stats-${new Date().toISOString().slice(0, 10)}.xlsx`;
      const picked = await save({
        title: '保存错误统计 Excel',
        defaultPath: fileName,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });
      if (!picked) {
        message.info('已取消保存');
        return;
      }
      await writeFile(picked, buf);
      message.success('错误统计已保存到所选位置');
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || '导出错误统计失败');
    } finally {
      setExcelErrorsExporting(false);
    }
  };

  // 收集错误列、致命列与三角坑列对
  const collectErrorInfo = (errors: any[]) => {
    console.log(errors);

    const red = new Set<string>();
    const fatal = new Set<string>();
    const tri: Array<[string, string]> = [];
    const reasons: Record<string, string[]> = {};
    const fatalReasons: Record<string, string[]> = {};
    (errors || []).forEach((e) => {
      const cols: string[] = e?.columnNames || e?.columns || [];
      const rn = String(e?.ruleName || '').toLowerCase();
      const msg = String(e?.message || '');
      const isFatal = rn.endsWith('_fatal');
      cols.forEach((c) => {
        red.add(c);
        if (isFatal) fatal.add(c);
        if (isFatal) {
          if (!fatalReasons[c]) fatalReasons[c] = [];
          if (msg && !fatalReasons[c].includes(msg)) fatalReasons[c].push(msg);
        } else {
          if (!reasons[c]) reasons[c] = [];
          if (msg && !reasons[c].includes(msg)) reasons[c].push(msg);
        }
      });
      const isTri =
        rn.includes('triangle_depression') ||
        rn.includes('triangledepression') ||
        msg.includes('三角坑');
      if (isTri && cols.length >= 2) tri.push([cols[0], cols[1]]);
    });
    return {
      errorColumns: Array.from(red),
      fatalColumns: Array.from(fatal),
      trianglePairs: tri,
      errorReasons: reasons,
      fatalReasons,
    };
  };

  // 构造 Excel Sections（带错误信息）
  const buildSections = (): SectionSpec[] => {
    const sections: SectionSpec[] = [
      {
        title: '直轨-轨距',
        columns: straightGaugeColumns,
        values: sgValues,
        ...collectErrorInfo(straightGaugeErrors),
      },
      {
        title: '直轨-水平',
        columns: straightHorizontalColumns,
        values: shValues,
        ...collectErrorInfo(straightHorizontalErrors),
      },
      {
        title: '曲轨-轨距',
        columns: curvedGaugeColumns,
        values: cgValues,
        ...collectErrorInfo(curvedGaugeErrors),
      },
      {
        title: '曲轨-水平',
        columns: curvedHorizontalColumns,
        values: chValues,
        ...collectErrorInfo(curvedHorizontalErrors),
      },
      {
        title: '支距',
        columns: offsetColumns,
        values: offsetValues,
        ...collectErrorInfo(offsetErrors),
      },
      {
        title: '直轨-尖轨降低值',
        columns: straightReducedColumns,
        values: straightReducedValues,
        ...collectErrorInfo(straightReducedErrors),
      },
      {
        title: '曲轨-尖轨降低值',
        columns: curvedReducedColumns,
        values: curvedReducedValues,
        ...collectErrorInfo(curvedReducedErrors),
      },
      {
        title: '直轨-护轨轮缘槽',
        columns: straightGuardColumns,
        values: straightGuardValues,
        ...collectErrorInfo(straightGuardErrors),
      },
      {
        title: '曲轨-护轨轮缘槽',
        columns: curvedGuardColumns,
        values: curvedGuardValues,
        ...collectErrorInfo(curvedGuardErrors),
      },
      {
        title: '其他',
        columns: otherColumns.map((c: any) => ({ ...c, name: c.label })),
        values: otherValues,
        ...collectErrorInfo(otherErrors),
      },
    ];
    return sections;
  };

  // 将参考值附加到 Sections
  const attachReferencesToSections = (
    sections: SectionSpec[],
    refs?: any,
  ): SectionSpec[] => {
    if (!refs || typeof refs !== 'object') return sections;
    return sections.map((s) => {
      switch (s.title) {
        case '直轨-轨距':
          return { ...s, references: refs.straightGauge };
        case '直轨-水平':
          return { ...s, references: refs.straightHorizontal };
        case '曲轨-轨距':
          return { ...s, references: refs.curvedGauge };
        case '曲轨-水平':
          return { ...s, references: refs.curvedHorizontal };
        case '支距':
          return { ...s, references: refs.offset };
        case '直轨-尖轨降低值':
          return { ...s, switchRailReferences: refs.straightReduced };
        case '曲轨-尖轨降低值':
          return { ...s, switchRailReferences: refs.curvedReduced };
        case '直轨-护轨轮缘槽':
          return { ...s, references: refs.straightGuard };
        case '曲轨-护轨轮缘槽':
          return { ...s, references: refs.curvedGuard };
        case '其他':
          return s;
        default:
          return s;
      }
    });
  };

  const formatPreviewValue = (v: any) => {
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  const _toAntdColumns = (cols: any[]) =>
    cols
      .filter((c) => !c.hidden)
      .map((c) => ({
        title: c.label ?? c.name,
        dataIndex: c.name,
      }));
  const _toAntdData = (values: Record<string, any>, cols: any[]) => {
    const obj: Record<string, any> = {};
    cols
      .filter((c) => !c.hidden)
      .forEach((c) => {
        obj[c.name] = formatPreviewValue(values?.[c.name]);
      });
    return [obj];
  };

  const handleExcelExport = async () => {
    try {
      const uid = getUid?.();
      if (!uid || uid.trim() === '') {
        message.warning('未检测到有效 UID。请在辅助校验的“记录元信息”步骤保存记录，或从历史页加载包含 UID 的记录。');
        return;
      }
      setExcelExporting(true);
      let sections = buildSections();
      // 收集元数据用于写入表头
      // 顶层已获取 currentUser
      let latestMeta: DataCollectRecordMeta | undefined;
      let latestUid: string | undefined;
      let latestCreatedAt: number | undefined;
      let latestRefs: any | undefined;
      try {
        await setupDataCollectDB();
        if (uid && uid.trim() !== '') {
          const full = await getDataCollectRecordByUid(uid);
          latestMeta = (full as any)?.metadata;
          latestUid = (full as any)?.uid;
          latestCreatedAt = (full as any)?.created_at;
          latestRefs = (full as any)?.payload?.references;
        } else {
          const recs = await listDataCollectRecords(1, 0);
          if (recs && recs.length > 0) {
            latestMeta = recs[0].metadata;
            latestUid = recs[0].uid;
            latestCreatedAt = recs[0].created_at;
            const full = await getDataCollectRecordById(recs[0].id);
            latestRefs = (full as any)?.payload?.references;
          }
        }
      } catch {}
      sections = attachReferencesToSections(sections, latestRefs);

      const recordUser = ((latestMeta as any)?.user || {}) as {
        name?: string;
        userid?: string;
        group?: string;
        title?: string;
        access?: string;
      };
      const buf = await buildExcelBuffer(
        sections,
        { creator: 'Data Validation', created: new Date() },
        {
          project: latestMeta?.project,
          operator: latestMeta?.operator,
          switchId: latestMeta?.switchId,
          note: latestMeta?.note,
          uid: latestUid,
          createdAt: latestCreatedAt,
          exportAt: Date.now(),
          recordUser,
          exportUser: {
            name: currentUser?.name,
            userid: currentUser?.userid,
            group: currentUser?.group,
            title: currentUser?.title,
            access: currentUser?.access,
          },
        },
      );
      const fileName = `data-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      const picked = await save({
        title: intl.formatMessage({
          id: 'pages.output.save.title.excel',
          defaultMessage: '保存 Excel 报表',
        }),
        defaultPath: fileName,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });
      if (!picked) {
        message.info(
          intl.formatMessage({
            id: 'pages.output.save.cancel',
            defaultMessage: '已取消保存',
          }),
        );
        return;
      }
      await writeFile(picked, buf);
      message.success(
        intl.formatMessage({
          id: 'pages.output.export.saved.excel',
          defaultMessage: 'Excel 已保存到所选位置',
        }),
      );
    } catch (e: any) {
      console.error(e);
      message.error(
        e?.message ||
          intl.formatMessage({
            id: 'pages.output.export.fail.excel',
            defaultMessage: '导出 Excel 失败',
          }),
      );
    } finally {
      setExcelExporting(false);
    }
  };

  return (
    <PageContainer>
      <Space direction="vertical" style={{ width: '100%' }}>
              <ComplianceNotice style={{ marginTop: 12 }} />
              <Alert
                    type="warning"
                  showIcon
                    style={{ fontSize: 14 }}
                    message=
                      "数据必须在辅助校验页面-元数据步骤中保存过，才能进行导出操作。"
                  />
        <Card title="导出为PDF">
          <Button
            key="preview"
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={openPreview}
          >
            {intl.formatMessage({
              id: 'pages.output.preview.open',
              defaultMessage: '导出为 PDF',
            })}
          </Button>
        </Card>
        <Card title="导出为Excel">
          <Button
            key="excel"
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={openExcelPreview}
          >
            {intl.formatMessage({
              id: 'pages.output.preview.open.excel',
              defaultMessage: '导出为 Excel',
            })}
          </Button>
          <Button
            key="excel-errors"
            type="primary"
            style={{ marginLeft: 12 }}
            icon={<FileExcelOutlined />}
            onClick={openExcelErrorsPreview}
          >
            导出错误统计
          </Button>
        </Card>
      </Space>

      <Drawer
        title={intl.formatMessage({
          id: 'pages.output.preview.title',
          defaultMessage: '导出预览',
        })}
        open={open}
        onClose={() => setOpen(false)}
        width={720}
        destroyOnHidden
        afterOpenChange={(o) => {
          if (o) {
            void refreshPreviewDataset();
            (async () => {
              try {
                await setupDataCollectDB();
                const uid = getUid?.();
                if (uid && uid.trim() !== '') {
                  const full = await getDataCollectRecordByUid(uid);
                  const latestMeta = (full as any)?.metadata;
                  const latestUid = (full as any)?.uid;
                  const latestCreatedAt = (full as any)?.created_at;
                  const recordUser = ((latestMeta as any)?.user || {}) as {
                    name?: string;
                    userid?: string;
                    group?: string;
                    title?: string;
                    access?: string;
                  };
                  setPdfMeta({
                    latestMeta,
                    latestUid,
                    latestCreatedAt,
                    recordUser,
                    exportAt: Date.now(),
                  });
                } else {
                  const recs = await listDataCollectRecords(1, 0);
                  if (recs && recs.length > 0) {
                    const latestMeta = recs[0].metadata;
                    const latestUid = recs[0].uid;
                    const latestCreatedAt = recs[0].created_at;
                    const recordUser = ((latestMeta as any)?.user || {}) as {
                      name?: string;
                      userid?: string;
                      group?: string;
                      title?: string;
                      access?: string;
                    };
                    setPdfMeta({
                      latestMeta,
                      latestUid,
                      latestCreatedAt,
                      recordUser,
                      exportAt: Date.now(),
                    });
                  } else {
                    setPdfMeta({ exportAt: Date.now() });
                  }
                }
              } catch {
                setPdfMeta({ exportAt: Date.now() });
              }
            })();
          }
        }}
        extra={
          <Space>
            {(() => {
              const disabled = !getUid?.() || getUid?.().trim() === '';
              const tip = '需保存当前数据或从历史记录加载数据';
              return (
                <Tooltip title={disabled ? tip : undefined}>
                    <Popconfirm
                      title={`提示`}
                      description={
                        <span>
                          导出的数据仅用于<strong>辅助数据收集</strong>与
                          <strong>校验</strong>工作，<strong>不</strong>
                          构成任何检测、认证或安全评估结论，用户<strong>必须</strong>
                          对输出结果进行<strong>人工复核</strong>。
                        </span>
                      }
                      onConfirm={handleExport}
                    >
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        loading={exporting}
                        disabled={disabled}
                      >
                        {intl.formatMessage({
                          id: 'pages.output.export.now',
                          defaultMessage: '导出 PDF',
                        })}
                      </Button>
                    </Popconfirm>
                </Tooltip>
              );
            })()}
          </Space>
        }
      >
        <div
          id="output-pdf-preview"
          ref={previewRef}
          style={{
            background: '#ffffff',
            padding: 24,
            border: '1px solid #f0f0f0',
          }}
        >
          {/* 元数据与错误摘要 */}

          {/* 使用数据概览组件，包含校验标注 */}
          <Space size="small" direction="vertical" style={{ width: '100%' }}>
            <div style={{ fontSize: 6, lineHeight: '14px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 4,
                }}
              >
                <div>
                  <span style={{ color: '#888' }}>项目：</span>
                  {pdfMeta?.latestMeta?.project ?? '未填写'}
                </div>
                <div>
                  <span style={{ color: '#888' }}>作业员：</span>
                  {pdfMeta?.latestMeta?.operator ?? '未填写'}
                </div>
                <div>
                  <span style={{ color: '#888' }}>道岔编号：</span>
                  {pdfMeta?.latestMeta?.switchId ?? '未填写'}
                </div>
                <div>
                  <span style={{ color: '#888' }}>记录 UID：</span>
                  {pdfMeta?.latestUid ?? '——'}
                </div>
                <div>
                  <span style={{ color: '#888' }}>记录时间：</span>
                  {pdfMeta?.latestCreatedAt
                    ? new Date(pdfMeta.latestCreatedAt).toLocaleString()
                    : '——'}
                </div>
                <div>
                  <span style={{ color: '#888' }}>导出时间：</span>
                  {pdfMeta?.exportAt
                    ? new Date(pdfMeta.exportAt).toLocaleString()
                    : '——'}
                </div>
                <div>
                  <span style={{ color: '#888' }}>记录用户：</span>
                  {pdfMeta?.recordUser?.name ?? '——'}（
                  {pdfMeta?.recordUser?.group ?? '——'}）
                </div>
                <div>
                  <span style={{ color: '#888' }}>导出用户：</span>
                  {currentUser?.name ?? '——'}（{currentUser?.group ?? '——'}）
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: '#888' }}>备注：</span>
                  {pdfMeta?.latestMeta?.note ?? '——'}
                </div>
              </div>
            </div>
            <DataOverviewPlain
              title="直轨 - 轨距数据概览"
              isEditing={false}
              onToggleEdit={() => {}}
              onSaveEdit={() => {}}
              onCancelEdit={() => {}}
              isComplete={isCompleteBy(sgValues, straightGaugeColumns)}
              onNavigateToCollect={() => history.push('/data/collect')}
              containerRef={straightGaugeOverviewRef}
              section="straightGauge"
              columns={straightGaugeColumns}
              values={sgValues}
              errors={straightGaugeErrors}
              column={16}
              descriptionSize="small"
              fontSize={6}
              descriptionStyle={{ margin: 0 }}
              containerStyle={{ marginBottom: 8 }}
              onFieldChange={() => {}}
              datasetId={datasetIdForPreview}
            />

            <DataOverviewPlain
              title="直轨 - 水平数据概览"
              isEditing={false}
              onToggleEdit={() => {}}
              onSaveEdit={() => {}}
              onCancelEdit={() => {}}
              isComplete={isCompleteBy(shValues, straightHorizontalColumns)}
              onNavigateToCollect={() => history.push('/data/collect')}
              containerRef={straightHorizontalOverviewRef}
              section="straightHorizontal"
              columns={straightHorizontalColumns}
              values={shValues}
              errors={straightHorizontalErrors}
              column={12}
              descriptionSize="small"
              fontSize={6}
              descriptionStyle={{ margin: 0 }}
              containerStyle={{ marginBottom: 8 }}
              onFieldChange={() => {}}
              datasetId={datasetIdForPreview}
            />

            <DataOverviewPlain
              title="曲轨 - 轨距数据概览"
              isEditing={false}
              onToggleEdit={() => {}}
              onSaveEdit={() => {}}
              onCancelEdit={() => {}}
              isComplete={isCompleteBy(cgValues, curvedGaugeColumns)}
              onNavigateToCollect={() => history.push('/data/collect')}
              containerRef={curvedGaugeOverviewRef}
              section="curvedGauge"
              columns={curvedGaugeColumns}
              values={cgValues}
              errors={curvedGaugeErrors}
              column={11}
              descriptionSize="small"
              fontSize={6}
              descriptionStyle={{ margin: 0 }}
              containerStyle={{ marginBottom: 8 }}
              onFieldChange={() => {}}
              datasetId={datasetIdForPreview}
            />

            <DataOverviewPlain
              title="曲轨 - 水平数据概览"
              isEditing={false}
              onToggleEdit={() => {}}
              onSaveEdit={() => {}}
              onCancelEdit={() => {}}
              isComplete={isCompleteBy(chValues, curvedHorizontalColumns)}
              onNavigateToCollect={() => history.push('/data/collect')}
              containerRef={curvedHorizontalOverviewRef}
              section="curvedHorizontal"
              columns={curvedHorizontalColumns}
              values={chValues}
              errors={curvedHorizontalErrors}
              column={8}
              descriptionSize="small"
              fontSize={6}
              descriptionStyle={{ margin: 0 }}
              containerStyle={{ marginBottom: 8 }}
              onFieldChange={() => {}}
              datasetId={datasetIdForPreview}
            />
            <DataOverviewPlain
              title="支距 - 数据概览"
              isEditing={false}
              onToggleEdit={() => {}}
              onSaveEdit={() => {}}
              onCancelEdit={() => {}}
              isComplete={isCompleteBy(offsetValues, offsetColumns)}
              onNavigateToCollect={() => history.push('/data/collect')}
              containerRef={offsetOverviewRef}
              section="offset"
              columns={offsetColumns}
              values={offsetValues}
              errors={offsetErrors}
              column={9}
              descriptionSize="small"
              fontSize={6}
              descriptionStyle={{ margin: 0 }}
              containerStyle={{ marginBottom: 8 }}
              onFieldChange={() => {}}
              datasetId={datasetIdForPreview}
            />

            <DataOverviewPlain
              title="直轨尖轨降低值 - 数据概览"
              isEditing={false}
              onToggleEdit={() => {}}
              onSaveEdit={() => {}}
              onCancelEdit={() => {}}
              isComplete={isCompleteBy(
                straightReducedValues,
                straightReducedColumns,
              )}
              onNavigateToCollect={() => history.push('/data/collect')}
              containerRef={straightReducedOverviewRef}
              section="straightReduced"
              columns={straightReducedColumns}
              values={straightReducedValues}
              errors={straightReducedErrors}
              column={8}
              descriptionSize="small"
              fontSize={6}
              descriptionStyle={{ margin: 0 }}
              containerStyle={{ marginBottom: 8 }}
              onFieldChange={() => {}}
              datasetId={datasetIdForPreview}
            />

            <DataOverviewPlain
              title="曲轨尖轨降低值 - 数据概览"
              isEditing={false}
              onToggleEdit={() => {}}
              onSaveEdit={() => {}}
              onCancelEdit={() => {}}
              isComplete={isCompleteBy(
                curvedReducedValues,
                curvedReducedColumns,
              )}
              onNavigateToCollect={() => history.push('/data/collect')}
              containerRef={curvedReducedOverviewRef}
              section="curvedReduced"
              columns={curvedReducedColumns}
              values={curvedReducedValues}
              errors={curvedReducedErrors}
              column={8}
              descriptionSize="small"
              fontSize={6}
              descriptionStyle={{ margin: 0 }}
              containerStyle={{ marginBottom: 8 }}
              onFieldChange={() => {}}
              datasetId={datasetIdForPreview}
            />

            <DataOverviewPlain
              title="直轨护轨轮缘槽 - 数据概览"
              isEditing={false}
              onToggleEdit={() => {}}
              onSaveEdit={() => {}}
              onCancelEdit={() => {}}
              isComplete={isCompleteBy(
                straightGuardValues,
                straightGuardColumns,
              )}
              onNavigateToCollect={() => history.push('/data/collect')}
              containerRef={straightGuardOverviewRef}
              section="straightGuard"
              columns={straightGuardColumns}
              values={straightGuardValues}
              errors={straightGuardErrors}
              column={8}
              descriptionSize="small"
              fontSize={6}
              descriptionStyle={{ margin: 0 }}
              containerStyle={{ marginBottom: 8 }}
              onFieldChange={() => {}}
              datasetId={datasetIdForPreview}
            />

            <DataOverviewPlain
              title="曲轨护轨轮缘槽 - 数据概览"
              isEditing={false}
              onToggleEdit={() => {}}
              onSaveEdit={() => {}}
              onCancelEdit={() => {}}
              isComplete={isCompleteBy(curvedGuardValues, curvedGuardColumns)}
              onNavigateToCollect={() => history.push('/data/collect')}
              containerRef={curvedGuardOverviewRef}
              section="curvedGuard"
              columns={curvedGuardColumns}
              values={curvedGuardValues}
              errors={curvedGuardErrors}
              column={8}
              descriptionSize="small"
              fontSize={6}
              descriptionStyle={{ margin: 0 }}
              containerStyle={{ marginBottom: 8 }}
              onFieldChange={() => {}}
              datasetId={datasetIdForPreview}
            />

            <DataOverviewPlain
              title="其他 - 数据概览"
              isEditing={false}
              onToggleEdit={() => {}}
              onSaveEdit={() => {}}
              onCancelEdit={() => {}}
              isComplete={isOtherComplete}
              onNavigateToCollect={() => history.push('/data/collect')}
              containerRef={otherOverviewRef}
              section="other"
              columns={otherColumns.map((c: any) => ({ ...c, name: c.label }))}
              values={otherValues}
              errors={otherErrors}
              column={2}
              descriptionSize="small"
              fontSize={6}
              descriptionStyle={{ margin: 0 }}
              containerStyle={{ marginBottom: 8 }}
              onFieldChange={() => {}}
              datasetId={datasetIdForPreview}
            />
          </Space>
        </div>
      </Drawer>

      <Drawer
        title={'错误统计预览'}
        open={excelErrorsOpen}
        onClose={() => setExcelErrorsOpen(false)}
        width={720}
        destroyOnHidden
        afterOpenChange={(o) => {
          if (o) void generateExcelErrorsPreview();
        }}
        extra={
          <Space>
            {(() => {
              const disabled = !getUid?.() || getUid?.().trim() === '';
              const tip = '需保存当前数据或从历史记录加载数据';
              return (
                <Tooltip title={disabled ? tip : undefined}>
                    <Popconfirm
                      title={`提示`}
                      description={
                        <span>
                          导出的数据仅用于<strong>辅助数据收集</strong>与
                          <strong>校验</strong>工作，<strong>不</strong>
                          构成任何检测、认证或安全评估结论，用户<strong>必须</strong>
                          对输出结果进行<strong>人工复核</strong>。
                        </span>
                      }
                      onConfirm={handleExcelErrorsExport}
                    >
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        loading={excelErrorsExporting}
                        disabled={disabled}
                      >
                        导出错误统计
                      </Button>
                    </Popconfirm>
                </Tooltip>
              );
            })()}
          </Space>
        }
      >
        <div>
          <style dangerouslySetInnerHTML={{ __html: excelPreviewCss }} />
          <div id="excel-html-preview">
            {excelErrorsGenerating ? (
              <Typography.Text type="secondary">正在生成预览…</Typography.Text>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: excelErrorsHtml }} />
            )}
          </div>
        </div>
      </Drawer>

      <Drawer
        title={intl.formatMessage({
          id: 'pages.output.preview.title.excel',
          defaultMessage: 'Excel 导出预览',
        })}
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        width={920}
        afterOpenChange={(o) => {
          if (o) {
            void generateExcelPreview();
          }
        }}
        destroyOnHidden
        extra={
          <Space>
            {(() => {
              const disabled = !getUid?.() || getUid?.().trim() === '';
              const tip = '需保存当前数据或从历史记录加载数据';
              return (
                <Tooltip title={disabled ? tip : undefined}>
                  <span>
                    <Popconfirm
                      title={`提示`}
                      description={
                        <span>
                          导出的数据仅用于<strong>辅助数据收集</strong>与
                          <strong>校验</strong>工作，<strong>不</strong>
                          构成任何检测、认证或安全评估结论，用户<strong>必须</strong>
                          对输出结果进行<strong>人工复核</strong>。
                        </span>
                      }
                      onConfirm={handleExcelExport}
                    >
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        loading={excelExporting}
                        disabled={disabled}
                      >
                        {intl.formatMessage({
                          id: 'pages.output.export.now.excel',
                          defaultMessage: '导出 Excel',
                        })}
                      </Button>
                    </Popconfirm>
                  </span>
                </Tooltip>
              );
            })()}
          </Space>
        }
      >
        <style dangerouslySetInnerHTML={{ __html: excelPreviewCss }} />
        <div
          style={{
            width: '100%',
            overflow: 'auto',
            background: '#fff',
            padding: 12,
            border: '1px solid #f0f0f0',
          }}
        >
          {excelGenerating ? (
            <Typography.Text type="secondary">
              {intl.formatMessage({
                id: 'pages.output.preview.excel.generating',
                defaultMessage: '正在生成 Excel 预览…',
              })}
            </Typography.Text>
          ) : (
            <div
              id="excel-html-preview"
              dangerouslySetInnerHTML={{ __html: excelHtml }}
            />
          )}
        </div>
      </Drawer>
    </PageContainer>
  );
};

export default OutputPage;
