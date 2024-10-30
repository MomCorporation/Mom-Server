import "dotenv/config";
import Fastify from "fastify";
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import { connectDB } from "./src/config/connect.js";
import { PORT } from "./src/config/config.js";
import { admin, buildAdminRouter } from "./src/config/setup.js";
import { registerRoutes } from "./src/routes/index.js";
import fastifySocketIO from "fastify-socket.io";

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    const app = Fastify({
      logger: true,
      maxParamLength: 5000,
    });

    // Register cookie plugin
    await app.register(fastifyCookie);

    // Register CORS
    await app.register(cors, {
      origin: true,
      credentials: true,
      methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    });

    // Add debug route
    app.get('/', async (request, reply) => {
      return { status: 'ok', message: 'Server is running' };
    });

    // Register Socket.IO
    app.register(fastifySocketIO, {
      cors: {
        origin: "*",
        credentials: true
      },
      pingInterval: 10000,
      pingTimeout: 5000,
      transports: ["websocket"],
    });

    // Register routes
    await registerRoutes(app);

    // Register AdminJS
    await buildAdminRouter(app);

    const host = '0.0.0.0';
    const port = process.env.PORT || PORT;

    await app.listen({ 
      port, 
      host
    });

    console.log(
      `Server running on ${process.env.NODE_ENV === 'production' 
        ? `https://${process.env.RENDER_EXTERNAL_URL || 'https://mom-server.onrender.com'}`
        : 'http://localhost'
      }:${port}${admin.options.rootPath}`
    );

    // Socket.IO setup
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

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

start();