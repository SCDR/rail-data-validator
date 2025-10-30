import { LinkOutlined } from '@ant-design/icons';
import { ReloadOutlined, VerticalAlignTopOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { Link, history } from '@umijs/max';
import React from 'react';
import {
  AvatarDropdown,
  AvatarName,
  Footer,
  Question,
  SelectLang,
} from '@/components';
// import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import '@ant-design/v5-patch-for-react-19';
import { FloatButton, Watermark } from 'antd';
import { getCurrentUser } from './pages/user/login/loginDataHandler';

const isDev = process.env.NODE_ENV === 'development';
const _loginPath = '/login';

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  // 从本地存储恢复当前用户；未登录则为空
  const current = getCurrentUser() as unknown as API.CurrentUser | null;
  const fetchUserInfo = async () =>
    getCurrentUser() as unknown as API.CurrentUser | undefined;

  return {
    fetchUserInfo,
    currentUser: current ?? undefined,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    logo: '/logo.svg',
    actionsRender: () => [
      <Question key="doc" />,
    ],
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        return <AvatarDropdown>{avatarChildren}</AvatarDropdown>;
      },
    },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      const isLoginPage = location.pathname === _loginPath;
      const hasUser = !!initialState?.currentUser;
      // 未登录：跳转到登录页
      if (!hasUser && !isLoginPage) {
        history.push(_loginPath);
        return;
      }
      // 已登录：访问登录页则跳转到欢迎页
      if (hasUser && isLoginPage) {
        history.push('/welcome');
      }
    },
    bgLayoutImgList: [
      {
        src: '/bg1.webp',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: '/bg2.webp',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: '/bg3.webp',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: [
      <Link key="agreement" to="/agreement">
        <span>用户协议</span>
      </Link>,
      <Link key="privacy" to="/privacy">
        <span>隐私政策</span>
      </Link>,
      ...(isDev
        ? [
            <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
              <LinkOutlined />
              <span>OpenAPI 文档</span>
            </Link>,
          ]
        : []),
    ],
    menuHeaderRender: undefined,
    childrenRender: (children) => {
      const user = initialState?.currentUser;
      const line1 = user
        ? `${user.name ?? ''} / ${user.userid ?? ''}`
        : '未登录用户';
      const line2 = user
        ? `${user.group ?? ''} / ${user.title ?? ''} / ${user.access ?? ''}`
        : '';
      return (
        <>
          <Watermark
            content={[line1, line2].filter(Boolean)}
            zIndex={1}
            gap={[60, 60]}
            rotate={-22}
            font={{
              color: 'rgba(0,0,0,0.06)',
              fontSize: 12,
              fontWeight: 'normal',
            }}
          >
            {children}
          </Watermark>
          {isDev && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
          <FloatButton
            icon={<ReloadOutlined />}
            onClick={() => window.location.reload()}
            tooltip="刷新页面"
          />
          <FloatButton
            icon={<VerticalAlignTopOutlined />}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            tooltip="回到顶部"
            style={{ right: 80 }}
          />
        </>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  // baseURL: 'https://proapi.azurewebsites.net', // 关闭远端依赖
  ...errorConfig,
};
