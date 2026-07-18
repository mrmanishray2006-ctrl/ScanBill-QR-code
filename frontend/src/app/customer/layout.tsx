'use client';

import React from 'react';
import { Navbar } from '../../components/Navbar';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-6 pb-24">
        {children}
      </main>
    </div>
  );
}
