
import React from 'react';

export const SendIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className || "w-6 h-6"}
  >
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

export const BotIcon = ({ className }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className={className || "w-6 h-6"}
    >
        <path fillRule="evenodd" d="M4.5 9.75a6 6 0 0111.57-2.625 6 6 0 015.403 5.375 6.002 6.002 0 01-11.976 1.25A6 6 0 014.5 9.75zM12 6a3.75 3.75 0 00-3.75 3.75c0 2.072 1.678 3.75 3.75 3.75s3.75-1.678 3.75-3.75A3.75 3.75 0 0012 6z" clipRule="evenodd" />
    </svg>
);
