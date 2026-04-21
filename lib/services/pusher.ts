import PusherServer from 'pusher';

const requiredEnvVars = {
  PUSHER_APP_ID: process.env.PUSHER_APP_ID,
  NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
  PUSHER_SECRET: process.env.PUSHER_SECRET,
  NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value || value === 'your_pusher_app_key_here')
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.warn(`Pusher: Missing env vars: ${missingEnvVars.join(', ')}. Real-time features disabled.`);
}

export const pusher = missingEnvVars.length > 0 ? null : new PusherServer({
  appId: requiredEnvVars.PUSHER_APP_ID!,
  key: requiredEnvVars.NEXT_PUBLIC_PUSHER_KEY!,
  secret: requiredEnvVars.PUSHER_SECRET!,
  cluster: requiredEnvVars.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});
