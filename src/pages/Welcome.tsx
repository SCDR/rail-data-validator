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
          description="本页面简要介绍数据采集和数据校验的流程与操作方法。"
        />

        <Card title="数据采集（/data/collect）" bordered={false}>
          <Typography>
            <Paragraph>
              目标：从源数据导入并整理轨道相关数据，生成规范的采集结果。
            </Paragraph>
            <Paragraph>基本流程：</Paragraph>
          </Typography>
          <List
            size="small"
            dataSource={[
              '准备源数据：轨距、水平等原始文件或设备连接',
              '选择采集模式：直线/曲线，并填写必要参数',
              '导入数据并预览：确认列结构与数值范围是否合理',
              '执行采集：生成采集结果并保存/导出',
            ]}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
          <Paragraph style={{ marginTop: 12 }}>操作要点：</Paragraph>
          <List
            size="small"
            dataSource={[
              '按页面提示完成参数填写（如轨距、水平阈值等）',
              '注意数据列名与格式，对齐系统要求的字段',
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

        <Card title="数据校验（/data/validate）" bordered={false}>
          <Typography>
            <Paragraph>
              目标：针对已采集的数据进行规则校验，发现并定位问题。
            </Paragraph>
            <Paragraph>基本流程：</Paragraph>
          </Typography>
          <List
            size="small"
            dataSource={[
              '载入采集结果或待检数据',
              '执行校验并查看统计及行级错误',
              '导出校验报告或对异常数据进行修正',
            ]}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
          <Paragraph style={{ marginTop: 12 }}>操作要点：</Paragraph>
          <List
            size="small"
            dataSource={[
              '直轨与曲线数据的规则不同，请按页面切换并分别填写',
              '关注校验结果中的“行级错误”和“异常统计”，便于快速定位',
            ]}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
          <Button
            type="primary"
            style={{ marginTop: 12 }}
            onClick={() => history.push('/data/validate')}
          >
            前往数据校验
          </Button>
        </Card>

        <Card bordered={false}>
          <Typography>
            <Title level={4}>建议与技巧</Title>
            <List
              size="small"
              dataSource={[
                '使用较小数据样本先试跑流程，确定参数范围后再整批处理',
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
