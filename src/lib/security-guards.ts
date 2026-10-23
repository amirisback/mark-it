const SUSPICIOUS_PATH_PATTERNS: RegExp[] = [
  /\/\.env/i,
  /\/\.git/i,
  /\/\.svn/i,
  /\/\.aws/i,
  /wp-admin/i,
  /wp-login/i,
  /wp-content/i,
  /phpmyadmin/i,
  /xmlrpc\.php/i,
  /cgi-bin/i,
  /\.\./, // Path traversal
  /%2e%2e/i, // Encoded traversal
  /\.php$/i,
  /\.bak$/i,
  /\.config$/i,
];

const MALICIOUS_USER_AGENTS: RegExp[] = [
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /wpscan/i,
  /acunetix/i,
  /nmap/i,
  /havij/i,
  /zgrab/i,
  /morfeus/i,
  /dirbuster/i,
];

/**
 * Validates if the request pathname matches known vulnerability probes or sensitive files.
 */
export function isSuspiciousPath(pathname: string): boolean {
  if (SUSPICIOUS_PATH_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return true;
  }
  let current = pathname;
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      if (SUSPICIOUS_PATH_PATTERNS.some((pattern) => pattern.test(decoded))) {
        return true;
      }
      current = decoded;
    } catch {
      return true;
    }
  }
  return false;
}

/**
 * Checks if the request User-Agent matches known malicious scanning/exploitation tools.
 */
export function isMaliciousBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return MALICIOUS_USER_AGENTS.some((pattern) => pattern.test(userAgent));
}
