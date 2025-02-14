// src/providers/erc20.provider.ts
import { elizaLogger } from "@elizaos/core";
import { getAddress as getAddress3 } from "viem";

// src/types/erc20.ts
import { z } from "zod";
var erc20TransferParamsSchema = z.object({
  startBlock: z.number().nullable(),
  endBlock: z.number().nullable(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  contractAddress: z.string().nullable(),
  fileFormat: z.enum(["json", "csv", "parquet"]).optional().nullable()
});

// src/types/uniswap.ts
import { z as z2 } from "zod";
var UniswapSwapParamsSchema = z2.object({
  startBlock: z2.number().nullable(),
  endBlock: z2.number().nullable(),
  poolAddress: z2.string().nullable(),
  fileFormat: z2.enum(["json", "csv", "parquet"]).optional().nullable()
});

// src/services/defillama.service.ts
import { z as z3 } from "zod";
var DefillamaCoinSchema = z3.object({
  decimals: z3.number(),
  symbol: z3.string(),
  price: z3.number().optional(),
  timestamp: z3.number().optional(),
  confidence: z3.number()
});
var DefillamaResponseSchema = z3.object({
  coins: z3.record(z3.string(), DefillamaCoinSchema.optional())
});
var DefillamaService = class _DefillamaService {
  static BASE_URL = "https://coins.llama.fi";
  static PRICES_URL = `${_DefillamaService.BASE_URL}/prices/current/`;
  async getTokenInfoFromChain(chain, tokens) {
    const tokenParams = Array.from(tokens).map((token) => ({
      address: token,
      chain
    }));
    return this.getTokenInfo(tokenParams);
  }
  async getTokenInfo(tokens) {
    try {
      const fullUrl = `${_DefillamaService.PRICES_URL}${tokens.map((token) => `arbitrum:${token.address}`).join(",")}`;
      const response = await fetch(fullUrl);
      const rawData = await response.json();
      const data = DefillamaResponseSchema.parse(rawData);
      const tokenMap = /* @__PURE__ */ new Map();
      Object.entries(data.coins).forEach(([key, value]) => {
        if (!value) return;
        const address = key.split(":")[1];
        const erc20 = {
          symbol: value.symbol,
          decimals: value.decimals
        };
        tokenMap.set(address, erc20);
      });
      return tokenMap;
    } catch (error) {
      console.error("Error fetching token info from Defillama:", error);
      return /* @__PURE__ */ new Map();
    }
  }
};

// src/services/erc20.service.ts
import { createPublicClient, erc20Abi, getAddress, http } from "viem";
var Erc20Service = class {
  constructor(rpcUrl, defillamaService) {
    this.rpcUrl = rpcUrl;
    this.defillamaService = defillamaService;
  }
  async getErc20Info(tokens) {
    const defillamaResponse = await this.defillamaService.getTokenInfo(tokens);
    const defillamaTokens = new Set(defillamaResponse.keys());
    const tokensSet = new Set(tokens.map((token) => token.address));
    if (defillamaTokens.size == tokensSet.size) {
      return defillamaResponse;
    }
    const missingTokens = await this.getMissingTokens(tokens, defillamaResponse);
    const missingTokensInfo = await this.fetchMissingTokens(missingTokens);
    return missingTokensInfo.reduce((map, token) => {
      map.set(getAddress(token.address), token);
      return map;
    }, new Map(defillamaResponse));
  }
  async getErc20InfoFromChain(chain, tokens) {
    const tokensInfo = await this.getErc20Info(
      Array.from(tokens).map((token) => ({
        address: token,
        chain
      }))
    );
    return tokensInfo;
  }
  async getMissingTokens(requestedTokens, defillamaTokens) {
    const defillamaTokensSet = new Set(defillamaTokens.keys());
    const tokensByChain = requestedTokens.reduce(
      (acc, token) => {
        if (!acc[token.chain.id]) {
          acc[token.chain.id] = [];
        }
        acc[token.chain.id].push(token);
        return acc;
      },
      {}
    );
    const missingTokens = Object.values(tokensByChain).flatMap((chainTokens) => {
      return chainTokens.filter((token) => !defillamaTokensSet.has(token.address));
    });
    return missingTokens;
  }
  async fetchMissingTokens(missingTokens) {
    const tokensByChain = missingTokens.reduce(
      (acc, token) => {
        if (!acc[token.chain.id]) {
          acc[token.chain.id] = [];
        }
        acc[token.chain.id].push(token);
        return acc;
      },
      {}
    );
    const results = [];
    for (const chainTokens of Object.values(tokensByChain)) {
      if (chainTokens.length === 0) continue;
      const chain = chainTokens[0].chain;
      const client = this.getClient(chain);
      const multicallResults = await client.multicall({
        // @ts-ignore
        contracts: chainTokens.flatMap((token) => [
          {
            address: token.address,
            abi: erc20Abi,
            functionName: "symbol"
          },
          {
            address: token.address,
            abi: erc20Abi,
            functionName: "decimals"
          }
        ])
      });
      for (let i = 0; i < chainTokens.length; i++) {
        const symbolResult = multicallResults[i * 2];
        const decimalsResult = multicallResults[i * 2 + 1];
        if (symbolResult.status === "success" && decimalsResult.status === "success") {
          results.push({
            symbol: symbolResult.result,
            decimals: Number(decimalsResult.result),
            ...chainTokens[i]
          });
        }
      }
    }
    return results;
  }
  getClient(chain) {
    return createPublicClient({
      chain,
      transport: http(this.rpcUrl)
    });
  }
};

// src/services/uniswap.service.ts
import { arbitrum } from "viem/chains";
import { createPublicClient as createPublicClient2, getAddress as getAddress2, http as http2 } from "viem";

// src/abis/uniswap-v3-pool.json
var uniswap_v3_pool_default = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "int24",
        name: "tickLower",
        type: "int24"
      },
      {
        indexed: true,
        internalType: "int24",
        name: "tickUpper",
        type: "int24"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256"
      }
    ],
    name: "Burn",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      {
        indexed: true,
        internalType: "int24",
        name: "tickLower",
        type: "int24"
      },
      {
        indexed: true,
        internalType: "int24",
        name: "tickUpper",
        type: "int24"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount0",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount1",
        type: "uint128"
      }
    ],
    name: "Collect",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount0",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount1",
        type: "uint128"
      }
    ],
    name: "CollectProtocol",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "paid0",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "paid1",
        type: "uint256"
      }
    ],
    name: "Flash",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint16",
        name: "observationCardinalityNextOld",
        type: "uint16"
      },
      {
        indexed: false,
        internalType: "uint16",
        name: "observationCardinalityNextNew",
        type: "uint16"
      }
    ],
    name: "IncreaseObservationCardinalityNext",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint160",
        name: "sqrtPriceX96",
        type: "uint160"
      },
      {
        indexed: false,
        internalType: "int24",
        name: "tick",
        type: "int24"
      }
    ],
    name: "Initialize",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "sender",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "int24",
        name: "tickLower",
        type: "int24"
      },
      {
        indexed: true,
        internalType: "int24",
        name: "tickUpper",
        type: "int24"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256"
      }
    ],
    name: "Mint",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint8",
        name: "feeProtocol0Old",
        type: "uint8"
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "feeProtocol1Old",
        type: "uint8"
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "feeProtocol0New",
        type: "uint8"
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "feeProtocol1New",
        type: "uint8"
      }
    ],
    name: "SetFeeProtocol",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      {
        indexed: false,
        internalType: "int256",
        name: "amount0",
        type: "int256"
      },
      {
        indexed: false,
        internalType: "int256",
        name: "amount1",
        type: "int256"
      },
      {
        indexed: false,
        internalType: "uint160",
        name: "sqrtPriceX96",
        type: "uint160"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "liquidity",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "int24",
        name: "tick",
        type: "int24"
      }
    ],
    name: "Swap",
    type: "event"
  },
  {
    inputs: [
      { internalType: "int24", name: "tickLower", type: "int24" },
      { internalType: "int24", name: "tickUpper", type: "int24" },
      { internalType: "uint128", name: "amount", type: "uint128" }
    ],
    name: "burn",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      { internalType: "int24", name: "tickLower", type: "int24" },
      { internalType: "int24", name: "tickUpper", type: "int24" },
      {
        internalType: "uint128",
        name: "amount0Requested",
        type: "uint128"
      },
      {
        internalType: "uint128",
        name: "amount1Requested",
        type: "uint128"
      }
    ],
    name: "collect",
    outputs: [
      { internalType: "uint128", name: "amount0", type: "uint128" },
      { internalType: "uint128", name: "amount1", type: "uint128" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      {
        internalType: "uint128",
        name: "amount0Requested",
        type: "uint128"
      },
      {
        internalType: "uint128",
        name: "amount1Requested",
        type: "uint128"
      }
    ],
    name: "collectProtocol",
    outputs: [
      { internalType: "uint128", name: "amount0", type: "uint128" },
      { internalType: "uint128", name: "amount1", type: "uint128" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "fee",
    outputs: [{ internalType: "uint24", name: "", type: "uint24" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "feeGrowthGlobal0X128",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "feeGrowthGlobal1X128",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
      { internalType: "bytes", name: "data", type: "bytes" }
    ],
    name: "flash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "observationCardinalityNext",
        type: "uint16"
      }
    ],
    name: "increaseObservationCardinalityNext",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint160",
        name: "sqrtPriceX96",
        type: "uint160"
      }
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "liquidity",
    outputs: [{ internalType: "uint128", name: "", type: "uint128" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "maxLiquidityPerTick",
    outputs: [{ internalType: "uint128", name: "", type: "uint128" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      { internalType: "int24", name: "tickLower", type: "int24" },
      { internalType: "int24", name: "tickUpper", type: "int24" },
      { internalType: "uint128", name: "amount", type: "uint128" },
      { internalType: "bytes", name: "data", type: "bytes" }
    ],
    name: "mint",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "observations",
    outputs: [
      {
        internalType: "uint32",
        name: "blockTimestamp",
        type: "uint32"
      },
      {
        internalType: "int56",
        name: "tickCumulative",
        type: "int56"
      },
      {
        internalType: "uint160",
        name: "secondsPerLiquidityCumulativeX128",
        type: "uint160"
      },
      { internalType: "bool", name: "initialized", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint32[]",
        name: "secondsAgos",
        type: "uint32[]"
      }
    ],
    name: "observe",
    outputs: [
      {
        internalType: "int56[]",
        name: "tickCumulatives",
        type: "int56[]"
      },
      {
        internalType: "uint160[]",
        name: "secondsPerLiquidityCumulativeX128s",
        type: "uint160[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "positions",
    outputs: [
      {
        internalType: "uint128",
        name: "liquidity",
        type: "uint128"
      },
      {
        internalType: "uint256",
        name: "feeGrowthInside0LastX128",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "feeGrowthInside1LastX128",
        type: "uint256"
      },
      {
        internalType: "uint128",
        name: "tokensOwed0",
        type: "uint128"
      },
      {
        internalType: "uint128",
        name: "tokensOwed1",
        type: "uint128"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "protocolFees",
    outputs: [
      { internalType: "uint128", name: "token0", type: "uint128" },
      { internalType: "uint128", name: "token1", type: "uint128" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint8",
        name: "feeProtocol0",
        type: "uint8"
      },
      { internalType: "uint8", name: "feeProtocol1", type: "uint8" }
    ],
    name: "setFeeProtocol",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "slot0",
    outputs: [
      {
        internalType: "uint160",
        name: "sqrtPriceX96",
        type: "uint160"
      },
      { internalType: "int24", name: "tick", type: "int24" },
      {
        internalType: "uint16",
        name: "observationIndex",
        type: "uint16"
      },
      {
        internalType: "uint16",
        name: "observationCardinality",
        type: "uint16"
      },
      {
        internalType: "uint16",
        name: "observationCardinalityNext",
        type: "uint16"
      },
      { internalType: "uint8", name: "feeProtocol", type: "uint8" },
      { internalType: "bool", name: "unlocked", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "int24", name: "tickLower", type: "int24" },
      { internalType: "int24", name: "tickUpper", type: "int24" }
    ],
    name: "snapshotCumulativesInside",
    outputs: [
      {
        internalType: "int56",
        name: "tickCumulativeInside",
        type: "int56"
      },
      {
        internalType: "uint160",
        name: "secondsPerLiquidityInsideX128",
        type: "uint160"
      },
      {
        internalType: "uint32",
        name: "secondsInside",
        type: "uint32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      { internalType: "bool", name: "zeroForOne", type: "bool" },
      {
        internalType: "int256",
        name: "amountSpecified",
        type: "int256"
      },
      {
        internalType: "uint160",
        name: "sqrtPriceLimitX96",
        type: "uint160"
      },
      { internalType: "bytes", name: "data", type: "bytes" }
    ],
    name: "swap",
    outputs: [
      { internalType: "int256", name: "amount0", type: "int256" },
      { internalType: "int256", name: "amount1", type: "int256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "int16", name: "", type: "int16" }],
    name: "tickBitmap",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "tickSpacing",
    outputs: [{ internalType: "int24", name: "", type: "int24" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "int24", name: "", type: "int24" }],
    name: "ticks",
    outputs: [
      {
        internalType: "uint128",
        name: "liquidityGross",
        type: "uint128"
      },
      {
        internalType: "int128",
        name: "liquidityNet",
        type: "int128"
      },
      {
        internalType: "uint256",
        name: "feeGrowthOutside0X128",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "feeGrowthOutside1X128",
        type: "uint256"
      },
      {
        internalType: "int56",
        name: "tickCumulativeOutside",
        type: "int56"
      },
      {
        internalType: "uint160",
        name: "secondsPerLiquidityOutsideX128",
        type: "uint160"
      },
      {
        internalType: "uint32",
        name: "secondsOutside",
        type: "uint32"
      },
      { internalType: "bool", name: "initialized", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  }
];

// src/services/uniswap.service.ts
var UniswapService = class {
  constructor(rpcUrl) {
    this.rpcUrl = rpcUrl;
    this.erc20Service = new Erc20Service(rpcUrl, new DefillamaService());
  }
  erc20Service;
  async getPoolTokens(poolAddress) {
    const [token0Result, token1Result] = await this.client.multicall({
      // @ts-ignore: throwing the error "Type instantiation is excessively deep and possibly infinite"
      contracts: [
        this.getPoolTokenParams(poolAddress, "token0"),
        this.getPoolTokenParams(poolAddress, "token1")
      ]
    });
    const token0 = token0Result.status === "success" ? getAddress2(token0Result.result) : null;
    const token1 = token1Result.status === "success" ? getAddress2(token1Result.result) : null;
    const tokenData = await this.erc20Service.getErc20Info([
      ...token0 ? [{ address: token0, chain: arbitrum }] : [],
      ...token1 ? [{ address: token1, chain: arbitrum }] : []
    ]);
    return {
      token0: token0 ? {
        ...tokenData.get(token0),
        address: token0,
        chain: arbitrum
      } : null,
      token1: token1 ? {
        ...tokenData.get(token1),
        address: token1,
        chain: arbitrum
      } : null
    };
  }
  get client() {
    return createPublicClient2({
      // TODO: once we include support for other chains, we should make this dynamic
      chain: arbitrum,
      transport: http2(this.rpcUrl)
    });
  }
  getPoolTokenParams(address, functionName) {
    return {
      abi: uniswap_v3_pool_default,
      functionName,
      address
    };
  }
};

// src/services/jellyfishes/erc20.jellyfish.ts
import {
  ERC20DataSource
} from "@abernatskiy/erc20-transfers-jellyfish";
import { arbitrum as arbitrum2 } from "viem/chains";

// src/services/jellyfishes/base.jellyfish.ts
import { HttpClient } from "@abernatskiy/http-client";
import { PortalClient } from "@abernatskiy/portal-client";
import { Readable } from "stream";
var BaseJellyfishService = class _BaseJellyfishService {
  constructor(portalUrl) {
    this.portalUrl = portalUrl;
  }
  static MIN_BYTES = 1 * 1024 * 1024;
  static RETRY_ATTEMPTS = 3;
  /**
   * Returns an instance of the SQD Portal Client
   */
  get portalClient() {
    const portalClient = new PortalClient({
      url: this.portalUrl,
      http: new HttpClient({
        retryAttempts: _BaseJellyfishService.RETRY_ATTEMPTS,
        async fetch(input, init) {
          let res = await fetch(input, init);
          if (res.body instanceof Readable) {
            res = new Response(Readable.toWeb(res.body), res);
          }
          return res;
        }
      }),
      minBytes: _BaseJellyfishService.MIN_BYTES
    });
    return portalClient;
  }
};

// src/services/jellyfishes/erc20.jellyfish.ts
var Erc20JellyfishService = class _Erc20JellyfishService extends BaseJellyfishService {
  erc20Service;
  static FIELDS = {
    transaction: {
      hash: true
    },
    block: {
      timestamp: true,
      hash: true,
      number: true
    },
    transfer: {
      from: true,
      to: true,
      value: true,
      address: true
    }
  };
  constructor(portalUrl, rpcUrl) {
    super(portalUrl);
    this.erc20Service = new Erc20Service(rpcUrl, new DefillamaService());
  }
  async fetchData(params) {
    const dataRequest = {
      transfers: [
        {
          address: params.contractAddress ? [params.contractAddress] : void 0,
          from: params.from ? [params.from] : void 0,
          to: params.to ? [params.to] : void 0,
          transaction: true
        }
      ]
    };
    const erc20Metadata = await this.erc20Service.getErc20Info([
      { address: params.contractAddress, chain: arbitrum2 }
    ]);
    const stream = this.getDataSource(params, dataRequest).getBlockStream({ from: params.startBlock, to: params.endBlock }, true).pipeThrough(
      new TransformStream({
        transform: async (blocks, controller) => {
          await Promise.all(
            blocks.filter(this.filterBlock).map(async (block) => {
              controller.enqueue(await this.parseTransfers(block, erc20Metadata));
            })
          );
        }
      })
    );
    const processedBlocks = [];
    for await (const data of stream) {
      processedBlocks.push(...data);
    }
    return processedBlocks;
  }
  async parseTransfers(block, erc20Metadata) {
    return block.transfers.filter((transfer) => transfer).map((transfer) => ({
      from: transfer.from,
      to: transfer.to,
      value: transfer.value,
      address: transfer.address,
      blockTimestamp: block.header.timestamp,
      blockNumber: block.header.number,
      transactionHash: block.transactions[0].hash,
      ...erc20Metadata.get(transfer.address)
    }));
  }
  filterBlock(block) {
    return block.transfers?.length != 0;
  }
  getDataSource(params, dataRequest) {
    return new ERC20DataSource({
      portal: this.portalClient,
      query: {
        fields: _Erc20JellyfishService.FIELDS,
        requests: [
          {
            range: {
              from: params.startBlock,
              to: params.endBlock
            },
            request: dataRequest
          }
        ]
      }
    });
  }
};

// src/services/jellyfishes/uniswap.jellyfish.ts
import {
  SwapDataSource
} from "@abernatskiy/uniswapv3-pool-swaps";
var UniswapJellyfishService = class _UniswapJellyfishService extends BaseJellyfishService {
  static FIELDS = {
    transaction: {
      hash: true
    },
    block: {
      timestamp: true,
      hash: true,
      number: true
    },
    swap: {
      sender: true,
      recipient: true,
      amount0: true,
      amount1: true,
      sqrtPriceX96: true,
      liquidity: true,
      tick: true
    }
  };
  uniswapService;
  constructor(portalUrl, rpcUrl) {
    super(portalUrl);
    this.uniswapService = new UniswapService(rpcUrl);
  }
  async fetchData(params) {
    const dataRequest = {
      swaps: [
        {
          address: [params.poolAddress],
          transaction: true
        }
      ]
    };
    const poolTokens = await this.uniswapService.getPoolTokens(params.poolAddress);
    const stream = this.getDataSource(params, dataRequest).getBlockStream(
      {
        from: params.startBlock,
        to: params.endBlock
      },
      true
    ).pipeThrough(
      new TransformStream({
        transform: async (blocks, controller) => {
          await Promise.all(
            blocks.filter(this.filterBlock).map(async (block) => {
              controller.enqueue(await this.parseSwaps(block, poolTokens));
            })
          );
        }
      })
    );
    const processedBlocks = [];
    for await (const data of stream) {
      processedBlocks.push(...data);
    }
    return processedBlocks;
  }
  parseSwaps(block, poolTokens) {
    const swaps = block.transfers.map((swap) => ({
      ...swap,
      address: swap.address,
      transactionHash: block.transactions[0].hash,
      poolName: `${poolTokens.token0?.symbol}/${poolTokens.token1?.symbol}`
    }));
    return swaps;
  }
  filterBlock(block) {
    return block.transfers?.length !== 0;
  }
  getDataSource(params, dataRequest) {
    return new SwapDataSource({
      portal: this.portalClient,
      query: {
        fields: _UniswapJellyfishService.FIELDS,
        requests: [
          {
            range: {
              from: params.startBlock,
              to: params.endBlock
            },
            request: dataRequest
          }
        ]
      }
    });
  }
};

// src/utils/index.ts
import fs from "node:fs";
import path from "node:path";

// src/utils/data-converters.ts
import { Parser } from "json2csv";
import * as parquet from "@dsnp/parquetjs";
function createParquetSchema(jsonObject) {
  const schemaFields = Object.entries(jsonObject).reduce(
    (fields, [key, value]) => {
      switch (typeof value) {
        case "string":
          fields[key] = parquet.ParquetFieldBuilder.createStringField();
          break;
        case "number":
          fields[key] = parquet.ParquetFieldBuilder.createDoubleField();
          break;
        case "boolean":
          fields[key] = parquet.ParquetFieldBuilder.createBooleanField();
          break;
        case "bigint":
          fields[key] = parquet.ParquetFieldBuilder.createStringField();
          break;
        default:
          fields[key] = parquet.ParquetFieldBuilder.createStringField();
      }
      fields[key].optional = true;
      return fields;
    },
    {}
  );
  return new parquet.ParquetSchema(schemaFields);
}
async function jsonToParquet(jsonData) {
  if (!jsonData.length) {
    return Buffer.from([]);
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    const schema = createParquetSchema(jsonData[0]);
    const transformer = new parquet.ParquetTransformer(schema, {
      rowGroupSize: 1e4,
      useDataPageV2: true
    });
    transformer.on("data", (chunk) => chunks.push(chunk));
    transformer.on("end", () => resolve(Buffer.concat(chunks)));
    transformer.on(
      "error",
      (err) => reject(new Error(`Failed to convert JSON to Parquet: ${err.message}`))
    );
    for (const row of jsonData) {
      const processedRow = Object.entries(row).reduce((acc, [key, value]) => {
        acc[key] = typeof value === "bigint" ? value.toString() : value;
        return acc;
      }, {});
      transformer.write(processedRow);
    }
    transformer.end();
  });
}
function jsonToCsv(jsonData, options = { header: true, quote: "" }) {
  try {
    if (!jsonData.length) {
      return "";
    }
    const parser = new Parser(options);
    return parser.parse(jsonData);
  } catch (error) {
    throw new Error(`Failed to convert JSON to CSV: ${error.message}`);
  }
}

// src/utils/index.ts
function saveFile(content, baseFileName, fileFormat) {
  const outputDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const unixTimestamp = Math.floor(Date.now() / 1e3);
  const filepath = path.join(outputDir, `${baseFileName}-${unixTimestamp}.${fileFormat}`);
  fs.writeFileSync(filepath, content);
  return filepath;
}
function getConfigParams(runtime) {
  const portalUrl = runtime.getSetting("SQD_PORTAL_URL");
  if (!portalUrl) {
    throw new Error("SQD_PORTAL_URL is not set");
  }
  const rpcUrl = runtime.getSetting("SQD_RPC_URL");
  if (!rpcUrl) {
    throw new Error("SQD_RPC_URL is not set");
  }
  return { portalUrl, rpcUrl };
}
async function handleFileOutput(jsonData, baseFileName, fileFormat) {
  const jsonString = JSON.stringify(jsonData, null, 2);
  let fileContent;
  if (fileFormat === "json") {
    fileContent = jsonString;
  } else if (fileFormat === "csv") {
    fileContent = jsonToCsv(jsonData);
  } else if (fileFormat === "parquet") {
    fileContent = await jsonToParquet(jsonData);
  }
  return saveFile(fileContent, baseFileName, fileFormat);
}

// src/providers/erc20.provider.ts
var Erc20Provider = class {
  async get(runtime, _message, _state) {
    try {
      const queryParams = this.getExtractionParams(runtime);
      if (!queryParams.startBlock && !queryParams.endBlock && !queryParams.from && !queryParams.to && !queryParams.contractAddress) {
        elizaLogger.debug(
          "[ERC20 Transfer Provider]: Skipping execution - no parameters were set"
        );
        return null;
      }
      const { portalUrl, rpcUrl } = getConfigParams(runtime);
      const validatedParams = this.validateQueryParams(queryParams);
      elizaLogger.debug("ERC20 Query params", validatedParams);
      const transfers = await new Erc20JellyfishService(portalUrl, rpcUrl).fetchData(
        validatedParams
      );
      return this.formatOutput(transfers, validatedParams);
    } catch (error) {
      elizaLogger.debug("[ERC20 Transfer Provider]: Found error while fetching data", error);
    }
  }
  getExtractionParams(runtime) {
    try {
      const startBlock = runtime.getSetting("SQD_ERC20_START_BLOCK");
      const endBlock = runtime.getSetting("SQD_ERC20_END_BLOCK");
      const config = {
        from: runtime.getSetting("SQD_ERC20_FROM_ADDRESS"),
        to: runtime.getSetting("SQD_ERC20_TO_ADDRESS"),
        startBlock: startBlock ? Number.parseInt(startBlock) : null,
        endBlock: endBlock ? Number.parseInt(endBlock) : null,
        contractAddress: runtime.getSetting("SQD_ERC20_CONTRACT_ADDRESS")
      };
      return erc20TransferParamsSchema.parse(config);
    } catch (error) {
      elizaLogger.debug("[ERC20 Transfer Provider]: Validation error", error);
    }
  }
  validateQueryParams(queryParams) {
    if (queryParams.from) queryParams.from = getAddress3(queryParams.from).toLowerCase();
    else queryParams.from = null;
    if (queryParams.to) queryParams.to = getAddress3(queryParams.to).toLowerCase();
    else queryParams.to = null;
    if (queryParams.contractAddress)
      queryParams.contractAddress = getAddress3(queryParams.contractAddress).toLowerCase();
    else queryParams.contractAddress = null;
    return queryParams;
  }
  formatOutput(transfers, params) {
    const header = `ERC20 TRANSFERS
Transfers from ${params.from || "any"} to ${params.to || "any"} for contract ${params.contractAddress || "any"} between blocks ${params.startBlock || "any"} and ${params.endBlock || "any"}

`;
    if (transfers.length === 0) {
      return `${header}No transfers found for the given parameters.`;
    }
    const formattedTransfers = transfers.map((transfer, index) => {
      const lines = [
        `- Transfer #${index + 1}:`,
        `  From: ${transfer.from}`,
        `  To: ${transfer.to}`,
        `  Contract: ${transfer.address}`,
        `  Amount: ${transfer.value}`,
        `  Block: ${transfer.blockNumber}`,
        `  Transaction Hash: ${transfer.transactionHash}`
      ];
      return lines.join("\n");
    });
    return header + formattedTransfers.join("\n\n");
  }
};
var erc20Provider = new Erc20Provider();

// src/providers/uniswap.provider.ts
import { elizaLogger as elizaLogger2 } from "@elizaos/core";
import { getAddress as getAddress4 } from "viem";
var UniswapProvider = class {
  async get(runtime, _message, _state) {
    try {
      const queryParams = await this.getParams(runtime);
      if (!queryParams.startBlock && !queryParams.endBlock && !queryParams.poolAddress) {
        elizaLogger2.debug(
          "[Uniswap Swaps Provider]: Skipping execution - no parameters were set"
        );
        return null;
      }
      const validatedParams = this.validateQueryParams(queryParams);
      const { portalUrl, rpcUrl } = getConfigParams(runtime);
      elizaLogger2.debug("Uniswap Query params", validatedParams);
      const swaps = await new UniswapJellyfishService(portalUrl, rpcUrl).fetchData(
        validatedParams
      );
      return this.formatOutput(swaps, validatedParams);
    } catch (error) {
      elizaLogger2.debug(
        "[Uniswap Swaps Provider]: Found error while parsing parameters",
        error
      );
    }
  }
  async getParams(runtime) {
    try {
      const startBlock = runtime.getSetting("SQD_UNISWAP_START_BLOCK");
      const endBlock = runtime.getSetting("SQD_UNISWAP_END_BLOCK");
      const config = {
        startBlock: startBlock ? Number.parseInt(startBlock) : null,
        endBlock: endBlock ? Number.parseInt(endBlock) : null,
        poolAddress: runtime.getSetting("SQD_UNISWAP_POOL_ADDRESS")
      };
      return UniswapSwapParamsSchema.parse(config);
    } catch (error) {
      elizaLogger2.debug("[Uniswap Swaps Provider]: Validation error", error);
    }
  }
  validateQueryParams(queryParams) {
    if (queryParams.startBlock) queryParams.startBlock = Number(queryParams.startBlock);
    if (queryParams.endBlock) queryParams.endBlock = Number(queryParams.endBlock);
    if (queryParams.poolAddress)
      queryParams.poolAddress = getAddress4(queryParams.poolAddress).toLowerCase();
    else queryParams.poolAddress = null;
    return queryParams;
  }
  formatOutput(swaps, params) {
    const header = `UNISWAP SWAPS
Swaps for pool ${params.poolAddress || "any"} between blocks ${params.startBlock || "any"} and ${params.endBlock || "any"}

`;
    if (swaps.length === 0) {
      return `${header}No swaps found for the given parameters.`;
    }
    const formattedSwaps = swaps.map((swap, index) => {
      const lines = [
        `- Swap #${index + 1}:`,
        `  Pool: ${swap.poolName}`,
        `  Liquidity: ${swap.liquidity}`,
        `  SqrtPriceX96: ${swap.sqrtPriceX96}`,
        `  Amount0: ${swap.amount0}`,
        `  Amount1: ${swap.amount1}`,
        `  Sender: ${swap.sender}`,
        `  Recipient: ${swap.recipient}`,
        `  Tick: ${swap.tick}`
      ];
      return lines.join("\n");
    });
    return header + formattedSwaps.join("\n\n");
  }
};
var uniswapProvider = new UniswapProvider();

// src/actions/erc20/erc20.action.ts
import { elizaLogger as elizaLogger3 } from "@elizaos/core";

// src/utils/erc20-extraction-prompt.ts
var getErc20ExtractionPrompt = (message) => `Extract structured information from user queries about ERC20 events on EVM chains. Output a JSON object with the following keys:
- startBlock: The earliest block number to consider in the analysis (e.g., 290000000).
- endBlock: The latest block number to consider in the analysis (e.g., 290010000).
- from: Sender Ethereum address (e.g., "0x123abc...").
- to: Receiver Ethereum address (e.g., "0x456def...").
- contractAddress: The ERC20 token contract address (e.g., "0x789ghi...").
- fileFormat: The output format option, one of: ["json", "csv", "parquet"] or null if not specified.
- export: Boolean indicating if the data should be exported to a file (true/false).

Rules:
1. Output only the JSON object with the specified keys.
2. Use null for missing or unclear information.
3. Do not include additional keys or text outside the JSON object.
4. Response with an empty object if the prompt is unrelated to ERC20 transfers
5. Set export to true if the user explicitly requests to save/export the data
6. Set fileFormat to one of ["json", "csv", "parquet"] when specified, defaults to null

Examples:

Input:
"Show me the total USDC token transfers (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) from address 0x5f2978c2af6fbd895132231bf9a9ac2c972dc25f to 0x58012c78ce5d955a8fe59792bfdadeef64d966fc between blocks 290000000 and 290010000."

Output:
\`\`\`json
{
  "startBlock": 290000000,
  "endBlock": 290010000,
  "from": "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
  "to": "0xEfGhIj4567890123EfGhIj4567890123EfGhIj45",
  "contractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "fileFormat": null,
  "export": false
}
\`\`\`

Input:
"Export all DAI (0x6B175474E89094C44Da98b954EedeAC495271d0F) transfers from 0xAAA000111222333444555666777888999000AAA000 to 0xBBB111222333444555666777888999000BBB111 starting from block 290005000 as a CSV file."

Output:
\`\`\`json
{
  "startBlock": 290005000,
  "endBlock": null,
  "from": "0xAAA000111222333444555666777888999000AAA000",
  "to": "0xBBB111222333444555666777888999000BBB111",
  "contractAddress": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  "fileFormat": "csv",
  "export": true
}
\`\`\`

Input:
"Save the transfers from 0xA1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3 to 0xD4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5 until block 290008000 in parquet format."

Output:
\`\`\`json
{
  "startBlock": null,
  "endBlock": 290008000,
  "from": "0xA1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3",
  "to": "0xD4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5",
  "contractAddress": null,
  "fileFormat": "parquet",
  "export": true
}
\`\`\`

Input:
"Give me the data for token 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 transfers from 0xA1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3 to 0xD4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5."

Output:
\`\`\`json
{
  "startBlock": null,
  "endBlock": null,
  "from": "0xA1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3",
  "to": "0xD4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5",
  "contractAddress": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "fileFormat": null,
  "export": false
}
\`\`\`

Input:
"Find all the transfer for the token 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 between the blocks 290000000 and 290010000 and save as json"

Output:
\`\`\`json
{
  "startBlock": 290000000,
  "endBlock": 290010000,
  "from": null,
  "to": null,
  "contractAddress": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  "fileFormat": "json",
  "export": true
}
\`\`\`

Input:
"Give me all trades up to block 290010000."

Output:
\`\`\`json
{}
\`\`\`
Not related to ERC20 transfers, returns empty object

Follow these instructions and examples to ensure the output is always a JSON object with the specified keys.

The message is: ${message}`;

// src/actions/erc20/erc20.action.ts
import { getAddress as getAddress5 } from "viem";
import { generateObject, ModelClass } from "@elizaos/core";

// src/actions/erc20/examples.ts
var erc20Examples = [
  [
    {
      user: "user",
      content: {
        text: "Get ERC20 transfers from 0x1234567890123456789012345678901234567890 to 0x4567890123456789012345678901234567890123",
        params: {
          from: "0x1234567890123456789012345678901234567890",
          to: "0x4567890123456789012345678901234567890123",
          startBlock: null,
          endBlock: null,
          contractAddress: null
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Here are the ERC20 transfers matching your criteria",
        success: true,
        params: {
          from: "0x1234567890123456789012345678901234567890",
          to: "0x4567890123456789012345678901234567890123",
          startBlock: null,
          endBlock: null,
          contractAddress: null
        },
        data: {
          transfers: [
            {
              from: "0x1234567890123456789012345678901234567890",
              to: "0x4567890123456789012345678901234567890123",
              value: BigInt("1000000000000000000"),
              address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
              decimals: 6,
              symbol: "USDT",
              blockTimestamp: 1704067200,
              blockNumber: 189e5
            }
          ]
        }
      }
    }
  ],
  [
    {
      user: "user",
      content: {
        text: "Show me ERC20 transfers between blocks 15000000 and 15001000",
        params: {
          from: null,
          to: null,
          startBlock: 15e6,
          endBlock: 15001e3,
          contractAddress: null
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Found transfers within the specified block range",
        success: true,
        params: {
          from: null,
          to: null,
          startBlock: 15e6,
          endBlock: 15001e3,
          contractAddress: null
        },
        data: {
          transfers: [
            {
              from: "0xdef1cafe0000000000000000000000000000dead",
              to: "0xbeef0000000000000000000000000000deadbeef",
              value: BigInt("500000000000000000"),
              address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
              decimals: 6,
              symbol: "USDC",
              blockTimestamp: 1704153600,
              blockNumber: 15000500
            }
          ]
        }
      }
    }
  ],
  [
    {
      user: "user",
      content: {
        text: "Get transfers for USDC token contract at 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        params: {
          from: null,
          to: null,
          startBlock: null,
          endBlock: null,
          contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Here are the USDC token transfers I found",
        success: true,
        params: {
          from: null,
          to: null,
          startBlock: null,
          endBlock: null,
          contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        },
        data: {
          transfers: [
            {
              from: "0x000000000000000000000000000000000000dead",
              to: "0xbeefcafe000000000000000000000000deadbeef",
              value: BigInt("1000000"),
              address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
              decimals: 6,
              symbol: "USDC",
              blockTimestamp: 170424e4,
              blockNumber: 19e6
            }
          ]
        }
      }
    }
  ]
];

// src/actions/erc20/erc20.action.ts
var GetErc20TransfersAction = class {
  name = "GET_ERC20_TRANSFERS";
  similes = ["FETCH_ERC20_TRANSFERS", "LIST_TOKEN_TRANSFERS", "QUERY_TOKEN_TRANSFERS"];
  description = "Retrieve ERC20 transfer data based on specified parameters";
  examples = erc20Examples;
  async validate(_runtime, message) {
    try {
      const content = message.content;
      const extractionPrompt = getErc20ExtractionPrompt(content.text);
      const { object } = await generateObject({
        runtime: _runtime,
        context: extractionPrompt,
        modelClass: ModelClass.SMALL,
        schema: erc20TransferParamsSchema
      });
      content.params = object;
      return true;
    } catch {
      elizaLogger3.debug(
        "[GET_ERC20_TRANSFERS] No ERC20 transfer parameters identified in the current query"
      );
      return false;
    }
  }
  async handler(_runtime, message, _state, _options = {}, callback) {
    try {
      const messageContent = message.content;
      const queryParams = this.validateQueryParams(messageContent.params);
      const { portalUrl, rpcUrl } = getConfigParams(_runtime);
      elizaLogger3.debug("ERC20 Query params", queryParams);
      const transfers = await new Erc20JellyfishService(portalUrl, rpcUrl).fetchData(
        queryParams
      );
      if (callback) {
        callback({
          text: queryParams.fileFormat ? await this.handleFileOutput(transfers, queryParams.fileFormat) : this.formatOutput(transfers, queryParams),
          success: true,
          params: queryParams,
          data: {
            transfers
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger3.error("Error in GET_ERC20_TRANSFERS handler", {
        error: error instanceof Error ? error.message : String(error)
      });
      if (callback) {
        callback({
          text: `Error retrieving ERC20 transfers: ${error instanceof Error ? error.message : String(error)}`,
          success: false,
          data: {
            transfers: [],
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
      return false;
    }
  }
  async handleFileOutput(transfers, fileFormat) {
    const filePath = await handleFileOutput(transfers, "erc20transfer", fileFormat);
    return `Your ERC20 transfers data has been saved to: ${filePath}`;
  }
  validateQueryParams(queryParams) {
    return {
      ...queryParams,
      from: queryParams.from ? getAddress5(queryParams.from).toLowerCase() : null,
      to: queryParams.to ? getAddress5(queryParams.to).toLowerCase() : null,
      contractAddress: queryParams.contractAddress ? getAddress5(queryParams.contractAddress).toLowerCase() : null
    };
  }
  formatOutput(transfers, params) {
    const header = `ERC20 TRANSFERS
Transfers from ${params.from || "any"} to ${params.to || "any"} for contract ${params.contractAddress || "any"} between blocks ${params.startBlock || "any"} and ${params.endBlock || "any"}

`;
    if (transfers.length === 0) {
      return `${header}No transfers found for the given parameters.`;
    }
    const formattedTransfers = transfers.map((transfer, index) => {
      const lines = [
        `- Transfer #${index + 1}:`,
        `  From: ${transfer.from}`,
        `  To: ${transfer.to}`,
        `  Amount: ${transfer.value}`,
        `  Contract: ${transfer.address}`,
        `  Block: ${transfer.blockNumber}`,
        `  Transaction Hash: ${transfer.transactionHash}`
      ];
      return lines.join("\n");
    });
    return header + formattedTransfers.join("\n\n");
  }
};
var getErc20TransfersAction = new GetErc20TransfersAction();

// src/actions/uniswap/uniswap.action.ts
import { elizaLogger as elizaLogger4 } from "@elizaos/core";

// src/utils/uniswap-extraction-prompt.ts
var getUniswapExtractionPrompt = (message) => `Extract structured information from user queries about Uniswap activity. Output a JSON object with the following keys:
- startBlock: The earliest block number to consider in the analysis (e.g., 290000000)
- endBlock: The latest block number to consider in the analysis (e.g., 290010000)
- poolAddress: The Uniswap V3 pool contract address (e.g., "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8")
- fileFormat: The output format option, one of: ["json", "csv", "parquet"] or null if not specified
- export: Boolean indicating if the data should be exported to a file (true/false)

Rules:
1. Output only the JSON object with the specified keys.
2. Use null for missing or unclear information.
3. Do not include additional keys or text outside the JSON object.
4. Only return the filled JSON object if you're sure the request is about Uniswap swaps. Otherwise, return an empty object.
5. Set export to true if the user explicitly requests to save/export the data
6. Set fileFormat to one of ["json", "csv", "parquet"] when specified, defaults to null

Examples:

Input:
"Show me all swaps in the Uniswap V3 contract 0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8 between blocks 290000000 and 290010000."

Output:
\`\`\`json
{
  "startBlock": 290000000,
  "endBlock": 290010000,
  "poolAddress": "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
  "fileFormat": null,
  "export": false
}
\`\`\`

Input:
"Export the USDT/USDC pool 0x3416cF6C708Da44DB2624D63ea0AAef7113527C6 swaps starting from block 290005000 as a parquet file."

Output:
\`\`\`json
{
  "startBlock": 290005000,
  "endBlock": null,
  "poolAddress": "0x3416cF6C708Da44DB2624D63ea0AAef7113527C6",
  "fileFormat": "parquet",
  "export": true
}
\`\`\`

Input:
"Save all swaps from pool 0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443 between blocks 290000000 and 290050000 as csv"

Output:
\`\`\`json
{
  "startBlock": 290000000,
  "endBlock": 290050000,
  "poolAddress": "0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443",
  "fileFormat": "csv",
  "export": true
}
\`\`\`

Input:
"Show me all swaps until block 290008000."

Output:
\`\`\`json
{
  "startBlock": null,
  "endBlock": 290008000,
  "poolAddress": null,
  "fileFormat": null,
  "export": false
}
\`\`\`

Input:
"Give me some ERC20 transfers from 0x5f2978c2af6fbd895132231bf9a9ac2c972dc25f to 0x58012c78ce5d955a8fe59792bfdadeef64d966fc"

Output:
\`\`\`json
{}
\`\`\`
ERC20 transfers are unrelated to Uniswap dataset, returning empty object

Follow these instructions and examples to ensure the output is always a JSON object with the specified keys.

The message is: ${message}`;

// src/actions/uniswap/uniswap.action.ts
import { getAddress as getAddress6 } from "viem";
import { generateObject as generateObject2, ModelClass as ModelClass2 } from "@elizaos/core";

// src/actions/uniswap/examples.ts
var uniswapExamples = [
  [
    {
      user: "user",
      content: {
        text: "Show me Uniswap swaps between blocks 290000000 and 290002000",
        params: {
          startBlock: 29e7,
          endBlock: 290002e3,
          poolAddress: null
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Here are the Uniswap swaps within the specified block range",
        success: true,
        params: {
          startBlock: 29e7,
          endBlock: 290002e3,
          poolAddress: null
        },
        data: {
          swaps: [
            {
              sender: "0x1234567890123456789012345678901234567890",
              recipient: "0x4567890123456789012345678901234567890123",
              amount0: BigInt("1000000000000000000"),
              amount1: BigInt("2000000000000000000"),
              sqrtPriceX96: BigInt("1500000000000000000"),
              liquidity: BigInt("5000000000000000000"),
              tick: 100,
              address: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
              poolName: "WETH/USDC"
            }
          ]
        }
      }
    }
  ],
  [
    {
      user: "user",
      content: {
        text: "Get swaps for Uniswap pool 0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
        params: {
          startBlock: null,
          endBlock: null,
          poolAddress: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Found swaps for the specified Uniswap pool",
        success: true,
        params: {
          startBlock: null,
          endBlock: null,
          poolAddress: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
        },
        data: {
          swaps: [
            {
              sender: "0xdef1cafe0000000000000000000000000000dead",
              recipient: "0xbeef0000000000000000000000000000deadbeef",
              amount0: BigInt("500000000000000000"),
              amount1: BigInt("1000000000000000000"),
              sqrtPriceX96: BigInt("1200000000000000000"),
              liquidity: BigInt("3000000000000000000"),
              tick: 200,
              address: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
              poolName: "WETH/USDC"
            }
          ]
        }
      }
    }
  ]
];

// src/actions/uniswap/uniswap.action.ts
var GetUniswapSwapsAction = class {
  name = "GET_UNISWAP_SWAPS";
  similes = ["FETCH_UNISWAP_SWAPS", "LIST_UNISWAP_SWAPS", "QUERY_UNISWAP_SWAPS"];
  description = "Retrieve Uniswap swap data based on specified parameters";
  examples = uniswapExamples;
  async validate(_runtime, message) {
    try {
      const content = message.content;
      const extractionPrompt = getUniswapExtractionPrompt(content.text);
      const { object } = await generateObject2({
        runtime: _runtime,
        context: extractionPrompt,
        modelClass: ModelClass2.SMALL,
        schema: UniswapSwapParamsSchema
      });
      content.params = object;
      return true;
    } catch {
      elizaLogger4.debug(
        "[GET_UNISWAP_SWAPS] No Uniswap swap parameters identified in the current query"
      );
      return false;
    }
  }
  async handler(_runtime, message, _state, _options = {}, callback) {
    try {
      const messageContent = message.content;
      const queryParams = this.validateQueryParams(messageContent.params);
      elizaLogger4.debug("Uniswap Query params", queryParams);
      const { portalUrl, rpcUrl } = getConfigParams(_runtime);
      const swaps = await new UniswapJellyfishService(portalUrl, rpcUrl).fetchData(
        queryParams
      );
      if (callback) {
        callback({
          text: queryParams.fileFormat ? await this.handleFileOutput(swaps, queryParams.fileFormat) : this.formatOutput(swaps, queryParams),
          success: true,
          params: queryParams,
          data: {
            swaps
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger4.error("Error in GET_UNISWAP_SWAPS handler", {
        error: error instanceof Error ? error.message : String(error)
      });
      if (callback) {
        callback({
          text: `Error retrieving Uniswap swaps: ${error instanceof Error ? error.message : String(error)}`,
          success: false,
          data: {
            swaps: [],
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
      return false;
    }
  }
  async handleFileOutput(swaps, fileFormat) {
    const filePath = await handleFileOutput(swaps, "uniswap-swaps", fileFormat);
    return `Your Uniswap swaps data has been saved to: ${filePath}`;
  }
  validateQueryParams(queryParams) {
    if (queryParams.startBlock) queryParams.startBlock = Number(queryParams.startBlock);
    if (queryParams.endBlock) queryParams.endBlock = Number(queryParams.endBlock);
    if (queryParams.poolAddress)
      queryParams.poolAddress = getAddress6(queryParams.poolAddress).toLowerCase();
    return queryParams;
  }
  formatOutput(swaps, params) {
    const header = `UNISWAP SWAPS
Swaps for pool ${params.poolAddress || "any"} between blocks ${params.startBlock || "any"} and ${params.endBlock || "any"}

`;
    if (swaps.length === 0) {
      return `${header}No swaps found for the given parameters.`;
    }
    const formattedSwaps = swaps.map((swap, index) => {
      const lines = [
        `- Swap #${index + 1}:`,
        `  Pool: ${swap.poolName}`,
        `  Liquidity: ${swap.liquidity}`,
        `  SqrtPriceX96: ${swap.sqrtPriceX96}`,
        `  Amount0: ${swap.amount0}`,
        `  Amount1: ${swap.amount1}`,
        `  Sender: ${swap.sender}`,
        `  Recipient: ${swap.recipient}`,
        `  Tick: ${swap.tick}`,
        `  Transaction Hash: ${swap.transactionHash}`
      ];
      return lines.join("\n");
    });
    return header + formattedSwaps.join("\n\n");
  }
};
var getUniswapSwapsAction = new GetUniswapSwapsAction();

// src/index.ts
BigInt.prototype.toJSON = function() {
  return this.toString();
};
var sqdPlugin = {
  name: "SQD",
  description: "On-chain data lake for AI agents",
  actions: [getErc20TransfersAction, getUniswapSwapsAction],
  evaluators: [],
  providers: [erc20Provider, uniswapProvider]
};
var index_default = sqdPlugin;
export {
  index_default as default,
  erc20Provider,
  getErc20TransfersAction,
  getUniswapSwapsAction,
  sqdPlugin,
  uniswapProvider
};
//# sourceMappingURL=index.js.map