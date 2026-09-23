function deploymentPath(href) {
  try {
    return new URL('.', href || 'http://localhost/').pathname || '/';
  } catch {
    return '/';
  }
}

export function browserStorageScope(href = globalThis.location?.href) {
  const path = deploymentPath(href).replace(/\/+/g, '/');
  return path === '/' ? 'root' : path.replace(/^\/|\/$/g, '') || 'root';
}

export function indexedDbNameForDeployment(href = globalThis.location?.href) {
  return `travel-os:${browserStorageScope(href)}`;
}

export function localStorageKey(name, href = globalThis.location?.href) {
  return `travel-os:${browserStorageScope(href)}:${String(name || '').trim()}`;
}
