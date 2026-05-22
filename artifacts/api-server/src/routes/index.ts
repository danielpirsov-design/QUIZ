import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import quizzesRouter from "./quizzes";
import gamesRouter from "./games";
import aiRouter from "./ai";
import analyticsRouter from "./analytics";
import languageRouter from "./language";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(quizzesRouter);
router.use(gamesRouter);
router.use(aiRouter);
router.use(analyticsRouter);
router.use(languageRouter);
router.use(storageRouter);

export default router;
