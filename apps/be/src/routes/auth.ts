import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { generateAccessToken, getLoginMe } from '../services/tossLoginService.js';
import { prisma } from '../plugins/prisma.js';

const loginSchema = z.object({
  authorizationCode: z.string(),
  referrer: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: '잘못된 요청 형식입니다.' });
    }

    const { authorizationCode, referrer } = parseResult.data;

    const { accessToken } = await generateAccessToken(authorizationCode, referrer);
    const { userKey } = await getLoginMe(accessToken);

    await prisma.user.upsert({
      where: { userKey },
      create: { userKey },
      update: {},
    });

    return { userKey };
  });

  // GET /api/auth/me?userKey=xxx
  // userKey가 유효한지 확인 (연결 끊기 이후엔 404 반환)
  fastify.get('/me', async (request, reply) => {
    const { userKey } = request.query as { userKey?: string };
    if (!userKey) return reply.status(400).send({ error: 'userKey가 필요합니다.' });

    const user = await prisma.user.findUnique({ where: { userKey } });
    if (!user) return reply.status(404).send({ error: '유효하지 않은 유저입니다.' });

    return { valid: true };
  });
};
