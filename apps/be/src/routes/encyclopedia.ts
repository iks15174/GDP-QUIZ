import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../plugins/prisma.js';

export const encyclopediaRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/encyclopedia?userId=xxx - 유저가 학습한 국가 목록
  fastify.get('/', async (request, reply) => {
    const { userId } = request.query as { userId?: string };
    if (!userId) return reply.status(400).send({ error: 'userId가 필요합니다.' });

    const [views, totalCountries] = await Promise.all([
      prisma.userCountryView.findMany({
        where: { userId },
        include: { country: true },
        orderBy: { viewedAt: 'desc' },
      }),
      prisma.country.count(),
    ]);

    const learnedCountryCount = views.length;
    const remainder = learnedCountryCount % 10;
    const nextMilestoneRemaining = learnedCountryCount === 0 ? 10 : remainder === 0 ? 10 : 10 - remainder;

    return {
      totalCountries,
      learnedCountryCount,
      nextMilestoneRemaining,
      countries: views.map((v) => ({
        code: v.country.code,
        nameKo: v.country.nameKo,
        nameEn: v.country.nameEn,
        flagEmoji: v.country.flagEmoji,
        gdpPerCapita: v.country.gdpPerCapita,
        mainIndustries: JSON.parse(v.country.mainIndustries) as string[],
        viewedAt: v.viewedAt,
        continent: v.country.continent ?? null,
        mainResource: v.country.mainResource ?? null,
      })),
    };
  });
};
