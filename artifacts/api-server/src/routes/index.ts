import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import clinicsRouter from "./clinics";
import doctorsRouter from "./doctors";
import appointmentsRouter from "./appointments";
import reviewsRouter from "./reviews";
import subscriptionsRouter from "./subscriptions";
import paymentsRouter from "./payments";
import chatsRouter from "./chats";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(clinicsRouter);
router.use(doctorsRouter);
router.use(appointmentsRouter);
router.use(reviewsRouter);
router.use(subscriptionsRouter);
router.use(paymentsRouter);
router.use(chatsRouter);
router.use(adminRouter);

export default router;
