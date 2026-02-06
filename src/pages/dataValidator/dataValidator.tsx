// RailDataValidator.tsx

import {
  ArrowUpOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  List,
  Popover,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  Descriptions,
  Input,
  Flex,
  Tooltip,
} from 'antd';
import type { DescriptionsProps } from 'antd';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { RuleConfigurator } from '@/components/Validation/ruleConfig';
import type {
  ColumnType,
  DataRow,
  ValidationError,
} from '@/components/Validation/types';
import { DataValidator } from '@/components/Validation/validator';
import fixedColumnData from '@/models/fixedColumnData';

// import { DataValidator } from './validator';
// import { RuleConfigurator } from './ruleConfig';
// import { ColumnType, DataRow, ValidationError } from './types';

const { Text, Paragraph } = Typography;

interface RailDataValidatorProps {
  gaugeData: DataRow[];
  horizontalData: DataRow[];
  gaugeColumns: ColumnType[];
  horizontalColumns: ColumnType[];
  onValidationComplete: (railErrors: any[], horizontalErrors: any[]) => void;
  // 新增：来自父组件的编辑状态与操作回调
  isEditing?: boolean;
  onToggleEdit?: () => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
}

/**
 * 轨道数据验证器组件
 * 用于验证轨距数据和水平数据，并提供详细的错误信息和统计
 */
const RailDataValidator = forwardRef<
  RailDataValidatorHandle,
  RailDataValidatorProps
>(
  (
    {
      gaugeData, // 轨距数据
      horizontalData, // 水平数据
      gaugeColumns, // 轨距数据列配置
      horizontalColumns, // 水平数据列配置
      onValidationComplete, // 验证完成回调函数
      // 新增：编辑相关的可选回调与状态
    },
    ref,
  ) => {
    // 会话存储键（与采集页保持一致）
    const STORAGE_KEYS = {
      straightGauge: 'dataCollect_straight_gauge',
      straightHorizontal: 'dataCollect_straight_horizontal',
      curvedGauge: 'dataCollect_curved_gauge',
      curvedHorizontal: 'dataCollect_curved_horizontal',
    } as const;

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

    // 回退数据与状态
    const [fallbackGaugeData, setFallbackGaugeData] = useState<
      DataRow[] | null
    >(null);
    const [fallbackHorizontalData, setFallbackHorizontalData] = useState<
      DataRow[] | null
    >(null);
    const [fallbackStatus, setFallbackStatus] = useState<
      'idle' | 'loading' | 'success' | 'error'
    >('idle');
    const [fallbackError, setFallbackError] = useState<string | null>(null);

    // 在 props 为空或缺失时，尝试从 sessionStorage 读取回退数据
    useEffect(() => {
      const needGauge = !gaugeData || gaugeData.length === 0;
      const needHorizontal = !horizontalData || horizontalData.length === 0;
      if (!needGauge && !needHorizontal) return;

      setFallbackStatus('loading');
      setFallbackError(null);
      try {
        if (typeof window === 'undefined') {
          setFallbackStatus('error');
          setFallbackError('window 未定义，无法访问 sessionStorage');
          return;
        }
        let loadedAny = false;
        // 先尝试直轨
        if (needGauge) {
          const sg =
            sessionStorage.getItem(STORAGE_KEYS.straightGauge) ||
            sessionStorage.getItem(STORAGE_KEYS.curvedGauge);
          if (sg) {
            const parsed = JSON.parse(sg) as Record<string, string>;
            const sanitized = Object.fromEntries(
              Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
            );
            setFallbackGaugeData([sanitized]);
            loadedAny = true;
          }
        }
        if (needHorizontal) {
          const sh =
            sessionStorage.getItem(STORAGE_KEYS.straightHorizontal) ||
            sessionStorage.getItem(STORAGE_KEYS.curvedHorizontal);
          if (sh) {
            const parsed = JSON.parse(sh) as Record<string, string>;
            const sanitized = Object.fromEntries(
              Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]),
            );
            setFallbackHorizontalData([sanitized]);
            loadedAny = true;
          }
        }

        setFallbackStatus(loadedAny ? 'success' : 'idle');
      } catch (e: any) {
        setFallbackStatus('error');
        setFallbackError(e?.message || '会话数据回退解析失败');
        console.error(e);
      }
    }, [gaugeData, horizontalData]);

    // 选用有效数据
    const effectiveGaugeData: DataRow[] =
      (fallbackGaugeData ?? gaugeData) || [];
    const effectiveHorizontalData: DataRow[] =
      (fallbackHorizontalData ?? horizontalData) || [];

    const isDataComplete = (data: DataRow[], columns: ColumnType[]) => {
      if (!data || data.length === 0) return false;
      const row = data[0] || {};
      return columns
        .filter((c) => !c.hidden)
        .every((c) => {
          const v = (row as any)[c.name];
          return v !== undefined && v !== null && String(v).trim() !== '';
        });
    };
    const isGaugeComplete = React.useMemo(
      () => isDataComplete(effectiveGaugeData, gaugeColumns),
      [effectiveGaugeData, gaugeColumns],
    );
    const isHorizontalComplete = React.useMemo(
      () => isDataComplete(effectiveHorizontalData, horizontalColumns),
      [effectiveHorizontalData, horizontalColumns],
    );

    // 状态管理
    const [railErrors, setRailErrors] = useState<ValidationError[]>([]); // 轨距数据错误列表
    const [horizontalErrors, setHorizontalErrors] = useState<ValidationError[]>(
      [],
    ); // 水平数据错误列表
    const [railStats, setRailStats] = useState<any>(null); // 轨距数据统计信息
    const [horizontalStats, setHorizontalStats] = useState<any>(null); // 水平数据统计信息
    const [loading, setLoading] = useState(false); // 加载状态

    /**
     * 响应式：跟踪视口宽度以在尺寸变化时更新内容
     */
    const [viewportWidth, setViewportWidth] = useState<number>(0);
    useEffect(() => {
      const handleResize = () =>
        setViewportWidth(typeof window !== 'undefined' ? window.innerWidth : 0);
      handleResize();
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      }
      return;
    }, []);

    const ellipsisRows = viewportWidth < 576 ? 2 : viewportWidth < 992 ? 3 : 4;

    /**
     * 验证轨距数据（异步）
     */
    const validateRailData = async (): Promise<ValidationError[]> => {
      setLoading(true);
      if (!isGaugeComplete) {
        setRailErrors([]);
        setRailStats(null);
        setLoading(false);
        try {
          onValidationComplete([], horizontalErrors);
        } catch {}
        return [];
      }
      const validator = new DataValidator();
      RuleConfigurator.configureRailRules(validator, gaugeColumns);
      const errors = validator.validateAll(effectiveGaugeData);
      setRailErrors(errors);
      setRailStats(validator.getErrorStatistics());
      setLoading(false);
      try {
        onValidationComplete(errors, horizontalErrors);
      } catch {}
      return errors;
    };

    /**
     * 验证水平数据（异步）
     */
    const validateHorizontalData = async (): Promise<ValidationError[]> => {
      setLoading(true);
      if (!isHorizontalComplete) {
        setHorizontalErrors([]);
        setHorizontalStats(null);
        setLoading(false);
        try {
          onValidationComplete(railErrors, []);
        } catch {}
        return [];
      }
      const validator = new DataValidator();
      RuleConfigurator.configureHorizontalRules(validator, horizontalColumns);
      const errors = validator.validateAll(effectiveHorizontalData);
      setHorizontalErrors(errors);
      setHorizontalStats(validator.getErrorStatistics());
      setLoading(false);
      try {
        onValidationComplete(railErrors, errors);
      } catch {}
      return errors;
    };

    /**
     * 同时验证轨距与水平数据（异步）
     */
    const validateAll = async (): Promise<{
      railErrors: ValidationError[];
      horizontalErrors: ValidationError[];
    }> => {
      setLoading(true);
      const railValidator = new DataValidator();
      RuleConfigurator.configureRailRules(railValidator, gaugeColumns);
      const railErrors1 = isGaugeComplete
        ? railValidator.validateAll(effectiveGaugeData)
        : [];
      setRailErrors(railErrors1);
      setRailStats(isGaugeComplete ? railValidator.getErrorStatistics() : null);

      const horizontalValidator1 = new DataValidator();
      RuleConfigurator.configureHorizontalRules(
        horizontalValidator1,
        horizontalColumns,
      );
      const horizontalErrors1 = isHorizontalComplete
        ? horizontalValidator1.validateAll(effectiveHorizontalData)
        : [];
      setHorizontalErrors(horizontalErrors1);
      setHorizontalStats(
        isHorizontalComplete ? horizontalValidator1.getErrorStatistics() : null,
      );

      try {
        onValidationComplete(railErrors1, horizontalErrors1);
      } catch {}
      setLoading(false);
      return { railErrors: railErrors1, horizontalErrors: horizontalErrors1 };
    };

    useImperativeHandle(ref, () => ({
      validateRailData,
      validateHorizontalData,
      validateAll,
    }));

    // 自动：当数据或列配置变化时，触发一次整体校验（防抖）
    const autoValidateTimerRef = React.useRef<number | null>(null);
    useEffect(() => {
      if (autoValidateTimerRef.current)
        window.clearTimeout(autoValidateTimerRef.current);
      autoValidateTimerRef.current = window.setTimeout(() => {
        validateAll().catch((e) => console.error('数据更新校验失败:', e));
      }, 300);
      return () => {
        if (autoValidateTimerRef.current)
          window.clearTimeout(autoValidateTimerRef.current);
      };
    }, [
      effectiveGaugeData,
      effectiveHorizontalData,
      gaugeColumns,
      horizontalColumns,
    ]);

    const gaugeLabelMap = React.useMemo(
      () =>
        new Map(gaugeColumns.map((c) => [c.name, (c as any).label || c.name])),
      [gaugeColumns],
    );
    const horizontalLabelMap = React.useMemo(
      () =>
        new Map(
          horizontalColumns.map((c) => [c.name, (c as any).label || c.name]),
        ),
      [horizontalColumns],
    );
    const renderErrorStats = (
      stats: any,
      title: string,
      labelMap: Map<string, string>,
    ) => {
      if (!stats) return null;

      return (
        <Card
          title={`${title}错误统计`}
          bordered={false}
          style={{ marginTop: 16 }}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Statistic
                title="总错误数"
                value={stats.total}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: stats.total > 0 ? '#cf1322' : '#3f8600' }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="影响列数"
                value={Object.keys(stats.byColumn).length}
                prefix={<ArrowUpOutlined />}
              />
            </Col>
          </Row>

          <Divider orientation="left">按列统计</Divider>
          <Row gutter={[16, 16]}>
            {Object.entries(stats.byColumn).map(
              ([column, data]: [string, any]) => (
                <Col key={column} xs={12} sm={12} md={6} lg={3}>
                  <Card size="small">
                    <Text
                      strong
                      style={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {labelMap.get(column) || column}
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <Popover
                        title="错误详情"
                        content={
                          <div>
                            {data.errors.map((error: any) => (
                              <p key={error.message}>{error.message}</p>
                            ))}
                          </div>
                        }
                      >
                        <Tag color="error">
                          <ExclamationCircleOutlined /> {data.count}
                        </Tag>
                      </Popover>
                    </div>
                  </Card>
                </Col>
              ),
            )}
          </Row>
        </Card>
      );
    };

    const renderErrors = (
      errors: ValidationError[],
      title: string,
      isComplete: boolean,
      labelMap: Map<string, string>,
    ) => {
      if (errors.length === 0) {
        if (!isComplete) return null;
        return (
          <Alert
            message={`${title}数据验证通过`}
            description="没有发现任何错误，数据符合所有规则要求。"
            type="success"
            showIcon
            style={{ marginTop: 16 }}
          />
        );
      }

      return (
        <Collapse defaultActiveKey={[]} style={{ marginTop: 16 }}>
          <Collapse.Panel
            header={`${title}详细错误列表`}
            key={`${title}-detail-errors`}
          >
            <div style={{ height: 320, overflowY: 'auto', paddingRight: 8 }}>
              <List
                size="small"
                bordered
                dataSource={errors}
                renderItem={(error) => {
                  const isTriangleDepression = error.ruleName.includes(
                    'Triangle_Depression',
                  );
                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          isTriangleDepression ? (
                            <WarningOutlined
                              style={{ color: '#ff4d4f', fontSize: 18 }}
                            />
                          ) : (
                            <ExclamationCircleOutlined
                              style={{ color: '#ff4d4f', fontSize: 18 }}
                            />
                          )
                        }
                        title={
                          <Space>
                            <Tag
                              color={isTriangleDepression ? 'warning' : 'error'}
                            >
                              行 {error.rowIndex + 1}
                            </Tag>
                            <Text strong>
                              {(error.columnNames ?? [])
                                .map((n: string) => labelMap.get(n) || n)
                                .join(' & ')}
                            </Text>
                          </Space>
                        }
                        description={
                          <div>
                            <Text
                              type="secondary"
                              style={{
                                display: 'inline-block',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {error.ruleName}
                            </Text>
                            <Paragraph
                              style={{
                                marginTop: 4,
                                marginBottom: 0,
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                              }}
                              ellipsis={{
                                rows: ellipsisRows,
                                tooltip: error.message,
                              }}
                            >
                              {error.message}
                            </Paragraph>
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </div>
          </Collapse.Panel>
        </Collapse>
      );
    };

    return (
      <Card title="辅助数据校验摘要" bordered={false} style={{ width: '100%' }}>
        {/* 会话数据回退状态提示 */}
        {fallbackStatus === 'loading' && (
          <Alert
            showIcon
            type="info"
            message="正在尝试从会话存储读取数据回退..."
            style={{ marginBottom: 16 }}
          />
        )}
        {fallbackStatus === 'error' && (
          <Alert
            showIcon
            type="error"
            message="会话数据回退失败"
            description={fallbackError || undefined}
            style={{ marginBottom: 16 }}
          />
        )}
        {fallbackStatus === 'success' && (
          <Alert
            showIcon
            type="success"
            message="已加载会话数据回退"
            style={{ marginBottom: 16 }}
          />
        )}

        <div style={{ marginBottom: 24 }}>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={validateAll}
            loading={loading}
            size="large"
          >
            校验所有数据
          </Button>
        </div>

        {/* 未完成填充提示 */}
        {(!isGaugeComplete || !isHorizontalComplete) && (
          <Alert
            showIcon
            type="warning"
            message="未完成填充"
            description="请返回数据采集页面，采集所有必填字段后再进行校验。"
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={[16, 16]} wrap>
          <Col
            xs={24} // 手机端: 每行1列
            sm={24} // 小平板: 每行3列
            md={24} // 中等屏幕: 每行8列
            lg={24} // 大屏幕: 每行8列
          >
            <ProCard
              collapsible
              title="轨距辅助数据校验"
              bodyStyle={{
                maxHeight: '60vh',
                overflowY: 'auto',
                overflowX: 'auto',
                paddingRight: 8,
              }}
              extra={
                <Space>
                  <Button onClick={validateRailData} loading={loading}>
                    校验轨距数据
                  </Button>
                </Space>
              }
            >
              <Row>
                <Col span={24}>
                  {railStats &&
                    renderErrorStats(railStats, '轨距', gaugeLabelMap)}
                </Col>
                <Col span={24}>
                  {renderErrors(
                    railErrors,
                    '轨距',
                    isGaugeComplete,
                    gaugeLabelMap,
                  )}
                </Col>
              </Row>
            </ProCard>
          </Col>

          <Col
            xs={24} // 手机端: 每行1列
            sm={24} // 小平板: 每行3列
            md={24} // 中等屏幕: 每行8列
            lg={24} // 大屏幕: 每行8列
          >
            <ProCard
              collapsible
              title="水平辅助数据校验"
              bodyStyle={{
                maxHeight: '60vh',
                overflowY: 'auto',
                overflowX: 'auto',
                paddingRight: 8,
              }}
              extra={
                <Space>
                  <Button onClick={validateHorizontalData} loading={loading}>
                    校验水平数据
                  </Button>
                </Space>
              }
            >
              <Row>
                <Col span={24}>
                  {horizontalStats &&
                    renderErrorStats(
                      horizontalStats,
                      '水平',
                      horizontalLabelMap,
                    )}
                </Col>
                <Col span={24}>
                  {renderErrors(
                    horizontalErrors,
                    '水平',
                    isHorizontalComplete,
                    horizontalLabelMap,
                  )}
                </Col>
              </Row>
            </ProCard>
          </Col>
        </Row>
      </Card>
    );
  },
);

export default RailDataValidator;

export interface RailDataValidatorHandle {
  validateRailData: () => Promise<ValidationError[]>;
  validateHorizontalData: () => Promise<ValidationError[]>;
  validateAll: () => Promise<{
    railErrors: ValidationError[];
    horizontalErrors: ValidationError[];
  }>;
}

export type CategoryDataValidatorProps = {
  title: string;
  data: DataRow[];
  columns: ColumnType[];
  configureRules: (validator: DataValidator, columns: ColumnType[]) => void;
  onValidationComplete?: (errors: ValidationError[]) => void;
};

export const CategoryDataValidator: React.FC<CategoryDataValidatorProps> = ({
  title,
  data,
  columns,
  configureRules,
  onValidationComplete,
}) => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const isComplete = React.useMemo(() => {
    if (!data || data.length === 0) return false;
    const row = data[0] || {};
    return columns
      .filter((c) => !c.hidden)
      .every((c) => {
        const v = (row as any)[c.name];
        return v !== undefined && v !== null && String(v).trim() !== '';
      });
  }, [data, columns]);

  const labelMap = React.useMemo(
    () => new Map(columns.map((c) => [c.name, (c as any).label || c.name])),
    [columns],
  );

  const [viewportWidth, setViewportWidth] = useState<number>(0);
  React.useEffect(() => {
    const handleResize = () =>
      setViewportWidth(typeof window !== 'undefined' ? window.innerWidth : 0);
    handleResize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
    return;
  }, []);
  const ellipsisRows = viewportWidth < 576 ? 2 : viewportWidth < 992 ? 3 : 4;

  const validate = async (): Promise<ValidationError[]> => {
    setLoading(true);
    try {
      if (!isComplete) {
        setErrors([]);
        setStats(null);
        if (onValidationComplete) onValidationComplete([]);
        return [];
      }
      const v = new DataValidator();
      configureRules(v, columns);
      const errs = v.validateAll(data);
      setErrors(errs);
      setStats(v.getErrorStatistics());
      if (onValidationComplete) onValidationComplete(errs);
      return errs;
    } finally {
      setLoading(false);
    }
  };

  // 自动：当类别数据或列配置变化时，触发校验（防抖）
  const categoryAutoValidateTimerRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (categoryAutoValidateTimerRef.current)
      window.clearTimeout(categoryAutoValidateTimerRef.current);
    categoryAutoValidateTimerRef.current = window.setTimeout(() => {
      validate().catch((e) => console.error('类别数据更新校验失败:', e));
    }, 300);
    return () => {
      if (categoryAutoValidateTimerRef.current)
        window.clearTimeout(categoryAutoValidateTimerRef.current);
    };
  }, [data, columns]);

  const renderErrorStatsGeneral = (
    s: any,
    t: string,
    lm: Map<string, string>,
  ) => {
    if (!s) return null;
    return (
      <Card title={`${t}错误统计`} bordered={false} style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Statistic
              title="总错误数"
              value={s.total}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: s.total > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="影响列数"
              value={Object.keys(s.byColumn).length}
              prefix={<ArrowUpOutlined />}
            />
          </Col>
        </Row>
        <Divider orientation="left">按列统计</Divider>
        <Row gutter={[16, 16]}>
          {Object.entries(s.byColumn).map(([column, data]: [string, any]) => (
            <Col key={column} xs={12} sm={12} md={12} lg={12}>
              <Card size="small">
                <Text
                  strong
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {lm.get(column) || column}
                </Text>
                <div style={{ marginTop: 8 }}>
                  <Popover
                    title="错误详情"
                    content={
                      <div>
                        {data.errors.map((error: any) => (
                          <p key={error.message}>{error.message}</p>
                        ))}
                      </div>
                    }
                  >
                    <Tag color="error">
                      <ExclamationCircleOutlined /> {data.count}
                    </Tag>
                  </Popover>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    );
  };

  const renderErrorsGeneral = (
    es: ValidationError[],
    t: string,
    complete: boolean,
    lm: Map<string, string>,
  ) => {
    if (es.length === 0) {
      if (!complete) return null;
      return (
        <Alert
          message={`${t}数据验证通过`}
          description="没有发现任何错误，数据符合所有规则要求。"
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      );
    }
    return (
      <Collapse defaultActiveKey={[]} style={{ marginTop: 16 }}>
        <Collapse.Panel header={`${t}详细错误列表`} key={`${t}-detail-errors`}>
          <div style={{ height: 320, overflowY: 'auto', paddingRight: 8 }}>
            <List
              size="small"
              bordered
              dataSource={es}
              renderItem={(error) => {
                const isTriangleDepression = error.ruleName.includes(
                  'Triangle_Depression',
                );
                return (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        isTriangleDepression ? (
                          <WarningOutlined
                            style={{ color: '#ff4d4f', fontSize: 18 }}
                          />
                        ) : (
                          <ExclamationCircleOutlined
                            style={{ color: '#ff4d4f', fontSize: 18 }}
                          />
                        )
                      }
                      title={
                        <Space>
                          <Tag
                            color={isTriangleDepression ? 'warning' : 'error'}
                          >
                            行 {error.rowIndex + 1}
                          </Tag>
                          <Text strong>
                            {(error.columnNames ?? [])
                              .map((n: string) => lm.get(n) || n)
                              .join(' & ')}
                          </Text>
                        </Space>
                      }
                      description={
                        <div>
                          <Text
                            type="secondary"
                            style={{
                              display: 'inline-block',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {error.ruleName}
                          </Text>
                          <Paragraph
                            style={{
                              marginTop: 4,
                              marginBottom: 0,
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                            }}
                            ellipsis={{
                              rows: ellipsisRows,
                              tooltip: error.message,
                            }}
                          >
                            {error.message}
                          </Paragraph>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </div>
        </Collapse.Panel>
      </Collapse>
    );
  };

  return (
    <Card
      title={`${title}辅助数据校验摘要`}
      bordered={false}
      style={{ width: '100%' }}
    >
      <div style={{ marginBottom: 24 }}>
        <Button type="primary" onClick={validate} loading={loading}>
          校验{title}数据
        </Button>
      </div>

      {!isComplete && (
        <Alert
          showIcon
          type="warning"
          message="未完成填充"
          description="请返回数据采集页面，采集所有必填字段后再进行校验。"
          style={{ marginBottom: 16 }}
        />
      )}

      <Row>
        <Col span={24}>
          {stats && renderErrorStatsGeneral(stats, title, labelMap)}
        </Col>
        <Col span={24}>
          {renderErrorsGeneral(errors, title, isComplete, labelMap)}
        </Col>
      </Row>
    </Card>
  );
};

// 可复用的概览卡片组件
export interface DataOverviewCardProps {
  title: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  isComplete: boolean;
  onNavigateToCollect: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  section: string;
  columns: ColumnType[];
  values: Record<string, string | undefined>;
  errors: ValidationError[];
  column: DescriptionsProps['column'];
  onFieldChange: (name: string, value: string) => void;
  onEditChange?: () => void;
  datasetId: string;
}

const displayOrDash = (value: unknown) => {
  if (value === null || value === undefined) return '—';
  const s = String(value).trim();
  return s.length ? s : '—';
};

const getColumnErrors = (columnName: string, errors: any[]) => {
  return errors.filter((error) => error.columnNames?.includes(columnName));
};

const getRowErrors = (errors: any[]) => {
  return errors.filter((error) => (error.columnNames?.length || 0) > 1);
};

const isTriangleDepressionError = (error: any) => {
  return (
    String(error?.ruleName || '').includes('TriangleDepression') ||
    String(error?.message || '').includes('三角坑')
  );
};

const getTrianglePairsFromErrors = (errors: any[]) => {
  return getRowErrors(errors)
    .filter(isTriangleDepressionError)
    .map((e: any) =>
      e.columnNames?.length >= 2 ? [e.columnNames[0], e.columnNames[1]] : null,
    )
    .filter(Boolean) as [string, string][];
};

// 三角标记与连线层（复制自 index.tsx 的模式，保持行为一致）
const TriangleMarker: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return (
    <Tooltip title="疑似三角坑异常：点击查看相关字段" placement="top">
      <span
        onClick={onClick}
        style={{
          display: 'inline-block',
          width: isMobile ? 12 : 16,
          height: isMobile ? 12 : 16,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: '14px solid #ff4d4f',
          cursor: 'pointer',
          transform: 'translateY(2px)',
        }}
      />
    </Tooltip>
  );
};

const ConnectorLayer: React.FC<{
  containerRef: React.RefObject<HTMLElement | null>;
  section: string;
  pairs: [string, string][];
}> = ({ containerRef, section, pairs }) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const svg = container.querySelector(
      'svg.connector-layer',
    ) as SVGSVGElement | null;
    let svgEl = svg;
    if (!svgEl) {
      svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgEl.setAttribute('class', 'connector-layer');
      svgEl.style.position = 'absolute';
      svgEl.style.inset = '0';
      svgEl.style.pointerEvents = 'none';
      container.prepend(svgEl);
    }

    const getAnchorRect = (colName: string) => {
      const anchor = container.querySelector(
        `#item-${section}-${colName} [data-connector-anchor="value"]`,
      ) as HTMLElement | null;
      if (!anchor) return null;
      const rect = anchor.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      return {
        x: rect.left - contRect.left,
        y: rect.top - contRect.top,
        w: rect.width,
        h: rect.height,
      };
    };

    const renderLines = () => {
      if (!svgEl) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svgEl.setAttribute('width', String(width));
      svgEl.setAttribute('height', String(height));
      svgEl.innerHTML = '';

      pairs.forEach(([a, b]) => {
        const ra = getAnchorRect(a);
        const rb = getAnchorRect(b);
        if (!ra || !rb) return;
        const ax = ra.x + ra.w / 2;
        const ay = ra.y + ra.h / 2;
        const bx = rb.x + rb.w / 2;
        const by = rb.y + rb.h / 2;
        const path = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path',
        );
        const d = `M ${ax} ${ay} C ${ax} ${ay + 40}, ${bx} ${by - 40}, ${bx} ${by}`;
        path.setAttribute('d', d);
        path.setAttribute('stroke', '#ff4d4f');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        svgEl?.appendChild(path);
      });
    };

    renderLines();

    const resizeObserver = new ResizeObserver(() => renderLines());
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [containerRef, section, pairs]);

  return null;
};

export const DataOverviewCard: React.FC<DataOverviewCardProps> = ({
  title,
  isEditing,
  onToggleEdit,
  onSaveEdit,
  onCancelEdit,
  isComplete,
  onNavigateToCollect,
  containerRef,
  section,
  columns,
  values,
  errors,
  column,
  onFieldChange,
  onEditChange,
  datasetId,
}) => {
  // 使用父组件传入的数据集 id，避免硬编码

  const scrollToOverviewItem = (sec: string, colName: string) => {
    const el = document.getElementById(`item-${sec}-${colName}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const shouldSkipAppendForSwitchRailReduction = (name: string) => {
    return (
      name === 'spacingBetweentracks&GuardRails1' ||
      name === 'spacingBetweentracks&GuardRails2' ||
      name === 'spacingBetweentracks&WingrRails'
    );
  };

  const shouldSkipAppendForGuardRailWear = (name: string) => {
    return (
      name === 'guardrailWear' ||
      name === 'wingRailVerticalGrinding' ||
      name === 'verticalGrindingOfHeartRail'
    );
  };

  const isSwitchRailReductionValue = (name: string) => {
    return name.startsWith('reducedValueOfSwitchRail');
  };

  const isGuardRailFlangeGroove = (name: string) => {
    return name.startsWith('guardRailFlangeGroove');
  };

  const buildLabelWithReference = (
    sec: string,
    name: string,
    baseLabel: string,
  ): string => {
    let append = '';
    // 直轨/曲轨的轨距与水平：按轨型追加通用参考值
    if (sec === 'straightGauge' || sec === 'straightHorizontal') {
      const v = fixedColumnData.getFixedValue(datasetId, name, {
        trackType: 'straight',
      });
      if (v !== undefined) append = `（${v}）`;
    } else if (sec === 'curvedGauge' || sec === 'curvedHorizontal') {
      const v = fixedColumnData.getFixedValue(datasetId, name, {
        trackType: 'curved',
      });
      if (v !== undefined) append = `（${v}）`;
    }

    // 尖轨降低值：显示两类参考值（距尖长/计划），不对间隔类追加
    else if (sec === 'straightReduced' || sec === 'curvedReduced') {
      if (shouldSkipAppendForSwitchRailReduction(name)) {
        append = '';
      } else if (isSwitchRailReductionValue(name)) {
        const tt = sec === 'straightReduced' ? 'straight' : 'curved';
        const d = fixedColumnData.getFixedValue(datasetId, name, {
          trackType: tt as 'straight' | 'curved',
          mode: 'distanceLength',
        });
        const p = fixedColumnData.getFixedValue(datasetId, name, {
          trackType: tt as 'straight' | 'curved',
          mode: 'plan',
        });
        if (d !== undefined || p !== undefined) {
          const dv = d !== undefined ? d : '—';
          const pv = p !== undefined ? p : '—';
          append = `（距尖长：${dv}，计划：${pv}）`;
        }
      }
    }

    // 护轨轮缘槽：直/曲值相同，仅对轮缘槽项追加；磨耗项不追加
    else if (sec === 'straightGuard' || sec === 'curvedGuard') {
      if (shouldSkipAppendForGuardRailWear(name)) {
        append = '';
      } else if (isGuardRailFlangeGroove(name)) {
        const v = fixedColumnData.getFixedValue(datasetId, name);
        if (v !== undefined) append = `（${v}）`;
      }
    }

    // 支距：追加参考值
    else if (sec === 'offset') {
      const v = fixedColumnData.getFixedValue(datasetId, name);
      if (v !== undefined) append = `（${v}）`;
    }

    // 其他：不追加参考值
    else {
      append = '';
    }

    return append ? `${baseLabel}${append}` : baseLabel;
  };

  return (
    <Card
      title={title}
      className="overview-card"
      headStyle={{
        background: isEditing ? '#fffbe6' : '#e6f7ff',
      }}
      bodyStyle={{
        maxHeight: '60vh',
        overflowY: 'auto',
        overflowX: 'auto',
        paddingRight: 8,
      }}
      extra={
        <Space>
          {!isEditing ? (
            <Button onClick={onToggleEdit} type="primary">
              编辑
            </Button>
          ) : (
            <Space>
              <Button onClick={onSaveEdit} type="primary">
                保存
              </Button>
              <Button onClick={onCancelEdit}>取消</Button>
            </Space>
          )}
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {!isComplete && (
          <Alert
            type="warning"
            showIcon
            message="未完成填充"
            description="请返回数据采集页面，采集所有字段以查看概览。"
            action={
              <Button type="primary" onClick={onNavigateToCollect}>
                前往采集
              </Button>
            }
          />
        )}

        <div ref={containerRef as any} style={{ position: 'relative' }}>
          <Descriptions
            bordered
            size="small"
            column={column}
            className="filled-fields-description"
            layout="vertical"
          >
            {columns
              .filter((col) => !col.hidden)
              .map((col) => {
                const colErrors = getColumnErrors(col.name, errors);
                const hasError = colErrors.length > 0;
                const hasTriangle = colErrors.some(isTriangleDepressionError);
                const isFatal = colErrors.some((e: any) =>
                  String(e?.ruleName || '').endsWith('_fatal'),
                );

                const labelWithRef = buildLabelWithReference(
                  section,
                  col.name,
                  col.label,
                );
                return (
                  <Descriptions.Item key={col.name} label={labelWithRef}>
                    <Flex
                      id={`item-${section}-${col.name}`}
                      justify="space-around"
                      wrap
                      gap="small"
                    >
                      {!isEditing ? (
                        <span
                          data-connector-anchor="value"
                          style={
                            isFatal
                              ? {
                                  backgroundColor: '#ff4d4f',
                                  color: '#fff',
                                  borderRadius: 2,
                                  padding: '0 4px',
                                }
                              : undefined
                          }
                        >
                          {displayOrDash(values[col.name])}
                        </span>
                      ) : (
                        <Input
                          data-connector-anchor="value"
                          size="small"
                          value={values[col.name] || ''}
                          onChange={(e) => {
                            onFieldChange(col.name, e.target.value);
                            onEditChange?.();
                          }}
                          style={{ maxWidth: 180 }}
                        />
                      )}

                      {hasTriangle && (
                        <TriangleMarker
                          onClick={() =>
                            scrollToOverviewItem(section, col.name)
                          }
                        />
                      )}

                      {hasError && (
                        <>
                          <br />
                          <Popover
                            title="错误详情"
                            content={
                              <div style={{ marginTop: 8 }}>
                                {colErrors.map((error, idx) => {
                                  const fatal = String(
                                    error?.ruleName || '',
                                  ).endsWith('_fatal');
                                  return (
                                    <div
                                      key={`${String(
                                        error.ruleName ||
                                          error.message ||
                                          'error',
                                      )}-${error.columnNames?.join('|') || 'cols'}-${idx}`}
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
                            <Tag color="error" style={{ marginLeft: 8 }}>
                              <ExclamationCircleOutlined /> {colErrors.length}
                            </Tag>
                          </Popover>
                        </>
                      )}
                    </Flex>
                  </Descriptions.Item>
                );
              })}
          </Descriptions>

          <ConnectorLayer
            containerRef={containerRef as any}
            section={section}
            pairs={getTrianglePairsFromErrors(errors)}
          />
        </div>

        {getRowErrors(errors).length > 0 && (
          <Alert
            showIcon
            message="行级错误:"
            type="error"
            description={
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                {getRowErrors(errors).map((error, idx) => (
                  <li
                    key={`${error.columnNames?.join('|') || 'cols'}-${String(
                      error.ruleName || error.message || 'row',
                    )}-${idx}`}
                    style={{ marginBottom: 8, listStyle: 'disc' }}
                  >
                    <div style={{ color: '#ff4d4f', fontWeight: 500 }}>
                      {(error.columnNames ?? [])
                        .map((n: string) => {
                          const found = columns.find((c) => c.name === n);
                          return found ? found.label : n;
                        })
                        .join(' & ')}
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
      </Space>
    </Card>
  );
};

export interface DataOverviewPlainProps extends DataOverviewCardProps {
  descriptionSize?: DescriptionsProps['size'];
  fontSize?: number | string;
  containerStyle?: React.CSSProperties;
  descriptionStyle?: React.CSSProperties;
  itemLabelStyle?: React.CSSProperties;
  itemContentStyle?: React.CSSProperties;
}

export const DataOverviewPlain: React.FC<DataOverviewPlainProps> = ({
  title,
  isEditing,
  isComplete,
  containerRef,
  section,
  columns,
  values,
  errors,
  column,
  onFieldChange,
  onEditChange,
  fontSize,
  containerStyle,
  descriptionStyle,
  itemLabelStyle,
  itemContentStyle,
}) => {
  const appliedFontSize =
    typeof fontSize === 'number' ? `${fontSize}px` : fontSize;

  // 统一将描述列数处理为数值，避免出现 Partial<Record<Breakpoint, number>> 导致的类型错误
  const columnsPerRow = typeof column === 'number' ? column : 3;

  const scrollToOverviewItem = (sec: string, colName: string) => {
    const el = document.getElementById(`item-${sec}-${colName}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <Space direction="vertical" size={3} style={{ width: '100%' }}>
      {!isEditing && !isComplete && (
        <Text
          strong
          style={{ color: '#ff4d4f', fontSize: appliedFontSize || 14 }}
        >
          未完成，建议先填写完成。
        </Text>
      )}

      <Text strong style={{ fontSize: appliedFontSize || 14 }}>
        {title}
      </Text>

      <div
        ref={containerRef as any}
        style={{
          position: 'relative',
          ...(containerStyle || {}),
        }}
      >
        <table
          style={{
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            ...(descriptionStyle || {}),
          }}
        >
          <colgroup>
            {Array.from({ length: columnsPerRow }).map((_, idx) => (
              <col key={idx} style={{ width: `${100 / columnsPerRow}%` }} />
            ))}
          </colgroup>
          <tbody>
            {Array.from({
              length: Math.ceil(
                columns.filter((c) => !c.hidden).length / columnsPerRow,
              ),
            }).map((_, rowIndex) => {
              const items = columns
                .filter((c) => !c.hidden)
                .slice(
                  rowIndex * columnsPerRow,
                  (rowIndex + 1) * columnsPerRow,
                );

              return (
                <tr key={`row-${rowIndex}`}>
                  {items.map((col) => {
                    const colErrors = getColumnErrors(col.name, errors);
                    const hasError = colErrors.length > 0;
                    const hasTriangle = colErrors.some(
                      isTriangleDepressionError,
                    );
                    const isFatal = colErrors.some((e: any) =>
                      String(e?.ruleName || '').endsWith('_fatal'),
                    );

                    return (
                      <td
                        key={col.name}
                        style={{
                          padding: '4px 6px',
                          verticalAlign: 'top',
                          borderBottom: '1px solid #f5f5f5',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap',
                            fontSize: appliedFontSize,
                            ...(itemLabelStyle || {}),
                          }}
                        >
                          <span>{col.label}</span>
                        </div>

                        <div
                          id={`item-${section}-${col.name}`}
                          style={{
                            marginTop: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap',
                            wordBreak: 'break-word',
                            fontSize: appliedFontSize,
                            ...(itemContentStyle || {}),
                          }}
                        >
                          {!isEditing ? (
                            <span
                              data-connector-anchor="value"
                              style={
                                isFatal
                                  ? {
                                      backgroundColor: '#ff4d4f',
                                      color: '#fff',
                                      borderRadius: 2,
                                      padding: '0 4px',
                                    }
                                  : undefined
                              }
                            >
                              {displayOrDash(values[col.name])}
                              {hasError && (
                                <Popover
                                  title="错误详情"
                                  content={
                                    <div
                                      style={{
                                        marginTop: 8,
                                        fontSize: appliedFontSize || 12,
                                      }}
                                    >
                                      {colErrors.map((error, idx) => {
                                        const fatal = String(
                                          error?.ruleName || '',
                                        ).endsWith('_fatal');
                                        return (
                                          <div
                                            key={`${String(
                                              error.ruleName ||
                                                error.message ||
                                                'error',
                                            )}-${error.columnNames?.join('|') || 'cols'}-${idx}`}
                                            style={{
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
                                  <span style={{ color: '#ff4d4f' }}>
                                    <ExclamationCircleOutlined />
                                  </span>
                                </Popover>
                              )}
                            </span>
                          ) : (
                            <Input
                              data-connector-anchor="value"
                              size="small"
                              value={values[col.name] || ''}
                              onChange={(e) => {
                                onFieldChange(col.name, e.target.value);
                                onEditChange?.();
                              }}
                              style={{
                                maxWidth: 180,
                                fontSize: appliedFontSize,
                              }}
                            />
                          )}

                          {hasTriangle && (
                            <TriangleMarker
                              onClick={() =>
                                scrollToOverviewItem(section, col.name)
                              }
                            />
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {items.length < columnsPerRow &&
                    Array.from({ length: columnsPerRow - items.length }).map(
                      (_, fillerIndex) => (
                        <td
                          key={`filler-${rowIndex}-${fillerIndex}`}
                          style={{
                            padding: '4px 6px',
                            borderBottom: '1px solid #f5f5f5',
                          }}
                        />
                      ),
                    )}
                </tr>
              );
            })}
          </tbody>
        </table>

        <ConnectorLayer
          containerRef={containerRef as any}
          section={section}
          pairs={getTrianglePairsFromErrors(errors)}
        />
      </div>

      {/* {getRowErrors(errors).length > 0 && (
        <>
          <Text strong style={{ color: '#ff4d4f', fontSize: appliedFontSize || 14 }}>
            行级错误:
          </Text>
          <Paragraph >
            <ul>
              {getRowErrors(errors).map((error, idx) => (
                <li
                  key={`${error.columnNames?.join('|') || 'cols'}-${String(
                    error.ruleName || error.message || 'row',
                  )}-${idx}`}
                  style={{ marginBottom: 8, listStyle: 'disc' }}
                >
                  <Text
                    strong
                    style={{ color: '#ff4d4f', fontSize: appliedFontSize || 14 }}
                  >
                    {(error.columnNames ?? [])
                      .map((n: string) => {
                        const found = columns.find((c) => c.name === n);
                        return found ? found.label : n;
                      })
                      .join(' & ')}
                    :
                  </Text>
                  <Paragraph
                    style={{
                      color: '#ff4d4f',
                      fontSize: appliedFontSize || 14,
                      marginTop: 4,
                      marginBottom: 0,
                    }}
                  >
                    {error.message}
                  </Paragraph>
                </li>
              ))}
            </ul>
          </Paragraph>
        </>
      )} */}
    </Space>
  );
};
