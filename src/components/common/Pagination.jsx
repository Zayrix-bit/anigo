import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPages();

  return (
    <div className="flex items-center justify-center gap-[6px] mt-10 mb-6 select-none font-sans">
      {/* First Page */}
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="w-11 h-11 rounded-lg bg-[#111] border border-white/5 hover:bg-[#1a1a1a] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center group"
      >
        <ChevronsLeft className="w-4 h-4 text-[#55687a] group-hover:text-white transition-colors" />
      </button>

      {/* Previous Page */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-11 h-11 rounded-lg bg-[#111] border border-white/5 hover:bg-[#1a1a1a] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center group"
      >
        <ChevronLeft className="w-4 h-4 text-[#55687a] group-hover:text-white transition-colors" />
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-[6px]">
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-11 h-11 rounded-lg font-bold text-[15px] transition-all duration-300 flex items-center justify-center ${
              currentPage === page
                ? "bg-[#ff0000] text-white shadow-[0_0_20px_rgba(255,0,0,0.6)] z-10"
                : "bg-[#111] text-[#55687a] border border-white/5 hover:bg-[#1a1a1a] hover:text-white"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      {/* Next Page */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-11 h-11 rounded-lg bg-[#111] border border-white/5 hover:bg-[#1a1a1a] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center group"
      >
        <ChevronRight className="w-4 h-4 text-[#55687a] group-hover:text-white transition-colors" />
      </button>

      {/* Last Page */}
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="w-11 h-11 rounded-lg bg-[#111] border border-white/5 hover:bg-[#1a1a1a] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center group"
      >
        <ChevronsRight className="w-4 h-4 text-[#55687a] group-hover:text-white transition-colors" />
      </button>
    </div>
  );
}
