import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RestOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import type { InputRef } from 'antd';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Input,
  List,
  message,
  Popover,
  Progress,
  Radio,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
// import { ProCard, Progress, Radio, Input, message } from '@ant-design/pro-components';
// import {  } from 'antd';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { RuleConfigurator } from '@/components/Validation/ruleConfig';
import type {
  ColumnType,
  DataRow,
  ValidationError,
} from '@/components/Validation/types';
import { DataValidator } from '@/components/Validation/validator';

const { Title, Text } = Typography;

// 录入项配置（基于原有列定义，统一录入顺序）
const inputItems = [
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

// 中英文映射（复用原有逻辑）
const chMap = new Map([
  ['ExtraCol1', '额外列1'],
  ['ExtraCol2', '额外列2'],
  ['SlopeEndCol', '顺坡终点'],
  ['SwitchTipCol', '尖轨尖'],
  ['SwitchMiddleCol', '尖轨中'],
  ['SwitchHeelCol', '尖轨跟'],
  ['LeadCurveFrontCol', '导曲前'],
  ['LeadCurveMiddleCol', '导曲中'],
  ['LeadCurveRearCol', '导曲后'],
  ['FrogFrontCol', '辙岔前'],
  ['FrogMiddleCol', '辙岔中'],
  ['FrogRearCol', '辙岔后'],
  ['CheckIntervalCol', '查照间隔'],
  ['GuardDistanceCol', '护背距离'],
]);

interface RailDataValidatorProps {
  gaugeColumns: ColumnType[];
  horizontalColumns: ColumnType[];
  initialGaugeData?: Record<string, string>;
  initialHorizontalData?: Record<string, string>;
  onDataChange?: (
    type: 'gauge' | 'horizontal',
    newData: Record<string, string>,
  ) => void;
  onValidationComplete: (railErrors: any[], horizontalErrors: any[]) => void;
}

/**
 * 轨道数据录入+验证组件
 * 支持逐项录入（轨距/水平）、设备自动填充、进度反馈、动画过渡
 */
const RailDataCollector: React.FC<RailDataValidatorProps> = ({
  gaugeColumns,
  horizontalColumns,
  initialGaugeData,
  initialHorizontalData,
  onDataChange,
  onValidationComplete,
}) => {
  // ====================== 原有状态（保留并改造）======================
  const [railErrors, setRailErrors] = useState<ValidationError[]>([]);
  const [horizontalErrors, setHorizontalErrors] = useState<ValidationError[]>(
    [],
  );
  const [_railStats, setRailStats] = useState<any>(null);
  const [_horizontalStats, setHorizontalStats] = useState<any>(null);
  const [_loading, setLoading] = useState(false);

  // ====================== 新增：录入相关状态 ======================
  const [currentInputType, setCurrentInputType] = useState<
    'gauge' | 'horizontal'
  >('gauge'); // 当前录入类型
  const [currentItemIndex, setCurrentItemIndex] = useState(0); // 当前录入项索引
  const [transitionDirection, setTransitionDirection] = useState<
    'next' | 'prev'
  >('next');
  const [gaugeInputData, setGaugeInputData] = useState<Record<string, string>>(
    {},
  ); // 轨距已录入数据
  const [horizontalInputData, setHorizontalInputData] = useState<
    Record<string, string>
  >({}); // 水平已录入数据
  const inputRef = useRef<InputRef>(null); // 输入框Ref（用于自动聚焦）
  const transitionRef = useRef<HTMLDivElement>(null); // 动画节点引用，避免 findDOMNode

  // ====================== 计算属性（录入逻辑）======================
  const totalItems = inputItems.length; // 总录入项数
  const currentItem = inputItems[currentItemIndex]; // 当前录入项
  const currentData =
    currentInputType === 'gauge' ? gaugeInputData : horizontalInputData; // 当前类型已录入数据
  const currentValue = currentData[currentItem.name] || ''; // 当前录入项的值

  // 计算录入进度（已填有效值的项数 / 总项数）
  const getInputProgress = (): number => {
    const completedCount = Object.values(currentData).filter(
      (val) => val.trim() !== '',
    ).length;
    return totalItems === 0
      ? 0
      : Math.round((completedCount / totalItems) * 100);
  };

  // ====================== 录入交互逻辑 ======================
  // 使用 rAF 以避免同步焦点导致的布局抖动
  useEffect(() => {
    // 使用 rAF 以避免同步焦点导致的布局抖动
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [currentItemIndex, currentInputType]);

  // 切换录入类型时重置索引
  useEffect(() => {
    setCurrentItemIndex(0);
    setTransitionDirection('next');
  }, [currentInputType]);

  // 从父组件初始值同步到本地状态
  useEffect(() => {
    if (initialGaugeData) {
      setGaugeInputData(initialGaugeData);
    }
  }, [initialGaugeData]);
  useEffect(() => {
    if (initialHorizontalData) {
      setHorizontalInputData(initialHorizontalData);
    }
  }, [initialHorizontalData]);
  const updateCurrentData = (newData: Record<string, string>) => {
    if (currentInputType === 'gauge') {
      setGaugeInputData(newData);
    } else {
      setHorizontalInputData(newData);
    }
    onDataChange?.(currentInputType, newData);
  };

  // 切换到上一项
  const handlePrevItem = () => {
    if (currentItemIndex <= 0) {
      message.warning('已是第一项，无法回退');
      return;
    }
    setTransitionDirection('prev');
    setCurrentItemIndex((prev) => prev - 1);
  };

  // 切换到下一项（最后一项则提示完成）
  const handleNextItem = () => {
    if (currentItemIndex >= totalItems - 1) {
      message.success(
        `✅ ${currentInputType === 'gauge' ? '轨距' : '水平'}数据录入完成！`,
      );
      return;
    }
    setTransitionDirection('next');
    setCurrentItemIndex((prev) => prev + 1);
  };

  // 刷新当前项（清空值并重新聚焦）
  const handleRefreshCurrent = () => {
    updateCurrentData({ ...currentData, [currentItem.name]: '' });
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // 模拟设备自动填充（实际项目替换为设备SDK回调）
  const handleDeviceFill = () => {
    // 示例：设备读取的数值（根据实际设备数据格式调整，如精度、单位）
    const deviceValue = (Math.random() * 100).toFixed(2);
    updateCurrentData({ ...currentData, [currentItem.name]: deviceValue });
    // 可选：填充后自动跳转到下一项（减少手动操作）
    // setTimeout(handleNextItem, 500);
  };

  // ====================== 改造：验证逻辑（对接录入数据）======================
  // 验证轨距数据（使用录入的gaugeInputData）
  const _validateRailData = () => {
    if (Object.keys(gaugeInputData).length === 0) {
      message.warning('请先录入轨距数据再验证');
      return;
    }
    setLoading(true);
    const inputData = [gaugeInputData] as DataRow[]; // 转为DataRow格式（单条数据，支持多条可改数组）
    const validator = new DataValidator();
    RuleConfigurator.configureRailRules(validator, gaugeColumns);
    const errors = validator.validateAll(inputData);
    setRailErrors(errors);
    setRailStats(validator.getErrorStatistics());
    setLoading(false);
    onValidationComplete(errors, horizontalErrors);
  };

  // 验证水平数据（使用录入的horizontalInputData）
  const _validateHorizontalData = () => {
    if (Object.keys(horizontalInputData).length === 0) {
      message.warning('请先录入水平数据再验证');
      return;
    }
    setLoading(true);
    const inputData = [horizontalInputData] as DataRow[];
    const validator = new DataValidator();
    RuleConfigurator.configureHorizontalRules(validator, horizontalColumns);
    const errors = validator.validateAll(inputData);
    setHorizontalErrors(errors);
    setHorizontalStats(validator.getErrorStatistics());
    setLoading(false);
    onValidationComplete(railErrors, errors);
  };

  // 验证所有数据
  const _validateAll = () => {
    if (
      Object.keys(gaugeInputData).length === 0 ||
      Object.keys(horizontalInputData).length === 0
    ) {
      message.warning('请先完成轨距和水平数据录入');
      return;
    }
    setLoading(true);
    const gaugeInput = [gaugeInputData] as DataRow[];
    const horizontalInput = [horizontalInputData] as DataRow[];
    // 验证轨距
    const railValidator = new DataValidator();
    RuleConfigurator.configureRailRules(railValidator, gaugeColumns);
    const railErrors1 = railValidator.validateAll(gaugeInput);

    // 验证水平
    const horizontalValidator = new DataValidator();
    RuleConfigurator.configureHorizontalRules(
      horizontalValidator,
      horizontalColumns,
    );
    const horizontalErrors1 = horizontalValidator.validateAll(horizontalInput);

    // 更新状态
    setRailErrors(railErrors1);
    setRailStats(railValidator.getErrorStatistics());
    setHorizontalErrors(horizontalErrors1);
    setHorizontalStats(horizontalValidator.getErrorStatistics());
    onValidationComplete(railErrors1, horizontalErrors1);
    setLoading(false);
  };

  // ====================== 原有渲染函数（保留）======================
  const _renderErrorStats = (stats: any, title: string) => {
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
              prefix={<ArrowRightOutlined />}
            />
          </Col>
        </Row>
        <Divider orientation="left">按列统计</Divider>
        <Row gutter={[16, 16]}>
          {Object.entries(stats.byColumn).map(
            ([column, data]: [string, any]) => (
              <Col key={column} xs={12} sm={12} md={6} lg={3}>
                <Card size="small">
                  <Text strong>{chMap.get(column) || column}</Text>
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

  const _renderErrors = (errors: ValidationError[], title: string) => {
    if (errors.length === 0) {
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
      <ProCard
        collapsible
        defaultCollapsed
        title={`${title}详细错误列表`}
        bordered={false}
        style={{ marginTop: 16 }}
      >
        <List
          size="small"
          bordered
          dataSource={errors}
          renderItem={(error, index) => {
            const isTriangleDepression = error.ruleName.includes(
              'Triangle_Depression',
            );
            return (
              <List.Item key={index}>
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
                      <Tag color={isTriangleDepression ? 'warning' : 'error'}>
                        行 {error.rowIndex + 1}
                      </Tag>
                      <Text strong>{error.columnNames.join(' & ')}</Text>
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
      </ProCard>
    );
  };

  // ====================== 主渲染（录入+验证区域）======================
  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {/* 1. 录入区域（核心新增） */}
      <Card
        title="轨道数据逐项录入"
        bordered={false}
        style={{ marginBottom: 24, maxWidth: '100%' }}
      >
        {/* 1.1 录入类型切换 */}
        <Radio.Group
          value={currentInputType}
          onChange={(e) =>
            setCurrentInputType(e.target.value as 'gauge' | 'horizontal')
          }
          style={{ marginBottom: 20 }}
          buttonStyle="solid"
        >
          <Radio.Button value="gauge">轨距数据</Radio.Button>
          <Radio.Button value="horizontal">水平数据</Radio.Button>
        </Radio.Group>

        {/* 1.2 录入进度条 */}
        <Progress
          percent={getInputProgress()}
          status={getInputProgress() === 100 ? 'success' : 'active'}
          showInfo
          format={(percent) =>
            `${percent}% (${currentItemIndex + 1}/${totalItems})`
          }
          style={{ marginBottom: 24, width: '100%' }}
        />

        {/* 1.3 当前录入项（带动画过渡） */}
        <div
          className="transition-wrapper"
          style={{
            position: 'relative',
            maxWidth: '100%',
            overflowX: 'hidden',
          }}
        >
          <SwitchTransition mode="out-in">
            <CSSTransition
              nodeRef={transitionRef}
              key={currentItemIndex}
              timeout={300}
              classNames={
                transitionDirection === 'next'
                  ? 'input-transition-next'
                  : 'input-transition-prev'
              }
            >
              <div
                ref={transitionRef}
                className="current-input-item"
                style={{
                  padding: 20,
                  border: '1px solid #e8e8e8',
                  borderRadius: 8,
                  background: '#fff',
                  width: '100%',
                }}
              >
                {/* 录入项标签 */}
                <Text
                  strong
                  style={{ fontSize: 16, marginBottom: 8, display: 'block' }}
                >
                  当前录入：{currentItem.label}（{currentItemIndex + 1}/
                  {totalItems}）
                </Text>

                {/* 输入框+设备填充按钮 */}
                <Space.Compact
                  style={{ width: '100%', marginBottom: 16, maxWidth: '100%' }}
                >
                  <Input
                    ref={inputRef}
                    value={currentValue}
                    onChange={(e) =>
                      updateCurrentData({
                        ...currentData,
                        [currentItem.name]: e.target.value,
                      })
                    }
                    placeholder={`请输入${currentItem.label}的值（支持设备自动填充）`}
                    size="large"
                    style={{ height: 50 }}
                  />
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleDeviceFill}
                    style={{ height: 50 }}
                  >
                    读取
                  </Button>
                </Space.Compact>

                {/* 操作按钮组 */}
                <Space wrap>
                  <Button
                    onClick={handlePrevItem}
                    disabled={currentItemIndex === 0}
                    icon={<ArrowLeftOutlined />}
                  ></Button>
                  <Button
                    onClick={handleRefreshCurrent}
                    icon={<RestOutlined />}
                    danger
                  >
                    清空
                  </Button>
                  <Button
                    onClick={handleNextItem}
                    type="primary"
                    icon={<ArrowRightOutlined />}
                  >
                    {currentItemIndex >= totalItems - 1 ? '完成录入' : '下一项'}
                  </Button>
                </Space>
              </div>
            </CSSTransition>
          </SwitchTransition>
        </div>

        {/* 1.4 录入完成提示 */}
        {getInputProgress() === 100 && (
          <Alert
            message="录入完成！"
            description={`可切换到数据校验页面检查数据合法性，或切换类型录入其他数据。`}
            type="success"
            showIcon
            style={{ marginTop: 20 }}
            action={
              <Button
                type="primary"
                size="large"
                onClick={() => {
                  // 跳转到数据校验页面
                  window.location.href = '/data/validate';
                }}
              >
                前往数据校验
              </Button>
            }
          />
        )}
      </Card>

      {/* 3. 动画样式（必须） */}
      <style>{`
              /* 下一项：从右侧淡入，旧项向左侧退出 */
              .input-transition-next-enter {
                opacity: 0;
                transform: translateX(20px);
              }
              .input-transition-next-enter-active {
                opacity: 1;
                transform: translateX(0);
                transition: opacity 300ms, transform 300ms ease-in-out;
              }
              .input-transition-next-exit {
                opacity: 1;
                transform: translateX(0);
              }
              .input-transition-next-exit-active {
                opacity: 0;
                transform: translateX(-20px);
                transition: opacity 300ms, transform 300ms ease-in-out;
              }

              /* 上一项：从左侧淡入，旧项向右侧退出 */
              .input-transition-prev-enter {
                opacity: 0;
                transform: translateX(-20px);
              }
              .input-transition-prev-enter-active {
                opacity: 1;
                transform: translateX(0);
                transition: opacity 300ms, transform 300ms ease-in-out;
              }
              .input-transition-prev-exit {
                opacity: 1;
                transform: translateX(0);
              }
              .input-transition-prev-exit-active {
                opacity: 0;
                transform: translateX(20px);
                transition: opacity 300ms, transform 300ms ease-in-out;
              }

              /* 保持：当前录入项容器样式，避免布局抖动 */
              .current-input-item {
                min-height: 120px;
                display: flex;
                flex-direction: column;
                justify-content: center;
              }
            `}</style>
    </div>
  );
};

export default RailDataCollector;
