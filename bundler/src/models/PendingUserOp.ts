
import mongoose, { Schema, Document } from "mongoose";

// Schema for Pending Operations (optional but good for persistence)
export interface IPendingUserOp extends Document {
    userOpHash: string;
    sender: string;
    target: string; // Account
    userOpData: any; // Full JSON of UserOp
    status: "pending" | "submitted" | "failed";
    createdAt: Date;
}

const PendingUserOpSchema: Schema = new Schema({
    userOpHash: { type: String, required: true, unique: true },
    sender: { type: String, required: true },
    userOpData: { type: Schema.Types.Mixed, required: true },
    status: { type: String, default: "pending" },
    createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-delete after 1 hour if stuck
});

export const PendingUserOpModel = mongoose.model<IPendingUserOp>("PendingUserOp", PendingUserOpSchema);
