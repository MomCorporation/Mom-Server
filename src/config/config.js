import 'dotenv/config';
import fastifySession from '@fastify/session';
import ConnectMongoDBSession from 'connect-mongodb-session';
import { Admin } from "../models/index.js";

const MongoDBStore = ConnectMongoDBSession(fastifySession);

// Session store configuration
export const sessionStore = new MongoDBStore({
    uri: process.env.MONGO_URI,
    collection: 'sessions',
    expires: 1000 * 60 * 60 * 24 * 7, // 1 week
    connectionOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
});

sessionStore.on("error", (error) => {
    console.error("Session Store Error:", error);
});

// Authentication function
export const authenticate = async (email, password) => {
    try {
        if (!email || !password) {
            return null;
        }

        const user = await Admin.findOne({ email });
        if (!user) {
            return null;
        }

        // If you're using plain text passwords (not recommended)
        if (user.password === password) {
            return { 
                email: user.email,
                role: user.role,
                id: user._id
            };
        }

        // If you're using hashed passwords (recommended)
        // const passwordMatch = await bcrypt.compare(password, user.password);
        // if (passwordMatch) {
        //     return { 
        //         email: user.email,
        //         role: user.role,
        //         id: user._id
        //     };
        // }

        return null;
    } catch (error) {
        console.error('Authentication error:', error);
        return null;
    }
};

// Configuration constants
export const PORT = process.env.PORT || 3000;
export const COOKIE_PASSWORD = process.env.COOKIE_PASSWORD || 'your-secure-cookie-password-min-32-chars';

// Session configuration
export const sessionConfig = {
    secret: COOKIE_PASSWORD,
    saveUninitialized: false,
    resave: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
};