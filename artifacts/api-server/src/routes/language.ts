import { Router, type IRouter } from "express";
import { db, languageSetsTable, languageWordsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return null; }
  return userId;
}

// List all sets for the current user
router.get("/language-sets", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const sets = await db
    .select()
    .from(languageSetsTable)
    .where(eq(languageSetsTable.userId, userId))
    .orderBy(languageSetsTable.createdAt);
  res.json(sets);
});

// Get a single set with all its words
router.get("/language-sets/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = Number(req.params.id);
  const [set] = await db
    .select()
    .from(languageSetsTable)
    .where(and(eq(languageSetsTable.id, id), eq(languageSetsTable.userId, userId)));
  if (!set) { res.status(404).json({ error: "Set not found" }); return; }
  const words = await db
    .select()
    .from(languageWordsTable)
    .where(eq(languageWordsTable.setId, id))
    .orderBy(languageWordsTable.orderIndex);
  res.json({ ...set, words });
});

// Create a new set with words
router.post("/language-sets", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { title, nativeLanguage = "English", targetLanguage, words = [] } = req.body;
  if (!title || !targetLanguage) {
    res.status(400).json({ error: "title and targetLanguage are required" });
    return;
  }
  const [set] = await db
    .insert(languageSetsTable)
    .values({ userId, title, nativeLanguage, targetLanguage, wordCount: words.length })
    .returning();
  if (words.length > 0) {
    await db.insert(languageWordsTable).values(
      words.map((w: any, i: number) => ({
        setId: set.id,
        nativeWord: w.native ?? w.nativeWord,
        translatedWord: w.translated ?? w.translatedWord,
        example: w.example || null,
        pronunciation: w.pronunciation || null,
        orderIndex: i,
      }))
    );
  }
  res.status(201).json(set);
});

// Delete a set
router.delete("/language-sets/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = Number(req.params.id);
  await db
    .delete(languageSetsTable)
    .where(and(eq(languageSetsTable.id, id), eq(languageSetsTable.userId, userId)));
  res.json({ ok: true });
});

export default router;
