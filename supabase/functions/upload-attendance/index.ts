import { serve } from 'https://deno.land/std@0.215.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Folder target: secret bernilai ID folder Drive per jenis absensi.
// Jika secret tidak di-set, fallback ke folder default.
function getFolderIdForJenis(jenis: string): string {
  const map: Record<string, string | undefined> = {
    biasa: Deno.env.get('GDRIVE_FOLDER_ID_ABSENSI'),
    seminar: Deno.env.get('GDRIVE_FOLDER_ID_SEMINAR'),
    // jenis lain (default) → folder utama
  }
  const folder = map[jenis]
  return folder || Deno.env.get('GDRIVE_FOLDER_ID') || '1jAAVWzLXH15OIct6ZUqxlpKJzs1VYokl'
}

// OAuth configuration (no longer using service account)

function resolveContentType(typeFromQuery: string, ext: string): string {
  const t = typeFromQuery.toLowerCase()
  if (t.includes('png')) return 'image/png'
  if (t.includes('gif')) return 'image/gif'
  if (t.includes('webp')) return 'image/webp'
  if (t.includes('bmp')) return 'image/bmp'
  if (t.includes('jpeg') || t.includes('jpg')) return 'image/jpeg'
  if (t.includes('heic')) return 'image/heic'
  if (t.includes('heif')) return 'image/heif'
  if (t.includes('pdf')) return 'application/pdf'
  if (ext === 'png') return 'image/png'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'bmp') return 'image/bmp'
  if (ext === 'heic') return 'image/heic'
  if (ext === 'heif') return 'image/heif'
  if (ext === 'pdf') return 'application/pdf'
  return 'image/jpeg'
}







async function getAccessToken(): Promise<string> {
  const refreshToken = Deno.env.get('GDRIVE_REFRESH_TOKEN')
  const clientId = Deno.env.get('GDRIVE_CLIENT_ID')
  const clientSecret = Deno.env.get('GDRIVE_CLIENT_SECRET')

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('OAuth secrets not configured: GDRIVE_REFRESH_TOKEN, GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OAuth token refresh failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  return data.access_token
}

async function uploadToDrive(folderId: string, accessToken: string, filename: string, contentType: string, data: Uint8Array): Promise<string> {
  // Upload media (drive tidak mendeteksi tipe, menerima apapun) lalu set parent folder.
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media&fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': contentType,
      'Content-Length': String(data.byteLength),
    },
    body: data,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Drive upload failed: ${res.status} ${text}`)
  }
  const out = await res.json()
  const fileId: string = out.id

  // Pindahkan ke folder tujuan menggunakan addParents parameter
  const patchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${encodeURIComponent(folderId)}&fields=id,name,parents`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: filename }),
    },
  )
  if (!patchRes.ok) {
    const text = await patchRes.text()
    throw new Error(`Drive set-parent failed: ${patchRes.status} ${text}`)
  }
  return fileId
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Tangani preflight CORS (method OPTIONS) yang dikirim browser utk request non-simple
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    })
  }

  try {
    if (req.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, CORS_HEADERS, 405)
    }

    const url = new URL(req.url)
    const participantId = url.searchParams.get('nim') || ''
    const tanggal = url.searchParams.get('tanggal') || ''
    const session = url.searchParams.get('session') || ''
    const originalFilename = url.searchParams.get('filename') || 'photo.jpg'
    const jenis = url.searchParams.get('jenis') || 'biasa'
    const kegiatan = url.searchParams.get('kegiatan') || ''

    if (!participantId || !tanggal) {
      return json({ ok: false, error: 'Missing nim/tanggal' }, CORS_HEADERS, 400)
    }
    if (jenis === 'seminar' && !kegiatan) {
      return json({ ok: false, error: 'Missing kegiatan for seminar' }, CORS_HEADERS, 400)
    }

    const blob = await req.blob()
    if (blob.size <= 0) {
      return json({ ok: false, error: 'Empty file' }, CORS_HEADERS, 400)
    }

    // --- Upload ke Google Drive (folder sesuai jenis) ---
    const folderId = getFolderIdForJenis(jenis)
    const accessToken = await getAccessToken()
    const typeFromQuery = url.searchParams.get('type') || ''
    const ext = originalFilename.includes('.') ? originalFilename.split('.').pop()!.toLowerCase() : ''
    const contentType = resolveContentType(typeFromQuery, ext)
    const safeExt = contentType.includes('png') ? '.png' : '.jpg'
    const tag = jenis === 'seminar' ? `seminar_${kegiatan}` : session
    const driveFilename = `${participantId}_${tanggal}_${tag}${safeExt}`
    const driveFileId = await uploadToDrive(
      folderId,
      accessToken,
      driveFilename,
      contentType,
      new Uint8Array(await blob.arrayBuffer()),
    )

    // --- Simpan metadata ke tabel yg sesuai (via service role server-side) ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const adminClient = createClient(supabaseUrl, serviceRole)

    const photoUrl = `https://drive.google.com/uc?export=view&id=${driveFileId}`
    const updates: Record<string, unknown> = {
      photo_path: photoUrl,
      photo_filename: originalFilename,
    }

    let query
    if (jenis === 'seminar') {
      query = adminClient
        .from('seminar_attendance')
        .update(updates)
        .eq('participant_id', participantId)
        .eq('tanggal', tanggal)
        .eq('kegiatan', kegiatan)
    } else {
      query = adminClient
        .from('attendance')
        .update(updates)
        .eq('participant_id', participantId)
        .eq('tanggal', tanggal)
        .eq('session', session)
    }

    const { error } = await query

    if (error) {
      throw new Error(`DB update failed: ${error.message}`)
    }

    return json({ ok: true, driveFileId, photoUrl }, CORS_HEADERS, 200)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return json({ ok: false, error: message }, CORS_HEADERS, 500)
  }
})

function json(body: unknown, extra: Record<string, string>, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...extra },
    status,
  })
}
