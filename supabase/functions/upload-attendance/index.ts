import { serve } from 'https://deno.land/std@0.215.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Folder target: secret bernilai ID folder Drive per jenis absensi.
// Jika secret tidak di-set, fallback ke folder default.
function getFolderIdForJenis(jenis: string): string {
  const map: Record<string, string | undefined> = {
    biasa: Deno.env.get('GDRIVE_FOLDER_ID_ABSENSI'),
    seminar: Deno.env.get('GDRIVE_FOLDER_ID_SEMINAR'),
    laporan: Deno.env.get('GDRIVE_FOLDER_ID_REPORTS'),
    'announcement-asset': Deno.env.get('GDRIVE_FOLDER_ID_ANNOUNCEMENTS'),
  }
  const folder = map[jenis]
  return folder || Deno.env.get('GDRIVE_FOLDER_ID') || '1jAAVWzLXH15OIct6ZUqxlpKJzs1VYokl'
}

// OAuth configuration (no longer using service account)

function resolveContentType(typeFromQuery: string, ext: string): string {
  const t = typeFromQuery.toLowerCase()
  if (t.startsWith('image/')) return t
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
  return t || 'application/octet-stream'
}

function resolveFileExtension(filename: string, contentType: string): string {
  const filenameMatch = filename.toLowerCase().match(/\.([a-z0-9]{1,10})$/)
  if (filenameMatch) return `.${filenameMatch[1]}`
  const typeMatch = contentType.match(/^image\/([a-z0-9.+-]+)$/i)
  return typeMatch ? `.${typeMatch[1].replace('jpeg', 'jpg')}` : '.jpg'
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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    })
  }

  try {
    if (req.method === 'GET') {
      if (new URL(req.url).searchParams.has('announcementId')) {
        return await serveAnnouncementAsset(req)
      }
      return await serveAdminPhoto(req)
    }

    if (req.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, CORS_HEADERS, 405)
    }

    const url = new URL(req.url)
    const participantId = url.searchParams.get('nim') || ''
    const tanggal = url.searchParams.get('tanggal') || ''
    const originalFilename = url.searchParams.get('filename') || 'photo.jpg'
    const jenis = url.searchParams.get('jenis') || 'biasa'
    const asset = url.searchParams.get('asset') || ''
    if (jenis === 'bpu' || jenis === 'pu') {
      return json({ ok: false, error: 'BPU/PU acquisition uploads are no longer available' }, CORS_HEADERS, 410)
    }
    const kegiatan = url.searchParams.get('kegiatan') || ''
    const id = url.searchParams.get('id') || ''
    const kelompok = url.searchParams.get('kelompok') || ''
    const namaKtp = url.searchParams.get('nama_ktp') || ''
    const nik = url.searchParams.get('nik') || ''
    const jenisKelamin = url.searchParams.get('jenis_kelamin') || ''
    const sizeBytes = Number(url.searchParams.get('size_bytes') || '0')

    if ((jenis === 'biasa' || jenis === 'seminar') && (!participantId || !tanggal)) {
      return json({ ok: false, error: 'Missing nim/tanggal' }, CORS_HEADERS, 400)
    }
    if (jenis === 'seminar' && !kegiatan) {
      return json({ ok: false, error: 'Missing kegiatan for seminar' }, CORS_HEADERS, 400)
    }
    if (jenis === 'laporan' && (!participantId || !originalFilename.toLowerCase().endsWith('.pdf'))) {
      return json({ ok: false, error: 'Missing NIM or invalid report filename' }, CORS_HEADERS, 400)
    }
    if ((jenis === 'bpu' || jenis === 'pu') && !id) {
      return json({ ok: false, error: 'Missing record id for BPU/PU' }, CORS_HEADERS, 400)
    }
    if ((jenis === 'bpu' || jenis === 'pu') && (!kelompok || !namaKtp || !/^\d{16}$/.test(nik) || !['Laki-laki', 'Perempuan'].includes(jenisKelamin))) {
      return json({ ok: false, error: 'Missing or invalid BPU/PU participant data' }, CORS_HEADERS, 400)
    }
    if (jenis === 'announcement-asset') {
      const token = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
      if (!token || !supabaseUrl || !anonKey) {
        return json({ ok: false, error: 'Admin authentication is required' }, CORS_HEADERS, 401)
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      const { data: isAdmin, error: authError } = await userClient.rpc('is_admin')
      if (authError || !isAdmin) {
        return json({ ok: false, error: 'Admin access required' }, CORS_HEADERS, 403)
      }
      if (!['image', 'file'].includes(asset) || !originalFilename.trim()) {
        return json({ ok: false, error: 'Missing asset type or filename' }, CORS_HEADERS, 400)
      }
    }

    const blob = await req.blob()
    if (blob.size <= 0) {
      return json({ ok: false, error: 'Empty file' }, CORS_HEADERS, 400)
    }
    if (jenis === 'announcement-asset' && blob.size > 25 * 1024 * 1024) {
      return json({ ok: false, error: 'Announcement files are limited to 25 MB' }, CORS_HEADERS, 413)
    }

    const typeFromQuery = url.searchParams.get('type') || ''
    if (jenis === 'announcement-asset' && asset === 'image' && !typeFromQuery.startsWith('image/')) {
      return json({ ok: false, error: 'Announcement image must be an image file' }, CORS_HEADERS, 415)
    }
    const ext = originalFilename.includes('.') ? originalFilename.split('.').pop()!.toLowerCase() : ''
    const contentType = resolveContentType(typeFromQuery, ext)
    const safeExt = resolveFileExtension(originalFilename, contentType)

    let driveFileId: string | null = null
    let photoUrl: string | null = null

    try {
      const folderId = getFolderIdForJenis(jenis)
      const accessToken = await getAccessToken()
      let driveFilename = ''
      if (jenis === 'bpu' || jenis === 'pu') {
        driveFilename = `${jenis.toUpperCase()}_Kelompok_${kelompok}_${id}${safeExt}`
      } else if (jenis === 'laporan') {
        driveFilename = `${participantId}_${originalFilename}`
      } else if (jenis === 'announcement-asset') {
        driveFilename = `${Date.now()}_${originalFilename.replace(/[\\/]/g, '_')}`
      } else {
        const tag = jenis === 'seminar' ? `_seminar_${kegiatan}` : ''
        driveFilename = `${participantId}_${tanggal}${tag}${safeExt}`
      }

      driveFileId = await uploadToDrive(
        folderId,
        accessToken,
        driveFilename,
        contentType,
        new Uint8Array(await blob.arrayBuffer()),
      )
      photoUrl = `https://drive.google.com/uc?export=view&id=${driveFileId}`
    } catch (driveError) {
      const message = driveError instanceof Error ? driveError.message : String(driveError)
      throw new Error(`Google Drive upload failed: ${message}`)
    }

    if (jenis === 'announcement-asset') {
      return json({ ok: true, fileId: driveFileId, filename: originalFilename, mimeType: contentType }, CORS_HEADERS, 200)
    }

    if (jenis === 'bpu' || jenis === 'pu') {
      if (!driveFileId || !photoUrl) {
        throw new Error('Google Drive did not return a file URL')
      }
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      if (!supabaseUrl || !serviceRole) {
        throw new Error('Supabase admin credentials are not configured')
      }
      const adminClient = createClient(supabaseUrl, serviceRole)
      const dbTable = jenis === 'bpu' ? 'akuisisi_bpu' : 'akuisisi_pu'
      const { error: insertError } = await adminClient
        .from(dbTable)
        .insert({
          id,
          kelompok,
          nama_ktp: namaKtp,
          nik,
          jenis_kelamin: jenisKelamin,
          storage_path: photoUrl,
          filename: originalFilename,
          mime_type: typeFromQuery || 'application/pdf',
          size_bytes: sizeBytes || blob.size,
          drive_file_id: driveFileId,
          drive_url: photoUrl,
        })

      if (insertError) {
        if (driveFileId) {
          await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${await getAccessToken().catch(() => '')}` || undefined },
          }).catch(() => undefined)
        }
        throw new Error(`DB insert failed: ${insertError.message}`)
      }

      return json({ ok: true, id, driveFileId, photoUrl, driveFallback: !driveFileId }, CORS_HEADERS, 200)
    }

    return json({ ok: true, driveFileId, photoUrl }, CORS_HEADERS, 200)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return json({ ok: false, error: message }, CORS_HEADERS, 500)
  }
})

async function serveAdminPhoto(req: Request): Promise<Response> {
  const authorization = req.headers.get('Authorization') || ''
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
  const fileId = new URL(req.url).searchParams.get('fileId') || ''
  if (!token || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return json({ error: 'Unauthorized or invalid file ID' }, CORS_HEADERS, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  if (!supabaseUrl || !anonKey) {
    return json({ error: 'Supabase auth is not configured' }, CORS_HEADERS, 500)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: isAdmin, error: authError } = await userClient.rpc('is_admin')
  if (authError || !isAdmin) {
    return json({ error: 'Admin access required' }, CORS_HEADERS, 403)
  }

  const photoUrl = `https://drive.google.com/uc?export=view&id=${fileId}`
  const [attendance, seminar] = await Promise.all([
    userClient.from('attendance').select('id').eq('photo_path', photoUrl).limit(1),
    userClient.from('seminar_attendance').select('id').eq('photo_path', photoUrl).limit(1),
  ])
  if (attendance.error || seminar.error) {
    return json({ error: 'Failed to verify photo record' }, CORS_HEADERS, 500)
  }
  if (!attendance.data?.length && !seminar.data?.length) {
    return json({ error: 'Photo not found' }, CORS_HEADERS, 404)
  }

  const accessToken = await getAccessToken()
  const driveResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!driveResponse.ok) {
    return json({ error: `Google Drive returned HTTP ${driveResponse.status}` }, CORS_HEADERS, 502)
  }

  const contentType = driveResponse.headers.get('Content-Type') || 'application/octet-stream'
  if (!contentType.startsWith('image/')) {
    return json({ error: 'Drive file is not an image' }, CORS_HEADERS, 415)
  }

  return new Response(driveResponse.body, {
    headers: {
      ...CORS_HEADERS,
      'Cache-Control': 'private, no-store',
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

async function serveAnnouncementAsset(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const announcementId = url.searchParams.get('announcementId') || ''
  const asset = url.searchParams.get('asset')
  if (!/^[0-9a-f-]{36}$/i.test(announcementId) || (asset !== 'image' && asset !== 'file')) {
    return json({ error: 'Invalid announcement asset request' }, CORS_HEADERS, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  if (!supabaseUrl || !anonKey) {
    return json({ error: 'Supabase is not configured' }, CORS_HEADERS, 500)
  }

  const client = createClient(supabaseUrl, anonKey)
  const { data: announcement, error } = await client
    .from('announcements')
    .select('image_file_id, attachment_file_id, attachment_filename, attachment_mime_type')
    .eq('id', announcementId)
    .eq('is_published', true)
    .maybeSingle()
  if (error) return json({ error: 'Failed to verify published announcement' }, CORS_HEADERS, 500)
  if (!announcement) return json({ error: 'Announcement not found' }, CORS_HEADERS, 404)

  const fileId = asset === 'image' ? announcement.image_file_id : announcement.attachment_file_id
  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return json({ error: 'Announcement file not found' }, CORS_HEADERS, 404)
  }

  const accessToken = await getAccessToken()
  const driveResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!driveResponse.ok) {
    return json({ error: `Google Drive returned HTTP ${driveResponse.status}` }, CORS_HEADERS, 502)
  }

  const contentType = asset === 'image'
    ? driveResponse.headers.get('Content-Type') || 'application/octet-stream'
    : announcement.attachment_mime_type || 'application/octet-stream'
  if (asset === 'image' && !contentType.startsWith('image/')) {
    return json({ error: 'Announcement image is not an image file' }, CORS_HEADERS, 415)
  }

  const headers = new Headers({
    ...CORS_HEADERS,
    'Cache-Control': 'public, max-age=300',
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
  })
  if (asset === 'file') {
    const filename = (announcement.attachment_filename || 'lampiran').replace(/[\r\n"\\]/g, '_')
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
  }

  return new Response(driveResponse.body, { headers })
}

function json(body: unknown, extra: Record<string, string>, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...extra },
    status,
  })
}
