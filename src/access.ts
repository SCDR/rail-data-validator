/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};

  // 兼容：若 initialState 无用户，则从本地存储获取
  let user = currentUser;
  if (!user) {
    try {
      const raw = localStorage.getItem('auth.currentUser');
      user = raw ? (JSON.parse(raw) as API.CurrentUser) : undefined;
    } catch {}
  }

  const role = user?.access;
  const isLoggedIn = !!user;

  return {
    canAdmin: role === 'admin',
    isLoggedIn,
    // 页面功能示例：普通登录用户
    canUser: isLoggedIn,
    canOutput: role === 'admin' || role === 'user',
  };
}
