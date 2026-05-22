import { Router, type IRouter } from "express";
import { db, gameSessionsTable, participantsTable, answerLogsTable, questionsTable, quizzesTable, usersTable } from "@workspace/db";
import { eq, desc, avg, count, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return userId;
}

router.get("/analytics/dashboard", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const quizzes = await db.select().from(quizzesTable).where(eq(quizzesTable.creatorId, userId)).orderBy(desc(quizzesTable.updatedAt)).limit(5);
  const games = await db.select().from(gameSessionsTable).where(eq(gameSessionsTable.hostId, userId)).orderBy(desc(gameSessionsTable.createdAt)).limit(5);
  const recentGameIds = games.map(g => g.id);
  let totalParticipants = 0;
  for (const gameId of recentGameIds) {
    const participants = await db.select().from(participantsTable).where(eq(participantsTable.gameId, gameId));
    totalParticipants += participants.length;
  }
  const allGames = await db.select().from(gameSessionsTable).where(eq(gameSessionsTable.hostId, userId));
  const allQuizzes = await db.select().from(quizzesTable).where(eq(quizzesTable.creatorId, userId));
  const formattedGames = await Promise.all(games.map(async (g) => {
    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, g.quizId));
    const participants = await db.select().from(participantsTable).where(eq(participantsTable.gameId, g.id));
    return { ...g, quizTitle: quiz?.title ?? "Unknown", participantCount: participants.length };
  }));
  const formattedQuizzes = await Promise.all(quizzes.map(async (q) => {
    const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, q.creatorId));
    return { ...q, creatorName: creator?.displayName ?? "Unknown" };
  }));
  res.json({
    totalQuizzes: allQuizzes.length,
    totalGamesHosted: allGames.length,
    totalParticipants: totalParticipants,
    totalPointsEarned: user?.totalPoints ?? 0,
    recentGames: formattedGames,
    recentQuizzes: formattedQuizzes,
  });
});

router.get("/analytics/quiz/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const quizId = parseInt(rawId, 10);
  if (isNaN(quizId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId));
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, quizId));
  const questionStats = await Promise.all(questions.map(async (q) => {
    const answers = await db.select().from(answerLogsTable).where(eq(answerLogsTable.questionId, q.id));
    const total = answers.length;
    const correct = answers.filter(a => a.isCorrect === 1).length;
    const avgTime = total > 0 ? answers.reduce((sum, a) => sum + a.timeSpent, 0) / total : 0;
    return {
      questionId: q.id,
      questionText: q.questionText,
      correctRate: total > 0 ? correct / total : 0,
      avgTimeSpent: avgTime,
    };
  }));
  const games = await db.select().from(gameSessionsTable).where(eq(gameSessionsTable.quizId, quizId));
  let totalScores: number[] = [];
  for (const game of games) {
    const participants = await db.select().from(participantsTable).where(eq(participantsTable.gameId, game.id));
    totalScores = totalScores.concat(participants.map(p => p.score));
  }
  const avgScore = totalScores.length > 0 ? totalScores.reduce((a, b) => a + b, 0) / totalScores.length : 0;
  res.json({
    quizId,
    quizTitle: quiz.title,
    totalPlays: quiz.timesPlayed,
    avgScore,
    avgCompletionRate: 1.0,
    questionStats,
  });
});

router.get("/leaderboard", async (req, res): Promise<void> => {
  const { limit } = req.query as { limit?: string };
  const lim = Math.min(parseInt(limit ?? "20", 10), 50);
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.totalPoints)).limit(lim);
  const leaderboard = users.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    displayName: u.displayName,
    username: u.username,
    totalPoints: u.totalPoints,
    gamesPlayed: u.gamesPlayed,
    avatarUrl: u.avatarUrl ?? null,
  }));
  res.json(leaderboard);
});

export default router;
