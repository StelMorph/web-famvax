// src/utils/deviceInfo.js
export function detectClientDevice() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const ua = (nav.userAgent || '').toLowerCase();
  const brands = nav.userAgentData?.brands || [];

  // Browser (best effort)
  let browser = 'Unknown Browser';
  let browserVersion = '';
  if (/edg\//.test(ua)) {
    browser = 'Microsoft Edge';
    browserVersion = ua.match(/edg\/([0-9.]+)/)?.[1] || '';
  } else if (/chrome\//.test(ua)) {
    browser = 'Chrome';
    browserVersion = ua.match(/chrome\/([0-9.]+)/)?.[1] || '';
  } else if (/safari\//.test(ua) && /version\//.test(ua)) {
    browser = 'Safari';
    browserVersion = ua.match(/version\/([0-9.]+)/)?.[1] || '';
  } else if (/firefox\//.test(ua)) {
    browser = 'Firefox';
    browserVersion = ua.match(/firefox\/([0-9.]+)/)?.[1] || '';
  } else if (/opr\//.test(ua)) {
    browser = 'Opera';
    browserVersion = ua.match(/opr\/([0-9.]+)/)?.[1] || '';
  }

  // OS (best effort)
  let os = 'Unknown OS';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os x')) os = 'macOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('like mac os x')) os = 'iOS';
  else if (ua.includes('linux')) os = 'Linux';

  // Device class
  const isMobile = /mobile|android|iphone|ipad/.test(ua);
  const deviceClass = isMobile ? 'Mobile' : 'Desktop';

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

  return {
    // raw
    userAgent: nav.userAgent || '',
    brands,
    platform: nav.platform || '',
    language: nav.language || '',
    languages: nav.languages || [],
    // normalized
    browserName: browser,
    browserVersion,
    osName: os,
    deviceClass,
    timezone: tz,
    screen: {
      w: window?.screen?.width || null,
      h: window?.screen?.height || null,
      dpr: window?.devicePixelRatio || 1,
    },
  };
}
