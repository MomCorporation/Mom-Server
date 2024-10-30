import "dotenv/config";
import Fastify from "fastify";
import { connectDB } from "./src/config/connect.js";
import { PORT } from "./src/config/config.js";
import { admin, buildAdminRouter } from "./src/config/setup.js";
import { registerRoutes } from "./src/routes/index.js";
import fastifySocketIO from "fastify-socket.io";

const start = async () => {
  await connectDB(process.env.MONGO_URI);
  const app = Fastify();

  // Configure CORS for production
  app.register(fastifySocketIO, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ["https://your-frontend-domain.com"] // Replace with your frontend domain
        : "*",
      credentials: true
    },
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ["websocket"]
  });

  await registerRoutes(app);
  await buildAdminRouter(app);

  // Modified listen configuration for production
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
  
  try {
    await app.listen({ 
      port: PORT, 
      host: host 
    });
    console.log(
      `Server running on ${process.env.NODE_ENV === 'production' ? 'Render' : 'http://localhost'}:${PORT}${admin.options.rootPath}`
    );
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }

  app.ready().then(() => {
    app.io.on("connection", (socket) => {
      console.log("A User Connected ✅");
      socket.on("joinRoom", (orderId) => {
        socket.join(orderId);
        console.log(` 🔴 User Joined room ${orderId}`);
      });
      socket.on("disconnect", () => {
        console.log("User Disconnected ❌");
      });
    });
  });
};

start();