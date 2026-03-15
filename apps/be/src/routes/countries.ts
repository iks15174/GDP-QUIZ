import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../plugins/prisma.js';
import { seedCountriesFromPublicApi } from '../services/countryService.js';

export const countriesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/countries - 전체 국가 목록 (캐시된 것)
  fastify.get('/', async () => {
    const countries = await prisma.country.findMany({
      select: {
        code: true,
        nameKo: true,
        nameEn: true,
        flagEmoji: true,
        gdpPerCapita: true,
      },
      orderBy: { gdpPerCapita: 'desc' },
    });
    return { countries };
  });

  // POST /api/countries/seed - 공공 API에서 국가 데이터 강제 갱신 (관리자용)
  fastify.post('/seed', async (_, reply) => {
    await seedCountriesFromPublicApi();
    const count = await prisma.country.count();
    return reply.status(200).send({ message: `국가 데이터 갱신 완료 (총 ${count}개)` });
  });
};
