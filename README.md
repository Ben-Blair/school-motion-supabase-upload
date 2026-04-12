# school-motion-supabase-upload

Motion camera clips are uploaded to **Supabase Storage** with the Python scripts in `scripts/`. This repo also includes a small **React (Vite)** web app to **list and download** videos from the same bucket (anon key + storage policies).

## Repository layout

| Path | Purpose |
|------|--------|
| `scripts/` | Upload and Motion hook helpers (`upload_video_to_supabase.py`, `upload_new_motion_videos.py`, `on_movie_end.sh`). |
| `src/`, `package.json` | Web UI: browse bucket videos, search, download. |

## Web app (bucket browser)

1. Copy `.env.example` to `.env.local` and set:

   - `VITE_SUPABASE_URL` — Project URL (Supabase → Settings → API).
   - `VITE_SUPABASE_ANON_KEY` — `anon` `public` key.
   - `VITE_SUPABASE_BUCKET` — Storage bucket name (must match your bucket).

2. Install and run:

   ```bash
   npm install
   npm run dev
   ```

3. Production build:

   ```bash
   npm run build
   ```

The browser uses the **anon** key. For `list` and `download` to work, add a **SELECT** policy on `storage.objects` for role `anon` and your bucket (see Supabase **Storage → Policies**).

## Python upload scripts

Dependencies:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Configure Supabase credentials via environment variables (see docstrings in `scripts/upload_video_to_supabase.py`). Typical flow:

```bash
# Example (adjust paths for your machine)
source etc/supabase.env   # or export SUPABASE_URL / SUPABASE_KEY / bucket vars
python scripts/upload_video_to_supabase.py
```

For Motion’s `on_movie_end`, see `scripts/on_movie_end.sh` and `scripts/upload_new_motion_videos.py`.

## Requirements

- **Web:** Node.js 18+ recommended.
- **Uploads:** Python 3.10+, `ffmpeg` on `PATH` when compression is used, Supabase project with a storage bucket and appropriate policies.
