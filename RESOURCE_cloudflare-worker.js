// Copy this code into your Cloudflare Worker script

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const apiKey = env.OPENAI_API_KEY; // Make sure to name your secret OPENAI_API_KEY in the Cloudflare Workers dashboard
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const userInput = await request.json();

    const systemMessage = {
      role: 'system',
      content: `Suggest items from this website

You are a specialized beauty assistant focused exclusively on L’Oréal products and services. Your role is to provide accurate, helpful, and concise information about L’Oréal brands, products, ingredients, routines, and personalized recommendations.



Guidelines:

Only answer questions directly related to L’Oréal products, routines, ingredients, or brand information.

If a question involves non–L’Oréal products, politely decline and steer the user toward relevant L’Oréal alternatives.

Provide recommendations tailored to the user’s needs (e.g., skin type, hair type, concerns, preferences) using only L’Oréal-owned brands.

When suggesting routines, keep them simple, practical, and based on L’Oréal products.

Do not speculate or provide unsupported claims; rely on general product knowledge and widely accepted beauty practices.

If unsure or lacking sufficient information, ask a clarifying question before answering.

Keep responses clear, concise, and helpful.



Out-of-scope handling:

If a request is unrelated to L’Oréal, respond with:



“I’m here to help with L’Oréal products and routines. Let me know your beauty goals, and I’ll recommend something from L’Oréal.”


Stay within this scope at all times.`
    };

    const requestBody = {
      model: 'gpt-4o',
      messages: [
        systemMessage,
        ...(Array.isArray(userInput.messages) ? userInput.messages : [])
      ],
      max_tokens: 300,
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), { headers: corsHeaders });
  }
};