import "dotenv/config";
import Fastify from "fastify";
import { connectDB } from "./src/config/connect.js";
import { PORT } from "./src/config/config.js";
import { admin, buildAdminRouter } from "./src/config/setup.js";
import { registerRoutes } from "./src/routes/index.js";
import fastifySocketIO from "fastify-socket.io";

const start = async () => {
    try {
        // Connect to database first
        await connectDB(process.env.MONGO_URI);

        const app = Fastify({
            logger: true // Enable logging for better debugging
        });

        // CORS configuration
        const corsOptions = {
            origin: process.env.NODE_ENV === 'production'
                ? [process.env.FRONTEND_URL || "*"] // Better to specify exact domain in production
                : ["*"],
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Include all methods you need
            credentials: true
        };

        // Register socket.io before other routes
        await app.register(fastifySocketIO, {
            cors: corsOptions,
            pingInterval: 10000,
            pingTimeout: 5000,
            transports: ['websocket', 'polling']
        });

        // Register routes and admin
        await registerRoutes(app);
        await buildAdminRouter(app);

        // Socket.io setup
        app.ready().then(() => {
            app.io.on("connection", (socket) => {
                console.log("A User Connected", socket.id);
                
                socket.on("joinRoom", (orderId) => {
                    socket.join(orderId);
                    console.log(`🟢 User ${socket.id} Joined room ${orderId}`);
                });
                
                socket.on('disconnect', () => {
                    console.log(`User ${socket.id} Disconnected ❌`);
                });
            });
        });

        // Start server
        const host = "0.0.0.0";
        await app.listen({ port: PORT, host });
        console.log(`Server running on port ${PORT}`);
        console.log(`Admin panel at ${admin.options.rootPath}`);

    } catch (err) {
        console.error('Server startup error:', err);
        process.exit(1);
    }
};

// Add global error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

start();