import React, { useState, useRef, useEffect } from 'react';
import { SongInsight } from '../services/setlistService';

interface AutocompleteInputProps {
  label: string;
  placeholder: string;
  value: string;
  insights: SongInsight[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ 
  label, 
  placeholder, 
  value, 
  insights, 
  onChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredSongs = searchTerm.length > 0
    ? insights
        .filter(s => s.song.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 50)
    : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (val: string) => {
    if (disabled) return;
    setSearchTerm(val);
    setIsOpen(val.length > 0);
  };

  const handleSelect = (song: string) => {
    if (disabled) return;
    onChange(song);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    if (disabled) return;
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <label className="text-sm font-semibold text-gray-700 min-w-[100px]">{label}</label>
        <div className="flex-1 flex items-center space-x-2">
          {value ? (
            <>
              <span className={`text-sm font-medium flex-1 text-right ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
                {value}
              </span>
              {!disabled && (
                <button
                  onClick={handleClear}
                  className="text-red-500 hover:text-red-700 text-sm font-bold"
                >
                  ✕
                </button>
              )}
            </>
          ) : (
            <input
              ref={inputRef}
              type="text"
              placeholder={disabled ? "Locked" : placeholder}
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              disabled={disabled}
              className={`flex-1 text-right text-sm border-none focus:outline-none ${
                disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-transparent text-gray-900'
              }`}
            />
          )}
        </div>
      </div>

      {isOpen && filteredSongs.length > 0 && !disabled && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: inputRef.current ? inputRef.current.getBoundingClientRect().bottom + 4 : 0,
            right: window.innerWidth - (inputRef.current ? inputRef.current.getBoundingClientRect().right : 0),
            width: '320px'
          }}
          className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto z-[9999]"
        >
          {filteredSongs.map((song, idx) => (
            <div
              key={idx}
              onClick={() => handleSelect(song.song)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{song.song}</span>
                {song.probability > 0 && (
                  <span className="text-xs text-gray-500">{song.probability}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;