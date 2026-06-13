const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const NVIDIA_API_KEY = "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";
const INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

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
    res.status(500).json({ reply: "Sorry, I'm having trouble right now. Please try again!" });
  }
});

app.listen(3000, () => {
  console.log('✅ NexBot server running on http://localhost:3000');
  console.log('   Model: minimaxai/minimax-m3 via NVIDIA NIM');
});
