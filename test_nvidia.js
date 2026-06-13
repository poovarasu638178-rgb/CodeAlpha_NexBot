require('dotenv').config();
const fetch = require('node-fetch');
async function test() {
  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: [{role: "user", content: "hi"}]
      })
    });
  const text = await response.text();
  console.log("Status:", response.status);
  console.log("Body:", text);
}
test();
