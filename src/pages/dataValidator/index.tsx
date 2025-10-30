import { ExclamationCircleOutlined, UpCircleOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  Affix,
  Alert,
  Button,
  Card,
  Descriptions,
  Flex,
  Form,
  Input,
  Popover,
  Space,
  Steps,
  Row,
  Col,
  Tag,
  Tooltip,
  message,
  Modal,
  Select,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import ComplianceNotice from '@/components/ComplianceNotice';
import type { ColumnType, DataRow } from '@/components/Validation/types';
import { DataValidator } from '@/components/Validation/validator';
import { RuleConfigurator } from '@/components/Validation/ruleConfig';
import {
  type RailDataValidatorHandle,
  CategoryDataValidator,
  DataOverviewCard,
} from './dataValidator';
import fixedColumnData from '@/models/fixedColumnData';
import { history } from '@umijs/max';
import {
  setupDataCollectDB,
  insertOrUpdateByUid,
  getDataCollectRecordByUid,
  validateUid,
  type DataCollectRecordMeta,
} from '../dataCollect/dbHandler';

// 显示占位符：空值时显示 '-'，否则原值
const displayOrDash = (value: unknown) => {
  if (value === undefined || value === null) return '-';
  if (typeof value === 'string' && value.trim() === '') return '-';
  return String(value);
};

// 按容器宽度计算 Descriptions 列数，适配卡片大小而非屏幕
const useContainerColumns = (ref: React.RefObject<HTMLElement | null>) => {
  const [cols, setCols] = useState<number>(3);
  useEffect(() => {
    const calc = (w: number) => {
      if (w < 420) return 3;
      if (w < 640) return 6;
      if (w < 840) return 8;
      if (w < 1200) return 12;
      return 16;
    };
    const el = ref.current;
    if (!el) return;
    const setByWidth = () => setCols(calc(el.getBoundingClientRect().width));
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => setByWidth());
      ro.observe(el);
    } else {
      window.addEventListener('resize', setByWidth);
    }
    setByWidth();
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', setByWidth);
    };
  }, [ref]);
  return cols;
};

const DataValidatorPage: React.FC = () => {
  // 获取当前登录用户信息（用于写入记录元数据）
  const { initialState } = useModel('@@initialState');
  const currentUser =
    (initialState?.currentUser as API.CurrentUser | undefined) || undefined;
  const straightValidatorRef = useRef<RailDataValidatorHandle | null>(null);
  const curvedValidatorRef = useRef<RailDataValidatorHandle | null>(null);
  const lastValidationContextRef = useRef<{
    type: 'rail' | 'horizontal' | 'all';
    section: 'straight' | 'curved';
    changedKeys?: string[];
  } | null>(null);
  const changedFieldsRef = useRef({
    straightGauge: new Set<string>(),
    straightHorizontal: new Set<string>(),
    curvedGauge: new Set<string>(),
    curvedHorizontal: new Set<string>(),
  });
  const debounceTimerRef = useRef<number | null>(null);
  const queueFieldValidation = (
    section:
      | 'straightGauge'
      | 'straightHorizontal'
      | 'curvedGauge'
      | 'curvedHorizontal',
    field: string,
  ) => {
    changedFieldsRef.current[section].add(field);
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(async () => {
      const ref =
        currentStep === 0
          ? straightValidatorRef.current
          : curvedValidatorRef.current;
      if (!ref) return;
      const ctx = section.includes('Gauge')
        ? {
            type: 'rail' as const,
            section:
              currentStep === 0 ? ('straight' as const) : ('curved' as const),
            changedKeys: Array.from(changedFieldsRef.current[section]),
          }
        : {
            type: 'horizontal' as const,
            section:
              currentStep === 0 ? ('straight' as const) : ('curved' as const),
            changedKeys: Array.from(changedFieldsRef.current[section]),
          };
      lastValidationContextRef.current = ctx;
      try {
        if (ctx.type === 'rail') {
          await ref.validateRailData();
        } else {
          await ref.validateHorizontalData();
        }
      } catch (e) {
        console.error('校验失败:', e);
      } finally {
        changedFieldsRef.current[section].clear();
      }
    }, 400);
  };

  // // 会话存储键（与数据采集页保持一致）
  // const STORAGE_KEYS = {
  //     straightGauge: 'dataCollect_straight_gauge',
  //     straightHorizontal: 'dataCollect_straight_horizontal',
  //     curvedGauge: 'dataCollect_curved_gauge',
  //     curvedHorizontal: 'dataCollect_curved_horizontal',
  // } as const;

  // 简单值清洗：去除前后空格、限制长度、防止注入
  const sanitizeValue = (val: any) => {
    try {
      if (typeof val !== 'string') return '';
      const trimmed = val.trim();
      if (trimmed.length > 100) return trimmed.slice(0, 100);
      if (/[<>]/.test(trimmed)) return trimmed.replace(/[<>]/g, '');
      return trimmed;
    } catch {
      return '';
    }
  };

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
  const straightGaugeColumnTypes = getStraightGaugeColumnTypes();
  const straightHorizontalColumnTypes = getStraightHorizontalColumnTypes();
  const curvedGaugeColumnTypes = getCurvedGaugeColumnTypes();
  const curvedHorizontalColumnTypes = getCurvedHorizontalColumnTypes();
  const offsetColumnTypes = getOffsetColumnTypes();
  const straightReducedColumnTypes =
    getStraightReducedValueOfSwitchRailColumnTypes();
  const curvedReducedColumnTypes =
    getCurvedReducedValueOfSwitchRailColumnTypes();
  const straightGuardColumnTypes =
    getStraightGuardRailFlangeGrooveColumnTypes();
  const curvedGuardColumnTypes = getCurvedGuardRailFlangeGrooveColumnTypes();
  const otherColumnTypes = getOtherColumnTypes();

  // 参考数据集选择（避免硬编码 default）
  const datasets = fixedColumnData.listDataSets();
  const [datasetId, setDatasetId] = useState<string>(() => {
    const def = datasets.find((d) => d.isDefault === true);
    return def ? def.id : datasets[0]?.id || 'default';
  });
  const datasetOptions = datasets.map((d) => ({
    value: d.id,
    label: d.name || d.id,
  }));

  const [straightForm] = Form.useForm();
  const [_curvedForm] = Form.useForm();
  interface FormData {
    gauge: {
      [key: string]: string | undefined;
    };
    horizontal: {
      [key: string]: string | undefined;
    };
  }

  const [straightRailFormData, setStraightRailFormData] = useState<FormData>(
    () => {
      const initGaugeValues: { [key: string]: string } = {};
      const initHorizontalValues: { [key: string]: string } = {};
      straightGaugeColumnTypes.forEach((col) => {
        initGaugeValues[col.name] = ''; // 初始化所有字段为空字符串
      });
      straightHorizontalColumnTypes.forEach((col) => {
        initHorizontalValues[col.name] = ''; // 初始化所有字段为空字符串
      });

      return {
        gauge: initGaugeValues, // 确保所有列名都有初始值
        horizontal: initHorizontalValues, // 确保所有列名都有初始值
      };
    },
  );

  const [curvedRailFormData, setCurvedRailFormData] = useState<FormData>(() => {
    const initGaugeValues: { [key: string]: string } = {};
    const initHorizontalValues: { [key: string]: string } = {};
    curvedGaugeColumnTypes.forEach((col) => {
      initGaugeValues[col.name] = ''; // 初始化所有字段为空字符串
    });
    curvedHorizontalColumnTypes.forEach((col) => {
      initHorizontalValues[col.name] = ''; // 初始化所有字段为空字符串
    });

    return {
      gauge: initGaugeValues, // 确保所有列名都有初始值
      horizontal: initHorizontalValues, // 确保所有列名都有初始值
    };
  });

  // 新增类别：初始化表单状态
  const [offsetFormData, setOffsetFormData] = useState<Record<string, string>>(
    () => {
      const init: Record<string, string> = {};
      offsetColumnTypes.forEach((col) => {
        init[col.name] = '';
      });
      return init;
    },
  );
  const [straightReducedFormData, setStraightReducedFormData] = useState<
    Record<string, string>
  >(() => {
    const init: Record<string, string> = {};
    straightReducedColumnTypes.forEach((col) => {
      init[col.name] = '';
    });
    return init;
  });
  const [curvedReducedFormData, setCurvedReducedFormData] = useState<
    Record<string, string>
  >(() => {
    const init: Record<string, string> = {};
    curvedReducedColumnTypes.forEach((col) => {
      init[col.name] = '';
    });
    return init;
  });
  const [straightGuardFormData, setStraightGuardFormData] = useState<
    Record<string, string>
  >(() => {
    const init: Record<string, string> = {};
    straightGuardColumnTypes.forEach((col) => {
      init[col.name] = '';
    });
    return init;
  });
  const [curvedGuardFormData, setCurvedGuardFormData] = useState<
    Record<string, string>
  >(() => {
    const init: Record<string, string> = {};
    curvedGuardColumnTypes.forEach((col) => {
      init[col.name] = '';
    });
    return init;
  });
  const [otherFormData, setOtherFormData] = useState<Record<string, string>>(
    () => {
      const init: Record<string, string> = {};
      otherColumnTypes.forEach((col) => {
        init[col.label] = '';
      });
      return init;
    },
  );

  // 新增类别：校验错误与统计状态
  const [offsetErrors, setOffsetErrors] = useState<any[]>([]);
  const [straightReducedErrors, setStraightReducedErrors] = useState<any[]>([]);
  const [curvedReducedErrors, setCurvedReducedErrors] = useState<any[]>([]);
  const [straightGuardErrors, setStraightGuardErrors] = useState<any[]>([]);
  const [curvedGuardErrors, setCurvedGuardErrors] = useState<any[]>([]);
  const [otherErrors, _setOtherErrors] = useState<any[]>([]);

  const [_offsetStats, setOffsetStats] = useState<any | null>(null);
  const [_straightReducedStats, setStraightReducedStats] = useState<any | null>(
    null,
  );
  const [_curvedReducedStats, setCurvedReducedStats] = useState<any | null>(
    null,
  );
  const [_straightGuardStats, setStraightGuardStats] = useState<any | null>(
    null,
  );
  const [_curvedGuardStats, setCurvedGuardStats] = useState<any | null>(null);
  const [_otherStats, _setOtherStats] = useState<any | null>(null);

  // 新增类别：概览编辑状态与备份
  const [isOffsetEditing, setIsOffsetEditing] = useState(false);
  const [isStraightReducedEditing, setIsStraightReducedEditing] =
    useState(false);
  const [isCurvedReducedEditing, setIsCurvedReducedEditing] = useState(false);
  const [isStraightGuardEditing, setIsStraightGuardEditing] = useState(false);
  const [isCurvedGuardEditing, setIsCurvedGuardEditing] = useState(false);
  const [isOtherEditing, setIsOtherEditing] = useState(false);

  const offsetBackupRef = useRef<Record<string, string> | null>(null);
  const straightReducedBackupRef = useRef<Record<string, string> | null>(null);
  const curvedReducedBackupRef = useRef<Record<string, string> | null>(null);
  const straightGuardBackupRef = useRef<Record<string, string> | null>(null);
  const curvedGuardBackupRef = useRef<Record<string, string> | null>(null);
  const otherBackupRef = useRef<Record<string, string> | null>(null);

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
    setStraightGauge,
    setStraightHorizontal,
    setCurvedGauge,
    setCurvedHorizontal,
    setOffsetData,
    setStraightReducedValue,
    setCurvedReducedValue,
    setStraightGuardRailFlangeGroove,
    setCurvedGuardRailFlangeGroove,
    setOtherData,
    setStepStatus: setPersistedStepStatus,
    getStepStatus: getPersistedStepStatus,
    setUid,
  } = useModel('collectorData');
  // 存储加载状态
  const [storageStatus, setStorageStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [storageError, setStorageError] = useState<string | null>(null);

  // 会话数据加载
  useEffect(() => {
    setStorageStatus('loading');
    try {
      const sg = getStraightGauge();
      const sh = getStraightHorizontal();
      const cg = getCurvedGauge();
      const ch = getCurvedHorizontal();

      const od = getOffsetData();
      const srd = getStraightReducedValue();
      const crd = getCurvedReducedValue();
      const sgr = getStraightGuardRailFlangeGroove();
      const cgr = getCurvedGuardRailFlangeGroove();
      const oth = getOtherData();

      if (sg) {
        const parsed = JSON.parse(sg) as Record<string, string>;
        const sanitized = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
        );
        setStraightRailFormData((prev) => ({ ...prev, gauge: sanitized }));
      }
      if (sh) {
        const parsed = JSON.parse(sh) as Record<string, string>;
        const sanitized = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
        );
        setStraightRailFormData((prev) => ({ ...prev, horizontal: sanitized }));
      }
      if (cg) {
        const parsed = JSON.parse(cg) as Record<string, string>;
        const sanitized = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
        );
        setCurvedRailFormData((prev) => ({ ...prev, gauge: sanitized }));
      }
      if (ch) {
        const parsed = JSON.parse(ch) as Record<string, string>;
        const sanitized = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
        );
        setCurvedRailFormData((prev) => ({ ...prev, horizontal: sanitized }));
      }

      if (od) {
        const parsed = JSON.parse(od) as Record<string, string>;
        const sanitized = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
        );
        setOffsetFormData(sanitized);
      }
      if (srd) {
        const parsed = JSON.parse(srd) as Record<string, string>;
        const sanitized = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
        );
        setStraightReducedFormData(sanitized);
      }
      if (crd) {
        const parsed = JSON.parse(crd) as Record<string, string>;
        const sanitized = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
        );
        setCurvedReducedFormData(sanitized);
      }
      if (sgr) {
        const parsed = JSON.parse(sgr) as Record<string, string>;
        const sanitized = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
        );
        setStraightGuardFormData(sanitized);
      }
      if (cgr) {
        const parsed = JSON.parse(cgr) as Record<string, string>;
        const sanitized = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
        );
        setCurvedGuardFormData(sanitized);
      }
      if (oth) {
        const parsed = JSON.parse(oth) as Record<string, string>;
        const sanitized = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
        );
        setOtherFormData(sanitized);
      }

      setStorageStatus('success');
      setStorageError(null);
    } catch (e: any) {
      setStorageStatus('error');
      setStorageError(e?.message || '数据加载失败');
      console.error(e);
    }
  }, []);

  // 分别跟踪轨距和水平的完成状态
  const [isRailsComplete, setIsRailsComplete] = useState(false);
  const [isHorizontalComplete, setIsHorizontalComplete] = useState(false);

  // 新增类别完成状态
  const [isOffsetComplete, setIsOffsetComplete] = useState(false);
  const [isStraightReducedComplete, setIsStraightReducedComplete] =
    useState(false);
  const [isCurvedReducedComplete, setIsCurvedReducedComplete] = useState(false);
  const [isStraightGuardComplete, setIsStraightGuardComplete] = useState(false);
  const [isCurvedGuardComplete, setIsCurvedGuardComplete] = useState(false);

  // 存储校验错误
  const [straightGaugeErrors, setStraightGaugeErrors] = useState<any[]>([]);
  const [straightHorizontalErrors, setStraightHorizontalErrors] = useState<
    any[]
  >([]);

  // 存储校验错误
  const [curvedGaugeErrors, setcurvedGaugeErrors] = useState<any[]>([]);
  const [curvedHorizontalErrors, setcurvedHorizontalErrors] = useState<any[]>(
    [],
  );

  // 编辑模式状态与防抖标记
  const [_isEditing, setIsEditing] = useState(false);
  const [_editingTouched, setEditingTouched] = useState(false);
  const editDebounceRef = useRef<number | null>(null);
  const straightBackupRef = useRef<FormData | null>(null);
  const curvedBackupRef = useRef<FormData | null>(null);
  // 概览区容器引用，用于绘制连接线
  const straightGaugeOverviewRef = useRef<HTMLDivElement>(null);
  const straightHorizontalOverviewRef = useRef<HTMLDivElement>(null);
  const curvedGaugeOverviewRef = useRef<HTMLDivElement>(null);
  const curvedHorizontalOverviewRef = useRef<HTMLDivElement>(null);
  const straightReducedOverviewRef = useRef<HTMLDivElement>(null);
  const curvedReducedOverviewRef = useRef<HTMLDivElement>(null);
  const straightGuardOverviewRef = useRef<HTMLDivElement>(null);
  const curvedGuardOverviewRef = useRef<HTMLDivElement>(null);
  const otherOverviewRef = useRef<HTMLDivElement>(null);
  const offsetOverviewRef = useRef<HTMLDivElement>(null);

  // 容器自适应列数（按卡片宽度）
  const straightGaugeCols = useContainerColumns(straightGaugeOverviewRef);
  const straightHorizontalCols = useContainerColumns(
    straightHorizontalOverviewRef,
  );
  const curvedGaugeCols = useContainerColumns(curvedGaugeOverviewRef);
  const curvedHorizontalCols = useContainerColumns(curvedHorizontalOverviewRef);
  const straightReducedCols = useContainerColumns(straightReducedOverviewRef);
  const curvedReducedCols = useContainerColumns(curvedReducedOverviewRef);
  const straightGuardCols = useContainerColumns(straightGuardOverviewRef);
  const curvedGuardCols = useContainerColumns(curvedGuardOverviewRef);
  const otherCols = useContainerColumns(otherOverviewRef);
  const offsetCols = useContainerColumns(offsetOverviewRef);
  // 概览卡片独立编辑态
  const [isStraightGaugeEditing, setIsStraightGaugeEditing] = useState(false);
  const [isStraightHorizontalEditing, setIsStraightHorizontalEditing] =
    useState(false);
  const [isCurvedGaugeEditing, setIsCurvedGaugeEditing] = useState(false);
  const [isCurvedHorizontalEditing, setIsCurvedHorizontalEditing] =
    useState(false);
  // 概览卡片独立备份
  const straightGaugeBackupRef = useRef<Record<string, string> | null>(null);
  const straightHorizontalBackupRef = useRef<Record<string, string> | null>(
    null,
  );
  const curvedGaugeBackupRef = useRef<Record<string, string> | null>(null);
  const curvedHorizontalBackupRef = useRef<Record<string, string> | null>(null);

  // 添加顶部引用（修复类型）
  const topRef = useRef<HTMLDivElement | null>(null);
  // 添加滚动位置状态
  const [isAtTop, setIsAtTop] = useState(true);
  // 添加概览卡片在视口中的状态
  const [isOverviewInView, setIsOverviewInView] = useState(false);

  // 滚动到顶部函数
  const scrollToTop = () => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  // 检查是否有概览需要显示
  const hasOverview = isRailsComplete || isHorizontalComplete;

  // 记录元信息表单
  const [metaForm] = Form.useForm();
  const [savingRecord, setSavingRecord] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [_currentStepStatus, setCurrentStepStatus] = useState<
    'process' | 'wait' | 'finish' | 'error'
  >('process');
  const [stepStatus, setStepStatus] = useState<
    Array<'process' | 'wait' | 'finish' | 'error'>
  >(['process', 'wait', 'wait', 'wait', 'wait', 'wait', 'wait']);

  const stepStatusTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    try {
      const sStatus = getPersistedStepStatus?.();
      if (sStatus) {
        const parsed = JSON.parse(sStatus) as Array<
          'process' | 'wait' | 'finish' | 'error'
        >;
        if (Array.isArray(parsed) && parsed.length === 7) {
          setStepStatus(parsed);
        }
      }
    } catch (_e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stepStatusTimerRef.current)
      window.clearTimeout(stepStatusTimerRef.current);
    stepStatusTimerRef.current = window.setTimeout(() => {
      try {
        setPersistedStepStatus?.(stepStatus);
      } catch (_e) {}
    }, 250);
    return () => {
      if (stepStatusTimerRef.current)
        window.clearTimeout(stepStatusTimerRef.current);
    };
  }, [stepStatus]);

  const onStepChange = (value: number) => {
    // console.log('onChange:', value);
    setCurrentStepStatus('process');
    const newStatus = stepStatus.slice();
    if (newStatus[currentStep] === 'wait') {
      newStatus[currentStep] = 'process';
    }
    setStepStatus(newStatus);
    setCurrentStep(value);
    setTimeout(() => {
      if (value === 0 || value === 1) {
        const ref =
          value === 0
            ? straightValidatorRef.current
            : curvedValidatorRef.current;
        if (ref) {
          lastValidationContextRef.current = {
            type: 'all',
            section: value === 0 ? 'straight' : 'curved',
          };
          ref
            .validateAll()
            .catch((err) => console.error('步骤切换校验失败:', err));
        }
      } else if (value === 2) {
        validateOffsetData();
      } else if (value === 3) {
        validateReducedData();
      } else if (value === 4) {
        validateGuardData();
      }
    }, 0);
  };

  // 处理表单值变化
  const _handleStraightValuesChange = (_changedValues: any, allValues: any) => {
    setStraightRailFormData(allValues);
  };

  // 处理表单值变化
  const _handleCurvedValuesChange = (_changedValues: any, allValues: any) => {
    setCurvedRailFormData(allValues);
  };

  // 获取表单字段值
  const _getFieldValue = (fieldPath: any) => {
    return straightForm.getFieldValue(fieldPath) || '';
  };

  const toStringRecord = (obj: {
    [key: string]: string | undefined;
  }): Record<string, string> => {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, typeof v === 'string' ? v : '']),
    ) as Record<string, string>;
  };

  const isSectionComplete = (
    data: Record<string, string>,
    columns: ColumnType[],
  ) => {
    return columns
      .filter((c) => !c.hidden)
      .every((c) => {
        const v = data[c.name];
        return v !== undefined && v !== null && String(v).trim() !== '';
      });
  };

  const _prepareStraightRailGaugeData = () => {
    return [toStringRecord(straightRailFormData.gauge)];
  };

  const _prepareStraightRailHorizontalData = () => {
    return [toStringRecord(straightRailFormData.horizontal)];
  };

  // 准备传递给曲轨校验组件的数据
  const _prepareCurvedRailGaugeData = () => {
    return [toStringRecord(curvedRailFormData.gauge)];
  };

  const _prepareCurvedRailHorizontalData = () => {
    return [toStringRecord(curvedRailFormData.horizontal)];
  };

  // 新增类别：偏移辅助数据校验
  const validateOffsetData = () => {
    const complete = isSectionComplete(offsetFormData, offsetColumnTypes);
    setIsOffsetComplete(complete);
    if (!complete) {
      setOffsetErrors([]);
      setOffsetStats(null);
      const newStatus = stepStatus.slice();
      newStatus[2] = 'process';
      setStepStatus(newStatus);
      setCurrentStepStatus(newStatus[2]);
      return;
    }

    const validator = new DataValidator();
    // 使用统一规则配置方法（支距）
    RuleConfigurator.configureOffsetRules(validator, offsetColumnTypes);
    const dataRows: DataRow[] = [toStringRecord(offsetFormData)];
    const errors = validator.validateAll(dataRows);
    setOffsetErrors(errors);
    const stats = validator.getErrorStatistics();
    setOffsetStats(stats);
    const newStatus = stepStatus.slice();
    newStatus[2] = errors.length === 0 ? 'finish' : 'error';
    setStepStatus(newStatus);
    setCurrentStepStatus(newStatus[2]);
  };

  // 新增类别：尖轨降低值校验（直轨 + 曲轨）
  const validateReducedData = () => {
    const sComplete = isSectionComplete(
      straightReducedFormData,
      straightReducedColumnTypes,
    );
    const cComplete = isSectionComplete(
      curvedReducedFormData,
      curvedReducedColumnTypes,
    );
    setIsStraightReducedComplete(sComplete);
    setIsCurvedReducedComplete(cComplete);

    if (!sComplete || !cComplete) {
      setStraightReducedErrors([]);
      setCurvedReducedErrors([]);
      setStraightReducedStats(null);
      setCurvedReducedStats(null);
      const newStatus = stepStatus.slice();
      newStatus[3] = 'process';
      setStepStatus(newStatus);
      setCurrentStepStatus(newStatus[3]);
      return;
    }

    const vStraight = new DataValidator();
    // 使用统一规则配置方法（尖轨降低值-直轨）
    RuleConfigurator.configureSwitchRailReducedRules(
      vStraight,
      straightReducedColumnTypes,
    );
    const sErrors = vStraight.validateAll([
      toStringRecord(straightReducedFormData),
    ]);
    setStraightReducedErrors(sErrors);
    setStraightReducedStats(vStraight.getErrorStatistics());

    const vCurved = new DataValidator();
    // 使用统一规则配置方法（尖轨降低值-曲轨）
    RuleConfigurator.configureSwitchRailReducedRules(
      vCurved,
      curvedReducedColumnTypes,
    );
    const cErrors = vCurved.validateAll([
      toStringRecord(curvedReducedFormData),
    ]);
    setCurvedReducedErrors(cErrors);
    setCurvedReducedStats(vCurved.getErrorStatistics());

    const ok = sErrors.length === 0 && cErrors.length === 0;
    const newStatus = stepStatus.slice();
    newStatus[3] = ok ? 'finish' : 'error';
    setStepStatus(newStatus);
    setCurrentStepStatus(newStatus[3]);
  };

  // 新增类别：护轨轮缘槽校验（直轨 + 曲轨）
  const validateGuardData = () => {
    const sComplete = isSectionComplete(
      straightGuardFormData,
      straightGuardColumnTypes,
    );
    const cComplete = isSectionComplete(
      curvedGuardFormData,
      curvedGuardColumnTypes,
    );
    setIsStraightGuardComplete(sComplete);
    setIsCurvedGuardComplete(cComplete);

    if (!sComplete || !cComplete) {
      setStraightGuardErrors([]);
      setCurvedGuardErrors([]);
      setStraightGuardStats(null);
      setCurvedGuardStats(null);
      const newStatus = stepStatus.slice();
      newStatus[4] = 'process';
      setStepStatus(newStatus);
      setCurrentStepStatus(newStatus[4]);
      return;
    }

    const vStraight = new DataValidator();
    // 使用统一规则配置方法（护轨轮缘槽-直轨）
    RuleConfigurator.configureGuardRailFlangeGrooveRules(
      vStraight,
      straightGuardColumnTypes,
    );
    const sErrors = vStraight.validateAll([
      toStringRecord(straightGuardFormData),
    ]);
    setStraightGuardErrors(sErrors);
    setStraightGuardStats(vStraight.getErrorStatistics());

    const vCurved = new DataValidator();
    // 使用统一规则配置方法（护轨轮缘槽-曲轨）
    RuleConfigurator.configureGuardRailFlangeGrooveRules(
      vCurved,
      curvedGuardColumnTypes,
    );
    const cErrors = vCurved.validateAll([toStringRecord(curvedGuardFormData)]);
    setCurvedGuardErrors(cErrors);
    setCurvedGuardStats(vCurved.getErrorStatistics());

    const ok = sErrors.length === 0 && cErrors.length === 0;
    const newStatus = stepStatus.slice();
    newStatus[4] = ok ? 'finish' : 'error';
    setStepStatus(newStatus);
    setCurrentStepStatus(newStatus[4]);
  };

  // 编辑模式切换与防抖
  const _toggleEdit = () => {
    if (editDebounceRef.current) {
      window.clearTimeout(editDebounceRef.current);
    }
    editDebounceRef.current = window.setTimeout(() => {
      setIsEditing((prev) => {
        if (!prev) {
          // 进入编辑态时快照当前状态，用于取消回滚
          straightBackupRef.current = JSON.parse(
            JSON.stringify(straightRailFormData),
          );
          curvedBackupRef.current = JSON.parse(
            JSON.stringify(curvedRailFormData),
          );
        }
        return !prev;
      });
      setEditingTouched(false);
    }, 150);
  };

  const onEditChange = () => {
    if (
      !isStraightGaugeEditing &&
      !isStraightHorizontalEditing &&
      !isCurvedGaugeEditing &&
      !isCurvedHorizontalEditing &&
      !isOffsetEditing &&
      !isStraightReducedEditing &&
      !isCurvedReducedEditing &&
      !isStraightGuardEditing &&
      !isCurvedGuardEditing &&
      !isOtherEditing
    )
      return;
    setEditingTouched(true);
  };

  // UID 生成工具
  const generateUid = (): string => {
    const base = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    const safe = base.replace(/[^A-Za-z0-9_-]/g, '_');
    return safe.length > 64 ? safe.slice(0, 64) : safe;
  };
  const ensureValidUid = (): string => {
    let u = generateUid();
    let chk = validateUid(u);
    if (chk.valid) return u;
    u = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    chk = validateUid(u);
    return chk.valid ? u : `uid_${Date.now()}`;
  };

  // 记录元信息表单提交并持久化保存到 SQLite（支持UID去重/更新）
  const onSaveRecord = async () => {
    try {
      const values = await metaForm.validateFields();
      await setupDataCollectDB();
      // 合并登录用户信息到元数据
      const metaWithUser: DataCollectRecordMeta = {
        ...(values as DataCollectRecordMeta),
        user: {
          name: currentUser?.name,
          userid: currentUser?.userid,
          email: currentUser?.email,
          phone: currentUser?.phone,
          group: currentUser?.group,
          title: currentUser?.title,
          access: currentUser?.access,
        },
      };
      // 生成参考值快照（随当前数据集选择持久化）
      const references = (() => {
        const pick = (name?: string) =>
          name ? fixedColumnData.getFixedValue(datasetId, name) : undefined;
        const pickByTrack = (
          name?: string,
          trackType?: 'straight' | 'curved',
        ) =>
          name
            ? fixedColumnData.getFixedValue(
                datasetId,
                name,
                trackType ? { trackType } : undefined,
              )
            : undefined;
        const pickByMode = (
          name: string | undefined,
          trackType: 'straight' | 'curved',
          mode: string,
        ) =>
          name
            ? fixedColumnData.getFixedValue(datasetId, name, {
                trackType,
                mode,
              })
            : undefined;

        const collectMap = (
          cols: Array<{ name?: string }>,
          picker: (n?: string) => unknown,
        ) => {
          const out: Record<string, unknown> = {};
          cols.forEach((c) => {
            const v = picker(c?.name);
            if (v !== undefined && typeof c?.name === 'string' && c.name)
              out[c.name] = v;
          });
          return out;
        };

        const straightGaugeRef = collectMap(straightGaugeColumnTypes, (n) =>
          pickByTrack(n, 'straight'),
        );
        const straightHorizontalRef = collectMap(
          straightHorizontalColumnTypes,
          (n) => pickByTrack(n, 'straight'),
        );
        const curvedGaugeRef = collectMap(curvedGaugeColumnTypes, (n) =>
          pickByTrack(n, 'curved'),
        );
        const curvedHorizontalRef = collectMap(
          curvedHorizontalColumnTypes,
          (n) => pickByTrack(n, 'curved'),
        );
        const offsetRef = collectMap(offsetColumnTypes, (n) => pick(n));

        const straightReducedRef: Record<
          string,
          { distanceLength?: unknown; plan?: unknown }
        > = {};
        straightReducedColumnTypes.forEach((c) => {
          const name = c?.name;
          if (!name) return;
          const dl = pickByMode(name, 'straight', 'distanceLength');
          const pl = pickByMode(name, 'straight', 'plan');
          if (dl !== undefined || pl !== undefined) {
            straightReducedRef[name] = {};
            if (dl !== undefined) straightReducedRef[name].distanceLength = dl;
            if (pl !== undefined) straightReducedRef[name].plan = pl;
          }
        });
        const curvedReducedRef: Record<
          string,
          { distanceLength?: unknown; plan?: unknown }
        > = {};
        curvedReducedColumnTypes.forEach((c) => {
          const name = c?.name;
          if (!name) return;
          const dl = pickByMode(name, 'curved', 'distanceLength');
          const pl = pickByMode(name, 'curved', 'plan');
          if (dl !== undefined || pl !== undefined) {
            curvedReducedRef[name] = {};
            if (dl !== undefined) curvedReducedRef[name].distanceLength = dl;
            if (pl !== undefined) curvedReducedRef[name].plan = pl;
          }
        });

        const straightGuardRef = collectMap(straightGuardColumnTypes, (n) =>
          pick(n),
        );
        const curvedGuardRef = collectMap(curvedGuardColumnTypes, (n) =>
          pick(n),
        );
        // 其他：使用 label 作为列名（与渲染时的 name 映射保持一致）
        const otherRef = collectMap(
          otherColumnTypes.map((c) => ({ name: (c as any)?.label })),
          (n) => pick(n),
        );

        return {
          datasetId,
          straightGauge: straightGaugeRef,
          straightHorizontal: straightHorizontalRef,
          curvedGauge: curvedGaugeRef,
          curvedHorizontal: curvedHorizontalRef,
          offset: offsetRef,
          straightReduced: straightReducedRef,
          curvedReduced: curvedReducedRef,
          straightGuard: straightGuardRef,
          curvedGuard: curvedGuardRef,
          other: otherRef,
        };
      })();
      const payload = {
        straightGauge: JSON.parse(getStraightGauge() || '{}'),
        straightHorizontal: JSON.parse(getStraightHorizontal() || '{}'),
        curvedGauge: JSON.parse(getCurvedGauge() || '{}'),
        curvedHorizontal: JSON.parse(getCurvedHorizontal() || '{}'),
        offset: JSON.parse(getOffsetData() || '{}'),
        straightReduced: JSON.parse(getStraightReducedValue() || '{}'),
        curvedReduced: JSON.parse(getCurvedReducedValue() || '{}'),
        straightGuard: JSON.parse(getStraightGuardRailFlangeGroove() || '{}'),
        curvedGuard: JSON.parse(getCurvedGuardRailFlangeGroove() || '{}'),
        other: JSON.parse(getOtherData() || '{}'),
        stepStatus: (() => {
          try {
            const s = getPersistedStepStatus?.();
            if (s) return JSON.parse(s);
          } catch {}
          return stepStatus;
        })(),
        references,
        datasetId,
      };

      const uidInput = (values as any)?.uid?.trim();
      let uid = uidInput;
      if (uid) {
        const check = validateUid(uid);
        if (!check.valid) {
          message.error(check.message || 'UID格式不正确');
          return;
        }
      }

      const doSave = async (targetUid: string, actionText?: string) => {
        try {
          setSavingRecord(true);
          const res = await insertOrUpdateByUid(
            targetUid,
            payload,
            metaWithUser,
          );
          if (res.success) {
            metaForm.setFieldsValue({ uid: targetUid });
            const next = stepStatus.slice();
            next[6] = 'finish';
            setStepStatus(next);
            // 更新模型中的UID用于导出门控
            try { setUid(targetUid); } catch {}
            message.success(
              actionText ||
                (res.action === 'update'
                  ? `已更新记录（UID: ${targetUid}）`
                  : `已保存记录（UID: ${targetUid}）`),
            );
          } else {
            message.error(`保存失败：${res.error || '未知错误'}`);
          }
        } catch (e) {
          console.error(e);
          message.error('保存记录失败');
        } finally {
          setSavingRecord(false);
        }
      };

      if (!uid) {
        uid = ensureValidUid();
        await doSave(uid, '已生成UID并保存');
        return;
      }

      const existing = await getDataCollectRecordByUid(uid);
      if (!existing) {
        await doSave(uid);
        return;
      }

      Modal.confirm({
        title: '检测到重复UID',
        content: `UID ${uid} 已存在（记录ID: ${existing.id}）。是否更新该记录的数据？`,
        okText: '更新现有记录',
        cancelText: '另存为新记录',
          onOk: async () => {
            if (!uid) return;
          await doSave(uid);
        },
        onCancel: async () => {
          const newUid = ensureValidUid();
          await doSave(newUid, '已另存为新记录');
        },
      });
    } catch (err) {
      console.error(err);
      message.error('保存记录失败');
    }
  };

  const _cancelEdit = () => {
    if (editDebounceRef.current) {
      window.clearTimeout(editDebounceRef.current);
    }
    editDebounceRef.current = window.setTimeout(() => {
      // 回滚到进入编辑态前的快照
      if (straightBackupRef.current) {
        setStraightRailFormData(straightBackupRef.current);
      }
      if (curvedBackupRef.current) {
        setCurvedRailFormData(curvedBackupRef.current);
      }
      setIsEditing(false);
      setEditingTouched(false);
    }, 150);
  };

  const _saveEdit = () => {
    if (editDebounceRef.current) {
      window.clearTimeout(editDebounceRef.current);
    }
    // 在此可以扩展：将修改写回 sessionStorage
    editDebounceRef.current = window.setTimeout(() => {
      try {
        // 写回直轨
        setStraightGauge(toStringRecord(straightRailFormData.gauge));
        setStraightHorizontal(toStringRecord(straightRailFormData.horizontal));
        // 写回曲轨
        setCurvedGauge(toStringRecord(curvedRailFormData.gauge));
        setCurvedHorizontal(toStringRecord(curvedRailFormData.horizontal));
      } catch (e) {
        console.error('保存会话数据失败:', e);
      }
      setIsEditing(false);
      setEditingTouched(false);
    }, 150);
  };

  // 概览卡片：独立编辑控制
  const toggleOverviewEdit = (
    section:
      | 'straightGauge'
      | 'straightHorizontal'
      | 'curvedGauge'
      | 'curvedHorizontal'
      | 'offset'
      | 'straightReduced'
      | 'curvedReduced'
      | 'straightGuard'
      | 'curvedGuard'
      | 'other',
  ) => {
    if (editDebounceRef.current) {
      window.clearTimeout(editDebounceRef.current);
    }
    editDebounceRef.current = window.setTimeout(() => {
      switch (section) {
        case 'straightGauge':
          setIsStraightGaugeEditing((prev) => {
            if (!prev) {
              straightGaugeBackupRef.current = JSON.parse(
                JSON.stringify(straightRailFormData.gauge),
              );
            }
            return !prev;
          });
          break;
        case 'straightHorizontal':
          setIsStraightHorizontalEditing((prev) => {
            if (!prev) {
              straightHorizontalBackupRef.current = JSON.parse(
                JSON.stringify(straightRailFormData.horizontal),
              );
            }
            return !prev;
          });
          break;
        case 'curvedGauge':
          setIsCurvedGaugeEditing((prev) => {
            if (!prev) {
              curvedGaugeBackupRef.current = JSON.parse(
                JSON.stringify(curvedRailFormData.gauge),
              );
            }
            return !prev;
          });
          break;
        case 'curvedHorizontal':
          setIsCurvedHorizontalEditing((prev) => {
            if (!prev) {
              curvedHorizontalBackupRef.current = JSON.parse(
                JSON.stringify(curvedRailFormData.horizontal),
              );
            }
            return !prev;
          });
          break;
        case 'offset':
          setIsOffsetEditing((prev) => {
            if (!prev) {
              offsetBackupRef.current = JSON.parse(
                JSON.stringify(offsetFormData),
              );
            }
            return !prev;
          });
          break;
        case 'straightReduced':
          setIsStraightReducedEditing((prev) => {
            if (!prev) {
              straightReducedBackupRef.current = JSON.parse(
                JSON.stringify(straightReducedFormData),
              );
            }
            return !prev;
          });
          break;
        case 'curvedReduced':
          setIsCurvedReducedEditing((prev) => {
            if (!prev) {
              curvedReducedBackupRef.current = JSON.parse(
                JSON.stringify(curvedReducedFormData),
              );
            }
            return !prev;
          });
          break;
        case 'straightGuard':
          setIsStraightGuardEditing((prev) => {
            if (!prev) {
              straightGuardBackupRef.current = JSON.parse(
                JSON.stringify(straightGuardFormData),
              );
            }
            return !prev;
          });
          break;
        case 'curvedGuard':
          setIsCurvedGuardEditing((prev) => {
            if (!prev) {
              curvedGuardBackupRef.current = JSON.parse(
                JSON.stringify(curvedGuardFormData),
              );
            }
            return !prev;
          });
          break;
        case 'other':
          setIsOtherEditing((prev) => {
            if (!prev) {
              otherBackupRef.current = JSON.parse(
                JSON.stringify(otherFormData),
              );
            }
            return !prev;
          });
          break;
      }
      setEditingTouched(false);
    }, 150);
  };

  const cancelOverviewEdit = (
    section:
      | 'straightGauge'
      | 'straightHorizontal'
      | 'curvedGauge'
      | 'curvedHorizontal'
      | 'offset'
      | 'straightReduced'
      | 'curvedReduced'
      | 'straightGuard'
      | 'curvedGuard'
      | 'other',
  ) => {
    if (editDebounceRef.current) {
      window.clearTimeout(editDebounceRef.current);
    }
    editDebounceRef.current = window.setTimeout(() => {
      switch (section) {
        case 'straightGauge':
          if (straightGaugeBackupRef.current) {
            const backup = straightGaugeBackupRef.current as Record<
              string,
              string
            >;
            setStraightRailFormData((prev) => ({ ...prev, gauge: backup }));
          }
          setIsStraightGaugeEditing(false);
          break;
        case 'straightHorizontal':
          if (straightHorizontalBackupRef.current) {
            const backup = straightHorizontalBackupRef.current as Record<
              string,
              string
            >;
            setStraightRailFormData((prev) => ({
              ...prev,
              horizontal: backup,
            }));
          }
          setIsStraightHorizontalEditing(false);
          break;
        case 'curvedGauge':
          if (curvedGaugeBackupRef.current) {
            const backup = curvedGaugeBackupRef.current as Record<
              string,
              string
            >;
            setCurvedRailFormData((prev) => ({ ...prev, gauge: backup }));
          }
          setIsCurvedGaugeEditing(false);
          break;
        case 'curvedHorizontal':
          if (curvedHorizontalBackupRef.current) {
            const backup = curvedHorizontalBackupRef.current as Record<
              string,
              string
            >;
            setCurvedRailFormData((prev) => ({ ...prev, horizontal: backup }));
          }
          setIsCurvedHorizontalEditing(false);
          break;
        case 'offset':
          if (offsetBackupRef.current) {
            const backup = offsetBackupRef.current as Record<string, string>;
            setOffsetFormData(backup);
          }
          setIsOffsetEditing(false);
          break;
        case 'straightReduced':
          if (straightReducedBackupRef.current) {
            const backup = straightReducedBackupRef.current as Record<
              string,
              string
            >;
            setStraightReducedFormData(backup);
          }
          setIsStraightReducedEditing(false);
          break;
        case 'curvedReduced':
          if (curvedReducedBackupRef.current) {
            const backup = curvedReducedBackupRef.current as Record<
              string,
              string
            >;
            setCurvedReducedFormData(backup);
          }
          setIsCurvedReducedEditing(false);
          break;
        case 'straightGuard':
          if (straightGuardBackupRef.current) {
            const backup = straightGuardBackupRef.current as Record<
              string,
              string
            >;
            setStraightGuardFormData(backup);
          }
          setIsStraightGuardEditing(false);
          break;
        case 'curvedGuard':
          if (curvedGuardBackupRef.current) {
            const backup = curvedGuardBackupRef.current as Record<
              string,
              string
            >;
            setCurvedGuardFormData(backup);
          }
          setIsCurvedGuardEditing(false);
          break;
        case 'other':
          if (otherBackupRef.current) {
            const backup = otherBackupRef.current as Record<string, string>;
            setOtherFormData(backup);
          }
          setIsOtherEditing(false);
          break;
      }
      setEditingTouched(false);
    }, 150);
  };

  const saveOverviewEdit = (
    section:
      | 'straightGauge'
      | 'straightHorizontal'
      | 'curvedGauge'
      | 'curvedHorizontal'
      | 'offset'
      | 'straightReduced'
      | 'curvedReduced'
      | 'straightGuard'
      | 'curvedGuard'
      | 'other',
  ) => {
    if (editDebounceRef.current) {
      window.clearTimeout(editDebounceRef.current);
    }
    editDebounceRef.current = window.setTimeout(() => {
      try {
        switch (section) {
          case 'straightGauge': {
            const sanitized = toStringRecord(straightRailFormData.gauge);
            setStraightRailFormData((prev) => ({
              ...prev,
              gauge: sanitized,
            }));
            // 同步到模型，确保路由切换后仍保留修改
            setStraightGauge(sanitized);
            setIsStraightGaugeEditing(false);
            break;
          }
          case 'straightHorizontal': {
            const sanitized = toStringRecord(straightRailFormData.horizontal);
            setStraightRailFormData((prev) => ({
              ...prev,
              horizontal: sanitized,
            }));
            // 同步到模型，确保路由切换后仍保留修改
            setStraightHorizontal(sanitized);
            setIsStraightHorizontalEditing(false);
            break;
          }
          case 'curvedGauge': {
            const sanitized = toStringRecord(curvedRailFormData.gauge);
            setCurvedRailFormData((prev) => ({
              ...prev,
              gauge: sanitized,
            }));
            // 同步到模型，确保路由切换后仍保留修改
            setCurvedGauge(sanitized);
            setIsCurvedGaugeEditing(false);
            break;
          }
          case 'curvedHorizontal': {
            const sanitized = toStringRecord(curvedRailFormData.horizontal);
            setCurvedRailFormData((prev) => ({
              ...prev,
              horizontal: sanitized,
            }));
            // 同步到模型，确保路由切换后仍保留修改
            setCurvedHorizontal(sanitized);
            setIsCurvedHorizontalEditing(false);
            break;
          }
          case 'offset': {
            const sanitized = toStringRecord(offsetFormData);
            setOffsetFormData(sanitized);
            setIsOffsetEditing(false);
            // 写回模型，并触发校验与状态更新
            setOffsetData(sanitized);
            validateOffsetData();
            break;
          }
          case 'straightReduced': {
            const sanitized = toStringRecord(straightReducedFormData);
            setStraightReducedFormData(sanitized);
            setIsStraightReducedEditing(false);
            // 写回模型，并触发校验与状态更新
            setStraightReducedValue(sanitized);
            validateReducedData();
            break;
          }
          case 'curvedReduced': {
            const sanitized = toStringRecord(curvedReducedFormData);
            setCurvedReducedFormData(sanitized);
            setIsCurvedReducedEditing(false);
            // 写回模型，并触发校验与状态更新
            setCurvedReducedValue(sanitized);
            validateReducedData();
            break;
          }
          case 'straightGuard': {
            const sanitized = toStringRecord(straightGuardFormData);
            setStraightGuardFormData(sanitized);
            setIsStraightGuardEditing(false);
            // 写回模型，并触发校验与状态更新
            setStraightGuardRailFlangeGroove(sanitized);
            validateGuardData();
            break;
          }
          case 'curvedGuard': {
            const sanitized = toStringRecord(curvedGuardFormData);
            setCurvedGuardFormData(sanitized);
            setIsCurvedGuardEditing(false);
            // 写回模型，并触发校验与状态更新
            setCurvedGuardRailFlangeGroove(sanitized);
            validateGuardData();
            break;
          }
          case 'other': {
            const sanitized = toStringRecord(otherFormData);
            setOtherFormData(sanitized);
            setIsOtherEditing(false);
            // 写回模型（其他数据无规则校验）
            setOtherData(sanitized);
            break;
          }
        }
      } catch (e) {
        console.error('保存会话数据失败:', e);
      }
      setEditingTouched(false);
    }, 150);
  };

  // 直轨
  // 检查轨距表单是否完成（仅在 currentStep 为 0 时）
  useEffect(() => {
    if (currentStep !== 0) return;
    const railsComplete = straightGaugeColumnTypes
      .filter((col) => !col.hidden)
      .every((col) => {
        const value = straightRailFormData.gauge[col.name];
        return (
          value !== undefined && value !== null && String(value).trim() !== ''
        );
      });
    // console.log("直轨轨距表单是否完成:", railsComplete, straightRailFormData.gauge);

    setIsRailsComplete(railsComplete);
  }, [currentStep, straightRailFormData.gauge, straightGaugeColumnTypes]);

  // 检查水平表单是否完成（仅在 currentStep 为 0 时）
  useEffect(() => {
    if (currentStep !== 0) return;
    const horizontalComplete = straightHorizontalColumnTypes
      .filter((col) => !col.hidden)
      .every((col) => {
        const value = straightRailFormData.horizontal[col.name];
        return (
          value !== undefined && value !== null && String(value).trim() !== ''
        );
      });
    // console.log("直轨水平表单是否完成:", horizontalComplete, straightRailFormData.horizontal);
    setIsHorizontalComplete(horizontalComplete);
  }, [
    currentStep,
    straightRailFormData.horizontal,
    straightHorizontalColumnTypes,
  ]);

  // 曲轨
  // 检查轨距表单是否完成（仅在 currentStep 为 1 时）
  useEffect(() => {
    if (currentStep !== 1) return;
    const railsComplete = curvedGaugeColumnTypes
      .filter((col) => !col.hidden)
      .every((col) => {
        const value = curvedRailFormData.gauge[col.name];
        return (
          value !== undefined && value !== null && String(value).trim() !== ''
        );
      });
    // console.log("曲轨轨距表单是否完成:", railsComplete, curvedRailFormData.gauge);
    setIsRailsComplete(railsComplete);
  }, [currentStep, curvedRailFormData.gauge, curvedGaugeColumnTypes]);

  // 检查水平表单是否完成（仅在 currentStep 为 1 时）
  useEffect(() => {
    if (currentStep !== 1) return;
    const horizontalComplete = curvedHorizontalColumnTypes
      .filter((col) => !col.hidden)
      .every((col) => {
        const value = curvedRailFormData.horizontal[col.name];
        return (
          value !== undefined && value !== null && String(value).trim() !== ''
        );
      });
    // console.log("曲轨水平表单是否完成:", horizontalComplete, curvedRailFormData.horizontal);
    setIsHorizontalComplete(horizontalComplete);
  }, [currentStep, curvedRailFormData.horizontal, curvedHorizontalColumnTypes]);

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      // 检查是否在页面顶部
      setIsAtTop(window.scrollY === 0);

      // 检查概览卡片是否在视口中
      const overviewCards = document.querySelectorAll('.overview-card');
      let anyInView = false;

      overviewCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        // 检查卡片是否在视口中（至少部分可见）
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          anyInView = true;
        }
      });

      setIsOverviewInView(anyInView);
    };

    window.addEventListener('scroll', handleScroll);
    // 初始检查
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasOverview]);

  useEffect(() => {
    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      const ref =
        currentStep === 0
          ? straightValidatorRef.current
          : curvedValidatorRef.current;
      if (ref) {
        lastValidationContextRef.current = {
          type: 'all',
          section: currentStep === 0 ? 'straight' : 'curved',
        };
        try {
          ref.validateAll();
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentStep]);

  // 路由进入/页面首次挂载时触发一次整体校验
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const ref =
        currentStep === 0
          ? straightValidatorRef.current
          : curvedValidatorRef.current;
      if (ref) {
        lastValidationContextRef.current = {
          type: 'all',
          section: currentStep === 0 ? 'straight' : 'curved',
        };
        try {
          ref.validateAll();
        } catch (e) {
          console.error('校验失败:', e);
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const _handleStraightValidationComplete = (
    railErrors: any[],
    horizontalErrors: any[],
  ) => {
    const ctx = lastValidationContextRef.current;
    if (
      ctx &&
      ctx.section === 'straight' &&
      ctx.type !== 'all' &&
      ctx.changedKeys &&
      ctx.changedKeys.length
    ) {
      const changedSet = new Set(ctx.changedKeys);
      const filterByChanged = (errs: any[]) =>
        errs.filter(
          (e) =>
            Array.isArray(e.columnNames) &&
            e.columnNames.some((n: string) => changedSet.has(n)),
        );
      const mergePartial = (prev: any[], updatedSubset: any[]) => {
        const keepPrev = prev.filter(
          (e) =>
            !Array.isArray(e.columnNames) ||
            !e.columnNames.some((n: string) => changedSet.has(n)),
        );
        return [...keepPrev, ...updatedSubset];
      };
      if (ctx.type === 'rail') {
        const nextGauge = mergePartial(
          straightGaugeErrors,
          filterByChanged(railErrors),
        );
        setStraightGaugeErrors(nextGauge);
      } else {
        const nextHorizontal = mergePartial(
          straightHorizontalErrors,
          filterByChanged(horizontalErrors),
        );
        setStraightHorizontalErrors(nextHorizontal);
      }
      const finalGauge =
        ctx.type === 'rail'
          ? mergePartial(straightGaugeErrors, filterByChanged(railErrors))
          : straightGaugeErrors;
      const finalHorizontal =
        ctx.type === 'horizontal'
          ? mergePartial(
              straightHorizontalErrors,
              filterByChanged(horizontalErrors),
            )
          : straightHorizontalErrors;
      const ok = finalGauge.length === 0 && finalHorizontal.length === 0;
      setCurrentStepStatus(ok ? 'finish' : 'error');
      const newStepStatus = stepStatus.slice();
      newStepStatus[currentStep] = ok ? 'finish' : 'error';
      setStepStatus(newStepStatus);
      return;
    }

    setStraightGaugeErrors(railErrors);
    setStraightHorizontalErrors(horizontalErrors);
    const ok = railErrors.length === 0 && horizontalErrors.length === 0;
    setCurrentStepStatus(ok ? 'finish' : 'error');
    const newStepStatus = stepStatus.slice();
    newStepStatus[currentStep] = ok ? 'finish' : 'error';
    setStepStatus(newStepStatus);
  };

  const _handleCurvedValidationComplete = (
    railErrors: any[],
    horizontalErrors: any[],
  ) => {
    const ctx = lastValidationContextRef.current;
    if (
      ctx &&
      ctx.section === 'curved' &&
      ctx.type !== 'all' &&
      ctx.changedKeys &&
      ctx.changedKeys.length
    ) {
      const changedSet = new Set(ctx.changedKeys);
      const filterByChanged = (errs: any[]) =>
        errs.filter(
          (e) =>
            Array.isArray(e.columnNames) &&
            e.columnNames.some((n: string) => changedSet.has(n)),
        );
      const mergePartial = (prev: any[], updatedSubset: any[]) => {
        const keepPrev = prev.filter(
          (e) =>
            !Array.isArray(e.columnNames) ||
            !e.columnNames.some((n: string) => changedSet.has(n)),
        );
        return [...keepPrev, ...updatedSubset];
      };
      if (ctx.type === 'rail') {
        const nextGauge = mergePartial(
          curvedGaugeErrors,
          filterByChanged(railErrors),
        );
        setcurvedGaugeErrors(nextGauge);
      } else {
        const nextHorizontal = mergePartial(
          curvedHorizontalErrors,
          filterByChanged(horizontalErrors),
        );
        setcurvedHorizontalErrors(nextHorizontal);
      }
      const finalGauge =
        ctx.type === 'rail'
          ? mergePartial(curvedGaugeErrors, filterByChanged(railErrors))
          : curvedGaugeErrors;
      const finalHorizontal =
        ctx.type === 'horizontal'
          ? mergePartial(
              curvedHorizontalErrors,
              filterByChanged(horizontalErrors),
            )
          : curvedHorizontalErrors;
      const ok = finalGauge.length === 0 && finalHorizontal.length === 0;
      setCurrentStepStatus(ok ? 'finish' : 'error');
      const newStepStatus = stepStatus.slice();
      newStepStatus[currentStep] = ok ? 'finish' : 'error';
      setStepStatus(newStepStatus);
      return;
    }

    setcurvedGaugeErrors(railErrors);
    setcurvedHorizontalErrors(horizontalErrors);
    const ok = railErrors.length === 0 && horizontalErrors.length === 0;
    setCurrentStepStatus(ok ? 'finish' : 'error');
    const newStepStatus = stepStatus.slice();
    newStepStatus[currentStep] = ok ? 'finish' : 'error';
    setStepStatus(newStepStatus);
  };

  // 获取列错误
  const getColumnErrors = (columnName: string, errors: any[]) => {
    // console.log('getColumnErrors:', columnName, errors);

    return errors.filter((error) => error.columnNames?.includes(columnName));
  };

  // 获取行错误
  const getRowErrors = (errors: any[]) => {
    return errors.filter((error) => error.columnNames?.length > 1);
  };

  // 三角坑异常识别与渲染辅助
  const isTriangleDepressionError = (error: any) => {
    return (
      String(error?.ruleName || '').includes('TriangleDepression') ||
      String(error?.message || '').includes('三角坑')
    );
  };

  const _getTrianglePairsFromErrors = (errors: any[]) => {
    return getRowErrors(errors)
      .filter(isTriangleDepressionError)
      .map((e: any) =>
        e.columnNames?.length >= 2
          ? [e.columnNames[0], e.columnNames[1]]
          : null,
      )
      .filter(Boolean) as [string, string][];
  };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const id = 'triangle-pulse-keyframes';
    if (!document.getElementById(id)) {
      const styleEl = document.createElement('style');
      styleEl.id = id;
      styleEl.textContent = `
@keyframes triangle-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
`;
      document.head.appendChild(styleEl);
    }
  }, []);

  const _TriangleMarker: React.FC<{ onClick?: () => void; size?: number }> = ({
    onClick,
    size,
  }) => {
    const s = size || (isMobile ? 8 : 12);
    return (
      <Tooltip title="三角坑异常数据">
        <svg
          width={s}
          height={s}
          viewBox="0 0 12 12"
          style={{
            cursor: 'pointer',
            color: 'inherit',
            animation: 'triangle-pulse 0.8s ease-in-out infinite',
          }}
          onClick={onClick}
        >
          <title>三角坑异常标记</title>
          <polygon points="6,0 12,12 0,12" fill="rgb(255,0,0)" />
        </svg>
      </Tooltip>
    );
  };

  const _scrollToOverviewItem = (section: string, colName: string) => {
    const id = `item-${section}-${colName}`;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  type EdgeType = 'left' | 'right' | 'top' | 'bottom' | 'overlap';
  type EdgeCenterType = 'left' | 'right' | 'top' | 'bottom';
  type Line = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    startEdge: EdgeType;
    endEdge: EdgeType;
    distance: number;
  };
  const _ConnectorLayer: React.FC<{
    containerRef: React.RefObject<HTMLDivElement | null>;
    section: string;
    pairs: [string, string][];
    onCompute?: (
      outputs: {
        pair: [string, string];
        startEdge: EdgeType;
        endEdge: EdgeType;
        distance: number;
        points: { x1: number; y1: number; x2: number; y2: number };
      }[],
    ) => void;
  }> = ({ containerRef, section, pairs, onCompute }) => {
    const [lines, setLines] = useState<Line[]>([]);
    const rafRef = useRef<number | null>(null);
    const bufferRef = useRef<Line[]>([]);

    useEffect(() => {
      const getRotation = (el: HTMLElement): number => {
        const t = window.getComputedStyle(el).transform;
        if (!t || t === 'none') return 0;
        if (t.startsWith('matrix(')) {
          const m = t.slice(7, -1).split(',').map(Number);
          const a = m[0],
            b = m[1];
          return Math.atan2(b, a);
        }
        return 0; // ignore matrix3d for simplicity
      };

      const toLocal = (x: number, y: number, rect: DOMRect) => ({
        x: x - rect.left,
        y: y - rect.top,
      });

      const getEdgeCenters = (
        el: HTMLElement,
        r: DOMRect,
        containerRect: DOMRect,
      ): Record<EdgeCenterType, { x: number; y: number }> => {
        const theta = getRotation(el);
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;

        if (Math.abs(theta) > 0.0001) {
          const w = el.offsetWidth || r.width;
          const h = el.offsetHeight || r.height;
          const cos = Math.cos(theta),
            sin = Math.sin(theta);
          const rot = (x: number, y: number) => ({
            x: cx + x * cos - y * sin,
            y: cy + x * sin + y * cos,
          });
          return {
            left: toLocal(rot(-w / 2, 0).x, rot(-w / 2, 0).y, containerRect),
            right: toLocal(rot(w / 2, 0).x, rot(w / 2, 0).y, containerRect),
            top: toLocal(rot(0, -h / 2).x, rot(0, -h / 2).y, containerRect),
            bottom: toLocal(rot(0, h / 2).x, rot(0, h / 2).y, containerRect),
          };
        }

        return {
          left: toLocal(r.left, r.top + r.height / 2, containerRect),
          right: toLocal(r.right, r.top + r.height / 2, containerRect),
          top: toLocal(r.left + r.width / 2, r.top, containerRect),
          bottom: toLocal(r.left + r.width / 2, r.bottom, containerRect),
        };
      };

      const getOverlapCenter = (
        ra: DOMRect,
        rb: DOMRect,
        containerRect: DOMRect,
      ) => {
        const ox = Math.max(ra.left, rb.left);
        const oy = Math.max(ra.top, rb.top);
        const or = Math.min(ra.right, rb.right);
        const ob = Math.min(ra.bottom, rb.bottom);
        const cx = (ox + or) / 2;
        const cy = (oy + ob) / 2;
        return toLocal(cx, cy, containerRect);
      };

      const candidates: [EdgeCenterType, EdgeCenterType][] = [
        ['left', 'left'],
        ['left', 'right'],
        ['left', 'top'],
        ['left', 'bottom'],
        ['right', 'left'],
        ['right', 'right'],
        ['right', 'top'],
        ['right', 'bottom'],
        ['top', 'left'],
        ['top', 'right'],
        ['top', 'top'],
        ['top', 'bottom'],
        ['bottom', 'left'],
        ['bottom', 'right'],
        ['bottom', 'top'],
        ['bottom', 'bottom'],
      ];

      const outwardOffset = (edge: EdgeCenterType) => {
        switch (edge) {
          case 'left':
            return { dx: -2, dy: 0 };
          case 'right':
            return { dx: 2, dy: 0 };
          case 'top':
            return { dx: 0, dy: -2 };
          case 'bottom':
            return { dx: 0, dy: 2 };
          default:
            return { dx: 0, dy: 0 };
        }
      };

      const computeLines = () => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const next: Line[] = [];
        const outputs: {
          pair: [string, string];
          startEdge: EdgeType;
          endEdge: EdgeType;
          distance: number;
          points: { x1: number; y1: number; x2: number; y2: number };
        }[] = [];

        for (const [a, b] of pairs) {
          const ca = document.getElementById(`item-${section}-${a}`);
          const cb = document.getElementById(`item-${section}-${b}`);
          if (!ca || !cb) continue;

          const va =
            (ca.querySelector(
              '[data-connector-anchor="value"]',
            ) as HTMLElement | null) ?? (ca as HTMLElement);
          const vb =
            (cb.querySelector(
              '[data-connector-anchor="value"]',
            ) as HTMLElement | null) ?? (cb as HTMLElement);

          const ra = va.getBoundingClientRect();
          const rb = vb.getBoundingClientRect();

          const isOverlap = !(
            ra.right < rb.left ||
            rb.right < ra.left ||
            ra.bottom < rb.top ||
            rb.bottom < ra.top
          );

          if (isOverlap) {
            const p = getOverlapCenter(ra, rb, containerRect);
            const line: Line = {
              x1: p.x,
              y1: p.y,
              x2: p.x,
              y2: p.y,
              startEdge: 'overlap',
              endEdge: 'overlap',
              distance: 0,
            };
            next.push(line);
            outputs.push({
              pair: [a, b],
              startEdge: 'overlap',
              endEdge: 'overlap',
              distance: 0,
              points: { x1: p.x, y1: p.y, x2: p.x, y2: p.y },
            });
            continue;
          }

          const ea = getEdgeCenters(va, ra, containerRect);
          const eb = getEdgeCenters(vb, rb, containerRect);

          let best: {
            start: EdgeCenterType;
            end: EdgeCenterType;
            p1: { x: number; y: number };
            p2: { x: number; y: number };
            d: number;
          } | null = null;

          for (const [sa, sb] of candidates) {
            const p1 = ea[sa];
            const p2 = eb[sb];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const d = Math.hypot(dx, dy);
            if (!best || d < best.d) {
              best = { start: sa, end: sb, p1, p2, d };
            }
          }

          if (best) {
            const o1 = outwardOffset(best.start);
            const o2 = outwardOffset(best.end);
            const x1 = best.p1.x + o1.dx;
            const y1 = best.p1.y + o1.dy;
            const x2 = best.p2.x + o2.dx;
            const y2 = best.p2.y + o2.dy;
            const line: Line = {
              x1,
              y1,
              x2,
              y2,
              startEdge: best.start,
              endEdge: best.end,
              distance: best.d,
            };
            next.push(line);
            outputs.push({
              pair: [a, b],
              startEdge: best.start,
              endEdge: best.end,
              distance: best.d,
              points: { x1, y1, x2, y2 },
            });
          }
        }

        bufferRef.current = next;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          setLines(bufferRef.current);
          if (outputs.length && onCompute) {
            try {
              onCompute(outputs);
            } catch {}
          }
        });
      };

      const handleResize = () => {
        bufferRef.current = [];
        computeLines();
      };

      computeLines();

      window.addEventListener('resize', handleResize);

      let ro: ResizeObserver | null = null;
      if (containerRef.current && 'ResizeObserver' in window) {
        ro = new ResizeObserver(handleResize);
        ro.observe(containerRef.current);
      }

      let mo: MutationObserver | null = null;
      if (containerRef.current && 'MutationObserver' in window) {
        mo = new MutationObserver(() => {
          handleResize();
        });
        try {
          mo.observe(containerRef.current, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['style', 'class'],
          });
        } catch {}
      }

      return () => {
        window.removeEventListener('resize', handleResize);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (ro && containerRef.current) {
          try {
            ro.disconnect();
          } catch {}
        }
        if (mo) {
          try {
            mo.disconnect();
          } catch {}
        }
      };
    }, [pairs, containerRef, section, onCompute]);

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2,
          overflow: 'visible',
        }}
      >
        <title>异常定位连线</title>
        {lines.map((l, _i) => (
          <line
            key={`${l.x1},${l.y1}-${l.x2},${l.y2}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="rgb(200,0,0)"
            strokeWidth={1.5}
            strokeDasharray="5 2"
            strokeLinecap="round"
            opacity={0.85}
          />
        ))}
      </svg>
    );
  };

  const renderOverviewTop = () => (
    <Row gutter={[16, 16]}>
      {/* 直轨：轨距概览 */}
      {currentStep === 0 && (
        <Col xs={24} lg={12} xl={12} xxl={12}>
          <Space direction="vertical">
            <DataOverviewCard
              title="轨距 - 数据概览"
              isEditing={isStraightGaugeEditing}
              onToggleEdit={() => toggleOverviewEdit('straightGauge')}
              onSaveEdit={() => saveOverviewEdit('straightGauge')}
              onCancelEdit={() => cancelOverviewEdit('straightGauge')}
              isComplete={isRailsComplete}
              onNavigateToCollect={() => {
                history.push('/data/collect');
              }}
              containerRef={straightGaugeOverviewRef}
              section="straightGauge"
              columns={straightGaugeColumnTypes}
              values={straightRailFormData.gauge}
              errors={straightGaugeErrors}
              column={straightGaugeCols}
              onFieldChange={(name, value) => {
                setStraightRailFormData((prev) => ({
                  ...prev,
                  gauge: { ...prev.gauge, [name]: value },
                }));
              }}
              onEditChange={onEditChange}
              datasetId={datasetId}
            />

            <CategoryDataValidator
              title="直轨轨距"
              data={[
                { ...toStringRecord(straightRailFormData.gauge), datasetId },
              ]}
              columns={straightGaugeColumnTypes}
              configureRules={(validator, cols) =>
                RuleConfigurator.configureRailRules(validator, cols)
              }
              onValidationComplete={(errors) => {
                setStraightGaugeErrors(errors);
                const ok =
                  errors.length === 0 && straightHorizontalErrors.length === 0;
                const newStatus = stepStatus.slice();
                newStatus[0] = ok ? 'finish' : 'error';
                setStepStatus(newStatus);
              }}
            />
          </Space>
        </Col>
      )}

      {/* 直轨：水平概览 */}
      {currentStep === 0 && (
        <Col xs={24} lg={12} xl={12} xxl={12}>
          <Space direction="vertical">
            <DataOverviewCard
              title="水平 - 数据概览"
              isEditing={isStraightHorizontalEditing}
              onToggleEdit={() => toggleOverviewEdit('straightHorizontal')}
              onSaveEdit={() => saveOverviewEdit('straightHorizontal')}
              onCancelEdit={() => cancelOverviewEdit('straightHorizontal')}
              isComplete={isHorizontalComplete}
              onNavigateToCollect={() => history.push('/data/collect')}
              containerRef={straightHorizontalOverviewRef}
              section="straightHorizontal"
              columns={straightHorizontalColumnTypes}
              values={straightRailFormData.horizontal}
              errors={straightHorizontalErrors}
              column={straightHorizontalCols}
              onFieldChange={(name, value) => {
                setStraightRailFormData((prev) => ({
                  ...prev,
                  horizontal: {
                    ...prev.horizontal,
                    [name]: value,
                  },
                }));
                queueFieldValidation('straightHorizontal', name);
              }}
              onEditChange={onEditChange}
              datasetId={datasetId}
            />

            <CategoryDataValidator
              title="直轨水平"
              data={[toStringRecord(straightRailFormData.horizontal)]}
              columns={straightHorizontalColumnTypes}
              configureRules={(validator, cols) =>
                RuleConfigurator.configureHorizontalRules(validator, cols)
              }
              onValidationComplete={(errors) => {
                setStraightHorizontalErrors(errors);
                const ok =
                  errors.length === 0 && straightGaugeErrors.length === 0;
                const newStatus = stepStatus.slice();
                newStatus[0] = ok ? 'finish' : 'error';
                setStepStatus(newStatus);
              }}
            />
          </Space>
        </Col>
      )}

      {/* 曲轨：轨距概览 */}
      {currentStep === 1 && (
        <Col xs={24} lg={12} xl={12} xxl={12}>
          <Space direction="vertical">
            <DataOverviewCard
              title="轨距 - 数据概览"
              isEditing={isCurvedGaugeEditing}
              onToggleEdit={() => toggleOverviewEdit('curvedGauge')}
              onSaveEdit={() => saveOverviewEdit('curvedGauge')}
              onCancelEdit={() => cancelOverviewEdit('curvedGauge')}
              isComplete={isRailsComplete}
              onNavigateToCollect={() => history.push('/data/collect')}
              containerRef={curvedGaugeOverviewRef}
              section="curvedGauge"
              columns={curvedGaugeColumnTypes}
              values={curvedRailFormData.gauge}
              errors={curvedGaugeErrors}
              column={curvedGaugeCols}
              onFieldChange={(name, value) => {
                setCurvedRailFormData((prev) => ({
                  ...prev,
                  gauge: {
                    ...prev.gauge,
                    [name]: value,
                  },
                }));
              }}
              onEditChange={onEditChange}
              datasetId={datasetId}
            />

            <CategoryDataValidator
              title="曲轨轨距"
              data={[
                { ...toStringRecord(curvedRailFormData.gauge), datasetId },
              ]}
              columns={curvedGaugeColumnTypes}
              configureRules={(validator, cols) =>
                RuleConfigurator.configureRailRules(validator, cols)
              }
              onValidationComplete={(errors) => {
                setcurvedGaugeErrors(errors);
                const ok =
                  errors.length === 0 && curvedHorizontalErrors.length === 0;
                const newStatus = stepStatus.slice();
                newStatus[1] = ok ? 'finish' : 'error';
                setStepStatus(newStatus);
              }}
            />
          </Space>
        </Col>
      )}

      {/* 曲轨：水平概览 */}
      {currentStep === 1 && (
        <Col xs={24} lg={12} xl={12} xxl={12}>
          <Space direction="vertical">
            <DataOverviewCard
              title="水平 - 数据概览"
              isEditing={isCurvedHorizontalEditing}
              onToggleEdit={() => toggleOverviewEdit('curvedHorizontal')}
              onSaveEdit={() => saveOverviewEdit('curvedHorizontal')}
              onCancelEdit={() => cancelOverviewEdit('curvedHorizontal')}
              isComplete={isHorizontalComplete}
              onNavigateToCollect={() => history.push('/data/collect')}
              containerRef={curvedHorizontalOverviewRef}
              section="curvedHorizontal"
              columns={curvedHorizontalColumnTypes}
              values={curvedRailFormData.horizontal}
              errors={curvedHorizontalErrors}
              column={curvedHorizontalCols}
              onFieldChange={(name, value) => {
                setCurvedRailFormData((prev) => ({
                  ...prev,
                  horizontal: {
                    ...prev.horizontal,
                    [name]: value,
                  },
                }));
                queueFieldValidation('curvedHorizontal', name);
              }}
              onEditChange={onEditChange}
              datasetId={datasetId}
            />

            <CategoryDataValidator
              title="曲轨水平"
              data={[toStringRecord(curvedRailFormData.horizontal)]}
              columns={curvedHorizontalColumnTypes}
              configureRules={(validator, cols) =>
                RuleConfigurator.configureHorizontalRules(validator, cols)
              }
              onValidationComplete={(errors) => {
                setcurvedHorizontalErrors(errors);
                const ok =
                  errors.length === 0 && curvedGaugeErrors.length === 0;
                const newStatus = stepStatus.slice();
                newStatus[1] = ok ? 'finish' : 'error';
                setStepStatus(newStatus);
              }}
            />
          </Space>
        </Col>
      )}
    </Row>
  );

  return (
    <PageContainer>
      {/* 顶部锚点 */}
      <div ref={topRef} style={{ position: 'absolute', top: 0, left: 0 }} />
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <ComplianceNotice style={{ marginTop: 12 }} />
        {/* 会话数据加载状态 */}
        {storageStatus === 'loading' && (
          <Alert
            showIcon
            closable
            type="info"
            message="正在从会话存储读取数据..."
          />
        )}
        {storageStatus === 'error' && (
          <Alert
            showIcon
            closable
            type="error"
            message="会话数据读取失败"
            description={storageError || undefined}
          />
        )}
        {storageStatus === 'success' && (
          <Alert showIcon closable type="success" message="已加载会话数据" />
        )}

        <Steps
          type="navigation"
          size="small"
          current={currentStep}
          onChange={onStepChange}
          style={{ marginBottom: 16 }}
          // status={currentStepStatus}
          items={[
            {
              title: '直轨数据',
              description: '填写直轨数据',
              status: stepStatus[0],
            },
            {
              title: '曲轨数据',
              description: '填写曲轨数据',
              status: stepStatus[1],
            },
            {
              title: '支距',
              description: '填写支距数据',
              status: stepStatus[2],
            },
            {
              title: '尖轨降低值',
              description: '填写尖轨降低值',
              status: stepStatus[3],
            },
            {
              title: '护轨轮缘槽',
              description: '填写护轨轮缘槽',
              status: stepStatus[4],
            },
            {
              title: '其他',
              description: '填写其他数据',
              status: stepStatus[5],
            },
            {
              title: '记录元信息',
              description: '填写并保存记录',
              status: stepStatus[6],
            },
          ]}
        ></Steps>

        {/* 参考数据集选择 */}
        <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
          <Space wrap>
            <span style={{ fontWeight: 500 }}>参考数据集：</span>
            <Select
              size="small"
              value={datasetId}
              onChange={setDatasetId}
              options={datasetOptions}
              style={{ minWidth: 200 }}
            />
          </Space>
        </Card>

        {/* 顶部数据概览 */}
        {renderOverviewTop()}

        {/* 固钉按钮 - 只在有概览时显示 */}
        {hasOverview && !isAtTop && !isOverviewInView && (
          <Affix
            style={{ position: 'fixed', bottom: 50, right: 50, zIndex: 1000 }}
          >
            <Button
              type="primary"
              shape="round"
              icon={<UpCircleOutlined />}
              size="large"
              onClick={scrollToTop}
              style={{
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                fontWeight: 'bold',
                background: '#1890ff',
                border: 'none',
              }}
            >
              查看概览
            </Button>
          </Affix>
        )}

        {currentStep === 2 &&
          (isOffsetComplete ? (
            <>
              <Card
                title="支距 - 数据概览"
                style={{ width: '100%', marginBottom: 16, borderRadius: 8 }}
                headStyle={{
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  backgroundColor: isOffsetEditing ? '#fffbe6' : '#e6f7ff',
                  padding: '12px 24px',
                }}
                className="overview-card"
                bodyStyle={{
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  paddingRight: 8,
                }}
                extra={
                  <Space wrap>
                    {!isOffsetEditing && (
                      <Button
                        type="primary"
                        onClick={() => toggleOverviewEdit('offset')}
                      >
                        编辑
                      </Button>
                    )}
                    {isOffsetEditing && (
                      <>
                        <Button
                          type="primary"
                          onClick={() => saveOverviewEdit('offset')}
                        >
                          保存
                        </Button>
                        <Button
                          danger
                          onClick={() => cancelOverviewEdit('offset')}
                        >
                          取消
                        </Button>
                      </>
                    )}
                  </Space>
                }
              >
                <Descriptions
                  bordered
                  size="small"
                  column={{
                    xs: 3,
                    sm: 6,
                    md: 8,
                    lg: 8,
                    xl: 12,
                    xxl: 12,
                  }}
                  className="filled-fields-description"
                  layout="vertical"
                >
                  {offsetColumnTypes
                    .filter((col) => !col.hidden)
                    .map((col) => {
                      const errors = getColumnErrors(col.name, offsetErrors);
                      const hasError = errors.length > 0;
                      return (
                        <Descriptions.Item
                          key={`offset-${col.name}`}
                          label={col.label}
                          className={hasError ? 'error-column' : ''}
                        >
                          <Flex justify={'space-around'} wrap gap="small">
                            {!isOffsetEditing && (
                              <span data-connector-anchor="value">
                                {displayOrDash(offsetFormData[col.name])}
                              </span>
                            )}
                            {isOffsetEditing && (
                              <Input
                                data-connector-anchor="value"
                                size="small"
                                value={offsetFormData[col.name] || ''}
                                onChange={(e) => {
                                  setOffsetFormData((prev) => ({
                                    ...prev,
                                    [col.name]: e.target.value,
                                  }));
                                  onEditChange();
                                }}
                                style={{ maxWidth: 180 }}
                              />
                            )}
                            {hasError && (
                              <>
                                <br />
                                <Popover
                                  title="错误详情"
                                  content={
                                    <div style={{ marginTop: 8 }}>
                                      {errors.map((error, _idx) => {
                                        const fatal = String(
                                          error?.ruleName || '',
                                        ).endsWith('_fatal');
                                        return (
                                          <div
                                            key={`${String(error.ruleName || error.message || 'error')}-${error.columnNames?.join('|') || 'cols'}`}
                                            style={{
                                              fontSize: 12,
                                              ...(fatal
                                                ? {
                                                    backgroundColor: '#ff4d4f',
                                                    color: '#fff',
                                                    borderRadius: 2,
                                                    padding: '0 4px',
                                                  }
                                                : { color: '#ff4d4f' }),
                                            }}
                                          >
                                            {error.message}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  }
                                >
                                  <Tag style={{ marginLeft: 8 }}>
                                    <ExclamationCircleOutlined />{' '}
                                    {errors.length}
                                  </Tag>
                                </Popover>
                              </>
                            )}
                          </Flex>
                        </Descriptions.Item>
                      );
                    })}
                </Descriptions>

                {getRowErrors(offsetErrors).length > 0 && (
                  <Alert
                    showIcon
                    message="行级错误:"
                    type="error"
                    description={
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {getRowErrors(offsetErrors).map((error, _idx) => (
                          <li
                            key={`${error.columnNames?.join('|') || 'cols'}-${String(error.ruleName || error.message || 'row')}`}
                            style={{ marginBottom: 8, listStyle: 'disc' }}
                          >
                            <div style={{ color: '#ff4d4f', fontWeight: 500 }}>
                              {(error.columnNames ?? [])
                                .map((n: string) => {
                                  const found = offsetColumnTypes.find(
                                    (c) => c.name === n,
                                  );
                                  return found ? found.label : n;
                                })
                                .join(' + ')}
                              :
                            </div>
                            <div style={{ fontSize: 14, marginTop: 4 }}>
                              {error.message}
                            </div>
                          </li>
                        ))}
                      </ul>
                    }
                  />
                )}
              </Card>
              <CategoryDataValidator
                title="支距"
                data={[toStringRecord(offsetFormData)]}
                columns={offsetColumnTypes}
                configureRules={(v, cols) =>
                  RuleConfigurator.configureOffsetRules(v, cols)
                }
                onValidationComplete={(errs) => {
                  setOffsetErrors(errs);
                  const v = new DataValidator();
                  RuleConfigurator.configureOffsetRules(v, offsetColumnTypes);
                  v.validateAll([toStringRecord(offsetFormData)]);
                  setOffsetStats(v.getErrorStatistics());
                }}
              />
            </>
          ) : (
            <>
              <DataOverviewCard
                title="支距 - 数据概览"
                isEditing={isOffsetEditing}
                onToggleEdit={() => toggleOverviewEdit('offset')}
                onSaveEdit={() => saveOverviewEdit('offset')}
                onCancelEdit={() => cancelOverviewEdit('offset')}
                isComplete={isOffsetComplete}
                onNavigateToCollect={() => history.push('/data/collect')}
                containerRef={offsetOverviewRef}
                section="offset"
                columns={offsetColumnTypes}
                values={offsetFormData}
                errors={offsetErrors}
                column={offsetCols}
                onFieldChange={(name, value) => {
                  setOffsetFormData((prev) => ({
                    ...prev,
                    [name]: value,
                  }));
                }}
                onEditChange={onEditChange}
                datasetId={datasetId}
              />

              <CategoryDataValidator
                title="支距"
                data={[toStringRecord(offsetFormData)]}
                columns={offsetColumnTypes}
                configureRules={(v, cols) =>
                  RuleConfigurator.configureOffsetRules(v, cols)
                }
                onValidationComplete={(errs) => {
                  setOffsetErrors(errs);
                  const v = new DataValidator();
                  RuleConfigurator.configureOffsetRules(v, offsetColumnTypes);
                  v.validateAll([toStringRecord(offsetFormData)]);
                  setOffsetStats(v.getErrorStatistics());
                }}
              />
            </>
          ))}

        {currentStep === 3 && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12} xl={12} xxl={12}>
              <Space direction="vertical">
                <DataOverviewCard
                  title="直轨尖轨降低值 - 数据概览"
                  isEditing={isStraightReducedEditing}
                  onToggleEdit={() => toggleOverviewEdit('straightReduced')}
                  onSaveEdit={() => saveOverviewEdit('straightReduced')}
                  onCancelEdit={() => cancelOverviewEdit('straightReduced')}
                  isComplete={isStraightReducedComplete}
                  onNavigateToCollect={() => history.push('/data/collect')}
                  containerRef={straightReducedOverviewRef}
                  section="straightReduced"
                  columns={straightReducedColumnTypes}
                  values={straightReducedFormData}
                  errors={straightReducedErrors}
                  column={straightReducedCols}
                  onFieldChange={(name, value) => {
                    setStraightReducedFormData((prev) => ({
                      ...prev,
                      [name]: value,
                    }));
                  }}
                  onEditChange={onEditChange}
                  datasetId={datasetId}
                />
                <CategoryDataValidator
                  title="直轨尖轨降低值"
                  data={[toStringRecord(straightReducedFormData)]}
                  columns={straightReducedColumnTypes}
                  configureRules={(validator, cols) =>
                    RuleConfigurator.configureSwitchRailReducedRules(
                      validator,
                      cols,
                    )
                  }
                />
              </Space>
            </Col>

            <Col xs={24} lg={12} xl={12} xxl={12}>
              <Space direction="vertical">
                <DataOverviewCard
                  title="曲轨尖轨降低值 - 数据概览"
                  isEditing={isCurvedReducedEditing}
                  onToggleEdit={() => toggleOverviewEdit('curvedReduced')}
                  onSaveEdit={() => saveOverviewEdit('curvedReduced')}
                  onCancelEdit={() => cancelOverviewEdit('curvedReduced')}
                  isComplete={isCurvedReducedComplete}
                  onNavigateToCollect={() => history.push('/data/collect')}
                  containerRef={curvedReducedOverviewRef}
                  section="curvedReduced"
                  columns={curvedReducedColumnTypes}
                  values={curvedReducedFormData}
                  errors={curvedReducedErrors}
                  column={curvedReducedCols}
                  onFieldChange={(name, value) => {
                    setCurvedReducedFormData((prev) => ({
                      ...prev,
                      [name]: value,
                    }));
                  }}
                  onEditChange={onEditChange}
                  datasetId={datasetId}
                />
                <CategoryDataValidator
                  title="曲轨尖轨降低值"
                  data={[toStringRecord(curvedReducedFormData)]}
                  columns={curvedReducedColumnTypes}
                  configureRules={(validator, cols) =>
                    RuleConfigurator.configureSwitchRailReducedRules(
                      validator,
                      cols,
                    )
                  }
                />
              </Space>
            </Col>
          </Row>
        )}

        {currentStep === 4 && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12} xl={12} xxl={12}>
              <Space direction="vertical">
                <DataOverviewCard
                  title="直轨护轨轮缘槽 - 数据概览"
                  isEditing={isStraightGuardEditing}
                  onToggleEdit={() => toggleOverviewEdit('straightGuard')}
                  onSaveEdit={() => saveOverviewEdit('straightGuard')}
                  onCancelEdit={() => cancelOverviewEdit('straightGuard')}
                  isComplete={isStraightGuardComplete}
                  onNavigateToCollect={() => {
                    history.push('/data/collect');
                  }}
                  containerRef={straightGuardOverviewRef}
                  section="straightGuard"
                  columns={straightGuardColumnTypes}
                  values={straightGuardFormData}
                  errors={straightGuardErrors}
                  column={straightGuardCols}
                  onFieldChange={(name, value) => {
                    setStraightGuardFormData((prev) => ({
                      ...prev,
                      [name]: value,
                    }));
                  }}
                  onEditChange={onEditChange}
                  datasetId={datasetId}
                />
                <CategoryDataValidator
                  title="直轨护轨轮缘槽"
                  data={[toStringRecord(straightGuardFormData)]}
                  columns={straightGuardColumnTypes}
                  configureRules={(validator, cols) =>
                    RuleConfigurator.configureGuardRailFlangeGrooveRules(
                      validator,
                      cols,
                    )
                  }
                />
              </Space>
            </Col>

            <Col xs={24} lg={12} xl={12} xxl={12}>
              <Space direction="vertical">
                <DataOverviewCard
                  title="曲轨护轨轮缘槽 - 数据概览"
                  isEditing={isCurvedGuardEditing}
                  onToggleEdit={() => toggleOverviewEdit('curvedGuard')}
                  onSaveEdit={() => saveOverviewEdit('curvedGuard')}
                  onCancelEdit={() => cancelOverviewEdit('curvedGuard')}
                  isComplete={isCurvedGuardComplete}
                  onNavigateToCollect={() => {
                    history.push('/data/collect');
                  }}
                  containerRef={curvedGuardOverviewRef}
                  section="curvedGuard"
                  columns={curvedGuardColumnTypes}
                  values={curvedGuardFormData}
                  errors={curvedGuardErrors}
                  column={curvedGuardCols}
                  onFieldChange={(name, value) => {
                    setCurvedGuardFormData((prev) => ({
                      ...prev,
                      [name]: value,
                    }));
                  }}
                  onEditChange={onEditChange}
                  datasetId={datasetId}
                />
                <CategoryDataValidator
                  title="曲轨护轨轮缘槽"
                  data={[toStringRecord(curvedGuardFormData)]}
                  columns={curvedGuardColumnTypes}
                  configureRules={(validator, cols) =>
                    RuleConfigurator.configureGuardRailFlangeGrooveRules(
                      validator,
                      cols,
                    )
                  }
                />
              </Space>
            </Col>
          </Row>
        )}

        {/* “其他”步骤：无论是否完成都显示 Descriptions */}
        {currentStep === 5 && (
          <DataOverviewCard
            title="其他 - 数据概览"
            isEditing={isOtherEditing}
            onToggleEdit={() => toggleOverviewEdit('other')}
            onSaveEdit={() => saveOverviewEdit('other')}
            onCancelEdit={() => cancelOverviewEdit('other')}
            isComplete={otherColumnTypes
              .filter((c) => !c.hidden)
              .every((c) => {
                const v = otherFormData[c.label];
                return v !== undefined && v !== null && String(v).trim() !== '';
              })}
            onNavigateToCollect={() => {
              history.push('/data/collect');
            }}
            containerRef={otherOverviewRef}
            section="other"
            columns={otherColumnTypes.map((c) => ({ ...c, name: c.label }))}
            values={otherFormData}
            errors={otherErrors}
            column={otherCols}
            onFieldChange={(name, value) => {
              setOtherFormData((prev) => ({
                ...prev,
                [name]: value,
              }));
            }}
            onEditChange={onEditChange}
            datasetId={datasetId}
          />
        )}

        {/* 第 6 步：记录元信息并保存 */}
        {currentStep === 6 && (
          <Card
            title="记录元信息"
            style={{ width: '100%', borderRadius: 8 }}
            headStyle={{ fontSize: '1.1rem', fontWeight: 'bold' }}
            extra={
              <Space wrap>
                <Button
                  type="primary"
                  loading={savingRecord}
                  onClick={onSaveRecord}
                >
                  保存记录
                </Button>
                <Button
                  onClick={() => metaForm.resetFields()}
                  disabled={savingRecord}
                >
                  重置
                </Button>
              </Space>
            }
          >
            <Form form={metaForm} layout="vertical">
              <Form.Item
                name="project"
                label="项目/线路"
                rules={[{ required: true, message: '请输入项目/线路' }]}
              >
                <Input placeholder="如：XX线 XX区间" />
              </Form.Item>
                          <Form.Item name="operator" label="操作员" rules={[{ required: true, message: '请输入记录人' }]}>
                <Input placeholder="记录人姓名" />
              </Form.Item>
                          <Form.Item name="switchId" label="道岔编号">
                              <Input placeholder="道岔编号或名称" />
              </Form.Item>

              <Form.Item name="note" label="备注">
                <Input.TextArea rows={3} placeholder="说明或备注" />
              </Form.Item>
            </Form>
          </Card>
        )}
      </Space>
    </PageContainer>
  );
};

export default DataValidatorPage;
