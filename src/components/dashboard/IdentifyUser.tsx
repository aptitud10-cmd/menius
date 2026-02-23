'use client';

import { useEffect } from 'react';
import { identifyUser } from '@/lib/analytics';

export function IdentifyUser({
  userId,
  email,
  name,
  restaurantId,
  restaurantName,
}: {
  userId: string;
  email?: string;
  name?: string;
  restaurantId: string;
  restaurantName?: string;
}) {
  useEffect(() => {
    identifyUser(userId, {
      email,
      name,
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
    });
  }, [userId, email, name, restaurantId, restaurantName]);

  return null;
}
