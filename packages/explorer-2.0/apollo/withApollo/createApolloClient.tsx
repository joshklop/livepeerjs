import { NextPageContext } from "next";
import {
  ApolloClient,
  ApolloLink,
  defaultDataIdFromObject,
  gql,
  InMemoryCache,
  NormalizedCacheObject,
  Observable,
} from "@apollo/client";
import createSchema from "../createSchema";
import LivepeerSDK from "@livepeer/sdk";
import { execute } from "graphql/execution/execute";

export default function createApolloClient(
  initialState: object,
  ctx: NextPageContext | null
) {
  // The `ctx` (NextPageContext) will only be present on the server.
  // use it to extract auth headers (ctx.req) or similar.

  const dataIdFromObject = (object) => {
    switch (object.__typename) {
      case "ThreeBoxSpace":
        return object.id; // use the `id` field as the identifier
      default:
        return defaultDataIdFromObject(object); // fall back to default handling
    }
  };

  let cache = new InMemoryCache().restore(
    (initialState || {}) as NormalizedCacheObject
  );

  cache.writeQuery({
    query: gql`
      {
        walletModalOpen
        bottomDrawerOpen
        selectedStakingAction
        uniswapModalOpen
        roundStatusModalOpen
        txSummaryModal {
          __typename
          open
          error
        }
        txs
        tourOpen
        roi
        principle
      }
    `,
    data: {
      walletModalOpen: false,
      bottomDrawerOpen: false,
      selectedStakingAction: "",
      uniswapModalOpen: false,
      roundStatusModalOpen: false,
      txSummaryModal: {
        __typename: "TxSummaryModal",
        open: false,
        error: false,
      },
      txs: [],
      tourOpen: false,
      roi: 0.0,
      principle: 0.0,
    },
  });

  const link: any = new ApolloLink((operation) => {
    return new Observable((observer) => {
      Promise.resolve(createSchema())
        .then(async (data) => {
          const context = operation.getContext();
          const sdk = await LivepeerSDK({
            provider:
              process.env.NEXT_PUBLIC_NETWORK === "rinkeby"
                ? process.env.NEXT_PUBLIC_RPC_URL_4
                : process.env.NEXT_PUBLIC_RPC_URL_1,
            controllerAddress: process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS,
            pollCreatorAddress: process.env.NEXT_PUBLIC_POLL_CREATOR_ADDRESS,
            ...(context.library && {
              provider: context.library._web3Provider,
            }),
            ...(context.account && { account: context.account }),
          });

          return execute(
            data,
            operation.query,
            null,
            {
              livepeer: sdk,
              ...context,
            },
            operation.variables,
            operation.operationName
          );
        })
        .then((data) => {
          if (!observer.closed) {
            observer.next(data);
            observer.complete();
          }
        })
        .catch((error) => {
          if (!observer.closed) {
            observer.error(error);
          }
        });
    });
  });

  return new ApolloClient({
    ssrMode: typeof window === "undefined",
    link,
    cache,
  });
}