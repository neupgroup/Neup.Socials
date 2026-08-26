
'use client';

import * as React from 'react';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ProgressBar } from '@/components/progress-bar';
import application from '@/base/application.json';

const FacebookSdkLoader = () => {
  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    let root = document.getElementById('fb-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'fb-root';
      document.body.prepend(root);
    }

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.src =
        'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v25.0&appId=1460023928746399';
      document.body.appendChild(script);
    }
  }, []);

  return null;
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appName = application.appName;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>{appName}</title>
        <meta name="description" content={application.appDescription} />
        <link rel="icon" href={application.appLogo.favicon} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body
        className="font-body antialiased"
        style={{
          backgroundColor: application.appTheme.backgroundColor,
          color: application.appTheme.textColor,
          fontFamily: application.appInterface.fontFamily,
          fontSize: application.appInterface.fontSize,
          lineHeight: application.appInterface.lineHeight,
        }}
      >
        <FacebookSdkLoader />
        <ProgressBar />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
