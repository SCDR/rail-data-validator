import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  List,
  Row,
  Space,
  Spin,
  Typography,
  message,
  Popconfirm,
  Drawer,
  Pagination,
} from 'antd';
import {
  listDataCollectRecords,
  getDataCollectRecordById,
  deleteDataCollectRecord,
  saveAllDataCollect,
  type DataCollectRecordMeta,
  setupDataCollectDB,
  insertOrUpdateByUid,
  countDataCollectRecords,
} from '../dataCollect/dbHandler';
import { useModel } from '@umijs/max';
import dayjs from 'dayjs';
import { ReloadOutlined } from '@ant-design/icons';
import './history.less';
import ComplianceNotice from '@/components/ComplianceNotice';

const { Text, Title, Paragraph } = Typography;

interface RecordSummary {
  id: number;
  uid?: string;
  created_at: number;
  metadata?: DataCollectRecordMeta;
}

export default function History() {
  // 获取当前登录用户信息，用于写入记录元数据
  const { initialState } = useModel('@@initialState');
  const currentUser =
    (initialState?.currentUser as API.CurrentUser | undefined) || undefined;
  const [limit, setLimit] = useState<number>(20);
  const [offset, setOffset] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const collector = useModel('collectorData');

  const _totalLoaded = useMemo(() => records.length, [records]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      await setupDataCollectDB();
      const list = await listDataCollectRecords(limit, offset);
      setRecords(list);
      const total = await countDataCollectRecords();
      setTotalCount(total);
    } catch (err) {
      console.error(err);
      message.error('加载记录列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: number) => {
    try {
      setDetailLoading(true);
      setDetailDrawerOpen(true);
      setSelectedId(id);
      const data = await getDataCollectRecordById(id);
      setDetail(data);
    } catch (err) {
      console.error(err);
      message.error('加载记录详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const loadRecordToModel = () => {
    try {
      if (!detail || !detail.payload) {
        message.warning('暂无可加载的记录');
        return;
      }
      const p = detail.payload || {};
      collector.setStraightGauge(p.straightGauge || {});
      collector.setStraightHorizontal(p.straightHorizontal || {});
      collector.setCurvedGauge(p.curvedGauge || {});
      collector.setCurvedHorizontal(p.curvedHorizontal || {});
      collector.setOffsetData(p.offset || {});
      collector.setStraightReducedValue(p.straightReduced || {});
      collector.setCurvedReducedValue(p.curvedReduced || {});
      collector.setStraightGuardRailFlangeGroove(p.straightGuard || {});
      collector.setCurvedGuardRailFlangeGroove(p.curvedGuard || {});
      collector.setOtherData(p.other || {});
      if (Array.isArray(p.stepStatus)) {
        collector.setStepStatus(p.stepStatus);
      }
      message.success('已将记录加载到校验数据');
    } catch (err) {
      console.error(err);
      message.error('加载记录到校验数据失败');
    }
  };

  const deleteRecord = async (id: number) => {
    try {
      await deleteDataCollectRecord(id);
      message.success(`已删除记录 #${id}`);
      if (selectedId === id) {
        setDetail(null);
        setSelectedId(null);
        setDetailDrawerOpen(false);
      }
      await loadRecords();
    } catch (err) {
      console.error(err);
      message.error('删除记录失败');
    }
  };

  const _saveSnapshot = async () => {
    try {
      await setupDataCollectDB();
      const payload = {
        straightGauge: JSON.parse(collector.getStraightGauge()),
        straightHorizontal: JSON.parse(collector.getStraightHorizontal()),
        curvedGauge: JSON.parse(collector.getCurvedGauge()),
        curvedHorizontal: JSON.parse(collector.getCurvedHorizontal()),
        offset: JSON.parse(collector.getOffsetData()),
        straightReduced: JSON.parse(collector.getStraightReducedValue()),
        curvedReduced: JSON.parse(collector.getCurvedReducedValue()),
        straightGuard: JSON.parse(collector.getStraightGuardRailFlangeGroove()),
        curvedGuard: JSON.parse(collector.getCurvedGuardRailFlangeGroove()),
        other: JSON.parse(collector.getOtherData()),
        stepStatus: JSON.parse(collector.getStepStatus()),
      };

      // 合并登录用户信息到元数据，便于后续导出报表显示
      const metaWithUser = {
        source: 'history-page',
        user: {
          name: currentUser?.name,
          userid: currentUser?.userid,
          group: currentUser?.group,
          title: currentUser?.title,
          access: currentUser?.access,
        },
      };
      await saveAllDataCollect(payload, metaWithUser);
      message.success('已保存当前数据快照');
      await loadRecords();
    } catch (err) {
      console.error(err);
      message.error('保存快照失败');
    }
  };

  const updateDetailWithCurrentModel = async () => {
    setUpdating(true);
    try {
      if (!detail || !detail.uid) {
        message.warning('该记录无UID，无法更新');
        return;
      }
      await setupDataCollectDB();
      const payload = {
        straightGauge: JSON.parse(collector.getStraightGauge()),
        straightHorizontal: JSON.parse(collector.getStraightHorizontal()),
        curvedGauge: JSON.parse(collector.getCurvedGauge()),
        curvedHorizontal: JSON.parse(collector.getCurvedHorizontal()),
        offset: JSON.parse(collector.getOffsetData()),
        straightReduced: JSON.parse(collector.getStraightReducedValue()),
        curvedReduced: JSON.parse(collector.getCurvedReducedValue()),
        straightGuard: JSON.parse(collector.getStraightGuardRailFlangeGroove()),
        curvedGuard: JSON.parse(collector.getCurvedGuardRailFlangeGroove()),
        other: JSON.parse(collector.getOtherData()),
        stepStatus: JSON.parse(collector.getStepStatus()),
      };
      // 保留原有元数据，并更新当前登录用户信息
      const metaWithUser = {
        ...(detail.metadata || {}),
        user: {
          name: currentUser?.name,
          userid: currentUser?.userid,
          group: currentUser?.group,
          title: currentUser?.title,
          access: currentUser?.access,
        },
      };
      const res = await insertOrUpdateByUid(detail.uid, payload, metaWithUser);
      if (res.success) {
        message.success('已用当前校验数据更新该UID记录');
        await loadRecords();
      } else {
        message.error(`更新失败：${res.error || '未知错误'}`);
      }
    } catch (err) {
      console.error(err);
      message.error('更新失败');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [limit, offset]);

  const onPageChange = (page: number, pageSize: number) => {
    setLimit(pageSize);
    setOffset((page - 1) * pageSize);
  };

  return (
    <Row gutter={16}>
      <Col xs={24} style={{ marginTop: 12 }}>
        <ComplianceNotice />
      </Col>
      <Col xs={24} sm={24} md={24} lg={24} xl={24}>
        <Card
          title={
            <Space>
              <Title level={5}>数据采集记录</Title>
              {loading && <Spin size="small" />}
            </Space>
          }
          extra={
            <Space>
              <Button
                size="small"
                shape="circle"
                onClick={loadRecords}
                loading={loading}
                icon={<ReloadOutlined />}
              ></Button>
            </Space>
          }
        >
          <List
            loading={loading}
            dataSource={records}
            locale={{ emptyText: <Empty description="暂无记录" /> }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button size="small" onClick={() => loadDetail(item.id)}>
                    查看
                  </Button>,
                  <Popconfirm
                    title={`确认删除记录 #${item.id}?`}
                    onConfirm={() => deleteRecord(item.id)}
                  >
                    <Button size="small" danger>
                      删除
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space direction="vertical">
                      <Text strong>#{item.id}</Text>
                      <Text type="secondary">
                        {dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss')}
                      </Text>
                      <Text ellipsis={{ tooltip: item.uid || '无UID' }} code>
                        {item.uid || '无UID'}
                      </Text>
                    </Space>
                  }
                  description={
                    <Paragraph
                      ellipsis={{
                        tooltip: item.metadata
                          ? JSON.stringify(item.metadata)
                          : '无元数据',
                        rows: 2,
                      }}
                    >
                      {item.metadata
                        ? JSON.stringify(item.metadata)
                        : '无元数据'}
                    </Paragraph>
                  }
                />
              </List.Item>
            )}
          />
          <Pagination
            size="small"
            total={totalCount}
            current={Math.floor(offset / limit) + 1}
            pageSize={limit}
            showSizeChanger
            showQuickJumper
            onChange={onPageChange}
            onShowSizeChange={onPageChange}
          />
        </Card>
      </Col>

      <Drawer
        title="记录详情"
        placement="right"
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        width={640}
        destroyOnClose
      >
        {detailLoading && <Spin />}
        {!detailLoading && !detail && (
          <Empty description="选择左侧记录查看详情" />
        )}
        {!detailLoading && detail && (
          <>
            <Row gutter={16}>
              <Col span={18}>
                <Space direction="vertical" style={{ marginBottom: 8 }}>
                  <Text strong>#{detail.id}</Text>
                  <Text type="secondary">
                    {dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Text>
                  {detail.uid ? (
                    <Text code>{detail.uid}</Text>
                  ) : (
                    <Text type="secondary">无UID</Text>
                  )}
                </Space>
              </Col>
              <Col span={6}>
                <Space>
                  <Button type="primary" onClick={loadRecordToModel}>
                    加载
                  </Button>
                  <Popconfirm
                    title={`将用当前数据覆盖！`}
                    onConfirm={updateDetailWithCurrentModel}
                  >
                    <Button disabled={!detail?.uid} loading={updating} danger>
                      更新此记录
                    </Button>
                  </Popconfirm>
                </Space>
              </Col>
            </Row>
            <Divider style={{ margin: '8px 0' }} />
            <pre className="json-view">
              {JSON.stringify(detail.payload, null, 2)}
            </pre>
          </>
        )}
      </Drawer>
    </Row>
  );
}
