import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  ProfileOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React from 'react';
import { DbUtils } from '@/utils/DbUtils';
import { initAuthSchema } from './user/login/loginDataHandler';
import { setupDataCollectDB } from './dataCollect/dbHandler';

type ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number; // 0/1
  dflt_value: any;
  pk: number; // 0/1
};

type RowData = Record<string, any> & { __rowid__?: number };

const Admin: React.FC = () => {
  const intl = useIntl();

  const [loadingTables, setLoadingTables] = React.useState<boolean>(false);
  const [tables, setTables] = React.useState<string[]>([]);
  const [tableSearch, setTableSearch] = React.useState<string>('');
  const [selectedTable, setSelectedTable] = React.useState<string | null>(null);

  const [schema, setSchema] = React.useState<ColumnInfo[]>([]);
  const [pkCol, setPkCol] = React.useState<string | null>(null);
  const [hasRowId, setHasRowId] = React.useState<boolean>(true); // SQLite 默认有 rowid
  const [schemaDrawerOpen, setSchemaDrawerOpen] =
    React.useState<boolean>(false);

  const [data, setData] = React.useState<RowData[]>([]);
  const [loadingData, setLoadingData] = React.useState<boolean>(false);
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [current, setCurrent] = React.useState<number>(1);
  const [total, setTotal] = React.useState<number>(0);

  const [createOpen, setCreateOpen] = React.useState<boolean>(false);
  const [editOpen, setEditOpen] = React.useState<boolean>(false);
  const [editing, setEditing] = React.useState<RowData | null>(null);

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const filteredTables = React.useMemo(
    () =>
      tables.filter(
        (t) =>
          !tableSearch || t.toLowerCase().includes(tableSearch.toLowerCase()),
      ),
    [tables, tableSearch],
  );

  const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

  const loadTables = React.useCallback(async () => {
    setLoadingTables(true);
    try {
      const db = await DbUtils.getInstance();
      const rows = await db.select<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      );
      setTables(rows.map((r: { name: string }) => r.name));
      if (!selectedTable && rows.length > 0) {
        setSelectedTable(rows[0].name);
      }
    } catch (e) {
      console.error(e);
      message.error('加载数据表列表失败');
    } finally {
      setLoadingTables(false);
    }
  }, [selectedTable]);

  const loadSchema = React.useCallback(async (table: string) => {
    if (!table) return;
    try {
      const db = await DbUtils.getInstance();
      const rows = await db.select<ColumnInfo>(
        `PRAGMA table_info(${quoteIdent(table)})`,
      );
      setSchema(rows);
      const pk = rows.find((r: ColumnInfo) => r.pk === 1)?.name ?? null;
      setPkCol(pk);
      // 判断是否 WITHOUT ROWID（粗略方式：若存在 rowid 查询报错则视为无 rowid）
      try {
        await db.select<any>(`SELECT rowid FROM ${quoteIdent(table)} LIMIT 1`);
        setHasRowId(true);
      } catch {
        setHasRowId(false);
      }
    } catch (e) {
      console.error(e);
      message.error('加载表结构失败');
    }
  }, []);

  const loadData = React.useCallback(
    async (table: string, page = 1, size = 20) => {
      if (!table) return;
      setLoadingData(true);
      try {
        const db = await DbUtils.getInstance();
        const count = await db.selectValue<number>(
          `SELECT COUNT(*) as cnt FROM ${quoteIdent(table)}`,
        );
        setTotal(Number(count ?? 0));
        const offset = (page - 1) * size;
        let rows: RowData[] = [];
        try {
          rows = await db.select<RowData>(
            `SELECT *, rowid AS "__rowid__" FROM ${quoteIdent(table)} LIMIT $1 OFFSET $2`,
            [size, offset],
          );
        } catch {
          rows = await db.select<RowData>(
            `SELECT * FROM ${quoteIdent(table)} LIMIT $1 OFFSET $2`,
            [size, offset],
          );
        }
        setData(rows);
        setCurrent(page);
        setPageSize(size);
      } catch (e) {
        console.error(e);
        message.error('加载数据失败');
      } finally {
        setLoadingData(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    (async () => {
      try {
        await initAuthSchema();
      } catch (e) {
        console.warn('initAuthSchema failed:', e);
      }
      try {
        await setupDataCollectDB();
      } catch (e) {
        console.warn('setupDataCollectDB failed:', e);
      }
      await loadTables();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!selectedTable) return;
    (async () => {
      await loadSchema(selectedTable);
      await loadData(selectedTable, 1, pageSize);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable]);

  const onRefresh = async () => {
    if (!selectedTable) return;
    await loadSchema(selectedTable);
    await loadData(selectedTable, current, pageSize);
  };

  const openCreate = () => {
    form.resetFields();
    setCreateOpen(true);
  };
  const closeCreate = () => setCreateOpen(false);

  const openEdit = (row: RowData) => {
    setEditing(row);
    editForm.setFieldsValue(row);
    setEditOpen(true);
  };
  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
  };

  const formItemForColumn = (col: ColumnInfo, formType: 'create' | 'edit') => {
    const isPk = col.pk === 1;
    const isNotNull = col.notnull === 1;
    const label = `${col.name} (${col.type}${isPk ? ', PK' : ''}${isNotNull ? ', NOT NULL' : ''})`;
    const commonProps = { name: col.name, label };
    const lowerType = (col.type || '').toLowerCase();
    const isPkInteger = isPk && lowerType.includes('int');
    const disabledPkInCreate: boolean = formType === 'create' && isPkInteger; // 自增 PK 在创建时不填
    if (lowerType.includes('int')) {
      return (
        <Form.Item
          {...commonProps}
          rules={[
            { required: isNotNull && !disabledPkInCreate, message: '必填' },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            disabled={disabledPkInCreate}
          />
        </Form.Item>
      );
    }
    if (lowerType.includes('char') || lowerType.includes('text')) {
      return (
        <Form.Item
          {...commonProps}
          rules={[
            { required: isNotNull && !disabledPkInCreate, message: '必填' },
          ]}
        >
          <Input disabled={disabledPkInCreate} />
        </Form.Item>
      );
    }
    if (lowerType.includes('bool')) {
      return (
        <Form.Item {...commonProps} valuePropName="checked">
          <Switch />
        </Form.Item>
      );
    }
    // 其他类型按文本处理
    return (
      <Form.Item
        {...commonProps}
        rules={[
          { required: isNotNull && !disabledPkInCreate, message: '必填' },
        ]}
      >
        <Input disabled={disabledPkInCreate} />
      </Form.Item>
    );
  };

  const handleCreateSubmit = async () => {
    if (!selectedTable) return;
    try {
      const values = await form.validateFields();
      const colsToInsert: string[] = [];
      const params: any[] = [];
      for (const col of schema) {
        const v = values[col.name];
        const lowerType = (col.type || '').toLowerCase();
        const isPkInteger = col.pk === 1 && lowerType.includes('int');
        if (v === undefined || v === '') {
          // 不填则跳过该列（允许默认值/自增）
          continue;
        }
        if (isPkInteger && (v === undefined || v === '')) {
          // 自增 PK 未填，跳过
          continue;
        }
        colsToInsert.push(col.name);
        params.push(v);
      }
      if (!colsToInsert.length) {
        message.warning('未填写任何字段');
        return;
      }
      const db = await DbUtils.getInstance();
      const colsSql = colsToInsert.map((c) => quoteIdent(c)).join(', ');
      const placeholders = colsToInsert.map(() => '?').join(', ');
      const sql = `INSERT INTO ${quoteIdent(selectedTable)} (${colsSql}) VALUES (${placeholders})`;
      await db.execute(sql, params);
      message.success('创建成功');
      setCreateOpen(false);
      await loadData(selectedTable, current, pageSize);
    } catch (e) {
      console.error(e);
      message.error('创建失败');
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedTable || !editing) return;
    try {
      const values = await editForm.validateFields();
      const setCols: string[] = [];
      const params: any[] = [];
      for (const col of schema) {
        if (col.pk === 1) continue; // PK 不更新
        const v = values[col.name];
        setCols.push(`${quoteIdent(col.name)} = ?`);
        params.push(v);
      }
      const db = await DbUtils.getInstance();
      let whereSql = '';
      if (pkCol) {
        whereSql = `WHERE ${quoteIdent(pkCol)} = ?`;
        params.push(editing[pkCol]);
      } else if (hasRowId) {
        whereSql = `WHERE rowid = ?`;
        params.push(editing.__rowid__);
      } else {
        message.error('该表无主键且无 rowid，无法更新');
        return;
      }
      const sql = `UPDATE ${quoteIdent(selectedTable)} SET ${setCols.join(', ')} ${whereSql}`;
      await db.execute(sql, params);
      message.success('更新成功');
      setEditOpen(false);
      setEditing(null);
      await loadData(selectedTable, current, pageSize);
    } catch (e) {
      console.error(e);
      message.error('更新失败');
    }
  };

  const handleDelete = async (row: RowData) => {
    if (!selectedTable) return;
    try {
      const db = await DbUtils.getInstance();
      let sql = '';
      let params: any[] = [];
      if (pkCol) {
        sql = `DELETE FROM ${quoteIdent(selectedTable)} WHERE ${quoteIdent(pkCol)} = ?`;
        params = [row[pkCol]];
      } else if (hasRowId) {
        sql = `DELETE FROM ${quoteIdent(selectedTable)} WHERE rowid = ?`;
        params = [row.__rowid__];
      } else {
        message.error('该表无主键且无 rowid，无法删除');
        return;
      }
      await db.execute(sql, params);
      message.success('删除成功');
      await loadData(selectedTable, current, pageSize);
    } catch (e) {
      console.error(e);
      message.error('删除失败');
    }
  };

  const columnsForTable: ColumnsType<RowData> = React.useMemo(() => {
    const cols: ColumnsType<RowData> = schema.map((c: ColumnInfo) => ({
      title: (
        <Space>
          <span>{c.name}</span>
          {c.pk === 1 ? <Tag color="blue">PK</Tag> : null}
          {c.notnull === 1 ? <Tag color="red">NOT NULL</Tag> : null}
        </Space>
      ),
      dataIndex: c.name,
      key: c.name,
      ellipsis: true,
    }));
    cols.push({
      title: '操作',
      key: '__actions__',
      fixed: 'right',
      width: 140,
      render: (_: unknown, row: RowData) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(row)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该行？"
            onConfirm={() => handleDelete(row)}
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    });
    return cols;
  }, [schema]);

  return (
    <PageContainer
      content={intl.formatMessage({
        id: 'pages.admin.subPage.title',
        defaultMessage: '管理员数据库操作页面：浏览表与增删改查',
      })}
    >
      <Row gutter={16}>
        <Col span={6}>
          <Card
            title={
              <Space>
                <DatabaseOutlined /> <span>数据表</span>
              </Space>
            }
            extra={
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={loadTables}
              >
                刷新
              </Button>
            }
          >
            <Input.Search
              allowClear
              placeholder="搜索表名"
              style={{ marginBottom: 8 }}
              value={tableSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTableSearch(e.target.value)
              }
            />
            <List
              loading={loadingTables}
              dataSource={filteredTables}
              locale={{ emptyText: <Empty description="暂无数据表" /> }}
              renderItem={(t: string) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    background: selectedTable === t ? '#f5faff' : undefined,
                  }}
                  onClick={() => setSelectedTable(t)}
                >
                  <Space>
                    <ProfileOutlined />
                    <span>{t}</span>
                    {selectedTable === t ? (
                      <Tag color="processing">当前</Tag>
                    ) : null}
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={18}>
          <Card
            title={
              <Space>
                <span>表数据</span>
                {selectedTable ? (
                  <Tag color="geekblue">{selectedTable}</Tag>
                ) : null}
              </Space>
            }
            extra={
              <Space>
                <Button icon={<ReloadOutlined />} onClick={onRefresh}>
                  刷新
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openCreate}
                  disabled={!selectedTable}
                >
                  新建
                </Button>
                <Button
                  icon={<ProfileOutlined />}
                  onClick={() => setSchemaDrawerOpen(true)}
                  disabled={!selectedTable}
                >
                  表结构
                </Button>
              </Space>
            }
          >
            {selectedTable ? (
              <Table<RowData>
                rowKey={(r: RowData) =>
                  r.__rowid__ !== undefined
                    ? String(r.__rowid__)
                    : pkCol
                      ? String(r[pkCol!] ?? JSON.stringify(r))
                      : JSON.stringify(r)
                }
                loading={loadingData}
                columns={columnsForTable}
                dataSource={data}
                pagination={{
                  total,
                  current,
                  pageSize,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50', '100'],
                  onChange: (p: number, s: number) =>
                    loadData(selectedTable, p, s),
                }}
                scroll={{ x: Math.min(1200, schema.length * 160 + 200) }}
              />
            ) : (
              <Empty description="请选择左侧数据表" />
            )}
          </Card>
        </Col>
      </Row>

      <Drawer
        title={
          <Space>
            <ProfileOutlined /> <span>表结构</span>{' '}
            {selectedTable ? <Tag>{selectedTable}</Tag> : null}
          </Space>
        }
        width={560}
        open={schemaDrawerOpen}
        onClose={() => setSchemaDrawerOpen(false)}
      >
        {schema.length ? (
          <Descriptions bordered column={1} size="small">
            {schema.map((c) => (
              <Descriptions.Item key={c.cid} label={c.name}>
                <Space wrap>
                  <Tag>{c.type}</Tag>
                  {c.pk === 1 ? <Tag color="blue">PRIMARY KEY</Tag> : null}
                  {c.notnull === 1 ? <Tag color="red">NOT NULL</Tag> : null}
                  {c.dflt_value !== null && c.dflt_value !== undefined ? (
                    <Tag color="gold">DEFAULT: {String(c.dflt_value)}</Tag>
                  ) : null}
                </Space>
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : (
          <Empty description="未加载表结构" />
        )}
      </Drawer>

      <Modal
        title={
          <Space>
            <PlusOutlined /> <span>新建记录</span>{' '}
            {selectedTable ? <Tag>{selectedTable}</Tag> : null}
          </Space>
        }
        open={createOpen}
        onCancel={closeCreate}
        onOk={handleCreateSubmit}
        okText="提交"
        cancelText="取消"
        width={720}
      >
        <Alert
          type="info"
          showIcon
          message="说明"
          description="若主键为整数类型且自增，创建时无需填写该字段。未填写的字段将按默认值或 NULL 处理。"
          style={{ marginBottom: 12 }}
        />
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            {schema.map((c) => (
              <Col span={12} key={`create-${c.cid}`}>
                {formItemForColumn(c, 'create')}
              </Col>
            ))}
          </Row>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <EditOutlined /> <span>编辑记录</span>{' '}
            {selectedTable ? <Tag>{selectedTable}</Tag> : null}
          </Space>
        }
        open={editOpen}
        onCancel={closeEdit}
        onOk={handleEditSubmit}
        okText="保存"
        cancelText="取消"
        width={720}
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            {schema.map((c) => (
              <Col span={12} key={`edit-${c.cid}`}>
                {formItemForColumn(c, 'edit')}
              </Col>
            ))}
          </Row>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default Admin;
