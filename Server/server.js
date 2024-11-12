require("dotenv").config();
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const {
  RekognitionClient,
  SearchFacesByImageCommand,
} = require("@aws-sdk/client-rekognition");
const {
  PollyClient,
  SynthesizeSpeechCommand,
  LanguageCode,
} = require("@aws-sdk/client-polly");

const {
  ComprehendClient,
  DetectSentimentCommand,
  DetectDominantLanguageCommand,
  DetectPiiEntitiesCommand,
} = require("@aws-sdk/client-comprehend");
const {
  TranslateClient,
  TranslateTextCommand,
} = require("@aws-sdk/client-translate");

const rekognitionClient = new RekognitionClient({
  region: "us-east-1", // Replace with the AWS region you're using, e.g., "us-east-1"
});
const translateClient = new TranslateClient({ region: "us-east-1" });

const multerS3 = require("multer-s3");

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const User = require("./models/User");
const Post = require("./models/Post");
const { Lambda } = require("aws-sdk");

const app = express();
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const comprehendClient = new ComprehendClient({
  region: process.env.AWS_REGION, // Replace with your preferred AWS region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const pollyClient = new PollyClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

// Set up the SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME, // Name of your S3 bucket
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + path.extname(file.originalname)); // File key in S3 with timestamp to avoid collisions
    },
  }),
});

const lambda = new Lambda({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const allowedOrigins = [
  "http://localhost:3000",
  "https://lifestyleblender.vercel.app",
  "https://lifestyleblendclient.vercel.app",
];

// Middleware
app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,HEAD,OPTIONS,POST,PUT,PATCH,DELETE"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

app.options("*", cors());

app.get("/", async (req, res) => {
  return res
    .status(200)
    .json({ message: "Blog app server is up and running!" });
});

const uploadMiddleware = multer({ dest: "uploads/" });

mongoose.set("strictQuery", true);

async function connectMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
}

connectMongoDB();

const salt = bcrypt.genSaltSync(10);
const secret = process.env.SECRET;

let captchaStore = {}; // Temporary storage for CAPTCHAs

function generateCaptcha() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let captcha = "";
  for (let i = 0; i < 6; i++) {
    captcha += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return captcha;
}

async function sendRegistrationNotification(userName, userEmail) {
  const emailParams = {
    Destination: {
      ToAddresses: [process.env.SES_VERIFIED_EMAIL], // Your email address
    },
    Message: {
      Body: {
        Text: {
          Data: `A new user has registered:\n\nName: ${userName}\nEmail: ${userEmail}`,
        },
        Html: {
          Data: `<p>A new user has registered:</p><p><strong>Name:</strong> ${userName}</p><p><strong>Email:</strong> ${userEmail}</p>`,
        },
      },
      Subject: { Data: "New User Registration Notification" },
    },
    Source: process.env.SES_VERIFIED_EMAIL, // Must be a verified sender email in SES
  };

  try {
    const emailCommand = new SendEmailCommand(emailParams);
    const response = await sesClient.send(emailCommand);
    console.log("Notification email sent! Message ID:", response.MessageId);
  } catch (error) {
    console.error("Error sending notification email:", error);
  }
}

app.get("/generate-captcha", (req, res) => {
  const captcha = generateCaptcha();
  const captchaId = Date.now().toString();
  captchaStore[captchaId] = captcha;
  res.json({ captcha, captchaId });
});

async function detectDominantLanguage(text) {
  const params = { Text: text };
  const command = new DetectDominantLanguageCommand(params);

  try {
    const response = await comprehendClient.send(command);
    const dominantLanguage = response.Languages.reduce((max, lang) =>
      lang.Score > max.Score ? lang : max
    );

    return {
      languageCode: dominantLanguage.LanguageCode, // e.g., "en" for English
      confidence: dominantLanguage.Score,
    };
  } catch (error) {
    console.error("Error detecting language:", error);
    return null;
  }
}

async function analyzeSentiment(text, code) {
  const params = {
    Text: text,
    LanguageCode: code, // Assuming the default language is English. You can also detect the language first and use it here.
  };
  const command = new DetectSentimentCommand(params);

  try {
    const response = await comprehendClient.send(command);
    return {
      sentiment: response.Sentiment, // This will be POSITIVE, NEGATIVE, NEUTRAL, or MIXED
      sentimentScore: response.SentimentScore, // Scores for each sentiment type
    };
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return null;
  }
}

app.post("/analyze-post", async (req, res) => {
  const { content } = req.body;

  try {
    const languageResult = await detectDominantLanguage(content);
    if (!languageResult)
      return res.status(500).json({ error: "Language detection failed" });

    const sentimentResult = await analyzeSentiment(
      content,
      languageResult.languageCode
    );
    if (!sentimentResult)
      return res.status(500).json({ error: "Sentiment analysis failed" });
    res.json({
      sentiment: sentimentResult.sentiment,
      sentimentScore: sentimentResult.sentimentScore,
      language: languageResult.languageCode,
      languageConfidence: languageResult.confidence,
    });
  } catch (error) {
    console.error("Error analyzing post:", error);
    res.status(500).json({ error: "Failed to analyze post" });
  }
});

app.get("/generate-speech/:id", async (req, res) => {
  try {
    console.log("hhelo");
    const postId = req.params.id;

    const post = await Post.findById(postId);

    if (!post) return res.status(404).json({ error: "Post not found" });

    const command = new SynthesizeSpeechCommand({
      OutputFormat: "mp3",
      Text: post.title,
      VoiceId: post.speaker || "Joanna",
    });

    const response = await pollyClient.send(command);
    res.setHeader("Content-Type", "audio/mpeg");
    response.AudioStream.pipe(res);
  } catch (error) {
    console.error("Error generating speech:", error);
    res.status(500).json({ error: "Failed to generate speech" });
  }
});

app.post("/face-recognition", async (req, res) => {
  const { image, username } = req.body;
  try {
    // Send image to AWS Rekognition for face verification against stored data
    const rekognitionResponse = await rekognitionClient.send(
      new SearchFacesByImageCommand({
        CollectionId: "attendace",
        Image: {
          Bytes: Buffer.from(
            image.replace(/^data:image\/\w+;base64,/, ""),
            "base64"
          ),
        },
      })
    );

    const isMatch = rekognitionResponse.FaceMatches.some(
      (match) => match.Similarity >= 90
    );
    res.json({ success: isMatch });
  } catch (error) {
    console.error("Error in face recognition:", error);
    res.status(500).json({ success: false });
  }
});

app.post("/register", async (req, res) => {
  const { email, username, password } = req.body;

  // Check if email, username, and password are provided
  if (!email || !username || !password) {
    return res
      .status(400)
      .json({ error: "Email, username, and password are required." });
  }

  console.log(email, username, password);

  try {
    const hashedPassword = bcrypt.hashSync(password, salt);
    const userDoc = await User.create({
      email,
      username,
      password: hashedPassword,
    });

    await sendRegistrationNotification(username, email);

    res.json(userDoc);
  } catch (e) {
    console.error("Error registering user:", e);
    res.status(400).json({ error: e.message });
  }
});

app.post("/login", async (req, res) => {
  const { username, password, captchaId, captchaValue } = req.body;
  const storedCaptcha = captchaStore[captchaId];
  console.log(username, password);

  if (!storedCaptcha || storedCaptcha !== captchaValue) {
    return res.status(400).json({ error: "Invalid CAPTCHA" });
  }

  try {
    console.log(username, password);
    const userDoc = await User.findOne({ username });
    if (userDoc && bcrypt.compareSync(password, userDoc.password)) {
      const token = jwt.sign({ username, id: userDoc._id }, secret, {
        expiresIn: "1h",
      });
      res.cookie("token", token, { httpOnly: true }).json({
        id: userDoc._id,
        username,
      });
    } else {
      res.status(400).json({ error: "Wrong credentials" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to login" });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token").json({ message: "Logged out successfully" });
});

app.post("/post", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  // Extract the URL of the uploaded file from S3
  const imageUrl = req.file.location; // This contains the public URL of the uploaded file
  console.log(imageUrl);
  // Extract token from cookies
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: "Token not provided" });
  }

  // Verify JWT token
  jwt.verify(token, secret, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token is invalid" });
    }

    let { title, summary, content } = req.body;

    try {
      // Create the post and store the S3 image URL in the 'cover' field

      const code = {
        en: "Joanna", // English
        fr: "Celine", // French
        es: "Conchita", // Spanish
        de: "Marlene", // German
        it: "Carla", // Italian
        pt: "Vitoria", // Portuguese
        ja: "Mizuki", // Japanese
        ko: "Seoyeon", // Korean
        hi: "Aditi", // Hindi
        nl: "Lotte", // Dutch
        sv: "Astrid", // Swedish
        da: "Naja", // Danish
        ru: "Tatyana", // Russian
        tr: "Filiz", // Turkish
        zh: "Zhiyu", // Chinese
        pl: "Ewa", // Polish
        nb: "Liv", // Norwegian
        ar: "Zeina", // Arabic
      };

      const piiParams = {
        Text: content,
        LanguageCode: "en",
      };

      const piiCommand = new DetectPiiEntitiesCommand(piiParams);
      const piiResult = await comprehendClient.send(piiCommand);

      piiResult.Entities.forEach((entity) => {
        const start = entity.BeginOffset;
        const end = entity.EndOffset;
        content = content.slice(0, start) + "xxxxxx" + content.slice(end);
      });

      const languageResult = await detectDominantLanguage(content);

      const postDoc = await Post.create({
        title,
        summary,
        content,
        speaker: code[languageResult.languageCode],
        cover: imageUrl, // Store the S3 image URL in the 'cover' field
        author: decoded.id,
      });

      res.json(postDoc);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  });
});

app.put("/post/:id", uploadMiddleware.single("file"), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path: filePath } = req.file;
    const ext = path.extname(originalname);
    newPath = filePath + ext;
    fs.renameSync(filePath, newPath);
  }

  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Token not provided" });
  }

  jwt.verify(token, secret, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token is invalid" });
    }

    const { title, summary, content } = req.body;
    try {
      const postDoc = await Post.findById(req.params.id);
      if (!postDoc) {
        return res.status(404).json({ error: "Post not found" });
      }
      if (String(postDoc.author) !== String(decoded.id)) {
        return res.status(400).json({ error: "You are not the author" });
      }
      postDoc.title = title;
      postDoc.summary = summary;
      postDoc.content = content;
      postDoc.cover = newPath || postDoc.cover;
      await postDoc.save();
      res.json(postDoc);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  });
});

app.get("/translate-post/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    const targetLanguage = req.query.targetLanguage;

    console.log("THIS IS", targetLanguage);

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const params = {
      Text: post.content,
      SourceLanguageCode: "auto",
      TargetLanguageCode: targetLanguage,
    };

    const translateCommand = new TranslateTextCommand(params);
    const translateResult = await translateClient.send(translateCommand);

    res.json({
      originalText: post.content,
      translatedText: translateResult.TranslatedText,
      targetLanguage: targetLanguage,
    });
  } catch (error) {
    console.error("Error translating text:", error);
    res.status(500).json({ error: "Failed to translate text" });
  }
});

app.delete("/post/:id", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Token not provided" });
  }

  jwt.verify(token, secret, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token is invalid" });
    }

    try {
      const postDoc = await Post.findById(req.params.id);
      if (!postDoc) {
        return res.status(404).json({ error: "Post not found" });
      }
      if (String(postDoc.author) !== String(decoded.id)) {
        return res.status(400).json({ error: "You are not the author" });
      }

      const s3Url = postDoc.cover;
      const s3key = s3Url.split("/").pop();

      const deleteParams = {
        Bucket: process.env.s3_BUCKET_NAME,
        Key: s3key,
      };

      const lambdaParams = {
        FunctionName: "MyLambda",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({
          body: {
            bucketName: process.env.S3_BUCKET_NAME,
            objectKey: s3key,
          },
        }),
      };

      try {
        const lambdaResponse = await lambda.invoke(lambdaParams).promise();
        console.log(lambdaResponse);
        const responsePayload = JSON.parse(lambdaResponse);
        // console.log("Lambda response:", resp);
        if (responsePayload.statusCode !== 200) {
          throw new Error(responsePayload.message);
        }
      } catch (err) {
        console.error("Error invoking Lambda:", err);
        return res
          .status(500)
          .json({ err: "Failed to delete image via Lambda" });
      }
      // try {
      //   const data = await s3.send(new DeleteObjectCommand(deleteParams));
      //   console.log("S3 deletd repsonse ", data);
      // } catch (err) {
      //   console.log("Eror deleting image form s3", err);

      //   return res
      //     .status(500)
      //     .json({ error: "failed to delete image form s3" });
      // }

      await postDoc.deleteOne();
      res.json({ message: "Post deleted successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });
});

app.get("/post", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(posts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.get("/post/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("author", [
      "username",
    ]);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const languageResult = await detectDominantLanguage(post.content);
    const sentimentResult = await analyzeSentiment(
      post.content,
      languageResult.languageCode
    );

    const maxSentiment = Object.entries(sentimentResult.sentimentScore).reduce(
      (max, [key, value]) => (value > max.value ? [key, value] : max),
      { key: null, value: -Infinity }
    );
    console.log(maxSentiment);
    console.log(post._id);

    res.json({
      post,
      sentiment: maxSentiment[0],
      sentimentScore: maxSentiment[1],
      language: languageResult.languageCode,
      languageConfidence: languageResult.confidence,
    });
  } catch (e) {
    console.error(e);
    res.status(404).json({ error: "Post not found" });
  }
});

app.get("/search", async (req, res) => {
  const { title } = req.query;
  try {
    const posts = await Post.find({ title: { $regex: title, $options: "i" } })
      .populate("author", ["username"])
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to search posts" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
