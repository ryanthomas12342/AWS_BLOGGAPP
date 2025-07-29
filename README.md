cd into the client and server folders and do 
npm i to install the modules before running
# Lifestyle Blender Blog

For running locally:
Edit the .env file in the client and change the REACT_APP_SERVER_URL = http://localhost:4000
This project is a full stack blogging platform built with **React**, **Node.js**, and **MongoDB**.  
It integrates multiple AWS services to provide features such as image uploads, face recognition based login, text to speech, sentiment analysis and translation. The app also includes a sentimental-awareness chatbot built with AWS Lex, Comprehend and Lambda that is deployed through **Kommunicate**.

To run the server edit the environment variables and change the secret key and mongodburl if you want to run from your database
## Features

For vercel configuration change the environment variables accordingly
 Enter your mongodb and secret key in the .env file of the server
- User registration and login using JWT cookies.
- CAPTCHA and optional webcam based face verification during login.
- Upload post images directly to Amazon S3.
- Automatic detection of language, sentiment and personally identifiable information using Amazon Comprehend.
- Generate speech for post titles using Amazon Polly.
- Translate post content on demand with Amazon Translate.
- Sentiment awareness chatbot powered by AWS Lex, Comprehend and Lambda,
  deployed via **Kommunicate**, which lets users review whether a post is
  positive, negative or neutral.
- Email notification on new user registration via Amazon SES.
- Search posts by title and display reading time/word count.

## Project Structure

```
AWS_BLOGGAPP/
├── Server/    # Express API
└── client/    # React front‑end
```

The server exposes REST endpoints in `server.js` while the React app resides inside the `client` folder.

## Setup

1. **Install dependencies**
   ```bash
   cd Server && npm install
   cd ../client && npm install
   ```
2. **Environment variables**
   - `Server/.env`
     ```ini
     MONGODB_URI=<mongodb connection string>
     SECRET=<jwt secret>
     AWS_ACCESS_KEY_ID=<your aws key>
     AWS_SECRET_ACCESS_KEY=<your aws secret>
     AWS_REGION=<aws region>
     S3_BUCKET_NAME=<s3 bucket name>
     SES_VERIFIED_EMAIL=<verified SES email>
     PORT=4000
     ```
   - `client/.env`
     ```ini
     REACT_APP_SERVER_URL=http://localhost:4000
     REACT_APP_BOT_ID=<kommunicate bot id> # used for the Kommunicate chatbot
     REGISTER=http://localhost:4000/register
     ```
3. **Run in development**
   ```bash
   # start the API
   cd Server
   npm run dev

   # in another terminal start the React app
   cd ../client
   npm start
   ```

The React app will be available at `http://localhost:3000` and will proxy API requests to the server running on port `4000`.

## Deploying

The repository includes a `vercel.json` file for deployment to Vercel.  
Set the same environment variables on Vercel before deploying.

## License

MIT
