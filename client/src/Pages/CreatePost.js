import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import Editor from "./Editor";
import KommunicateChat from "./KommunicateChat"; // Import KommunicateChat component
import "react-quill/dist/quill.snow.css";
import "./CreatePost.css";

export default function CreatePost() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState(null);
  const [redirect, setRedirect] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createNewPost(ev) {
    ev.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const data = new FormData();
      data.set("title", title);
      data.set("summary", summary);
      data.set("content", content);
      if (files?.[0]) {
        data.set("file", files[0]);
      }

      const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/post`, {
        method: "POST",
        body: data,
        credentials: "include",
      });

      if (response.ok) {
        setRedirect(true);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to create post");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (redirect) {
    return <Navigate to={"/index"} />;
  }

  return (
    <div className="create-post-container">
      <form className="create-post-form" onSubmit={createNewPost}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(ev) => setTitle(ev.target.value)}
        />
        <input
          type="text"
          placeholder="Summary"
          value={summary}
          onChange={(ev) => setSummary(ev.target.value)}
        />
        <input
          type="file"
          onChange={(ev) => setFiles(ev.target.files)}
          accept="image/*"
        />
        <Editor value={content} onChange={setContent} className="post-editor" />
        <button className="create-post-button" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create post"}
        </button>
        {error && <div className="error-message">{error}</div>}
      </form>

      {/* Kommunicate Chat Widget */}
    </div>
  );
}
