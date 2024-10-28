// setup.js
import Fastify from 'fastify';
import AdminJS from 'adminjs';
import AdminJSFastify from '@adminjs/fastify';
import * as AdminJSMongoose from '@adminjs/mongoose';
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';
import * as Models from "../models/index.js";
import { authenticate, COOKIE_PASSWORD, sessionStore, sessionConfig } from "./config.js";
import { dark, light, noSidebar } from "@adminjs/themes";

AdminJS.registerAdapter(AdminJSMongoose);

export const admin = new AdminJS({
  resources: [
    {
      resource: Models.Customer,
      options: {
        listProperties: ["phone", "role", "isActivated"],
        filterProperties: ["phone", "role"],
      },
    },
    {
      resource: Models.DeliveryPartner,
      options: {
        listProperties: ["email", "role", "isActivated"],
        filterProperties: ["email", "role"],
      },
    },
    {
      resource: Models.Admin,
      options: {
        listProperties: ["email", "role", "isActivated"],
        filterProperties: ["email", "role"],
      },
    },
    {
      resource: Models.Branch,
    },
    {
      resource: Models.Category,
    },
    {
      resource: Models.Product,
    },
    {
      resource: Models.Order,
    },
    {
      resource: Models.Counter,
    },
  ],
  branding: {
    companyName: "Mom Corporation",
    withMadeWithLove: false,
  },
  defaultTheme: dark.id,
  availableThemes: [dark, light, noSidebar],
  rootPath: "/admin",
  env: {
    isProduction: process.env.NODE_ENV === 'production',
  }
});

export const buildAdminRouter = async (app) => {
  try {
    // Ensure app is a Fastify instance
    if (!app || typeof app.register !== 'function') {
      app = Fastify({ 
        logger: true,
        trustProxy: process.env.NODE_ENV === 'production'
      });
    }

    // Register required plugins
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: COOKIE_PASSWORD,
      store: sessionStore,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    });

    // Authentication configuration
    const adminRouter = await AdminJSFastify.buildRouter(admin, {
      authenticate,
      cookiePassword: COOKIE_PASSWORD,
      cookieName: 'adminjs',
    }, app);

    // Add error handling
    app.setErrorHandler((error, request, reply) => {
      console.error('AdminJS Error:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    });

    return adminRouter;
  } catch (error) {
    console.error('Error building admin router:', error);
    throw error;
  }
};