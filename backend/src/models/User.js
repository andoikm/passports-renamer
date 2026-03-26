import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', UserSchema);

