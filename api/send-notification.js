const webpush = require('web-push');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async function handler(req, res) {
  // Always return JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      return res.status(500).json({ error: 'Missing VAPID keys in environment variables' });
    }

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing Supabase URL or Service Role Key' });
    }

    webpush.setVapidDetails(
      'mailto:daunited@example.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const { title, body, url } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    // Fetch subscriptions
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
      const text = await response.text();
      return res.status(500).json({
        error: 'Failed to fetch subscriptions from Supabase',
        details: text,
      });
    }

    const subscriptions = await response.json();

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return res.status(200).json({ message: 'No subscriptions found', sent: 0, failed: 0 });
    }

    const payload = JSON.stringify({
      title: title || 'DA United',
      body: body || 'New update from the club',
      url: url || '/dashboard.html',
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) => {
        if (!sub.endpoint || !sub.p256dh || !sub.auth) {
          return Promise.reject(new Error('Invalid subscription'));
        }

        return webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return res.status(200).json({
      message: 'Notifications processed',
      sent,
      failed,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
};