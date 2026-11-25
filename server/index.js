import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import connectDB from "./db/connection.js";
import authRoutes from "./routes/auth.js";
import categoryRoutes from "./routes/category.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";



const app = express();



const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : null;

app.use(
  cors({
    origin: allowedOrigins ? allowedOrigins : true,
    credentials: true,
  })
);
app.use(express.json());
app.use("/api/auth", authRoutes);   
app.use("/api/category", categoryRoutes);
app.use( "/api/supplier",supplierRoutes);
app.use("/api/order",orderRoutes);
app.use( "/api/product", productRoutes);
app.use( "/api/user",userRoutes);
app.use( "/api/profile",profileRoutes);
app.use("/api/dashboard",dashboardRoutes);
app.use("/api/ai", aiRoutes);






app.get("/", (req, res) => {
    res.send("Server Running");
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        ok: true,
        dbConnected: mongoose.connection.readyState === 1,
    });
});



const PORT = process.env.PORT || 3000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});


