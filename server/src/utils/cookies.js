function parseCookies(header) {
  return String(header || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const index = part.indexOf('=');
      if (index === -1) return cookies;
      const key = part.slice(0, index);
      const value = part.slice(index + 1);
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function authCookieOptions(maxAgeMs) {
  const secure = process.env.NODE_ENV === 'production';
  return [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
    secure ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

function setAuthCookie(res, token, maxAgeMs) {
  res.setHeader('Set-Cookie', `webnovel_auth=${encodeURIComponent(token)}; ${authCookieOptions(maxAgeMs)}`);
}

function clearAuthCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `webnovel_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

module.exports = {
  parseCookies,
  setAuthCookie,
  clearAuthCookie,
};
