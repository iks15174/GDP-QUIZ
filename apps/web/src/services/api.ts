import config from '../config';

const BASE_URL = config.apiBaseUrl;

export class DailyLimitError extends Error {
  attemptsToday: number;
  maxAttempts: number;
  constructor(attemptsToday: number, maxAttempts: number) {
    super('DAILY_LIMIT_REACHED');
    this.attemptsToday = attemptsToday;
    this.maxAttempts = maxAttempts;
  }
}

export interface QuizCountry {
  code: string;
  nameKo: string;
  nameEn: string;
  flagEmoji: string;
}

export interface QuizResponse {
  quizId: string;
  countries: [QuizCountry, QuizCountry];
}

export interface AnswerCountry {
  code: string;
  nameKo: string;
  nameEn: string;
  flagEmoji: string;
  gdpPerCapita: number;
  mainIndustries: string[];
  isCorrect: boolean;
  gdpRank: number;
  totalCountries: number;
  continent: string | null;
  mainResource: string | null;
}

export interface AnswerResponse {
  isCorrect: boolean;
  correctCode: string;
  rewardEarned: boolean;
  allCountriesLearned?: boolean;
  streak: { current: number; totalWins: number };
  countries: [AnswerCountry, AnswerCountry];
}

export interface BatchQuizItem {
  quizId: string;
  countries: [QuizCountry, QuizCountry];
  correctCode: string;
  countryDetails: [AnswerCountry, AnswerCountry];
}

export interface BatchQuizResponse {
  quizzes: BatchQuizItem[];
  currentStreak: number;
}

export interface EncyclopediaCountry {
  code: string;
  nameKo: string;
  nameEn: string;
  flagEmoji: string;
  gdpPerCapita: number;
  mainIndustries: string[];
  viewedAt: string;
  continent: string | null;
  mainResource: string | null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API 오류: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getQuizBatch: async (userId: string, count = 3, fresh = false): Promise<BatchQuizResponse> => {
    const params = new URLSearchParams({ userId, count: String(count) });
    if (fresh) params.set('fresh', 'true');
    const res = await fetch(`${BASE_URL}/api/quiz/batch?${params.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.status === 429) {
      const data = await res.json() as { attemptsToday: number; maxAttempts: number };
      throw new DailyLimitError(data.attemptsToday, data.maxAttempts);
    }
    if (!res.ok) throw new Error(`API 오류: ${res.status}`);
    return res.json() as Promise<BatchQuizResponse>;
  },

  submitAnswer: (body: { quizId: string; userId: string; selectedCode: string }) =>
    request<AnswerResponse>('/api/quiz/answer', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getStreak: (userId: string) =>
    request<{ streak: number; totalWins: number }>(
      `/api/quiz/streak?userId=${encodeURIComponent(userId)}`
    ),

  getEncyclopedia: (userId: string) =>
    request<{ countries: EncyclopediaCountry[]; totalCountries: number }>(
      `/api/encyclopedia?userId=${encodeURIComponent(userId)}`
    ),

  getDailyStatus: (userId: string) =>
    request<{ attemptsToday: number; maxAttempts: number; limitReached: boolean }>(
      `/api/quiz/daily-status?userId=${encodeURIComponent(userId)}`
    ),

  retryQuiz: (previousQuizId: string, userId: string): Promise<QuizResponse> =>
    request<QuizResponse>(
      `/api/quiz/retry?previousQuizId=${encodeURIComponent(previousQuizId)}&userId=${encodeURIComponent(userId)}`
    ),
};
