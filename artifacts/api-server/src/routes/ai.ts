import { Router, type IRouter } from "express";
import { db, quizzesTable, questionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { objectStorageClient } from "../lib/objectStorage";

const router: IRouter = Router();

function shuffleOptions(options: string[]): string[] {
  const arr = [...options];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return null; }
  return userId;
}

async function callAI(messages: { role: string; content: string }[]): Promise<string> {
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error ${res.status}: ${err}`);
  }
  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Generate quiz (returns JSON, no DB save) ──────────────────────────────────
router.post("/ai/generate-quiz", async (req, res): Promise<void> => {
  const { topic, text, customPrompt, questionCount = 5, difficulty = "medium", language = "English", mode = "game" } = req.body;
  if (!topic && !text) { res.status(400).json({ error: "topic or text is required" }); return; }

  const source = text
    ? `Use the following source material:\n\n${text.slice(0, 8000)}`
    : `Topic: ${topic}`;

  const modeInstructions = {
    game: "Focus on fun, memorable facts. Use lively language. Make wrong answers plausible but clearly incorrect on reflection.",
    exam: "Mirror real exam style: precise, unambiguous wording. Include common misconceptions as distractors. No humor.",
    deepdive: "Go beyond surface knowledge. Ask 'why' and 'how'. Require deeper understanding to answer correctly.",
  }[mode as string] || "";

  const difficultyInstructions = {
    easy: "Keep language simple. Facts should be well-known. Avoid trick questions.",
    medium: "Mix straightforward and nuanced questions. Some questions should require reasoning.",
    hard: "Require expert-level knowledge. Use precise terminology. All distractors must be plausible.",
  }[difficulty as string] || "";

  const systemPrompt = `You are an expert quiz designer for an educational gaming platform similar to Kahoot.
You create highly engaging, accurate, and pedagogically sound quizzes.
${modeInstructions}
${difficultyInstructions}
Quality rules:
- Every question must have EXACTLY 4 answer options
- The correctAnswer MUST match one of the options exactly (character-for-character)
- Wrong answers must be plausible to make the question interesting
- Questions must be factually accurate and unambiguous
- Use the language: ${language}
- Return ONLY valid JSON, no markdown, no code fences`;

  const customInstructions = customPrompt?.trim() ? `\nAdditional instructions from the creator:\n${customPrompt.trim()}\n` : "";

  const userPrompt = `${source}${customInstructions}

Generate a quiz with EXACTLY ${questionCount} questions.
Return this exact JSON structure:
{
  "title": "Engaging quiz title",
  "description": "One sentence description",
  "questions": [
    {
      "questionText": "Clear, specific question?",
      "options": ["Correct Answer", "Wrong but plausible", "Another wrong one", "Last wrong one"],
      "correctAnswer": "Correct Answer",
      "explanation": "Why this is correct (1-2 sentences)",
      "timeLimit": 20,
      "points": 1000
    }
  ]
}`;

  try {
    const content = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { res.status(500).json({ error: "AI returned invalid format" }); return; }
    const quiz = JSON.parse(jsonMatch[0]);
    // Validate and normalise
    quiz.questions = (quiz.questions || []).map((q: any) => {
      const options = shuffleOptions(q.options?.slice(0, 4) || []);
      return {
        ...q,
        questionType: "multiple_choice",
        timeLimit: q.timeLimit || 20,
        points: q.points || 1000,
        options,
      };
    });
    res.json(quiz);
  } catch (e: any) {
    console.error("AI generate error:", e);
    res.status(500).json({ error: "AI generation failed", detail: e.message });
  }
});

// ── Generate + save quiz to DB ────────────────────────────────────────────────
router.post("/ai/generate-and-save", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { generatedQuiz } = req.body;
  if (!generatedQuiz?.title || !generatedQuiz?.questions?.length) {
    res.status(400).json({ error: "generatedQuiz is required" });
    return;
  }

  try {
    const [quiz] = await db.insert(quizzesTable).values({
      title: generatedQuiz.title,
      description: generatedQuiz.description || "",
      category: generatedQuiz.category || "General",
      visibility: "private",
      creatorId: userId,
      questionCount: 0,
    }).returning();

    let savedCount = 0;
    for (let i = 0; i < generatedQuiz.questions.length; i++) {
      const q = generatedQuiz.questions[i];
      if (!q.questionText || !q.correctAnswer) continue;
      await db.insert(questionsTable).values({
        quizId: quiz.id,
        questionText: q.questionText,
        questionType: "multiple_choice",
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
        timeLimit: q.timeLimit || 20,
        points: q.points || 1000,
        orderIndex: i + 1,
        imageUrl: q.imageUrl || null,
      } as any);
      savedCount++;
    }

    await db.update(quizzesTable)
      .set({ questionCount: savedCount })
      .where(eq(quizzesTable.id, quiz.id));

    res.json({ quizId: quiz.id, title: quiz.title, questionCount: savedCount });
  } catch (e: any) {
    console.error("Save quiz error:", e);
    res.status(500).json({ error: "Failed to save quiz" });
  }
});

// ── Regenerate a single question ──────────────────────────────────────────────
router.post("/ai/regenerate-question", async (req, res): Promise<void> => {
  const { topic, existingQuestion, difficulty = "medium", language = "English" } = req.body;
  if (!topic) { res.status(400).json({ error: "topic is required" }); return; }

  const systemPrompt = `You are an expert quiz designer. Generate one high-quality multiple choice question.
The correctAnswer MUST match one of the options exactly. Return ONLY valid JSON.`;

  const userPrompt = `Topic: ${topic}
Difficulty: ${difficulty}
Language: ${language}
${existingQuestion ? `Replace this question (don't repeat it): "${existingQuestion}"` : ""}

Return this JSON:
{
  "questionText": "Question here?",
  "options": ["Correct", "Wrong 1", "Wrong 2", "Wrong 3"],
  "correctAnswer": "Correct",
  "explanation": "Why this is correct",
  "timeLimit": 20,
  "points": 1000
}`;

  try {
    const content = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { res.status(500).json({ error: "Invalid AI response" }); return; }
    const q = JSON.parse(jsonMatch[0]);
    const options = shuffleOptions(q.options?.slice(0, 4) || []);
    res.json({ ...q, options, questionType: "multiple_choice" });
  } catch (e) {
    res.status(500).json({ error: "Regeneration failed" });
  }
});

// ── AI Chat assistant ─────────────────────────────────────────────────────────
router.post("/ai/chat", async (req, res): Promise<void> => {
  const { message, context } = req.body;
  if (!message) { res.status(400).json({ error: "message is required" }); return; }
  const systemPrompt = `You are QUIZDES AI, an enthusiastic quiz design assistant. Help educators create engaging quizzes and learning experiences. Be concise (under 150 words), practical, and encouraging.${context ? `\n\nContext: ${context}` : ""}`;
  try {
    const content = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);
    res.json({ reply: content });
  } catch {
    res.json({ reply: "I'm having trouble connecting right now. Please try again!" });
  }
});

// ── Improve a single question ─────────────────────────────────────────────────
router.post("/ai/improve-question", async (req, res): Promise<void> => {
  const { questionText, options, correctAnswer, feedback } = req.body;
  if (!questionText || !correctAnswer) { res.status(400).json({ error: "questionText and correctAnswer required" }); return; }
  const prompt = `Improve this quiz question for clarity and engagement:
Question: ${questionText}
Options: ${options?.join(", ") || "N/A"}
Correct: ${correctAnswer}
${feedback ? `Feedback: ${feedback}` : ""}

Return ONLY JSON:
{"questionText":"improved","options":["A","B","C","D"],"correctAnswer":"A","explanation":"why","improvements":"what changed"}`;
  try {
    const content = await callAI([{ role: "user", content: prompt }]);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { res.status(500).json({ error: "Failed" }); return; }
    res.json(JSON.parse(jsonMatch[0]));
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Generate + store image for a question ─────────────────────────────────────
async function generateAndStoreImage(prompt: string): Promise<string> {
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  // 1. Generate image with gpt-image-1 (returns base64, not a URL)
  const imgRes = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-image-1", prompt: prompt.slice(0, 1000), n: 1, size: "1024x1024" }),
  });
  if (!imgRes.ok) throw new Error(`Image gen error ${imgRes.status}: ${await imgRes.text()}`);
  const imgData = await imgRes.json() as any;
  const b64 = imgData.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data returned from image generation API");

  // 2. Decode base64 to buffer
  const buffer = Buffer.from(b64, "base64");

  // 3. Upload to GCS
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR not set");
  const normalizedDir = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
  const parts = normalizedDir.split("/");
  const bucketName = parts[0];
  const dirPrefix = parts.slice(1).join("/");
  const objectName = `${dirPrefix}/uploads/${randomUUID()}`;

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  await file.save(buffer, { contentType: "image/png", resumable: false });

  // 4. Build serving path matching the format normalizeObjectEntityPath expects
  const entityId = objectName.slice(dirPrefix.length + 1); // strip dir prefix + slash
  return `/objects/${entityId}`;
}

router.post("/ai/generate-question-image", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { questionText, topic } = req.body;
  if (!questionText) { res.status(400).json({ error: "questionText required" }); return; }

  try {
    // Ask the text AI to craft a concise, safe image prompt
    const promptText = await callAI([
      { role: "system", content: "Create a concise DALL-E image prompt (max 30 words) that visually represents a quiz question. Use an educational illustration style: colorful, clean, no text. Return ONLY the prompt, no quotes." },
      { role: "user", content: `Question: "${questionText}"${topic ? `\nTopic: ${topic}` : ""}` },
    ]);
    const objectPath = await generateAndStoreImage(promptText.trim());
    res.json({ objectPath });
  } catch (e: any) {
    console.error("Image generation error:", e.message);
    res.status(500).json({ error: "Image generation failed", detail: e.message });
  }
});

// ── Generate language vocabulary set ──────────────────────────────────────────
router.post("/ai/generate-language-set", async (req, res): Promise<void> => {
  const userId = (req as any).session?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { topic, nativeLanguage = "English", targetLanguage, wordCount = 10 } = req.body;
  if (!targetLanguage) { res.status(400).json({ error: "targetLanguage is required" }); return; }
  if (!topic) { res.status(400).json({ error: "topic is required" }); return; }

  const prompt = `You are a language learning expert. Generate a vocabulary set for learning ${targetLanguage} from ${nativeLanguage}.

Topic: ${topic}
Word count: ${Math.min(Number(wordCount) || 10, 50)}

For each word/phrase include:
- native: the word or short phrase in ${nativeLanguage}
- translated: the word or short phrase in ${targetLanguage}
- pronunciation: romanized pronunciation guide (only if ${targetLanguage} uses a non-Latin script, otherwise empty string "")
- example: a short, natural example sentence in ${targetLanguage} with the ${nativeLanguage} translation in parentheses

Return ONLY valid JSON with this exact shape (no markdown, no extra text):
{
  "title": "A short descriptive set title",
  "words": [
    { "native": "hello", "translated": "hola", "pronunciation": "", "example": "¡Hola! ¿Cómo estás? (Hello! How are you?)" }
  ]
}`;

  try {
    const raw = await callAI([
      { role: "system", content: "You are a language learning expert. Return ONLY valid JSON, no markdown fences, no extra commentary." },
      { role: "user", content: prompt },
    ]);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in AI response");
    const parsed = JSON.parse(match[0]);
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Generate printable worksheet (teacher-only) ───────────────────────────────
router.post("/ai/generate-worksheet", async (req, res): Promise<void> => {
  const userId = (req as any).session?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const {
    subject, topic,
    gradeLevel = "Grade 5",
    questionTypes = ["multiple_choice", "short_answer"],
    questionCount = 10,
    customInstructions,
  } = req.body;
  if (!subject || !topic) { res.status(400).json({ error: "subject and topic are required" }); return; }

  const totalQ = Math.min(Number(questionCount) || 10, 40);
  const types = Array.isArray(questionTypes) ? questionTypes : ["multiple_choice"];

  const sectionExamples = {
    multiple_choice: `{ "type": "multiple_choice", "title": "Multiple Choice", "instructions": "Circle the letter of the best answer.", "questions": [{ "id": 1, "question": "Question text?", "options": ["A) option one", "B) option two", "C) option three", "D) option four"], "answer": "A" }] }`,
    fill_blank: `{ "type": "fill_blank", "title": "Fill in the Blank", "instructions": "Complete each sentence with the correct word from the word bank.", "wordBank": ["word1","word2","word3"], "questions": [{ "id": 1, "question": "The _____ is the powerhouse of the cell.", "answer": "mitochondria" }] }`,
    short_answer: `{ "type": "short_answer", "title": "Short Answer", "instructions": "Answer each question in 1–2 complete sentences.", "questions": [{ "id": 1, "question": "Explain why...?", "answer": "Model answer here." }] }`,
    true_false: `{ "type": "true_false", "title": "True or False", "instructions": "Write TRUE or FALSE on the line provided.", "questions": [{ "id": 1, "question": "Statement here.", "answer": "True" }] }`,
    matching: `{ "type": "matching", "title": "Matching", "instructions": "Draw a line to match each term with its definition.", "questions": [{ "id": 1, "term": "Term", "definition": "Definition" }] }`,
  } as Record<string, string>;

  const sectionGuides = types.map(t => sectionExamples[t] ?? sectionExamples.short_answer).join(",\n    ");

  const prompt = `You are an experienced teacher creating a printable classroom worksheet.
Subject: ${subject}
Topic: ${topic}
Grade Level: ${gradeLevel}
Question Types: ${types.join(", ")}
Total Questions: ${totalQ}
${customInstructions ? `Special Instructions: ${customInstructions}` : ""}

Create a complete, educationally sound worksheet. Distribute the ${totalQ} questions across the requested types.
Include clear learning objectives, per-section instructions, and an answer key at the end.

Return ONLY valid JSON (no markdown, no commentary):
{
  "title": "Descriptive worksheet title",
  "subject": "${subject}",
  "gradeLevel": "${gradeLevel}",
  "objectives": ["Students will be able to...", "Students will understand..."],
  "sections": [
    ${sectionGuides}
  ],
  "answerKey": { "1": "answer", "2": "answer" }
}`;

  try {
    const raw = await callAI([
      { role: "system", content: "You are an expert teacher creating educational worksheets. Return ONLY valid JSON, no markdown fences, no preamble." },
      { role: "user", content: prompt },
    ]);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in AI response");
    const ws = JSON.parse(match[0]);
    if (Array.isArray(ws.sections)) {
      ws.sections = ws.sections.map((sec: any) => {
        if (sec.type === "multiple_choice" && Array.isArray(sec.questions)) {
          sec.questions = sec.questions.map((q: any) => ({
            ...q,
            options: Array.isArray(q.options) ? shuffleOptions(q.options) : q.options,
          }));
        }
        return sec;
      });
    }
    res.json(ws);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
