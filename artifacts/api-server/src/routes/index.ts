import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import companiesRouter from "./companies";
import usersRouter from "./users";
import productsRouter from "./products";
import locationsRouter from "./locations";
import batchesRouter from "./batches";
import codesRouter from "./codes";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(companiesRouter);
router.use(usersRouter);
router.use(productsRouter);
router.use(locationsRouter);
router.use(batchesRouter);
router.use(codesRouter);
router.use(reportsRouter);

export default router;
