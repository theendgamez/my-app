import { FiSearch } from 'react-icons/fi';
import React from 'react';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery, onSubmit }) => {
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 w-full max-w-[600px]">
      <div className="relative flex-1 min-w-0">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="搜尋演唱會"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 p-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 
            focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
        />
      </div>
      <button
        type="submit"
        className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-white 
          transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 
          whitespace-nowrap flex-shrink-0"
      >
        搜尋
      </button>
    </form>
  );
};

export default SearchBar;