'use client';

import React from 'react';
import { Navbar } from '../../components/Navbar';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 lg:pb-8">
        {children}
      </main>
    </div>
  );
}
