import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Alert, Button, Card, List, Space, Typography } from 'antd';
import React from 'react';

const { Title, Paragraph } = Typography;

const Welcome: React.FC = () => {
  return (
    <PageContainer title="欢迎使用数据采集与校验">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="简介"
          description="本页面简要介绍数据采集和辅助数据校验的流程与操作方法。"
        />

        <Card title="数据采集（/data/collect）" bordered={false}>
          <Typography>
            <Paragraph>目标：输入并整理相关数据，生成采集结果。</Paragraph>
          </Typography>
          <Paragraph style={{ marginTop: 12 }}>操作要点：</Paragraph>
          <List
            size="small"
            dataSource={[
              '按页面提示完成参数填写',
              '注意数据列名与格式',
              '采集完成后可在页面中查看概览并导出',
            ]}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
          <Button
            type="primary"
            style={{ marginTop: 12 }}
            onClick={() => history.push('/data/collect')}
          >
            前往数据采集
          </Button>
        </Card>

        <Card title="辅助数据校验（/data/validate）" bordered={false}>
          <Typography>
            <Paragraph>
              目标：针对已采集的数据辅助相关人员进行规则校验。
            </Paragraph>
            <Paragraph>基本流程：</Paragraph>
          </Typography>
          <List
            size="small"
            dataSource={[
              '载入采集结果或待检数据',
              '执行辅助校验校验并查看统计可能出现的部分错误',
              '导出校验报告，辅助相关人员检查',
            ]}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
          <Paragraph style={{ marginTop: 12 }}>操作要点：</Paragraph>
          <List
            size="small"
            dataSource={[
              '关注校验结果中的“行级错误”和“异常统计”，便于快速定位',
            ]}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
          <Button
            type="primary"
            style={{ marginTop: 12 }}
            onClick={() => history.push('/data/validate')}
          >
            前往辅助数据校验
          </Button>
        </Card>

        <Card bordered={false}>
          <Typography>
            <Title level={4}>建议与技巧</Title>
            <List
              size="small"
              dataSource={[
                '通过页面顶部步骤导航清晰掌握当前进度',
                '必要时使用导出功能进行结果复核或归档',
              ]}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </Typography>
        </Card>
      </Space>
    </PageContainer>
  );
};

export default Welcome;
