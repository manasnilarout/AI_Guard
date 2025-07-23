import mongoose, { Schema, Document } from 'mongoose';

export interface IApiKey extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  provider: 'openai' | 'anthropic' | 'gemini';
  encryptedKey: string;
  keyId: string; // For key rotation tracking
  name: string;
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    provider: {
      type: String,
      enum: ['openai', 'anthropic', 'gemini'],
      required: true,
    },
    encryptedKey: {
      type: String,
      required: true,
    },
    keyId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (keyId index is created automatically by unique constraint)
apiKeySchema.index({ userId: 1 });
apiKeySchema.index({ projectId: 1 });
apiKeySchema.index({ provider: 1 });
apiKeySchema.index({ isActive: 1 });

// Compound index for finding active keys for a project and provider
apiKeySchema.index({ projectId: 1, provider: 1, isActive: 1 });

export const ApiKey = mongoose.model<IApiKey>('ApiKey', apiKeySchema);