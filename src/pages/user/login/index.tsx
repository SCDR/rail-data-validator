import {
  AlipayCircleOutlined,
  LockOutlined,
  TaobaoCircleOutlined,
  UserOutlined,
  WeiboCircleOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import {
  FormattedMessage,
  Helmet,
  SelectLang,
  useIntl,
  useModel,
  history,
} from '@umijs/max';
import { Alert, App, Tabs, Input, Button, Modal } from 'antd';
import type { ProFormInstance } from '@ant-design/pro-components';
import type { InputRef } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { resolveResource } from '@tauri-apps/api/path';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { Footer } from '@/components';
import Settings from '../../../../config/defaultSettings';
import {
  initAuthSchema,
  validateLogin,
  registerUser,
  setCurrentUser,
  getCurrentUser,
  generateTOTP,
  ADMIN_BASE32_SECRET,
  mapRoleToPermissions,
  createConsentEvent,
} from './loginDataHandler';
import { collectDeviceInfo } from '@/utils/DeviceUtils';

const useStyles = createStyles(({ token }) => {
  return {
    action: {
      marginLeft: '8px',
      color: 'rgba(0, 0, 0, 0.2)',
      fontSize: '24px',
      verticalAlign: 'middle',
      cursor: 'pointer',
      transition: 'color 0.3s',
      '&:hover': {
        color: token.colorPrimaryActive,
      },
    },
    lang: {
      width: 42,
      height: 42,
      lineHeight: '42px',
      position: 'fixed',
      right: 16,
      borderRadius: token.borderRadius,
      ':hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
  };
});

const _ActionIcons = () => {
  const { styles } = useStyles();

  return (
    <>
      <AlipayCircleOutlined
        key="AlipayCircleOutlined"
        className={styles.action}
      />
      <TaobaoCircleOutlined
        key="TaobaoCircleOutlined"
        className={styles.action}
      />
      <WeiboCircleOutlined
        key="WeiboCircleOutlined"
        className={styles.action}
      />
    </>
  );
};

const _Lang = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <Alert
      style={{
        marginBottom: 24,
      }}
      message={content}
      type="error"
      showIcon
    />
  );
};

// 从 Tauri 资源中异步读取并展示协议正文；读取失败时回退到示例内容
const AgreementContent: React.FC = () => {
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
        // 弹窗内容使用较小标题，统一渲染为 h3
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
    <div style={{ maxHeight: 360, overflowY: 'auto' }}>
      {mdText ? (
        <div
          style={{ lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: mdToHtml(mdText) }}
        />
      ) : (
        <div>
          {!!loadErr && <p style={{ color: '#faad14' }}>{loadErr}</p>}
          <h3>用户协议</h3>
          <p>
            本《用户协议》用于说明您在使用本应用时的权利与义务。请在继续使用前仔细阅读并理解本协议的全部内容。
          </p>
          <h4>1. 账号与安全</h4>
          <p>您应妥善保管账号凭据，不得与他人共享或转让。</p>
          <h4>2. 使用规范</h4>
          <p>禁止用于违法用途或侵犯他人合法权益的行为。</p>
          <h4>3. 免责声明</h4>
          <p>本应用按“现状”提供，不保证持续可用或完全无瑕疵。</p>
          <h4>4. 终止与变更</h4>
          <p>我们可能对本协议进行调整，变更后将在本页面更新并生效。</p>
          <p style={{ color: '#888' }}>
            本弹窗为示例内容，可根据实际业务替换为正式文本。
          </p>
          <p>
            同时请阅读
            <a href="/privacy" target="_blank" rel="noreferrer">
              《隐私政策》
            </a>
            。
          </p>
        </div>
      )}
    </div>
  );
};

const Login: React.FC = () => {
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [type, setType] = useState<string>('login');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [otpDigits, setOtpDigits] = useState<string[]>([
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  const digitRefs = useRef<Array<InputRef | null>>([]);
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();
  const formRef = useRef<ProFormInstance<any> | null>(null);
  const [consentAt, setConsentAt] = useState<number | undefined>(undefined);

  const isDev = process.env.NODE_ENV === 'development';
  const [devOtp, setDevOtp] = useState<string>('');
  const [devLeft, setDevLeft] = useState<number>(0);
  const [devNow, setDevNow] = useState<Date>(new Date());
  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(ADMIN_BASE32_SECRET);
      message.success('已复制 Base32 密钥');
    } catch (_e) {
      message.error('复制失败，请手动复制');
    }
  };

  const forceExit = async () => {
    // Tauri 桌面环境优先：优雅关闭当前窗口
    try {
      await getCurrentWindow().close();
      return;
    } catch {}
    // Web 环境回退：尝试关闭或跳转空白页
    try {
      window.close();
    } catch {}
    try {
      window.location.href = 'about:blank';
    } catch {}
  };

  const showAgreementModal = () => {
    Modal.confirm({
      title: '用户协议',
      width: 720,
      okText: '同意',
      cancelText: '拒绝',
      content: <AgreementContent />,
      onOk: async () => {
        const t = Date.now();
        setConsentAt(t);
        try {
          const username =
            (formRef.current as any)?.getFieldValue?.('username') ?? '';
          const deviceInfo = await collectDeviceInfo();
          await createConsentEvent({
            username,
            type: 'both',
            acceptedAt: t,
            deviceInfo,
          });
        } catch (e) {
          console.warn('记录同意事件失败：', e);
        }
        formRef.current?.setFieldsValue({ agreePolicies: true });
      },
      onCancel: async () => {
        formRef.current?.setFieldsValue({ agreePolicies: false });
        await forceExit();
      },
    });
  };
  useEffect(() => {
    if (!isDev || !isAdmin) {
      setDevOtp('');
      setDevLeft(0);
      setDevNow(new Date());
      return;
    }
    let mounted = true;
    const period = 30;
    const secret = ADMIN_BASE32_SECRET;
    const tick = async () => {
      try {
        const code = await generateTOTP(secret, period, 6);
        const nowSec = Math.floor(Date.now() / 1000);
        const left = period - (nowSec % period);
        if (mounted) {
          setDevOtp(code);
          setDevLeft(left);
          setDevNow(new Date());
        }
      } catch {}
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [isDev, isAdmin]);

  // 初始化本地认证表结构，并尝试从本地存储恢复用户
  useEffect(() => {
    (async () => {
      try {
        await initAuthSchema();
      } catch (e) {
        console.warn('initAuthSchema failed:', e);
      }
      const cu = getCurrentUser();
      if (cu) {
        flushSync(() => {
          setInitialState((s) => ({
            ...s,
            currentUser: cu as unknown as API.CurrentUser,
          }));
        });
      }
    })();
  }, []);

  const _fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      flushSync(() => {
        setInitialState((s) => ({
          ...s,
          currentUser: userInfo,
        }));
      });
    }
  };

  type LoginValues = {
    username: string;
    password?: string;
    autoLogin?: boolean;
    agreePolicies?: boolean;
  };
  type RegisterValues = {
    username: string;
    password: string;
    confirm?: string;
    agreePolicies?: boolean;
  };

  const redirectTo = () => {
    const urlParams = new URL(window.location.href).searchParams;
    const to = urlParams.get('redirect') || '/welcome';
    // 使用前端路由跳转，避免整页刷新导致内存态丢失
    history.push(to);
  };

  const handleLoginSubmit = async (values: LoginValues) => {
    setErrorMsg('');
    const username = (values.username ?? '').trim();
    const isAdminLogin = username.toLowerCase() === 'admin';
    const usernameQuery = isAdminLogin ? 'admin' : username;
    if (!values.agreePolicies) {
      setErrorMsg('请阅读并同意《用户协议》和《隐私政策》');
      return;
    }
    let password = values.password ?? '';
    if (isAdminLogin) {
      const code = otpDigits.join('');
      if (!/^\d{6}$/.test(code)) {
        setErrorMsg('请输入 6 位一次性验证码');
        return;
      }
      password = code;
    }
    const res = await validateLogin(usernameQuery, password, {
      agreement: true,
      privacy: true,
      acceptedAt: consentAt,
    });
    if (res.ok) {
      // 管理员不自动登录（不持久化到 localStorage）
      const isAdminRes = res.user.username.toLowerCase() === 'admin';
      let cu: API.CurrentUser | null = null;
      if (isAdminRes) {
        cu = {
          name: res.user.username,
          access: res.user.role,
          userid: `user-${res.user.id}`,
          permissions: mapRoleToPermissions(res.user.role),
        } as unknown as API.CurrentUser;
      } else {
        // 普通用户仍然持久化，实现自动登录
        setCurrentUser(res.user);
        cu = getCurrentUser() as unknown as API.CurrentUser;
      }
      flushSync(() => {
        setInitialState((s) => ({
          ...s,
          currentUser: cu ?? null,
        }));
      });
      message.success(
        intl.formatMessage({
          id: 'pages.login.success',
          defaultMessage: '登录成功！',
        }),
      );
      redirectTo();
      return;
    }
    setErrorMsg(res.message);
  };

  const handleRegisterSubmit = async (values: RegisterValues) => {
    setErrorMsg('');
    if (!values.username || !values.password) {
      setErrorMsg('请输入用户名和密码');
      return;
    }
    if (values.confirm !== values.password) {
      setErrorMsg('两次输入的密码不一致');
      return;
    }
    if (!values.agreePolicies) {
      setErrorMsg('请阅读并同意《用户协议》和《隐私政策》');
      return;
    }
    try {
      const user = await registerUser(
        values.username,
        values.password,
        'user',
        { agreement: true, privacy: true, acceptedAt: consentAt },
      );
      // 注册成功后直接登录
      await handleLoginSubmit({
        username: user.username,
        password: values.password,
        agreePolicies: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'menu.login',
            defaultMessage: '登录页',
          })}
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
        <LoginForm
          formRef={formRef}
          contentStyle={{
            minWidth: 280,
            maxWidth: '80vw',
          }}
          logo={<img alt="logo" src="/logo.svg" />}
          title="Data"
          subTitle={intl.formatMessage({
            id: 'pages.layouts.userLayout.title',
          })}
          initialValues={{
            autoLogin: true,
          }}
          onValuesChange={(changed, all) => {
            if ('username' in changed) {
              const u = String(all.username ?? '')
                .trim()
                .toLowerCase();
              const admin = u === 'admin';
              setIsAdmin(admin);
              if (!admin) {
                setOtpDigits(['', '', '', '', '', '']);
              }
            }
          }}
          actions={[]}
          onFinish={async (values) => {
            if (type === 'login') {
              await handleLoginSubmit(values as LoginValues);
            } else {
              await handleRegisterSubmit(values as RegisterValues);
            }
          }}
        >
          <Tabs
            activeKey={type}
            onChange={setType}
            centered
            items={[
              {
                key: 'login',
                label: intl.formatMessage({
                  id: 'pages.login.accountLogin.tab',
                  defaultMessage: '账户密码登录',
                }),
              },
              {
                key: 'register',
                label: intl.formatMessage({
                  id: 'pages.login.register.tab',
                  defaultMessage: '用户注册',
                }),
              },
            ]}
          />
          {!!errorMsg && <LoginMessage content={errorMsg} />}

          {type === 'login' && (
            <>
              <ProFormText
                name="username"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined />,
                }}
                placeholder={intl.formatMessage({
                  id: 'pages.login.username.placeholder',
                  defaultMessage: '用户名',
                })}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.login.username.required"
                        defaultMessage="请输入用户名!"
                      />
                    ),
                  },
                ]}
              />
              {isAdmin ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {(() => {
                    const elems: React.ReactNode[] = [];
                    for (let i = 0; i < 6; i++) {
                      elems.push(
                        <Input
                          key={`otp-${i}`}
                          value={otpDigits[i]}
                          onChange={(e) => {
                            const v = e.target.value
                              .replace(/\D/g, '')
                              .slice(0, 1);
                            setOtpDigits((prev) => {
                              const next = [...prev];
                              next[i] = v;
                              return next;
                            });
                            if (v && i < 5) {
                              digitRefs.current[i + 1]?.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === 'Backspace' &&
                              !otpDigits[i] &&
                              i > 0
                            ) {
                              digitRefs.current[i - 1]?.focus();
                            }
                          }}
                          ref={(el) => {
                            digitRefs.current[i] = el;
                          }}
                          maxLength={1}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="•"
                          size="large"
                          style={{ width: 40, textAlign: 'center' }}
                        />,
                      );
                      if (i < 5) {
                        elems.push(
                          <span
                            key={`sep-${i}`}
                            style={{ color: '#999' }}
                          ></span>,
                        );
                      }
                    }
                    return elems;
                  })()}
                  {isDev && (
                    <div style={{ marginTop: 8, width: '100%' }}>
                      <Alert
                        type="info"
                        showIcon
                        message={
                          <span>
                            开发模式：当前验证码{' '}
                            <strong>{devOtp || '——'}</strong>（{devLeft}s
                            后更新）｜当前时间：{devNow.toLocaleString()}
                            ｜Base32 密钥：<code>{ADMIN_BASE32_SECRET}</code>{' '}
                            <Button
                              type="link"
                              size="small"
                              onClick={copySecret}
                            >
                              一键复制
                            </Button>
                          </span>
                        }
                      />
                    </div>
                  )}
                </div>
              ) : (
                <ProFormText.Password
                  name="password"
                  fieldProps={{
                    size: 'large',
                    prefix: <LockOutlined />,
                  }}
                  placeholder={intl.formatMessage({
                    id: 'pages.login.password.placeholder',
                    defaultMessage: '密码（管理员输入一次性验证码）',
                  })}
                  rules={[
                    {
                      required: true,
                      message: (
                        <FormattedMessage
                          id="pages.login.password.required"
                          defaultMessage="请输入密码或验证码！"
                        />
                      ),
                    },
                  ]}
                />
              )}
              <ProFormCheckbox
                name="agreePolicies"
                fieldProps={{
                  onChange: (e) => {
                    const checked = !!e?.target?.checked;
                    if (checked) {
                      showAgreementModal();
                    } else {
                      setConsentAt(undefined);
                    }
                  },
                }}
                rules={[
                  {
                    validator: async (_, value) => {
                      if (value) return Promise.resolve();
                      return Promise.reject(
                        new Error('请阅读并同意《用户协议》和《隐私政策》'),
                      );
                    },
                  },
                ]}
              >
                我已阅读并同意
                <a href="/agreement" target="_blank" rel="noreferrer">
                  《用户协议》
                </a>
                和
                <a href="/privacy" target="_blank" rel="noreferrer">
                  《隐私政策》
                </a>
              </ProFormCheckbox>
            </>
          )}
          {type === 'register' && (
            <>
              <ProFormText
                name="username"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined />,
                }}
                placeholder={intl.formatMessage({
                  id: 'pages.login.register.username.placeholder',
                  defaultMessage: '请输入用户名',
                })}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.login.register.username.required"
                        defaultMessage="请输入用户名!"
                      />
                    ),
                  },
                ]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                placeholder={intl.formatMessage({
                  id: 'pages.login.register.password.placeholder',
                  defaultMessage: '请输入密码',
                })}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.login.register.password.required"
                        defaultMessage="请输入密码！"
                      />
                    ),
                  },
                  {
                    min: 6,
                    message: '密码长度至少 6 位',
                  },
                ]}
              />
              <ProFormText.Password
                name="confirm"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                placeholder={intl.formatMessage({
                  id: 'pages.login.register.confirm.placeholder',
                  defaultMessage: '请再次输入密码',
                })}
                rules={[
                  {
                    required: true,
                    message: '请再次输入密码！',
                  },
                ]}
              />
              <ProFormCheckbox
                name="agreePolicies"
                fieldProps={{
                  onChange: (e) => {
                    const checked = !!e?.target?.checked;
                    if (checked) {
                      showAgreementModal();
                    } else {
                      setConsentAt(undefined);
                    }
                  },
                }}
                rules={[
                  {
                    validator: async (_, value) => {
                      if (value) return Promise.resolve();
                      return Promise.reject(
                        new Error('请阅读并同意《用户协议》和《隐私政策》'),
                      );
                    },
                  },
                ]}
              >
                我已阅读并同意
                <a href="/agreement" target="_blank" rel="noreferrer">
                  《用户协议》
                </a>
                和
                <a href="/privacy" target="_blank" rel="noreferrer">
                  《隐私政策》
                </a>
              </ProFormCheckbox>
              {/* 管理员不通过注册创建，移除角色选择，仅创建普通用户 */}
            </>
          )}
          <div
            style={{
              marginBottom: 24,
            }}
          >
            {!isAdmin && (
              <ProFormCheckbox noStyle name="autoLogin">
                <FormattedMessage
                  id="pages.login.rememberMe"
                  defaultMessage="自动登录"
                />
              </ProFormCheckbox>
            )}
            <a
              style={{
                float: 'right',
              }}
            >
              <FormattedMessage
                id="pages.login.forgotPassword"
                defaultMessage="忘记密码"
              />
            </a>
          </div>
        </LoginForm>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
