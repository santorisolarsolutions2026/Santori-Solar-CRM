'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrdersRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/finance');
  }, [router]);

  return null;
}
