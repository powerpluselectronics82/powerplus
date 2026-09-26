import React from 'react';
import companyLogo from '../../assets/logo.jpeg';

/**
 * PowerPlusLogo component engineered to have ZERO space around the logo artwork
 * in every angle (top, bottom, left, and right).
 * Precisely crops out all whitespace margins of the original artwork.
 */
export const PowerPlusLogo = ({
  variant = 'sidebar',
  className = '',
  customLogoUrl = null,
}) => {
  const logoSrc = customLogoUrl || companyLogo;

  // Crop metrics with full bottom clearance:
  const cropImageStyle = {
    position: 'absolute',
    width: '112%',
    height: '146%',
    left: '-6%',
    top: '-30%',
    maxWidth: 'none',
    maxHeight: 'none',
    objectFit: 'fill',
    display: 'block',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  // If a custom logo URL is provided (e.g. uploaded by branch), display it edge-to-edge
  if (customLogoUrl) {
    return (
      <div className={`w-full overflow-hidden flex items-center justify-center p-0 m-0 ${className}`}>
        <img
          src={customLogoUrl}
          alt="Company Logo"
          className="w-full h-auto max-h-full object-contain p-0 m-0 block"
        />
      </div>
    );
  }

  // Sidebar Header: reduced compact size, zero margin/padding, edge-to-edge artwork
  if (variant === 'sidebar') {
    return (
      <div
        className={`w-36 max-w-full mx-auto relative overflow-hidden select-none p-0 m-0 aspect-[1.14/1] rounded-xl ${className}`}
      >
        <img
          src={logoSrc}
          alt="POWER PLUS ELECTRONICS"
          style={cropImageStyle}
        />
      </div>
    );
  }

  // Login Page: reduced sleek logo banner
  if (variant === 'login') {
    return (
      <div
        className={`w-40 max-w-full mx-auto relative overflow-hidden select-none p-0 m-0 aspect-[1.14/1] rounded-xl ${className}`}
      >
        <img
          src={logoSrc}
          alt="POWER PLUS ELECTRONICS"
          style={cropImageStyle}
        />
      </div>
    );
  }

  // Tax Invoice: tight cropped box with zero empty margins
  if (variant === 'invoice') {
    return (
      <div
        className={`w-32 relative overflow-hidden select-none p-0 m-0 aspect-[1.14/1] shrink-0 rounded-lg ${className}`}
      >
        <img
          src={logoSrc}
          alt="POWER PLUS ELECTRONICS"
          style={cropImageStyle}
        />
      </div>
    );
  }

  // Receipt Modal: tight cropped thermal print header
  if (variant === 'receipt') {
    return (
      <div
        className={`w-36 mx-auto relative overflow-hidden select-none p-0 m-0 aspect-[1.14/1] rounded-lg ${className}`}
      >
        <img
          src={logoSrc}
          alt="POWER PLUS ELECTRONICS"
          style={cropImageStyle}
        />
      </div>
    );
  }

  // Generic: tight crop fitting any container dimensions
  return (
    <div
      className={`w-full relative overflow-hidden select-none p-0 m-0 aspect-[1.14/1] ${className}`}
    >
      <img
        src={logoSrc}
        alt="POWER PLUS ELECTRONICS"
        style={cropImageStyle}
      />
    </div>
  );
};

export default PowerPlusLogo;
