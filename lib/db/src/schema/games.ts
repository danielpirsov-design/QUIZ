import { pgTable, text, serial, timestamp, integer, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { quizzesTable } from "./quizzes";

export const gameStatusEnum = pgEnum("game_status", ["waiting", "active", "ended"]);
export const gameModeEnum = pgEnum("game_mode", ["live", "solo", "timed", "multiplayer", "bomb", "classic_plus", "volcano", "relay", "self_paced"]);
export const questionPhaseEnum = pgEnum("question_phase", ["question", "revealing", "leaderboard"]);

export const gameSessionsTable = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzesTable.id, { onDelete: "cascade" }),
  hostId: integer("host_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  pin: text("pin").notNull().unique(),
  hostToken: text("host_token").unique(),
  status: gameStatusEnum("status").notNull().default("waiting"),
  gameMode: gameModeEnum("game_mode").notNull().default("live"),
  currentQuestion: integer("current_question"),
  questionPhase: questionPhaseEnum("question_phase").default("question"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const participantsTable = pgTable("participants", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => gameSessionsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  nickname: text("nickname").notNull(),
  avatar: text("avatar").default("🐶"),
  score: integer("score").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalAnswers: integer("total_answers").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  rank: integer("rank"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  // Power-ups
  shieldCount: integer("shield_count").notNull().default(1),
  fiftyFiftyCount: integer("fifty_fifty_count").notNull().default(1),
  doubleCount: integer("double_count").notNull().default(1),
  shieldActive: boolean("shield_active").notNull().default(false),
  doubleActive: boolean("double_active").notNull().default(false),
  eliminated: boolean("eliminated").notNull().default(false),
  teamId: integer("team_id"),
});

export const answerLogsTable = pgTable("answer_logs", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => gameSessionsTable.id, { onDelete: "cascade" }),
  participantId: integer("participant_id").notNull().references(() => participantsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull(),
  answer: text("answer").notNull(),
  isCorrect: integer("is_correct").notNull().default(0),
  pointsEarned: integer("points_earned").notNull().default(0),
  timeSpent: integer("time_spent").notNull().default(0),
  answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGameSessionSchema = createInsertSchema(gameSessionsTable).omit({
  id: true,
  createdAt: true,
  status: true,
  pin: true,
  currentQuestion: true,
  startedAt: true,
  endedAt: true,
});
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameSession = typeof gameSessionsTable.$inferSelect;

export const insertParticipantSchema = createInsertSchema(participantsTable).omit({
  id: true,
  joinedAt: true,
  score: true,
  correctAnswers: true,
  totalAnswers: true,
  rank: true,
});
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participantsTable.$inferSelect;
