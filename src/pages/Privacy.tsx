import React from 'react';
import { Helmet } from '@umijs/max';
import { Card } from 'antd';
import { resolveResource } from '@tauri-apps/api/path';
import { readTextFile } from '@tauri-apps/plugin-fs';

const Privacy: React.FC = () => {
  const [mdText, setMdText] = React.useState<string>('');
  const [loadErr, setLoadErr] = React.useState<string>('');

  React.useEffect(() => {
    (async () => {
      try {
        // 优先从 Tauri 资源目录读取（桌面环境）
        const p = await resolveResource('agreement/rail-privacy-policy-v1.md');
        const txt = await readTextFile(p);
        setMdText(txt);
      } catch (_e) {
        // 纯 Web 环境或权限受限时，回退到静态资源（public/agreement/...）
        try {
          const resp = await fetch('/agreement/rail-privacy-policy-v1.md');
          if (resp.ok) {
            const t = await resp.text();
            setMdText(t);
            setLoadErr('已从静态资源加载隐私政策。');
          } else {
            setLoadErr('无法读取隐私政策资源，已显示示例内容。');
          }
        } catch {
          setLoadErr('无法读取隐私政策资源，已显示示例内容。');
        }
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
        <title>隐私政策</title>
      </Helmet>
      <Card title="隐私政策" bordered>
        {mdText ? (
          <div
            style={{ lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: mdToHtml(mdText) }}
          />
        ) : (
          <div>
            {!!loadErr && <p style={{ color: '#faad14' }}>{loadErr}</p>}
            <p>
              本《隐私政策》用于说明我们如何收集、使用、存储与保护您的个人信息。请在继续使用前仔细阅读并理解本政策的全部内容。
            </p>
            <h3>1. 信息收集</h3>
            <p>我们可能收集必要的账户信息与使用日志，用于提供和改进服务。</p>
            <h3>2. 信息使用</h3>
            <p>仅在合法合规及获得授权的范围内使用您的信息。</p>
            <h3>3. 信息共享</h3>
            <p>除法律要求或获得您的同意外，不会与第三方共享您的信息。</p>
            <h3>4. 信息安全</h3>
            <p>我们采取合理的安全措施保护您的信息免遭未经授权访问与泄露。</p>
            <h3>5. 变更与通知</h3>
            <p>本政策可能调整，更新后将在本页面公布并生效。</p>
            <p style={{ color: '#888' }}>
              本页面为示例内容，可根据实际业务替换。
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Privacy;
