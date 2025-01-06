// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketContract is ERC721, Ownable {
    struct Ticket {
        uint256 eventId;
        string zone;
        uint256 seatNumber;
        uint256 price;
        bool isUsed;
        uint256 eventDate;
    }

    mapping(uint256 => Ticket) public tickets;
    uint256 private _tokenIdCounter;

    event TicketMinted(address indexed to, uint256 indexed tokenId, uint256 eventId, string zone, uint256 seatNumber, uint256 eventDate);

    constructor() ERC721("EventTicket", "TCKT") Ownable(msg.sender) {}

    function mintTicket(
        address to,
        uint256 eventId,
        string memory zone,
        uint256 seatNumber,
        uint256 price,
        uint256 eventDate
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        tickets[tokenId] = Ticket(eventId, zone, seatNumber, price, false, eventDate);
        _safeMint(to, tokenId);

        emit TicketMinted(to, tokenId, eventId, zone, seatNumber, eventDate);
        return tokenId;
    }

    function useTicket(uint256 tokenId) public onlyOwner {
        require(!tickets[tokenId].isUsed, "Ticket already used");
        tickets[tokenId].isUsed = true;
    }

    function getTicketDetails(uint256 tokenId) public view returns (Ticket memory) {
        return tickets[tokenId];
    }

    function ticketsMintedCount(uint256 eventId, string memory zone) public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < _tokenIdCounter; i++) {
            if (tickets[i].eventId == eventId && keccak256(bytes(tickets[i].zone)) == keccak256(bytes(zone))) {
                count++;
            }
        }
        return count;
    }
}