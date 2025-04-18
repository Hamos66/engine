import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../shared/utils/cache/get-contract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/shared-api-schemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

const responseBodySchema = Type.Object({
  result: Type.Array(Type.String(), {
    description: "The address of the admins on this account",
  }),
});

export const getAllAdmins = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/account/admins/get-all",
    schema: {
      summary: "Get all admins",
      description: "Get all admins for a smart account.",
      tags: ["Account"],
      operationId: "getAllAdmins",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const chainId = await getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const accountAddresses = await contract.account.getAllAdmins();

      reply.status(StatusCodes.OK).send({
        result: accountAddresses,
      });
    },
  });
};
