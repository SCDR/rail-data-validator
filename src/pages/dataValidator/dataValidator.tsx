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
} from 'antd';
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

// import { DataValidator } from './validator';
// import { RuleConfigurator } from './ruleConfig';
// import { ColumnType, DataRow, ValidationError } from './types';

const { Text } = Typography;

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
      isEditing,
      onToggleEdit,
      onSaveEdit,
      onCancelEdit,
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
          <Row gutter={16}>
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
                    <Text strong>{labelMap.get(column) || column}</Text>
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
                              style={{ color: '#faad14', fontSize: 18 }}
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
                            <Text type="secondary">{error.ruleName}</Text>
                            <div style={{ marginTop: 4 }}>{error.message}</div>
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
      <Card title="数据校验摘要" bordered={false} style={{ width: '100%' }}>
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

        <Row gutter={[16, 16]}>
          <Col
            xs={24} // 手机端: 每行1列
            sm={24} // 小平板: 每行3列
            md={12} // 中等屏幕: 每行8列
            lg={12} // 大屏幕: 每行8列
          >
            <ProCard
              collapsible
              title="轨距数据校验"
              extra={
                <Space>
                  <Button onClick={validateRailData} loading={loading}>
                    校验轨距数据
                  </Button>
                  {typeof onToggleEdit === 'function' &&
                    typeof onSaveEdit === 'function' &&
                    typeof onCancelEdit === 'function' &&
                    (!isEditing ? (
                      <Button
                        type="primary"
                        size="small"
                        onClick={onToggleEdit}
                      >
                        编辑
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="primary"
                          size="small"
                          onClick={onSaveEdit}
                        >
                          保存
                        </Button>
                        <Button danger size="small" onClick={onCancelEdit}>
                          取消
                        </Button>
                      </>
                    ))}
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
            md={12} // 中等屏幕: 每行8列
            lg={12} // 大屏幕: 每行8列
          >
            <ProCard
              collapsible
              title="水平数据校验"
              extra={
                <Space>
                  <Button onClick={validateHorizontalData} loading={loading}>
                    校验水平数据
                  </Button>
                  {typeof onToggleEdit === 'function' &&
                    typeof onSaveEdit === 'function' &&
                    typeof onCancelEdit === 'function' &&
                    (!isEditing ? (
                      <Button
                        type="primary"
                        size="small"
                        onClick={onToggleEdit}
                      >
                        编辑
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="primary"
                          size="small"
                          onClick={onSaveEdit}
                        >
                          保存
                        </Button>
                        <Button danger size="small" onClick={onCancelEdit}>
                          取消
                        </Button>
                      </>
                    ))}
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
