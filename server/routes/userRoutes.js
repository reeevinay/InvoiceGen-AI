import express from "express";
import authMiddleware, { requireRole } from "../middleware/authMiddleware.js";
import {
  addUser,
  getUsers,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";

const router = express.Router();

router.use(authMiddleware, requireRole("Admin"));

router.post("/add", addUser);
router.get("/", getUsers);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;