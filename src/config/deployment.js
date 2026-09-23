const SHARED_DEMO_HOST = 'fishingwithbag.github.io';
const SHARED_DEMO_PATH = '/Travel-OS/';

function normalizePath(pathname) {
  const value = `/${String(pathname || '/').replace(/^\/+|\/+$/g, '')}/`;
  return value.replace(/\/+/g, '/');
}

export function isSharedPublicDemo(hostname, pathname = '/') {
  const host = String(hostname || '').trim().toLowerCase();
  const path = normalizePath(pathname);
  return host === SHARED_DEMO_HOST && (path === SHARED_DEMO_PATH || path.startsWith(`${SHARED_DEMO_PATH}index.html/`));
}

export function shouldOpenCloudOnboarding(hostname, pathname = '/', preference = '') {
  return !isSharedPublicDemo(hostname, pathname) && preference !== 'local';
}
