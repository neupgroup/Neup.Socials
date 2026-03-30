import { acknowledgeWebhookPost, verifyWebhookRequest } from '../_helpers';

const ENDPOINT = '/bridge/webhook.v1/facebook.application';
const VERIFY_TOKEN_ENV = 'FACEBOOK_APPLICATION_VERIFY_TOKEN';

export async function GET(request: Request) {
  return verifyWebhookRequest(request, VERIFY_TOKEN_ENV, ENDPOINT);
}

export async function POST(request: Request) {
  return acknowledgeWebhookPost(request, ENDPOINT);
}
