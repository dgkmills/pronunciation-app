const functions = require("firebase-functions");
const https = require("https/on-request");
const axios = require("axios");

// This function acts as a secure proxy to the Gemini API.
// Your front-end will call this function instead of calling Google directly.
exports.callGeminiApi = https.onRequest(async (req, res) => {
  // Set CORS headers to allow requests from your web app
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // Pre-flight request; reply successfully.
    res.status(204).send("");
    return;
  }

  // 1. Get the API key securely from environment variables.
  // We will set this variable in the Firebase environment, not in the code.
  const apiKey = functions.config().gemini.key;
  if (!apiKey) {
    console.error("Gemini API key not configured.");
    res.status(500).send({ error: "Server configuration error." });
    return;
  }

  // 2. Validate the incoming request from the client.
  const { systemPrompt, userQuery } = req.body;
  if (!systemPrompt || !userQuery) {
    res.status(400).send({ error: "Missing 'systemPrompt' or 'userQuery' in the request body." });
    return;
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  try {
    // 3. Forward the request to the actual Gemini API.
    const geminiResponse = await axios.post(apiUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });

    // 4. Send the Gemini API's response back to the client.
    res.status(200).send(geminiResponse.data);
  } catch (error) {
    console.error("Error calling Gemini API:", error.response ? error.response.data : error.message);
    res.status(error.response ? error.response.status : 500).send({
      error: "Failed to call the Gemini API.",
      details: error.response ? error.response.data : "Unknown error",
    });
  }
});
