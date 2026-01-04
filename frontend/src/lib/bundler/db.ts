
import mongoose from "mongoose";

// Global cache to prevent multiple connections in serverless environment
let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.warn("MONGODB_URI missing in env!");
            return null;
        }

        cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
            console.log("🔥 Connected to MongoDB (New Connection)");
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}
