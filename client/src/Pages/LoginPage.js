import React, {
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../UserContext";
import "../App.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faSyncAlt,
  faCamera,
} from "@fortawesome/free-solid-svg-icons";
import Webcam from "react-webcam";
import axios from "axios";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [captchaValue, setCaptchaValue] = useState("");
  const [redirect, setRedirect] = useState(false);
  const { setUserInfo } = useContext(UserContext);
  const [showPassword, setShowPassword] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [faceVerified, setFaceVerified] = useState(false); // Track facial recognition status
  const webcamRef = useRef(null);
  const [showWebcamModal, setShowWebcamModal] = useState(false); // Modal state for webcam

  useEffect(() => {
    fetchCaptcha();
  }, []);

  async function fetchCaptcha() {
    try {
      const response = await fetch(`http://localhost:4000/generate-captcha`);
      if (!response.ok) throw new Error("Failed to fetch CAPTCHA");
      const data = await response.json();
      setCaptcha(data.captcha);
      setCaptchaId(data.captchaId);
      setFetchError(null);
    } catch (error) {
      console.error("Error fetching CAPTCHA:", error);
      setFetchError("Failed to fetch CAPTCHA. Please try again later.");
    }
  }

  const handleFaceRecognition = useCallback(async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    try {
      const response = await axios.post(
        `http://localhost:4000/face-recognition`,
        {
          image: imageSrc,
          username: username,
        }
      );
      if (response.data.success) {
        setFaceVerified(true);
        setShowWebcamModal(false); // Close modal after successful verification
        alert("Face recognition successful!");
      } else {
        alert("Face recognition failed. Try again.");
      }
    } catch (error) {
      console.error("Error in face recognition:", error);
      alert("Error in face recognition. Please try again.");
    }
  }, [username]);

  async function login(ev) {
    ev.preventDefault();
    if (!faceVerified) {
      alert("Please verify your face first.");
      return;
    }
    try {
      const response = await fetch(`http://localhost:4000/login`, {
        method: "POST",

        body: JSON.stringify({
          username,
          password,

          captchaId,
          captchaValue,
        }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (response.ok) {
        const userInfo = await response.json();
        setUserInfo(userInfo);
        setRedirect(true);
      } else {
        console.log(response);
        alert("Wrong credentials or CAPTCHA");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Failed to login. Please try again later.");
    }
  }

  if (redirect) return <Navigate to="/index" />;

  return (
    <form className="login" onSubmit={login}>
      <h1>Login</h1>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(ev) => setUsername(ev.target.value)}
        autoComplete="off"
      />
      <div className="password-container">
        <label htmlFor="password">Password</label>
        <div className="password-input">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            placeholder="Password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            autoComplete="new-password"
          />
          <FontAwesomeIcon
            icon={showPassword ? faEyeSlash : faEye}
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          />
        </div>
      </div>
      <div className="captcha-container">
        <label htmlFor="captcha">CAPTCHA:</label>
        <div className="captcha-box">
          <span className="captcha-text">{captcha}</span>
          <button
            type="button"
            className="refresh-captcha"
            onClick={fetchCaptcha}
            id="button-addon2"
          >
            <FontAwesomeIcon icon={faSyncAlt} aria-hidden="true" />
          </button>
        </div>
        <input
          type="text"
          id="captcha"
          placeholder="Enter CAPTCHA"
          value={captchaValue}
          onChange={(ev) => setCaptchaValue(ev.target.value)}
        />
      </div>
      <button
        type="button"
        className="face-verification-button"
        onClick={() => setShowWebcamModal(true)}
      >
        <FontAwesomeIcon icon={faCamera} /> Face Verification
      </button>

      {/* Modal for Webcam */}
      {showWebcamModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Face Verification</h2>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="webcam-view"
            />
            <div className="modal-buttons">
              <button
                onClick={handleFaceRecognition}
                className="capture-button"
              >
                Capture & Verify
              </button>
              <button
                onClick={() => setShowWebcamModal(false)}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <button type="submit" className="login-button">
        Login
      </button>
      {fetchError && <p className="error-message">{fetchError}</p>}
    </form>
  );
}
