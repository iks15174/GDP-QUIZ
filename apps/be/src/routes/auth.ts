import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { generateAccessToken, getLoginMe } from '../services/tossLoginService.js';

const loginSchema = z.object({
  authorizationCode: z.string(),
  referrer: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/login
  // FE에서 appLogin()으로 받은 authorizationCode + referrer를 전달받아 userKey 반환
  fastify.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: '잘못된 요청 형식입니다.' });
    }

    const { authorizationCode, referrer } = parseResult.data;

    const { accessToken } = await generateAccessToken(authorizationCode, referrer);
    const { userKey } = await getLoginMe(accessToken);

    return { userKey };
  });
};
