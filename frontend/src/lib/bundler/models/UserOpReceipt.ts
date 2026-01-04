import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserOpReceipt extends Document {
    userOpHash: string;
    sender: string;
    nonce: string; // Store bigints as strings
    success: boolean;
    actualGasCost: string;
    actualGasUsed: string;
    transactionHash: string;
    blockNumber: string;
    blockHash: string;
    createdAt: Date;
}

const UserOpReceiptSchema: Schema = new Schema({
    userOpHash: { type: String, required: true, unique: true, index: true },
    sender: { type: String, required: true },
    nonce: { type: String, required: true },
    success: { type: Boolean, required: true },
    actualGasCost: { type: String, required: true },
    actualGasUsed: { type: String, required: true },
    transactionHash: { type: String, required: true },
    blockNumber: { type: String, required: true },
    blockHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Check if model exists to prevent overwrite error in hot reload
export const UserOpReceiptModel: Model<IUserOpReceipt> = mongoose.models.UserOpReceipt || mongoose.model<IUserOpReceipt>("UserOpReceipt", UserOpReceiptSchema);
