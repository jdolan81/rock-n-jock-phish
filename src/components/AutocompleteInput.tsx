import React, { useState, useRef, useEffect } from 'react';
import { SongInsight } from '../services/setlistService';

interface AutocompleteInputProps {
  label: string;
  placeholder: string;
  value: string;
  insights: SongInsight[];
  onChange: (value: string) => void;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  placeholder,
  value,
  insights,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = insights
    .filter(insight => 
      insight.song.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  const handleSelect = (song: string) => {
    onChange(song);
    setQuery(song);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative px-4 py-3 border-b border-gray-100 last:border-0" style={{ overflow: 'visible' }}>
      <div className="flex items-center justify-between">
        <label className="text-[15px] font-medium text-gray-900 mr-4">{label}</label>
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="text-[15px] text-gray-900 text-right bg-transparent border-none outline-none placeholder-gray-300 max-w-[200px]"
        />
      </div>

      {/* Autocomplete Dropdown - FIXED VERSION */}
      {isOpen && query && filteredSuggestions.length > 0 && (
        <div 
          className="fixed bg-white rounded-xl shadow-2xl border-2 border-blue-500 overflow-hidden max-h-64 overflow-y-auto"
          style={{
            zIndex: 9999,
            left: containerRef.current?.getBoundingClientRect().left + 'px',
            right: '16px',
            top: (containerRef.current?.getBoundingClientRect().bottom || 0) + 4 + 'px',
            width: (containerRef.current?.getBoundingClientRect().width || 300) + 'px'
          }}
        >
          {filteredSuggestions.map((insight, idx) => (
            <div
              key={idx}
              onClick={() => handleSelect(insight.song)}
              className="px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer active:bg-gray-50 hover:bg-gray-50 flex items-center justify-between"
            >
              <span className="text-[15px] font-medium text-gray-900">{insight.song}</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">{insight.lastPlayed}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  insight.probability > 70 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {insight.probability}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;