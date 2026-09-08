import type { SongRequest } from '../types';

const REQUESTS_STORAGE_KEY = 'flannels_song_requests';
const CLIENT_ID_KEY = 'flannels_client_id';

const SUPABASE_STORAGE_BASE = 'https://lrydzxpimekmvrwhnemm.supabase.co/storage/v1/object/public/flannels-songs';
const REQUESTS_FILE_PATH = 'requests.json';

export function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function getStoredRequestsLocally(): SongRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRequestsLocally(requests: SongRequest[]): void {
  localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
}

/**
 * Loads requests from Supabase Storage (public requests.json).
 * Merges with local cache.
 */
export async function fetchSongRequests(): Promise<SongRequest[]> {
  const localList = getStoredRequestsLocally();

  try {
    // 1. Try public fetch from Supabase
    const res = await fetch(`${SUPABASE_STORAGE_BASE}/${REQUESTS_FILE_PATH}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const cloudList = await res.json();
      if (Array.isArray(cloudList)) {
        saveRequestsLocally(cloudList);
        return sortRequests(cloudList);
      }
    }
  } catch (err) {
    console.warn('Could not sync requests from Supabase, using local:', err);
  }

  return sortRequests(localList);
}

/**
 * Saves requests to Supabase Storage via Vercel serverless proxy or direct upload
 */
export async function syncRequestsToCloud(requests: SongRequest[]): Promise<void> {
  saveRequestsLocally(requests);

  const payload = JSON.stringify(requests, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });

  // 1. Try Vercel Serverless Function proxy
  try {
    const apiRes = await fetch('/api/cloud-sync?action=upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-file-path': REQUESTS_FILE_PATH,
      },
      body: blob,
    });
    if (apiRes.ok) return;
  } catch (_) {}

  // 2. Direct Supabase Storage upload
  try {
    const apiKey = 'sb_publishable_ydMAlr-fznp71OXTedNkaw_6iFXqjSB';
    await fetch(`https://lrydzxpimekmvrwhnemm.supabase.co/storage/v1/object/flannels-songs/${REQUESTS_FILE_PATH}`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'x-upsert': 'true',
      },
      body: blob,
    });
  } catch (err) {
    console.warn('Cloud sync error for requests:', err);
  }
}

/**
 * Submits a new song request to the queue
 */
export async function submitSongRequest(
  title: string,
  artist: string,
  requesterName: string,
  requesterRole: SongRequest['requesterRole'],
  options?: {
    album?: string;
    artworkUrl?: string;
    previewUrl?: string;
    notes?: string;
  }
): Promise<SongRequest> {
  const current = await fetchSongRequests();
  const clientId = getClientId();

  const newRequest: SongRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    artist: artist.trim(),
    album: options?.album?.trim() || 'Single',
    artworkUrl: options?.artworkUrl,
    previewUrl: options?.previewUrl,
    requesterName: requesterName.trim() || 'Personil Band',
    requesterRole,
    notes: options?.notes?.trim() || '',
    upvotes: 1,
    upvotedBy: [clientId],
    status: 'pending',
    createdAt: Date.now(),
  };

  const updated = [newRequest, ...current];
  await syncRequestsToCloud(updated);
  return newRequest;
}

/**
 * Toggles upvote for a request by current user
 */
export async function toggleUpvoteRequest(requestId: string): Promise<SongRequest[]> {
  const current = await fetchSongRequests();
  const clientId = getClientId();

  const updated = current.map((req) => {
    if (req.id !== requestId) return req;

    const alreadyUpvoted = req.upvotedBy.includes(clientId);
    const newUpvotedBy = alreadyUpvoted
      ? req.upvotedBy.filter((id) => id !== clientId)
      : [...req.upvotedBy, clientId];

    return {
      ...req,
      upvotes: Math.max(1, newUpvotedBy.length),
      upvotedBy: newUpvotedBy,
    };
  });

  await syncRequestsToCloud(updated);
  return sortRequests(updated);
}

/**
 * Admin action: mark a request as fulfilled
 */
export async function markRequestFulfilled(requestId: string, songId: string): Promise<SongRequest[]> {
  const current = await fetchSongRequests();

  const updated = current.map((req) => {
    if (req.id !== requestId) return req;
    return {
      ...req,
      status: 'fulfilled' as const,
      fulfilledSongId: songId,
    };
  });

  await syncRequestsToCloud(updated);
  return sortRequests(updated);
}

/**
 * Admin action: delete a request
 */
export async function deleteSongRequest(requestId: string): Promise<SongRequest[]> {
  const current = await fetchSongRequests();
  const updated = current.filter((req) => req.id !== requestId);
  await syncRequestsToCloud(updated);
  return sortRequests(updated);
}

function sortRequests(requests: SongRequest[]): SongRequest[] {
  // Unfulfilled first, then highest upvotes, then newest
  return [...requests].sort((a, b) => {
    if (a.status === 'fulfilled' && b.status !== 'fulfilled') return 1;
    if (a.status !== 'fulfilled' && b.status === 'fulfilled') return -1;
    if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
    return b.createdAt - a.createdAt;
  });
}
