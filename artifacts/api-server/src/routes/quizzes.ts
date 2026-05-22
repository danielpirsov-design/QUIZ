import { Router, type IRouter } from "express";
import { db, quizzesTable, questionsTable, usersTable, gameSessionsTable } from "@workspace/db";
import { eq, and, ilike, sql, desc, ne } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return userId;
}

async function getAuthUser(req: any): Promise<{ userId: number; role: string } | null> {
  const userId = req.session?.userId;
  if (!userId) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;
  return { userId, role: user.role };
}

async function quizWithCreator(quiz: any, creatorId: number) {
  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, creatorId));
  return {
    ...quiz,
    creatorName: creator?.displayName ?? "Unknown",
    creatorRole: creator?.role ?? "student",
  };
}

router.get("/quizzes", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const quizzes = await db.select().from(quizzesTable).where(eq(quizzesTable.creatorId, userId)).orderBy(quizzesTable.updatedAt);
  const withCreators = await Promise.all(quizzes.map(q => quizWithCreator(q, q.creatorId)));
  res.json(withCreators);
});

router.post("/quizzes", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { title, description, category, visibility, coverImageUrl } = req.body;
  if (!title || !visibility) {
    res.status(400).json({ error: "Title and visibility are required" });
    return;
  }
  const [quiz] = await db.insert(quizzesTable).values({
    title,
    description,
    category,
    visibility,
    coverImageUrl,
    creatorId: userId,
  }).returning();
  res.status(201).json(await quizWithCreator(quiz, userId));
});

router.get("/discover", async (req, res): Promise<void> => {
  const { search, category, limit } = req.query as { search?: string; category?: string; limit?: string };
  const lim = Math.min(parseInt(limit ?? "48", 10), 100);

  const conditions = [eq(quizzesTable.visibility, "public")];
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      sql`(${quizzesTable.title} ilike ${term} or ${quizzesTable.description} ilike ${term} or ${quizzesTable.category} ilike ${term})`
    );
  }
  if (category && category.trim()) {
    conditions.push(ilike(quizzesTable.category, category.trim()));
  }

  const quizzes = await db.select().from(quizzesTable)
    .where(and(...conditions))
    .orderBy(desc(quizzesTable.timesPlayed), desc(quizzesTable.createdAt))
    .limit(lim);

  const withCreators = await Promise.all(quizzes.map(q => quizWithCreator(q, q.creatorId)));
  res.json(withCreators);
});

router.get("/quizzes/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, id));
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }
  // Private quizzes: creator/owner OR valid share token OR active game context
  if (quiz.visibility === "private") {
    const shareParam = req.query.share as string | undefined;
    const validToken = shareParam && quiz.shareToken && shareParam === quiz.shareToken;
    if (!validToken) {
      // Allow access if requester is in an active/waiting game that uses this quiz
      const gameIdParam = parseInt(req.query.gameId as string || "0", 10);
      let allowedViaGame = false;
      if (gameIdParam) {
        const [activeGame] = await db.select().from(gameSessionsTable)
          .where(and(
            eq(gameSessionsTable.id, gameIdParam),
            eq(gameSessionsTable.quizId, id),
            ne(gameSessionsTable.status, "ended"),
          ));
        allowedViaGame = !!activeGame;
      }
      if (!allowedViaGame) {
        const authUser = await getAuthUser(req);
        if (!authUser || (authUser.role !== "owner" && authUser.userId !== quiz.creatorId)) {
          res.status(404).json({ error: "Quiz not found" }); return;
        }
      }
    }
  }
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, id)).orderBy(questionsTable.orderIndex);
  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, quiz.creatorId));
  res.json({ ...quiz, questions, creatorName: creator?.displayName ?? "Unknown", creatorRole: creator?.role ?? "student" });
});

// ── Generate / retrieve share token ───────────────────────────────────────────
router.post("/quizzes/:id/share-token", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const authUser = await getAuthUser(req);
  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, id));
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }
  if (!authUser || (authUser.role !== "owner" && authUser.userId !== quiz.creatorId)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  let token = quiz.shareToken;
  if (!token) {
    token = randomUUID();
    await db.update(quizzesTable).set({ shareToken: token } as any).where(eq(quizzesTable.id, id));
  }
  res.json({ token });
});

router.patch("/quizzes/:id", async (req, res): Promise<void> => {
  const authUser = await getAuthUser(req);
  if (!authUser) { res.status(401).json({ error: "Not authenticated" }); return; }
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const isOwner = authUser.role === "owner";
  const where = isOwner ? eq(quizzesTable.id, id) : and(eq(quizzesTable.id, id), eq(quizzesTable.creatorId, authUser.userId));
  const [quiz] = await db.select().from(quizzesTable).where(where);
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }
  const { title, description, category, visibility, coverImageUrl } = req.body;
  const [updated] = await db.update(quizzesTable).set({ title, description, category, visibility, coverImageUrl }).where(eq(quizzesTable.id, id)).returning();
  res.json(await quizWithCreator(updated, authUser.userId));
});

router.delete("/quizzes/:id", async (req, res): Promise<void> => {
  const authUser = await getAuthUser(req);
  if (!authUser) { res.status(401).json({ error: "Not authenticated" }); return; }
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const isOwner = authUser.role === "owner";
  const where = isOwner ? eq(quizzesTable.id, id) : and(eq(quizzesTable.id, id), eq(quizzesTable.creatorId, authUser.userId));
  await db.delete(quizzesTable).where(where);
  res.sendStatus(204);
});

router.get("/quizzes/:id/questions", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, id));
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }
  if (quiz.visibility === "private") {
    const shareParam = req.query.share as string | undefined;
    const validToken = shareParam && quiz.shareToken && shareParam === quiz.shareToken;
    if (!validToken) {
      const authUser = await getAuthUser(req);
      if (!authUser || (authUser.role !== "owner" && authUser.userId !== quiz.creatorId)) {
        res.status(404).json({ error: "Quiz not found" }); return;
      }
    }
  }
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, id)).orderBy(questionsTable.orderIndex);
  res.json(questions);
});

router.post("/quizzes/:id/questions", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const quizId = parseInt(rawId, 10);
  if (isNaN(quizId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { questionText, questionType, options, correctAnswer, explanation, timeLimit, points, imageUrl, orderIndex } = req.body;
  if (questionType === undefined || questionType === null) {
    res.status(400).json({ error: "questionType is required" });
    return;
  }
  const [question] = await db.insert(questionsTable).values({
    quizId,
    questionText: questionText ?? "",
    questionType: questionType ?? "multiple_choice",
    options: options ?? [],
    correctAnswer: correctAnswer ?? "",
    explanation,
    timeLimit: timeLimit ?? 30,
    points: points ?? 100,
    imageUrl,
    orderIndex: orderIndex ?? 0,
  }).returning();
  await db.update(quizzesTable).set({ questionCount: sql`${quizzesTable.questionCount} + 1` }).where(eq(quizzesTable.id, quizId));
  res.status(201).json(question);
});

router.patch("/quizzes/:id/questions/:questionId", async (req, res): Promise<void> => {
  const rawQId = Array.isArray(req.params.questionId) ? req.params.questionId[0] : req.params.questionId;
  const questionId = parseInt(rawQId, 10);
  if (isNaN(questionId)) { res.status(400).json({ error: "Invalid questionId" }); return; }
  const { questionText, questionType, options, correctAnswer, explanation, timeLimit, points, imageUrl, audioUrl, orderIndex } = req.body;
  const [updated] = await db.update(questionsTable).set({ questionText, questionType, options, correctAnswer, explanation, timeLimit, points, imageUrl, audioUrl, orderIndex }).where(eq(questionsTable.id, questionId)).returning();
  if (!updated) { res.status(404).json({ error: "Question not found" }); return; }
  res.json(updated);
});

router.delete("/quizzes/:id/questions/:questionId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawQId = Array.isArray(req.params.questionId) ? req.params.questionId[0] : req.params.questionId;
  const quizId = parseInt(rawId, 10);
  const questionId = parseInt(rawQId, 10);
  await db.delete(questionsTable).where(eq(questionsTable.id, questionId));
  await db.update(quizzesTable).set({ questionCount: sql`GREATEST(${quizzesTable.questionCount} - 1, 0)` }).where(eq(quizzesTable.id, quizId));
  res.sendStatus(204);
});

export default router;
