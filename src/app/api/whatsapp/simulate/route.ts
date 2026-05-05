import { NextRequest } from 'next/server';

// Simulate a WhatsApp message for testing (calls the real bot logic)
export async function POST(request: NextRequest) {
  const { phone, text, name } = await request.json();

  if (!phone || !text) {
    return Response.json({ error: 'Missing phone or text' }, { status: 400 });
  }

  // Call our own webhook with simulated Green API format
  const baseUrl = request.nextUrl.origin;
  const simulatedBody = {
    messageData: {
      typeMessage: 'textMessage',
      textMessageData: { textMessage: text },
    },
    senderData: {
      chatId: `${phone.replace(/\D/g, '')}@c.us`,
      senderName: name || 'Test User',
    },
  };

  // Temporarily override GREEN_API env to capture the response instead of sending
  const res = await fetch(`${baseUrl}/api/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(simulatedBody),
  });

  return Response.json({ ok: true, webhook_response: await res.json() });
}
