import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../plugins/prisma.js';

export const unlinkRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/unlink
  // 앱인토스에서 유저가 연결 끊기(탈퇴) 시 호출하는 콜백
  fastify.post('/unlink', async (request, reply) => {
    // Basic Auth 검증
    const expectedAuth = `Basic ${Buffer.from(`gdp-quiz:${process.env.AIT_UNLINK_SECRET}`).toString('base64')}`;
    const authHeader = request.headers['authorization'];

    if (authHeader !== expectedAuth) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const body = request.body as { userKey?: string | number };
    const userKey = body?.userKey != null ? String(body.userKey) : undefined;

    if (!userKey) {
      return reply.status(400).send({ error: 'userKey가 필요합니다.' });
    }

    // 해당 유저의 모든 데이터 삭제
    await prisma.$transaction([
      prisma.userCountryView.deleteMany({ where: { userId: userKey } }),
      prisma.userStreak.deleteMany({ where: { userId: userKey } }),
      prisma.quizSession.deleteMany({ where: { userId: userKey } }),
      prisma.user.deleteMany({ where: { userKey } }),
    ]);

    fastify.log.info({ userKey: userKey.slice(0, 8) + '...' }, '유저 탈퇴 처리 완료');

    return reply.status(200).send({ success: true });
  });
};
