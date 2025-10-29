import React from 'react';
import { Helmet } from '@umijs/max';
import { Card } from 'antd';
import { resolveResource } from '@tauri-apps/api/path';
import { readTextFile } from '@tauri-apps/plugin-fs';

const Agreement: React.FC = () => {
  const [mdText, setMdText] = React.useState<string>('');
  const [loadErr, setLoadErr] = React.useState<string>('');

  React.useEffect(() => {
    (async () => {
      try {
        const p = await resolveResource('agreement/rail-user-agreement-v1.md');
        const txt = await readTextFile(p);
        setMdText(txt);
      } catch (_e) {
        setLoadErr('无法读取内置协议资源，已显示示例内容。');
      }
    })();
  }, []);

  // 轻量 Markdown 渲染（无依赖）：支持标题、加粗、列表与段落
  const mdToHtml = React.useCallback((src: string) => {
    const lines = src.split(/\r?\n/);
    let html = '';
    let inList = false;
    const formatBold = (s: string) =>
      s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        if (inList) continue; // 列表内跳过空行
        html += '<br />';
        continue;
      }
      const heading = line.match(/^#{1,6}\s+(.*)$/);
      if (heading) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        const text = formatBold(heading[1]);
        // 页面内容统一渲染为 h3
        html += `<h3>${text}</h3>`;
        continue;
      }
      const listItem = line.match(/^-\s+(.*)$/);
      if (listItem) {
        if (!inList) {
          html += '<ul>';
          inList = true;
        }
        const text = formatBold(listItem[1]);
        html += `<li>${text}</li>`;
        continue;
      }
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<p>${formatBold(line)}</p>`;
    }
    if (inList) html += '</ul>';
    return html;
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>用户协议</title>
      </Helmet>
      <Card title="用户协议" bordered>
        {mdText ? (
          <div
            style={{ lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: mdToHtml(mdText) }}
          />
        ) : (
          <div>
            {!!loadErr && <p style={{ color: '#faad14' }}>{loadErr}</p>}
            <p>
              本《用户协议》用于说明您在使用本应用时的权利与义务。请在继续使用前仔细阅读并理解本协议的全部内容。
            </p>
            <h3>1. 账号与安全</h3>
            <p>您应妥善保管账号凭据，不得与他人共享或转让。</p>
            <h3>2. 使用规范</h3>
            <p>禁止用于违法用途或侵犯他人合法权益的行为。</p>
            <h3>3. 免责声明</h3>
            <p>本应用按“现状”提供，不保证持续可用或完全无瑕疵。</p>
            <h3>4. 终止与变更</h3>
            <p>我们可能对本协议进行调整，变更后将在本页面更新并生效。</p>
            <p style={{ color: '#888' }}>
              本页面为示例内容，可根据实际业务替换。
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Agreement;
