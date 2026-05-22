import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const languageSetsTable = pgTable("language_sets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  nativeLanguage: text("native_language").notNull().default("English"),
  targetLanguage: text("target_language").notNull(),
  wordCount: integer("word_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const languageWordsTable = pgTable("language_words", {
  id: serial("id").primaryKey(),
  setId: integer("set_id").notNull().references(() => languageSetsTable.id, { onDelete: "cascade" }),
  nativeWord: text("native_word").notNull(),
  translatedWord: text("translated_word").notNull(),
  example: text("example"),
  pronunciation: text("pronunciation"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLanguageSetSchema = createInsertSchema(languageSetsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  wordCount: true,
});
export type InsertLanguageSet = z.infer<typeof insertLanguageSetSchema>;
export type LanguageSet = typeof languageSetsTable.$inferSelect;

export const insertLanguageWordSchema = createInsertSchema(languageWordsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLanguageWord = z.infer<typeof insertLanguageWordSchema>;
export type LanguageWord = typeof languageWordsTable.$inferSelect;
