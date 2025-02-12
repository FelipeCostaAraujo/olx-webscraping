import { GoogleAuth } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];

/**
 * Gera um token de acesso utilizando as credenciais da conta de serviço.
 * O arquivo de credenciais "olx-webscraping.json" deve estar na raiz do projeto.
 */
export async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    keyFile: 'olx-webscraping.json',
    scopes: SCOPES,
  });

  const client = await auth.getClient();
  const accessTokenResponse = await client.getAccessToken();
  if (!accessTokenResponse.token) {
    throw new Error('Não foi possível obter o token de acesso');
  }
  return accessTokenResponse.token;
}
