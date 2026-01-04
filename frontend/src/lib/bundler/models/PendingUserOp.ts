import mongoose, { Schema, Document, Model } from "mongoose";

// Schema for Pending Operations (optional but good for persistence)
export interface IPendingUserOp extends Document {
    userOpHash: string;
    sender: string;
    target: string; // Account
    userOpData: any; // Full JSON of UserOp
    status: "pending" | "submitted" | "failed" | "completed";
    transactionHash?: string;
    error?: string;
    createdAt: Date;
}

const PendingUserOpSchema: Schema = new Schema({
    userOpHash: { type: String, required: true, unique: true },
    sender: { type: String, required: true },
    userOpData: { type: Schema.Types.Mixed, required: true },
    status: { type: String, default: "pending" },
    transactionHash: { type: String },
    error: { type: String },
    createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete after 24 hours
});

export const PendingUserOpModel: Model<IPendingUserOp> = mongoose.models.PendingUserOp || mongoose.model<IPendingUserOp>("PendingUserOp", PendingUserOpSchema);
