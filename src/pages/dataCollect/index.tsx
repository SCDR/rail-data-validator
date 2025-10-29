import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { message, Space, Steps } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import ComplianceNotice from '@/components/ComplianceNotice';
import RailDataCollector, {
  GuardRailFlangeGrooveDataCollector,
  OffsetDataCollector,
  OtherDataCollector,
  ReducedValueOfSwitchRailDataCollector,
} from './dataCollector';
import { CSSTransition, SwitchTransition } from 'react-transition-group';

const DataCollectorPage: React.FC = () => {
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
    // new column types
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
  const straightReducedColumns =
    getStraightReducedValueOfSwitchRailColumnTypes();
  const curvedReducedColumns = getCurvedReducedValueOfSwitchRailColumnTypes();
  const straightGuardColumns = getStraightGuardRailFlangeGrooveColumnTypes();
  const curvedGuardColumns = getCurvedGuardRailFlangeGrooveColumnTypes();
  const otherColumns = getOtherColumnTypes();

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
      const initGaugeValues: { [key: string]: string | undefined } = {};
      const initHorizontalValues: { [key: string]: string | undefined } = {};
      straightGaugeColumnTypes.forEach((col) => {
        if (!col.hidden) {
          initGaugeValues[col.name] = undefined;
        }
      });
      straightHorizontalColumnTypes.forEach((col) => {
        if (!col.hidden) {
          initHorizontalValues[col.name] = undefined;
        }
      });
      console.log(
        'init straightRailFormData: ',
        initGaugeValues,
        initHorizontalValues,
      );

      return {
        gauge: initGaugeValues,
        horizontal: initHorizontalValues,
      };
    },
  );

  const [curvedRailFormData, setCurvedRailFormData] = useState<FormData>(() => {
    const initGaugeValues: { [key: string]: string | undefined } = {};
    const initHorizontalValues: { [key: string]: string | undefined } = {};
    curvedGaugeColumnTypes.forEach((col) => {
      if (!col.hidden) {
        initGaugeValues[col.name] = undefined;
      }
    });
    curvedHorizontalColumnTypes.forEach((col) => {
      if (!col.hidden) {
        initHorizontalValues[col.name] = undefined;
      }
    });
    console.log(
      'init curvedRailFormData: ',
      initGaugeValues,
      initHorizontalValues,
    );

    return {
      gauge: initGaugeValues,
      horizontal: initHorizontalValues,
    };
  });

  // New step states
  const [offsetFormData, setOffsetFormData] = useState<
    Record<string, string | number | undefined>
  >(() => {
    const init: Record<string, string | number | undefined> = {};
    offsetColumnTypes.forEach((col) => {
      if (!col.hidden) init[col.name] = undefined;
    });
    return init;
  });

  const [straightReducedFormData, setStraightReducedFormData] = useState<
    Record<string, string | number | undefined>
  >(() => {
    const init: Record<string, string | number | undefined> = {};
    straightReducedColumns.forEach((col) => {
      if (!col.hidden) init[col.name] = undefined;
    });
    return init;
  });
  const [curvedReducedFormData, setCurvedReducedFormData] = useState<
    Record<string, string | number | undefined>
  >(() => {
    const init: Record<string, string | number | undefined> = {};
    curvedReducedColumns.forEach((col) => {
      if (!col.hidden) init[col.name] = undefined;
    });
    return init;
  });

  const [straightGuardFormData, setStraightGuardFormData] = useState<
    Record<string, string | number | undefined>
  >(() => {
    const init: Record<string, string | number | undefined> = {};
    straightGuardColumns.forEach((col) => {
      if (!col.hidden) init[col.name] = undefined;
    });
    return init;
  });
  const [curvedGuardFormData, setCurvedGuardFormData] = useState<
    Record<string, string | number | undefined>
  >(() => {
    const init: Record<string, string | number | undefined> = {};
    curvedGuardColumns.forEach((col) => {
      if (!col.hidden) init[col.name] = undefined;
    });
    return init;
  });

  const [otherFormData, setOtherFormData] = useState<Record<string, string>>(
    () => {
      const init: Record<string, string> = {};
      otherColumns.forEach((col) => {
        if (!col.hidden) init[col.label] = '';
      });
      return init;
    },
  );

  const {
    setStraightGauge,
    setStraightHorizontal,
    setCurvedGauge,
    setCurvedHorizontal,
    getStraightGauge,
    getStraightHorizontal,
    getCurvedGauge,
    getCurvedHorizontal,
    // new getters/setters
    setOffsetData,
    getOffsetData,
    setStraightReducedValue,
    getStraightReducedValue,
    setCurvedReducedValue,
    getCurvedReducedValue,
    setStraightGuardRailFlangeGroove,
    getStraightGuardRailFlangeGroove,
    setCurvedGuardRailFlangeGroove,
    getCurvedGuardRailFlangeGroove,
    setOtherData,
    getOtherData,
    setStepStatus: setPersistedStepStatus,
    getStepStatus: getPersistedStepStatus,
  } = useModel('collectorData');

  // 从 model 载入已保存数据
  useEffect(() => {
    try {
      const sg = getStraightGauge();
      const sh = getStraightHorizontal();
      const cg = getCurvedGauge();
      const ch = getCurvedHorizontal();
      const od = getOffsetData();
      const sRed = getStraightReducedValue();
      const cRed = getCurvedReducedValue();
      const sGuard = getStraightGuardRailFlangeGroove();
      const cGuard = getCurvedGuardRailFlangeGroove();
      const other = getOtherData();
      const sStatus = getPersistedStepStatus();

      if (sg) {
        const parsed = JSON.parse(sg) as Record<string, string>;
        setStraightRailFormData((prev) => ({
          ...prev,
          gauge: Object.fromEntries(
            Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
          ),
        }));
      }
      if (sh) {
        const parsed = JSON.parse(sh) as Record<string, string>;
        setStraightRailFormData((prev) => ({
          ...prev,
          horizontal: Object.fromEntries(
            Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
          ),
        }));
      }
      if (cg) {
        const parsed = JSON.parse(cg) as Record<string, string>;
        setCurvedRailFormData((prev) => ({
          ...prev,
          gauge: Object.fromEntries(
            Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
          ),
        }));
      }
      if (ch) {
        const parsed = JSON.parse(ch) as Record<string, string>;
        setCurvedRailFormData((prev) => ({
          ...prev,
          horizontal: Object.fromEntries(
            Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
          ),
        }));
      }
      if (od) {
        const parsed = JSON.parse(od) as Record<
          string,
          string | number | undefined
        >;
        setOffsetFormData(
          Object.fromEntries(
            Object.entries(parsed).map(([k, v]) => [
              k,
              typeof v === 'string' ? sanitizeValue(v) : v,
            ]),
          ),
        );
      }
      if (sRed) {
        const parsed = JSON.parse(sRed) as Record<
          string,
          string | number | undefined
        >;
        setStraightReducedFormData(
          Object.fromEntries(
            Object.entries(parsed).map(([k, v]) => [
              k,
              typeof v === 'string' ? sanitizeValue(v) : v,
            ]),
          ),
        );
      }
      if (cRed) {
        const parsed = JSON.parse(cRed) as Record<
          string,
          string | number | undefined
        >;
        setCurvedReducedFormData(
          Object.fromEntries(
            Object.entries(parsed).map(([k, v]) => [
              k,
              typeof v === 'string' ? sanitizeValue(v) : v,
            ]),
          ),
        );
      }
      if (sGuard) {
        const parsed = JSON.parse(sGuard) as Record<
          string,
          string | number | undefined
        >;
        setStraightGuardFormData(
          Object.fromEntries(
            Object.entries(parsed).map(([k, v]) => [
              k,
              typeof v === 'string' ? sanitizeValue(v) : v,
            ]),
          ),
        );
      }
      if (cGuard) {
        const parsed = JSON.parse(cGuard) as Record<
          string,
          string | number | undefined
        >;
        setCurvedGuardFormData(
          Object.fromEntries(
            Object.entries(parsed).map(([k, v]) => [
              k,
              typeof v === 'string' ? sanitizeValue(v) : v,
            ]),
          ),
        );
      }
      if (other) {
        const parsed = JSON.parse(other) as Record<string, string>;
        setOtherFormData(
          Object.fromEntries(
            Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
          ),
        );
      }
      if (sStatus) {
        const parsed = JSON.parse(sStatus) as Array<
          'process' | 'wait' | 'finish' | 'error'
        >;
        if (Array.isArray(parsed) && parsed.length === 6) {
          setStepStatus(parsed);
        }
      }
    } catch (e) {
      message.error('会话数据加载失败');
      console.error(e);
    }
  }, []);

  // Debounced save timers
  const offsetTimer = useRef<number>(undefined);
  const straightReducedTimer = useRef<number>(undefined);
  const curvedReducedTimer = useRef<number>(undefined);
  const straightGuardTimer = useRef<number>(undefined);
  const curvedGuardTimer = useRef<number>(undefined);
  const otherTimer = useRef<number>(undefined);
  const stepStatusTimer = useRef<number>(undefined);
  const straightRailsTimer = useRef<number>(undefined);
  const curvedRailsTimer = useRef<number>(undefined);

  // 保存到 model（带500ms防抖）
  useEffect(() => {
    if (offsetTimer.current) window.clearTimeout(offsetTimer.current);
    offsetTimer.current = window.setTimeout(() => {
      try {
        setOffsetData(offsetFormData || {});
      } catch (e) {
        message.error('支距数据保存失败');
        console.error(e);
      }
    }, 500);
    return () => {
      if (offsetTimer.current) window.clearTimeout(offsetTimer.current);
    };
  }, [offsetFormData]);

  useEffect(() => {
    if (straightReducedTimer.current)
      window.clearTimeout(straightReducedTimer.current);
    straightReducedTimer.current = window.setTimeout(() => {
      try {
        setStraightReducedValue(straightReducedFormData || {});
      } catch (e) {
        message.error('直轨尖轨降低值保存失败');
        console.error(e);
      }
    }, 500);
    return () => {
      if (straightReducedTimer.current)
        window.clearTimeout(straightReducedTimer.current);
    };
  }, [straightReducedFormData]);

  useEffect(() => {
    if (curvedReducedTimer.current)
      window.clearTimeout(curvedReducedTimer.current);
    curvedReducedTimer.current = window.setTimeout(() => {
      try {
        setCurvedReducedValue(curvedReducedFormData || {});
      } catch (e) {
        message.error('曲轨尖轨降低值保存失败');
        console.error(e);
      }
    }, 500);
    return () => {
      if (curvedReducedTimer.current)
        window.clearTimeout(curvedReducedTimer.current);
    };
  }, [curvedReducedFormData]);

  useEffect(() => {
    if (straightGuardTimer.current)
      window.clearTimeout(straightGuardTimer.current);
    straightGuardTimer.current = window.setTimeout(() => {
      try {
        setStraightGuardRailFlangeGroove(straightGuardFormData || {});
      } catch (e) {
        message.error('直轨护轨轮缘槽保存失败');
        console.error(e);
      }
    }, 500);
    return () => {
      if (straightGuardTimer.current)
        window.clearTimeout(straightGuardTimer.current);
    };
  }, [straightGuardFormData]);

  useEffect(() => {
    if (curvedGuardTimer.current) window.clearTimeout(curvedGuardTimer.current);
    curvedGuardTimer.current = window.setTimeout(() => {
      try {
        setCurvedGuardRailFlangeGroove(curvedGuardFormData || {});
      } catch (e) {
        message.error('曲轨护轨轮缘槽保存失败');
        console.error(e);
      }
    }, 500);
    return () => {
      if (curvedGuardTimer.current)
        window.clearTimeout(curvedGuardTimer.current);
    };
  }, [curvedGuardFormData]);

  // 直轨：轨距与水平的防抖保存
  useEffect(() => {
    if (straightRailsTimer.current)
      window.clearTimeout(straightRailsTimer.current);
    straightRailsTimer.current = window.setTimeout(() => {
      try {
        const toStr = (obj: Record<string, string | number | undefined>) =>
          Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [
              k,
              typeof v === 'string'
                ? v
                : v !== undefined && v !== null
                  ? String(v)
                  : '',
            ]),
          ) as Record<string, string>;
        setStraightGauge(toStr(straightRailFormData.gauge));
        setStraightHorizontal(toStr(straightRailFormData.horizontal));
      } catch (e) {
        message.error('直轨数据保存失败');
        console.error(e);
      }
    }, 500);
    return () => {
      if (straightRailsTimer.current)
        window.clearTimeout(straightRailsTimer.current);
    };
  }, [straightRailFormData]);

  // 曲轨：轨距与水平的防抖保存
  useEffect(() => {
    if (curvedRailsTimer.current) window.clearTimeout(curvedRailsTimer.current);
    curvedRailsTimer.current = window.setTimeout(() => {
      try {
        const toStr = (obj: Record<string, string | number | undefined>) =>
          Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [
              k,
              typeof v === 'string'
                ? v
                : v !== undefined && v !== null
                  ? String(v)
                  : '',
            ]),
          ) as Record<string, string>;
        setCurvedGauge(toStr(curvedRailFormData.gauge));
        setCurvedHorizontal(toStr(curvedRailFormData.horizontal));
      } catch (e) {
        message.error('曲轨数据保存失败');
        console.error(e);
      }
    }, 500);
    return () => {
      if (curvedRailsTimer.current)
        window.clearTimeout(curvedRailsTimer.current);
    };
  }, [curvedRailFormData]);

  useEffect(() => {
    if (otherTimer.current) window.clearTimeout(otherTimer.current);
    otherTimer.current = window.setTimeout(() => {
      try {
        setOtherData(otherFormData || {});
      } catch (e) {
        message.error('其他数据保存失败');
        console.error(e);
      }
    }, 500);
    return () => {
      if (otherTimer.current) window.clearTimeout(otherTimer.current);
    };
  }, [otherFormData]);

  // 分别跟踪轨距和水平的完成状态
  const [isRailsComplete, setIsRailsComplete] = useState(false);
  const [isHorizontalComplete, setIsHorizontalComplete] = useState(false);
  const [_isCurvedComplete, _setIsCurvedComplete] = useState(false);

  // 添加顶部引用
  const topRef = useRef<HTMLDivElement | null>(null);
  // 添加滚动位置状态
  const [_isAtTop, setIsAtTop] = useState(true);
  // 添加概览卡片在视口中的状态
  const [_isOverviewInView, setIsOverviewInView] = useState(false);

  // 滚动到顶部函数
  const _scrollToTop = () => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  // 检查是否有概览需要显示
  const hasOverview = isRailsComplete || isHorizontalComplete;

  const [currentStep, setCurrentStep] = useState(0);
  const [_currentStepStatus, setCurrentStepStatus] = useState<
    'process' | 'wait' | 'finish' | 'error'
  >('process');
  const [stepStatus, setStepStatus] = useState<
    Array<'process' | 'wait' | 'finish' | 'error'>
  >(['process', 'wait', 'wait', 'wait', 'wait', 'wait']);
  const [stepTransitionDirection, setStepTransitionDirection] = useState<
    'next' | 'prev'
  >('next');
  const stepTransitionRef = useRef<HTMLDivElement>(null);

  const onStepChange = (value: number) => {
    setCurrentStepStatus('process');
    const newStatus = [...stepStatus];
    if (newStatus[currentStep] === 'wait') {
      newStatus[currentStep] = 'process';
    }
    setStepStatus(newStatus);
    setStepTransitionDirection(value > currentStep ? 'next' : 'prev');
    setCurrentStep(value);
  };

  // 直轨
  useEffect(() => {
    const railsComplete = straightGaugeColumnTypes
      .filter((col) => !col.hidden)
      .every((col) => {
        const value = straightRailFormData.gauge[col.name];
        const val = typeof value === 'string' ? value.trim() : '';
        return val !== '';
      });
    setIsRailsComplete(railsComplete);
  }, [straightRailFormData.gauge, straightGaugeColumnTypes]);

  // 检查水平表单是否完成
  useEffect(() => {
    const horizontalComplete = straightHorizontalColumnTypes
      .filter((col) => !col.hidden)
      .every((col) => {
        const value = straightRailFormData.horizontal[col.name];
        const val = typeof value === 'string' ? value.trim() : '';
        return val !== '';
      });

    setIsHorizontalComplete(horizontalComplete);
  }, [straightRailFormData.horizontal, straightHorizontalColumnTypes]);

  // 曲轨
  useEffect(() => {
    const railsComplete = curvedGaugeColumnTypes
      .filter((col) => !col.hidden)
      .every((col) => {
        const value = curvedRailFormData.gauge[col.name];
        const val = typeof value === 'string' ? value.trim() : '';
        return val !== '';
      });

    setIsRailsComplete(railsComplete);
  }, [curvedRailFormData.gauge, curvedGaugeColumnTypes]);

  useEffect(() => {
    const horizontalComplete = curvedHorizontalColumnTypes
      .filter((col) => !col.hidden)
      .every((col) => {
        const value = curvedRailFormData.horizontal[col.name];
        const val = typeof value === 'string' ? value.trim() : '';
        return val !== '';
      });

    setIsHorizontalComplete(horizontalComplete);
  }, [curvedRailFormData.horizontal, curvedHorizontalColumnTypes]);

  // 步骤 0 完成度（直轨：轨距+水平两组均为100%则 finish）
  useEffect(() => {
    const gCols = straightGaugeColumnTypes.filter((c) => !c.hidden);
    const hCols = straightHorizontalColumnTypes.filter((c) => !c.hidden);
    const gAny = gCols.some((c) => {
      const v = straightRailFormData.gauge[c.name];
      const val = typeof v === 'string' ? v.trim() : v;
      return val !== '' && val !== undefined;
    });
    const gAll = gCols.every((c) => {
      const v = straightRailFormData.gauge[c.name];
      const val = typeof v === 'string' ? v.trim() : v;
      return val !== '' && val !== undefined;
    });
    const hAny = hCols.some((c) => {
      const v = straightRailFormData.horizontal[c.name];
      const val = typeof v === 'string' ? v.trim() : v;
      return val !== '' && val !== undefined;
    });
    const hAll = hCols.every((c) => {
      const v = straightRailFormData.horizontal[c.name];
      const val = typeof v === 'string' ? v.trim() : v;
      return val !== '' && val !== undefined;
    });
    const any = gAny || hAny;
    const all = gAll && hAll;
    setStepStatus((prev) => {
      const next = [...prev];
      next[0] = all ? 'finish' : any ? 'process' : 'wait';
      return next;
    });
  }, [
    straightRailFormData,
    straightGaugeColumnTypes,
    straightHorizontalColumnTypes,
  ]);

  // 步骤 1 完成度（曲轨：轨距+水平两组均为100%则 finish）
  useEffect(() => {
    const gCols = curvedGaugeColumnTypes.filter((c) => !c.hidden);
    const hCols = curvedHorizontalColumnTypes.filter((c) => !c.hidden);
    const gAny = gCols.some((c) => {
      const v = curvedRailFormData.gauge[c.name];
      const val = typeof v === 'string' ? v.trim() : v;
      return val !== '' && val !== undefined;
    });
    const gAll = gCols.every((c) => {
      const v = curvedRailFormData.gauge[c.name];
      const val = typeof v === 'string' ? v.trim() : v;
      return val !== '' && val !== undefined;
    });
    const hAny = hCols.some((c) => {
      const v = curvedRailFormData.horizontal[c.name];
      const val = typeof v === 'string' ? v.trim() : v;
      return val !== '' && val !== undefined;
    });
    const hAll = hCols.every((c) => {
      const v = curvedRailFormData.horizontal[c.name];
      const val = typeof v === 'string' ? v.trim() : v;
      return val !== '' && val !== undefined;
    });
    const any = gAny || hAny;
    const all = gAll && hAll;
    setStepStatus((prev) => {
      const next = [...prev];
      next[1] = all ? 'finish' : any ? 'process' : 'wait';
      return next;
    });
  }, [curvedRailFormData, curvedGaugeColumnTypes, curvedHorizontalColumnTypes]);

  // 新增步骤完成度（支距）
  useEffect(() => {
    const cols = offsetColumnTypes.filter((c) => !c.hidden);
    const anyFilled = cols.some((c) => {
      const v = offsetFormData[c.name];
      return (typeof v === 'string' ? v.trim() : v) !== '' && v !== undefined;
    });
    const allFilled = cols.every((c) => {
      const v = offsetFormData[c.name];
      return (typeof v === 'string' ? v.trim() : v) !== '' && v !== undefined;
    });
    setStepStatus((prev) => {
      const next = [...prev];
      next[2] = allFilled ? 'finish' : anyFilled ? 'process' : 'wait';
      return next;
    });
  }, [offsetFormData, offsetColumnTypes]);

  // 新增步骤完成度（尖轨降低值：直轨+曲轨都完成才算完成）
  useEffect(() => {
    const sCols = straightReducedColumns.filter((c) => !c.hidden);
    const cCols = curvedReducedColumns.filter((c) => !c.hidden);
    const sAny = sCols.some((c) => {
      const v = straightReducedFormData[c.name];
      return (typeof v === 'string' ? v.trim() : v) !== '' && v !== undefined;
    });
    const sAll = sCols.every((c) => {
      const v = straightReducedFormData[c.name];
      return (typeof v === 'string' ? v.trim() : v) !== '' && v !== undefined;
    });
    const cAny = cCols.some((c) => {
      const v = curvedReducedFormData[c.name];
      return (typeof v === 'string' ? v.trim() : v) !== '' && v !== undefined;
    });
    const cAll = cCols.every((c) => {
      const v = curvedReducedFormData[c.name];
      return (typeof v === 'string' ? v.trim() : v) !== '' && v !== undefined;
    });
    const any = sAny || cAny;
    const all = sAll && cAll;
    setStepStatus((prev) => {
      const next = [...prev];
      next[3] = all ? 'finish' : any ? 'process' : 'wait';
      return next;
    });
  }, [
    straightReducedFormData,
    curvedReducedFormData,
    straightReducedColumns,
    curvedReducedColumns,
  ]);

  // 新增步骤完成度（护轨轮缘槽：直轨+曲轨都完成才算完成）
  useEffect(() => {
    const sCols = straightGuardColumns.filter((c) => !c.hidden);
    const cCols = curvedGuardColumns.filter((c) => !c.hidden);
    const sAny = sCols.some((c) => {
      const v = straightGuardFormData[c.name];
      return (typeof v === 'string' ? v.trim() : v) !== '' && v !== undefined;
    });
    const sAll = sCols.every((c) => {
      const v = straightGuardFormData[c.name];
      return (typeof v === 'string' ? v.trim() : v) !== '' && v !== undefined;
    });
    const cAny = cCols.some((c) => {
      const v = curvedGuardFormData[c.name];
      return (typeof v === 'string' ? v.trim() : v) !== '' && v !== undefined;
    });
    const cAll = cCols.every((c) => {
      const v = curvedGuardFormData[c.name];
      return (typeof v === 'string' ? v.trim() : v) !== '' && v !== undefined;
    });
    const any = sAny || cAny;
    const all = sAll && cAll;
    setStepStatus((prev) => {
      const next = [...prev];
      next[4] = all ? 'finish' : any ? 'process' : 'wait';
      return next;
    });
  }, [
    straightGuardFormData,
    curvedGuardFormData,
    straightGuardColumns,
    curvedGuardColumns,
  ]);

  // 新增步骤完成度（其他：所有label非空则完成）
  useEffect(() => {
    const labels = otherColumns.filter((c) => !c.hidden).map((c) => c.label);
    const any = labels.some((l) => (otherFormData[l] ?? '').trim() !== '');
    const all = labels.every((l) => (otherFormData[l] ?? '').trim() !== '');
    setStepStatus((prev) => {
      const next = [...prev];
      next[5] = all ? 'finish' : any ? 'process' : 'wait';
      return next;
    });
  }, [otherFormData, otherColumns]);

  // Persist stepStatus to model (debounced)
  useEffect(() => {
    if (stepStatusTimer.current) window.clearTimeout(stepStatusTimer.current);
    stepStatusTimer.current = window.setTimeout(() => {
      try {
        setPersistedStepStatus(stepStatus);
      } catch (e) {
        console.error(e);
      }
    }, 500);
    return () => {
      if (stepStatusTimer.current) window.clearTimeout(stepStatusTimer.current);
    };
  }, [stepStatus]);

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY === 0);
      const overviewCards = document.querySelectorAll('.overview-card');
      let anyInView = false;
      overviewCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          anyInView = true;
        }
      });
      setIsOverviewInView(anyInView);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasOverview]);

  const handleStraightValidationComplete = (
    railErrors: any[],
    horizontalErrors: any[],
  ) => {
    const status: 'finish' | 'error' =
      railErrors.length === 0 && horizontalErrors.length === 0
        ? 'finish'
        : 'error';
    setCurrentStepStatus(status);
    // 保留进度驱动的 stepStatus，不在这里覆盖
  };

  const handleCurvedValidationComplete = (
    railErrors: any[],
    horizontalErrors: any[],
  ) => {
    const status: 'finish' | 'error' =
      railErrors.length === 0 && horizontalErrors.length === 0
        ? 'finish'
        : 'error';
    setCurrentStepStatus(status);
    // 保留进度驱动的 stepStatus，不在这里覆盖
  };
  // 最大步骤常量
  const MAX_STEP = 6;

  // 切换到下一个步骤
  const handleNextStep = () => {
    if (currentStep < MAX_STEP) {
      setStepTransitionDirection('next');
      setCurrentStep((prev) => prev + 1);
    }
  };

  return (
    <PageContainer>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <ComplianceNotice style={{ marginTop: 12 }} />
        <Steps
          type="navigation"
          direction="horizontal"
          size="small"
          current={currentStep}
          onChange={onStepChange}
          // status={currentStepStatus}
          style={{ width: '100%', textAlign: 'left' }}
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
              title: '支距数据',
              description: '填写支距数据',
              status: stepStatus[2],
            },
            {
              title: '尖轨降低值',
              description: '填写尖轨降低数据',
              status: stepStatus[3],
            },
            {
              title: '护轨轮缘槽',
              description: '填写护轨轮缘槽数据',
              status: stepStatus[4],
            },
            {
              title: '其他',
              description: '填写其他数据',
              status: stepStatus[5],
            },
          ]}
        ></Steps>

        <SwitchTransition mode="out-in">
          <CSSTransition
            nodeRef={stepTransitionRef}
            key={currentStep}
            timeout={300}
            classNames={
              stepTransitionDirection === 'next'
                ? 'step-transition-next'
                : 'step-transition-prev'
            }
          >
            <div ref={stepTransitionRef} style={{ width: '100%' }}>
              {currentStep === 0 && (
                <RailDataCollector
                  initialGaugeData={straightRailFormData.gauge}
                  initialHorizontalData={straightRailFormData.horizontal}
                  gaugeColumns={straightGaugeColumnTypes.filter(
                    (col) => !col.hidden,
                  )}
                  horizontalColumns={straightHorizontalColumnTypes.filter(
                    (col) => !col.hidden,
                  )}
                  handleNextStep={handleNextStep}
                  onDataChange={(type, data) => {
                    const sanitized = Object.fromEntries(
                      Object.entries(data).map(([k, v]) => [
                        k,
                        sanitizeValue(v),
                      ]),
                    );
                    setStraightRailFormData((prev) => ({
                      ...prev,
                      [type]: sanitized,
                    }));
                  }}
                  onValidationComplete={handleStraightValidationComplete}
                />
              )}

              {currentStep === 1 && (
                <RailDataCollector
                  initialGaugeData={Object.fromEntries(
                    Object.entries(curvedRailFormData.gauge).map(([k, v]) => [
                      k,
                      v ?? '',
                    ]),
                  )}
                  initialHorizontalData={Object.fromEntries(
                    Object.entries(curvedRailFormData.horizontal).map(
                      ([k, v]) => [k, v ?? ''],
                    ),
                  )}
                  gaugeColumns={curvedGaugeColumnTypes.filter(
                    (col) => !col.hidden,
                  )}
                  horizontalColumns={curvedHorizontalColumnTypes.filter(
                    (col) => !col.hidden,
                  )}
                  handleNextStep={handleNextStep}
                  onDataChange={(type, data) => {
                    const sanitized = Object.fromEntries(
                      Object.entries(data).map(([k, v]) => [
                        k,
                        sanitizeValue(v),
                      ]),
                    );
                    setCurvedRailFormData((prev) => ({
                      ...prev,
                      [type]: sanitized,
                    }));
                  }}
                  onValidationComplete={handleCurvedValidationComplete}
                />
              )}

              {currentStep === 2 && (
                <OffsetDataCollector
                  initialData={offsetFormData}
                  onDataChange={(data) => setOffsetFormData(data)}
                  handleNextStep={handleNextStep}
                />
              )}

              {currentStep === 3 && (
                <ReducedValueOfSwitchRailDataCollector
                  initialStraightData={straightReducedFormData}
                  initialCurvedData={curvedReducedFormData}
                  onDataChange={(type, data) => {
                    if (type === 'straight') setStraightReducedFormData(data);
                    else setCurvedReducedFormData(data);
                  }}
                  handleNextStep={handleNextStep}
                />
              )}

              {currentStep === 4 && (
                <GuardRailFlangeGrooveDataCollector
                  initialStraightData={straightGuardFormData}
                  initialCurvedData={curvedGuardFormData}
                  onDataChange={(type, data) => {
                    if (type === 'straight') setStraightGuardFormData(data);
                    else setCurvedGuardFormData(data);
                  }}
                  handleNextStep={handleNextStep}
                />
              )}

              {currentStep === 5 && (
                <OtherDataCollector
                  initialData={otherFormData}
                  onDataChange={(data) => setOtherFormData(data)}
                />
              )}
            </div>
          </CSSTransition>
        </SwitchTransition>

        <style>{`
                  .step-transition-next-enter {
                    opacity: 0;
                    transform: translateX(20px);
                  }
                  .step-transition-next-enter-active {
                    opacity: 1;
                    transform: translateX(0);
                    transition: opacity 300ms, transform 300ms ease-in-out;
                  }
                  .step-transition-next-exit {
                    opacity: 1;
                    transform: translateX(0);
                  }
                  .step-transition-next-exit-active {
                    opacity: 0;
                    transform: translateX(-20px);
                    transition: opacity 300ms, transform 300ms ease-in-out;
                  }

                  .step-transition-prev-enter {
                    opacity: 0;
                    transform: translateX(-20px);
                  }
                  .step-transition-prev-enter-active {
                    opacity: 1;
                    transform: translateX(0);
                    transition: opacity 300ms, transform 300ms ease-in-out;
                  }
                  .step-transition-prev-exit {
                    opacity: 1;
                    transform: translateX(0);
                  }
                  .step-transition-prev-exit-active {
                    opacity: 0;
                    transform: translateX(20px);
                    transition: opacity 300ms, transform 300ms ease-in-out;
                  }
                `}</style>
      </Space>
    </PageContainer>
  );
};

export default DataCollectorPage;
