const axios = require('axios');

module.exports = async (req, res) => {
  // Add CORS headers for safety
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ reply: "Method Not Allowed" });
  }

  try {
    const { message } = req.body;
    const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
    const INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

    if (!NVIDIA_API_KEY) {
      return res.status(500).json({ reply: "NVIDIA API Key is missing in environment variables!" });
    }

    const payload = {
      model: "minimaxai/minimax-m3",
      messages: [
        {
          role: "system",
          content: "You are NexBot, a smart AI assistant built by Poovarasu S for CodeAlpha AI Internship 2026. Answer all questions clearly, helpfully, and concisely."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 8192,
      temperature: 1.00,
      top_p: 0.95,
      stream: false
    };

    const headers = {
      "Authorization": `Bearer ${NVIDIA_API_KEY}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    };

    const response = await axios.post(INVOKE_URL, payload, { headers });
    const reply = response.data.choices[0].message.content;
    res.json({ reply });

  } catch (error) {
    if (error.response) {
      console.error(`HTTP ${error.response.status}`, error.response.data);
    } else {
      console.error(error.message);
    }
    res.status(500).json({ reply: "Sorry, I'm having trouble connecting to the AI. Please try again!" });
  }
};
