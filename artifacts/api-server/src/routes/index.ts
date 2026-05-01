import { Router, type IRouter } from "express";
import healthRouter from "./health";
import propertiesRouter from "./properties";
import bookingsRouter from "./bookings";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(propertiesRouter);
router.use(bookingsRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
