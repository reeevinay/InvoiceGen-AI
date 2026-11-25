import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  parseInvoicePrompt,
  getReorderInsights,
  askLedger,
} from "../controllers/aiController.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/parse-invoice", parseInvoicePrompt);
router.get("/reorder-insights", getReorderInsights);
router.post("/ask-ledger", askLedger);

export default router;
