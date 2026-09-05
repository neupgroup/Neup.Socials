
'use client';

import * as React from 'react';
import './globals.css';
import RootLayoutShell from '#/components/layout/RootLayout';
import { application, getApplicationRadius, getGoogleFontUrl, getHslChannels } from '@/base/application';

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

const ClientErrorReporter = () => {
  React.useEffect(() => {
    const report = (payload: Record<string, unknown>) => {
      void fetch(`${application.appBasePath}/api/log-error`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => undefined);
    };

    const onError = (event: ErrorEvent) => report({
      source: 'window.error',
      message: event.message,
      stack: event.error?.stack,
      filename: event.filename,
      lineNumber: event.lineno,
      columnNumber: event.colno,
    });
    const onRejection = (event: PromiseRejectionEvent) => report({
      source: 'window.unhandledrejection',
      message: event.reason instanceof Error ? event.reason.message : String(event.reason),
      stack: event.reason instanceof Error ? event.reason.stack : undefined,
    });

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appName = application.appName;
  const theme = application.appTheme;
  const appInterface = application.appInterface;
  const appFont = application.appFont;
  const primaryFont = appFont?.primaryFont ?? 'ui-sans-serif, system-ui, sans-serif';
  const secondaryFont = appFont?.secondaryFont ?? primaryFont;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>{appName}</title>
        <meta name="description" content={application.appDescription} />
        <link rel="icon" href={application.appLogo.favicon} />
        <link rel="apple-touch-icon" href={application.appLogo['apple-touch-icon']} />
        {getGoogleFontUrl(appFont) && <link rel="stylesheet" href={getGoogleFontUrl(appFont) ?? undefined} />}
      </head>
      <body
        className="font-body antialiased"
        style={{
          backgroundColor: theme.backgroundColor,
          color: theme.textColor,
          fontFamily: primaryFont,
          fontSize: appInterface.fontSize,
          lineHeight: appInterface.lineHeight,
          '--background': getHslChannels(theme.backgroundColor),
          '--foreground': getHslChannels(theme.textColor),
          '--card': getHslChannels(theme.backgroundColor),
          '--card-foreground': getHslChannels(theme.textColor),
          '--popover': getHslChannels(theme.backgroundColor),
          '--popover-foreground': getHslChannels(theme.textColor),
          '--primary': getHslChannels(theme.primaryColor),
          '--primary-foreground': getHslChannels(theme.backgroundColor),
          '--secondary': getHslChannels(theme.secondaryColor),
          '--secondary-foreground': getHslChannels(theme.textColor),
          '--muted': getHslChannels(theme.secondaryColor),
          '--muted-foreground': getHslChannels(theme.textColor),
          '--accent': getHslChannels(theme.secondaryColor),
          '--accent-foreground': getHslChannels(theme.textColor),
          '--border': getHslChannels(theme.secondaryColor),
          '--input': getHslChannels(theme.secondaryColor),
          '--ring': getHslChannels(theme.primaryColor),
          '--sidebar-background': getHslChannels(theme.backgroundColor),
          '--sidebar-foreground': getHslChannels(theme.textColor),
          '--sidebar-primary': getHslChannels(theme.primaryColor),
          '--sidebar-primary-foreground': getHslChannels(theme.backgroundColor),
          '--sidebar-accent': getHslChannels(theme.secondaryColor),
          '--sidebar-accent-foreground': getHslChannels(theme.textColor),
          '--sidebar-border': getHslChannels(theme.secondaryColor),
          '--sidebar-ring': getHslChannels(theme.primaryColor),
          '--font-primary': primaryFont,
          '--font-secondary': secondaryFont,
          '--radius': getApplicationRadius(appInterface.borderRadius),
          '--box-shadow': appInterface.boxShadow,
        } as React.CSSProperties}
      >
        <FacebookSdkLoader />
        <ClientErrorReporter />
        <RootLayoutShell>{children}</RootLayoutShell>
      </body>
    </html>
  );
}
