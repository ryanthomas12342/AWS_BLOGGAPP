import React, { useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function Post({
  _id,
  title,
  description,
  cover,
  content,
  createdAt,
  author,
}) {
  const [audio, setAudio] = useState(null);

  const playAudio = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/generate-speech/${_id}`
      );
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        const audioInstance = new Audio(audioUrl);
        setAudio(audioInstance); // Store it in state if you want to retain control
        audioInstance.play().catch((error) => {
          console.error("Error playing audio:", error);
        });
      } else {
        console.error("Failed to fetch audio");
      }
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  const wordCount = (text) => {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  };

  const calculateReadingTime = (text) => {
    const wordsPerMinute = 200;
    const count = wordCount(text);
    const time = Math.ceil(count / wordsPerMinute);
    return `Reading time: ${time} minute${time === 1 ? "" : "s"}`;
  };

  return (
    <div className="post">
      <div className="image">
        <Link to={`/post/${_id}`}>
          <img src={`${cover}`} alt={title} />
        </Link>
      </div>
      <div className="texts">
        <Link to={`/post/${_id}`}>
          <h2>{title}</h2>
        </Link>
        <div className="info">
          <Link to={`/author/${author._id}`} className="author">
            {author.username}
          </Link>
          &nbsp;
          <time>{format(new Date(createdAt), "PPP")}</time>
          <b>
            <span className="word-count">Word Count: {wordCount(content)}</span>
          </b>
          <b>
            <span className="reading-time">
              {calculateReadingTime(content)}
            </span>
          </b>
        </div>
        <p className="summary">{description}</p>
        <button onClick={playAudio}>Listen to Title</button>
      </div>
    </div>
  );
}
