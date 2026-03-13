import mongoose from "mongoose";

/**
 * Build a valid MongoDB URI with credentials that are safe for any password
 * (special chars like @ # : are encoded so the URI parses correctly).
 */
function buildMongoUri(baseUri: string, user: string, pass: string): string {
  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(pass);
  return baseUri.replace(/^(mongodb(\+srv)?:\/\/)/, `$1${encodedUser}:${encodedPass}@`);
}

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    console.error("MONGODB_URI is required in .env");
    process.exit(1);
  }

  const user = process.env.MONGODB_USER?.trim();
  const pass = process.env.MONGODB_PASSWORD?.trim();

  let uri: string;

  if (user && pass) {
    let baseUri = mongoUri;
    if (baseUri.includes("@")) {
      baseUri = baseUri.replace(/^mongodb(\+srv)?:\/\/[^:]+:[^@]+@/, "mongodb$1://");
    }
    uri = buildMongoUri(baseUri, user, pass);
  } else if (mongoUri.includes(":") && mongoUri.includes("@")) {
    uri = mongoUri;
  } else {
    console.error("Set MONGODB_USER and MONGODB_PASSWORD in .env, or use full MONGODB_URI with user:password@...");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 50,
      minPoolSize: 5,
    });
    console.log("MongoDB connected");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("MongoDB connection failed:", msg);
    process.exit(1);
  }
}
