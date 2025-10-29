import React from 'react';
import { Alert } from 'antd';

interface ComplianceNoticeProps {
  style?: React.CSSProperties;
  className?: string;
}

const ComplianceNotice: React.FC<ComplianceNoticeProps> = ({
  style,
  className,
}) => {
  return (
    <Alert
      type="error"
      className={className}
      style={{ fontSize: 14, ...style }}
      message={
        <span>
          本软件仅用于<strong>辅助数据收集</strong>与<strong>校验</strong>工作，
          <strong>不</strong>构成任何检测、认证或安全评估结论，用户
          <strong>必须</strong>对输出结果进行<strong>人工复核</strong>。
        </span>
      }
    />
  );
};

export default ComplianceNotice;
