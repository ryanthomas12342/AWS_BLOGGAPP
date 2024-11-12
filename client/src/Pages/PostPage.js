import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatISO9075 } from "date-fns";
import { UserContext } from "../UserContext";
import { Link } from "react-router-dom";

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [postInfo, setPostInfo] = useState(null);
  const { userInfo } = useContext(UserContext);
  const [error, setError] = useState(null);
  const [targetLanguage, setTargetLanguage] = useState("en");

  useEffect(() => {
    fetch(`${process.env.REACT_APP_SERVER_URL}/post/${id}`)
      .then((response) => response.json())
      .then((postInfo) => {
        console.log("this is ", postInfo);

        setPostInfo(postInfo);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  async function deletePost(event) {
    event.preventDefault();
    const confirmed = window.confirm(
      "Are you sure you want to delete this post?"
    );
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_SERVER_URL}/post/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        navigate("/index");
      } else {
        const jsonResponse = await response.json();
        setError(jsonResponse.message || "Failed to delete the post");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function translatePost(e) {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_SERVER_URL}/translate-post/${id}?targetLanguage=${targetLanguage}`
      );

      if (response.ok) {
        const data = await response.json();

        setPostInfo((prevInfo) => ({
          ...prevInfo,
          post: {
            ...prevInfo.post,
            content: data.translatedText,
          },
          title: data.translatedTitle || prevInfo.title,
          language: targetLanguage,
        }));
      } else {
        setError("Failed to translate post");
      }
    } catch (err) {
      setError(err.messasge);
    }
  }

  // If postInfo is not yet loaded, return null (nothing)
  if (!postInfo) return null;

  // Determine if the current user is the author
  const isAuthor = userInfo && userInfo.id === postInfo?.post.author?._id;

  return (
    <div className="post-page">
      <h1>{postInfo?.title}</h1>
      {postInfo?.createdAt && (
        <time>{formatISO9075(new Date(postInfo.post.createdAt))}</time>
      )}
      <div className="author">by @{postInfo?.post.author?.username}</div>

      {isAuthor && (
        <div
          className="edit-row"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Link
            className="btn edit-btn"
            to={`/edit/${postInfo?.post._id}`}
            style={{ textAlign: "center" }}
          >
            Edit this post
          </Link>
        </div>
      )}
      <br />
      <div className="image">
        <img
          src={`${process.env.REACT_APP_SERVER_URL}/${postInfo?.post.cover}`}
          alt=""
        />
      </div>
      <div
        className="content"
        dangerouslySetInnerHTML={{ __html: postInfo?.post.content }}
      />
      {/* Display Sentiment and Language Analysis */}
      <div className="analysis">
        <p>
          <strong>Sentiment:</strong> {postInfo?.sentiment}
        </p>
        <p>
          <strong>Sentiment Score:</strong>{" "}
          {JSON.stringify(postInfo?.sentimentScore)}
        </p>
        <p>
          <strong>Language:</strong> {postInfo?.language}
        </p>
      </div>
      <div className="translation-controls" style={{ marginTop: "20px" }}>
        <label htmlFor="language-select">
          Translate to:
          <select
            id="language-select"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="hi">Hindi</option>
            <option value="zh">Chinese</option>
          </select>
        </label>
        <button
          onClick={translatePost}
          style={{ marginLeft: "10px", marginTop: "10px" }}
        >
          Translate
        </button>
      </div>

      {isAuthor && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "20px",
          }}
        >
          <Link
            to="#"
            onClick={deletePost}
            className="btn delete-btn"
            style={{ backgroundColor: "black", color: "white" }}
          >
            Delete post
          </Link>
        </div>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
