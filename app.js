import "dotenv/config";
import Fastify from "fastify";
import { connectDB } from "./src/config/connect.js";
import { PORT } from "./src/config/config.js";
import { admin, buildAdminRouter } from "./src/config/setup.js";
import { registerRoutes } from "./src/routes/index.js";
import fastifySocketIO from "fastify-socket.io";
const start = async()=>{
    await connectDB(process.env.MONGO_URI)
    const app = Fastify();

    const corsOptions = {
        origin: process.env.NODE_ENV === 'production' 
            ? ["*"]  // In production, this will allow connections from your React Native app
            : ["*"],  // In development, allow all connections
        methods: ["GET", "POST"],
        credentials: true
    };
    
    app.register(fastifySocketIO, {
        cors: corsOptions,
        pingInterval: 10000,
        pingTimeout: 5000,
        transports: ['websocket', 'polling']
    });
    await registerRoutes(app); 

    await buildAdminRouter(app);

    try {
        await app.listen({ 
            port: PORT, 
            host: "0.0.0.0"  // Required to accept all incoming connections
        });
        console.log(`Server running on port ${port}`);
        console.log(`Admin panel at ${admin.options.rootPath}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }

    app.ready().then(()=>{
        app.io.on("connection",(socket)=>{
            console.log("A User Connected")

            socket.on("joinRoom",(orderId)=>{
                socket.join(orderId);
                console.log(`🟢 User Joined room ${orderId}`)
            })

            socket.on('disconnect',()=>{
                console.log("User Disconnected ❌")
            })

        })
    })
};

start();
