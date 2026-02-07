import React from 'react';

interface LayoutProps {
  title: string;
  children: React.ReactNode;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ title, children, leftAction, rightAction }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="w-20 text-[#007AFF] font-semibold text-[15px]">
            {leftAction}
          </div>
          <h1 className="text-[17px] font-semibold text-gray-900 tracking-tight">
            {title}
          </h1>
          <div className="w-20 text-right text-[#007AFF] font-semibold text-[15px]">
            {rightAction}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
