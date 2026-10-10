import { Router, type IRouter } from "express";
import healthRouter from "./health";
import biodiversityRouter from "./biodiversity";
import identificationRouter from "./identification";
import wildquestRouter from "./wildquest";

const router: IRouter = Router();

router.use(healthRouter);
router.use(biodiversityRouter);
router.use(identificationRouter);
router.use(wildquestRouter);

export default router;
