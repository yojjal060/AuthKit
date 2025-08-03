import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            trim: true,
            lowercase: true
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
        },
        // tenant support
        tenantId: {
            type: String,
            required: false, // Optional for backward compatibility
            default: 'default',
            index: true
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        // Separate tokens for different purposes
        verificationToken: {
            type: String,
            default: null,
        },
        resetToken: {
            type: String,
            default: null,
        },
        // Add token expiration
        tokenExpires: {
            type: Date,
            default: null,
        },
        provider: {
            type: String,
            enum: ['local', 'google', 'facebook'],
            default: 'local',
        },
        avatarURL: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

// Compound index for tenant + email uniqueness
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export default mongoose.model('User', userSchema);