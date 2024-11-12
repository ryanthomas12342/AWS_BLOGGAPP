const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const PostSchema = new Schema(
  {
    title: String,
    summary: String,
    content: String,
    cover: String,
    speaker: String,
    likes: { type: Schema.Types.ObjectId, ref: "User" },
    likeCount: { type: Number, default: 0 },
    author: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

const PostModel = model("Post", PostSchema);

module.exports = PostModel;
