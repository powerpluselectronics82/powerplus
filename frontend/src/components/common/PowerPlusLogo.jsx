import React from 'react';
import companyLogo from '../../assets/logo.jpeg';

export const PowerPlusLogo = ({ className = 'w-full h-auto', showSubtext = true }) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      <img
        src={companyLogo}
        alt="POWER PLUS ELECTRONICS Logo"
        className="max-h-24 w-auto object-contain rounded-lg shadow-sm"
      />
      {showSubtext && (
        <span className="text-[10px] font-black tracking-widest text-slate-800 uppercase mt-1">
          POWER PLUS ELECTRONICS
        </span>
      )}
    </div>
  );
};

export default companyLogo;
