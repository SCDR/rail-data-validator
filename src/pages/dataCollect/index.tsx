import { UpCircleOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  Affix,
  Button,
  Card,
  message,
  Result,
  Skeleton,
  Space,
  Steps,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import RailDataCollector from './dataCollector';

const DataCollectorPage: React.FC = () => {
  // 会话存储键（已移除未使用的常量）

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

  const straightGaugeColumnTypes = [
    { name: 'ExtraCol1', label: '额外列1', hidden: false },
    { name: 'ExtraCol2', label: '额外列2', hidden: false },
    { name: 'SlopeEndCol', label: '顺坡终点', hidden: false },
    { name: 'SwitchTipCol', label: '尖轨尖', hidden: false },
    { name: 'SwitchMiddleCol', label: '尖轨中', hidden: false },
    { name: 'SwitchHeelCol', label: '尖轨跟', hidden: false },
    { name: 'LeadCurveFrontCol', label: '导曲前', hidden: false },
    { name: 'LeadCurveMiddleCol', label: '导曲中', hidden: false },
    { name: 'LeadCurveRearCol', label: '导曲后', hidden: false },
    { name: 'FrogFrontCol', label: '辙岔前', hidden: false },
    { name: 'FrogMiddleCol', label: '辙岔中', hidden: false },
    { name: 'FrogRearCol', label: '辙岔后', hidden: false },
    { name: 'CheckIntervalCol', label: '查照间隔', hidden: false },
    { name: 'GuardDistanceCol', label: '护背距离', hidden: false },
  ];
  const straightHorizontalColumnTypes = [
    { name: 'ExtraCol1', label: '额外列1', hidden: true },
    { name: 'ExtraCol2', label: '额外列2', hidden: true },
    { name: 'SlopeEndCol', label: '顺坡终点', hidden: false },
    { name: 'SwitchTipCol', label: '尖轨尖', hidden: false },
    { name: 'SwitchMiddleCol', label: '尖轨中', hidden: false },
    { name: 'SwitchHeelCol', label: '尖轨跟', hidden: false },
    { name: 'LeadCurveFrontCol', label: '导曲前', hidden: false },
    { name: 'LeadCurveMiddleCol', label: '导曲中', hidden: false },
    { name: 'LeadCurveRearCol', label: '导曲后', hidden: false },
    { name: 'FrogFrontCol', label: '辙岔前', hidden: false },
    { name: 'FrogMiddleCol', label: '辙岔中', hidden: false },
    { name: 'FrogRearCol', label: '辙岔后', hidden: false },
    { name: 'CheckIntervalCol', label: '查照间隔', hidden: false },
    { name: 'GuardDistanceCol', label: '护背距离', hidden: false },
  ];

  const curvedGaugeColumnTypes = [
    { name: 'ExtraCol1', label: '额外列1', hidden: false },
    { name: 'ExtraCol2', label: '额外列2', hidden: false },
    { name: 'SlopeEndCol', label: '顺坡终点', hidden: false },
    { name: 'SwitchTipCol', label: '尖轨尖', hidden: false },
    { name: 'SwitchMiddleCol', label: '尖轨中', hidden: false },
    { name: 'SwitchHeelCol', label: '尖轨跟', hidden: false },
    { name: 'LeadCurveFrontCol', label: '导曲前', hidden: false },
    { name: 'LeadCurveMiddleCol', label: '导曲中', hidden: false },
    { name: 'LeadCurveRearCol', label: '导曲后', hidden: false },
    { name: 'FrogFrontCol', label: '辙岔前', hidden: false },
    { name: 'FrogMiddleCol', label: '辙岔中', hidden: false },
    { name: 'FrogRearCol', label: '辙岔后', hidden: false },
    { name: 'CheckIntervalCol', label: '查照间隔', hidden: false },
    { name: 'GuardDistanceCol', label: '护背距离', hidden: false },
  ];
  const curvedHorizontalColumnTypes = [
    { name: 'ExtraCol1', label: '额外列1', hidden: true },
    { name: 'ExtraCol2', label: '额外列2', hidden: true },
    { name: 'SlopeEndCol', label: '顺坡终点', hidden: false },
    { name: 'SwitchTipCol', label: '尖轨尖', hidden: false },
    { name: 'SwitchMiddleCol', label: '尖轨中', hidden: false },
    { name: 'SwitchHeelCol', label: '尖轨跟', hidden: false },
    { name: 'LeadCurveFrontCol', label: '导曲前', hidden: false },
    { name: 'LeadCurveMiddleCol', label: '导曲中', hidden: false },
    { name: 'LeadCurveRearCol', label: '导曲后', hidden: false },
    { name: 'FrogFrontCol', label: '辙岔前', hidden: false },
    { name: 'FrogMiddleCol', label: '辙岔中', hidden: false },
    { name: 'FrogRearCol', label: '辙岔后', hidden: false },
    { name: 'CheckIntervalCol', label: '查照间隔', hidden: false },
    { name: 'GuardDistanceCol', label: '护背距离', hidden: false },
  ];

  // 移除未使用的 Form 实例
  interface FormData {
    gauge: {
      [key: string]: string | undefined;
    };
    horizontal: {
      [key: string]: string | undefined;
    };
  }
  // 移除未使用的接口 RailDataValidatorProps

  const [straightRailFormData, setStraightRailFormData] = useState<FormData>(
    () => {
      const initValues: { [key: string]: string | undefined } = {};
      straightGaugeColumnTypes.forEach((col) => {
        initValues[col.name] = undefined;
      });

      return {
        gauge: initValues,
        horizontal: {},
      };
    },
  );

  const [curvedRailFormData, setCurvedRailFormData] = useState<FormData>(() => {
    const initValues: { [key: string]: string | undefined } = {};
    curvedGaugeColumnTypes.forEach((col) => {
      initValues[col.name] = undefined;
    });

    return {
      gauge: initValues,
      horizontal: {},
    };
  });

  const {
    setStraightGauge,
    setStraightHorizontal,
    setCurvedGauge,
    setCurvedHorizontal,
    getStraightGauge,
    getStraightHorizontal,
    getCurvedGauge,
    getCurvedHorizontal,
  } = useModel('collectorData');

  // 从 sessionStorage 载入已保存数据
  useEffect(() => {
    try {
      const sg = getStraightGauge();
      const sh = getStraightHorizontal();
      const cg = getCurvedGauge();
      const ch = getCurvedHorizontal();

      // const sg = sessionStorage.getItem(STORAGE_KEYS.straightGauge);
      // const sh = sessionStorage.getItem(STORAGE_KEYS.straightHorizontal);
      // const cg = sessionStorage.getItem(STORAGE_KEYS.curvedGauge);
      // const ch = sessionStorage.getItem(STORAGE_KEYS.curvedHorizontal);
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
    } catch (e) {
      message.error('会话数据加载失败');
      console.error(e);
    }
  }, []);

  // 保存到 sessionStorage
  useEffect(() => {
    try {
      setStraightGauge(straightRailFormData.gauge || {});
      setStraightHorizontal(straightRailFormData.horizontal || {});
    } catch (e) {
      message.error('直轨数据保存失败');
      console.error(e);
    }
  }, [straightRailFormData.gauge, straightRailFormData.horizontal]);

  useEffect(() => {
    try {
      setCurvedGauge(curvedRailFormData.gauge || {});
      setCurvedHorizontal(curvedRailFormData.horizontal || {});
    } catch (e) {
      message.error('曲轨数据保存失败');
      console.error(e);
    }
  }, [curvedRailFormData.gauge, curvedRailFormData.horizontal]);

  // 分别跟踪轨距和水平的完成状态
  const [isRailsComplete, setIsRailsComplete] = useState(false);
  const [isHorizontalComplete, setIsHorizontalComplete] = useState(false);

  // 移除未使用的直轨错误状态

  // 移除未使用的曲轨错误状态

  // 添加顶部引用
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

  const [currentStep, setCurrentStep] = useState(0);
  const [_currentStepStatus, setCurrentStepStatus] = useState<
    'process' | 'wait' | 'finish' | 'error'
  >('process');
  const [stepStatus, setStepStatus] = useState<
    Array<'process' | 'wait' | 'finish' | 'error'>
  >(['process', 'wait', 'wait']);

  const onStepChange = (value: number) => {
    setCurrentStepStatus('process');
    const newStatus = [...stepStatus];
    if (newStatus[currentStep] === 'wait') {
      newStatus[currentStep] = 'process';
    }
    setStepStatus(newStatus);
    setCurrentStep(value);
  };

  // 移除未使用的表单值变化处理函数

  // 移除未使用的 getFieldValue

  // 移除未使用的 prepareStraightRailGaugeData

  // 移除未使用的 prepareStraightRailHorizontalData

  // 移除未使用的 prepareCurvedRailGaugeData

  // 移除未使用的 prepareCurvedRailHorizontalData

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
    const newStepStatus = [...stepStatus];
    newStepStatus[currentStep] = status;
    setStepStatus(newStepStatus);
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
    const newStepStatus = [...stepStatus];
    newStepStatus[currentStep] = status;
    setStepStatus(newStepStatus);
  };

  // 移除未使用的错误筛选辅助函数

  return (
    <PageContainer>
      <Space
        direction="vertical"
        size="middle"
        style={{ width: '100%', display: 'block' }}
      >
        <Steps
          type="navigation"
          size="small"
          current={currentStep}
          onChange={onStepChange}
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
              title: '其他',
              description: '填写其他数据',
              status: stepStatus[2],
            },
          ]}
        ></Steps>
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
        {currentStep === 0 && (
          <RailDataCollector
            initialGaugeData={Object.fromEntries(
              Object.entries(straightRailFormData.gauge).map(([k, v]) => [
                k,
                v ?? '',
              ]),
            )}
            initialHorizontalData={Object.fromEntries(
              Object.entries(straightRailFormData.horizontal).map(([k, v]) => [
                k,
                v ?? '',
              ]),
            )}
            gaugeColumns={straightGaugeColumnTypes}
            horizontalColumns={straightHorizontalColumnTypes}
            onDataChange={(type, data) => {
              const sanitized = Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, sanitizeValue(v)]),
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
              Object.entries(curvedRailFormData.horizontal).map(([k, v]) => [
                k,
                v ?? '',
              ]),
            )}
            gaugeColumns={curvedGaugeColumnTypes}
            horizontalColumns={curvedHorizontalColumnTypes}
            onDataChange={(type, data) => {
              const sanitized = Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, sanitizeValue(v)]),
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
          <Card
            title="其他 - 正在开发"
            style={{ width: '100%', marginBottom: 16, borderRadius: 8 }}
            headStyle={{
              fontSize: '1.1rem',
              fontWeight: 'bold',
              backgroundColor: '#f6ffed',
              padding: '12px 24px',
            }}
            className="overview-card"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Result status="info" title="开发中" subTitle="敬请期待" />
              <Skeleton />
            </Space>
          </Card>
        )}
      </Space>
    </PageContainer>
  );
};

export default DataCollectorPage;
