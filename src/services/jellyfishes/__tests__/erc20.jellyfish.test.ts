import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Erc20JellyfishService } from '../erc20.jellyfish';
import { Erc20Service } from '../../erc20.service';
import { DefillamaService } from '../../defillama.service';
import { Address, getAddress } from 'viem';
import { arbitrum } from 'viem/chains';
import type { Erc20TransferParams } from '../../../types/erc20';
import { ERC20DataSource } from '@abernatskiy/erc20-transfers-jellyfish';

// Mock dependencies
// vi.mock("../../erc20.service");
// vi.mock("../../defillama.service");
// vi.mock("@abernatskiy/erc20-transfers-jellyfish", () => ({
//     ERC20DataSource: vi.fn(),
// }));

describe('Erc20JellyfishService', () => {
    const mockPortalUrl = 'http://mock-portal.url';
    const mockRpcUrl = 'http://mock-rpc.url';
    let service: Erc20JellyfishService;

    // Mock data
    const mockContractAddress = '0x1234567890123456789012345678901234567890' as Address;
    const mockParams = {
        contractAddress: mockContractAddress,
        startBlock: 1000,
        endBlock: 2000,
    };

    const mockTransfer = {
        from: '0xsender' as Address,
        to: '0xreceiver' as Address,
        value: 1000000n,
        address: mockContractAddress,
    };

    const mockBlock = {
        header: {
            timestamp: 1234567890,
            number: 1500,
            hash: '0xabc...',
        },
        transfers: [mockTransfer],
    };

    const mockMetadata = new Map([
        [
            mockContractAddress,
            {
                symbol: 'TEST',
                decimals: 18,
            },
        ],
    ]);

    // beforeEach(() => {
    //     vi.clearAllMocks();
    //     service = new Erc20JellyfishService(mockPortalUrl, mockRpcUrl);
    // });

    describe('fetchData', () => {
        it.only('DEBUG SERVICE', async () => {
            const params: Erc20TransferParams = {
                contractAddress: getAddress(
                    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9'
                ).toLowerCase(),
                from: null,
                to: null,
                fileFormat: null,
                startBlock: 290000000,
                endBlock: 290010000,
            };

            const SQD_PORTAL_URL = 'https://portal.sqd.dev/datasets/arbitrum-one';
            const SQD_RPC_URL = 'https://arbitrum.llamarpc.com';

            const newService = new Erc20JellyfishService(SQD_PORTAL_URL, SQD_RPC_URL);
            const result = await newService.fetchData(params);
        });

        //     it("should fetch and process ERC20 transfers correctly", async () => {
        //         // Mock ERC20 metadata service
        //         vi.mocked(Erc20Service.prototype.getErc20Info).mockResolvedValue(
        //             mockMetadata
        //         );

        //         // Mock stream data
        //         const mockStream = {
        //             [Symbol.asyncIterator]: async function* () {
        //                 yield [
        //                     {
        //                         from: mockTransfer.from,
        //                         to: mockTransfer.to,
        //                         value: mockTransfer.value,
        //                         address: mockTransfer.address,
        //                         blockTimestamp: mockBlock.header.timestamp,
        //                         blockNumber: mockBlock.header.number,
        //                         transactionHash: mockBlock.header.hash,
        //                         ...mockMetadata.get(mockContractAddress)!,
        //                     },
        //                 ];
        //             },
        //         };

        //         // Mock DataSource
        //         const mockDataSource = {
        //             getBlockStream: vi.fn().mockReturnValue({
        //                 pipeThrough: vi.fn().mockReturnValue(mockStream),
        //             }),
        //         };

        //         // Mock the ERC20DataSource constructor
        //         vi.mocked(ERC20DataSource).mockImplementation(
        //             () => mockDataSource as any
        //         );

        //         // Execute
        //         const result = await service.fetchData(mockParams);

        //         // Verify results
        //         expect(result).toHaveLength(1);
        //         expect(result[0]).toEqual({
        //             from: mockTransfer.from,
        //             to: mockTransfer.to,
        //             value: mockTransfer.value,
        //             address: mockTransfer.address,
        //             blockTimestamp: mockBlock.header.timestamp,
        //             blockNumber: mockBlock.header.number,
        //             transactionHash: mockBlock.header.hash,
        //             symbol: "TEST",
        //             decimals: 18,
        //         });

        //         // Verify service calls
        //         expect(Erc20Service.prototype.getErc20Info).toHaveBeenCalledWith([
        //             { address: mockContractAddress, chain: arbitrum },
        //         ]);
        //     });

        //     it("should handle empty blocks correctly", async () => {
        //         // Mock ERC20 metadata service
        //         vi.mocked(Erc20Service.prototype.getErc20Info).mockResolvedValue(
        //             mockMetadata
        //         );

        //         // Mock stream with empty block
        //         const mockStream = {
        //             [Symbol.asyncIterator]: async function* () {
        //                 yield [];
        //             },
        //         };

        //         // Mock DataSource
        //         const mockDataSource = {
        //             getBlockStream: vi.fn().mockReturnValue({
        //                 pipeThrough: vi.fn().mockReturnValue(mockStream),
        //             }),
        //         };

        //         // Mock the ERC20DataSource constructor
        //         vi.mocked(ERC20DataSource).mockImplementation(
        //             () => mockDataSource as any
        //         );

        //         // Execute
        //         const result = await service.fetchData(mockParams);

        //         // Verify results
        //         expect(result).toHaveLength(0);
        //     });

        //     it("should handle optional filter parameters", async () => {
        //         // Mock ERC20 metadata service
        //         vi.mocked(Erc20Service.prototype.getErc20Info).mockResolvedValue(
        //             mockMetadata
        //         );

        //         // Mock stream
        //         const mockStream = {
        //             [Symbol.asyncIterator]: async function* () {
        //                 yield [
        //                     {
        //                         from: mockTransfer.from,
        //                         to: mockTransfer.to,
        //                         value: mockTransfer.value,
        //                         address: mockTransfer.address,
        //                         blockTimestamp: mockBlock.header.timestamp,
        //                         blockNumber: mockBlock.header.number,
        //                         transactionHash: mockBlock.header.hash,
        //                         ...mockMetadata.get(mockContractAddress)!,
        //                     },
        //                 ];
        //             },
        //         };

        //         // Mock DataSource
        //         const mockDataSource = {
        //             getBlockStream: vi.fn().mockReturnValue({
        //                 pipeThrough: vi.fn().mockReturnValue(mockStream),
        //             }),
        //         };

        //         let capturedConfig: any;
        //         const mockERC20DataSource = vi
        //             .fn()
        //             .mockImplementation((config: any) => {
        //                 capturedConfig = config;
        //                 return mockDataSource;
        //             });

        //         // Mock the ERC20DataSource constructor
        //         vi.mocked(ERC20DataSource).mockImplementation(mockERC20DataSource);

        //         // Test with from address
        //         const paramsWithFrom = {
        //             ...mockParams,
        //             from: "0xsender" as Address,
        //         };
        //         await service.fetchData(paramsWithFrom);

        //         // Verify DataSource was created with correct parameters
        //         expect(capturedConfig).toMatchObject({
        //             query: {
        //                 requests: [
        //                     {
        //                         request: {
        //                             transfers: [
        //                                 {
        //                                     from: [paramsWithFrom.from],
        //                                 },
        //                             ],
        //                         },
        //                     },
        //                 ],
        //             },
        //         });
        //     });

        //     it("should handle errors from metadata service", async () => {
        //         // Mock ERC20 metadata service error
        //         const mockError = new Error("Metadata fetch failed");
        //         vi.mocked(Erc20Service.prototype.getErc20Info).mockRejectedValue(
        //             mockError
        //         );

        //         // Execute and verify error handling
        //         await expect(service.fetchData(mockParams)).rejects.toThrow(
        //             mockError
        //         );
        //     });

        //     it("should handle stream processing errors", async () => {
        //         // Mock ERC20 metadata service
        //         vi.mocked(Erc20Service.prototype.getErc20Info).mockResolvedValue(
        //             mockMetadata
        //         );

        //         // Mock stream with error
        //         const mockStream = {
        //             [Symbol.asyncIterator]: async function* () {
        //                 throw new Error("Stream processing failed");
        //             },
        //         };

        //         // Mock DataSource
        //         const mockDataSource = {
        //             getBlockStream: vi.fn().mockReturnValue({
        //                 pipeThrough: vi.fn().mockReturnValue(mockStream),
        //             }),
        //         };

        //         // Mock the ERC20DataSource constructor
        //         vi.mocked(ERC20DataSource).mockImplementation(
        //             () => mockDataSource as any
        //         );

        //         // Execute and verify error handling
        //         await expect(service.fetchData(mockParams)).rejects.toThrow(
        //             "Stream processing failed"
        //         );
        //     });
        // });
    });
});
