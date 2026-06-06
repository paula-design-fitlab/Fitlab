exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const prompt = body.messages[0].content;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            maxOutputTokens: body.max_tokens || 1000,
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();
    console.log("Gemini response status:", response.status);
    console.log("Gemini data:", JSON.stringify(data).substring(0, 500));

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Gemini API error: " + JSON.stringify(data) })
      };
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Extracted text:", text.substring(0, 300));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        content: [{ type: "text", text }]
      })
    };
  } catch (err) {
    console.error("Function error:", err.message);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
