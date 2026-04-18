# Project 9: L'Oréal Routine Builder

L’Oréal is expanding what’s possible with AI, and now your chatbot is getting smarter. This week, you’ll upgrade it into a product-aware routine builder.

Users will be able to browse real L’Oréal brand products, select the ones they want, and generate a personalized routine using AI. They can also ask follow-up questions about their routine—just like chatting with a real advisor.

## Cloudflare Worker Setup

The browser app now sends chat requests to a Cloudflare Worker instead of using `secrets.js`.

1. Put your OpenAI API key in the Cloudflare Workers dashboard as `OPENAI_API_KEY`.
2. Deploy the code from `RESOURCE_cloudflare-worker.js` as your worker.
3. Replace the `OPENAI_WORKER_URL` value in `script.js` with your worker URL.
