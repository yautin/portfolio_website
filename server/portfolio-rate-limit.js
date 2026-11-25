import { createHmac } from 'node:crypto';
import { portfolioCloudConfig } from './portfolio-cloud.js';

// null means local-only storage; any configured cloud field must validate.
export function portfolioRateLimitConfig() {
  return portfolioCloudConfig();
}

export async function reservePortfolioLogin(config, ip) {
  const ipHash = createHmac('sha256', process.env.PORTFOLIO_SESSION_SECRET)
    .update('medical-portfolio-rate-limit-v1\0').update(ip).digest('hex');
  const response = await fetch(`${config.url}/rest/v1/rpc/portfolio_check_rate_limit`, {
    method: 'POST', headers: { apikey: config.key, 'Content-Type': 'application/json',
      'Content-Profile': 'public',
      ...(!config.key.startsWith('sb_secret_') ? { Authorization: `Bearer ${config.key}` } : {}) },
    body: JSON.stringify({ p_ip_hash: ipHash }),
    redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(5000),
  });
  if (response.status !== 200) {
    await response.body?.cancel();
    throw new Error('Portfolio login is temporarily unavailable.');
  }
  const retrySeconds = await response.json();
  if (!Number.isInteger(retrySeconds) || retrySeconds < 0 || retrySeconds > 900) {
    throw new Error('Portfolio login is temporarily unavailable.');
  }
  return retrySeconds;
}
