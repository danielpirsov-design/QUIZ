import { Router, type IRouter } from "express";
import { db, gameSessionsTable, participantsTable, answerLogsTable, questionsTable, quizzesTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { generatePin } from "../lib/auth";
import { randomUUID } from "crypto";

const WAITING_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Bomb mode: timer sequence per question index
const BOMB_TIMERS = [30, 20, 15, 10, 5];
function getBombTimeLimit(questionIndex: number): number {
  return BOMB_TIMERS[Math.min(questionIndex - 1, BOMB_TIMERS.length - 1)];
}

// AI grading for short_answer questions
async function gradeWithAI(question: string, correctAnswer: string, playerAnswer: string): Promise<boolean> {
  try {
    const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return playerAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_completion_tokens: 10,
        messages: [
          { role: "system", content: "You grade quiz answers. Reply with only 'yes' or 'no'." },
          { role: "user", content: `Question: "${question}"\nExpected answer: "${correctAnswer}"\nStudent answer: "${playerAnswer}"\nIs the student answer correct or close enough? Reply yes or no.` },
        ],
      }),
    });
    if (!res.ok) return playerAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    const data = await res.json() as any;
    const reply = (data.choices?.[0]?.message?.content ?? "").trim().toLowerCase();
    return reply.startsWith("yes");
  } catch {
    return playerAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  }
}

// Relay helpers
function getRelayActiveParticipant(teamMembers: any[], questionIndex: number) {
  if (teamMembers.length === 0) return null;
  const idx = (questionIndex - 1) % teamMembers.length;
  return teamMembers[idx];
}

async function checkAutoExpire(game: any): Promise<any> {
  if (game.status !== "waiting") return game;
  const participants = await db.select().from(participantsTable).where(eq(participantsTable.gameId, game.id));
  if (participants.length > 0) return game;
  const age = Date.now() - new Date(game.createdAt).getTime();
  if (age < WAITING_EXPIRY_MS) return game;
  const [ended] = await db.update(gameSessionsTable)
    .set({ status: "ended", endedAt: new Date() })
    .where(eq(gameSessionsTable.id, game.id))
    .returning();
  return ended ?? game;
}

const router: IRouter = Router();

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return userId;
}

async function formatGame(game: any) {
  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, game.quizId));
  const participants = await db.select().from(participantsTable).where(eq(participantsTable.gameId, game.id));
  const aliveCount = participants.filter(p => !p.eliminated).length;

  let relayInfo: any = null;
  if (game.gameMode === "relay") {
    const sortedP = [...participants].sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
    const qIdx = game.currentQuestion || 1;
    const team1 = sortedP.filter(p => p.teamId === 1);
    const team2 = sortedP.filter(p => p.teamId === 2);
    const active1 = getRelayActiveParticipant(team1, qIdx);
    const active2 = getRelayActiveParticipant(team2, qIdx);
    relayInfo = {
      teams: [
        { teamId: 1, name: "Team Red", color: "#e21b3c", score: team1.reduce((s, p) => s + p.score, 0), members: team1, activePlayer: active1 },
        { teamId: 2, name: "Team Blue", color: "#1368ce", score: team2.reduce((s, p) => s + p.score, 0), members: team2, activePlayer: active2 },
      ],
      activeParticipantIds: [active1?.id, active2?.id].filter(Boolean),
    };
  }

  return {
    ...game,
    quizTitle: quiz?.title ?? "Unknown Quiz",
    quizId: game.quizId,
    participantCount: participants.length,
    aliveCount,
    eliminatedCount: participants.length - aliveCount,
    questionPhase: game.questionPhase ?? "question",
    relayInfo,
    participants: game.gameMode === "relay" ? participants : undefined,
  };
}

// ── Scoring: Kahoot formula ──────────────────────────────────────────────────
// max 1000 pts (instant), min 500 pts (last second), 0 for wrong
function calcPoints(timeSpentMs: number, timeLimitMs: number, maxPoints: number): number {
  const ratio = Math.max(0, Math.min(1, timeSpentMs / timeLimitMs));
  return Math.round(maxPoints * (1 - 0.5 * ratio));
}

// ── List games ────────────────────────────────────────────────────────────────
router.get("/games", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const games = await db.select().from(gameSessionsTable)
    .where(eq(gameSessionsTable.hostId, userId))
    .orderBy(desc(gameSessionsTable.createdAt)).limit(20);
  const formatted = await Promise.all(games.map(formatGame));
  res.json(formatted);
});

// ── Create game ───────────────────────────────────────────────────────────────
router.post("/games", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { quizId, gameMode } = req.body;
  if (!quizId || !gameMode) {
    res.status(400).json({ error: "quizId and gameMode are required" });
    return;
  }
  let pin = generatePin();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.select().from(gameSessionsTable).where(eq(gameSessionsTable.pin, pin));
    if (existing.length === 0) break;
    pin = generatePin();
    attempts++;
  }
  const hostToken = randomUUID();
  const [game] = await db.insert(gameSessionsTable).values({ quizId, hostId: userId, pin, gameMode, hostToken }).returning();
  res.status(201).json(await formatGame(game));
});

// ── Get game by host token (private host route) ───────────────────────────────
router.get("/games/host-session/:token", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const [game] = await db.select().from(gameSessionsTable).where(eq(gameSessionsTable.hostToken, token));
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }
  if (game.hostId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const expired = await checkAutoExpire(game);
  res.json(await formatGame(expired));
});

// ── Get game ──────────────────────────────────────────────────────────────────
router.get("/games/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [rawGame] = await db.select().from(gameSessionsTable).where(eq(gameSessionsTable.id, id));
  if (!rawGame) { res.status(404).json({ error: "Game not found" }); return; }
  const game = await checkAutoExpire(rawGame);
  res.json(await formatGame(game));
});

// ── Join by PIN ────────────────────────────────────────────────────────────────
router.get("/games/join/:pin", async (req, res): Promise<void> => {
  const pin = Array.isArray(req.params.pin) ? req.params.pin[0] : req.params.pin;
  const [game] = await db.select().from(gameSessionsTable).where(eq(gameSessionsTable.pin, pin));
  if (!game || game.status === "ended") {
    res.status(404).json({ error: "Game not found or has ended" });
    return;
  }
  res.json(await formatGame(game));
});

// ── Start game ────────────────────────────────────────────────────────────────
router.post("/games/:id/start", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [game] = await db.update(gameSessionsTable)
    .set({ status: "active", startedAt: new Date(), currentQuestion: 1, questionPhase: "question" })
    .where(and(eq(gameSessionsTable.id, id), eq(gameSessionsTable.hostId, userId)))
    .returning();
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }
  await db.update(quizzesTable)
    .set({ timesPlayed: sql`${quizzesTable.timesPlayed} + 1` })
    .where(eq(quizzesTable.id, game.quizId));
  // Relay mode: auto-assign teams (alternating by join order)
  if (game.gameMode === "relay") {
    const allP = await db.select().from(participantsTable)
      .where(eq(participantsTable.gameId, id))
      .orderBy(participantsTable.joinedAt);
    for (let i = 0; i < allP.length; i++) {
      await db.update(participantsTable)
        .set({ teamId: (i % 2) + 1 })
        .where(eq(participantsTable.id, allP[i].id));
    }
  }
  res.json(await formatGame(game));
});

// ── Reveal answers ─────────────────────────────────────────────────────────────
router.post("/games/:id/reveal", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [game] = await db.update(gameSessionsTable)
    .set({ questionPhase: "revealing" })
    .where(and(eq(gameSessionsTable.id, id), eq(gameSessionsTable.hostId, userId)))
    .returning();
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }
  res.json(await formatGame(game));
});

// ── Show leaderboard ───────────────────────────────────────────────────────────
router.post("/games/:id/show-leaderboard", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [game] = await db.update(gameSessionsTable)
    .set({ questionPhase: "leaderboard" })
    .where(and(eq(gameSessionsTable.id, id), eq(gameSessionsTable.hostId, userId)))
    .returning();
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }
  res.json(await formatGame(game));
});

// ── Next question ──────────────────────────────────────────────────────────────
router.post("/games/:id/next-question", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [game] = await db.select().from(gameSessionsTable)
    .where(and(eq(gameSessionsTable.id, id), eq(gameSessionsTable.hostId, userId)));
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }

  const questions = await db.select().from(questionsTable)
    .where(eq(questionsTable.quizId, game.quizId))
    .orderBy(questionsTable.orderIndex);

  const nextQuestion = (game.currentQuestion || 1) + 1;

  if (nextQuestion > questions.length) {
    const participants = await db.select().from(participantsTable)
      .where(eq(participantsTable.gameId, id))
      .orderBy(desc(participantsTable.score));
    for (let i = 0; i < participants.length; i++) {
      await db.update(participantsTable).set({ rank: i + 1 }).where(eq(participantsTable.id, participants[i].id));
      if (participants[i].userId) {
        await db.update(usersTable).set({
          totalPoints: sql`${usersTable.totalPoints} + ${participants[i].score}`,
          gamesPlayed: sql`${usersTable.gamesPlayed} + 1`,
        }).where(eq(usersTable.id, participants[i].userId!));
      }
    }
    const [ended] = await db.update(gameSessionsTable)
      .set({ status: "ended", endedAt: new Date(), questionPhase: "leaderboard" })
      .where(eq(gameSessionsTable.id, id))
      .returning();
    res.json({ ...(await formatGame(ended)), ended: true });
    return;
  }

  const [updated] = await db.update(gameSessionsTable)
    .set({ currentQuestion: nextQuestion, questionPhase: "question" })
    .where(eq(gameSessionsTable.id, id))
    .returning();
  res.json({ ...(await formatGame(updated)), ended: false });
});

// ── End game ───────────────────────────────────────────────────────────────────
router.post("/games/:id/end", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const participants = await db.select().from(participantsTable)
    .where(eq(participantsTable.gameId, id))
    .orderBy(desc(participantsTable.score));
  for (let i = 0; i < participants.length; i++) {
    await db.update(participantsTable).set({ rank: i + 1 }).where(eq(participantsTable.id, participants[i].id));
    if (participants[i].userId) {
      await db.update(usersTable).set({
        totalPoints: sql`${usersTable.totalPoints} + ${participants[i].score}`,
        gamesPlayed: sql`${usersTable.gamesPlayed} + 1`,
      }).where(eq(usersTable.id, participants[i].userId!));
    }
  }
  const [game] = await db.update(gameSessionsTable)
    .set({ status: "ended", endedAt: new Date() })
    .where(and(eq(gameSessionsTable.id, id), eq(gameSessionsTable.hostId, userId)))
    .returning();
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }
  res.json(await formatGame(game));
});

// ── List participants ──────────────────────────────────────────────────────────
router.get("/games/:id/participants", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const participants = await db.select().from(participantsTable)
    .where(eq(participantsTable.gameId, id))
    .orderBy(desc(participantsTable.score));
  res.json(participants);
});

// ── Join game ─────────────────────────────────────────────────────────────────
router.post("/games/:id/participants", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { nickname, avatar } = req.body;
  if (!nickname) { res.status(400).json({ error: "nickname is required" }); return; }
  const [game] = await db.select().from(gameSessionsTable).where(eq(gameSessionsTable.id, id));
  if (!game || game.status === "ended") {
    res.status(400).json({ error: "Game is not accepting participants" });
    return;
  }
  const userId = (req as any).session?.userId ?? null;
  const [participant] = await db.insert(participantsTable).values({ gameId: id, userId, nickname, avatar: avatar || "🐶" }).returning();
  res.status(201).json(participant);
});

// ── Power-up ──────────────────────────────────────────────────────────────────
router.post("/games/:id/powerup", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { participantId, type } = req.body;
  if (!participantId || !type) { res.status(400).json({ error: "participantId and type required" }); return; }

  const [p] = await db.select().from(participantsTable).where(eq(participantsTable.id, participantId));
  if (!p) { res.status(404).json({ error: "Participant not found" }); return; }

  if (type === "shield") {
    if ((p.shieldCount ?? 0) <= 0) { res.status(400).json({ error: "No shields left" }); return; }
    await db.update(participantsTable).set({
      shieldCount: sql`${participantsTable.shieldCount} - 1`,
      shieldActive: true,
    }).where(eq(participantsTable.id, participantId));
    res.json({ ok: true, type: "shield" });
  } else if (type === "double") {
    if ((p.doubleCount ?? 0) <= 0) { res.status(400).json({ error: "No doubles left" }); return; }
    await db.update(participantsTable).set({
      doubleCount: sql`${participantsTable.doubleCount} - 1`,
      doubleActive: true,
    }).where(eq(participantsTable.id, participantId));
    res.json({ ok: true, type: "double" });
  } else if (type === "fifty") {
    if ((p.fiftyFiftyCount ?? 0) <= 0) { res.status(400).json({ error: "No 50/50s left" }); return; }
    // Find the current question and return which 2 wrong answers to eliminate
    const [game] = await db.select().from(gameSessionsTable).where(eq(gameSessionsTable.id, id));
    if (!game) { res.status(404).json({ error: "Game not found" }); return; }
    const questions = await db.select().from(questionsTable)
      .where(eq(questionsTable.quizId, game.quizId))
      .orderBy(questionsTable.orderIndex);
    const currentQ = questions[(game.currentQuestion ?? 1) - 1];
    if (!currentQ) { res.status(400).json({ error: "No current question" }); return; }
    // Pick 2 wrong option indices to eliminate
    const wrongIndices = currentQ.options
      .map((opt: string, i: number) => ({ opt, i }))
      .filter(({ opt }: { opt: string }) => opt.trim().toLowerCase() !== currentQ.correctAnswer.trim().toLowerCase())
      .map(({ i }: { i: number }) => i);
    // Shuffle and pick 2
    const shuffled = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
    await db.update(participantsTable).set({
      fiftyFiftyCount: sql`${participantsTable.fiftyFiftyCount} - 1`,
    }).where(eq(participantsTable.id, participantId));
    res.json({ ok: true, type: "fifty", eliminateIndices: shuffled.sort((a: number, b: number) => a - b) });
  } else {
    res.status(400).json({ error: "Invalid power-up type" });
  }
});

// ── Submit answer ─────────────────────────────────────────────────────────────
router.post("/games/:id/answer", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { questionId, answer, participantId, timeSpent } = req.body;
  if (!questionId || !answer || !participantId) {
    res.status(400).json({ error: "questionId, answer, participantId are required" });
    return;
  }
  const already = await db.select().from(answerLogsTable)
    .where(and(eq(answerLogsTable.participantId, participantId), eq(answerLogsTable.questionId, questionId)));
  if (already.length > 0) {
    res.status(409).json({ error: "Already answered this question" });
    return;
  }
  const [question] = await db.select().from(questionsTable).where(eq(questionsTable.id, questionId));
  if (!question) { res.status(404).json({ error: "Question not found" }); return; }

  const [game] = await db.select().from(gameSessionsTable).where(eq(gameSessionsTable.id, id));
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }

  const [currentParticipant] = await db.select().from(participantsTable).where(eq(participantsTable.id, participantId));
  const shieldWasActive = currentParticipant?.shieldActive ?? false;
  const doubleWasActive = currentParticipant?.doubleActive ?? false;

  // Relay mode: only the active relay player can answer
  const isRelay = game.gameMode === "relay";
  if (isRelay && currentParticipant?.teamId) {
    const allParticipants = await db.select().from(participantsTable)
      .where(eq(participantsTable.gameId, id))
      .orderBy(participantsTable.joinedAt);
    const teamMembers = allParticipants.filter(p => p.teamId === currentParticipant.teamId);
    const activePlayer = getRelayActiveParticipant(teamMembers, game.currentQuestion || 1);
    if (activePlayer && activePlayer.id !== participantId) {
      res.status(403).json({ error: "not_your_turn", activePlayerId: activePlayer.id, activePlayerNickname: activePlayer.nickname });
      return;
    }
  }

  const isCorrect = question.questionType === "short_answer"
    ? await gradeWithAI(question.questionText, question.correctAnswer, answer)
    : answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
  // Shield: protects streak if wrong (streak doesn't reset)
  const streakProtected = !isCorrect && shieldWasActive;
  const prevStreak = currentParticipant?.streak ?? 0;
  const newStreak = isCorrect ? prevStreak + 1 : (streakProtected ? prevStreak : 0);

  // Bomb mode: use bomb time limit for scoring
  const isBomb = game.gameMode === "bomb";
  const effectiveTimeLimit = isBomb ? getBombTimeLimit(game.currentQuestion || 1) : question.timeLimit;
  const timeLimitMs = effectiveTimeLimit * 1000;
  let pointsEarned = isCorrect ? calcPoints(timeSpent ?? 0, timeLimitMs, question.points ?? 1000) : 0;
  // Double: 2x points if correct this round
  if (doubleWasActive && isCorrect) pointsEarned = pointsEarned * 2;

  // Bomb mode: wrong answer (and no shield) → eliminate player
  const bombEliminated = isBomb && !isCorrect && !shieldWasActive;

  // Coins earned: base 10 per correct answer + streak bonuses (Gimkit-style)
  const streakBonus = isCorrect ? Math.floor(newStreak / 3) * 5 : 0; // +5 coins every 3-answer streak
  const coinsEarned = isCorrect ? 10 + streakBonus : 0;

  await db.insert(answerLogsTable).values({
    gameId: id, participantId, questionId, answer,
    isCorrect: isCorrect ? 1 : 0,
    pointsEarned,
    timeSpent: timeSpent ?? 0,
  });

  await db.update(participantsTable).set({
    score: sql`${participantsTable.score} + ${pointsEarned}`,
    correctAnswers: isCorrect ? sql`${participantsTable.correctAnswers} + 1` : participantsTable.correctAnswers,
    totalAnswers: sql`${participantsTable.totalAnswers} + 1`,
    streak: newStreak,
    shieldActive: false,
    doubleActive: false,
    ...(bombEliminated ? { eliminated: true } : {}),
  }).where(eq(participantsTable.id, participantId));

  // Award coins and XP to the logged-in user
  if (currentParticipant?.userId && isCorrect) {
    const xpEarned = Math.floor(pointsEarned / 10);
    await db.update(usersTable).set({
      coins: sql`${usersTable.coins} + ${coinsEarned}`,
      xp: sql`${usersTable.xp} + ${xpEarned}`,
      totalPoints: sql`${usersTable.totalPoints} + ${pointsEarned}`,
    }).where(eq(usersTable.id, currentParticipant.userId));
  }

  const [participant] = await db.select().from(participantsTable).where(eq(participantsTable.id, participantId));

  const allParticipants = await db.select().from(participantsTable)
    .where(eq(participantsTable.gameId, id))
    .orderBy(desc(participantsTable.score));
  const rank = allParticipants.findIndex(p => p.id === participantId) + 1;

  res.json({
    correct: isCorrect,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation ?? null,
    pointsEarned,
    coinsEarned,
    totalScore: participant?.score ?? 0,
    rank,
    streak: newStreak,
    streakProtected,
    doubleUsed: doubleWasActive && isCorrect,
    totalPlayers: allParticipants.length,
    eliminated: bombEliminated,
    gameMode: game.gameMode,
  });
});

// ── Answer stats (host) ───────────────────────────────────────────────────────
router.get("/games/:id/answer-stats", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [game] = await db.select().from(gameSessionsTable).where(eq(gameSessionsTable.id, id));
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }

  const questions = await db.select().from(questionsTable)
    .where(eq(questionsTable.quizId, game.quizId))
    .orderBy(questionsTable.orderIndex);

  const currentQ = questions[(game.currentQuestion || 1) - 1];
  if (!currentQ) {
    res.json({ answered: 0, total: 0, distribution: {}, totalQuestions: questions.length });
    return;
  }

  const [answers, participants] = await Promise.all([
    db.select().from(answerLogsTable)
      .where(and(eq(answerLogsTable.gameId, id), eq(answerLogsTable.questionId, currentQ.id))),
    db.select().from(participantsTable).where(eq(participantsTable.gameId, id)),
  ]);

  const distribution: Record<string, number> = {};
  for (const a of answers) {
    distribution[a.answer] = (distribution[a.answer] || 0) + 1;
  }

  const isBomb = game.gameMode === "bomb";
  const qIdx = game.currentQuestion || 1;
  const effectiveTimeLimit = isBomb ? getBombTimeLimit(qIdx) : currentQ.timeLimit;
  // In bomb mode, only count alive (non-eliminated) players for "total"
  const aliveParticipants = isBomb ? participants.filter(p => !p.eliminated) : participants;
  // Answers from alive players only (for allAnswered)
  const aliveParticipantIds = new Set(aliveParticipants.map(p => p.id));
  const aliveAnswers = answers.filter(a => aliveParticipantIds.has(a.participantId));

  // Relay mode: compute active player per team
  let relayTeams: any[] | null = null;
  if (game.gameMode === "relay") {
    const team1Members = participants.filter(p => p.teamId === 1).sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
    const team2Members = participants.filter(p => p.teamId === 2).sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
    const team1Score = team1Members.reduce((s, p) => s + p.score, 0);
    const team2Score = team2Members.reduce((s, p) => s + p.score, 0);
    const getActive = (members: any[]) => getRelayActiveParticipant(members, qIdx);
    relayTeams = [
      { teamId: 1, name: "Team Red", color: "#e21b3c", members: team1Members, activePlayer: getActive(team1Members), score: team1Score },
      { teamId: 2, name: "Team Blue", color: "#1368ce", members: team2Members, activePlayer: getActive(team2Members), score: team2Score },
    ];
  }

  // For short_answer: include all actual answers as text list
  const textAnswers = (currentQ.questionType === "short_answer" || currentQ.questionType === "audio")
    ? answers.map(a => ({ answer: a.answer, isCorrect: a.isCorrect, participantId: a.participantId }))
    : null;

  res.json({
    questionId: currentQ.id,
    questionText: currentQ.questionText,
    questionType: currentQ.questionType,
    imageUrl: currentQ.imageUrl ?? null,
    audioUrl: currentQ.audioUrl ?? null,
    options: currentQ.options,
    correctAnswer: currentQ.correctAnswer,
    timeLimit: effectiveTimeLimit,
    points: currentQ.points,
    answered: answers.length,
    total: aliveParticipants.length,
    distribution,
    textAnswers,
    questionIndex: qIdx,
    totalQuestions: questions.length,
    allAnswered: aliveParticipants.length > 0 && aliveAnswers.length >= aliveParticipants.length,
    gameMode: game.gameMode,
    aliveCount: aliveParticipants.length,
    eliminatedCount: participants.length - aliveParticipants.length,
    relayTeams,
  });
});

// ── Results ───────────────────────────────────────────────────────────────────
router.get("/games/:id/results", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [game] = await db.select().from(gameSessionsTable).where(eq(gameSessionsTable.id, id));
  if (!game) { res.status(404).json({ error: "Not found" }); return; }

  const softUserId: number | null = (req as any).session?.userId ?? null;
  const pid = req.query.pid ? parseInt(req.query.pid as string, 10) : 0;

  if (pid) {
    // Participant path: verify pid belongs to this game
    const [participant] = await db.select().from(participantsTable)
      .where(and(eq(participantsTable.id, pid), eq(participantsTable.gameId, id)));
    if (!participant) { res.status(404).json({ error: "Not found" }); return; }
  } else if (softUserId && softUserId === game.hostId) {
    // Host path: authenticated owner of this game
  } else {
    res.status(404).json({ error: "Not found" }); return;
  }

  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, game.quizId));
  const participants = await db.select().from(participantsTable)
    .where(eq(participantsTable.gameId, id))
    .orderBy(desc(participantsTable.score));
  res.json({
    gameId: id,
    quizTitle: quiz?.title ?? "Unknown",
    totalParticipants: participants.length,
    participants,
  });
});

export default router;
