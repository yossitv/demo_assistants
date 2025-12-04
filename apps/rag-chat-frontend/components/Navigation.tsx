'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Navigation link interface
 */
interface NavLink {
  href: string;
  label: string;
}

/**
 * Navigation links configuration
 */
const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/knowledge', label: 'Knowledge Spaces' },
  { href: '/agents/create', label: 'Create Agent' },
];

/**
 * Navigation component with responsive mobile menu
 */
export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuAnnouncement, setMenuAnnouncement] = useState('');
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Toggle mobile menu
   */
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((previousState) => {
      const nextState = !previousState;
      setMenuAnnouncement(nextState ? 'Navigation menu expanded' : 'Navigation menu collapsed');
      return nextState;
    });
  };

  /**
   * Close mobile menu when a link is clicked
   */
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setMenuAnnouncement('Navigation menu collapsed');
  };

  /**
   * Handle Escape key to close mobile menu
   */
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        setMenuAnnouncement('Navigation menu collapsed');
        // Return focus to menu button when closing with Escape
        menuButtonRef.current?.focus();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isMobileMenuOpen]);

  /**
   * Trap focus within mobile menu when open
   */
  useEffect(() => {
    if (!isMobileMenuOpen || !mobileMenuRef.current) return;

    const menu = mobileMenuRef.current;
    const focusableElements = menu.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    menu.addEventListener('keydown', handleTabKey);
    return () => menu.removeEventListener('keydown', handleTabKey);
  }, [isMobileMenuOpen]);

  /**
   * Check if a link is active
   */
  const isActiveLink = (href: string): boolean => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="bg-white border-b border-gray-200"
      aria-label="Primary navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="inline-flex items-center px-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md"
            >
              RAG Chat Assistant
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:space-x-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center px-3 py-2 min-h-[44px] text-sm font-medium rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  isActiveLink(link.href)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
                aria-current={isActiveLink(link.href) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-3 min-w-[48px] min-h-[48px] rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 touch-manipulation"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {/* Hamburger icon */}
              {!isMobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                /* Close icon */
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          id="mobile-menu"
          className="md:hidden"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className={`block px-4 py-3 min-h-[48px] rounded-md text-base font-medium transition-colors touch-manipulation ${
                  isActiveLink(link.href)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50 active:bg-gray-100'
                }`}
                aria-current={isActiveLink(link.href) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Screen reader announcement for menu state */}
      <div className="sr-only" role="status" aria-live="polite">
        {menuAnnouncement}
      </div>
    </nav>
  );
}
