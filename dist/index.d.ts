import * as _elizaos_core from '@elizaos/core';
import { Provider, IAgentRuntime, Memory, State, Action, HandlerCallback, Plugin } from '@elizaos/core';

/**
 * Provider that retrieves ERC20 transfer data based on environment variables
 */
declare class Erc20Provider implements Provider {
    get(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<string>;
    private getExtractionParams;
    private validateQueryParams;
    private formatOutput;
}
declare const erc20Provider: Erc20Provider;

/**
 * Provider that retrieves Uniswap swap data based on runtime settings
 */
declare class UniswapProvider implements Provider {
    get(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<string>;
    private getParams;
    private validateQueryParams;
    private formatOutput;
}
declare const uniswapProvider: UniswapProvider;

declare class GetErc20TransfersAction implements Action {
    name: string;
    similes: string[];
    description: string;
    examples: _elizaos_core.ActionExample[][];
    validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean>;
    handler(_runtime: IAgentRuntime, message: Memory, _state?: State, _options?: {
        [key: string]: unknown;
    }, callback?: HandlerCallback): Promise<boolean>;
    private handleFileOutput;
    private validateQueryParams;
    private formatOutput;
}
declare const getErc20TransfersAction: GetErc20TransfersAction;

declare class GetUniswapSwapsAction implements Action {
    name: string;
    similes: string[];
    description: string;
    examples: _elizaos_core.ActionExample[][];
    validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean>;
    handler(_runtime: IAgentRuntime, message: Memory, _state?: State, _options?: {
        [key: string]: unknown;
    }, callback?: HandlerCallback): Promise<boolean>;
    private handleFileOutput;
    private validateQueryParams;
    private formatOutput;
}
declare const getUniswapSwapsAction: GetUniswapSwapsAction;

declare const sqdPlugin: Plugin;

export { sqdPlugin as default, erc20Provider, getErc20TransfersAction, getUniswapSwapsAction, sqdPlugin, uniswapProvider };
