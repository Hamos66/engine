import fastify, { FastifyInstance } from "fastify";
import fastifyExpress from "@fastify/express";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import * as fs from "fs";
import fastifyCors from "@fastify/cors";
import { openapi } from "./helpers";
import { errorHandler, getEnv, envVariablesCheck } from "../core";
import { apiRoutes } from "./api";
import {
  checkTablesExistence,
  implementTriggerOnStartUp,
  getLogSettings,
} from "../core";

const main = async () => {
  const logOptions = getLogSettings("API-Server");

  const server: FastifyInstance = fastify({
    logger: logOptions ?? true,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  server.addHook("preHandler", function (request, reply, done) {
    if (
      !request.routerPath?.includes("static") &&
      !request.routerPath?.includes("json")
    ) {
      if (request.body && Object.keys(request.body).length > 0) {
        request.log.info({ ...request.body }, "Request Body : ");
      }

      if (request.params && Object.keys(request.params).length > 0) {
        request.log.info({ ...request.params }, "Request Params : ");
      }

      if (request.query && Object.keys(request.query).length > 0) {
        request.log.info({ ...request.query }, "Request Querystring : ");
      }
    }

    done();
  });

  server.addHook("onRequest", (request, reply, done) => {
    if (
      !request.routerPath?.includes("static") &&
      !request.routerPath?.includes("json")
    ) {
      request.log.info(
        `Request received - ${request.method} - ${request.routerPath}`,
      );
    }
    done();
  });

  server.addHook("onResponse", (request, reply, done) => {
    if (
      !request.routerPath?.includes("static") &&
      !request.routerPath?.includes("json")
    ) {
      request.log.info(
        `Request completed - ${request.method} - ${
          reply.request.routerPath
        } - StatusCode: ${reply.statusCode} - Response Time: ${reply
          .getResponseTime()
          .toFixed(2)}ms`,
      );
    }
    done();
  });

  try {
    await errorHandler(server);
    await server.register(fastifyCors);
    await server.register(fastifyExpress);

    openapi(server);
    await server.register(apiRoutes);
    await server.ready();

    // Command to Generate Swagger File
    // Needs to be called post Fastify Server is Ready
    server.swagger();
    // To Generate Swagger YAML File
    if (getEnv("NODE_ENV", "development") === "development") {
      const yaml = server.swagger({ yaml: true });
      fs.writeFileSync("./swagger.yml", yaml);
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  server.listen(
    {
      host: getEnv("HOST", "0.0.0.0"),
      port: Number(getEnv("PORT", 3005)),
    },
    (err) => {
      if (err) {
        server.log.error(err);
        process.exit(1);
      }
    },
  );

  try {
    await envVariablesCheck(server, [
      "OPENAPI_BASE_ORIGIN",
      "WALLET_PRIVATE_KEY",
      "THIRDWEB_API_KEY",
      "DATABASE_CLIENT",
      "POSTGRES_HOST",
      "POSTGRES_DATABASE_NAME",
      "POSTGRES_USER",
      "POSTGRES_PASSWORD",
      "POSTGRES_PORT",
      "POSTGRES_USE_SSL",
    ]);
    // Check for the Tables Existence post startup
    await checkTablesExistence(server);
    await implementTriggerOnStartUp(server);
  } catch (err) {
    console.log(err);
  }
};

main();
