
// src/lib/ticketContract.ts
import { ethers } from 'ethers';
import TicketContractABI from '@/artifacts/contracts/TicketContract.sol/TicketContract.json';

const GANACHE_URL = process.env.NEXT_PUBLIC_GANACHE_URL || 'http://127.0.0.1:5545';

const provider = new ethers.providers.JsonRpcProvider(GANACHE_URL);
const signer = provider.getSigner();
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
const ticketContract = new ethers.Contract(contractAddress, TicketContractABI.abi, signer);

export default ticketContract;