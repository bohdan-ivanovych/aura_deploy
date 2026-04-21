import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text') || 'No message provided';
    const persona = searchParams.get('persona') || 'AI Assistant';
    const weakness = searchParams.get('weakness');
    const messagesParam = searchParams.get('messages');
    
    let messages = [];
    if (messagesParam) {
      try {
        messages = JSON.parse(messagesParam);
      } catch (e) {
        console.error('Failed to parse messages:', e);
      }
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#0f0c29',
            backgroundImage: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
            padding: '40px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: 'white',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '30px',
            }}
          >
            <span
              style={{
                fontSize: '20px',
                fontWeight: '900',
                color: 'rgba(255, 255, 255, 0.9)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '6px',
                display: 'block',
              }}
            >
              {persona}
            </span>
            <span
              style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.6)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'block',
              }}
            >
              Neural Language Training System
            </span>
          </div>

          {/* Chat Conversation */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              flex: 1,
              maxWidth: '900px',
            }}
          >
            {/* Show conversation if available, otherwise show single message */}
            {messages.length > 0 ? (
              <>
                {messages.map((msg: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: msg.sender === 'user' 
                          ? 'rgba(6, 182, 212, 0.2)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        border: msg.sender === 'user'
                          ? '1px solid rgba(6, 182, 212, 0.3)'
                          : '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        padding: '16px 20px',
                        maxWidth: '80%',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '16px',
                          color: 'rgba(255, 255, 255, 0.95)',
                          lineHeight: '1.4',
                          display: 'block',
                        }}
                      >
                        {msg.text}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'rgba(255, 255, 255, 0.4)',
                        marginTop: '4px',
                        marginRight: '8px',
                        display: 'block',
                      }}
                    >
                      {msg.sender === 'user' ? 'You' : persona}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              // Single message fallback
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '20px',
                    padding: '24px 28px',
                    backdropFilter: 'blur(10px)',
                    maxWidth: '90%',
                  }}
                >
                  <span
                    style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: 'rgba(255, 255, 255, 0.95)',
                      lineHeight: '1.4',
                      textShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
                      display: 'block',
                    }}
                  >
                    {text}
                  </span>
                </div>
              </div>
            )}

            {/* Weakness Badge */}
            {weakness && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginTop: '24px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 0, 255, 0.2)',
                    border: '2px solid rgba(255, 0, 255, 0.6)',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    boxShadow: '0 0 20px rgba(255, 0, 255, 0.4)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Grammar Focus
                  </span>
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#ff00ff',
                      textShadow: '0 0 10px rgba(255, 0, 255, 0.8)',
                      display: 'block',
                    }}
                  >
                    {weakness}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: '30px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: '600',
                display: 'block',
              }}
            >
              Generated by Aura OS
            </span>
            <span
              style={{
                fontSize: '10px',
                color: 'rgba(0, 255, 255, 0.6)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                marginTop: '4px',
                display: 'block',
              }}
            >
              Neural Language Training System
            </span>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1920,
      },
    );
  } catch (error: any) {
    return new Response(`Failed to generate image: ${error.message}`, {
      status: 500,
    });
  }
}
