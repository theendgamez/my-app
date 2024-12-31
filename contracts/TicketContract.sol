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
    }

    mapping(uint256 => Ticket) public tickets;
    uint256 private _tokenIdCounter;
    
    event TicketMinted(uint256 tokenId, uint256 eventId, string zone, uint256 seatNumber);

    constructor() ERC721("EventTicket", "TCKT") Ownable(msg.sender) {}

    function mintTicket(
        address to,
        uint256 eventId,
        string memory zone,
        uint256 seatNumber,
        uint256 price
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        tickets[tokenId] = Ticket({
            eventId: eventId,
            zone: zone,
            seatNumber: seatNumber,
            price: price,
            isUsed: false
        });

        _safeMint(to, tokenId);
        emit TicketMinted(tokenId, eventId, zone, seatNumber);
        
        return tokenId;
    }

    function useTicket(uint256 tokenId) public onlyOwner {
        require(!tickets[tokenId].isUsed, "Ticket already used");
        tickets[tokenId].isUsed = true;
    }

    function getTicketDetails(uint256 tokenId) public view returns (Ticket memory) {
        return tickets[tokenId];
    }
}
