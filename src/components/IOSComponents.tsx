import React from 'react';

// --- List Section ---
export const ListSection: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    {title && (
      <div className="px-4 py-2">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
      </div>
    )}
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {children}
    </div>
  </div>
);

// --- List Item ---
interface ListItemProps {
  label: string;
  value?: React.ReactNode;
  onClick?: () => void;
}

export const ListItem: React.FC<ListItemProps> = ({ label, value, onClick }) => (
  <div
    onClick={onClick}
    className={`px-4 py-3.5 border-b border-gray-100 last:border-0 flex items-center justify-between ${
      onClick ? 'cursor-pointer active:bg-gray-50' : ''
    }`}
  >
    <span className="text-[15px] font-medium text-gray-900">{label}</span>
    {value && (
      <span className="text-[15px] text-gray-500 ml-4 flex items-center space-x-2">
        {value}
        {onClick && <span className="text-gray-300">›</span>}
      </span>
    )}
  </div>
);

// --- iOS Input ---
interface IOSInputProps {
  label: string;
  type?: 'text' | 'date' | 'datetime-local' | 'number';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: React.ReactNode;
}

export const IOSInput: React.FC<IOSInputProps> = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  suffix
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    if (type === 'text' && value.trim()) {
      onChange(value.trim());
    }
  };

  return (
    <div className="px-4 py-3 border-b border-gray-100 last:border-0 flex items-center justify-between">
      <label className="text-[15px] font-medium text-gray-900 mr-4">{label}</label>
      <div className="flex items-center space-x-2 flex-1 justify-end">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className="text-[15px] text-gray-900 text-right bg-transparent border-none outline-none placeholder-gray-300 max-w-[200px]"
        />
        {suffix}
      </div>
    </div>
  );
};

// --- Primary Button ---
interface PrimaryButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onClick,
  disabled = false,
  variant = 'primary'
}) => {
  const baseStyles = 'w-full py-4 rounded-2xl font-bold text-[17px] transition-all shadow-sm';
  
  const variantStyles = {
    primary: 'bg-[#007AFF] text-white active:bg-[#0051D5] disabled:bg-gray-300',
    secondary: 'bg-white text-[#007AFF] border-2 border-[#007AFF] active:bg-gray-50 disabled:border-gray-300 disabled:text-gray-300',
    danger: 'bg-[#FF3B30] text-white active:bg-[#D50000] disabled:bg-gray-300'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  );
};
