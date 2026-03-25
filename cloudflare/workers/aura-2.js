export default {
  async fetch(request, env) {
    const API_KEY = env.API_KEY;
    const auth = request.headers.get("Authorization");

    if (auth !== `Bearer ${API_KEY}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    try {
      const body = await request.json();
      
      if (!body.text || typeof body.text !== "string") {
        return json({ error: "Parameter 'text' wajib diisi dan harus berupa string" }, 400);
      }

      const inputs = {
        text: body.text,
      };

      if (body.speaker) inputs.speaker = body.speaker;
      if (body.encoding) inputs.encoding = body.encoding;
      if (body.container) inputs.container = body.container;
      if (body.sample_rate) inputs.sample_rate = body.sample_rate;
      if (body.bit_rate) inputs.bit_rate = body.bit_rate;

      const audioStream = await env.Lumine.run("@cf/deepgram/aura-2-en", inputs);

      let contentType = "audio/mpeg"; 
      if (inputs.encoding === "linear16" || inputs.container === "wav") contentType = "audio/wav";
      if (inputs.container === "ogg") contentType = "audio/ogg";
      if (inputs.encoding === "aac") contentType = "audio/aac";

      return new Response(audioStream, {
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*"
        },
      });

    } catch (error) {
      return json({ 
        error: "Internal Server Error", 
        details: error.message 
      }, 500);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}