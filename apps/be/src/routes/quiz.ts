import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../plugins/prisma.js';
import { getTwoRandomCountries } from '../services/countryService.js';
import { grantPromotionReward } from '../services/promotionService.js';

const answerSchema = z.object({
  quizId: z.string(),
  userId: z.string(),
  selectedCode: z.string(),
});

const MAX_DAILY_ATTEMPTS = 10;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const quizRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/quiz/daily-status - 오늘 도전 횟수 조회
  fastify.get('/daily-status', async (request, reply) => {
    const { userId } = request.query as { userId?: string };
    if (!userId) return reply.status(400).send({ error: 'userId가 필요합니다.' });

    const attemptsToday = await prisma.quizSession.count({
      where: { userId, isNewAttempt: true, createdAt: { gte: startOfToday() } },
    });

    return { attemptsToday, maxAttempts: MAX_DAILY_ATTEMPTS, limitReached: attemptsToday >= MAX_DAILY_ATTEMPTS };
  });

  // GET /api/quiz/retry?previousQuizId=xxx&userId=yyy - 같은 문제로 재도전 (새 도전 카운트 미소모)
  fastify.get('/retry', async (request, reply) => {
    const { previousQuizId, userId } = request.query as { previousQuizId?: string; userId?: string };
    if (!previousQuizId || !userId) {
      return reply.status(400).send({ error: 'previousQuizId와 userId가 필요합니다.' });
    }

    const prevSession = await prisma.quizSession.findUnique({ where: { id: previousQuizId } });
    if (!prevSession || prevSession.userId !== userId) {
      return reply.status(404).send({ error: '세션을 찾을 수 없습니다.' });
    }

    const session = await prisma.quizSession.create({
      data: {
        userId,
        country1Code: prevSession.country1Code,
        country2Code: prevSession.country2Code,
        correctCode: prevSession.correctCode,
        isNewAttempt: false,
      },
    });

    const [country1, country2] = await Promise.all([
      prisma.country.findUnique({ where: { code: prevSession.country1Code } }),
      prisma.country.findUnique({ where: { code: prevSession.country2Code } }),
    ]);

    return {
      quizId: session.id,
      countries: [
        { code: country1!.code, nameKo: country1!.nameKo, nameEn: country1!.nameEn, flagEmoji: country1!.flagEmoji },
        { code: country2!.code, nameKo: country2!.nameKo, nameEn: country2!.nameEn, flagEmoji: country2!.flagEmoji },
      ],
    };
  });

  // GET /api/quiz - 새 퀴즈 시작 (랜덤 국가 2개)
  fastify.get('/', async (request, reply) => {
    const { userId } = request.query as { userId?: string };

    if (!userId) {
      return reply.status(400).send({ error: 'userId가 필요합니다.' });
    }

    // currentAttemptId가 null이면 새 도전 시작, non-null이면 이어서 도전
    const userStreak = await prisma.userStreak.findUnique({ where: { userId } });
    const isNewAttempt = !userStreak?.currentAttemptId;

    // 새 도전 시작일 때만 하루 제한 체크
    if (isNewAttempt) {
      const attemptsToday = await prisma.quizSession.count({
        where: { userId, isNewAttempt: true, createdAt: { gte: startOfToday() } },
      });
      if (attemptsToday >= MAX_DAILY_ATTEMPTS) {
        return reply.status(429).send({ error: 'DAILY_LIMIT_REACHED', attemptsToday, maxAttempts: MAX_DAILY_ATTEMPTS });
      }
    }

    const result = await getTwoRandomCountries();
    if (!result) {
      return reply.status(503).send({ error: '국가 데이터를 불러올 수 없습니다.' });
    }

    const { country1, country2 } = result;
    const correctCode =
      country1.gdpPerCapita >= country2.gdpPerCapita ? country1.code : country2.code;

    // 새 도전이면 attemptId 발급 후 UserStreak에 저장
    if (isNewAttempt) {
      const newAttemptId = randomUUID();
      await prisma.userStreak.upsert({
        where: { userId },
        create: { userId, currentAttemptId: newAttemptId },
        update: { currentAttemptId: newAttemptId },
      });
    }

    const session = await prisma.quizSession.create({
      data: {
        userId,
        country1Code: country1.code,
        country2Code: country2.code,
        correctCode,
        isNewAttempt,
      },
    });

    // 클라이언트에는 GDP 값을 숨기고 기본 정보만 전달
    return {
      quizId: session.id,
      countries: [
        {
          code: country1.code,
          nameKo: country1.nameKo,
          nameEn: country1.nameEn,
          flagEmoji: country1.flagEmoji,
        },
        {
          code: country2.code,
          nameKo: country2.nameKo,
          nameEn: country2.nameEn,
          flagEmoji: country2.flagEmoji,
        },
      ],
    };
  });

  // POST /api/quiz/answer - 정답 제출
  fastify.post('/answer', async (request, reply) => {
    const parseResult = answerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: '잘못된 요청 형식입니다.' });
    }

    const { quizId, userId, selectedCode } = parseResult.data;

    const session = await prisma.quizSession.findUnique({ where: { id: quizId } });
    if (!session) {
      return reply.status(404).send({ error: '퀴즈 세션을 찾을 수 없습니다.' });
    }
    if (session.userId !== userId) {
      return reply.status(403).send({ error: '권한이 없습니다.' });
    }
    if (session.answeredCode !== null) {
      return reply.status(409).send({ error: '이미 답변한 퀴즈입니다.' });
    }

    const isCorrect = selectedCode === session.correctCode;

    // 퀴즈 결과 저장
    await prisma.quizSession.update({
      where: { id: quizId },
      data: { answeredCode: selectedCode, isCorrect, answeredAt: new Date() },
    });

    // streak 업데이트 — 틀려도 초기화하지 않음 (광고 보고 이어서 도전 가능)
    const streak = await prisma.userStreak.upsert({
      where: { userId },
      create: { userId, streak: isCorrect ? 1 : 0, totalWins: 0 },
      update: {
        streak: isCorrect ? { increment: 1 } : undefined,
      },
    });

    let rewardEarned = false;

    // streak 3 달성 → 토스 포인트 지급 + 초기화 + 다음 도전 준비
    if (isCorrect && streak.streak >= 3) {
      await prisma.userStreak.update({
        where: { userId },
        data: { streak: 0, totalWins: { increment: 1 }, currentAttemptId: null },
      });
      rewardEarned = true;
      try {
        await grantPromotionReward(userId);
      } catch (err) {
        fastify.log.error({ err }, '프로모션 리워드 지급 실패');
      }
    }

    // 정답인 경우 두 나라 모두 백과사전에 기록
    if (isCorrect) {
      await Promise.all([
        prisma.userCountryView.upsert({
          where: { userId_countryCode: { userId, countryCode: session.country1Code } },
          create: { userId, countryCode: session.country1Code },
          update: { viewedAt: new Date() },
        }),
        prisma.userCountryView.upsert({
          where: { userId_countryCode: { userId, countryCode: session.country2Code } },
          create: { userId, countryCode: session.country2Code },
          update: { viewedAt: new Date() },
        }),
      ]);
    }

    // 두 나라 상세 정보 조회 (정답 공개용)
    const [country1, country2] = await Promise.all([
      prisma.country.findUnique({ where: { code: session.country1Code } }),
      prisma.country.findUnique({ where: { code: session.country2Code } }),
    ]);

    // rank와 총 개수 조회
    const [totalCountries, c1Rank, c2Rank] = await Promise.all([
      prisma.country.count(),
      prisma.country.count({ where: { gdpPerCapita: { gt: country1!.gdpPerCapita } } }),
      prisma.country.count({ where: { gdpPerCapita: { gt: country2!.gdpPerCapita } } }),
    ]);

    const currentStreak = rewardEarned ? 0 : streak.streak;

    return {
      isCorrect,
      correctCode: session.correctCode,
      rewardEarned,
      streak: {
        current: currentStreak,
        totalWins: rewardEarned ? streak.totalWins + 1 : streak.totalWins,
      },
      // 정답/오답 관계없이 두 나라 GDP 정보 공개
      countries: [country1, country2].map((c) => ({
        code: c!.code,
        nameKo: c!.nameKo,
        nameEn: c!.nameEn,
        flagEmoji: c!.flagEmoji,
        gdpPerCapita: c!.gdpPerCapita,
        mainIndustries: JSON.parse(c!.mainIndustries) as string[],
        isCorrect: c!.code === session.correctCode,
        gdpRank: c!.code === session.country1Code ? c1Rank + 1 : c2Rank + 1,
        totalCountries,
        continent: c!.continent ?? null,
        mainResource: c!.mainResource ?? null,
      })),
    };
  });

  // GET /api/quiz/streak - 현재 streak 조회
  fastify.get('/streak', async (request, reply) => {
    const { userId } = request.query as { userId?: string };
    if (!userId) return reply.status(400).send({ error: 'userId가 필요합니다.' });

    const streak = await prisma.userStreak.findUnique({ where: { userId } });
    return {
      streak: streak?.streak ?? 0,
      totalWins: streak?.totalWins ?? 0,
    };
  });
};
