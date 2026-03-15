import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from './plugins/prisma.js';
import { quizRoutes } from './routes/quiz.js';
import { countriesRoutes } from './routes/countries.js';
import { encyclopediaRoutes } from './routes/encyclopedia.js';

const server = Fastify({ logger: true });

const isProd = process.env.NODE_ENV === 'production';
const appName = process.env.APP_NAME ?? 'gdp-economy-quiz';

const allowedOrigins = [
  `https://${appName}.apps.tossmini.com`,
  `https://${appName}.private-apps.tossmini.com`,
];

await server.register(cors, {
  origin: isProd
    ? (origin, cb) => {
        server.log.info({ origin }, 'CORS origin check');
        if (!origin || allowedOrigins.includes(origin)) {
          cb(null, true);
        } else {
          cb(null, false);
        }
      }
    : true,
});

// DB 플러그인
server.addHook('onClose', async () => {
  await prisma.$disconnect();
});

// 라우트 등록
await server.register(quizRoutes, { prefix: '/api/quiz' });
await server.register(countriesRoutes, { prefix: '/api/countries' });
await server.register(encyclopediaRoutes, { prefix: '/api/encyclopedia' });

server.get('/health', async () => ({ status: 'ok' }));

const port = Number(process.env.PORT ?? 4000);
await server.listen({ port, host: '0.0.0.0' });
console.log(`Server running on http://localhost:${port}`);
