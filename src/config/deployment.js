const SHARED_DEMO_HOSTS = new Set(['fishingwithbag.github.io']);

export function isSharedPublicDemo(hostname) {
  return SHARED_DEMO_HOSTS.has(String(hostname || '').trim().toLowerCase());
}
