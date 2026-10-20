import jwt from "jsonwebtoken";

const FIREBASE_PROJECT_ID = "mohallamitr-13ea4";
const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (Date.now() < certsExpiresAt && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }

  const res = await fetch(GOOGLE_CERTS_URL);
  const cacheControl = res.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
  certsExpiresAt = Date.now() + maxAge * 1000;

  cachedCerts = (await res.json()) as Record<string, string>;
  return cachedCerts;
}

export interface FirebaseTokenPayload {
  uid: string;
  phone_number?: string;
  email?: string;
  iss: string;
  aud: string;
  sub: string;
}

export async function verifyFirebaseToken(
  idToken: string
): Promise<FirebaseTokenPayload> {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded === "string") {
    throw new Error("Invalid token format");
  }

  const kid = decoded.header.kid;
  if (!kid) throw new Error("Token missing kid header");

  const certs = await getGoogleCerts();
  const cert = certs[kid];
  if (!cert) throw new Error("No matching certificate for token kid");

  const payload = jwt.verify(idToken, cert, {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    audience: FIREBASE_PROJECT_ID,
  }) as FirebaseTokenPayload;

  payload.uid = payload.sub;
  return payload;
}
