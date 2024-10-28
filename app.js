// app.js
import "dotenv/config";
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import fastifySocketIO from "fastify-socket.io";
import { connectDB } from "./src/config/connect.js";
import { PORT, sessionConfig } from "./src/config/config.js";
import { admin, buildAdminRouter } from "./src/config/setup.js";
import { registerRoutes } from "./src/routes/index.js";

const start = async () => {
    try {
        // Connect to database first
        await connectDB(process.env.MONGO_URI);

        const app = Fastify({
            logger: true,
            trustProxy: process.env.NODE_ENV === 'production' // Important for secure cookies behind proxy
        });

        // CORS configuration
        const corsOptions = {
            origin: process.env.NODE_ENV === 'production'
                ? [process.env.FRONTEND_URL || "*"]
                : ["*"],
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            credentials: true,
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        };

        // Register required plugins in correct order
        await app.register(fastifyCors, corsOptions);
        await app.register(fastifyCookie);
        await app.register(fastifySession, sessionConfig);
        
        // Register socket.io with session support
        await app.register(fastifySocketIO, {
            cors: corsOptions,
            pingInterval: 10000,
            pingTimeout: 5000,
            transports: ['websocket', 'polling'],
            // Add session middleware to socket.io
            wrapper: (ws) => {
                ws.use((socket, next) => {
                    app.session(socket.request, socket.request.res || {}, next);
                });
            }
        });

        // Register routes before admin router
        await registerRoutes(app);
        
        // Register admin router
        await buildAdminRouter(app);

        // Socket.io setup with error handling
        app.ready().then(() => {
            app.io.on("connection", (socket) => {
                console.log("🔌 New connection:", socket.id);

                socket.on("joinRoom", (orderId) => {
                    try {
                        socket.join(orderId);
                        console.log(`🟢 User ${socket.id} joined room ${orderId}`);
                        
                        // Acknowledge join
                        socket.emit('roomJoined', { orderId, success: true });
                    } catch (error) {
                        console.error(`Error joining room ${orderId}:`, error);
                        socket.emit('error', { message: 'Failed to join room' });
                    }
                });

                socket.on('disconnect', (reason) => {
                    console.log(`❌ User ${socket.id} disconnected:`, reason);
                });

                socket.on('error', (error) => {
                    console.error('Socket error:', error);
                });
            });

            app.io.on('connect_error', (error) => {
                console.error('Socket.IO connection error:', error);
            });
        });

        // Error handler for Fastify
        app.setErrorHandler((error, request, reply) => {
            console.error('Server error:', error);
            reply.status(error.statusCode || 500).send({
                error: error.message || 'Internal Server Error'
            });
        });

        // Start server
        const host = "0.0.0.0";
        await app.listen({ port: PORT, host });
        
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`⚡ Admin panel at ${admin.options.rootPath}`);
        console.log(`🔒 Running in ${process.env.NODE_ENV || 'development'} mode`);
        
    } catch (err) {
        console.error('💥 Server startup error:', err);
        process.exit(1);
    }
};

// Global error handlers with more context
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', {
        promise,
        reason,
        timestamp: new Date().toISOString()
    });
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', {
        error,
        timestamp: new Date().toISOString(),
        stack: error.stack
    });
    // Give time for logging before exit
    setTimeout(() => process.exit(1), 1000);
});

start();