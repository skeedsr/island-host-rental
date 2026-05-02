import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import customerAuthRouter from "./customer-auth";
import propertiesRouter from "./properties";
import bookingsRouter from "./bookings";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(customerAuthRouter);
router.use(propertiesRouter);
router.use(bookingsRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(storageRouter);

export default router;
