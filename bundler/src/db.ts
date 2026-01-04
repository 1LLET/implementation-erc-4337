
import mongoose from "mongoose";


export async function connectDB() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.warn("⚠️ MONGODB_URI is not defined in .env. Falling back to in-memory storage (if implemented) or failing.");
        return;
    }

    if (mongoose.connection.readyState >= 1) {
        return;
    }

    try {
        await mongoose.connect(uri);
        console.log("🔥 Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
}
