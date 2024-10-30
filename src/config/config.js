import "dotenv/config";
import fastifySession from "@fastify/session";
import ConnectMongoDBSession from "connect-mongodb-session";

const MongoDBStore = ConnectMongoDBSession(fastifySession);

export const sessionStore = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: "sessions",
  expires: 1000 * 60 * 60 * 24, // 24 hours
  connectionOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
});

sessionStore.on("error", function(error) {
  console.log("Session Store Error:", error);
});

export const authenticate = async (email, password) => {
  console.log("Login attempt:", { email, password }); // Debug log
  if (email === "admin@gmail.com" && password === "12345678") {
    return Promise.resolve({ email, password });
  }
  return null;
};

export const PORT = process.env.PORT || 3000;
export const COOKIE_PASSWORD = process.env.COOKIE_PASSWORD;