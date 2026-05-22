import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const visibilityEnum = pgEnum("visibility", ["public", "private"]);
export const questionTypeEnum = pgEnum("question_type", ["multiple_choice", "true_false", "short_answer", "audio"]);

export const quizzesTable = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  visibility: visibilityEnum("visibility").notNull().default("private"),
  questionCount: integer("question_count").notNull().default(0),
  timesPlayed: integer("times_played").notNull().default(0),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  coverImageUrl: text("cover_image_url"),
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzesTable.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: questionTypeEnum("question_type").notNull().default("multiple_choice"),
  options: text("options").array().notNull().default([]),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  timeLimit: integer("time_limit").notNull().default(30),
  points: integer("points").notNull().default(100),
  imageUrl: text("image_url"),
  audioUrl: text("audio_url"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQuizSchema = createInsertSchema(quizzesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  questionCount: true,
  timesPlayed: true,
});
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzesTable.$inferSelect;

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
