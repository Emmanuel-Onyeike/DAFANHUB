import webpush from 'web-push';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Safety check
if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('Missing VAPID keys in environment variables');
}

webpush.setVapidDetails(
  'mailto:daunited@example.com', // ← change to a real email of yours
  vapidPublicKey,
  vapidPrivateKey
);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, body, url } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase environment variables missing' });
    }

    // 1. Get all subscriptions from Supabase
    const response = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Supabase fetch error:', errText);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    const subscriptions = await response.json();

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return res.status(200).json({ message: 'No subscriptions found', sent: 0, failed: 0 });
    }

    // 2. Prepare payload
    const payload = JSON.stringify({
      title: title || 'DA United',
      body: body || 'New update from the club',
      url: url || '/dashboard.html',
    });

    // 3. Send to every subscriber
    const results = await Promise.allSettled(
      subscriptions.map((sub) => {
        if (!sub.endpoint || !sub.p256dh || !sub.auth) {
          return Promise.reject(new Error('Invalid subscription'));
        }

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        return webpush.sendNotification(pushSubscription, payload);
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Optional: log failed ones for debugging
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Failed for subscription ${i}:`, r.reason?.message || r.reason);
      }
    });

    return res.status(200).json({
      message: 'Notifications processed',
      sent,
      failed,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
