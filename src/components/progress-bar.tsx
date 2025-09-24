
'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

function NProgressDone() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  return null;
}

// We need this component to start NProgress when the component is suspended.
// This is because the navigation events don't fire until the new page is ready to be rendered.
// By using a component that suspends, we can start the progress bar immediately.
function NProgressStart() {
    useEffect(() => {
        NProgress.start();

        return () => {
            NProgress.done();
        }
    }, []);

    return null;
}


export function ProgressBar() {
  return (
    <Suspense fallback={<NProgressStart />}>
      <NProgressDone />
    </Suspense>
  );
}
