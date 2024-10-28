import AdminJS, { SESSION_INITIALIZE } from "adminjs";
import AdminJSFastify from "@adminjs/fastify";
import * as AdminJSMongoose from "@adminjs/mongoose";
import * as Models from "../models/index.js";
import { authenticate, COOKIE_PASSWORD, sessionStore } from "./config.js";
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
  // Set session configuration
  const sessionConfig = {
    store: sessionStore,
    saveUninitialized: true,
    secret: COOKIE_PASSWORD,
    resave: false,
    cookie: {
      httpOnly: process.env.NODE_ENV === 'production',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',  // Add this
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    name: 'adminjs'
  };

  // Authentication configuration
  const authConfig = process.env.NODE_ENV === 'production' ? {
    authenticate,
    cookiePassword: COOKIE_PASSWORD,
    cookieName: "adminjs",
    // maxRetries: 3,  // Add retry limit
    session: sessionConfig  // Pass session config directly
  } : false;

  // Add session handling middleware
  app.register(import('@fastify/session'), sessionConfig);
  app.register(import('@fastify/cookie'));

  // Build the AdminJS router with modified config
  await AdminJSFastify.buildRouter(
    admin,
    authConfig,
    app
  );

  // Add error handling
  app.setErrorHandler((error, request, reply) => {
    console.error('AdminJS Error:', error);
    reply.status(500).send({ error: 'Internal Server Error' });
  });
};