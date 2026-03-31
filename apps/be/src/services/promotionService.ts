import https from 'https';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const AIT_API_BASE = 'https://apps-in-toss-api.toss.im';

function createMtlsAgent(): https.Agent {
  const certPath = process.env.AIT_MTLS_CERT_PATH;
  const keyPath = process.env.AIT_MTLS_KEY_PATH;

  if (!certPath || !keyPath) {
    throw new Error('AIT_MTLS_CERT_PATH 또는 AIT_MTLS_KEY_PATH가 설정되지 않았습니다.');
  }

  return new https.Agent({
    cert: readFileSync(resolve(certPath)),
    key: readFileSync(resolve(keyPath)),
  });
}

async function getPromotionKey(userKey: string): Promise<string> {
  const { default: fetch } = await import('node-fetch');
  const agent = createMtlsAgent();

  const response = await fetch(
    `${AIT_API_BASE}/api-partner/v1/apps-in-toss/promotion/execute-promotion/get-key`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-toss-user-key': userKey,
      },
      // @ts-ignore node-fetch agent 타입
      agent,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`프로모션 Key 발급 실패: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    resultType: string;
    success: { key: string } | null;
    error?: { errorCode: string; reason: string };
  };
  if (data.resultType !== 'SUCCESS' || !data.success) {
    throw new Error(`프로모션 Key 발급 실패: ${data.error?.errorCode} ${data.error?.reason}`);
  }
  return data.success.key;
}

export async function grantPromotionReward(userKey: string): Promise<void> {
  const promotionCode = process.env.AIT_PROMOTION_CODE;
  const amount = Number(process.env.AIT_PROMOTION_AMOUNT ?? 1);

  if (!promotionCode) {
    throw new Error('AIT_PROMOTION_CODE가 설정되지 않았습니다.');
  }

  const { default: fetch } = await import('node-fetch');
  const agent = createMtlsAgent();

  const key = await getPromotionKey(userKey);

  const response = await fetch(
    `${AIT_API_BASE}/api-partner/v1/apps-in-toss/promotion/execute-promotion`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-toss-user-key': userKey,
      },
      body: JSON.stringify({ promotionCode, key, amount }),
      // @ts-ignore node-fetch agent 타입
      agent,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`프로모션 리워드 지급 실패: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    resultType: string;
    success: { key: string } | null;
    error?: { errorCode: string; reason: string };
  };
  if (data.resultType !== 'SUCCESS' || !data.success) {
    throw new Error(`프로모션 리워드 지급 실패: ${data.error?.errorCode} ${data.error?.reason}`);
  }
}
