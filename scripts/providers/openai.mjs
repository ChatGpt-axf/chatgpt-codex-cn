export async function generateDraftWithOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured.');
  throw new Error('The OpenAI generation adapter is reserved for phase two. Use content:create --plan=... to create a reviewed draft.');
}
