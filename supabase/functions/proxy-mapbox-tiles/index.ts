// Edge function: proxify Mapbox tile requests so the access token never leaves the server.
// Usage from client: GET /functions/v1/proxy-mapbox-tiles/{styleId}/{z}/{x}/{y}{@2x}.{ext}
// Example: /functions/v1/proxy-mapbox-tiles/mapbox/streets-v12/3/4/2.png

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const token = Deno.env.get('MAPBOX_ACCESS_TOKEN');
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'MAPBOX_ACCESS_TOKEN not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const url = new URL(req.url);
    // Strip the function prefix to get tile path: /functions/v1/proxy-mapbox-tiles/<rest>
    const marker = '/proxy-mapbox-tiles/';
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) {
      return new Response(JSON.stringify({ error: 'Invalid tile path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const tilePath = url.pathname.substring(idx + marker.length);

    // Whitelist: only allow /styles/v1/{user}/{style}/tiles/... or /v4/{tileset}/{z}/{x}/{y}.{ext}
    const allowed =
      /^styles\/v1\/[\w-]+\/[\w-]+\/tiles\/\d+\/\d+\/\d+(@2x)?(\.\w+)?$/.test(tilePath) ||
      /^v4\/[\w.-]+\/\d+\/\d+\/\d+(@2x)?\.\w+$/.test(tilePath) ||
      /^[\w-]+\/[\w-]+\/\d+\/\d+\/\d+(@2x)?\.\w+$/.test(tilePath);

    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Tile path not allowed', path: tilePath }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mapbox v4 raster tiles endpoint
    let upstream: string;
    if (tilePath.startsWith('styles/v1/') || tilePath.startsWith('v4/')) {
      upstream = `https://api.mapbox.com/${tilePath}?access_token=${token}`;
    } else {
      // Legacy: tileset/z/x/y.ext
      upstream = `https://api.mapbox.com/v4/${tilePath}?access_token=${token}`;
    }

    const upstreamRes = await fetch(upstream);
    if (!upstreamRes.ok) {
      return new Response(JSON.stringify({ error: 'Upstream Mapbox error', status: upstreamRes.status }), {
        status: upstreamRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const buf = await upstreamRes.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': upstreamRes.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
