import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center text-sm font-bold">NP</div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">News Pulse</h1>
                <p className="text-slate-400 text-xs mt-0.5">
                  Topic-Clustered News Timeline
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {children}
      </main>
      <footer className="border-t border-gray-200 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-gray-400">
          News Pulse &copy; {new Date().getFullYear()} &mdash; Powered by BBC News, NPR &amp; The Guardian
        </div>
      </footer>
    </div>
  );
}
