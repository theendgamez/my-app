import { ethers } from 'ethers';
import TicketContract from '../../artifacts/contracts/TicketContract.sol/TicketContract.json';

const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_GANACHE_URL);
const adminWallet = new ethers.Wallet(process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY!, provider);
const contract = new ethers.Contract(
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
  TicketContract.abi,
  adminWallet
);

/**
 * Mints a ticket and returns the tokenId.
 * @param to - Recipient address
 * @param eventId - Event ID
 * @param zone - Zone name
 * @param seatNumber - Seat number
 * @param price - Price per ticket
 * @param eventDate - Event date as Unix timestamp
 * @returns tokenId as string
 */
export const mintTicket = async (
  to: string,
  eventId: number,
  zone: string,
  seatNumber: number,
  price: number,
  eventDate: number
): Promise<string> => {
  const tx = await contract.mintTicket(to, eventId, zone, seatNumber, price, eventDate);
  const receipt = await tx.wait();

  // Parse the TicketMinted event to extract tokenId
  const iface = new ethers.Interface(TicketContract.abi);
  let tokenId: string | null = null;

  for (const log of receipt.logs) {
    try {
      const parsedLog = iface.parseLog(log);
      if (parsedLog && parsedLog.name === 'TicketMinted') {
        tokenId = parsedLog.args.tokenId.toString();
        break;
      }
    } catch {
      // Not a TicketMinted event
      continue;
    }
  }

  if (!tokenId) {
    throw new Error('Failed to extract tokenId from transaction receipt.');
  }

  console.log('Minted TokenId:', tokenId);
  return tokenId;
};



export async function transferTicket(
  from: string,
  to: string,
  tokenId: string
): Promise<void> {
  const tx = await contract.transferFrom(from, to, tokenId);
  await tx.wait();
  console.log('Transferred TokenId:', tokenId);
}



